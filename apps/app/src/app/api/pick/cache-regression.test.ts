// @vitest-environment node
import { it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("./store", () => ({getSession:vi.fn(),setSession:vi.fn()}));
import { getSession } from "./store";
import { GET } from "./route";
it.each([undefined,{status:"scanned"},{status:"picked",prompt:"Private prompt"}] as const)("never caches QR polling", async session => {
  vi.mocked(getSession).mockReturnValue(session);
  const r = await GET(new NextRequest("http://localhost/api/pick?sessionId=valid"));
  expect(r.headers.get("cache-control")).toBe("no-store");
});
