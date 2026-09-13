/**
 * v1.1 Direct Track B machine contracts.
 *
 * The proposal corpus owns these contracts as JSON Schema; this module carries the
 * vendored schemas (see `scripts/embed-schemas.mjs`) and validates emitted artifacts
 * against them, so the runtime, extensions, and tests speak the documented contract
 * vocabulary instead of a parallel one.
 */
import type { ErrorObject, ValidateFunction } from "ajv";
import * as ajvNamespace from "ajv/dist/2020.js";
import * as ajvFormatsNamespace from "ajv-formats";

import {
  routeLearningSchema,
  trackBProjectionSchema,
  trackBStorageSchema,
} from "./v1.1-schemas.generated.js";

export const V11_CONTRACT_SCHEMAS = Object.freeze({
  routeLearning: routeLearningSchema,
  trackBStorage: trackBStorageSchema,
  trackBProjection: trackBProjectionSchema,
});

export type V11ContractFamily = keyof typeof V11_CONTRACT_SCHEMAS;

interface AjvLike {
  compile(schema: unknown): ValidateFunction;
  addSchema(schema: unknown, key: string): unknown;
  getSchema(reference: string): ValidateFunction | undefined;
}

// ajv and ajv-formats ship CommonJS; the namespace imports keep ESM and CJS builds
// working without depending on the compiler's default-interop mode.
const Ajv2020 = ((ajvNamespace as unknown as { default?: unknown }).default ??
  ajvNamespace) as new (options?: Record<string, unknown>) => AjvLike;

const ajv = new Ajv2020({ allErrors: true, strict: false, allowUnionTypes: true });
// ajv-formats ships CommonJS; the namespace import keeps ESM and CJS builds working.
const addFormats = ((ajvFormatsNamespace as unknown as { default?: (instance: unknown) => void })
  .default ??
  (ajvFormatsNamespace as unknown as (instance: unknown) => void)) as (
  instance: unknown,
) => void;
addFormats(ajv);

for (const [family, schema] of Object.entries(V11_CONTRACT_SCHEMAS)) {
  ajv.addSchema(schema, family);
}

const validators: Readonly<Record<V11ContractFamily, ValidateFunction>> = Object.freeze({
  routeLearning: ajv.compile(routeLearningSchema),
  trackBStorage: ajv.compile(trackBStorageSchema),
  trackBProjection: ajv.compile(trackBProjectionSchema),
});

const definitionValidators = new Map<string, ValidateFunction>();

const definitionValidator = (family: V11ContractFamily, definition: string): ValidateFunction => {
  const key = `${family}:${definition}`;
  const existing = definitionValidators.get(key);
  if (existing) return existing;
  const compiled = ajv.compile({ $ref: `${family}#/$defs/${definition}` });
  definitionValidators.set(key, compiled);
  return compiled;
};

export interface V11ContractValidation {
  readonly valid: boolean;
  readonly family: V11ContractFamily | null;
  readonly contract: string | null;
  readonly errors: readonly string[];
}

const formatError = (error: ErrorObject): string =>
  `${error.instancePath || "/"} ${error.message ?? "invalid"}`.slice(0, 240);

/**
 * Validate one value against every v1.1 contract family. A value is valid when the
 * route-learning, storage, or projection schema accepts it; the first accepting family
 * is reported so callers can route the artifact without re-deriving its kind.
 */
export function validateV11Contract(value: unknown): V11ContractValidation {
  const attempts: string[] = [];
  for (const family of ["routeLearning", "trackBStorage", "trackBProjection"] as const) {
    const validator = validators[family];
    if (validator(value)) {
      const contract =
        value && typeof value === "object" && !Array.isArray(value)
          ? String((value as Record<string, unknown>).contract ?? "") || null
          : null;
      return { valid: true, family, contract, errors: [] };
    }
    attempts.push(
      `${family}: ${(validator.errors ?? []).slice(0, 12).map(formatError).join("; ")}`,
    );
  }
  return { valid: false, family: null, contract: null, errors: attempts };
}

export function assertV11Contract(value: unknown): asserts value is Record<string, unknown> {
  const result = validateV11Contract(value);
  if (!result.valid) {
    throw new Error(`v1.1 contract validation failed: ${result.errors.join(" | ")}`);
  }
}

/**
 * Validate one value against a named contract definition (for example
 * `trackBStorage` / `graphNode`). Callers that already know the artifact kind get
 * precise diagnostics instead of the union of every branch.
 */
export function validateV11ContractDefinition(
  family: V11ContractFamily,
  definition: string,
  value: unknown,
): V11ContractValidation {
  const validator = definitionValidator(family, definition);
  if (validator(value)) {
    const contract =
      value && typeof value === "object" && !Array.isArray(value)
        ? String((value as Record<string, unknown>).contract ?? "") || null
        : null;
    return { valid: true, family, contract, errors: [] };
  }
  return {
    valid: false,
    family: null,
    contract: null,
    errors: (validator.errors ?? []).slice(0, 12).map(formatError),
  };
}

