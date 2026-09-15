import { createHash } from "node:crypto";

import { expect, test } from "vitest";

import * as trackBRuntime from "../src/track-b-runtime.js";

/**
 * Run 97 Repair Cycle 04 - L4.
 *
 * Live evidence (2026-09-13): the automatic comparison ran a single deterministic
 * scorer whose `requiredTerms` came from the request text (real case:
 * `requiredTerms: ["hey"]`). Both trials scored 0, every group finalized as `tie`,
 * and the learner therefore produced no evidence
 * (`knowledge_worker_candidates = 0`, profile stores degraded with
 * "finalized candidate evaluation provenance required").
 *
 * Canonical basis: `guidance/09_evaluation_core.md` owns the scorer families and the
 * replay scorer set `role-model.scorers.replay.pairwise.v1 ->
 * ['role_model_pairwise_judge.battle']`; `guidance/11` requires judge provenance
 * (alias/endpoint + dispatch receipt) and requires judge failures to be persisted as
 * failures, never as valid zero scores.
 *
 * These tests pin the pipeline contract: one router-backed pairwise judgement per
 * comparison, recorded as a durable second dimension on both trials.
 */

interface Invocation {
  readonly id: string;
  readonly capability: string;
  readonly value: Record<string, unknown>;
}

const comparableEvidence = () => ({
  source: {
    rolloutId: "rollout-source",
    routePackage: "endpoint:source",
    endpointId: "endpoint:source",
    modelId: "model:source",
    policyId: "run96-supervised-replay",
    reasoningEffort: "high",
    effortSource: "variant",
    evaluationActual: "The source assistant answer.",
    evidenceRef: "artifact:source-evidence",
    artifactRef: "artifact:source-output",
    propensity: 1,
    outcome: {
      outcomeId: "outcome:source",
      outcomeRef: "artifact:source-outcome",
      outcomeDigest: "sha256:source-output",
      source: "observed",
      status: "success",
    },
  },
  counterfactuals: [
    {
      rolloutId: "rollout-counterfactual",
      routePackage: "endpoint:counterfactual",
      endpointId: "endpoint:counterfactual",
      modelId: "model:counterfactual",
      policyId: "run96-supervised-replay",
      reasoningEffort: "high",
      effortSource: "variant",
      evaluationActual: "The counterfactual assistant answer.",
      evidenceRef: "artifact:counterfactual-evidence",
      artifactRef: "artifact:counterfactual-output",
      propensity: 1,
      outcome: {
        outcomeId: "outcome:counterfactual",
        outcomeRef: "artifact:counterfactual-outcome",
        outcomeDigest: "sha256:counterfactual-output",
        source: "replay",
        status: "success",
      },
    },
  ],
  candidateSet: [
    { routePackage: "endpoint:source", endpointId: "endpoint:source", propensity: 1 },
    {
      routePackage: "endpoint:counterfactual",
      endpointId: "endpoint:counterfactual",
      propensity: 1,
    },
  ],
});

const evaluationReferences = () => ({
  taskRef: "artifact:task",
  inputRef: "artifact:input",
  forkRef: "artifact:prefix",
  toolPolicyDigest: "artifact:tool-policy",
  environmentDigest: "artifact:environment",
  sourceEvidenceRef: "artifact:source-evidence",
  counterfactualEvidenceRef: "artifact:counterfactual-evidence",
  sourceOutcomeRef: "artifact:source-outcome",
  counterfactualOutcomeRef: "artifact:counterfactual-outcome",
  perCase: [
    { caseId: "case:source", evidenceRef: "artifact:case-source" },
    { caseId: "case:counterfactual", evidenceRef: "artifact:case-counterfactual" },
  ],
});

const evaluationCases = () => [
  {
    id: "case:source",
    evaluationCriteria: {
      schemaVersion: "role-model.semantic-criteria.v1",
      requiredTerms: ["expected-route"],
    },
  },
  {
    id: "case:counterfactual",
    evaluationCriteria: {
      schemaVersion: "role-model.semantic-criteria.v1",
      requiredTerms: ["expected-route"],
    },
  },
];

