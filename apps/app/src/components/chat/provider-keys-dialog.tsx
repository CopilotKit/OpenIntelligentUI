"use client";

import { useEffect, useRef, useState } from "react";
import { useProviderKeys } from "./provider-keys";
import "./provider-keys.css";

export function ProviderKeysDialog({ onClose, disabled = false }: { onClose: () => void; disabled?: boolean }) {
  const { hasKeys, save, clear } = useProviderKeys();
  const dialog = useRef<HTMLDialogElement>(null);
  const request = useRef<AbortController | null>(null);
  const [openai, setOpenai] = useState("");
  const [jev, setJev] = useState("");
  const [pending, setPending] = useState(false);
  const [validated, setValidated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    return () => {
      request.current?.abort();
      opener?.focus();
    };
  }, []);

  const edit = (setter: (value: string) => void, value: string) => {
    setter(value);
    setValidated(false);
    setError(null);
  };
  const testConnection = async () => {
    if (pending || disabled || !openai.trim() || !jev.trim()) return;
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setValidated(false);
    setError(null);
    try {
      const response = await fetch("/api/provider-keys", {
        method: "POST",
        headers: { "x-openai-api-key": openai.trim(), "x-jev-api-key": jev.trim() },
        signal: controller.signal,
        cache: "no-store",
      });
      const result = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok || result.ok !== true) {
        // The same-origin proxy maps provider failures to fixed, sanitized messages.
        setError(typeof result.error === "string" ? result.error : "Could not validate both keys. Check your keys and provider access, then try again.");
      } else {
        setValidated(true);
      }
    } catch {
      if (!controller.signal.aborted) setError("Could not connect. Check your connection and try again.");
    } finally {
      if (!controller.signal.aborted) setPending(false);
    }
  };

  return (
    <dialog ref={dialog} className="provider-keys-dialog" aria-labelledby="provider-keys-title" aria-describedby="provider-keys-privacy" onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <h2 id="provider-keys-title">API keys</h2>
      <p id="provider-keys-privacy">Keys stay only in this browser’s memory until you refresh or clear them. They are sent through this app’s server to their respective providers. Provider usage is charged to your accounts.</p>
      <p>Saving or clearing keys starts a new chat.</p>
      <form onSubmit={(event) => { event.preventDefault(); void testConnection(); }}>
        <label htmlFor="provider-openai-key">OpenAI API key</label>
        <input id="provider-openai-key" type="password" maxLength={4096} autoComplete="off" spellCheck={false} autoCapitalize="none" value={openai} onChange={(event) => edit(setOpenai, event.target.value)} disabled={pending || disabled} />
        <label htmlFor="provider-jev-key">Jev API key</label>
        <input id="provider-jev-key" type="password" maxLength={4096} autoComplete="off" spellCheck={false} autoCapitalize="none" value={jev} onChange={(event) => edit(setJev, event.target.value)} disabled={pending || disabled} />
        {error && <p role="alert">{error}</p>}
        <p role="status" aria-live="polite">{pending ? "Checking both providers…" : validated ? "Both keys work. Save to start a new chat." : hasKeys ? "Your own keys are active for this session." : "Using the app’s shared configuration."}</p>
        <div className="provider-keys-actions">
          {hasKeys && <button type="button" disabled={pending || disabled} onClick={() => { clear(); onClose(); }}>Clear keys</button>}
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit" disabled={pending || disabled || !openai.trim() || !jev.trim()}>Test connection</button>
          <button type="button" className="provider-keys-save" disabled={!validated || pending || disabled} onClick={() => { save({ openai: openai.trim(), jev: jev.trim() }); onClose(); }}>Save keys</button>
        </div>
      </form>
    </dialog>
  );
}
