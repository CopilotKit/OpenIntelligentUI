"use client";

import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

/* ------------------------------------------------------------------ */
/*  Hook: resolves the pick URL (uses LAN IP on localhost for phones)  */
/* ------------------------------------------------------------------ */
function usePickUrl(sessionId: string) {
  const isLocalhost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

  // LAN IP resolved once (only used on localhost)
  const [lanIp, setLanIp] = useState<string | null>(null);

  useEffect(() => {
    if (!isLocalhost) return;
    fetch("/api/pick/ip")
      .then((r) => r.json())
      .then((data) => { if (data.ip) setLanIp(data.ip); })
      .catch(() => {});
  }, [isLocalhost]);

  return useMemo(() => {
    if (!sessionId || typeof window === "undefined") return "";
    if (isLocalhost && lanIp) {
      return `http://${lanIp}:${window.location.port}/pick?session=${sessionId}`;
    }
    return `${window.location.origin}/pick?session=${sessionId}`;
  }, [sessionId, isLocalhost, lanIp]);
}

/* ------------------------------------------------------------------ */
/*  QR Modal                                                          */
/* ------------------------------------------------------------------ */
export function QrModal({
  isOpen,
  onClose,
  sessionId,
  scanStatus,
}: {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  scanStatus: "waiting" | "scanned" | "picked";
}) {
  const pickUrl = usePickUrl(sessionId);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(4px)",
          zIndex: 100,
        }}
      />

      {/* Modal */}
      <div
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 101,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          style={{
            background: "var(--surface-primary, #fff)",
            borderRadius: 20,
            boxShadow: "0 24px 48px rgba(0,0,0,0.18)",
            maxWidth: 380,
            width: "100%",
            padding: "32px 28px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
            position: "relative",
            fontFamily: "var(--font-family, 'Plus Jakarta Sans', system-ui, sans-serif)",
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: 14,
              right: 14,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-secondary, #888)",
              padding: 4,
              lineHeight: 1,
              fontSize: 20,
            }}
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          {/* Header */}
          <div style={{ textAlign: "center" }}>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                margin: 0,
                color: "var(--text-primary, #111)",
              }}
            >
              Scan to Pick a Visualization
            </h2>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-secondary, #888)",
                margin: "6px 0 0",
              }}
            >
              Scan with your phone to choose what the AI agent builds next
            </p>
          </div>

          {/* QR Code */}
          <div
            style={{
              background: "#fff",
              padding: 16,
              borderRadius: 14,
              border: "1px solid rgba(0,0,0,0.06)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            {pickUrl ? (
              <QRCodeSVG value={pickUrl} size={200} level="M" />
            ) : (
              <div
                style={{
                  width: 200,
                  height: 200,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ccc",
                  fontSize: 13,
                }}
              >
                Loading...
              </div>
            )}
          </div>

          {/* Status */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color: scanStatus === "waiting"
                ? "var(--text-secondary, #888)"
                : scanStatus === "scanned"
                  ? "#e6a817"
                  : "#1b936f",
              fontWeight: 500,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: scanStatus === "waiting"
                  ? "var(--text-secondary, #888)"
                  : scanStatus === "scanned"
                    ? "#e6a817"
                    : "#1b936f",
                animation: scanStatus === "waiting" ? "pulse 2s infinite" : "none",
              }}
            />
            {scanStatus === "waiting" && "Waiting for scan..."}
            {scanStatus === "scanned" && "Scanned! Waiting for pick..."}
            {scanStatus === "picked" && "Pick received!"}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  QR Button (for the top banner)                                    */
/* ------------------------------------------------------------------ */
export function QrButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium no-underline whitespace-nowrap transition-all duration-150 hover:-translate-y-px cursor-pointer"
      style={{
        color: "var(--text-secondary)",
        border: "1px solid var(--color-border-glass, rgba(0,0,0,0.1))",
        background: "var(--surface-primary, rgba(255,255,255,0.6))",
        fontFamily: "var(--font-family)",
      }}
      title="QR Code — Audience Pick"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="3" height="3" />
        <path d="M21 14h-3v3" />
        <path d="M18 21h3v-3" />
      </svg>
      <span className="hidden sm:inline">QR Pick</span>
    </button>
  );
}
