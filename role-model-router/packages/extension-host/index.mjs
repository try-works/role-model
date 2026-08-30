// Canonical Track B public extension substrate output. The process-isolated
// implementation is shared with the public package entry point so existing
// consumers and the phase-manifest path execute the same host.
export {
  ExtensionHost,
  ExtensionSupervisor,
  validateGraphRegistry,
} from "../../../packages/extension-host/index.mjs";
export {
  createSignedBundle,
  decodeFrame,
  defineExtension,
  encodeFrame,
  extractFrames,
  sanitizeEnvelope,
  verifySignedBundle,
} from "../../../packages/extension-sdk/index.mjs";
