import { createHash, createHmac, randomUUID } from "node:crypto";
import { once } from "node:events";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { pathToFileURL } from "node:url";
import { encodeControlFrame, extractControlFrames } from "../extension-sdk/index.mjs";
import {
  DEFAULT_MAX_RETAINED_RESPONSES,
  DEFAULT_MAX_RETAINED_RESPONSE_AGE_MS,
  DEFAULT_MAX_RETAINED_RESPONSE_BYTES,
  RetainedResponseStore,
} from "./retained-response-store.mjs";
import { hydrateInputTransferArtifact } from "./transfer-artifact.mjs";

const moduleRef = process.argv[2];
if (!moduleRef) throw new Error("worker module URL required");
const extension = await import(moduleRef.includes(":") ? moduleRef : pathToFileURL(moduleRef).href);
if (typeof extension.run !== "function") throw new Error("worker module must export run(envelope)");

const extensionId = process.env.ROLE_MODEL_EXTENSION_ID ?? "unknown-extension";
const stateRoot = process.env.ROLE_MODEL_EXTENSION_STATE_ROOT;
if (stateRoot) mkdirSync(stateRoot, { recursive: true });
const outputDatabase = new DatabaseSync(
  stateRoot ? join(stateRoot, "durable-output.sqlite") : ":memory:",
);
outputDatabase.exec(`
  PRAGMA journal_mode=WAL;
  PRAGMA synchronous=FULL;
  CREATE TABLE IF NOT EXISTS durable_extension_outputs (
    output_key TEXT PRIMARY KEY,
    request_id TEXT NOT NULL,
    capability TEXT NOT NULL,
    channel TEXT NOT NULL,
    scope_id TEXT NOT NULL,
    result_hash TEXT NOT NULL,
    byte_length INTEGER NOT NULL,
    result_json TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS durable_extension_outputs_created
    ON durable_extension_outputs(created_at, output_key);
`);
const MAX_INLINE_OUTPUT_BYTES = 16 * 1024;
const MAX_DURABLE_OUTPUT_ROWS = 512;
const CONTROL_AUTHENTICATION_SCHEMA = "role-model.extension-host.control-authentication.v1";
const CONTROL_AUTHENTICATION_SYMBOL = Symbol.for(CONTROL_AUTHENTICATION_SCHEMA);

function authenticateControlEnvelope(envelope) {
  const nonce = randomUUID();
  const payloadDigest = createHash("sha256")
    .update(JSON.stringify(envelope.payload ?? null))
    .digest("hex");
  const message = JSON.stringify([
    CONTROL_AUTHENTICATION_SCHEMA,
    nonce,
    envelope.requestId ?? null,
    envelope.capability ?? "health:probe",
    envelope.channel ?? null,
    envelope.scope ?? null,
    envelope.authorizationEpoch ?? 0,
    payloadDigest,
  ]);
  const proof = Object.freeze({
    schemaVersion: CONTROL_AUTHENTICATION_SCHEMA,
    algorithm: "hmac-sha256",
    nonce,
    requestId: envelope.requestId ?? null,
    capability: envelope.capability ?? "health:probe",
    channel: envelope.channel ?? null,
    scope: envelope.scope ?? null,
    authorizationEpoch: envelope.authorizationEpoch ?? 0,
    payloadDigest,
    mac: createHmac("sha256", controlSecret).update(message).digest("hex"),
  });
  const authenticatedEnvelope = { ...envelope };
  Object.defineProperty(authenticatedEnvelope, CONTROL_AUTHENTICATION_SYMBOL, {
    value: proof,
    enumerable: false,
    configurable: false,
    writable: false,
  });
  return authenticatedEnvelope;
}

function persistBusinessOutput(envelope, result) {
  const capability = envelope.capability ?? "health:probe";
  const resultJson = JSON.stringify(result ?? null);
  const byteLength = Buffer.byteLength(resultJson, "utf8");
  const resultHash = `sha256:${createHash("sha256").update(resultJson).digest("hex")}`;
  const outputKey = `sha256:${createHash("sha256")
    .update(`${extensionId}\0${envelope.requestId}\0${capability}\0${resultHash}`)
    .digest("hex")}`;
  outputDatabase
    .prepare("INSERT OR IGNORE INTO durable_extension_outputs VALUES (?,?,?,?,?,?,?,?,?)")
    .run(
      outputKey,
      envelope.requestId,
      capability,
      envelope.channel,
      envelope.scope,
      resultHash,
      byteLength,
      resultJson,
      new Date().toISOString(),
    );
  outputDatabase
    .prepare(`DELETE FROM durable_extension_outputs WHERE output_key IN (
      SELECT output_key FROM durable_extension_outputs
      ORDER BY created_at DESC, output_key DESC LIMIT -1 OFFSET ?
    )`)
    .run(MAX_DURABLE_OUTPUT_ROWS);
  const durableLocator = Object.freeze({
    extensionId,
    requestId: envelope.requestId,
    capability,
    channel: envelope.channel,
    scope: envelope.scope,
    outputKey,
    resultHash,
    byteLength,
  });
  const businessOutput =
    result && typeof result === "object" && !Array.isArray(result) ? result : { value: result };
  const inlineResponse = {
    ...businessOutput,
    businessOutput,
    durableLocator,
    evidenceRef: `extension-output:${outputKey}`,
    readCapability: "extension-output:read",
  };
  const inlineBusinessOutput =
    byteLength <= MAX_INLINE_OUTPUT_BYTES &&
    Buffer.byteLength(
      JSON.stringify({
        type: "result",
        requestId: envelope.requestId,
        result: inlineResponse,
      }),
      "utf8",
    ) <= MAX_INLINE_OUTPUT_BYTES
      ? businessOutput
      : Object.freeze({
          transferState: "externalized",
          resultHash,
          byteLength,
        });
  return {
    ...inlineBusinessOutput,
    businessOutput: inlineBusinessOutput,
    durableLocator,
    evidenceRef: `extension-output:${outputKey}`,
    readCapability: "extension-output:read",
  };
}

