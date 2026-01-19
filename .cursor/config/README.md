# CTO Max Setup Configuration

This directory contains the comprehensive CTO Max orchestration configuration for the Spot repository with enterprise-ai-mobile-infra swarm.

## Configuration Files

- **cto-max-orchestration.json** - Main orchestration configuration
- **mcp-tools-activation.json** - MCP tools activation settings
- **agents-activation.json** - All specialized agents configuration
- **swarm-config.json** - Swarm mode configuration
- **keybindings.json** - Keyboard shortcuts
- **verification.json** - Verification commands and checks
- **rules.yaml** - Rules and defaults

## Features

### Activated Components
- ✅ All MCP tools enabled with default activation
- ✅ All 11 specialized agents enabled
- ✅ Orchestrator and Swarm modes enabled
- ✅ Auto-deploy, auto-test, auto-sec enabled

### Keyboard Shortcuts
- `Cmd+E` - Activate swarm mode
- `Cmd+Shift+E` - Activate orchestrator mode
- `Cmd+Shift+S` - Security agent
- `Cmd+Shift+P` - Performance agent
- `Cmd+Shift+T` - Testing agent

### Verification Commands
- `nx test` - Nx test suite
- `MCP[security]` - Security scan
- `ollama status` - Ollama service check

### Rules
- All outputs prefixed with "CTO Eleven MCP"
- Auto-deploy after successful tests
- Auto-test on code changes
- Auto-sec on code changes

## Usage

This configuration is automatically loaded when Cursor starts. All settings persist to git and are tracked in `.cursor/config`.

## Swarm Mode

Swarm mode (`Cmd+E`) activates all 11 agents in parallel:
1. Security Agent
2. Performance Agent
3. Testing Agent
4. Documentation Agent
5. Migration Agent
6. Dependencies Agent
7. Bug Hunter Agent
8. Accessibility Agent
9. API Agent
10. Database Agent
11. Beta Tester Agent

## Git Integration

- Auto-commit enabled with message: `feat(auto-cto-max)`
- All configuration files tracked in git
- Pre-commit verification runs automatically
