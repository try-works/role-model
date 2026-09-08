import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import { ExtensionHost } from "./index.mjs";
import { createInputTransferArtifact, hydrateInputTransferArtifact } from "./transfer-artifact.mjs";

const baseEnvelope = (body = "x".repeat(20 * 1024)) => ({
  requestId: "run96-large-input",
  sessionId: "session:run96-large-input",
  protocolVersion: "1.1.0",
  authorizationEpoch: 7,
  channel: "development",
  scope: "run96",
  capability: "fixture:large-input",
  value: {
    body,
    nested: { rawResponse: "must-not-cross-the-worker-boundary" },
  },
});

test("oversized process input uses an authenticated channel-local transfer artifact without truncation", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "role-model-large-input-"));
  const fixture = path.join(root, "large-input.mjs");
  await writeFile(
    fixture,
    `export async function run(envelope) {
      return {
        bodyLength: envelope.value.body.length,
        rawResponsePresent: Object.hasOwn(envelope.value.nested, "rawResponse"),
        requestId: envelope.requestId,
        scope: envelope.scope,
      };
    }\n`,
    "utf8",
  );
  const host = new ExtensionHost({
    protocolVersion: "1.1.0",
    authorizationEpoch: 7,
    journalPath: path.join(root, "host.jsonl"),
  });
  try {
    await host.registerProcess(
      {
        id: "large-input-fixture",
        protocolVersion: "1.1.0",
        capabilities: ["fixture:large-input"],
      },
      pathToFileURL(fixture).href,
    );
    const result = await host.invoke("large-input-fixture", baseEnvelope());
    assert.equal(result.bodyLength, 20 * 1024);
    assert.equal(result.rawResponsePresent, false);
    assert.equal(result.requestId, "run96-large-input");
    assert.equal(result.scope, "run96");
    const transferRoot = path.join(root, "workers", "large-input-fixture", "transfer-inputs");
    assert.deepEqual(
      await readdir(transferRoot),
      [],
      "the receiver must remove a consumed artifact",
    );
  } finally {
    await host.shutdown();
    await rm(root, { force: true, recursive: true });
  }
});

test("input transfer artifacts bind request channel scope epoch capability digest and expiry", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "role-model-input-binding-"));
  const transferKey = "run96-input-transfer-key";
  const envelope = baseEnvelope();
  try {
    const transferArtifact = await createInputTransferArtifact({
      stateRoot: root,
      transferKey,
      envelope,
      nowMs: 1_000,
    });
    const hydrated = await hydrateInputTransferArtifact({
      stateRoot: root,
      transferKey,
      envelope: {
        requestId: envelope.requestId,
        protocolVersion: envelope.protocolVersion,
        authorizationEpoch: envelope.authorizationEpoch,
        channel: envelope.channel,
        scope: envelope.scope,
        capability: envelope.capability,
        transferArtifact,
      },
      nowMs: 1_001,
    });
    assert.equal(hydrated.value.body.length, 20 * 1024);
    assert.equal(Object.hasOwn(hydrated.value.nested, "rawResponse"), false);
    await assert.rejects(readFile(path.join(root, transferArtifact.relativePath)), /ENOENT/);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test("input transfer artifacts fail closed on foreign identity, tamper, restart key, expiry, and missing content", async () => {
  const scenarios = [
    {
      name: "foreign scope",
      mutateEnvelope: (envelope) => ({ ...envelope, scope: "foreign-scope" }),
      pattern: /scope/i,
    },
    {
      name: "foreign channel",
      mutateEnvelope: (envelope) => ({ ...envelope, channel: "stage" }),
      pattern: /channel/i,
    },
    {
      name: "foreign authorization epoch",
      mutateEnvelope: (envelope) => ({ ...envelope, authorizationEpoch: 8 }),
      pattern: /authorizationEpoch/i,
    },
    {
      name: "foreign capability",
      mutateEnvelope: (envelope) => ({ ...envelope, capability: "fixture:other" }),
      pattern: /capability/i,
    },
    {
      name: "unsafe path",
      mutateArtifact: (artifact) => ({ ...artifact, relativePath: "../foreign.json" }),
      pattern: /authentication|path/i,
    },
    {
      name: "tampered digest",
      mutateArtifact: (artifact) => ({ ...artifact, payloadSha256: `sha256:${"0".repeat(64)}` }),
      pattern: /authentication|digest/i,
    },
    {
      name: "restart key",
      transferKey: "different-worker-generation-key",
      pattern: /authentication/i,
    },
    {
      name: "expired",
      nowMs: 40_000,
      pattern: /expired/i,
    },
    {
      name: "missing content",
      removeContent: true,
      pattern: /missing|ENOENT/i,
    },
  ];
  for (const scenario of scenarios) {
    const root = await mkdtemp(path.join(os.tmpdir(), "role-model-input-negative-"));
    const envelope = baseEnvelope();
    const transferKey = "run96-input-transfer-key";
    try {
      const created = await createInputTransferArtifact({
        stateRoot: root,
        transferKey,
        envelope,
        nowMs: 1_000,
      });
      if (scenario.removeContent) await unlink(path.join(root, created.relativePath));
      const transferArtifact = scenario.mutateArtifact ? scenario.mutateArtifact(created) : created;
      const inlineEnvelope = {
        requestId: envelope.requestId,
        protocolVersion: envelope.protocolVersion,
        authorizationEpoch: envelope.authorizationEpoch,
        channel: envelope.channel,
        scope: envelope.scope,
        capability: envelope.capability,
        transferArtifact,
      };
      await assert.rejects(
        hydrateInputTransferArtifact({
          stateRoot: root,
          transferKey: scenario.transferKey ?? transferKey,
          envelope: scenario.mutateEnvelope
            ? scenario.mutateEnvelope(inlineEnvelope)
            : inlineEnvelope,
          nowMs: scenario.nowMs ?? 1_001,
        }),
        scenario.pattern,
        scenario.name,
      );
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  }
});
