import { createHash } from "node:crypto";

import { describe, expect, test } from "vitest";

import {
  type TrackBShadowPipelineInput,
  type TrackBShadowPipelineRuntime,
  createRun96RoutingShadowScorer,
  runTrackBPostObservation,
  runTrackBShadowPipeline,
} from "../src/track-b-runtime.js";

const routingShadowScorer = createRun96RoutingShadowScorer();

type Invocation = {
  readonly id: string;
  readonly envelope: Record<string, unknown>;
};

type ShadowHarness = {
  readonly runtime: TrackBShadowPipelineRuntime;
  readonly calls: Invocation[];
  readonly jobs: Record<string, unknown>[];
  readonly trajectoryInputs: Record<string, unknown>[];
  readonly profileInputs: Record<string, unknown>[];
  readonly knowledgeInputs: Record<string, unknown>[];
  readonly attestations: Record<string, unknown>[];
  readonly trustedAttestation: Record<string, unknown>;
};

const semanticCriteria = {
  schemaVersion: "role-model.semantic-criteria.v1" as const,
  requiredTerms: ["result"],
};

const independentReferences = {
  taskRef: "artifact:task-run96",
  inputRef: "artifact:input-run96",
  forkRef: "artifact:fork-run96",
  toolPolicyDigest: `sha256:${"1".repeat(64)}`,
  environmentDigest: `sha256:${"2".repeat(64)}`,
  sourceEvidenceRef: "artifact:source-evidence-run96",
  counterfactualEvidenceRef: "artifact:counterfactual-evidence-run96",
  sourceOutcomeRef: "artifact:source-outcome-run96",
  counterfactualOutcomeRef: "artifact:counterfactual-outcome-run96",
  perCase: [
    { caseId: "case:run96:0", evidenceRef: "artifact:case-source-evidence-run96" },
    { caseId: "case:run96:1", evidenceRef: "artifact:case-counterfactual-evidence-run96" },
  ],
};

const observedDimensions = {
  source: {
    task: "task:customer-support",
    repository: "repo:role-model",
    prompt: `sha256:${"3".repeat(64)}`,
    tool: `sha256:${"4".repeat(64)}`,
    sampling: "sampling:stable-v2",
    experience: "experience:baseline",
    environment: `sha256:${"5".repeat(64)}`,
  },
  counterfactual: {
    task: "task:customer-support",
    repository: null,
    prompt: null,
    tool: null,
    sampling: null,
    experience: "experience:baseline",
    environment: null,
    unknownDimensions: ["tool", "repository", "tool"],
  },
};

function sha256(value: string): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function createReferenceAttestation(references: Record<string, string>): Record<string, unknown> {
  const nowMs = Date.now();
  return {
    schemaVersion: "role-model.evaluation-reference-attestation.v1",
    authority: "sidecar:trusted-evaluation",
    purpose: "evaluation",
    channel: "development",
    scope: "tenant:run96",
    authorizationEpoch: 96,
    issuedAtMs: nowMs,
    expiresAtMs: nowMs + 60_000,
    references: Object.fromEntries(
      Object.entries(references).map(([field, reference]) => [
        field,
        {
          reference,
          resolved: true,
          referenceDigest: sha256(reference),
          purpose: "evaluation",
          authority: "sidecar:trusted-evaluation",
          channel: "development",
          scope: "tenant:run96",
          authorizationEpoch: 96,
          issuedAtMs: nowMs,
          expiresAtMs: nowMs + 60_000,
        },
      ]),
    ),
  };
}

