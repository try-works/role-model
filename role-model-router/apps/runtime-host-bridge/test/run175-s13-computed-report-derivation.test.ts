import { describe, expect, test } from "vitest";

import { deriveLearnerCandidatesFromDurableEvidence } from "../src/track-b-learner-derivation.js";

/**
 * Run 100 item S13 follow-up (2026-09-25): the derivation pass has to *produce* the persisted signal
 * report for a finalized comparison whose live pipeline never ran.
 *
 * Measured live on run174/`fe49bac7` (`E:\tmp\audit3\gap_quantify.md`): of 500 learnable finalized
 * groups, 145 have no `trajectory_signal_reports` row at all, 13 are read back as another
 * comparison's report and 8 die in the extension host's 16 KiB inline frame - so the sweep consumes
 * groups as skips and the backlog falls without candidates. These tests pin the fix: compute the
 * report from durable capture evidence through the trajectory-signals capability (which persists),
 * bounded per tick, and never invent a trajectory.
 */

const WINNER = "deepseek.personal.primary.global.deepseek-v4-pro-high";
const SOURCE = "deepseek.personal.primary.global.deepseek-flash-max";
const GROUP_ID = `comparison:supervised-replay:${"a".repeat(64)}`;
const OTHER_GROUP_ID = `comparison:supervised-replay:${"f".repeat(64)}`;
const REPLAY_ID = "b".repeat(64);
const DECISION_ID = "decision-req-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const GRAPH_REF = `artifact:${"c".repeat(64)}`;
const SOURCE_EVIDENCE = `artifact:${"1".repeat(64)}`;
const COUNTERFACTUAL_EVIDENCE = `artifact:${"2".repeat(64)}`;
const REPLAY_REF = "4".repeat(64);

function proof(reference: string) {
  return {
    authority: "evaluation-reference-store",
    authorizationEpoch: 1,
    channel: "stage",
    purpose: "evaluation",
    reference,
    referenceDigest: `sha256:${"9".repeat(64)}`,
    resolved: true,
    schemaVersion: "role-model.evaluation-reference-attestation.v1",
    scope: "standalone-runtime-stage",
  };
}

const EVENTS = [
  {
    id: "req-1:route",
    type: "route_selected",
    timestampMs: 1_700_000_000_000,
    evidenceRef: `artifact:${"1".repeat(64)}`,
    sequence: 0,
  },
  {
    id: "req-1:response",
    type: "model_response",
    timestampMs: 1_700_000_000_100,
    evidenceRef: `artifact:${"2".repeat(64)}`,
    sequence: 1,
  },
];

const comparison = {
  groupId: GROUP_ID,
  comparisonId: GROUP_ID,
  status: "finalized",
  outcome: "candidate",
  holdout: {
    holdoutId: `sha256:${"3".repeat(64)}`,
    membershipDigest: `sha256:${"4".repeat(64)}`,
    caseIds: [`replay:${REPLAY_ID}:0`, `replay:${REPLAY_ID}:1`],
  },
  comparability: {
    policyId: "run96-routing-shadow",
    scorerSetVersion: "run96-routing-shadow-v3",
    sourceCandidateRef: SOURCE,
    counterfactualCandidateRef: WINNER,
    sourceEvidenceRef: SOURCE_EVIDENCE,
    counterfactualEvidenceRef: COUNTERFACTUAL_EVIDENCE,
    forkRef: `artifact:${"5".repeat(64)}`,
  },
  referenceProofs: {
    sourceEvidenceRef: proof(SOURCE_EVIDENCE),
    counterfactualEvidenceRef: proof(COUNTERFACTUAL_EVIDENCE),
  },
  members: [
    {
      candidateRef: SOURCE,
      disposition: "negative",
      role: "source",
      score: 0,
      confidence: 1,
      trialId: `trial:${"6".repeat(64)}`,
      scoreId: `trial-score:${"7".repeat(64)}`,
    },
    {
      candidateRef: WINNER,
      disposition: "positive",
      role: "counterfactual",
      score: 1,
      confidence: 1,
      trialId: `trial:${"8".repeat(64)}`,
      scoreId: `trial-score:${"9".repeat(64)}`,
    },
  ],
};

