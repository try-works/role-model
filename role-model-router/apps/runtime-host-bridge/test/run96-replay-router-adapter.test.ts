import { expect, test } from "vitest";

import {
  createReplayIntentScheduler,
  createReplaySourceAttestation,
  createRouterReplayAdapter,
  requireReplayRouterDecisionId,
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

  await expect(
    scheduler.enqueue({
      jobId: "intent:96",
      replayJobId: "replay:96",
      deadlineAtMs: 20_000,
    }),
  ).resolves.toEqual({ accepted: true });
  const claim = await scheduler.claim();
  if (!claim) throw new Error("expected scheduler replay intent claim");
  expect(claim).toMatchObject({
    jobId: "intent:96",
    payload: { replayJobId: "replay:96", scope: "tenant:one" },
    leaseId: "intent:96:1",
    fence: 4,
  });
  await expect(
    scheduler.complete({
      jobId: claim.jobId,
      leaseId: claim.leaseId,
      fence: claim.fence,
      result: { replayJobId: "replay:96", state: "awaiting_evaluation" },
    }),
  ).resolves.toEqual({ completed: true });
  expect(JSON.stringify(invocations)).not.toMatch(/content|prompt|credential|api[_-]?key/i);
});

test("Run96 Phase5 RED: scheduler claims only the replay intent just enqueued by this supervised run", async () => {
  const invocations: Record<string, unknown>[] = [];
  const scheduler = createReplayIntentScheduler({
    runtime: {
      async invoke(_id, envelope) {
        invocations.push(envelope);
        if (envelope.capability === "scheduler:claim-replay-intent") return null;
        return { accepted: true };
      },
    },
    requestId: "request:claim-specific-96",
    channel: "development",
    scope: "tenant:one",
    authorizationEpoch: 96,
    ownerId: "runtime-host:test-96",
  });

  await scheduler.claim({ jobId: "replay-intent:expected" });

  expect(invocations).toContainEqual(
    expect.objectContaining({
      capability: "scheduler:claim-replay-intent",
      value: { jobId: "replay-intent:expected" },
    }),
  );
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
      dispatchIdempotencyKey: "1111111111111111111111111111111111111111111111111111111111111111",
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
      dispatchIdempotencyKey: "1111111111111111111111111111111111111111111111111111111111111111",
      candidatePackage: expect.objectContaining({
        endpointId: "endpoint:counterfactual",
        reasoningEffort: "max",
      }),
    }),
  ]);
});

