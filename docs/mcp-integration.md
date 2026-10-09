# MCP Integration

The project includes an optional [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server that provides resources, prompts, and tools for AI assistants like Claude.

The MCP server lives in `apps/mcp/`.

## What It Provides

### Resources

| URI | Description |
|-----|-------------|
| `skills://list` | JSON array of available skill names |
| `skills://{name}` | Full text of an individual skill document |

### Prompts

| Name | Description |
|------|-------------|
| `create_widget` | Instructions for building interactive HTML widgets |
| `create_svg_diagram` | Instructions for SVG diagram generation |
| `create_visualization` | Instructions for advanced visualizations |

### Tools

| Name | Description |
|------|-------------|
| `assemble_document` | Wraps an HTML fragment with the full design system (CSS variables, SVG classes, form styles, bridge JS) |

## Running the MCP Server

```bash
# Start with hot reload (development)
make dev-mcp     # Starts on http://localhost:3100

# Or directly
cd apps/mcp && pnpm dev
```

### Environment Variables

Create `apps/mcp/.env`:

```bash
MCP_PORT=3100          # Server port
NODE_ENV=development
ALLOWED_ORIGINS=*      # CORS origins
SKILLS_DIR=./skills    # Path to skill documents
LOG_LEVEL=info
```

## Connecting to the Frontend

Set `MCP_SERVER_URL` in your environment to connect the MCP server to CopilotKit:

```bash
MCP_SERVER_URL=http://localhost:3100/mcp
```

The CopilotKit API route automatically picks this up:

```typescript
// apps/app/src/app/api/copilotkit/route.ts
new CopilotRuntime({
  agents: { default: defaultAgent },
  ...(process.env.MCP_SERVER_URL && {
    mcpApps: {
      servers: [{
        type: "http",
        url: process.env.MCP_SERVER_URL,
        serverId: "example_mcp_app",
      }],
    },
  }),
})
```

## Using with Claude Desktop

For the stdio transport (Claude Desktop integration), add to your `claude_desktop_config.json`:

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

Build first:

```bash
cd apps/mcp && pnpm build
```

## Using with HTTP Clients (Claude Code, Cursor)

Add to your `.mcp.json`:

```json
{
  "openIntelligentUI": {
    "url": "http://localhost:3100/mcp"
  }
}
```

## Next Steps

- [Architecture](architecture.md) — How MCP fits into the overall system
- [Deployment](deployment.md) — Deploy the MCP server alongside other services
