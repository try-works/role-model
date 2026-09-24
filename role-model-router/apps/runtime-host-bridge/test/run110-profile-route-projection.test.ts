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
    stateReadback: { knowledge: { available: true }, profile: { state: "available", confidence: 0.5 } },
  });
  expect(result).toEqual({ state: "available", confidence: 0.5 });
});

test("run110 a usable profile readback still wins over the state projection", () => {
  const result = resolveLearningProfileRouteResult({
    profileReadback: { state: "unavailable", reason: "no current estimate for this scope yet" },
    stateReadback: { profile: { state: "available", confidence: 0.5 } },
  });
  expect(result).toEqual({ state: "unavailable", reason: "no current estimate for this scope yet" });
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
