/**
 * Run 99 - view models for the Learning live panel and history page.
 *
 * The runtime exposes two read-only projections (`operator/learning/activity` and
 * `operator/learning/history`). Everything here is a pure normaliser: an unreadable or
 * partial payload becomes an explicit unavailable/empty state, never a fabricated number.
 */

export interface LearningPipelineStage {
  readonly stage: "capture" | "replay" | "evaluation" | "learner";
  readonly label: string;
  readonly pending: number;
  /**
   * Run 100 addendum `evaluation-lease-wedge-repair.addendum-02` S4: non-terminal work with no live lease.
   * `pending` counts work something can still pick up; this counts work nothing can, which is what the
   * operator needs to see when the panel would otherwise report it "in flight".
   */
  readonly wedged: number;
  readonly recent: number;
  readonly active: boolean;
  readonly lastEventAtMs: number | null;
}

export interface LearningBudgetView {
  readonly day: string;
  readonly counterfactuals: {
    readonly used: number;
    readonly limit: number;
    readonly percent: number;
  };
  readonly dispatches: { readonly used: number; readonly limit: number; readonly percent: number };
  readonly byKind: readonly {
    readonly kind: string;
    readonly count: number;
    readonly share: number;
  }[];
}

export interface LearningActivityEvent {
  readonly atMs: number;
  readonly kind: "replay" | "evaluation" | "learner";
  readonly id: string;
  readonly outcome: string;
  readonly detail: string | null;
}

export interface LearningActivityView {
  readonly available: boolean;
  readonly reason: string | null;
  readonly observedAtMs: number | null;
  readonly windowMinutes: number;
  readonly pipeline: readonly LearningPipelineStage[];
  readonly budget: LearningBudgetView;
  readonly recent: readonly LearningActivityEvent[];
}

export interface LearningHistoryBucket {
  readonly startMs: number;
  readonly endMs: number;
  readonly replays: number;
  readonly refusals: number;
  readonly deferred: number;
  readonly branches: number;
  readonly evaluations: number;
  readonly validations: number;
  readonly activations: number;
  readonly total: number;
}

export interface LearningComparisonDelta {
  readonly comparisonId: string;
  readonly delta: number;
  readonly lower: number | null;
  readonly upper: number | null;
  readonly decisive: boolean;
}

export interface LearningTimelineEntry {
  readonly atMs: number;
  readonly kind: "activate" | "rollback" | "breach";
  readonly packageId: string;
  readonly state: string;
  readonly cohortPercent: number | null;
  readonly detail: string | null;
}

export interface LearningGuardrailRow {
  readonly metric: string;
  readonly label: string;
  readonly limit: number;
  readonly observed: number | null;
  readonly status: "ok" | "firing" | "no-data";
  readonly unit: string;
}

export interface LearningHistoryView {
  readonly available: boolean;
  readonly reason: string | null;
  readonly observedAtMs: number | null;
  readonly windowHours: number;
  readonly bucketHours: number;
  readonly policyVersion: number | null;
  readonly buckets: readonly LearningHistoryBucket[];
  readonly totals: {
    readonly replays: number;
    readonly refusals: number;
    readonly deferred: number;
    readonly evaluations: number;
    readonly comparisons: number;
    readonly decisive: number;
    readonly validations: number;
    readonly activations: number;
    readonly rollbacks: number;
    readonly guardrailBreaches: number;
    readonly advisoryObserved: number;
    readonly advisoryWouldHaveChanged: number;
  };
  readonly mix: {
    readonly candidate: number;
    readonly source: number;
    readonly tie: number;
    readonly insufficient: number;
    readonly decisiveShare: number;
    readonly deltas: readonly LearningComparisonDelta[];
    readonly worst: LearningComparisonDelta | null;
  };
  readonly timeline: readonly LearningTimelineEntry[];
  readonly guardrails: readonly LearningGuardrailRow[];
  readonly guardrailsFiring: number;
}

const STAGE_LABELS: Record<string, string> = {
  capture: "Capture",
  replay: "Replay",
  evaluation: "Evaluation",
  learner: "Learner",
};

const GUARDRAIL_META: Record<string, { label: string; unit: string }> = {
  qualityMinDelta: { label: "Quality delta", unit: "score" },
  costMaxMultiplier: { label: "Cost", unit: "×baseline" },
  latencyP95MaxDeltaMs: { label: "p95 latency", unit: "ms" },
  errorRateMaxDeltaPp: { label: "Error rate", unit: "pp" },
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asArray = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);

const asNumber = (value: unknown, fallback = 0): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const asNullableNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const asText = (value: unknown, fallback = ""): string =>
  typeof value === "string" && value.length > 0 ? value : fallback;

const percentOf = (used: number, limit: number): number =>
  limit > 0 ? Math.min(100, Math.max(0, (used / limit) * 100)) : 0;

