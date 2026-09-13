import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { expect, test } from "vitest";

import {
  V11_CONTRACT_SCHEMAS,
  assertV11Contract,
  validateV11Contract,
  validateV11ContractDefinition,
} from "../src/v1.1-contracts.js";

const envelope = {
  runtimeChannel: "stage",
  scopeId: "standalone-runtime-stage",
  boundaryProtocolVersion: "1.1",
} as const;

const createdAt = "2026-09-13T02:00:00.000Z";

const executionContext = {
  contract: "RoutingEvaluationExecutionContextV1",
  executionId: "execution:run97:1",
  purpose: "routing_replay",
  tasksetRef: "taskset:live-captures",
  harnessRef: "harness:pi-cli",
  runtimeRef: "runtime:stage:3457",
  routerPolicyVersion: "policy:run97:v1",
  contractVersion: "1.1.0",
  splitAlgorithm: "hash_partition_v1",
  splitSeed: 97,
  adapterDependency: "none",
  sourceProjectionIds: ["projection:run97:1"],
  createdAt,
  ...envelope,
};

const rolloutGroupFinalized = {
  contract: "RoutingRolloutGroupLifecycleV1",
  groupId: "comparison:supervised-replay:1",
  executionContextId: executionContext.executionId,
  state: "finalized",
  comparabilityKey: "task:route-selection:policy:run97",
  rolloutRefs: ["rollout:source", "rollout:counterfactual"],
  scoreRefs: ["score:source", "score:counterfactual"],
  positiveRolloutRefs: ["rollout:counterfactual"],
  negativeRolloutRefs: ["rollout:source"],
  scorerSetVersion: "run96-semantic-criteria@2",
  policySnapshotRef: "policy:run97:v1",
  createdAt,
  updatedAt: createdAt,
  ...envelope,
};

const experienceCandidate = {
  contract: "LearnedExperienceCandidateV1",
  experienceId: "experience:run97:1",
  version: 1,
  scope: { taskTypeId: "task:route-selection", modelFamily: "deepseek" },
  experienceTextRef: "artifact:experience-text",
  sourceGroupIds: [rolloutGroupFinalized.groupId],
  positiveRolloutRefs: ["rollout:counterfactual"],
  negativeRolloutRefs: ["rollout:source"],
  status: "shadow_validating",
  redactionStatus: "redacted",
  instructionHierarchyChecked: true,
  promptInjectionReviewed: true,
  createdAt,
  ...envelope,
};

const packCandidate = {
  contract: "ExperiencePackCandidateV1",
  packId: "pack:run97:1",
  version: 1,
  scope: { taskTypeId: "task:route-selection" },
  experienceIds: [experienceCandidate.experienceId],
  maxTokens: 2048,
  placement: "context_block",
  priority: "advisory_only",
  status: "shadow",
  createdAt,
  ...envelope,
};

const validationReceipt = {
  contract: "RouteLearningValidationReceiptV1",
  receiptId: "validation:run97:1",
  candidateType: "experience",
  candidateId: experienceCandidate.experienceId,
  baselineId: "baseline:no-experience",
  splitHash: "a".repeat(64),
  caseManifestRef: "manifest:holdout:run97",
  estimatorVersion: "run96-ipw-v2",
  bootstrapSeed: 97,
  qualityDelta: 0.12,
  confidenceLower: 0.03,
  confidenceUpper: 0.21,
  holdoutSampleCount: 20,
  guardrailsPassed: true,
  decision: "validate",
  createdAt,
  ...envelope,
};

const attribution = {
  contract: "RoutePackageAttributionV1",
  attributionId: "attribution:run97:1",
  routePackage: {
    packageId: "package:deepseek-flash-high",
    endpointId: "endpoint:deepseek-flash-high",
    modelId: "deepseek/deepseek-flash",
    modelRevision: "2026-09",
    samplingProfileId: "sampling:default",
  },
  scope: { taskTypeId: "task:route-selection" },
  baselinePackageId: "package:baseline",
  qualityDelta: 0.05,
  costDelta: -0.1,
  latencyDelta: 120,
  sampleCount: 12,
  confidence: 0.7,
  evidenceManifestRef: "manifest:attribution:run97",
  createdAt,
  ...envelope,
};

