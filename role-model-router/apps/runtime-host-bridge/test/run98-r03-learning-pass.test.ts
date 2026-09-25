import { existsSync, mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test } from "vitest";

import {
  DEFAULT_LEARNING_EVIDENCE_FLOOR,
  DEFAULT_LEARNING_GUARDRAILS,
  DEFAULT_PROMOTION_PROTOCOL,
  RUN98_LEARNING_PASS_SCHEMA,
  buildTrackBLearningEvidenceSummary,
  runTrackBLearningPass,
} from "../src/track-b-learning-pass.js";

/**
 * Run 98 R3: the learning pass turns a derived candidate into a validation receipt and, when the
 * receipt says `validate`, into an experience pack — the two capabilities that previously had
 * no caller in the runtime.
 */

const routePackage = "deepseek.personal.deepseek-api-key.global.deepseek-flash-high";

function group(input: {
  groupId: string;
  outcome: string;
  counterfactualRef?: string;
  sourceRef?: string;
  caseIds?: string[];
  inputRef?: string;
  taskTypeId?: string;
  observedAt?: string;
  evidenceStrength?: string;
  selectionMode?: string;
  selectionProbability?: number;
}) {
  return {
    groupId: input.groupId,
    status: "finalized",
    comparability: {
      counterfactualCandidateRef: input.counterfactualRef ?? routePackage,
      sourceCandidateRef:
        input.sourceRef ?? "deepseek.personal.deepseek-api-key.global.deepseek-flash-max",
      inputRef: input.inputRef ?? `artifact:${"a".repeat(64)}`,
      policyId: "run96-routing-shadow",
      scorerSetVersion: "run96-routing-shadow-v3",
      taskRef: `artifact:${"b".repeat(64)}`,
      sourceEvidenceRef: `artifact:${"c".repeat(64)}`,
      ...(input.taskTypeId ? { taskTypeId: input.taskTypeId } : {}),
      ...(input.observedAt ? { observedAt: input.observedAt } : {}),
      ...(input.evidenceStrength ? { evidenceStrength: input.evidenceStrength } : {}),
      ...(input.selectionMode ? { selectionMode: input.selectionMode } : {}),
      ...(input.selectionProbability === undefined
        ? {}
        : { selectionProbability: input.selectionProbability }),
    },
    holdout: {
      holdoutId: `sha256:${"d".repeat(64)}`,
      membershipDigest: `sha256:${"e".repeat(64)}`,
      partition: "holdout",
      caseIds: input.caseIds ?? ["case:1"],
    },
    result: {
      groupId: input.groupId,
      status: "finalized",
      outcome: input.outcome,
      comparability: {
        counterfactualCandidateRef: input.counterfactualRef ?? routePackage,
        sourceCandidateRef:
          input.sourceRef ?? "deepseek.personal.deepseek-api-key.global.deepseek-flash-max",
        inputRef: input.inputRef ?? `artifact:${"a".repeat(64)}`,
        ...(input.taskTypeId ? { taskTypeId: input.taskTypeId } : {}),
      },
      holdout: { caseIds: input.caseIds ?? ["case:1"] },
      members: [
        {
          trialId: "trial:source",
          scoreId: "trial-score:source",
          score: 0.4,
          confidence: 1,
          disposition: "negative",
        },
        {
          trialId: "trial:candidate",
          score: 0.7,
          scoreId: "trial-score:candidate",
          confidence: 0.9,
          disposition: "positive",
        },
      ],
    },
  };
}

const decisiveGroups = [
  group({ groupId: "comparison:1", outcome: "candidate", inputRef: `artifact:${"1".repeat(64)}` }),
  group({ groupId: "comparison:2", outcome: "source", inputRef: `artifact:${"2".repeat(64)}` }),
  group({ groupId: "comparison:3", outcome: "candidate", inputRef: `artifact:${"3".repeat(64)}` }),
  group({ groupId: "comparison:tie", outcome: "tie", inputRef: `artifact:${"4".repeat(64)}` }),
  group({
    groupId: "comparison:other-package",
    outcome: "candidate",
    counterfactualRef: "deepseek.personal.deepseek-api-key.global.deepseek-v4-pro-high",
    sourceRef: "moonshot.personal.kimi-code.global.kimi-k3",
    inputRef: `artifact:${"5".repeat(64)}`,
  }),
];

function passInput(overrides: Record<string, unknown> = {}) {
  return {
    requestId: "supervised-replay:run98",
    channel: "development",
    scope: "standalone-runtime-stage",
    authorizationEpoch: 1,
    candidateId: "shadow-candidate-1",
    routePackage,
    provenance: {
      policy: "run96-routing-shadow",
      task: `artifact:${"b".repeat(64)}`,
      scorer: "run96-routing-shadow-v3",
      split: "holdout",
      seed: 87,
      evidenceRef: `artifact:${"c".repeat(64)}`,
    },
    identity: { scorerSetVersion: "run96-routing-shadow-v3", judgeEndpointId: "endpoint:judge" },
    finalizedComparison: decisiveGroups[0].result,
    finalizedComparisonReceipt: {
      payload: { kind: "evaluation_core_comparison_readback" },
      signature: "sig",
    },
    safetyReceipt: { payload: { kind: "knowledge_safety" }, signature: "sig" },
    evaluationAuthoritySecret: "run98-learning-pass-secret",
    nowMs: Date.parse("2026-09-14T10:00:00Z"),
    ...overrides,
  } as Parameters<typeof runTrackBLearningPass>[1];
}

