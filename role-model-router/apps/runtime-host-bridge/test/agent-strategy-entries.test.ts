import { describe, expect, test } from "vitest";

import {
  agentStrategyAliasId,
  decodeAgentStrategyEntry,
  validateAgentStrategyNames,
} from "../src/agent-strategy.js";

/**
 * Run 103 / SP5 - agent strategies (role-bound) and workloads decode into validated postures that
 * materialise one alias per execution scope (design document sections 4 and 6.2; requirements R5, R6).
 */
describe("agent strategy entries", () => {
  test("decodes a role-bound entry with its posture", () => {
    const entry = decodeAgentStrategyEntry(
      "coder",
      { role_id: "coder", scoring_strategy: "quality", routing_mode: "difficulty" },
      "role",
    );
    expect(entry.violations).toEqual([]);
    expect(entry.roleId).toBe("coder");
    expect(entry.scoringStrategy).toBe("quality");
    expect(entry.routingMode).toBe("difficulty");
  });

  test("decodes a workload entry with capability pins and no role", () => {
    const entry = decodeAgentStrategyEntry(
      "embedding",
      { required_capabilities: ["embeddings.text"], scoring_strategy: "cost" },
      "workload",
    );
    expect(entry.violations).toEqual([]);
    expect(entry.roleId).toBeNull();
    expect(entry.requiredCapabilities).toEqual(["embeddings.text"]);
    expect(entry.scoringStrategy).toBe("cost");
  });

  test("rejects an invalid or reserved name", () => {
    expect(decodeAgentStrategyEntry("Coder", {}, "role").violations.join(" ")).toMatch(/name/i);
    expect(decodeAgentStrategyEntry("my_strategy", {}, "role").violations.join(" ")).toMatch(/name/i);
    expect(decodeAgentStrategyEntry("baseline", { role_id: "coder" }, "role").violations.join(" ")).toMatch(
      /reserved/i,
    );
  });

  test("a role entry needs a role and a workload entry must not carry one", () => {
    expect(decodeAgentStrategyEntry("coder", {}, "role").violations.join(" ")).toMatch(/role_id/);
    expect(
      decodeAgentStrategyEntry("batch", { role_id: "coder" }, "workload").violations.join(" "),
    ).toMatch(/role_id/);
  });

  test("an unknown scoring strategy fails closed with a violation", () => {
    const entry = decodeAgentStrategyEntry(
      "coder",
      { role_id: "coder", scoring_strategy: "turbo" },
      "role",
    );
    expect(entry.scoringStrategy).toBeNull();
    expect(entry.violations.join(" ")).toMatch(/turbo/);
  });

  test("reports duplicate and cross-kind name collisions", () => {
    const violations = validateAgentStrategyNames([
      { name: "coder", kind: "role" },
      { name: "coder", kind: "role" },
      { name: "batch", kind: "role" },
      { name: "batch", kind: "workload" },
    ]);
    expect(violations.join(" ")).toMatch(/coder/);
    expect(violations.join(" ")).toMatch(/batch/);
  });

  test("materialises the alias id from the name and the execution scope", () => {
    expect(agentStrategyAliasId("coder", "remote_only")).toBe("coder.remote-only");
    expect(agentStrategyAliasId("batch", "decision_only")).toBe("batch.decision-only");
  });
});
