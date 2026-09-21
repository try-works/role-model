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

/**
 * Run 98 addendum 58 §20.1 (live v312): the packaged host also answers with the transfer marker at the
 * record's **top level** — `{transferState, resultHash, byteLength}` with no `businessOutput` wrapper — and
 * that shape decoded to the marker itself, which the pipeline then validated as the comparison group
 * (`durable routing-shadow comparison finalization failed readback=transferState,resultHash,byteLength`).
 * The unwrapped marker must resolve exactly like the wrapped one.
 */
test("an unwrapped top-level transfer marker is resolved too", async () => {
  await withStore((stateRoot) => {
    const payload = JSON.stringify(attestation);
    const resultHash = `sha256:${createHash("sha256").update(payload).digest("hex")}`;
    writeOutput(stateRoot, payload, resultHash);

    const resolved = resolveExtensionBusinessAnswer({
      result: {
        transferState: "externalized",
        resultHash,
        byteLength: payload.length,
        durableLocator: { outputKey, resultHash },
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

/**
 * Run 98 addendum 58 §23 (live v317, 09:00Z): the pipeline's own readback of a finalized comparison group
 * answered the bare marker `{transferState, resultHash, byteLength}` — **no `durableLocator`** — and
 * `decodeExtensionBusinessResult` required a locator, so the payload that sits in the worker's durable output
 * store was never read and the group was refused:
 *
 *   `durable routing-shadow comparison finalization failed: readback=transferState,resultHash,byteLength`
 *
 * The operator readback decoder already resolves a locator-less marker from the same store by hash; the
 * pipeline readback must resolve it the same way, because the worker wrote the payload and the hash names it.
 */
test("a marker without a locator still resolves from the durable output store", async () => {
  await withStore((stateRoot) => {
    const payload = JSON.stringify(attestation);
    const resultHash = `sha256:${createHash("sha256").update(payload).digest("hex")}`;
    writeOutput(stateRoot, payload, resultHash);

    const resolved = resolveExtensionBusinessAnswer({
      result: { transferState: "externalized", resultHash, byteLength: payload.length },
      extensionId: "evaluation-core",
      scopeId,
      stateRoot,
    });
    expect(resolved).toMatchObject({ schemaVersion: attestation.schemaVersion });
  });
});

/**
 * Run 98 addendum 58 §26 (live v320 marker `comparison-readback keys=transferState,resultHash,byteLength
 * status=`): the pipeline still read the bare marker even after the locator-less resolution landed, because
 * the answer carried a `durableLocator` whose `outputKey` no longer resolves — and that branch returned null
 * instead of falling through to the hash the marker names.
 *
 * `guidance/09_evaluation_core.md` is explicit that Evaluation Core owns the comparison and consumers receive
 * it by reference: the reference (here, the hash) must be resolved, and a stale locator key is not a reason to
 * hand the transport marker to a validator as if it were the record.
 */
test("a marker whose locator no longer resolves is still resolved by the hash it names", async () => {
  await withStore((stateRoot) => {
    const payload = JSON.stringify(attestation);
    const resultHash = `sha256:${createHash("sha256").update(payload).digest("hex")}`;
    // The payload is durable under the store's own key; the answer's locator names a key that is gone.
    writeOutput(stateRoot, payload, resultHash);

    const resolved = resolveExtensionBusinessAnswer({
      result: {
        transferState: "externalized",
        resultHash,
        byteLength: payload.length,
        durableLocator: { outputKey: "locator:stale-key", resultHash },
      },
      extensionId: "evaluation-core",
      scopeId,
      stateRoot,
    });
    expect(resolved).toMatchObject({ schemaVersion: attestation.schemaVersion });
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
