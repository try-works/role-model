import { createHash, createHmac } from "node:crypto";

import { expect, test } from "vitest";

import {
  assembleDurableLearnerValidationValue,
  selectDurableComparisonGroupId,
} from "../src/track-b-learning-pass.js";

/**
 * Run 100 addendum `replay-evaluation-learner-spine-completion.addendum-07` P6 (live measurement
 * 2026-09-24): 162 knowledge-worker candidates exist, 148 carry a `validation_receipt`, and the only
 * writer of those receipts was the inline learner step inside `runTrackBShadowPipeline`. A candidate
 * derived by that run and interrupted before its learner step - or whose comparison was finalized later
 * by the extension's retro-finalize sweep - had no second chance, so `knowledge_learning_records` froze
 * at 2026-09-21T22:56:38Z while completion receipts accrued to 549.
 *
 * The liveness sweep that consumes those candidates drives the worker's own steps from **durable**
 * evidence. That is only possible if the value it presents is assembled the way the pipeline assembles
 * it: `knowledge:validate-candidate` refuses anything without the scorer/judge identity, without a
 * finalized comparison carrying its holdout, and without the two receipts the *worker verifies* with
 * the evidence authority - the comparison readback receipt and the knowledge safety receipt. Both are
 * HMACs over payloads derived from durable facts, so with the authority now derived from the runtime's
 * managed key (`resolveDurableEvaluationAuthority`) a later sweep can mint exactly what the pipeline
 * minted. This suite pins that recipe: it recomputes both signatures the way the Knowledge Worker does
 * (`digest`/`canonical` in `extensions/knowledge-worker/index.mjs`) and fails if the assembled value
 * would be refused.
 */