function createShadowInput(
  overrides: Partial<Record<string, unknown>> = {},
): TrackBShadowPipelineInput {
  const source = {
    rolloutId: "rollout:source-run96",
    routePackage: "candidate:source-run96",
    endpointId: "endpoint:source-run96",
    modelId: "model:source-run96",
    policyId: "routing-shadow",
    reasoningEffort: "high",
    effortSource: "variant",
    evidenceRef: independentReferences.sourceEvidenceRef,
    artifactRef: "artifact:source-output-run96",
    evaluationActual: "source result",
    propensity: 0.6,
    observedDimensions: observedDimensions.source,
    outcome: {
      outcomeRef: independentReferences.sourceOutcomeRef,
      outcomeDigest: sha256("source-outcome"),
      status: "success",
    },
  };
  const counterfactual = {
    rolloutId: "rollout:counterfactual-run96",
    routePackage: "candidate:counterfactual-run96",
    endpointId: "endpoint:counterfactual-run96",
    modelId: "model:counterfactual-run96",
    policyId: "routing-shadow",
    reasoningEffort: "max",
    effortSource: "variant",
    evidenceRef: independentReferences.counterfactualEvidenceRef,
    artifactRef: "artifact:counterfactual-output-run96",
    evaluationActual: "counterfactual result",
    propensity: 0.4,
    observedDimensions: observedDimensions.counterfactual,
    outcome: {
      outcomeRef: independentReferences.counterfactualOutcomeRef,
      outcomeDigest: sha256("counterfactual-outcome"),
      status: "success",
    },
  };
  const attestationReferences = {
    taskRef: independentReferences.taskRef,
    inputRef: independentReferences.inputRef,
    forkRef: independentReferences.forkRef,
    toolPolicyDigest: independentReferences.toolPolicyDigest,
    environmentDigest: independentReferences.environmentDigest,
    sourceEvidenceRef: independentReferences.sourceEvidenceRef,
    counterfactualEvidenceRef: independentReferences.counterfactualEvidenceRef,
    sourceOutcomeRef: independentReferences.sourceOutcomeRef,
    counterfactualOutcomeRef: independentReferences.counterfactualOutcomeRef,
    ...Object.fromEntries(
      independentReferences.perCase.map((row) => [row.caseId, row.evidenceRef]),
    ),
  };
  return {
    requestId: "request:run96-learning-red",
    channel: "development",
    scope: "tenant:run96",
    authorizationEpoch: 96,
    productionState: { routingDecisionId: "decision:source-run96", immutable: true },
    routePackage: source.routePackage,
    sourceDecisionId: "decision:source-run96",
    sourceGraphRef: "artifact:source-graph-run96",
    prefix: [{ routingDecisionId: "decision:source-run96" }],
    counterfactuals: [{ id: counterfactual.routePackage, suffix: [] }],
    comparableEvidence: {
      source,
      counterfactuals: [counterfactual],
      candidateSet: [
        {
          routePackage: source.routePackage,
          endpointId: source.endpointId,
          propensity: source.propensity,
        },
        {
          routePackage: counterfactual.routePackage,
          endpointId: counterfactual.endpointId,
          propensity: counterfactual.propensity,
        },
      ],
    },
    evaluationCases: [
      { id: "case:run96:0", evaluationCriteria: semanticCriteria },
      { id: "case:run96:1", evaluationCriteria: semanticCriteria },
    ],
    trajectoryEvents: [
      {
        id: "trajectory:run96:start",
        type: "provider_error",
        timestampMs: 96_000,
        requestId: "request:run96-learning-red",
      },
      {
        id: "trajectory:run96:outcome",
        type: "user_correction",
        timestampMs: 96_100,
        requestId: "request:run96-learning-red",
      },
    ],
    // These fields model the caller proposal. The adapter must preserve them
    // while obtaining the final proof from the trusted sidecar.
    evaluationReferences: independentReferences,
    referenceAttestation: createReferenceAttestation(attestationReferences),
    ...overrides,
  } as unknown as TrackBShadowPipelineInput;
}

