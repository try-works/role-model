import { describe, expect, it } from "vitest";

import { selectDurableJudgeScores } from "../src/track-b-runtime.js";

/**
 * Run 99 R33 live finding (stage v165): a resumed comparison reuses durable scored trials, then the
 * pipeline ran the pairwise judge again and recorded a *second* judge score. The extension refused the
 * batch (`evaluation trial score batch conflict` at index.mjs:1932, or `partial evaluation trial
 * scores require recovery` at :1935) because the durable receipt from the original attempt is the
 * authority. A comparison whose trials already carry this judge's score must reuse those rows instead
 * of dispatching the judge again.
 */

const judgeScorer = {
  id: "run97-pairwise-judge",
  version: "2+abc",
  dimension: "preference",
};

const judgeRow = (trialId: string) => ({
  scoreId: `score:${trialId}`,
  trialId,
  scorerId: judgeScorer.id,
  scorerVersion: judgeScorer.version,
  dimension: judgeScorer.dimension,
  score: 1,
});

describe("run99 R33 durable judge reuse", () => {
  it("reuses both durable judge rows when the original attempt already judged the pair", () => {
    const selected = selectDurableJudgeScores({
      trialIds: ["trial:source", "trial:counterfactual"],
      scoresByTrial: {
        "trial:source": [judgeRow("trial:source")],
        "trial:counterfactual": [judgeRow("trial:counterfactual")],
      },
      scorerId: judgeScorer.id,
      scorerVersion: judgeScorer.version,
      dimension: judgeScorer.dimension,
    });
    expect(selected?.map((row) => row.scoreId)).toEqual([
      "score:trial:source",
      "score:trial:counterfactual",
    ]);
  });

  it("does not reuse a partially judged pair", () => {
    expect(
      selectDurableJudgeScores({
        trialIds: ["trial:source", "trial:counterfactual"],
        scoresByTrial: {
          "trial:source": [judgeRow("trial:source")],
          "trial:counterfactual": [],
        },
        scorerId: judgeScorer.id,
        scorerVersion: judgeScorer.version,
        dimension: judgeScorer.dimension,
      }),
    ).toBeNull();
  });

  it("reuses a durable judgement recorded under a different judge version", () => {
    const olderVersion = { ...judgeRow("trial:source"), scorerVersion: "2+olderhash" };
    const olderVersionCounterfactual = {
      ...judgeRow("trial:counterfactual"),
      scorerVersion: "2+olderhash",
    };
    const selected = selectDurableJudgeScores({
      trialIds: ["trial:source", "trial:counterfactual"],
      scoresByTrial: {
        "trial:source": [olderVersion],
        "trial:counterfactual": [olderVersionCounterfactual],
      },
      scorerId: judgeScorer.id,
      scorerVersion: judgeScorer.version,
      dimension: judgeScorer.dimension,
    });
    expect(selected?.map((row) => row.scorerVersion)).toEqual(["2+olderhash", "2+olderhash"]);
  });

  it("does not reuse another scorer or another dimension", () => {
    const otherScorer = { ...judgeRow("trial:source"), scorerId: "another-scorer" };
    const otherDimension = { ...judgeRow("trial:source"), dimension: "correctness" };
    for (const rows of [[otherScorer], [otherDimension]]) {
      expect(
        selectDurableJudgeScores({
          trialIds: ["trial:source", "trial:counterfactual"],
          scoresByTrial: {
            "trial:source": rows,
            "trial:counterfactual": rows,
          },
          scorerId: judgeScorer.id,
          scorerVersion: judgeScorer.version,
          dimension: judgeScorer.dimension,
        }),
      ).toBeNull();
    }
  });
});
