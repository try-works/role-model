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
}) {
  return {
    groupId: input.groupId,
    status: "finalized",
    comparability: {
      counterfactualCandidateRef: input.counterfactualRef ?? routePackage,
      sourceCandidateRef: input.sourceRef ?? "deepseek.personal.deepseek-api-key.global.deepseek-flash-max",
      inputRef: input.inputRef ?? `artifact:${"a".repeat(64)}`,
      policyId: "run96-routing-shadow",
      scorerSetVersion: "run96-routing-shadow-v3",
      taskRef: `artifact:${"b".repeat(64)}`,
      sourceEvidenceRef: `artifact:${"c".repeat(64)}`,
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
        sourceCandidateRef: input.sourceRef ?? "deepseek.personal.deepseek-api-key.global.deepseek-flash-max",
        inputRef: input.inputRef ?? `artifact:${"a".repeat(64)}`,
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
    finalizedComparisonReceipt: { payload: { kind: "evaluation_core_comparison_readback" }, signature: "sig" },
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
      const value = (envelope.capability === "knowledge:record-learning"
        ? envelope.payload
        : envelope.value ?? {}) as Record<string, unknown>;
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
  expect((runtime.invocations[2].envelope.payload as Record<string, unknown>).record).toMatchObject({
    kind: "validation_receipt",
    recordId: "validation:1",
  });
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
  expect(records[0]).toMatchObject({ recordId: "validation:1", state: "validate", scopeId: "standalone-runtime-stage" });
  expect(records[1]).toMatchObject({ recordId: "pack:1", state: "validated" });
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
    runTrackBLearningPass(runtime, passInput({ identity: { scorerSetVersion: "", judgeEndpointId: null } })),
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
  expect(receipt).toMatchObject({ decision: "validate", validationReceiptId: "validation:externalized" });
  expect(seen).toEqual([
    "evaluation:list-groups",
    "knowledge:validate-candidate",
    "knowledge:record-learning",
  ]);
});
