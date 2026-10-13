import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { TemplateCard } from "./template-card";
afterEach(cleanup);
it.each([1, 6, 40, 300])("keeps %i bars visible within the SVG viewport", (count) => {
  const data = Array.from({ length: count }, (_, i) => ({ label: String(i), value: i + 1 }));
  const { container } = render(<TemplateCard id="chart" name="Revenue" description="" html=""
    componentType="barChart" componentData={{ data }} dataDescription="" version={1} onApply={vi.fn()} />);
  const svg = container.querySelector("svg")!;
  const [, , viewportWidth, viewportHeight] = svg.getAttribute("viewBox")!.split(" ").map(Number);
  const bars = Array.from(svg.querySelectorAll("rect"));
  expect(bars).toHaveLength(count);
  let previousRight = -1;
  for (const bar of bars) {
    const x = Number(bar.getAttribute("x"));
    const y = Number(bar.getAttribute("y"));
    const width = Number(bar.getAttribute("width"));
    const height = Number(bar.getAttribute("height"));
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
    expect(x).toBeGreaterThanOrEqual(previousRight);
    expect(x + width).toBeLessThanOrEqual(viewportWidth);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(y + height).toBeLessThanOrEqual(viewportHeight);
    previousRight = x + width;
  }
});
