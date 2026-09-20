import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { expect, test } from "vitest";

import { resolveExtensionBusinessAnswer } from "../src/track-b-runtime.js";

/**
 * Run 98 addendum 56 §6.2 — the residual `trusted evaluation reference attestation schema is invalid` class.
 *
 * Addendum 51 removed the class from every capture it reproduced with (the transport envelope), but the live
 * ledger recorded three occurrences across four days, the last one after the v294 fix. The third answer shape is
 * the externalized one: the host stores a large business record in its durable output store and answers
 * `businessOutput.transferState === "externalized"` with a `durableLocator`. Unwrapping that yields the marker —
 * keys `transferState,resultHash,byteLength`, no `schemaVersion` — which is exactly what the refusal now names.
 */
const scopeId = "run98-a56-externalized";
const outputKey = "attestation:run98:a56";

const withStore = async (fn: (stateRoot: string) => void) => {
  const root = mkdtempSync(path.join(os.tmpdir(), "run98-a56-answer-"));
  try {
    await fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

const writeOutput = (stateRoot: string, payload: string, resultHash: string) => {
  const directory = path.join(
    stateRoot,
    scopeId,
    "track-b",
    "extensions",
    "workers",
    "evaluation-core",
  );
  mkdirSync(directory, { recursive: true });
  const database = new DatabaseSync(path.join(directory, "durable-output.sqlite"));
  try {
    database.exec(
      "CREATE TABLE IF NOT EXISTS durable_extension_outputs (output_key TEXT PRIMARY KEY, result_json TEXT, result_hash TEXT, byte_length INTEGER)",
    );
    database
      .prepare("INSERT OR REPLACE INTO durable_extension_outputs VALUES (?,?,?,?)")
      .run(outputKey, payload, resultHash, payload.length);
  } finally {
    database.close();
  }
};

const attestation = {
  schemaVersion: "role-model.evaluation-reference-attestation.v1",
  authority: "evaluation-reference-store",
  purpose: "evaluation",
};

test("an externalized answer is resolved from the durable output store", async () => {
  await withStore((stateRoot) => {
    const payload = JSON.stringify(attestation);
    const resultHash = `sha256:${createHash("sha256").update(payload).digest("hex")}`;
    writeOutput(stateRoot, payload, resultHash);

    const resolved = resolveExtensionBusinessAnswer({
      result: {
        businessOutput: { transferState: "externalized", resultHash, byteLength: payload.length },
        durableLocator: { outputKey, resultHash },
        workerPid: 4242,
      },
      extensionId: "evaluation-core",
      scopeId,
      stateRoot,
    });
    expect(resolved).toMatchObject({ schemaVersion: attestation.schemaVersion });
  });
});

test("a marker without a resolvable store surfaces the marker, which the refusal names", async () => {
  await withStore((stateRoot) => {
    const resolved = resolveExtensionBusinessAnswer({
      result: {
        businessOutput: { transferState: "externalized", resultHash: "sha256:missing" },
        durableLocator: { outputKey, resultHash: "sha256:missing" },
      },
      extensionId: "evaluation-core",
      scopeId,
      stateRoot,
    });
    // Unresolvable: the helper hands back the marker rather than a business record, which is why the schema check
    // refuses it — and why the error now names `transferState,resultHash` instead of saying nothing.
    expect(resolved).toMatchObject({ transferState: "externalized" });
    expect(resolved?.schemaVersion).toBeUndefined();
  });
});

test("a transport-enveloped answer still unwraps to its payload", async () => {
  const resolved = resolveExtensionBusinessAnswer({
    result: {
      transferState: "inline",
      resultHash: "sha256:inline",
      byteLength: 12,
      businessOutput: attestation,
      durableLocator: { kind: "inline" },
      evidenceRef: "evidence:run98:a56",
      readCapability: "evaluation:read-comparison-group",
      workerPid: 4242,
    },
    extensionId: "evaluation-core",
    scopeId,
  });
  expect(resolved).toMatchObject({ schemaVersion: attestation.schemaVersion });
});
