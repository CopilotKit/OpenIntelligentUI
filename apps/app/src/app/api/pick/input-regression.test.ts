// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("./store", () => ({ getSession: vi.fn(), setSession: vi.fn() }));
import { PUT, POST } from "./route";
import { setSession } from "./store";
describe("QR pick input", () => {
  it.each(["{", "null", "[]", JSON.stringify({sessionId:{}}), JSON.stringify({sessionId:" "}), JSON.stringify({sessionId:"x".repeat(129)})])("returns 400 for invalid scan body %s", async body => {
    vi.clearAllMocks();
    const r = await PUT(new NextRequest("http://localhost/api/pick", {method:"PUT",body}));
    expect(r.status).toBe(400); expect(setSession).not.toHaveBeenCalled();
  });
  it.each([{}, {sessionId:"valid",prompt:{}}, {sessionId:"valid",prompt:" "}, {sessionId:"valid",prompt:"x".repeat(20001)}])("rejects invalid prompts", async body => {
    vi.clearAllMocks();
    const r = await POST(new NextRequest("http://localhost/api/pick", {method:"POST",body:JSON.stringify(body)}));
    expect(r.status).toBe(400); expect(setSession).not.toHaveBeenCalled();
  });
  it("keeps a valid chosen prompt intact", async () => {
    const r = await POST(new NextRequest("http://localhost/api/pick", {method:"POST",body:JSON.stringify({sessionId:"valid",prompt:"Compare batteries"})}));
    expect(r.status).toBe(200); expect(setSession).toHaveBeenCalledWith("valid",{status:"picked",prompt:"Compare batteries"});
  });
});
