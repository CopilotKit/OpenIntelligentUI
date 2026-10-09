# OpenGenerativeUI MCP Server

A standalone, independently deployable [Model Context Protocol](https://modelcontextprotocol.io) server that exposes OpenGenerativeUI's design system, skills, and document renderer to any MCP-compatible client.

## Features

- **Design System Tool** — `assemble_document` wraps HTML fragments with OpenGenerativeUI's complete CSS design system and bridge JavaScript
- **Skill Resources** — Browse and read skill instruction documents via `skills://list` and `skills://{name}`
- **Prompt Templates** — Pre-composed prompts for common visualization tasks: `create_widget`, `create_svg_diagram`, `create_visualization`
- **Standalone** — No dependencies on other packages; can be deployed independently
- **Configurable** — Environment variables for port, CORS origins, skills directory, and logging

## Quick Start

### Prerequisites
- Node.js >= 18
- pnpm or npm

### Installation

```bash
# Navigate to the MCP package
cd apps/mcp

# Install dependencies
pnpm install

# Start the development server
pnpm dev
# → MCP server running on http://localhost:3100/mcp

# Health check
curl http://localhost:3100/health
# → {"status":"ok"}
```

### Build for Production

```bash
pnpm build
pnpm start
```

## Configuration

Create a `.env` file in the package root (copy from `.env.example`):

```bash
# Server port (default: 3100)
MCP_PORT=3100

# CORS origins, comma-separated (default: * for development)
ALLOWED_ORIGINS=*

# Skills directory path (default: ./skills)
SKILLS_DIR=./skills

# Log level (default: info)
LOG_LEVEL=info
```

## Usage

### Claude Desktop (stdio)

Claude Desktop uses stdio transport. Build first, then add to your `claude_desktop_config.json`:

```bash
pnpm build
```

```json
{
  "mcpServers": {
    "open-generative-ui": {
      "command": "node",
      "args": ["dist/stdio.js"],
      "cwd": "/absolute/path/to/apps/mcp"
    }
  }
}
```

For development, you can use `tsx` directly:

```json
{
  "mcpServers": {
    "open-generative-ui": {
      "command": "npx",
      "args": ["tsx", "src/stdio.ts"],
      "cwd": "/absolute/path/to/apps/mcp"
    }
  }
}
```

### Claude Code (HTTP)

Add to `.mcp.json`:

```json
{
  "openGenerativeUI": {
    "url": "http://localhost:3100/mcp"
  }
}
```

Then start the HTTP server with `pnpm dev`.

### Any MCP Client

- **stdio**: Run `node dist/stdio.js` (or `pnpm start:stdio`)
- **HTTP**: Connect to `http://localhost:3100/mcp` (start with `pnpm dev` or `pnpm start`)

## API Reference

### Tool: `assemble_document`

Wraps an HTML fragment with the complete OpenGenerativeUI design system.

**Input:**
```typescript
{
  title: string;       // Short title, e.g., "Binary Search Visualization"
  description: string; // One-sentence explanation
  html: string;        // Self-contained HTML fragment (inline <style> and <script> OK)
}
```

**Output:**
```typescript
{
  content: [{
    type: "text",
    text: string  // Complete HTML document, ready to render in iframe
  }]
}
```

**Example:**
```javascript
const result = await client.callTool("assemble_document", {
  title: "Interactive Algorithm Visualizer",
  description: "Step-by-step visualization of the quicksort algorithm",
  html: `
    <div id="viz">
      <p>Click to start visualization</p>
      <script>
        // Your visualization code here
      </script>
    </div>
  `
});

// result.content[0].text is a complete HTML document
// Render in: <iframe sandbox="allow-scripts allow-same-origin" srcdoc={result.content[0].text} />
```

### Resource: `skills://list`

Returns a JSON array of available skill names.

**Example:**
```bash
curl -X POST http://localhost:3100/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "resources/read",
    "params": { "uri": "skills://list" }
  }'
```

### Resource: `skills://{name}`

Retrieve the full text content of a specific skill.

Available skills:
- `master-agent-playbook` — When and how to create interactive HTML widgets
- `svg-diagram-skill` — SVG diagram templates and patterns
- `agent-skills-vol2` — Advanced visualizations, dashboards, simulations

**Example:**
```bash
curl -X POST http://localhost:3100/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "resources/read",
    "params": { "uri": "skills://master-agent-playbook" }
  }'
```

### Prompts

#### `create_widget`
Instructions for creating interactive HTML widgets.

#### `create_svg_diagram`
Instructions for creating inline SVG diagrams with canonical templates.

#### `create_visualization`
Advanced visualization instructions: dashboards, simulations, UI mockups.

## Deployment

### Docker

```bash
# Build image
docker build -t open-intelligent-ui-mcp .

# Run container
docker run -p 3100:3100 open-intelligent-ui-mcp

# With custom port and CORS
docker run \
  -p 3100:3100 \
  -e MCP_PORT=3100 \
  -e ALLOWED_ORIGINS="http://localhost:3000,https://myapp.com" \
  open-intelligent-ui-mcp
```

### Node.js

```bash
# Install globally or locally
npm install -g open-intelligent-ui-mcp

# Run
MCP_PORT=3100 ALLOWED_ORIGINS="*" open-intelligent-ui-mcp

# Or with node
node dist/index.js
```

### Cloud Deployment

The server is a standard Node.js application and can be deployed to:
- **Heroku**: `Procfile: web: node dist/index.js`
- **Railway**: Connect the repo, select Node.js, set `start` script
- **Vercel**: Use serverless function (requires adapter)
- **AWS Lambda**: Package with Node.js runtime
- **Google Cloud Run**: Use Dockerfile

## Development

### Project Structure

```
apps/mcp/
├── package.json         # Standalone package definition
├── tsconfig.json        # TypeScript config
├── .env.example         # Configuration template
├── Dockerfile           # Container definition
├── skills/              # Skill instruction files (copied from source)
└── src/
    ├── index.ts         # HTTP server entry point (Hono)
    ├── stdio.ts         # stdio transport entry point (Claude Desktop)
    ├── server.ts        # MCP server construction (shared)
    ├── skills.ts        # Skill file loader
    └── renderer.ts      # Design system CSS + assembleDocument
```

### Extending Skills

Add new skill files to `skills/` directory as `.txt` files. They'll automatically be available as resources and can be used in prompts.

### Modifying the Design System

Edit `src/renderer.ts` to update:
- `THEME_CSS` — Theme colors and variables
- `SVG_CLASSES_CSS` — Pre-built SVG helper classes
- `FORM_STYLES_CSS` — Form element styling
- `BRIDGE_JS` — Communication bridge between iframe and parent

## License

MIT

## Support

For issues, feature requests, or questions, visit the [OpenGenerativeUI repository](https://github.com/CopilotKit/OpenIntelligentUI).

## Contributing

This is a standalone deployment package. To contribute improvements:

1. Fork the main [OpenGenerativeUI repository](https://github.com/CopilotKit/OpenIntelligentUI)
2. Make changes to `apps/mcp/` (or the source files it's forked from)
3. Submit a pull request

When updating skills or the design system in the main repo, the MCP package should be updated accordingly.
