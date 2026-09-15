import { createHash } from "node:crypto";

import { expect, test } from "vitest";

import {
  buildSupervisedReplayEvaluationReferences,
  createSupervisedReplayEvaluationCompleter,
  deriveSupervisedReplayTrajectoryEvents,
  persistSupervisedReplayEvaluationCaseReferences,
  persistSupervisedReplayEvaluationReferenceFacts,
} from "../src/cli.js";
import {
  type TrackBShadowPipelineInput,
  type TrackBShadowPipelineRuntime,
  createReplaySourceAttestation,
  createRouterReplayAdapter,
  createRun96RoutingShadowScorer,
  runSupervisedReplay,
  runTrackBShadowPipeline,
} from "../src/track-b-runtime.js";

const routingShadowScorer = createRun96RoutingShadowScorer();

const artifactId = (pattern: string): string =>
  pattern.repeat(Math.ceil(64 / pattern.length)).slice(0, 64);

function durableCapture(seed: string) {
  const ids =
    seed === "1"
      ? ["1", "2", "3", "4", "5", "6", "7"].map(artifactId)
      : ["8", "9", "a", "b", "c", "d", "e"].map(artifactId);
  const [
    rootArtifactId,
    routeDecisionArtifactId,
    responseArtifactId,
    providerArtifactId,
    messageArtifactId,
    sharedPrefixRef,
    policySnapshotRef,
  ] = ids;
  return {
    schemaVersion: "role-model.route-capture-read.v2",
    scope: "tenant:run96",
    rootArtifactId,
    routingDecisionId: `decision:${seed}`,
    endpointId: `endpoint:${seed}`,
    modelId: `model:${seed}`,
    // Run 99 R33 S33: a recovered capture carries the family the request was routed for.
    taskTypeId: "coder.review",
    responseArtifactId,
    routeDecisionArtifactId,
    providerArtifactIds: [providerArtifactId],
    messageArtifactIds: [messageArtifactId],
    replaySource: {
      schemaVersion: "role-model.route-capture-replay-source.v1",
      normalizedRequestRef: sharedPrefixRef,
      sharedPrefixRef,
      policySnapshotRef,
      capturePolicyRef: policySnapshotRef,
    },
    trace: {
      generation: 1,
      readiness: "ready",
      traceId: `trace:${seed}`,
      rootOccurrenceId: `trace:${seed}:root`,
      headOccurrenceId: `trace:${seed}:response`,
      leafOccurrenceIds: [`trace:${seed}:response`],
      lastSequence: 4,
    },
  };
}

test("Run96 CLI completeEvaluation binds fresh and recovery evaluation refs to durable captures", () => {
  const sourceCapture = durableCapture("1");
  const counterfactualCapture = durableCapture("8");
  const result = buildSupervisedReplayEvaluationReferences({
    sourceCapture,
    counterfactualCaptures: [counterfactualCapture],
    caseIds: ["case:run96:source", "case:run96:counterfactual"],
    referenceFacts: {
      taskRef: `artifact:${artifactId("f")}`,
      inputRef: `artifact:${artifactId("0")}`,
      toolPolicyDigest: `artifact:${artifactId("f0")}`,
      environmentDigest: `artifact:${artifactId("0f")}`,
    },
  });

  const refs = result.evaluationReferences;
  const comparisonRefs = [
    refs.taskRef,
    refs.inputRef,
    refs.forkRef,
    refs.toolPolicyDigest,
    refs.environmentDigest,
    refs.sourceEvidenceRef,
    refs.counterfactualEvidenceRef,
    refs.sourceOutcomeRef,
    refs.counterfactualOutcomeRef,
  ];
  expect(new Set(comparisonRefs).size).toBe(comparisonRefs.length);
  expect(comparisonRefs.every((reference) => /^artifact:[a-f0-9]{64}$/.test(reference))).toBe(true);
  expect(refs.perCase).toEqual([
    { caseId: "case:run96:source", evidenceRef: expect.stringMatching(/^artifact:[a-f0-9]{64}$/) },
    {
      caseId: "case:run96:counterfactual",
      evidenceRef: expect.stringMatching(/^artifact:[a-f0-9]{64}$/),
    },
  ]);
  expect(new Set(refs.perCase.map((row) => row.evidenceRef)).size).toBe(refs.perCase.length);
  expect(result.rolloutReferences).toEqual([
    {
      evidenceRef: `artifact:${sourceCapture.rootArtifactId}`,
      artifactRef: `artifact:${sourceCapture.routeDecisionArtifactId}`,
      outcomeRef: `artifact:${sourceCapture.providerArtifactIds[0]}`,
    },
    {
      evidenceRef: `artifact:${counterfactualCapture.rootArtifactId}`,
      artifactRef: `artifact:${counterfactualCapture.routeDecisionArtifactId}`,
      outcomeRef: `artifact:${counterfactualCapture.providerArtifactIds[0]}`,
    },
  ]);
});