export const EMPTY_LEARNING_ACTIVITY: LearningActivityView = Object.freeze({
  available: false,
  reason: null,
  observedAtMs: null,
  windowMinutes: 60,
  pipeline: [],
  budget: {
    day: "",
    counterfactuals: { used: 0, limit: 0, percent: 0 },
    dispatches: { used: 0, limit: 0, percent: 0 },
    byKind: [],
  },
  recent: [],
});

export const EMPTY_LEARNING_HISTORY: LearningHistoryView = Object.freeze({
  available: false,
  reason: null,
  observedAtMs: null,
  windowHours: 168,
  bucketHours: 6,
  policyVersion: null,
  buckets: [],
  totals: {
    replays: 0,
    refusals: 0,
    deferred: 0,
    evaluations: 0,
    comparisons: 0,
    decisive: 0,
    validations: 0,
    activations: 0,
    rollbacks: 0,
    guardrailBreaches: 0,
    advisoryObserved: 0,
    advisoryWouldHaveChanged: 0,
  },
  mix: {
    candidate: 0,
    source: 0,
    tie: 0,
    insufficient: 0,
    decisiveShare: 0,
    deltas: [],
    worst: null,
  },
  timeline: [],
  guardrails: [],
  guardrailsFiring: 0,
});

export function normalizeLearningActivity(value: unknown): LearningActivityView {
  const record = asRecord(value);
  if (Object.keys(record).length === 0) return EMPTY_LEARNING_ACTIVITY;

  const pipeline = asArray(record.pipeline).map((entry) => {
    const stage = asRecord(entry);
    const id = asText(stage.stage, "unknown");
    return {
      stage: id as LearningPipelineStage["stage"],
      label: STAGE_LABELS[id] ?? id,
      pending: Math.max(0, Math.round(asNumber(stage.pending))),
      wedged: Math.max(0, Math.round(asNumber(stage.wedged))),
      recent: Math.max(0, Math.round(asNumber(stage.recent))),
      active: stage.active === true,
      lastEventAtMs: asNullableNumber(stage.lastEventAtMs),
    };
  });

  const budgetRecord = asRecord(record.budget);
  const counterfactualRecord = asRecord(budgetRecord.counterfactuals);
  const dispatchRecord = asRecord(budgetRecord.dispatches);
  const counterfactuals = {
    used: Math.max(0, Math.round(asNumber(counterfactualRecord.used))),
    limit: Math.max(0, Math.round(asNumber(counterfactualRecord.limit))),
  };
  const dispatches = {
    used: Math.max(0, Math.round(asNumber(dispatchRecord.used))),
    limit: Math.max(0, Math.round(asNumber(dispatchRecord.limit))),
  };
  const kindTotal = asArray(budgetRecord.byKind).reduce<number>(
    (sum, entry) => sum + Math.max(0, Math.round(asNumber(asRecord(entry).count))),
    0,
  );
  const byKind = asArray(budgetRecord.byKind).map((entry) => {
    const kind = asRecord(entry);
    const count = Math.max(0, Math.round(asNumber(kind.count)));
    return {
      kind: asText(kind.kind, "unknown"),
      count,
      share: kindTotal > 0 ? count / kindTotal : 0,
    };
  });

  const recent = asArray(record.recent)
    .map((entry) => {
      const event = asRecord(entry);
      return {
        atMs: asNumber(event.atMs),
        kind: asText(event.kind, "replay") as LearningActivityEvent["kind"],
        id: asText(event.id),
        outcome: asText(event.outcome, "unknown"),
        detail: typeof event.detail === "string" && event.detail.length > 0 ? event.detail : null,
      };
    })
    .filter((event) => event.atMs > 0)
    .sort((left, right) => right.atMs - left.atMs);

  return {
    available: true,
    reason: null,
    observedAtMs: asNullableNumber(record.observedAtMs),
    windowMinutes: Math.max(1, Math.round(asNumber(asRecord(record.window).minutes, 60))),
    pipeline,
    budget: {
      day: asText(budgetRecord.day),
      counterfactuals: {
        ...counterfactuals,
        percent: percentOf(counterfactuals.used, counterfactuals.limit),
      },
      dispatches: { ...dispatches, percent: percentOf(dispatches.used, dispatches.limit) },
      byKind,
    },
    recent,
  };
}

