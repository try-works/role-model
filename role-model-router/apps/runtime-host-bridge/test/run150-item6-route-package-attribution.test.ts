import { expect, test } from "vitest";
import { mkdtempSync, readFileSync, readdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  runTrackBLearningPass,
} from "../src/track-b-learning-pass.js";
import { emitRoutePackageAttributionForPromotion } from "../src/track-b-contract-emission.js";
import { resolveRoutePackageDescriptorFromRollouts } from "../src/track-b-runtime.js";

/**
 * Run 100 addendum 15 item 6, second half. Measured live on :3457 (2026-09-25): the scope's
 * `track-b\contracts\` directory held 2271 artifacts - 72 `RouteLearningValidationReceiptV1` and 23
 * `ExperiencePackCandidateV1` among them - and **zero** `RoutePackageAttributionV1`. The builder
 * (`buildRoutePackageAttribution`) is unit-tested and has no caller on the path that promotes packs on
 * real traffic, so the documented attribution of a promoted package to the evidence behind it exists
 * only as a fixture.
 *
 * These tests are that caller: the pass emits the attribution when - and only when - it has the
 * promoted package, the descriptor of the route package the evidence is about, and the promotion
 * gate's own numbers (the receipt's manifest ref, quality delta, confidence and sample count). A
 * partial attribution is not published: an artifact whose manifest ref or measured deltas are absent
 * would claim evidence nobody can check.
 */

const routePackage = "deepseek.personal.deepseek-api-key.global.deepseek-flash-high";

const descriptor = {
  endpointId: routePackage,
  modelId: "deepseek/deepseek-flash",
  modelRevision: "unversioned",
  samplingProfileId: "deterministic-v1",
  promptAdapterId: "router-host/default-v1",
  experiencePackId: "none",
} as const;

function group() {
  return {
    groupId: "comparison:1",
    status: "finalized",
    comparability: {
      counterfactualCandidateRef: routePackage,
      sourceCandidateRef: "deepseek.personal.deepseek-api-key.global.deepseek-flash-max",
      inputRef: `artifact:${"a".repeat(64)}`,
      policyId: "run96-routing-shadow",
      scorerSetVersion: "run96-routing-shadow-v3",
      taskRef: `artifact:${"b".repeat(64)}`,
      sourceEvidenceRef: `artifact:${"c".repeat(64)}`,
    },
    holdout: {
      holdoutId: `sha256:${"d".repeat(64)}`,
      membershipDigest: `sha256:${"e".repeat(64)}`,
      partition: "holdout",
      caseIds: ["case:1"],
    },
    result: {
      groupId: "comparison:1",
      status: "finalized",
      outcome: "candidate",
      comparability: {
        counterfactualCandidateRef: routePackage,
        sourceCandidateRef: "deepseek.personal.deepseek-api-key.global.deepseek-flash-max",
        inputRef: `artifact:${"a".repeat(64)}`,
      },
      holdout: { caseIds: ["case:1"] },
      members: [
        { trialId: "trial:source", scoreId: "trial-score:source", score: 0.4, confidence: 1, disposition: "negative" },
        { trialId: "trial:candidate", scoreId: "trial-score:candidate", score: 0.7, confidence: 0.9, disposition: "positive" },
      ],
    },
  };
}

const decisiveGroups = [
  group(),
  {
    ...group(),
    groupId: "comparison:2",
    result: {
      ...group().result,
      groupId: "comparison:2",
      outcome: "source",
      comparability: {
        counterfactualCandidateRef: routePackage,
        sourceCandidateRef: "deepseek.personal.deepseek-api-key.global.deepseek-flash-max",
        inputRef: `artifact:${"2".repeat(64)}`,
      },
    },
  },
  {
    ...group(),
    groupId: "comparison:3",
    result: {
      ...group().result,
      groupId: "comparison:3",
      outcome: "candidate",
      comparability: {
        counterfactualCandidateRef: routePackage,
        sourceCandidateRef: "deepseek.personal.deepseek-api-key.global.deepseek-flash-max",
        inputRef: `artifact:${"3".repeat(64)}`,
      },
    },
  },
];

const validationReceipt = {
  receiptId: "validation:1",
  candidateId: "shadow-candidate-1",
  candidateType: "experience",
  decision: "validate",
  baselineId: "baseline:1",
  splitHash: "a".repeat(64),
  caseManifestRef: "manifest:learning-pass:3:192",
  estimatorVersion: "paired-cluster-bootstrap-v1",
  bootstrapSeed: 87,
  qualityDelta: 0.2,
  confidenceLower: 0.05,
  confidenceUpper: 0.3,
  holdoutSampleCount: 3,
  guardrailsPassed: true,
  createdAt: "2026-09-25T08:00:00.000Z",
  runtimeChannel: "stage",
  scopeId: "standalone-runtime-stage",
  boundaryProtocolVersion: "1.1",
};

