import { expect, test } from "vitest";

import {
  resolveTrackBRouteAdvisory,
  runTrackBShadowPipeline,
} from "../src/track-b-runtime.js";

const comparableEvidence = {
  source: {
    rolloutId: "rollout:source-96",
    routePackage: "candidate:source-96",
    endpointId: "endpoint:source-96",
    modelId: "model:source-96",
    policyId: "routing-shadow",
    reasoningEffort: "high",
    effortSource: "variant",
    evidenceRef: "artifact:source-96",
    artifactRef: "artifact:source-output-96",
    evaluationActual: "success",
    propensity: 0.6,
    outcome: {
      outcomeId: "outcome:source-96",
      outcomeRef: "artifact:outcome-source-96",
      outcomeDigest: "sha256:source-outcome-96",
      source: "observed",
      status: "success",
    },
  },
  counterfactuals: [
    {
      rolloutId: "rollout:counterfactual-96",
      routePackage: "candidate:counterfactual-96",
      endpointId: "endpoint:counterfactual-96",
      modelId: "model:counterfactual-96",
      policyId: "routing-shadow",
      reasoningEffort: "max",
      effortSource: "variant",
      evidenceRef: "artifact:counterfactual-96",
      artifactRef: "artifact:counterfactual-output-96",
      evaluationActual: "failure",
      propensity: 0.4,
      outcome: {
        outcomeId: "outcome:counterfactual-96",
        outcomeRef: "artifact:outcome-counterfactual-96",
        outcomeDigest: "sha256:counterfactual-outcome-96",
        source: "replay",
        // A successful provider transport is not positive learning evidence.  The
        // independently observed semantic criterion below deliberately fails.
        status: "success",
      },
    },
  ],
  candidateSet: [
    { routePackage: "candidate:source-96", endpointId: "endpoint:source-96", propensity: 0.6 },
    { routePackage: "candidate:counterfactual-96", endpointId: "endpoint:counterfactual-96", propensity: 0.4 },
  ],
};

test("Run96 S5 RED: route-learning advisories are scope-bound shadow receipts with expiry and rollback", () => {
  const disposition = resolveTrackBRouteAdvisory({
    baselineDecisionId: "decision:96",
    channel: "development",
    scope: "tenant:run96",
    authorizationEpoch: 96,
    routePackage: "candidate:96",
    profileSnapshotIds: ["profile:96"],
    candidateId: "knowledge:96",
    nowMs: 96_000,
  });

  expect(disposition).toMatchObject({
    schemaVersion: "role-model.route-advisory-disposition.v1",
    mode: "shadow",
    disposition: "not_applied_shadow",
    baselineDecisionId: "decision:96",
    scope: "tenant:run96",
    authorizationEpoch: 96,
    routePackage: "candidate:96",
    profileSnapshotIds: ["profile:96"],
    candidateId: "knowledge:96",
    confidence: 0,
    expiresAtMs: 156_000,
    rollbackDisposition: "baseline_retained",
    productionMutation: false,
  });
  expect(disposition.advisoryId).toMatch(/^advisory:[a-f0-9]{64}$/);
  expect(disposition.decisionAdvice).toEqual({
    consideredAdviceIds: [disposition.advisoryId],
    acceptedAdviceIds: [],
    rejectedAdviceIds: [disposition.advisoryId],
    staleAdviceIds: [],
    unavailableAdviceIds: [],
    deterministicFallback: "baseline_retained",
  });

  expect(() => resolveTrackBRouteAdvisory({
    baselineDecisionId: "decision:96",
    channel: "production",
    scope: "tenant:run96",
    authorizationEpoch: 96,
    routePackage: "candidate:96",
    profileSnapshotIds: [],
    candidateId: null,
    nowMs: 96_000,
  })).toThrow("route-learning advisories are shadow-only");
});

