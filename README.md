# VKM - Virtual Key Manager

A general-purpose, multi-service API key manager with adaptive integrations, organized cycles, and background monitoring. Built as an evolution of ORKM (OpenRouter Key Manager) to support any AI service.

## Features

### Core Features
- **Multi-Service Support**: OpenRouter, Anthropic, OpenAI, Groq, OpenClaw, Kiro Gateway + custom services
- **Adaptive Integrations**: Auto-updates config files for Claude Code, OpenClaw, Aider, Cursor, Continue.dev, Shell
- **Key Rotation**: Automatic failover to healthy keys when one fails
- **Cycle Management**: Rotate through multiple services/models on schedule
- **Background Monitor**: Daemon for continuous health checking
- **Kiro Proxy Integration**: One-click setup for Claude Sonnet Kiro proxy

### VKM TUI (Node Editor)
A Jack Audio Connection Kit-style visual interface for managing API connections:
- Drag & drop node editor
- Visual connection routing
- Pre-built templates for common setups
- Session management

## Project Structure

```
VKM/
├── README.md              # This file
├── vkm/                   # Core VKM module
│   ├── bin/
│   │   ├── vkm            # Main CLI executable
│   │   └── kiro-setup     # Kiro gateway setup helper
│   ├── config/            # Default config files
│   ├── integrations/      # Integration scripts
│   ├── lib/               # Library modules
│   ├── systemd/           # Systemd service files
│   ├── install.sh         # Core installation script
│   ├── install-complete.sh# Full installation (vkm + tui)
│   └── setup.sh           # Quick setup script
├── vkm-tui/               # Node-based Visual Editor
│   ├── bin/
│   │   └── vkm-tui        # TUI launcher
│   ├── src/
│   │   ├── vkm-tui.js     # Main TUI application
│   │   ├── graph-engine.js # Graph processing engine
│   │   └── session-manager.js # Session persistence
│   ├── templates/
│   │   └── templates.json # Pre-built templates
│   ├── package.json
│   └── README.md
├── CHANGELOG.md           # Version history
├── CONTRIBUTING.md        # Contribution guidelines
└── .github/
    └── workflows/
        └── release.yml    # GitHub Actions release
```

## Installation

### Quick Install (Recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/yourusername/vkm/main/vkm/setup.sh | bash
```

### Manual Install

```bash
git clone https://github.com/yourusername/vkm.git
cd vkm/vkm
./install.sh
```

### Full Install (VKM + TUI)

```bash
cd vkm
./install-complete.sh
```

## Quick Start

```bash
# Initialize VKM
vkm init

# Add your first API key
vkm key-add

# Check status
vkm status

# Start background monitor
vkm monitor

