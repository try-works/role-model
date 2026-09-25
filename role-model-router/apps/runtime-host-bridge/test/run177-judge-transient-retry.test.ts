import { createHash } from "node:crypto";

import { expect, test } from "vitest";

import * as trackBRuntime from "../src/track-b-runtime.js";
import { PairwiseJudgeOrderDisagreementError } from "../src/track-b-shadow-judge-dispatch.js";

/**
 * Run 177 (addendum 46) — the judge coverage of the newest finalized comparisons.
 *
 * Measured live on the `run176-63b9961c` stage store (`E:\tmp\run177-judge-window.mjs`,
 * `E:\tmp\run177-judge-diag.mjs`): of the newest 100 finalized comparison groups, 33 carried a scored
 * pairwise-judge row on both members, 5 carried an `invalid` row (a one-shot transient failure —
 * `terminated` x8 / `fetch failed` x2 in the newest window), and 60 carried no judge row at all. The
 * 60 are all `comparison:supervised-replay:*` groups whose declared primary metric
 * (`role_model_pairwise_judge.battle`) was never observed, i.e. the comparison was finalized without
 * the only decisive dimension it declared. Two mechanisms produce that class:
 *
 * 1. A transient dispatch failure (`terminated`, `fetch failed`, timeout/abort, "No execution target is
 *    currently eligible") was recorded once, permanently costing the comparison its decisive dimension.
 *    Transport/provider failures are retried up to `RUN177_TRANSIENT_JUDGE_RETRY_BOUND` extra attempts;
 *    semantic failures (`position_order_disagreement`, unknown winner, unbounded confidence) are not
 *    retried, because a second identical dispatch cannot repair them.
 * 2. No judge was resolved at all, so the judge block was skipped and the member trials carried no row
 *    for the declared metric. That class is **deliberately left alone** (root decision, 2026-09-26,
 *    brief `run177b_retry_only`): recording the bounded scorer-failure shape for it was implemented and
 *    then removed, because an `invalid` row makes the group `incomplete` under the frozen finalize rule,
 *    so 15 of the newest 100 comparisons that decide today on the deterministic semantic fallback would
 *    finalize `insufficient` instead. The gap already has a member-level name
 *    (`missingScores: ["role_model_pairwise_judge.battle"]`), and a transient failure inside the class
 *    is repaired by (1) rather than papered over.
 *
 * `run177-no-judge-row` pins the boundary of (2) for a comparison that *declares* the pairwise judge as
 * its promotion primary metric (`learningPolicy.promotionProtocol.primaryMetricId`, what `cli.ts` does
 * for supervised replay), including the preserved decisive fallback, so it is not "fixed" later by
 * accident. `run177-observation-shape` pins the same for the live-observation pipeline, which never
 * declares the metric.
 *
 * The evidence for the pre-fix distribution and the two mechanisms is addendum 46 of the private run
 * `100-replay-evidence-completeness-and-learner-yield`.
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
    if (id === "evaluation-core" && capability === "evaluation:list-trial-scores") {
      // A fresh comparison has no durable judge row, so the pipeline dispatches instead of reusing.
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
    if (id === "profile-learner") return { digest: "sha256:profile-run177", effects: {} };
    throw new Error(`unexpected invocation ${id}:${capability}`);
  };
}

const pipelineInput = (
  requestId: string,
  options: { readonly declaresJudgePrimaryMetric?: boolean } = {},
) => ({
  requestId,
  channel: "development",
  scope: "tenant:run177",
  authorizationEpoch: 1,
  productionState: {},
  routePackage: "endpoint:source",
  sourceDecisionId: "decision-run177",
  sourceGraphRef: "artifact:source-output",
  prefix: ["request"],
  sourcePrefixRef: "artifact:prefix",
  counterfactuals: [{ id: "endpoint:counterfactual", suffix: [] }],
  comparableEvidence: comparableEvidence(),
  evaluationCases: evaluationCases(),
  evaluationReferences: evaluationReferences(),
  trajectoryEvents: [],
  ...(options.declaresJudgePrimaryMetric === false
    ? {}
    : {
        learningPolicy: {
          evidenceFloor: {
            minDecisiveComparisons: 1,
            minHoldoutComparisons: 1,
            minDevelopmentComparisons: 1,
            minDistinctCaptures: 1,
          },
          guardrails: { qualityMinDelta: 0 },
          // `cli.ts` declares exactly this protocol for supervised replay, which is what makes the
          // pairwise judge the comparison's declared primary metric.
          promotionProtocol: {
            protocolId: "promotion:run177",
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
      }),
});

const judgeDecision = () => ({
  winner: "counterfactual" as const,
  confidence: 0.8,
  dispatchReceiptId: "dispatch:judge-run177",
  routerDecisionId: "decision:judge-run177",
  judgeResultRef: "artifact:judge-result-run177",
  judgeEndpointId: "endpoint:judge",
});

/** The recorded rows of the pairwise-judge dimension, across both member trials. */
function judgeRows(invocations: Invocation[]): Record<string, unknown>[] {
  return invocations
    .filter(
      (call) =>
        call.id === "evaluation-core" && call.capability === "evaluation:record-trial-score-batch",
    )
    .flatMap((call) => {
      const scores = Array.isArray(call.value.scores)
        ? (call.value.scores as Record<string, unknown>[])
        : [];
      return scores
        .filter(
          (score) =>
            score.dimension === "task_specific_quality" ||
            score.scorerId === "role_model_pairwise_judge.battle",
        )
        .map((score) => ({ trialId: call.value.trialId, ...score }));
    });
}

