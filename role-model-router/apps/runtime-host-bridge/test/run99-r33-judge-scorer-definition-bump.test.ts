import { expect, test } from "vitest";

import {
  RUN97_PAIRWISE_JUDGE_DEFINITION_VERSION,
  RUN97_PAIRWISE_JUDGE_SCORER_ID,
  createRun97PairwiseJudgeScorer,
} from "../src/track-b-runtime.js";
import { createHash } from "node:crypto";

/**
 * Run 98 addendum 34 S5 (live stage v213, 2026-09-17T12:30Z): the class came back.
 *
 *   `extension evaluation-core failed: duplicate scorer ID has incompatible version`
 *
 * The version was hashed from `{judgeEndpointId, judgeMode}` only, so a change to any *other* part of the
 * definition kept the same `id@version` key while the definition JSON differed — exactly what the
 * registry refuses. Bumping a constant each time is what failed twice already; the structural fix is to
 * derive the version from the whole definition body, so a definition change *is* a new key by
 * construction.
 */

test("run98 A34 S5 the judge scorer key is derived from the whole definition body", () => {
  const scorer = createRun97PairwiseJudgeScorer({
    judgeEndpointId: "deepseek.personal.deepseek-api-key.global.deepseek-v4-pro-high",
    judgeMode: "identity_blind",
  });
  const { version, digest, ...body } = scorer as unknown as Record<string, unknown> & {
    version: string;
    digest: string;
  };
  const canonical = (value: unknown): string => {
    if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
    if (value && typeof value === "object") {
      return `{${Object.keys(value as Record<string, unknown>)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`)
        .join(",")}}`;
    }
    return JSON.stringify(value);
  };
  const expected = `${RUN97_PAIRWISE_JUDGE_DEFINITION_VERSION}+${createHash("sha256")
    .update(canonical(body))
    .digest("hex")
    .slice(0, 12)}`;
  expect(version).toBe(expected);
  expect(digest).toMatch(/^sha256:[a-f0-9]{64}$/);
});

test("run98 A34 S5 the live colliding key is not reused", () => {
  // The durable registry holds this key with an *older* definition; the live runtime refused every
  // comparison because today's definition arrived under it.
  const scorer = createRun97PairwiseJudgeScorer({
    judgeEndpointId: "deepseek.personal.deepseek-api-key.global.deepseek-v4-pro-high",
    judgeMode: "identity_blind",
  });
  expect(scorer.version).not.toBe("2+8ea7ffea02ee");
});

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
