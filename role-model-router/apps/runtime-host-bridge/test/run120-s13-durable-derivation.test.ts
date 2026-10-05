import { describe, expect, test } from "vitest";

import {
  assembleDurableLearnerDerivationValue,
  durableComparisonDigest,
} from "../src/track-b-learning-pass.js";

/**
 * Run 100 addendum 10, S13: the durable derivation half.
 *
 * Measured 2026-09-25 on the live store: 483 learnable finalized comparison groups (>=1 positive and >=1 negative
 * member), 202 candidates, **281 learnable groups with no candidate**. All 281 resolve a replay job through their
 * `holdout.caseIds`, 148 of those jobs completed, and 136 already carry a durable `trajectory_signal_reports` row for
 * the capture's live decision - so for those the durable evidence is complete and no trajectory has to be invented.
 *
 * This suite pins the value the Knowledge Worker's `consumeEvaluation` guards accept. Every assertion below is one of
 * that function's own conditions (extensions/knowledge-worker/index.mjs), so a change that would make the worker
 * refuse the derived value fails here first instead of on a rebuild.
 */

const SOURCE_ENDPOINT = "deepseek.personal.deepseek-api-key.global.deepseek-flash-max";
const WINNER_ENDPOINT = "deepseek.personal.deepseek-api-key.global.deepseek-v4-pro-high";
const GROUP_ID = `comparison:supervised-replay:${"a".repeat(64)}`;
const REPLAY_ID = "b".repeat(64);
const SOURCE_DECISION_ID = "decision-req-11111111-2222-3333-4444-555555555555";
const SOURCE_GRAPH_REF = `artifact:${"c".repeat(64)}`;
const AUTHORITY_SECRET = "run120-s13-authority-secret";

const referenceProofs = {
  sourceEvidenceRef: {
    authority: "evaluation-reference-store",
    authorizationEpoch: 1,
    channel: "stage",
    purpose: "evaluation",
    reference: "artifact:1111111111111111111111111111111111111111111111111111111111111111",
    referenceDigest: `sha256:${"1".repeat(64)}`,
    resolved: true,
    schemaVersion: "role-model.evaluation-reference-attestation.v1",
    scope: "standalone-runtime-stage",
  },
  counterfactualEvidenceRef: {
    authority: "evaluation-reference-store",
    authorizationEpoch: 1,
    channel: "stage",
    purpose: "evaluation",
    reference: "artifact:2222222222222222222222222222222222222222222222222222222222222222",
    referenceDigest: `sha256:${"2".repeat(64)}`,
    resolved: true,
    schemaVersion: "role-model.evaluation-reference-attestation.v1",
    scope: "standalone-runtime-stage",
  },
} as const;

const finalizedComparison = {
  groupId: GROUP_ID,
  status: "finalized",
  outcome: "candidate",
  holdout: {
    holdoutId: `sha256:${"3".repeat(64)}`,
    membershipDigest: `sha256:${"4".repeat(64)}`,
    partition: "holdout",
    caseIds: [`replay:${REPLAY_ID}:0`, `replay:${REPLAY_ID}:1`],
  },
  members: [
    {
      candidateRef: SOURCE_ENDPOINT,
      disposition: "negative",
      role: "source",
      score: 0,
      confidence: 1,
      trialId: `trial:${"5".repeat(64)}`,
      scoreId: `trial-score:${"6".repeat(64)}`,
    },
    {
      candidateRef: WINNER_ENDPOINT,
      disposition: "positive",
      role: "counterfactual",
      score: 1,
      confidence: 1,
      trialId: `trial:${"7".repeat(64)}`,
      scoreId: `trial-score:${"8".repeat(64)}`,
    },
  ],
  comparability: {
    policyId: "run96-routing-shadow",
    scorerSetVersion: "run96-routing-shadow-v3",
    sourceCandidateRef: SOURCE_ENDPOINT,
    counterfactualCandidateRef: WINNER_ENDPOINT,
    sourceEvidenceRef: referenceProofs.sourceEvidenceRef.reference,
    counterfactualEvidenceRef: referenceProofs.counterfactualEvidenceRef.reference,
    forkRef: `artifact:${"9".repeat(64)}`,
    inputRef: `artifact:${"a".repeat(64)}`,
    taskRef: `artifact:${"b".repeat(64)}`,
  },
  referenceProofs,
};

const replayProvenance = {
  sourceDecisionId: SOURCE_DECISION_ID,
  sourceGraphRef: SOURCE_GRAPH_REF,
  sharedPrefixRef: finalizedComparison.comparability.forkRef,
  digest: REPLAY_ID,
  branches: [{ id: WINNER_ENDPOINT }, { id: SOURCE_ENDPOINT }],
};

