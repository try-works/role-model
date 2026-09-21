import { createHash } from "node:crypto";

import { expect, test } from "vitest";

import * as trackBRuntime from "../src/track-b-runtime.js";

/**
 * Run 97 RC06 (L7) - graph lineage at the knowledge boundary.
 *
 * Live evidence: the first judged comparisons reached the knowledge step and the worker
 * refused with
 * `grouped holdout learning explicit graph/evaluation/trial/score lineage required: graph lineage`
 * because every evidence row the pipeline sent was `evidenceKind: "evaluation"`, so the
 * mandatory graph lineage could never be satisfied and `knowledge_worker_candidates`
 * stayed 0.
 *
 * Canonical basis: `guidance/07_knowledge_store_and_knowledge_worker.md` requires the
 * worker to compare winners and losers with retained rollout references, and
 * `guidance/09_evaluation_core.md` keeps the graph and the evaluation store as separate
 * authorities - a learned candidate must be able to name the branch graph it came from
 * as well as the evaluation that scored it.
 */

test("run97 rc06 knowledge evidence carries both graph and evaluation lineage", async () => {
  const invocations: Array<{ id: string; capability: string; value: Record<string, unknown> }> = [];
  const deterministicScorer = trackBRuntime.createRun96RoutingShadowScorer();
  const runtime = {
    async invoke(id: string, envelope: Record<string, unknown>) {
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
        ["evaluation:submit-trial-result", "evaluation:record-trial-score-batch"].includes(
          capability,
        )
      ) {
        return {};
      }
      if (
        id === "evaluation-core" &&
        ["evaluation:finalize-comparison-group", "evaluation:read-comparison-group"].includes(
          capability,
        )
      ) {
        // The incumbent won: the decisive direction that used to be discarded entirely.
        return {
          groupId: "comparison:rc06-graph",
          status: "finalized",
          outcome: "source",
          members: [
            {
              trialId: "trial:source",
              scoreId: "trial-score:source",
              score: 1,
              confidence: 1,
              disposition: "positive",
              role: "source",
              candidateRef: "candidate-local",
            },
            {
              trialId: "trial:counterfactual",
              scoreId: "trial-score:counterfactual",
              score: 0,
              confidence: 1,
              disposition: "negative",
              role: "counterfactual",
              candidateRef: "candidate-remote",
            },
          ],
        };
      }
      if (id === "trajectory-signals") {
        return {
          routeDecisionId: "decision:rc06",
          graphRef: "artifact:source-graph",
          signals: [],
          evaluationProvenance: {
            groupId: "comparison:rc06-graph",
            status: "finalized",
            outcome: "source",
          },
        };
      }
      if (id === "profile-learner") {
        return {
          digest: "sha256:profile-rc06",
          effects: {
            routePackage: {
              values: ["candidate-local"],
              evidenceRefs: ["artifact:source-graph"],
              sampleCount: 2,
              confidence: 1,
              bias: "none",
            },
          },
        };
      }
      if (id === "knowledge-worker") {
        return { id: "candidate:rc06", state: "shadow", productionEffects: {} };
      }
      throw new Error(`unexpected invocation ${id}:${capability}`);
    },
  };

  await trackBRuntime.runTrackBShadowPipeline(runtime as never, {
    requestId: "run97-rc06-graph-lineage",
    channel: "development",
    scope: "tenant:rc06",
    authorizationEpoch: 1,
    productionState: {},
    routePackage: "candidate-local",
    sourceDecisionId: "decision:rc06",
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

  const knowledge = invocations.find((entry) => entry.id === "knowledge-worker");
  expect(knowledge).toBeDefined();
  const group = knowledge?.value.comparableGroup as Record<string, unknown> | undefined;
  expect(group).toBeDefined();
  const positive = (group?.positive ?? []) as Record<string, unknown>[];
  const negative = (group?.negative ?? []) as Record<string, unknown>[];
  expect(positive).toHaveLength(1);
  expect(negative).toHaveLength(1);
  // The winner's branch carries the graph lineage; the loser keeps the evaluation
  // lineage. Without both, the knowledge boundary refuses the whole comparison.
  expect(positive[0]).toMatchObject({
    evidenceKind: "graph",
    graphRef: "artifact:source-graph",
    trialId: "trial:source",
    scoreId: "trial-score:source",
  });
  expect(negative[0]).toMatchObject({
    evidenceKind: "evaluation",
    evaluationRef: "comparison:rc06-graph",
    trialId: "trial:counterfactual",
    scoreId: "trial-score:counterfactual",
  });
});
