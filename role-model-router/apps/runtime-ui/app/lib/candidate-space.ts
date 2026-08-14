import type { RouterCandidate } from "./runtime-api";

export type CandidateSpacePoint = {
  readonly endpointId: string;
  readonly modelId: string;
  readonly label: string;
  /** Cost efficiency 0–1; higher = cheaper (axis inverted in the plot). */
  readonly cost: number;
  /** Quality 0–1. */
  readonly quality: number;
  /** Speed 0–1; higher = lower latency. */
  readonly speed: number;
  /** Composite route score 0–1 (drives marker size + legend). */
  readonly routeScore: number;
  readonly selected: boolean;
  readonly excluded: boolean;
  readonly tags: readonly string[];
  readonly colorToken: CandidateSpaceColorToken;
};

export type CandidateSpaceColorToken = "serria" | "royal" | "emerald" | "coral" | "muted";

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

const COLOR_CYCLE: readonly CandidateSpaceColorToken[] = ["serria", "royal", "emerald", "coral"];

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

function shortModelLabel(modelId: string): string {
  const leaf = modelId.includes("/") ? (modelId.split("/").at(-1) ?? modelId) : modelId;
  return leaf.length > 28 ? `${leaf.slice(0, 27)}…` : leaf;
}

function scoreQuality(candidate: RouterCandidate): number {
  const fromRouting = candidate.routingQualityScore;
  if (typeof fromRouting === "number" && Number.isFinite(fromRouting)) {
    return clamp01(fromRouting);
  }
  const blend = candidate.routingBenchmarkQuality?.quality_score;
  if (typeof blend === "number" && Number.isFinite(blend)) {
    return clamp01(blend);
  }
  const overall = candidate.benchmarkCapability?.overallScore;
  if (typeof overall === "number" && Number.isFinite(overall)) {
    return clamp01(overall);
  }
  const profile = asRecord(candidate.latestProfile);
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
  return 0.55;
}

function scoreSpeed(candidate: RouterCandidate, fastestLatencyMs: number): number {
  const profile = asRecord(candidate.latestProfile);
  const latencyP50 = pickNumber(
    profile,
    "latency_ms_p50",
    "latencyMsP50",
    "latency_ms",
    "latencyMs",
  );
  if (latencyP50 !== null && latencyP50 >= 0) {
    // Ratio to the cohort’s fastest p50 — higher = faster.
    // Avoids pinning the slowest model to S0 (reads as “no latency data”).
    const fastest = Math.max(fastestLatencyMs, 1);
    return clamp01(fastest / Math.max(latencyP50, 1));
  }
  return candidate.sourceType === "local" ? 0.78 : 0.55;
}

function readInputCostPer1M(
  candidate: RouterCandidate,
  pricingByModelId?: ReadonlyMap<string, number>,
): number | null {
  const profile = asRecord(candidate.latestProfile);
  const pricing = asRecord(profile?.pricing);
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
): number {
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
  if (candidate.sourceType === "local") {
    return 0.88;
  }
  return 0.58;
}

function scoreRoute(cost: number, quality: number, speed: number): number {
  return clamp01(0.34 * quality + 0.33 * cost + 0.33 * speed);
}

function candidateTags(candidate: RouterCandidate, selected: boolean, excluded: boolean): string[] {
  const tags: string[] = [];
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

/**
 * Build plottable candidate-space points from router candidates.
 * Cost/speed use ratio-to-best within the cohort when samples exist (not 1−value/max).
 * Optional `pricingByModelId` supplies models.dev input $/1M when profiles omit pricing.
 */
export function buildCandidateSpacePoints(
  candidates: readonly RouterCandidate[],
  limit = 5,
  pricingByModelId?: ReadonlyMap<string, number>,
): readonly CandidateSpacePoint[] {
  const eligible = candidates.filter((candidate) => !isExcluded(candidate));
  const pool = (eligible.length > 0 ? eligible : candidates).slice();

  const latencies = pool
    .map((candidate) =>
      pickNumber(asRecord(candidate.latestProfile), "latency_ms_p50", "latencyMsP50", "latency_ms"),
    )
    .filter((value): value is number => value !== null && value >= 0);
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
        right.routeScore - left.routeScore ||
        left.candidate.modelId.localeCompare(right.candidate.modelId, "en"),
    )
    .slice(0, Math.max(0, limit));

  const selectedId =
    ranked.find((row) => row.candidate.controllerEligible || row.candidate.preferred)?.candidate
      .endpointId ?? ranked[0]?.candidate.endpointId;

  return ranked.map((row, index) => {
    const excluded = isExcluded(row.candidate);
    const selected = row.candidate.endpointId === selectedId && !excluded;
    return {
      endpointId: row.candidate.endpointId,
      modelId: row.candidate.modelId,
      label: shortModelLabel(row.candidate.modelId),
      cost: row.cost,
      quality: row.quality,
      speed: row.speed,
      routeScore: row.routeScore,
      selected,
      excluded,
      tags: candidateTags(row.candidate, selected, excluded),
      colorToken: excluded ? "muted" : (COLOR_CYCLE[index % COLOR_CYCLE.length] ?? "serria"),
    };
  });
}

/** Project C/Q/S into the Paper isometric viewBox (400×340). */
export function projectCandidateSpacePoint(point: {
  readonly cost: number;
  readonly quality: number;
  readonly speed: number;
  readonly routeScore: number;
}): CandidateSpaceProjection {
  const cost = clamp01(point.cost);
  const quality = clamp01(point.quality);
  const speed = clamp01(point.speed);
  const floorX = VIEW.originX + cost * VIEW.costDx + speed * VIEW.speedDx;
  const floorY = VIEW.originY + cost * VIEW.costDy + speed * VIEW.speedDy;
  const markerX = floorX;
  const markerY = floorY - quality * VIEW.qualityLift;
  const radius = 8 + clamp01(point.routeScore) * 8;
  return { floorX, floorY, markerX, markerY, radius };
}

export function formatCandidateMetricTriplet(point: CandidateSpacePoint): string {
  const c = Math.round(point.cost * 100);
  const q = Math.round(point.quality * 100);
  const s = Math.round(point.speed * 100);
  const suffix = point.tags.length > 0 ? ` · ${point.tags.join(" · ")}` : "";
  return `C${c} · Q${q} · S${s}${suffix}`;
}

export function formatRouteScore(score: number): string {
  if (!Number.isFinite(score)) {
    return "—";
  }
  return score.toFixed(3);
}

export const CANDIDATE_SPACE_VIEW = VIEW;
