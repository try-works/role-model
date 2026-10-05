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
  ArtifactGraphNodeV2: "nodeId",
  ArtifactGraphEdgeV2: "edgeId",
  ContentArtifactV2: "artifactId",
  ContentReferenceV1: "referenceId",
  GraphLeaseV1: "leaseId",
  PerformanceSampleV2: "sampleId",
  PerformanceRollupV2: "rollupId",
  CaptureDegradationReceiptV1: "receiptId",
  TraceGraphProjectionV2: "projectionId",
  RoutingTrainingExampleV2: "exampleId",
  ExportProjectionV2: "exportId",
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
  // The recorded scope id can be a private runtime scope (it contains a colon and is
  // not a legal Windows path segment); the contract keeps the raw id while the
  // directory uses a bounded file-safe form.
  const directory = path.join(input.stateRoot, safeFilePart(input.scopeId), "track-b", "contracts");
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
    input.channel === "production" || input.channel === "development" ? input.channel : "stage",
  scopeId: input.scopeId,
  boundaryProtocolVersion: "1.1",
});

/**
 * The taxonomy/route identity a v1.1 `$defs.scope` accepts. The runtime's learned records carry more than
 * this (for example a `taxonomyVersion`), and the closed scope has no member for it - measured live: 24 of 98
 * pack records failed `packCandidate` on exactly `/scope must NOT have additional properties`, which is also
 * why no `ExperiencePackCandidateV1` artifact had ever been emitted.
 */
const ROUTE_LEARNING_SCOPE_KEYS = [
  "repoArchetype",
  "roleId",
  "taskTypeId",
  "language",
  "clientId",
  "toolClassIds",
  "modelFamily",
  "endpointId",
  "promptAdapterId",
] as const;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

/**
 * Run 107 P13: project a promoted pack onto the documented `ExperiencePackCandidateV1`.
 *
 * The projection is deliberate rather than additive: the contract is closed, so the builder keeps only the
 * members it documents and drops the runtime's own extras (`scope.taxonomyVersion`). The richer record stays
 * in the knowledge store's durable learning record; the artifact is the contract.
 */
export function buildExperiencePackCandidate(input: {
  readonly pack: Record<string, unknown>;
  readonly channel: string;
  readonly scopeId: string;
}) {
  const pack = input.pack;
  const rawScope = asRecord(pack.scope) ?? {};
  const scope: Record<string, unknown> = {};
  for (const key of ROUTE_LEARNING_SCOPE_KEYS) {
    if (rawScope[key] !== undefined && rawScope[key] !== null) scope[key] = rawScope[key];
  }
  // `$defs.scope` requires at least one member; a pack whose scope carried only runtime extras still names
  // the route package it was learned for.
  if (Object.keys(scope).length === 0) {
    const fallback = String(pack.endpointId ?? pack.routePackage ?? input.scopeId);
    scope.endpointId = fallback;
  }
  const status = String(pack.status ?? "validated");
  return {
    contract: "ExperiencePackCandidateV1",
    packId: String(pack.packId),
    version: Number.isInteger(pack.version) && Number(pack.version) > 0 ? Number(pack.version) : 1,
    scope,
    experienceIds: (Array.isArray(pack.experienceIds) ? pack.experienceIds : []).map(String),
    maxTokens:
      Number.isInteger(pack.maxTokens) && Number(pack.maxTokens) > 0 ? Number(pack.maxTokens) : 512,
    placement: pack.placement === "developer_extension" ? "developer_extension" : "context_block",
    priority: "advisory_only",
    status:
      status === "candidate" ||
      status === "shadow" ||
      status === "validated" ||
      status === "promoted" ||
      status === "rejected" ||
      status === "rolled_back"
        ? status
        : "validated",
    createdAt: String(pack.createdAt ?? new Date().toISOString()),
    ...contractEnvelope({ channel: input.channel, scopeId: input.scopeId }),
  };
}