const job = {
  jobId: REPLAY_ID,
  replayId: REPLAY_ID,
  state: "complete",
  sourceDecisionId: DECISION_ID,
  traceRootId: GRAPH_REF,
  sharedPrefixRef: REPLAY_REF,
  baselineEndpointId: SOURCE,
  branches: [{ id: WINNER }],
  candidatePackages: [
    {
      endpointId: SOURCE,
      modelId: "deepseek/deepseek-flash",
      reasoningEffort: "max",
      samplingProfileId: "deterministic-v1",
    },
    {
      endpointId: WINNER,
      modelId: "deepseek/deepseek-v4-pro",
      reasoningEffort: "high",
      samplingProfileId: "deterministic-v1",
    },
  ],
};

function reportFor(groupId: string) {
  return {
    schemaVersion: "role-model.trajectory-signal-report.v1",
    routeDecisionId: DECISION_ID,
    graphRef: GRAPH_REF,
    signals: [{ signalInstanceId: `signal:${"a".repeat(16)}`, signalType: "semantic" }],
    evaluationProvenance: { groupId, status: "finalized", outcome: "candidate" },
    learningEvidence: {
      schemaVersion: "role-model.finalized-evaluation-signal.v1",
      groupId,
      outcome: "candidate",
      traceRef: GRAPH_REF,
      replayRef: REPLAY_REF,
      sourceGeneration: `sha256:${"b".repeat(64)}`,
      trialScoreRefs: [],
    },
  };
}

const report = reportFor(GROUP_ID);
const profile = {
  digest: `sha256:${"c".repeat(64)}`,
  effects: {
    routePackage: { values: [WINNER], evidenceRefs: [COUNTERFACTUAL_EVIDENCE] },
  },
};

interface HarnessOptions {
  readonly groups?: readonly Record<string, unknown>[];
  readonly read?: unknown;
  readonly readError?: string;
  readonly analysis?: unknown;
  readonly capabilityError?: string;
  readonly evidence?: unknown;
  readonly derivedReportLimit?: number;
  readonly attemptedGroupIds?: Set<string>;
  readonly logs?: string[];
  readonly capabilities?: string[];
  readonly evidenceCalls?: Array<Record<string, unknown>>;
}

function runDerivation(options: HarnessOptions = {}) {
  const capabilities = options.capabilities ?? [];
  const logs = options.logs ?? [];
  return deriveLearnerCandidatesFromDurableEvidence({
    groups: options.groups ?? [comparison],
    attemptedGroupIds: options.attemptedGroupIds ?? new Set<string>(),
    limit: 2,
    ...(options.derivedReportLimit === undefined
      ? {}
      : { derivedReportLimit: options.derivedReportLimit }),
    channel: "stage",
    scope: "standalone-runtime-stage",
    evaluationAuthoritySecret: "secret",
    log: (message) => logs.push(message),
    ...(options.evidence === undefined && options.evidenceCalls === undefined
      ? {}
      : {
          readDurableTrajectoryEvidence: async (input: {
            readonly job: Record<string, unknown>;
            readonly sourceDecisionId: string;
            readonly replayId: string;
          }) => {
            options.evidenceCalls?.push({ ...input });
            return options.evidence;
          },
        }),
    invoke: async (_extensionId, capability, value) => {
      capabilities.push(capability);
      if (options.capabilityError && capability === "signals:read") {
        throw new Error(options.capabilityError);
      }
      if (capability === "replay:job") return job;
      if (capability === "signals:read") {
        if (options.readError) throw new Error(options.readError);
        return options.read ?? [];
      }
      if (capability === "signals:analyze-finalized-evaluation") {
        const groupId = String(
          (value.finalizedEvaluation as Record<string, unknown> | undefined)?.groupId ?? "",
        );
        return options.analysis ?? reportFor(groupId);
      }
      if (capability === "profile:estimate-finalized-evaluation") return profile;
      if (capability === "knowledge:eval-consumer") return { id: `shadow-${"d".repeat(64)}` };
      return null;
    },
  });
}

