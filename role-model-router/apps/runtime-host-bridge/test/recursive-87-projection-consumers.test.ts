import { expect, test } from "vitest";

import * as trace from "../../../packages/trace/src/index.js";
import * as consumers from "../src/track-b-runtime.js";

test("SP4 host dispatches a provenance-bound projection to every declared shadow consumer", async () => {
  expect(typeof consumers.consumeTrackBProjection).toBe("function");
  expect(typeof trace.createProjectionV2).toBe("function");
  const calls: Array<{ id: string; envelope: Record<string, unknown> }> = [];
  const runtime = {
    invoke: async (id: string, envelope: Record<string, unknown>) => {
      calls.push({ id, envelope });
      return { accepted: true, consumer: id };
    },
  };
  const projection = trace.createProjectionV2({
    scope: "tenant:run87",
    purpose: "routing_shadow",
    permittedUse: true,
    authorizationState: "authorized",
    validUntilMs: null,
    trainingAllowed: true,
    evaluatedAtMs: 10_000,
    evidence: [
      {
        artifactRef: "sha256:projection-evidence",
        sourceHash: `sha256:${"c".repeat(64)}`,
        scope: "tenant:run87",
        verified: true,
        capabilities: ["full_replay"],
      },
    ],
    payload: { expected: "a", actual: "a", routePackage: "candidate-a" },
  });
  const receipt = await consumers.consumeTrackBProjection(runtime, projection, {
    channel: "development",
    authorizationEpoch: 87,
  });
  expect(calls.map((call) => call.id)).toEqual([
    "evaluation-core",
    "profile-learner",
    "knowledge-worker",
  ]);
  expect(receipt).toMatchObject({ consumerCount: 3, productionMutation: false });

  const revoked = trace.downgradeProjectionV2(projection, {
    artifactRef: "sha256:projection-evidence",
    reason: "revoked",
  });
  await expect(
    consumers.consumeTrackBProjection(runtime, revoked, {
      channel: "development",
      authorizationEpoch: 87,
    }),
  ).rejects.toThrow(/unavailable|permitted/i);
});