test("run177 retries a transient judge failure and records the successful decision", async () => {
  const invocations: Invocation[] = [];
  const runtime = { invoke: scriptedRuntime(invocations) };
  let dispatches = 0;
  await trackBRuntime.runTrackBShadowPipeline(runtime, {
    ...pipelineInput("run177-judge-retry-success"),
    judge: {
      endpointId: "endpoint:judge",
      async dispatch() {
        dispatches += 1;
        if (dispatches === 1) throw new Error("terminated");
        return judgeDecision();
      },
    },
  });

  expect(dispatches).toBe(2);
  const rows = judgeRows(invocations);
  expect(rows).toHaveLength(2);
  for (const row of rows) {
    expect(row).toMatchObject({
      scorerId: "role_model_pairwise_judge.battle",
      dimension: "task_specific_quality",
      source: "role_model_pairwise_judge",
      confidence: 0.8,
      judgeReceipt: {
        dispatchReceiptId: "dispatch:judge-run177",
        routerDecisionId: "decision:judge-run177",
        judgeResultRef: "artifact:judge-result-run177",
        judgeEndpointId: "endpoint:judge",
      },
    });
    // The successful attempt is recorded, never a fabricated missingness row.
    expect(row.missingness).toBeUndefined();
  }
  const scoresByTrial = new Map(rows.map((row) => [String(row.trialId), row.score]));
  expect(scoresByTrial.get("trial:counterfactual")).toBe(1);
  expect(scoresByTrial.get("trial:source")).toBe(0);
});

test("run177 attempts a persistently transient judge failure one plus the bound times", async () => {
  // The bound is a named constant with the measurement in its comment; pinning the value here keeps a
  // silent widening of the loop from passing as "still bounded".
  expect(trackBRuntime.RUN177_TRANSIENT_JUDGE_RETRY_BOUND).toBe(2);
  const invocations: Invocation[] = [];
  const runtime = { invoke: scriptedRuntime(invocations) };
  let dispatches = 0;
  await trackBRuntime.runTrackBShadowPipeline(runtime, {
    ...pipelineInput("run177-judge-retry-exhausted"),
    judge: {
      endpointId: "endpoint:judge",
      async dispatch() {
        dispatches += 1;
        throw new Error("fetch failed");
      },
    },
  });

  expect(dispatches).toBe(1 + trackBRuntime.RUN177_TRANSIENT_JUDGE_RETRY_BOUND);
  const rows = judgeRows(invocations);
  expect(rows).toHaveLength(2);
  for (const row of rows) {
    expect(row).toMatchObject({
      scorerId: "role_model_pairwise_judge.battle",
      dimension: "task_specific_quality",
      score: null,
      confidence: 0,
      missingness: "invalid",
    });
    expect(String(row.missingReason)).toMatch(/^router judge failed: fetch failed/u);
  }
});

test("run177 does not retry a semantic judge failure (position-order disagreement)", async () => {
  const invocations: Invocation[] = [];
  const runtime = { invoke: scriptedRuntime(invocations) };
  let dispatches = 0;
  await trackBRuntime.runTrackBShadowPipeline(runtime, {
    ...pipelineInput("run177-judge-semantic-disagreement"),
    judge: {
      endpointId: "endpoint:judge",
      async dispatch() {
        dispatches += 1;
        throw new PairwiseJudgeOrderDisagreementError();
      },
    },
  });

  expect(dispatches).toBe(1);
  const rows = judgeRows(invocations);
  expect(rows).toHaveLength(2);
  for (const row of rows) {
    expect(row).toMatchObject({ score: null, missingness: "invalid", confidence: 0 });
    expect(String(row.missingReason)).toMatch(/^position_order_disagreement: /u);
  }
});

test("run177 does not retry a judge decision that fails validation", async () => {
  const invocations: Invocation[] = [];
  const runtime = { invoke: scriptedRuntime(invocations) };
  let dispatches = 0;
  await trackBRuntime.runTrackBShadowPipeline(runtime, {
    ...pipelineInput("run177-judge-unknown-winner"),
    judge: {
      endpointId: "endpoint:judge",
      async dispatch() {
        dispatches += 1;
        return { ...judgeDecision(), winner: "sideways" } as never;
      },
    },
  });

  expect(dispatches).toBe(1);
  const rows = judgeRows(invocations);
  expect(rows).toHaveLength(2);
  for (const row of rows) {
    expect(row.missingness).toBe("invalid");
    expect(String(row.missingReason)).toMatch(/router judge returned an unknown pairwise winner/u);
  }
});

