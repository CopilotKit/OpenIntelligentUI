import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { ComponentProps } from "react";
import type { CopilotChatView } from "@copilotkit/react-core/v2";
import { ProviderKeysProvider, useProviderKeys } from "./provider-keys";
import { KeyGatedChatView } from "./key-gated-chat-view";

vi.mock("@copilotkit/react-core/v2", () => ({
  CopilotChatView: (props: ComponentProps<typeof CopilotChatView>) => <>
    <input aria-label="Message" value={props.inputValue} onChange={(event) => props.onInputChange?.(event.target.value)} />
    <button onClick={() => props.onSubmitMessage?.(props.inputValue ?? "")}>Send</button>
    <button onClick={() => props.onSelectSuggestion?.({ title: "Example", message: "Explain flight", isLoading: false }, 0)}>Example</button>
  </>,
}));
const submit = vi.fn();
const select = vi.fn();
function Harness() {
  const { session, keysOpen, setKeysOpen, save, newChat } = useProviderKeys();
  return <>
    <KeyGatedChatView key={session} onSubmitMessage={submit} onSelectSuggestion={select} />
    {keysOpen && <div role="dialog">
      <button onClick={() => setKeysOpen(false)}>Cancel</button>
      <button onClick={() => save({ openai: "test", jev: "test" })}>Save tested keys</button>
    </div>}
    <button onClick={newChat}>New chat</button>
  </>;
}
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("opens setup before sending and preserves the message across cancel and the key-save remount", () => {
  render(<ProviderKeysProvider><Harness /></ProviderKeysProvider>);
  fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Show a map" } });
  fireEvent.click(screen.getByText("Send"));
  expect(submit).not.toHaveBeenCalled();
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Cancel"));
  expect(screen.getByLabelText("Message")).toHaveValue("Show a map");
  fireEvent.click(screen.getByText("Send"));
  fireEvent.click(screen.getByText("Save tested keys"));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Message")).toHaveValue("Show a map");
  expect(submit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText("Send"));
  expect(submit).toHaveBeenCalledExactlyOnceWith("Show a map");
  expect(screen.getByLabelText("Message")).toHaveValue("");
});

it("gates example prompts and clears the preserved draft when starting a new chat", () => {
  render(<ProviderKeysProvider><Harness /></ProviderKeysProvider>);
  fireEvent.click(screen.getByText("Example"));
  expect(select).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Message")).toHaveValue("Explain flight");
  fireEvent.click(screen.getByText("Save tested keys"));
  fireEvent.click(screen.getByText("New chat"));
  expect(screen.getByLabelText("Message")).toHaveValue("");
  fireEvent.click(screen.getByText("Example"));
  expect(select).toHaveBeenCalledOnce();
});
