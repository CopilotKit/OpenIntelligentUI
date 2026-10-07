import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import { listSkills, loadSkill } from "./skills.js";
import { assembleDocument } from "./renderer.js";

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

  // Tool: assemble complete HTML document with design system
  server.registerTool(
    "assemble_document",
    {
      description:
        "Wraps HTML with Open Generative UI theme CSS, SVG classes, form styles, and bridge JS. " +
        "Returns a complete iframe-ready HTML document.",
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
    },
    async ({ html }) => ({
      content: [{ type: "text", text: assembleDocument(html) }],
    }),
  );

  return server;
}
