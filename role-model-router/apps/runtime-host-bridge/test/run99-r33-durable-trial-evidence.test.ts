import { describe, expect, it } from "vitest";

import { selectDurableScoredTrialEvidence } from "../src/track-b-runtime.js";

/**
 * Run 99 R33 live finding (stage v162): resuming an interrupted comparison reached the pipeline's
 * durable-scored-trial reuse branch and refused with
 *
 *   `durable scored trial is missing semantic correctness evidence`
 *
 * because the resumed run re-derived its rubric and then demanded a correctness score that the
 * durable trial never recorded under that scorer identity — the durable run had graded it with the
 * router judge alone. What a durable trial can prove is what it actually recorded, so the reuse branch
 * takes its own score rows as the authority: the correctness score when it exists, otherwise the
 * recorded (judge) score with a real score reference, and a refusal only when the trial recorded
 * nothing at all.
 */

describe("run99 R33 durable scored trial evidence", () => {
  it("uses the correctness score when the durable trial recorded one", () => {
    const evidence = selectDurableScoredTrialEvidence({
      scores: [
        { scoreId: "score:judge", dimension: "preference", scorerId: "judge", score: 1 },
        {
          scoreId: "score:correctness",
          dimension: "correctness",
          scorerId: "run96-shadow-exact",
          scorerVersion: "1",
          score: 0.75,
        },
      ],
      scorerId: "run96-shadow-exact",
      scorerVersion: "1",
    });
    expect(evidence).toMatchObject({
      score: 0.75,
      scoreId: "score:correctness",
      hasCorrectness: true,
    });
  });

  it("accepts a durable trial scored by the judge alone, with a real score reference", () => {
    const evidence = selectDurableScoredTrialEvidence({
      scores: [
        { scoreId: "score:judge", dimension: "preference", scorerId: "judge", score: 1 },
      ],
      scorerId: "run96-shadow-exact",
      scorerVersion: "1",
    });
    expect(evidence).toMatchObject({
      score: 0,
      scoreId: "score:judge",
      hasCorrectness: false,
    });
  });

  it("refuses a durable trial that recorded no scores at all", () => {
    expect(() =>
      selectDurableScoredTrialEvidence({
        scores: [],
        scorerId: "run96-shadow-exact",
        scorerVersion: "1",
      }),
    ).toThrow(/no recorded scores/i);
  });
});