function fakeRuntime(options: {
  groups: readonly unknown[];
  validation?: Record<string, unknown>;
  promotion?: Record<string, unknown>;
}) {
  const invocations: Array<{
    extensionId: string;
    capability: string;
    value: Record<string, unknown>;
    envelope: Record<string, unknown>;
  }> = [];
  return {
    invocations,
    async invoke(extensionId: string, envelope: Record<string, unknown>) {
      const capability = String(envelope.capability);
      // The Knowledge Store reads `payload`; the worker reads `value`.
      const value = (
        envelope.capability === "knowledge:record-learning"
          ? envelope.payload
          : (envelope.value ?? {})
      ) as Record<string, unknown>;
      invocations.push({ extensionId, capability, value, envelope });
      if (capability === "evaluation:list-groups") return options.groups;
      if (capability === "knowledge:validate-candidate") {
        return (
          options.validation ?? {
            receipt: { receiptId: "validation:1", decision: "validate", baselineId: "baseline:1" },
            promotionEligible: true,
          }
        );
      }
      if (capability === "knowledge:promote-candidate") {
        return (
          options.promotion ?? {
            packCandidate: { packId: "pack:1", status: "validated", priority: "advisory_only" },
          }
        );
      }
      if (capability === "knowledge:record-learning") return { recorded: true, idempotent: false };
      throw new Error(`unexpected capability ${capability}`);
    },
  };
}

test("run98 R3 the evidence summary counts only decisive, in-package, in-window holdout evidence", () => {
  const summary = buildTrackBLearningEvidenceSummary({
    groups: decisiveGroups,
    routePackage,
    nowMs: Date.parse("2026-09-14T10:00:00Z"),
    evidenceMaxAgeMs: 30 * 24 * 60 * 60 * 1_000,
  });
  expect(summary.decisiveComparisons).toBe(3);
  expect(summary.holdoutComparisons).toBe(3);
  expect(summary.distinctCaptures).toBe(3);
  expect(summary.caseManifestRef).toContain("manifest:learning-pass:");
});

/**
 * Run 99 R33 (addendum 19 S34, addendum 20 D2/D4, addendum 21 D10/D11): the learner's evidence
 * counts are keyed by the task family the comparison was produced for, and the groups that were
 * not counted say why — another family's evidence can never clear this family's floor.
 */
test("run99 R33 the evidence summary is keyed by task family and reports exclusions", () => {
  const familyGroups = [
    group({
      groupId: "family:review-a",
      outcome: "candidate",
      inputRef: `artifact:${"6".repeat(64)}`,
      taskTypeId: "coder.review",
    }),
    group({
      groupId: "family:review-b",
      outcome: "source",
      inputRef: `artifact:${"7".repeat(64)}`,
      taskTypeId: "coder.review",
    }),
    group({
      groupId: "family:review-c",
      outcome: "candidate",
      inputRef: `artifact:${"8".repeat(64)}`,
      taskTypeId: "coder.review",
    }),
    group({
      groupId: "family:planner-a",
      outcome: "candidate",
      inputRef: `artifact:${"9".repeat(64)}`,
      taskTypeId: "planner.requirements",
    }),
    group({
      groupId: "family:tie",
      outcome: "tie",
      inputRef: `artifact:${"a".repeat(64)}`,
      taskTypeId: "coder.review",
    }),
    group({
      groupId: "family:other-package",
      outcome: "candidate",
      counterfactualRef: "deepseek.personal.deepseek-api-key.global.deepseek-v4-pro-high",
      sourceRef: "moonshot.personal.kimi-code.global.kimi-k3",
      inputRef: `artifact:${"b".repeat(64)}`,
      taskTypeId: "coder.review",
    }),
  ];

  const summary = buildTrackBLearningEvidenceSummary({
    groups: familyGroups,
    routePackage,
    nowMs: Date.parse("2026-09-14T10:00:00Z"),
    evidenceMaxAgeMs: 30 * 24 * 60 * 60 * 1_000,
  });

  expect(summary.decisiveComparisons).toBe(4);
  expect(summary.byFamily["coder.review"]).toMatchObject({
    decisiveComparisons: 3,
    holdoutComparisons: 3,
    distinctCaptures: 3,
    // Run 99 R33 D12: without a recorded observation time the decay weight is 1.
    // Run 99 R33 D5: three counterfactual replays at the 0.9 class weight.
    effectiveDecisiveComparisons: 2.7,
    effectiveHoldoutComparisons: 2.7,
    // Run 99 R33 D11: three distinct captures, so no single source dominates.
    effectiveSampleSize: 2.7,
    maxCaptureShare: 0.3333,
    drift: null,
    // Run 99 R33 D5: these fixtures declare no class, so they are counterfactual replays.
    evidenceClasses: { counterfactual_replay: 3 },
  });
  expect(summary.byFamily["planner.requirements"]).toMatchObject({
    decisiveComparisons: 1,
    holdoutComparisons: 1,
    distinctCaptures: 1,
    effectiveDecisiveComparisons: 0.9,
    effectiveHoldoutComparisons: 0.9,
    effectiveSampleSize: 0.9,
    maxCaptureShare: 1,
    drift: null,
    evidenceClasses: { counterfactual_replay: 1 },
  });
  expect(summary.excludedByReason).toEqual({
    non_decisive_outcome: 1,
    package_not_involved: 1,
  });
});

