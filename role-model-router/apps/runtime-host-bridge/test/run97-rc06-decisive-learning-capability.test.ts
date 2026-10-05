import { describe, expect, test } from "vitest";

import { deriveTrackBLearningCapability } from "../src/track-b-learning-evidence.js";

/**
 * Run 97 Repair Cycle 06 - L6.
 *
 * Live evidence (2026-09-13, stage runtime v39 on real DSH traffic): the pairwise
 * judge dimension landed and comparisons started finalizing, but every comparison the
 * incumbent won (`outcome: "source"`, 3 of 28 groups) was discarded as if it carried
 * no evidence, so `knowledge_worker_candidates` stayed 0 and the profile learner
 * wrote `learning_degraded` receipts.
 *
 * Canonical basis: `guidance/07_knowledge_store_and_knowledge_worker.md` requires the
 * worker to "compare winners and losers" and proposes `keep` as well as `add`, and
 * states that "Positive and negative source rollouts are mandatory evidence for
 * semantic advantage extraction" - both directions of a decisive comparison qualify.
 * `guidance/09_evaluation_core.md` admits finalized groups with complete scorer
 * provenance and both dispositions, and `guidance/13` treats a source win as negative
 * observational evidence about the counterfactual package, never as missing data.
 */

const members = [
  {
    trialId: "trial:source",
    scoreId: "trial-score:source",
    score: 1,
    confidence: 1,
    disposition: "positive",
    role: "source",
  },
  {
    trialId: "trial:counterfactual",
    scoreId: "trial-score:counterfactual",
    score: 0,
    confidence: 1,
    disposition: "negative",
    role: "counterfactual",
  },
];

const comparableEvidence = {
  positive: [{ trialId: "trial:source", scoreId: "trial-score:source", score: 1 }],
  negative: [{ trialId: "trial:counterfactual", scoreId: "trial-score:counterfactual", score: 0 }],
};

const sourceComparison = {
  groupId: "comparison:run97-rc06",
  status: "finalized",
  outcome: "source",
};

const lineage = members.map(({ trialId, scoreId, score, confidence }) => ({
  trialId,
  scoreId,
  score,
  confidence,
}));

describe("run97 rc06 decisive-comparison learning capability", () => {
  test("declares capability for a finalized comparison the incumbent won", () => {
    const capability = deriveTrackBLearningCapability({
      comparison: sourceComparison,
      members,
      ...comparableEvidence,
    });
    expect(capability.learningCapable).toBe(true);
    expect(capability.finalizedEvaluation).toEqual({
      groupId: "comparison:run97-rc06",
      status: "finalized",
      outcome: "source",
      members: lineage,
    });
    expect(capability.learningEvidence).toEqual({
      schemaVersion: "role-model.finalized-evaluation-signal.v1",
      groupId: "comparison:run97-rc06",
      outcome: "source",
      trialScoreRefs: lineage,
    });
  });

  test("keeps withholding capability for non-decisive comparisons", () => {
    for (const comparison of [
      { groupId: "comparison:run97-rc06", status: "finalized", outcome: "tie" },
      { groupId: "comparison:run97-rc06", status: "finalized", outcome: "disagreement" },
      { groupId: "comparison:run97-rc06", status: "finalized", outcome: "insufficient" },
      { groupId: "comparison:run97-rc06", status: "finalized", outcome: "incomplete" },
      { groupId: "comparison:run97-rc06", status: "finalized", outcome: "rejected" },
      { groupId: "comparison:run97-rc06", status: "partial", outcome: "source" },
    ]) {
      const capability = deriveTrackBLearningCapability({
        comparison,
        members,
        ...comparableEvidence,
      });
      expect(capability).toEqual({
        learningCapable: false,
        finalizedEvaluation: null,
        learningEvidence: null,
      });
    }
  });

  test("fails closed when the member disposition contradicts the recorded outcome", () => {
    const contradictory = [
      { ...members[0], disposition: "negative" },
      { ...members[1], disposition: "positive" },
    ];
    expect(
      deriveTrackBLearningCapability({
        comparison: sourceComparison,
        members: contradictory,
        ...comparableEvidence,
      }).learningCapable,
    ).toBe(false);
  });

  test("withholds capability for a source comparison without both dispositions or lineage", () => {
    expect(
      deriveTrackBLearningCapability({
        comparison: sourceComparison,
        members,
        positive: comparableEvidence.positive,
        negative: [],
      }).learningCapable,
    ).toBe(false);
    expect(
      deriveTrackBLearningCapability({
        comparison: sourceComparison,
        members: [],
        ...comparableEvidence,
      }).learningCapable,
    ).toBe(false);
  });
});
