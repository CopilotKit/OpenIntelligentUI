/**
 * Simple in-memory session store for QR pick flow.
 * Shared across API route handlers via module-level state.
 */

export type PickSession = {
  status: "waiting" | "scanned" | "picked";
  prompt?: string;
};

const sessions = new Map<string, PickSession>();

// Auto-expire sessions after 10 minutes
const EXPIRY_MS = 10 * 60 * 1000;
const expiresAt = new Map<string, number>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

export function getSession(sessionId: string): PickSession | undefined {
  if ((expiresAt.get(sessionId) ?? Infinity) <= Date.now()) {
    sessions.delete(sessionId);
    expiresAt.delete(sessionId);
    const timer = timers.get(sessionId);
    if (timer) clearTimeout(timer);
    timers.delete(sessionId);
    return undefined;
  }
  return sessions.get(sessionId);
}

export function setSession(sessionId: string, data: PickSession) {
  sessions.set(sessionId, data);
  expiresAt.set(sessionId, Date.now() + EXPIRY_MS);

  // Reset expiry timer
  const existing = timers.get(sessionId);
  if (existing) clearTimeout(existing);
  timers.set(
    sessionId,
    setTimeout(() => {
      sessions.delete(sessionId);
      expiresAt.delete(sessionId);
      timers.delete(sessionId);
    }, EXPIRY_MS),
  );
}
