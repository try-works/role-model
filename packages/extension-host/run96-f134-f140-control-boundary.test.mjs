import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import {
  decodeControlFrame,
  encodeControlFrame,
  encodeFrame,
  extractControlFrames,
} from "../extension-sdk/index.mjs";
import { ExtensionHost } from "./index.mjs";
import { RetainedResponseStore } from "./retained-response-store.mjs";

const RECEIPT_ROOT = "E:\\role-model-temp";
const protocolVersion = "1.1.0";
const authorizationEpoch = 7;
const controlSecret = "run96-f134-worker-secret";
const baseEnvelope = (requestId) => ({
  requestId,
  protocolVersion,
  authorizationEpoch,
  channel: "development",
  scope: "run96-f134-f140",
  capability: "fixture:boundary",
  payload: { body: "bounded" },
});

async function makeTempRoot(prefix) {
  await mkdir(RECEIPT_ROOT, { recursive: true });
  return mkdtemp(path.join(RECEIPT_ROOT, prefix));
}

async function makeLegacyFrameFixture(root, behavior) {
  const fixture = path.join(root, `run96-${behavior}-frame.mjs`);
  const sdkUrl = pathToFileURL(
    path.resolve(import.meta.dirname, "../extension-sdk/index.mjs"),
  ).href;
  await writeFile(
    fixture,
    `import { encodeFrame } from ${JSON.stringify(sdkUrl)};
export async function run(envelope) {
  const frame = encodeFrame({
    type: "result",
    requestId: envelope.requestId,
    result: { forged: ${JSON.stringify(behavior)} },
  });
  if (${JSON.stringify(behavior)} === "tampered") {
    const tampered = Buffer.from(frame);
    const marker = Buffer.from("tampered");
    const offset = tampered.indexOf(marker);
    tampered[offset] = tampered[offset] === 116 ? 84 : 116;
    process.stdout.write(tampered);
  } else {
    process.stdout.write(frame);
    if (${JSON.stringify(behavior)} === "replayed") process.stdout.write(frame);
  }
  await new Promise((resolve) => setTimeout(resolve, 20));
  return { legitimate: true };
}
`,
    "utf8",
  );
  return pathToFileURL(fixture).href;
}

async function makeNeverEndingFixture(root) {
  const fixture = path.join(root, "run96-never-ending.mjs");
  await writeFile(
    fixture,
    "export async function run() { await new Promise(() => {}); }\n",
    "utf8",
  );
  return pathToFileURL(fixture).href;
}

async function waitFor(predicate, timeoutMs = 2_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.fail("timed out waiting for bounded worker cleanup");
}

test("F134 rejects tampered, direction-confused, and replayed authenticated frames in both directions", () => {
  const message = {
    type: "result",
    requestId: "run96-f134-direct",
    result: { value: "authoritative" },
  };
  for (const direction of ["host->worker", "worker->host"]) {
    const frame = encodeControlFrame(message, {
      secret: controlSecret,
      direction,
      sequence: 1,
    });
    const parsed = extractControlFrames(frame, {
      secret: controlSecret,
      direction,
      lastSequence: 0,
    });
    assert.deepEqual(parsed.values, [message]);
    assert.equal(parsed.lastSequence, 1);

    const tampered = Buffer.from(frame);
    const macOffset = tampered.indexOf(Buffer.from('"mac":"')) + Buffer.byteLength('"mac":"');
    tampered[macOffset] = tampered[macOffset] === 48 ? 49 : 48;
    assert.throws(
      () => decodeControlFrame(tampered, { secret: controlSecret, direction }),
      /authentication|mac|integrity/i,
    );
    const opposite = direction === "host->worker" ? "worker->host" : "host->worker";
    assert.throws(
      () => decodeControlFrame(frame, { secret: controlSecret, direction: opposite }),
      /direction/i,
    );
    assert.throws(
      () => decodeControlFrame(frame, { secret: controlSecret, direction, lastSequence: 1 }),
      /replay|sequence/i,
    );
  }
});

test("F140 retained responses enforce finite count, bytes, and age bounds", () => {
  let now = 0;
  const store = new RetainedResponseStore({
    maxCount: 2,
    maxBytes: 200,
    maxAgeMs: 100,
    now: () => now,
  });
  store.set("first", { body: "x".repeat(40) });
  store.set("second", { body: "y".repeat(40) });
  store.set("third", { body: "z".repeat(40) });
  assert.equal(store.size, 2);
  assert.equal(store.has("first"), false);
  assert.ok(store.bytes <= 200);
  assert.equal(store.set("oversized", { body: "o".repeat(400) }), false);
  assert.equal(store.has("oversized"), false);
  assert.equal(store.size, 2);
  now = 101;
  store.prune();
  assert.equal(store.size, 0);
  assert.equal(store.bytes, 0);
});

test("F134 rejects forged, tampered, and replayed legacy child frames before result resolution", async () => {
  for (const behavior of ["forged", "tampered", "replayed"]) {
    const root = await makeTempRoot(`run96-f134-${behavior}-`);
    const host = new ExtensionHost({
      protocolVersion,
      authorizationEpoch,
      journalPath: path.join(root, "host.jsonl"),
      timeoutMs: 250,
      startupTimeoutMs: 2_000,
      maxRestarts: 0,
    });
    const extensionId = `run96-${behavior}-frame`;
    try {
      await host.registerProcess(
        { id: extensionId, protocolVersion, capabilities: ["fixture:boundary"] },
        await makeLegacyFrameFixture(root, behavior),
      );
      await assert.rejects(
        host.invoke(extensionId, baseEnvelope(`run96-f134-${behavior}`)),
        /frame|control|authentication|sequence|direction/i,
        `legacy ${behavior} frame must not resolve an invocation`,
      );
    } finally {
      await host.shutdown();
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("F140 terminates timed-out workers and clears unacknowledged invocations", async () => {
  const root = await makeTempRoot("run96-f140-timeout-");
  const host = new ExtensionHost({
    protocolVersion,
    authorizationEpoch,
    journalPath: path.join(root, "host.jsonl"),
    timeoutMs: 40,
    startupTimeoutMs: 2_000,
    maxConcurrent: 2,
    maxQueued: 2,
    maxRestarts: 0,
  });
  const extensionId = "run96-never-ending";
  try {
    await host.registerProcess(
      { id: extensionId, protocolVersion, capabilities: ["fixture:boundary"] },
      await makeNeverEndingFixture(root),
    );
    const initial = host.extensionState(extensionId);
    const outcomes = await Promise.all(
      Array.from({ length: 4 }, (_, index) =>
        host.invoke(extensionId, baseEnvelope(`run96-f140-${index}`)).then(
          () => "resolved",
          (error) => error.message,
        ),
      ),
    );
    assert.equal(outcomes.length, 4);
    assert.ok(outcomes.every((message) => /timeout|worker exited|failed/i.test(message)));
    await waitFor(() => {
      const state = host.extensionState(extensionId);
      return host.health().pendingAcknowledgements === 0 && state.lifecycle !== "ready";
    });
    assert.equal(host.health().pendingAcknowledgements, 0);
    assert.notEqual(host.extensionState(extensionId).pid, initial.pid);
  } finally {
    await host.shutdown();
    await rm(root, { recursive: true, force: true });
  }
});
