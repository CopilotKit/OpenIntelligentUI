import { describe, it, expect } from "vitest";
import { listSkills, loadSkill } from "../src/skills";

describe("listSkills", () => {
  it("returns an array containing the bundled skills", () => {
    const skills = listSkills();
    expect(Array.isArray(skills)).toBe(true);
    expect(skills).toContain("master-agent-playbook");
  });
});

describe("loadSkill", () => {
  it("loads a bundled skill by name", () => {
    expect(loadSkill("master-agent-playbook").length).toBeGreaterThan(0);
  });

  it.each(["../package", "nested/skill", "/etc/passwd"])(
    "rejects names outside the skills directory: %s",
    (name) => {
      expect(() => loadSkill(name)).toThrow("Invalid skill name");
    }
  );
});
