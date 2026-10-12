import { describe, it, expect } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { ClientCapabilities } from "@modelcontextprotocol/sdk/types.js";
import { createMcpServer } from "../src/server";

const VIEW_URI = "ui://open-generative-ui/document.html";
const MCP_APP_MIME = "text/html;profile=mcp-app";
const UI_HOST: ClientCapabilities = {
  extensions: { "io.modelcontextprotocol/ui": { mimeTypes: [MCP_APP_MIME] } },
};
const ARGS = { title: "Demo", description: "A demo", html: "<p id='x'>hi</p>" };

async function connect(capabilities: ClientCapabilities = {}) {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await createMcpServer().connect(serverSide);
  const client = new Client({ name: "test", version: "0.0.0" }, { capabilities });
  await client.connect(clientSide);
  return client;
}

async function callText(capabilities?: ClientCapabilities) {
  const client = await connect(capabilities);
  const result = await client.callTool({ name: "assemble_document", arguments: ARGS });
  return (result.content as { type: string; text: string }[])[0].text;
}

describe("assemble_document as an MCP App", () => {
  it("links the tool to its ui:// view, including the legacy key", async () => {
    const { tools } = await (await connect()).listTools();
    const tool = tools.find((t) => t.name === "assemble_document");
    expect(tool?._meta).toMatchObject({
      ui: { resourceUri: VIEW_URI },
      "ui/resourceUri": VIEW_URI,
    });
  });

  it("serves the view with the design system, bridge, and CDN allowlist", async () => {
    const { contents } = await (await connect()).readResource({ uri: VIEW_URI });
    const view = contents[0] as { mimeType?: string; text?: string; _meta?: unknown };
    expect(view.mimeType).toBe(MCP_APP_MIME);
    expect(view.text).toContain("--color-background-primary");
    expect(view.text).toContain("window.sendPrompt");
    expect(view.text).toContain("window.openLink");
    expect(view.text).toMatch(/\.sr-only\s*\{[^}]*clip:/);
    expect(view._meta).toMatchObject({
      ui: {
        prefersBorder: false,
        csp: {
          resourceDomains: expect.arrayContaining([
            "https://cdnjs.cloudflare.com",
            "https://esm.sh",
            "https://cdn.jsdelivr.net",
            "https://unpkg.com",
          ]),
        },
      },
    });
  });

  it("keeps the document out of the model's context on MCP Apps hosts", async () => {
    const text = await callText(UI_HOST);
    expect(text).not.toContain("<!DOCTYPE html>");
    expect(text).toContain("Demo");
  });

  it("returns the full document to hosts that cannot render MCP Apps", async () => {
    const text = await callText();
    expect(text).toContain("<!DOCTYPE html>");
    expect(text).toContain(ARGS.html);
  });
});