test("Run96 CLI case references are materialized by artifact-store", async () => {
  const sourceCapture = durableCapture("1");
  const counterfactualCapture = durableCapture("8");
  const calls: Record<string, unknown>[] = [];
  const runtime = {
    async invoke(id: string, envelope: Record<string, unknown>) {
      calls.push({ id, envelope });
      return { id: artifactId(calls.length === 1 ? "f" : "0") };
    },
  };

  const references = await persistSupervisedReplayEvaluationCaseReferences({
    runtime,
    requestId: "supervised-replay:source:job",
    channel: "development",
    scope: "tenant:run96",
    authorizationEpoch: 96,
    caseIds: ["case:run96:source", "case:run96:counterfactual"],
    captures: [sourceCapture, counterfactualCapture],
  });

  expect(references).toEqual([`artifact:${artifactId("f")}`, `artifact:${artifactId("0")}`]);
  expect(calls).toHaveLength(2);
  expect(calls.every((call) => call.id === "artifact-store")).toBe(true);
  expect(
    calls.every((call) => (call.envelope as Record<string, unknown>).capability === "graph:write"),
  ).toBe(true);
  const firstPayload = (calls[0].envelope as Record<string, unknown>).payload as Record<
    string,
    unknown
  >;
  expect(firstPayload.scope).toBe("tenant:run96");
  expect((firstPayload.record as Record<string, unknown>).schema).toBe(
    "role-model.evaluation-case-reference.v1",
  );
});

test("Run96 CLI persists and reads back independent evaluation reference facts", async () => {
  const stored = new Map<string, string>();
  let next = 0;
  const runtime = {
    async invoke(id: string, envelope: Record<string, unknown>) {
      expect(id).toBe("artifact-store");
      const capability = envelope.capability;
      const payload = envelope.payload as Record<string, unknown>;
      if (capability === "graph:write") {
        const record = payload.record as Record<string, unknown>;
        const content = String(record.content);
        const id = artifactId(["f", "0", "1", "2"][next++] ?? "3");
        stored.set(id, content);
        return { id };
      }
      if (capability === "artifact:read") {
        const id = String(payload.id);
        return stored.get(id) ?? null;
      }
      throw new Error(`unexpected capability ${String(capability)}`);
    },
  };

  const facts = await persistSupervisedReplayEvaluationReferenceFacts({
    runtime,
    requestId: "supervised-replay:source:job",
    channel: "development",
    scope: "tenant:run96",
    authorizationEpoch: 96,
    facts: {
      task: { sourceDecisionId: "decision:source", criteriaDigest: "sha256:task" },
      input: { normalizedRequestRef: `artifact:${artifactId("1")}` },
      toolPolicy: { policySnapshotRef: `artifact:${artifactId("2")}`, toolPolicy: "deny" },
      environment: { channel: "development", scope: "tenant:run96", authorizationEpoch: 96 },
    },
  });

  expect(facts).toEqual({
    taskRef: `artifact:${artifactId("f")}`,
    inputRef: `artifact:${artifactId("0")}`,
    toolPolicyDigest: `artifact:${artifactId("1")}`,
    environmentDigest: `artifact:${artifactId("2")}`,
  });
  expect(stored.size).toBe(4);
  expect(
    [...stored.values()].every((value) => {
      const record = JSON.parse(value) as Record<string, unknown>;
      return record.schemaVersion === "role-model.evaluation-reference-fact.v1";
    }),
  ).toBe(true);
});