/**
 * Run 99 R33 (addendum 21 D12): `evidenceHalfLifeDays` was published and rendered but read by
 * nothing. The summary now decays each comparison by its age, so three month-old comparisons are
 * not worth three fresh ones — and the floor is judged on the decayed weight.
 */
test("run99 R33 the evidence summary decays old comparisons by the half-life", () => {
  const nowMs = Date.parse("2026-09-14T10:00:00Z");
  const fresh = group({
    groupId: "halflife:fresh",
    outcome: "candidate",
    inputRef: `artifact:${"c".repeat(64)}`,
    taskTypeId: "coder.review",
    observedAt: new Date(nowMs).toISOString(),
  });
  const stale = group({
    groupId: "halflife:stale",
    outcome: "candidate",
    inputRef: `artifact:${"d".repeat(64)}`,
    taskTypeId: "coder.review",
    observedAt: new Date(nowMs - 28 * 24 * 60 * 60 * 1_000).toISOString(),
  });

  const summary = buildTrackBLearningEvidenceSummary({
    groups: [fresh, stale],
    routePackage,
    nowMs,
    evidenceMaxAgeMs: 30 * 24 * 60 * 60 * 1_000,
    evidenceHalfLifeDays: 14,
  });

  expect(summary.decisiveComparisons).toBe(2);
  // Both comparisons are counterfactual replays (class weight 0.9); the stale one is two 14-day
  // half-lives old (0.25): 0.9 + 0.25 * 0.9 = 1.125.
  expect(summary.byFamily["coder.review"].effectiveDecisiveComparisons).toBeCloseTo(1.125, 3);
  expect(summary.effectiveDecisiveComparisons).toBeCloseTo(1.125, 3);
});

/**
 * Run 99 R33 (addendum 21 D10, `guidance/11`): a comparison the judge could not decide
 * consistently under swapped presentation order is *incomparable*, so it is excluded from the
 * evidence entirely and counted by its canonical code instead of being averaged in as a tie.
 */
/**
 * Run 98 addendum 33 S3 (the research §3: "the comparison graph is a star ... three of six candidate
 * pairs have never been directly compared"): the evidence summary states the graph it was computed over —
 * each edge's count and the pairs no counted comparison covered — so a ranking can never be inferred
 * silently through a hub.
 */
test("run98 A33 S3 the summary reports its comparison graph and the pairs it never covered", () => {
  const nowMs = Date.parse("2026-09-14T10:00:00Z");
  const alpha = "endpoint:alpha";
  const beta = "endpoint:beta";
  const gamma = "endpoint:gamma";
  const summary = buildTrackBLearningEvidenceSummary({
    groups: [
      group({
        groupId: "edge:ab",
        outcome: "candidate",
        sourceRef: alpha,
        counterfactualRef: beta,
      }),
      group({
        groupId: "edge:ab-2",
        outcome: "candidate",
        sourceRef: alpha,
        counterfactualRef: beta,
      }),
      group({ groupId: "edge:ac", outcome: "source", sourceRef: alpha, counterfactualRef: gamma }),
    ],
    routePackage: alpha,
    nowMs,
    evidenceMaxAgeMs: 30 * 24 * 60 * 60 * 1_000,
  });
  expect(summary.comparable.cases).toBeGreaterThan(0);
  expect(summary.comparable.candidates).toEqual([alpha, beta, gamma]);
  expect(summary.comparable.pairs).toEqual(
    expect.arrayContaining([
      { sourceCandidateRef: alpha, counterfactualCandidateRef: beta, comparisons: 2 },
      { sourceCandidateRef: alpha, counterfactualCandidateRef: gamma, comparisons: 1 },
    ]),
  );
  expect(summary.comparable.missingPairs).toEqual([[beta, gamma]]);
});

