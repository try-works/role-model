import assert from "node:assert/strict";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import { MAX_INLINE_BYTES, encodeFrame } from "../extension-sdk/index.mjs";
import { ExtensionHost } from "./index.mjs";
import {
  MAX_INPUT_TRANSFER_BYTES,
  createInputTransferArtifact,
  hydrateInputTransferArtifact,
} from "./transfer-artifact.mjs";

const RECEIPT_ROOT =
  process.env.ROLE_MODEL_TEST_TEMP_ROOT?.trim() ||
  process.env.RUN96_TEST_TEMP_ROOT?.trim() ||
  "E:\\role-model-temp";
const protocolVersion = "1.1.0";
const authorizationEpoch = 7;
const baseEnvelope = (body, overrides = {}) => ({
  requestId: "run96-ac-r24-01-process",
  protocolVersion,
  authorizationEpoch,
  channel: "development",
  scope: "run96-ac-r24-01",
  capability: "fixture:transfer",
  payload: {
    body,
    secret: "sk-run96-must-not-cross",
    apiKey: "run96-api-key-must-not-cross",
    rawResponse: "private provider response",
    rawContent: "private raw content",
  },
  ...overrides,
});

async function createFixture(root) {
  const fixture = path.join(root, "r24-01-extension.mjs");
  await writeFile(
    fixture,
    `export async function run(envelope) {
      const payload = envelope.payload ?? {};
      return {
        bodyLength: payload.body?.length ?? 0,
        protocolVersion: envelope.protocolVersion,
        channel: envelope.channel,
        scope: envelope.scope,
        authorizationEpoch: envelope.authorizationEpoch,
        hasSecret: Object.hasOwn(payload, "secret"),
        hasApiKey: Object.hasOwn(payload, "apiKey"),
        hasRawResponse: Object.hasOwn(payload, "rawResponse"),
        hasRawContent: Object.hasOwn(payload, "rawContent"),
      };
    }\n`,
    "utf8",
  );
  return pathToFileURL(fixture).href;
}

async function createHost(root) {
  const host = new ExtensionHost({
    protocolVersion,
    authorizationEpoch,
    journalPath: path.join(root, "host.jsonl"),
    timeoutMs: 10_000,
  });
  await host.registerProcess(
    {
      id: "run96-r24-01-extension",
      protocolVersion,
      capabilities: ["fixture:transfer"],
    },
    await createFixture(root),
  );
  return host;
}