test("Run96 CLI reads reference facts through the real extension business-output envelope", async () => {
  const stored = new Map<string, string>();
  const ids = [artifactId("a"), artifactId("b"), artifactId("c"), artifactId("d")];
  let next = 0;
  // The packaged extension host never returns a bare string: every business
  // result crosses the worker boundary inside the durable-output envelope.
  const runtime = {
    async invoke(id: string, envelope: Record<string, unknown>) {
      expect(id).toBe("artifact-store");
      const capability = envelope.capability;
      const payload = envelope.payload as Record<string, unknown>;
      if (capability === "graph:write") {
        const record = payload.record as Record<string, unknown>;
        const content = String(record.content);
        const storedId = ids[next++] ?? artifactId("e");
        stored.set(storedId, content);
        return {
          id: storedId,
          businessOutput: { id: storedId },
          durableLocator: { extensionId: id, requestId: envelope.requestId, capability },
        };
      }
      if (capability === "artifact:read") {
        const content = stored.get(String(payload.id)) ?? null;
        return {
          value: content,
          businessOutput: { value: content },
          durableLocator: { extensionId: id, requestId: envelope.requestId, capability },
          evidenceRef: "extension-output:fixture",
          readCapability: "extension-output:read",
        };
      }
      throw new Error(`unexpected capability ${String(capability)}`);
    },
  };

  const facts = await persistSupervisedReplayEvaluationReferenceFacts({
    runtime,
    requestId: "supervised-replay:source:envelope",
    channel: "development",
    scope: "tenant:run96",
    authorizationEpoch: 96,
    facts: {
      task: { sourceDecisionId: "decision:source", criteriaDigest: "sha256:task" },
      input: { normalizedRequestRef: "artifact:prefix" },
      toolPolicy: { policySnapshotRef: "artifact:policy", toolPolicy: "deny" },
      environment: { channel: "development", scope: "tenant:run96", authorizationEpoch: 96 },
    },
  });

  expect(facts).toEqual({
    taskRef: `artifact:${ids[0]}`,
    inputRef: `artifact:${ids[1]}`,
    toolPolicyDigest: `artifact:${ids[2]}`,
    environmentDigest: `artifact:${ids[3]}`,
  });
});

test("Run96 CLI forwards only durable captured trajectory events in stable order", () => {
  const sourceCapture = {
    ...durableCapture("1"),
    trajectoryEvents: [
      { type: "provider_error", sequence: 4, evidenceRef: `artifact:${artifactId("1")}` },
      { type: "user_correction", sequence: 2, evidenceRef: `artifact:${artifactId("2")}` },
    ],
  };
  const counterfactualCapture = {
    ...durableCapture("8"),
    trajectoryEvents: [
      { type: "regeneration", sequence: 3, evidenceRef: `artifact:${artifactId("3")}` },
    ],
  };

  expect(
    deriveSupervisedReplayTrajectoryEvents({
      sourceCapture,
      counterfactualCaptures: [counterfactualCapture],
    }),
  ).toEqual([
    { type: "user_correction", sequence: 2, evidenceRef: `artifact:${artifactId("2")}` },
    { type: "regeneration", sequence: 3, evidenceRef: `artifact:${artifactId("3")}` },
    { type: "provider_error", sequence: 4, evidenceRef: `artifact:${artifactId("1")}` },
  ]);
  expect(
    deriveSupervisedReplayTrajectoryEvents({
      sourceCapture: durableCapture("1"),
      counterfactualCaptures: [durableCapture("8")],
    }),
  ).toEqual([]);
});