test("run177 classifies transport failures as transient and semantic ones as terminal", () => {
  const transient = [
    new Error("terminated"),
    new Error("fetch failed"),
    new Error("connect ETIMEDOUT 10.0.0.1:443"),
    Object.assign(new Error("The operation was aborted"), { name: "AbortError" }),
    new Error("No execution target is currently eligible for model deepseek/deepseek-v4-pro."),
  ];
  for (const error of transient) {
    expect(trackBRuntime.isTransientJudgeFailure(error)).toBe(true);
  }
  const terminal = [
    new PairwiseJudgeOrderDisagreementError(),
    new Error("router judge returned an unknown pairwise winner"),
    new Error("router judge returned unbounded confidence"),
    new Error("router judge returned an unparseable pairwise preference"),
    // Not one of the measured transient classes: an HTTP status is reported by the judge host as a
    // semantic failure today (run97 rc04 pins that shape), so the retry bound stays where addendum 46
    // scoped it.
    new Error("judge endpoint returned HTTP 503"),
  ];
  for (const error of terminal) {
    expect(trackBRuntime.isTransientJudgeFailure(error)).toBe(false);
  }
});

test("run177 leaves a declared-judge no-judge comparison without a judge row and keeps its fallback", async () => {
  /**
   * Root decision (2026-09-26, brief `run177b_retry_only`), against the run176-63b9961c measurement:
   * 60 of the newest 100 finalized comparisons declared `role_model_pairwise_judge.battle` as their
   * promotion primary metric and carried no judge row. Recording the bounded scorer-failure shape for
   * that class was implemented and then removed: an `invalid` row makes the group `incomplete` under the
   * frozen finalize rule, so the 15 of the newest 100 comparisons that decide today on the deterministic
   * semantic fallback would finalize `insufficient` instead. The gap keeps its existing member-level
   * name (`missingScores: ["role_model_pairwise_judge.battle"]`), and a transient failure inside the
   * class is repaired by the bounded retry rather than papered over here. This test pins the deliberate
   * boundary — and the preserved fallback — so it is not "fixed" later by accident.
   */
  const invocations: Invocation[] = [];
  const runtime = { invoke: scriptedRuntime(invocations) };
  await trackBRuntime.runTrackBShadowPipeline(runtime, pipelineInput("run177-no-judge"));

  // No judge row was written for the declared metric, and no manifest was invented for a judge that
  // never ran (the sentinel registration of the removed part 2).
  expect(judgeRows(invocations)).toHaveLength(0);
  expect(
    invocations.filter(
      (call) =>
        call.id === "evaluation-core" &&
        call.capability === "evaluation:register-scorer" &&
        call.value.source === "role_model_pairwise_judge",
    ),
  ).toHaveLength(0);

  // The decisive fallback is preserved: one pristine (non-degraded) deterministic semantic row per member
  // trial, exactly the evidence the comparison decides on today.
  const recorded = invocations
    .filter(
      (call) =>
        call.id === "evaluation-core" && call.capability === "evaluation:record-trial-score-batch",
    )
    .flatMap((call) =>
      (Array.isArray(call.value.scores)
        ? (call.value.scores as Record<string, unknown>[])
        : []
      ).map((score) => ({ trialId: String(call.value.trialId), ...score })),
    );
  expect(recorded).toHaveLength(2);
  for (const row of recorded) {
    expect(row).toMatchObject({ dimension: "correctness", score: 0 });
    expect(row.missingness).toBeUndefined();
    expect(row.missingReason).toBeUndefined();
  }
  expect(new Set(recorded.map((row) => row.trialId))).toEqual(
    new Set(["trial:source", "trial:counterfactual"]),
  );

  // The comparison still finalizes, and it still names the judge metric as its primary metric: the
  // fallback outcome is reached the same way it was before run177.
  const finalizeCalls = invocations.filter(
    (call) =>
      call.id === "evaluation-core" && call.capability === "evaluation:finalize-comparison-group",
  );
  expect(finalizeCalls).toHaveLength(1);
  expect(finalizeCalls[0]?.value).toMatchObject({
    primaryMetricId: "role_model_pairwise_judge.battle",
    trialIds: ["trial:source", "trial:counterfactual"],
  });
});

test("run177 leaves a comparison that never declared the judge metric without judge rows", async () => {
  const invocations: Invocation[] = [];
  const runtime = { invoke: scriptedRuntime(invocations) };
  await trackBRuntime.runTrackBShadowPipeline(
    runtime,
    pipelineInput("run177-observation-shape", { declaresJudgePrimaryMetric: false }),
  );

  expect(judgeRows(invocations)).toHaveLength(0);
  expect(
    invocations.filter(
      (call) =>
        call.capability === "evaluation:register-scorer" &&
        call.value.source === "role_model_pairwise_judge",
    ),
  ).toHaveLength(0);
});