test("AC-R24-01 aggregate: real process ExtensionHost enforces the authenticated 16 KiB-to-64 MiB transfer conjunction", async () => {
  await mkdir(RECEIPT_ROOT, { recursive: true });
  const root = await mkdtemp(path.join(RECEIPT_ROOT, "run96-r24-01-extension-host-"));
  const host = await createHost(root);
  const extensionId = "run96-r24-01-extension";
  try {
    assert.throws(
      () =>
        encodeFrame({
          type: "invoke",
          requestId: "run96-inline-threshold",
          envelope: baseEnvelope("x".repeat(MAX_INLINE_BYTES)),
        }),
      /inline limit/,
      "the IPC frame must keep the 16 KiB inline threshold",
    );

    const large = baseEnvelope("x".repeat(20 * 1024));
    const result = await host.invoke(extensionId, large);
    assert.deepEqual(
      {
        bodyLength: result.bodyLength,
        protocolVersion: result.protocolVersion,
        channel: result.channel,
        scope: result.scope,
        authorizationEpoch: result.authorizationEpoch,
        hasSecret: result.hasSecret,
        hasApiKey: result.hasApiKey,
        hasRawResponse: result.hasRawResponse,
        hasRawContent: result.hasRawContent,
      },
      {
        bodyLength: 20 * 1024,
        protocolVersion,
        channel: "development",
        scope: "run96-ac-r24-01",
        authorizationEpoch,
        hasSecret: false,
        hasApiKey: false,
        hasRawResponse: false,
        hasRawContent: false,
      },
    );

    const transferRoot = path.join(root, "workers", extensionId, "transfer-inputs");
    assert.deepEqual(await readdir(transferRoot), [], "consumed artifacts must not remain on disk");

    await assert.rejects(
      host.invoke(
        extensionId,
        baseEnvelope("small", {
          capability: "fixture:not-allowlisted",
        }),
      ),
      /capability denied/,
    );
    await assert.rejects(
      host.invoke(
        extensionId,
        baseEnvelope("small", {
          capability: undefined,
        }),
      ),
      /capability/,
      "every process invocation must name an allowlisted capability",
    );
    await assert.rejects(
      host.invoke(
        extensionId,
        baseEnvelope("small", {
          protocolVersion: "9.9.9",
        }),
      ),
      /incomplete or incompatible/,
    );
    await assert.rejects(
      host.invoke(
        extensionId,
        baseEnvelope("small", {
          authorizationEpoch: authorizationEpoch - 1,
        }),
      ),
      /stale or untrusted/,
    );

    const directRoot = path.join(root, "direct-transfer");
    const directEnvelope = baseEnvelope("x".repeat(20 * 1024));
    const artifact = await createInputTransferArtifact({
      stateRoot: directRoot,
      transferKey: "run96-transfer-key",
      envelope: directEnvelope,
      nowMs: 1_000,
    });
    assert.match(artifact.relativePath, /^transfer-inputs\/[a-f0-9]{64}\.json$/);
    await assert.rejects(
      host.invoke(extensionId, { ...baseEnvelope("small"), transferArtifact: artifact }),
      /caller-supplied input transfer artifacts are prohibited/,
    );
    for (const [label, mutation] of [
      ["channel", { channel: "stage" }],
      ["scope", { scope: "foreign-scope" }],
      ["authorizationEpoch", { authorizationEpoch: authorizationEpoch + 1 }],
    ]) {
      await assert.rejects(
        hydrateInputTransferArtifact({
          stateRoot: directRoot,
          transferKey: "run96-transfer-key",
          envelope: {
            ...directEnvelope,
            ...mutation,
            transferArtifact: artifact,
          },
          nowMs: 1_001,
        }),
        new RegExp(`${label} mismatch`, "i"),
      );
    }
    await assert.rejects(
      hydrateInputTransferArtifact({
        stateRoot: directRoot,
        transferKey: "run96-transfer-key",
        envelope: {
          ...directEnvelope,
          transferArtifact: { ...artifact, payloadSha256: `sha256:${"0".repeat(64)}` },
        },
        nowMs: 1_001,
      }),
      /authentication|digest/,
    );
    const hydrated = await hydrateInputTransferArtifact({
      stateRoot: directRoot,
      transferKey: "run96-transfer-key",
      envelope: { ...directEnvelope, transferArtifact: artifact },
      nowMs: 1_001,
    });
    assert.equal(hydrated.payload.body.length, 20 * 1024);
    await assert.rejects(
      hydrateInputTransferArtifact({
        stateRoot: directRoot,
        transferKey: "run96-transfer-key",
        envelope: { ...directEnvelope, transferArtifact: artifact },
        nowMs: 1_002,
      }),
      /missing|ENOENT/,
      "a transfer locator must be single-use",
    );

    const maxRoot = path.join(root, "max-transfer");
    const maxEnvelope = baseEnvelope("x".repeat(MAX_INPUT_TRANSFER_BYTES - 2_048));
    const maxArtifact = await createInputTransferArtifact({
      stateRoot: maxRoot,
      transferKey: "run96-max-transfer-key",
      envelope: maxEnvelope,
      nowMs: 2_000,
    });
    assert.ok(maxArtifact.byteLength <= MAX_INPUT_TRANSFER_BYTES);
    assert.ok(maxArtifact.byteLength > MAX_INPUT_TRANSFER_BYTES - 4_096);
    const maxHydrated = await hydrateInputTransferArtifact({
      stateRoot: maxRoot,
      transferKey: "run96-max-transfer-key",
      envelope: { ...maxEnvelope, transferArtifact: maxArtifact },
      nowMs: 2_001,
    });
    assert.equal(maxHydrated.payload.body.length, MAX_INPUT_TRANSFER_BYTES - 2_048);
  } finally {
    await host.shutdown();
    await rm(root, { force: true, recursive: true });
  }
});
