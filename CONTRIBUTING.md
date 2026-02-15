# Contributing to VKM

Thank you for your interest in contributing to VKM! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/yourusername/vkm/issues)
2. If not, create a new issue with:
   - Clear title describing the bug
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Environment (OS, Node.js version)
   - Logs or screenshots if applicable

### Suggesting Features

1. Check existing issues for similar suggestions
2. Create a new issue with:
   - Clear title prefixed with `[Feature]`
   - Description of the feature
   - Use case / why it would be useful
   - Possible implementation ideas

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Test thoroughly
5. Commit with clear messages
6. Push to your fork
7. Create a Pull Request

## Development Setup

```bash
# Clone your fork
git clone https://github.com/yourusername/vkm.git
cd vkm

# Install VKM locally for testing
cd vkm && ./install.sh

# Install TUI dependencies (optional)
cd ../vkm-tui && npm install
```

## Project Structure

```
VKM/
├── vkm/                    # Core module
│   ├── bin/vkm             # Main CLI (Node.js)
│   ├── bin/kiro-setup      # Kiro helper
│   ├── systemd/            # Service files
│   ├── install.sh          # Installer
│   └── package.json
├── vkm-tui/                # Visual editor
│   ├── src/                # Source files
│   ├── templates/          # Pre-built templates
│   └── package.json
└── .github/workflows/      # CI/CD
```

## Coding Standards

### JavaScript (VKM Core)

- Use CommonJS modules (Node.js)
- Handle errors gracefully
- Use async/await for async operations
- Add JSDoc comments for public functions
- Follow existing code style

### Shell Scripts

- Use `set -e` for error handling
- Add header comments
- Use functions for organization
- Follow existing patterns

### Commits

- Use clear, descriptive messages
- Reference issues when applicable
- Follow conventional commits format:
  - `feat: add new feature`
  - `fix: resolve bug`
  - `docs: update documentation`
  - `refactor: improve code structure`
  - `test: add tests`

## Testing

Before submitting a PR:

```bash
# Test basic CLI functionality
vkm --help
vkm init
vkm status
vkm service-list

# Test health check with test key (will fail but shouldn't crash)
vkm key-check

# Test TUI
cd vkm-tui && npm start
```

## Adding New Services

To add a new AI service:

1. Add service definition to `DEFAULT_SERVICES` in `bin/vkm`
2. Include:
   - `name`: Display name
   - `defaultUrl`: API endpoint
   - `keyPrefix`: Key prefix pattern
   - `healthEndpoint`: Health check endpoint
   - `authHeader`: Authorization header name
   - `authPrefix`: Authorization prefix
   - `models`: Available models
   - `testModel`: Model for testing
   - `testMaxTokens`: Tokens for test request

Example:
```javascript
myservice: {
  name: 'My Service',
  description: 'My AI Service',
  defaultUrl: 'https://api.myservice.com/v1',
  keyPrefix: 'ms_',
  healthEndpoint: '/models',
  authHeader: 'Authorization',
  authPrefix: 'Bearer ',
  models: ['model-1', 'model-2'],
  testModel: 'model-1',
  testMaxTokens: 5
}
```

## Adding New Integrations

To add a new tool integration:

1. Add integration definition to `INTEGRATIONS` in `bin/vkm`
2. Include:
   - `name`: Display name
   - `configFiles`: Paths to config files
   - `envVars`: Environment variable names
   - `updateStrategy`: How to update configs
   - `supportedServices`: Which services work with it

## License

By contributing, you agree that your contributions will be licensed under the MIT License.