export function normalizeLearningHistory(value: unknown): LearningHistoryView {
  const record = asRecord(value);
  if (Object.keys(record).length === 0) return EMPTY_LEARNING_HISTORY;

  const buckets = asArray(record.buckets).map((entry) => {
    const bucket = asRecord(entry);
    const replays = Math.max(0, Math.round(asNumber(bucket.replays)));
    const refusals = Math.max(0, Math.round(asNumber(bucket.refusals)));
    const deferred = Math.max(0, Math.round(asNumber(bucket.deferred)));
    const evaluations = Math.max(0, Math.round(asNumber(bucket.evaluations)));
    const validations = Math.max(0, Math.round(asNumber(bucket.validations)));
    const activations = Math.max(0, Math.round(asNumber(bucket.activations)));
    return {
      startMs: asNumber(bucket.startMs),
      endMs: asNumber(bucket.endMs),
      replays,
      refusals,
      deferred,
      branches: Math.max(0, Math.round(asNumber(bucket.branches))),
      evaluations,
      validations,
      activations,
      total: replays + refusals + deferred + evaluations + validations + activations,
    };
  });

  const totalsRecord = asRecord(record.totals);
  const mixRecord = asRecord(record.comparisonMix);
  const deltas = asArray(mixRecord.deltas)
    .map((entry) => {
      const delta = asRecord(entry);
      return {
        comparisonId: asText(delta.comparisonId),
        delta: asNumber(delta.delta),
        lower: asNullableNumber(delta.lower),
        upper: asNullableNumber(delta.upper),
        decisive: delta.decisive === true,
      };
    })
    .filter((entry) => Number.isFinite(entry.delta));
  const candidate = Math.max(0, Math.round(asNumber(mixRecord.candidate)));
  const source = Math.max(0, Math.round(asNumber(mixRecord.source)));
  const tie = Math.max(0, Math.round(asNumber(mixRecord.tie)));
  const insufficient = Math.max(0, Math.round(asNumber(mixRecord.insufficient)));
  const mixTotal = candidate + source + tie + insufficient;
  const worst = deltas.length
    ? deltas.reduce((lowest, entry) => (entry.delta < lowest.delta ? entry : lowest), deltas[0])
    : null;

  const timeline = asArray(record.activationTimeline)
    .map((entry) => {
      const row = asRecord(entry);
      const kind = asText(row.kind, "activate");
      return {
        atMs: asNumber(row.atMs),
        kind: (kind === "rollback" || kind === "breach"
          ? kind
          : "activate") as LearningTimelineEntry["kind"],
        packageId: asText(row.packageId),
        state: asText(row.state, "unknown"),
        cohortPercent: asNullableNumber(row.cohortPercent),
        detail: typeof row.detail === "string" && row.detail.length > 0 ? row.detail : null,
      };
    })
    .filter((entry) => entry.atMs > 0)
    .sort((left, right) => right.atMs - left.atMs);

  const guardrails = asArray(record.guardrails).map((entry) => {
    const row = asRecord(entry);
    const metric = asText(row.metric, "unknown");
    const meta = GUARDRAIL_META[metric] ?? { label: metric, unit: "" };
    const status = asText(row.status, "no-data");
    return {
      metric,
      label: meta.label,
      unit: meta.unit,
      limit: asNumber(row.limit),
      observed: asNullableNumber(row.observed),
      status: (status === "ok" || status === "firing"
        ? status
        : "no-data") as LearningGuardrailRow["status"],
    };
  });

  return {
    available: true,
    reason: null,
    observedAtMs: asNullableNumber(record.observedAtMs),
    windowHours: Math.max(1, Math.round(asNumber(asRecord(record.window).hours, 168))),
    bucketHours: Math.max(1, Math.round(asNumber(asRecord(record.window).bucketHours, 6))),
    policyVersion: asNullableNumber(record.policyVersion),
    buckets,
    totals: {
      replays: Math.max(0, Math.round(asNumber(totalsRecord.replays))),
      refusals: Math.max(0, Math.round(asNumber(totalsRecord.refusals))),
      deferred: Math.max(0, Math.round(asNumber(totalsRecord.deferred))),
      evaluations: Math.max(0, Math.round(asNumber(totalsRecord.evaluations))),
      comparisons: Math.max(0, Math.round(asNumber(totalsRecord.comparisons))),
      decisive: Math.max(0, Math.round(asNumber(totalsRecord.decisive))),
      validations: Math.max(0, Math.round(asNumber(totalsRecord.validations))),
      activations: Math.max(0, Math.round(asNumber(totalsRecord.activations))),
      rollbacks: Math.max(0, Math.round(asNumber(totalsRecord.rollbacks))),
      guardrailBreaches: Math.max(0, Math.round(asNumber(totalsRecord.guardrailBreaches))),
      advisoryObserved: Math.max(0, Math.round(asNumber(totalsRecord.advisoryObserved))),
      advisoryWouldHaveChanged: Math.max(
        0,
        Math.round(asNumber(totalsRecord.advisoryWouldHaveChanged)),
      ),
    },
    mix: {
      candidate,
      source,
      tie,
      insufficient,
      decisiveShare: mixTotal > 0 ? (candidate + source) / mixTotal : 0,
      deltas,
      worst,
    },
    timeline,
    guardrails,
    guardrailsFiring: guardrails.filter((row) => row.status === "firing").length,
  };
}

