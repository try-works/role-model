/**
 * v1.1 route-learning contract emission.
 *
 * The runtime owns the internal replay/evaluation/learning records; this module maps
 * them onto the documented Direct Track B contracts and persists each validated
 * contract under the runtime state root, so the loop's durable evidence is the
 * documented vocabulary instead of a parallel one.
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { assertV11Contract } from "@role-model/protocol-types";

const CONTRACT_ID_FIELDS: Readonly<Record<string, string>> = Object.freeze({
  RoutingEvaluationExecutionContextV1: "executionId",
  RoutingRolloutGroupLifecycleV1: "groupId",
  LearnedExperienceCandidateV1: "experienceId",
  ExperiencePackCandidateV1: "packId",
  RouteLearningValidationReceiptV1: "receiptId",
  RoutePackageAttributionV1: "attributionId",
  RoutePackageActivationReceiptV1: "receiptId",
});

const safeFilePart = (value: string): string =>
  value.replace(/[^a-zA-Z0-9._-]/gu, "_").slice(0, 120);

export interface TrackBContractEmission {
  readonly contract: string;
  readonly contractId: string;
  readonly ref: string;
  readonly digest: string;
  readonly filePath: string;
}

/**
 * Validate a documented contract and write it durably. Validation failure is a
 * defect: the runtime must never persist an artifact that only satisfies its own
 * bespoke shape.
 */
export function emitTrackBContract(input: {
  readonly stateRoot: string;
  readonly scopeId: string;
  readonly contract: Record<string, unknown>;
}): TrackBContractEmission {
  assertV11Contract(input.contract);
  const name = String(input.contract.contract);
  const idField = CONTRACT_ID_FIELDS[name];
  if (!idField) throw new Error(`unsupported v1.1 contract emission: ${name}`);
  const contractId = String(input.contract[idField] ?? "");
  if (!contractId) throw new Error(`${name} is missing ${idField}`);
  const directory = path.join(input.stateRoot, input.scopeId, "track-b", "contracts");
  mkdirSync(directory, { recursive: true });
  const filePath = path.join(directory, `${safeFilePart(name)}-${safeFilePart(contractId)}.json`);
  const body = `${JSON.stringify(input.contract, null, 2)}\n`;
  writeFileSync(filePath, body, "utf8");
  const digest = `sha256:${createHash("sha256").update(body).digest("hex")}`;
  return {
    contract: name,
    contractId,
    ref: `contract:${name}:${contractId}`,
    digest,
    filePath,
  };
}

const iso = (ms: number): string => new Date(ms).toISOString();

const contractEnvelope = (input: {
  readonly channel: string;
  readonly scopeId: string;
}): {
  readonly runtimeChannel: "production" | "stage" | "development";
  readonly scopeId: string;
  readonly boundaryProtocolVersion: string;
} => ({
  runtimeChannel:
    input.channel === "production" || input.channel === "development"
      ? input.channel
      : "stage",
  scopeId: input.scopeId,
  boundaryProtocolVersion: "1.1",
});

export interface RoutingEvaluationExecutionContextInput {
  readonly executionId: string;
  readonly purpose: "routing_evaluation" | "routing_replay" | "route_package_attribution";
  readonly tasksetRef: string;
  readonly harnessRef: string;
  readonly runtimeRef: string;
  readonly routerPolicyVersion: string;
  readonly splitAlgorithm?: "hash_partition_v1" | "stratified_hash_partition_v1";
  readonly splitSeed?: number;
  readonly sourceProjectionIds?: readonly string[];
  readonly channel: string;
  readonly scopeId: string;
  readonly createdAtMs: number;
}

export function buildRoutingEvaluationExecutionContext(
  input: RoutingEvaluationExecutionContextInput,
) {
  return {
    contract: "RoutingEvaluationExecutionContextV1" as const,
    executionId: input.executionId,
    purpose: input.purpose,
    tasksetRef: input.tasksetRef,
    harnessRef: input.harnessRef,
    runtimeRef: input.runtimeRef,
    routerPolicyVersion: input.routerPolicyVersion,
    contractVersion: "1.1.0" as const,
    splitAlgorithm: input.splitAlgorithm ?? ("hash_partition_v1" as const),
    splitSeed: input.splitSeed ?? 97,
    adapterDependency: "none" as const,
    ...(input.sourceProjectionIds?.length
      ? { sourceProjectionIds: [...input.sourceProjectionIds] }
      : {}),
    createdAt: iso(input.createdAtMs),
    ...contractEnvelope(input),
  };
}

export interface RoutingRolloutGroupLifecycleInput {
  readonly groupId: string;
  readonly executionContextId: string;
  readonly state: "collecting" | "finalizing" | "finalized" | "partial" | "failed" | "expired";
  readonly comparabilityKey: string;
  readonly rolloutRefs: readonly string[];
  readonly scoreRefs: readonly string[];
  readonly positiveRolloutRefs?: readonly string[];
  readonly negativeRolloutRefs?: readonly string[];
  readonly scorerSetVersion: string;
  readonly policySnapshotRef?: string;
  readonly channel: string;
  readonly scopeId: string;
  readonly createdAtMs: number;
  readonly updatedAtMs: number;
}

