"use client";

import type { ComponentProps } from "react";
import { CopilotChatView } from "@copilotkit/react-core/v2";

/** No resize-driven scroll controller: the reader owns the viewport. */
export function ReaderScrollView({
  children,
}: ComponentProps<typeof CopilotChatView.ScrollView>) {
  return (
    <div className="reader-scroll-view" role="region" aria-label="Conversation" tabIndex={0}>
      {children}
    </div>
  );
}