const activationReceipt = {
  contract: "RoutePackageActivationReceiptV1",
  receiptId: "activation:run97:1",
  packageId: "package:deepseek-flash-high",
  scope: { taskTypeId: "task:route-selection" },
  policyGateId: "gate:route-package-activation",
  priorPackageId: "package:baseline",
  state: "disabled",
  activatedAt: createdAt,
  ...envelope,
};

const graphNode = {
  contract: "ArtifactGraphNodeV2",
  nodeId: "node:run97:1",
  schemaVersion: "2.0.0",
  scopeId: envelope.scopeId,
  kind: "message",
  payload: {
    role: "assistant",
    contentPartReferenceIds: [],
    providerGenerated: true,
    sampled: false,
  },
  retentionState: "full_content_available",
  createdAt,
  runtimeChannel: envelope.runtimeChannel,
  boundaryProtocolVersion: envelope.boundaryProtocolVersion,
};

const graphEdge = {
  contract: "ArtifactGraphEdgeV2",
  edgeId: "edge:run97:1",
  scopeId: envelope.scopeId,
  sourceNodeId: graphNode.nodeId,
  targetNodeId: "node:run97:2",
  edgeType: "replay_branch",
  orderingIndex: 0,
  // A replay branch edge must name the branch it belongs to (schema allOf).
  branchId: "branch:run97:1",
  replayId: "replay:run97:1",
  createdAt,
  runtimeChannel: envelope.runtimeChannel,
  boundaryProtocolVersion: envelope.boundaryProtocolVersion,
};

const performanceSample = {
  contract: "PerformanceSampleV2",
  sampleId: "sample:run97:1",
  observedAt: createdAt,
  observationId: "observation:run97:1",
  routeDecisionId: "decision:run97:1",
  routerPolicyVersion: "policy:run97:v1",
  routePackage: {
    packageId: "package:deepseek-flash-high",
    endpointId: "endpoint:deepseek-flash-high",
    modelId: "deepseek/deepseek-flash",
    modelRevision: "2026-09",
    samplingProfileId: "sampling:default",
  },
  selectionProbability: 1,
  selectionMode: "policy_deterministic",
  outcome: "success",
  latencyMs: 1200,
  evidenceStrength: "pairwise_comparison",
};

const captureDegradationReceipt = {
  contract: "CaptureDegradationReceiptV1",
  receiptId: "degradation:run97:1",
  failureStage: "artifact_write",
  actionTaken: "metadata_only",
  reasonCode: "artifact_store_unavailable",
  routingContinued: true,
  createdAt,
  runtimeChannel: envelope.runtimeChannel,
  scopeId: envelope.scopeId,
  boundaryProtocolVersion: envelope.boundaryProtocolVersion,
};

const traceGraphProjection = {
  contract: "TraceGraphProjectionV2",
  schemaVersion: "2.0.0",
  projectionId: "projection:run97:1",
  sourceObservationIds: ["observation:run97:1"],
  sourceRouteDecisionIds: ["decision:run97:1"],
  sourceGraphNodeIds: [graphNode.nodeId],
  sourceGraphEdgeIds: [graphEdge.edgeId],
  structuralCompleteness: "transcript_full",
  evaluationEvidence: "pairwise_scored",
  tokenFidelity: "exact",
  tokenTransitionEvidenceIds: ["transition:run97:1"],
  scoreEvidenceIds: ["score:run97:1"],
  permittedUses: {
    routingAnalysis: true,
    localReplay: true,
    localEvaluation: true,
    externalSftExport: false,
    externalRewardExport: false,
    externalRlExport: false,
  },
  policyClearance: {
    consent: true,
    redaction: true,
    licensing: true,
    instructionHierarchy: true,
    contamination: false,
    toolOutputSafety: true,
  },
  destinationAuthorizationIds: [],
  privacyReceiptId: "privacy:run97:1",
  redactionReceiptId: "redaction:run97:1",
  retentionPolicyId: "retention:default",
  materialization: {
    mode: "materialized",
    evictable: true,
    reconstructableFrom: ["graph:run97:1"],
  },
  createdAt,
  runtimeChannel: envelope.runtimeChannel,
  scopeId: envelope.scopeId,
  boundaryProtocolVersion: envelope.boundaryProtocolVersion,
};