const signalsReport = {
  schemaVersion: "role-model.trajectory-signal-report.v1",
  routeDecisionId: SOURCE_DECISION_ID,
  graphRef: SOURCE_GRAPH_REF,
  signals: [{ signalInstanceId: `signal:${"c".repeat(32)}`, signalType: "semantic" }],
  evaluationProvenance: { groupId: GROUP_ID, status: "finalized", outcome: "candidate" },
  learningEvidence: {
    schemaVersion: "role-model.finalized-evaluation-signal.v1",
    groupId: GROUP_ID,
    outcome: "candidate",
    traceRef: SOURCE_GRAPH_REF,
    replayRef: REPLAY_ID,
    routePackage: WINNER_ENDPOINT,
    sourceGeneration: `sha256:${"d".repeat(64)}`,
    trialScoreRefs: finalizedComparison.members.map((member) => ({
      trialId: member.trialId,
      scoreId: member.scoreId,
      score: member.score,
      confidence: member.confidence,
    })),
  },
};

const profileEstimate = {
  digest: `sha256:${"e".repeat(64)}`,
  effects: {
    routePackage: {
      values: [WINNER_ENDPOINT],
      evidenceRefs: [referenceProofs.counterfactualEvidenceRef.reference],
    },
  },
};

function assemble() {
  return assembleDurableLearnerDerivationValue({
    channel: "stage",
    scope: "standalone-runtime-stage",
    evaluationAuthoritySecret: AUTHORITY_SECRET,
    finalizedComparison,
    replayProvenance,
    signalsReport,
    profileEstimate,
    taskTypeId: "support.ticket.reply",
    taxonomyVersion: "1.0.0-alpha.1",
    roleId: "support",
  });
}

