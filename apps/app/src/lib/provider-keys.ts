export type ProviderHeaders = {
  "x-openai-api-key": string;
  "x-jev-api-key": string;
  "x-jev-provider"?: "typesafe" | "openrouter";
};

export const PROVIDER_KEY_INPUT_ERROR = "Enter both OpenAI and Jev API keys (up to 4,096 characters each, without spaces).";

// Credentials travel only as explicitly selected headers, never as agent state.
export function readProviderHeaders(headers: Headers): ProviderHeaders | undefined {
  const openai = headers.get("x-openai-api-key");
  const jev = headers.get("x-jev-api-key");
  const provider = headers.get("x-jev-provider");
  if (openai === null && jev === null && provider === null) return undefined;
  const valid = (value: string | null): value is string =>
    value !== null && /^[\x21-\x7e]{1,4096}$/.test(value.trim());
  if (!valid(openai) || !valid(jev) || (provider !== null && provider !== "typesafe" && provider !== "openrouter")) throw new Error(PROVIDER_KEY_INPUT_ERROR);
  return { "x-openai-api-key": openai.trim(), "x-jev-api-key": jev.trim(), ...(provider ? { "x-jev-provider": provider } : {}) };
}
