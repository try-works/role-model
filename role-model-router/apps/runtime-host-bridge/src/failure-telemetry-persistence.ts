/**
 * Failure telemetry is secondary to the execution error being handled by the caller.
 * Return an explicit receipt so callers only mark errors persisted after success.
 */
export function persistFailureTelemetrySafely(persist: () => void): boolean {
  try {
    persist();
    return true;
  } catch {
    // Never stringify the persistence error: it may embed full provider payloads,
    // credentials or SQL values. This fixed diagnostic is bounded and sanitized.
    try {
      console.error(
        "Runtime failure telemetry persistence failed; original execution error preserved.",
      );
    } catch {
      // A diagnostic sink failure must not replace the primary execution error either.
    }
    return false;
  }
}
