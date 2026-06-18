import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";

import { runRestartRehydrationValidation } from "../src/validate-restart-rehydration.js";

const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..", "..");
const testFixtureRoot = path.join(import.meta.dirname, "fixtures");

describe("runRestartRehydrationValidation", () => {
  test("rehydrates activated endpoints and mixed alias model list after backend restart", async () => {
    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-restart-rehydration-"),
    );

    const result = await runRestartRehydrationValidation({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId: "restart-rehydration-validation-tests",
    });

    expect(result.connectedWithoutEndpointCount).toBe(0);
    expect(result.rehydratedEndpointCount).toBeGreaterThan(0);
    expect(result.modelIdsAfterRestart).toEqual(
      expect.arrayContaining(["moonshot/kimi-k2.5", "baseline.hybrid"]),
    );
    expect(result.mixedAliasModelListIncludesAlias).toBe(true);
  }, 120_000);
});
