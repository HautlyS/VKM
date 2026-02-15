/**
 * VKM Graph Engine
 * Handles node connections, routing, and data flow
 * Like Jack Audio but for API keys and sessions
 */

const EventEmitter = require('events');

class GraphEngine extends EventEmitter {
  constructor() {
    super();
    this.nodes = new Map();
    this.connections = new Map();
    this.sessions = new Map();
    this.routers = new Map();
    this.processingQueue = [];
    this.isProcessing = false;
  }

  // Add a node to the graph
  addNode(node) {
    this.nodes.set(node.id, {
      ...node,
      inputs: new Map(),
      outputs: new Map(),
      state: 'idle',
      lastUpdate: Date.now()
    });
    
    this.emit('nodeAdded', node);
    return node.id;
  }

  // Remove a node
  removeNode(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    // Remove all connections
    this.connections.forEach((conn, connId) => {
      if (conn.source === nodeId || conn.target === nodeId) {
        this.removeConnection(connId);
      }
    });

    this.nodes.delete(nodeId);
    this.emit('nodeRemoved', nodeId);
  }

  // Create a connection between nodes
  connect(sourceId, targetId, options = {}) {
    const connectionId = `${sourceId}->${targetId}`;
    
    const connection = {
      id: connectionId,
      source: sourceId,
      target: targetId,
      type: options.type || 'data',
      active: true,
      priority: options.priority || 0,
      label: options.label || '',
      metadata: options.metadata || {},
      createdAt: Date.now()
    };

    this.connections.set(connectionId, connection);
    
    // Update node connections
    const source = this.nodes.get(sourceId);
    const target = this.nodes.get(targetId);
    
    if (source) {
      source.outputs.set(targetId, connection);
    }
    if (target) {
      target.inputs.set(sourceId, connection);
    }

    this.emit('connectionCreated', connection);
    return connectionId;
  }

  // Remove a connection
  removeConnection(connectionId) {
    const conn = this.connections.get(connectionId);
    if (!conn) return;

    const source = this.nodes.get(conn.source);
    const target = this.nodes.get(conn.target);

    if (source) source.outputs.delete(conn.target);
    if (target) target.inputs.delete(conn.source);

    this.connections.delete(connectionId);
    this.emit('connectionRemoved', connectionId);
  }

  // Process data through the graph
  async process(sourceId, data, context = {}) {
    const node = this.nodes.get(sourceId);
    if (!node) return;

    // Mark node as processing
    node.state = 'processing';
    node.lastUpdate = Date.now();
    this.emit('nodeProcessing', { nodeId: sourceId, data });

    try {
      // Process based on node type
      const result = await this.processNode(node, data, context);
      
      // Route to connected nodes
      for (const [targetId, connection] of node.outputs) {
        if (connection.active) {
          await this.routeData(sourceId, targetId, result, context);
        }
      }

      node.state = 'completed';
      this.emit('nodeCompleted', { nodeId: sourceId, result });
      
      return result;
    } catch (error) {
      node.state = 'error';
      this.emit('nodeError', { nodeId: sourceId, error });
      throw error;
    }
  }

  // Process individual node logic
  async processNode(node, data, context) {
    switch (node.type) {
      case 'service':
        return this.processServiceNode(node, data);
        
      case 'key':
        return this.processKeyNode(node, data);
        
      case 'router':
        return this.processRouterNode(node, data, context);
        
      case 'integration':
        return this.processIntegrationNode(node, data);
        
      case 'session':
        return this.processSessionNode(node, data);
        
      default:
        return data;
    }
  }

  // Service node: Validates service connectivity
  async processServiceNode(node, data) {
    const serviceId = node.data.service;
    
    // Check if service is available
    const isAvailable = await this.checkServiceHealth(serviceId);
    
    return {
      ...data,
      service: serviceId,
      available: isAvailable,
      timestamp: Date.now()
    };
  }

  // Key node: Manages API key selection and validation
  async processKeyNode(node, data) {
    const serviceId = node.data.service || data.service;
    const keyId = node.data.keyId;
    
    // Get active key for service
    const key = await this.getActiveKey(serviceId, keyId);
    
    return {
      ...data,
      service: serviceId,
      key: key,
      authenticated: !!key
    };
  }

  // Router node: Routes data based on strategy
  async processRouterNode(node, data, context) {
    const strategy = node.data.mode || 'failover';
    const outputs = Array.from(node.outputs.values());
    
    switch (strategy) {
      case 'failover':
        return this.routeFailover(node, data, outputs, context);
        
      case 'round-robin':
        return this.routeRoundRobin(node, data, outputs);
        
      case 'parallel':
        return this.routeParallel(node, data, outputs, context);
        
      case 'load-balance':
        return this.routeLoadBalanced(node, data, outputs);
        
      default:
        return this.routeFailover(node, data, outputs, context);
    }
  }

  // Failover routing: Try outputs in priority order
  async routeFailover(node, data, outputs, context) {
    const sorted = outputs.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    for (const output of sorted) {
      try {
        const target = this.nodes.get(output.target);
        if (target && target.state !== 'error') {
          await this.routeData(node.id, output.target, data, context);
          return { ...data, routed: true, target: output.target };
        }
      } catch (error) {
        console.error(`Failover to ${output.target} failed:`, error.message);
      }
    }
    
    throw new Error('All failover targets failed');
  }

