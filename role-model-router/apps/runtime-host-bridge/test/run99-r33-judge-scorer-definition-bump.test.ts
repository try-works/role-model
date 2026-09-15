import { expect, test } from "vitest";

import {
  RUN97_PAIRWISE_JUDGE_DEFINITION_VERSION,
  RUN97_PAIRWISE_JUDGE_SCORER_ID,
  createRun97PairwiseJudgeScorer,
} from "../src/track-b-runtime.js";

/**
 * Run 99 R33 (S34 live finding, stage v132 at 2026-09-15): every replay comparison deferred with
 *
 *   `extension evaluation-core failed: duplicate scorer ID has incompatible version`
 *
 * The durable scorer registry already held `role_model_pairwise_judge.battle@1+<hash>` — written
 * before the definition gained `judgeMode`. Today's factory emits a definition that *does* carry
 * `judgeMode`, but keyed it under the same `1+…` version, so Evaluation Core refused the definition
 * it was handed and no comparison could finalize.
 *
 * Evaluation Core keys the registry on `id@version`, so any change to the definition *shape* must
 * bump the version prefix: the new definition then registers under a fresh key and the legacy
 * entry is simply never reused.
 */

test("run99 R33 the judge scorer definition version is bumped past the legacy registry key", () => {
  const scorer = createRun97PairwiseJudgeScorer({ judgeEndpointId: "endpoint:judge-a" });

  expect(scorer.id).toBe(RUN97_PAIRWISE_JUDGE_SCORER_ID);
  expect(RUN97_PAIRWISE_JUDGE_DEFINITION_VERSION).toBeGreaterThanOrEqual(2);
  expect(scorer.version.startsWith(`${RUN97_PAIRWISE_JUDGE_DEFINITION_VERSION}+`)).toBe(true);
  // `1+…` is the pre-`judgeMode` definition shape that already lives in durable registries; reusing
  // that key is precisely the collision this test guards against.
  expect(scorer.version.startsWith("1+")).toBe(false);
});

test("run99 R33 the bumped version keeps judge identity in the key", () => {
  const baseline = createRun97PairwiseJudgeScorer({ judgeEndpointId: "endpoint:judge-a" });
  const otherEndpoint = createRun97PairwiseJudgeScorer({ judgeEndpointId: "endpoint:judge-b" });
  const identityBlind = createRun97PairwiseJudgeScorer({
    judgeEndpointId: "endpoint:judge-a",
    judgeMode: "identity_blind",
  });

  for (const scorer of [baseline, otherEndpoint, identityBlind]) {
    expect(scorer.version.startsWith(`${RUN97_PAIRWISE_JUDGE_DEFINITION_VERSION}+`)).toBe(true);
  }
  expect(new Set([baseline.version, otherEndpoint.version, identityBlind.version]).size).toBe(3);
});
