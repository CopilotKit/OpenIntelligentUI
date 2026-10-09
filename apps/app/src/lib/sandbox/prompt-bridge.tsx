"use client";

import { useEffect, useRef } from "react";
import { useAgent, useCopilotKit } from "@copilotkit/react-core/v2";
import {
  SEND_PROMPT_EVENT,
  sendPromptParameters,
  type SendPromptRequest,
} from "./sandbox-functions";

export function OpenGenUIPromptBridge() {
  const { agent } = useAgent();
  const { copilotkit } = useCopilotKit();

  const agentRef = useRef(agent);
  const copilotkitRef = useRef(copilotkit);
  useEffect(() => {
    agentRef.current = agent;
  }, [agent]);
  useEffect(() => {
    copilotkitRef.current = copilotkit;
  }, [copilotkit]);

  useEffect(() => {
    let pending: SendPromptRequest | null = null;
    let cleanupPendingSubscription: (() => void) | null = null;
    const handler = (e: Event) => {
      const request = (e as CustomEvent<Partial<SendPromptRequest>>).detail;
      if (
        !request ||
        typeof request.claim !== "function" ||
        typeof request.resolve !== "function" ||
        typeof request.reject !== "function"
      )
        return;
      // Claim before any asynchronous work so duplicate mounted listeners cannot
      // dispatch the same request twice, including requests rejected as busy.
      if (!request.claim()) return;
      const parsed = sendPromptParameters.safeParse(request);
      if (!parsed.success) {
        request.reject(
          new Error(
            "sendPrompt: enter a non-empty question of at most 4000 characters.",
          ),
        );
        return;
      }
      const a = agentRef.current;
      const ck = copilotkitRef.current;
      if (pending || a.isRunning) {
        request.reject(
          new Error(
            "sendPrompt: the agent is busy. Wait for the current answer and try again.",
          ),
        );
        return;
      }
      const accepted: SendPromptRequest = {
        text: parsed.data.text,
        claim: request.claim,
        resolve: request.resolve,
        reject: request.reject,
      };
      pending = accepted;
      let subscription: { unsubscribe: () => void } | undefined;
      const releaseSubscription = () => {
        subscription?.unsubscribe();
        subscription = undefined;
      };
      cleanupPendingSubscription = releaseSubscription;
      void (async () => {
        let protocolFailed = false;
        try {
          // CopilotKit emits protocol RUN_ERROR through the agent subscriber;
          // its runAgent promise can still resolve after that terminal event.
          subscription = a.subscribe({
            onRunErrorEvent: ({ event }) => {
              protocolFailed = true;
              accepted.reject(
                new Error(
                  event.message ||
                    "sendPrompt: the agent run failed. Please try again.",
                ),
              );
              releaseSubscription();
            },
          });
          a.addMessage({
            id: crypto.randomUUID(),
            content: accepted.text,
            role: "user",
          });
          await ck.runAgent({ agent: a });
          if (!protocolFailed) accepted.resolve();
        } catch (error) {
          accepted.reject(
            error instanceof Error
              ? error
              : new Error(
                  "sendPrompt: the agent run failed. Please try again.",
                ),
          );
        } finally {
          releaseSubscription();
          if (pending === accepted) {
            pending = null;
            cleanupPendingSubscription = null;
          }
        }
      })();
    };
    window.addEventListener(SEND_PROMPT_EVENT, handler);
    return () => {
      window.removeEventListener(SEND_PROMPT_EVENT, handler);
      cleanupPendingSubscription?.();
      cleanupPendingSubscription = null;
      pending?.reject(
        new Error(
          "sendPrompt: chat bridge unmounted before the request completed.",
        ),
      );
      pending = null;
    };
  }, []);

  return null;
}