test("v1.1 route-learning contracts validate against the vendored proposal schemas", () => {
  const values: readonly [string, string, unknown][] = [
    ["routeLearning", "executionContext", executionContext],
    ["routeLearning", "rolloutGroup", rolloutGroupFinalized],
    ["routeLearning", "experienceCandidate", experienceCandidate],
    ["routeLearning", "packCandidate", packCandidate],
    ["routeLearning", "validationReceipt", validationReceipt],
    ["routeLearning", "attribution", attribution],
    ["routeLearning", "activationReceipt", activationReceipt],
    ["trackBStorage", "graphNode", graphNode],
    ["trackBStorage", "graphEdge", graphEdge],
    ["trackBStorage", "performanceSample", performanceSample],
    ["trackBStorage", "captureDegradationReceipt", captureDegradationReceipt],
    ["trackBProjection", "traceGraphProjection", traceGraphProjection],
  ];
  for (const [family, definition, value] of values) {
    const result = validateV11ContractDefinition(
      family as "routeLearning" | "trackBStorage" | "trackBProjection",
      definition,
      value,
    );
    if (!result.valid) {
      // eslint-disable-next-line no-console
      console.error(`${definition}: ${result.errors.join(" | ")}`);
    }
    expect(result.valid, `${definition}: ${result.errors.join(" | ")}`).toBe(true);
    expect(validateV11Contract(value).valid, `${definition} (any family)`).toBe(true);
  }
  expect(validateV11Contract(executionContext).family).toBe("routeLearning");
  expect(validateV11Contract(graphNode).family).toBe("trackBStorage");
  expect(validateV11Contract(traceGraphProjection).family).toBe("trackBProjection");
});

test("v1.1 contracts fail closed on missing lifecycle evidence", () => {
  const finalizedWithoutEvidence = { ...rolloutGroupFinalized };
  delete (finalizedWithoutEvidence as Record<string, unknown>).positiveRolloutRefs;
  delete (finalizedWithoutEvidence as Record<string, unknown>).negativeRolloutRefs;
  expect(validateV11Contract(finalizedWithoutEvidence).valid).toBe(false);

  const promotedWithoutReceipt = { ...experienceCandidate, status: "promoted" };
  expect(validateV11Contract(promotedWithoutReceipt).valid).toBe(false);

  const activeWithoutReceipt = { ...activationReceipt, state: "active" };
  expect(validateV11Contract(activeWithoutReceipt).valid).toBe(false);

  const missingChannel = { ...graphNode } as Record<string, unknown>;
  delete missingChannel.runtimeChannel;
  expect(validateV11Contract(missingChannel).valid).toBe(false);

  const unknownProperty = { ...attribution, unexpectedField: true };
  expect(validateV11Contract(unknownProperty).valid).toBe(false);
});

test("v1.1 embedded schemas stay identical to the vendored proposal schemas", () => {
  const read = (file: string) =>
    JSON.parse(
      readFileSync(
        fileURLToPath(new URL(`../schemas/${file}`, import.meta.url)),
        "utf8",
      ),
    );
  expect(V11_CONTRACT_SCHEMAS.routeLearning).toEqual(
    read("route-learning-contracts.schema.json"),
  );
  expect(V11_CONTRACT_SCHEMAS.trackBStorage).toEqual(
    read("track-b-storage-contracts.schema.json"),
  );
  expect(V11_CONTRACT_SCHEMAS.trackBProjection).toEqual(
    read("track-b-projection-contracts.schema.json"),
  );
});

test("assertV11Contract reports the failing family paths for an invalid artifact", () => {
  expect(() => assertV11Contract({ contract: "NotAContract" })).toThrow(
    /v1\.1 contract validation failed/,
  );
});
