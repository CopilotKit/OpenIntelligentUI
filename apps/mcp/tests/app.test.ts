import { describe, it, expect } from "vitest";
import { createApp } from "../src/app";

function toolCall(id: string, html: string) {
  return JSON.stringify({
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: { name: "assemble_document", arguments: { title: id, description: id, html } },
  });
}

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} never answered`)), 2000)
    ),
  ]);
}

function mcpRequest(body: BodyInit) {
  return new Request("http://localhost/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body,
    // Required by Node's fetch for streaming request bodies.
    duplex: "half",
  } as RequestInit);
}

describe("POST /mcp", () => {
  it("answers each request on its own stream when requests overlap", async () => {
    const app = createApp();

    // Request 1 sends half its body, then stalls until request 2 is done.
    const body1 = toolCall("req-1", "<p>first</p>");
    let release!: () => void;
    const stalled = new ReadableStream<Uint8Array>({
      start(controller) {
        const bytes = new TextEncoder().encode(body1);
        controller.enqueue(bytes.slice(0, 10));
        release = () => {
          controller.enqueue(bytes.slice(10));
          controller.close();
        };
      },
    });
    const first = app.fetch(mcpRequest(stalled));

    const second = await withTimeout(
      Promise.resolve(
        app.fetch(mcpRequest(toolCall("req-2", "<p>second</p>")))
      ),
      "request 2"
    );
    expect(second.status).toBe(200);
    const secondText = await second.text();
    expect(secondText).toContain('"id":"req-2"');
    expect(secondText).toContain("second");

    release();
    const firstText = await withTimeout(
      Promise.resolve(first).then((r) => r.text()),
      "request 1"
    );
    expect(firstText).toContain('"id":"req-1"');
    expect(firstText).toContain("first");
  });
});
