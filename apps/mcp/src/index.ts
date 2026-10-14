import { serve } from "@hono/node-server";
import { createApp } from "./app.js";

const PORT = Number(process.env.MCP_PORT) || 3100;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(",") || ["*"];

const app = createApp(ALLOWED_ORIGINS);

serve({ fetch: app.fetch, port: PORT });
console.log(`MCP server running on http://localhost:${PORT}/mcp`);