test("run99 R33 an incomparable comparison is excluded and counted by code", () => {
  const nowMs = Date.parse("2026-09-14T10:00:00Z");
  const comparable = group({
    groupId: "comparable:1",
    outcome: "candidate",
    inputRef: `artifact:${"e".repeat(64)}`,
    taskTypeId: "coder.review",
  });
  const flipped = group({
    groupId: "incomparable:flip",
    outcome: "candidate",
    inputRef: `artifact:${"f".repeat(64)}`,
    taskTypeId: "coder.review",
  });
  const incomparable = {
    ...flipped,
    result: {
      ...(flipped.result as Record<string, unknown>),
      validityIssues: ["position_order_disagreement"],
    },
  };

  const summary = buildTrackBLearningEvidenceSummary({
    groups: [comparable, incomparable],
    routePackage,
    nowMs,
    evidenceMaxAgeMs: 30 * 24 * 60 * 60 * 1_000,
  });

  expect(summary.decisiveComparisons).toBe(1);
  expect(summary.byFamily["coder.review"].decisiveComparisons).toBe(1);
  expect(summary.excludedByReason).toEqual({
    "incomparable:position_order_disagreement": 1,
  });
});

/**
 * Run 98 addendum 30 S3 (`guidance/11` "judge-self-evaluated ... groups are ineligible for
 * promotion evidence"): a group the judge produced about itself cannot teach the router anything
 * about the candidates, so the learner excludes it by the canonical code the evaluation store now
 * records (`validityIssues: ["judge_self_evaluation"]`) instead of averaging a self-preference in.
 */
test("run98 A30 a judge-self-evaluated comparison is excluded and counted by code", () => {
  const nowMs = Date.parse("2026-09-14T10:00:00Z");
  const comparable = group({
    groupId: "comparable:self-judge",
    outcome: "candidate",
    inputRef: `artifact:${"1".repeat(64)}`,
    taskTypeId: "coder.review",
  });
  const flipped = group({
    groupId: "self-judged:1",
    outcome: "candidate",
    inputRef: `artifact:${"2".repeat(64)}`,
    taskTypeId: "coder.review",
  });
  const selfJudged = {
    ...flipped,
    result: {
      ...(flipped.result as Record<string, unknown>),
      validityIssues: ["judge_self_evaluation"],
      judgeProvenance: {
        endpointIds: ["deepseek.personal.deepseek-api-key.global.deepseek-flash-high"],
        modes: ["identified"],
      },
    },
  };

  const summary = buildTrackBLearningEvidenceSummary({
    groups: [comparable, selfJudged],
    routePackage,
    nowMs,
    evidenceMaxAgeMs: 30 * 24 * 60 * 60 * 1_000,
  });

  expect(summary.decisiveComparisons).toBe(1);
  expect(summary.byFamily["coder.review"].decisiveComparisons).toBe(1);
  expect(summary.excludedByReason).toEqual({
    "incomparable:judge_self_evaluation": 1,
  });
});

/**
 * Run 99 R33 (addendum 21 D11): the per-family receipt carries the canonical gate dimensions —
 * effective sample size, source concentration and temporal drift — not just raw counts.
 */
test("run99 R33 the family carries concentration and a temporal drift dimension", () => {
  const nowMs = Date.parse("2026-09-14T10:00:00Z");
  const day = 24 * 60 * 60 * 1_000;
  const withDelta = (id: string, ageDays: number, comparisonDelta: number) => {
    const base = group({
      groupId: id,
      outcome: "candidate",
      inputRef: `artifact:${id.padEnd(64, "0")}`,
      taskTypeId: "coder.review",
      observedAt: new Date(nowMs - ageDays * day).toISOString(),
    });
    return {
      ...base,
      result: {
        ...(base.result as Record<string, unknown>),
        members: [
          { score: 0, disposition: "negative" },
          { score: comparisonDelta, disposition: "positive" },
        ],
      },
    };
  };

  const summary = buildTrackBLearningEvidenceSummary({
    groups: [
      withDelta("g1", 10, 0.2),
      withDelta("g2", 8, 0.2),
      withDelta("g3", 2, 0.8),
      withDelta("g4", 1, 0.8),
    ],
    routePackage,
    nowMs,
    evidenceMaxAgeMs: 30 * day,
  });

  const family = summary.byFamily["coder.review"];
  expect(family.decisiveComparisons).toBe(4);
  // Four distinct captures, none dominant.
  expect(family.maxCaptureShare).toBe(0.25);
  // The older half drifted 0.6 below the newer half (0.2 vs 0.8 mean delta).
  expect(family.drift).toBeCloseTo(0.6, 3);
  // The decayed weight is smaller than the nominal count.
  expect(family.effectiveSampleSize).toBeLessThan(4);
});

/**
 * Run 99 R33 (addendum 20 D5, `guidance/13` §Evidence-source weighting): a comparison counts by
 * its evidence class — `counterfactual_replay` 0.9, deterministic/manual 1.0,
 * `background_local_eval` 0.8, `benchmark` 0.75 — and route-only or passive evidence counts for
 * nothing at all, because it is not semantic-quality evidence.
 */
