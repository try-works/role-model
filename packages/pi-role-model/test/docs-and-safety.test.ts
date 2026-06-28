import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(packageRoot, "..", "..");

async function readSources(dir: string): Promise<string> {
  const entries = await readdir(dir, { withFileTypes: true });
  const chunks = await Promise.all(
    entries.map(async (entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        return readSources(path);
      }
      if (!entry.name.endsWith(".ts")) {
        return "";
      }
      return readFile(path, "utf8");
    }),
  );
  return chunks.join("\n");
}

describe("Pi installation docs, skill, and safety guardrails", () => {
  test("ships the role-model skill and README Installation for Pi section", async () => {
    const skill = await readFile(join(packageRoot, "skills", "role-model", "SKILL.md"), "utf8");
    const readme = await readFile(join(repoRoot, "README.md"), "utf8");
    const packageReadme = await readFile(join(packageRoot, "README.md"), "utf8");

    expect(skill).toContain("role-model");
    expect(skill).toContain("/role-model status");
    expect(skill).toContain("/role-model alias use");
    expect(readme).toContain("## Installation for Pi");
    expect(readme).toContain("ROLE_MODEL_ENDPOINT");
    expect(readme).toContain("allowRemote");
    expect(readme).toContain("authentication.required");
    expect(readme).toContain("pi install npm:@try-works/pi-role-model");
    expect(readme).toContain("pi install ./packages/pi-role-model");
    expect(readme).toContain("/role-model doctor");
    expect(readme).toContain("/role-model alias choose");
    expect(readme).toContain("/role-model alias use");
    expect(packageReadme).toContain("pi install npm:@try-works/pi-role-model");
    expect(packageReadme).toContain("pi install ./packages/pi-role-model");
    expect(packageReadme).toContain("/role-model alias recommended");
    expect(packageReadme).toContain("/role-model requests [limit]");
    expect(packageReadme).toContain("/role-model explain <request-id|latest>");
    expect(packageReadme).toContain("ROLE_MODEL_ENDPOINT");
    expect(packageReadme).toContain("allowRemote");
    expect(packageReadme).toContain("active model");
    expect(skill).toContain("Role-Model repository README");
    expect(skill).toContain("aliases");
    expect(skill).toContain("routing authority");
    expect(skill).toContain("taxonomy discovery");
    expect(skill).toContain("compact taxonomy snapshot");
    expect(skill).toContain("progressive classification");
    expect(skill).toContain("role_model.intent");
    expect(skill).toContain("/role-model requests");
    expect(skill).toContain("/role-model explain <request-id|latest>");
    expect(skill).toContain("Taxonomy-aware benchmarks and telemetry are later Role-Model phases");
    expect(skill).toContain("benchmarks");
    expect(skill).toContain("Do not read, print, copy, or sync Pi auth files");
  });

  test("does not couple the package to auth storage, launchers, or managed runtime processes", async () => {
    const source = await readSources(join(packageRoot, "src"));

    expect(source).not.toMatch(/\bauthStorage\b/);
    expect(source).not.toMatch(/\bROLE_MODEL_DATA_TOKEN\b/);
    expect(source).not.toMatch(/\bchild_process\b/);
    expect(source).not.toMatch(/\bspawn\b/);
    expect(source).not.toMatch(/\bexec\b/);
    expect(source).not.toMatch(/role-model-launcher/);
    expect(source).not.toMatch(/benchmark.*purchase/i);
  });
});
