"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ProviderKeys = { openai: string; jev: string };
type ProviderKeysContextValue = {
  headers: Record<string, string> | undefined;
  hasKeys: boolean;
  /** False when the server's own models answer without visitor keys. */
  keysRequired: boolean;
  /** Visitor keys are saved, or the server does not need them. */
  canChat: boolean;
  session: number;
  save: (keys: ProviderKeys) => void;
  clear: () => void;
  newChat: () => void;
  draft: string;
  setDraft: (value: string) => void;
  keysOpen: boolean;
  setKeysOpen: (value: boolean) => void;
};
const ProviderKeysContext = createContext<ProviderKeysContextValue | null>(null);

export function ProviderKeysProvider({ children }: { children: ReactNode }) {
  // Deliberately memory-only: never put credentials in browser storage or agent state.
  const [keys, setKeys] = useState<ProviderKeys | null>(null);
  const [session, setSession] = useState(0);
  const [draft, setDraft] = useState("");
  const [keysOpen, setKeysOpen] = useState(false);
  // Assume keys are needed until the server says its own models are configured.
  const [keysRequired, setKeysRequired] = useState(true);
  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => fetch("/api/provider-keys", { cache: "no-store" }))
      .then((response) => response.json())
      .then((data) => { if (active && data?.required === false) setKeysRequired(false); })
      .catch(() => {});
    return () => { active = false; };
  }, []);
  const newChat = () => { setDraft(""); setSession((value) => value + 1); };
  return (
    <ProviderKeysContext.Provider value={{
      headers: keys ? { "x-openai-api-key": keys.openai, "x-jev-api-key": keys.jev } : undefined,
      hasKeys: keys !== null,
      keysRequired,
      canChat: keys !== null || !keysRequired,
      session,
      save: (value) => { setKeys(value); setKeysOpen(false); setSession((value) => value + 1); },
      clear: () => { setKeys(null); newChat(); },
      newChat, draft, setDraft, keysOpen, setKeysOpen,
    }}>
      {children}
    </ProviderKeysContext.Provider>
  );
}

export function useProviderKeys() {
  const value = useContext(ProviderKeysContext);
  if (!value) throw new Error("ProviderKeysProvider is required");
  return value;
}
