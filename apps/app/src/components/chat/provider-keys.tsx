"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type ProviderKeys = { openai: string; jev: string };
type ProviderKeysContextValue = {
  headers: Record<string, string> | undefined;
  hasKeys: boolean;
  session: number;
  save: (keys: ProviderKeys) => void;
  clear: () => void;
  newChat: () => void;
};
const ProviderKeysContext = createContext<ProviderKeysContextValue | null>(null);

export function ProviderKeysProvider({ children }: { children: ReactNode }) {
  // Deliberately memory-only: never put credentials in browser storage or agent state.
  const [keys, setKeys] = useState<ProviderKeys | null>(null);
  const [session, setSession] = useState(0);
  const newChat = () => setSession((value) => value + 1);
  return (
    <ProviderKeysContext.Provider value={{
      headers: keys ? { "x-openai-api-key": keys.openai, "x-jev-api-key": keys.jev } : undefined,
      hasKeys: keys !== null,
      session,
      save: (value) => { setKeys(value); newChat(); },
      clear: () => { setKeys(null); newChat(); },
      newChat,
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
