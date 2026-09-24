import { describe, expect, test } from "vitest";

import {
  deriveLearnerCandidatesFromDurableEvidence,
  durableReplayIdForComparison,
  learnableComparisonMembers,
} from "../src/track-b-learner-derivation.js";

const WINNER = "deepseek.personal.primary.global.deepseek-v4-pro-high";
const SOURCE = "deepseek.personal.primary.global.deepseek-flash-max";
const GROUP_ID = `comparison:supervised-replay:${"a".repeat(64)}`;
const REPLAY_ID = "b".repeat(64);
const DECISION_ID = "decision-req-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const GRAPH_REF = `artifact:${"c".repeat(64)}`;
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
  sharedPrefixRef: comparison.comparability.forkRef,
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

const report = {
  schemaVersion: "role-model.trajectory-signal-report.v1",
  routeDecisionId: DECISION_ID,
  graphRef: GRAPH_REF,
  signals: [{ signalInstanceId: `signal:${"a".repeat(16)}`, signalType: "semantic" }],
  evaluationProvenance: { groupId: GROUP_ID, status: "finalized", outcome: "candidate" },
  learningEvidence: {
    schemaVersion: "role-model.finalized-evaluation-signal.v1",
    groupId: GROUP_ID,
    outcome: "candidate",
    sourceGeneration: `sha256:${"b".repeat(64)}`,
    trialScoreRefs: [],
  },
};

const profile = {
  digest: `sha256:${"c".repeat(64)}`,
  effects: { routePackage: { values: [WINNER], evidenceRefs: [COUNTERFACTUAL_EVIDENCE] } },
};

