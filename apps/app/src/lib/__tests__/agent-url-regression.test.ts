import { it, expect } from "vitest";
import { normalizeLanggraphUrl } from "../copilotkit-runtime-options";
it.each([["   ","http://localhost:8123"],[" https://agent.example.com/ ","https://agent.example.com/"],[" agent:8123 ","http://agent:8123"],["HTTPS://agent.example.com","HTTPS://agent.example.com"]])("normalizes deployment URL %s", (raw,expected) => expect(normalizeLanggraphUrl(raw)).toBe(expected));