test("Run96 CLI production completion uses the same durable join for fresh and recovery", async () => {
  const sourceCapture = {
    ...durableCapture("1"),
    // Run 99 R33 S33: the capture records the family the request was routed for.
    taskTypeId: "coder.review",
    response: { content: "source output" },
  };
  const counterfactualCapture = {
    ...durableCapture("8"),
    routingDecisionId: "decision:counterfactual-96",
    endpointId: "endpoint:counterfactual-96",
    modelId: "model:counterfactual-96",
    outputText: "counterfactual output",
  };
  const candidate = {
    endpointId: "endpoint:counterfactual-96",
    modelId: "model:counterfactual-96",
    reasoningEffort: "max",
  } as const;
  const referenceArtifactIds = ["ab", "cd", "ef", "f0", "0f", "a0", "b0", "c0", "d0"];
  const makeRuntime = () => {
    const stored = new Map<string, string>();
    let next = 0;
    return {
      async invoke(id: string, envelope: Record<string, unknown>) {
        expect(id).toBe("artifact-store");
        const capability = envelope.capability;
        const payload = envelope.payload as Record<string, unknown>;
        if (capability === "graph:write") {
          const record = payload.record as Record<string, unknown>;
          const artifact = artifactId(referenceArtifactIds[next++] ?? "e0");
          stored.set(artifact, String(record.content));
          return { id: artifact };
        }
        if (capability === "artifact:read") {
          return stored.get(String(payload.id)) ?? null;
        }
        throw new Error(`unexpected artifact-store capability ${String(capability)}`);
      },
    };
  };
  const pipelineInputs: Record<string, unknown>[] = [];
  const makeCompleter = (recovery: boolean) => {
    const runtime = makeRuntime();
    return createSupervisedReplayEvaluationCompleter({
      runtime,
      operations: {
        async readLocalRouteCapture(input) {
          expect(input.requestId).toMatch(/-branch$/);
          return counterfactualCapture;
        },
      },
      requestId: "request:run96-source",
      channel: "development",
      scope: "tenant:run96",
      sourceCapture,
      sourceOutput: "source output",
      sourceEndpointId: "endpoint:source-96",
      sourceModelId: "model:source-96",
      counterfactualPackages: [candidate],
      getDispatched: (endpointId) =>
        recovery
          ? undefined
          : {
              replayRequestId: "replay:fresh:candidate",
              execution: {
                routingDecisionId: "decision:counterfactual-96",
                outputText: "counterfactual output",
              },
            },
      evaluationCriteria: {
        schemaVersion: "role-model.semantic-criteria.v1",
        requiredTerms: ["output"],
      },
      evaluationCriteriaDigest: `sha256:${artifactId("99")}`,
      runPipeline: async (_runtime, pipelineInput) => {
        pipelineInputs.push(pipelineInput as unknown as Record<string, unknown>);
        return {
          evaluation: { groupId: "comparison:run96", outcome: "incomplete" },
          candidate: { state: "insufficient_trajectory_evidence" },
        } as never;
      },
    });
  };

  await makeCompleter(false)({
    evaluationJobId: "evaluation:run96:fresh",
    replayJobId: "replay:run96:fresh",
    resultBranches: [
      {
        candidateEndpointId: candidate.endpointId,
        branchRootRef: counterfactualCapture.rootArtifactId,
      },
    ],
  });
  await makeCompleter(true)({
    evaluationJobId: "evaluation:run96:recovery",
    replayJobId: "replay:run96:recovery",
    replayJob: {
      dispatches: {
        [candidate.endpointId]: {
          result: {
            providerResultRef: "route-capture:replay:recovery:candidate",
            routerDecisionId: "decision:counterfactual-96",
          },
        },
      },
      branches: [
        {
          endpointId: candidate.endpointId,
          branchRootRef: counterfactualCapture.rootArtifactId,
        },
      ],
    },
  });

  expect(pipelineInputs).toHaveLength(2);
  for (const pipelineInput of pipelineInputs) {
    const references = pipelineInput.evaluationReferences as Record<string, unknown>;
    const comparisonReferences = [
      references.taskRef,
      references.inputRef,
      references.forkRef,
      references.toolPolicyDigest,
      references.environmentDigest,
      references.sourceEvidenceRef,
      references.counterfactualEvidenceRef,
      references.sourceOutcomeRef,
      references.counterfactualOutcomeRef,
    ];
    expect(
      comparisonReferences.every(
        (reference) => typeof reference === "string" && /^artifact:[a-f0-9]{64}$/.test(reference),
      ),
    ).toBe(true);
    expect(new Set(comparisonReferences).size).toBe(comparisonReferences.length);
    expect(pipelineInput.trajectoryEvents).toEqual([]);
    expect(pipelineInput.evaluationCases).toHaveLength(2);
  }
});

