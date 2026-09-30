import { describe, expect, test } from "vitest";

import { decodeAgentStrategySection } from "../src/agent-strategy.js";

/**
 * Run 103 / SP5c - the `agent_strategies` and `workloads` config blocks decode as one section:
 * entries validated, the shared namespace checked, and the per-scope aliases materialised only when
 * the namespace is clean (requirements R5, R6).
 */
describe("agent strategy section", () => {
  const base = {
    executionModes: ["remote_only"] as const,
    runtimeMode: "baseline" as const,
    modelIdsByExecutionMode: { remote_only: ["remote-b"] },
  };

  test("decodes a role strategy and a workload into per-scope aliases", () => {
    const section = decodeAgentStrategySection({
      ...base,
      agentStrategies: { coder: { role_id: "coder", scoring_strategy: "quality" } },
      workloads: { batch: { scoring_strategy: "cost" } },
    });
    expect(section.violations).toEqual([]);
    expect(section.aliases.map((alias) => alias.aliasId)).toEqual([
      "coder.remote-only",
      "batch.remote-only",
    ]);
    expect(section.aliases[0]).toMatchObject({ roleId: "coder", scoringStrategy: "quality" });
    expect(section.aliases[1]).toMatchObject({ roleId: null, scoringStrategy: "cost" });
  });

  test("a cross-kind name collision is reported and nothing materialises", () => {
    const section = decodeAgentStrategySection({
      ...base,
      agentStrategies: { batch: { role_id: "coder" } },
      workloads: { batch: { required_capabilities: ["embeddings.text"] } },
    });
    expect(section.violations.join(" ")).toMatch(/both/i);
    expect(section.aliases).toEqual([]);
  });

  test("a malformed entry is reported and skipped while the valid one materialises", () => {
    const section = decodeAgentStrategySection({
      ...base,
      agentStrategies: {
        coder: { role_id: "coder" },
        broken: { scoring_strategy: "turbo" },
      },
    });
    expect(section.violations.join(" ")).toMatch(/role_id|turbo/);
    expect(section.aliases.map((alias) => alias.aliasId)).toEqual(["coder.remote-only"]);
  });

  test("empty or absent blocks produce no aliases and no violations", () => {
    const section = decodeAgentStrategySection({ ...base });
    expect(section.aliases).toEqual([]);
    expect(section.violations).toEqual([]);
  });
});
