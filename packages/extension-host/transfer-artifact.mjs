import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { sanitizeEnvelope } from "../extension-sdk/index.mjs";

export const INPUT_TRANSFER_SCHEMA = "role-model.extension-input-transfer.v1";
export const MAX_INPUT_TRANSFER_BYTES = 64 * 1024 * 1024;
export const INPUT_TRANSFER_TTL_MS = 30_000;

const sha256 = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;

function requireText(value, label) {
  if (typeof value !== "string" || !value) throw new Error(`${label} is required`);
  return value;
}

function transferMacMessage(locator) {
  return JSON.stringify({
    schemaVersion: locator.schemaVersion,
    requestId: locator.requestId,
    capability: locator.capability,
    protocolVersion: locator.protocolVersion,
    channel: locator.channel,
    scope: locator.scope,
    authorizationEpoch: locator.authorizationEpoch,
    relativePath: locator.relativePath,
    payloadSha256: locator.payloadSha256,
    byteLength: locator.byteLength,
    createdAtMs: locator.createdAtMs,
    expiresAtMs: locator.expiresAtMs,
    nonce: locator.nonce,
  });
}

function signLocator(locator, transferKey) {
  requireText(transferKey, "input transfer authentication key");
  return createHmac("sha256", transferKey).update(transferMacMessage(locator)).digest("hex");
}

function verifyLocatorMac(locator, transferKey) {
  const expected = Buffer.from(signLocator(locator, transferKey), "hex");
  const actual = Buffer.from(typeof locator.mac === "string" ? locator.mac : "", "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new Error("input transfer artifact authentication failed");
  }
}

function assertIdentity(locator, envelope) {
  const fields = [
    "requestId",
    "capability",
    "protocolVersion",
    "channel",
    "scope",
    "authorizationEpoch",
  ];
  for (const field of fields) {
    if (locator[field] !== envelope[field]) {
      throw new Error(`input transfer artifact ${field} mismatch`);
    }
  }
}

function resolveTransferPath(stateRoot, relativePath) {
  requireText(stateRoot, "input transfer state root");
  if (
    typeof relativePath !== "string" ||
    !/^transfer-inputs\/[a-f0-9]{64}\.json$/.test(relativePath)
  ) {
    throw new Error("input transfer artifact path is unsafe");
  }
  const transferRoot = path.resolve(stateRoot, "transfer-inputs");
  const resolved = path.resolve(stateRoot, ...relativePath.split("/"));
  const relative = path.relative(transferRoot, resolved);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("input transfer artifact path escapes its channel-local root");
  }
  return resolved;
}

export async function createInputTransferArtifact({
  stateRoot,
  transferKey,
  envelope,
  nowMs = Date.now(),
}) {
  if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) {
    throw new Error("input transfer envelope is required");
  }
  if (envelope.transferArtifact) {
    throw new Error("caller-supplied input transfer artifacts are prohibited");
  }
  const sanitizedEnvelope = sanitizeEnvelope(envelope);
  const body = Buffer.from(JSON.stringify(sanitizedEnvelope));
  if (body.length > MAX_INPUT_TRANSFER_BYTES) {
    throw new Error("input transfer artifact exceeds the bounded maximum");
  }
  const payloadSha256 = sha256(body);
  const nonce = randomBytes(16).toString("hex");
  const objectKey = createHash("sha256")
    .update(`${envelope.requestId}\0${payloadSha256}\0${nonce}`)
    .digest("hex");
  const relativePath = `transfer-inputs/${objectKey}.json`;
  const locator = {
    schemaVersion: INPUT_TRANSFER_SCHEMA,
    requestId: requireText(envelope.requestId, "input transfer request ID"),
    capability: requireText(envelope.capability, "input transfer capability"),
    protocolVersion: requireText(envelope.protocolVersion, "input transfer protocol version"),
    channel: requireText(envelope.channel, "input transfer channel"),
    scope: requireText(envelope.scope, "input transfer scope"),
    authorizationEpoch: envelope.authorizationEpoch,
    relativePath,
    payloadSha256,
    byteLength: body.length,
    createdAtMs: nowMs,
    expiresAtMs: nowMs + INPUT_TRANSFER_TTL_MS,
    nonce,
  };
  if (!Number.isInteger(locator.authorizationEpoch)) {
    throw new Error("input transfer authorization epoch is required");
  }
  const signedLocator = Object.freeze({ ...locator, mac: signLocator(locator, transferKey) });
  const artifactPath = resolveTransferPath(stateRoot, relativePath);
  await mkdir(path.dirname(artifactPath), { recursive: true });
  await writeFile(artifactPath, body, { flag: "wx", mode: 0o600 });
  return signedLocator;
}

export async function hydrateInputTransferArtifact({
  stateRoot,
  transferKey,
  envelope,
  nowMs = Date.now(),
}) {
  const locator = envelope?.transferArtifact;
  if (!locator || typeof locator !== "object" || Array.isArray(locator)) {
    throw new Error("input transfer artifact locator is required");
  }
  if (locator.schemaVersion !== INPUT_TRANSFER_SCHEMA) {
    throw new Error("input transfer artifact schema is incompatible");
  }
  assertIdentity(locator, envelope);
  if (
    !Number.isInteger(locator.createdAtMs) ||
    !Number.isInteger(locator.expiresAtMs) ||
    locator.expiresAtMs <= locator.createdAtMs ||
    nowMs < locator.createdAtMs ||
    nowMs > locator.expiresAtMs
  ) {
    throw new Error("input transfer artifact is expired or not yet valid");
  }
  if (
    !Number.isInteger(locator.byteLength) ||
    locator.byteLength < 1 ||
    locator.byteLength > MAX_INPUT_TRANSFER_BYTES
  ) {
    throw new Error("input transfer artifact byte length is invalid");
  }
  if (!/^sha256:[a-f0-9]{64}$/.test(locator.payloadSha256 ?? "")) {
    throw new Error("input transfer artifact digest is invalid");
  }
  verifyLocatorMac(locator, transferKey);
  const artifactPath = resolveTransferPath(stateRoot, locator.relativePath);
  let body;
  try {
    body = await readFile(artifactPath);
  } catch (error) {
    if (error?.code === "ENOENT") throw new Error("input transfer artifact content is missing");
    throw error;
  }
  if (body.length !== locator.byteLength || sha256(body) !== locator.payloadSha256) {
    throw new Error("input transfer artifact content digest or length mismatch");
  }
  let hydrated;
  try {
    hydrated = JSON.parse(body.toString("utf8"));
  } catch {
    throw new Error("input transfer artifact content is malformed");
  }
  if (!hydrated || typeof hydrated !== "object" || Array.isArray(hydrated)) {
    throw new Error("input transfer artifact envelope is malformed");
  }
  assertIdentity(locator, hydrated);
  await unlink(artifactPath);
  return hydrated;
}
