import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

import {
  SHIPPED_WORKLOAD_EXAMPLES,
  decodeAgentStrategySection,
  derivePostureAliasInventory,
  findAgentStrategyAlias,
  resolvePostureRequestBinding,
} from "../src/agent-strategy.js";
import {
  parseUnifiedRuntimeConfigText,
  renderUnifiedRuntimeConfigText,
} from "../src/unified-runtime-config.js";

/**
 * Run 103 / SP6 - the shipped workload examples (`batch` posture-only and `embedding` with
 * `embeddings.text`) as one documented, validated pair: they must survive the config round trip,
 * materialise aliases for every non-empty scope, and carry their capability pin into the request
 * (design document section 6.2, requirement R6).
 */
const shippedExamplesConfig = [
  "version: 1.0",
  "execution_mode: remote_only",
  "routing:",
  "  mode: baseline",
  "  scoring_strategy: balanced",
  "workloads:",
  "  batch:",
  "    scoring_strategy: cost",
  "  embedding:",
  "    scoring_strategy: cost",
  "    required_capabilities:",
  "      - embeddings.text",
  "",
].join("\n");

describe("shipped workload examples", () => {
  test("ships exactly the documented batch and embedding entries", () => {
    expect(Object.keys(SHIPPED_WORKLOAD_EXAMPLES).sort()).toEqual(["batch", "embedding"]);
    expect(SHIPPED_WORKLOAD_EXAMPLES.batch).toEqual({ scoring_strategy: "cost" });
    expect(SHIPPED_WORKLOAD_EXAMPLES.embedding).toEqual({
      scoring_strategy: "cost",
      required_capabilities: ["embeddings.text"],
    });
  });

  test("is documented in the operations guide", () => {
    const guide = readFileSync(
      path.join(
        __dirname,
        "..",
        "..",
        "..",
        "..",
        "docs",
        "operations",
        "05-agent-strategy-and-workload-postures.md",
      ),
      "utf8",
    );
    expect(guide).toContain("agent_strategies:");
    expect(guide).toContain("workloads:");
    expect(guide).toContain("batch");
    expect(guide).toContain("embedding");
    expect(guide).toContain("embeddings.text");
  });

  test("survives the config round trip and materialises aliases per scope", () => {
    const config = parseUnifiedRuntimeConfigText(shippedExamplesConfig);
    expect(config.workloads?.map((entry) => entry.name)).toEqual(["batch", "embedding"]);
    expect(config.workloads?.every((entry) => entry.violations.length === 0)).toBe(true);
    expect(renderUnifiedRuntimeConfigText(config)).toContain("embeddings.text");

    const section = decodeAgentStrategySection({
      workloads: {
        batch: { ...SHIPPED_WORKLOAD_EXAMPLES.batch },
        embedding: { ...SHIPPED_WORKLOAD_EXAMPLES.embedding },
      },
      executionModes: ["remote_only", "local_only"],
      runtimeMode: "baseline",
      modelIdsByExecutionMode: { remote_only: ["remote-b"], local_only: [] },
    });
    expect(section.violations).toEqual([]);

    const derivation = derivePostureAliasInventory({
      canonical: [{ aliasId: "baseline.remote-only", mode: "basic", modelIds: ["remote-b"] }],
      entries: section.entries,
      executionModes: ["remote_only", "local_only"],
      runtimeMode: "baseline",
      modelIdsByExecutionMode: { remote_only: ["remote-b"], local_only: [] },
    });
    expect(derivation.violations).toEqual([]);
    expect(derivation.rows.map((row) => row.aliasId)).toEqual([
      "baseline.remote-only",
      "batch.remote-only",
      "embedding.remote-only",
    ]);
    expect(derivation.skipped.map((entry) => entry.aliasId)).toEqual([
      "batch.local-only",
      "embedding.local-only",
    ]);
  });

  test("the embedding alias pins its capability and strategy for the request", () => {
    const entry = findAgentStrategyAlias({
      entries: decodeAgentStrategySection({
        workloads: { ...SHIPPED_WORKLOAD_EXAMPLES },
        executionModes: ["remote_only"],
        runtimeMode: "baseline",
        modelIdsByExecutionMode: { remote_only: ["remote-b"] },
      }).entries,
      executionModes: ["remote_only"],
      aliasId: "embedding.remote-only",
    });
    expect(entry).not.toBeNull();
    if (!entry) {
      throw new Error("the shipped embedding alias should resolve back to its entry");
    }
    const binding = resolvePostureRequestBinding({
      entry,
      aliasId: "embedding.remote-only",
      requiredCapabilities: ["text.chat"],
    });
    expect(binding).toMatchObject({
      kind: "workload",
      roleId: null,
      roleSource: "none",
      scoringStrategy: "cost",
    });
    expect(binding.requiredCapabilities).toEqual(["text.chat", "embeddings.text"]);
  });
});
