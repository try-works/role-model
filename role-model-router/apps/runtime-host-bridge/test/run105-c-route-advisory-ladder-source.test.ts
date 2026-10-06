import { createHash } from "node:crypto";
import { describe, expect, test } from "vitest";

import { readTrackBRouteAdvisoryFromRollout } from "../src/route-advisory-source.js";

/**
 * Run 105 package C (R1 read, R4, R5): the advisory source reads ONE (role, task) ladder from
 * the store's `knowledge:read-route-ladder` capability, validates evidence and rollout safety,
 * then filters ONLY by stored rung status (request eligibility still belongs to the router),
 * and returns the ordered rungs plus the rank-1 available rung as the preferred endpoint.
 * `taxonomyVersion` is provenance (addendum A1); the router keeps the matching gate.
 */

interface InvokeCall {
  readonly capability: string;
  readonly value: Record<string, unknown>;
}

const context = (answer: unknown) => {
  const calls: InvokeCall[] = [];
  return {
    calls,
    invoke: async (capability: string, value: Readonly<Record<string, unknown>>) => {
      calls.push({ capability, value: { ...value } });
      if (capability === "knowledge:read-route-ladder") return answer;
      if (capability === "knowledge:read") return evidenceDocument;
      if (capability === "knowledge:rollout-state") return rolloutState;
      throw new Error(`unexpected capability: ${capability}`);
    },
    scopeId: "scope-c",
    roleId: "role.coder",
    taskTypeId: "coder.review",
    nowMs: 1_000,
    evidenceMaxAgeMs: 86_400_000,
    stage: "S3",
    policyCohortPercent: 25,
  };
};

