// @vitest-environment node
import { afterEach, it, expect, vi } from "vitest";
import { POST } from "./route";
afterEach(()=>vi.unstubAllGlobals());
it("keeps a temporary upstream outage distinct from invalid keys", async () => {
  vi.stubGlobal("fetch",vi.fn().mockResolvedValue(Response.json({ok:false,code:"provider_unavailable",detail:"secret"},{status:503})));
  const r = await POST(new Request("http://localhost/api/provider-keys",{method:"POST",headers:{"x-openai-api-key":"test-openai","x-jev-api-key":"test-jev"}}));
  expect(r.status).toBe(503); expect(await r.text()).not.toContain("secret");
  expect(r.headers.get("cache-control")).toBe("no-store");
});
