# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.1] - 2024-02-15

### Fixed
- Improved error handling in health check functions
- Fixed Anthropic API health check (uses test completion instead of /models)
- Added safe JSON parsing to prevent crashes on malformed responses
- Fixed command aliases not working (key-add, key-list, etc.)
- Added proper timeout handling for network requests
- Rate-limited keys now reported as healthy with warning
- Better error messages for failed key rotations

### Added
- Version flag (`--version`, `-v`)
- Debug mode with `VKM_DEBUG=1` environment variable
- Comprehensive error details in rotation failures

## [2.0.0] - 2024-02-14

### Added
- **Multi-Service Support**: Extended from ORKM to support OpenRouter, Anthropic, OpenAI, Groq, OpenClaw, Kiro Gateway
- **Custom Services**: Add any API service with configurable endpoints
- **Adaptive Integrations**: Auto-updates config files for multiple tools
  - Claude Code / Claude Code Router
  - OpenClaw
  - Aider
  - Cursor
  - Continue.dev
  - Shell environment (.bashrc/.zshrc)
- **Cycle Management**: Create rotation cycles that switch between services
- **Background Monitor**: Daemon for continuous health checking
- **Systemd Integration**: Native systemd user service support
- **Kiro Proxy Integration**: One-click setup for Claude Sonnet Kiro proxy
- **VKM TUI**: Jack Audio-style visual node editor
  - Drag & drop interface
  - Visual connection routing
  - Pre-built templates
  - Session management

### Changed
- Renamed from ORKM to VKM (Virtual Key Manager)
- Expanded from OpenRouter-only to multi-service
- Improved key health checking with service-specific tests

### Security
- Keys stored with 0600 permissions
- No keys logged in normal operation
- Atomic integration updates

## [1.0.0] - Initial Release

### Added
- Basic OpenRouter key management
- Key health checking
- Simple rotation
- Claude Code integration