function createShadowHarness(
  options: {
    readonly degradedTrajectory?: boolean;
    readonly attestationReply?: Record<string, unknown>;
  } = {},
): ShadowHarness {
  const calls: Invocation[] = [];
  const jobs: Record<string, unknown>[] = [];
  const trajectoryInputs: Record<string, unknown>[] = [];
  const profileInputs: Record<string, unknown>[] = [];
  const knowledgeInputs: Record<string, unknown>[] = [];
  const attestations: Record<string, unknown>[] = [];
  const trustedAttestation = createReferenceAttestation({
    taskRef: independentReferences.taskRef,
    inputRef: independentReferences.inputRef,
    forkRef: independentReferences.forkRef,
    toolPolicyDigest: independentReferences.toolPolicyDigest,
    environmentDigest: independentReferences.environmentDigest,
    sourceEvidenceRef: independentReferences.sourceEvidenceRef,
    counterfactualEvidenceRef: independentReferences.counterfactualEvidenceRef,
    sourceOutcomeRef: independentReferences.sourceOutcomeRef,
    counterfactualOutcomeRef: independentReferences.counterfactualOutcomeRef,
    ...Object.fromEntries(
      independentReferences.perCase.map((row) => [row.caseId, row.evidenceRef]),
    ),
  });
  let trialIndex = 0;
  let postObservation = false;

  const runtime: TrackBShadowPipelineRuntime = {
    async invoke(id, envelope) {
      calls.push({ id, envelope });
      const capability = String(envelope.capability ?? "");
      const value = envelope.value;
      const businessOutput = {
        workerPid: 20_000 + calls.length,
        durableLocator: {
          extensionId: id,
          requestId: envelope.requestId,
          invocation: calls.length,
        },
        evidenceRef: `artifact:${id}:${calls.length}`,
        businessOutput: { extensionId: id, capability, invocation: calls.length },
        readCapability: "artifact:read",
      };
      if (id === "evaluation-core" && capability === "evaluation:attest-references") {
        const request = value as Record<string, unknown>;
        attestations.push(request);
        if (options.attestationReply) return options.attestationReply;
        const requestedReferences =
          request.references &&
          typeof request.references === "object" &&
          !Array.isArray(request.references)
            ? (request.references as Record<string, string>)
            : {};
        const extraReferences = Object.fromEntries(
          Object.entries(requestedReferences).filter(
            ([field]) => !(field in (trustedAttestation.references as Record<string, unknown>)),
          ),
        );
        if (!Object.keys(extraReferences).length) return trustedAttestation;
        const extra = createReferenceAttestation(extraReferences);
        return {
          ...trustedAttestation,
          references: {
            ...(trustedAttestation.references as Record<string, unknown>),
            ...(extra.references as Record<string, unknown>),
          },
        };
      }
      if (id === "artifact-store") {
        postObservation = true;
        return { ...businessOutput, id: "artifact:post-observation-run96" };
      }
      if (postObservation) {
        if (id === "repository-context") {
          return {
            ...businessOutput,
            available: true,
            context: {
              scopeId: "tenant:run96",
              repoFingerprint: "a".repeat(64),
              packageId: null,
              fallbackLevel: "repo_task",
              branchCompatibility: "unknown",
              fingerprintEpoch: 1,
            },
            diagnostics: [],
          };
        }
        if (id === "knowledge-store" && capability === "knowledge:write") {
          return { ...businessOutput, id: "knowledge:post-observation-run96" };
        }
        if (id === "knowledge-store" && capability === "knowledge:read") {
          return { ...businessOutput, id: "knowledge:post-observation-run96" };
        }
        if (id === "replay-core") {
          return {
            ...businessOutput,
            sourceDecisionId: "decision:run96-observation",
            sourceGraphRef: "artifact:post-observation-graph-run96",
            sharedPrefixRef: "artifact:post-observation-prefix-run96",
            branches: [],
            digest: `sha256:${"7".repeat(64)}`,
          };
        }
        if (id === "trajectory-signals") {
          trajectoryInputs.push(value as Record<string, unknown>);
          return options.degradedTrajectory
            ? {
                ...businessOutput,
                schemaVersion: "role-model.degradation-receipt.v1",
                degraded: true,
                capability,
                mode: "omit_signals",
              }
            : {
                ...businessOutput,
                routeDecisionId: "decision:run96-observation",
                graphRef: "artifact:post-observation-graph-run96",
                signals: [],
              };
        }
        if (id === "evaluation-runner-local")
          return { ...businessOutput, evaluation: "observation" };
        if (id === "profile-learner") {
          return {
            ...businessOutput,
            profileId: "profile:post-observation-run96",
            digest: sha256("post-observation-profile"),
            effects: {},
          };
        }
        if (id === "knowledge-worker")
          return {
            ...businessOutput,
            id: "candidate:post-observation-run96",
            state: "shadow",
            productionEffects: {},
          };
        return businessOutput;
      }
      if (id === "replay-core") {
        return {
          sourceDecisionId: "decision:source-run96",
          sourceGraphRef: "artifact:source-graph-run96",
          sharedPrefixRef: "artifact:fork-run96",
          branches: [],
          digest: `sha256:${"6".repeat(64)}`,
        };
      }
      if (id === "evaluation-core" && capability === "evaluation:register-scorer") {
        return { key: "run96-semantic@1" };
      }
      if (id === "evaluation-core" && capability === "evaluation:create-job") {
        jobs.push(value as Record<string, unknown>);
        return { jobId: "evaluation:job-run96" };
      }
      if (id === "evaluation-core" && capability === "evaluation:list-trials") {
        const endpointId =
          trialIndex++ === 0 ? "endpoint:source-run96" : "endpoint:counterfactual-run96";
        return [{ trialId: `trial:run96:${trialIndex}`, candidateRef: endpointId }];
      }
      if (id === "evaluation-core" && capability === "evaluation:claim-trial") {
        const row = value as Record<string, unknown>;
        return { trialId: row.trialId, leaseId: "lease:run96" };
      }
      if (id === "evaluation-runner-local" && capability === "evaluation:execute-trial") {
        const index = calls.filter(
          (call) =>
            call.id === "evaluation-runner-local" && call.envelope.capability === capability,
        ).length;
        return {
          outputRef: `artifact:trial-output-run96-${index}`,
          outputDigest: sha256(`trial-output-${index}`),
          stdoutRef: `artifact:trial-stdout-run96-${index}`,
          stderrRef: `artifact:trial-stderr-run96-${index}`,
          exitCode: 0,
          measurements: { elapsedMs: 1, outputBytes: 10 },
          scores: [
            {
              scorerId: "run96-semantic-criteria",
              scorerVersion: routingShadowScorer.version,
              scorerDigest: routingShadowScorer.digest,
              dimension: "correctness",
              score: index === 1 ? 1 : 0,
              confidence: 1,
              source: "deterministic_semantic_criteria",
            },
          ],
        };
      }
      if (
        id === "evaluation-core" &&
        ["evaluation:submit-trial-result", "evaluation:record-trial-score-batch"].includes(
          capability,
        )
      ) {
        return { accepted: true };
      }
      if (id === "evaluation-core" && capability === "evaluation:finalize-comparison-group") {
        return { groupId: "comparison:run96", status: "finalized", outcome: "candidate" };
      }
      if (id === "evaluation-core" && capability === "evaluation:read-comparison-group") {
        return {
          groupId: "comparison:run96",
          status: "finalized",
          outcome: "candidate",
          members: [
            { trialId: "trial:run96:1", score: 1 },
            { trialId: "trial:run96:2", score: 0 },
          ],
        };
      }
      if (id === "trajectory-signals") {
        trajectoryInputs.push(value as Record<string, unknown>);
        if (options.degradedTrajectory) {
          return {
            schemaVersion: "role-model.degradation-receipt.v1",
            degraded: true,
            capability,
            mode: "omit_signals",
          };
        }
        return {
          routeDecisionId: "decision:source-run96",
          graphRef: "artifact:source-graph-run96",
          signals: [
            {
              signalInstanceId: "signal:run96:quality",
              signalType: "evaluation_outcome",
              dimension: "quality",
              unit: "normalized_score",
              direction: "higher_is_better",
              value: 1,
              confidence: 1,
              weight: 1,
              missingness: "complete",
              evidenceRef: "artifact:signal-evidence-run96",
              routePackage: "candidate:source-run96",
            },
          ],
        };
      }
      if (id === "profile-learner") {
        profileInputs.push(value as Record<string, unknown>);
        return {
          profileId: "profile:run96",
          digest: sha256("profile-run96"),
          effects: { quality: { confidence: 1 } },
        };
      }
      if (id === "knowledge-worker") {
        knowledgeInputs.push(value as Record<string, unknown>);
        return { id: "candidate:run96", state: "shadow", productionEffects: {} };
      }
      throw new Error(`unexpected invocation ${id}:${capability}`);
    },
  };
  return {
    runtime,
    calls,
    jobs,
    trajectoryInputs,
    profileInputs,
    knowledgeInputs,
    attestations,
    trustedAttestation,
  };
}

