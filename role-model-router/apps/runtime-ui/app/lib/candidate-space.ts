import { formatCompactEndpointDisplayName } from "./effort-identity";
import type { RouterCandidate } from "./runtime-api";

export type CandidateSpacePoint = {
  readonly endpointId: string;
  readonly modelId: string;
  readonly label: string;
  /** Cost efficiency 0–1; higher = cheaper (axis inverted in the plot). Null when no pricing evidence. */
  readonly cost: number | null;
  /** Quality 0–1. Null when no benchmark/routing/profile evidence. */
  readonly quality: number | null;
  /** Speed 0–1; higher = lower latency. Null when no latency evidence. */
  readonly speed: number | null;
  /** Composite route score 0–1 (drives marker size + legend). Null when no metric evidence exists. */
  readonly routeScore: number | null;
  /** Whether all, some, or none of the C/Q/S axes carry real evidence. */
  readonly evidence: "none" | "partial" | "complete";
  readonly selected: boolean;
  readonly excluded: boolean;
  readonly tags: readonly string[];
  readonly colorToken: CandidateSpaceColorToken;
  /** Canonical candidate-state classification (R5 8-state model). */
  readonly candidateState: CandidateState;
  /** How many candidate points were actually rendered in this projection. */
  readonly rendered: number;
  /** Total candidate pool size the projection started from (pre-truncation). */
  readonly total: number;
};

export type CandidateSpaceColorToken =
  | "serria"
  | "royal"
  | "emerald"
  | "coral"
  | "azure"
  | "pink"
  | "violet"
  | "amber"
  | "error"
  | "cache"
  | "throughput"
  | "latency"
  | "green"
  | "blue"
  | "purple"
  | "orange"
  | "sky"
  | "teal"
  | "mint"
  | "rose"
  | "sage"
  | "cobalt"
  | "blush"
  | "lilac"
  | "mustard"
  | "mist"
  | "remote"
  | "local"
  | "queue"
  | "muted";

/**
 * Canonical candidate-state model (R5). Fixed precedence in `deriveCandidateState`:
 * degraded → selected → benchmark-available → no-benchmark → usable →
 * insufficient-samples → failed-only → no-requests.
 */
export type CandidateState =
  | "no-requests"
  | "failed-only"
  | "insufficient-samples"
  | "usable"
  | "no-benchmark"
  | "benchmark-available"
  | "selected"
  | "degraded";

export type CandidateSpaceProjection = {
  readonly floorX: number;
  readonly floorY: number;
  readonly markerX: number;
  readonly markerY: number;
  readonly radius: number;
};

const VIEW = {
  width: 400,
  height: 340,
  originX: 200,
  originY: 175,
  costDx: -116.9,
  costDy: 67.5,
  speedDx: 116.9,
  speedDy: 67.5,
  qualityLift: 135,
} as const;

/**
 * Extended RM3-based palette for simultaneously-visible candidate markers.
 * The first four mirror the legacy cycle tokens for backwards compatibility;
 * the rest scale well beyond seven without repeating.
 */
const COLOR_PALETTE: readonly CandidateSpaceColorToken[] = [
  "serria",
  "royal",
  "emerald",
  "coral",
  "azure",
  "pink",
  "violet",
  "amber",
  "cache",
  "throughput",
  "latency",
  "green",
  "blue",
  "purple",
  "orange",
  "sky",
  "teal",
  "mint",
  "rose",
  "sage",
  "cobalt",
  "blush",
  "lilac",
  "mustard",
  "mist",
  "remote",
  "local",
  "queue",
];

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Assign a deterministic-by-identity color token for a candidate.
 * The preferred token is derived from a stable hash of `endpointId`, so the
 * mapping is stable across input orderings/re-ranking. When that preferred
 * token is already claimed by another simultaneously-visible candidate, fall
 * back to the first unused palette token — guaranteeing no two visible
 * candidates share a color. Mirrors `pickDistinctSeriesColorToken`.
 */
