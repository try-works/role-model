import { createHash } from "node:crypto";

export type ProjectionEvidence = {
  sourceRef: string;
  sourceHash: string;
  sourceAvailable: boolean;
  renderer?: { id: string; version: string; hash: string };
  tokenizer?: { id: string; revision: string; hash: string };
  tokenIds?: readonly number[];
  sampledMask?: readonly boolean[];
  contentMask?: readonly boolean[];
  logprobs?: readonly (number | null)[];
};

export type ProjectionReadiness = "semantic_only" | "token_exact" | "unavailable";

export function deriveProjectionReadiness(evidence: ProjectionEvidence): ProjectionReadiness {
  if (!evidence.sourceAvailable || !/^sha256:[a-f0-9]{64}$/u.test(evidence.sourceHash))
    return "unavailable";
  const length = evidence.tokenIds?.length ?? 0;
  const exact =
    evidence.renderer &&
    evidence.tokenizer &&
    length > 0 &&
    evidence.sampledMask?.length === length &&
    evidence.contentMask?.length === length &&
    evidence.logprobs?.length === length;
  return exact ? "token_exact" : "semantic_only";
}

export function projectionIdentity(evidence: ProjectionEvidence): string {
  return `sha256:${createHash("sha256").update(JSON.stringify(evidence)).digest("hex")}`;
}

export type ProjectionV2Evidence = {
  readonly artifactRef: string;
  readonly sourceHash: string;
  readonly scope: string;
  readonly verified: boolean;
  readonly capabilities: readonly string[];
  readonly invalidation?: "pruned" | "revoked";
};

export type ProjectionV2 = {
  readonly schemaVersion: "role-model.projection.v2";
  readonly id: string;
  readonly scope: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly evidence: readonly ProjectionV2Evidence[];
  readonly policy: {
    readonly permittedUse: boolean;
    readonly purpose: string;
    readonly authorizationState: "authorized" | "revoked" | "unknown";
    readonly validUntilMs: number | null;
    readonly trainingAllowed: boolean;
    readonly evaluatedAtMs: number;
  };
  readonly readiness: {
    readonly completeness: "complete" | "partial" | "unavailable";
    readonly evidenceCapability: "token_exact" | "full_replay" | "routing_history" | "unavailable";
    readonly tokenFidelity: "exact" | "semantic" | "unknown";
    readonly permittedUse: boolean;
    readonly rolloutPurpose: string;
    readonly authorizationState: "authorized" | "revoked" | "unknown";
    readonly lifecycleReadiness: "ready" | "expired" | "unavailable";
    readonly routingTrainingSuitability: "eligible" | "ineligible" | "unknown";
  };
};

function canonical(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    if (value.some((item) => item === undefined))
      throw new Error("projection content must be JSON-safe");
    return `[${value.map(canonical).join(",")}]`;
  }
  if (value && typeof value === "object") {
    if (
      Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null
    ) {
      throw new Error("projection content must use plain JSON objects");
    }
    const record = value as Record<string, unknown>;
    if (Reflect.ownKeys(record).some((key) => typeof key !== "string")) {
      throw new Error("projection content must not contain symbol keys");
    }
    return `{${Object.keys(record)
      .sort()
      .map((key) => {
        if (record[key] === undefined) throw new Error("projection content must be JSON-safe");
        return `${JSON.stringify(key)}:${canonical(record[key])}`;
      })
      .join(",")}}`;
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new Error("projection content must contain finite JSON numbers");
  }
  if (["string", "number", "boolean"].includes(typeof value)) return JSON.stringify(value);
  throw new Error("projection content must be JSON-safe");
}

