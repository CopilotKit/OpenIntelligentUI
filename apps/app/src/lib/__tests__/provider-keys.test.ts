import { describe, expect, it } from "vitest";
import { readProviderHeaders } from "../provider-keys";

describe("request-scoped provider credentials", () => {
  it("leaves server mode unchanged when no keys are supplied", () => {
    expect(readProviderHeaders(new Headers())).toBeUndefined();
  });
  it("forwards only the two trimmed provider keys", () => {
    expect(readProviderHeaders(new Headers({
      "x-openai-api-key": "  openai-secret  ",
      "x-jev-api-key": "jev-secret",
      authorization: "unrelated-secret",
    }))).toEqual({ "x-openai-api-key": "openai-secret", "x-jev-api-key": "jev-secret" });
  });
  it.each(["", "has space", "x".repeat(4097)])("rejects invalid pairs without echoing keys", (key) => {
    expect(() => readProviderHeaders(new Headers({"x-openai-api-key": key, "x-jev-api-key": "jev-secret"}))).toThrow("Enter both");
  });
  it("rejects a missing partner", () => {
    expect(() => readProviderHeaders(new Headers({"x-openai-api-key": "secret"}))).toThrow("Enter both");
  });
});
