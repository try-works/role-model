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
      propensity: 0.4,
      outcome: {
        outcomeId: "outcome:counterfactual-96",
        outcomeRef: "artifact:outcome-counterfactual-96",
        outcomeDigest: "sha256:counterfactual-outcome-96",
        source: "replay",
        status: "failure",
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

test("Run96 S4 RED: shadow learning uses durable Evaluation Core trials rather than the legacy aggregate evaluator", async () => {
  const calls: Array<{ id: string; capability: unknown }> = [];
  let signalInput: Record<string, unknown> | undefined;
  let knowledgeInput: Record<string, unknown> | undefined;
  const trialIds = ["trial:source-96", "trial:counterfactual-96"];
  const claimedTrialIds = ["trial:source-96", "trial:counterfactual-96"];
  let createCount = 0;
  await expect(
    runTrackBShadowPipeline(
      {
        async invoke(id, envelope) {
          calls.push({ id, capability: envelope.capability });
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
            return {
              outputRef: "artifact:evaluated-output-96",
              outputDigest: "sha256:evaluated-output-96",
              stdoutRef: "artifact:evaluated-stdout-96",
              stderrRef: "artifact:evaluated-stderr-96",
              exitCode: 0,
              measurements: { elapsedMs: 1, outputBytes: 1 },
              scores: [{ dimension: "correctness", score: 1, confidence: 1, source: "deterministic" }],
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
        evaluationCases: [{ id: "case:shadow-96", expected: "success", actual: "success" }],
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
  expect(calls).not.toContainEqual({ id: "evaluation-runner-local", capability: "evaluation:run-local" });
  expect(calls).toContainEqual({ id: "trajectory-signals", capability: "signals:analyze-finalized-evaluation" });
  expect(calls).toContainEqual({ id: "profile-learner", capability: "profile:estimate-finalized-evaluation" });
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
