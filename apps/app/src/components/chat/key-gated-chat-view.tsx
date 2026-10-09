"use client";

import { CopilotChatView } from "@copilotkit/react-core/v2";
import type { ComponentProps } from "react";
import { useProviderKeys } from "./provider-keys";

/** Gate submission before CopilotKit adds a message or starts a provider request. */
function KeyGatedChatViewComponent(props: ComponentProps<typeof CopilotChatView>) {
  const { hasKeys, draft, setDraft, setKeysOpen } = useProviderKeys();
  return <CopilotChatView
    {...props}
    inputValue={draft}
    onInputChange={setDraft}
    onSubmitMessage={(value) => {
      if (!hasKeys) {
        setDraft(value);
        setKeysOpen(true);
        return;
      }
      setDraft("");
      props.onSubmitMessage?.(value);
    }}
    onSelectSuggestion={(suggestion, index) => {
      if (!hasKeys) {
        setDraft(suggestion.message);
        setKeysOpen(true);
        return;
      }
      setDraft("");
      props.onSelectSuggestion?.(suggestion, index);
    }}
  />;
}

// Keep the compound-component slots expected by CopilotKit’s chatView contract.
export const KeyGatedChatView = Object.assign(KeyGatedChatViewComponent, CopilotChatView);
