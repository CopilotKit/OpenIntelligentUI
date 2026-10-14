import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { useState } from "react";
import { ProviderKeysProvider, useProviderKeys } from "./provider-keys";
import { ProviderKeysDialog } from "./provider-keys-dialog";

function Harness({ disabled = false }: { disabled?: boolean }) {
  const { hasKeys, session, headers, newChat } = useProviderKeys();
  const [open, setOpen] = useState(false);
  return <>
    <button onClick={() => setOpen(true)}>Open keys</button>
    <button onClick={newChat}>New chat</button>
    <output data-testid="session">{session}</output>
    <output data-testid="active">{hasKeys ? headers?.["x-openai-api-key"] : "shared"}</output>
    {open && <ProviderKeysDialog disabled={disabled} onClose={() => setOpen(false)} />}
  </>;
}
function setup(disabled = false) {
  render(<ProviderKeysProvider><Harness disabled={disabled} /></ProviderKeysProvider>);
  screen.getByText("Open keys").focus();
  fireEvent.click(screen.getByText("Open keys"));
}
function enterKeys() {
  fireEvent.change(screen.getByLabelText("OpenAI API key"), { target: { value: "  openai-secret  " } });
  fireEvent.change(screen.getByLabelText("Jev API key"), { target: { value: "  jev-secret  " } });
}
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("memory-only provider keys", () => {
  it("validates trimmed headers before saving, resets the chat and never persists keys", async () => {
    const storage = vi.spyOn(Storage.prototype, "setItem");
    const cookie = vi.spyOn(document, "cookie", "set");
    setup();
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Add API keys to start");
    expect(screen.getByLabelText("OpenAI API key")).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Save keys" })).toBeDisabled();
    enterKeys();
    fireEvent.click(screen.getByText("Test connection"));
    await screen.findByText("Both keys work. Save to start a new chat.");
    expect(fetch).toHaveBeenCalledWith("/api/provider-keys", expect.objectContaining({ method: "POST", headers: { "x-openai-api-key": "openai-secret", "x-jev-api-key": "jev-secret" }, cache: "no-store" }));
    expect(screen.getByTestId("active")).toHaveTextContent("shared");
    fireEvent.click(screen.getByText("Save keys"));
    expect(screen.getByTestId("session")).toHaveTextContent("1");
    expect(screen.getByTestId("active")).toHaveTextContent("openai-secret");
    fireEvent.click(screen.getByText("New chat"));
    expect(screen.getByTestId("session")).toHaveTextContent("2");
    expect(screen.getByTestId("active")).toHaveTextContent("openai-secret");
    expect(storage).not.toHaveBeenCalled();
    expect(cookie).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Open keys"));
    expect(screen.getByLabelText("OpenAI API key")).toHaveValue("");
    fireEvent.click(screen.getByText("Clear keys"));
    expect(screen.getByTestId("active")).toHaveTextContent("shared");
    expect(screen.getByTestId("session")).toHaveTextContent("3");
    cleanup();
    setup();
    expect(screen.getByTestId("active")).toHaveTextContent("shared");
  });

  it("shows sanitized proxy failures without saving", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, json: async () => ({ error: "OpenAI key could not be validated." }) } as Response);
    setup(); enterKeys(); fireEvent.click(screen.getByText("Test connection"));
    expect(await screen.findByRole("alert")).toHaveTextContent("OpenAI key could not be validated.");
    expect(screen.getByText("Save keys")).toBeDisabled();
    expect(screen.getByTestId("active")).toHaveTextContent("shared");
  });

  it("invalidates validation after edits and clears drafts on cancel with focus restored", async () => {
    setup(); enterKeys(); fireEvent.click(screen.getByText("Test connection"));
    await screen.findByText("Both keys work. Save to start a new chat.");
    fireEvent.change(screen.getByLabelText("Jev API key"), { target: { value: "new-secret" } });
    expect(screen.getByText("Save keys")).toBeDisabled();
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.getByText("Open keys")).toHaveFocus();
    fireEvent.click(screen.getByText("Open keys"));
    expect(screen.getByLabelText("Jev API key")).toHaveValue("");
  });

  it("disables credential changes during a run", () => {
    setup(true);
    expect(screen.getByLabelText("OpenAI API key")).toBeDisabled();
    expect(screen.getByText("Test connection")).toBeDisabled();
    expect(screen.getByText("Save keys")).toBeDisabled();
  });

  it("aborts pending validation when closed", async () => {
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {}));
    setup(); enterKeys(); fireEvent.click(screen.getByText("Test connection"));
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const options = vi.mocked(fetch).mock.calls[0][1];
    expect(screen.getByText("Checking both providers…")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Cancel"));
    expect(options?.signal?.aborted).toBe(true);
  });
  it("treats server-held keys as configured when NEXT_PUBLIC_SERVER_KEYS is true", () => {
    vi.stubEnv("NEXT_PUBLIC_SERVER_KEYS", "true");
    render(<ProviderKeysProvider><Harness /></ProviderKeysProvider>);
    // Gate passes, but no browser headers are sent: the agent uses its own .env keys.
    expect(screen.getByTestId("active")).toBeEmptyDOMElement();
    vi.unstubAllEnvs();
  });
});
