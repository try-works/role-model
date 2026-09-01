import { expect, test } from "vitest";

import {
  createReplaySourceAttestation,
  createRouterReplayAdapter,
} from "../src/track-b-runtime.js";

test("Run96 S3 RED: the public host derives a bounded replay source attestation from a durable graph receipt", () => {
  const attestation = createReplaySourceAttestation({
    channel: "development",
    scope: "tenant:one",
    authorizationEpoch: 96,
    capture: {
      schemaVersion: "role-model.route-capture-read.v2",
      scope: "tenant:one",
      rootArtifactId: "artifact:root-96",
      routingDecisionId: "decision:source-96",
      endpointId: "endpoint:baseline",
      trace: {
        generation: 4,
        readiness: "ready",
        rootOccurrenceId: "occurrence:root-96",
        headOccurrenceId: "occurrence:response-96",
      },
      messages: [{ role: "user", content: "must not cross replay attestation IPC" }],
    },
    normalizedRequestRef: "artifact:request-96",
    sharedPrefixRef: "artifact:prefix-96",
    forkOccurrenceId: "occurrence:root-96",
    policySnapshotRef: "artifact:policy-96",
    capturePolicyRef: "artifact:capture-policy-96",
    eligibleEndpointIds: ["endpoint:baseline", "endpoint:counterfactual"],
  });

  expect(attestation).toEqual({
    schemaVersion: "role-model.replay-source-attestation.v1",
    channel: "development",
    scope: "tenant:one",
    authorizationEpoch: 96,
    traceRoot: expect.objectContaining({
      traceRootId: "artifact:root-96",
      sourceDecisionId: "decision:source-96",
      generation: 4,
      readiness: "ready",
      retentionState: "available",
      selectedEndpointId: "endpoint:baseline",
      eligibleEndpointIds: ["endpoint:baseline", "endpoint:counterfactual"],
    }),
  });
  expect(JSON.stringify(attestation)).not.toContain("must not cross replay attestation IPC");
});

test("Run96 S3 RED: the host exposes a versioned scope-bound router replay adapter without provider credentials", async () => {
  const received: Record<string, unknown>[] = [];
  const adapter = createRouterReplayAdapter({
    channel: "development",
    scope: "tenant:one",
    authorizationEpoch: 96,
    dispatch: async (request) => {
      received.push(request);
      return {
        dispatchReceiptId: "dispatch:96",
        routerDecisionId: "decision:96",
        providerResultRef: "artifact:provider-result-96",
      };
    },
  });

  expect(adapter).toMatchObject({
    protocolVersion: "role-model.router-replay-adapter.v1",
    authenticated: true,
    channel: "development",
    scope: "tenant:one",
  });
  await expect(
    adapter.dispatch({
      schemaVersion: "role-model.replay-dispatch.v1",
      channel: "development",
      scope: "tenant:one",
      replayJobId: "replay:96",
      sourceGeneration: 4,
      sourceDecisionId: "decision:source",
      normalizedRequestRef: "artifact:request",
      candidateEndpointId: "endpoint:counterfactual",
      candidatePackage: {
        endpointId: "endpoint:counterfactual",
        modelId: "deepseek/deepseek-v4-pro",
        reasoningEffort: "max",
        promptAdapterId: "prompt:stable-v1",
        toolPolicy: "deny",
        experiencePackId: "experience:none",
        samplingProfileId: "sampling:stable-v1",
      },
      budget: {
        maxCandidates: 1,
        maxProviderCalls: 1,
        maxCostMicros: 5_000,
        maxBytes: 16_384,
        deadlineMs: 10_000,
      },
      toolPolicy: "deny",
    }),
  ).resolves.toEqual({
    dispatchReceiptId: "dispatch:96",
    routerDecisionId: "decision:96",
    providerResultRef: "artifact:provider-result-96",
  });
  expect(received).toEqual([
    expect.objectContaining({
      authorizationEpoch: 96,
      source: "replay-core",
      replayJobId: "replay:96",
      candidateEndpointId: "endpoint:counterfactual",
      candidatePackage: expect.objectContaining({
        endpointId: "endpoint:counterfactual",
        reasoningEffort: "max",
      }),
    }),
  ]);
});

test("Run96 S3 RED: the host replay adapter fails closed for cross-boundary or credential-bearing dispatches", async () => {
  const adapter = createRouterReplayAdapter({
    channel: "development",
    scope: "tenant:one",
    authorizationEpoch: 96,
    dispatch: async () => ({ dispatchReceiptId: "x", routerDecisionId: "y", providerResultRef: "z" }),
  });
  const base = {
    schemaVersion: "role-model.replay-dispatch.v1",
    channel: "development",
    scope: "tenant:one",
    replayJobId: "replay:96",
    sourceGeneration: 4,
    sourceDecisionId: "decision:source",
    normalizedRequestRef: "artifact:request",
    candidateEndpointId: "endpoint:counterfactual",
    candidatePackage: {
      endpointId: "endpoint:counterfactual",
      modelId: "deepseek/deepseek-v4-pro",
      reasoningEffort: "max",
      promptAdapterId: "prompt:stable-v1",
      toolPolicy: "deny",
      experiencePackId: "experience:none",
      samplingProfileId: "sampling:stable-v1",
    },
    budget: {
      maxCandidates: 1,
      maxProviderCalls: 1,
      maxCostMicros: 5_000,
      maxBytes: 16_384,
      deadlineMs: 10_000,
    },
    toolPolicy: "deny",
  };
  await expect(adapter.dispatch({ ...base, scope: "tenant:two" })).rejects.toThrow(/scope/i);
  await expect(adapter.dispatch({ ...base, apiKey: "must-never-cross-ipc" })).rejects.toThrow(/credential|secret/i);
  await expect(adapter.dispatch({ ...base, toolPolicy: "sandboxed_allowlist" })).rejects.toThrow(/tool/i);
});
