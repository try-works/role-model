import { Buffer } from "node:buffer";

/** The only effort identity source of truth shared by activation and registry code. */
export interface EndpointInstanceIdentityInput {
  readonly providerAccountId: string;
  readonly region: string;
  readonly modelId: string;
  readonly reasoningEffort?: string | null;
}

export interface EndpointInstanceIdentity extends EndpointInstanceIdentityInput {
  readonly endpointId: string;
  readonly reasoningEffort: string | null;
}

/** Decode-only marker retained for pre-fix Run 91 records. */
const EFFORT_PREFIX = "~effort-v1~";
const MAX_REASONING_EFFORT_BYTES = 128;

function ensureNonEmpty(value: string, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function sanitizeSegment(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function toModelSegment(modelId: string): string {
  const lastSegment = modelId.includes("/") ? modelId.slice(modelId.lastIndexOf("/") + 1) : modelId;
  return sanitizeSegment(lastSegment);
}

/** Preserve the pre-Run-91 id exactly for the provider-default slot. */
export function createLegacyEndpointId(
  providerAccountId: string,
  region: string,
  modelId: string,
): string {
  ensureNonEmpty(providerAccountId, "providerAccountId");
  ensureNonEmpty(region, "region");
  ensureNonEmpty(modelId, "modelId");
  return `${providerAccountId}.${sanitizeSegment(region)}.${toModelSegment(modelId)}`;
}

export function normalizeReasoningEffort(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("reasoningEffort must be null or a non-empty string");
  }
  const normalized = value.normalize("NFC");
  if (normalized.length === 0) {
    throw new Error("reasoningEffort must be null or a non-empty string");
  }
  if (Buffer.byteLength(normalized, "utf8") > MAX_REASONING_EFFORT_BYTES) {
    throw new Error(`reasoningEffort must be at most ${MAX_REASONING_EFFORT_BYTES} UTF-8 bytes`);
  }
  if (/[\p{Cc}\p{Cf}]/u.test(normalized)) {
    throw new Error("reasoningEffort must not contain Unicode control or format characters");
  }
  return normalized;
}

export function createEndpointInstanceIdentity(
  input: EndpointInstanceIdentityInput,
): EndpointInstanceIdentity {
  const providerAccountId = ensureNonEmpty(input.providerAccountId, "providerAccountId");
  const region = ensureNonEmpty(input.region, "region");
  const modelId = ensureNonEmpty(input.modelId, "modelId");
  const reasoningEffort = normalizeReasoningEffort(input.reasoningEffort);
  const legacyBaseEndpointId = createLegacyEndpointId(providerAccountId, region, modelId);
  const endpointId =
    reasoningEffort === null
      ? legacyBaseEndpointId
      : `${legacyBaseEndpointId}-${encodeURIComponent(reasoningEffort)}`;
  return {
    endpointId,
    providerAccountId,
    region,
    modelId,
    reasoningEffort,
  };
}

/**
 * Reads the opaque suffix emitted by early Run 91 builds. New identities never
 * use this format, but persisted telemetry and graph records must remain
 * readable after an update.
 */
export function readLegacyEndpointReasoningEffort(endpointId: string): string | null {
  if (typeof endpointId !== "string") {
    return null;
  }
  const prefixIndex = endpointId.lastIndexOf(EFFORT_PREFIX);
  if (prefixIndex < 0) {
    return null;
  }
  const encoded = endpointId.slice(prefixIndex + EFFORT_PREFIX.length);
  if (!encoded || !/^[A-Za-z0-9_-]+$/u.test(encoded)) {
    return null;
  }
  try {
    const decoded = Buffer.from(encoded, "base64url").toString("utf8");
    const normalized = normalizeReasoningEffort(decoded);
    return normalized !== null && Buffer.from(normalized, "utf8").toString("base64url") === encoded
      ? normalized
      : null;
  } catch {
    return null;
  }
}

export { EFFORT_PREFIX, MAX_REASONING_EFFORT_BYTES };