export function assignCandidateColorToken(
  endpointId: string,
  usedColorTokens: Set<CandidateSpaceColorToken>,
): CandidateSpaceColorToken {
  const preferred =
    COLOR_PALETTE[hashString(endpointId) % COLOR_PALETTE.length] ?? ("serria" as const);
  if (!usedColorTokens.has(preferred)) {
    usedColorTokens.add(preferred);
    return preferred;
  }
  const fallback = COLOR_PALETTE.find((token) => !usedColorTokens.has(token)) ?? preferred;
  usedColorTokens.add(fallback);
  return fallback;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function pickNumber(record: Record<string, unknown> | null, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

function shortModelLabel(candidate: RouterCandidate): string {
  const leaf = candidate.modelId.includes("/")
    ? (candidate.modelId.split("/").at(-1) ?? candidate.modelId)
    : candidate.modelId;
  return formatCompactEndpointDisplayName({
    base: candidate.displayName ?? leaf,
    reasoningEffort: candidate.reasoningEffort,
    maxLength: 28,
  });
}

function scoreQuality(candidate: RouterCandidate): number | null {
  const overall = candidate.benchmarkCapability?.overallScore;
  if (typeof overall === "number" && Number.isFinite(overall)) {
    return clamp01(overall);
  }
  const fromRouting = candidate.routingQualityScore;
  if (typeof fromRouting === "number" && Number.isFinite(fromRouting)) {
    return clamp01(fromRouting);
  }
  const blend = candidate.routingBenchmarkQuality?.quality_score;
  if (typeof blend === "number" && Number.isFinite(blend)) {
    return clamp01(blend);
  }
  const profile = asRecord(candidate.operationalProfile ?? candidate.latestProfile);
  const fromProfile = pickNumber(
    profile,
    "quality_score",
    "qualityScore",
    "judge_score",
    "judgeScore",
  );
  if (fromProfile !== null) {
    return clamp01(fromProfile > 1 ? fromProfile / 100 : fromProfile);
  }
  // Honest no-data: never synthesize a quality score.
  return null;
}

function scoreSpeed(candidate: RouterCandidate, fastestLatencyMs: number): number | null {
  const profile = asRecord(candidate.operationalProfile ?? candidate.latestProfile);
  const latencyP50 = pickNumber(
    profile,
    "latency_ms_p50",
    "latencyMsP50",
    "latency_ms",
    "latencyMs",
  );
  if (latencyP50 !== null && latencyP50 > 0) {
    // Ratio to the cohort’s fastest p50 — higher = faster.
    // Avoids pinning the slowest model to S0 (reads as “no latency data”).
    // Zero/negative latency is treated as absent, not as "fastest".
    const fastest = Math.max(fastestLatencyMs, 1);
    return clamp01(fastest / Math.max(latencyP50, 1));
  }
  return null;
}

function readInputCostPer1M(
  candidate: RouterCandidate,
  pricingByModelId?: ReadonlyMap<string, number>,
): number | null {
  const profile = asRecord(candidate.operationalProfile ?? candidate.latestProfile);
  const pricing = asRecord(candidate.pricing) ?? asRecord(profile?.pricing);
  const fromProfile = pickNumber(
    pricing ?? profile,
    "inputPer1M",
    "input_per_1m",
    "cost_per_1m_input",
    "inputCostPer1M",
  );
  if (fromProfile !== null && fromProfile >= 0) {
    return fromProfile;
  }
  const fromModels = pricingByModelId?.get(candidate.modelId);
  if (typeof fromModels === "number" && Number.isFinite(fromModels) && fromModels >= 0) {
    return fromModels;
  }
  return null;
}

function scoreCost(
  candidate: RouterCandidate,
  cheapestInputPer1M: number,
  pricingByModelId?: ReadonlyMap<string, number>,
): number | null {
  const inputCost = readInputCostPer1M(candidate, pricingByModelId);
  if (inputCost !== null) {
    // Free / zero-priced models sit at the cost axis tip.
    if (inputCost <= 0) {
      return 1;
    }
    // Ratio to the cohort’s cheapest input $/1M — higher = cheaper (axis inverted).
    // Avoids pinning the priciest model to C0 (reads as “no pricing”).
    const cheapest = Math.max(cheapestInputPer1M, 0.0001);
    return clamp01(cheapest / inputCost);
  }
  // Honest no-data: never synthesize a cost score.
  return null;
}

function scoreRoute(
  cost: number | null,
  quality: number | null,
  speed: number | null,
): number | null {
  const parts: number[] = [];
  const weights: number[] = [];
  if (cost !== null) {
    parts.push(cost);
    weights.push(0.33);
  }
  if (quality !== null) {
    parts.push(quality);
    weights.push(0.34);
  }
  if (speed !== null) {
    parts.push(speed);
    weights.push(0.33);
  }
  if (parts.length === 0) {
    return null;
  }
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const weighted = parts.reduce((sum, part, index) => sum + part * (weights[index] ?? 0), 0);
  return clamp01(weighted / totalWeight);
}

function evidenceOf(
  cost: number | null,
  quality: number | null,
  speed: number | null,
): "none" | "partial" | "complete" {
  const present = [cost, quality, speed].filter((value) => value !== null).length;
  if (present === 0) {
    return "none";
  }
  if (present === 3) {
    return "complete";
  }
  return "partial";
}

function candidateTags(candidate: RouterCandidate, selected: boolean, excluded: boolean): string[] {
  const tags: string[] = [];
  if (typeof candidate.benchmarkCapability?.overallScore === "number") {
    tags.push(
      candidate.benchmarkCapability.evidenceSource === "run-artifact"
        ? "Benchmark run"
        : "Benchmark profile",
    );
  }
  const operationalProfile = asRecord(candidate.operationalProfile ?? candidate.latestProfile);
  if (operationalProfile?.profile_scope === "live-request-operational") {
    tags.push("Live telemetry");
  } else {
    tags.push("No live telemetry");
  }
  if (selected) {
    tags.push("Selected");
  }
  if (excluded) {
    tags.push("Excluded");
  }
  if (candidate.sourceType === "local") {
    tags.push("Local");
  }
  return tags;
}

function isExcluded(candidate: RouterCandidate): boolean {
  return candidate.ignored === true || candidate.routingEligible === false;
}

function readTaskRollup(candidate: RouterCandidate) {
  const rollups = candidate.telemetryScores?.taskRollups;
  if (!rollups) {
    return null;
  }
  const keys = Object.keys(rollups);
  if (keys.length === 0) {
    return null;
  }
  return rollups[keys[0] ?? "default"] ?? null;
}

/**
 * Derive the canonical candidate state (R5 8-state model) with fixed precedence:
 * degraded → selected → benchmark-available → no-benchmark → usable →
 * insufficient-samples → failed-only → no-requests.
 * `selection` is injected by the caller (a candidate is "selected" only within
 * the projection that picks it; the underlying candidate carries no such flag).
 */
export function deriveCandidateState(
  candidate: RouterCandidate,
  selection?: { readonly selected: boolean },
): CandidateState {
  const token =
    candidate.healthStatus && candidate.healthStatus.length > 0
      ? candidate.healthStatus
      : (candidate.status ?? "");
  if (token === "degraded") {
    return "degraded";
  }
  const rollup = readTaskRollup(candidate);
  const sampleCount = rollup?.sampleCount;
  const minimumSampleCount = rollup?.minimumSampleCount;
  const failureCount = rollup?.failureCount ?? 0;
  const successCount = rollup?.successCount ?? 0;
  const hasSamples = typeof sampleCount === "number" && sampleCount > 0;
  const hasAnySuccess = successCount > 0;
  const hasAnyRequests = hasSamples || hasAnySuccess || failureCount > 0;

  if (!hasAnyRequests) {
    return "no-requests";
  }
  if (typeof sampleCount !== "number" || sampleCount <= 0 || (!hasAnySuccess && failureCount > 0)) {
    if (failureCount > 0 && !hasAnySuccess) {
      return "failed-only";
    }
    return "insufficient-samples";
  }
  if (typeof minimumSampleCount === "number" && sampleCount < minimumSampleCount) {
    return "insufficient-samples";
  }
  if (selection?.selected) {
    return "selected";
  }
  if (candidate.benchmarkCapability) {
    return "benchmark-available";
  }
  if (candidate.benchmarkCapability === null) {
    return "no-benchmark";
  }
  return "usable";
}

/**
 * Build plottable candidate-space points from router candidates.
 * Cost/speed use ratio-to-best within the cohort when samples exist (not 1−value/max).
 * Optional `pricingByModelId` supplies models.dev input $/1M when profiles omit pricing.
 */
export function buildCandidateSpacePoints(
  candidates: readonly RouterCandidate[],
  limit = Number.POSITIVE_INFINITY,
  pricingByModelId?: ReadonlyMap<string, number>,
): readonly CandidateSpacePoint[] {
  const eligible = candidates.filter((candidate) => !isExcluded(candidate));
  const pool = (eligible.length > 0 ? eligible : candidates).slice();
  const total = pool.length;

  const latencies = pool
    .map((candidate) =>
      pickNumber(
        asRecord(candidate.operationalProfile ?? candidate.latestProfile),
        "latency_ms_p50",
        "latencyMsP50",
        "latency_ms",
      ),
    )
    .filter((value): value is number => value !== null && value > 0);
  const fastestLatencyMs =
    latencies.length > 0 ? Math.min(...latencies.map((value) => Math.max(value, 1))) : 1_000;

  const costs = pool
    .map((candidate) => readInputCostPer1M(candidate, pricingByModelId))
    .filter((value): value is number => value !== null);
  const positiveCosts = costs.filter((value) => value > 0);
  const cheapestInputPer1M = positiveCosts.length > 0 ? Math.min(...positiveCosts) : 1;

  const ranked = pool
    .map((candidate) => {
      const cost = scoreCost(candidate, cheapestInputPer1M, pricingByModelId);
      const quality = scoreQuality(candidate);
      const speed = scoreSpeed(candidate, fastestLatencyMs);
      const routeScore = scoreRoute(cost, quality, speed);
      return { candidate, cost, quality, speed, routeScore };
    })
    .sort(
      (left, right) =>
        Number(right.candidate.controllerEligible === true) -
          Number(left.candidate.controllerEligible === true) ||
        Number(right.candidate.preferred === true) - Number(left.candidate.preferred === true) ||
        (right.routeScore ?? -1) - (left.routeScore ?? -1) ||
        left.candidate.modelId.localeCompare(right.candidate.modelId, "en"),
    );

  const visible = Number.isFinite(limit) ? ranked.slice(0, Math.max(0, limit)) : ranked;
  const rendered = visible.length;

  const selectedId =
    visible.find((row) => row.candidate.controllerEligible || row.candidate.preferred)?.candidate
      .endpointId ?? visible[0]?.candidate.endpointId;

  const usedColorTokens = new Set<CandidateSpaceColorToken>();
  return visible.map((row) => {
    const excluded = isExcluded(row.candidate);
    const selected = row.candidate.endpointId === selectedId && !excluded;
    return {
      endpointId: row.candidate.endpointId,
      modelId: row.candidate.modelId,
      label: shortModelLabel(row.candidate),
      cost: row.cost,
      quality: row.quality,
      speed: row.speed,
      routeScore: row.routeScore,
      evidence: evidenceOf(row.cost, row.quality, row.speed),
      selected,
      excluded,
      tags: candidateTags(row.candidate, selected, excluded),
      colorToken: excluded
        ? "muted"
        : assignCandidateColorToken(row.candidate.endpointId, usedColorTokens),
      candidateState: deriveCandidateState(row.candidate, { selected }),
      rendered,
      total,
    };
  });
}

/** Project C/Q/S into the Paper isometric viewBox (400×340). Missing axes sit at the origin. */
export function projectCandidateSpacePoint(point: {
  readonly cost: number | null;
  readonly quality: number | null;
  readonly speed: number | null;
  readonly routeScore: number | null;
}): CandidateSpaceProjection {
  const cost = clamp01(point.cost ?? 0);
  const quality = clamp01(point.quality ?? 0);
  const speed = clamp01(point.speed ?? 0);
  const floorX = VIEW.originX + cost * VIEW.costDx + speed * VIEW.speedDx;
  const floorY = VIEW.originY + cost * VIEW.costDy + speed * VIEW.speedDy;
  const markerX = floorX;
  const markerY = floorY - quality * VIEW.qualityLift;
  const radius = 8 + clamp01(point.routeScore ?? 0) * 8;
  return { floorX, floorY, markerX, markerY, radius };
}

function formatAxis(value: number | null): string {
  if (value === null) {
    return "—";
  }
  return String(Math.round(value * 100));
}

export function formatCandidateMetricTriplet(point: CandidateSpacePoint): string {
  const c = formatAxis(point.cost);
  const q = formatAxis(point.quality);
  const s = formatAxis(point.speed);
  const suffix = point.tags.length > 0 ? ` · ${point.tags.join(" · ")}` : "";
  return `C${c} · Q${q} · S${s}${suffix}`;
}

export function formatRouteScore(score: number | null): string {
  if (score === null || !Number.isFinite(score)) {
    return "—";
  }
  return score.toFixed(3);
}

export const CANDIDATE_SPACE_VIEW = VIEW;
