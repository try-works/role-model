import { describe, expect, test } from "vitest";

import { sweepFinalizationSignalsForGroups } from "../src/cli.js";
import { deriveLearnerCandidatesFromDurableEvidence } from "../src/track-b-learner-derivation.js";

/**
 * Run 100 addendum 39 (2026-09-26): the finalized-evaluation signal report has to be produced while the
 * evidence is fresh.
 *
 * Measured live on run175c/`b7f04039` (`:3457`, 00:15-01:05): the learner's derivation pass computes the
 * report it is missing, but it walks the `evaluation:list-groups` page (`group_id ASC`) oldest-first and
 * meets an aged prefix - 9 `signals:analyze-finalized-evaluation` invocations against 79
 * `capture … is outside the retention window` skips. The proposal's chain puts the model-free signal
 * report *before* replay/evaluation, and the retention ladder keeps raw captures for hours/days, so the
 * producer belongs at finalization time, bounded per tick, newest-first.
 *
 * These tests pin the post-finalization sweep: a finalized group with a retained capture but no report
 * gets exactly one analyze invocation with the derivation's own envelope; a group whose report already
 * exists is never re-analyzed; a capture outside retention is a named skip that does not consume the
 * compute bound; the bound and the wall-clock budget defer the rest; and the walk starts at the newest
 * end of the page it is given.
 */

const WINNER = "deepseek.personal.primary.global.deepseek-v4-pro-high";
const SOURCE = "deepseek.personal.primary.global.deepseek-flash-max";
const NEWER_GROUP_ID = `comparison:supervised-replay:${"b".repeat(64)}`;
const OLDER_GROUP_ID = `comparison:supervised-replay:${"a".repeat(64)}`;
const REPLAY_ID = "b".repeat(64);
const AGED_REPLAY_ID = "e".repeat(64);
const DECISION_ID = "decision-req-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const AGED_DECISION_ID = "decision-req-ffffffff-1111-2222-3333-444444444444";
const GRAPH_REF = `artifact:${"c".repeat(64)}`;
const REPLAY_REF = "4".repeat(64);
const SOURCE_EVIDENCE = `artifact:${"1".repeat(64)}`;
const COUNTERFACTUAL_EVIDENCE = `artifact:${"2".repeat(64)}`;

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