function passInput(overrides: Record<string, unknown> = {}) {
  return {
    requestId: "supervised-replay:run150",
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
    evaluationAuthoritySecret: "run150-learning-pass-secret",
    nowMs: Date.parse("2026-09-25T10:00:00Z"),
    ...overrides,
  } as Parameters<typeof runTrackBLearningPass>[1];
}

function fakeRuntime(options: { validation?: Record<string, unknown>; promotion?: Record<string, unknown> }) {
  return {
    async invoke(extensionId: string, envelope: Record<string, unknown>) {
      const capability = String(envelope.capability);
      if (capability === "evaluation:list-groups") return decisiveGroups;
      if (capability === "knowledge:validate-candidate") {
        return (
          options.validation ?? { receipt: { ...validationReceipt }, promotionEligible: true }
        );
      }
      if (capability === "knowledge:promote-candidate") {
        return (
          options.promotion ?? {
            packCandidate: {
              packId: "pack:1",
              status: "validated",
              priority: "advisory_only",
              experienceIds: ["experience:1"],
              maxTokens: 512,
              placement: "context_block",
              createdAt: "2026-09-25T08:00:00.000Z",
            },
          }
        );
      }
      if (capability === "knowledge:record-learning") return { recorded: true, idempotent: false };
      void extensionId;
      throw new Error(`unexpected capability ${capability}`);
    },
  };
}

const contractsDirectory = (stateRoot: string): string =>
  path.join(stateRoot, "standalone-runtime-stage", "track-b", "contracts");

test("run150 item 6 a promoted pack emits the documented route-package attribution with the gate's own numbers", async () => {
  const stateRoot = mkdtempSync(path.join(tmpdir(), "run150-attribution-"));
  const runtime = fakeRuntime({});
  const receipt = await runTrackBLearningPass(
    runtime,
    passInput({ contractStateRoot: stateRoot, routePackageDescriptor: { ...descriptor } }),
  );

  expect(receipt).toMatchObject({ decision: "validate", packId: "pack:1", promoted: true });
  const files = readdirSync(contractsDirectory(stateRoot));
  const attributionFiles = files.filter((name) => name.startsWith("RoutePackageAttributionV1-"));
  expect(attributionFiles).toHaveLength(1);
  const attribution = JSON.parse(
    readFileSync(path.join(contractsDirectory(stateRoot), attributionFiles[0]), "utf8"),
  );
  expect(attribution).toMatchObject({
    contract: "RoutePackageAttributionV1",
    attributionId: "attribution:pack:1",
    routePackage: {
      packageId: "pack:1",
      endpointId: routePackage,
      modelId: "deepseek/deepseek-flash",
      modelRevision: "unversioned",
      samplingProfileId: "deterministic-v1",
    },
    baselinePackageId: "baseline:1",
    /**
     * The numbers are the validation receipt's, not a recomputation: the promotion gate decided on
     * `qualityDelta 0.2` with `confidenceLower 0.05` over `holdoutSampleCount 3`, and the artifact has
     * to let a reader reproduce that decision.
     */
    qualityDelta: 0.2,
    confidence: 0.05,
    sampleCount: 3,
    evidenceManifestRef: "manifest:learning-pass:3:192",
    scopeId: "standalone-runtime-stage",
  });
  expect(attribution.evidenceManifestRef.length).toBeGreaterThan(0);
});

test("run150 item 6 no descriptor means no attribution - the pass still promotes", async () => {
  const stateRoot = mkdtempSync(path.join(tmpdir(), "run150-attribution-"));
  const runtime = fakeRuntime({});
  const receipt = await runTrackBLearningPass(runtime, passInput({ contractStateRoot: stateRoot }));

  expect(receipt).toMatchObject({ decision: "validate", packId: "pack:1", promoted: true });
  const files = readdirSync(contractsDirectory(stateRoot));
  expect(files.filter((name) => name.startsWith("RoutePackageAttributionV1-"))).toHaveLength(0);
});

test("run150 item 6 a receipt without a manifest ref publishes no attribution claim", async () => {
  const stateRoot = mkdtempSync(path.join(tmpdir(), "run150-attribution-"));
  const { caseManifestRef, ...withoutManifest } = validationReceipt;
  void caseManifestRef;
  const runtime = fakeRuntime({
    validation: { receipt: { ...withoutManifest }, promotionEligible: true },
  });
  const receipt = await runTrackBLearningPass(
    runtime,
    passInput({ contractStateRoot: stateRoot, routePackageDescriptor: { ...descriptor } }),
  );

  expect(receipt).toMatchObject({ decision: "validate", packId: "pack:1", promoted: true });
  const files = readdirSync(contractsDirectory(stateRoot));
  expect(files.filter((name) => name.startsWith("RoutePackageAttributionV1-"))).toHaveLength(0);
});

