import type { RuntimeEndpointLatencyBucket } from "@role-model-router/sqlite-memory";

/**
 * Run 98 addendum 40 (L5): the measured-latency selection input, as a pure function.
 *
 * The router's own decision is the baseline. This input may only move that decision when:
 *
 * - it is authorized (`enabled`, and the activation stage is at or above the policy's `minStage` — the
 *   caller applies the stage gate);
 * - the request's own prompt-size bucket has evidence for the router's chosen endpoint *and* for at
 *   least one other eligible endpoint (no evidence about the baseline means no comparison);
 * - the better candidate's measured p95 beats the router's choice by more than `maxDeltaMs`.
 *
 * Every outcome carries the bucket, the candidates and a reason, so a decision can be audited without
 * re-deriving why it moved (or did not). Work is bounded by `maxCandidates`.
 */

export interface LatencySelectionCandidate {
  readonly endpointId: string;
  readonly p95LatencyMs: number;
  readonly sampleCount: number;
}

export interface LatencySelectionOutcome {
  readonly outcome:
    | "disabled"
    | "no_candidates"
    | "insufficient_evidence"
    | "kept_router_choice"
    | "selected_faster_candidate";
  readonly chosenEndpointId: string;
  readonly bucketUpperBoundTokens: number | null;
  readonly candidates: readonly LatencySelectionCandidate[];
  readonly reason: string;
}

export function selectEndpointByMeasuredLatency(input: {
  readonly enabled: boolean;
  readonly estimatedInputTokens: number;
  readonly routerChosenEndpointId: string;
  readonly eligibleEndpointIds: readonly string[];
  readonly buckets: readonly RuntimeEndpointLatencyBucket[];
  readonly tokenBucketUpperBounds: readonly number[];
  readonly maxDeltaMs: number;
  readonly maxCandidates: number;
}): LatencySelectionOutcome {
  const keep = (
    outcome: LatencySelectionOutcome["outcome"],
    reason: string,
    bucketUpperBoundTokens: number | null = null,
    candidates: readonly LatencySelectionCandidate[] = [],
  ): LatencySelectionOutcome => ({
    outcome,
    chosenEndpointId: input.routerChosenEndpointId,
    bucketUpperBoundTokens,
    candidates,
    reason,
  });

  if (!input.enabled) {
    return keep("disabled", "measured-latency selection input is not authorized");
  }
  const bounds = [...input.tokenBucketUpperBounds].sort((left, right) => left - right);
  if (bounds.length === 0) {
    return keep("no_candidates", "no prompt-size buckets are configured");
  }
  const tokens = Math.max(0, Math.floor(input.estimatedInputTokens));
  const matchedIndex = bounds.findIndex((bound) => tokens <= bound);
  // `bounds` is non-empty here (guarded above), so the last entry is always defined; the explicit fallback
  // keeps the assertion out of the code without inventing a bound.
  const bucketUpperBoundTokens =
    bounds[matchedIndex === -1 ? bounds.length - 1 : matchedIndex] ?? bounds[bounds.length - 1];
  if (typeof bucketUpperBoundTokens !== "number") {
    return keep("no_candidates", "no prompt-size buckets are configured");
  }
  const eligible = new Set(input.eligibleEndpointIds);
  const ranked = input.buckets
    .filter(
      (bucket) =>
        bucket.bucketUpperBoundTokens === bucketUpperBoundTokens && eligible.has(bucket.endpointId),
    )
    .map((bucket) => ({
      endpointId: bucket.endpointId,
      p95LatencyMs: bucket.p95LatencyMs,
      sampleCount: bucket.sampleCount,
    }))
    .sort((left, right) =>
      left.p95LatencyMs === right.p95LatencyMs
        ? left.endpointId.localeCompare(right.endpointId)
        : left.p95LatencyMs - right.p95LatencyMs,
    );
  // The cap bounds the work, not the baseline: the router's own candidate is always carried so the
  // comparison stays valid even when it is the slowest eligible endpoint.
  const limit = Math.max(1, Math.floor(input.maxCandidates));
  const routerCandidateInRanked = ranked.find(
    (candidate) => candidate.endpointId === input.routerChosenEndpointId,
  );
  const candidates = (
    routerCandidateInRanked && !ranked.slice(0, limit).includes(routerCandidateInRanked)
      ? [
          routerCandidateInRanked,
          ...ranked.filter((candidate) => candidate !== routerCandidateInRanked),
        ]
      : ranked
  )
    .slice(0, limit)
    // The baseline is carried for comparison, not promoted: the reported order stays best-first.
    .sort((left, right) =>
      left.p95LatencyMs === right.p95LatencyMs
        ? left.endpointId.localeCompare(right.endpointId)
        : left.p95LatencyMs - right.p95LatencyMs,
    );
  if (candidates.length === 0) {
    return keep("no_candidates", "no eligible endpoint has measured latency for this bucket");
  }
  const routerCandidate = candidates.find(
    (candidate) => candidate.endpointId === input.routerChosenEndpointId,
  );
  if (!routerCandidate) {
    return keep(
      "insufficient_evidence",
      "the router's chosen endpoint has no measured latency for this bucket",
      bucketUpperBoundTokens,
      candidates,
    );
  }
  const best = candidates[0];
  if (!best) {
    return keep(
      "insufficient_evidence",
      "no candidate carries measured latency for this bucket",
      bucketUpperBoundTokens,
      candidates,
    );
  }
  if (best.endpointId === routerCandidate.endpointId) {
    return keep(
      "kept_router_choice",
      "the router's chosen endpoint already has the best measured p95 for this bucket",
      bucketUpperBoundTokens,
      candidates,
    );
  }
  const improvementMs = routerCandidate.p95LatencyMs - best.p95LatencyMs;
  if (improvementMs <= input.maxDeltaMs) {
    return keep(
      "kept_router_choice",
      `the best candidate improves p95 by ${improvementMs}ms, inside the configured ${input.maxDeltaMs}ms delta`,
      bucketUpperBoundTokens,
      candidates,
    );
  }
  return {
    outcome: "selected_faster_candidate",
    chosenEndpointId: best.endpointId,
    bucketUpperBoundTokens,
    candidates,
    reason: `${best.endpointId} improves p95 by ${improvementMs}ms for this bucket, beyond the configured ${input.maxDeltaMs}ms delta`,
  };
}
