import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import {
  MAX_INLINE_BYTES,
  decodeFrame,
  defineExtension,
  encodeFrame,
  sanitizeEnvelope,
} from "../extension-sdk/index.mjs";
import { ExtensionHost } from "./index.mjs";

test("Run 97 extension workers inherit the host runtime channel", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "run97-extension-channel-"));
  const fixture = path.join(root, "channel-extension.mjs");
  await writeFile(
    fixture,
    `export async function run(envelope) {
      return {
        capability: envelope.capability,
        workerChannel: process.env.ROLE_MODEL_EXTENSION_CHANNEL ?? null,
        workerStateRootPresent: Boolean(process.env.ROLE_MODEL_EXTENSION_STATE_ROOT),
      };
    }
`,
    "utf8",
  );
  const host = new ExtensionHost({
    protocolVersion: "1.1.0",
    authorizationEpoch: 9,
    journalPath: path.join(root, "channel-host.jsonl"),
    timeoutMs: 10_000,
    startupTimeoutMs: 10_000,
    channel: "stage",
  });
  try {
    await host.registerProcess(
      {
        id: "run97-channel-extension",
        protocolVersion: "1.1.0",
        capabilities: ["fixture:channel"],
      },
      pathToFileURL(fixture).href,
    );
    const result = await host.invoke("run97-channel-extension", {
      requestId: "run97-channel-extension:probe",
      protocolVersion: "1.1.0",
      authorizationEpoch: 9,
      channel: "stage",
      scope: "standalone-runtime-stage",
      capability: "fixture:channel",
    });
    // Without the inherited channel the Artifact Store business store defaults to
    // development and every stage write is rejected as a scope channel mismatch.
    assert.equal(result.workerChannel, "stage");
    assert.equal(result.workerStateRootPresent, true);
  } finally {
    await host.shutdown().catch(() => {});
    await rm(root, { recursive: true, force: true, maxRetries: 3 }).catch(() => {});
  }
});

const protocolVersion = "1.1.0";
const authorizationEpoch = 7;
const envelopeFor = (body, overrides = {}) => ({
  requestId: "run96-r27-extension-boundary",
  protocolVersion,
  authorizationEpoch,
  channel: "development",
  scope: "run96-r27",
  capability: "fixture:r27-boundary",
  payload: {
    body,
    token: "run96-secret-token",
    apiKey: "run96-secret-api-key",
    rawResponse: "run96-private-response",
    rawContent: "run96-private-content",
  },
  ...overrides,
});

async function makeProcessFixture(root) {
  const fixture = path.join(root, "r27-boundary-extension.mjs");
  await writeFile(
    fixture,
    `export async function run(envelope) {
      const payload = envelope.payload ?? {};
      return {
        bodyLength: payload.body?.length ?? 0,
        identity: {
          protocolVersion: envelope.protocolVersion,
          channel: envelope.channel,
          scope: envelope.scope,
          authorizationEpoch: envelope.authorizationEpoch,
        },
        privateKeys: ["token", "apiKey", "rawResponse", "rawContent"].filter((key) =>
          Object.hasOwn(payload, key),
        ),
      };
    }\n`,
    "utf8",
  );
  return pathToFileURL(fixture).href;
}

test("AC-R27-01 tuple: real ExtensionHost and worker-runtime preserve authenticated identity across bounded process transfer", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "role-model-run96-r27-host-"));
  const extensionId = "run96-r27-boundary-extension";
  const host = new ExtensionHost({
    protocolVersion,
    authorizationEpoch,
    journalPath: path.join(root, "host.jsonl"),
    timeoutMs: 10_000,
    startupTimeoutMs: 10_000,
  });
  try {
    await host.registerProcess(
      {
        id: extensionId,
        protocolVersion,
        capabilities: ["fixture:r27-boundary"],
      },
      await makeProcessFixture(root),
    );

    const result = await host.invoke(extensionId, envelopeFor("x".repeat(20 * 1024)));
    assert.deepEqual(result.identity, {
      protocolVersion,
      channel: "development",
      scope: "run96-r27",
      authorizationEpoch,
    });
    assert.equal(result.bodyLength, 20 * 1024);
    assert.deepEqual(result.privateKeys, []);
    assert.equal(result.readCapability, "extension-output:read");
    assert.ok(result.durableLocator.outputKey);

    const transferRoot = path.join(root, "workers", extensionId, "transfer-inputs");
    assert.deepEqual(await readdir(transferRoot), [], "consumed input artifacts must be removed");
  } finally {
    await host.shutdown();
    await rm(root, { force: true, recursive: true });
  }
});

