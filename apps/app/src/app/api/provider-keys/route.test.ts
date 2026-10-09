// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const headers = { "x-openai-api-key": "openai-test-secret", "x-jev-api-key": "jev-test-secret" };
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("provider key validation proxy", () => {
  it("requires both keys before contacting the backend", async () => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    const response = await POST(new Request("http://localhost/api/provider-keys", { method: "POST" }));
    expect(response.status).toBe(400); expect(fetchMock).not.toHaveBeenCalled();
  });
  it("sends credentials only to the configured agent without a body or redirects", async () => {
    vi.stubEnv("LANGGRAPH_DEPLOYMENT_URL", "agent:8123");
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await POST(new Request("http://localhost/api/provider-keys", { method: "POST", headers }));
    expect(fetchMock).toHaveBeenCalledWith("http://agent:8123/credentials/validate", expect.objectContaining({
      method: "POST", headers, cache: "no-store", redirect: "error",
    }));
    expect(fetchMock.mock.calls[0][1]).not.toHaveProperty("body");
    expect(await response.json()).toEqual({ ok: true });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("does not echo upstream secrets or arbitrary error content", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: "openai-test-secret", code: "unknown" }, { status: 401 })));
    const response = await POST(new Request("http://localhost/api/provider-keys", { method: "POST", headers }));
    expect(await response.text()).not.toContain("openai-test-secret");
    expect(response.status).toBe(400);
  });
  it("provides a specific safe message for rejected Jev keys", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ code: "jev_invalid" }, { status: 401 })));
    const response = await POST(new Request("http://localhost/api/provider-keys", { method: "POST", headers }));
    expect((await response.json()).error).toContain("Jev could not validate");
  });
  it("does not expose fetch failures or credentials", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("headers: openai-test-secret")));
    const response = await POST(new Request("http://localhost/api/provider-keys", { method: "POST", headers }));
    expect(response.status).toBe(502); expect(await response.text()).not.toContain("openai-test-secret");
  });
});