test("Run96 CLI production completion reaches trusted Evaluation Core and declines unsupported learning", async () => {
  const sourceCapture = {
    ...durableCapture("1"),
    response: { content: "source output" },
  };
  const counterfactualCapture = {
    ...durableCapture("8"),
    routingDecisionId: "decision:counterfactual-96",
    endpointId: "endpoint:counterfactual-96",
    modelId: "model:counterfactual-96",
    outputText: "counterfactual output",
  };
  const candidate = {
    endpointId: "endpoint:counterfactual-96",
    modelId: "model:counterfactual-96",
    reasoningEffort: "max",
  } as const;
  const hash = (value: string) => createHash("sha256").update(value).digest("hex");
  const stored = new Map<string, string>();
  const writes = ["ab", "cd", "ef", "f0", "0f", "a0", "b0", "c0", "d0", "e0", "e1", "e2"];
  let writeIndex = 0;
  let trialIndex = 0;
  const attestations: Record<string, unknown>[] = [];
  const runtime: TrackBShadowPipelineRuntime = {
    async invoke(id, envelope) {
      const capability = String(envelope.capability ?? "");
      if (id === "artifact-store" && capability === "graph:write") {
        const payload = envelope.payload as Record<string, unknown>;
        const record = payload.record as Record<string, unknown>;
        const artifact = artifactId(writes[writeIndex++] ?? "d0");
        stored.set(artifact, String(record.content));
        return { id: artifact };
      }
      if (id === "artifact-store" && capability === "artifact:read") {
        const payload = envelope.payload as Record<string, unknown>;
        return (stored.get(String(payload.id)) ?? null) as unknown as Record<string, unknown>;
      }
      if (id === "replay-core" && capability === "replay:plan-graph") {
        return {
          sourceDecisionId: sourceCapture.routingDecisionId,
          sourceGraphRef: `artifact:${sourceCapture.rootArtifactId}`,
          sharedPrefixRef: `artifact:${sourceCapture.replaySource.sharedPrefixRef}`,
          branches: [{ id: "branch:counterfactual-96" }],
          digest: `sha256:${hash("replay-plan-96")}`,
        };
      }
      if (id === "evaluation-core" && capability === "evaluation:attest-references") {
        const value = envelope.value as Record<string, unknown>;
        const context = value.context as Record<string, unknown>;
        const references = value.references as Record<string, string>;
        const issuedAtMs = Date.now() - 1;
        const expiresAtMs = issuedAtMs + 60_000;
        const authority = "evaluation-reference-store";
        attestations.push(value);
        return {
          schemaVersion: "role-model.evaluation-reference-attestation.v1",
          authority,
          purpose: "evaluation",
          channel: context.channel,
          scope: context.scope,
          authorizationEpoch: context.authorizationEpoch,
          issuedAtMs,
          expiresAtMs,
          references: Object.fromEntries(
            Object.entries(references).map(([field, reference]) => [
              field,
              {
                reference,
                resolved: true,
                referenceDigest: `sha256:${hash(reference)}`,
                purpose: "evaluation",
                authority,
                channel: context.channel,
                scope: context.scope,
                authorizationEpoch: context.authorizationEpoch,
                issuedAtMs,
                expiresAtMs,
              },
            ]),
          ),
        };
      }
      if (id === "evaluation-core" && capability === "evaluation:list-trials") {
        return { value: [{ trialId: `trial:run96:${trialIndex++}` }] };
      }
      if (id === "evaluation-core" && capability === "evaluation:claim-trial") {
        const value = envelope.value as Record<string, unknown>;
        return { trialId: value.trialId, leaseId: "lease:run96" };
      }
      if (id === "evaluation-core" && capability === "evaluation:finalize-comparison-group") {
        const value = envelope.value as Record<string, unknown>;
        return { groupId: value.groupId, status: "finalized", outcome: "candidate" };
      }
      if (id === "evaluation-core" && capability === "evaluation:read-comparison-group") {
        const value = envelope.value as Record<string, unknown>;
        return { groupId: value.groupId, status: "finalized", outcome: "candidate" };
      }
      if (id === "evaluation-core" && capability === "evaluation:register-scorer") return {};
      if (id === "evaluation-core" && capability === "evaluation:create-job") return {};
      if (id === "evaluation-core" && capability === "evaluation:submit-trial-result") {
        return { accepted: true };
      }
      if (id === "evaluation-core" && capability === "evaluation:record-trial-score-batch") {
        return { accepted: true };
      }
      if (id === "evaluation-runner-local" && capability === "evaluation:execute-trial") {
        const value = envelope.value as Record<string, unknown>;
        const trialId = String(value.trialId);
        return {
          outputRef: `artifact:${artifactId(`out${trialId.slice(-1)}`)}`,
          outputDigest: `sha256:${hash(`output:${trialId}`)}`,
          stdoutRef: `artifact:${artifactId(`std${trialId.slice(-1)}`)}`,
          stderrRef: `artifact:${artifactId(`err${trialId.slice(-1)}`)}`,
          exitCode: 0,
          measurements: { elapsedMs: 1, outputBytes: 1 },
          scores: [
            {
              // The registered routing-shadow scorer owns the generation and digest;
              // a double that hardcodes the previous generation can never satisfy
              // the pipeline's definition-bound correctness lookup.
              scorerId: routingShadowScorer.id,
              scorerVersion: routingShadowScorer.version,
              scorerDigest: routingShadowScorer.digest,
              dimension: "correctness",
              score: 1,
              confidence: 1,
              scoreId: `score:${trialId}`,
            },
          ],
        };
      }
      if (id === "trajectory-signals" && capability === "signals:analyze-finalized-evaluation") {
        return {
          schemaVersion: "role-model.degradation-receipt.v1",
          degraded: true,
          capability,
          mode: "omit_signals",
        };
      }
      throw new Error(`unexpected pipeline invocation ${id}:${capability}`);
    },
  };
  const pipelineInputs: TrackBShadowPipelineInput[] = [];
  let recovering = false;
  const completer = createSupervisedReplayEvaluationCompleter({
    runtime,
    operations: {
      async readLocalRouteCapture(input) {
        expect(String(input.requestId)).toMatch(/candidate-branch$/);
        return counterfactualCapture;
      },
    },
    requestId: "request:run96-source",
    channel: "development",
    scope: "tenant:run96",
    sourceCapture,
    sourceOutput: "source output",
    sourceEndpointId: sourceCapture.endpointId,
    sourceModelId: sourceCapture.modelId,
    counterfactualPackages: [candidate],
    getDispatched: () =>
      recovering
        ? undefined
        : {
            replayRequestId: "replay:run96:candidate",
            execution: {
              routingDecisionId: counterfactualCapture.routingDecisionId,
              outputText: "counterfactual output",
            },
          },
    evaluationCriteria: {
      schemaVersion: "role-model.semantic-criteria.v1",
      requiredTerms: ["output"],
    },
    evaluationCriteriaDigest: `sha256:${hash("criteria")}`,
    runPipeline: async (pipelineRuntime, pipelineInput) => {
      pipelineInputs.push(pipelineInput);
      return runTrackBShadowPipeline(pipelineRuntime, pipelineInput);
    },
  });

  const result = await completer({
    evaluationJobId: "evaluation:run96",
    replayJobId: "replay:run96",
    resultBranches: [
      {
        candidateEndpointId: candidate.endpointId,
        branchRootRef: counterfactualCapture.rootArtifactId,
      },
    ],
  });

  expect(result).toMatchObject({
    evaluationJobId: "evaluation:run96",
    outcome: "candidate",
  });
  const firstReferences = pipelineInputs[0]?.evaluationReferences as Record<string, unknown>;
  // Run 99 R33 (S34 live finding): the capture's task family must travel with the supervised
  // replay, otherwise the comparison — and the learner's family-scoped floor — never sees it.
  expect(pipelineInputs[0]?.taskTypeId).toBe("coder.review");
  const restartReadbackRuntime: TrackBShadowPipelineRuntime = {
    async invoke(id, envelope) {
      expect(id).toBe("artifact-store");
      expect(envelope.capability).toBe("artifact:read");
      const payload = envelope.payload as Record<string, unknown>;
      return (stored.get(String(payload.id)) ?? null) as unknown as Record<string, unknown>;
    },
  };
  const persistedReferenceIds = [
    firstReferences.taskRef,
    firstReferences.inputRef,
    firstReferences.toolPolicyDigest,
    firstReferences.environmentDigest,
    ...(firstReferences.perCase as Record<string, unknown>[]).map((row) => row.evidenceRef),
  ];
  for (const reference of persistedReferenceIds) {
    expect(typeof reference).toBe("string");
    const readback = await restartReadbackRuntime.invoke("artifact-store", {
      capability: "artifact:read",
      payload: { scope: "tenant:run96", id: String(reference).slice("artifact:".length) },
    });
    expect(typeof readback).toBe("string");
  }
  recovering = true;
  const recoveredResult = await completer({
    evaluationJobId: "evaluation:run96-recovery",
    replayJobId: "replay:run96-recovery",
    replayJob: {
      dispatches: {
        [candidate.endpointId]: {
          result: {
            providerResultRef: "route-capture:replay:run96:recovery:candidate",
            routerDecisionId: counterfactualCapture.routingDecisionId,
          },
        },
      },
      branches: [
        {
          endpointId: candidate.endpointId,
          branchRootRef: counterfactualCapture.rootArtifactId,
        },
      ],
    },
  });
  expect(recoveredResult).toMatchObject({
    evaluationJobId: "evaluation:run96-recovery",
    outcome: "candidate",
  });
  expect(pipelineInputs).toHaveLength(2);
  expect(pipelineInputs.every((input) => input.trajectoryEvents.length === 0)).toBe(true);
  expect(attestations.length).toBeGreaterThanOrEqual(6);
  expect(attestations[0]).toMatchObject({
    purpose: "evaluation",
    references: expect.objectContaining({
      taskRef: expect.stringMatching(/^artifact:[a-f0-9]{64}$/),
      inputRef: expect.stringMatching(/^artifact:[a-f0-9]{64}$/),
      environmentDigest: expect.stringMatching(/^artifact:[a-f0-9]{64}$/),
    }),
  });
  expect(stored.size).toBe(12);
});

