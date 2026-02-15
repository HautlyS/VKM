#!/usr/bin/env node

/**
 * VKM Node-based TUI
 * Jack Audio-style connection interface for Virtual Key Manager
 * Visual routing system for sessions, services, and integrations
 */

const blessed = require('neo-blessed');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Configuration paths
const VKM_DIR = path.join(process.env.HOME, '.vkm');
const CONFIG_FILE = path.join(VKM_DIR, 'config.json');
const KEYS_FILE = path.join(VKM_DIR, 'keys.json');
const SERVICES_FILE = path.join(VKM_DIR, 'services.json');
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

// Color scheme - customizable
const COLORS = {
  background: 'black',
  foreground: 'white',
  border: 'blue',
  borderFocus: 'cyan',
  service: {
    bg: 'blue',
    fg: 'white',
    border: 'blue'
  },
  key: {
    bg: 'green',
    fg: 'black',
    border: 'green'
  },
  integration: {
    bg: 'magenta',
    fg: 'white',
    border: 'magenta'
  },
  session: {
    bg: 'yellow',
    fg: 'black',
    border: 'yellow'
  },
  template: {
    bg: 'red',
    fg: 'white',
    border: 'red'
  },
  connection: {
    active: 'cyan',
    inactive: 'gray',
    error: 'red'
  },
  status: {
    healthy: 'green',
    warning: 'yellow',
    error: 'red',
    unknown: 'gray'
  }
};

// Node types
const NODE_TYPES = {
  SERVICE: 'service',
  KEY: 'key',
  INTEGRATION: 'integration',
  SESSION: 'session',
  TEMPLATE: 'template',
  ROUTER: 'router'
};

