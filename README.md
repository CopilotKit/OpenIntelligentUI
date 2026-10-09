# Open Intelligent UI

An open-source showcase for building rich, interactive AI-generated UI with [CopilotKit](https://copilotkit.ai) and [LangChain Deep Agents](https://docs.langchain.com/oss/python/deepagents/overview). Ask the agent to visualize algorithms, create 3D animations, render charts, or generate interactive diagrams — all rendered as live HTML/SVG inside a sandboxed iframe.

https://github.com/user-attachments/assets/232cfd7c-9e99-4c6f-814b-5c7e07a87ece

## What It Does

The agent produces **generative UI** — not just text responses, but fully interactive visual components:

- **Algorithm visualizations** — binary search, BFS vs DFS, sorting algorithms
- **3D animations** — interactive WebGL/CSS3D scenes
- **Charts & diagrams** — pie charts, bar charts, network diagrams
- **Interactive widgets** — forms, simulations, math plots

All visuals are rendered in sandboxed iframes with automatic light/dark theming, progressive reveal animations, and responsive sizing.

## Quick Start

```bash
make setup    # Install deps + create .env template
# Edit apps/agent/.env with your real Anthropic API key
make dev      # Start all services
```

> **Strong models required.** Generative UI demands high-capability models that can produce complex, well-structured HTML/SVG in a single pass. The agent runs on Anthropic Claude — `claude-fable-5` by default. Override with `LLM_MODEL` in your `.env`:
>
> | Model | Notes |
> |-------|-------|
> | `claude-fable-5` | Default |
> | `claude-opus-5-5` | Strong alternative |
>
> Setting `LLM_MODEL` to a `gpt-*` name routes to OpenAI instead (requires `OPENAI_API_KEY`). For other providers, swap the chat model in `apps/agent/src/model.py` (see [docs/bring-to-your-app.md](docs/bring-to-your-app.md)). Smaller or weaker models will produce broken layouts, missing interactivity, or incomplete visualizations.

- **App**: http://localhost:3000
- **Agent**: http://localhost:8123

### Available Commands

| Command | Description |
|---------|-------------|
| `make setup` | Install all dependencies and create `.env` template |
| `make dev` | Start all services (frontend + agent + mcp) |
| `make dev-app` | Start Next.js frontend only |
| `make dev-agent` | Start LangGraph agent only |
| `make dev-mcp` | Start MCP server only |
| `make build` | Build all apps |
| `make lint` | Lint all apps |
| `make clean` | Clean build artifacts |
| `make help` | Show all available commands |

You can also use `pnpm` directly (`pnpm dev`, `pnpm dev:app`, `pnpm dev:agent`, etc.).

## MCP Server (Self-Hosted)

The repo includes a standalone [Model Context Protocol](https://modelcontextprotocol.io) server that exposes the design system, skill instructions, and an HTML document assembler to any MCP-compatible client — including Claude Desktop, Claude Code, and Cursor.

### What it provides

- **`assemble_document` tool** — wraps HTML fragments with the full design system CSS and bridge JS, returning an iframe-ready document
- **Skill resources** — browse and read skill instruction documents (`skills://list`, `skills://{name}`)
- **Prompt templates** — pre-composed prompts for widgets, SVG diagrams, and advanced visualizations

### Claude Desktop (stdio)

Add to your Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "open-intelligent-ui": {
      "command": "node",
      "args": ["dist/stdio.js"],
      "cwd": "/path/to/apps/mcp"
    }
  }
}
```

### Claude Code / HTTP clients

```bash
# Start the HTTP server
cd apps/mcp && pnpm dev
```

Add to `.mcp.json`:

```json
{
  "openIntelligentUI": {
    "url": "http://localhost:3100/mcp"
  }
}
```

See [apps/mcp/README.md](apps/mcp/README.md) for full configuration, Docker deployment, and API reference.

## Architecture

Turborepo monorepo with three packages:

```
apps/
├── app/       Next.js 16 frontend (CopilotKit v2, React 19, Tailwind 4)
├── agent/     Deep Agent (deepagents + CopilotKit middleware, skills-based)
└── mcp/       Standalone MCP server (design system + skills + document assembler)
```

### Deep Agent + Skills

The agent backend uses [LangChain Deep Agents](https://docs.langchain.com/oss/python/deepagents/overview) (`create_deep_agent`) with a skills-based architecture. Instead of injecting all visualization instructions into the system prompt, skills are defined as `SKILL.md` files in `apps/agent/skills/` and loaded on-demand via progressive disclosure:

```
apps/agent/skills/
├── advanced-visualization/SKILL.md   # UI mockups, dashboards, Chart.js, generative art
├── master-playbook/SKILL.md          # Response philosophy, decision trees, narration patterns
└── svg-diagrams/SKILL.md             # SVG generation rules, component patterns, diagram types
```

Deep agents also provide built-in planning (`write_todos`), filesystem tools, and sub-agent support.

### How It Works

Open Intelligent UI is built on CopilotKit's Open Generative UI. Read the [Open Generative UI docs](https://docs.copilotkit.ai/generative-ui/open-generative-ui) to see how it works under the hood.

1. **User sends a prompt** via the CopilotKit chat UI
2. **Deep agent decides** whether to respond with text, call a tool, or render a visual component — consulting relevant skills as needed
3. **`generateSandboxedUi`** — the canonical tool the CopilotKit runtime exposes when `openGenerativeUI` is enabled — receives the UI as ordered streaming parameters: `initialHeight` → `placeholderMessages` → `css` → `html` → `jsFunctions` → `jsExpressions`
4. **`OpenGenerativeUIMiddleware`** in the runtime translates the streaming tool call into `open-generative-ui` activity events the frontend subscribes to
5. **The demo's activity renderer** (registered via `renderActivityMessages`) shows the html streaming in live — morphing each update into a preview iframe with Idiomorph so nothing flickers — then boots the final websandbox iframe with the shared design-system CSS and CDN importmap injected
6. **Sandbox bridge + autosize** — the generated UI calls back into the host through Zod-validated `sendPrompt`/`openLink` sandbox functions, and a ResizeObserver inside the iframe continuously reports content height for seamless auto-sizing

### Key CopilotKit Patterns

| Pattern | Hook / Option | Example |
|---------|---------------|---------|
| [Open Generative UI](https://docs.copilotkit.ai/generative-ui/open-generative-ui) | `openGenerativeUI` + `renderActivityMessages` | Streaming sandboxed widgets via `generateSandboxedUi` |
| Generative UI | `useComponent` | Pie charts, bar charts |
| Frontend tools | `useFrontendTool` | Theme toggle |
| Human-in-the-loop | `useHumanInTheLoop` | Meeting scheduler |
| Default tool render | `useDefaultRenderTool` | Tool execution status |

## Decision Matrix — Picking the Right Visual

| User asks about...          | Output type              | Technology          |
|-----------------------------|--------------------------|---------------------|
| How X works (physical)      | Illustrative diagram     | SVG                 |
| How X works (abstract)      | Interactive explainer    | HTML + inline SVG   |
| Process / steps             | Flowchart                | SVG                 |
| Architecture / containment  | Structural diagram       | SVG                 |
| Database schema / ERD       | Relationship diagram     | Mermaid             |
| Trends over time            | Line chart               | Chart.js            |
| Category comparison         | Bar chart                | Chart.js            |
| Part of whole               | Doughnut chart           | Chart.js            |
| KPIs / metrics              | Dashboard                | HTML metric cards   |
| Design a UI                 | Mockup                   | HTML                |
| Choose between options      | Comparison cards         | HTML grid           |
| Cyclic process              | Step-through             | HTML stepper        |
| Physics / math              | Simulation               | Canvas + JS         |
| Function / equation         | Plotter                  | SVG + JS            |
| Data exploration            | Sortable table           | HTML + JS           |
| Creative / decorative       | Art / illustration       | SVG                 |
| 3D visualization            | 3D scene                 | Three.js            |
| Music / audio               | Synthesizer              | Tone.js             |
| Network / graph             | Force layout             | D3.js               |
| Quick factual answer        | Plain text               | None                |
| Code solution               | Code block               | None                |
| Emotional support           | Warm text                | None                |

## Tech Stack

Next.js 16, React 19, Tailwind CSS 4, LangChain Deep Agents, LangGraph, CopilotKit v2, Turborepo, Recharts

## Star History

<a href="https://www.star-history.com/?repos=CopilotKit%2FOpenIntelligentUI&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=CopilotKit/OpenIntelligentUI&type=date&theme=dark&legend=bottom-right" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=CopilotKit/OpenIntelligentUI&type=date&legend=bottom-right" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=CopilotKit/OpenIntelligentUI&type=date&legend=bottom-right" />
 </picture>
</a>

## License

MIT
