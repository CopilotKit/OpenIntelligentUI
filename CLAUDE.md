# Open Generative UI by CopilotKit

This repository builds a general assistant experience around **answers you can interact with**: understand a topic, compare options, or make a useful tool. It is not primarily a todo-list template. Existing todo and form tools are compatibility examples, not the product's organizing concept.

## Boundaries and source of truth

- Frontend: `apps/app/`, Next.js and CopilotKit v2.
- Agent: `apps/agent/main.py`, `src/prompt.py`, `src/model.py`, and `skills/`.
- Custom UI: `apps/app/src/components/generative-ui/open-generative-ui/`.
- Validated host callbacks: `apps/app/src/lib/sandbox/`.
- Standalone MCP: `apps/mcp/`; its HTML assembler and legacy bridge are separate from the web app.
- Shared styling: `packages/design-system/`.

Use the product name in visible copy. Preserve repository URLs, package names, `openGenerativeUI`, `generateSandboxedUi`, activity/event names, and deployment service names unless a task explicitly migrates them.

## Agent behavior

Choose text for direct answers, native components when their schemas fit, and custom UI when a diagram or interaction helps. There is no mandatory acknowledgement/plan/build/narrate sequence. Distinct sections may use multiple tools; do not repeat a successful build merely because it returned "UI generated".

Label sample assumptions and distinguish user inputs, retrieved evidence, and calculated values. `query_data` returns a metadata envelope with bundled sample CSV rows and does not apply its query. There is no built-in live weather or business-data connection. Never imply a mock form authenticates or persists data.

Generated controls must work, validate numerical edge cases, support keyboard access and narrow screens, and expose useful errors. Use the user's selected values when sending a deliberate follow-up. Each follow-up is a new turn/output; do not assume a cross-call patch API or persist iframe state through rerenders.

## Streaming contract

Emit `initialHeight`, `placeholderMessages`, `css`, `html`, `jsFunctions`, `jsExpressions` in that order. Styles belong in `css`; functions and invocations use their separate channels. Those JavaScript channels run as classic scripts, so dynamic imports with await belong inside async functions, never at top level.

Use the existing validated `Websandbox.connection.remote.sendPrompt({ text })` and HTTPS `openLink({ url })` bridge. Do not replace it with unrestricted parent messages. The sandbox has no same-origin storage or fetch access. Preserve preview isolation, final sandbox initialization, and incremental streaming behavior.

## Configuration and checks

The local default model is `chat-latest` (ChatGPT Instant). `claude-*` requires `ANTHROPIC_API_KEY`; `chat-latest` and `gpt-*` require `OPENAI_API_KEY`. Jev routing requires `TYPESAFE_API_KEY`. Do not invent native model APIs or silently change pinned model IDs. See `render.yaml` for its separate explicit deployment model setting.

```bash
pnpm install
pnpm test
uv run --directory apps/agent pytest
pnpm lint
pnpm build
```

Use focused tests while developing, then relevant workspace checks. Inspect the [launch workflow](docs/deployment.md#verification-and-launch) for browser and live-provider validation. A rendered chat shell does not prove AI generation works. Keep secrets out of source, generated UI, logs, and screenshots. Do not describe a local build as a deployed release.

See [Architecture](docs/architecture.md) and [Product and agent behavior](docs/interactive-answers.md).
