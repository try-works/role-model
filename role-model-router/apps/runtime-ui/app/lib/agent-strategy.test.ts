import { describe, expect, test } from "vitest";

import {
  buildPostureEntryRows,
  buildPostureWriteBlock,
  buildWorkloadTemplateDraft,
  createPostureDraft,
  findDuplicateEntryNames,
  listEntriesRemovedBySave,
  summarizePostureDiagnostics,
  validatePostureDraft,
} from "./agent-strategy";

const roleEntries = [
  {
    name: "coder",
    kind: "role" as const,
    roleId: "coder",
    scoringStrategy: "quality" as const,
    routingMode: "difficulty" as const,
    computePreference: "local" as const,
    configuredModelIds: ["qwen3-coder"],
    requiredCapabilities: [],
    violations: [],
    aliases: [
      {
        aliasId: "coder.remote-only",
        mode: "difficulty",
        candidateCount: 2,
        allowEndpointIds: ["endpoint-b", "endpoint-a"],
        poolEmpty: false,
      },
      {
        aliasId: "coder.local-only",
        mode: "difficulty",
        candidateCount: 0,
        allowEndpointIds: [],
        poolEmpty: true,
      },
    ],
  },
];

describe("run 103 posture entry view-models", () => {
  test("builds one row per entry with its binding, posture and per-scope alias rows", () => {
    const rows = buildPostureEntryRows(roleEntries, { violations: [], skipped: [], warnings: [] });
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.name).toBe("coder");
    expect(row.kindLabel).toBe("Agent strategy");
    expect(row.bindingLabel).toBe("role_id coder");
    expect(row.postureSummary).toContain("Difficulty");
    expect(row.postureSummary).toContain("Quality");
    expect(row.postureSummary).toContain("compute local");
    expect(row.aliases).toHaveLength(2);
    const remote = row.aliases.find((alias) => alias.aliasId === "coder.remote-only");
    expect(remote?.scopeLabel).toBe("remote-only");
    expect(remote?.candidateLabel).toBe("2 candidates");
    // The readback does not publish a decision winner per alias, so the row names the top-ranked
    // eligible endpoint a "current leader" instead of inventing a winner.
    expect(remote?.leaderEndpointId).toBe("endpoint-a");
    expect(remote?.leaderLabel).toBe("current leader");
    expect(remote?.poolEmpty).toBe(false);
    const local = row.aliases.find((alias) => alias.aliasId === "coder.local-only");
    expect(local?.poolEmpty).toBe(true);
    expect(local?.leaderEndpointId).toBeNull();
    expect(local?.poolEmptyLabel).toBe("POOL EMPTY");
    expect(row.poolEmptyAliasIds).toEqual(["coder.local-only"]);
  });

  test("surfaces posture diagnostics instead of swallowing them", () => {
    const summary = summarizePostureDiagnostics({
      violations: ['role "ghost" references unknown role_id "ghost"'],
      skipped: [{ aliasId: "batch.local-only", reason: "ALIAS_POOL_EMPTY" }],
      warnings: ['workload "embedding" requires unknown capability "embeddings.text"'],
    });
    expect(summary.violations).toHaveLength(1);
    expect(summary.poolEmptyReports).toEqual([
      { aliasId: "batch.local-only", reason: "ALIAS_POOL_EMPTY" },
    ]);
    expect(summary.unknownCapabilityWarnings).toHaveLength(1);
    const rows = buildPostureEntryRows(roleEntries, {
      violations: ['role "ghost" references unknown role_id "ghost"'],
      skipped: [{ aliasId: "batch.local-only", reason: "ALIAS_POOL_EMPTY" }],
      warnings: ['workload "embedding" requires unknown capability "embeddings.text"'],
    });
    expect(rows[0].warnings).toContain('role "ghost" references unknown role_id "ghost"');
  });

  test("accepts a role entry only with a role binding, and never writes a legacy synonym", () => {
    const draft = createPostureDraft("role");
    expect(draft.kind).toBe("role");
    expect(draft.roleId).toBe("");
    expect(validatePostureDraft(draft).ok).toBe(false);
    const invalid = validatePostureDraft({ ...draft, name: "coder" });
    expect(invalid.ok).toBe(false);
    if (invalid.ok) return;
    expect(invalid.errors.roleId).toMatch(/role_id/);

    const ok = validatePostureDraft({
      ...draft,
      name: "coder",
      roleId: "coder",
      scoringStrategy: "high-quality",
      routingMode: "controller",
      computePreference: "hybrid",
      modelIds: ["qwen3-coder"],
    });
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.entry.scoringStrategy).toBe("quality");
    expect(ok.entry.routingMode).toBe("intelligent");

    const reserved = validatePostureDraft({ ...draft, name: "baseline", roleId: "coder" });
    expect(reserved.ok).toBe(false);
    const unknownMode = validatePostureDraft({
      ...draft,
      name: "coder",
      roleId: "coder",
      routingMode: "turbo",
    });
    expect(unknownMode.ok).toBe(false);
  });

  test("refuses role_id on a workload and accepts required capabilities", () => {
    const workload = validatePostureDraft({
      ...createPostureDraft("workload"),
      name: "embedding",
      scoringStrategy: "cost",
      requiredCapabilities: ["embeddings.text"],
    });
    expect(workload.ok).toBe(true);
    if (!workload.ok) return;
    expect(workload.entry.requiredCapabilities).toEqual(["embeddings.text"]);
    const withRole = validatePostureDraft({
      ...createPostureDraft("workload"),
      name: "embedding",
      roleId: "coder",
    });
    expect(withRole.ok).toBe(false);
    if (withRole.ok) return;
    expect(withRole.errors.roleId).toMatch(/must not/);
  });

  test("offers the shipped workload examples as one-click templates", () => {
    const batch = buildWorkloadTemplateDraft("batch", { scoring_strategy: "cost" });
    expect(batch).not.toBeNull();
    if (!batch) return;
    expect(batch.name).toBe("batch");
    expect(batch.scoringStrategy).toBe("cost");
    expect(batch.requiredCapabilities).toEqual([]);
    const embedding = buildWorkloadTemplateDraft("embedding", {
      scoring_strategy: "cost",
      required_capabilities: ["embeddings.text"],
    });
    expect(embedding).not.toBeNull();
    if (!embedding) return;
    expect(embedding.name).toBe("embedding");
    expect(embedding.requiredCapabilities).toEqual(["embeddings.text"]);
    expect(buildWorkloadTemplateDraft("unknown", { scoring_strategy: "cost" })).toBeNull();
  });

  test("writes whole canonical blocks from the page drafts", () => {
    const block = buildPostureWriteBlock("role", [
      {
        name: "coder",
        roleId: "coder",
        scoringStrategy: "quality",
        routingMode: "intelligent",
        computePreference: "local",
        modelIds: ["qwen3-coder"],
        requiredCapabilities: [],
      },
      {
        name: "researcher",
        roleId: "researcher",
        scoringStrategy: null,
        routingMode: null,
        computePreference: null,
        modelIds: [],
        requiredCapabilities: [],
      },
    ]);
    expect(block).toEqual({
      coder: {
        role_id: "coder",
        scoring_strategy: "quality",
        routing_mode: "intelligent",
        compute_preference: "local",
        model_ids: ["qwen3-coder"],
      },
      researcher: { role_id: "researcher" },
    });
    const workloads = buildPostureWriteBlock("workload", [
      {
        name: "embedding",
        roleId: null,
        scoringStrategy: "cost",
        routingMode: null,
        computePreference: null,
        modelIds: [],
        requiredCapabilities: ["embeddings.text"],
      },
    ]);
    expect(workloads).toEqual({
      embedding: { scoring_strategy: "cost", required_capabilities: ["embeddings.text"] },
    });
    // Workload entries must never carry a role binding.
    expect(JSON.stringify(workloads)).not.toContain("role_id");
  });

  /**
   * Post-lock repair (run 103): the block is keyed by name, so duplicates silently collapse and a
   * missing name silently removes a saved entry. Both are detected before the write.
   */
  test("reports duplicate entry names instead of letting the block collapse them", () => {
    expect(findDuplicateEntryNames(["coder", "reviewer"])).toEqual([]);
    expect(findDuplicateEntryNames(["coder", "coder", "reviewer", " reviewer "])).toEqual([
      "coder",
      "reviewer",
    ]);
    expect(findDuplicateEntryNames(["", "  "])).toEqual([]);
  });

  test("lists the saved entries a save would remove", () => {
    expect(listEntriesRemovedBySave(["coder", "reviewer"], ["coder", "reviewer"])).toEqual([]);
    expect(listEntriesRemovedBySave(["coder", "reviewer"], ["coder", "qa"])).toEqual(["reviewer"]);
    // A rename removes the old name; the new name is not a saved entry yet.
    expect(listEntriesRemovedBySave(["coder"], ["coder-v2"])).toEqual(["coder"]);
  });
});
