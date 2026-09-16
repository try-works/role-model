import { createHash } from "node:crypto";

import { expect, test } from "vitest";

import * as trackBRuntime from "../src/track-b-runtime.js";

/**
 * Run 97 RC11 (KW-F) - the Knowledge Store handoff.
 *
 * `guidance/24_extension_dependency_matrix.md` / `extension-dependencies.json` declare
 * `knowledge-store` as a **hard dependency** of `knowledge-worker`, and the TB10 closure
 * requires the worker's "successful Knowledge Store handoff". The shipped pipeline kept
 * candidates only in the worker's own table, so durable knowledge never learned them and
 * the declared dependency was unused (addendum 02, KW-F).
 */

interface Invocation {
  readonly id: string;
  readonly capability: string;
  readonly value: Record<string, unknown>;
  readonly envelope: Record<string, unknown>;
}

const referenceDigest = (reference: string) =>
  `sha256:${createHash("sha256").update(reference).digest("hex")}`;

function scriptedRuntime(invocations: Invocation[]) {
  const deterministicScorer = trackBRuntime.createRun96RoutingShadowScorer();
  return async (id: string, envelope: Record<string, unknown>) => {
    const capability = String(envelope.capability ?? "");
    const value = (envelope.value ?? {}) as Record<string, unknown>;
    invocations.push({ id, capability, value, envelope });
    if (id === "replay-core") {
      return {
        digest: "sha256:replay-plan",
        sourceDecisionId: value.sourceDecisionId,
        sourceGraphRef: value.sourceGraphRef,
        sharedPrefixRef: "artifact:prefix",
        branches: [{ id: "endpoint:counterfactual" }],
      };
    }
    if (id === "evaluation-core" && capability === "evaluation:register-scorer") return {};
    if (id === "evaluation-core" && capability === "evaluation:attest-references") {
      const now = Date.now();
      const authority = "sidecar:test-reference-store";
      const references = (value.references ?? {}) as Record<string, string>;
      return {
        schemaVersion: "role-model.evaluation-reference-attestation.v1",
        authority,
        purpose: "evaluation",
        channel: envelope.channel,
        scope: envelope.scope,
        authorizationEpoch: envelope.authorizationEpoch,
        issuedAtMs: now - 1,
        expiresAtMs: now + 60_000,
        references: Object.fromEntries(
          Object.entries(references).map(([field, reference]) => [
            field,
            {
              schemaVersion: "role-model.evaluation-reference-attestation.v1",
              reference,
              referenceDigest: referenceDigest(reference),
              authority,
              purpose: "evaluation",
              channel: envelope.channel,
              scope: envelope.scope,
              authorizationEpoch: envelope.authorizationEpoch,
              issuedAtMs: now - 1,
              expiresAtMs: now + 60_000,
              resolved: true,
            },
          ]),
        ),
      };
    }
    if (id === "evaluation-core" && capability === "evaluation:create-job") return {};
    if (id === "evaluation-core" && capability === "evaluation:list-trials") {
      return {
        value: [
          { trialId: "trial:source", candidateRef: "candidate-local", caseId: "case:source" },
          {
            trialId: "trial:counterfactual",
            candidateRef: "candidate-remote",
            caseId: "case:counterfactual",
          },
        ],
      };
    }
    if (id === "evaluation-core" && capability === "evaluation:claim-trial") {
      return { trialId: value.trialId, leaseId: `lease:${String(value.trialId)}` };
    }
    if (id === "evaluation-runner-local") {
      return {
        outputRef: value.outputRef,
        outputDigest: value.outputDigest,
        stdoutRef: value.outputRef,
        stderrRef: value.outputRef,
        exitCode: 0,
        measurements: { elapsedMs: 1, outputBytes: 1 },
        scores: [
          {
            scorerId: deterministicScorer.id,
            scorerVersion: deterministicScorer.version,
            scorerDigest: deterministicScorer.digest,
            scorerDefinition: deterministicScorer,
            dimension: "correctness",
            score: 0,
            confidence: 1,
            source: "deterministic_semantic_criteria",
          },
        ],
      };
    }
    if (
      id === "evaluation-core" &&
      ["evaluation:submit-trial-result", "evaluation:record-trial-score-batch"].includes(capability)
    ) {
      return {};
    }
    if (
      id === "evaluation-core" &&
      ["evaluation:finalize-comparison-group", "evaluation:read-comparison-group"].includes(capability)
    ) {
      return {
        groupId: "comparison:rc11-graph",
        status: "finalized",
        outcome: "candidate",
        members: [
          {
            trialId: "trial:counterfactual",
            scoreId: "trial-score:counterfactual",
            score: 1,
            confidence: 1,
            disposition: "positive",
            role: "counterfactual",
            candidateRef: "candidate-remote",
          },
          {
            trialId: "trial:source",
            scoreId: "trial-score:source",
            score: 0,
            confidence: 1,
            disposition: "negative",
            role: "source",
            candidateRef: "candidate-local",
          },
        ],
      };
    }
    if (id === "trajectory-signals") {
      return {
        routeDecisionId: "decision:rc11",
        graphRef: "artifact:source-graph",
        signals: [],
        evaluationProvenance: {
          groupId: "comparison:rc11-graph",
          status: "finalized",
          outcome: "candidate",
        },
      };
    }
    if (id === "profile-learner") {
      return {
        digest: "sha256:profile-rc11",
        effects: {
          routePackage: {
            values: ["candidate-remote"],
            evidenceRefs: ["artifact:source-graph"],
            sampleCount: 2,
            confidence: 1,
            bias: "none",
          },
        },
      };
    }
    if (id === "knowledge-worker") {
      return {
        id: "shadow-rc11",
        state: "shadow",
        operation: "add",
        productionPromptInjection: false,
        productionEffects: {},
        learnedExperienceCandidate: {
          contract: "LearnedExperienceCandidateV1",
          experienceId: "shadow-rc11",
          version: 1,
          scope: { endpointId: "candidate-remote" },
          experienceTextRef: "artifact:candidate-experience-text",
          sourceGroupIds: ["group:rc11"],
          positiveRolloutRefs: ["artifact:case-counterfactual"],
          negativeRolloutRefs: ["artifact:case-source"],
          status: "candidate",
          redactionStatus: "safe_for_prompt",
          instructionHierarchyChecked: true,
          promptInjectionReviewed: true,
          createdAt: "2026-09-13T12:00:00.000Z",
          runtimeChannel: "development",
          scopeId: "scope:rc11",
          boundaryProtocolVersion: "1.1",
        },
        evidence: {
          sourceGroupIds: ["group:rc11"],
          positiveRolloutRefs: ["artifact:case-counterfactual"],
          negativeRolloutRefs: ["artifact:case-source"],
          evaluationResultIds: ["comparison:rc11-graph"],
          scorerSetVersion: "run96-routing-shadow-v3",
          holdoutCaseIds: ["holdout:rc11"],
          sampleCount: 2,
        },
      };
    }
    if (id === "knowledge-store" && capability === "knowledge:write") {
      return { id: "knowledge:rc11" };
    }
    if (id === "knowledge-store" && capability === "knowledge:read") {
      return { id: "knowledge:rc11", state: "candidate" };
    }
    throw new Error(`unexpected invocation ${id}:${capability}`);
  };
}