test("run99 R33 the effective counts weight each comparison by its evidence class", () => {
  const nowMs = Date.parse("2026-09-14T10:00:00Z");
  const summary = buildTrackBLearningEvidenceSummary({
    groups: [
      group({
        groupId: "class:counterfactual",
        outcome: "candidate",
        inputRef: `artifact:${"1".repeat(64)}`,
        taskTypeId: "coder.review",
        evidenceStrength: "counterfactual_replay",
      }),
      group({
        groupId: "class:deterministic",
        outcome: "source",
        inputRef: `artifact:${"2".repeat(64)}`,
        taskTypeId: "coder.review",
        evidenceStrength: "natural_deterministic_outcome",
      }),
      group({
        groupId: "class:route-only",
        outcome: "candidate",
        inputRef: `artifact:${"3".repeat(64)}`,
        taskTypeId: "coder.review",
        evidenceStrength: "route_replay",
      }),
    ],
    routePackage,
    nowMs,
    evidenceMaxAgeMs: 30 * 24 * 60 * 60 * 1_000,
  });

  // Route-only replay is not quality evidence: it is excluded, not down-weighted.
  expect(summary.decisiveComparisons).toBe(2);
  expect(summary.excludedByReason).toEqual({ "non_semantic_evidence:route_replay": 1 });
  // 0.9 for the counterfactual plus 1.0 for the deterministic outcome.
  expect(summary.effectiveDecisiveComparisons).toBeCloseTo(1.9, 3);
  expect(summary.byFamily["coder.review"].effectiveDecisiveComparisons).toBeCloseTo(1.9, 3);
  expect(summary.byFamily["coder.review"].evidenceClasses).toEqual({
    counterfactual_replay: 1,
    natural_deterministic_outcome: 1,
  });
});

test("run98 R3 a validated candidate is promoted and both receipts are recorded", async () => {
  const runtime = fakeRuntime({ groups: decisiveGroups });
  const receipt = await runTrackBLearningPass(runtime, passInput());
  expect(receipt.schemaVersion).toBe(RUN98_LEARNING_PASS_SCHEMA);
  expect(receipt).toMatchObject({
    decision: "validate",
    validationReceiptId: "validation:1",
    packId: "pack:1",
    promoted: true,
  });
  expect(receipt.evidenceFloor).toEqual(DEFAULT_LEARNING_EVIDENCE_FLOOR);
  const capabilities = runtime.invocations.map((entry) => entry.capability);
  expect(capabilities).toEqual([
    "evaluation:list-groups",
    "knowledge:validate-candidate",
    "knowledge:record-learning",
    "knowledge:promote-candidate",
    "knowledge:record-learning",
  ]);
  // The worker can only verify the durable readback and safety receipts with the same
  // evidence-authority secret the derive call used.
  expect(runtime.invocations[1].envelope.evaluationAuthoritySecret).toBe(
    "run98-learning-pass-secret",
  );
  expect(runtime.invocations[3].envelope.evaluationAuthoritySecret).toBe(
    "run98-learning-pass-secret",
  );
  // The Knowledge Store reads `payload`, and a bounded degradation receipt must not be
  // mistaken for a recorded receipt.
  expect((runtime.invocations[2].envelope.payload as Record<string, unknown>).record).toMatchObject(
    {
      kind: "validation_receipt",
      recordId: "validation:1",
    },
  );
  const validationInput = runtime.invocations[1].value;
  expect(validationInput).toMatchObject({
    candidateId: "shadow-candidate-1",
    identity: { scorerSetVersion: "run96-routing-shadow-v3", judgeEndpointId: "endpoint:judge" },
    evidenceSummary: { decisiveComparisons: 3, holdoutComparisons: 3, distinctCaptures: 3 },
  });
  // Run 98 R19: the pass always declares the predeclared promotion protocol, and the
  // non-inferiority margin is the operator's quality guardrail bound.
  expect(validationInput).toMatchObject({
    promotionProtocol: {
      protocolId: DEFAULT_PROMOTION_PROTOCOL.protocolId,
      primaryMetricId: DEFAULT_PROMOTION_PROTOCOL.primaryMetricId,
      direction: "higher_is_better",
      minimumPracticalDelta: DEFAULT_PROMOTION_PROTOCOL.minimumPracticalDelta,
      intervalLevel: DEFAULT_PROMOTION_PROTOCOL.intervalLevel,
      resamples: DEFAULT_PROMOTION_PROTOCOL.resamples,
      bootstrapSeed: DEFAULT_PROMOTION_PROTOCOL.bootstrapSeed,
      analysisMethod: "paired_cluster_bootstrap",
      selectionFamilySize: DEFAULT_PROMOTION_PROTOCOL.selectionFamilySize,
      multiplicityAdjustment: "holm_bonferroni",
      nonInferiorityMargin: DEFAULT_LEARNING_GUARDRAILS.qualityMinDelta,
    },
  });
  const evaluation = validationInput.evaluation as Record<string, unknown>;
  expect(evaluation.environment).toBe("local-routing-evaluation");
  expect((evaluation.provenance as Record<string, unknown>).split).toBe("holdout");
  const records = runtime.invocations
    .filter((entry) => entry.capability === "knowledge:record-learning")
    .map((entry) => (entry.value.record ?? {}) as Record<string, unknown>);
  expect(records.map((record) => record.kind)).toEqual(["validation_receipt", "pack"]);
  expect(records[0]).toMatchObject({
    recordId: "validation:1",
    state: "validate",
    scopeId: "standalone-runtime-stage",
  });
  expect(records[1]).toMatchObject({ recordId: "pack:1", state: "validated" });
});