# Launch visual editor
vkm tui
```

## Commands

### Key Management
| Command | Description |
|---------|-------------|
| `vkm key-add` | Add new API key |
| `vkm key-list` | List all keys |
| `vkm key-check` | Check health of all keys |
| `vkm key-remove` | Remove a key |
| `vkm rotate [service]` | Rotate to next healthy key |

### Service Management
| Command | Description |
|---------|-------------|
| `vkm service-list` | List available services |
| `vkm service-add` | Add custom service |

### Cycle Management
| Command | Description |
|---------|-------------|
| `vkm cycle-create` | Create rotation cycle |
| `vkm cycle-list` | List cycles |
| `vkm cycle-activate <name>` | Activate a cycle |
| `vkm cycle-next` | Manually advance cycle |
| `vkm cycle-history` | View rotation history |

### Integration Management
| Command | Description |
|---------|-------------|
| `vkm integration-list` | List integrations |
| `vkm integration-enable <id>` | Enable integration |
| `vkm integration-disable <id>` | Disable integration |

### Kiro Proxy
| Command | Description |
|---------|-------------|
| `vkm kiro-status` | Check Kiro status |
| `vkm kiro-start` | Start Kiro proxy |
| `vkm kiro-stop` | Stop Kiro proxy |
| `vkm kiro-enable` | Enable auto-start |
| `vkm kiro-disable` | Disable Kiro |

### Monitoring
| Command | Description |
|---------|-------------|
| `vkm monitor` | Start background monitor |
| `vkm monitor-stop` | Stop monitor |
| `vkm monitor-status` | Check monitor status |
| `vkm logs` | View monitor logs |

### Session & Template (TUI)
| Command | Description |
|---------|-------------|
| `vkm tui` | Launch visual node editor |
| `vkm session-list` | List sessions |
| `vkm session-create <name>` | Create session |
| `vkm template-list` | List templates |
| `vkm template-apply <id>` | Apply template |

## Configuration

VKM stores configuration in `~/.vkm/`:

| File | Purpose |
|------|---------|
| `config.json` | Main configuration |
| `keys.json` | API keys (chmod 600) |
| `services.json` | Custom services |
| `cycles.json` | Cycle definitions |
| `state.json` | Current state |
| `vkm.log` | Monitor logs |
| `vkm.pid` | Monitor PID |

### Default Configuration

```json
{
  "version": "2.0.0",
  "defaultService": "openrouter",
  "monitorEnabled": true,
  "monitorInterval": 60000,
  "rotationEnabled": true,
  "cycleEnabled": true,
  "kiroProxyEnabled": false,
  "kiroProxyPort": 8787,
  "kiroProxyAutoStart": true,
  "integrations": ["claude-code", "claude-code-router", "openclaw", "shell"]
}
```

## Built-in Services

| Service | Description | Key Prefix |
|---------|-------------|------------|
| openrouter | OpenRouter AI Gateway | `sk-or-v1-` |
| anthropic | Anthropic Claude API | `sk-ant-` |
| openai | OpenAI API | `sk-` |
| groq | Groq API | `gsk_` |
| openclaw | OpenClaw MCP Gateway | `claw-` |
| kiro | Kiro Gateway | `kiro-` |

## Integrations

| Integration | Config Files | Services |
|-------------|--------------|----------|
| Claude Code | `~/.claude-code-router/config.json` | anthropic, openrouter, kiro |
| Claude Code Router | `~/.claude-code-router/config.json` | openrouter, anthropic, kiro |
| OpenClaw | `~/.openclaw/config.yaml` | openclaw, anthropic, openrouter |
| Aider | `~/.aider.conf.yml` | openai, anthropic, openrouter |
| Cursor | `~/.cursor/settings.json` | openai, anthropic, openrouter |
| Continue.dev | `~/.continue/config.json` | openai, anthropic, openrouter, groq |
| Shell | `~/.bashrc`, `~/.zshrc` | * |

## TUI Templates

Pre-built templates available in the visual editor:

1. **ALL GLM-5 MODAL** - Full GLM-5 multimodal with fallback
2. **ALL KIRO PROXY 4.5** - Kiro Gateway with Claude fallback chain
3. **Multi-Model Ensemble** - Parallel processing across models
4. **Fallback Chain** - Sequential provider fallback
5. **Round Robin** - Load-balanced key rotation

## Systemd Service

```bash
# Enable on boot
systemctl --user enable vkm-monitor.service

# Start/stop
systemctl --user start vkm-monitor
systemctl --user stop vkm-monitor

# View logs
journalctl --user -u vkm-monitor -f
```

## Security

- Keys stored in `~/.vkm/keys.json` with 0600 permissions
- Health checks use minimal test requests
- No keys are logged
- Integration updates are atomic

## Requirements

- Node.js 16+
- npm or pnpm (for TUI)
- git (for Kiro Gateway setup)

## Development

```bash
# Clone repository
git clone https://github.com/yourusername/vkm.git
cd vkm

# Install VKM locally
cd vkm && ./install.sh

# Install TUI dependencies
cd ../vkm-tui && npm install
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT

## Credits

- Based on ORKM (OpenRouter Key Manager)
- Kiro Gateway by [jwadow](https://github.com/jwadow/kiro-gateway)
- TUI built with [neo-blessed](https://github.com/niklasf/neo-blessed)