function projectionV2Readiness(input: {
  readonly evidence: readonly ProjectionV2Evidence[];
  readonly permittedUse: boolean;
  readonly purpose: string;
  readonly authorizationState: "authorized" | "revoked" | "unknown";
  readonly validUntilMs: number | null;
  readonly trainingAllowed: boolean;
  readonly evaluatedAtMs: number;
}) {
  const usable = input.evidence.filter((row) => row.verified && !row.invalidation);
  const capabilities = new Set(usable.flatMap((row) => row.capabilities));
  const evidenceCapability = capabilities.has("token_exact")
    ? ("token_exact" as const)
    : capabilities.has("full_replay")
      ? ("full_replay" as const)
      : capabilities.has("routing_history")
        ? ("routing_history" as const)
        : ("unavailable" as const);
  const lifecycleReadiness =
    input.validUntilMs === null
      ? ("ready" as const)
      : input.validUntilMs >= input.evaluatedAtMs
        ? ("ready" as const)
        : ("expired" as const);
  const permittedUse =
    input.permittedUse &&
    input.authorizationState === "authorized" &&
    lifecycleReadiness === "ready" &&
    usable.length > 0 &&
    !input.evidence.some((row) => row.invalidation === "revoked");
  const routingTrainingSuitability =
    input.authorizationState === "unknown"
      ? ("unknown" as const)
      : permittedUse && input.trainingAllowed
        ? ("eligible" as const)
        : ("ineligible" as const);
  return {
    completeness:
      usable.length === input.evidence.length
        ? ("complete" as const)
        : usable.length
          ? ("partial" as const)
          : ("unavailable" as const),
    evidenceCapability,
    tokenFidelity: capabilities.has("token_exact")
      ? ("exact" as const)
      : usable.length
        ? ("semantic" as const)
        : ("unknown" as const),
    permittedUse,
    rolloutPurpose: input.purpose,
    authorizationState: input.authorizationState,
    lifecycleReadiness,
    routingTrainingSuitability,
  };
}

function projectionV2Id(body: Omit<ProjectionV2, "id">): string {
  return `sha256:${createHash("sha256").update(canonical(body)).digest("hex")}`;
}

export function createProjectionV2(input: {
  readonly scope: string;
  readonly purpose: string;
  readonly permittedUse: boolean;
  readonly authorizationState: "authorized" | "revoked" | "unknown";
  readonly validUntilMs: number | null;
  readonly trainingAllowed: boolean;
  readonly evaluatedAtMs: number;
  readonly evidence: readonly ProjectionV2Evidence[];
  readonly payload: Readonly<Record<string, unknown>>;
}): ProjectionV2 {
  if (!input.scope || !input.purpose || !input.evidence.length) {
    throw new Error("complete projection scope, purpose, and evidence are required");
  }
  const evidence = input.evidence
    .map((row) => ({ ...row, capabilities: [...new Set(row.capabilities)].sort() }))
    .sort((left, right) => left.artifactRef.localeCompare(right.artifactRef));
  for (const row of evidence) {
    if (row.scope !== input.scope) throw new Error("projection evidence scope mismatch");
    if (!row.artifactRef || !/^sha256:[a-f0-9]{64}$/u.test(row.sourceHash)) {
      throw new Error("projection evidence reference and source hash are required");
    }
  }
  if (
    !Number.isFinite(input.evaluatedAtMs) ||
    (input.validUntilMs !== null && !Number.isFinite(input.validUntilMs))
  ) {
    throw new Error("projection lifecycle timestamps must be finite");
  }
  const policy = {
    permittedUse: input.permittedUse,
    purpose: input.purpose,
    authorizationState: input.authorizationState,
    validUntilMs: input.validUntilMs,
    trainingAllowed: input.trainingAllowed,
    evaluatedAtMs: input.evaluatedAtMs,
  } as const;
  const body = {
    schemaVersion: "role-model.projection.v2" as const,
    scope: input.scope,
    payload: structuredClone(input.payload),
    evidence,
    policy,
    readiness: projectionV2Readiness({
      evidence,
      permittedUse: input.permittedUse,
      purpose: input.purpose,
      authorizationState: input.authorizationState,
      validUntilMs: input.validUntilMs,
      trainingAllowed: input.trainingAllowed,
      evaluatedAtMs: input.evaluatedAtMs,
    }),
  };
  return {
    ...body,
    id: projectionV2Id(body),
  };
}