// Built-in templates
const BUILTIN_TEMPLATES = {
  'all-glm5': {
    name: 'ALL GLM-5 MODAL',
    description: 'Full GLM-5 multimodal setup across all providers',
    icon: '🧠',
    nodes: [
      { type: 'service', id: 'openrouter', x: 10, y: 5 },
      { type: 'service', id: 'zhipu', x: 10, y: 15 },
      { type: 'key', service: 'openrouter', x: 40, y: 5 },
      { type: 'key', service: 'zhipu', x: 40, y: 15 },
      { type: 'integration', id: 'openclaw', x: 70, y: 10 },
      { type: 'session', name: 'GLM-5-Session', x: 100, y: 10 }
    ],
    connections: [
      { from: 'openrouter', to: 'key:openrouter', label: 'auth' },
      { from: 'key:openrouter', to: 'openclaw', label: 'api' },
      { from: 'zhipu', to: 'key:zhipu', label: 'auth' },
      { from: 'key:zhipu', to: 'openclaw', label: 'backup' },
      { from: 'openclaw', to: 'GLM-5-Session', label: 'out' }
    ],
    config: {
      model: 'glm-5',
      fallback: true,
      loadBalance: true
    }
  },
  'kiro-proxy-4.5': {
    name: 'ALL KIRO PROXY 4.5',
    description: 'Kiro Gateway proxy chain with fallback chain',
    icon: '🔮',
    nodes: [
      { type: 'service', id: 'kiro', x: 10, y: 5 },
      { type: 'service', id: 'anthropic', x: 10, y: 15 },
      { type: 'service', id: 'openrouter', x: 10, y: 25 },
      { type: 'key', service: 'kiro', x: 40, y: 5 },
      { type: 'key', service: 'anthropic', x: 40, y: 15 },
      { type: 'key', service: 'openrouter', x: 40, y: 25 },
      { type: 'router', id: 'kiro-router', x: 70, y: 15 },
      { type: 'integration', id: 'openclaw', x: 100, y: 10 },
      { type: 'integration', id: 'claude-code', x: 100, y: 20 },
      { type: 'session', name: 'Kiro-Primary', x: 130, y: 10 },
      { type: 'session', name: 'Kiro-Fallback', x: 130, y: 20 }
    ],
    connections: [
      { from: 'kiro', to: 'key:kiro', label: 'auth' },
      { from: 'anthropic', to: 'key:anthropic', label: 'auth' },
      { from: 'openrouter', to: 'key:openrouter', label: 'auth' },
      { from: 'key:kiro', to: 'kiro-router', label: 'primary', priority: 1 },
      { from: 'key:anthropic', to: 'kiro-router', label: 'fallback', priority: 2 },
      { from: 'key:openrouter', to: 'kiro-router', label: 'backup', priority: 3 },
      { from: 'kiro-router', to: 'openclaw', label: 'route' },
      { from: 'kiro-router', to: 'claude-code', label: 'route' },
      { from: 'openclaw', to: 'Kiro-Primary', label: 'out' },
      { from: 'claude-code', to: 'Kiro-Fallback', label: 'out' }
    ],
    config: {
      autoRotate: true,
      healthCheck: true,
      rotateInterval: 3600
    }
  },
  'multi-model-ensemble': {
    name: 'Multi-Model Ensemble',
    description: 'Parallel processing across multiple models',
    icon: '⚡',
    nodes: [
      { type: 'service', id: 'anthropic', x: 10, y: 5 },
      { type: 'service', id: 'openai', x: 10, y: 15 },
      { type: 'service', id: 'groq', x: 10, y: 25 },
      { type: 'service', id: 'openrouter', x: 10, y: 35 },
      { type: 'key', service: 'anthropic', x: 40, y: 5 },
      { type: 'key', service: 'openai', x: 40, y: 15 },
      { type: 'key', service: 'groq', x: 40, y: 25 },
      { type: 'key', service: 'openrouter', x: 40, y: 35 },
      { type: 'router', id: 'ensemble-router', x: 70, y: 20, mode: 'parallel' },
      { type: 'integration', id: 'openclaw', x: 100, y: 20 },
      { type: 'session', name: 'Ensemble-Out', x: 130, y: 20 }
    ],
    connections: [
      { from: 'anthropic', to: 'key:anthropic', label: 'auth' },
      { from: 'openai', to: 'key:openai', label: 'auth' },
      { from: 'groq', to: 'key:groq', label: 'auth' },
      { from: 'openrouter', to: 'key:openrouter', label: 'auth' },
      { from: 'key:anthropic', to: 'ensemble-router', label: 'claude' },
      { from: 'key:openai', to: 'ensemble-router', label: 'gpt' },
      { from: 'key:groq', to: 'ensemble-router', label: 'llama' },
      { from: 'key:openrouter', to: 'ensemble-router', label: 'universal' },
      { from: 'ensemble-router', to: 'openclaw', label: 'merged' },
      { from: 'openclaw', to: 'Ensemble-Out', label: 'out' }
    ],
    config: {
      mode: 'parallel',
      mergeStrategy: 'voting',
      timeout: 30000
    }
  },
  'fallback-chain': {
    name: 'Fallback Chain',
    description: 'Sequential fallback through multiple providers',
    icon: '🔗',
    nodes: [
      { type: 'service', id: 'anthropic', x: 10, y: 10 },
      { type: 'service', id: 'openrouter', x: 10, y: 20 },
      { type: 'service', id: 'groq', x: 10, y: 30 },
      { type: 'key', service: 'anthropic', x: 40, y: 10 },
      { type: 'key', service: 'openrouter', x: 40, y: 20 },
      { type: 'key', service: 'groq', x: 40, y: 30 },
      { type: 'router', id: 'fallback-router', x: 70, y: 20, mode: 'failover' },
      { type: 'integration', id: 'claude-code', x: 100, y: 20 },
      { type: 'session', name: 'Fallback-Session', x: 130, y: 20 }
    ],
    connections: [
      { from: 'anthropic', to: 'key:anthropic', label: 'auth' },
      { from: 'openrouter', to: 'key:openrouter', label: 'auth' },
      { from: 'groq', to: 'key:groq', label: 'auth' },
      { from: 'key:anthropic', to: 'fallback-router', label: 'p1' },
      { from: 'key:openrouter', to: 'fallback-router', label: 'p2' },
      { from: 'key:groq', to: 'fallback-router', label: 'p3' },
      { from: 'fallback-router', to: 'claude-code', label: 'active' },
      { from: 'claude-code', to: 'Fallback-Session', label: 'out' }
    ],
    config: {
      mode: 'failover',
      retryAttempts: 3,
      healthCheckInterval: 60
    }
  },
  'round-robin': {
    name: 'Round Robin Load Balancer',
    description: 'Distribute load across multiple keys',
    icon: '🔄',
    nodes: [
      { type: 'service', id: 'openrouter', x: 10, y: 10 },
      { type: 'key', service: 'openrouter', name: 'Key-1', x: 40, y: 5 },
      { type: 'key', service: 'openrouter', name: 'Key-2', x: 40, y: 15 },
      { type: 'key', service: 'openrouter', name: 'Key-3', x: 40, y: 25 },
      { type: 'router', id: 'rr-router', x: 70, y: 15, mode: 'round-robin' },
      { type: 'integration', id: 'openclaw', x: 100, y: 15 },
      { type: 'session', name: 'Load-Balanced', x: 130, y: 15 }
    ],
    connections: [
      { from: 'openrouter', to: 'Key-1', label: 'auth' },
      { from: 'openrouter', to: 'Key-2', label: 'auth' },
      { from: 'openrouter', to: 'Key-3', label: 'auth' },
      { from: 'Key-1', to: 'rr-router', label: 'in' },
      { from: 'Key-2', to: 'rr-router', label: 'in' },
      { from: 'Key-3', to: 'rr-router', label: 'in' },
      { from: 'rr-router', to: 'openclaw', label: 'out' },
      { from: 'openclaw', to: 'Load-Balanced', label: 'session' }
    ],
    config: {
      mode: 'round-robin',
      weightBalanced: true
    }
  }
};

