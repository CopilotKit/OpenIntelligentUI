import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { TemplateCard } from "./template-card";
afterEach(cleanup);
function preview(data: { label: string; value: number }[]) {
  return render(<TemplateCard id="pie" name="Share" description="" html=""
    componentType="pieChart" componentData={{ data }} dataDescription="" version={1} onApply={vi.fn()} />)
    .container.querySelector("svg")!;
}
it.each([
  [[{ label: "Only category", value: 10 }], "#3b82f6"],
  [[{ label: "Empty", value: 0 }, { label: "All revenue", value: 10 }, { label: "Other", value: 0 }], "#8b5cf6"],
] as const)("draws a full disk when one category represents the entire total", (data, color) => {
  const svg = preview([...data]);
  const disk = svg.querySelector("circle");
  expect(disk).not.toBeNull();
  expect(Number(disk!.getAttribute("cx"))).toBe(60);
  expect(Number(disk!.getAttribute("cy"))).toBe(60);
  expect(Number(disk!.getAttribute("r"))).toBe(50);
  expect(disk!.getAttribute("fill")).toBe(color);
});
it("retains separate slices for multiple positive categories", () => {
  const svg = preview([{ label: "First", value: 3 }, { label: "Second", value: 1 }]);
  expect(svg.querySelectorAll("path")).toHaveLength(2);
  expect(svg.querySelector("circle")).toBeNull();
});

it.each([
  { data: [] },
  { data: [{ label: "Only empty category", value: 0 }] },
  { data: [{ label: "First", value: 0 }, { label: "Second", value: 0 }] },
])("keeps empty and zero-total previews unpainted", ({ data }) => {
  expect(preview(data)).toBeNull();
});