test("Run96 S5 RED: stale and unavailable advisory evidence remains visible while baseline routing wins", () => {
  for (const advisoryState of ["stale", "unavailable"] as const) {
    const disposition = resolveTrackBRouteAdvisory({
      baselineDecisionId: "decision:96-fallback",
      channel: "development",
      scope: "tenant:run96",
      authorizationEpoch: 96,
      routePackage: "candidate:96-fallback",
      profileSnapshotIds: ["profile:96-fallback"],
      candidateId: "knowledge:96-fallback",
      advisoryState,
      nowMs: 96_000,
    });

    expect(disposition.decisionAdvice).toMatchObject({
      consideredAdviceIds: [disposition.advisoryId],
      acceptedAdviceIds: [],
      rejectedAdviceIds: [disposition.advisoryId],
      deterministicFallback: "baseline_retained",
      ...(advisoryState === "stale"
        ? { staleAdviceIds: [disposition.advisoryId], unavailableAdviceIds: [] }
        : { staleAdviceIds: [], unavailableAdviceIds: [disposition.advisoryId] }),
    });
  }
});

test("Run96 S4 RED: shadow learning uses durable Evaluation Core trials rather than the legacy aggregate evaluator", async () => {
  const calls: Array<{ id: string; capability: unknown }> = [];
  let scorerRegistration: unknown;
  let signalInput: Record<string, unknown> | undefined;
  let profileInput: Record<string, unknown> | undefined;
  let knowledgeInput: Record<string, unknown> | undefined;
  const trialIds = ["trial:source-96", "trial:counterfactual-96"];
  const claimedTrialIds = ["trial:source-96", "trial:counterfactual-96"];
  let createCount = 0;
  await expect(
    runTrackBShadowPipeline(
      {
        async invoke(id, envelope) {
          calls.push({ id, capability: envelope.capability });
          if (id === "evaluation-core" && envelope.capability === "evaluation:register-scorer") {
            scorerRegistration = envelope.value;
          }
          if (id === "evaluation-runner-local" && envelope.capability === "evaluation:run-local") {
            throw new Error("legacy aggregate evaluation is prohibited");
          }
          if (id === "replay-core") {
            return {
              sourceDecisionId: "decision:source-96",
              sourceGraphRef: "artifact:source-graph-96",
              sharedPrefixRef: "artifact:source-graph-96#prefix",
              branches: [],
              digest: "sha256:replay-plan-96",
              businessOutput: { richPromptContent: "must-not-cross-the-knowledge-ipc-boundary" },
            };
          }
          if (id === "evaluation-core" && envelope.capability === "evaluation:register-scorer") {
            return { key: "run96-exact@1" };
          }
          if (id === "evaluation-core" && envelope.capability === "evaluation:create-job") {
            return { jobId: `evaluation:job-${createCount++}` };
          }
          if (id === "evaluation-core" && envelope.capability === "evaluation:list-trials") {
            const trialId = trialIds.shift();
            return trialId ? [{ trialId }] : [];
          }
          if (id === "evaluation-runner-local" && envelope.capability === "evaluation:execute-trial") {
            const actual = (envelope.value as Record<string, unknown>).actual;
            return {
              outputRef: "artifact:evaluated-output-96",
              outputDigest: "sha256:evaluated-output-96",
              stdoutRef: "artifact:evaluated-stdout-96",
              stderrRef: "artifact:evaluated-stderr-96",
              exitCode: 0,
              measurements: { elapsedMs: 1, outputBytes: 1 },
              scores: [{
                scorerId: "run96-semantic-criteria",
                scorerVersion: "1",
                scorerDigest: "sha256:semantic-criteria",
                dimension: "correctness",
                score: actual === "success" ? 1 : 0,
                confidence: 1,
                source: "deterministic_semantic_criteria",
              }],
            };
          }
          if (id === "evaluation-core" && envelope.capability === "evaluation:claim-trial") {
            return { trialId: claimedTrialIds.shift(), leaseId: "lease:96" };
          }
          if (id === "evaluation-core" && ["evaluation:submit-trial-result", "evaluation:record-trial-score"].includes(String(envelope.capability))) {
            return { accepted: true };
          }
          if (id === "evaluation-core" && envelope.capability === "evaluation:finalize-comparison-group") {
            return { groupId: "comparison:96", status: "finalized", outcome: "candidate" };
          }
          if (id === "evaluation-core" && envelope.capability === "evaluation:read-comparison-group") {
            return { groupId: "comparison:96", status: "finalized", outcome: "candidate" };
          }
          if (id === "trajectory-signals") {
            signalInput = envelope.value as Record<string, unknown>;
            return {
              routeDecisionId: "decision:source-96",
              graphRef: "artifact:source-graph-96",
              signals: [{
                signalInstanceId: "comparison:96:evaluation_outcome",
                signalType: "evaluation_outcome",
                dimension: "quality",
                unit: "normalized_score",
                direction: "higher_is_better",
                value: 1,
                confidence: 1,
                weight: 1,
                missingness: "complete",
                evidenceRef: "comparison:96",
                routePackage: "candidate:source-96",
                businessOutput: { richPayload: "must-remain-in-the-trajectory-store" },
              }],
            };
          }
          if (id === "profile-learner") {
            profileInput = envelope.value as Record<string, unknown>;
            return {
              profileId: "profile:96",
              digest: "sha256:profile-96",
              effects: {
                routePackage: {
                  values: ["candidate:source-96"],
                  evidenceRefs: ["artifact:source-96"],
                  sampleCount: 2,
                  confidence: 1,
                  bias: "none",
                },
              },
            };
          }
          if (id === "knowledge-worker") {
            knowledgeInput = envelope.value as Record<string, unknown>;
            return { id: "candidate:96", state: "shadow", productionEffects: {} };
          }
          throw new Error(`unexpected invocation ${id}:${String(envelope.capability)}`);
        },
      },
      {
        requestId: "request:shadow-96",
        channel: "development",
        scope: "tenant:run96",
        authorizationEpoch: 96,
        productionState: {},
        routePackage: "candidate:source-96",
        sourceDecisionId: "decision:source-96",
        sourceGraphRef: "artifact:source-graph-96",
        prefix: [],
        counterfactuals: [{ id: "candidate:counterfactual-96", suffix: [] }],
        comparableEvidence,
        evaluationCases: [{
          id: "case:shadow-96",
          evaluationCriteria: {
            schemaVersion: "role-model.semantic-criteria.v1",
            requiredTerms: ["success"],
          },
        }],
        trajectoryEvents: [],
      },
    ),
  ).resolves.toMatchObject({
    evaluation: { groupId: "comparison:96", outcome: "candidate" },
    advisory: {
      mode: "shadow",
      disposition: "not_applied_shadow",
      baselineDecisionId: "decision:source-96",
    },
  });

  expect(calls).toEqual(
    expect.arrayContaining([
      { id: "evaluation-core", capability: "evaluation:register-scorer" },
      { id: "evaluation-core", capability: "evaluation:create-job" },
      { id: "evaluation-core", capability: "evaluation:list-trials" },
      { id: "evaluation-runner-local", capability: "evaluation:execute-trial" },
      { id: "evaluation-core", capability: "evaluation:finalize-comparison-group" },
      { id: "evaluation-core", capability: "evaluation:read-comparison-group" },
    ]),
  );
  expect(scorerRegistration).toBeDefined();
  // R14: a source/candidate output hash comparison is useful integrity evidence,
  // but cannot be the evaluation gate by itself.  The supervised pipeline must
  // register a bounded semantic criterion scorer instead of exact_match.
  expect(scorerRegistration).toMatchObject({
    id: "run96-semantic-criteria",
    algorithm: "required_terms",
    requiredInputs: ["outputRef", "evaluationCriteria"],
  });
  expect(calls).not.toContainEqual({ id: "evaluation-runner-local", capability: "evaluation:run-local" });
  expect(calls).toContainEqual({ id: "trajectory-signals", capability: "signals:analyze-finalized-evaluation" });
  expect(calls).toContainEqual({ id: "profile-learner", capability: "profile:estimate-finalized-evaluation" });
  // The second rollout has a successful transport status but fails the required
  // semantic criterion.  Learning must receive the evaluator's 0, not a
  // transport-derived positive label.
  expect(profileInput?.rows).toEqual(expect.arrayContaining([
    expect.objectContaining({ endpoint: "endpoint:source-96", outcome: 1 }),
    expect.objectContaining({ endpoint: "endpoint:counterfactual-96", outcome: 0 }),
  ]));
  expect(signalInput).toMatchObject({
    finalizedEvaluation: { groupId: "comparison:96", status: "finalized", outcome: "candidate" },
    routeDecisionId: "decision:source-96",
    graphRef: "artifact:source-graph-96",
    replayRef: "sha256:replay-plan-96",
  });
  expect(knowledgeInput?.replay).toEqual({
    sourceDecisionId: "decision:source-96",
    sourceGraphRef: "artifact:source-graph-96",
    sharedPrefixRef: "artifact:source-graph-96#prefix",
    branches: [],
    digest: "sha256:replay-plan-96",
  });
  expect(knowledgeInput?.signals).toEqual({
    routeDecisionId: "decision:source-96",
    graphRef: "artifact:source-graph-96",
    signals: [{
      signalInstanceId: "comparison:96:evaluation_outcome",
      signalType: "evaluation_outcome",
      dimension: "quality",
      unit: "normalized_score",
      direction: "higher_is_better",
      value: 1,
      confidence: 1,
      weight: 1,
      missingness: "complete",
      evidenceRef: "comparison:96",
      routePackage: "candidate:source-96",
    }],
  });
});

