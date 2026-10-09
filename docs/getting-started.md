# Getting Started

## Clone and Install

```bash
git clone https://github.com/CopilotKit/OpenIntelligentUI.git
cd OpenIntelligentUI

# Install all dependencies and create .env
make setup
```

`make setup` runs `pnpm install` and creates `apps/agent/.env` if it doesn't exist.

## Configure Environment

Add your Anthropic API key to `apps/agent/.env`:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

You can also set these optional variables in the root `.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_MODEL` | `claude-fable-5` | Claude model for the agent |
| `RATE_LIMIT_ENABLED` | `false` | Enable per-IP rate limiting |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window (ms) |
| `RATE_LIMIT_MAX` | `40` | Max requests per window |
| `MCP_SERVER_URL` | — | Optional MCP server URL |

## Run the Project

```bash
# Start all services (frontend + agent)
make dev
```

This starts:
- **Frontend** at [http://localhost:3000](http://localhost:3000) (Next.js)
- **Agent** at [http://localhost:8123](http://localhost:8123) (FastAPI/LangGraph)

You can also start services individually:

```bash
make dev-app     # Frontend only
make dev-agent   # Agent only
make dev-mcp     # MCP server only
```

## Verify It Works

1. Open [http://localhost:3000](http://localhost:3000)
2. You should see the Open Intelligent UI chat interface
3. Try typing "Create a todo list for a weekend project" or click one of the demo suggestions
4. The agent should respond and you'll see generative UI rendered in the chat

## Project Scripts

```bash
make build   # Build all apps
make lint    # Lint all apps
make clean   # Clean build artifacts
make help    # Show all available commands
```

## Next Steps

- [Architecture](architecture.md) — Understand how the pieces fit together
- [Bring to Your App](bring-to-your-app.md) — Use these patterns in your own project