/**
 * Run 99 R33 S34 live finding (stage v137): the worker answers a family-scoped validation with
 * `familyEvidence` *beside* the receipt, and the learning pass recorded only the receipt. The
 * durable learning record therefore had no family at all, so the operator readback could not show
 * which family a validation belonged to even though the whole chain had just propagated it
 * (addendum 21 D11: "the per-family receipt must carry the canonical gate dimensions").
 */
test("run99 R33 the recorded validation receipt keeps the family evidence", async () => {
  const runtime = fakeRuntime({
    groups: decisiveGroups,
    validation: {
      receipt: {
        receiptId: "validation:family",
        decision: "validate",
        baselineId: "baseline:family",
      },
      promotionEligible: true,
      familyEvidence: {
        taskTypeId: "coder.review",
        taxonomyVersion: "1.0.0-alpha.1",
        decisiveComparisons: 3,
        holdoutComparisons: 1,
        distinctCaptures: 3,
        baselinePackageId: "sha256:baseline-package",
        floorMet: true,
      },
    },
  });
  await runTrackBLearningPass(runtime, passInput({ taskTypeId: "coder.review" }));
  const records = runtime.invocations
    .filter((entry) => entry.capability === "knowledge:record-learning")
    .map((entry) => (entry.value.record ?? {}) as Record<string, unknown>);
  const receiptRecord = records.find((record) => record.kind === "validation_receipt");
  expect(receiptRecord).toBeDefined();
  const stored = (receiptRecord?.record ?? {}) as Record<string, unknown>;
  expect(stored.familyEvidence).toMatchObject({
    taskTypeId: "coder.review",
    floorMet: true,
  });
});

test("run98 R3 an insufficient-evidence decision is recorded without promoting", async () => {
  const runtime = fakeRuntime({
    groups: [group({ groupId: "comparison:1", outcome: "candidate" })],
    validation: {
      receipt: { receiptId: "validation:insufficient", decision: "insufficient_evidence" },
      promotionEligible: false,
    },
  });
  const receipt = await runTrackBLearningPass(runtime, passInput());
  expect(receipt).toMatchObject({
    decision: "insufficient_evidence",
    promoted: false,
    packId: null,
  });
  expect(runtime.invocations.map((entry) => entry.capability)).toEqual([
    "evaluation:list-groups",
    "knowledge:validate-candidate",
    "knowledge:record-learning",
  ]);
  const record = runtime.invocations[2].value.record as Record<string, unknown>;
  expect(record).toMatchObject({ kind: "validation_receipt", state: "insufficient_evidence" });
});

test("run98 R3 the pass fails closed without a scoring identity or durable receipt", async () => {
  const runtime = fakeRuntime({ groups: decisiveGroups });
  await expect(
    runTrackBLearningPass(
      runtime,
      passInput({ identity: { scorerSetVersion: "", judgeEndpointId: null } }),
    ),
  ).rejects.toThrow(/scoring identity/);
  await expect(
    runTrackBLearningPass(fakeRuntime({ groups: decisiveGroups, validation: {} }), passInput()),
  ).rejects.toThrow(/durable receipt/);
});

test("run98 R3 an externalized comparison-group list is decoded before the evidence floor runs", async () => {
  // The packaged extension host answers a large `evaluation:list-groups` with a durable-output
  // envelope; reading it as an array silently produced zero decisive comparisons and refused
  // every candidate (observed live on stage v86).
  const seen: string[] = [];
  const runtime = {
    async invoke(extensionId: string, envelope: Record<string, unknown>) {
      const capability = String(envelope.capability);
      seen.push(capability);
      if (capability === "evaluation:list-groups") {
        return { businessOutput: decisiveGroups, durableLocator: "artifact:groups" };
      }
      if (capability === "knowledge:validate-candidate") {
        const summary = (envelope.value as Record<string, unknown>).evidenceSummary as Record<
          string,
          unknown
        >;
        // The floor must see the real evidence, not an empty list.
        expect(summary).toMatchObject({
          decisiveComparisons: 3,
          holdoutComparisons: 3,
          distinctCaptures: 3,
        });
        return {
          receipt: { receiptId: "validation:externalized", decision: "validate" },
          promotionEligible: false,
        };
      }
      if (capability === "knowledge:record-learning") return { recorded: true };
      throw new Error(`unexpected capability ${capability}`);
    },
  };
  const receipt = await runTrackBLearningPass(runtime, {
    ...passInput(),
    decodeResult: (_extensionId, _capability, raw) =>
      (raw as { businessOutput?: unknown }).businessOutput,
  });
  expect(receipt).toMatchObject({
    decision: "validate",
    validationReceiptId: "validation:externalized",
  });
  expect(seen).toEqual([
    "evaluation:list-groups",
    "knowledge:validate-candidate",
    "knowledge:record-learning",
  ]);
});

