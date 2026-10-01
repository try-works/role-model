import { Match } from "effect";

import type { ExecutionTrafficClass } from "./execution-circuit-breaker.js";

/**
 * Run 104 / R14 (addendum-03): the persisted traffic-class vocabulary. It reconciles the execution plane's
 * `ExecutionTrafficClass` enum (`live | benchmark | health | synthetic | replay`) with the classes the operator
 * aggregates are filtered by, so the telemetry row and the observation/sample row for one request agree.
 */
export type PersistedTrafficClass = "live" | "replay" | "evaluation" | "benchmark" | "probe" | "unknown";

/** Readback compatibility: rows written before run 104 carry the legacy `live_request` value. */
export type StoredTrafficClass = PersistedTrafficClass | "live_request";

export const PERSISTED_TRAFFIC_CLASSES = [
  "live",
  "replay",
  "evaluation",
  "benchmark",
  "probe",
  "unknown",
] as const;

/**
 * Maps the execution plane's declared class into the persisted vocabulary. `Match.exhaustive` keeps the mapping
 * total: adding an `ExecutionTrafficClass` variant fails to compile here instead of falling through a default.
 */
export function toPersistedTrafficClass(
  trafficClass?: ExecutionTrafficClass | null,
): PersistedTrafficClass {
  return Match.value(trafficClass ?? "live").pipe(
    Match.when("live", () => "live" as const),
    Match.when("replay", () => "replay" as const),
    Match.when("benchmark", () => "benchmark" as const),
    Match.when("health", () => "probe" as const),
    Match.when("synthetic", () => "probe" as const),
    Match.orElse(() => "unknown" as const),
  );
}

/** `live` also matches the legacy `live_request` value so pre-migration rows stay in the live denominator. */
export function isLiveTrafficClass(requestClass?: string | null): boolean {
  return requestClass === "live" || requestClass === "live_request";
}