function comparisonFor(groupId: string, replayId = REPLAY_ID) {
  return {
    groupId,
    comparisonId: groupId,
    status: "finalized",
    outcome: "candidate",
    holdout: {
      holdoutId: `sha256:${"3".repeat(64)}`,
      membershipDigest: `sha256:${"4".repeat(64)}`,
      caseIds: [`replay:${replayId}:0`, `replay:${replayId}:1`],
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
}

function jobFor(replayId: string, sourceDecisionId: string) {
  return {
    jobId: replayId,
    replayId,
    state: "complete",
    sourceDecisionId,
    traceRootId: GRAPH_REF,
    sharedPrefixRef: REPLAY_REF,
    baselineEndpointId: SOURCE,
    branches: [{ id: WINNER }],
    candidatePackages: [
      {
        endpointId: WINNER,
        modelId: "deepseek/deepseek-v4-pro",
        reasoningEffort: "high",
        samplingProfileId: "deterministic-v1",
      },
    ],
  };
}

const job = jobFor(REPLAY_ID, DECISION_ID);
const agedJob = jobFor(AGED_REPLAY_ID, AGED_DECISION_ID);

const profile = {
  digest: `sha256:${"c".repeat(64)}`,
  effects: {
    routePackage: { values: [WINNER], evidenceRefs: [`artifact:${"2".repeat(64)}`] },
  },
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

interface SweepHarnessOptions {
  readonly groups?: readonly Record<string, unknown>[];
  readonly read?: unknown;
  readonly analysis?: unknown;
  readonly evidence?:
    | unknown
    | ((input: {
        readonly job: Record<string, unknown>;
        readonly sourceDecisionId: string;
        readonly replayId: string;
      }) => unknown);
  readonly jobs?: Record<string, Record<string, unknown>>;
  readonly capabilityError?: string;
  readonly computeLimit?: number;
  readonly examinedLimit?: number;
  readonly wallClockBudgetMs?: number;
  readonly now?: () => number;
  readonly logs?: string[];
  readonly capabilities?: string[];
  readonly analyzedValues?: Array<Record<string, unknown>>;
  readonly evidenceCalls?: Array<Record<string, unknown>>;
}

function runSweep(options: SweepHarnessOptions = {}) {
  const capabilities = options.capabilities ?? [];
  const logs = options.logs ?? [];
  const analyzedValues = options.analyzedValues ?? [];
  const jobs = options.jobs ?? { [REPLAY_ID]: job, [AGED_REPLAY_ID]: agedJob };
  return sweepFinalizationSignalsForGroups({
    groups: options.groups ?? [comparisonFor(NEWER_GROUP_ID)],
    computeLimit: options.computeLimit ?? 8,
    ...(options.examinedLimit === undefined ? {} : { examinedLimit: options.examinedLimit }),
    wallClockBudgetMs: options.wallClockBudgetMs ?? 30_000,
    ...(options.now === undefined ? {} : { now: options.now }),
    log: (message) => logs.push(message),
    readDurableTrajectoryEvidence: async (input) => {
      options.evidenceCalls?.push({ ...input });
      if (typeof options.evidence === "function") {
        return options.evidence(input);
      }
      return (
        options.evidence ?? {
          kind: "evidence",
          events: EVENTS,
          graphRef: GRAPH_REF,
          replayRef: REPLAY_REF,
        }
      );
    },
    invoke: async (_extensionId, capability, value) => {
      capabilities.push(capability);
      if (options.capabilityError && capability === "signals:read") {
        throw new Error(options.capabilityError);
      }
      if (capability === "replay:job") {
        return jobs[String(value.jobId)] ?? null;
      }
      if (capability === "signals:read") return options.read ?? [];
      if (capability === "signals:analyze-finalized-evaluation") {
        analyzedValues.push(value);
        const groupId = String(
          (value.finalizedEvaluation as Record<string, unknown> | undefined)?.groupId ?? "",
        );
        return options.analysis ?? reportFor(groupId);
      }
      return null;
    },
  });
}

describe("run176: the finalized-evaluation signal report is produced while the evidence is fresh", () => {
  test("the learner's own derivation pass walks the page it is given newest-first too", async () => {
    const analyzed: string[] = [];
    const attempted = new Set<string>();
    const summary = await deriveLearnerCandidatesFromDurableEvidence({
      groups: [comparisonFor(OLDER_GROUP_ID), comparisonFor(NEWER_GROUP_ID)],
      attemptedGroupIds: attempted,
      limit: 2,
      derivedReportLimit: 2,
      channel: "stage",
      scope: "standalone-runtime-stage",
      evaluationAuthoritySecret: "secret",
      readDurableTrajectoryEvidence: async () => ({
        kind: "evidence",
        events: EVENTS,
        graphRef: GRAPH_REF,
        replayRef: REPLAY_REF,
      }),
      invoke: async (_extensionId, capability, value) => {
        if (capability === "replay:job") return job;
        if (capability === "signals:read") return [];
        if (capability === "signals:analyze-finalized-evaluation") {
          const groupId = String(
            (value.finalizedEvaluation as Record<string, unknown> | undefined)?.groupId ?? "",
          );
          analyzed.push(groupId);
          return reportFor(groupId);
        }
        if (capability === "profile:estimate-finalized-evaluation") return profile;
        if (capability === "knowledge:eval-consumer") return { id: "shadow-newest-first" };
        return null;
      },
    });

    expect(summary).toEqual({ examined: 2, attempted: 2, derived: 2, skipped: 0, refused: 0 });
    expect(analyzed).toEqual([NEWER_GROUP_ID, OLDER_GROUP_ID]);
  });

  test("analyzes a finalized group whose report was never written, exactly once", async () => {
    const capabilities: string[] = [];
    const analyzedValues: Array<Record<string, unknown>> = [];
    const evidenceCalls: Array<Record<string, unknown>> = [];
    const summary = await runSweep({ capabilities, analyzedValues, evidenceCalls });

    expect(summary).toEqual({ examined: 1, analyzed: 1, skipped: 0, refused: 0, deferred: 0 });
    expect(
      capabilities.filter((capability) => capability === "signals:analyze-finalized-evaluation"),
    ).toHaveLength(1);
    expect(evidenceCalls).toHaveLength(1);
    expect(evidenceCalls[0].sourceDecisionId).toBe(DECISION_ID);
    expect(evidenceCalls[0].replayId).toBe(REPLAY_ID);

    // The analyze value is the derivation's own envelope, field for field.
    const value = analyzedValues[0];
    expect(value.routeDecisionId).toBe(DECISION_ID);
    expect(value.graphRef).toBe(GRAPH_REF);
    expect(value.replayRef).toBe(REPLAY_REF);
    expect(value.routePackage).toBe(WINNER);
    expect(Array.isArray(value.events) && value.events.length).toBeGreaterThanOrEqual(2);
    expect((value.finalizedEvaluation as Record<string, unknown>).groupId).toBe(NEWER_GROUP_ID);
    expect((value.finalizedEvaluation as Record<string, unknown>).status).toBe("finalized");
    expect(value.resolvedReferences).toEqual({
      graph: [GRAPH_REF],
      replay: [REPLAY_REF],
      evaluation: [NEWER_GROUP_ID],
    });
  });

  test("never re-analyzes a group whose own report is already persisted", async () => {
    const capabilities: string[] = [];
    let evidenceReads = 0;
    const sweep = async (read: unknown) =>
      sweepFinalizationSignalsForGroups({
        groups: [comparisonFor(NEWER_GROUP_ID)],
        computeLimit: 8,
        wallClockBudgetMs: 30_000,
        readDurableTrajectoryEvidence: async () => {
          evidenceReads += 1;
          return { kind: "evidence", events: EVENTS, graphRef: GRAPH_REF, replayRef: REPLAY_REF };
        },
        invoke: async (_extensionId, capability) => {
          capabilities.push(capability);
          if (capability === "replay:job") return job;
          if (capability === "signals:read") return read;
          return null;
        },
      });

    const summary = await sweep([reportFor(NEWER_GROUP_ID)]);
    expect(summary).toEqual({ examined: 1, analyzed: 0, skipped: 1, refused: 0, deferred: 0 });
    expect(capabilities).not.toContain("signals:analyze-finalized-evaluation");
    expect(evidenceReads).toBe(0);

    // A sibling arm's report (same decision, another comparison) is not this group's report.
    const withSibling = await sweep([reportFor(OLDER_GROUP_ID), reportFor(NEWER_GROUP_ID)]);
    expect(withSibling).toEqual({ examined: 1, analyzed: 0, skipped: 1, refused: 0, deferred: 0 });
    expect(capabilities).not.toContain("signals:analyze-finalized-evaluation");
  });

  test("names a capture outside retention as a skip that does not consume the compute bound", async () => {
    const logs: string[] = [];
    const capabilities: string[] = [];
    // The page is `group_id ASC`; the sweep consumes it newest-first, so the aged group (last in the page)
    // is the first candidate attempted - and its retention skip must leave the one compute slot free.
    const summary = await runSweep({
      groups: [comparisonFor(NEWER_GROUP_ID), comparisonFor(OLDER_GROUP_ID, AGED_REPLAY_ID)],
      computeLimit: 1,
      logs,
      capabilities,
      evidence: ({ replayId }) =>
        replayId === AGED_REPLAY_ID
          ? { kind: "unavailable", reason: "capture req-aaaa is outside the retention window" }
          : { kind: "evidence", events: EVENTS, graphRef: GRAPH_REF, replayRef: REPLAY_REF },
    });

    // The aged group skipped cheaply; the bound was still available for the next candidate.
    expect(summary).toEqual({ examined: 2, analyzed: 1, skipped: 1, refused: 0, deferred: 0 });
    expect(
      capabilities.filter((capability) => capability === "signals:analyze-finalized-evaluation"),
    ).toHaveLength(1);
    expect(logs.join("\n")).toContain("outside the retention window");
  });

  test("respects the per-tick compute bound and defers the rest of the page", async () => {
    const groups = [0, 1, 2, 3, 4].map((index) => ({
      ...comparisonFor(`comparison:supervised-replay:${String(index).repeat(64).slice(0, 64)}`),
    }));
    const capabilities: string[] = [];
    const summary = await runSweep({ groups, computeLimit: 2, capabilities });

    expect(summary.analyzed).toBe(2);
    expect(summary.deferred).toBe(3);
    expect(
      capabilities.filter((capability) => capability === "signals:analyze-finalized-evaluation"),
    ).toHaveLength(2);
  });

  test("walks the page it is given newest-first", async () => {
    const analyzedValues: Array<Record<string, unknown>> = [];
    await runSweep({
      groups: [comparisonFor(OLDER_GROUP_ID), comparisonFor(NEWER_GROUP_ID)],
      computeLimit: 2,
      analyzedValues,
    });

    // The extension's page is `group_id ASC`; the sweep consumes it from the newest end.
    expect(
      analyzedValues.map((value) => (value.finalizedEvaluation as Record<string, unknown>).groupId),
    ).toEqual([NEWER_GROUP_ID, OLDER_GROUP_ID]);
  });

  test("classifies a degradation receipt as a named skip and writes nothing", async () => {
    const logs: string[] = [];
    const summary = await runSweep({
      logs,
      analysis: {
        schemaVersion: "role-model.degradation-receipt.v1",
        degraded: true,
        capability: "signals:analyze-finalized-evaluation",
        reasonCode: "R16_TRAJECTORY_EVIDENCE_UNAVAILABLE",
        reason: "finalized route-learning requires at least two trajectory events",
        mode: "omit_signals",
      },
    });

    expect(summary).toEqual({ examined: 1, analyzed: 0, skipped: 1, refused: 0, deferred: 0 });
    expect(logs.join("\n")).toContain("R16_TRAJECTORY_EVIDENCE_UNAVAILABLE");
  });

  test("stops the walk when the wall-clock budget is spent", async () => {
    const groups = [0, 1, 2].map((index) => ({
      ...comparisonFor(`comparison:supervised-replay:${String(index).repeat(64).slice(0, 64)}`),
    }));
    let clock = 0;
    const summary = await runSweep({
      groups,
      computeLimit: 8,
      wallClockBudgetMs: 1_000,
      now: () => {
        clock += 500;
        return clock;
      },
    });

    expect(summary.analyzed).toBe(2);
    expect(summary.deferred).toBe(1);
  });

  test("settles a group it resolved once, so the next tick does not re-read the store's newest end", async () => {
    const settled = new Set<string>();
    const evidenceReads: string[] = [];
    const sweep = () =>
      sweepFinalizationSignalsForGroups({
        groups: [comparisonFor(NEWER_GROUP_ID)],
        settledGroupIds: settled,
        computeLimit: 8,
        wallClockBudgetMs: 30_000,
        readDurableTrajectoryEvidence: async ({ replayId }) => {
          evidenceReads.push(replayId);
          return { kind: "evidence", events: EVENTS, graphRef: GRAPH_REF, replayRef: REPLAY_REF };
        },
        invoke: async (_extensionId, capability) => {
          if (capability === "replay:job") return job;
          if (capability === "signals:read") return [];
          return reportFor(NEWER_GROUP_ID);
        },
      });

    const first = await sweep();
    expect(first).toEqual({ examined: 1, analyzed: 1, skipped: 0, refused: 0, deferred: 0 });
    expect(settled.has(NEWER_GROUP_ID)).toBe(true);
    expect(evidenceReads).toEqual([REPLAY_ID]);

    const second = await sweep();
    expect(second).toEqual({ examined: 0, analyzed: 0, skipped: 0, refused: 0, deferred: 0 });
    expect(evidenceReads).toEqual([REPLAY_ID]);
  });

  test("leaves a group reachable when a capability call fails", async () => {
    const sweepWithFailing = async (failing: string) => {
      const settled = new Set<string>();
      const summary = await sweepFinalizationSignalsForGroups({
        groups: [comparisonFor(NEWER_GROUP_ID)],
        settledGroupIds: settled,
        computeLimit: 8,
        wallClockBudgetMs: 30_000,
        readDurableTrajectoryEvidence: async () => ({
          kind: "evidence",
          events: EVENTS,
          graphRef: GRAPH_REF,
          replayRef: REPLAY_REF,
        }),
        invoke: async (_extensionId, capability) => {
          if (capability === failing) throw new Error("extension host is unreachable");
          if (capability === "replay:job") return job;
          return [];
        },
      });
      return { summary, settled };
    };

    // The job read itself failed: nothing was learned about the group.
    const jobRead = await sweepWithFailing("replay:job");
    expect(jobRead.summary).toEqual({
      examined: 1,
      analyzed: 0,
      skipped: 0,
      refused: 1,
      deferred: 0,
    });
    expect(jobRead.settled.has(NEWER_GROUP_ID)).toBe(false);

    // A transport failure is not evidence that the report is missing.
    const reportRead = await sweepWithFailing("signals:read");
    expect(reportRead.summary).toEqual({
      examined: 1,
      analyzed: 0,
      skipped: 1,
      refused: 0,
      deferred: 0,
    });
    expect(reportRead.settled.has(NEWER_GROUP_ID)).toBe(false);
  });
});
