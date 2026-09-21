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

/**
 * The packaged host's own layout: `<journalDir>/workers/<id>/durable-output.sqlite`, where the journal lives
 * under the scope's `track-b/workers` root (see `worker-runtime.mjs`'s store bootstrap).
 */
const writePackagedHostOutput = (
  stateRoot: string,
  outputKey: string,
  payload: string,
  resultHash: string,
) => {
  const directory = path.join(stateRoot, scopeId, "track-b", "workers", "packaged-extension-host");
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

/**
 * Run 98 addendum 58 §27 (live v321): the packaged host always answers with a `durableLocator`
 * (`worker-runtime.mjs`: `return {...inlineBusinessOutput, businessOutput, durableLocator, evidenceRef,
 * readCapability}`), and it writes the payload into **its own** worker store — `ProcessWorker` roots itself
 * under `<journalDir>/workers/<id>/durable-output.sqlite`, not under the extension runtime's
 * `track-b/extensions/workers/<id>/` path. The host's readback therefore has to look in both layouts before
 * it may give up; resolving only the extension-runtime layout left the live comparison readback as the bare
 * marker (`comparison-readback keys=transferState,resultHash,byteLength`).
 */
test("a locator resolves from the packaged host's worker store as well as the extension layout", async () => {
  await withStore((stateRoot) => {
    const payload = JSON.stringify(attestation);
    const resultHash = `sha256:${createHash("sha256").update(payload).digest("hex")}`;
    const publishedKey = "sha256:packaged-host-output-key";
    writePackagedHostOutput(stateRoot, publishedKey, payload, resultHash);

    const resolved = resolveExtensionBusinessAnswer({
      result: {
        transferState: "externalized",
        resultHash,
        byteLength: payload.length,
        durableLocator: { outputKey: publishedKey, resultHash },
      },
      extensionId: "evaluation-core",
      scopeId,
      stateRoot,
    });
    expect(resolved).toMatchObject({ schemaVersion: attestation.schemaVersion });
  });
});

/**
 * Run 98 addendum 58 §28: the packaged worker addresses its store by its **own** key formula
 * (`outputKey = sha256(extensionId \0 requestId \0 capability \0 resultHash)`), and the answer's locator
 * carries every input to it. When the stored `result_hash` column disagrees with the hash the marker
 * carries, the key is still the address — and the marker's byte length is the integrity check that has to
 * agree. Without this the readback can only ever match on an exact hash column, which is what left the live
 * comparison readback as the bare marker.
 */
test("a marker resolves by the packaged host's own output key when the hash column disagrees", async () => {
  await withStore((stateRoot) => {
    const payload = JSON.stringify(attestation);
    const markerHash = `sha256:${createHash("sha256").update(payload).digest("hex")}`;
    const locator = {
      extensionId: "evaluation-core",
      requestId: "request:run98:a56:keyed",
      capability: "evaluation:read-comparison-group",
      channel: "stage",
      scope: scopeId,
      resultHash: markerHash,
      byteLength: payload.length,
    };
    const outputKey = `sha256:${createHash("sha256")
      .update(
        `${locator.extensionId}\u0000${locator.requestId}\u0000${locator.capability}\u0000${markerHash}`,
      )
      .digest("hex")}`;
    // The stored hash column disagrees with the marker's hash; the key and the length are right.
    writePackagedHostOutput(stateRoot, outputKey, payload, `sha256:${"b".repeat(64)}`);

    const resolved = resolveExtensionBusinessAnswer({
      result: {
        transferState: "externalized",
        resultHash: markerHash,
        byteLength: payload.length,
        durableLocator: locator,
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
