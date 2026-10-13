// @vitest-environment node
import { it, expect } from "vitest";
import { observeRunResult } from "../launch-telemetry";
it.each(["\n","\r\n","\r"])("observes multiline events separated by %j", async newline => {
  const body = ['data: {"type":"TEXT_MESSAGE_CONTENT",','data: "delta":"你好"}',"",'data: {"type":"RUN_FINISHED"}',"",""].join(newline);
  const bytes = new TextEncoder().encode(body);
  const stream = new ReadableStream<Uint8Array>({start(c){for(const b of bytes)c.enqueue(new Uint8Array([b])); c.close();}});
  await expect(observeRunResult(stream)).resolves.toBe(true);
  expect(stream.locked).toBe(false);
});
it("releases the reader after a failed stream", async () => {
  const stream = new ReadableStream<Uint8Array>({pull(c){c.error(new Error("offline"));}});
  await expect(observeRunResult(stream)).resolves.toBe(false); expect(stream.locked).toBe(false);
});
