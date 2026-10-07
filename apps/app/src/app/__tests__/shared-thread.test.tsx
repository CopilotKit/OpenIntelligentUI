import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {
  CopilotChat,
  useAgent,
  useCopilotKit,
} from "@copilotkit/react-core/v2";
import { Providers } from "../providers";
import HomePage from "../page";
import { sendPromptFunction } from "@/lib/sandbox/sandbox-functions";

// Keep the real SDK providers, useAgent cache/cloning, chat configuration, and
// bridge. Only replace the runtime's HTTP boundary and missing jsdom browser APIs.
function EntryAndChat() {
  const { agent } = useAgent();
  const { copilotkit } = useCopilotKit();
  return (
    <>
      <button
        disabled={copilotkit.runtimeConnectionStatus !== "connected"}
        onClick={() =>
          agent.addMessage({
            id: "external-question",
            role: "user",
            content: "Explain bicycle gears",
          })
        }
      >
        Submit from sibling hook
      </button>
      <CopilotChat />
    </>
  );
}

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function mockRuntime() {
  const runInputs: Record<string, unknown>[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = typeof init?.body === "string" ? JSON.parse(init.body) : {};
      if (body.method === "info" || String(_url).endsWith("/info")) {
        return Response.json({
          version: "1.55.2-next.1",
          agents: { default: { description: "Test agent" } },
        });
      }
      const input = body.body ?? body;
      if (body.method === "agent/run" || String(_url).endsWith("/run"))
        runInputs.push(input);
      const connecting =
        body.method === "agent/connect" || String(_url).endsWith("/connect");
      const events = [
        { type: "RUN_STARTED", threadId: input.threadId, runId: input.runId },
        ...(connecting ? [{ type: "MESSAGES_SNAPSHOT", messages: [] }] : []),
        { type: "RUN_FINISHED", threadId: input.threadId, runId: input.runId },
      ];
      return new Response(
        events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(""),
        { headers: { "Content-Type": "text/event-stream" } },
      );
    }),
  );
  return runInputs;
}

it("shares sibling-hook and sandbox follow-up messages with the real chat thread", async () => {
  const runInputs = mockRuntime();

  render(
    <Providers>
      <EntryAndChat />
    </Providers>,
  );
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Submit from sibling hook" }),
    ).toBeEnabled(),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Submit from sibling hook" }),
  );
  expect(await screen.findByText("Explain bicycle gears")).toBeVisible();

  await act(async () => {
    await sendPromptFunction.handler({
      text: "Explain my selected gear ratio",
    });
  });
  expect(
    await screen.findByText("Explain my selected gear ratio"),
  ).toBeVisible();
  expect(runInputs).toHaveLength(1);
  expect(runInputs[0].messages).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ content: "Explain bicycle gears" }),
      expect.objectContaining({ content: "Explain my selected gear ratio" }),
    ]),
  );
});

function RuntimeReady() {
  const { copilotkit } = useCopilotKit();
  return (
    <output data-testid="runtime-status">
      {copilotkit.runtimeConnectionStatus}
    </output>
  );
}

it("submits through the real chat-only page composer and preserves its message", async () => {
  const runInputs = mockRuntime();
  render(
    <Providers>
      <RuntimeReady />
      <HomePage />
    </Providers>,
  );
  await waitFor(() =>
    expect(screen.getByTestId("runtime-status")).toHaveTextContent("connected"),
  );
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "Explain bicycle gears" },
  });
  fireEvent.keyDown(screen.getByRole("textbox"), {
    key: "Enter",
    code: "Enter",
  });
  await waitFor(() => expect(runInputs).toHaveLength(1));
  expect(await screen.findByText("Explain bicycle gears")).toBeVisible();
});
