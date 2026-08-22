/**
 * Single authoritative endpoint health/eligibility policy (R2/R3/R4).
 *
 * All consumers (candidate `healthStatus`, benchmark `isHealthyEndpoint`,
 * routable-inventory, benchmark eligibility) read the SAME health state from
 * this module so a Flash-High 503 instance cannot remain healthy/eligible.
 */

export type CandidateHealthState =
  | "healthy"
  | "degraded"
  | "provider-unavailable"
  | "offline"
  | "policy-blocked"
  | "unknown";

export interface HealthPolicyInput {
  readonly lifecycleState: string | null;
  readonly probeHealthStatus: string;
  readonly circuitState: string | null;
  readonly consecutiveExecutionFailures: number;
}

/**
 * Consecutive upstream 503-class failures that flip an instance to degraded.
 *
 * This deliberately matches the execution circuit's opening threshold. Keeping
 * the two boundaries equal ensures a circuit-open endpoint cannot still be
 * advertised as a healthy, routable or benchmark-eligible instance.
 */
export const CONSECUTIVE_EXECUTION_FAILURE_DEGRADATION_THRESHOLD = 2;

const CIRCUIT_DEGRADED_STATES = new Set([
  "open",
  "probation",
  "blocked_auth",
  "blocked_quota",
  "half_open",
]);

export function classifyProvider5xxHealth(consecutiveFailures: number): CandidateHealthState {
  return consecutiveFailures >= CONSECUTIVE_EXECUTION_FAILURE_DEGRADATION_THRESHOLD
    ? "degraded"
    : "healthy";
}

export function resolveEndpointHealthState(input: HealthPolicyInput): CandidateHealthState {
  const lifecycleState = input.lifecycleState ?? "active";
  const probeHealthStatus = input.probeHealthStatus ?? "healthy";

  // Removed/pending are never healthy.
  if (lifecycleState === "removed") {
    return "offline";
  }
  if (lifecycleState === "pending-admission") {
    return "unknown";
  }

  // Degraded lifecycle trumps probe.
  if (lifecycleState === "degraded") {
    return "degraded";
  }

  // Circuit degraded states flip to degraded regardless of probe.
  if (input.circuitState && CIRCUIT_DEGRADED_STATES.has(input.circuitState)) {
    return "degraded";
  }

  // Probe provider-unavailable is honored as-is.
  if (probeHealthStatus === "provider-unavailable") {
    return "provider-unavailable";
  }
  // Preserve explicit probe states verbatim; only "degraded" needs no mapping.
  if (probeHealthStatus === "offline") {
    return "offline";
  }
  if (probeHealthStatus === "policy-blocked") {
    return "policy-blocked";
  }
  if (probeHealthStatus === "degraded") {
    return "degraded";
  }

  // Consecutive execution failures degrade.
  if (input.consecutiveExecutionFailures >= CONSECUTIVE_EXECUTION_FAILURE_DEGRADATION_THRESHOLD) {
    return "degraded";
  }

  return "healthy";
}

/** True only for a fully usable (non-degraded, non-blocked) active instance. */
export function isHealthyEndpointState(state: CandidateHealthState): boolean {
  return state === "healthy";
}