/** 7 rows (weekday) x columns (bucket) intensity grid, one cell per bucket. */
export function historyHeatmap(buckets: readonly LearningHistoryBucket[]): {
  readonly cells: readonly {
    readonly startMs: number;
    readonly weekday: number;
    readonly column: number;
    readonly value: number;
    readonly intensity: number;
  }[];
  readonly max: number;
  readonly columns: number;
  readonly worstStartMs: number | null;
} {
  if (buckets.length === 0) return { cells: [], max: 0, columns: 0, worstStartMs: null };
  const max = buckets.reduce((highest, bucket) => Math.max(highest, bucket.total), 0);
  const columns = buckets.length;
  let worstStartMs: number | null = null;
  let worstValue = -1;
  const cells = buckets.map((bucket, column) => {
    const date = new Date(bucket.startMs);
    // Monday-first week, matching the reference "Latency by hour" grid.
    const weekday = (date.getDay() + 6) % 7;
    if (bucket.total > worstValue) {
      worstValue = bucket.total;
      worstStartMs = bucket.total > 0 ? bucket.startMs : worstStartMs;
    }
    return {
      startMs: bucket.startMs,
      weekday,
      column,
      value: bucket.total,
      intensity: max > 0 ? bucket.total / max : 0,
    };
  });
  return { cells, max, columns, worstStartMs };
}

export function formatRelativeAge(atMs: number | null, nowMs: number): string {
  if (atMs === null || !Number.isFinite(atMs)) return "no data";
  const age = Math.max(0, nowMs - atMs);
  if (age < 60_000) return `${Math.round(age / 1000)}s ago`;
  if (age < 3_600_000) return `${Math.round(age / 60_000)}m ago`;
  if (age < 86_400_000) return `${Math.round(age / 3_600_000)}h ago`;
  return `${Math.round(age / 86_400_000)}d ago`;
}

export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return "0";
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 10_000) return `${(value / 1_000).toFixed(1)}k`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(2)}k`;
  return `${Math.round(value)}`;
}

export function formatBucketLabel(startMs: number, bucketHours: number): string {
  const date = new Date(startMs);
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hour = `${date.getHours()}`.padStart(2, "0");
  return bucketHours >= 24 ? `${month}-${day}` : `${month}-${day} ${hour}:00`;
}

/**
 * Run 98 addendum 44 `A44-S3` (`AC-R12-01`): the numbers the Learning Overview owes the operator that were
 * missing from it — the applied share, the fallback counts by reason, and the profile-inspection state. Each
 * helper answers `null`/empty rather than inventing a value, so a surface can say "not reported" honestly.
 */

/** The share of observed decisions the advisory was actually applied to; null when nothing was observed. */
export function appliedShareOf(advisory: unknown): number | null {
  const record = asRecordValue(advisory);
  const applied = numberOrNull(record?.applied);
  const observed = numberOrNull(record?.observed);
  if (applied === null || observed === null || observed <= 0) return null;
  return applied / observed;
}

/** Fallback reasons, most frequent first, bounded so one long tail cannot grow the panel without limit. */
export function fallbackReasonRows(
  advisory: unknown,
  limit = 4,
): readonly { readonly reason: string; readonly count: number }[] {
  const reasons = asRecordValue(asRecordValue(advisory)?.fallbackReasons);
  if (!reasons) return [];
  return Object.entries(reasons)
    .flatMap(([reason, count]) => {
      const numeric = numberOrNull(count);
      return numeric !== null && numeric > 0 ? [{ reason, count: numeric }] : [];
    })
    .sort(
      (left, right) => right.count - left.count || left.reason.localeCompare(right.reason, "en"),
    )
    .slice(0, Math.max(0, limit));
}

/**
 * The profile-inspection readback is unavailable in the packaged stage (the host answers a bounded 503), so
 * the Overview reports that as a first-class state with its reason instead of an error or a blank.
 */
export function profileInspectionView(payload: unknown): {
  readonly state: "available" | "unavailable";
  readonly reason: string | null;
} {
  const record = asRecordValue(payload);
  const reason =
    typeof record?.reason === "string" && record.reason.trim() ? record.reason.trim() : null;
  if (!record || record.error === "operator_capability_unavailable") {
    return { state: "unavailable", reason };
  }
  // Run 113: the route answers the bounded inspection document, and its own `state` is the authority. A
  // document that says `unavailable` (with its reason) must not render as "available" merely because it
  // arrived without an error field - measured live, the projection's "no current estimate for this scope
  // yet" document was being shown as an available profile inspection.
  if (record.state === "unavailable") {
    return { state: "unavailable", reason };
  }
  return { state: "available", reason };
}

export function formatPercentShare(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

function asRecordValue(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