/**
 * Run 99 R33 (addendum 20 D4, `guidance/13` §Shrinkage across context hierarchy): a family's
 * estimate is shrunk toward the broader route-package level when its own evidence is thin, the
 * broader level is calibrated from the *other* families only (disjoint), and the fallback level is
 * recorded so route diagnostics can say which level actually applied. The floor stays family-gated:
 * broader evidence can move a prior, never satisfy the floor.
 */
test("run99 R33 D4 a thin family shrinks toward the package prior and discloses the fallback level", () => {
  const nowMs = Date.parse("2026-09-14T10:00:00Z");
  const withDelta = (id: string, family: string, comparisonDelta: number) => {
    const base = group({
      groupId: id,
      outcome: "candidate",
      inputRef: `artifact:${id.padEnd(64, "0")}`,
      taskTypeId: family,
      observedAt: new Date(nowMs).toISOString(),
    });
    return {
      ...base,
      result: {
        ...(base.result as Record<string, unknown>),
        members: [
          { score: 0, disposition: "negative" },
          { score: comparisonDelta, disposition: "positive" },
        ],
      },
    };
  };

  const summary = buildTrackBLearningEvidenceSummary({
    groups: [
      withDelta("thin-a", "coder.review", 1),
      withDelta("sib-a", "coder.refactor", 0.2),
      withDelta("sib-b", "coder.refactor", 0.2),
      withDelta("sib-c", "coder.refactor", 0.2),
    ],
    routePackage,
    nowMs,
    evidenceMaxAgeMs: 30 * 24 * 60 * 60 * 1_000,
  });

  const review = summary.byFamily["coder.review"].hierarchy;
  expect(review.level).toBe("task_family");
  expect(review.fallbackLevel).toBe("route_package");
  // The prior is calibrated from the other family only (0.2), never from the family's own value.
  expect(review.priorMean).toBeCloseTo(0.2, 3);
  expect(review.effectiveN).toBeCloseTo(0.9, 3);
  expect(review.priorStrength).toBe(5);
  // (0.9 * 1.0 + 5 * 0.2) / 5.9
  expect(review.shrunkValue).toBeCloseTo((0.9 * 1 + 5 * 0.2) / 5.9, 3);
  expect(review.confidence).toBeCloseTo(0.9 / 5.9, 3);
});

/**
 * Run 99 R33 (addendum 20 D6, `guidance/13` L417 / `guidance/16` L469): observational traffic is
 * not an unbiased experiment. The family receipt states how much of its evidence carries a valid
 * selection probability, and it only claims a randomized basis when every counted comparison does
 * — otherwise the claim is explicitly observational.
 */
test("run99 R33 D6 the family states its propensity coverage and qualifies the causal claim", () => {
  const nowMs = Date.parse("2026-09-14T10:00:00Z");
  const traced = (id: string, mode: string, probability: number) =>
    group({
      groupId: id,
      outcome: "candidate",
      inputRef: `artifact:${id.padEnd(64, "0")}`,
      taskTypeId: "coder.review",
      observedAt: new Date(nowMs).toISOString(),
      selectionMode: mode,
      selectionProbability: probability,
    });
  const untraced = group({
    groupId: "untraced",
    outcome: "source",
    inputRef: `artifact:${"u".repeat(64)}`,
    taskTypeId: "coder.review",
    observedAt: new Date(nowMs).toISOString(),
  });

  const mixed = buildTrackBLearningEvidenceSummary({
    groups: [
      traced("t1", "controlled_exploration", 0.25),
      traced("t2", "policy_randomized", 0.5),
      untraced,
    ],
    routePackage,
    nowMs,
    evidenceMaxAgeMs: 30 * 24 * 60 * 60 * 1_000,
  });
  // Two of three comparisons carry a valid propensity, and the untraced one is not randomized.
  expect(mixed.byFamily["coder.review"].propensityCoverage).toBeCloseTo(0.6667, 3);
  expect(mixed.byFamily["coder.review"].causalClaim).toBe("observational");

  const fullyTraced = buildTrackBLearningEvidenceSummary({
    groups: [traced("p1", "controlled_exploration", 0.25), traced("p2", "policy_randomized", 0.5)],
    routePackage,
    nowMs,
    evidenceMaxAgeMs: 30 * 24 * 60 * 60 * 1_000,
  });
  expect(fullyTraced.byFamily["coder.review"].propensityCoverage).toBe(1);
  expect(fullyTraced.byFamily["coder.review"].causalClaim).toBe("randomized");
});

