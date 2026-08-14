import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const SECRET_KEYS = new Set([
  "token",
  "authorization",
  "apiKey",
  "secret",
  "providerBody",
  "rawResponse",
]);
export const MAX_INLINE_BYTES = 16 * 1024;

export function defineExtension(descriptor) {
  if (!descriptor?.id || !/^[a-z0-9][a-z0-9-]*$/.test(descriptor.id))
    throw new Error("extension id is required");
  if (!/^\d+\.\d+\.\d+$/.test(descriptor.protocolVersion ?? ""))
    throw new Error("protocol version is required");
  if (
    !Array.isArray(descriptor.capabilities) ||
    new Set(descriptor.capabilities).size !== descriptor.capabilities.length
  )
    throw new Error("capabilities must be finite and unique");
  if (
    descriptor.entrypoint &&
    (descriptor.entrypoint.includes("..") ||
      descriptor.entrypoint.includes("\\") ||
      descriptor.entrypoint.startsWith("/"))
  )
    throw new Error("manifest entrypoint must be a safe relative path");
  return Object.freeze({
    ...descriptor,
    capabilities: Object.freeze([...descriptor.capabilities]),
  });
}

export function sanitizeEnvelope(value) {
  if (Array.isArray(value)) return value.map(sanitizeEnvelope);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !SECRET_KEYS.has(key))
        .map(([key, child]) => [key, sanitizeEnvelope(child)]),
    );
  }
  return value;
}

const payloadBytes = (payload) =>
  Buffer.from(typeof payload === "string" ? payload : JSON.stringify(payload));
const bundleMessage = (manifest, payloadDigest) => JSON.stringify({ manifest, payloadDigest });

export function createSignedBundle({ manifest, payload }, signingKey) {
  manifest = defineExtension({ ...manifest, capabilities: manifest?.capabilities ?? [] });
  if (!signingKey) throw new Error("bundle signing key is required");
  const payloadDigest = createHash("sha256").update(payloadBytes(payload)).digest("hex");
  const signature = createHmac("sha256", signingKey)
    .update(bundleMessage(manifest, payloadDigest))
    .digest("hex");
  return {
    manifest: structuredClone(manifest),
    payload: structuredClone(payload),
    payloadDigest,
    signature,
    signatureAlgorithm: "hmac-sha256",
  };
}

export function verifySignedBundle(bundle, signingKey) {
  const manifest = defineExtension({
    ...bundle?.manifest,
    capabilities: bundle?.manifest?.capabilities ?? [],
  });
  if (bundle?.signatureAlgorithm !== "hmac-sha256" || !signingKey)
    throw new Error("bundle signature algorithm or key is invalid");
  const payloadDigest = createHash("sha256").update(payloadBytes(bundle?.payload)).digest("hex");
  const expected = createHmac("sha256", signingKey)
    .update(bundleMessage(bundle?.manifest, payloadDigest))
    .digest();
  const actual = Buffer.from(bundle?.signature ?? "", "hex");
  if (
    bundle?.payloadDigest !== payloadDigest ||
    actual.length !== expected.length ||
    !timingSafeEqual(actual, expected)
  )
    throw new Error("bundle signature or digest mismatch");
  return { ...structuredClone(bundle), manifest: structuredClone(manifest) };
}

export function encodeFrame(value) {
  const body = Buffer.from(JSON.stringify(sanitizeEnvelope(value)));
  if (body.length > MAX_INLINE_BYTES)
    throw new Error("frame exceeds inline limit; use a channel-local transfer artifact");
  const frame = Buffer.allocUnsafe(4 + body.length);
  frame.writeUInt32BE(body.length, 0);
  body.copy(frame, 4);
  return frame;
}

export function decodeFrame(frame) {
  if (!Buffer.isBuffer(frame) || frame.length < 4) throw new Error("invalid length-prefixed frame");
  const length = frame.readUInt32BE(0);
  if (length > MAX_INLINE_BYTES || frame.length !== length + 4)
    throw new Error("invalid length-prefixed frame size");
  return JSON.parse(frame.subarray(4).toString("utf8"));
}

export function extractFrames(buffer) {
  const values = [];
  let offset = 0;
  while (buffer.length - offset >= 4) {
    const length = buffer.readUInt32BE(offset);
    if (length > MAX_INLINE_BYTES) throw new Error("invalid length-prefixed frame size");
    if (buffer.length - offset < length + 4) break;
    values.push(JSON.parse(buffer.subarray(offset + 4, offset + 4 + length).toString("utf8")));
    offset += length + 4;
  }
  return { values, remainder: buffer.subarray(offset) };
}