class VKMNodeEditor {
  constructor() {
    this.nodes = new Map();
    this.connections = [];
    this.selectedNode = null;
    this.connectingFrom = null;
    this.draggingNode = null;
    this.dragOffset = { x: 0, y: 0 };
    this.viewOffset = { x: 0, y: 0 };
    this.zoom = 1.0;
    this.gridSize = 20;
    this.showGrid = true;
    this.snapToGrid = true;
    this.currentTemplate = null;
    this.sessions = new Map();
    
    this.init();
  }

  init() {
    this.loadData();
    this.createScreen();
    this.createWidgets();
    this.setupEventHandlers();
    this.render();
  }

  loadData() {
    // Load VKM data
    this.keys = {};
    this.services = {};
    
    if (fs.existsSync(KEYS_FILE)) {
      this.keys = JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8'));
    }
    if (fs.existsSync(SERVICES_FILE)) {
      this.services = JSON.parse(fs.readFileSync(SERVICES_FILE, 'utf8'));
    }
    
    // Merge with default services
    this.services = {
      ...this.getDefaultServices(),
      ...this.services
    };
  }

  getDefaultServices() {
    return {
      openrouter: { name: 'OpenRouter', color: 'blue' },
      anthropic: { name: 'Anthropic', color: 'yellow' },
      openai: { name: 'OpenAI', color: 'green' },
      groq: { name: 'Groq', color: 'magenta' },
      kiro: { name: 'Kiro Gateway', color: 'cyan' },
      openclaw: { name: 'OpenClaw', color: 'red' }
    };
  }