describe("run120 S13: the derivation pass presents only durable, complete evidence", () => {
  test("reads the replay job and the persisted report, then consumes the assembled value", async () => {
    const calls: Array<{ extensionId: string; capability: string; value: Record<string, unknown> }> = [];
    const summary = await deriveLearnerCandidatesFromDurableEvidence({
      groups: [comparison],
      attemptedGroupIds: new Set<string>(),
      limit: 2,
      channel: "stage",
      scope: "standalone-runtime-stage",
      evaluationAuthoritySecret: "secret",
      invoke: async (extensionId, capability, value, query) => {
        calls.push({ extensionId, capability, value });
        if (capability === "replay:job") return job;
        // `signals:read` is query-shaped and answers the newest reports for a decision as an array.
        if (capability === "signals:read") {
          expect(query).toEqual({ routeDecisionId: DECISION_ID });
          return [report];
        }
        if (capability === "profile:estimate-finalized-evaluation") return profile;
        if (capability === "knowledge:eval-consumer") return { id: `shadow-${"d".repeat(64)}` };
        return null;
      },
    });

    expect(summary).toEqual({ examined: 1, attempted: 1, derived: 1, skipped: 0, refused: 0 });
    expect(calls.map((call) => call.capability)).toEqual([
      "replay:job",
      "signals:read",
      "profile:estimate-finalized-evaluation",
      "knowledge:eval-consumer",
    ]);
    const consumed = calls[3].value as Record<string, any>;
    expect(consumed.scope.routePackage).toBe(WINNER);
    expect(consumed.learningCapable).toBe(true);
    expect(consumed.evaluation.finalizedComparison.comparisonId).toBe(GROUP_ID);
  });

  test("skips a group when the replay records no propensity and is not deterministic", async () => {
    const probabilistic = {
      ...job,
      candidatePackages: job.candidatePackages.map((entry) => ({
        ...entry,
        samplingProfileId: "exploration-v1",
      })),
    };
    const capabilities: string[] = [];
    const summary = await deriveLearnerCandidatesFromDurableEvidence({
      groups: [comparison],
      attemptedGroupIds: new Set<string>(),
      limit: 2,
      channel: "stage",
      scope: "standalone-runtime-stage",
      evaluationAuthoritySecret: "secret",
      invoke: async (_extensionId, capability) => {
        capabilities.push(capability);
        if (capability === "replay:job") return probabilistic;
        if (capability === "signals:read") return [report];
        return null;
      },
    });

    expect(summary.skipped).toBe(1);
    expect(summary.derived).toBe(0);
    expect(capabilities).not.toContain("profile:estimate-finalized-evaluation");
    expect(capabilities).not.toContain("knowledge:eval-consumer");
  });

  test("skips a group whose capture has no persisted signal report", async () => {
    const capabilities: string[] = [];
    const summary = await deriveLearnerCandidatesFromDurableEvidence({
      groups: [comparison],
      attemptedGroupIds: new Set<string>(),
      limit: 2,
      channel: "stage",
      scope: "standalone-runtime-stage",
      evaluationAuthoritySecret: "secret",
      invoke: async (_extensionId, capability) => {
        capabilities.push(capability);
        if (capability === "replay:job") return job;
        if (capability === "signals:read") throw new Error("no persisted report");
        return null;
      },
    });

    // Missing evidence is a skip, not a refusal: the group stays in the backlog until its replay has been analysed.
    expect(summary.skipped).toBe(1);
    expect(summary.refused).toBe(0);
    expect(capabilities).not.toContain("knowledge:eval-consumer");
  });

  test("never presents a comparison that is not learnable", async () => {
    const tie = {
      ...comparison,
      members: comparison.members.map((member) => ({ ...member, disposition: "tie" })),
    };
    const capabilities: string[] = [];
    const summary = await deriveLearnerCandidatesFromDurableEvidence({
      groups: [tie],
      attemptedGroupIds: new Set<string>(),
      limit: 2,
      channel: "stage",
      scope: "standalone-runtime-stage",
      evaluationAuthoritySecret: "secret",
      invoke: async (_extensionId, capability) => {
        capabilities.push(capability);
        return null;
      },
    });

    expect(summary).toEqual({ examined: 1, attempted: 0, derived: 0, skipped: 1, refused: 0 });
    expect(capabilities).toEqual([]);
  });

  /**
   * Measured live on `run120-d4b95514`: the first derivation tick examined all 812 groups and derived none, because
   * `evaluation:list-groups` returns `{...group_json, status, result: {...result_json}}` - the members and the outcome
   * live under `result`, while the rejection/selection code read them from the top level. The page shape is the
   * authoritative readback, so the pass has to read it as it is.
   */
  test("accepts the evaluator's page shape, where members and outcome live under result", async () => {
    const pageEntry = {
      groupId: comparison.groupId,
      status: "finalized",
      holdout: comparison.holdout,
      comparability: comparison.comparability,
      referenceProofs: comparison.referenceProofs,
      result: {
        members: comparison.members,
        outcome: comparison.outcome,
        referenceProofs: comparison.referenceProofs,
      },
    };
    expect(learnableComparisonMembers(pageEntry)?.positive).toHaveLength(1);
    expect(durableReplayIdForComparison(pageEntry)).toBe(REPLAY_ID);

    const summary = await deriveLearnerCandidatesFromDurableEvidence({
      groups: [pageEntry],
      attemptedGroupIds: new Set<string>(),
      limit: 2,
      channel: "stage",
      scope: "standalone-runtime-stage",
      evaluationAuthoritySecret: "secret",
      invoke: async (_extensionId, capability) => {
        if (capability === "replay:job") return job;
        if (capability === "signals:read") return report;
        if (capability === "profile:estimate-finalized-evaluation") return profile;
        if (capability === "knowledge:eval-consumer") return { id: "shadow-page-shape" };
        return null;
      },
    });
    expect(summary).toEqual({ examined: 1, attempted: 1, derived: 1, skipped: 0, refused: 0 });
  });

  test("does not re-attempt a group the process already presented", async () => {
    const attempts: string[] = [];
    const attempted = new Set<string>();
    const run = () =>
      deriveLearnerCandidatesFromDurableEvidence({
        groups: [comparison],
        attemptedGroupIds: attempted,
        limit: 2,
        channel: "stage",
        scope: "standalone-runtime-stage",
        evaluationAuthoritySecret: "secret",
        invoke: async (_extensionId, capability) => {
          attempts.push(capability);
          if (capability === "replay:job") return job;
          if (capability === "signals:read") return report;
          if (capability === "profile:estimate-finalized-evaluation") return profile;
          return { id: "shadow-x" };
        },
      });

    await run();
    const second = await run();
    expect(attempts.filter((capability) => capability === "knowledge:eval-consumer")).toHaveLength(1);
    expect(second.examined).toBe(0);
  });

  test("resolves the comparison's replay id and learnability from the durable record alone", () => {
    expect(durableReplayIdForComparison(comparison)).toBe(REPLAY_ID);
    expect(learnableComparisonMembers(comparison)?.positive).toHaveLength(1);
    expect(learnableComparisonMembers(comparison)?.negative).toHaveLength(1);
    expect(learnableComparisonMembers({ members: [] })).toBeNull();
  });
});
