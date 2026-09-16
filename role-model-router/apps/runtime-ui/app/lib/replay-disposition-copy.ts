/**
 * Run 98 addendum 24 (§5.4, Deferred row 1).
 *
 * The durable receipt learned to name `replay_handoff_evaluation_pending` when a replay handed its
 * branches to Evaluation Core and the evaluation owns the remaining clock — the capture's provider
 * work is complete and nothing failed. The operator surface still rendered the old vocabulary, so
 * those captures read like failed replays. This module turns a disposition (outcome + detail) into
 * operator copy, keeps the raw vocabulary for anyone who needs to grep the ledger, and invents
 * nothing: an outcome it does not know is passed through verbatim.
 */

export type ReplayDispositionTone = "success" | "warning" | "error" | "neutral";

export interface ReplayDispositionCopy {
  readonly label: string;
  readonly tone: ReplayDispositionTone;
  readonly explanation: string;
  /** The raw outcome/detail vocabulary, never rewritten. */
  readonly raw: string;
}

/** The receipt reason the replay writes when an evaluation owns the remaining work. */
export const REPLAY_HANDOFF_EVALUATION_PENDING = "replay_handoff_evaluation_pending";

const bounded = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

export function describeReplayDisposition(input: {
  readonly outcome?: unknown;
  readonly detail?: unknown;
}): ReplayDispositionCopy {
  const outcome = bounded(input?.outcome) || "unknown";
  const raw = bounded(input?.detail);
  const normalized = outcome.toLowerCase();

  if (raw.includes(REPLAY_HANDOFF_EVALUATION_PENDING)) {
    return {
      label: "Handed off",
      tone: "neutral",
      explanation:
        "The replay handed its branches to Evaluation Core; Evaluation Core owns the remaining clock, " +
        "so this is not a failed replay and the provider work is already paid for and durable.",
      raw,
    };
  }

  if (normalized === "replayed") {
    return {
      label: "Replayed",
      tone: "success",
      explanation: "The counterfactual branch was dispatched and its evidence is durable.",
      raw,
    };
  }

  if (normalized === "refused" || normalized === "replay_failed") {
    return {
      label: "Refused",
      tone: "error",
      explanation: raw
        ? `The replay was refused: ${raw}`
        : "The replay was refused; the durable receipt names the cause.",
      raw,
    };
  }

  if (normalized === "deferred") {
    return {
      label: "Deferred",
      tone: "warning",
      explanation: raw
        ? `The replay is retryable and stays queued for the next tick: ${raw}`
        : "The replay is retryable and stays queued for the next tick.",
      raw,
    };
  }

  return {
    label: outcome,
    tone: "neutral",
    explanation: raw || "No detail was recorded for this outcome.",
    raw,
  };
}