function readBusinessOutput(envelope) {
  const locator = envelope.payload?.durableLocator;
  const durableOutputId = envelope.payload?.durableOutputId;
  if (
    !locator ||
    locator.extensionId !== extensionId ||
    locator.channel !== envelope.channel ||
    locator.scope !== envelope.scope ||
    !locator.outputKey ||
    !durableOutputId
  ) {
    throw new Error("durable extension output read identity is incomplete");
  }
  const row = outputDatabase
    .prepare("SELECT * FROM durable_extension_outputs WHERE output_key=?")
    .get(locator.outputKey);
  if (
    !row ||
    row.request_id !== locator.requestId ||
    row.capability !== locator.capability ||
    row.channel !== locator.channel ||
    row.scope_id !== locator.scope ||
    row.result_hash !== locator.resultHash ||
    row.byte_length !== locator.byteLength
  ) {
    throw new Error("durable extension output locator does not match stored evidence");
  }
  return {
    durableLocator: locator,
    evidenceRef: `extension-output:${locator.outputKey}`,
    readbackOutputId: durableOutputId,
    resultHash: row.result_hash,
    byteLength: row.byte_length,
  };
}

const controlSecret =
  process.env.ROLE_MODEL_EXTENSION_CONTROL_KEY ?? process.env.ROLE_MODEL_EXTENSION_TRANSFER_KEY;
const retained = new RetainedResponseStore({
  maxCount: DEFAULT_MAX_RETAINED_RESPONSES,
  maxBytes: DEFAULT_MAX_RETAINED_RESPONSE_BYTES,
  maxAgeMs: DEFAULT_MAX_RETAINED_RESPONSE_AGE_MS,
});
const retainedPruneTimer = setInterval(
  () => retained.prune(),
  DEFAULT_MAX_RETAINED_RESPONSE_AGE_MS,
);
retainedPruneTimer.unref?.();
let input = Buffer.alloc(0);
let inboundSequence = 0;
let outboundSequence = 0;
let sendChain = Promise.resolve();
const send = (value) => {
  const sequence = outboundSequence + 1;
  const frame = encodeControlFrame(value, {
    secret: controlSecret,
    direction: "worker->host",
    sequence,
  });
  outboundSequence = sequence;
  sendChain = sendChain.then(async () => {
    if (!process.stdout.write(frame)) await once(process.stdout, "drain");
  });
  return sendChain;
};

await send({ type: "ready", pid: process.pid });
process.stdin.on("data", async (chunk) => {
  try {
    input = Buffer.concat([input, chunk]);
    const parsed = extractControlFrames(input, {
      secret: controlSecret,
      direction: "host->worker",
      lastSequence: inboundSequence,
    });
    input = parsed.remainder;
    inboundSequence = parsed.lastSequence;
    for (const message of parsed.values) {
      if (message.type === "ack") {
        retained.delete(message.requestId);
        continue;
      }
      if (message.type === "shutdown") {
        clearInterval(retainedPruneTimer);
        outputDatabase.close();
        await send({ type: "shutdown-ack" });
        process.exit(0);
      }
      if (message.type !== "invoke") continue;
      try {
        const envelope = message.envelope?.transferArtifact
          ? await hydrateInputTransferArtifact({
              stateRoot,
              transferKey: process.env.ROLE_MODEL_EXTENSION_TRANSFER_KEY,
              envelope: message.envelope,
            })
          : message.envelope;
        let result;
        if (envelope.capability === "extension-output:read") {
          result = readBusinessOutput(envelope);
        } else {
          const value = await extension.run(authenticateControlEnvelope(envelope));
          result = persistBusinessOutput(envelope, value);
        }
        const response = { type: "result", requestId: message.requestId, result };
        retained.set(message.requestId, response);
        await send(response);
      } catch (error) {
        const response = {
          type: "error",
          requestId: message.requestId,
          error: error?.message ?? String(error),
        };
        retained.set(message.requestId, response);
        await send(response);
      }
    }
  } catch (error) {
    process.stderr.write(`control frame rejected: ${error?.message ?? String(error)}\n`);
    process.exit(1);
  }
});
