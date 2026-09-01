import { expect, test } from "vitest";

import {
  createReplayIntentScheduler,
  createReplaySourceAttestation,
  createRouterReplayAdapter,
  runSupervisedReplay,
} from "../src/track-b-runtime.js";

test("Run96 S3 RED: the public host uses authenticated scheduler intents that contain only replay references", async () => {
  const invocations: Record<string, unknown>[] = [];
  const scheduler = createReplayIntentScheduler({
    runtime: {
      async invoke(id, envelope) {
        invocations.push({ id, envelope });
        if (envelope.capability === "scheduler:enqueue-replay-intent") return { accepted: true };
        if (envelope.capability === "scheduler:claim-replay-intent") {
          return {
            jobId: "intent:96",
            payload: { replayJobId: "replay:96", scope: "tenant:one" },
            leaseId: "intent:96:1",
            fence: 4,
            attempt: 1,
            deadlineAtMs: 20_000,
          };
        }
        if (envelope.capability === "scheduler:complete-replay-intent") return { completed: true };
        throw new Error(`unexpected capability ${String(envelope.capability)}`);
      },
    },
    requestId: "request:scheduler-96",
    channel: "development",
    scope: "tenant:one",
    authorizationEpoch: 96,
    ownerId: "runtime-host:test-96",
  });

  await expect(scheduler.enqueue({
    jobId: "intent:96",
    replayJobId: "replay:96",
    deadlineAtMs: 20_000,
  })).resolves.toEqual({ accepted: true });
  const claim = await scheduler.claim();
  if (!claim) throw new Error("expected scheduler replay intent claim");
  expect(claim).toMatchObject({
    jobId: "intent:96",
    payload: { replayJobId: "replay:96", scope: "tenant:one" },
    leaseId: "intent:96:1",
    fence: 4,
  });
  await expect(scheduler.complete({
    jobId: claim.jobId,
    leaseId: claim.leaseId,
    fence: claim.fence,
    result: { replayJobId: "replay:96", state: "awaiting_evaluation" },
  })).resolves.toEqual({ completed: true });
  expect(JSON.stringify(invocations)).not.toMatch(/content|prompt|credential|api[_-]?key/i);
});

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