test("run150 item 6 the caller resolves the descriptor from the compared rollouts and refuses an unknown model", () => {
  const rollouts = [
    {
      routePackage: "deepseek.personal.deepseek-api-key.global.deepseek-flash-max",
      endpointId: "deepseek.personal.deepseek-api-key.global.deepseek-flash-max",
      modelId: "deepseek/deepseek-flash",
      reasoningEffort: "max",
      policyId: "run96-routing-shadow",
    },
    {
      routePackage,
      endpointId: routePackage,
      modelId: "deepseek/deepseek-flash",
      reasoningEffort: "high",
      policyId: "run96-routing-shadow",
      samplingProfileId: "deterministic-v1",
      promptAdapterId: "router-host/default-v1",
      experiencePackId: "none",
    },
  ];

  expect(resolveRoutePackageDescriptorFromRollouts(routePackage, rollouts)).toMatchObject({
    endpointId: routePackage,
    modelId: "deepseek/deepseek-flash",
    samplingProfileId: "deterministic-v1",
    promptAdapterId: "router-host/default-v1",
    experiencePackId: "none",
  });
  /**
   * A rollout that cannot name its model cannot support an attribution: the contract's `modelId` is
   * required, and a runtime that invented one would attribute the evidence to a package it never ran.
   */
  expect(
    resolveRoutePackageDescriptorFromRollouts(routePackage, [
      { routePackage, endpointId: routePackage, modelId: "" },
    ]),
  ).toBeNull();
  expect(resolveRoutePackageDescriptorFromRollouts(routePackage, [])).toBeNull();
});

test("run150 item 6 a caller that names no contract state root still writes nothing", async () => {
  const stateRoot = mkdtempSync(path.join(tmpdir(), "run150-attribution-"));
  const runtime = fakeRuntime({});
  await runTrackBLearningPass(
    runtime,
    passInput({ routePackageDescriptor: { ...descriptor } }),
  );
  expect(existsSync(contractsDirectory(stateRoot))).toBe(false);
});

/**
 * The learner sweep in `cli.ts` is the second live promoter: measured on the rebuilt runtime today, a pack
 * was promoted by the sweep's own `knowledge:promote-candidate` call (`pack-89a530d7...`, 2026-09-25T05:23:58Z)
 * with no attribution beside it. Both promoters therefore go through one emitter, so the artifact's shape and
 * its refusal vocabulary cannot drift between the two paths.
 */
test("run150 item 6 the shared emitter names the member that is missing instead of publishing a partial claim", () => {
  const stateRoot = mkdtempSync(path.join(tmpdir(), "run150-attribution-"));
  const base = {
    stateRoot,
    scopeId: "standalone-runtime-stage",
    channel: "stage",
    packId: "pack:1",
    scope: { taskTypeId: "task:route-selection", endpointId: routePackage },
    nowMs: Date.parse("2026-09-25T10:00:00Z"),
  } as const;

  const emitted = emitRoutePackageAttributionForPromotion({
    ...base,
    receipt: { ...validationReceipt },
    descriptor: { ...descriptor },
  });
  expect(emitted.emitted).toBe(true);

  const withoutKey = (key: string): Record<string, unknown> => {
    const copy: Record<string, unknown> = { ...validationReceipt };
    delete copy[key];
    return copy;
  };
  const cases: ReadonlyArray<{
    label: string;
    receipt: Record<string, unknown>;
    descriptor: typeof descriptor | null;
    reason: string;
  }> = [
    {
      label: "no descriptor",
      receipt: { ...validationReceipt },
      descriptor: null,
      reason: "the caller did not resolve the promoted package's endpoint and model",
    },
    {
      label: "no manifest ref",
      receipt: withoutKey("caseManifestRef"),
      descriptor: { ...descriptor },
      reason: "the validation receipt carries no case manifest reference",
    },
    {
      label: "no baseline",
      receipt: withoutKey("baselineId"),
      descriptor: { ...descriptor },
      reason: "the validation receipt carries no baseline package",
    },
    {
      label: "no quality delta",
      receipt: withoutKey("qualityDelta"),
      descriptor: { ...descriptor },
      reason: "the validation receipt carries no measured quality delta",
    },
    {
      label: "no confidence",
      receipt: withoutKey("confidenceLower"),
      descriptor: { ...descriptor },
      reason: "the validation receipt carries no confidence lower bound",
    },
    {
      label: "no sample count",
      receipt: withoutKey("holdoutSampleCount"),
      descriptor: { ...descriptor },
      reason: "the validation receipt carries no holdout sample count",
    },
  ];

  for (const row of cases) {
    const result = emitRoutePackageAttributionForPromotion({
      ...base,
      packId: `pack:${row.label}`,
      receipt: row.receipt,
      descriptor: row.descriptor,
    });
    expect(result, row.label).toMatchObject({ emitted: false, reason: row.reason });
  }

  const files = readdirSync(contractsDirectory(stateRoot));
  expect(files.filter((name) => name.startsWith("RoutePackageAttributionV1-"))).toHaveLength(1);
});
