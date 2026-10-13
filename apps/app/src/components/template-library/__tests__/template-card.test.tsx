import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { TemplateCard } from "../template-card";

afterEach(cleanup);

function renderTemplate(onDelete?: (id: string) => void) {
  return render(
    <TemplateCard
      id="saved-template"
      name="Saved chart"
      description="A chart to reuse"
      html=""
      dataDescription=""
      version={1}
      onApply={vi.fn()}
      onDelete={onDelete}
    />
  );
}

describe("TemplateCard deletion", () => {
  it("keeps a saved template until the user confirms deletion", () => {
    const onDelete = vi.fn();
    renderTemplate(onDelete);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByText("Delete this template? This cannot be undone.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Delete" })).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete template" }));
    expect(onDelete).toHaveBeenCalledExactlyOnceWith("saved-template");
  });

  it("lets keyboard users dismiss the confirmation with Escape", () => {
    const onDelete = vi.fn();
    renderTemplate(onDelete);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.keyDown(screen.getByRole("group", { name: "Delete Saved chart?" }), {
      key: "Escape",
    });

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Delete" })).toHaveFocus();
  });

  it("does not offer deletion for a seed template", () => {
    renderTemplate();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });
});