/**
 * Run 107 P13: project the worker's validation receipt onto the documented
 * `RouteLearningValidationReceiptV1`, for the same reason as the pack above - measured live, 100 of 149
 * validation receipts failed on the additive `familyEvidence`, which the closed contract has no member for.
 * The family evidence stays in the durable learning record (the Learning UI reads it there); the artifact is
 * the contract.
 */
export function buildRouteLearningValidationReceipt(input: {
  readonly receipt: Record<string, unknown>;
  readonly channel: string;
  readonly scopeId: string;
}) {
  const receipt = input.receipt;
  const envelope = contractEnvelope({ channel: input.channel, scopeId: input.scopeId });
  return {
    contract: "RouteLearningValidationReceiptV1",
    receiptId: String(receipt.receiptId),
    candidateType:
      receipt.candidateType === "pack" || receipt.candidateType === "route_package"
        ? receipt.candidateType
        : "experience",
    candidateId: String(receipt.candidateId),
    baselineId: String(receipt.baselineId ?? input.scopeId),
    splitHash: String(receipt.splitHash ?? ""),
    caseManifestRef: String(receipt.caseManifestRef ?? ""),
    estimatorVersion: String(receipt.estimatorVersion ?? ""),
    bootstrapSeed: Number.isInteger(receipt.bootstrapSeed) ? Number(receipt.bootstrapSeed) : 0,
    qualityDelta: Number(receipt.qualityDelta ?? 0),
    confidenceLower: Number(receipt.confidenceLower ?? 0),
    confidenceUpper: Number(receipt.confidenceUpper ?? 0),
    holdoutSampleCount:
      Number.isInteger(receipt.holdoutSampleCount) && Number(receipt.holdoutSampleCount) > 0
        ? Number(receipt.holdoutSampleCount)
        : 1,
    guardrailsPassed: receipt.guardrailsPassed === true,
    decision:
      receipt.decision === "validate" || receipt.decision === "reject"
        ? receipt.decision
        : "insufficient_evidence",
    createdAt: String(receipt.createdAt ?? new Date().toISOString()),
    runtimeChannel:
      receipt.runtimeChannel === "production" || receipt.runtimeChannel === "development"
        ? receipt.runtimeChannel
        : envelope.runtimeChannel,
    scopeId:
      typeof receipt.scopeId === "string" && receipt.scopeId ? receipt.scopeId : input.scopeId,
    boundaryProtocolVersion:
      typeof receipt.boundaryProtocolVersion === "string" && receipt.boundaryProtocolVersion
        ? receipt.boundaryProtocolVersion
        : envelope.boundaryProtocolVersion,
  };
}

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