function scriptedRuntime(invocations: Invocation[]) {
  const deterministicScorer = trackBRuntime.createRun96RoutingShadowScorer();
  return async (id: string, envelope: Record<string, unknown>) => {
    const capability = String(envelope.capability ?? "");
    const value = (envelope.value ?? {}) as Record<string, unknown>;
    invocations.push({ id, capability, value });
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
              referenceDigest: `sha256:${createHash("sha256").update(reference).digest("hex")}`,
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
          { trialId: "trial:source", candidateRef: "endpoint:source", caseId: "case:source" },
          {
            trialId: "trial:counterfactual",
            candidateRef: "endpoint:counterfactual",
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
      ["evaluation:finalize-comparison-group", "evaluation:read-comparison-group"].includes(
        capability,
      )
    ) {
      return { status: "finalized", outcome: "candidate", groupId: `comparison:${envelope.requestId ?? "run"}` };
    }
    if (id === "trajectory-signals") {
      return { routeDecisionId: "route-rc04", graphRef: "sha256:graph-rc04", signals: [] };
    }
    if (id === "profile-learner") return { digest: "sha256:profile-rc04", effects: {} };
    throw new Error(`unexpected invocation ${id}:${capability}`);
  };
}

const pipelineInput = (requestId: string) => ({
  requestId,
  channel: "development",
  scope: "tenant:rc04",
  authorizationEpoch: 1,
  productionState: {},
  routePackage: "endpoint:source",
  sourceDecisionId: "decision-rc04",
  sourceGraphRef: "artifact:source-output",
  prefix: ["request"],
  sourcePrefixRef: "artifact:prefix",
  counterfactuals: [{ id: "endpoint:counterfactual", suffix: [] }],
  comparableEvidence: comparableEvidence(),
  evaluationCases: evaluationCases(),
  evaluationReferences: evaluationReferences(),
  trajectoryEvents: [],
});

test("run97 rc04 registers the canonical pairwise judge scorer for the comparison", async () => {
  const invocations: Invocation[] = [];
  const runtime = { invoke: scriptedRuntime(invocations) };
  await trackBRuntime
    .runTrackBShadowPipeline(runtime, {
      ...pipelineInput("run97-rc04-judge"),
      judge: {
        endpointId: "endpoint:judge",
        dispatch: async () => ({
          winner: "counterfactual" as const,
          confidence: 0.8,
          dispatchReceiptId: "dispatch:judge-1",
          routerDecisionId: "decision:judge-1",
          judgeResultRef: "artifact:judge-result-1",
          judgeEndpointId: "endpoint:judge",
        }),
      },
    })
    .catch(() => null);
  const registrations = invocations.filter(
    (call) =>
      call.id === "evaluation-core" && call.capability === "evaluation:register-scorer",
  );
  const judgeRegistration = registrations.find(
    (call) => call.value.source === "role_model_pairwise_judge",
  );
  expect(judgeRegistration).toBeDefined();
  expect(judgeRegistration?.value).toMatchObject({
    manifestVersion: 2,
    id: "role_model_pairwise_judge.battle",
    dimensions: ["task_specific_quality"],
    judgeEndpointId: "endpoint:judge",
    scorerSetVersion: trackBRuntime.RUN96_ROUTING_SHADOW_SCORER_SET_VERSION,
  });
  // Run 98 R10 / Run 99 R33: the version is derived from the judge identity (endpoint + mode) and
  // carries the definition-shape prefix, so a definition change registers a new durable scorer
  // instead of colliding with the previous one ("duplicate scorer ID has incompatible version").
  expect(String(judgeRegistration?.value.version)).toMatch(
    new RegExp(`^${trackBRuntime.RUN97_PAIRWISE_JUDGE_DEFINITION_VERSION}\\+[a-f0-9]{12}$`),
  );
  expect(String(judgeRegistration?.value.digest)).toMatch(/^sha256:[a-f0-9]{64}$/);
});