/**
 * Run 113 (addendum 08 R3/S4, live measurement): 169 learned-experience candidates and a growing
 * stack of pack records existed on the live runtime, and `contracts\` still held **zero**
 * `ExperiencePackCandidateV1` / `RouteLearningValidationReceiptV1` files. The builders were
 * unit-tested and had no production caller on the path that writes on real traffic - this pass is
 * that path. The artifacts are the documented vocabulary; the richer durable record stays in the
 * Knowledge Store (`emitTrackBContract` validates before it writes, so a shape that only satisfies
 * the runtime's own record would throw rather than publish a lie).
 */
test("run113 the pass emits the documented pack and validation-receipt artifacts when the caller names a contract state root", async () => {
  const stateRoot = mkdtempSync(path.join(tmpdir(), "run113-contracts-"));
  /**
   * Both artifacts are closed contracts with required members the runtime's own record does not
   * always carry (`splitHash` must be a 64-hex digest, `experienceIds` must be non-empty). The
   * emission is honest about that: `emitTrackBContract` validates first and the pass logs a
   * bounded refusal instead of publishing an artifact that only satisfies the runtime's shape.
   * This fixture is the documented shape, so the happy path writes both files.
   */
  const runtime = fakeRuntime({
    groups: decisiveGroups,
    validation: {
      receipt: {
        receiptId: "validation:1",
        candidateId: "shadow-candidate-1",
        candidateType: "experience",
        decision: "validate",
        baselineId: "baseline:1",
        splitHash: "a".repeat(64),
        caseManifestRef: "manifest:learning-pass:1",
        estimatorVersion: "paired-cluster-bootstrap-v1",
        bootstrapSeed: 87,
        qualityDelta: 0.2,
        confidenceLower: 0.05,
        confidenceUpper: 0.3,
        holdoutSampleCount: 3,
        guardrailsPassed: true,
        createdAt: "2026-09-24T08:00:00.000Z",
        runtimeChannel: "stage",
        scopeId: "standalone-runtime-stage",
        boundaryProtocolVersion: "1.1",
      },
      promotionEligible: true,
    },
    promotion: {
      packCandidate: {
        packId: "pack:1",
        status: "validated",
        priority: "advisory_only",
        experienceIds: ["experience:1"],
        maxTokens: 512,
        placement: "context_block",
        createdAt: "2026-09-24T08:00:00.000Z",
      },
    },
  });
  const receipt = await runTrackBLearningPass(runtime, passInput({ contractStateRoot: stateRoot }));

  expect(receipt).toMatchObject({ decision: "validate", packId: "pack:1", promoted: true });
  const directory = path.join(stateRoot, "standalone-runtime-stage", "track-b", "contracts");
  const files = readdirSync(directory);
  expect(files.filter((name) => name.startsWith("RouteLearningValidationReceiptV1-"))).toHaveLength(
    1,
  );
  expect(files.filter((name) => name.startsWith("ExperiencePackCandidateV1-"))).toHaveLength(1);
  /**
   * Run 100 addendum 16: the promotion is the transition, so the activation receipt is emitted here - and only
   * here. Measured 2026-09-25: the only activation artifacts on disk were 658 synthetic `disabled` non-events
   * (identical package ids) emitted by the pipeline on every run; the promoted pack's transition was nowhere in the
   * contract vocabulary. The receipt must name the promoted pack, its validation baseline, the receipt that
   * authorised the promotion, and it must validate against the closed contract (a non-empty scope plus a
   * `validationReceiptId` are what the schema - not the TypeScript interface - requires).
   */
  const activationFiles = files.filter((name) =>
    name.startsWith("RoutePackageActivationReceiptV1-"),
  );
  expect(activationFiles).toHaveLength(1);
  const activation = JSON.parse(readFileSync(path.join(directory, activationFiles[0]), "utf8"));
  expect(activation).toMatchObject({
    contract: "RoutePackageActivationReceiptV1",
    packageId: "pack:1",
    priorPackageId: "baseline:1",
    state: "active",
    validationReceiptId: "validation:1",
    policyGateId: "gate:route-package-activation",
    scopeId: "standalone-runtime-stage",
  });
  expect(activation.packageId).not.toBe(activation.priorPackageId);
});

test("run113 a caller that does not name a contract state root emits nothing (a unit test or a fixture)", async () => {
  const stateRoot = mkdtempSync(path.join(tmpdir(), "run113-contracts-"));
  const runtime = fakeRuntime({ groups: decisiveGroups });
  await runTrackBLearningPass(runtime, passInput());

  expect(existsSync(path.join(stateRoot, "standalone-runtime-stage", "track-b", "contracts"))).toBe(
    false,
  );
});