test("Run96 S3 RED: replay branch capture refuses a missing normal-router decision instead of inventing one", () => {
  expect(() => requireReplayRouterDecisionId(undefined)).toThrow(/normal router decision/i);
  expect(() => requireReplayRouterDecisionId(" ")).toThrow(/normal router decision/i);
  expect(requireReplayRouterDecisionId("decision:replay-96")).toBe("decision:replay-96");
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

  await expect(
    adapter.dispatch({
      schemaVersion: "role-model.replay-dispatch.v1",
      channel: "development",
      scope: "tenant:one",
      replayJobId: "replay:usage-96",
      sourceGeneration: 4,
      sourceDecisionId: "decision:source",
      normalizedRequestRef: "artifact:request",
      candidateEndpointId: "endpoint:counterfactual",
      dispatchIdempotencyKey: "2222222222222222222222222222222222222222222222222222222222222222",
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
    dispatch: async () => ({
      dispatchReceiptId: "x",
      routerDecisionId: "y",
      providerResultRef: "z",
      observedCostMicros: 0,
      observedResponseBytes: 0,
    }),
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
    dispatchIdempotencyKey: "3333333333333333333333333333333333333333333333333333333333333333",
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
  await expect(adapter.dispatch({ ...base, apiKey: "must-never-cross-ipc" })).rejects.toThrow(
    /credential|secret/i,
  );
  await expect(adapter.dispatch({ ...base, toolPolicy: "sandboxed_allowlist" })).rejects.toThrow(
    /tool/i,
  );
});

test("Run96 S3 RED: host orchestration persists router, graph, and evaluation receipts without giving Replay Core a transcript or credential", async () => {
  const invocations: Record<string, unknown>[] = [];
  const dispatches: Record<string, unknown>[] = [];
  const branches: Record<string, unknown>[] = [];
  const evaluationHandoffs: Record<string, unknown>[] = [];
  const causalOrder: string[] = [];
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
              dispatchIdempotencyKey:
                "4444444444444444444444444444444444444444444444444444444444444444",
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
        case "replay:record-evaluation-result":
          return { state: "complete", evaluationJobId: "evaluation:orchestrated", evaluationResult: envelope.value };
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
      causalOrder.push("dispatch");
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

  const supervisedInput: Parameters<typeof runSupervisedReplay>[0] & {
    readonly prepareBranch: (
      request: Readonly<Record<string, unknown>>,
    ) => Promise<{ readonly branchRootRef: string }>;
  } = {
    runtime,
    adapter,
    requestId: "request:orchestrated",
    channel: "development",
    scope: "tenant:one",
    authorizationEpoch: 96,
    sourceAttestation,
    idempotencyKey: "replay:orchestrated",
    intent: "counterfactual_route",
    evaluationCriteriaDigest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    candidatePackages: [
      {
        endpointId: "endpoint:counterfactual",
        modelId: "deepseek/deepseek-v4-pro",
        reasoningEffort: "max",
        promptAdapterId: "prompt:stable-v1",
        toolPolicy: "deny",
        experiencePackId: "experience:none",
        samplingProfileId: "sampling:stable-v1",
      },
    ],
    budget: {
      maxCandidates: 1,
      maxProviderCalls: 1,
      maxCostMicros: 5_000,
      maxBytes: 16_384,
      deadlineMs: 10_000,
    },
    leaseOwner: "scheduler:96",
    leaseMs: 10_000,
    scheduler: scheduler as never,
    prepareBranch: async (request) => {
      causalOrder.push("prepare");
      expect(request).toEqual(
        expect.objectContaining({
          candidateEndpointId: "endpoint:counterfactual",
          sourceDecisionId: "decision:source-96",
        }),
      );
      return { branchRootRef: "artifact:branch:orchestrated" };
    },
    appendBranch: async (request) => {
      causalOrder.push("append");
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
    completeEvaluation: async (request) => ({
      evaluationJobId: request.evaluationJobId,
      comparisonGroupId: "comparison:orchestrated",
      outcome: "tie",
      comparisonDigest: "sha256:orchestrated",
    }),
  };
  await expect(runSupervisedReplay(supervisedInput)).resolves.toMatchObject({
    state: "complete",
    evaluationJobId: "evaluation:orchestrated",
  });

  expect(dispatches).toHaveLength(1);
  expect(causalOrder).toEqual(["prepare", "dispatch", "append"]);
  expect(branches).toEqual([
    expect.objectContaining({ candidateEndpointId: "endpoint:counterfactual" }),
  ]);
  expect(evaluationHandoffs).toEqual([
    expect.objectContaining({
      replayJobId: "replay:orchestrated",
      sourceGeneration: 4,
      resultTraceIds: ["artifact:branch:orchestrated"],
      resultBranches: [
        {
          candidateEndpointId: "endpoint:counterfactual",
          branchRootRef: "artifact:branch:orchestrated",
        },
      ],
      candidates: [expect.objectContaining({ endpointId: "endpoint:counterfactual" })],
    }),
  ]);
  expect(
    invocations
      .filter((item) => item.id === "background-evidence-scheduler")
      .map((item) => (item.envelope as Record<string, unknown>).capability),
  ).toEqual([
    "scheduler:enqueue-replay-intent",
    "scheduler:claim-replay-intent",
    "scheduler:complete-replay-intent",
  ]);
  expect(invocations).toEqual(expect.arrayContaining([
    expect.objectContaining({
      id: "replay-core",
      envelope: expect.objectContaining({
        capability: "replay:record-evaluation-result",
        value: expect.objectContaining({
          evaluation: expect.objectContaining({ comparisonGroupId: "comparison:orchestrated", outcome: "tie" }),
        }),
      }),
    }),
  ]));
  expect(JSON.stringify(invocations)).not.toContain("source-only host transcript");
  expect(JSON.stringify(invocations)).not.toMatch(/api[_-]?key|credential|secret/i);
});

test("Run96 S3 RED: host orchestration preserves a bounded rate-limit failure before replay retry", async () => {
  let providerFailure: Record<string, unknown> | null = null;
  const runtime = {
    async invoke(id: string, envelope: Record<string, unknown>) {
      expect(id).toBe("replay-core");
      switch (envelope.capability) {
        case "replay:create-job":
          return { jobId: "replay:router-failure" };
        case "replay:claim-job":
          return { fenceToken: 7, leaseOwner: "scheduler:router-failure" };
        case "replay:prepare-dispatch":
          return {
            status: "provider_dispatch",
            envelope: {
              schemaVersion: "role-model.replay-dispatch.v1",
              channel: "development",
              scope: "tenant:one",
              replayJobId: "replay:router-failure",
              sourceGeneration: 4,
              sourceDecisionId: "decision:source-failure",
              normalizedRequestRef: "artifact:request-failure",
              candidateEndpointId: "endpoint:counterfactual",
              dispatchIdempotencyKey:
                "5555555555555555555555555555555555555555555555555555555555555555",
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
            },
          };
        case "replay:record-provider-failure":
          providerFailure = envelope.value as Record<string, unknown>;
          return {
            status: "retryable_failure",
            replayJobId: "replay:router-failure",
            candidateEndpointId: "endpoint:counterfactual",
          };
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
      rootArtifactId: "artifact:root-failure",
      routingDecisionId: "decision:source-failure",
      endpointId: "endpoint:baseline",
      trace: { generation: 4, readiness: "ready", rootOccurrenceId: "occurrence:root-failure" },
      messages: [{ role: "user", content: "must remain host-only" }],
    },
    normalizedRequestRef: "artifact:request-failure",
    sharedPrefixRef: "artifact:prefix-failure",
    forkOccurrenceId: "occurrence:root-failure",
    policySnapshotRef: "artifact:policy-failure",
    capturePolicyRef: "artifact:capture-policy-failure",
    eligibleEndpointIds: ["endpoint:baseline", "endpoint:counterfactual"],
  });

  await expect(
    runSupervisedReplay({
      runtime,
      adapter: {
        protocolVersion: "role-model.router-replay-adapter.v1",
        authenticated: true,
        channel: "development",
        scope: "tenant:one",
        async dispatch() {
          throw Object.assign(new Error("provider rate limit"), { code: "rate_limit" });
        },
      },
      requestId: "request:router-failure",
      channel: "development",
      scope: "tenant:one",
      authorizationEpoch: 96,
      sourceAttestation,
      idempotencyKey: "replay:router-failure",
      intent: "counterfactual_route",
      evaluationCriteriaDigest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      candidatePackages: [
        {
          endpointId: "endpoint:counterfactual",
          modelId: "deepseek/deepseek-v4-pro",
          reasoningEffort: "max",
          promptAdapterId: "prompt:stable-v1",
          toolPolicy: "deny",
          experiencePackId: "experience:none",
          samplingProfileId: "sampling:stable-v1",
        },
      ],
      budget: {
        maxCandidates: 1,
        maxProviderCalls: 1,
        maxCostMicros: 5_000,
        maxBytes: 16_384,
        deadlineMs: 10_000,
      },
      leaseOwner: "scheduler:router-failure",
      leaseMs: 10_000,
      prepareBranch: async () => ({ branchRootRef: "artifact:prepared-router-failure" }),
      appendBranch: async () => {
        throw new Error("router failure must not append a branch");
      },
      handoffEvaluation: async () => {
        throw new Error("router failure must not hand off evaluation");
      },
    }),
  ).rejects.toThrow("provider rate limit");

  expect(providerFailure).toMatchObject({
    jobId: "replay:router-failure",
    candidateEndpointId: "endpoint:counterfactual",
    leaseOwner: "scheduler:router-failure",
    fenceToken: 7,
    failure: { code: "rate_limit", message: "provider rate limit", retryable: true },
  });
});

test("Run96 S3 regression: timeout retries while a partial provider result is terminal", async () => {
  for (const [code, retryable] of [
    ["timeout", true],
    ["partial_response", false],
  ] as const) {
    let providerFailure: Record<string, unknown> | null = null;
    const runtime = {
      async invoke(id: string, envelope: Record<string, unknown>) {
        expect(id).toBe("replay-core");
        switch (envelope.capability) {
          case "replay:create-job":
            return { jobId: `replay:${code}` };
          case "replay:claim-job":
            return { fenceToken: 7, leaseOwner: "scheduler:failure-kind" };
          case "replay:prepare-dispatch":
            return {
              status: "provider_dispatch",
              envelope: {
                schemaVersion: "role-model.replay-dispatch.v1",
                channel: "development",
                scope: "tenant:one",
                replayJobId: `replay:${code}`,
                sourceGeneration: 4,
                sourceDecisionId: "decision:failure-kind",
                normalizedRequestRef: "artifact:request-failure-kind",
                candidateEndpointId: "endpoint:counterfactual",
                dispatchIdempotencyKey:
                  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
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
              },
            };
          case "replay:record-provider-failure":
            providerFailure = envelope.value as Record<string, unknown>;
            return { status: retryable ? "retryable_failure" : "failed" };
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
        rootArtifactId: "artifact:root-failure-kind",
        routingDecisionId: "decision:failure-kind",
        endpointId: "endpoint:baseline",
        trace: {
          generation: 4,
          readiness: "ready",
          rootOccurrenceId: "occurrence:root-failure-kind",
        },
        replaySource: {
          schemaVersion: "role-model.route-capture-replay-source.v1",
          normalizedRequestRef: "artifact:request-failure-kind",
          sharedPrefixRef: "artifact:prefix-failure-kind",
          forkOccurrenceId: "occurrence:root-failure-kind",
          policySnapshotRef: "artifact:policy-failure-kind",
          capturePolicyRef: "artifact:capture-policy-failure-kind",
        },
      },
      eligibleEndpointIds: ["endpoint:baseline", "endpoint:counterfactual"],
    });
    await expect(
      runSupervisedReplay({
        runtime,
        adapter: {
          protocolVersion: "role-model.router-replay-adapter.v1",
          authenticated: true,
          channel: "development",
          scope: "tenant:one",
          async dispatch() {
            throw Object.assign(new Error(`provider ${code}`), { code });
          },
        },
        requestId: `request:${code}`,
        channel: "development",
        scope: "tenant:one",
        authorizationEpoch: 96,
        sourceAttestation,
        idempotencyKey: `replay:${code}`,
        intent: "counterfactual_route",
        evaluationCriteriaDigest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        candidatePackages: [
          {
            endpointId: "endpoint:counterfactual",
            modelId: "deepseek/deepseek-v4-pro",
            reasoningEffort: "max",
            promptAdapterId: "prompt:stable-v1",
            toolPolicy: "deny",
            experiencePackId: "experience:none",
            samplingProfileId: "sampling:stable-v1",
          },
        ],
        budget: {
          maxCandidates: 1,
          maxProviderCalls: 1,
          maxCostMicros: 5_000,
          maxBytes: 16_384,
          deadlineMs: 10_000,
        },
        leaseOwner: "scheduler:failure-kind",
        leaseMs: 10_000,
        prepareBranch: async () => ({ branchRootRef: "artifact:prepared-failure-kind" }),
        appendBranch: async () => {
          throw new Error("must not append failed provider result");
        },
        handoffEvaluation: async () => {
          throw new Error("must not evaluate failed provider result");
        },
      }),
    ).rejects.toThrow(`provider ${code}`);
    expect(providerFailure).toMatchObject({ failure: { code, retryable } });
  }
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
          evaluationResult: {
            evaluationJobId: "evaluation:already-complete",
            comparisonGroupId: "comparison:already-complete",
            comparisonDigest: "sha256:already-complete",
            outcome: "tie",
          },
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
      evaluationCriteriaDigest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      candidatePackages: [
        {
          endpointId: "endpoint:counterfactual",
          modelId: "deepseek/deepseek-v4-pro",
          reasoningEffort: "max",
          promptAdapterId: "prompt:stable-v1",
          toolPolicy: "deny",
          experiencePackId: "experience:none",
          samplingProfileId: "sampling:stable-v1",
        },
      ],
      budget: {
        maxCandidates: 1,
        maxProviderCalls: 1,
        maxCostMicros: 5_000,
        maxBytes: 16_384,
        deadlineMs: 10_000,
      },
      leaseOwner: "scheduler:96",
      leaseMs: 10_000,
      prepareBranch: async () => ({ branchRootRef: "must-not-run" }),
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

test("Run96 Phase5 RED: an idempotent replay awaiting evaluation returns its durable receipt without reclaiming", async () => {
  const invocations: Record<string, unknown>[] = [];
  const runtime = {
    async invoke(_id: string, envelope: Record<string, unknown>) {
      invocations.push(envelope);
      if (envelope.capability === "replay:create-job") {
        return {
          jobId: "replay:already-awaiting-evaluation",
          state: "awaiting_evaluation",
          evaluationJobId: "evaluation:already-awaiting-evaluation",
        };
      }
      throw new Error("an awaiting evaluation replay must not be reclaimed");
    },
  };
  const sourceAttestation = createReplaySourceAttestation({
    channel: "development",
    scope: "tenant:one",
    authorizationEpoch: 96,
    capture: {
      schemaVersion: "role-model.route-capture-read.v2",
      scope: "tenant:one",
      rootArtifactId: "artifact:root-awaiting-evaluation",
      routingDecisionId: "decision:source-awaiting-evaluation",
      endpointId: "endpoint:baseline",
      trace: { generation: 4, readiness: "ready", rootOccurrenceId: "occurrence:root-awaiting-evaluation" },
      replaySource: {
        schemaVersion: "role-model.route-capture-replay-source.v1",
        normalizedRequestRef: "artifact:request-awaiting-evaluation",
        sharedPrefixRef: "artifact:prefix-awaiting-evaluation",
        forkOccurrenceId: "occurrence:root-awaiting-evaluation",
        policySnapshotRef: "artifact:policy-awaiting-evaluation",
        capturePolicyRef: "artifact:capture-policy-awaiting-evaluation",
      },
    },
    eligibleEndpointIds: ["endpoint:baseline", "endpoint:counterfactual"],
  });
  const adapter = createRouterReplayAdapter({
    channel: "development",
    scope: "tenant:one",
    authorizationEpoch: 96,
    dispatch: async () => {
      throw new Error("an awaiting evaluation replay must not dispatch");
    },
  });
  await expect(
    runSupervisedReplay({
      runtime,
      adapter,
      requestId: "request:awaiting-evaluation",
      channel: "development",
      scope: "tenant:one",
      authorizationEpoch: 96,
      sourceAttestation,
      idempotencyKey: "replay:awaiting-evaluation",
      intent: "counterfactual_route",
      evaluationCriteriaDigest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
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
      prepareBranch: async () => ({ branchRootRef: "must-not-run" }),
      appendBranch: async () => ({ branchRootRef: "must-not-run" }),
      handoffEvaluation: async () => ({ evaluationJobId: "must-not-run" }),
    }),
  ).resolves.toMatchObject({
    jobId: "replay:already-awaiting-evaluation",
    state: "awaiting_evaluation",
    evaluationJobId: "evaluation:already-awaiting-evaluation",
  });
  expect(invocations).toHaveLength(1);
});

test("Run96 S3 regression: a retry resumes durable evaluation without redispatching the provider", async () => {
  const invocations: Array<{ id: string; envelope: Record<string, unknown> }> = [];
  const runtime = {
    async invoke(id: string, envelope: Record<string, unknown>) {
      invocations.push({ id, envelope });
      switch (envelope.capability) {
        case "replay:create-job":
          return {
            jobId: "replay:recover-evaluation", state: "awaiting_evaluation",
            evaluationJobId: "evaluation:recover-evaluation",
            resultTraceIds: ["artifact:branch:recover-evaluation"],
            branches: [{ candidateEndpointId: "endpoint:counterfactual", branchRootRef: "artifact:branch:recover-evaluation" }],
          };
        case "replay:claim-job":
          return { fenceToken: 17, leaseOwner: "scheduler:recover-evaluation" };
        case "replay:record-evaluation-result":
          return { state: "complete", jobId: "replay:recover-evaluation", evaluationJobId: "evaluation:recover-evaluation" };
        default:
          throw new Error(`unexpected capability ${String(envelope.capability)}`);
      }
    },
  };
  const sourceAttestation = createReplaySourceAttestation({
    channel: "development", scope: "tenant:one", authorizationEpoch: 96,
    capture: {
      schemaVersion: "role-model.route-capture-read.v2", scope: "tenant:one",
      rootArtifactId: "artifact:root:recover-evaluation", routingDecisionId: "decision:recover-evaluation",
      endpointId: "endpoint:baseline",
      trace: { generation: 4, readiness: "ready", rootOccurrenceId: "occurrence:recover-evaluation" },
      replaySource: { schemaVersion: "role-model.route-capture-replay-source.v1", normalizedRequestRef: "artifact:request:recover-evaluation", sharedPrefixRef: "artifact:prefix:recover-evaluation", forkOccurrenceId: "occurrence:recover-evaluation", policySnapshotRef: "artifact:policy:recover-evaluation", capturePolicyRef: "artifact:capture-policy:recover-evaluation" },
    },
    eligibleEndpointIds: ["endpoint:baseline", "endpoint:counterfactual"],
  });
  await expect(runSupervisedReplay({
    runtime,
    adapter: createRouterReplayAdapter({ channel: "development", scope: "tenant:one", authorizationEpoch: 96, dispatch: async () => { throw new Error("must not redispatch"); } }),
    requestId: "request:recover-evaluation", channel: "development", scope: "tenant:one", authorizationEpoch: 96,
    sourceAttestation, idempotencyKey: "replay:recover-evaluation", intent: "counterfactual_route",
    evaluationCriteriaDigest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    candidatePackages: [{ endpointId: "endpoint:counterfactual", modelId: "deepseek/deepseek-v4-pro", reasoningEffort: "max", promptAdapterId: "prompt:stable-v1", toolPolicy: "deny", experiencePackId: "experience:none", samplingProfileId: "deterministic-v1" }],
    budget: { maxCandidates: 1, maxProviderCalls: 1, maxCostMicros: 5_000, maxBytes: 16_384, deadlineMs: 10_000 },
    leaseOwner: "scheduler:recover-evaluation", leaseMs: 10_000,
    prepareBranch: async () => ({ branchRootRef: "must-not-run" }), appendBranch: async () => ({ branchRootRef: "must-not-run" }),
    handoffEvaluation: async () => ({ evaluationJobId: "must-not-run" }),
    completeEvaluation: async (request) => {
      expect(request).toMatchObject({ recovery: true, evaluationJobId: "evaluation:recover-evaluation" });
      return { evaluationJobId: "evaluation:recover-evaluation", comparisonGroupId: "comparison:recover-evaluation", outcome: "incomplete" };
    },
  })).resolves.toMatchObject({ state: "complete", jobId: "replay:recover-evaluation" });
  expect(invocations.map((item) => item.envelope.capability)).toEqual([
    "replay:create-job", "replay:claim-job", "replay:record-evaluation-result",
  ]);
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
              dispatchIdempotencyKey:
                "6666666666666666666666666666666666666666666666666666666666666666",
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
      trace: {
        generation: 4,
        readiness: "ready",
        rootOccurrenceId: "occurrence:root-cancelled-late",
      },
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
      evaluationCriteriaDigest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      candidatePackages: [
        {
          endpointId: "endpoint:counterfactual",
          modelId: "deepseek/deepseek-v4-pro",
          reasoningEffort: "max",
          promptAdapterId: "prompt:stable-v1",
          toolPolicy: "deny",
          experiencePackId: "experience:none",
          samplingProfileId: "sampling:stable-v1",
        },
      ],
      budget: {
        maxCandidates: 1,
        maxProviderCalls: 1,
        maxCostMicros: 5_000,
        maxBytes: 16_384,
        deadlineMs: 10_000,
      },
      leaseOwner: "scheduler:cancelled-late",
      leaseMs: 10_000,
      prepareBranch: async () => ({ branchRootRef: "artifact:prepared-cancelled-late" }),
      appendBranch: async () => ({ branchRootRef: "must-not-run" }),
      handoffEvaluation: async () => {
        handoffCount += 1;
        return { evaluationJobId: "must-not-run" };
      },
    }),
  ).resolves.toMatchObject({ jobId: "replay:cancelled-late", state: "cancelled" });
  expect(handoffCount).toBe(0);
  expect(
    invocations.map((item) => (item.envelope as Record<string, unknown>).capability),
  ).not.toContain("replay:record-evaluation-receipt");
});

test("Run96 Phase5 RED: an expired scheduler receipt does not erase an already-durable replay completion", async () => {
  const sourceAttestation = createReplaySourceAttestation({
    channel: "development",
    scope: "tenant:one",
    authorizationEpoch: 96,
    capture: {
      schemaVersion: "role-model.route-capture-read.v2",
      scope: "tenant:one",
      rootArtifactId: "artifact:root-expired-scheduler",
      routingDecisionId: "decision:source-expired-scheduler",
      endpointId: "endpoint:baseline",
      trace: {
        generation: 4,
        readiness: "ready",
        rootOccurrenceId: "occurrence:root-expired-scheduler",
      },
    },
    normalizedRequestRef: "artifact:request-expired-scheduler",
    sharedPrefixRef: "artifact:prefix-expired-scheduler",
    forkOccurrenceId: "occurrence:root-expired-scheduler",
    policySnapshotRef: "artifact:policy-expired-scheduler",
    capturePolicyRef: "artifact:capture-policy-expired-scheduler",
    eligibleEndpointIds: ["endpoint:baseline", "endpoint:counterfactual"],
  });
  const runtime = {
    async invoke(_id: string, envelope: Record<string, unknown>) {
      switch (envelope.capability) {
        case "replay:create-job":
          return { jobId: "replay:expired-scheduler" };
        case "replay:claim-job":
          return { fenceToken: 1, leaseOwner: "scheduler:expired" };
        case "replay:prepare-dispatch":
          return {
            status: "provider_dispatch",
            envelope: {
              schemaVersion: "role-model.replay-dispatch.v1",
              channel: "development",
              scope: "tenant:one",
              replayJobId: "replay:expired-scheduler",
              sourceGeneration: 4,
              sourceDecisionId: "decision:source-expired-scheduler",
              normalizedRequestRef: "artifact:request-expired-scheduler",
              candidateEndpointId: "endpoint:counterfactual",
              dispatchIdempotencyKey: "7".repeat(64),
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
            },
          };
        case "replay:record-provider-receipt":
          return {
            status: "append_recovery",
            branchRequest: {
              replayJobId: "replay:expired-scheduler",
              candidateEndpointId: "endpoint:counterfactual",
              dispatchReceiptId: "dispatch:expired-scheduler",
            },
          };
        case "replay:record-branch-append":
          return { status: "awaiting_evaluation" };
        case "replay:record-evaluation-receipt":
          return { state: "awaiting_evaluation", evaluationJobId: "evaluation:expired-scheduler" };
        default:
          throw new Error(`unexpected capability ${String(envelope.capability)}`);
      }
    },
  };
  const adapter = createRouterReplayAdapter({
    channel: "development",
    scope: "tenant:one",
    authorizationEpoch: 96,
    dispatch: async () => ({
      dispatchReceiptId: "dispatch:expired-scheduler",
      routerDecisionId: "decision:replay-expired-scheduler",
      providerResultRef: "artifact:provider-expired-scheduler",
      observedCostMicros: 0,
      observedResponseBytes: 0,
    }),
  });
  const scheduler = {
    enqueue: async () => ({ accepted: true }),
    claim: async () => ({
      jobId: "intent:expired-scheduler",
      payload: { replayJobId: "replay:expired-scheduler", scope: "tenant:one" },
      leaseId: "lease:expired-scheduler",
      fence: 1,
      attempt: 1,
      deadlineAtMs: 1,
    }),
    complete: async () => ({ completed: false }),
    fail: async () => ({ failed: false }),
  };
  await expect(
    runSupervisedReplay({
      runtime,
      adapter,
      requestId: "request:expired-scheduler",
      channel: "development",
      scope: "tenant:one",
      authorizationEpoch: 96,
      sourceAttestation,
      idempotencyKey: "replay:expired-scheduler",
      intent: "counterfactual_route",
      evaluationCriteriaDigest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      candidatePackages: [
        {
          endpointId: "endpoint:counterfactual",
          modelId: "deepseek/deepseek-v4-pro",
          reasoningEffort: "max",
          promptAdapterId: "prompt:stable-v1",
          toolPolicy: "deny",
          experiencePackId: "experience:none",
          samplingProfileId: "sampling:stable-v1",
        },
      ],
      budget: {
        maxCandidates: 1,
        maxProviderCalls: 1,
        maxCostMicros: 5_000,
        maxBytes: 16_384,
        deadlineMs: 10_000,
      },
      leaseOwner: "scheduler:expired",
      leaseMs: 10_000,
      scheduler,
      prepareBranch: async () => ({ branchRootRef: "artifact:branch-expired-scheduler" }),
      appendBranch: async () => ({ branchRootRef: "artifact:branch-expired-scheduler" }),
      handoffEvaluation: async () => ({ evaluationJobId: "evaluation:expired-scheduler" }),
    }),
  ).resolves.toMatchObject({
    jobId: "replay:expired-scheduler",
    state: "awaiting_evaluation",
    schedulerState: "completion_not_accepted",
  });
});
