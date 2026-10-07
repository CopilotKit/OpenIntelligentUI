import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  sendPromptFunction,
  openLinkFunction,
  isAllowedLinkUrl,
  SANDBOX_FUNCTIONS,
  SEND_PROMPT_EVENT,
  type SendPromptRequest,
} from "@/lib/sandbox/sandbox-functions";

describe("sendPromptFunction", () => {
  let received: string[];
  const listener = (e: Event) => {
    const request = (e as CustomEvent<SendPromptRequest>).detail;
    if (request.claim()) {
      received.push(request.text);
      request.resolve();
    }
  };

  beforeEach(() => {
    received = [];
    window.addEventListener(SEND_PROMPT_EVENT, listener);
  });

  afterEach(() => {
    window.removeEventListener(SEND_PROMPT_EVENT, listener);
  });

  it("has the sendPrompt name", () => {
    expect(sendPromptFunction.name).toBe("sendPrompt");
  });

  it("dispatches exactly one CustomEvent with the text for valid args", async () => {
    await expect(
      sendPromptFunction.handler({ text: "draw a chart" }),
    ).resolves.toEqual({ ok: true });
    expect(received).toEqual(["draw a chart"]);
  });

  it.each([
    ["missing text", {}],
    ["empty string", { text: "" }],
    ["whitespace only", { text: " \n\t " }],
    ["number", { text: 42 }],
    ["over 4000 chars", { text: "a".repeat(4001) }],
    ["extra junk only", { junk: "x" }],
  ])("throws and dispatches nothing for %s", async (_label, args) => {
    await expect(sendPromptFunction.handler(args)).rejects.toThrow();
    expect(received).toEqual([]);
  });

  it("accepts text at exactly 4000 chars", async () => {
    await expect(
      sendPromptFunction.handler({ text: "a".repeat(4000) }),
    ).resolves.toEqual({ ok: true });
    expect(received).toHaveLength(1);
  });
});

describe("openLinkFunction", () => {
  let openSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
  });

  afterEach(() => {
    openSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it("has the openLink name", () => {
    expect(openLinkFunction.name).toBe("openLink");
  });

  it("opens an https URL in a new tab with noopener,noreferrer", async () => {
    await expect(
      openLinkFunction.handler({ url: "https://example.com/docs" }),
    ).resolves.toEqual({ ok: true });
    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledWith(
      "https://example.com/docs",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it.each([
    ["javascript:", { url: "javascript:alert(1)" }],
    ["data:", { url: "data:text/html,<script>alert(1)</script>" }],
    ["http:", { url: "http://example.com" }],
    ["file:", { url: "file:///etc/passwd" }],
    ["malformed", { url: "not a url" }],
    ["missing url", {}],
  ])("throws and never opens for %s", async (_label, args) => {
    await expect(openLinkFunction.handler(args)).rejects.toThrow();
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("rejects https URLs outside the env allowlist", async () => {
    vi.stubEnv("NEXT_PUBLIC_OPEN_LINK_ALLOWED_ORIGINS", "https://github.com");
    await expect(
      openLinkFunction.handler({ url: "https://evil.com/x" }),
    ).rejects.toThrow();
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("allows https URLs inside the env allowlist", async () => {
    vi.stubEnv("NEXT_PUBLIC_OPEN_LINK_ALLOWED_ORIGINS", "https://github.com");
    await expect(
      openLinkFunction.handler({ url: "https://github.com/CopilotKit" }),
    ).resolves.toEqual({ ok: true });
    expect(openSpy).toHaveBeenCalledWith(
      "https://github.com/CopilotKit",
      "_blank",
      "noopener,noreferrer",
    );
  });
});

describe("isAllowedLinkUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each(["https://example.com", "https://example.com/path?query=1#hash"])(
    "allows %s without an allowlist",
    (url) => {
      expect(isAllowedLinkUrl(url)).toBe(true);
    },
  );

  it.each([
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "http://example.com",
    "file:///etc/passwd",
    "vbscript:msgbox(1)",
    "ftp://example.com",
    "not a url",
    "",
  ])("rejects %s", (url) => {
    expect(isAllowedLinkUrl(url)).toBe(false);
  });

  it("allows an https URL whose origin is in the allowlist", () => {
    expect(
      isAllowedLinkUrl("https://github.com/x", ["https://github.com"]),
    ).toBe(true);
  });

  it("rejects an https URL whose origin is not in the allowlist", () => {
    expect(isAllowedLinkUrl("https://evil.com", ["https://github.com"])).toBe(
      false,
    );
  });

  it("rejects origin-prefix lookalike hosts", () => {
    expect(
      isAllowedLinkUrl("https://github.com.evil.com/x", ["https://github.com"]),
    ).toBe(false);
  });

  it("falls back to the env allowlist when no explicit list is given", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_OPEN_LINK_ALLOWED_ORIGINS",
      "https://github.com, https://copilotkit.ai",
    );
    expect(isAllowedLinkUrl("https://github.com/x")).toBe(true);
    expect(isAllowedLinkUrl("https://copilotkit.ai/blog")).toBe(true);
    expect(isAllowedLinkUrl("https://evil.com")).toBe(false);
  });
});

describe("SANDBOX_FUNCTIONS", () => {
  it("contains sendPrompt and openLink", () => {
    // (No re-import identity assertion here: ES module caching makes it
    // tautological — referential stability is guaranteed by the const export.)
    expect(SANDBOX_FUNCTIONS.map((f) => f.name)).toEqual([
      "sendPrompt",
      "openLink",
    ]);
  });
});