export interface V11RouteLearningScope {
  readonly repoArchetype?: string;
  readonly roleId?: string;
  readonly taskTypeId?: string;
  readonly language?: string;
  readonly clientId?: string;
  readonly toolClassIds?: readonly string[];
  readonly modelFamily?: string;
  readonly endpointId?: string;
  readonly promptAdapterId?: string;
}

export interface V11RoutePackage {
  readonly packageId: string;
  readonly endpointId: string;
  readonly modelId: string;
  readonly modelRevision: string;
  readonly samplingProfileId: string;
  readonly promptAdapterId?: string;
  readonly toolPolicyId?: string;
  readonly experiencePackId?: string;
}

interface V11ContractEnvelope {
  readonly runtimeChannel: "production" | "stage" | "development";
  readonly scopeId: string;
  readonly boundaryProtocolVersion: string;
}

export interface RoutingEvaluationExecutionContextV1 extends V11ContractEnvelope {
  readonly contract: "RoutingEvaluationExecutionContextV1";
  readonly executionId: string;
  readonly purpose: "routing_evaluation" | "routing_replay" | "route_package_attribution";
  readonly tasksetRef: string;
  readonly harnessRef: string;
  readonly runtimeRef: string;
  readonly routerPolicyVersion: string;
  readonly contractVersion: "1.1.0";
  readonly splitAlgorithm: "hash_partition_v1" | "stratified_hash_partition_v1";
  readonly splitSeed: number;
  readonly adapterDependency: "none";
  readonly sourceProjectionIds?: readonly string[];
  readonly createdAt: string;
}

export interface RoutingRolloutGroupLifecycleV1 extends V11ContractEnvelope {
  readonly contract: "RoutingRolloutGroupLifecycleV1";
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
  readonly failureManifestRef?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface LearnedExperienceCandidateV1 extends V11ContractEnvelope {
  readonly contract: "LearnedExperienceCandidateV1";
  readonly experienceId: string;
  readonly version: number;
  readonly scope: V11RouteLearningScope;
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
  readonly createdAt: string;
}

export interface ExperiencePackCandidateV1 extends V11ContractEnvelope {
  readonly contract: "ExperiencePackCandidateV1";
  readonly packId: string;
  readonly version: number;
  readonly scope: V11RouteLearningScope;
  readonly experienceIds: readonly string[];
  readonly maxTokens: number;
  readonly placement: "context_block" | "developer_extension";
  readonly priority: "advisory_only";
  readonly status: "candidate" | "shadow" | "validated" | "promoted" | "rejected" | "rolled_back";
  readonly validationReceiptId?: string;
  readonly rollbackTargetPackId?: string;
  readonly createdAt: string;
}

export interface RouteLearningValidationReceiptV1 extends V11ContractEnvelope {
  readonly contract: "RouteLearningValidationReceiptV1";
  readonly receiptId: string;
  readonly candidateType: "experience" | "pack" | "route_package";
  readonly candidateId: string;
  readonly baselineId: string;
  readonly splitHash: string;
  readonly caseManifestRef: string;
  readonly estimatorVersion: string;
  readonly bootstrapSeed: number;
  readonly qualityDelta: number;
  readonly confidenceLower: number;
  readonly confidenceUpper: number;
  readonly holdoutSampleCount: number;
  readonly guardrailsPassed: boolean;
  readonly decision: "validate" | "reject" | "insufficient_evidence";
  readonly createdAt: string;
}

export interface RoutePackageAttributionV1 extends V11ContractEnvelope {
  readonly contract: "RoutePackageAttributionV1";
  readonly attributionId: string;
  readonly routePackage: V11RoutePackage;
  readonly scope: V11RouteLearningScope;
  readonly baselinePackageId: string;
  readonly qualityDelta: number;
  readonly costDelta: number;
  readonly latencyDelta: number;
  readonly sampleCount: number;
  readonly confidence: number;
  readonly evidenceManifestRef: string;
  readonly createdAt: string;
}

export interface RoutePackageActivationReceiptV1 extends V11ContractEnvelope {
  readonly contract: "RoutePackageActivationReceiptV1";
  readonly receiptId: string;
  readonly packageId: string;
  readonly scope: V11RouteLearningScope;
  readonly policyGateId: string;
  readonly priorPackageId: string;
  readonly validationReceiptId?: string;
  readonly state: "active" | "rolled_back" | "disabled";
  readonly activatedAt: string;
  readonly rolledBackAt?: string;
}

export type V11RouteLearningContract =
  | RoutingEvaluationExecutionContextV1
  | RoutingRolloutGroupLifecycleV1
  | LearnedExperienceCandidateV1
  | ExperiencePackCandidateV1
  | RouteLearningValidationReceiptV1
  | RoutePackageAttributionV1
  | RoutePackageActivationReceiptV1;
