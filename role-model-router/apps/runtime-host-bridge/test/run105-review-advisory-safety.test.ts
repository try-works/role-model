import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, expect, test } from "vitest";
import { readTrackBRouteAdvisoryFromRollout as read } from "../src/route-advisory-source.js";
// Paired checkout integration: genuine materializer + temporary SQLite store, never a mock literal.
const privateRoot =
  process.env.RUN105_PRIVATE_ROOT ??
  "D:/DEV/role-model-internal/.worktrees/105-route-learning-matching-scope-activation";
const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});
const scopeId = "tenant:safety";
const roleId = "role:reviewer";
const taskTypeId = "task:review";
const group = (id: string, confidence: number, atMs: number | null) => ({
  groupId: id,
  status: "finalized",
  outcome: "source",
  winnerTrialId: `${id}:a`,
  winnerRole: "source",
  createdAtMs: atMs,
  comparability: {
    roleId,
    taskTypeId,
    taxonomyVersion: "taxonomy:105",
    sourceCandidateRef: "endpoint:a",
    counterfactualCandidateRef: "endpoint:b",
  },
  scorerDisagreement: false,
  scorerOutcomes: [{ scorerKey: "judge", outcome: "source" }],
  validityIssues: [],
  effortComparability: [
    {
      endpointId: "endpoint:b",
      modelId: "b",
      sourceModelId: "a",
      reasoningEffort: "high",
      sourceReasoningEffort: "high",
      comparability: "matched",
    },
  ],
  members: [
    { trialId: `${id}:a`, candidateRef: "endpoint:a", role: "source", confidence },
    { trialId: `${id}:b`, candidateRef: "endpoint:b", role: "counterfactual", confidence: 0.75 },
  ],
});
async function setup(atMs: number | null = 1000) {
  const storeUrl = pathToFileURL(
    path.join(privateRoot, "extensions/knowledge-store/index.mjs"),
  ).href;
  const materializerUrl = pathToFileURL(
    path.join(privateRoot, "shared/route-learning/route-ladder-materialization.mjs"),
  ).href;
  const { run } = await import(/* @vite-ignore */ storeUrl);
  const { createRouteLadderStoreAdapter, materializeRouteLadders } = await import(
    /* @vite-ignore */ materializerUrl
  );
  const root = await mkdtemp(path.join(tmpdir(), "run105-advisory-safety-"));
  roots.push(root);
  const filePath = path.join(root, "knowledge.sqlite");
  const calls: { capability: string; value: Readonly<Record<string, unknown>> }[] = [];
  const invoke = async (capability: string, value: Readonly<Record<string, unknown>>) => {
    calls.push({ capability, value });
    return run({
      capability,
      channel: "development",
      scope: scopeId,
      authorizationEpoch: 105,
      payload: { ...value, filePath },
    });
  };
  const adapter = createRouteLadderStoreAdapter({
    invoke: async (_id: string, envelope: { capability: string; payload: unknown }) =>
      invoke(envelope.capability, envelope.payload),
    envelope: {
      channel: "development",
      scope: scopeId,
      authorizationEpoch: 105,
      payload: { filePath },
    },
  });
  const groups = [group("g1", 0.8, atMs), group("g2", 0.9, atMs)];
  const materialize = (nowMs: number, overrides: Record<string, unknown> = {}) =>
    materializeRouteLadders({
      groups,
      configuredEndpointIds: ["endpoint:a", "endpoint:b"],
      ...adapter,
      defaults: { minComparisons: 2, minConfidence: 0.7, stalenessWindowDays: 30 },
      nowMs,
      taxonomyVersion: "taxonomy:105",
      scopeId,
      ...overrides,
    });
  await materialize(2000);
  calls.length = 0;
  const input = {
    invoke,
    scopeId,
    roleId,
    taskTypeId,
    nowMs: 2000,
    evidenceMaxAgeMs: 10000,
    stage: "S3",
    policyCohortPercent: 25,
  };
  return { input, invoke, calls, materialize, groups };
}
async function changed(
  capability: string,
  mutate: (value: Record<string, unknown>) => Record<string, unknown>,
) {
  const s = await setup();
  return read({
    ...s.input,
    invoke: async (c, v) => {
      const answer = await s.invoke(c, v);
      return c === capability ? mutate(structuredClone(answer)) : answer;
    },
  });
}
test("real-store admitted confidence, explicit cohort and exact scoped reads without promotion", async () => {
  const s = await setup();
  expect((await read(s.input)).reason).toBeNull();
  expect(await read(s.input)).toMatchObject({
    advisoryState: "fresh",
    confidence: 0.75,
    cohortPercent: 25,
    roleId,
    taskTypeId,
    taxonomyVersion: "taxonomy:105",
    preferredRoutePackage: "endpoint:a",
  });
  const row = await s.invoke("knowledge:read-route-ladder", { scopeId, roleId, taskTypeId });
  expect(s.calls).toContainEqual({
    capability: "knowledge:read-route-ladder",
    value: { scopeId, roleId, taskTypeId },
  });
  expect(s.calls).toContainEqual({
    capability: "knowledge:read",
    value: { id: row.ladder.packId, scope: scopeId },
  });
  expect(s.calls).toContainEqual({
    capability: "knowledge:rollout-state",
    value: { scopeId, limit: 1 },
  });
  expect((await s.invoke("knowledge:rollout-state", { scopeId })).activePackageId).toBeNull();
});
test("real-store rewrite/cache time cannot refresh evidence", async () => {
  const s = await setup();
  const before = await s.invoke("knowledge:read-route-ladder", { scopeId, roleId, taskTypeId });
  await s.materialize(999999);
  expect(
    (await s.invoke("knowledge:read-route-ladder", { scopeId, roleId, taskTypeId })).ladder.version,
  ).toBe(before.ladder.version);
  expect(await read({ ...s.input, nowMs: 20001 })).toMatchObject({
    advisoryState: "stale",
    confidence: 0.75,
    revalidationDue: false,
  });
});
test("revalidation uses evidence age", async () => {
  const s = await setup();
  expect(await read({ ...s.input, revalidationIntervalMs: 500 })).toMatchObject({
    advisoryState: "stale",
    revalidationDue: true,
  });
});
test("unknown evidence time never becomes fresh", async () => {
  const s = await setup(null);
  expect((await read(s.input)).advisoryState).not.toBe("fresh");
});
test("real scope kill switch suppresses derived ladder", async () => {
  const s = await setup();
  await s.invoke("knowledge:engage-kill-switch", { scopeId });
  expect(await read(s.input)).toMatchObject({
    advisoryState: "unavailable",
    preferredRoutePackage: null,
    roleId,
    taskTypeId,
  });
});
test("real pending guardrail stays fresh but sustained breach suppresses without activePackageId", async () => {
  const s = await setup();
  const first = await s.invoke("knowledge:record-guardrail-breach", {
    scopeId,
    metric: "latency",
    observed: 20,
    bound: 10,
    windowMs: 1000,
    nowMs: 1000,
  });
  expect(first.rollback).toBeNull();
  expect((await read(s.input)).advisoryState).toBe("fresh");
  const second = await s.invoke("knowledge:record-guardrail-breach", {
    scopeId,
    metric: "latency",
    observed: 20,
    bound: 10,
    windowMs: 1000,
    nowMs: 2000,
  });
  expect(second.breach.sustainedMs).toBe(1000);
  expect(await read(s.input)).toMatchObject({
    advisoryState: "unavailable",
    advisoryLadder: [],
    roleId,
    taskTypeId,
  });
});
test("real per-task rollback reversible with exact unavailable identity", async () => {
  const s = await setup();
  await s.invoke("knowledge:set-route-ladder-rollback", {
    scopeId,
    roleId,
    taskTypeId,
    rolledBack: true,
    reason: "safety",
  });
  expect(await read(s.input)).toMatchObject({ advisoryState: "unavailable", roleId, taskTypeId });
  await s.invoke("knowledge:set-route-ladder-rollback", {
    scopeId,
    roleId,
    taskTypeId,
    rolledBack: false,
  });
  expect((await read(s.input)).advisoryState).toBe("fresh");
});
test.each([undefined, null, -1, 101, Number.NaN])(
  "invalid policy %s never widens exposure",
  async (policy) => {
    const s = await setup();
    expect(await read({ ...s.input, policyCohortPercent: policy } as never)).toMatchObject({
      advisoryState: "unavailable",
      cohortPercent: 0,
    });
  },
);
test.each(["S2", "S3", "S4"])(
  "stage %s uses configured policy when no rollout promotion",
  async (stage) => {
    const s = await setup();
    expect((await read({ ...s.input, stage, policyCohortPercent: 10 })).cohortPercent).toBe(10);
  },
);
test.each(["scopeId", "roleId", "taskTypeId"])("rejects mismatched ladder %s", async (key) => {
  const result = await changed("knowledge:read-route-ladder", (row) => {
    if (key === "scopeId") row.ladder.scopeId = "other";
    else row[key] = "other";
    return row;
  });
  expect(result.advisoryState).toBe("unavailable");
});
test.each([
  "id",
  "type",
  "version",
  "scope",
  "confidence",
  "evidenceAtMs",
  "roleId",
  "taskTypeId",
  "scopeId",
  "taxonomyVersion",
  "groupIds",
  "endpointEvidence",
])("unknown/mismatched evidence %s fails closed", async (key) => {
  const result = await changed("knowledge:read", (doc) => {
    if (["id", "type", "version", "scope"].includes(key)) doc[key] = "wrong";
    else doc.provenance[key] = null;
    return doc;
  });
  expect(result.advisoryState).not.toBe("fresh");
});
test.each([0, -1, 1.5, Number.NaN, "1"])(
  "corrupt rung rank %s returns unavailable not throw",
  async (rank) => {
    expect(
      (
        await changed("knowledge:read-route-ladder", (row) => {
          row.ladder.rungs[0].rank = rank;
          return row;
        })
      ).advisoryState,
    ).toBe("unavailable");
  },
);
test.each(["duplicateRank", "duplicateEndpoint", "badStatus", "overBound"])(
  "bounded corruption %s fails closed",
  async (kind) => {
    expect(
      (
        await changed("knowledge:read-route-ladder", (row) => {
          if (kind === "duplicateRank") row.ladder.rungs[1].rank = 1;
          if (kind === "duplicateEndpoint")
            row.ladder.rungs[1].endpointId = row.ladder.rungs[0].endpointId;
          if (kind === "badStatus") row.ladder.rungs[0].status = "unknown";
          if (kind === "overBound")
            row.ladder.rungs = Array.from({ length: 65 }, (_, i) => ({
              endpointId: `ep:${i}`,
              rank: i + 1,
              status: "available",
            }));
          return row;
        })
      ).advisoryState,
    ).toBe("unavailable");
  },
);
test.each(["knowledge:read-route-ladder", "knowledge:read", "knowledge:rollout-state"])(
  "unreadable %s is bounded unavailable",
  async (capability) => {
    const s = await setup();
    expect(
      await read({
        ...s.input,
        invoke: async (c, v) => {
          if (c === capability) throw new Error("x".repeat(1000));
          return s.invoke(c, v);
        },
      }),
    ).toMatchObject({
      advisoryState: "unavailable",
      preferredRoutePackage: null,
      cohortPercent: 0,
    });
  },
);
// Re-write corruption THROUGH the real store and repoint to its new digest: semantic checks,
// not simply a content-hash mismatch. Genuine valid inputs are tested above.
test.each([
  "scopeId",
  "roleId",
  "taskTypeId",
  "taxonomyVersion",
  "confidence",
  "groupIds",
  "endpointEvidence",
  "evidenceAtMs",
])("authentic stored metadata corruption %s refuses", async (key) => {
  const s = await setup();
  const row = await s.invoke("knowledge:read-route-ladder", { scopeId, roleId, taskTypeId });
  const doc = await s.invoke("knowledge:read", { id: row.ladder.packId, scope: scopeId });
  if (["scopeId", "roleId", "taskTypeId", "taxonomyVersion"].includes(key))
    doc.provenance[key] = "other";
  if (key === "confidence") doc.provenance.confidence = 1;
  if (key === "groupIds") doc.provenance.groupIds = ["g1", "g1"];
  if (key === "endpointEvidence") delete doc.provenance.endpointEvidence["endpoint:b"];
  if (key === "evidenceAtMs") doc.provenance.evidenceAtMs = 3000;
  const written = await s.invoke("knowledge:write", { value: doc });
  await s.invoke("knowledge:write-route-ladder", {
    ...row.ladder,
    roleId,
    taskTypeId,
    packId: written.id,
    version: row.ladder.version + 1,
  });
  expect((await read(s.input)).advisoryState).toBe("unavailable");
});
test.each(["rolled_back", "degraded", "wrongScope", "badCohort", "missingKillState"])(
  "corrupt/suppressed rollout %s refuses",
  async (kind) => {
    const result = await changed("knowledge:rollout-state", (row) => {
      if (kind === "rolled_back") row.state = "rolled_back";
      if (kind === "degraded") row.degraded = true;
      if (kind === "wrongScope") row.scopeId = "other";
      if (kind === "badCohort") row.cohortPercent = 101;
      if (kind === "missingKillState") delete row.killSwitchAtMs;
      return row;
    });
    expect(result.advisoryState).toBe("unavailable");
  },
);
test.each([null, "roleOnly", "taskOnly"])(
  "explicit unclassified/partial %s never borrows legacy scope",
  async (kind) => {
    const s = await setup();
    s.calls.length = 0;
    expect(
      (
        await read({
          ...s.input,
          roleId: kind === "roleOnly" ? roleId : null,
          taskTypeId: kind === "taskOnly" ? taskTypeId : null,
        })
      ).advisoryState,
    ).toBe("unavailable");
    expect(s.calls).toEqual([]);
  },
);
async function storedMetadataChange(mutate: (metadata: Record<string, unknown>) => void) {
  const s = await setup();
  const row = await s.invoke("knowledge:read-route-ladder", { scopeId, roleId, taskTypeId });
  const doc = await s.invoke("knowledge:read", { id: row.ladder.packId, scope: scopeId });
  mutate(doc.provenance);
  const written = await s.invoke("knowledge:write", { value: doc });
  await s.invoke("knowledge:write-route-ladder", {
    ...row.ladder,
    roleId,
    taskTypeId,
    packId: written.id,
    version: row.ladder.version + 1,
  });
  return read(s.input);
}
test("retained removed endpoint proof does not disable legitimate remaining rung", async () => {
  const s = await setup();
  await s.materialize(2500, { configuredEndpointIds: ["endpoint:b"] });
  expect(await read(s.input)).toMatchObject({
    advisoryState: "fresh",
    confidence: 0.75,
    preferredRoutePackage: "endpoint:b",
    taxonomyVersion: "taxonomy:105",
    advisoryLadder: [{ endpointId: "endpoint:b", rank: 2, status: "available" }],
  });
});
test("all-empty new floor preserves old admission and applies user removal", async () => {
  const s = await setup();
  await s.materialize(2500, {
    configuredEndpointIds: ["endpoint:b"],
    defaults: { minComparisons: 5, minConfidence: 0.99, stalenessWindowDays: 30 },
  });
  expect(await read(s.input)).toMatchObject({
    advisoryState: "fresh",
    confidence: 0.75,
    preferredRoutePackage: "endpoint:b",
  });
});
test("new regression evidence preserves accepted confidence/time/rank while current removal still applies", async () => {
  const s = await setup();
  const low = group("g3", 0.1, 2000);
  low.members[1].confidence = 0.1;
  await s.materialize(2500, {
    groups: [...s.groups, low],
    configuredEndpointIds: ["endpoint:b"],
    taxonomyVersion: "caller:must-not-relabel",
  });
  expect(await read(s.input)).toMatchObject({
    advisoryState: "fresh",
    confidence: 0.75,
    preferredRoutePackage: "endpoint:b",
    taxonomyVersion: "taxonomy:105",
  });
  expect((await read({ ...s.input, nowMs: 11500 })).advisoryState).toBe("stale");
});
test("refused larger admission leaves bounded prior real snapshot routable", async () => {
  const s = await setup();
  const before = await s.invoke("knowledge:read-route-ladder", { scopeId, roleId, taskTypeId });
  const result = await s.materialize(2500, {
    groups: [
      ...s.groups,
      ...Array.from({ length: 90 }, (_, i) => group(`huge:${i}:${"x".repeat(180)}`, 0.9, 2000)),
    ],
  });
  expect(result.ladders[0].status).toBe("refused");
  expect(
    (await s.invoke("knowledge:read-route-ladder", { scopeId, roleId, taskTypeId })).ladder.packId,
  ).toBe(before.ladder.packId);
  expect((await read(s.input)).advisoryState).toBe("fresh");
});
test.each([
  "missingPolicy",
  "badK",
  "shortOwnProof",
  "belowOwnMean",
  "missingEffective",
  "extraEffective",
  "missingOwnGroups",
  "duplicateOwnGroups",
  "unknownOwnGroup",
  "badOwnTime",
  "badOwnTaxonomy",
  "missingRankEvidence",
])("real stored accepted evidence %s fails closed", async (kind) => {
  const result = await storedMetadataChange((m) => {
    const e = m.endpointEvidence["endpoint:a"];
    if (kind === "missingPolicy") delete m.admissionPolicy;
    if (kind === "badK") m.admissionPolicy.minComparisons = 0;
    if (kind === "shortOwnProof") {
      e.comparisonCount = 1;
      e.groupIds = ["g1"];
    }
    if (kind === "belowOwnMean") {
      e.meanConfidence = 0.65;
      m.confidence = 0.65;
    }
    if (kind === "missingEffective") delete m.effectiveAdmittedEndpointIds;
    if (kind === "extraEffective") m.effectiveAdmittedEndpointIds.push("not-a-rung");
    if (kind === "missingOwnGroups") delete e.groupIds;
    if (kind === "duplicateOwnGroups") e.groupIds = ["g1", "g1"];
    if (kind === "unknownOwnGroup") e.groupIds = ["g1", "unknown"];
    if (kind === "badOwnTime") e.evidenceAtMs = 3000;
    if (kind === "badOwnTaxonomy") e.taxonomyVersion = "other";
    if (kind === "missingRankEvidence") delete m.rankEvidenceGroupIds;
  });
  expect(result.advisoryState).toBe("unavailable");
});
test("all historical endpoints removed under empty new floor yields no advisory but retains proof", async () => {
  const s = await setup();
  await s.materialize(2500, {
    configuredEndpointIds: ["endpoint:c"],
    defaults: { minComparisons: 5, minConfidence: 0.99, stalenessWindowDays: 30 },
  });
  const row = await s.invoke("knowledge:read-route-ladder", { scopeId, roleId, taskTypeId });
  expect(row.ladder.rungs).toHaveLength(2);
  expect(row.ladder.rungs.every((r: { status: string }) => r.status === "unavailable")).toBe(true);
  expect((await read(s.input)).advisoryState).toBe("unavailable");
  const doc = await s.invoke("knowledge:read", { id: row.ladder.packId, scope: scopeId });
  expect(doc.provenance.effectiveAdmittedEndpointIds).toEqual(["endpoint:a", "endpoint:b"]);
});
test("unknown measured taxonomy never receives caller taxonomy relabel", async () => {
  const s = await setup();
  const unknown = s.groups.map((g: Record<string, unknown>) => ({
    ...g,
    comparability: { ...g.comparability, taxonomyVersion: null },
  }));
  // New evidence scope in a separate real store, not a stale subset of the existing one.
  const row = await s.invoke("knowledge:read-route-ladder", { scopeId, roleId, taskTypeId });
  const doc = await s.invoke("knowledge:read", { id: row.ladder.packId, scope: scopeId });
  expect(unknown.every((g) => g.comparability.taxonomyVersion === null)).toBe(true);
  const changedScopeGroups = unknown.map((g) => ({
    ...g,
    groupId: `${g.groupId}:unknown`,
    comparability: { ...g.comparability, taskTypeId: "task:unknown" },
  }));
  await s.materialize(2500, { groups: changedScopeGroups, taxonomyVersion: "caller:context-only" });
  const result = await read({ ...s.input, taskTypeId: "task:unknown" });
  expect(result).toMatchObject({ advisoryState: "fresh", taxonomyVersion: null });
  expect(doc.provenance.taxonomyVersion).toBe("taxonomy:105");
});
test.each(["countMismatch", "badPolicyMean", "badRankDigest", "rankOutsideWatermark"])(
  "accepted metadata relationship %s refuses",
  async (kind) => {
    expect(
      (
        await storedMetadataChange((m) => {
          if (kind === "countMismatch") m.endpointEvidence["endpoint:a"].comparisonCount = 3;
          if (kind === "badPolicyMean") m.admissionPolicy.minConfidence = 1.1;
          if (kind === "badRankDigest") m.rankEvidenceDigest = "not-a-digest";
          if (kind === "rankOutsideWatermark") m.rankEvidenceGroupIds.push("never-observed");
        })
      ).advisoryState,
    ).toBe("unavailable");
  },
);
