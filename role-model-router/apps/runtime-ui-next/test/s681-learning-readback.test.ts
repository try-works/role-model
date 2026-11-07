import { describe, expect, it } from "vitest";

import { READBACK_SPECS } from "../src/readback";

/** S681: the live learning payloads must parse into meaningful rows, not one opaque row. */

const knowledgePayload = {
  knowledge: {
    available: true,
    schemaVersion: "role-model.knowledge-worker.v1",
    candidates: 57,
    indexedDocuments: 57,
    backend: "sqlite_fts5_bm25",
    productionActivation: false,
    retrievalReceipts: 0,
    rollbackReceipts: 0,
    recoveryReceipts: 0,
    degradationCount: 0,
  },
  ladders: [
    {
      roleId: "coder",
      taskTypeId: "tester.reproduce",
      topEndpoints: [{ endpointId: "e1", rank: 1, status: "available" }],
      rungs: [{ endpointId: "e1", rank: 1, status: "available" }],
      rankedCount: 1,
      completeness: { admitted: 1, configured: 2 },
      state: "partial",
      active: true,
      rolledBack: { on: false, reason: null, atMs: null },
      ladderVersion: 3,
    },
  ],
};

const packPayload = {
  schemaVersion: "role-model.knowledge-learning-records.v1",
  scopeId: "standalone-runtime-dev",
  records: [],
  ladders: [
    {
      roleId: "coder",
      taskTypeId: "tester.reproduce",
      topEndpoints: [{ endpointId: "e1", rank: 1, status: "available" }],
      rungs: [{ endpointId: "e1", rank: 1, status: "available" }],
      rankedCount: 1,
      completeness: { admitted: 1, configured: 2 },
      state: "partial",
      active: true,
      rolledBack: { on: false, reason: null, atMs: null },
      ladderVersion: 3,
    },
    {
      roleId: "creative",
      taskTypeId: "writer.draft",
      topEndpoints: [{ endpointId: "e2", rank: 1, status: "available" }],
      rungs: [{ endpointId: "e2", rank: 1, status: "available" }],
      rankedCount: 1,
      completeness: { admitted: 1, configured: 1 },
      state: "complete",
      active: true,
      rolledBack: { on: false, reason: null, atMs: null },
      ladderVersion: 1,
    },
  ],
};

const policyPayload = {
  policyVersion: 1,
  schemaVersion: "role-model.route-learning-activation-policy.v1",
  digest: "sha256:abc",
  effective: { stage: "S4", judgeMode: "identified", minDecisionsPerStep: 200 },
};

const decisionsPayload = {
  schemaVersion: "role-model.route-advisory-decisions.v1",
  scopeId: "standalone-runtime-dev",
  total: 2,
  decisions: [
    { decisionId: "decision-1", routePackage: "route-a", advisoryState: "unavailable", mode: "shadow" },
    { decisionId: "decision-2", routePackage: "route-b", advisoryState: "available", mode: "live" },
  ],
};

const measurementPayload = {
  schemaVersion: "role-model.advisory-effect-measurement.v1",
  routeDecisionId: "measurement:1",
  minSamples: 1,
  pairedHoldoutTasks: 3,
  receiptRefs: ["comparison:1", "comparison:2"],
};

const historyPayload = {
  schemaVersion: "role-model.learning-history.v1",
  scopeId: "standalone-runtime-dev",
  window: { hours: 168, bucketHours: 6 },
  buckets: [
    { startMs: 1, endMs: 2, replays: 1, refusals: 0, deferred: 0, branches: 2 },
    { startMs: 3, endMs: 4, replays: 0, refusals: 1, deferred: 2, branches: 0 },
  ],
};

const profilePayload = {
  schemaVersion: "role-model.learning-profile-inspection.v1",
  state: "available",
  generation: 57,
  estimateState: "active",
  sampleCount: 22,
  effects: { model: { sampleCount: 2, estimate: 0.5 } },
};

const advisoryPayload = { state: "available", confidence: 0, source: "profile-learner" };

describe("S681 learning readback parsing", () => {
  it("parses the live knowledge payload plus ladders", () => {
    const state = READBACK_SPECS.learning.parse(knowledgePayload, 1);
    expect(state.status).toBe("ok");
    expect(state.rows).toHaveLength(8);
    expect(state.rows.some((row) => row.id === "ladder:coder\u0000tester.reproduce")).toBe(true);
  });

  it("combines records and ladders instead of reporting empty", () => {
    const state = READBACK_SPECS.learningPacks.parse(packPayload, 1);
    expect(state.status).toBe("ok");
    expect(state.rows).toHaveLength(2);
    expect(state.scopeId).toBe("standalone-runtime-dev");
    expect(state.rows.map((row) => row.label)).toContain("coder \u00b7 tester.reproduce");
  });

  it("turns policy, decisions, measurement, history, profile and advisory into named rows", () => {
    const policy = READBACK_SPECS.learningConfiguration.parse(policyPayload, 1);
    expect(policy.rows.map((row) => row.id)).toEqual(expect.arrayContaining(["stage", "judgeMode"]));

    const decisions = READBACK_SPECS.learningDecisions.parse(decisionsPayload, 1);
    expect(decisions.rows.map((row) => row.id)).toEqual(["decision-1", "decision-2"]);

    const measurement = READBACK_SPECS.learningEvidence.parse(measurementPayload, 1);
    expect(measurement.rows.find((row) => row.id === "pairedHoldoutTasks")?.value).toBe("3");

    const history = READBACK_SPECS.learningHistory.parse(historyPayload, 1);
    expect(history.rows).toHaveLength(2);
    expect(history.rows[0]?.value).toContain("replays 1");

    const profile = READBACK_SPECS.learningProfile.parse(profilePayload, 1);
    expect(profile.rows.find((row) => row.id === "sampleCount")?.value).toBe("22");

    const advisory = READBACK_SPECS.learningAdvisory.parse(advisoryPayload, 1);
    expect(advisory.rows.map((row) => row.id)).toEqual(["state", "confidence", "source"]);
  });

  it("distinguishes genuinely empty records+ladders from malformed payloads", () => {
    const empty = READBACK_SPECS.learningPacks.parse({ ...packPayload, ladders: [] }, 1);
    expect(empty.status).toBe("empty");
    expect(empty.rows).toEqual([]);
    const malformed = READBACK_SPECS.learningPacks.parse(
      { ...packPayload, records: "nope", ladders: "nope" },
      1,
    );
    expect(malformed.status).toBe("error");
  });
});
