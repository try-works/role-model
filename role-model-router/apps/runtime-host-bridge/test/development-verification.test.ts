import { createHash, generateKeyPairSync, sign } from "node:crypto";

import { describe, expect, test } from "vitest";

import {
  negotiateDevelopmentVerificationCapability,
  parseDevelopmentVerificationTrustMaterial,
} from "../src/development-verification.js";

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

function signedLease() {
  const keys = generateKeyPairSync("ed25519");
  const unsigned = {
    schemaVersion: "role-model.development-verification-authorization.v1",
    contractVersion: 1,
    capability: "development_verification_upload",
    authorizationId: "auth-run96-public",
    disclosureReceiptId: "disclosure-run96-public",
    runtimeChannel: "development",
    sourceScopeId: "standalone-runtime-dev",
    destination: "development_verification",
    destinationDeploymentIds: ["run96-dev-ingest"],
    allowedPayloadSchemaIds: ["role-model.route-occurrence-aggregate.v1"],
    allowedDataClasses: ["aggregates_only"],
    maxRecords: 100,
    maxBytes: 10 * 1024 * 1024,
    issuedAt: 1_780_000_000_000,
    expiresAt: 1_780_000_060_000,
    revocationEpoch: 3,
    signerKeyId: "run96-public-key",
  };
  const contractDigest = createHash("sha256").update(canonical(unsigned)).digest("hex");
  const payload = { ...unsigned, contractDigest };
  return {
    lease: {
      ...payload,
      signature: sign(null, Buffer.from(canonical(payload)), keys.privateKey).toString("base64url"),
    },
    publicKey: keys.publicKey,
  };
}

describe("development verification capability", () => {
  test("requires an independently identified trust key rather than trusting the lease signer", () => {
    expect(
      parseDevelopmentVerificationTrustMaterial(
        JSON.stringify({
          schemaVersion: "role-model.development-verification-trust.v1",
          keyId: "run96-public-key",
          publicKey: "-----BEGIN PUBLIC KEY-----\nMIIB...\n-----END PUBLIC KEY-----",
        }),
      ),
    ).toEqual({
      keyId: "run96-public-key",
      publicKey: "-----BEGIN PUBLIC KEY-----\nMIIB...\n-----END PUBLIC KEY-----",
    });

    expect(() =>
      parseDevelopmentVerificationTrustMaterial(JSON.stringify({ publicKey: "unidentified" })),
    ).toThrow(/schema|key/i);
  });

  test("keeps development uploads disabled when no explicit authorization is supplied", () => {
    expect(
      negotiateDevelopmentVerificationCapability({
        runtimeChannel: "development",
        sourceScopeId: "standalone-runtime-dev",
        authorization: null,
      }),
    ).toEqual({ enabled: false, capability: null, reason: "authorization_absent" });
  });

  test("negotiates only a valid signed development-only aggregate lease", () => {
    const { lease, publicKey } = signedLease();
    expect(
      negotiateDevelopmentVerificationCapability({
        runtimeChannel: "development",
        sourceScopeId: "standalone-runtime-dev",
        authorization: lease,
        trustedPublicKey: publicKey,
        expectedKeyId: "run96-public-key",
        requiredRevocationEpoch: 3,
        now: 1_780_000_000_001,
        destinationDeploymentIds: ["run96-dev-ingest"],
      }),
    ).toMatchObject({
      enabled: true,
      capability: "development_verification_upload",
      authorizationId: "auth-run96-public",
    });
  });

  test("rejects a signed lease after the independently supplied revocation epoch advances", () => {
    const { lease, publicKey } = signedLease();
    expect(() =>
      negotiateDevelopmentVerificationCapability({
        runtimeChannel: "development",
        sourceScopeId: "standalone-runtime-dev",
        authorization: lease,
        trustedPublicKey: publicKey,
        expectedKeyId: "run96-public-key",
        requiredRevocationEpoch: 4,
        now: 1_780_000_000_001,
        destinationDeploymentIds: ["run96-dev-ingest"],
      }),
    ).toThrow(/revoked|epoch/i);
  });

  test("fails closed rather than enabling a stage runtime from a development lease", () => {
    const { lease, publicKey } = signedLease();
    expect(() =>
      negotiateDevelopmentVerificationCapability({
        runtimeChannel: "stage",
        sourceScopeId: "standalone-runtime-dev",
        authorization: lease,
        trustedPublicKey: publicKey,
        expectedKeyId: "run96-public-key",
        requiredRevocationEpoch: 3,
        now: 1_780_000_000_001,
        destinationDeploymentIds: ["run96-dev-ingest"],
      }),
    ).toThrow(/development|channel/i);
  });
});
