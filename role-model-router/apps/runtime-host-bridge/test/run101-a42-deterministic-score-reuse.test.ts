import { createHash } from "node:crypto";

import { expect, test } from "vitest";

import * as trackBRuntime from "../src/track-b-runtime.js";

/**
 * Run 101 addendum 42 - the deterministic score batch must be as reuse-aware as the judge batch.
 *
 * Measured live on `:3457` (2026-09-28T10:04:36Z): capture `req-1e9d20ff-9619-4f65-9bd7-78beb9d957db` was
 * deferred as `replay_failed` with
 * `replay endpoint HTTP 409: {"error":"extension evaluation-core failed: evaluation trial score batch conflict"}`.
 * The capture's replay job is `a0e6dcaaeab60af428d906cc8e43da4d6a098bb0e08a2ce1186dd9d22f042824` and its
 * evaluation job is `evaluation-replay-e330a7331f300682b7b2`, whose four trials are all `scored`: cases `:0`
 * and `:1` carry the pairwise-judge row *and* the deterministic `run96-semantic-criteria` correctness row,
 * while `:2` and `:3` carry the deterministic row only.
 *
 * `evaluation:record-trial-score-batch` refuses an existing identity with a different `score_json`
 * (`evaluation-core/index.mjs:2940`). Addendum 37 made the **judge** batch per-branch reuse-aware, so a pair
 * that already carries the judge's row is skipped instead of re-recorded. The **deterministic** batch
 * (`track-b-runtime.ts:9175`) had no such guard: every pass re-recorded `execution.scores` for every rollout,
 * so a resumed or repeated pass re-recorded a correctness row that already existed, and the extension refused
 * the whole replay with `evaluation trial score batch conflict`. Its sibling refusal
 * (`partial evaluation trial scores require recovery`, `index.mjs:2943`) is the same defect one row earlier.
 *
 * The assertions below are the contract: a durable correctness row is the authority and is never re-recorded;
 * a trial that has none is still recorded exactly as before.
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

/**
 * The durable correctness rows the host's read path must see. `resumed` seeds the source trial only, which is
 * the live shape: a partially scored job whose other member still needs its row.
 */
function scriptedRuntime(
  invocations: Invocation[],
  options: { readonly durableCorrectnessForSource: boolean },
) {
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
    if (id === "evaluation-core" && capability === "evaluation:list-trial-scores") {
      if (value.trialId === "trial:source" && options.durableCorrectnessForSource) {
        /**
         * The durable row the first attempt recorded. Its `score` is what the comparison must adopt, and its
         * `scoreId` is what `completedRollouts` must carry. A second `record-trial-score-batch` for this
         * identity is exactly what the extension refuses.
         */
        return {
          value: [
            {
              scoreId: "trial-score:durable-source",
              trialId: "trial:source",
              caseId: "case:source",
              scorerId: deterministicScorer.id,
              scorerVersion: deterministicScorer.version,
              scorerDigest: deterministicScorer.digest,
              dimension: "correctness",
              score: 1,
              confidence: 1,
              source: "deterministic_semantic_criteria",
            },
          ],
        };
      }
      return { value: [] };
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
            // Deliberately *different* from the durable row: if the host re-records this, the extension
            // answers `evaluation trial score batch conflict` - the live refusal this addendum is about.
            score: 0,
            confidence: 0.5,
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
      return {
        status: "finalized",
        outcome: "candidate",
        groupId: `comparison:${envelope.requestId ?? "run"}`,
      };
    }
    if (id === "trajectory-signals") {
      return {
        routeDecisionId: value.routeDecisionId,
        graphRef: value.graphRef,
        signals: [],
      };
    }
    if (id === "profile-learner") return { digest: "sha256:profile-a42", effects: {} };
    throw new Error(`unexpected invocation ${id}:${capability}`);
  };
}

const pipelineInput = (requestId: string) => ({
  requestId,
  channel: "development",
  scope: "tenant:a42",
  authorizationEpoch: 1,
  productionState: {},
  routePackage: "endpoint:source",
  sourceDecisionId: "decision-a42",
  sourceGraphRef: "artifact:source-output",
  prefix: ["request"],
  sourcePrefixRef: "artifact:prefix",
  counterfactuals: [{ id: "endpoint:counterfactual", suffix: [] }],
  comparableEvidence: comparableEvidence(),
  evaluationCases: evaluationCases(),
  evaluationReferences: evaluationReferences(),
  trajectoryEvents: [],
  learningPolicy: {
    evidenceFloor: {
      minDecisiveComparisons: 1,
      minHoldoutComparisons: 1,
      minDevelopmentComparisons: 1,
      minDistinctCaptures: 1,
    },
    guardrails: { qualityMinDelta: 0 },
    promotionProtocol: {
      protocolId: "promotion:a42",
      primaryMetricId: "role_model_pairwise_judge.battle",
      direction: "higher_is_better" as const,
      minimumPracticalDelta: 0,
      intervalLevel: 0.9,
      resamples: 10,
      bootstrapSeed: 1,
      analysisMethod: "paired_cluster_bootstrap" as const,
      selectionFamilySize: 1,
      multiplicityAdjustment: "none" as const,
    },
  },
});

const judgeDecision = () => ({
  winner: "counterfactual" as const,
  confidence: 0.8,
  dispatchReceiptId: "dispatch:judge-a42",
  routerDecisionId: "decision:judge-a42",
  judgeResultRef: "artifact:judge-result-a42",
  judgeEndpointId: "endpoint:judge",
});

function correctnessRowsFor(invocations: Invocation[], trialId: string): Record<string, unknown>[] {
  return invocations
    .filter(
      (call) =>
        call.id === "evaluation-core" && call.capability === "evaluation:record-trial-score-batch",
    )
    .filter((call) => call.value.trialId === trialId)
    .flatMap((call) => (Array.isArray(call.value.scores) ? call.value.scores : []))
    .filter((score) => (score as Record<string, unknown>).dimension === "correctness") as Record<
    string,
    unknown
  >[];
}

test("run101-a42 a durable correctness row is adopted instead of re-recorded", async () => {
  const invocations: Invocation[] = [];
  const runtime = {
    invoke: scriptedRuntime(invocations, { durableCorrectnessForSource: true }),
  };
  await trackBRuntime.runTrackBShadowPipeline(runtime, {
    ...pipelineInput("run101-a42-resumed"),
    judge: { endpointId: "endpoint:judge", dispatch: async () => judgeDecision() },
  });

  // The resumed member must not be re-recorded: the extension refuses a second row for the same
  // (trial, scorer, version, dimension) whose `score_json` differs, and that refusal is what turned a
  // successful replay into `replay_failed`.
  expect(correctnessRowsFor(invocations, "trial:source")).toEqual([]);
  // The member that genuinely has no row is still recorded, exactly once.
  expect(correctnessRowsFor(invocations, "trial:counterfactual")).toHaveLength(1);
});

test("run101-a42 a first pass still records the correctness row exactly once", async () => {
  const invocations: Invocation[] = [];
  const runtime = {
    invoke: scriptedRuntime(invocations, { durableCorrectnessForSource: false }),
  };
  await trackBRuntime.runTrackBShadowPipeline(runtime, {
    ...pipelineInput("run101-a42-first-pass"),
    judge: { endpointId: "endpoint:judge", dispatch: async () => judgeDecision() },
  });

  expect(correctnessRowsFor(invocations, "trial:source")).toHaveLength(1);
  expect(correctnessRowsFor(invocations, "trial:counterfactual")).toHaveLength(1);
});
