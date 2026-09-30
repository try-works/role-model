import { describe, expect, test } from "vitest";

import {
  decodeAgentStrategyEntry,
  derivePostureAliasInventory,
  materializeAgentStrategyAliases,
  resolveAliasRequestedRole,
} from "../src/agent-strategy.js";

/**
 * Run 103 / SP5b - validated entries materialise one alias per execution scope with honest pools,
 * and a declared request role wins over the alias preset (requirements R5, R6).
 */
describe("agent strategy materialisation", () => {
  const scopes = ["decision_only", "local_only", "remote_only"] as const;
  const modelIdsByScope = {
    decision_only: ["local-a", "remote-b"],
    local_only: ["local-a"],
    remote_only: ["remote-b"],
  } as const;

  test("materialises one alias per scope with the posture and the role binding", () => {
    const coder = decodeAgentStrategyEntry(
      "coder",
      { role_id: "coder", scoring_strategy: "quality", routing_mode: "difficulty" },
      "role",
    );
    const aliases = materializeAgentStrategyAliases({
      entries: [coder],
      executionModes: scopes,
      runtimeMode: "baseline",
      modelIdsByExecutionMode: modelIdsByScope,
    });
    expect(aliases.map((alias) => alias.aliasId)).toEqual([
      "coder.decision-only",
      "coder.local-only",
      "coder.remote-only",
    ]);
    expect(aliases[2]).toMatchObject({
      mode: "difficulty",
      roleId: "coder",
      scoringStrategy: "quality",
      modelIds: ["remote-b"],
    });
  });

  test("a workload entry carries capability pins and no role", () => {
    const embedding = decodeAgentStrategyEntry(
      "embedding",
      { required_capabilities: ["embeddings.text"], scoring_strategy: "cost" },
      "workload",
    );
    const aliases = materializeAgentStrategyAliases({
      entries: [embedding],
      executionModes: ["remote_only"],
      runtimeMode: "intelligent",
      modelIdsByExecutionMode: modelIdsByScope,
    });
    expect(aliases[0]).toMatchObject({
      aliasId: "embedding.remote-only",
      mode: "intelligent",
      roleId: null,
      requiredCapabilities: ["embeddings.text"],
      scoringStrategy: "cost",
    });
  });

  test("an entry with violations is not materialised, and an empty pool is preserved", () => {
    const invalid = decodeAgentStrategyEntry("batch", { role_id: "coder" }, "workload");
    expect(invalid.violations.length).toBeGreaterThan(0);
    const aliases = materializeAgentStrategyAliases({
      entries: [invalid],
      executionModes: ["remote_only"],
      runtimeMode: "baseline",
      modelIdsByExecutionMode: modelIdsByScope,
    });
    expect(aliases).toEqual([]);

    const empty = materializeAgentStrategyAliases({
      entries: [decodeAgentStrategyEntry("coder", { role_id: "coder" }, "role")],
      executionModes: ["remote_only"],
      runtimeMode: "baseline",
      modelIdsByExecutionMode: { remote_only: [] },
    });
    expect(empty[0]?.modelIds).toEqual([]);
  });

  test("a declared role wins over the alias preset and the source is recorded", () => {
    expect(
      resolveAliasRequestedRole({ declaredRoleId: "researcher", presetRoleId: "coder" }),
    ).toEqual({
      roleId: "researcher",
      source: "declared",
    });
    expect(resolveAliasRequestedRole({ declaredRoleId: null, presetRoleId: "coder" })).toEqual({
      roleId: "coder",
      source: "preset",
    });
    expect(resolveAliasRequestedRole({ declaredRoleId: null, presetRoleId: null })).toEqual({
      roleId: null,
      source: "none",
    });
  });

  /**
   * Post-lock repair (run 103, operator decision): the published pool must reflect the eligibility the
   * router applies at request time. A capability pin used to travel on the alias while the pool still
   * advertised every model in the scope, so `embedding.remote-only` looked healthy and then failed with
   * `no_eligible_target` on the first call.
   */
  test("a capability pin narrows the pool to the models that satisfy it", () => {
    const retrieval = decodeAgentStrategyEntry(
      "embedding",
      { required_capabilities: ["knowledge.retrieval"], scoring_strategy: "cost" },
      "workload",
    );
    const aliases = materializeAgentStrategyAliases({
      entries: [retrieval],
      executionModes: ["remote_only"],
      runtimeMode: "baseline",
      modelIdsByExecutionMode: { remote_only: ["remote-b", "remote-c"] },
      supportedCapabilitiesByModelId: {
        "remote-b": ["text.chat"],
        "remote-c": ["text.chat", "knowledge.retrieval"],
      },
    });
    expect(aliases[0]?.modelIds).toEqual(["remote-c"]);
  });

  test("a capability pin nothing satisfies leaves an empty pool instead of advertising candidates", () => {
    const retrieval = decodeAgentStrategyEntry(
      "embedding",
      { required_capabilities: ["knowledge.retrieval"] },
      "workload",
    );
    const aliases = materializeAgentStrategyAliases({
      entries: [retrieval],
      executionModes: ["remote_only"],
      runtimeMode: "baseline",
      modelIdsByExecutionMode: { remote_only: ["remote-b"] },
      supportedCapabilitiesByModelId: { "remote-b": ["text.chat", "tools.function_calling"] },
    });
    expect(aliases[0]?.modelIds).toEqual([]);
  });

  test("capability narrowing honours the taxonomy implications and capability families", () => {
    const editorWorkload = decodeAgentStrategyEntry(
      "editor",
      { required_capabilities: ["code.write", "reasoning.multi_step"] },
      "workload",
    );
    expect(editorWorkload.violations).toEqual([]);
    const aliases = materializeAgentStrategyAliases({
      entries: [editorWorkload],
      executionModes: ["remote_only"],
      runtimeMode: "baseline",
      modelIdsByExecutionMode: { remote_only: ["capable-model", "plain-model"] },
      supportedCapabilitiesByModelId: {
        "capable-model": ["code.edit", "reasoning"],
        "plain-model": ["text.chat"],
      },
    });
    expect(aliases[0]?.modelIds).toEqual(["capable-model"]);
  });

  test("the derivation reports ALIAS_POOL_EMPTY when only the capability filter empties the pool", () => {
    const derivation = derivePostureAliasInventory({
      canonical: [],
      entries: [
        decodeAgentStrategyEntry(
          "embedding",
          { required_capabilities: ["knowledge.retrieval"] },
          "workload",
        ),
      ],
      executionModes: ["remote_only"],
      runtimeMode: "baseline",
      modelIdsByExecutionMode: { remote_only: ["remote-b"] },
      supportedCapabilitiesByModelId: { "remote-b": ["text.chat"] },
    });
    expect(derivation.rows).toEqual([]);
    expect(derivation.skipped).toEqual([
      { aliasId: "embedding.remote-only", reason: "ALIAS_POOL_EMPTY" },
    ]);
  });
});
