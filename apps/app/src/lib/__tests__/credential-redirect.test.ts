// @vitest-environment node
import { createServer } from "node:http";
import { once } from "node:events";
import { expect, it } from "vitest";
import { buildRuntimeOptions } from "../copilotkit-runtime-options";

it("never forwards credential headers to a redirected agent destination, including clones", async () => {
  let leakedRequests = 0;
  const destination = createServer((_request, response) => {
    leakedRequests++;
    response.end();
  });
  destination.listen(0, "127.0.0.1");
  await once(destination, "listening");
  const target = destination.address();
  if (!target || typeof target === "string") throw new Error("Expected TCP address");
  const origin = createServer((_request, response) => {
    response.writeHead(307, { Location: `http://127.0.0.1:${target.port}/` });
    response.end();
  });
  origin.listen(0, "127.0.0.1");
  await once(origin, "listening");
  const address = origin.address();
  if (!address || typeof address === "string") throw new Error("Expected TCP address");
  try {
    const agent = buildRuntimeOptions({
      langgraphUrl: `http://127.0.0.1:${address.port}/`,
      providerHeaders: { "x-openai-api-key": "visitor-key", "x-jev-api-key": "visitor-jev" },
    }).agents.default;
    await expect(agent.clone().runAgent()).rejects.toThrow();
    expect(leakedRequests).toBe(0);
  } finally {
    origin.closeAllConnections();
    destination.closeAllConnections();
    await Promise.all([new Promise<void>((resolve) => origin.close(() => resolve())), new Promise<void>((resolve) => destination.close(() => resolve()))]);
  }
});
