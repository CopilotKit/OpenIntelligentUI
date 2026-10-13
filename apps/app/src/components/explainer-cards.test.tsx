import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ExplainerCardsPortal } from "./explainer-cards";

function welcomeScreen() {
  const welcome = document.createElement("div");
  welcome.setAttribute("data-testid", "copilot-welcome-screen");
  const content = document.createElement("div");
  content.appendChild(document.createElement("div"));
  welcome.appendChild(content);
  return welcome;
}

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("ExplainerCardsPortal", () => {
  it("watches the chat's direct children and follows welcome screen changes", async () => {
    const chat = document.createElement("div");
    chat.setAttribute("data-testid", "copilot-chat");
    const firstWelcome = welcomeScreen();
    chat.appendChild(firstWelcome);
    document.body.appendChild(chat);

    const observe = vi.spyOn(MutationObserver.prototype, "observe");
    render(<ExplainerCardsPortal />);

    expect(observe).toHaveBeenCalledWith(chat, { childList: true });
    expect(screen.getByText("Generative UI")).toBeInTheDocument();

    const originalPortal = document.getElementById("explainer-cards-portal");
    originalPortal?.remove();
    await waitFor(() => {
      expect(document.getElementById("explainer-cards-portal")).not.toBe(
        originalPortal
      );
      expect(screen.getByText("Generative UI")).toBeInTheDocument();
    });

    firstWelcome.remove();
    await waitFor(() => {
      expect(screen.queryByText("Generative UI")).not.toBeInTheDocument();
    });

    chat.appendChild(welcomeScreen());
    await waitFor(() => {
      expect(screen.getByText("Generative UI")).toBeInTheDocument();
    });
  });
});
