import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QrModal } from "./index";
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function renderDialog() {
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response("{}"))));
  const onClose = vi.fn();
  const view = render(<QrModal isOpen onClose={onClose} sessionId="test" scanStatus="waiting" />);
  const heading = screen.getByText("Scan to Pick a Visualization");
  const panel = heading.parentElement!.parentElement!;
  const foreground = panel.parentElement!;
  return { ...view, panel, foreground, onClose };
}
it("dismisses when clicking the foreground outside the panel", () => {
  const { foreground, onClose } = renderDialog();
  fireEvent.click(foreground);
  expect(onClose).toHaveBeenCalledExactlyOnceWith();
});
it("keeps clicks inside the panel open", () => {
  const { panel, onClose } = renderDialog();
  fireEvent.click(panel);
  expect(onClose).not.toHaveBeenCalled();
});
it("dismisses with Escape and removes the listener when closed", () => {
  const { rerender, onClose } = renderDialog();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(onClose).toHaveBeenCalledExactlyOnceWith();
  rerender(<QrModal isOpen={false} onClose={onClose} sessionId="test" scanStatus="waiting" />);
  fireEvent.keyDown(document, { key: "Escape" });
  expect(onClose).toHaveBeenCalledTimes(1);
});
