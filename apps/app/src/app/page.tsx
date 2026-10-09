"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExampleLayout } from "@/components/example-layout";
import { useGenerativeUIExamples, useExampleSuggestions } from "@/hooks";
import { ExplainerCardsPortal } from "@/components/explainer-cards";
import { DemoGallery, type DemoItem } from "@/components/demo-gallery";
import { GridIcon } from "@/components/demo-gallery/grid-icon";
import { DesktopTipModal } from "@/components/desktop-tip-modal";
import { QrButton, QrModal } from "@/components/qr-modal";
import { CopilotChat, useAgent, useCopilotKit } from "@copilotkit/react-core/v2";

export default function HomePage() {
  useGenerativeUIExamples();
  useExampleSuggestions();

  const [demoDrawerOpen, setDemoDrawerOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrSessionId, setQrSessionId] = useState("");
  const [scanStatus, setScanStatus] = useState<"waiting" | "scanned" | "picked">("waiting");
  const { agent } = useAgent();
  const { copilotkit } = useCopilotKit();

  // Ref to always have the latest agent/copilotkit for async callbacks
  const agentRef = useRef(agent);
  const copilotkitRef = useRef(copilotkit);
  useEffect(() => { agentRef.current = agent; }, [agent]);
  useEffect(() => { copilotkitRef.current = copilotkit; }, [copilotkit]);

  // Guard: prevent duplicate prompt dispatch across re-renders
  const pickedRef = useRef(false);

  const sendPrompt = useCallback((prompt: string) => {
    const a = agentRef.current;
    const ck = copilotkitRef.current;
    a.addMessage({ id: crypto.randomUUID(), content: prompt, role: "user" });
    ck.runAgent({ agent: a });
  }, []);

  const handleTryDemo = (demo: DemoItem) => {
    setDemoDrawerOpen(false);
    sendPrompt(demo.prompt);
  };

  const openQrModal = () => {
    pickedRef.current = false;
    setScanStatus("waiting");
    setQrSessionId(crypto.randomUUID().slice(0, 12));
    setQrOpen(true);
  };

  // Poll for QR pick status
  useEffect(() => {
    if (!qrOpen || !qrSessionId) return;
    const interval = setInterval(async () => {
      if (pickedRef.current) return;
      try {
        const res = await fetch(`/api/pick?sessionId=${qrSessionId}`);
        const data = await res.json();
        if (data.status === "scanned") {
          setScanStatus("scanned");
        } else if (data.status === "picked" && data.prompt && !pickedRef.current) {
          pickedRef.current = true;
          clearInterval(interval);
          setScanStatus("picked");
          setTimeout(() => {
            setQrOpen(false);
            sendPrompt(data.prompt);
          }, 800);
        }
      } catch {
        // ignore polling errors
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [qrOpen, qrSessionId, sendPrompt]);

  // Note: sandbox openLink requests are handled by the Zod-validated
  // Websandbox localApi (src/lib/sandbox/sandbox-functions.ts). The legacy
  // 'open-link' postMessage listener was removed with the retired legacy
  // rail: it had no source/origin check and nothing in the app posts it.

  return (
    <>
      {/* Animated background */}
      <div className="abstract-bg">
        <div className="blob-3" />
      </div>

      {/* App shell */}
      <div className="brand-shell" style={{ position: "relative", zIndex: 1 }}>
        <div className="brand-glass-container">
          {/* CTA Banner */}
          <div
            className="shrink-0 border-b border-white/30 dark:border-white/8"
            style={{
              background: "linear-gradient(135deg, rgba(190,194,255,0.08) 0%, rgba(133,224,206,0.06) 100%)",
            }}
          >
            <div className="flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-5 py-2.5 sm:py-3">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div
                  className="flex items-center justify-center shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-lg"
                  style={{
                    background: "linear-gradient(135deg, rgba(190,194,255,0.15), rgba(133,224,206,0.12))",
                  }}
                >
                  <span className="text-lg sm:text-xl leading-none" role="img" aria-label="CopilotKit">🪁</span>
                </div>
                <p className="text-sm sm:text-base font-semibold m-0 leading-snug" style={{ color: "var(--text-primary)" }}>
                  Open Intelligent UI
                  <span className="hidden sm:inline font-normal" style={{ color: "var(--text-secondary)" }}> — powered by CopilotKit</span>
                </p>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <QrButton onClick={openQrModal} />
                <button
                  onClick={() => setDemoDrawerOpen(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium no-underline whitespace-nowrap transition-all duration-150 hover:-translate-y-px cursor-pointer"
                  style={{
                    color: "var(--text-secondary)",
                    border: "1px solid var(--color-border-glass, rgba(0,0,0,0.1))",
                    background: "var(--surface-primary, rgba(255,255,255,0.6))",
                    fontFamily: "var(--font-family)",
                  }}
                  title="Open Demo Gallery"
                >
                  <GridIcon size={15} />
                  <span className="hidden sm:inline">Demos</span>
                </button>
                <a
                  href="https://github.com/CopilotKit/OpenIntelligentUI"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold text-white no-underline whitespace-nowrap transition-all duration-150 hover:-translate-y-px"
                  style={{
                    background: "linear-gradient(135deg, var(--color-lilac-dark), var(--color-mint-dark))",
                    boxShadow: "0 1px 4px rgba(149,153,204,0.3)",
                    fontFamily: "var(--font-family)",
                  }}
                >
                  Get started
                </a>
              </div>
            </div>
          </div>

          <ExampleLayout chatContent={
            <CopilotChat
              labels={{
                welcomeMessageText: "What do you want to visualize today?",
                chatDisclaimerText: "Visualizations are AI-generated. You can retry the same prompt or ask the AI to refine the result.",
              }}
            />
          } />
          <ExplainerCardsPortal />
        </div>
      </div>

      <DemoGallery
        open={demoDrawerOpen}
        onClose={() => setDemoDrawerOpen(false)}
        onTryDemo={handleTryDemo}
      />

      <DesktopTipModal />

      <QrModal
        isOpen={qrOpen}
        onClose={() => setQrOpen(false)}
        sessionId={qrSessionId}
        scanStatus={scanStatus}
      />
    </>
  );
}
