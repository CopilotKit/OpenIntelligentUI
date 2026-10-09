# Open Intelligent UI Documentation

Open Intelligent UI is a showcase and template for building AI agents with [CopilotKit](https://copilotkit.ai) and [LangGraph](https://langchain-ai.github.io/langgraph/). It demonstrates agent-driven UI where an AI agent and users collaboratively manipulate shared application state.

## Prerequisites

- Node.js 22+
- Python 3.12+
- [pnpm](https://pnpm.io/) 9+
- [uv](https://docs.astral.sh/uv/) (Python package manager)
- An OpenAI API key

## Documentation

| Guide | Description |
|-------|-------------|
| [Getting Started](getting-started.md) | Install, configure, and run the project |
| [Architecture](architecture.md) | How the monorepo and request flow are structured |
| [Agent State](agent-state.md) | Bidirectional state sync between agent and frontend |
| [Generative UI](generative-ui.md) | Register React components the agent can render |
| [Agent Tools](agent-tools.md) | Create Python tools that read and update state |
| [Human in the Loop](human-in-the-loop.md) | Pause the agent to collect user input |
| [MCP Integration](mcp-integration.md) | Optional Model Context Protocol server |
| [Deployment](deployment.md) | Deploy to Render or other platforms |
| [Bring to Your App](bring-to-your-app.md) | Adopt these patterns in your own project |