const pipelineInput = () => ({
  requestId: "run97-rc11-handoff",
  channel: "development",
  scope: "scope:rc11",
  authorizationEpoch: 1,
  productionState: {},
  routePackage: "candidate-local",
  sourceDecisionId: "decision:rc11",
  sourceGraphRef: "artifact:source-graph",
  prefix: [],
  sourcePrefixRef: "artifact:prefix",
  counterfactuals: [{ id: "candidate-remote", suffix: [] }],
  comparableEvidence: {
    source: {
      rolloutId: "rollout:source",
      routePackage: "candidate-local",
      endpointId: "endpoint-local",
      modelId: "model-local",
      policyId: "run96-supervised-replay",
      reasoningEffort: "high",
      effortSource: "variant",
      evaluationActual: "the incumbent answer",
      evidenceRef: "artifact:source-evidence",
      artifactRef: "artifact:source-graph",
      propensity: 1,
      outcome: {
        outcomeId: "outcome:source",
        outcomeRef: "artifact:outcome-source",
        outcomeDigest: "sha256:source",
        source: "observed",
        status: "success",
      },
    },
    counterfactuals: [
      {
        rolloutId: "rollout:counterfactual",
        routePackage: "candidate-remote",
        endpointId: "endpoint-remote",
        modelId: "model-remote",
        policyId: "run96-supervised-replay",
        reasoningEffort: "high",
        effortSource: "variant",
        evaluationActual: "the counterfactual answer",
        evidenceRef: "artifact:counterfactual-evidence",
        artifactRef: "artifact:counterfactual-graph",
        propensity: 1,
        outcome: {
          outcomeId: "outcome:counterfactual",
          outcomeRef: "artifact:outcome-counterfactual",
          outcomeDigest: "sha256:counterfactual",
          source: "replay",
          status: "success",
        },
      },
    ],
    candidateSet: [
      { routePackage: "candidate-local", endpointId: "endpoint-local", propensity: 1 },
      { routePackage: "candidate-remote", endpointId: "endpoint-remote", propensity: 1 },
    ],
  },
  evaluationCases: [
    {
      id: "case:source",
      evaluationCriteria: {
        schemaVersion: "role-model.semantic-criteria.v1",
        requiredTerms: ["fix the failing test"],
      },
    },
    {
      id: "case:counterfactual",
      evaluationCriteria: {
        schemaVersion: "role-model.semantic-criteria.v1",
        requiredTerms: ["fix the failing test"],
      },
    },
  ],
  evaluationReferences: {
    taskRef: "artifact:task",
    inputRef: "artifact:input",
    forkRef: "artifact:prefix",
    toolPolicyDigest: "artifact:tool-policy",
    environmentDigest: "artifact:environment",
    sourceEvidenceRef: "artifact:source-evidence",
    counterfactualEvidenceRef: "artifact:counterfactual-evidence",
    sourceOutcomeRef: "artifact:outcome-source",
    counterfactualOutcomeRef: "artifact:outcome-counterfactual",
    perCase: [
      { caseId: "case:source", evidenceRef: "artifact:case-source" },
      { caseId: "case:counterfactual", evidenceRef: "artifact:case-counterfactual" },
    ],
  },
  trajectoryEvents: [],
});

