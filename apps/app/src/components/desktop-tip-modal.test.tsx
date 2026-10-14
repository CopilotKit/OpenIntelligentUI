import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

afterEach(() => { cleanup(); vi.restoreAllMocks(); sessionStorage.clear(); });

it("dismisses for the rest of the tab when storage rejects writes", async () => {
  vi.resetModules();
  const { DesktopTipModal } = await import("./desktop-tip-modal");
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("Storage unavailable", "QuotaExceededError");
  });
  const view = render(<DesktopTipModal />);
  expect(screen.getByText("Best viewed on desktop")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Continue anyway" }));
  expect(screen.queryByText("Best viewed on desktop")).not.toBeInTheDocument();
  view.unmount();
  render(<DesktopTipModal />);
  expect(screen.queryByText("Best viewed on desktop")).not.toBeInTheDocument();
});

it("supports Escape when storage rejects writes", async () => {
  vi.resetModules();
  const { DesktopTipModal } = await import("./desktop-tip-modal");
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Denied"); });
  render(<DesktopTipModal />);
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByText("Best viewed on desktop")).not.toBeInTheDocument();
});
