/**
 * Durable per-endpoint admission lifecycle state machine (R1/R2).
 *
 * A configured endpoint instance moves through an explicit state machine:
 *   (none) -> pending-admission -> active
 *                              \-> degraded -> active (recovery) | removed
 *   active -> degraded -> active | removed
 *   active -> removed
 *   degraded -> removed
 *
 * `removed` is terminal; a re-add must re-enter through `pending-admission`.
 * Every transition records a timestamp, a reason code, and (for success) a
 * sanitized admission receipt. No credential, header, prompt, or raw provider
 * body is ever stored here.
 */

export type AdmissionLifecycleState = "pending-admission" | "active" | "degraded" | "removed";

export interface EndpointLifecycleSnapshot {
  readonly state: AdmissionLifecycleState;
  readonly reasonCode: string;
  /** Sanitized, secret-free reason detail (e.g. "upstream 503 upstream_connection_error"). */
  readonly reasonMessage?: string;
  /** When this transition occurred (ms epoch). */
  readonly transitionedAtMs: number;
  /** When the instance was admitted (first active); preserved through degradation/removal. */
  readonly admittedAtMs?: number;
}

export interface EndpointLifecycleTransitionInput {
  readonly currentState: EndpointLifecycleSnapshot | null;
  readonly nextState: AdmissionLifecycleState;
  readonly reasonCode: string;
  readonly reasonMessage?: string;
  readonly nowMs: number;
}

export type EndpointLifecycleTransitionResult =
  | { readonly ok: true; readonly next: EndpointLifecycleSnapshot }
  | { readonly ok: false; readonly error: string };

export interface AdmissionReceipt {
  readonly endpointId: string;
  readonly lifecycleState: AdmissionLifecycleState;
  readonly reasonCode: string;
  readonly transitionedAtMs: number;
  readonly receiptId: string;
  readonly secretFree: true;
}

export const ADMISSION_LIFECYCLE: readonly AdmissionLifecycleState[] = [
  "pending-admission",
  "active",
  "degraded",
  "removed",
];

const CANONICAL_STATES = new Set<string>(ADMISSION_LIFECYCLE);

const LEGAL_TRANSITIONS: Record<AdmissionLifecycleState, readonly AdmissionLifecycleState[]> = {
  "pending-admission": ["active", "degraded", "removed"],
  active: ["degraded", "removed"],
  degraded: ["active", "removed"],
  removed: [],
};

function normalizeReasonCode(value: string): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  if (value.length > 96) {
    return null;
  }
  return value;
}

function sanitizeReasonMessage(value: string | undefined): string | undefined {
  if (typeof value !== "string" || value.length === 0) {
    return undefined;
  }
  // Secret-free guardrail: strip any token-looking / header-looking content.
  const cleaned = value
    .replace(/(Bearer|Authorization|sk-|api[_-]?key)\s*[:=]\s*[^\s,;]+/gi, "$1:<redacted>")
    .replace(/\beyJ[A-Za-z0-9_-]{10,}\b/g, "<jwt-redacted>")
    .slice(0, 512);
  return cleaned;
}

export function describeEndpointLifecycle(state: AdmissionLifecycleState): {
  readonly label: string;
} {
  switch (state) {
    case "pending-admission":
      return { label: "Pending admission" };
    case "active":
      return { label: "Active" };
    case "degraded":
      return { label: "Degraded" };
    case "removed":
      return { label: "Removed" };
  }
}

export function transitionEndpointLifecycle(
  input: EndpointLifecycleTransitionInput,
): EndpointLifecycleTransitionResult {
  const reasonCode = normalizeReasonCode(input.reasonCode);
  if (!reasonCode) {
    return { ok: false, error: "reasonCode must be a non-empty string" };
  }
  if (!Number.isFinite(input.nowMs) || input.nowMs < 0) {
    return { ok: false, error: "nowMs must be a non-negative finite number" };
  }
  if (!CANONICAL_STATES.has(input.nextState)) {
    return { ok: false, error: `unknown lifecycle state: ${String(input.nextState)}` };
  }
  if (input.currentState && !CANONICAL_STATES.has(input.currentState.state)) {
    return {
      ok: false,
      error: `unknown current lifecycle state: ${String(input.currentState.state)}`,
    };
  }

  const allowed = input.currentState
    ? LEGAL_TRANSITIONS[input.currentState.state]
    : (["pending-admission"] as const);

  if (!allowed.includes(input.nextState)) {
    const from = input.currentState?.state ?? "none";
    return {
      ok: false,
      error: `illegal lifecycle transition ${from} -> ${input.nextState}`,
    };
  }

  const reasonMessage = sanitizeReasonMessage(input.reasonMessage);
  const admittedAtMs =
    input.nextState === "active" ? input.nowMs : input.currentState?.admittedAtMs;

  return {
    ok: true,
    next: {
      state: input.nextState,
      reasonCode,
      ...(reasonMessage ? { reasonMessage } : {}),
      transitionedAtMs: input.nowMs,
      ...(admittedAtMs !== undefined ? { admittedAtMs } : {}),
    },
  };
}

export function createAdmissionReceipt(input: {
  readonly endpointId: string;
  readonly lifecycleState: AdmissionLifecycleState;
  readonly reasonCode: string;
  readonly nowMs: number;
}): AdmissionReceipt {
  const receiptId = `adm-${Math.random().toString(36).slice(2, 10)}${Date.now()
    .toString(36)
    .slice(-4)}`;
  return {
    endpointId: input.endpointId,
    lifecycleState: input.lifecycleState,
    reasonCode: input.reasonCode,
    transitionedAtMs: input.nowMs,
    receiptId,
    secretFree: true,
  };
}