test("run97 rc11 a shadow candidate is handed to the Knowledge Store and read back", async () => {
  const invocations: Invocation[] = [];
  const runtime = {
    invoke: scriptedRuntime(invocations),
    listExtensions: () => [{ id: "knowledge-store", lifecycle: "ready" }],
  };
  await trackBRuntime.runTrackBShadowPipeline(runtime as never, pipelineInput()).catch(() => null);

  const writes = invocations.filter(
    (call) => call.id === "knowledge-store" && call.capability === "knowledge:write",
  );
  expect(writes).toHaveLength(1);
  const payload = (writes[0].envelope.payload ?? {}) as Record<string, unknown>;
  const document = (payload.value ?? {}) as Record<string, unknown>;
  expect(document).toMatchObject({
    type: "learned_experience_candidate",
    version: 1,
    scope: "scope:rc11",
    artifactRef: "artifact:candidate-experience-text",
  });
  expect(String(document.provenance)).toContain("comparison");

  const reads = invocations.filter(
    (call) => call.id === "knowledge-store" && call.capability === "knowledge:read",
  );
  expect(reads).toHaveLength(1);
  expect((reads[0].envelope.payload ?? {}) as Record<string, unknown>).toMatchObject({
    id: "knowledge:rc11",
  });
});



test("run97 rc14 knowledge rows cite the durable per-case evidence artifacts", async () => {
  const invocations: Invocation[] = [];
  const runtime = {
    invoke: scriptedRuntime(invocations),
    listExtensions: () => [{ id: "knowledge-store", lifecycle: "ready" }],
  };
  await trackBRuntime
    .runTrackBShadowPipeline(runtime as never, pipelineInput())
    .catch(() => null);

  const knowledge = invocations.find((call) => call.id === "knowledge-worker");
  expect(knowledge).toBeDefined();
  const group = (knowledge?.value.comparableGroup ?? {}) as Record<string, unknown>;
  const positive = (group.positive ?? []) as Record<string, unknown>[];
  const negative = (group.negative ?? []) as Record<string, unknown>[];
  // The pipeline persists per-case evidence through the artifact store; those are the
  // references the local resolver can prove. Citing the rollout-fact references left the
  // knowledge proof unsatisfiable live ("authoritative trusted resolver-backed reference
  // proof is required (reference=artifact:2ff7abe0...)").
  expect(positive[0].evidenceRef).toBe("artifact:case-counterfactual");
  expect(negative[0].evidenceRef).toBe("artifact:case-source");
});
test("run98 r04 the pipeline records the advisory observation without changing the decision", async () => {
  const invocations: Invocation[] = [];
  const runtime = {
    invoke: scriptedRuntime(invocations),
    listExtensions: () => [{ id: "knowledge-store", lifecycle: "ready" }],
  };
  const input = pipelineInput();
  const result = (await trackBRuntime.runTrackBShadowPipeline(
    runtime as never,
    input,
  )) as unknown as {
    readonly advisoryObservation: Record<string, unknown>;
    readonly receipt: Record<string, unknown>;
    readonly productionState: Record<string, unknown>;
  };
  expect(result.advisoryObservation).toMatchObject({
    schemaVersion: "role-model.route-advisory-observation.v1",
    decisionId: "decision:rc11",
    routePackage: "candidate-local",
    mode: "shadow",
    selection: "baseline_retained",
  });
  expect(result.advisoryObservation).toHaveProperty("advisoryState");
  expect(result.receipt.advisoryObservation).toEqual(result.advisoryObservation);
  // AC-R04-02: stage S1 observes the advisory and provably leaves the decision alone.
  expect(result.productionState).toEqual(input.productionState);
  expect(result.receipt.providerCalls).toBe(0);
  expect(result.receipt.productionMutation).toBe(false);
});