export function buildRoutingRolloutGroupLifecycle(
  input: RoutingRolloutGroupLifecycleInput,
) {
  return {
    contract: "RoutingRolloutGroupLifecycleV1" as const,
    groupId: input.groupId,
    executionContextId: input.executionContextId,
    state: input.state,
    comparabilityKey: input.comparabilityKey,
    rolloutRefs: [...input.rolloutRefs],
    scoreRefs: [...input.scoreRefs],
    ...(input.positiveRolloutRefs?.length
      ? { positiveRolloutRefs: [...input.positiveRolloutRefs] }
      : {}),
    ...(input.negativeRolloutRefs?.length
      ? { negativeRolloutRefs: [...input.negativeRolloutRefs] }
      : {}),
    scorerSetVersion: input.scorerSetVersion,
    ...(input.policySnapshotRef ? { policySnapshotRef: input.policySnapshotRef } : {}),
    createdAt: iso(input.createdAtMs),
    updatedAt: iso(input.updatedAtMs),
    ...contractEnvelope(input),
  };
}

export interface LearnedExperienceCandidateInput {
  readonly experienceId: string;
  readonly version?: number;
  readonly scope: Record<string, unknown>;
  readonly experienceTextRef: string;
  readonly sourceGroupIds: readonly string[];
  readonly positiveRolloutRefs: readonly string[];
  readonly negativeRolloutRefs: readonly string[];
  readonly status:
    | "candidate"
    | "shadow_validating"
    | "validated"
    | "promoted"
    | "deprecated"
    | "rejected"
    | "superseded";
  readonly redactionStatus: "raw" | "redacted" | "safe_for_prompt" | "blocked";
  readonly instructionHierarchyChecked: boolean;
  readonly promptInjectionReviewed: boolean;
  readonly validationReceiptId?: string;
  readonly channel: string;
  readonly scopeId: string;
  readonly createdAtMs: number;
}

export function buildLearnedExperienceCandidate(input: LearnedExperienceCandidateInput) {
  return {
    contract: "LearnedExperienceCandidateV1" as const,
    experienceId: input.experienceId,
    version: input.version ?? 1,
    scope: input.scope,
    experienceTextRef: input.experienceTextRef,
    sourceGroupIds: [...input.sourceGroupIds],
    positiveRolloutRefs: [...input.positiveRolloutRefs],
    negativeRolloutRefs: [...input.negativeRolloutRefs],
    status: input.status,
    redactionStatus: input.redactionStatus,
    instructionHierarchyChecked: input.instructionHierarchyChecked,
    promptInjectionReviewed: input.promptInjectionReviewed,
    ...(input.validationReceiptId ? { validationReceiptId: input.validationReceiptId } : {}),
    createdAt: iso(input.createdAtMs),
    ...contractEnvelope(input),
  };
}

export interface RoutePackageAttributionInput {
  readonly attributionId: string;
  readonly routePackage: {
    readonly packageId: string;
    readonly endpointId: string;
    readonly modelId: string;
    readonly modelRevision: string;
    readonly samplingProfileId: string;
    readonly promptAdapterId?: string;
    readonly toolPolicyId?: string;
    readonly experiencePackId?: string;
  };
  readonly scope: Record<string, unknown>;
  readonly baselinePackageId: string;
  readonly qualityDelta: number;
  readonly costDelta: number;
  readonly latencyDelta: number;
  readonly sampleCount: number;
  readonly confidence: number;
  readonly evidenceManifestRef: string;
  readonly channel: string;
  readonly scopeId: string;
  readonly createdAtMs: number;
}

export function buildRoutePackageAttribution(input: RoutePackageAttributionInput) {
  return {
    contract: "RoutePackageAttributionV1" as const,
    attributionId: input.attributionId,
    routePackage: input.routePackage,
    scope: input.scope,
    baselinePackageId: input.baselinePackageId,
    qualityDelta: input.qualityDelta,
    costDelta: input.costDelta,
    latencyDelta: input.latencyDelta,
    sampleCount: input.sampleCount,
    confidence: input.confidence,
    evidenceManifestRef: input.evidenceManifestRef,
    createdAt: iso(input.createdAtMs),
    ...contractEnvelope(input),
  };
}

export interface RoutePackageActivationReceiptInput {
  readonly receiptId: string;
  readonly packageId: string;
  readonly scope: Record<string, unknown>;
  readonly policyGateId: string;
  readonly priorPackageId: string;
  readonly state: "active" | "rolled_back" | "disabled";
  readonly validationReceiptId?: string;
  readonly activatedAtMs: number;
  readonly rolledBackAtMs?: number;
  readonly channel: string;
  readonly scopeId: string;
}

export function buildRoutePackageActivationReceipt(
  input: RoutePackageActivationReceiptInput,
) {
  return {
    contract: "RoutePackageActivationReceiptV1" as const,
    receiptId: input.receiptId,
    packageId: input.packageId,
    scope: input.scope,
    policyGateId: input.policyGateId,
    priorPackageId: input.priorPackageId,
    ...(input.validationReceiptId ? { validationReceiptId: input.validationReceiptId } : {}),
    state: input.state,
    activatedAt: iso(input.activatedAtMs),
    ...(input.rolledBackAtMs === undefined
      ? {}
      : { rolledBackAt: iso(input.rolledBackAtMs) }),
    ...contractEnvelope(input),
  };
}