/** The Knowledge Worker's canonical form (`extensions/knowledge-worker/index.mjs`). */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function digest(value: unknown): string {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

function sign(secret: string, payload: unknown): string {
  return createHmac("sha256", secret).update(canonical(payload)).digest("hex");
}

const AUTHORITY_SECRET = "b".repeat(64);
const CHANNEL = "stage";
const SCOPE = "standalone-runtime-stage";
const ROUTE_PACKAGE = "deepseek-flash";

function finalizedComparison() {
  return {
    groupId: "comparison:supervised-replay:2d598525",
    comparisonId: "comparison:supervised-replay:2d598525",
    status: "finalized",
    outcome: "candidate",
    holdout: {
      caseIds: ["replay:6a9a2afc4d52:0", "replay:6a9a2afc4d52:1"],
      holdoutId: "sha256:2d598525138bd328a6adb81239ed0ae49cc2b2a495d7ec8f4a198404b2850663",
      membershipDigest: "sha256:5c1c1285e2638fa04fdb999ffe60ca8f4a76a5f8b4fe856528fd28ef97189870",
      partition: "holdout",
    },
    members: [
      {
        role: "source",
        disposition: "negative",
        trialId: "trial:309ee1257a2358a1bdfd2aba0f28e03d2c9a99ac08929e6a1e9d77efbb89c789",
        scoreId: "trial-score:400ef1a8131a76295d65dc8b754de0ed1adb8d94f3ddb8119deb2fecdc241832",
        score: 0,
        confidence: 1,
      },
      {
        role: "counterfactual",
        disposition: "positive",
        trialId: "trial:8bb1d0f2c0a4b0d0f2c0a4b0d0f2c0a4b0d0f2c0a4b0d0f2c0a4b0d0f2c0a4b0d0",
        scoreId: "trial-score:1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
        score: 1,
        confidence: 1,
      },
    ],
  };
}

function evidenceSummary() {
  return {
    decisiveComparisons: 4,
    holdoutComparisons: 2,
    developmentComparisons: 2,
    distinctCaptures: 3,
    caseManifestRef: "case-manifest:sha256:0000",
    effectiveDecisiveComparisons: 4,
    effectiveHoldoutComparisons: 2,
    effectiveDevelopmentComparisons: 2,
    comparable: {
      cases: 4,
      candidates: ["candidate-a", "candidate-b"],
      caseIds: ["case-1", "case-2", "case-3", "case-4"],
      pairs: [
        {
          sourceCandidateRef: "candidate-a",
          counterfactualCandidateRef: "candidate-b",
          comparisons: 4,
        },
      ],
      missingPairs: [],
    },
  };
}

test("run104 the durable learner sweep mints the receipts the knowledge worker verifies", () => {
  const comparison = finalizedComparison();
  const value = assembleDurableLearnerValidationValue({
    candidateId: "shadow-9f2c",
    routePackage: ROUTE_PACKAGE,
    channel: CHANNEL,
    scope: SCOPE,
    scorerSetVersion: "run96-semantic-criteria@3+16364bdcbc6f",
    judgeEndpointId: null,
    evaluationAuthoritySecret: AUTHORITY_SECRET,
    finalizedComparison: comparison,
    evidenceSummary: evidenceSummary(),
    sourceGraphRef: "graph:capture-4f2a",
  });

  const evaluation = value.evaluation as Record<string, unknown>;
  const readback = evaluation.finalizedComparisonReceipt as {
    readonly payload: Record<string, unknown>;
    readonly signature: string;
  };
  const safety = evaluation.safetyReceipt as {
    readonly payload: Record<string, unknown>;
    readonly signature: string;
  };

  // The worker recomputes both signatures from the secret it is handed in the envelope, and compares
  // the readback's comparisonDigest with `digest(finalizedComparison)`; both must hold here.
  expect(readback.payload.schemaVersion).toBe(
    "role-model.evaluation-comparison-readback-receipt.v1",
  );
  expect(readback.payload.kind).toBe("evaluation_core_comparison_readback");
  expect(readback.payload.channel).toBe(CHANNEL);
  expect(readback.payload.routePackage).toBe(ROUTE_PACKAGE);
  expect(readback.payload.comparisonDigest).toBe(digest(comparison));
  expect(readback.signature).toBe(sign(AUTHORITY_SECRET, readback.payload));

  expect(safety.payload.schemaVersion).toBe("role-model.knowledge-safety-receipt.v1");
  expect(safety.payload.kind).toBe("knowledge_safety");
  expect(safety.payload.comparisonId).toBe(comparison.comparisonId);
  expect(safety.payload.comparisonDigest).toBe(digest(comparison));
  expect(safety.payload.channel).toBe(CHANNEL);
  expect(safety.payload.routePackage).toBe(ROUTE_PACKAGE);
  expect(safety.payload.redacted).toBe(true);
  expect(safety.payload.safetyReviewed).toBe(true);
  expect(safety.payload.holdoutPassed).toBe(true);
  expect(safety.signature).toBe(sign(AUTHORITY_SECRET, safety.payload));

  // A receipt minted under another authority must not verify - the sweep's whole point is that the
  // authority is the runtime's own, derived from its managed key, not an arbitrary string.
  expect(sign("c".repeat(64), readback.payload)).not.toBe(readback.signature);

  // The value must also carry everything `#assertValidationEvaluation` reads before it reaches the two
  // receipts: provenance, the finalized comparison itself, the holdout and the scoring identity.
  const provenance = evaluation.provenance as Record<string, unknown>;
  expect(evaluation.environment).toBe("local-routing-evaluation");
  expect(provenance.split).toBe("holdout");
  expect(provenance.policy).toBe("run96-routing-shadow");
  expect(provenance.task).toBe("route-selection");
  expect(provenance.scorer).toBe("run96-semantic-criteria@3+16364bdcbc6f");
  expect(Number.isInteger(provenance.seed)).toBe(true);
  expect(typeof provenance.evidenceRef).toBe("string");
  expect(evaluation.finalizedComparison).toEqual(comparison);

  expect(value.candidateId).toBe("shadow-9f2c");
  expect(value.identity).toEqual({
    scorerSetVersion: "run96-semantic-criteria@3+16364bdcbc6f",
    judgeEndpointId: null,
  });
  expect(value.holdoutCaseIds).toEqual(comparison.holdout.caseIds);
  expect(value.evidenceSummary).toEqual(evidenceSummary());
});

test("run104 the assembled value keeps the promotion protocol and floors the pass declares", () => {
  const value = assembleDurableLearnerValidationValue({
    candidateId: "shadow-9f2c",
    routePackage: ROUTE_PACKAGE,
    channel: CHANNEL,
    scope: SCOPE,
    scorerSetVersion: "run96-semantic-criteria@3+16364bdcbc6f",
    judgeEndpointId: "deepseek.personal.deepseek-api-key.global.deepseek-judge",
    evaluationAuthoritySecret: AUTHORITY_SECRET,
    finalizedComparison: finalizedComparison(),
    evidenceSummary: evidenceSummary(),
    sourceGraphRef: "graph:capture-4f2a",
  });

  // Run 98 R19: the promotion re-reads the declared protocol from the receipt, and the worker only
  // declares a protocol when every field below passes its own readers (`readPromotionProtocol`). A
  // sweep-minted receipt that omits one is refused as "promotionProtocol is required", so the value has
  // to carry the same complete declaration a pipeline run carries.
  const protocol = value.promotionProtocol as Record<string, unknown>;
  expect(protocol.protocolId).toBe("promotion:paired-cluster-bootstrap");
  expect(protocol.primaryMetricId).toBe("role_model_pairwise_judge.battle");
  expect(protocol.direction).toBe("higher_is_better");
  expect(protocol.analysisMethod).toBe("paired_cluster_bootstrap");
  expect(protocol.multiplicityAdjustment).toBe("holm_bonferroni");
  expect(protocol.minimumPracticalDelta).toBeGreaterThanOrEqual(0);
  expect(protocol.minimumPracticalDelta).toBeLessThanOrEqual(0.5);
  expect(protocol.nonInferiorityMargin).toBeGreaterThanOrEqual(-0.5);
  expect(protocol.nonInferiorityMargin).toBeLessThanOrEqual(0.5);
  expect(protocol.intervalLevel).toBeGreaterThan(0.5);
  expect(protocol.intervalLevel).toBeLessThanOrEqual(1);
  expect(Number.isInteger(protocol.resamples)).toBe(true);
  expect(protocol.resamples as number).toBeGreaterThanOrEqual(1000);
  expect(Number.isInteger(protocol.bootstrapSeed)).toBe(true);
  expect(protocol.bootstrapSeed as number).toBeGreaterThanOrEqual(0);
  expect(Number.isInteger(protocol.selectionFamilySize)).toBe(true);
  expect(protocol.selectionFamilySize as number).toBeGreaterThanOrEqual(1);
  // The non-inferiority margin is the operator's quality guardrail, exactly as the pass declares it.
  expect((value.guardrails as Record<string, unknown>).qualityMinDelta).toBe(-0.02);
  expect(protocol.nonInferiorityMargin).toBe(-0.02);
  expect(value.evidenceFloor).toMatchObject({
    minDecisiveComparisons: 3,
    minHoldoutComparisons: 1,
  });
  expect(value.estimator).toMatchObject({
    estimatorVersion: "paired-cluster-bootstrap@1",
    bootstrapSeed: 0,
    resamples: 2_000,
  });
  expect(value.identity).toEqual({
    scorerSetVersion: "run96-semantic-criteria@3+16364bdcbc6f",
    judgeEndpointId: "deepseek.personal.deepseek-api-key.global.deepseek-judge",
  });
  expect(value.scope).toMatchObject({
    routePackage: ROUTE_PACKAGE,
    channel: CHANNEL,
    scopeId: SCOPE,
  });
});

test("run104 the sweep reads the durable comparison group, not the comparability key", () => {
  /**
   * Measured live on `stage-run105` (first learner-sweep ticks): the candidate listing returns the
   * comparability key first (`group:<hash>`, from `evidence.sourceGroupIds` / `applicability.groupId`) and
   * the durable comparison group second (`comparison:supervised-replay:<hash>`, from
   * `validationOutcome.evaluationId` / `evidence.evaluationResultIds`). Reading the first id refuses every
   * candidate with "durable evaluation comparison group not found" - the group it needed was present and
   * finalized. This pins which id is the durable one.
   */
  expect(
    selectDurableComparisonGroupId({
      groupIds: [
        "group:a05ec133a2c666ea04aa4b0379fdb95c0bfae1169b694bb02fdac28f6f099a0a",
        "comparison:supervised-replay:5c841e50f9c4d5b618cc7d2e49b6606ed3d8a1e191bce50401576c2b9bdfb10f",
      ],
    }),
  ).toBe(
    "comparison:supervised-replay:5c841e50f9c4d5b618cc7d2e49b6606ed3d8a1e191bce50401576c2b9bdfb10f",
  );

  // An explicitly named comparison id always wins, and a candidate with no durable comparison returns null
  // rather than a hash that only looks like a group.
  expect(
    selectDurableComparisonGroupId({
      comparisonId: "comparison:supervised-replay:aaaa",
      groupIds: ["group:bbbb"],
    }),
  ).toBe("comparison:supervised-replay:aaaa");
  expect(selectDurableComparisonGroupId({ groupIds: ["group:cccc"] })).toBe("group:cccc");
  expect(selectDurableComparisonGroupId({})).toBeNull();
});
