import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { NextRequest } from "next/server";
import { readProviderHeaders, PROVIDER_KEY_INPUT_ERROR } from "@/lib/provider-keys";
import { buildRuntimeOptions } from "@/lib/copilotkit-runtime-options";

// Simple in-memory sliding-window rate limiter (per IP)
// Enable via RATE_LIMIT_ENABLED=true — off by default.
// For high-traffic deployments, consider Redis-backed rate limiting instead.
const RATE_LIMIT_ENABLED = process.env.RATE_LIMIT_ENABLED === "true";
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000;
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX) || 40;
const hits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  if (!RATE_LIMIT_ENABLED) return false;
  const now = Date.now();
  const timestamps = hits.get(ip)?.filter(t => t > now - RATE_LIMIT_WINDOW_MS) ?? [];
  timestamps.push(now);
  hits.set(ip, timestamps);
  return timestamps.length > RATE_LIMIT_MAX;
}

// Prune stale entries every 5 min to prevent unbounded memory growth
if (RATE_LIMIT_ENABLED) {
  setInterval(() => {
    const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS;
    hits.forEach((timestamps, ip) => {
      const recent = timestamps.filter(t => t > cutoff);
      if (recent.length === 0) hits.delete(ip);
      else hits.set(ip, recent);
    });
  }, 300_000);
}

export const POST = async (req: NextRequest) => {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return new Response("Too many requests", { status: 429 });
  }

  let providerHeaders;
  try {
    providerHeaders = readProviderHeaders(req.headers);
  } catch {
    return Response.json({ error: PROVIDER_KEY_INPUT_ERROR }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  // Construct the agent per request so one visitor's keys cannot reach another.
  const runtimeOptions = buildRuntimeOptions({
    langgraphUrl: process.env.LANGGRAPH_DEPLOYMENT_URL,
    mcpServerUrl: process.env.MCP_SERVER_URL,
    providerHeaders,
  });

  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    endpoint: "/api/copilotkit",
    serviceAdapter: new ExperimentalEmptyAdapter(),
    runtime: new CopilotRuntime(runtimeOptions),
  });

  return handleRequest(req);
};
