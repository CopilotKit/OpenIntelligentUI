# Open Generative UI

**Answers you can interact with.** An open-source project by [CopilotKit](https://copilotkit.ai).

Ask a question, explore an idea, compare your options, or make a tool for the moment. The agent chooses a direct text answer, a native component, or a custom interactive UI based on what helps you accomplish the task.

- **Understand** — explore a mechanism, step through an explanation, or change a variable.
- **Compare** — examine criteria, assumptions, and tradeoffs side by side.
- **Make a tool** — use a calculator, planner, or interactive model with working controls.

The interface opens directly to chat. Type your request or choose one of three starter suggestions to begin an agent run. Text, native components, and generated interactive answers appear in the conversation. Sample numbers are illustrations, not live business or weather data.

## Run locally

Prerequisites: Node.js 22+, pnpm 9+, Python 3.12+, and [uv](https://docs.astral.sh/uv/).

```bash
make setup
# Edit apps/agent/.env with your provider key and optional LLM_MODEL
make dev
```

Open the [app](http://localhost:3000). The [agent health endpoint](http://localhost:8123/health) confirms the agent service is running. See [Getting started](docs/getting-started.md) for configuration and verification.

The default model is `chat-latest`, OpenAI’s documented alias for the latest ChatGPT Instant model, requiring `OPENAI_API_KEY`. Jev (`jev-latest`, requiring `TYPESAFE_API_KEY`) selects the renderer and visualization for each user turn. Basic tables use A2UI; charts, diagrams and calculators use Open Generative UI. Provider failures are surfaced instead of silently substituting another router or model. See [Visualization routing](docs/visualization-routing.md).

## How it works

The Python Deep Agent uses a task-first system prompt and focused skills. CopilotKit carries the agent stream to the Next.js app. Native components handle supported structured tasks; `generateSandboxedUi` streams custom HTML, CSS, and JavaScript into an isolated iframe.

Custom UI parameters must arrive in this order:

`initialHeight` → `placeholderMessages` → `css` → `html` → `jsFunctions` → `jsExpressions`

Local controls run inside the sandbox. A user-clicked follow-up can send selected values through the validated host bridge and start another agent turn. Prior outputs remain separate conversation artifacts; there is no cross-call patch API. See [Product and agent behavior](docs/interactive-answers.md) and [Architecture](docs/architecture.md).

```text
apps/app/                Next.js + CopilotKit frontend
apps/agent/              Python Deep Agent + FastAPI
apps/mcp/                Optional standalone MCP server
packages/design-system/  Shared theme, SVG, and form styles
```

## Development

```bash
make dev-app     # Frontend
make dev-agent   # Agent
make dev-mcp     # Optional MCP server
pnpm test       # JavaScript workspace tests
uv run --directory apps/agent pytest
make lint
make build
```

The [launch workflow](docs/deployment.md#verification-and-launch) includes browser checks and a real provider smoke test. Tests and builds alone do not verify model access or a deployment.

## Standalone MCP

The optional MCP server exposes skill resources, prompt templates, and `assemble_document`. The assembler returns an HTML document as text; a compatible host must render it and implement its bridge. It is distinct from the web app's streaming Websandbox integration.

See the [MCP server guide](apps/mcp/README.md) for HTTP, stdio, and Docker configuration.

## Compatibility and documentation

Built with CopilotKit. The `openGenerativeUI` runtime API and `generateSandboxedUi` tool power the streaming experience.

- [Documentation index](docs/README.md)
- [Bring these patterns to your app](docs/bring-to-your-app.md)
- [Source repository](https://github.com/CopilotKit/OpenGenerativeUI)

## License

MIT
