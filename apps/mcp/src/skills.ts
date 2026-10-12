import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR =
  process.env.SKILLS_DIR || resolve(__dirname, "../skills");

export function listSkills(): string[] {
  return readdirSync(SKILLS_DIR)
    .filter((f) => f.endsWith(".txt"))
    .map((f) => f.replace(".txt", ""))
    .sort();
}

export function loadSkill(name: string): string {
  const resolved = resolve(SKILLS_DIR, `${name}.txt`);
  if (!resolved.startsWith(resolve(SKILLS_DIR) + sep)) {
    throw new Error(`Invalid skill name: ${name}`);
  }
  return readFileSync(resolved, "utf-8");
}
