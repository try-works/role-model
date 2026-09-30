import { describe, expect, test } from "vitest";

import { mergeUnifiedRuntimeConfigDocuments } from "../src/unified-runtime-config.js";

/**
 * Run 103 post-lock repair (operator decision): a patch that adds or updates one entry must never
 * remove the entries it does not mention. `agent_strategies`, `workloads` and `model_aliases` are
 * name-keyed blocks, so they merge per entry (and per field inside an entry); deletion is explicit
 * (`null`) and only the operator's explicit Remove action produces it in the UI.
 */
const baseDocument = {
  version: "1.0",
  execution_mode: "remote_only",
  agent_strategies: {
    coder: { role_id: "coder", scoring_strategy: "quality" },
    reviewer: { role_id: "tester" },
  },
  workloads: {
    batch: { scoring_strategy: "cost" },
    embedding: { scoring_strategy: "cost", required_capabilities: ["embeddings.text"] },
  },
  model_aliases: {
    "run94.error": {
      mode: "basic",
      model_ids: ["deepseek/deepseek-v4-flash"],
      endpoint_ids: ["deepseek.personal.control.global.deepseek-v4-flash"],
    },
  },
};

/** The merge takes the raw file document, exactly as the write path does. */
const baseConfig = baseDocument as unknown as Record<string, unknown>;

const entryNames = (
  config: ReturnType<typeof mergeUnifiedRuntimeConfigDocuments>,
): readonly string[] => (config.agentStrategies ?? []).map((entry) => entry.name).sort();

describe("named block merge", () => {
  test("adding one agent strategy keeps the saved entries", () => {
    const merged = mergeUnifiedRuntimeConfigDocuments(baseConfig, {
      agent_strategies: { architect: { role_id: "architect" } },
    });
    expect(entryNames(merged)).toEqual(["architect", "coder", "reviewer"]);
    expect(merged.agentStrategies?.find((entry) => entry.name === "coder")).toMatchObject({
      roleId: "coder",
      scoringStrategy: "quality",
    });
  });

  test("adding one workload keeps the saved workloads", () => {
    const merged = mergeUnifiedRuntimeConfigDocuments(baseConfig, {
      workloads: { classification: { scoring_strategy: "balanced" } },
    });
    expect((merged.workloads ?? []).map((entry) => entry.name).sort()).toEqual([
      "batch",
      "classification",
      "embedding",
    ]);
    expect(
      merged.workloads?.find((entry) => entry.name === "embedding")?.requiredCapabilities,
    ).toEqual(["embeddings.text"]);
  });

  test("adding one model alias keeps the saved aliases", () => {
    const merged = mergeUnifiedRuntimeConfigDocuments(baseConfig, {
      model_aliases: {
        "run103.new": { mode: "basic", model_ids: ["deepseek/deepseek-v4-pro"] },
      },
    });
    expect((merged.modelAliases ?? []).map((alias) => alias.aliasId).sort()).toEqual([
      "run103.new",
      "run94.error",
    ]);
    expect(merged.modelAliases?.find((alias) => alias.aliasId === "run94.error")?.modelIds).toEqual(
      ["deepseek/deepseek-v4-flash"],
    );
  });

  test("updating one entry leaves the fields the patch does not name", () => {
    const merged = mergeUnifiedRuntimeConfigDocuments(baseConfig, {
      agent_strategies: { coder: { scoring_strategy: "latency" } },
    });
    const coder = merged.agentStrategies?.find((entry) => entry.name === "coder");
    expect(coder).toMatchObject({ roleId: "coder", scoringStrategy: "latency" });
  });

  test("an explicit null removes exactly one entry", () => {
    const merged = mergeUnifiedRuntimeConfigDocuments(baseConfig, {
      agent_strategies: { reviewer: null },
    });
    expect(entryNames(merged)).toEqual(["coder"]);
  });

  test("an explicit null clears one field and keeps the rest of the entry", () => {
    const merged = mergeUnifiedRuntimeConfigDocuments(baseConfig, {
      agent_strategies: { coder: { scoring_strategy: null } },
    });
    const coder = merged.agentStrategies?.find((entry) => entry.name === "coder");
    expect(coder).toMatchObject({ roleId: "coder", scoringStrategy: null });
  });

  test("omitting a block leaves it exactly as it was", () => {
    const merged = mergeUnifiedRuntimeConfigDocuments(baseConfig, {
      routing: { mode: "difficulty" },
    });
    expect(entryNames(merged)).toEqual(["coder", "reviewer"]);
    expect((merged.workloads ?? []).map((entry) => entry.name).sort()).toEqual([
      "batch",
      "embedding",
    ]);
    expect(merged.modelAliases?.map((alias) => alias.aliasId)).toEqual(["run94.error"]);
  });

  test("a full-block write still behaves like the previous whole-block replacement", () => {
    const merged = mergeUnifiedRuntimeConfigDocuments(baseConfig, {
      agent_strategies: {
        coder: { role_id: "coder", scoring_strategy: "quality" },
        reviewer: { role_id: "tester" },
      },
    });
    expect(entryNames(merged)).toEqual(["coder", "reviewer"]);
  });
});
