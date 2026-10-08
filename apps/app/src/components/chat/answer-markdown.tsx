"use client";

import { useLayoutEffect, useRef, type ComponentProps } from "react";
import { CopilotChatAssistantMessage } from "@copilotkit/react-core/v2";
import { observeAnswerBlocks } from "./reveal-blocks";

export function AnswerMarkdown(
  props: ComponentProps<typeof CopilotChatAssistantMessage.MarkdownRenderer>,
) {
  const host = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const markdown = host.current?.firstElementChild;
    if (markdown instanceof HTMLElement) return observeAnswerBlocks(markdown);
  }, []);
  return (
    <div ref={host} className="answer-markdown">
      <CopilotChatAssistantMessage.MarkdownRenderer {...props} />
    </div>
  );
}
