import { describe, it, expect } from "vitest";
import { assembleDocument } from "../src/renderer";

describe("assembleDocument", () => {
  const doc = assembleDocument("<div>x</div>");

  it("embeds the single-sourced design-system css before the injected html", () => {
    // Theme tokens, SVG classes, and form styles from @repo/design-system.
    const themeIdx = doc.indexOf("--color-background-primary");
    const svgIdx = doc.indexOf(".c-purple");
    const formIdx = doc.indexOf("button:hover");
    const htmlIdx = doc.indexOf("<div>x</div>");
    expect(themeIdx).toBeGreaterThanOrEqual(0);
    expect(svgIdx).toBeGreaterThanOrEqual(0);
    expect(formIdx).toBeGreaterThanOrEqual(0);
    expect(htmlIdx).toBeGreaterThan(themeIdx);
    expect(htmlIdx).toBeGreaterThan(svgIdx);
  });

  it("injects the CSP meta tag with the CDN allowlist", () => {
    expect(doc).toContain('http-equiv="Content-Security-Policy"');
    for (const origin of [
      "https://cdnjs.cloudflare.com",
      "https://esm.sh",
      "https://cdn.jsdelivr.net",
      "https://unpkg.com",
    ]) {
      expect(doc).toContain(origin);
    }
  });

  it("wraps the html in #content and includes the bridge + resize script", () => {
    expect(doc).toContain('<div id="content">');
    expect(doc).toContain("window.sendPrompt = function");
    expect(doc).toContain("window.openLink = function");
    expect(doc).toContain("widget-resize");
    expect(doc).toContain("ResizeObserver");
  });
});

describe("bridge link handling", () => {
  // Run the bridge script against minimal stubs and return its click handler
  // plus the messages it posts to the parent frame.
  function loadBridge() {
    const doc = assembleDocument("");
    const script = doc.slice(
      doc.lastIndexOf("<script>") + "<script>".length,
      doc.lastIndexOf("</script>")
    );
    let onClick: ((e: unknown) => void) | undefined;
    const posted: unknown[] = [];
    const document = {
      baseURI: "about:srcdoc",
      documentElement: { scrollHeight: 0 },
      body: {},
      getElementById: () => null,
      addEventListener: (type: string, fn: (e: unknown) => void) => {
        if (type === "click") onClick = fn;
      },
    };
    const window = {
      parent: { postMessage: (msg: unknown) => posted.push(msg) },
      addEventListener: () => {},
    };
    new Function(
      "document",
      "window",
      "ResizeObserver",
      "setInterval",
      "setTimeout",
      script
    )(
      document,
      window,
      class {
        observe() {}
      },
      () => 0,
      () => 0
    );
    return { click: onClick!, posted };
  }

  function clickOn(href: unknown) {
    const event = {
      target: { closest: () => ({ href }) },
      defaultPrevented: false,
    };
    return Object.assign(event, {
      preventDefault: () => {
        event.defaultPrevented = true;
      },
    });
  }

  it("forwards html anchors to the parent", () => {
    const { click, posted } = loadBridge();
    const event = clickOn("https://example.com/a");
    click(event);
    expect(event.defaultPrevented).toBe(true);
    expect(posted).toEqual([
      { type: "open-link", url: "https://example.com/a" },
    ]);
  });

  it("forwards svg anchors, whose href is an SVGAnimatedString", () => {
    const { click, posted } = loadBridge();
    const event = clickOn({
      baseVal: "https://example.com/b",
      animVal: "https://example.com/b",
    });
    click(event);
    expect(event.defaultPrevented).toBe(true);
    expect(posted).toEqual([
      { type: "open-link", url: "https://example.com/b" },
    ]);
  });
});
