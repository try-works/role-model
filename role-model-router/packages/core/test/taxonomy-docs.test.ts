import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, test } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..", "..");

describe("taxonomy documentation", () => {
  test("documents taxonomy V1 concepts, discovery, Pi classification, and future phases", () => {
    const doc = readFileSync(path.join(repoRoot, "docs/protocol/taxonomy-v1.md"), "utf8");
    const readme = readFileSync(path.join(repoRoot, "README.md"), "utf8");

    for (const text of [
      "groups",
      "roles",
      "task types",
      "{role-family}.{task-action}[.{variant}]",
      "progressive disclosure",
      "role_model.intent",
      "hard",
      "advisory",
      "Pi",
      "benchmark",
      "telemetry",
    ]) {
      expect(doc).toContain(text);
    }
    expect(readme).toContain("docs/protocol/taxonomy-v1.md");
  });

  // ── R10.1: Generated taxonomy tables validation ──

  test("taxonomy docs contain auto-generated tables matching canonical data (R10.1)", () => {
    const doc = readFileSync(path.join(repoRoot, "docs/protocol/taxonomy-v1.md"), "utf8");

    // Verify generation markers exist
    expect(doc).toContain("<!-- AUTO-GENERATED-TAXONOMY-TABLES-START -->");
    expect(doc).toContain("<!-- AUTO-GENERATED-TAXONOMY-TABLES-END -->");

    // Verify group count in generated section
    expect(doc).toContain("### Groups");
    expect(doc).toContain("### Roles");
    expect(doc).toContain("### Task Types");
    expect(doc).toContain("### Capabilities");
    expect(doc).toContain("### Modalities");
    expect(doc).toContain("### Tool Classes");

    // Verify key canonical IDs appear in generated tables
    const requiredGroupIds = ["engineering", "product_design", "knowledge_research", "business", "communication", "governance_safety"];
    for (const id of requiredGroupIds) {
      expect(doc.includes(`\`${id}\``), `docs should include group ${id}`).toBe(true);
    }

    // Verify 28 role count mentioned
    expect(doc).toContain("28");
    // Verify 280 task count mentioned
    expect(doc).toContain("280");
  });
});