/**
 * Run 99 close-out (addendas 19-21 `S33`/`D1`/`D6`).
 *
 * The shadow pipeline's advisory observation is the entry `runTrackBPostObservation` appends to the
 * durable ledger, so the classification has to travel through *this* path too — not only the live
 * routing path. Measured on the live ledger before this slice: every entry written by the shadow
 * pipeline carried no family, no role, no taxonomy version, no propensity.
 */
test("run99 r33 the shadow observation carries the classification and the propensity", async () => {
  const invocations: Invocation[] = [];
  const runtime = {
    invoke: scriptedRuntime(invocations),
    listExtensions: () => [{ id: "knowledge-store", lifecycle: "ready" }],
  };
  const classification = {
    taskTypeId: "coder.review",
    roleId: "coder",
    toolClassIds: ["filesystem.read", "shell.execute"],
    taxonomyVersion: "1.0.0-alpha.1",
    contentRevision: "taxonomy-v1-alpha.1",
    contentHashes: { taskTypes: `sha256:${"d".repeat(64)}` },
  };
  const result = (await trackBRuntime.runTrackBShadowPipeline(runtime as never, {
    ...pipelineInput(),
    taskTypeId: "coder.review",
    taxonomyVersion: "1.0.0-alpha.1",
    classification,
  })) as unknown as {
    readonly advisoryObservation: Record<string, unknown>;
  };
  const observation = result.advisoryObservation;
  expect(observation.requestTaskTypeId).toBe("coder.review");
  expect(observation.classification).toEqual(classification);
  // The observed arm is the policy's own deterministic choice, so its propensity is 1.
  expect(observation.selectionMode).toBe("policy_deterministic");
  expect(observation.selectionProbability).toBe(1);
});

/**
 * Run 99 close-out (addendum 21 §4 `S33`): the `comparabilityKey` inputs.
 *
 * Two comparisons judged under different presentation orders are not comparable, so the judge order
 * policy that produced a comparison belongs in its comparability key. Measured before this slice:
 * the policy was enforced by the judge but recorded nowhere on the evidence.
 */
test("run99 addendum 21 the comparison records the judge order policy it was produced under", async () => {
  const invocations: Invocation[] = [];
  const runtime = {
    invoke: scriptedRuntime(invocations),
    listExtensions: () => [{ id: "knowledge-store", lifecycle: "ready" }],
  };
  const result = (await trackBRuntime.runTrackBShadowPipeline(runtime as never, {
    ...pipelineInput(),
    judgeOrderPolicy: "dual_order",
  })) as unknown as { readonly evaluation: Record<string, unknown> };
  expect(result.evaluation).toBeDefined();
  // The comparability key travels in the `evaluation:create-job` envelope, so it is the recorded
  // invocation — not the comparison-group readback — that proves the value reached Evaluation Core.
  const createJob = invocations.find(
    (call) => call.id === "evaluation-core" && call.capability === "evaluation:create-job",
  );
  expect(createJob).toBeDefined();
  const comparability = (createJob?.value as { comparability?: Record<string, unknown> })
    ?.comparability;
  expect(comparability?.judgeOrderPolicy).toBe("dual_order");
  expect(comparability?.taskTypeId).toBeUndefined();
});
