"use client";

import { useEffect, useSyncExternalStore } from "react";

const DISMISSED_KEY = "desktop-tip-dismissed";
let dismissedInMemory = false;

let listeners: Array<() => void> = [];
function emitChange() {
  listeners.forEach((l) => l());
}

export function DesktopTipModal() {
  const notDismissed = useSyncExternalStore(
    (listener) => {
      listeners.push(listener);
      return () => {
        listeners = listeners.filter((l) => l !== listener);
      };
    },
    () => {
      if (dismissedInMemory) return false;
      try { return !sessionStorage.getItem(DISMISSED_KEY); }
      catch { return false; }
    },
    () => false,
  );

  const dismiss = () => {
    dismissedInMemory = true;
    try { sessionStorage.setItem(DISMISSED_KEY, "1"); }
    catch { /* privacy-restricted context */ }
    emitChange();
  };

  useEffect(() => {
    if (!notDismissed) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  });

  if (!notDismissed) return null;

  return (
    <div
      onClick={dismiss}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-6 sm:hidden"
      style={{
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--color-glass-dark, rgba(255,255,255,0.9))",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid var(--color-border-glass, rgba(255,255,255,0.3))",
          borderRadius: "var(--radius-xl, 16px)",
          boxShadow: "var(--shadow-glass, 0 4px 30px rgba(0,0,0,0.1))",
          padding: "32px 28px",
          maxWidth: 340,
          width: "100%",
          textAlign: "center",
          fontFamily: "var(--font-family)",
        }}
      >
        {/* Monitor icon */}
        <div
          style={{
            width: 56,
            height: 56,
            margin: "0 auto 20px",
            borderRadius: 14,
            background: "linear-gradient(135deg, rgba(190,194,255,0.15), rgba(133,224,206,0.12))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-lilac-dark, #9599CC)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8" />
            <path d="M12 17v4" />
          </svg>
        </div>

        <h2
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "var(--text-primary, #374151)",
            margin: "0 0 8px",
            letterSpacing: "-0.01em",
          }}
        >
          Best viewed on desktop
        </h2>

        <p
          style={{
            fontSize: 14,
            color: "var(--text-secondary, #6b7280)",
            margin: "0 0 24px",
            lineHeight: 1.5,
          }}
        >
          This experience includes interactive visualizations that work best on larger screens.
        </p>

        <button
          onClick={dismiss}
          style={{
            width: "100%",
            padding: "10px 20px",
            borderRadius: 999,
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "var(--font-family)",
            color: "#fff",
            background: "linear-gradient(135deg, var(--color-lilac-dark, #9599CC), var(--color-mint-dark, #1B936F))",
            border: "none",
            boxShadow: "0 1px 4px rgba(149,153,204,0.3)",
            cursor: "pointer",
          }}
        >
          Continue anyway
        </button>
      </div>
    </div>
  );
}
