# Virtual Key Manager (VKM)

A general-purpose, multi-service API key manager with adaptive integrations, organized cycles, and background monitoring. Built as an evolution of ORKM (OpenRouter Key Manager) to support any AI service.

## Features

### Multi-Service Support
- **Built-in Services**: OpenRouter, Anthropic, OpenAI, Groq, OpenClaw, Kiro Gateway
- **Custom Services**: Add any API service with configurable endpoints and auth
- **Per-Service Configuration**: Each service can have multiple keys with custom URLs

### Adaptive Integrations
- **Auto-Configuration**: Automatically updates config files for:
  - Claude Code / Claude Code Router
  - OpenClaw
  - Aider
  - Cursor
  - Continue.dev
  - Shell environment (.bashrc/.zshrc)
- **Smart Detection**: Automatically detects installed tools and updates them
- **Environment Variables**: Manages API keys in shell profiles

### Organized Cycles
- **Cycle Management**: Create cycles that rotate through multiple services/models
- **Model Tracking**: Track which model is used per service in a cycle
- **Automatic Rotation**: Time-based rotation between services
- **History**: Complete rotation history for auditing

### Background Monitor
- **Always-On Monitoring**: Daemon runs continuously in background
- **Health Checks**: Periodic validation of all keys
- **Auto-Rotation**: Automatically switches to healthy keys on failure
- **Systemd Integration**: Native systemd user service support
- **Boot Startup**: Start monitor automatically on system boot

### Kiro Proxy Integration
- **One-Click Setup**: Clone and configure Kiro Gateway
- **Auto-Start**: Automatically start Kiro proxy when needed
- **Sonnet Kiro**: Load Claude Sonnet Kiro into tools like OpenClaw
- **Health Monitoring**: Monitor Kiro proxy status

## Quick Start

### Installation

```bash
# One-line install
curl -fsSL https://raw.githubusercontent.com/yourusername/vkm/main/setup.sh | bash

# Or manually
git clone https://github.com/yourusername/vkm.git
cd vkm
./install.sh
```

### Initialize

```bash
vkm init
```

### Add Your First Key

```bash
vkm key-add
# Select service (openrouter, anthropic, etc.)
# Enter key name and API key
```

### Start Monitor

```bash
# Start background monitor
vkm monitor

# Enable on boot
systemctl --user enable vkm-monitor.service
```

## Commands

### Key Management
```bash
vkm key-add          # Add new API key
vkm key-list         # List all keys
vkm key-check        # Check health of all keys
vkm key-remove       # Remove a key
vkm rotate [service] # Rotate to next healthy key
```

### Service Management
```bash
vkm service-list     # List available services
vkm service-add      # Add custom service
```

### Cycle Management
```bash
vkm cycle-create     # Create rotation cycle
vkm cycle-list       # List cycles
vkm cycle-activate   # Activate a cycle
vkm cycle-next       # Manually advance cycle
vkm cycle-history    # View rotation history
```

### Integration Management
```bash
vkm integration-list          # List integrations
vkm integration-enable <id>   # Enable integration
vkm integration-disable <id>  # Disable integration
```

### Kiro Proxy
```bash
vkm kiro-status      # Check Kiro status
vkm kiro-start       # Start Kiro proxy
vkm kiro-stop        # Stop Kiro proxy
vkm kiro-enable      # Enable auto-start
vkm kiro-disable     # Disable Kiro
```

### Monitoring
```bash
vkm monitor          # Start background monitor
vkm monitor-stop     # Stop monitor
vkm monitor-status   # Check monitor status
vkm logs             # View monitor logs
```

### Configuration
```bash
vkm config           # Show configuration
vkm config-set <k> <v>  # Set config value
vkm status           # Show VKM status
```

## Configuration

VKM stores configuration in `~/.vkm/`:

- `config.json` - Main configuration
- `keys.json` - API keys storage
- `services.json` - Custom service definitions
- `cycles.json` - Cycle definitions and history
- `state.json` - Current state (active keys, cycles)
- `vkm.log` - Monitor logs

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

## Cycles

Cycles allow organized rotation between services and models:

```bash
# Create a cycle that rotates through OpenRouter and Anthropic
vkm cycle-create
# Name: premium-cycle
# Services: openrouter, anthropic
# Models: openrouter=anthropic/claude-sonnet-4, anthropic=claude-3-5-sonnet-20241022
# Interval: 60 minutes

# Activate the cycle
vkm cycle-activate premium-cycle

# The monitor will automatically rotate every 60 minutes
```

## Kiro Gateway Integration

Kiro Gateway provides access to Claude Sonnet Kiro:

```bash
# Setup Kiro
vkm kiro-enable

# Add Kiro as a service
vkm key-add
# Select 'Kiro Gateway' service

# The proxy will auto-start and integrate with your tools
```

## Adding Custom Services

```bash
vkm service-add
# Service ID: my-provider
# Display name: My AI Provider
# Description: Custom AI API
# Default URL: https://api.myprovider.com/v1
# Auth header: Authorization
# Auth prefix: Bearer
```

## Systemd Service

VKM includes a systemd user service for the monitor:

```bash
# Start/stop
systemctl --user start vkm-monitor
systemctl --user stop vkm-monitor

# Enable on boot
systemctl --user enable vkm-monitor

# View logs
journalctl --user -u vkm-monitor -f
```

## Security

- Keys are stored in `~/.vkm/keys.json` with user-only permissions (0600)
- Health checks use minimal test requests
- No keys are logged
- Integration updates are atomic

## Troubleshooting

### Monitor won't start
```bash
vkm logs              # Check logs
vkm monitor-status    # Check status
systemctl --user status vkm-monitor  # Systemd status
```

### Key validation fails
```bash
vkm key-check         # Check all keys
vkm config-set monitorInterval 30000  # Faster checks
```

### Kiro not working
```bash
vkm kiro-status       # Check if running
vkm kiro-stop && vkm kiro-start  # Restart
# Check ~/.vkm/vkm.log for errors
```

## License

MIT

## Credits

- Based on ORKM (OpenRouter Key Manager)
- Kiro Gateway by [jwadow](https://github.com/jwadow/kiro-gateway)
