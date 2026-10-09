import { render, cleanup, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { z } from "zod";
import {
  SandboxFunctionsContext,
  type SandboxFunction,
} from "@copilotkit/react-core/v2";
import { IDIOMORPH_JS } from "../../idiomorph-inline";
import {
  OpenGenUIActivityRenderer,
  OPEN_GEN_UI_ACTIVITY_RENDERER,
  LOADING_PHRASES,
  type OpenGenUIContent,
} from "../index";
import { THROTTLE_MS } from "../renderer";

// The react-core v2 dist entry imports index.css, which vitest's node loader
// rejects (same precedent as src/lib/sandbox/__tests__/prompt-bridge.test.tsx)
// — mock the module with a faithful context + hook pair.
vi.mock("@copilotkit/react-core/v2", async () => {
  const { createContext, useContext } = await import("react");
  const SandboxFunctionsContext = createContext<readonly unknown[]>([]);
  return {
    SandboxFunctionsContext,
    useSandboxFunctions: () => useContext(SandboxFunctionsContext),
  };
});

// Mock the websandbox loader seam. @jetbrains/websandbox is a transitive
// dependency of @copilotkit/react-core that pnpm strict isolation makes
// unresolvable from this package, so vite's import-analysis rejects a direct
// vi.mock("@jetbrains/websandbox") at transform time. The mock shape below
// mirrors the canonical OpenGenerativeUIRenderer.test.tsx websandbox mock.
const mockRun = vi.fn().mockResolvedValue(undefined);
const mockDestroy = vi.fn();
let mockIframe: HTMLIFrameElement;
let mockPromiseResolve: () => void;
let mockPromise: Promise<unknown>;

function resetMockPromise() {
  mockPromise = new Promise<void>((resolve) => {
    mockPromiseResolve = resolve;
  });
}

const mockCreate = vi.fn(
  (
    _localApi: Record<string, unknown>,
    options: { frameContainer: HTMLElement; frameContent: string }
  ) => {
    mockIframe = document.createElement("iframe");
    options.frameContainer.appendChild(mockIframe);
    return {
      iframe: mockIframe,
      promise: mockPromise,
      run: mockRun,
      destroy: mockDestroy,
    };
  }
);

vi.mock("../websandbox-loader", () => ({
  loadWebsandbox: async () => ({
    create: (
      ...args: [
        Record<string, unknown>,
        { frameContainer: HTMLElement; frameContent: string },
      ]
    ) => mockCreate(...args),
  }),
}));

/** Flush the dynamic import() microtask so the sandbox gets created */
async function flushImport() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

async function resolveSandboxReady() {
  await act(async () => {
    mockPromiseResolve();
    await mockPromise;
  });
  await flushImport();
}

function rendererElement(content: OpenGenUIContent) {
  return (
    <OpenGenUIActivityRenderer
      activityType="open-generative-ui"
      content={content}
      message={{}}
      agent={{}}
    />
  );
}

function renderRenderer(content: OpenGenUIContent) {
  return render(rendererElement(content));
}

function runCallsContaining(needle: string) {
  return mockRun.mock.calls.filter(
    (c: unknown[]) => typeof c[0] === "string" && (c[0] as string).includes(needle)
  );
}

describe("OpenGenUIActivityRenderer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockPromise();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders loading placeholder and no sandbox when there is no html", async () => {
    const { container } = renderRenderer({ initialHeight: 300, generating: true });
    await flushImport();

    // The root is the constant ExportOverlay wrapper; the frame div with the
    // height style is its child.
    const div = container.querySelector<HTMLElement>("div[style]")!;
    expect(div.style.height).toBe("300px");
    expect(container.textContent).toContain(LOADING_PHRASES[0]);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("creates no sandbox while css is incomplete, even as html chunks stream", async () => {
    const { rerender } = renderRenderer({
      html: ["<body><div>Streaming</div>"],
      htmlComplete: false,
      generating: true,
    });
    await flushImport();

    expect(mockCreate).not.toHaveBeenCalled();

    rerender(
      rendererElement({
        html: ["<body><div>Streaming</div>", "<p>More</p>"],
        htmlComplete: false,
        generating: true,
      })
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, THROTTLE_MS + 100));
    });
    await flushImport();

    expect(mockCreate).not.toHaveBeenCalled();
  }, 10000);

  it("creates the preview sandbox once cssComplete and injects design system + generated css via run()", async () => {
    renderRenderer({
      css: "body{--marker:gen-css}",
      cssComplete: true,
      html: ["<body><div>Hello</div>"],
      htmlComplete: false,
      generating: true,
    });
    await flushImport();

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const [localApi, options] = mockCreate.mock.calls[0]!;
    expect(options.frameContent).toBe("<head></head><body></body>");
    expect(Object.keys(localApi)).toHaveLength(0);

    await resolveSandboxReady();

    const headCalls = runCallsContaining("document.head.innerHTML");
    expect(headCalls.length).toBeGreaterThanOrEqual(1);
    const headCode = headCalls[headCalls.length - 1]![0] as string;
    expect(headCode).toContain("--color-background-primary");
    expect(headCode).toContain("svg text.t");
    expect(headCode).toContain("fadeSlideIn");
    expect(headCode).toContain("--marker:gen-css");
  });

  it("injects Idiomorph once and morphs preview body updates with an innerHTML fallback", async () => {
    const { rerender } = renderRenderer({
      css: "body{--marker:gen-css}",
      cssComplete: true,
      html: ["<body><div>Hello</div>"],
      htmlComplete: false,
      generating: true,
    });
    await flushImport();
    await resolveSandboxReady();

    const idiomorphInjections = () =>
      mockRun.mock.calls.filter((c: unknown[]) => c[0] === IDIOMORPH_JS).length;
    expect(idiomorphInjections()).toBe(1);

    const morphCalls = runCallsContaining("Idiomorph.morph");
    expect(morphCalls.length).toBeGreaterThanOrEqual(1);
    const morphCode = morphCalls[morphCalls.length - 1]![0] as string;
    expect(morphCode).toContain("Idiomorph.morph(document.body");
    expect(morphCode).toContain("morphStyle: 'innerHTML'");
    // Streaming entrance animation: new nodes are tagged morph-enter so the
    // design system's fadeSlideIn rule animates them in (legacy bridge parity).
    expect(morphCode).toContain("beforeNodeAdded");
    expect(morphCode).toContain("morph-enter");
    expect(morphCode).toContain("document.body.innerHTML");
    expect(morphCode).toContain("Hello");
    // processPartialHtml must have stripped the <body> wrapper before morph.
    expect(morphCode).not.toContain("<body>");

    rerender(
      rendererElement({
        css: "body{--marker:gen-css}",
        cssComplete: true,
        html: ["<body><div>Hello</div>", "<p>World</p>"],
        htmlComplete: false,
        generating: true,
      })
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, THROTTLE_MS + 100));
    });
    await flushImport();

    const updatedMorphCalls = runCallsContaining("Idiomorph.morph");
    expect(updatedMorphCalls[updatedMorphCalls.length - 1]![0]).toContain("World");
    expect(idiomorphInjections()).toBe(1);
  }, 10000);

  it("builds final frameContent ordered importmap -> design system -> generated css -> generated html, with sandbox functions as localApi", async () => {
    const handler = vi.fn().mockResolvedValue(42);
    const fns: SandboxFunction[] = [
      {
        name: "addToCart",
        description: "Add item to cart",
        parameters: z.object({ itemId: z.string() }),
        handler,
      },
    ];

    render(
      <SandboxFunctionsContext.Provider value={fns}>
        {rendererElement({
          css: "body{--marker:gen-css}",
          cssComplete: true,
          html: ['<head></head><body><div id="gen-root">Done</div></body>'],
          htmlComplete: true,
          generating: false,
        })}
      </SandboxFunctionsContext.Provider>
    );
    await flushImport();

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const [localApi, options] = mockCreate.mock.calls[0]!;
    expect(localApi.addToCart).toBe(handler);

    const frameContent = options.frameContent as string;
    const importmapIdx = frameContent.indexOf('<script type="importmap">');
    const designSystemIdx = frameContent.indexOf("--color-background-primary");
    const generatedCssIdx = frameContent.indexOf("--marker:gen-css");
    const generatedHtmlIdx = frameContent.indexOf('<div id="gen-root">');
    expect(importmapIdx).toBeGreaterThanOrEqual(0);
    expect(designSystemIdx).toBeGreaterThan(importmapIdx);
    expect(generatedCssIdx).toBeGreaterThan(designSystemIdx);
    expect(generatedHtmlIdx).toBeGreaterThan(generatedCssIdx);
  });

  it("injects a CSP meta limiting script/connect origins to the four-CDN allowlist", async () => {
    renderRenderer({
      html: ['<head></head><body><div id="gen-root">Done</div></body>'],
      htmlComplete: true,
      generating: false,
    });
    await flushImport();

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const [, options] = mockCreate.mock.calls[0]!;
    const frameContent = options.frameContent as string;

    const cspMatch = frameContent.match(
      /<meta http-equiv="Content-Security-Policy" content="([\s\S]*?)">/
    );
    expect(cspMatch).not.toBeNull();
    const csp = cspMatch![1]!;
    expect(csp).toContain("default-src 'self'");
    const scriptSrc = csp.match(/script-src[\s\S]*?;/)![0];
    const connectSrc = csp.match(/connect-src[\s\S]*?;/)![0];
    for (const origin of [
      "https://cdnjs.cloudflare.com",
      "https://esm.sh",
      "https://cdn.jsdelivr.net",
      "https://unpkg.com",
    ]) {
      expect(scriptSrc).toContain(origin);
      expect(connectSrc).toContain(origin);
    }
    const imgSrc = csp.match(/img-src[\s\S]*?;/)![0];
    expect(imgSrc).toContain("https://basemap.nationalmap.gov");
    expect(scriptSrc).not.toContain("basemap.nationalmap.gov");
    expect(connectSrc).not.toContain("basemap.nationalmap.gov");
    expect(imgSrc).not.toMatch(/https:;|https:\*|\*\./);
    // CSP precedes any generated content.
    expect(frameContent.indexOf("Content-Security-Policy")).toBeLessThan(
      frameContent.indexOf('<div id="gen-root">')
    );
  });

  it("ensures a <head> exists and still injects head content first when html has none", async () => {
    renderRenderer({
      css: "body{--marker:gen-css}",
      cssComplete: true,
      html: ["<body><p>No head</p></body>"],
      htmlComplete: true,
      generating: false,
    });
    await flushImport();

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const [, options] = mockCreate.mock.calls[0]!;
    const frameContent = options.frameContent as string;
    expect(frameContent.indexOf("<head>")).toBe(0);
    expect(frameContent.indexOf('<script type="importmap">')).toBeLessThan(
      frameContent.indexOf("<p>No head</p>")
    );
  });

  it("injects jsFunctions exactly once, queueing until the sandbox is ready", async () => {
    const jsFunctions = "function greet() { return 'hi'; }";
    const base: OpenGenUIContent = {
      html: ["<head></head><body></body>"],
      htmlComplete: true,
      generating: false,
    };
    const { rerender } = renderRenderer({ ...base, jsFunctions });
    await flushImport();

    expect(
      mockRun.mock.calls.filter((c: unknown[]) => c[0] === jsFunctions)
    ).toHaveLength(0);

    await resolveSandboxReady();
    expect(
      mockRun.mock.calls.filter((c: unknown[]) => c[0] === jsFunctions)
    ).toHaveLength(1);

    rerender(rendererElement({ ...base, jsFunctions, jsExpressions: ["expr1()"] }));
    await flushImport();
    expect(
      mockRun.mock.calls.filter((c: unknown[]) => c[0] === jsFunctions)
    ).toHaveLength(1);
  });

  it("executes jsExpressions in arrival order and only new ones on growth", async () => {
    const base: OpenGenUIContent = {
      html: ["<head></head><body></body>"],
      htmlComplete: true,
      generating: false,
    };
    const { rerender } = renderRenderer({
      ...base,
      jsExpressions: ["expr1()", "expr2()"],
    });
    await flushImport();
    await resolveSandboxReady();

    const exprCalls = () =>
      mockRun.mock.calls
        .map((c: unknown[]) => c[0])
        .filter((code) => code === "expr1()" || code === "expr2()" || code === "expr3()");
    expect(exprCalls()).toEqual(["expr1()", "expr2()"]);

    rerender(
      rendererElement({ ...base, jsExpressions: ["expr1()", "expr2()", "expr3()"] })
    );
    await flushImport();
    expect(exprCalls()).toEqual(["expr1()", "expr2()", "expr3()"]);
  });

  it("updates container height on every __ogui_resize message from the sandbox iframe", async () => {
    renderRenderer({
      initialHeight: 200,
      html: ["<head></head><body><div>Done</div></body>"],
      htmlComplete: true,
      generating: false,
    });
    await flushImport();
    await resolveSandboxReady();

    const div = mockIframe.parentElement as HTMLElement;
    expect(div.style.height).toBe("200px");

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: "__ogui_resize", height: 420 },
          source: mockIframe.contentWindow,
        })
      );
    });
    expect(div.style.height).toBe("420px");

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: "__ogui_resize", height: 333 },
          source: mockIframe.contentWindow,
        })
      );
    });
    expect(div.style.height).toBe("333px");
  });

  it("ignores __ogui_resize messages from foreign sources", async () => {
    renderRenderer({
      initialHeight: 200,
      html: ["<head></head><body><div>Done</div></body>"],
      htmlComplete: true,
      generating: false,
    });
    await flushImport();
    await resolveSandboxReady();

    const div = mockIframe.parentElement as HTMLElement;
    expect(div.style.height).toBe("200px");

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: "__ogui_resize", height: 999 },
          source: window, // not the sandbox iframe's contentWindow
        })
      );
    });
    expect(div.style.height).toBe("200px");
  });

  it("clamps reported heights to the 50..4000 range and rejects non-finite values", async () => {
    renderRenderer({
      initialHeight: 200,
      html: ["<head></head><body><div>Done</div></body>"],
      htmlComplete: true,
      generating: false,
    });
    await flushImport();
    await resolveSandboxReady();

    const div = mockIframe.parentElement as HTMLElement;
    const send = async (height: unknown) => {
      await act(async () => {
        window.dispatchEvent(
          new MessageEvent("message", {
            data: { type: "__ogui_resize", height },
            source: mockIframe.contentWindow,
          })
        );
      });
    };

    await send(1);
    expect(div.style.height).toBe("50px");
    await send(999999);
    expect(div.style.height).toBe("4000px");
    // Non-finite numbers pass a bare typeof check — they must be rejected.
    await send(NaN);
    expect(div.style.height).toBe("4000px");
    await send(Infinity);
    expect(div.style.height).toBe("4000px");
  });

  it("clampReportedHeight rejects non-numbers and non-finite numbers", async () => {
    const { clampReportedHeight } = await import("../renderer");
    expect(clampReportedHeight(420)).toBe(420);
    expect(clampReportedHeight(420.4)).toBe(421);
    expect(clampReportedHeight(1)).toBe(50);
    expect(clampReportedHeight(999999)).toBe(4000);
    expect(clampReportedHeight(NaN)).toBeNull();
    expect(clampReportedHeight(Infinity)).toBeNull();
    expect(clampReportedHeight(-Infinity)).toBeNull();
    expect(clampReportedHeight("300")).toBeNull();
    expect(clampReportedHeight(undefined)).toBeNull();
  });

  it("installs a continuous ResizeObserver measurement script in the final sandbox", async () => {
    renderRenderer({
      html: ["<head></head><body><div>Done</div></body>"],
      htmlComplete: true,
      generating: false,
    });
    await flushImport();
    await resolveSandboxReady();

    const measureCalls = runCallsContaining("ResizeObserver");
    expect(measureCalls).toHaveLength(1);
    const measureCode = measureCalls[0]![0] as string;
    expect(measureCode).toContain("__ogui_resize");
    expect(measureCode).toContain("addEventListener('resize'");
  });

  it("destroys the preview and creates the final sandbox when htmlComplete arrives", async () => {
    const { rerender } = renderRenderer({
      css: "body{--marker:gen-css}",
      cssComplete: true,
      html: ["<body><div>Hello</div>"],
      htmlComplete: false,
      generating: true,
    });
    await flushImport();

    expect(mockCreate).toHaveBeenCalledTimes(1);

    resetMockPromise();
    rerender(
      rendererElement({
        css: "body{--marker:gen-css}",
        cssComplete: true,
        html: ["<head></head><body><div>Hello</div></body>"],
        htmlComplete: true,
        generating: false,
      })
    );
    await flushImport();

    expect(mockDestroy).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledTimes(2);
    const [, options] = mockCreate.mock.calls[1]!;
    expect(options.frameContent).toContain("Hello");
  });

  it("destroys the final sandbox on unmount", async () => {
    const { unmount } = renderRenderer({
      html: ["<head></head><body></body>"],
      htmlComplete: true,
      generating: false,
    });
    await flushImport();

    expect(mockCreate).toHaveBeenCalledTimes(1);
    unmount();
    expect(mockDestroy).toHaveBeenCalledTimes(1);
  });

  it("destroys the preview sandbox on unmount", async () => {
    const { unmount } = renderRenderer({
      css: "body{--marker:gen-css}",
      cssComplete: true,
      html: ["<body><div>Hello</div>"],
      htmlComplete: false,
      generating: true,
    });
    await flushImport();

    expect(mockCreate).toHaveBeenCalledTimes(1);
    unmount();
    expect(mockDestroy).toHaveBeenCalledTimes(1);
  });

  it("wraps the final sandbox in an export overlay once content is complete", async () => {
    const { container } = renderRenderer({
      css: "body{--marker:gen-css}",
      cssComplete: true,
      html: ['<head></head><body><div id="gen-root">Done</div></body>'],
      htmlComplete: true,
      generating: false,
      jsFunctions: "function greet() { return 'hi'; }",
      jsExpressions: ["greet();"],
    });
    await flushImport();

    expect(container.querySelector('button[title="Options"]')).not.toBeNull();
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("shows no export overlay while generating", async () => {
    const { container, rerender } = renderRenderer({
      css: "body{--marker:gen-css}",
      cssComplete: true,
      html: ["<body><div>Hello</div>"],
      htmlComplete: false,
      generating: true,
    });
    await flushImport();

    expect(container.querySelector('button[title="Options"]')).toBeNull();

    rerender(
      rendererElement({
        css: "body{--marker:gen-css}",
        cssComplete: true,
        html: ["<head></head><body><div>Hello</div></body>"],
        htmlComplete: true,
        generating: false,
      })
    );
    await flushImport();

    expect(container.querySelector('button[title="Options"]')).not.toBeNull();
  });

  it("keeps the live final sandbox iframe attached when generating flips to false after htmlComplete", async () => {
    // Realistic streaming sequence: the middleware emits htmlComplete:true as
    // soon as the html argument finishes parsing, and generating:false only
    // later at TOOL_CALL_END — the final sandbox is created during the
    // intermediate snapshot.
    const { container, rerender } = renderRenderer({
      css: "body{--marker:gen-css}",
      cssComplete: true,
      html: ['<head></head><body><div id="gen-root">Done</div></body>'],
      htmlComplete: true,
      generating: true,
    });
    await flushImport();
    await resolveSandboxReady();

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const iframe = mockIframe;
    expect(iframe.isConnected).toBe(true);

    rerender(
      rendererElement({
        css: "body{--marker:gen-css}",
        cssComplete: true,
        html: ['<head></head><body><div id="gen-root">Done</div></body>'],
        htmlComplete: true,
        generating: false,
      })
    );
    await flushImport();

    // The tree shape must stay constant: no remount, no extra sandbox, the
    // same iframe still in the document.
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockDestroy).not.toHaveBeenCalled();
    expect(iframe.isConnected).toBe(true);
    // And the export overlay trigger appears once complete.
    expect(container.querySelector('button[title="Options"]')).not.toBeNull();
  });

  it("exposes a registration object ready for renderActivityMessages", () => {
    expect(OPEN_GEN_UI_ACTIVITY_RENDERER.activityType).toBe("open-generative-ui");
    expect(OPEN_GEN_UI_ACTIVITY_RENDERER.render).toBe(OpenGenUIActivityRenderer);
    const parsed = OPEN_GEN_UI_ACTIVITY_RENDERER.content.safeParse({
      html: ["<div>"],
      htmlComplete: false,
      generating: true,
    });
    expect(parsed.success).toBe(true);
  });
});