test("Run96 CLI completion is invoked by fresh and awaiting-evaluation runSupervisedReplay paths", async () => {
  const sourceCapture = {
    ...durableCapture("1"),
    response: { content: "source output" },
    trace: {
      ...durableCapture("1").trace,
      traversalDigest: `sha256:${artifactId("7")}`,
    },
    replaySource: {
      ...durableCapture("1").replaySource,
      forkOccurrenceId: "trace:1:root",
    },
  };
  const counterfactualCapture = {
    ...durableCapture("8"),
    scope: "tenant:run96-callsite",
    routingDecisionId: "decision:counterfactual-callsite-96",
    endpointId: "endpoint:counterfactual-callsite-96",
    modelId: "model:counterfactual-callsite-96",
    outputText: "counterfactual output",
  };
  const candidate = {
    endpointId: counterfactualCapture.endpointId,
    modelId: counterfactualCapture.modelId,
    reasoningEffort: "max",
    promptAdapterId: "router-host/default-v1",
    toolPolicy: "deny",
    experiencePackId: "none",
    samplingProfileId: "deterministic-v1",
  } as const;
  const sourceAttestation = createReplaySourceAttestation({
    channel: "development",
    scope: "tenant:run96-callsite",
    authorizationEpoch: 1,
    capture: {
      ...sourceCapture,
      scope: "tenant:run96-callsite",
    },
    eligibleEndpointIds: [sourceCapture.endpointId, candidate.endpointId],
  });
  const stored = new Map<string, string>();
  const pipelineInputs: TrackBShadowPipelineInput[] = [];
  const dispatches = new Map<
    string,
    { readonly replayRequestId: string; readonly execution: Readonly<Record<string, unknown>> }
  >();
  const writeIds = ["a", "b", "c", "d", "e", "f", "0a", "0b", "0c", "0d", "0e", "0f"];
  let writeIndex = 0;
  let recovery = false;
  let jobIndex = 0;
  const runtime = {
    async invoke(id: string, envelope: Record<string, unknown>) {
      const capability = String(envelope.capability ?? "");
      if (id === "artifact-store" && capability === "graph:write") {
        const payload = envelope.payload as Record<string, unknown>;
        const record = payload.record as Record<string, unknown>;
        const id = artifactId(writeIds[writeIndex++] ?? "8");
        stored.set(id, String(record.content));
        return { id };
      }
      if (id === "artifact-store" && capability === "artifact:read") {
        const payload = envelope.payload as Record<string, unknown>;
        return stored.get(String(payload.id)) ?? null;
      }
      if (id !== "replay-core")
        throw new Error(`unexpected callsite invocation ${id}:${capability}`);
      if (capability === "replay:create-job") {
        jobIndex += 1;
        if (recovery) {
          return {
            jobId: "replay:callsite:recovery",
            state: "awaiting_evaluation",
            evaluationJobId: "evaluation:callsite:recovery",
            dispatches: {
              [candidate.endpointId]: {
                result: {
                  providerResultRef: "route-capture:replay:callsite:recovery:candidate",
                  routerDecisionId: counterfactualCapture.routingDecisionId,
                },
              },
            },
            branches: [
              {
                candidateEndpointId: candidate.endpointId,
                branchRootRef: counterfactualCapture.rootArtifactId,
              },
            ],
          };
        }
        return {
          jobId: "replay:callsite:fresh",
          state: "created",
          createdAtMs: Date.now(),
        };
      }
      if (capability === "replay:claim-job") return { fenceToken: 9 };
      if (capability === "replay:prepare-dispatch") {
        const value = envelope.value as Record<string, unknown>;
        return {
          status: "provider_dispatch",
          envelope: {
            schemaVersion: "role-model.replay-dispatch.v1",
            channel: "development",
            scope: "tenant:run96-callsite",
            replayJobId: value.jobId,
            sourceDecisionId: sourceCapture.routingDecisionId,
            normalizedRequestRef: `artifact:${sourceCapture.replaySource.normalizedRequestRef}`,
            candidateEndpointId: candidate.endpointId,
            dispatchIdempotencyKey: artifactId(recovery ? "b" : "a"),
            sourceGeneration: 1,
            budget: {
              maxCandidates: 1,
              maxProviderCalls: 1,
              maxCostMicros: 100,
              maxBytes: 16_384,
              deadlineMs: 10_000,
            },
            toolPolicy: candidate.toolPolicy,
            candidatePackage: candidate,
          },
        };
      }
      if (capability === "replay:record-provider-receipt") {
        const value = envelope.value as Record<string, unknown>;
        return {
          status: "append_recovery",
          branchRequest: { candidateEndpointId: value.candidateEndpointId },
        };
      }
      if (capability === "replay:record-branch-append") return { status: "awaiting_evaluation" };
      if (capability === "replay:record-evaluation-receipt")
        return { status: "awaiting_evaluation" };
      if (capability === "replay:record-evaluation-result") {
        const value = envelope.value as Record<string, unknown>;
        const evaluation = value.evaluation as Record<string, unknown>;
        return {
          jobId: envelope.value && typeof envelope.value === "object" ? value.jobId : undefined,
          state: "complete",
          evaluationJobId: evaluation.evaluationJobId,
          evaluationResult: evaluation,
        };
      }
      throw new Error(`unexpected replay-core capability ${capability}`);
    },
  };
  const adapter = createRouterReplayAdapter({
    channel: "development",
    scope: "tenant:run96-callsite",
    authorizationEpoch: 1,
    authorizationSecret: "run96-callsite-secret-0123456789",
    dispatch: async (request) => {
      const replayJobId = String(request.replayJobId);
      const replayRequestId = recovery
        ? "replay:callsite:recovery:candidate"
        : "replay:callsite:fresh:candidate";
      if (!recovery) {
        dispatches.set(candidate.endpointId, {
          replayRequestId,
          execution: {
            routingDecisionId: counterfactualCapture.routingDecisionId,
            outputText: counterfactualCapture.outputText,
            model: candidate.modelId,
          },
        });
      }
      return {
        dispatchReceiptId: `dispatch:${replayJobId}`,
        routerDecisionId: counterfactualCapture.routingDecisionId,
        providerResultRef: `route-capture:${replayRequestId}`,
        observedCostMicros: 1,
        observedResponseBytes: 32,
      };
    },
  });
  const completer = createSupervisedReplayEvaluationCompleter({
    runtime,
    operations: {
      async readLocalRouteCapture(input) {
        expect(input.requestId).toMatch(/-branch$/);
        return counterfactualCapture;
      },
    },
    requestId: "request:callsite-source",
    channel: "development",
    scope: "tenant:run96-callsite",
    sourceCapture: { ...sourceCapture, scope: "tenant:run96-callsite" },
    sourceOutput: "source output",
    sourceEndpointId: sourceCapture.endpointId,
    sourceModelId: sourceCapture.modelId,
    counterfactualPackages: [candidate],
    getDispatched: (endpointId) => (recovery ? undefined : dispatches.get(endpointId)),
    evaluationCriteria: {
      schemaVersion: "role-model.semantic-criteria.v1",
      requiredTerms: ["output"],
    },
    evaluationCriteriaDigest: `sha256:${artifactId("9")}`,
    runPipeline: async (_pipelineRuntime, pipelineInput) => {
      pipelineInputs.push(pipelineInput);
      return {
        evaluation: { groupId: "comparison:callsite-96", outcome: "incomplete" },
        candidate: { state: "insufficient_trajectory_evidence" },
      } as never;
    },
  });

  const baseInput = {
    runtime,
    requestId: "request:callsite-source",
    channel: "development",
    scope: "tenant:run96-callsite",
    authorizationEpoch: 1,
    sourceAttestation,
    adapter,
    intent: "counterfactual_route",
    evaluationCriteriaDigest: `sha256:${artifactId("9")}`,
    candidatePackages: [candidate],
    budget: {
      maxCandidates: 1,
      maxProviderCalls: 1,
      maxCostMicros: 100,
      maxBytes: 16_384,
      deadlineMs: 10_000,
    },
    leaseOwner: "runtime-host:callsite-96",
    leaseMs: 10_000,
    prepareBranch: async () => ({ branchRootRef: counterfactualCapture.rootArtifactId }),
    appendBranch: async () => ({ branchRootRef: counterfactualCapture.rootArtifactId }),
    handoffEvaluation: async ({ replayJobId }: { readonly replayJobId: string }) => ({
      evaluationJobId: `evaluation:${replayJobId}`,
    }),
    completeEvaluation: completer,
  } as const;

  const fresh = await runSupervisedReplay({
    ...baseInput,
    idempotencyKey: artifactId("a"),
  });
  expect(fresh.state).toBe("complete");
  expect(fresh.evaluationJobId).toBe("evaluation:replay:callsite:fresh");

  recovery = true;
  const recovered = await runSupervisedReplay({
    ...baseInput,
    idempotencyKey: artifactId("b"),
  });
  expect(recovered.state).toBe("complete");
  expect(recovered.evaluationJobId).toBe("evaluation:callsite:recovery");
  expect(pipelineInputs).toHaveLength(2);
  expect(pipelineInputs.every((input) => input.trajectoryEvents.length === 0)).toBe(true);
  for (const input of pipelineInputs) {
    const refs = input.evaluationReferences as Record<string, unknown>;
    expect(refs.taskRef).toMatch(/^artifact:[a-f0-9]{64}$/);
    expect(refs.inputRef).toMatch(/^artifact:[a-f0-9]{64}$/);
    expect(refs.environmentDigest).toMatch(/^artifact:[a-f0-9]{64}$/);
  }
});
