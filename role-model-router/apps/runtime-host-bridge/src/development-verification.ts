import { createHash, type KeyObject, verify } from "node:crypto";

export type DevelopmentVerificationAuthorization = Readonly<{
  schemaVersion: "role-model.development-verification-authorization.v1";
  contractVersion: 1;
  capability: "development_verification_upload";
  authorizationId: string;
  disclosureReceiptId: string;
  runtimeChannel: "development";
  sourceScopeId: string;
  destination: "development_verification";
  destinationDeploymentIds: readonly string[];
  allowedPayloadSchemaIds: readonly string[];
  allowedDataClasses: readonly ["aggregates_only"];
  maxRecords: number;
  maxBytes: number;
  issuedAt: number;
  expiresAt: number;
  revocationEpoch: number;
  signerKeyId: string;
  contractDigest: string;
  signature: string;
}>;

export type DevelopmentVerificationCapability =
  | Readonly<{ enabled: false; capability: null; reason: "authorization_absent" }>
  | Readonly<{
      enabled: true;
      capability: "development_verification_upload";
      authorizationId: string;
      sourceScopeId: string;
      destinationDeploymentIds: readonly string[];
      revocationEpoch: number;
    }>; 

export type DevelopmentVerificationTrustMaterial = Readonly<{
  keyId: string;
  publicKey: string;
}>;

const canonical = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
};

const digest = (value: unknown): string => createHash("sha256").update(canonical(value)).digest("hex");
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
const sameStringSet = (left: readonly string[], right: readonly string[]): boolean =>
  canonical([...new Set(left)].sort()) === canonical([...new Set(right)].sort());

/**
 * Parses the public, operator-supplied development verification trust anchor.
 * The key identity is deliberately separate from the signed lease: accepting a
 * key ID supplied only by the lease would turn the lease into its own trust root.
 */
export function parseDevelopmentVerificationTrustMaterial(
  raw: string,
): DevelopmentVerificationTrustMaterial {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("development verification trust material must be JSON");
  }
  assert(parsed && typeof parsed === "object" && !Array.isArray(parsed), "development verification trust material must be an object");
  const record = parsed as Record<string, unknown>;
  assert(
    record.schemaVersion === "role-model.development-verification-trust.v1",
    "development verification trust schema required",
  );
  const keyId = record.keyId;
  const publicKey = record.publicKey;
  assert(typeof keyId === "string" && keyId.trim().length > 0, "development verification trust key ID required");
  assert(typeof publicKey === "string" && publicKey.trim().length > 0, "development verification trust public key required");
  return Object.freeze({ keyId: keyId.trim(), publicKey: publicKey.trim() });
}

function unsignedLease(value: DevelopmentVerificationAuthorization): Record<string, unknown> {
  const { signature: _signature, contractDigest: _contractDigest, ...unsigned } = value;
  return unsigned;
}

function signaturePayload(value: DevelopmentVerificationAuthorization): Record<string, unknown> {
  const { signature: _signature, ...payload } = value;
  return payload;
}

/**
 * Negotiates the optional development upload capability at the public host boundary.
 * Its default is intentionally disabled; no fallback to a stage/production target exists.
 */
export function negotiateDevelopmentVerificationCapability(input: {
  runtimeChannel: "development" | "stage" | "production";
  sourceScopeId: string;
  authorization: DevelopmentVerificationAuthorization | null;
  trustedPublicKey?: KeyObject | string;
  expectedKeyId?: string;
  now?: number;
  destinationDeploymentIds?: readonly string[];
}): DevelopmentVerificationCapability {
  if (input.authorization === null) {
    return Object.freeze({ enabled: false, capability: null, reason: "authorization_absent" });
  }
  const lease = input.authorization;
  assert(input.runtimeChannel === "development" && lease.runtimeChannel === "development", "development channel required");
  assert(lease.schemaVersion === "role-model.development-verification-authorization.v1", "development verification schema required");
  assert(lease.contractVersion === 1, "unsupported development verification contract version");
  assert(lease.capability === "development_verification_upload", "development verification capability required");
  assert(lease.destination === "development_verification", "development verification destination required");
  assert(lease.sourceScopeId === input.sourceScopeId, "development verification scope mismatch");
  assert(lease.allowedDataClasses.length === 1 && lease.allowedDataClasses[0] === "aggregates_only", "aggregate-only authorization required");
  assert(lease.destinationDeploymentIds.length > 0 && lease.destinationDeploymentIds.every((id) => id.length > 0), "development deployment ids required");
  assert(
    input.destinationDeploymentIds && sameStringSet(lease.destinationDeploymentIds, input.destinationDeploymentIds),
    "development verification deployment binding mismatch",
  );
  assert(typeof input.expectedKeyId === "string" && lease.signerKeyId === input.expectedKeyId, "development verification signer key mismatch");
  const trustedPublicKey = input.trustedPublicKey;
  assert(trustedPublicKey, "development verification trusted public key required");
  const now = input.now ?? Date.now();
  assert(Number.isSafeInteger(now) && now >= lease.issuedAt && now <= lease.expiresAt, "development verification authorization expired or not yet active");
  assert(Number.isSafeInteger(lease.maxRecords) && lease.maxRecords > 0, "development verification max record limit invalid");
  assert(Number.isSafeInteger(lease.maxBytes) && lease.maxBytes >= 10 * 1024 * 1024, "development verification max byte limit invalid");
  assert(digest(unsignedLease(lease)) === lease.contractDigest, "development verification contract digest mismatch");
  assert(
    verify(null, Buffer.from(canonical(signaturePayload(lease))), trustedPublicKey, Buffer.from(lease.signature, "base64url")),
    "development verification authorization signature invalid",
  );
  return Object.freeze({
    enabled: true,
    capability: "development_verification_upload",
    authorizationId: lease.authorizationId,
    sourceScopeId: lease.sourceScopeId,
    destinationDeploymentIds: [...lease.destinationDeploymentIds],
    revocationEpoch: lease.revocationEpoch,
  });
}
