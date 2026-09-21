import { expect, test } from "vitest";

import {
  boundedTrackBLearningRefusal,
  selectTrackBLearningEvidence,
} from "../src/track-b-learning-evidence.js";

const rollouts = [
  {
    trialId: "trial:source",
    scoreId: "trial-score:source",
    score: 1,
    evidenceRef: "artifact:source",
  },
  {
    trialId: "trial:counterfactual",
    scoreId: "trial-score:counterfactual",
    score: 1,
    evidenceRef: "artifact:counterfactual",
  },
];

test("run97 selects learning evidence from the durable comparison dispositions", () => {
  // The durable comparison is authoritative: the source trial lost and the
  // counterfactual won. A uniform in-memory re-score must not close the knowledge
  // gate on a comparison the evaluation store already decided.
  const selected = selectTrackBLearningEvidence({
    members: [
      {
        trialId: "trial:source",
        scoreId: "trial-score:source",
        score: 0,
        disposition: "negative",
      },
      {
        trialId: "trial:counterfactual",
        scoreId: "trial-score:counterfactual",
        score: 1,
        disposition: "positive",
      },
    ],
    rollouts,
  });
  expect(selected.positive).toHaveLength(1);
  expect(selected.negative).toHaveLength(1);
  expect(selected.positive[0]).toMatchObject({
    trialId: "trial:counterfactual",
    score: 1,
    evidenceRef: "artifact:counterfactual",
  });
  expect(selected.negative[0]).toMatchObject({
    trialId: "trial:source",
    score: 0,
    evidenceRef: "artifact:source",
  });
});

test("run97 falls back to the bounded score split when a comparison has no dispositions", () => {
  const selected = selectTrackBLearningEvidence({
    members: [
      { trialId: "trial:source", scoreId: "trial-score:source", score: 1 },
      { trialId: "trial:counterfactual", scoreId: "trial-score:counterfactual", score: 0 },
    ],
    rollouts: [
      { ...rollouts[0] },
      { ...rollouts[1], score: 0, evidenceRef: "artifact:counterfactual" },
    ],
  });
  // Without dispositions the bounded score split decides: the rollout scored 1 is
  // positive and the rollout scored 0 is negative.
  expect(selected.positive.map((row) => row.trialId)).toEqual(["trial:source"]);
  expect(selected.negative.map((row) => row.trialId)).toEqual(["trial:counterfactual"]);
});

test("run97 drops dispositioned members that have no matching rollout evidence", () => {
  const selected = selectTrackBLearningEvidence({
    members: [
      {
        trialId: "trial:missing",
        scoreId: "trial-score:missing",
        score: 1,
        disposition: "positive",
      },
    ],
    rollouts,
  });
  expect(selected.positive).toHaveLength(0);
  expect(selected.negative).toHaveLength(0);
});

test("run97 records a bounded learning refusal instead of failing the replay", () => {
  const refusal = boundedTrackBLearningRefusal(
    "knowledge:eval-consumer",
    new Error("x".repeat(500)),
  );
  expect(refusal).toMatchObject({
    id: null,
    state: "learning_degraded",
    capability: "knowledge:eval-consumer",
    refusalCode: "R14_LEARNING_DEGRADED",
  });
  expect(refusal.reason.length).toBeLessThanOrEqual(240);
});
