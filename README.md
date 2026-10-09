# Open Intelligent UI

**Answers you can interact with.** An open-source project by [CopilotKit](https://copilotkit.ai).

Watch the launch film · 54 seconds

https://github.com/user-attachments/assets/eb1666c1-e177-410b-96eb-9eb5c5534d95

Ask a question, explore an idea, compare your options, or make a tool for the moment. The agent chooses a direct text answer, a native component, or a custom interactive UI based on what helps you accomplish the task.

- **Understand** — explore a mechanism, step through an explanation, or change a variable.
- **Compare** — examine criteria, assumptions, and tradeoffs side by side.
- **Make a tool** — use a calculator, planner, or interactive model with working controls.

The interface opens directly to chat. Type your request or choose a starter suggestion to begin an agent run. Text, native components, and generated interactive answers appear in the conversation. Sample numbers are illustrations, not live business or weather data.

## Demo scenes

From the launch film: explanations, comparisons, working tools, and maps in one conversation.

| 3D explanations | Tables → charts |
| --- | --- |
| ![3D airplane with pitch, roll, and yaw controls](https://github.com/user-attachments/assets/b74a1551-a096-4c12-84e8-af79949a2df6) | ![A plan comparison becomes a cost-per-seat chart](https://github.com/user-attachments/assets/6a25cc1d-d401-4914-b4f8-6488f3b17005) |
| Explore aircraft rotation with labeled axes and sliders. | Compare exact values, then visualize them with a follow-up. |

| Interactive tools | Maps |
| --- | --- |
| ![Bill splitter recalculating the share per person](https://github.com/user-attachments/assets/dea3c40b-025c-4d50-8fef-b14c50e3ca62) | ![California coastal itinerary with numbered map pins and photo cards](https://github.com/user-attachments/assets/098d4aad-95a9-4229-aae6-2de38f1eaa69) |
| Change the group size and tip; the calculation updates. | Follow a coastal itinerary with map pins and destination photos. |

<details>
<summary>Watch the four short clips</summary>

**3D plane · 4 seconds**

https://github.com/user-attachments/assets/d0f96662-c8c0-4b25-8c0a-c26b032eb463

**Tables and charts · 8 seconds**

https://github.com/user-attachments/assets/36c67a73-ddcf-4d64-b76a-ff659c988836

**Bill splitter · 5 seconds**

https://github.com/user-attachments/assets/a878a71c-2189-4313-848d-49216b52ce5b

**Coastal map · 4 seconds**

https://github.com/user-attachments/assets/2dd65441-e0e7-4813-891f-9bd476e873d6

</details>

## Try it

- **Animate a coastal trip** — a real USGS map with numbered pins, credited destination photos, and a six-second pin-drop sequence. Pause, replay, or select a stop. Connections are illustrative, not verified driving directions.
- **Pitch, Roll & Yaw** — rotate a 3D airplane with labeled axes, angle controls, smooth demonstrations, and reset.
- **Find your kind of weekend** — compare trip ideas and adjust your preferences.
- **Split the bill fairly** — change the total, tip, and group size in a working calculator.

These starters run the agent; they are not prerecorded responses. Jev chooses the presentation, so outputs can vary. Map tiles and destination photos require network access. Streaming answers preserve your reading position, reveal text as it enters view, and show the copy action on hover or keyboard focus (always available on touch).

## Run locally

Prerequisites: Node.js 22+, pnpm 9+, Python 3.12+, and [uv](https://docs.astral.sh/uv/).

```bash
git clone https://github.com/CopilotKit/OpenIntelligentUI.git
cd OpenIntelligentUI
make setup
# Set OPENAI_API_KEY and TYPESAFE_API_KEY in apps/agent/.env
make dev
```

Open the [app](http://localhost:3000). The [agent health endpoint](http://localhost:8123/health) confirms the agent service is running. See [Getting started](docs/getting-started.md) for configuration and verification.

The default model is `chat-latest`, OpenAI’s documented alias for the latest ChatGPT Instant model, requiring `OPENAI_API_KEY`. Jev (`jev-latest`, requiring `TYPESAFE_API_KEY`) selects the renderer and visualization for each user turn. Basic tables use A2UI; charts, diagrams, calculators, and maps use Open Generative UI. Provider failures are surfaced instead of silently substituting another router or model. See [Visualization routing](docs/visualization-routing.md).

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
- [Source repository](https://github.com/CopilotKit/OpenIntelligentUI)

## License

MIT