test("run97 rc04 dispatches the judge once per comparison and records both preferences", async () => {
  const invocations: Invocation[] = [];
  const runtime = { invoke: scriptedRuntime(invocations) };
  const judgeRequests: Record<string, unknown>[] = [];
  await trackBRuntime
    .runTrackBShadowPipeline(runtime, {
      ...pipelineInput("run97-rc04-judge"),
      judge: {
        endpointId: "endpoint:judge",
        dispatch: async (request) => {
          judgeRequests.push(request as Record<string, unknown>);
          return {
            winner: "counterfactual" as const,
            confidence: 0.8,
            dispatchReceiptId: "dispatch:judge-1",
            routerDecisionId: "decision:judge-1",
            judgeResultRef: "artifact:judge-result-1",
            judgeEndpointId: "endpoint:judge",
          };
        },
      },
    })
    .catch(() => null);

  expect(judgeRequests).toHaveLength(1);
  expect(judgeRequests[0]).toMatchObject({
    channel: "development",
    scope: "tenant:rc04",
    judgeEndpointId: "endpoint:judge",
    source: { candidateRef: "endpoint:source", outputText: "The source assistant answer." },
    counterfactual: {
      candidateRef: "endpoint:counterfactual",
      outputText: "The counterfactual assistant answer.",
    },
  });

  const judgeScores = invocations
    .filter(
      (call) =>
        call.id === "evaluation-core" &&
        call.capability === "evaluation:record-trial-score-batch",
    )
    .flatMap((call) => {
      const scores = Array.isArray(call.value.scores)
        ? (call.value.scores as Record<string, unknown>[])
        : [];
      return scores
        .filter((score) => score.dimension === "task_specific_quality")
        .map((score) => ({ trialId: call.value.trialId, score }));
    });
  expect(judgeScores).toHaveLength(2);
  for (const entry of judgeScores) {
    expect(entry.score).toMatchObject({
      scorerId: "role_model_pairwise_judge.battle",
      source: "role_model_pairwise_judge",
      dimension: "task_specific_quality",
      confidence: 0.8,
      judgeReceipt: {
        dispatchReceiptId: "dispatch:judge-1",
        routerDecisionId: "decision:judge-1",
        judgeResultRef: "artifact:judge-result-1",
        judgeEndpointId: "endpoint:judge",
      },
    });
  }
  const byTrial = new Map(judgeScores.map((entry) => [entry.trialId, entry.score.score]));
  expect(byTrial.get("trial:counterfactual")).toBe(1);
  expect(byTrial.get("trial:source")).toBe(0);
});

test("run97 rc04 persists a judge failure as bounded missingness instead of a zero score", async () => {
  const invocations: Invocation[] = [];
  const runtime = { invoke: scriptedRuntime(invocations) };
  await trackBRuntime
    .runTrackBShadowPipeline(runtime, {
      ...pipelineInput("run97-rc04-judge-failure"),
      judge: {
        endpointId: "endpoint:judge",
        dispatch: async () => {
          throw new Error("judge endpoint returned HTTP 503");
        },
      },
    })
    .catch(() => null);

  const judgeScores = invocations
    .filter(
      (call) =>
        call.id === "evaluation-core" &&
        call.capability === "evaluation:record-trial-score-batch",
    )
    .flatMap((call) => {
      const scores = Array.isArray(call.value.scores)
        ? (call.value.scores as Record<string, unknown>[])
        : [];
      return scores.filter((score) => score.dimension === "task_specific_quality");
    });
  expect(judgeScores).toHaveLength(2);
  for (const score of judgeScores) {
    expect(score.score).toBeNull();
    expect(score.missingness).toBe("invalid");
    expect(String(score.missingReason)).toMatch(/judge/i);
    expect(score).not.toMatchObject({ score: 0 });
  }
});
