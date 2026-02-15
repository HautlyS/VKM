# VKM TUI - Node-Based Visual Editor

A Jack Audio Connection Kit-style visual interface for VKM (Virtual Key Manager). Manage your API keys, services, and integrations through an intuitive node-based graph editor.

## Features

### 🎨 Visual Node Editor
- **Drag & Drop Interface**: Create and arrange nodes visually
- **Connection Routing**: Draw connections between nodes like Jack Audio
- **Real-time Visualization**: See active connections and data flow
- **Grid Snapping**: Professional alignment with customizable grid

### 🧩 Node Types

#### Service Nodes
- Represent AI service providers (OpenRouter, Anthropic, OpenAI, etc.)
- Show service status and health
- Output authentication signals

#### Key Nodes
- Hold API key credentials
- Connect to service nodes for auth
- Support multiple keys per service

#### Integration Nodes
- Represent tools like OpenClaw, Claude Code, Aider
- Receive API keys and configure tools
- Show integration status

#### Session Nodes
- Active connection sessions
- Monitor request/response flow
- Track session statistics

#### Router Nodes
- **Failover Router**: Try connections in priority order
- **Round-Robin Router**: Distribute load evenly
- **Load Balancer**: Weighted distribution
- **Parallel Router**: Send to all outputs simultaneously
- **Circuit Breaker**: Prevent cascade failures

### 📦 Pre-built Templates

#### 1. ALL GLM-5 MODAL 🧠
Full GLM-5 multimodal setup with intelligent fallback
- Primary: Zhipu GLM-5
- Fallback: OpenRouter GLM-5 mirror
- Auto-failover on connection issues

#### 2. ALL KIRO PROXY 4.5 🔮
Kiro Gateway with Claude Sonnet fallback chain
- Kiro Proxy (local) → Anthropic → OpenRouter
- Response caching
- Multi-tool integration (OpenClaw, Claude Code, Aider)

#### 3. Multi-Model Ensemble ⚡
Parallel processing across multiple models
- Send requests to multiple providers simultaneously
- Merge responses
- Perfect for comparison and voting

#### 4. Fallback Chain 🔗
Sequential provider fallback
- Anthropic → OpenRouter → Groq
- Automatic retry on failure
- Configurable retry attempts

#### 5. Round Robin Load Balancer 🔄
Distribute load across multiple keys
- Even distribution
- Health-aware routing
- Perfect for rate limit management

### 🎮 Keyboard Shortcuts

#### Navigation
- `↑↓←→` - Pan view
- `+/-` - Zoom in/out
- `Tab` - Cycle focus between panels
- `r` - Reset view
- `g` - Toggle grid

#### Node Operations
- `n` - Create new node
- `t` - Show template selector
- `c` - Start connection
- `d` - Delete selected node
- Click & drag - Move node

#### File Operations
- `s` - Save graph
- `l` - Load graph
- `i` - Toggle info panel
- `p` - Toggle palette

#### Quick Templates
- `1-5` - Load templates 1-5 instantly

#### Other
- `h` - Show help
- `q` / `Esc` - Quit

## Installation

The TUI is included with VKM. Simply run:

```bash
vkm tui
```

On first run, it will install required dependencies (neo-blessed).

### Manual Installation

```bash
cd vkm-tui
npm install
./bin/vkm-tui
```

## Usage

### Launch Visual Editor
```bash
vkm tui
```

### Create Custom Session
```bash
# Create session from template
vkm session-create my-session kiro-proxy-4.5

# Start session
vkm session-start my-session

# Or use TUI for visual management
vkm tui
```

### Apply Template Directly
```bash
vkm template-apply kiro-proxy-4.5
```

### List Available Templates
```bash
vkm template-list
```

## Session Management

Sessions are like Jack Audio "patchbays" - they persist your connection graphs:

```bash
# List sessions
vkm session-list

# Create new session
vkm session-create my-api-mesh

# Start session (activates all connections)
vkm session-start my-api-mesh

# Stop session (deactivates connections)
vkm session-stop my-api-mesh

# Export session graph
vkm graph-export
```

## Graph File Format

Sessions and graphs are saved as JSON:

```json
{
  "nodes": [
    {
      "id": "anthropic",
      "type": "service",
      "x": 10,
      "y": 10,
      "label": "Anthropic"
    },
    {
      "id": "key-1",
      "type": "key",
      "x": 40,
      "y": 10,
      "data": { "service": "anthropic" }
    }
  ],
  "connections": [
    { "from": "anthropic", "to": "key-1", "label": "auth" }
  ]
}
```

## Customization

### Color Scheme
Edit colors in `src/vkm-tui.js`:

```javascript
const COLORS = {
  service: { bg: 'blue', fg: 'white' },
  key: { bg: 'green', fg: 'black' },
  integration: { bg: 'magenta', fg: 'white' },
  // ...
};
```

### Grid Settings
```javascript
this.gridSize = 20;     // Grid spacing
this.snapToGrid = true; // Enable snapping
this.showGrid = true;   // Show/hide grid
```

### Custom Templates

Add templates to `templates/templates.json`:

```json
{
  "my-custom-template": {
    "name": "My Template",
    "description": "Description",
    "icon": "🚀",
    "nodes": [...],
    "connections": [...]
  }
}
```

## Integration with VKM

The TUI is fully integrated with VKM:

- **Keys**: Visual key management links to VKM key storage
- **Services**: Uses VKM service definitions
- **Integrations**: Updates VKM integration configs
- **Monitor**: Visual feedback from VKM monitor daemon

## Troubleshooting

### TUI won't start
```bash
# Install dependencies manually
cd /path/to/vkm-tui
npm install neo-blessed

# Check Node version
node --version  # Must be 16+
```

### Connection lines not showing
- Ensure terminal supports Unicode
- Try: `export LANG=en_US.UTF-8`

### Performance issues
- Reduce number of visible nodes
- Disable grid: Press `g`
- Lower zoom level

### Template not loading
- Check template exists: `vkm template-list`
- Verify template JSON syntax
- Check console for errors

## Architecture

```
vkm-tui/
├── bin/vkm-tui          # Launcher script
├── src/
│   ├── vkm-tui.js      # Main TUI application
│   ├── graph-engine.js # Graph processing engine
│   └── session-manager.js # Session persistence
├── templates/
│   └── templates.json  # Pre-built templates
└── package.json
```

## Comparison with Jack Audio

| Jack Audio | VKM TUI |
|------------|---------|
| Audio sources | API Services |
| Audio sinks | Integrations |
| Patch cables | Connections |
| Sessions | Connection graphs |
| `jack_lsp` | `vkm session-list` |
| `jack_connect` | Visual connection drag |
| `qjackctl` | `vkm tui` |

## License

MIT - Same as VKM

## Credits

- Inspired by Jack Audio Connection Kit
- Built with neo-blessed
- Templates from VKM community