export function buildRoutingRolloutGroupLifecycle(input: RoutingRolloutGroupLifecycleInput) {
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

const boundedText = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const boundedNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

export interface RoutePackageAttributionDescriptor {
  readonly endpointId: string;
  readonly modelId: string;
  readonly modelRevision?: string | null;
  readonly samplingProfileId?: string | null;
  readonly promptAdapterId?: string | null;
  readonly toolPolicyId?: string | null;
  readonly experiencePackId?: string | null;
}

export type RoutePackageAttributionEmission =
  | { readonly emitted: true; readonly emission: TrackBContractEmission }
  | { readonly emitted: false; readonly reason: string };

/**
 * Run 100 addendum 15 item 6, second half: two live paths promote a pack - the shadow pipeline's learning
 * pass and the learner sweep in `cli.ts` - and measured on 2026-09-25 the sweep promoted a pack
 * (`pack-89a530d7...`, 05:23:58Z) while `contracts\` still held zero `RoutePackageAttributionV1`. Both
 * promoters go through this one emitter so the artifact's shape and its refusal vocabulary cannot drift
 * apart between them.
 *
 * Every member is durable evidence: the promoted pack as `packageId`, the arm's endpoint/model as its
 * identity, and the validation receipt's own baseline, case manifest reference, quality delta, confidence
 * lower bound and holdout sample count. A member that cannot be resolved refuses the artifact by name -
 * the caller logs that reason - because an attribution whose manifest ref or deltas are absent would claim
 * evidence nobody can check.
 */
export function emitRoutePackageAttributionForPromotion(input: {
  readonly stateRoot: string;
  readonly scopeId: string;
  readonly channel: string;
  readonly packId: string;
  readonly receipt: Readonly<Record<string, unknown>>;
  readonly descriptor: RoutePackageAttributionDescriptor | null;
  readonly scope: Record<string, unknown>;
  readonly nowMs?: number;
}): RoutePackageAttributionEmission {
  const endpointId = boundedText(input.descriptor?.endpointId);
  const modelId = boundedText(input.descriptor?.modelId);
  const baselinePackageId = boundedText(input.receipt.baselineId);
  const evidenceManifestRef = boundedText(input.receipt.caseManifestRef);
  const qualityDelta = boundedNumber(input.receipt.qualityDelta);
  const confidence = boundedNumber(input.receipt.confidenceLower);
  const sampleCount = boundedNumber(input.receipt.holdoutSampleCount);
  const refusal =
    !endpointId || !modelId
      ? "the caller did not resolve the promoted package's endpoint and model"
      : !evidenceManifestRef
        ? "the validation receipt carries no case manifest reference"
        : !baselinePackageId
          ? "the validation receipt carries no baseline package"
          : qualityDelta === null
            ? "the validation receipt carries no measured quality delta"
            : confidence === null
              ? "the validation receipt carries no confidence lower bound"
              : sampleCount === null
                ? "the validation receipt carries no holdout sample count"
                : null;
  if (
    refusal ||
    !endpointId ||
    !modelId ||
    !baselinePackageId ||
    !evidenceManifestRef ||
    qualityDelta === null ||
    confidence === null ||
    sampleCount === null
  ) {
    return { emitted: false, reason: refusal ?? "the attribution could not be completed" };
  }
  const promptAdapterId = boundedText(input.descriptor?.promptAdapterId);
  const toolPolicyId = boundedText(input.descriptor?.toolPolicyId);
  const experiencePackId = boundedText(input.descriptor?.experiencePackId);
  return {
    emitted: true,
    emission: emitTrackBContract({
      stateRoot: input.stateRoot,
      scopeId: input.scopeId,
      contract: buildRoutePackageAttribution({
        attributionId: `attribution:${input.packId}`,
        routePackage: {
          packageId: input.packId,
          endpointId,
          modelId,
          /**
           * The runtime's endpoints and catalog entries declare no model revision, so the honest value is the
           * one the closed contract's required member can carry: "unversioned" says the arm's identity is its
           * endpoint and model, not a model snapshot the runtime cannot attest. A caller that knows a revision
           * passes it through unchanged.
           */
          modelRevision: boundedText(input.descriptor?.modelRevision) ?? "unversioned",
          samplingProfileId: boundedText(input.descriptor?.samplingProfileId) ?? "unversioned",
          ...(promptAdapterId ? { promptAdapterId } : {}),
          ...(toolPolicyId ? { toolPolicyId } : {}),
          ...(experiencePackId ? { experiencePackId } : {}),
        },
        scope: input.scope,
        baselinePackageId,
        qualityDelta,
        /**
         * The receipt records a quality comparison only. Neither live promotion path measures a
         * per-comparison cost or latency delta, so both stay at the contract's zero rather than at a number
         * nobody measured.
         */
        costDelta: 0,
        latencyDelta: 0,
        sampleCount: Math.max(0, Math.trunc(sampleCount)),
        /**
         * The gate's own floor is `confidenceLower`, so that is the confidence the artifact reports: a reader
         * can reproduce the promotion decision from the artifact and the receipt.
         */
        confidence,
        evidenceManifestRef,
        channel: input.channel,
        scopeId: input.scopeId,
        createdAtMs: input.nowMs ?? Date.now(),
      }),
    }),
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

export function buildRoutePackageActivationReceipt(input: RoutePackageActivationReceiptInput) {
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
    ...(input.rolledBackAtMs === undefined ? {} : { rolledBackAt: iso(input.rolledBackAtMs) }),
    ...contractEnvelope(input),
  };
}