  createScreen() {
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'VKM Node Editor - Jack Audio Style Connection Manager',
      cursor: {
        artificial: true,
        shape: 'line',
        blink: true,
        color: 'cyan'
      }
    });

    this.screen.key(['escape', 'q', 'C-c'], () => {
      this.quit();
    });
  }

  createWidgets() {
    // Main canvas for nodes
    this.canvas = blessed.box({
      parent: this.screen,
      top: 1,
      left: 0,
      width: '100%',
      height: '100%-3',
      style: {
        bg: COLORS.background
      },
      border: {
        type: 'line'
      },
      label: ' Connection Graph (Jack Audio Style) ',
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      mouse: true
    });

    // Toolbar
    this.toolbar = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: 1,
      style: {
        bg: 'blue',
        fg: 'white'
      },
      content: ' [N]ew Node  [T]emplate  [C]onnect  [D]elete  [S]ave  [L]oad  [R]eset  [G]rid Toggle  [Q]uit '
    });

    // Status bar
    this.statusBar = blessed.box({
      parent: this.screen,
      bottom: 0,
      left: 0,
      width: '100%',
      height: 2,
      style: {
        bg: 'black',
        fg: 'white'
      },
      border: {
        type: 'line'
      },
      label: ' Status '
    });

    // Template selector sidebar
    this.sidebar = blessed.list({
      parent: this.screen,
      top: 1,
      right: 0,
      width: 30,
      height: '50%',
      label: ' Templates ',
      border: {
        type: 'line'
      },
      style: {
        selected: {
          bg: 'cyan',
          fg: 'black'
        }
      },
      keys: true,
      mouse: true,
      items: this.getTemplateList()
    });

    // Node palette
    this.palette = blessed.list({
      parent: this.screen,
      top: '50%+1',
      right: 0,
      width: 30,
      height: '50%-4',
      label: ' Node Palette ',
      border: {
        type: 'line'
      },
      style: {
        selected: {
          bg: 'green',
          fg: 'black'
        }
      },
      keys: true,
      mouse: true,
      items: [
        'Service Node',
        'Key Node',
        'Integration Node',
        'Session Node',
        'Router Node'
      ]
    });

    // Info panel
    this.infoPanel = blessed.box({
      parent: this.screen,
      top: 1,
      left: 0,
      width: 30,
      height: '100%-3',
      label: ' Node Info ',
      border: {
        type: 'line'
      },
      content: 'Select a node to see details',
      tags: true,
      hidden: true
    });

    // Template preview modal
    this.templateModal = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: 80,
      height: 30,
      label: ' Template Preview ',
      border: {
        type: 'double'
      },
      style: {
        bg: 'black',
        border: {
          fg: 'yellow'
        }
      },
      hidden: true,
      tags: true
    });
  }

  getTemplateList() {
    return Object.entries(BUILTIN_TEMPLATES).map(([id, tpl]) => 
      `${tpl.icon} ${tpl.name}`
    );
  }

  setupEventHandlers() {
    // Keyboard shortcuts
    this.screen.key(['n'], () => this.showNodeMenu());
    this.screen.key(['t'], () => this.showTemplateSelector());
    this.screen.key(['c'], () => this.startConnection());
    this.screen.key(['d'], () => this.deleteSelected());
    this.screen.key(['s'], () => this.saveGraph());
    this.screen.key(['l'], () => this.loadGraph());
    this.screen.key(['r'], () => this.resetView());
    this.screen.key(['g'], () => this.toggleGrid());
    this.screen.key(['i'], () => this.toggleInfoPanel());
    this.screen.key(['p'], () => this.togglePalette());
    this.screen.key(['h'], () => this.showHelp());
    this.screen.key(['tab'], () => this.cycleFocus());

    // Template selection
    this.sidebar.on('select', (item, index) => {
      const templateKeys = Object.keys(BUILTIN_TEMPLATES);
      const templateId = templateKeys[index];
      this.loadTemplate(templateId);
    });

    // Palette selection
    this.palette.on('select', (item, index) => {
      const nodeTypes = ['service', 'key', 'integration', 'session', 'router'];
      this.createNode(nodeTypes[index]);
    });

    // Canvas mouse events
    this.canvas.on('mousedown', (data) => this.handleCanvasClick(data));
    this.canvas.on('mousemove', (data) => this.handleMouseMove(data));
    this.canvas.on('mouseup', () => this.handleMouseUp());
    this.canvas.on('wheelup', () => this.handleZoom(1.1));
    this.canvas.on('wheeldown', () => this.handleZoom(0.9));

    // Arrow key panning
    this.screen.key(['up'], () => this.pan(0, -20));
    this.screen.key(['down'], () => this.pan(0, 20));
    this.screen.key(['left'], () => this.pan(-20, 0));
    this.screen.key(['right'], () => this.pan(20, 0));

    // Number keys for templates
    for (let i = 1; i <= 5; i++) {
      this.screen.key([String(i)], () => {
        const keys = Object.keys(BUILTIN_TEMPLATES);
        if (keys[i - 1]) {
          this.loadTemplate(keys[i - 1]);
        }
      });
    }
  }

  createNode(type, options = {}) {
    const id = options.id || `${type}-${Date.now()}`;
    const colors = COLORS[type] || COLORS.service;
    
    const node = {
      id,
      type,
      x: options.x || 50,
      y: options.y || 10,
      width: options.width || 20,
      height: options.height || 6,
      label: options.label || id,
      data: options.data || {},
      inputs: [],
      outputs: [],
      status: 'unknown'
    };

    // Add default ports based on type
    switch (type) {
      case 'service':
        node.outputs = [{ id: 'auth', label: 'Auth', type: 'output' }];
        node.color = colors;
        break;
      case 'key':
        node.inputs = [{ id: 'in', label: 'Service', type: 'input' }];
        node.outputs = [{ id: 'out', label: 'API', type: 'output' }];
        node.color = colors;
        break;
      case 'integration':
        node.inputs = [{ id: 'api', label: 'API', type: 'input' }];
        node.outputs = [{ id: 'out', label: 'Out', type: 'output' }];
        node.color = colors;
        break;
      case 'session':
        node.inputs = [{ id: 'in', label: 'Source', type: 'input' }];
        node.color = colors;
        break;
      case 'router':
        node.inputs = [{ id: 'in', label: 'In', type: 'input' }];
        node.outputs = [
          { id: 'out1', label: 'Out 1', type: 'output' },
          { id: 'out2', label: 'Out 2', type: 'output' }
        ];
        node.color = colors;
        break;
    }

    this.nodes.set(id, node);
    this.createNodeWidget(node);
    this.updateStatus(`Created ${type} node: ${id}`);
    this.render();
    
    return node;
  }

  createNodeWidget(node) {
    const widget = blessed.box({
      parent: this.canvas,
      left: node.x,
      top: node.y,
      width: node.width,
      height: node.height,
      label: ` ${node.label} `,
      border: {
        type: 'line'
      },
      style: {
        bg: node.color?.bg || 'blue',
        fg: node.color?.fg || 'white',
        border: {
          fg: this.selectedNode?.id === node.id ? COLORS.borderFocus : (node.color?.border || 'blue')
        }
      },
      draggable: true,
      mouse: true,
      tags: true
    });

    // Add content
    let content = '';
    if (node.inputs.length) {
      content += node.inputs.map(i => `{left}${i.label}{/left}\n`).join('');
    }
    if (node.outputs.length) {
      content += node.outputs.map(o => `{right}${o.label}{/right}\n`).join('');
    }
    if (node.type === 'session') {
      content += `{center}●{/center}`;
    }
    
    widget.setContent(content);

    // Node event handlers
    widget.on('mousedown', (data) => {
      this.selectNode(node);
      this.draggingNode = node;
      this.dragOffset = {
        x: data.x - node.x,
        y: data.y - node.y
      };
    });

    widget.on('click', () => {
      if (this.connectingFrom) {
        this.completeConnection(node);
      }
    });

    node.widget = widget;
  }

  loadTemplate(templateId) {
    const template = BUILTIN_TEMPLATES[templateId];
    if (!template) return;

    this.currentTemplate = templateId;
    
    // Clear existing nodes
    this.nodes.clear();
    this.connections = [];

    // Create nodes from template
    template.nodes.forEach(nodeDef => {
      this.createNode(nodeDef.type, {
        id: nodeDef.id || `${nodeDef.type}-${Date.now()}`,
        x: nodeDef.x,
        y: nodeDef.y,
        label: nodeDef.name || nodeDef.id,
        data: { service: nodeDef.service, ...nodeDef }
      });
    });

    // Create connections
    template.connections.forEach(conn => {
      this.createConnection(conn.from, conn.to, conn);
    });

    this.updateStatus(`Loaded template: ${template.name}`);
    this.showTemplatePreview(template);
    this.render();
  }

  showTemplatePreview(template) {
    const content = `
{center}{bold}${template.icon} ${template.name}{/bold}{/center}

{fg-yellow}Description:{/fg-yellow}
${template.description}

{fg-cyan}Configuration:{/fg-cyan}
${Object.entries(template.config).map(([k, v]) => `  ${k}: ${v}`).join('\n')}

{fg-green}Nodes:{/fg-green}
${template.nodes.map(n => `  ${n.type}: ${n.id || n.name || 'unnamed'}`).join('\n')}

{fg-magenta}Connections:{/fg-magenta}
${template.connections.map(c => `  ${c.from} → ${c.to}`).join('\n')}

Press ENTER to apply or ESC to cancel
    `;
    
    this.templateModal.setContent(content);
    this.templateModal.show();
    this.templateModal.focus();
    
    this.templateModal.key(['enter'], () => {
      this.templateModal.hide();
      this.canvas.focus();
      this.applyTemplate(template);
    });
    
    this.templateModal.key(['escape'], () => {
      this.templateModal.hide();
      this.canvas.focus();
    });
    
    this.screen.render();
  }

  applyTemplate(template) {
    // Apply template configuration to VKM
    this.updateStatus(`Applying template: ${template.name}`);
    
    // Here we would actually configure VKM based on the template
    // For now, just visualize it
    
    this.render();
  }

  createConnection(fromId, toId, options = {}) {
    const from = this.nodes.get(fromId);
    const to = this.nodes.get(toId);
    
    if (!from || !to) return;

    const connection = {
      id: `conn-${Date.now()}`,
      from: fromId,
      to: toId,
      label: options.label || '',
      priority: options.priority || 0,
      active: true,
      color: options.priority === 1 ? 'cyan' : 'white'
    };

    this.connections.push(connection);
    this.drawConnection(connection);
  }

  drawConnection(conn) {
    const from = this.nodes.get(conn.from);
    const to = this.nodes.get(conn.to);
    
    if (!from || !to) return;

    // Draw connection line
    const startX = from.x + from.width;
    const startY = from.y + from.height / 2;
    const endX = to.x;
    const endY = to.y + to.height / 2;

    // Store line coordinates for rendering
    conn.line = {
      x1: startX,
      y1: startY,
      x2: endX,
      y2: endY
    };
  }

  startConnection() {
    if (this.selectedNode) {
      this.connectingFrom = this.selectedNode;
      this.updateStatus(`Click target node to connect from ${this.selectedNode.label}`);
    }
  }

  completeConnection(targetNode) {
    if (this.connectingFrom && this.connectingFrom.id !== targetNode.id) {
      this.createConnection(this.connectingFrom.id, targetNode.id);
      this.updateStatus(`Connected ${this.connectingFrom.label} → ${targetNode.label}`);
    }
    this.connectingFrom = null;
  }

  selectNode(node) {
    // Deselect previous
    if (this.selectedNode) {
      this.selectedNode.widget.style.border.fg = this.selectedNode.color?.border || 'blue';
    }
    
    this.selectedNode = node;
    node.widget.style.border.fg = COLORS.borderFocus;
    
    this.updateInfoPanel(node);
    this.render();
  }

  updateInfoPanel(node) {
    const statusColor = node.status === 'healthy' ? 'green' : 
                       node.status === 'error' ? 'red' : 'yellow';
    
    const content = `
{bold}${node.label}{/bold} (${node.type})

{fg-${statusColor}}Status: ${node.status}{/fg-${statusColor}}
Position: (${node.x}, ${node.y})

Inputs:
${node.inputs.map(i => `  • ${i.label}`).join('\n') || '  None'}

Outputs:
${node.outputs.map(o => `  • ${o.label}`).join('\n') || '  None'}

${node.data.service ? `Service: ${node.data.service}` : ''}
    `;
    
    this.infoPanel.setContent(content);
  }

  handleCanvasClick(data) {
    const x = data.x + this.viewOffset.x;
    const y = data.y + this.viewOffset.y;
    
    // Check if clicking on empty space
    if (this.snapToGrid) {
      const snappedX = Math.round(x / this.gridSize) * this.gridSize;
      const snappedY = Math.round(y / this.gridSize) * this.gridSize;
      
      if (!this.draggingNode && !this.connectingFrom) {
        // Create node at click position
        // this.createNodeAt(snappedX, snappedY);
      }
    }
  }

  handleMouseMove(data) {
    if (this.draggingNode) {
      let newX = data.x - this.dragOffset.x;
      let newY = data.y - this.dragOffset.y;
      
      if (this.snapToGrid) {
        newX = Math.round(newX / this.gridSize) * this.gridSize;
        newY = Math.round(newY / this.gridSize) * this.gridSize;
      }
      
      this.draggingNode.x = Math.max(0, newX);
      this.draggingNode.y = Math.max(0, newY);
      
      this.draggingNode.widget.left = this.draggingNode.x;
      this.draggingNode.widget.top = this.draggingNode.y;
      
      // Redraw connections
      this.updateConnections();
      this.render();
    }
  }

  handleMouseUp() {
    this.draggingNode = null;
  }

  handleZoom(factor) {
    this.zoom = Math.max(0.5, Math.min(2.0, this.zoom * factor));
    this.updateStatus(`Zoom: ${(this.zoom * 100).toFixed(0)}%`);
    this.render();
  }

  pan(dx, dy) {
    this.viewOffset.x += dx;
    this.viewOffset.y += dy;
    this.render();
  }

  updateConnections() {
    this.connections.forEach(conn => this.drawConnection(conn));
  }

  deleteSelected() {
    if (this.selectedNode) {
      // Remove connections
      this.connections = this.connections.filter(
        c => c.from !== this.selectedNode.id && c.to !== this.selectedNode.id
      );
      
      // Remove node
      this.selectedNode.widget.detach();
      this.nodes.delete(this.selectedNode.id);
      this.selectedNode = null;
      
      this.render();
    }
  }

  toggleGrid() {
    this.showGrid = !this.showGrid;
    this.updateStatus(`Grid: ${this.showGrid ? 'ON' : 'OFF'}`);
    this.render();
  }

  toggleInfoPanel() {
    this.infoPanel.hidden = !this.infoPanel.hidden;
    if (!this.infoPanel.hidden && this.selectedNode) {
      this.updateInfoPanel(this.selectedNode);
    }
    this.render();
  }

  togglePalette() {
    this.sidebar.hidden = !this.sidebar.hidden;
    this.palette.hidden = !this.palette.hidden;
    this.render();
  }

  cycleFocus() {
    if (this.canvas.focused) {
      this.sidebar.focus();
    } else if (this.sidebar.focused) {
      this.palette.focus();
    } else {
      this.canvas.focus();
    }
  }

  showNodeMenu() {
    // Show node creation menu
    const items = [
      'Service Node',
      'Key Node', 
      'Integration Node',
      'Session Node',
      'Router Node'
    ];
    
    // Create popup menu
    const menu = blessed.list({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: 30,
      height: items.length + 2,
      label: ' Create Node ',
      border: {
        type: 'line'
      },
      items: items,
      keys: true,
      mouse: true,
      style: {
        selected: {
          bg: 'cyan'
        }
      }
    });
    
    menu.focus();
    
    menu.on('select', (item, index) => {
      const types = ['service', 'key', 'integration', 'session', 'router'];
      this.createNode(types[index]);
      menu.detach();
      this.canvas.focus();
    });
    
    menu.key(['escape'], () => {
      menu.detach();
      this.canvas.focus();
    });
    
    this.render();
  }

  showTemplateSelector() {
    this.sidebar.show();
    this.sidebar.focus();
  }

  saveGraph() {
    const graph = {
      nodes: Array.from(this.nodes.values()).map(n => ({
        id: n.id,
        type: n.type,
        x: n.x,
        y: n.y,
        label: n.label,
        data: n.data
      })),
      connections: this.connections,
      template: this.currentTemplate
    };
    
    const filename = path.join(VKM_DIR, 'graph.json');
    fs.writeFileSync(filename, JSON.stringify(graph, null, 2));
    this.updateStatus(`Graph saved to ${filename}`);
  }

  loadGraph() {
    const filename = path.join(VKM_DIR, 'graph.json');
    if (fs.existsSync(filename)) {
      const graph = JSON.parse(fs.readFileSync(filename, 'utf8'));
      
      // Clear and reload
      this.nodes.clear();
      this.connections = [];
      
      graph.nodes.forEach(n => {
        this.createNode(n.type, n);
      });
      
      graph.connections.forEach(c => {
        this.createConnection(c.from, c.to, c);
      });
      
      this.currentTemplate = graph.template;
      this.updateStatus('Graph loaded');
    }
  }

  resetView() {
    this.viewOffset = { x: 0, y: 0 };
    this.zoom = 1.0;
    this.render();
  }

  showHelp() {
    const helpText = `
{center}{bold}VKM Node Editor - Help{/bold}{/center}

{bold}Keyboard Shortcuts:{/bold}
  n          - Create new node
  t          - Show template selector
  c          - Start connection
  d          - Delete selected node
  s          - Save graph
  l          - Load graph
  r          - Reset view
  g          - Toggle grid
  i          - Toggle info panel
  p          - Toggle palette
  h          - Show this help
  Tab        - Cycle focus
  
  Arrows     - Pan view
  1-5        - Quick load template
  +/-        - Zoom in/out
  
  q/Esc      - Quit

{bold}Mouse:{/bold}
  Click      - Select node
  Drag       - Move node
  Wheel      - Zoom

Press any key to close...
    `;
    
    const helpBox = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: 70,
      height: 35,
      label: ' Help ',
      border: {
        type: 'double'
      },
      content: helpText,
      tags: true,
      scrollable: true
    });
    
    helpBox.focus();
    this.screen.render();
    
    helpBox.key(['escape', 'enter', ' '], () => {
      helpBox.detach();
      this.canvas.focus();
      this.render();
    });
  }

  updateStatus(message) {
    const timestamp = new Date().toLocaleTimeString();
    this.statusBar.setContent(` [${timestamp}] ${message} | Nodes: ${this.nodes.size} | Connections: ${this.connections.length} `);
    this.screen.render();
  }

  drawGrid() {
    if (!this.showGrid) return;
    
    // Grid is drawn as background
    // In a real implementation, we'd draw dots or lines
  }

  render() {
    this.drawGrid();
    
    // Update all node widgets
    this.nodes.forEach(node => {
      if (node.widget) {
        node.widget.left = node.x;
        node.widget.top = node.y;
      }
    });
    
    // Redraw connections
    this.connections.forEach(conn => {
      this.drawConnection(conn);
    });
    
    this.screen.render();
  }

  quit() {
    this.saveGraph();
    this.screen.destroy();
    process.exit(0);
  }
}

// Start the application
if (require.main === module) {
  console.log('Starting VKM Node Editor...');
  console.log('Make sure you have blessed installed: npm install neo-blessed');
  
  try {
    const editor = new VKMNodeEditor();
  } catch (error) {
    console.error('Error starting TUI:', error.message);
    console.error('Install required dependencies:');
    console.error('  npm install neo-blessed');
    process.exit(1);
  }
}

module.exports = VKMNodeEditor;