test("AC-R27-02 tuple: transfer-artifact authenticates scope/channel/epoch, bounds content, sanitizes private fields, and is single-use", async () => {
  const {
    INPUT_TRANSFER_SCHEMA,
    MAX_INPUT_TRANSFER_BYTES,
    createInputTransferArtifact,
    hydrateInputTransferArtifact,
  } = await import("./transfer-artifact.mjs");
  const root = await mkdtemp(path.join(os.tmpdir(), "role-model-run96-r27-transfer-"));
  const transferKey = "run96-r27-transfer-key";
  const envelope = envelopeFor("x".repeat(20 * 1024));
  try {
    const locator = await createInputTransferArtifact({
      stateRoot: root,
      transferKey,
      envelope,
      nowMs: 1_000,
    });
    assert.equal(locator.schemaVersion, INPUT_TRANSFER_SCHEMA);
    assert.match(locator.relativePath, /^transfer-inputs\/[a-f0-9]{64}\.json$/);
    assert.ok(locator.byteLength <= MAX_INPUT_TRANSFER_BYTES);
    assert.ok(locator.mac);

    const persisted = await readFile(path.join(root, locator.relativePath), "utf8");
    assert.equal(persisted.includes("run96-secret-token"), false);
    assert.equal(persisted.includes("run96-private-content"), false);

    const locatorEnvelope = {
      ...envelope,
      payload: undefined,
      transferArtifact: locator,
    };
    await assert.rejects(
      hydrateInputTransferArtifact({
        stateRoot: root,
        transferKey,
        envelope: { ...locatorEnvelope, scope: "foreign-scope" },
        nowMs: 1_001,
      }),
      /scope mismatch/,
    );
    await assert.rejects(
      hydrateInputTransferArtifact({
        stateRoot: root,
        transferKey,
        envelope: {
          ...locatorEnvelope,
          transferArtifact: { ...locator, mac: "0".repeat(64) },
        },
        nowMs: 1_001,
      }),
      /authentication/,
    );

    const hydrated = await hydrateInputTransferArtifact({
      stateRoot: root,
      transferKey,
      envelope: locatorEnvelope,
      nowMs: 1_001,
    });
    assert.equal(hydrated.payload.body.length, 20 * 1024);
    assert.equal(Object.hasOwn(hydrated.payload, "rawContent"), false);
    await assert.rejects(
      hydrateInputTransferArtifact({
        stateRoot: root,
        transferKey,
        envelope: locatorEnvelope,
        nowMs: 1_002,
      }),
      /missing|ENOENT/,
      "a transfer locator must be single-use",
    );

    await assert.rejects(
      createInputTransferArtifact({
        stateRoot: root,
        transferKey,
        envelope: envelopeFor("x".repeat(MAX_INPUT_TRANSFER_BYTES)),
        nowMs: 2_000,
      }),
      /bounded maximum/,
    );
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test("AC-R27-03 tuple: extension-sdk defines the allowlisted contract and removes private content before inline framing", () => {
  const descriptor = defineExtension({
    id: "run96-r27-sdk-extension",
    protocolVersion,
    capabilities: ["fixture:r27-boundary"],
  });
  assert.equal(Object.isFrozen(descriptor), true);
  assert.deepEqual(descriptor.capabilities, ["fixture:r27-boundary"]);

  const sanitized = sanitizeEnvelope({
    ordinary: "kept",
    nested: {
      token: "secret",
      rawContent: "private",
      list: [{ rawResponse: "private" }, { value: 1 }],
    },
  });
  assert.deepEqual(sanitized, {
    ordinary: "kept",
    nested: { list: [{}, { value: 1 }] },
  });

  const frame = encodeFrame({
    type: "invoke",
    envelope: envelopeFor("small"),
  });
  const decoded = decodeFrame(frame);
  assert.equal(decoded.envelope.payload.body, "small");
  assert.equal(Object.hasOwn(decoded.envelope.payload, "rawContent"), false);
  assert.throws(
    () => encodeFrame({ type: "invoke", payload: "x".repeat(MAX_INLINE_BYTES) }),
    /inline limit/,
  );
});
