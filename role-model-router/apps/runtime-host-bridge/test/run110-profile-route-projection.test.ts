import { expect, test } from "vitest";

import { resolveLearningProfileRouteResult } from "../src/index.js";

/**
 * Run 110: the profile route must answer with a state, whichever readback can supply it.
 *
 * Measured live on `run109b-9edb1133`: `/api/role-model/operator/learning/profile` answered 503
 * `operator_capability_unavailable` with `detail: private transport answered null for operator/learning/profile`
 * - the client's own projection, because the packaged runtime is given no private operations endpoint - while
 * `records`, `decisions`, `policy` and `rollout` answered 200 on the same build. The sibling *state* route
 * (`/api/role-model/operator/learning`) does answer in-process and carries the same profile projection, so the
 * route projects from it; with no estimate anywhere it answers the bounded state the Learning overview renders.
 */

const unavailableProjection = {
  schemaVersion: "role-model.operator-status.v1",
  overall: "unavailable",
  error: "operator_capability_unavailable",
  capability: "learning profile inspection",
  detail: "private transport answered null for operator/learning/profile",
};

test("run110 the state readback's profile projection answers when the profile client is unavailable", () => {
  const result = resolveLearningProfileRouteResult({
    profileReadback: unavailableProjection,
    stateReadback: {
      knowledge: { available: true },
      profile: { state: "available", confidence: 0.5 },
    },
  });
  expect(result).toEqual({ state: "available", confidence: 0.5 });
});

test("run110 a usable profile readback still wins over the state projection", () => {
  const result = resolveLearningProfileRouteResult({
    profileReadback: { state: "unavailable", reason: "no current estimate for this scope yet" },
    stateReadback: { profile: { state: "available", confidence: 0.5 } },
  });
  expect(result).toEqual({
    state: "unavailable",
    reason: "no current estimate for this scope yet",
  });
});

test("run110 with no estimate anywhere the answer is the bounded state, never the transport error", () => {
  const result = resolveLearningProfileRouteResult({
    profileReadback: unavailableProjection,
    stateReadback: { knowledge: { available: true } },
  });
  expect(result).toEqual({
    schemaVersion: "role-model.learning-profile-inspection.v1",
    state: "unavailable",
    reason: "no current estimate for this scope yet",
  });
  expect(result.error).toBeUndefined();
});

test("run110 a thrown readback (no options at all) still answers a state", () => {
  expect(resolveLearningProfileRouteResult({})).toMatchObject({ state: "unavailable" });
});

/**
 * Run 113 (addendum 09 R7). Measured live: the profile learner held an *active* estimate with route-package
 * attribution, and every readback answered "no current estimate for this scope yet" - because the usable check
 * accepted only `state` in {available, unavailable} or an array-valued `effects`, while the learner answers
 * `state: "active"` with an object. The learner's document is the authority; the route projects it into the
 * bounded inspection document instead of discarding it.
 */
const liveEstimateGeneration = {
  schemaVersion: "role-model.profile-estimate-generation.v1",
  generationId: "estimate:default:d92cceb6",
  generationKey: "default",
  generation: 1,
  state: "active",
  estimateDigest: "d461a6b05057cb2244e7429cfc12b7ca918b44188835fedd9083b0e82d4ea61b",
  effects: {
    routePackage: {
      valueCount: 1,
      groups: [
        {
          valueDigest: "a948d32256467cd013855d8479b3fd6849d39ccdd544358ae8c3f854056c2639",
          sampleCount: 3,
          estimate: 0.67,
          confidence: "insufficient_sample",
          evidenceRefs: [
            "artifact:70166bc7d75d1188a9da514304dc95111e52d0b918358b06a1776f92c4e7971e",
          ],
        },
      ],
    },
  },
};

test("run113 an active estimate generation is projected, not reported as absent", () => {
  const result = resolveLearningProfileRouteResult({ profileReadback: liveEstimateGeneration });
  expect(result).toMatchObject({
    schemaVersion: "role-model.learning-profile-inspection.v1",
    state: "available",
    reason: null,
    generationKey: "default",
    generation: 1,
    estimateState: "active",
    sampleCount: 3,
  });
  expect(result.effects).toEqual(liveEstimateGeneration.effects);
});

test("run113 the state readback's estimate is projected the same way the direct readback is", () => {
  const result = resolveLearningProfileRouteResult({
    profileReadback: unavailableProjection,
    stateReadback: { profile: liveEstimateGeneration },
  });
  expect(result).toMatchObject({ state: "available", sampleCount: 3 });
});

test("run113 an estimate without the documented members is still reported as absent, not invented", () => {
  const result = resolveLearningProfileRouteResult({
    profileReadback: { schemaVersion: "role-model.profile-store.v1", estimateGenerations: [] },
  });
  expect(result).toEqual({
    schemaVersion: "role-model.learning-profile-inspection.v1",
    state: "unavailable",
    reason: "no current estimate for this scope yet",
  });
});