test("Run96 S4 RED: durable replay evaluation sends the same bounded semantic criteria to source and counterfactual trials", async () => {
  const executionInputs: Record<string, unknown>[] = [];
  const durableCases: Record<string, unknown>[] = [];
  const trialIds = ["trial:source-digest", "trial:counterfactual-digest"];
  await runTrackBShadowPipeline(
    {
      async invoke(id, envelope) {
        if (id === "replay-core") {
          return {
            sourceDecisionId: "decision:source-digest",
            sourceGraphRef: "artifact:source-digest",
            sharedPrefixRef: "artifact:source-digest#prefix",
            branches: [],
            digest: "sha256:replay-digest",
          };
        }
        if (id === "evaluation-core" && envelope.capability === "evaluation:register-scorer") return { key: "digest@1" };
        if (id === "evaluation-core" && envelope.capability === "evaluation:create-job") {
          durableCases.push(envelope.value as Record<string, unknown>);
          return { jobId: "job:digest" };
        }
        if (id === "evaluation-core" && envelope.capability === "evaluation:list-trials") return [{ trialId: trialIds.shift() }];
        if (id === "evaluation-core" && envelope.capability === "evaluation:claim-trial") return { trialId: (envelope.value as Record<string, unknown>).trialId, leaseId: "lease:digest" };
        if (id === "evaluation-runner-local" && envelope.capability === "evaluation:execute-trial") {
          executionInputs.push(envelope.value as Record<string, unknown>);
          return {
            outputRef: "artifact:output-digest",
            outputDigest: "sha256:output-digest",
            stdoutRef: "artifact:stdout-digest",
            stderrRef: "artifact:stderr-digest",
            exitCode: 0,
            measurements: { elapsedMs: 1, outputBytes: 1 },
            scores: [{ scorerId: "run96-semantic-criteria", scorerVersion: "1", scorerDigest: "sha256:scorer", dimension: "correctness", score: 0, confidence: 1, source: "deterministic_semantic_criteria" }],
          };
        }
        if (id === "evaluation-core" && ["evaluation:submit-trial-result", "evaluation:record-trial-score"].includes(String(envelope.capability))) return { accepted: true };
        if (id === "evaluation-core" && envelope.capability === "evaluation:finalize-comparison-group") return { groupId: "comparison:request-digest", status: "finalized", outcome: "tie" };
        if (id === "evaluation-core" && envelope.capability === "evaluation:read-comparison-group") return { groupId: "comparison:request-digest", status: "finalized", outcome: "tie" };
        if (id === "trajectory-signals") return { routeDecisionId: "decision:source-digest", graphRef: "artifact:source-digest", signals: [] };
        if (id === "profile-learner") return { profileId: "profile:digest", digest: "sha256:profile-digest", effects: {} };
        if (id === "knowledge-worker") return { id: "candidate:digest", state: "shadow" };
        throw new Error(`unexpected invocation ${id}:${String(envelope.capability)}`);
      },
    },
    {
      requestId: "request:digest",
      channel: "development",
      scope: "tenant:run96",
      authorizationEpoch: 96,
      productionState: {},
      routePackage: "candidate:source-digest",
      sourceDecisionId: "decision:source-digest",
      sourceGraphRef: "artifact:source-digest",
      prefix: [],
      counterfactuals: [{ id: "candidate:counterfactual-digest", suffix: [] }],
      comparableEvidence: {
        source: {
          rolloutId: "rollout:source-digest",
          routePackage: "candidate:source-digest",
          endpointId: "endpoint:source-digest",
          modelId: "model:source-digest",
          policyId: "routing-shadow",
          reasoningEffort: "high",
          evidenceRef: "artifact:source-digest",
          artifactRef: "artifact:source-output-digest",
          evaluationActual: "The source output satisfies the required semantic criterion.",
          outcome: { status: "success", outcomeDigest: "sha256:source-outcome-digest" },
        },
        counterfactuals: [{
          rolloutId: "rollout:counterfactual-digest",
          routePackage: "candidate:counterfactual-digest",
          endpointId: "endpoint:counterfactual-digest",
          modelId: "model:counterfactual-digest",
          policyId: "routing-shadow",
          reasoningEffort: "max",
          evidenceRef: "artifact:counterfactual-digest",
          artifactRef: "artifact:counterfactual-output-digest",
          evaluationActual: "The counterfactual output is independently observed.",
          outcome: { status: "success", outcomeDigest: "sha256:counterfactual-outcome-digest" },
        }],
        candidateSet: [
          { routePackage: "candidate:source-digest", endpointId: "endpoint:source-digest" },
          { routePackage: "candidate:counterfactual-digest", endpointId: "endpoint:counterfactual-digest" },
        ],
      },
      evaluationCases: [{
        evaluationCriteria: {
          schemaVersion: "role-model.semantic-criteria.v1",
          requiredTerms: ["output"],
          forbiddenTerms: ["credential"],
          minOutputChars: 12,
        },
      }],
      trajectoryEvents: [],
    },
  );

  expect(executionInputs).toHaveLength(2);
  expect(durableCases).toHaveLength(2);
  expect(durableCases.map((job) => (job.cases as Array<Record<string, unknown>>)[0])).toEqual([
    expect.objectContaining({
      evaluationCriteria: {
        schemaVersion: "role-model.semantic-criteria.v1",
        requiredTerms: ["output"],
        forbiddenTerms: ["credential"],
        minOutputChars: 12,
      },
      evaluationCriteriaDigest: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
    }),
    expect.objectContaining({
      evaluationCriteria: {
        schemaVersion: "role-model.semantic-criteria.v1",
        requiredTerms: ["output"],
        forbiddenTerms: ["credential"],
        minOutputChars: 12,
      },
      evaluationCriteriaDigest: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
    }),
  ]);
  expect(executionInputs).toEqual([
    expect.objectContaining({
      actual: "The source output satisfies the required semantic criterion.",
      evaluationCriteria: {
        schemaVersion: "role-model.semantic-criteria.v1",
        requiredTerms: ["output"],
        forbiddenTerms: ["credential"],
        minOutputChars: 12,
      },
    }),
    expect.objectContaining({
      actual: "The counterfactual output is independently observed.",
      evaluationCriteria: {
        schemaVersion: "role-model.semantic-criteria.v1",
        requiredTerms: ["output"],
        forbiddenTerms: ["credential"],
        minOutputChars: 12,
      },
    }),
  ]);
});
