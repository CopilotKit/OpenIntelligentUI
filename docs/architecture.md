# Architecture

Open Generative UI combines a Python agent with a CopilotKit runtime and a browser renderer. The `openGenerativeUI` runtime API and `generateSandboxedUi` tool connect them.

## Components

| Location                  | Responsibility                                            |
| ------------------------- | --------------------------------------------------------- |
| `apps/app/`               | Next.js frontend and `/api/copilotkit` runtime route      |
| `apps/agent/`             | FastAPI, LangGraph, Deep Agent, tools, prompt, and skills |
| `apps/mcp/`               | Optional standalone MCP resources and HTML assembler      |
| `packages/design-system/` | Shared theme, SVG classes, and form styles                |

Node packages use pnpm/Turborepo. The Python agent uses uv.

## Request flow

```text
User prompt or chat starter suggestion
  → CopilotKit chat / agent run
  → Next.js /api/copilotkit
  → LangGraphHttpAgent → FastAPI agent
  → model + applicable tools and skills
  → text, native component, or generateSandboxedUi
  → CopilotKit activity stream → browser renderer
```

The agent uses `create_deep_agent`, CopilotKit middleware, an Anthropic compatibility middleware, and `BoundedMemorySaver(max_threads=200)`. The checkpoint store is process memory, not durable shared storage. Restarting or scaling the agent can lose or split conversation state.

`src/model.py` chooses ChatAnthropic for `claude-*` and ChatOpenAI for `gpt-*`. It checks the selected provider's key before constructing the client. The local default is unchanged; deployed configuration can override it.

`src/prompt.py` and the three agent skills guide response selection. Plain text is appropriate for direct answers. Native components handle supported structured tasks; custom UI serves useful diagrams, comparisons, calculators, and simulations. Planning is optional. See [Product and agent behavior](interactive-answers.md).

## Streaming custom UI

The runtime enables `openGenerativeUI`; its middleware translates `generateSandboxedUi` into `open-generative-ui` activity messages. The tool's ordered fields are:

1. `initialHeight`
2. `placeholderMessages`
3. `css`
4. `html`
5. `jsFunctions`
6. `jsExpressions`

The renderer holds the placeholder until CSS is complete, progressively updates a preview iframe, then initializes the final Websandbox iframe. Shared theme CSS and a CDN importmap are injected. JavaScript function/expression channels execute as classic scripts, so top-level await is invalid; asynchronous imports belong inside async functions.

The sandbox has no same-origin access to storage or host APIs. The host exposes validated `sendPrompt({ text })` and HTTPS `openLink({ url })` callbacks through `Websandbox.connection.remote`. Resize messages are checked and bounded before setting iframe height. Keep these boundaries intact when modifying the renderer.

A follow-up starts a new agent turn. Prior generated outputs serve as separate snapshots of that answer; their local controls can still change their own UI. There is no supported cross-call DOM patch API, and arbitrary iframe control state is not automatically synchronized to the agent. Follow-up buttons should include relevant selected values explicitly.

## Chat and evidence

The page always displays CopilotChat, with three task-oriented starter suggestions. User prompts run the shared agent; answers and interactive components appear in that conversation. New chat starts a fresh thread. `query_data` returns an envelope with source metadata and all bundled sample CSV rows; its natural-language query is not applied. Neither a renderer nor a native card establishes a live data connection.

Legacy todo tools remain in the agent and can manipulate their supported state; the login-form schema is a nonfunctional demonstration. They do not define the main product experience.

## Standalone MCP

The MCP server exposes skills, prompts, and `assemble_document`. The assembler returns HTML text with shared styles and legacy postMessage helpers. A consuming host must render the document in isolation and validate bridge requests. This server does not supply the web app's Websandbox bridge or importmap, and assembling a document does not display or deploy it.

## Key implementation files

- Agent: `apps/agent/main.py`, `src/model.py`, `src/prompt.py`, `src/query.py`, `skills/`.
- Runtime: `apps/app/src/app/api/copilotkit/route.ts`, `src/lib/copilotkit-runtime-options.ts`.
- Renderer: `apps/app/src/components/generative-ui/open-generative-ui/`.
- Host bridge: `apps/app/src/lib/sandbox/`.
- MCP assembly: `apps/mcp/src/server.ts`, `src/renderer.ts`.

See [Deployment](deployment.md) for runtime configuration and operational limits.
