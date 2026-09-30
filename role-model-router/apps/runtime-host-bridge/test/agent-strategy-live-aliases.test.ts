import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { createRuntimeBridgeBackend } from "../src/index.js";

/**
 * Run 103 / SP5f-SP5g - the posture blocks through the live backend: the derived `<name>.<scope>`
 * aliases reach the alias inventory and the persisted file, an unknown role is a write error, and a
 * posture alias that would shadow an existing alias is a write error too
 * (design document section 6.2, requirements R5, R6, R10).
 */
const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..", "..");
const testFixtureRoot = path.join(import.meta.dirname, "fixtures");

interface RouterSummaryShape {
  readonly aliasInventory: readonly { readonly aliasId: string; readonly candidateCount?: number }[];
}

interface RouterConfigShape {
  readonly routing: {
    readonly mode: string;
    readonly scoringStrategy: string | null;
    readonly pinWeights: boolean;
    readonly legacyStrategy: string | null;
  } | null;
  readonly agentStrategies: readonly {
    readonly name: string;
    readonly roleId: string | null;
    readonly aliases: readonly { readonly aliasId: string; readonly candidateCount: number }[];
  }[];
  readonly workloads: readonly {
    readonly name: string;
    readonly requiredCapabilities: readonly string[];
    readonly aliases: readonly { readonly aliasId: string }[];
  }[];
  readonly workloadExamples: Readonly<Record<string, unknown>>;
  readonly postureDiagnostics: {
    readonly violations: readonly string[];
    readonly skipped: readonly { readonly aliasId: string; readonly reason: string }[];
    readonly warnings: readonly string[];
  };
}

describe("agent strategy and workload aliases in the live backend", () => {
  test("materialises posture aliases, survives a config patch and rejects an unknown role", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-run103-postures-"));
    const runtimeStateRoot = path.join(tempRoot, "state");
    const unifiedRuntimeConfigPath = path.join(tempRoot, "runtime-config.yaml");
    try {
      await writeFile(
        unifiedRuntimeConfigPath,
        [
          'version: "1.0"',
          "execution_mode: local_only",
          "routing:",
          "  mode: intelligent",
          "  scoring_strategy: quality",
          "  pin_weights: false",
          "llama_swap:",
          "  models:",
          "    local-coder:",
          "      path: ./models/local-coder.gguf",
          "      capabilities:",
          "        - text.chat",
          "        - embeddings.text",
          "agent_strategies:",
          "  coder:",
          "    role_id: coder",
          "    scoring_strategy: quality",
          "workloads:",
          "  batch:",
          "    scoring_strategy: cost",
          "  embedding:",
          "    scoring_strategy: cost",
          "    required_capabilities:",
          "      - embeddings.text",
          "",
        ].join("\n"),
        "utf8",
      );

      const backend = await createRuntimeBridgeBackend({
        repoRoot,
        fixtureRoot: testFixtureRoot,
        runtimeStateRoot,
        scopeId: "run103-posture-aliases",
        unifiedRuntimeConfigPath,
      });

      try {
        const config = (await backend.readRouterConfig()) as RouterConfigShape;
        expect(config.routing).toMatchObject({
          mode: "intelligent",
          scoringStrategy: "quality",
          pinWeights: false,
          legacyStrategy: null,
        });
        expect(config.agentStrategies.map((entry) => entry.name)).toEqual(["coder"]);
        expect(config.workloads.map((entry) => entry.name)).toEqual(["batch", "embedding"]);
        expect(config.workloads[1]?.requiredCapabilities).toEqual(["embeddings.text"]);
        expect(Object.keys(config.workloadExamples).sort()).toEqual(["batch", "embedding"]);
        expect(config.postureDiagnostics.violations).toEqual([]);
        /** R6: the declared capability is known because the configured model declares it. */
        expect(config.postureDiagnostics.warnings).toEqual([]);

        const coderAliases = config.agentStrategies[0]?.aliases.map((alias) => alias.aliasId) ?? [];
        expect(coderAliases.length).toBeGreaterThan(0);
        expect(coderAliases.every((aliasId) => aliasId.startsWith("coder."))).toBe(true);
        expect(
          config.agentStrategies[0]?.aliases.every((alias) => alias.candidateCount > 0),
        ).toBe(true);

        const summary = (await backend.readRouterSummary()) as RouterSummaryShape;
        const aliasIds = summary.aliasInventory.map((row) => row.aliasId);
        expect(aliasIds).toContain("coder.local-only");
        expect(aliasIds).toContain("controller.local-only");

        const persisted = await readFile(unifiedRuntimeConfigPath, "utf8");
        expect(persisted).toContain("posture: agent_strategy:coder");
        expect(persisted).toContain("posture: workload:embedding");
        expect(persisted).toContain("scoring_strategy: quality");
        expect(persisted).toContain("mode: intelligent");

        await expect(
          backend.updateRuntimeConfig({ agent_strategies: { coder: { role_id: "no-such-role" } } }),
        ).rejects.toThrow(/unknown role_id/);

        await expect(
          backend.updateRuntimeConfig({
            model_aliases: {
              "coder.local-only": {
                mode: "basic",
                model_ids: ["local-coder"],
              },
            },
          }),
        ).rejects.toThrow(/collides/);

        const afterFailures = (await backend.readRouterConfig()) as RouterConfigShape;
        expect(afterFailures.agentStrategies[0]?.roleId).toBe("coder");
      } finally {
        await backend.shutdown();
      }
    } finally {
      await rm(tempRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  }, 120_000);
});
