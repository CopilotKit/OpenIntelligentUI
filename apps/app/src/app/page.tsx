"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  CopilotChat,
  useAgent,
  useCopilotKit,
} from "@copilotkit/react-core/v2";
import { useExampleSuggestions, useGenerativeUIExamples } from "@/hooks";

export default function HomePage() {
  useGenerativeUIExamples();
  useExampleSuggestions();
  const { agent } = useAgent();
  const { copilotkit } = useCopilotKit();
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const retryingRef = useRef(false);

  useEffect(() => {
    const subscription = agent.subscribe({
      onRunInitialized: () => {
        setError(null);
      },
      onRunFinishedEvent: () => {
        setError(null);
      },
    });
    return () => subscription.unsubscribe();
  }, [agent]);

  const retry = async () => {
    if (retryingRef.current || agent.isRunning) return;
    retryingRef.current = true;
    setRetrying(true);
    setError(null);
    try {
      await copilotkit.runAgent({ agent });
    } catch (cause) {
      console.error("Open Generative UI retry failed", cause);
      setError(
        "The agent is unavailable. Check your connection or local agent configuration, then retry.",
      );
    } finally {
      retryingRef.current = false;
      setRetrying(false);
    }
  };

  return (
    <div className="chat-app">
      <a className="chat-skip" href="#main-content">
        Skip to chat
      </a>
      <header className="chat-header">
        <span className="chat-name">Open Generative UI</span>
        <nav aria-label="Main navigation">
          <button type="button" onClick={() => window.location.assign("/")}>
            New chat
          </button>
          <a
            href="https://github.com/CopilotKit/OpenGenerativeUI"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub ↗
          </a>
          <a
            className="chat-brand"
            href="https://copilotkit.ai"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              src="/copilotkit-logo.svg"
              alt="CopilotKit"
              width={125}
              height={28}
              priority
            />
          </a>
        </nav>
      </header>
      <main id="main-content" className="chat-main">
        {error && agent.messages.length > 0 && (
          <div className="chat-error" role="alert">
            <p>{error}</p>
            <button
              type="button"
              onClick={retry}
              disabled={retrying || agent.isRunning}
            >
              Retry answer
            </button>
          </div>
        )}
        <div className="chat-content">
          <CopilotChat
            onError={() =>
              setError(
                "Something interrupted the answer. Try again or send another message.",
              )
            }
            labels={{
              welcomeMessageText: "What would you like to explore?",
              chatInputPlaceholder: "Ask anything…",
              chatDisclaimerText:
                "AI can make mistakes. Check important details.",
            }}
          />
        </div>
      </main>
    </div>
  );
}
