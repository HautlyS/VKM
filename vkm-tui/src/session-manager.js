/**
 * VKM Session Manager
 * Manages active sessions like Jack Audio manages audio connections
 */

const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

class SessionManager extends EventEmitter {
  constructor(vkmDir) {
    super();
    this.vkmDir = vkmDir || path.join(process.env.HOME, '.vkm');
    this.sessionsDir = path.join(this.vkmDir, 'sessions');
    this.activeSessions = new Map();
    this.sessionGraphs = new Map();
    
    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
    }
  }

  // Create a new session
  createSession(name, templateId = null, options = {}) {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const session = {
      id: sessionId,
      name: name || `Session-${Date.now()}`,
      template: templateId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      state: 'created',
      options: {
        autoStart: options.autoStart || false,
        persistent: options.persistent !== false,
        monitorHealth: options.monitorHealth !== false,
        ...options
      },
      stats: {
        requests: 0,
        errors: 0,
        rotations: 0,
        lastActivity: null
      },
      nodes: [],
      connections: []
    };

    this.activeSessions.set(sessionId, session);
    
    if (templateId) {
      this.applyTemplateToSession(sessionId, templateId);
    }

    this.saveSession(session);
    this.emit('sessionCreated', session);
    
    return session;
  }

  // Load a session
  loadSession(sessionId) {
    const sessionFile = path.join(this.sessionsDir, `${sessionId}.json`);
    
    if (!fs.existsSync(sessionFile)) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const session = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
    session.state = 'loaded';
    session.updatedAt = new Date().toISOString();
    
    this.activeSessions.set(sessionId, session);
    this.emit('sessionLoaded', session);
    
    return session;
  }

  // Save session to disk
  saveSession(session) {
    if (!session.options.persistent) return;
    
    const sessionFile = path.join(this.sessionsDir, `${session.id}.json`);
    fs.writeFileSync(sessionFile, JSON.stringify(session, null, 2));
  }

  // Start a session
  async startSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.state = 'starting';
    this.emit('sessionStarting', session);

    try {
      // Start all service connections
      for (const node of session.nodes) {
        if (node.type === 'service') {
          await this.startServiceConnection(sessionId, node);
        }
      }

      // Activate integrations
      for (const node of session.nodes) {
        if (node.type === 'integration') {
          await this.activateIntegration(sessionId, node);
        }
      }

      session.state = 'active';
      session.updatedAt = new Date().toISOString();
      this.saveSession(session);
      
      this.emit('sessionStarted', session);
      
      return session;
    } catch (error) {
      session.state = 'error';
      session.error = error.message;
      this.saveSession(session);
      this.emit('sessionError', { session, error });
      throw error;
    }
  }

  // Stop a session
  async stopSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    session.state = 'stopping';
    this.emit('sessionStopping', session);

    // Deactivate all connections
    for (const node of session.nodes) {
      if (node.type === 'integration') {
        await this.deactivateIntegration(sessionId, node);
      }
    }

    session.state = 'stopped';
    session.updatedAt = new Date().toISOString();
    this.saveSession(session);
    
    this.emit('sessionStopped', session);
    
    return session;
  }

  // Resume a stopped session
  async resumeSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.state === 'stopped') {
      return this.startSession(sessionId);
    }

    return session;
  }

  // Delete a session
  deleteSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    if (session.state === 'active') {
      this.stopSession(sessionId);
    }

    this.activeSessions.delete(sessionId);
    
    const sessionFile = path.join(this.sessionsDir, `${sessionId}.json`);
    if (fs.existsSync(sessionFile)) {
      fs.unlinkSync(sessionFile);
    }

    this.emit('sessionDeleted', { sessionId });
  }

  // Apply template to session
  applyTemplateToSession(sessionId, templateId) {
    const templates = this.loadTemplates();
    const template = templates[templateId];
    
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Apply template nodes and connections
    session.nodes = [...(template.nodes || [])];
    session.connections = [...(template.connections || [])];
    session.template = templateId;
    session.templateConfig = template.config || {};
    
    this.saveSession(session);
    this.emit('templateApplied', { sessionId, templateId });
  }

  // Start service connection
  async startServiceConnection(sessionId, node) {
    // This would integrate with VKM to actually start the service
    console.log(`Starting service: ${node.data.service} in session ${sessionId}`);
    
    // Update node state
    node.state = 'connecting';
    
    // Simulate connection
    await new Promise(resolve => setTimeout(resolve, 100));
    
    node.state = 'connected';
    this.emit('serviceConnected', { sessionId, service: node.data.service });
  }

  // Activate integration
  async activateIntegration(sessionId, node) {
    const session = this.activeSessions.get(sessionId);
    
    console.log(`Activating integration: ${node.data.integration} in session ${sessionId}`);
    
    // Update integration config with active keys
    const keyNodes = session.nodes.filter(n => 
      n.type === 'key' && n.state === 'active'
    );
    
    for (const keyNode of keyNodes) {
      // Update the integration with this key
      await this.updateIntegrationConfig(
        node.data.integration,
        keyNode.data.service,
        keyNode.data.key
      );
    }
    
    node.state = 'active';
    this.emit('integrationActivated', { sessionId, integration: node.data.integration });
  }

  // Deactivate integration
  async deactivateIntegration(sessionId, node) {
    console.log(`Deactivating integration: ${node.data.integration} in session ${sessionId}`);
    node.state = 'inactive';
    this.emit('integrationDeactivated', { sessionId, integration: node.data.integration });
  }

  // Update integration config
  async updateIntegrationConfig(integrationId, serviceId, key) {
    // This would call VKM CLI to update integration
    return new Promise((resolve, reject) => {
      const { exec } = require('child_process');
      // Placeholder - would actually call vkm update-integration
      resolve();
    });
  }

  // Get session status
  getSessionStatus(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;

    return {
      id: session.id,
      name: session.name,
      state: session.state,
      template: session.template,
      nodes: session.nodes.map(n => ({
        id: n.id,
        type: n.type,
        state: n.state,
        label: n.label
      })),
      connections: session.connections.length,
      stats: session.stats,
      uptime: session.state === 'active' 
        ? Date.now() - new Date(session.updatedAt).getTime()
        : 0
    };
  }

  // List all sessions
  listSessions() {
    return Array.from(this.activeSessions.values()).map(s => this.getSessionStatus(s.id));
  }

  // Load available templates
  loadTemplates() {
    // These would be loaded from templates directory
    // For now, return built-in templates
    return {
      'all-glm5': {
        name: 'ALL GLM-5 MODAL',
        description: 'Full GLM-5 multimodal setup',
        icon: '🧠'
      },
      'kiro-proxy-4.5': {
        name: 'ALL KIRO PROXY 4.5',
        description: 'Kiro Gateway proxy chain',
        icon: '🔮'
      },
      'multi-model-ensemble': {
        name: 'Multi-Model Ensemble',
        description: 'Parallel processing setup',
        icon: '⚡'
      }
    };
  }

  // Get active sessions like Jack's `jack_lsp`
  getActiveConnections() {
    const connections = [];
    
    for (const session of this.activeSessions.values()) {
      if (session.state === 'active') {
        for (const conn of session.connections) {
          connections.push({
            session: session.name,
            from: conn.from,
            to: conn.to,
            type: conn.type,
            active: conn.active
          });
        }
      }
    }
    
    return connections;
  }

  // Export session to graph format for TUI
  exportToGraph(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;

    return {
      nodes: session.nodes,
      connections: session.connections,
      template: session.template
    };
  }

  // Import from TUI graph
  importFromGraph(sessionId, graph) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.nodes = graph.nodes;
    session.connections = graph.connections;
    session.updatedAt = new Date().toISOString();
    
    this.saveSession(session);
    this.emit('sessionUpdated', session);
  }
}

module.exports = SessionManager;
