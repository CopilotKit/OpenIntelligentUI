import { Hono } from "hono";
import { cors } from "hono/cors";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "./server.js";

export function createApp(allowedOrigins: string[] = ["*"]): Hono {
  const app = new Hono();

  app.use(
    "*",
    cors({
      origin:
        allowedOrigins.length === 1 && allowedOrigins[0] === "*"
          ? "*"
          : allowedOrigins,
      allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
      allowHeaders: [
        "Content-Type",
        "mcp-session-id",
        "Last-Event-ID",
        "mcp-protocol-version",
      ],
      exposeHeaders: ["mcp-session-id", "mcp-protocol-version"],
    })
  );

  app.get("/health", (c) => c.json({ status: "ok" }));

  app.all("/mcp", async (c) => {
    // Stateless mode: each request gets its own server and transport.
    // Connecting one shared McpServer to a new transport per request
    // replaces its active transport, so a response for a request whose
    // body was still arriving could be written to another request's stream.
    const server = createMcpServer();
    const transport = new WebStandardStreamableHTTPServerTransport();
    await server.connect(transport);
    return transport.handleRequest(c.req.raw);
  });

  return app;
}
