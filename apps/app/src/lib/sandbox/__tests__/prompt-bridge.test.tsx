import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { OpenGenUIPromptBridge } from "@/lib/sandbox/prompt-bridge";
import {
  sendPromptFunction,
  SEND_PROMPT_EVENT,
} from "@/lib/sandbox/sandbox-functions";

const addMessage = vi.fn();
const runAgent = vi.fn();
interface ErrorSubscriber {
  onRunErrorEvent: (params: { event: { message: string } }) => void;
}
const subscribers = new Set<ErrorSubscriber>();
const subscribe = vi.fn((subscriber: ErrorSubscriber) => {
  subscribers.add(subscriber);
  return {
    unsubscribe: () => {
      subscribers.delete(subscriber);
    },
  };
});
const fakeAgent = { addMessage, isRunning: false, subscribe };
const fakeCopilotKit = { runAgent };

vi.mock("@copilotkit/react-core/v2", () => ({
  useAgent: () => ({ agent: fakeAgent }),
  useCopilotKit: () => ({ copilotkit: fakeCopilotKit }),
}));

function pendingRun() {
  let finish!: () => void;
  const promise = new Promise<void>((resolve) => {
    finish = resolve;
  });
  runAgent.mockReturnValueOnce(promise);
  return finish;
}

beforeEach(() => {
  addMessage.mockReset();
  runAgent.mockReset().mockResolvedValue(undefined);
  fakeAgent.isRunning = false;
  subscribe.mockClear();
  subscribers.clear();
});
afterEach(() => {
  cleanup();
  expect(subscribers.size).toBe(0);
});

describe("OpenGenUIPromptBridge", () => {
  it("renders nothing and submits trimmed text once", async () => {
    const { container } = render(<OpenGenUIPromptBridge />);
    expect(container).toBeEmptyDOMElement();
    await expect(
      sendPromptFunction.handler({ text: "  draw a chart  " }),
    ).resolves.toEqual({ ok: true });
    expect(addMessage).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ content: "draw a chart", role: "user" }),
    );
    expect(runAgent).toHaveBeenCalledExactlyOnceWith({ agent: fakeAgent });
  });

  it("waits for the run and propagates failures, then permits retry", async () => {
    render(<OpenGenUIPromptBridge />);
    runAgent.mockRejectedValueOnce(new Error("Provider unavailable"));
    await expect(sendPromptFunction.handler({ text: "first" })).rejects.toThrow(
      "Provider unavailable",
    );
    await expect(
      sendPromptFunction.handler({ text: "retry" }),
    ).resolves.toEqual({ ok: true });
  });

  it("rejects a protocol RUN_ERROR even when runAgent resolves", async () => {
    render(<OpenGenUIPromptBridge />);
    runAgent.mockImplementationOnce(async () => {
      for (const subscriber of subscribers) {
        subscriber.onRunErrorEvent({
          event: { message: "Agent service unavailable" },
        });
      }
    });
    await expect(sendPromptFunction.handler({ text: "first" })).rejects.toThrow(
      "Agent service unavailable",
    );
    expect(subscribers.size).toBe(0);
    await expect(
      sendPromptFunction.handler({ text: "retry" }),
    ).resolves.toEqual({ ok: true });
    expect(subscribers.size).toBe(0);
  });

  it("unsubscribes a pending run on unmount before the transport settles", async () => {
    const { unmount } = render(<OpenGenUIPromptBridge />);
    const finish = pendingRun();
    const first = sendPromptFunction.handler({ text: "first" });
    const rejection = expect(first).rejects.toThrow(/unmounted/i);
    expect(subscribers.size).toBe(1);
    unmount();
    await rejection;
    expect(subscribers.size).toBe(0);
    finish();
    await Promise.resolve();
    expect(subscribers.size).toBe(0);
  });

  it("rejects when the agent is busy without adding a message", async () => {
    render(<OpenGenUIPromptBridge />);
    fakeAgent.isRunning = true;
    await expect(sendPromptFunction.handler({ text: "next" })).rejects.toThrow(
      /busy/i,
    );
    expect(addMessage).not.toHaveBeenCalled();
  });

  it("rejects duplicate in-flight requests before isRunning updates", async () => {
    render(<OpenGenUIPromptBridge />);
    const finish = pendingRun();
    const first = sendPromptFunction.handler({ text: "first" });
    const settled = vi.fn();
    void first.then(settled);
    await Promise.resolve();
    expect(settled).not.toHaveBeenCalled();
    await expect(
      sendPromptFunction.handler({ text: "second" }),
    ).rejects.toThrow(/busy/i);
    expect(addMessage).toHaveBeenCalledTimes(1);
    finish();
    await expect(first).resolves.toEqual({ ok: true });
  });

  it("claims a request once even with duplicate mounted listeners", async () => {
    render(
      <>
        <OpenGenUIPromptBridge />
        <OpenGenUIPromptBridge />
      </>,
    );
    await sendPromptFunction.handler({ text: "once" });
    expect(addMessage).toHaveBeenCalledTimes(1);
    expect(runAgent).toHaveBeenCalledTimes(1);
  });

  it("rejects missing and unmounted bridges", async () => {
    await expect(
      sendPromptFunction.handler({ text: "missing" }),
    ).rejects.toThrow(/unavailable/i);
    const { unmount } = render(<OpenGenUIPromptBridge />);
    unmount();
    await expect(
      sendPromptFunction.handler({ text: "removed" }),
    ).rejects.toThrow(/unavailable/i);
    expect(runAgent).not.toHaveBeenCalled();
  });

  it("rejects pending requests on cleanup without late success", async () => {
    const { unmount } = render(<OpenGenUIPromptBridge />);
    const finish = pendingRun();
    const first = sendPromptFunction.handler({ text: "first" });
    const rejection = expect(first).rejects.toThrow(/unmounted/i);
    unmount();
    await rejection;
    finish();
    await Promise.resolve();
    await expect(
      sendPromptFunction.handler({ text: "second" }),
    ).rejects.toThrow(/unavailable/i);
  });

  it("rejects synchronous submission errors and releases the lock", async () => {
    render(<OpenGenUIPromptBridge />);
    addMessage.mockImplementationOnce(() => {
      throw new Error("Could not add message");
    });
    await expect(sendPromptFunction.handler({ text: "first" })).rejects.toThrow(
      "Could not add message",
    );
    await expect(
      sendPromptFunction.handler({ text: "retry" }),
    ).resolves.toEqual({ ok: true });
  });

  it("ignores malformed legacy events and rejects whitespace-only input", async () => {
    render(<OpenGenUIPromptBridge />);
    window.dispatchEvent(
      new CustomEvent(SEND_PROMPT_EVENT, { detail: { text: 42 } }),
    );
    window.dispatchEvent(new CustomEvent(SEND_PROMPT_EVENT));
    await expect(
      sendPromptFunction.handler({ text: " \n\t " }),
    ).rejects.toThrow();
    expect(addMessage).not.toHaveBeenCalled();
  });
});
