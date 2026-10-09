import { describe, it, expect } from "vitest";
import { assembleStandaloneHtmlFromActivity } from "../export-utils";

describe("assembleStandaloneHtmlFromActivity", () => {
  const content = {
    css: "body{--marker:gen-css}",
    html: ["<div>Hello</div>", "<p>World</p>"],
    jsFunctions: "function greet() { return 'hi'; }",
    jsExpressions: ["greet();", "console.log('done');"],
  };

  it("orders importmap before design-system css before generated css", () => {
    const doc = assembleStandaloneHtmlFromActivity(content, "My Widget");
    const importmapIdx = doc.indexOf('<script type="importmap">');
    const designSystemIdx = doc.indexOf("--color-background-primary");
    const svgIdx = doc.indexOf("svg text.t");
    const staggerIdx = doc.indexOf("fadeSlideIn");
    const generatedCssIdx = doc.indexOf("--marker:gen-css");
    expect(doc.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(importmapIdx).toBeGreaterThanOrEqual(0);
    expect(designSystemIdx).toBeGreaterThan(importmapIdx);
    expect(svgIdx).toBeGreaterThan(importmapIdx);
    expect(staggerIdx).toBeGreaterThan(importmapIdx);
    expect(generatedCssIdx).toBeGreaterThan(designSystemIdx);
  });

  it("joins html chunks into the body after the head", () => {
    const doc = assembleStandaloneHtmlFromActivity(content, "My Widget");
    expect(doc).toContain("<div>Hello</div><p>World</p>");
    expect(doc.indexOf("<div>Hello</div>")).toBeGreaterThan(doc.indexOf("</head>"));
  });

  it("emits jsFunctions at top level of a classic script so declarations become globals", () => {
    const doc = assembleStandaloneHtmlFromActivity(content, "My Widget");
    // Classic script — never a module: module scope would hide function
    // declarations from inline onclick="..." handlers, which the live
    // websandbox rail evaluates in global scope.
    expect(doc).not.toContain('<script type="module">');
    const iifeIdx = doc.indexOf("(async () => {");
    const fnIdx = doc.indexOf("function greet()");
    expect(iifeIdx).toBeGreaterThanOrEqual(0);
    expect(fnIdx).toBeGreaterThanOrEqual(0);
    // jsFunctions live at top level, BEFORE (outside) the async IIFE.
    expect(fnIdx).toBeLessThan(iifeIdx);
  });

  it("emits jsExpressions in order inside the await-friendly async IIFE", () => {
    const doc = assembleStandaloneHtmlFromActivity(content, "My Widget");
    const iifeIdx = doc.indexOf("(async () => {");
    const iifeEndIdx = doc.indexOf("})();");
    const expr1Idx = doc.indexOf("greet();");
    const expr2Idx = doc.indexOf("console.log('done');");
    expect(iifeIdx).toBeGreaterThanOrEqual(0);
    expect(expr1Idx).toBeGreaterThan(iifeIdx);
    expect(expr2Idx).toBeGreaterThan(expr1Idx);
    expect(iifeEndIdx).toBeGreaterThan(expr2Idx);
  });

  it("omits the async IIFE when there are no jsExpressions", () => {
    const doc = assembleStandaloneHtmlFromActivity(
      { html: ["<div></div>"], jsFunctions: "function f() {}" },
      "Fns only"
    );
    expect(doc).toContain("function f() {}");
    expect(doc).not.toContain("(async () => {");
  });

  it("includes a Websandbox stub so bridge calls degrade gracefully", () => {
    const doc = assembleStandaloneHtmlFromActivity(content, "My Widget");
    expect(doc).toContain("window.Websandbox");
    expect(doc).toContain("sendPrompt");
    expect(doc).toContain("openLink");
    expect(doc.indexOf("window.Websandbox")).toBeLessThan(doc.indexOf("</head>"));
  });

  it("escapes closing script sequences embedded in js", () => {
    const doc = assembleStandaloneHtmlFromActivity(
      {
        html: ["<div></div>"],
        jsFunctions: 'const s = "</script>";',
        jsExpressions: ['document.title = "</script>";'],
      },
      "Escapes"
    );
    expect(doc).not.toContain('const s = "</script>";');
    expect(doc).toContain('const s = "<\\/script>";');
    expect(doc).not.toContain('document.title = "</script>";');
    expect(doc).toContain('document.title = "<\\/script>";');
  });

  it("neutralizes closing style sequences embedded in generated css", () => {
    const doc = assembleStandaloneHtmlFromActivity(
      {
        css: "body{color:red}</style><script>alert(1)</script>",
        html: ["<div></div>"],
      },
      "Css escape"
    );
    expect(doc).not.toContain("</style><script>alert(1)</script>");
    expect(doc).toContain("body{color:red}<\\/style>");
  });

  it("tolerates empty and missing fields", () => {
    const doc = assembleStandaloneHtmlFromActivity({});
    expect(doc.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(doc).toContain('<script type="importmap">');
    expect(doc).toContain("--color-background-primary");
    expect(doc).toContain("window.Websandbox");
    expect(doc).toContain("<title>generated-widget</title>");
    expect(doc).not.toContain('<script type="module">');
  });

  it("escapes the title", () => {
    const doc = assembleStandaloneHtmlFromActivity({}, "<b>Bad</b>");
    expect(doc).toContain("<title>&lt;b&gt;Bad&lt;/b&gt;</title>");
  });
});

it("includes the shared trip animator before generated itinerary code", () => {
  const doc = assembleStandaloneHtmlFromActivity({
    jsExpressions: ["window.createTripAnimator({stopCount:2,onFrame:function(){}}).play();"],
  });
  expect(doc).toContain("window.createTripAnimator =");
  expect(doc.indexOf("window.createTripAnimator =")).toBeLessThan(doc.indexOf("window.createTripAnimator({"));
});
