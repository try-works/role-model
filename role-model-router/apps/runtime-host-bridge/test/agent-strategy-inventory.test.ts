import { describe, expect, test } from "vitest";

import { mergeAliasInventory } from "../src/agent-strategy.js";

/**
 * Run 103 / SP5d - posture aliases join the canonical routing matrix in one inventory; a collision
 * is reported and skipped rather than shadowing a canonical alias (requirements R5, R6, R10).
 */
describe("alias inventory merge", () => {
  const canonical = [
    { aliasId: "baseline.remote-only", mode: "basic", modelIds: ["remote-b"] },
    { aliasId: "controller.remote-only", mode: "intelligent", modelIds: ["remote-b"] },
  ] as const;

  const coderAlias = {
    aliasId: "coder.remote-only",
    name: "coder",
    kind: "role" as const,
    mode: "difficulty" as const,
    roleId: "coder",
    scoringStrategy: "quality" as const,
    requiredCapabilities: [] as const,
    modelIds: ["remote-b"],
  };

  test("appends posture aliases after the canonical matrix", () => {
    const merged = mergeAliasInventory({ canonical, postureAliases: [coderAlias] });
    expect(merged.violations).toEqual([]);
    expect(merged.rows.map((row) => row.aliasId)).toEqual([
      "baseline.remote-only",
      "controller.remote-only",
      "coder.remote-only",
    ]);
    expect(merged.rows[2]).toMatchObject({ mode: "difficulty", modelIds: ["remote-b"] });
  });

  test("a canonical collision is reported and the posture alias is skipped", () => {
    const merged = mergeAliasInventory({
      canonical,
      postureAliases: [{ ...coderAlias, aliasId: "baseline.remote-only" }],
    });
    expect(merged.violations.join(" ")).toMatch(/baseline\.remote-only/);
    expect(merged.rows.map((row) => row.aliasId)).toEqual([
      "baseline.remote-only",
      "controller.remote-only",
    ]);
  });

  test("an empty posture pool is preserved so the caller can report ALIAS_POOL_EMPTY", () => {
    const merged = mergeAliasInventory({
      canonical,
      postureAliases: [{ ...coderAlias, modelIds: [] }],
    });
    expect(merged.rows[2]?.modelIds).toEqual([]);
  });
});
