# Open Intelligent UI documentation

**Answers you can interact with**, by [CopilotKit](https://copilotkit.ai). The agent chooses text, native components, or custom interactive answers to help people understand, compare, and make tools.

Local prerequisites: Node.js 22+, pnpm 9+, Python 3.12+, uv, and [Ollama](https://ollama.com) signed in with `ollama signin`. The default answer model is `beam:cloud` and the default router is `clef-flash:latest`, both through Ollama with no API keys. `claude-*` and `chat-latest`/`gpt-*` overrides use Anthropic or OpenAI keys.

| Guide                                                | Description                                            |
| ---------------------------------------------------- | ------------------------------------------------------ |
| [Getting started](getting-started.md)                | Install, configure, and verify the project             |
| [Product and agent behavior](interactive-answers.md) | Response selection, examples, evidence, and follow-ups |
| [Visualization routing](visualization-routing.md) | Jev, A2UI tables, charts, diagrams, and maps |
| [Architecture](architecture.md)                      | Agent, runtime, streaming renderer, and sandbox        |
| [Deployment](deployment.md)                          | Configuration and launch verification                  |
| [Telemetry](telemetry.md)                            | What usage data is sent and how to turn it off         |
| [Bring to your app](bring-to-your-app.md)            | Adopt the integration patterns                         |
| [Agent state](agent-state.md)                        | Shared state examples                                  |
| [Generative UI](generative-ui.md)                    | Native component examples                              |
| [Agent tools](agent-tools.md)                        | Python tool examples                                   |
| [Human in the loop](human-in-the-loop.md)            | Collect user input through tools                       |
| [MCP integration](mcp-integration.md)                | Optional MCP integration                               |

Existing API and package identifiers retain their original names for compatibility. The lower-level example guides describe reusable patterns; the product behavior and current setup guides above define the experience.