test("Run96 S3 RED: the host refuses to invent replay provenance when the durable capture does not expose it", () => {
  const capture = {
    schemaVersion: "role-model.route-capture-read.v2",
    scope: "tenant:one",
    rootArtifactId: "artifact:root-96",
    routingDecisionId: "decision:source-96",
    endpointId: "endpoint:baseline",
    trace: {
      generation: 4,
      readiness: "ready",
      rootOccurrenceId: "occurrence:root-96",
    },
    replaySource: {
      schemaVersion: "role-model.route-capture-replay-source.v1",
      normalizedRequestRef: "artifact:request-96",
      sharedPrefixRef: "artifact:prefix-96",
      forkOccurrenceId: "occurrence:root-96",
      policySnapshotRef: "artifact:policy-96",
      capturePolicyRef: "artifact:capture-policy-96",
    },
  };
  expect(
    createReplaySourceAttestation({
      channel: "development",
      scope: "tenant:one",
      authorizationEpoch: 96,
      capture,
      eligibleEndpointIds: ["endpoint:baseline"],
    }),
  ).toMatchObject({
    traceRoot: {
      normalizedRequestRef: "artifact:request-96",
      sharedPrefixRef: "artifact:prefix-96",
      policySnapshotRef: "artifact:policy-96",
      capturePolicyRef: "artifact:capture-policy-96",
    },
  });
  const { replaySource: _omitted, ...legacyCapture } = capture;
  expect(() =>
    createReplaySourceAttestation({
      channel: "development",
      scope: "tenant:one",
      authorizationEpoch: 96,
      capture: legacyCapture,
      eligibleEndpointIds: ["endpoint:baseline"],
    }),
  ).toThrow(/durable replay source/i);
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
        observedCostMicros: 0,
        observedResponseBytes: 0,
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
    observedCostMicros: 0,
    observedResponseBytes: 0,
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

test("Run96 S3 RED: the host adapter returns only bounded numeric usage for Replay Core budget accounting", async () => {
  const adapter = createRouterReplayAdapter({
    channel: "development",
    scope: "tenant:one",
    authorizationEpoch: 96,
    dispatch: async () => ({
      dispatchReceiptId: "dispatch:usage-96",
      routerDecisionId: "decision:usage-96",
      providerResultRef: "artifact:provider-result-usage-96",
      observedCostMicros: 4_999,
      observedResponseBytes: 512,
      outputText: "must not cross the replay boundary",
    }),
  });

  await expect(adapter.dispatch({
    schemaVersion: "role-model.replay-dispatch.v1",
    channel: "development",
    scope: "tenant:one",
    replayJobId: "replay:usage-96",
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
    budget: { maxCandidates: 1, maxProviderCalls: 1, maxCostMicros: 5_000, maxBytes: 16_384, deadlineMs: 10_000 },
    toolPolicy: "deny",
  })).resolves.toEqual({
    dispatchReceiptId: "dispatch:usage-96",
    routerDecisionId: "decision:usage-96",
    providerResultRef: "artifact:provider-result-usage-96",
    observedCostMicros: 4_999,
    observedResponseBytes: 512,
  });
});

test("Run96 S3 RED: the host replay adapter fails closed for cross-boundary or credential-bearing dispatches", async () => {
  const adapter = createRouterReplayAdapter({
    channel: "development",
    scope: "tenant:one",
    authorizationEpoch: 96,
    dispatch: async () => ({ dispatchReceiptId: "x", routerDecisionId: "y", providerResultRef: "z", observedCostMicros: 0, observedResponseBytes: 0 }),
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

test("Run96 S3 RED: host orchestration persists router, graph, and evaluation receipts without giving Replay Core a transcript or credential", async () => {
  const invocations: Record<string, unknown>[] = [];
  const dispatches: Record<string, unknown>[] = [];
  const branches: Record<string, unknown>[] = [];
  const evaluationHandoffs: Record<string, unknown>[] = [];
  const runtime = {
    async invoke(id: string, envelope: Record<string, unknown>) {
      invocations.push({ id, envelope });
      if (id === "background-evidence-scheduler") {
        switch (envelope.capability) {
          case "scheduler:enqueue-replay-intent":
            return { accepted: true };
          case "scheduler:claim-replay-intent":
            return {
              jobId: "intent:orchestrated",
              payload: { replayJobId: "replay:orchestrated", scope: "tenant:one" },
              leaseId: "intent:orchestrated:1",
              fence: 4,
              attempt: 1,
              deadlineAtMs: 20_000,
            };
          case "scheduler:complete-replay-intent":
            return { completed: true };
          default:
            throw new Error(`unexpected scheduler capability ${String(envelope.capability)}`);
        }
      }
      expect(id).toBe("replay-core");
      const value = envelope.value as Record<string, unknown>;
      switch (envelope.capability) {
        case "replay:create-job":
          return { jobId: "replay:orchestrated" };
        case "replay:claim-job":
          return { fenceToken: 3, leaseOwner: "scheduler:96" };
        case "replay:prepare-dispatch":
          return {
            status: "provider_dispatch",
            envelope: {
              schemaVersion: "role-model.replay-dispatch.v1",
              channel: "development",
              scope: "tenant:one",
              replayJobId: "replay:orchestrated",
              sourceGeneration: 4,
              sourceDecisionId: "decision:source-96",
              normalizedRequestRef: "artifact:request-96",
              candidateEndpointId: "endpoint:counterfactual",
              candidatePackage: value.candidatePackages ?? {
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
            },
          };
        case "replay:record-provider-receipt":
          return {
            status: "append_recovery",
            branchRequest: {
              replayJobId: "replay:orchestrated",
              candidateEndpointId: "endpoint:counterfactual",
              dispatchReceiptId: "dispatch:orchestrated",
            },
          };
        case "replay:record-branch-append":
          return { status: "awaiting_evaluation" };
        case "replay:record-evaluation-receipt":
          return { state: "awaiting_evaluation", evaluationJobId: "evaluation:orchestrated" };
        default:
          throw new Error(`unexpected capability ${String(envelope.capability)}`);
      }
    },
  };
  const adapter = createRouterReplayAdapter({
    channel: "development",
    scope: "tenant:one",
    authorizationEpoch: 96,
    dispatch: async (request) => {
      dispatches.push(request);
      return {
        dispatchReceiptId: "dispatch:orchestrated",
        routerDecisionId: "decision:replay-96",
        providerResultRef: "artifact:provider-result-96",
        observedCostMicros: 0,
        observedResponseBytes: 0,
      };
    },
  });
  const scheduler = createReplayIntentScheduler({
    runtime,
    requestId: "request:orchestrated",
    channel: "development",
    scope: "tenant:one",
    authorizationEpoch: 96,
    ownerId: "runtime-host:orchestrated",
  });
  const sourceAttestation = createReplaySourceAttestation({
    channel: "development",
    scope: "tenant:one",
    authorizationEpoch: 96,
    capture: {
      schemaVersion: "role-model.route-capture-read.v2",
      scope: "tenant:one",
      rootArtifactId: "artifact:root-96",
      routingDecisionId: "decision:source-96",
      endpointId: "endpoint:baseline",
      trace: { generation: 4, readiness: "ready", rootOccurrenceId: "occurrence:root-96" },
      messages: [{ role: "user", content: "source-only host transcript" }],
    },
    normalizedRequestRef: "artifact:request-96",
    sharedPrefixRef: "artifact:prefix-96",
    forkOccurrenceId: "occurrence:root-96",
    policySnapshotRef: "artifact:policy-96",
    capturePolicyRef: "artifact:capture-policy-96",
    eligibleEndpointIds: ["endpoint:baseline", "endpoint:counterfactual"],
  });

  await expect(
    runSupervisedReplay({
      runtime,
      adapter,
      requestId: "request:orchestrated",
      channel: "development",
      scope: "tenant:one",
      authorizationEpoch: 96,
      sourceAttestation,
      idempotencyKey: "replay:orchestrated",
      intent: "counterfactual_route",
      candidatePackages: [{
        endpointId: "endpoint:counterfactual",
        modelId: "deepseek/deepseek-v4-pro",
        reasoningEffort: "max",
        promptAdapterId: "prompt:stable-v1",
        toolPolicy: "deny",
        experiencePackId: "experience:none",
        samplingProfileId: "sampling:stable-v1",
      }],
      budget: { maxCandidates: 1, maxProviderCalls: 1, maxCostMicros: 5_000, maxBytes: 16_384, deadlineMs: 10_000 },
      leaseOwner: "scheduler:96",
      leaseMs: 10_000,
      scheduler: scheduler as never,
      appendBranch: async (request) => {
        branches.push(request);
        return { branchRootRef: "artifact:branch:orchestrated" };
      },
      handoffEvaluation: async (request) => {
        evaluationHandoffs.push(request);
        return {
          evaluationJobId: "evaluation:orchestrated",
          source: request.sourceDecisionId,
        };
      },
    }),
  ).resolves.toMatchObject({ state: "awaiting_evaluation", evaluationJobId: "evaluation:orchestrated" });

  expect(dispatches).toHaveLength(1);
  expect(branches).toEqual([expect.objectContaining({ candidateEndpointId: "endpoint:counterfactual" })]);
  expect(evaluationHandoffs).toEqual([
    expect.objectContaining({
      replayJobId: "replay:orchestrated",
      sourceGeneration: 4,
      resultTraceIds: ["artifact:branch:orchestrated"],
      resultBranches: [{
        candidateEndpointId: "endpoint:counterfactual",
        branchRootRef: "artifact:branch:orchestrated",
      }],
      candidates: [expect.objectContaining({ endpointId: "endpoint:counterfactual" })],
    }),
  ]);
  expect(invocations.filter((item) => item.id === "background-evidence-scheduler").map((item) =>
    (item.envelope as Record<string, unknown>).capability,
  )).toEqual([
    "scheduler:enqueue-replay-intent",
    "scheduler:claim-replay-intent",
    "scheduler:complete-replay-intent",
  ]);
  expect(JSON.stringify(invocations)).not.toContain("source-only host transcript");
  expect(JSON.stringify(invocations)).not.toMatch(/api[_-]?key|credential|secret/i);
});

test("Run96 S3 RED: a completed idempotent replay returns its durable receipt without reclaiming or redispatching", async () => {
  const invocations: Record<string, unknown>[] = [];
  const runtime = {
    async invoke(_id: string, envelope: Record<string, unknown>) {
      invocations.push(envelope);
      if (envelope.capability === "replay:create-job") {
        return {
          jobId: "replay:already-complete",
          state: "complete",
          evaluationJobId: "evaluation:already-complete",
        };
      }
      throw new Error("a completed replay must not be reclaimed");
    },
  };
  const attestation = createReplaySourceAttestation({
    channel: "development",
    scope: "tenant:one",
    authorizationEpoch: 96,
    capture: {
      schemaVersion: "role-model.route-capture-read.v2",
      scope: "tenant:one",
      rootArtifactId: "artifact:root-idempotent",
      routingDecisionId: "decision:source-idempotent",
      endpointId: "endpoint:baseline",
      trace: { generation: 4, readiness: "ready", rootOccurrenceId: "occurrence:root-idempotent" },
      replaySource: {
        schemaVersion: "role-model.route-capture-replay-source.v1",
        normalizedRequestRef: "artifact:request-idempotent",
        sharedPrefixRef: "artifact:prefix-idempotent",
        forkOccurrenceId: "occurrence:root-idempotent",
        policySnapshotRef: "artifact:policy-idempotent",
        capturePolicyRef: "artifact:capture-policy-idempotent",
      },
    },
    eligibleEndpointIds: ["endpoint:baseline", "endpoint:counterfactual"],
  });
  const adapter = createRouterReplayAdapter({
    channel: "development",
    scope: "tenant:one",
    authorizationEpoch: 96,
    dispatch: async () => {
      throw new Error("a completed replay must not dispatch");
    },
  });
  await expect(
    runSupervisedReplay({
      runtime,
      adapter,
      requestId: "request:idempotent",
      channel: "development",
      scope: "tenant:one",
      authorizationEpoch: 96,
      sourceAttestation: attestation,
      idempotencyKey: "replay:idempotent",
      intent: "counterfactual_route",
      candidatePackages: [{
        endpointId: "endpoint:counterfactual",
        modelId: "deepseek/deepseek-v4-pro",
        reasoningEffort: "max",
        promptAdapterId: "prompt:stable-v1",
        toolPolicy: "deny",
        experiencePackId: "experience:none",
        samplingProfileId: "sampling:stable-v1",
      }],
      budget: { maxCandidates: 1, maxProviderCalls: 1, maxCostMicros: 5_000, maxBytes: 16_384, deadlineMs: 10_000 },
      leaseOwner: "scheduler:96",
      leaseMs: 10_000,
      appendBranch: async () => ({ branchRootRef: "must-not-run" }),
      handoffEvaluation: async () => ({ evaluationJobId: "must-not-run" }),
    }),
  ).resolves.toMatchObject({
    jobId: "replay:already-complete",
    state: "complete",
    evaluationJobId: "evaluation:already-complete",
  });
  expect(invocations).toHaveLength(1);
});

test("Run96 S3 RED: a late-cancelled replay never hands incomplete branches to Evaluation Core", async () => {
  const invocations: Record<string, unknown>[] = [];
  let handoffCount = 0;
  const runtime = {
    async invoke(id: string, envelope: Record<string, unknown>) {
      invocations.push({ id, envelope });
      switch (envelope.capability) {
        case "replay:create-job":
          return { jobId: "replay:cancelled-late" };
        case "replay:claim-job":
          return { fenceToken: 1, leaseOwner: "scheduler:cancelled-late" };
        case "replay:prepare-dispatch":
          return {
            status: "provider_dispatch",
            envelope: {
              schemaVersion: "role-model.replay-dispatch.v1",
              channel: "development",
              scope: "tenant:one",
              replayJobId: "replay:cancelled-late",
              sourceGeneration: 4,
              sourceDecisionId: "decision:source-cancelled-late",
              normalizedRequestRef: "artifact:request-cancelled-late",
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
              budget: { maxCandidates: 1, maxProviderCalls: 1, maxCostMicros: 5_000, maxBytes: 16_384, deadlineMs: 10_000 },
              toolPolicy: "deny",
            },
          };
        case "replay:record-provider-receipt":
          return { status: "cancelled_late", replayJobId: "replay:cancelled-late" };
        default:
          throw new Error(`unexpected capability ${String(envelope.capability)}`);
      }
    },
  };
  const sourceAttestation = createReplaySourceAttestation({
    channel: "development",
    scope: "tenant:one",
    authorizationEpoch: 96,
    capture: {
      schemaVersion: "role-model.route-capture-read.v2",
      scope: "tenant:one",
      rootArtifactId: "artifact:root-cancelled-late",
      routingDecisionId: "decision:source-cancelled-late",
      endpointId: "endpoint:baseline",
      trace: { generation: 4, readiness: "ready", rootOccurrenceId: "occurrence:root-cancelled-late" },
    },
    normalizedRequestRef: "artifact:request-cancelled-late",
    sharedPrefixRef: "artifact:prefix-cancelled-late",
    forkOccurrenceId: "occurrence:root-cancelled-late",
    policySnapshotRef: "artifact:policy-cancelled-late",
    capturePolicyRef: "artifact:capture-policy-cancelled-late",
    eligibleEndpointIds: ["endpoint:baseline", "endpoint:counterfactual"],
  });
  const adapter = createRouterReplayAdapter({
    channel: "development",
    scope: "tenant:one",
    authorizationEpoch: 96,
    dispatch: async () => ({
      dispatchReceiptId: "dispatch:cancelled-late",
      routerDecisionId: "decision:cancelled-late",
      providerResultRef: "artifact:provider-cancelled-late",
      observedCostMicros: 0,
      observedResponseBytes: 0,
    }),
  });
  await expect(
    runSupervisedReplay({
      runtime,
      adapter,
      requestId: "request:cancelled-late",
      channel: "development",
      scope: "tenant:one",
      authorizationEpoch: 96,
      sourceAttestation,
      idempotencyKey: "replay:cancelled-late",
      intent: "counterfactual_route",
      candidatePackages: [{
        endpointId: "endpoint:counterfactual",
        modelId: "deepseek/deepseek-v4-pro",
        reasoningEffort: "max",
        promptAdapterId: "prompt:stable-v1",
        toolPolicy: "deny",
        experiencePackId: "experience:none",
        samplingProfileId: "sampling:stable-v1",
      }],
      budget: { maxCandidates: 1, maxProviderCalls: 1, maxCostMicros: 5_000, maxBytes: 16_384, deadlineMs: 10_000 },
      leaseOwner: "scheduler:cancelled-late",
      leaseMs: 10_000,
      appendBranch: async () => ({ branchRootRef: "must-not-run" }),
      handoffEvaluation: async () => {
        handoffCount += 1;
        return { evaluationJobId: "must-not-run" };
      },
    }),
  ).resolves.toMatchObject({ jobId: "replay:cancelled-late", state: "cancelled" });
  expect(handoffCount).toBe(0);
  expect(invocations.map((item) => (item.envelope as Record<string, unknown>).capability)).not.toContain(
    "replay:record-evaluation-receipt",
  );
});
