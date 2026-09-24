import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, test } from "vitest";

import { createCaptureScopeReferenceResolver } from "../src/track-b-reference-resolver.js";

/**
 * Run 100 addendum 11. Measured live on `run131-852786ef`: every derivation that reached the knowledge worker was
 * refused with `authoritative trusted resolver-backed reference proof is required`, because the packaged worker's
 * artifact-store resolver is bound to the operator scope while all group evidence lives in the capture scope
 * (`runtime:714f4a87...`; 38/38 pipeline-processed and 82/82 gap groups, 0 in the operator store). The worker keeps
 * its own freshness and authority rules, so this resolver has to confirm the reference exists in a durable store and
 * mint an attestation that satisfies them - never re-issue whatever it was handed.
 */

const tempDirs: string[] = [];

function artifactStoreWith(artifactIds: readonly string[]): string {
  const dir = mkdtempSync(path.join(tmpdir(), "run132-artifact-store-"));
  tempDirs.push(dir);
  const file = path.join(dir, "metadata.sqlite");
  const db = new DatabaseSync(file);
  db.exec(
    "CREATE TABLE artifacts (scope_id TEXT, artifact_id TEXT, portable_digest TEXT, object_key TEXT, byte_length INTEGER, media_type TEXT, schema_id TEXT, generation INTEGER, created_at TEXT)",
  );
  const insert = db.prepare("INSERT INTO artifacts VALUES (?,?,?,?,?,?,?,?,?)");
  for (const artifactId of artifactIds) {
    insert.run("runtime:capture", artifactId, "digest", "key", 1, "application/json", "schema", 1, "now");
  }
  db.close();
  return file;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (!dir) continue;
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // Windows keeps a handle on a sqlite file while the resolver's cached connection is open; the directory lives
      // under the OS temp root and is released when the worker exits.
    }
  }
});

describe("run132 addendum 11: the cross-scope reference resolver", () => {
  test("attests a reference that exists in the capture-scope store", () => {
    const artifactId = "a".repeat(64);
    const reference = `artifact:${artifactId}`;
    const resolver = createCaptureScopeReferenceResolver({
      channel: "stage",
      scope: "standalone-runtime-stage",
      authorizationEpoch: 1,
      databasePaths: [artifactStoreWith([artifactId])],
      now: () => 1_000_000,
    });

    const attestation = resolver(
      "standalone-runtime-stage",
      reference,
      "evaluation",
      { row: {}, field: "evaluation" },
    ) as Record<string, unknown>;

    expect(attestation).toMatchObject({
      schemaVersion: "role-model.evaluation-reference-attestation.v1",
      reference,
      resolved: true,
      purpose: "evaluation",
      authority: "evaluation-reference-store",
      channel: "stage",
      scope: "standalone-runtime-stage",
      authorizationEpoch: 1,
      issuedAtMs: 1_000_000,
    });
    expect(typeof attestation.referenceDigest).toBe("string");
    expect(String(attestation.referenceDigest).startsWith("sha256:")).toBe(true);
    expect(Number(attestation.expiresAtMs)).toBeGreaterThan(1_000_000);
    // The worker refuses a stale attestation: TTL must stay inside its own 60 s bound.
    expect(Number(attestation.expiresAtMs) - 1_000_000).toBeLessThanOrEqual(60_000);
  });

  test("refuses a reference that no durable store holds", () => {
    const resolver = createCaptureScopeReferenceResolver({
      channel: "stage",
      scope: "standalone-runtime-stage",
      authorizationEpoch: 1,
      databasePaths: [artifactStoreWith(["b".repeat(64)])],
      now: () => 1_000_000,
    });

    expect(resolver("standalone-runtime-stage", `artifact:${"c".repeat(64)}`, "evaluation", {})).toBeUndefined();
  });

  test("refuses to attest under a scope it was not configured for", () => {
    const artifactId = "d".repeat(64);
    const resolver = createCaptureScopeReferenceResolver({
      channel: "stage",
      scope: "standalone-runtime-stage",
      authorizationEpoch: 1,
      databasePaths: [artifactStoreWith([artifactId])],
      now: () => 1_000_000,
    });

    expect(
      resolver(`runtime:${"e".repeat(32)}`, `artifact:${artifactId}`, "evaluation", {}),
    ).toBeUndefined();
  });

  test("refuses a reference shape it cannot verify", () => {
    const resolver = createCaptureScopeReferenceResolver({
      channel: "stage",
      scope: "standalone-runtime-stage",
      authorizationEpoch: 1,
      databasePaths: [artifactStoreWith(["f".repeat(64)])],
      now: () => 1_000_000,
    });

    expect(resolver("standalone-runtime-stage", "not-an-artifact-reference", "evaluation", {})).toBeUndefined();
  });
});
