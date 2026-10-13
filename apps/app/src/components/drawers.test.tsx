import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { DemoGallery } from "./demo-gallery";
import { TemplateLibrary } from "./template-library";
vi.mock("@copilotkit/react-core/v2", () => ({
  useAgent: () => ({ agent: { state: { templates: [] }, setState: vi.fn() } }),
}));
afterEach(cleanup);
it.each(["gallery", "templates"])("excludes the closed %s drawer from accessible interaction", (kind) => {
  const makeDrawer = (open: boolean) => kind === "gallery"
    ? <DemoGallery open={open} onClose={vi.fn()} onTryDemo={vi.fn()} />
    : <TemplateLibrary open={open} onClose={vi.fn()} />;
  const view = render(makeDrawer(false));
  expect(view.container.querySelector("button")).not.toBeNull();
  expect(screen.queryAllByRole("button")).toHaveLength(0);
  const closedButton = view.container.querySelector("button")!;
  expect(closedButton.closest("[inert]")).not.toBeNull();
  view.rerender(makeDrawer(true));
  expect(screen.getAllByRole("button").length).toBeGreaterThan(1);
  expect(screen.getAllByRole("button")[0].closest("[inert]")).toBeNull();
  view.rerender(makeDrawer(false));
  expect(screen.queryAllByRole("button")).toHaveLength(0);
});
it("preserves the selected gallery category across closing and reopening", () => {
  const onTryDemo = vi.fn();
  const onClose = vi.fn();
  const view = render(<DemoGallery open onClose={onClose} onTryDemo={onTryDemo} />);
  fireEvent.click(screen.getByRole("button", { name: "Compare" }));
  const filteredCount = screen.getAllByRole("button").length;
  view.rerender(<DemoGallery open={false} onClose={onClose} onTryDemo={onTryDemo} />);
  view.rerender(<DemoGallery open onClose={onClose} onTryDemo={onTryDemo} />);
  expect(screen.getAllByRole("button")).toHaveLength(filteredCount);
});