describe("run175 S13: the derivation pass computes the report it is missing", () => {
  test("computes and persists the missing report for a learnable finalized comparison", async () => {
    const capabilities: string[] = [];
    const evidenceCalls: Array<Record<string, unknown>> = [];
    const analyzed: Array<Record<string, unknown>> = [];
    const summary = await deriveLearnerCandidatesFromDurableEvidence({
      groups: [comparison],
      attemptedGroupIds: new Set<string>(),
      limit: 2,
      derivedReportLimit: 2,
      channel: "stage",
      scope: "standalone-runtime-stage",
      evaluationAuthoritySecret: "secret",
      readDurableTrajectoryEvidence: async ({ job: durableJob, sourceDecisionId, replayId }) => {
        expect(durableJob).toBe(job);
        expect(sourceDecisionId).toBe(DECISION_ID);
        expect(replayId).toBe(REPLAY_ID);
        return { kind: "evidence", events: EVENTS, graphRef: GRAPH_REF, replayRef: REPLAY_REF };
      },
      invoke: async (_extensionId, capability, value) => {
        capabilities.push(capability);
        if (capability === "replay:job") return job;
        if (capability === "signals:read") return [];
        if (capability === "signals:analyze-finalized-evaluation") {
          analyzed.push(value);
          return report;
        }
        if (capability === "profile:estimate-finalized-evaluation") return profile;
        if (capability === "knowledge:eval-consumer") return { id: "shadow-computed" };
        return null;
      },
    });

    expect(summary).toEqual({ examined: 1, attempted: 1, derived: 1, skipped: 0, refused: 0 });
    expect(capabilities).toEqual([
      "replay:job",
      "signals:read",
      "signals:analyze-finalized-evaluation",
      "profile:estimate-finalized-evaluation",
      "knowledge:eval-consumer",
    ]);
    const value = analyzed[0];
    expect(value.routeDecisionId).toBe(DECISION_ID);
    expect(value.graphRef).toBe(GRAPH_REF);
    expect(value.replayRef).toBe(REPLAY_REF);
    expect(value.routePackage).toBe(WINNER);
    expect(Array.isArray(value.events) && value.events.length).toBeGreaterThanOrEqual(2);
    expect((value.finalizedEvaluation as Record<string, unknown>).groupId).toBe(GROUP_ID);
    expect((value.finalizedEvaluation as Record<string, unknown>).status).toBe("finalized");
    expect(value.resolvedReferences).toEqual({
      graph: [GRAPH_REF],
      replay: [REPLAY_REF],
      evaluation: [GROUP_ID],
    });
  });

  test("does not recompute when a report for this group is already persisted", async () => {
    const capabilities: string[] = [];
    let evidenceReads = 0;
    const summary = await deriveLearnerCandidatesFromDurableEvidence({
      groups: [comparison],
      attemptedGroupIds: new Set<string>(),
      limit: 2,
      derivedReportLimit: 2,
      channel: "stage",
      scope: "standalone-runtime-stage",
      evaluationAuthoritySecret: "secret",
      readDurableTrajectoryEvidence: async () => {
        evidenceReads += 1;
        return { kind: "evidence", events: EVENTS, graphRef: GRAPH_REF, replayRef: REPLAY_REF };
      },
      invoke: async (_extensionId, capability) => {
        capabilities.push(capability);
        if (capability === "replay:job") return job;
        if (capability === "signals:read") return [report];
        if (capability === "profile:estimate-finalized-evaluation") return profile;
        if (capability === "knowledge:eval-consumer") return { id: "shadow-existing" };
        return null;
      },
    });

    expect(summary).toEqual({ examined: 1, attempted: 1, derived: 1, skipped: 0, refused: 0 });
    expect(capabilities).not.toContain("signals:analyze-finalized-evaluation");
    expect(evidenceReads).toBe(0);
  });

  test("counts a bounded degradation receipt as a named skip and writes nothing", async () => {
    const capabilities: string[] = [];
    const logs: string[] = [];
    const summary = await runDerivation({
      evidence: { kind: "evidence", events: EVENTS, graphRef: GRAPH_REF, replayRef: REPLAY_REF },
      analysis: {
        schemaVersion: "role-model.degradation-receipt.v1",
        degraded: true,
        capability: "signals:analyze-finalized-evaluation",
        reasonCode: "R16_TRAJECTORY_EVIDENCE_UNAVAILABLE",
        reason: "finalized route-learning requires at least two trajectory events",
        mode: "omit_signals",
      },
      capabilities,
      logs,
    });

    expect(summary).toEqual({ examined: 1, attempted: 0, derived: 0, skipped: 1, refused: 0 });
    expect(capabilities).not.toContain("profile:estimate-finalized-evaluation");
    expect(capabilities).not.toContain("knowledge:eval-consumer");
    expect(logs.join("\n")).toContain("R16_TRAJECTORY_EVIDENCE_UNAVAILABLE");
  });

  test("respects the per-tick derived-report bound", async () => {
    const groups = [0, 1, 2, 3, 4].map((index) => ({
      ...comparison,
      groupId: `comparison:supervised-replay:${String(index).repeat(64).slice(0, 64)}`,
      comparisonId: `comparison:supervised-replay:${String(index).repeat(64).slice(0, 64)}`,
    }));
    const attempted = new Set<string>();
    const capabilities: string[] = [];
    const summary = await runDerivation({
      groups,
      attemptedGroupIds: attempted,
      derivedReportLimit: 1,
      evidence: { kind: "evidence", events: EVENTS, graphRef: GRAPH_REF, replayRef: REPLAY_REF },
      capabilities,
    });

    expect(summary.derived).toBe(1);
    expect(
      capabilities.filter((capability) => capability === "signals:analyze-finalized-evaluation"),
    ).toHaveLength(1);
    expect(
      capabilities.filter((capability) => capability === "knowledge:eval-consumer"),
    ).toHaveLength(1);
    /**
     * The groups the bound deferred are not burned: the next tick can reach them. Run 100 addendum 39 §4 makes the
     * walk newest-first, so the one group the bound spent is the page's last element - and every other group stays
     * unattempted.
     */
    const spent = groups.filter((group) => attempted.has(String(group.groupId)));
    expect(spent.map((group) => String(group.groupId))).toEqual([String(groups[4].groupId)]);
    for (const group of groups.slice(0, 4)) {
      expect(attempted.has(String(group.groupId))).toBe(false);
    }
  });

  test("names the missing capture as a skip instead of inventing trajectory events", async () => {
    const capabilities: string[] = [];
    const logs: string[] = [];
    const summary = await runDerivation({
      evidence: { kind: "unavailable", reason: "capture req-aaaa is outside the retention window" },
      capabilities,
      logs,
    });

    expect(summary).toEqual({ examined: 1, attempted: 0, derived: 0, skipped: 1, refused: 0 });
    expect(capabilities).not.toContain("signals:analyze-finalized-evaluation");
    expect(logs.join("\n")).toContain("outside the retention window");
  });

  test("selects the report that covers this group when the decision carries several", async () => {
    const capabilities: string[] = [];
    const summary = await runDerivation({
      read: [reportFor(OTHER_GROUP_ID), report],
      capabilities,
    });

    expect(summary).toEqual({ examined: 1, attempted: 1, derived: 1, skipped: 0, refused: 0 });
    expect(capabilities).not.toContain("signals:analyze-finalized-evaluation");
  });
});
