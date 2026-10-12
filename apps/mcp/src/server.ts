import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import { listSkills, loadSkill } from "./skills.js";
import {
  assembleDocument,
  CDN_ORIGINS,
  MCP_APP_MIME_TYPE,
  MCP_APP_VIEW_HTML,
} from "./renderer.js";

const VIEW_URI = "ui://open-generative-ui/document.html";
const UI_EXTENSION = "io.modelcontextprotocol/ui";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "open-generative-ui",
    version: "0.1.0",
  });

  // Resources: list and get skills
  server.registerResource(
    "skills-list",
    "skills://list",
    {
      description: "JSON array of available skill names",
      mimeType: "application/json",
    },
    async () => ({
      contents: [
        {
          uri: "skills://list",
          mimeType: "application/json",
          text: JSON.stringify(listSkills()),
        },
      ],
    }),
  );

  server.registerResource(
    "skill",
    new ResourceTemplate("skills://{name}", {
      list: async () => ({
        resources: listSkills().map((name) => ({
          uri: `skills://${name}`,
          name,
          mimeType: "text/plain",
        })),
      }),
    }),
    {
      description: "Full text of a skill instruction document",
      mimeType: "text/plain",
    },
    async (uri, { name }) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "text/plain",
          text: loadSkill(name as string),
        },
      ],
    }),
  );

  // Prompts: pre-composed skill prompts
  server.registerPrompt(
    "create_widget",
    { description: "Instructions for creating interactive HTML widgets" },
    async () => ({
      messages: [
        {
          role: "user",
          content: { type: "text", text: loadSkill("master-agent-playbook") },
        },
      ],
    }),
  );

  server.registerPrompt(
    "create_svg_diagram",
    { description: "Instructions for creating inline SVG diagrams" },
    async () => ({
      messages: [
        {
          role: "user",
          content: { type: "text", text: loadSkill("svg-diagram-skill") },
        },
      ],
    }),
  );

  server.registerPrompt(
    "create_visualization",
    { description: "Advanced visualization instructions" },
    async () => ({
      messages: [
        {
          role: "user",
          content: { type: "text", text: loadSkill("agent-skills-vol2") },
        },
      ],
    }),
  );

  // MCP Apps view: hosts with the ui extension render assemble_document inline
  server.registerResource(
    "document-view",
    VIEW_URI,
    {
      description: "Renders assemble_document fragments inline in MCP Apps hosts",
      mimeType: MCP_APP_MIME_TYPE,
    },
    async () => ({
      contents: [
        {
          uri: VIEW_URI,
          mimeType: MCP_APP_MIME_TYPE,
          text: MCP_APP_VIEW_HTML,
          _meta: {
            ui: {
              prefersBorder: false,
              csp: { resourceDomains: CDN_ORIGINS, connectDomains: CDN_ORIGINS },
            },
          },
        },
      ],
    }),
  );

  // Tool: render (MCP Apps hosts) or assemble (other clients) a design-system document
  server.registerTool(
    "assemble_document",
    {
      description:
        "Renders an HTML fragment for the user with Open Intelligent UI theme CSS variables, " +
        "SVG c-* classes, form styles, and sendPrompt(text) / openLink(url) globals. " +
        "MCP Apps hosts show it inline; other clients get the complete iframe-ready HTML document.",
      inputSchema: {
        title: z.string().describe("Short title for the visualization"),
        description: z
          .string()
          .describe("One-sentence explanation of what this shows"),
        html: z
          .string()
          .describe(
            "Self-contained HTML fragment with inline <style> and <script>",
          ),
      },
      _meta: { ui: { resourceUri: VIEW_URI }, "ui/resourceUri": VIEW_URI },
    },
    async ({ title, html }) => {
      // The view already shows the fragment, so UI hosts get a one-liner instead of
      // echoing ~12 KB of design-system CSS into the model's context on every call.
      const ui = server.server.getClientCapabilities()?.extensions?.[UI_EXTENSION] as
        | { mimeTypes?: string[] }
        | undefined;
      const text = ui?.mimeTypes?.includes(MCP_APP_MIME_TYPE)
        ? `Rendered "${title}" inline for the user.`
        : assembleDocument(html);
      return { content: [{ type: "text", text }] };
    },
  );

  return server;
}
