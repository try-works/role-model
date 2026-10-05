import { expect, test } from "vitest";

import {
  selectDurableJudgeScores,
  selectDurableJudgeScoresByTrial,
} from "../src/track-b-runtime.js";

/**
 * Run 101 addendum 37 - a partially judged pair must record only the branch that is missing a row.
 *
 * Measured live on the packaged stage RC (private `cd81be60`) on `:3457`, 2026-09-28, on the first replays that
 * reached evaluation after addendum 35:
 *
 *   replay.disposition  deferred / replay_failed
 *     req-b210895a-... 02:57:47  HTTP 409 {"error":"extension evaluation-core failed: evaluation trial score batch conflict"}
 *     req-136730af-... 02:54:55  HTTP 409 {"error":"extension evaluation-core failed: evaluation trial score batch conflict"}
 *
 * `evaluation trial score batch conflict` is raised at `extensions/evaluation-core/index.mjs:2940`, when a row
 * already exists for `(trial_id, scorer_id, scorer_version, dimension)` with a **different** `score_json`.
 *
 * The mechanism is dispatch-unique provenance: a judge row carries `judgeReceipt.dispatchReceiptId`,
 * `.routerDecisionId` and `.judgeResultRef`, all minted per dispatch, so a re-dispatched pair can never
 * reproduce a byte-identical row. The durable row is the authority (run 99 R33), and the reuse rule existed -
 * but it was applied **per pair**: `selectDurableJudgeScores` answers `null` unless *every* branch already has
 * the judge's row, and the caller skipped recording only when that all-or-nothing answer was non-null:
 *
 *   for (const branch of [sourceBranch, counterfactualBranch]) { if (durableJudgeScores) break; ...record... }
 *
 * So a pair with one side already judged re-dispatched and then recorded **both** sides, and the side that was
 * already scored could not match its durable row. The divergence is not hypothetical: in job
 * `evaluation-replay-1d302a1ebfd8059859f6` two trials carry `confidence` 0.95 where six siblings carry 1.0 -
 * the judge's own confidence varies between invocations.
 */

const JUDGE_SCORER_ID = "role_model_pairwise_judge.battle";
const JUDGE_DIMENSION = "task_specific_quality";

const SOURCE_TRIAL = "trial:source-aaaa";
const COUNTERFACTUAL_TRIAL = "trial:counterfactual-bbbb";

const judgeRow = (trialId: string, confidence: number): Record<string, unknown> => ({
  trialId,
  scorerId: JUDGE_SCORER_ID,
  scorerVersion: "role_model_pairwise_judge.battle@judge-endpoint-kimi",
  dimension: JUDGE_DIMENSION,
  score: 0.5,
  confidence,
  source: "role_model_pairwise_judge",
});

const input = {
  trialIds: [SOURCE_TRIAL, COUNTERFACTUAL_TRIAL],
  scorerId: JUDGE_SCORER_ID,
  scorerVersion: "role_model_pairwise_judge.battle@judge-endpoint-kimi",
  dimension: JUDGE_DIMENSION,
};

test("the all-or-nothing selector cannot answer for a partially judged pair", () => {
  const scoresByTrial = {
    [SOURCE_TRIAL]: [judgeRow(SOURCE_TRIAL, 1.0)],
    [COUNTERFACTUAL_TRIAL]: [],
  };

  // This is the defect's shape, and it is why a single answer could not drive a per-branch decision: `null`
  // means "nothing is reusable", so the caller re-recorded the side that already had a row.
  expect(selectDurableJudgeScores({ ...input, scoresByTrial })).toBeNull();
});

test("the per-trial selector reports exactly the branches that are reusable", () => {
  const scoresByTrial = {
    [SOURCE_TRIAL]: [judgeRow(SOURCE_TRIAL, 1.0)],
    [COUNTERFACTUAL_TRIAL]: [],
  };

  const reusable = selectDurableJudgeScoresByTrial({ ...input, scoresByTrial });

  expect([...reusable.keys()]).toEqual([SOURCE_TRIAL]);

  // What the caller does with it: record only the side that is missing a row. The already-judged side keeps
  // its durable receipt, so the dispatch-unique provenance of the new decision can never collide with it.
  const toRecord = input.trialIds.filter((trialId) => !reusable.has(trialId));
  expect(toRecord).toEqual([COUNTERFACTUAL_TRIAL]);
});

test("a fully judged pair is reusable on both sides and records nothing", () => {
  const scoresByTrial = {
    [SOURCE_TRIAL]: [judgeRow(SOURCE_TRIAL, 1.0)],
    [COUNTERFACTUAL_TRIAL]: [judgeRow(COUNTERFACTUAL_TRIAL, 0.95)],
  };

  const reusable = selectDurableJudgeScoresByTrial({ ...input, scoresByTrial });

  expect(reusable.size).toBe(2);
  expect(input.trialIds.filter((trialId) => !reusable.has(trialId))).toEqual([]);

  // The all-or-nothing answer agrees in this case, which is the only case it could serve.
  expect(selectDurableJudgeScores({ ...input, scoresByTrial })).toHaveLength(2);
});

test("an unjudged pair reuses nothing, so both branches are recorded", () => {
  const reusable = selectDurableJudgeScoresByTrial({
    ...input,
    scoresByTrial: { [SOURCE_TRIAL]: [], [COUNTERFACTUAL_TRIAL]: [] },
  });

  expect(reusable.size).toBe(0);
  expect(input.trialIds.filter((trialId) => !reusable.has(trialId))).toEqual([
    SOURCE_TRIAL,
    COUNTERFACTUAL_TRIAL,
  ]);
});

test("a non-judge row for the same trial is not reusable as a judge row", () => {
  const scoresByTrial = {
    [SOURCE_TRIAL]: [
      {
        trialId: SOURCE_TRIAL,
        scorerId: "run96-semantic-criteria",
        dimension: "correctness",
        score: 0.0,
        confidence: 1.0,
      },
    ],
    [COUNTERFACTUAL_TRIAL]: [judgeRow(COUNTERFACTUAL_TRIAL, 1.0)],
  };

  const reusable = selectDurableJudgeScoresByTrial({ ...input, scoresByTrial });

  // The deterministic semantic score in the same trial must not be mistaken for the judge's row: the judge
  // still has to run for that side.
  expect([...reusable.keys()]).toEqual([COUNTERFACTUAL_TRIAL]);
});
