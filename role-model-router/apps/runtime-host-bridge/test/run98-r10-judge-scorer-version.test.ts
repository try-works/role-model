import { expect, test } from "vitest";

import {
  RUN97_PAIRWISE_JUDGE_DEFINITION_VERSION,
  RUN97_PAIRWISE_JUDGE_SCORER_ID,
  RUN96_ROUTING_SHADOW_SCORER_DEFINITION_VERSION,
  createRun96RoutingShadowScorer,
  createRun97PairwiseJudgeScorer,
} from "../src/track-b-runtime.js";

/**
 * Run 98 R10 (AC-R10-03) live defect: the pairwise judge scorer's *definition* varies with the
 * judge endpoint and the judge mode, but its `version` was hardcoded to `"1"`. Evaluation Core
 * keys the durable scorer registry on `id@version` and refuses a different definition under the
 * same key, so the first judge-identity change failed the whole comparison:
 *
 *   `extension evaluation-core failed: duplicate scorer ID has incompatible version`
 *
 * Observed on the stage root at 2026-09-14T08:38Z. The version must follow the definition, so a
 * changed judge identity registers a new scorer instead of colliding with the old one.
 */

test("run98 R10 the judge scorer version changes with the judge identity", () => {
  const baseline = createRun97PairwiseJudgeScorer({ judgeEndpointId: "endpoint:judge-a" });
  const otherEndpoint = createRun97PairwiseJudgeScorer({ judgeEndpointId: "endpoint:judge-b" });
  const identityBlind = createRun97PairwiseJudgeScorer({
    judgeEndpointId: "endpoint:judge-a",
    judgeMode: "identity_blind",
  });
  const identified = createRun97PairwiseJudgeScorer({
    judgeEndpointId: "endpoint:judge-a",
    judgeMode: "identified",
  });

  expect(baseline.id).toBe(RUN97_PAIRWISE_JUDGE_SCORER_ID);
  expect(otherEndpoint.version).not.toBe(baseline.version);
  expect(identityBlind.version).not.toBe(baseline.version);
  expect(identityBlind.version).not.toBe(identified.version);
  expect(new Set([baseline.digest, otherEndpoint.digest, identityBlind.digest]).size).toBe(3);
});

test("run98 R10 the judge scorer version is deterministic, bounded and identity-derived", () => {
  const first = createRun97PairwiseJudgeScorer({
    judgeEndpointId: "endpoint:judge-a",
    judgeMode: "identity_blind",
  });
  const second = createRun97PairwiseJudgeScorer({
    judgeEndpointId: "endpoint:judge-a",
    judgeMode: "identity_blind",
  });
  expect(second).toEqual(first);
  expect(first.version).toMatch(/^[A-Za-z0-9._+-]{1,32}$/);
  // Run 99 R33: the definition gained `judgeMode`, so the shape version moved past the legacy
  // `1+…` registry key. Assert against the exported constant so this pin never goes stale again.
  expect(first.version.startsWith(`${RUN97_PAIRWISE_JUDGE_DEFINITION_VERSION}+`)).toBe(true);
  // The default identity keeps the canonical scorer-set version, so existing bindings that
  // never changed judge identity stay valid.
  const defaultIdentity = createRun97PairwiseJudgeScorer({ judgeEndpointId: "endpoint:judge-a" });
  expect(defaultIdentity.scorerSetVersion).toBe(first.scorerSetVersion.replace(".identity-blind", ""));
});

/**
 * Run 98 addendum 49 (live v291): the *deterministic* scorer kept a hand-maintained `"3"` version, so the
 * moment its definition body changed the same `id@version` key carried different bytes and Evaluation Core
 * refused every registration with `duplicate scorer ID has incompatible version` — which is what the shadow
 * pipeline sat on. Its version now follows the body, exactly like the judge scorer's.
 */
test("run98 a49 the deterministic scorer version follows its definition body", () => {
  const base = createRun96RoutingShadowScorer();
  const sameBody = createRun96RoutingShadowScorer();
  const structured = createRun96RoutingShadowScorer({ algorithm: "structured_assertions" });

  expect(base.version).toBe(sameBody.version);
  expect(base.digest).toBe(sameBody.digest);
  expect(base.version.startsWith(`${RUN96_ROUTING_SHADOW_SCORER_DEFINITION_VERSION}+`)).toBe(true);
  expect(structured.version).not.toBe(base.version);
  expect(structured.digest).not.toBe(base.digest);
  // An explicit version still wins for callers that pin an identity.
  expect(createRun96RoutingShadowScorer({ version: "3" }).version).toBe("3");
});