  // Round-robin routing: Distribute evenly
  routeRoundRobin(node, data, outputs) {
    const index = (node.data.rrIndex || 0) % outputs.length;
    node.data.rrIndex = index + 1;
    
    const selected = outputs[index];
    return { ...data, routed: true, target: selected.target, strategy: 'round-robin' };
  }

  // Parallel routing: Send to all outputs
  async routeParallel(node, data, outputs, context) {
    const promises = outputs.map(output => 
      this.routeData(node.id, output.target, data, context).catch(err => ({ error: err.message }))
    );
    
    const results = await Promise.allSettled(promises);
    
    return {
      ...data,
      routed: true,
      strategy: 'parallel',
      results: results.map((r, i) => ({
        target: outputs[i].target,
        status: r.status,
        value: r.status === 'fulfilled' ? r.value : r.reason
      }))
    };
  }

  // Load-balanced routing: Weighted distribution
  routeLoadBalanced(node, data, outputs) {
    // Calculate based on weights or health scores
    const healthy = outputs.filter(o => {
      const target = this.nodes.get(o.target);
      return target && target.state !== 'error';
    });
    
    if (healthy.length === 0) {
      throw new Error('No healthy targets available');
    }
    
    // Select based on load/health
    const selected = healthy[Math.floor(Math.random() * healthy.length)];
    return { ...data, routed: true, target: selected.target, strategy: 'load-balance' };
  }

  // Integration node: Updates tool configurations
  async processIntegrationNode(node, data) {
    const integrationId = node.data.integration;
    
    // Update the integration with the key
    if (data.key && data.service) {
      await this.updateIntegration(integrationId, data.service, data.key);
    }
    
    return {
      ...data,
      integration: integrationId,
      configured: true
    };
  }

  // Session node: Manages active sessions
  async processSessionNode(node, data) {
    const sessionId = node.id;
    
    // Create or update session
    this.sessions.set(sessionId, {
      id: sessionId,
      data: data,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      active: true
    });
    
    this.emit('sessionCreated', { sessionId, data });
    
    return {
      ...data,
      session: sessionId,
      active: true
    };
  }

  // Route data from source to target
  async routeData(sourceId, targetId, data, context) {
    const connection = this.connections.get(`${sourceId}->${targetId}`);
    if (!connection || !connection.active) {
      throw new Error('Connection not found or inactive');
    }
    
    // Mark connection as active
    connection.lastUsed = Date.now();
    
    // Process target node
    return this.process(targetId, data, context);
  }

  // Helper: Check service health
  async checkServiceHealth(serviceId) {
    // This would integrate with VKM's health checking
    return true; // Placeholder
  }

  // Helper: Get active key for service
  async getActiveKey(serviceId, keyId) {
    // This would integrate with VKM's key management
    return { service: serviceId, keyId, active: true }; // Placeholder
  }

  // Helper: Update integration
  async updateIntegration(integrationId, serviceId, key) {
    // This would call VKM's integration update
    this.emit('integrationUpdated', { integrationId, serviceId, key });
  }

  // Get graph state
  getGraphState() {
    return {
      nodes: Array.from(this.nodes.entries()).map(([id, node]) => ({
        id,
        type: node.type,
        state: node.state,
        inputs: Array.from(node.inputs.keys()),
        outputs: Array.from(node.outputs.keys()),
        lastUpdate: node.lastUpdate
      })),
      connections: Array.from(this.connections.values()),
      sessions: Array.from(this.sessions.entries()).map(([id, session]) => ({
        id,
        active: session.active,
        createdAt: session.createdAt
      }))
    };
  }

  // Find path between nodes
  findPath(sourceId, targetId) {
    const visited = new Set();
    const queue = [[sourceId]];
    
    while (queue.length > 0) {
      const path = queue.shift();
      const nodeId = path[path.length - 1];
      
      if (nodeId === targetId) {
        return path;
      }
      
      if (!visited.has(nodeId)) {
        visited.add(nodeId);
        const node = this.nodes.get(nodeId);
        
        if (node) {
          for (const outputId of node.outputs.keys()) {
            queue.push([...path, outputId]);
          }
        }
      }
    }
    
    return null;
  }

  // Get all paths from source
  getAllPaths(sourceId) {
    const paths = [];
    const visited = new Set();
    
    const dfs = (nodeId, path) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      
      const node = this.nodes.get(nodeId);
      if (!node) return;
      
      paths.push([...path, nodeId]);
      
      for (const outputId of node.outputs.keys()) {
        dfs(outputId, [...path, nodeId]);
      }
    };
    
    dfs(sourceId, []);
    return paths;
  }

  // Serialize graph
  serialize() {
    return {
      nodes: Array.from(this.nodes.entries()).map(([id, node]) => ({
        id,
        type: node.type,
        x: node.x,
        y: node.y,
        label: node.label,
        data: node.data
      })),
      connections: Array.from(this.connections.values())
    };
  }

  // Deserialize graph
  deserialize(data) {
    this.nodes.clear();
    this.connections.clear();
    
    data.nodes.forEach(node => {
      this.addNode(node);
    });
    
    data.connections.forEach(conn => {
      this.connect(conn.source, conn.target, conn);
    });
  }
}

module.exports = GraphEngine;
