import { describe, it, expect } from "vitest";
import { buildFinalFrameContent } from "../frame-content";

describe("buildFinalFrameContent", () => {
  // Websandbox rejects frame content without a literal "<head>" and injects
  // its bootstrap at that tag.
  it.each([
    ['<html lang="en"><head lang="en"><title>T</title></head><body>x</body></html>'],
    ["<HTML><HEAD><TITLE>T</TITLE></HEAD><BODY>x</BODY></HTML>"],
  ])("normalizes a head tag websandbox would not find: %s", (html) => {
    const frame = buildFinalFrameContent(html);
    expect(frame).toContain("<head>");
    expect(frame.indexOf("Content-Security-Policy")).toBeGreaterThan(
      frame.indexOf("<head>")
    );
    expect(frame.indexOf("Content-Security-Policy")).toBeLessThan(
      frame.search(/<title>/i)
    );
  });

  it("does not mistake <header> for the head", () => {
    const frame = buildFinalFrameContent("<body><header>Top</header></body>");
    expect(frame.indexOf("<head>")).toBe(0);
    expect(frame).toContain("<header>Top</header>");
    expect(frame.indexOf("Content-Security-Policy")).toBeLessThan(
      frame.indexOf("<header>")
    );
  });
});
