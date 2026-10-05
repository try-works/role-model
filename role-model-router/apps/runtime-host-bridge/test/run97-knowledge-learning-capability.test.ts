import { describe, expect, test } from "vitest";

import { deriveTrackBLearningCapability } from "../src/track-b-learning-evidence.js";

// The durable comparison is the authority for learning capability. Canonical
// guidance (07_knowledge_store_and_knowledge_worker.md) accepts only immutable
// `finalized` groups whose members are comparable under the recorded policy and
// whose scorer provenance is complete, so the capability marker has to be
// derived from that evidence instead of being asserted by the caller.
const members = [
  { trialId: "trial:source", scoreId: "trial-score:source", score: 0, confidence: 1 },
  {
    trialId: "trial:counterfactual",
    scoreId: "trial-score:counterfactual",
    score: 1,
    confidence: 1,
  },
];

const candidateComparison = {
  groupId: "comparison:run97",
  status: "finalized",
  outcome: "candidate",
};

const comparableEvidence = {
  positive: [{ trialId: "trial:counterfactual", scoreId: "trial-score:counterfactual", score: 1 }],
  negative: [{ trialId: "trial:source", scoreId: "trial-score:source", score: 0 }],
};

describe("run97 finalized learning capability", () => {
  test("declares capability with durable lineage for a finalized candidate comparison", () => {
    const capability = deriveTrackBLearningCapability({
      comparison: candidateComparison,
      members,
      ...comparableEvidence,
    });
    expect(capability.learningCapable).toBe(true);
    expect(capability.finalizedEvaluation).toEqual({
      groupId: "comparison:run97",
      status: "finalized",
      outcome: "candidate",
      members,
    });
    expect(capability.learningEvidence).toEqual({
      schemaVersion: "role-model.finalized-evaluation-signal.v1",
      groupId: "comparison:run97",
      outcome: "candidate",
      trialScoreRefs: members,
    });
  });

  test("withholds capability when the comparison is not a finalized candidate", () => {
    for (const comparison of [
      { groupId: "comparison:run97", status: "partial", outcome: "candidate" },
      { groupId: "comparison:run97", status: "collecting", outcome: "candidate" },
      { groupId: "comparison:run97", status: "finalized", outcome: "tie" },
      { groupId: "comparison:run97", status: "finalized", outcome: null },
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

  test("withholds capability without both dispositions or without complete member lineage", () => {
    expect(
      deriveTrackBLearningCapability({
        comparison: candidateComparison,
        members,
        positive: comparableEvidence.positive,
        negative: [],
      }).learningCapable,
    ).toBe(false);
    expect(
      deriveTrackBLearningCapability({
        comparison: candidateComparison,
        members,
        positive: comparableEvidence.positive,
        negative: [{ trialId: "trial:source", scoreId: "", score: 0 }],
      }).learningCapable,
    ).toBe(false);
    expect(
      deriveTrackBLearningCapability({
        comparison: candidateComparison,
        members: [],
        ...comparableEvidence,
      }).learningCapable,
    ).toBe(false);
  });
});