export function validateProjectionV2(
  value: unknown,
  options: { readonly nowMs?: number } = {},
): ProjectionV2 {
  if (!value || typeof value !== "object") throw new Error("projection v2 is required");
  const projection = value as ProjectionV2;
  if (projection.schemaVersion !== "role-model.projection.v2") {
    throw new Error("unsupported projection schema version");
  }
  if (
    !projection.id ||
    !projection.scope ||
    !projection.readiness ||
    !projection.policy ||
    !Array.isArray(projection.evidence)
  ) {
    throw new Error("projection v2 is incomplete");
  }
  if (projection.evidence.some((row) => row.scope !== projection.scope)) {
    throw new Error("projection evidence scope mismatch");
  }
  if (
    projection.evidence.some(
      (row) =>
        !row.artifactRef ||
        !/^sha256:[a-f0-9]{64}$/u.test(row.sourceHash) ||
        typeof row.verified !== "boolean" ||
        !Array.isArray(row.capabilities) ||
        row.capabilities.some(
          (capability: string) =>
            !["routing_history", "full_replay", "token_exact"].includes(capability),
        ) ||
        (row.invalidation !== undefined && !["pruned", "revoked"].includes(row.invalidation)),
    )
  ) {
    throw new Error("projection evidence is malformed");
  }
  if (
    !projection.evidence.length ||
    new Set(projection.evidence.map((row) => row.artifactRef)).size !==
      projection.evidence.length ||
    typeof projection.policy.permittedUse !== "boolean" ||
    typeof projection.policy.purpose !== "string" ||
    !projection.policy.purpose ||
    !["authorized", "revoked", "unknown"].includes(projection.policy.authorizationState) ||
    typeof projection.policy.trainingAllowed !== "boolean" ||
    !Number.isFinite(projection.policy.evaluatedAtMs) ||
    (projection.policy.validUntilMs !== null && !Number.isFinite(projection.policy.validUntilMs))
  ) {
    throw new Error("projection policy and unique evidence are required");
  }
  canonical(projection.payload);
  const expectedReadiness = projectionV2Readiness({
    evidence: projection.evidence,
    permittedUse: projection.policy.permittedUse,
    purpose: projection.policy.purpose,
    authorizationState: projection.policy.authorizationState,
    validUntilMs: projection.policy.validUntilMs,
    trainingAllowed: projection.policy.trainingAllowed,
    evaluatedAtMs: projection.policy.evaluatedAtMs,
  });
  if (canonical(projection.readiness) !== canonical(expectedReadiness)) {
    throw new Error("projection readiness does not match authoritative evidence and policy");
  }
  const { id, ...body } = projection;
  if (projectionV2Id(body) !== id)
    throw new Error("projection identity does not match its content");
  const nowMs = options.nowMs ?? Date.now();
  if (!Number.isFinite(nowMs)) throw new Error("projection validation time must be finite");
  if (projection.policy.validUntilMs !== null && nowMs > projection.policy.validUntilMs) {
    throw new Error("projection lifecycle expired before consumption");
  }
  return structuredClone(projection);
}

export function downgradeProjectionV2(
  value: ProjectionV2,
  input: { readonly artifactRef: string; readonly reason: "pruned" | "revoked" },
): ProjectionV2 {
  const projection = validateProjectionV2(value, { nowMs: value.policy.evaluatedAtMs });
  if (!projection.evidence.some((row) => row.artifactRef === input.artifactRef)) {
    throw new Error("projection invalidation evidence reference is missing");
  }
  const evidence = projection.evidence.map((row) =>
    row.artifactRef === input.artifactRef ? { ...row, invalidation: input.reason } : row,
  );
  const { id: _priorId, ...priorBody } = projection;
  const body = {
    ...priorBody,
    evidence,
    readiness: projectionV2Readiness({
      evidence,
      permittedUse: projection.policy.permittedUse,
      purpose: projection.policy.purpose,
      authorizationState: projection.policy.authorizationState,
      validUntilMs: projection.policy.validUntilMs,
      trainingAllowed: projection.policy.trainingAllowed,
      evaluatedAtMs: projection.policy.evaluatedAtMs,
    }),
  };
  return {
    ...body,
    id: projectionV2Id(body),
  };
}