describe("run120 S13: the durable derivation value satisfies the knowledge consumer's guards", () => {
  test("carries complete replay provenance keyed to the group's own replay", () => {
    const value = assemble();

    expect(value.replay.sourceDecisionId).toBe(SOURCE_DECISION_ID);
    expect(value.replay.sourceGraphRef).toBe(SOURCE_GRAPH_REF);
    expect(value.replay.sharedPrefixRef).toBe(finalizedComparison.comparability.forkRef);
    expect(Array.isArray(value.replay.branches)).toBe(true);
    expect(value.replay.branches.length).toBe(2);
  });

  test("carries a finalized comparison, local holdout provenance and both signed receipts", () => {
    const value = assemble();
    const evaluation = value.evaluation;

    expect(evaluation.environment).toBe("local-routing-evaluation");
    expect(evaluation.scores.length).toBe(2);
    expect(evaluation.scores.every((score: unknown) => Number.isFinite(score))).toBe(true);
    expect(evaluation.provenance).toMatchObject({
      policy: "run96-routing-shadow",
      scorer: "run96-routing-shadow-v3",
      split: "holdout",
      seed: 87,
    });
    expect(typeof evaluation.provenance.task).toBe("string");
    expect(evaluation.provenance.evidenceRef.length).toBeGreaterThan(0);

    const comparison = evaluation.finalizedComparison;
    expect(comparison.status).toBe("finalized");
    // The evaluator's page entry names the row as `groupId`; the consumer reads `comparisonId`, so the projection has
    // to state both (measured live on run128-c73a2131: the worker refused every derivation without it).
    expect(comparison.comparisonId).toBe(GROUP_ID);
    expect(comparison.groupId).toBe(GROUP_ID);
    expect(comparison.holdout.holdoutId).toBe(finalizedComparison.holdout.holdoutId);
    expect(comparison.holdout.membershipDigest).toBe(finalizedComparison.holdout.membershipDigest);
    expect(comparison.members.some((m) => m.disposition === "positive")).toBe(true);
    expect(comparison.members.some((m) => m.disposition === "negative")).toBe(true);
    for (const member of comparison.members) {
      expect(typeof member.trialId).toBe("string");
      expect(typeof member.scoreId).toBe("string");
      expect(Number.isFinite(member.score)).toBe(true);
      expect(Number.isFinite(member.confidence)).toBe(true);
    }

    const digest = durableComparisonDigest(comparison);
    expect(evaluation.finalizedComparisonReceipt.payload).toMatchObject({
      schemaVersion: "role-model.evaluation-comparison-readback-receipt.v1",
      kind: "evaluation_core_comparison_readback",
      channel: "stage",
      routePackage: WINNER_ENDPOINT,
      comparisonDigest: digest,
    });
    expect(evaluation.safetyReceipt.payload).toMatchObject({
      schemaVersion: "role-model.knowledge-safety-receipt.v1",
      kind: "knowledge_safety",
      comparisonId: GROUP_ID,
      comparisonDigest: digest,
      channel: "stage",
      routePackage: WINNER_ENDPOINT,
      packageIdentity: WINNER_ENDPOINT,
      redacted: true,
      safetyReviewed: true,
      holdoutPassed: true,
    });
    // The one field the pipeline's own mint omitted: the consumer requires a boolean here.
    expect(typeof evaluation.safetyReceipt.payload.safeForPrompt).toBe("boolean");
    for (const receipt of [evaluation.finalizedComparisonReceipt, evaluation.safetyReceipt]) {
      expect(typeof receipt.signature).toBe("string");
      expect(receipt.signature.length).toBeGreaterThan(0);
    }
  });

  test("carries the persisted signal provenance, the profile attribution and the winning package", () => {
    const value = assemble();

    expect(value.signals.routeDecisionId).toBe(value.replay.sourceDecisionId);
    expect(value.signals.graphRef).toBe(value.replay.sourceGraphRef);
    expect(Array.isArray(value.signals.signals)).toBe(true);
    expect(value.signals.evaluationProvenance.groupId).toBe(GROUP_ID);
    expect(value.signals.learningEvidence.groupId).toBe(GROUP_ID);

    expect(value.profile.digest).toBe(profileEstimate.digest);
    expect(value.profile.effects.routePackage.values).toContain(WINNER_ENDPOINT);
    expect(value.profile.effects.routePackage.evidenceRefs.length).toBeGreaterThan(0);

    expect(value.scope).toMatchObject({
      routePackage: WINNER_ENDPOINT,
      channel: "stage",
      scopeId: "standalone-runtime-stage",
      taskTypeId: "support.ticket.reply",
    });
    expect(value.scope.channel).not.toBe("production");
  });

  test("files the winning member positive and the losing member negative, with member lineage and proofs", () => {
    const value = assemble();
    const group = value.comparableGroup;

    expect(group.policy).toBe("run96-routing-shadow");
    expect(group.task).toBeTruthy();
    expect(group.scorer).toBe("run96-routing-shadow-v3");
    expect(group.split).toBe("holdout");
    expect(Number.isInteger(group.seed)).toBe(true);
    expect(group.comparabilityKey).toBe(`${SOURCE_DECISION_ID}:holdout`);

    const [positive] = group.positive;
    const [negative] = group.negative;
    expect(positive.trialId).toBe(finalizedComparison.members[1].trialId);
    expect(positive.scoreId).toBe(finalizedComparison.members[1].scoreId);
    expect(positive.evidenceRef).toBe(referenceProofs.counterfactualEvidenceRef.reference);
    expect(positive.referenceProof).toMatchObject({
      reference: referenceProofs.counterfactualEvidenceRef.reference,
      resolved: true,
    });
    // The winner's branch artifact is the graph lineage for its trial (the worker requires it on grouped holdout
    // learning: "explicit graph/evaluation/trial/score lineage required", measured live on run130-fca037e1).
    expect(positive.evidenceKind).toBe("graph");
    expect(positive.graphRef).toBe(referenceProofs.counterfactualEvidenceRef.reference);
    expect(positive.rolloutRef).toBe(referenceProofs.counterfactualEvidenceRef.reference);
    expect(negative.evidenceKind).toBe("evaluation");
    expect(negative.trialId).toBe(finalizedComparison.members[0].trialId);
    expect(negative.evidenceRef).toBe(referenceProofs.sourceEvidenceRef.reference);
    expect(negative.referenceProof).toMatchObject({
      reference: referenceProofs.sourceEvidenceRef.reference,
      resolved: true,
    });
    for (const row of [...group.positive, ...group.negative]) {
      expect(Number.isFinite(row.score)).toBe(true);
    }

    expect(value.holdout.passed).toBe(true);
    expect(value.holdout.evidenceRef).toBeTruthy();
    expect(value.learningCapable).toBe(true);
    expect(value.learningEvidence.groupId).toBe(GROUP_ID);
    expect(value.finalizedEvaluation).toMatchObject({ groupId: GROUP_ID, status: "finalized" });
  });

  test("refuses to derive from a comparison that is not learnable", () => {
    expect(() =>
      assembleDurableLearnerDerivationValue({
        channel: "stage",
        scope: "standalone-runtime-stage",
        evaluationAuthoritySecret: AUTHORITY_SECRET,
        finalizedComparison: {
          ...finalizedComparison,
          members: finalizedComparison.members.map((member) => ({ ...member, disposition: "tie" })),
        },
        replayProvenance,
        signalsReport,
        profileEstimate,
      }),
    ).toThrow(/learnable|positive|negative/i);
  });
});
