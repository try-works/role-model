import { expect, test } from "vitest";
import * as trackBRuntime from "../src/track-b-runtime.js";

test("Run 96 R12-R23 observation-only production path refuses learning without a distinct counterfactual", async () => {
  const invoked: Array<{ id: string; envelope: Record<string, unknown> }> = [];
  const durableLearningMutations: string[] = [];
  const runtime = {
    async invoke(id: string, envelope: Record<string, unknown>) {
      invoked.push({ id, envelope });
      if (id === "profile-learner" && envelope.capability === "profile:estimate") {
        durableLearningMutations.push("profile-learner:profile:estimate");
      }
      if (id === "knowledge-worker" && envelope.capability === "knowledge:eval-consumer") {
        durableLearningMutations.push("knowledge-worker:knowledge:eval-consumer");
      }
      const base = {
        workerPid: 1000 + invoked.length,
        durableLocator: {
          extensionId: id,
          requestId: envelope.requestId,
          invocation: invoked.length,
        },
        evidenceRef: `evidence:${id}:${String(envelope.requestId)}`,
        businessOutput: {
          extensionId: id,
          capability: envelope.capability,
          invocation: invoked.length,
        },
        readCapability: "artifact:read",
      };
      if (id === "artifact-store") return { ...base, id: "artifact:r12-r23" };
      if (id === "repository-context") {
        return {
          ...base,
          available: true,
          context: {
            scopeId: "tenant:run96-r12-r23",
            repoFingerprint: "a".repeat(64),
            packageId: null,
            fallbackLevel: "repo_task",
            branchCompatibility: "unknown",
            fingerprintEpoch: 1,
          },
          diagnostics: [],
        };
      }
      if (id === "knowledge-store" && envelope.capability === "knowledge:write") {
        return { ...base, id: "knowledge:r12-r23" };
      }
      return base;
    },
  };

  const result = await trackBRuntime.runTrackBPostObservation(
    runtime,
    {
      requestId: "run96-r12-r23-no-counterfactual",
      routingDecisionId: "decision:run96-r12-r23",
      endpointId: "endpoint:run96",
      modelId: "model:run96",
      reasoningEffort: null,
      effortSource: "none",
      usageEvent: {
        endpoint_id: "endpoint:run96",
        model_id: "model:run96",
      },
    },
    {
      scope: "tenant:run96-r12-r23",
      channel: "development",
      authorizationEpoch: 96,
    },
  );

  expect(result.pipeline).toMatchObject({
    status: "insufficient_comparable_evidence",
    refusalCode: "R14_NO_DISTINCT_COUNTERFACTUAL",
    candidateId: null,
    providerCalls: 0,
    productionMutation: false,
  });
  expect(result.advisory).toBeNull();
  expect(durableLearningMutations).toEqual([]);
  expect(
    invoked.some(
      ({ id, envelope }) => id === "profile-learner" && envelope.capability === "profile:estimate",
    ),
  ).toBe(false);
  expect(
    invoked.some(
      ({ id, envelope }) =>
        id === "knowledge-worker" && envelope.capability === "knowledge:eval-consumer",
    ),
  ).toBe(false);
  expect(
    invoked.some(
      ({ id, envelope }) =>
        id === "profile-learner" && envelope.capability === "profile:consume-projection",
    ),
  ).toBe(false);
  expect(
    invoked.some(
      ({ id, envelope }) =>
        id === "knowledge-worker" && envelope.capability === "knowledge:consume-projection",
    ),
  ).toBe(false);
});

test("Run 97 observations with distinct configured candidates enqueue replay instead of refusing", async () => {
  const invoked: Array<{ id: string; envelope: Record<string, unknown> }> = [];
  const runtime = {
    async invoke(id: string, envelope: Record<string, unknown>) {
      invoked.push({ id, envelope });
      const base = {
        workerPid: 2000 + invoked.length,
        durableLocator: {
          extensionId: id,
          requestId: envelope.requestId,
          invocation: invoked.length,
        },
        evidenceRef: `evidence:${id}:${String(envelope.requestId)}`,
        businessOutput: {
          extensionId: id,
          capability: envelope.capability,
          invocation: invoked.length,
        },
        readCapability: "artifact:read",
      };
      if (id === "artifact-store") return { ...base, id: "artifact:run97" };
      if (id === "repository-context") {
        return {
          ...base,
          available: true,
          context: {
            scopeId: "tenant:run97",
            repoFingerprint: "b".repeat(64),
            packageId: null,
            fallbackLevel: "repo_task",
            branchCompatibility: "unknown",
            fingerprintEpoch: 1,
          },
          diagnostics: [],
        };
      }
      if (id === "knowledge-store" && envelope.capability === "knowledge:write") {
        return { ...base, id: "knowledge:run97" };
      }
      if (id === "background-evidence-scheduler") {
        return { ...base, accepted: true, jobId: "replay-intent:run97-live", leaseId: "lease-1", fence: 1 };
      }
      return base;
    },
  };

  const result = await trackBRuntime.runTrackBPostObservation(
    runtime,
    {
      requestId: "run97-live-request",
      routingDecisionId: "decision:run97",
      endpointId: "endpoint:flash",
      modelId: "model:flash",
      reasoningEffort: null,
      effortSource: "none",
      usageEvent: { endpoint_id: "endpoint:flash", model_id: "model:flash" },
    },
    {
      scope: "tenant:run97",
      channel: "development",
      authorizationEpoch: 97,
      configuredCandidateEndpointIds: ["endpoint:flash", "endpoint:pro", "endpoint:kimi"],
    },
  );

  const receipt = result.pipeline as Record<string, unknown>;
  expect(receipt).toMatchObject({
    status: "replay_enqueued",
    providerCalls: 0,
    productionMutation: false,
    candidateId: null,
    candidateEndpointIds: ["endpoint:kimi", "endpoint:pro"],
  });
  expect(receipt.refusalCode).toBeUndefined();
  // The canonical observation closure still runs, so the post-observation stays
  // durable instead of failing with an incomplete extension closure.
  for (const extensionId of ["replay-core", "evaluation-runner-local", "trajectory-signals"]) {
    expect(invoked.some(({ id }) => id === extensionId)).toBe(true);
  }
  expect(
    invoked.some(
      ({ id, envelope }) =>
        id === "background-evidence-scheduler" &&
        envelope.capability === "scheduler:enqueue-replay-intent",
    ),
  ).toBe(false);
  expect(receipt.replayIntentJobId).toBe("replay-intent:run97-live-request");
  expect(receipt.replayIntentAccepted).toBe(true);
});
