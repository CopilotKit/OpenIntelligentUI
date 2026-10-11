import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
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
  const root = resolve(SKILLS_DIR);
  const resolved = resolve(root, `${name}.txt`);
  // Compare directories rather than a "/" prefix so the check also holds
  // for the backslash paths that resolve() returns on Windows.
  if (dirname(resolved) !== root) {
    throw new Error(`Invalid skill name: ${name}`);
  }
  return readFileSync(resolved, "utf-8");
}
