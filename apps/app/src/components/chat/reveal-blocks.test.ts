import { afterEach, expect, it, vi } from "vitest";
import { observeAnswerBlocks } from "./reveal-blocks";

afterEach(() => vi.unstubAllGlobals());

it("reveals completed offscreen paragraphs once when scrolled into view", () => {
  let intersect: (entries: Partial<IntersectionObserverEntry>[]) => void = () => {};
  const unobserve = vi.fn();
  const disconnect = vi.fn();
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback: typeof intersect) { intersect = callback; }
    observe = vi.fn();
    unobserve = unobserve;
    disconnect = disconnect;
  });
  const root = document.createElement("div");
  root.innerHTML = "<p>Already generated paragraph</p><p>Another paragraph</p>";
  const stop = observeAnswerBlocks(root);
  const first = root.children[0];
  expect(first.getAttribute("data-answer-reveal")).toBe("pending");
  intersect([{ target: first, isIntersecting: false }]);
  expect(first.getAttribute("data-answer-reveal")).toBe("pending");
  intersect([{ target: first, isIntersecting: true }]);
  expect(first.getAttribute("data-answer-reveal")).toBe("visible");
  expect(unobserve).toHaveBeenCalledWith(first);
  stop();
  expect(disconnect).toHaveBeenCalled();
  expect(root.querySelector('[data-answer-reveal="pending"]')).toBeNull();
});

it("keeps text readable when observers are unavailable", () => {
  vi.stubGlobal("IntersectionObserver", undefined);
  const root = document.createElement("div");
  root.innerHTML = "<p>Readable answer</p>";
  observeAnswerBlocks(root)();
  expect(root.firstElementChild?.hasAttribute("data-answer-reveal")).toBe(false);
});

it("observes new streamed blocks without hiding previously revealed text", async () => {
  let intersect: (entries: Partial<IntersectionObserverEntry>[]) => void = () => {};
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback: typeof intersect) { intersect = callback; }
    observe() {}
    unobserve() {}
    disconnect() {}
  });
  const root = document.createElement("div");
  root.innerHTML = "<p>First</p>";
  const stop = observeAnswerBlocks(root);
  intersect([{ target: root.children[0], isIntersecting: true }]);
  const paragraph = document.createElement("p");
  paragraph.textContent = "New streamed paragraph";
  root.append(paragraph);
  await Promise.resolve();
  expect(root.children[0].getAttribute("data-answer-reveal")).toBe("visible");
  expect(paragraph.getAttribute("data-answer-reveal")).toBe("pending");
  stop();
});
