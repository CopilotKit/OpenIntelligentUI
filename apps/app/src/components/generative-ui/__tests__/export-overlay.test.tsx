import React from "react";
import { render, fireEvent, cleanup, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExportOverlay } from "../export-overlay";

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function setup() {
  return render(<ExportOverlay title="Example" html="<p>Example</p>" componentType="openGenUI"><p>Widget</p></ExportOverlay>);
}

describe("ExportOverlay keyboard and clipboard", () => {
  it("reveals options on keyboard focus and returns focus on Escape", () => {
    const view = setup();
    const options = view.getByRole("button", { name: "Options" });
    fireEvent.focus(options);
    expect(options.closest(".transition-opacity")?.getAttribute("style")).toContain("opacity: 1");
    expect(options.getAttribute("type")).toBe("button");
    fireEvent.click(options);
    expect(options.getAttribute("aria-expanded")).toBe("true");
    const copy = view.getByRole("button", { name: "Copy to clipboard" });
    copy.focus(); fireEvent.keyDown(copy, { key: "Escape" });
    expect(view.queryByRole("button", { name: "Copy to clipboard" })).toBeNull();
    expect(document.activeElement).toBe(options);
    expect(options.getAttribute("aria-expanded")).toBe("false");
  });

  it("offers a download when clipboard access is unavailable", () => {
    vi.stubGlobal("navigator", { clipboard: undefined });
    const view = setup(); fireEvent.click(view.getByRole("button", { name: "Options" }));
    fireEvent.click(view.getByRole("button", { name: "Copy to clipboard" }));
    expect(view.getByRole("status").textContent).toContain("Download the HTML file");
    expect(view.getByRole("button", { name: "Download file" })).toBeTruthy();
  });

  it("reports denied clipboard access without silently closing the menu", async () => {
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    const view = setup(); fireEvent.click(view.getByRole("button", { name: "Options" }));
    await act(async () => { fireEvent.click(view.getByRole("button", { name: "Copy to clipboard" })); });
    expect(view.getByRole("status").textContent).toContain("Copy failed");
    expect(view.getByRole("button", { name: "Download file" })).toBeTruthy();
  });
});
