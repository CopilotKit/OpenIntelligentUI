// @vitest-environment node
import { afterEach, it, expect, vi } from "vitest";
import { getSession, setSession } from "./store";
afterEach(() => vi.useRealTimers());
it("expires a prompt even when scheduled timers have not run", () => {
  vi.useFakeTimers(); vi.setSystemTime(0);
  setSession("expired",{status:"picked",prompt:"stale"});
  vi.setSystemTime(600000);
  expect(getSession("expired")).toBeUndefined();
  expect(vi.getTimerCount()).toBe(0);
});
it("refreshes the deadline when a scan becomes a pick", () => {
  vi.useFakeTimers(); vi.setSystemTime(0);
  setSession("refresh",{status:"scanned"});
  vi.setSystemTime(500000); setSession("refresh",{status:"picked",prompt:"fresh"});
  vi.setSystemTime(600000); expect(getSession("refresh")?.prompt).toBe("fresh");
  vi.setSystemTime(1100000); expect(getSession("refresh")).toBeUndefined();
});
