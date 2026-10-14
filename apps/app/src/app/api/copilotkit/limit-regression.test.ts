// @vitest-environment node
import { afterEach, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("@copilotkit/runtime",()=>({CopilotRuntime:class {}, ExperimentalEmptyAdapter:class {},copilotRuntimeNextJSAppRouterEndpoint:()=>({handleRequest:async()=>new Response(null)})}));
vi.mock("@/lib/copilotkit-runtime-options",()=>({buildRuntimeOptions:()=>({})}));
vi.mock("@/lib/launch-telemetry",()=>({getLaunchTelemetry:()=>({activated:true,runtimeProperties:()=>undefined,recordOpened:()=>Promise.resolve()}),runtimeMethod:()=>undefined,observeRunResult:()=>Promise.resolve(false)}));
vi.mock("next/server",async importOriginal=>({...await importOriginal<typeof import("next/server")>(),after:vi.fn()}));
afterEach(()=>{vi.useRealTimers();vi.unstubAllEnvs();vi.restoreAllMocks();vi.resetModules();});
it("retains only accepted request timestamps during a rejected burst", async () => {
  vi.useFakeTimers(); vi.stubEnv("RATE_LIMIT_ENABLED","true"); vi.stubEnv("RATE_LIMIT_MAX","2");
  const arrays: unknown[][]=[]; const realSet=Map.prototype.set;
  vi.spyOn(Map.prototype,"set").mockImplementation(function(this:Map<unknown,unknown>,key:unknown,value:unknown){if(key==="198.51.100.1"&&Array.isArray(value)) arrays.push(value);return realSet.call(this,key,value);});
  const { POST }=await import("./route");
  const request=()=>new NextRequest("http://localhost/api/copilotkit",{method:"POST",headers:{"x-forwarded-for":"198.51.100.1"}});
  expect((await POST(request())).status).toBe(200); expect((await POST(request())).status).toBe(200);
  for(let i=0;i<50;i++)expect((await POST(request())).status).toBe(429);
  expect(Math.max(...arrays.map(a=>a.length))).toBe(2);
  vi.advanceTimersByTime(60001); expect((await POST(request())).status).toBe(200);
});