// KnowledgeStore hashes canonical DOCUMENT bytes, not a learning record or invented id wrapper.
// Confidence and freshness belong to persisted evidence; neither rank nor read/cache time supplies them.
const canonical = (value: unknown): string =>
  Array.isArray(value)
    ? `[${value.map(canonical).join(",")}]`
    : value && typeof value === "object"
      ? `{${Object.keys(value)
          .sort()
          .map(
            (key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`,
          )
          .join(",")}}`
      : JSON.stringify(value);
const digest = (value: unknown) => createHash("sha256").update(canonical(value)).digest("hex");
const groupIds = ["group-c-1", "group-c-2"];
const evidenceDigest = digest(groupIds);
const evidenceDocument = {
  type: "route_ladder_evidence",
  version: 1,
  scope: "scope-c",
  artifactRef: `sha256:${evidenceDigest}`,
  provenance: {
    scopeId: "scope-c",
    roleId: "role.coder",
    taskTypeId: "coder.review",
    taxonomyVersion: "taxonomy-v1-alpha.1",
    groupIds,
    evidenceDigest,
    rankEvidenceGroupIds: groupIds,
    rankEvidenceDigest: evidenceDigest,
    admissionPolicy: { minComparisons: 2, minConfidence: 0.7 },
    effectiveAdmittedEndpointIds: ["endpoint-a", "endpoint-b", "endpoint-c"],
    taxonomyVersions: ["taxonomy-v1-alpha.1"],
    materializationDigest: digest({
      groupIds,
      configured: ["endpoint-b", "endpoint-c", "endpoint-d"],
    }),
    confidence: 0.75,
    evidenceAtMs: 500,
    // Accepted proof covers ALL historical rungs, including removed endpoint-a. Availability
    // changes routing, not admission history. Only available-rung means/times set aggregate freshness.
    endpointEvidence: {
      "endpoint-a": {
        comparisonCount: 2,
        meanConfidence: 0.9,
        groupIds,
        evidenceAtMs: 400,
        taxonomyVersion: "taxonomy-v1-alpha.1",
      },
      "endpoint-b": {
        comparisonCount: 2,
        meanConfidence: 0.85,
        groupIds,
        evidenceAtMs: 600,
        taxonomyVersion: "taxonomy-v1-alpha.1",
      },
      "endpoint-c": {
        comparisonCount: 2,
        meanConfidence: 0.75,
        groupIds,
        evidenceAtMs: 500,
        taxonomyVersion: "taxonomy-v1-alpha.1",
      },
    },
    rollbackReason: null,
    rollbackAtMs: null,
  },
};
const packId = digest(evidenceDocument);
// Genuine unpromoted store rollout shape: derived activation needs no active pack, but must
// still check kill-switch/guardrail state. Zero rollout exposure falls back to explicit S3 policy.
const rolloutState = {
  schemaVersion: "role-model.route-package-rollout-state.v1",
  scopeId: "scope-c",
  state: "disabled",
  activePackageId: null,
  priorPackageId: null,
  cohortStep: 0,
  cohortPercent: 0,
  ladder: [10, 25, 50, 100],
  validationReceiptId: null,
  rolledBackWithValidationReceiptId: null,
  killSwitchAtMs: null,
  updatedAtMs: 0,
  receipts: [],
  breaches: [],
};

const ladderRead = (overrides: Record<string, unknown> = {}) => ({
  schemaVersion: "role-model.route-ladder-read.v1",
  contract: "RouteLadderPackV1",
  roleId: "role.coder",
  taskTypeId: "coder.review",
  ladder: {
    contract: "RouteLadderPackV1",
    packId,
    roleId: "role.coder",
    taskTypeId: "coder.review",
    scopeId: "scope-c",
    version: 3,
    taxonomyVersion: "taxonomy-v1-alpha.1",
    rungs: [
      { endpointId: "endpoint-b", rank: 2, status: "available" },
      { endpointId: "endpoint-a", rank: 1, status: "unavailable" },
      { endpointId: "endpoint-c", rank: 3, status: "available" },
    ],
    completeness: { admitted: 2, configured: 3 },
    nextEligibleAtMs: null,
    rolledBack: { on: false, reason: null, atMs: null },
  },
  ...overrides,
});

describe("run105 C route advisory ladder source", () => {
  test("reads one role-task ladder and returns rank-sorted status-filtered rungs", async () => {
    const ctx = context(ladderRead());
    const result = await readTrackBRouteAdvisoryFromRollout(ctx as never);
    expect(result).toMatchObject({
      advisoryState: "fresh",
      roleId: "role.coder",
      taskTypeId: "coder.review",
      taxonomyVersion: "taxonomy-v1-alpha.1",
      advisoryLadder: [
        { endpointId: "endpoint-b", rank: 2, status: "available" },
        { endpointId: "endpoint-c", rank: 3, status: "available" },
      ],
      preferredRoutePackage: "endpoint-b",
      confidence: 0.75,
      cohortPercent: 25,
      candidateId: packId,
      advisoryId: packId,
      reason: null,
      revalidationDue: false,
    });
    // One indexed ladder read is retained; the obsolete exactly-one-total-read pin would skip
    // evidence authentication and scope safety. All three bounded reads use the actual scope.
    expect(ctx.calls).toEqual([
      {
        capability: "knowledge:read-route-ladder",
        value: { scopeId: "scope-c", roleId: "role.coder", taskTypeId: "coder.review" },
      },
      { capability: "knowledge:read", value: { id: packId, scope: "scope-c" } },
      { capability: "knowledge:rollout-state", value: { scopeId: "scope-c", limit: 1 } },
    ]);
  });

  test("an all-unavailable ladder is unavailable and never invents a preferred endpoint", async () => {
    const ctx = context(
      ladderRead({
        ladder: {
          ...ladderRead().ladder,
          rungs: [{ endpointId: "endpoint-a", rank: 1, status: "unavailable" }],
        },
      }),
    );
    const result = await readTrackBRouteAdvisoryFromRollout(ctx as never);
    expect(result).toMatchObject({
      advisoryState: "unavailable",
      preferredRoutePackage: null,
      advisoryLadder: [],
    });
    expect(result.reason).toBe("no admitted rung");
  });

  test("an empty or absent ladder is unavailable with the same bounded reason", async () => {
    for (const [answer, reason] of [
      [ladderRead({ ladder: { ...ladderRead().ladder, rungs: [] } }), "no admitted rung"],
      [ladderRead({ ladder: null }), "no admitted rung"],
      [null, "route ladder unavailable or scope mismatch"],
    ] as const) {
      const result = await readTrackBRouteAdvisoryFromRollout(context(answer) as never);
      // The shared guarantee for all three "nothing to offer" inputs is the SAME bounded outcome:
      // unavailable, no preferred package, an empty ladder. The reason is bounded too, but a
      // store that answers nothing at all is a different (also bounded) diagnosis than a ladder
      // that exists with no admitted rung.
      expect(result).toMatchObject({
        advisoryState: "unavailable",
        preferredRoutePackage: null,
        advisoryLadder: [],
      });
      expect(result.reason).toBe(reason);
    }
  });

  test("a rolled-back ladder is refused before any rung is offered", async () => {
    const ctx = context(
      ladderRead({
        ladder: {
          ...ladderRead().ladder,
          rolledBack: { on: true, reason: "operator_rollback", atMs: 500 },
        },
      }),
    );
    const result = await readTrackBRouteAdvisoryFromRollout(ctx as never);
    expect(result).toMatchObject({
      advisoryState: "unavailable",
      preferredRoutePackage: null,
      advisoryLadder: [],
    });
    expect(result.reason).toBe("rolled back");
    expect(ctx.calls.map(({ capability }) => capability)).toEqual(["knowledge:read-route-ladder"]);
  });

  test("a store failure degrades to unavailable, never to influence", async () => {
    const calls: string[] = [];
    const result = await readTrackBRouteAdvisoryFromRollout({
      ...context(ladderRead()),
      invoke: async (capability: string) => {
        calls.push(capability);
        throw new Error("store offline");
      },
    });
    expect(calls).toEqual(["knowledge:read-route-ladder"]);
    expect(result).toMatchObject({ advisoryState: "unavailable", preferredRoutePackage: null });
    expect(result.reason).toBe("route ladder evidence or rollout unavailable");
  });

  test("a missing role or task id refuses the read instead of querying the store", async () => {
    for (const missing of [{ roleId: null }, { taskTypeId: null }, { scopeId: "" }]) {
      const ctx = context(ladderRead());
      const result = await readTrackBRouteAdvisoryFromRollout({ ...ctx, ...missing });
      expect(result).toMatchObject({ advisoryState: "unavailable", advisoryLadder: [] });
      expect(result.reason).toBe(
        "scopeId" in missing ? "scope id required" : "role and task scope required",
      );
      expect(ctx.calls).toEqual([]);
    }
  });
});
