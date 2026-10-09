import { normalizeLanggraphUrl } from "@/lib/copilotkit-runtime-options";
import { readProviderHeaders, PROVIDER_KEY_INPUT_ERROR } from "@/lib/provider-keys";

const errors: Record<string, string> = {
  openai_invalid: "OpenAI could not validate this key for the answer model. Check its permissions and model access.",
  jev_invalid: "Jev could not validate this key. Check your Jev API key and account access.",
  provider_unavailable: "A provider is unavailable or rate limited. Please try again shortly.",
  invalid_keys: PROVIDER_KEY_INPUT_ERROR,
};
const reply = (body: object, status: number) => Response.json(body, {
  status, headers: { "Cache-Control": "no-store" },
});

export async function POST(request: Request) {
  let credentials;
  try {
    credentials = readProviderHeaders(request.headers);
    if (!credentials) return reply({ error: PROVIDER_KEY_INPUT_ERROR }, 400);
  } catch {
    return reply({ error: PROVIDER_KEY_INPUT_ERROR }, 400);
  }
  try {
    const base = normalizeLanggraphUrl(process.env.LANGGRAPH_DEPLOYMENT_URL);
    const url = `${base.replace(/\/$/, "")}/credentials/validate`;
    const response = await fetch(url, {
      method: "POST",
      headers: credentials,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
    });
    const data = await response.json();
    if (response.ok && data?.ok === true) return reply({ ok: true }, 200);
    // Never relay arbitrary provider bodies: they can contain sensitive data.
    const error = typeof data?.code === "string" ? errors[data.code] : undefined;
    return reply({ error: error ?? "The agent could not validate your keys. Please try again." }, 400);
  } catch {
    return reply({ error: "Could not reach the agent to validate your keys. Please try again." }, 502);
  }
}