function learningConsumerCalls(calls: readonly Invocation[]): Invocation[] {
  return calls.filter(
    ({ id, envelope }) =>
      ["evaluation-core", "profile-learner", "knowledge-worker"].includes(id) &&
      String(envelope.capability).endsWith("consume-projection"),
  );
}

describe("Run 96 Addendum 27 public learning boundaries", () => {
  test("F152: public shadow pipeline obtains trusted proofs and forwards them unchanged", async () => {
    const harness = createShadowHarness();
    await runTrackBShadowPipeline(harness.runtime, createShadowInput());

    const createJob = harness.jobs[0];
    expect(harness.attestations.length).toBeGreaterThanOrEqual(1);
    expect(createJob?.referenceAttestation).toEqual(harness.trustedAttestation);
    expect(createJob?.referenceAttestation).not.toMatchObject({
      authority: "runtime-shadow-pipeline",
    });
    expect(createJob?.referenceAttestation).toMatchObject({
      purpose: "evaluation",
      authority: "sidecar:trusted-evaluation",
      references: {
        taskRef: { referenceDigest: expect.stringMatching(/^sha256:[a-f0-9]{64}$/) },
      },
    });
  });

  test("F152: an absent or forged resolver proof blocks durable evaluation before job creation", async () => {
    const harness = createShadowHarness({
      attestationReply: {
        schemaVersion: "role-model.evaluation-reference-attestation.v1",
        authority: "runtime-shadow-pipeline",
        references: {},
      },
    });

    await expect(runTrackBShadowPipeline(harness.runtime, createShadowInput())).rejects.toThrow(
      /attest|reference|proof|resolve/i,
    );
    expect(harness.jobs).toHaveLength(0);
  });

  test("F157: every comparability and per-case reference remains independent and durable", async () => {
    const harness = createShadowHarness();
    await runTrackBShadowPipeline(harness.runtime, createShadowInput());
    const createJob = harness.jobs[0];
    const comparability = createJob?.comparability as Record<string, unknown> | undefined;
    expect(comparability).toMatchObject({
      taskRef: independentReferences.taskRef,
      inputRef: independentReferences.inputRef,
      forkRef: independentReferences.forkRef,
      toolPolicyDigest: independentReferences.toolPolicyDigest,
      environmentDigest: independentReferences.environmentDigest,
      sourceEvidenceRef: independentReferences.sourceEvidenceRef,
      counterfactualEvidenceRef: independentReferences.counterfactualEvidenceRef,
      sourceOutcomeRef: independentReferences.sourceOutcomeRef,
      counterfactualOutcomeRef: independentReferences.counterfactualOutcomeRef,
    });
    const requiredReferenceValues = [
      comparability?.taskRef,
      comparability?.inputRef,
      comparability?.forkRef,
      comparability?.toolPolicyDigest,
      comparability?.environmentDigest,
      comparability?.sourceEvidenceRef,
      comparability?.counterfactualEvidenceRef,
      comparability?.sourceOutcomeRef,
      comparability?.counterfactualOutcomeRef,
    ];
    expect(new Set(requiredReferenceValues)).toHaveLength(9);
    expect(createJob?.cases).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ evidenceRef: independentReferences.perCase[0]?.evidenceRef }),
        expect.objectContaining({ evidenceRef: independentReferences.perCase[1]?.evidenceRef }),
      ]),
    );
  });

  test("F153: an observation must contain an honest two-event trajectory or decline", async () => {
    const harness = createShadowHarness({ degradedTrajectory: true });
    const result = await runTrackBPostObservation(
      harness.runtime,
      {
        requestId: "request:run96-observation",
        routingDecisionId: "decision:run96-observation",
        endpointId: "endpoint:run96-observation",
        modelId: "model:run96-observation",
        reasoningEffort: "high",
        effortSource: "variant",
        usageEvent: { timestamp_ms: 96_000 },
      },
      { scope: "tenant:run96", channel: "development", authorizationEpoch: 96 },
    );

    const trajectory = harness.trajectoryInputs.find((input) => input.events);
    const hasValidTrajectory = Array.isArray(trajectory?.events) && trajectory.events.length >= 2;
    const declinedWithoutTrajectory = [
      "R14_NO_DISTINCT_COUNTERFACTUAL",
      "R16_TRAJECTORY_EVIDENCE_UNAVAILABLE",
    ].includes(String(result.pipeline.refusalCode));
    expect(hasValidTrajectory || declinedWithoutTrajectory).toBe(true);
    if (!hasValidTrajectory) {
      expect(result.pipeline).toMatchObject({
        status: "insufficient_comparable_evidence",
        productionMutation: false,
      });
    }
  });

  test("F154: insufficient and non-mutating observations never enter learning consumers", async () => {
    const harness = createShadowHarness({ degradedTrajectory: true });
    const result = await runTrackBPostObservation(
      harness.runtime,
      {
        requestId: "request:run96-insufficient-observation",
        routingDecisionId: "decision:run96-insufficient-observation",
        endpointId: "endpoint:run96-insufficient-observation",
        modelId: "model:run96-observation",
        reasoningEffort: "high",
        effortSource: "variant",
        usageEvent: { timestamp_ms: 96_000 },
      },
      { scope: "tenant:run96", channel: "development", authorizationEpoch: 96 },
    );

    expect(
      result.projection === undefined ||
        (result.projection.readiness.permittedUse === false &&
          result.projection.policy.trainingAllowed === false),
    ).toBe(true);
    expect(learningConsumerCalls(harness.calls)).toHaveLength(0);
  });

  test("F158: profile rows preserve observed dimensions and retain unknown values", async () => {
    const harness = createShadowHarness();
    await runTrackBShadowPipeline(harness.runtime, createShadowInput());
    const rows = (harness.profileInputs[0]?.rows ?? []) as Record<string, unknown>[];
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          task: observedDimensions.source.task,
          repository: observedDimensions.source.repository,
          prompt: observedDimensions.source.prompt,
          tool: observedDimensions.source.tool,
          sampling: observedDimensions.source.sampling,
          experience: observedDimensions.source.experience,
          environment: observedDimensions.source.environment,
        }),
        expect.objectContaining({
          task: observedDimensions.counterfactual.task,
          repository: null,
          prompt: null,
          tool: null,
          sampling: null,
          experience: observedDimensions.counterfactual.experience,
          unknownDimensions: ["environment", "prompt", "repository", "sampling", "tool"],
        }),
      ]),
    );
    expect(JSON.stringify(rows)).not.toContain("unchanged");
  });

  test("F159: knowledge evidence is typed, lineage-bearing, and resolver-backed", async () => {
    const harness = createShadowHarness();
    await runTrackBShadowPipeline(harness.runtime, createShadowInput());
    const comparableGroup = harness.knowledgeInputs[0]?.comparableGroup as
      | Record<string, unknown>
      | undefined;
    const positive = (comparableGroup?.positive ?? []) as Record<string, unknown>[];
    const negative = (comparableGroup?.negative ?? []) as Record<string, unknown>[];
    expect(positive).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          evidenceKind: "evaluation",
          learningCapable: true,
          evaluationRef: "comparison:run96",
          trialId: expect.any(String),
          scoreId: expect.any(String),
          sourceGroupId: "comparison:run96",
          referenceProof: expect.any(Object),
        }),
      ]),
    );
    expect(negative).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          evidenceKind: "evaluation",
          learningCapable: true,
          evaluationRef: "comparison:run96",
          trialId: expect.any(String),
          scoreId: expect.any(String),
          sourceGroupId: "comparison:run96",
          referenceProof: expect.any(Object),
        }),
      ]),
    );
  });
});
