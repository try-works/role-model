/**
 * Run 103 / SP8 - the measured-latency override card of the Routing strategy page.
 *
 * The setting lives in the learning policy store, so the card reads and writes it through the
 * existing learning-policy API and renders whatever bounds that readback publishes. The evidence
 * counts come from the same telemetry window the policy reads, so the operator can see how far the
 * current sample count is from the configured floor.
 */

export const LATENCY_COMPARISON_METRIC_COPY = "p50 + 0.25 × (p95 − p50)";

export const LATENCY_SELECTION_FIELD_NAMES = [
  "latencySelectionEnabled",
  "latencySelectionMinStage",
  "latencySelectionWindowHours",
  "latencySelectionMinSamples",
  "latencySelectionMaxDeltaMs",
  "latencySelectionBucketBounds",
  "latencySelectionMaxCandidates",
] as const;

export const LATENCY_SELECTION_STAGES = ["S0", "S1", "S2", "S3", "S4"] as const;
export type LatencySelectionStage = (typeof LATENCY_SELECTION_STAGES)[number];

export interface LatencyPolicyFieldReadback {
  readonly name: string;
  readonly type: string;
  readonly values?: readonly string[];
  readonly default: unknown;
  readonly value: unknown;
  readonly min?: number;
  readonly max?: number;
  readonly unit?: string;
  readonly uiEditable?: boolean;
  readonly description?: string;
}

export interface LatencyOverrideDraft {
  readonly enabled: boolean | null;
  readonly minStage: LatencySelectionStage;
  readonly windowHours: number;
  readonly minSamples: number;
  readonly maxDeltaMs: number;
  readonly bucketBounds: string;
  readonly maxCandidates: number;
}

export interface LatencyOverrideBounds {
  readonly minSamples: { readonly min: number; readonly max: number };
  readonly maxDeltaMs: { readonly min: number; readonly max: number };
  readonly windowHours: { readonly min: number; readonly max: number };
  readonly maxCandidates: { readonly min: number; readonly max: number };
  readonly current: LatencyOverrideDraft;
  readonly defaults: LatencyOverrideDraft;
}

export interface LatencyOverrideView {
  readonly draft: LatencyOverrideDraft;
  readonly defaults: LatencyOverrideDraft;
  readonly bounds: LatencyOverrideBounds;
  readonly stages: readonly LatencySelectionStage[];
  readonly missingFields: readonly string[];
  readonly fieldsByName: Readonly<Record<string, LatencyPolicyFieldReadback>>;
}

const DEFAULT_MIN_SAMPLES = 5;
const DEFAULT_BOUNDS = {
  minSamples: { min: 5, max: 30 },
  maxDeltaMs: { min: 0, max: 60_000 },
  windowHours: { min: 1, max: 168 },
  maxCandidates: { min: 1, max: 32 },
} as const;

const DEFAULT_BUCKET_BOUNDS = "50000,150000";

function asRecord(fields: readonly LatencyPolicyFieldReadback[]): Readonly<
  Record<string, LatencyPolicyFieldReadback>
> {
  return Object.fromEntries(fields.map((field) => [field.name, field]));
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function readStage(value: unknown): LatencySelectionStage {
  return (LATENCY_SELECTION_STAGES as readonly string[]).includes(String(value))
    ? (value as LatencySelectionStage)
    : "S2";
}

function readInteger(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isSafeInteger(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function readBucketBoundsString(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  if (Array.isArray(value) && value.every((entry) => typeof entry === "number")) {
    return value.join(",");
  }
  return fallback;
}

/**
 * Builds the card's draft, defaults and bounds from the learning-policy readback. A field the
 * runtime does not publish is reported by name instead of being replaced with a guessed value.
 */
export function buildLatencyOverrideDraft(
  fields: readonly LatencyPolicyFieldReadback[],
): LatencyOverrideView {
  const fieldsByName = asRecord(fields);
  const missingFields = LATENCY_SELECTION_FIELD_NAMES.filter((name) => !(name in fieldsByName));
  const read = (name: (typeof LATENCY_SELECTION_FIELD_NAMES)[number]) => fieldsByName[name];

  const enabledField = read("latencySelectionEnabled");
  const stageField = read("latencySelectionMinStage");
  const windowField = read("latencySelectionWindowHours");
  const samplesField = read("latencySelectionMinSamples");
  const deltaField = read("latencySelectionMaxDeltaMs");
  const boundsField = read("latencySelectionBucketBounds");
  const candidatesField = read("latencySelectionMaxCandidates");

  const draft: LatencyOverrideDraft = {
    enabled: enabledField ? readBoolean(enabledField.value) : null,
    minStage: stageField ? readStage(stageField.value) : "S2",
    windowHours: windowField
      ? readInteger(windowField.value, readInteger(windowField.default, 24))
      : 24,
    minSamples: samplesField
      ? readInteger(samplesField.value, readInteger(samplesField.default, DEFAULT_MIN_SAMPLES))
      : DEFAULT_MIN_SAMPLES,
    maxDeltaMs: deltaField ? readInteger(deltaField.value, readInteger(deltaField.default, 10_000)) : 10_000,
    bucketBounds: boundsField
      ? readBucketBoundsString(boundsField.value, readBucketBoundsString(boundsField.default, DEFAULT_BUCKET_BOUNDS))
      : DEFAULT_BUCKET_BOUNDS,
    maxCandidates: candidatesField
      ? readInteger(candidatesField.value, readInteger(candidatesField.default, 4))
      : 4,
  };

  const defaults: LatencyOverrideDraft = {
    enabled: enabledField ? (readBoolean(enabledField.default) ?? false) : null,
    minStage: stageField ? readStage(stageField.default) : "S2",
    windowHours: windowField ? readInteger(windowField.default, 24) : 24,
    minSamples: samplesField
      ? readInteger(samplesField.default, DEFAULT_MIN_SAMPLES)
      : DEFAULT_MIN_SAMPLES,
    maxDeltaMs: deltaField ? readInteger(deltaField.default, 10_000) : 10_000,
    bucketBounds: boundsField
      ? readBucketBoundsString(boundsField.default, DEFAULT_BUCKET_BOUNDS)
      : DEFAULT_BUCKET_BOUNDS,
    maxCandidates: candidatesField ? readInteger(candidatesField.default, 4) : 4,
  };

  const bounds: LatencyOverrideBounds = {
    minSamples: {
      min: samplesField?.min ?? DEFAULT_BOUNDS.minSamples.min,
      max: samplesField?.max ?? DEFAULT_BOUNDS.minSamples.max,
    },
    maxDeltaMs: {
      min: deltaField?.min ?? DEFAULT_BOUNDS.maxDeltaMs.min,
      max: deltaField?.max ?? DEFAULT_BOUNDS.maxDeltaMs.max,
    },
    windowHours: {
      min: windowField?.min ?? DEFAULT_BOUNDS.windowHours.min,
      max: windowField?.max ?? DEFAULT_BOUNDS.windowHours.max,
    },
    maxCandidates: {
      min: candidatesField?.min ?? DEFAULT_BOUNDS.maxCandidates.min,
      max: candidatesField?.max ?? DEFAULT_BOUNDS.maxCandidates.max,
    },
    current: draft,
    defaults,
  };

  return {
    draft,
    defaults,
    bounds,
    stages: [...LATENCY_SELECTION_STAGES],
    missingFields,
    fieldsByName,
  };
}

export function parseBucketBounds(value: string): readonly number[] | null {
  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (parts.length === 0 || parts.length > 8) {
    return null;
  }
  const bounds: number[] = [];
  for (const part of parts) {
    const parsed = Number(part);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
      return null;
    }
    if (bounds.length > 0 && parsed <= (bounds[bounds.length - 1] ?? 0)) {
      return null;
    }
    bounds.push(parsed);
  }
  return bounds;
}

export type LatencyOverrideValidation =
  | {
      readonly ok: true;
      readonly changes: Readonly<Record<string, unknown>>;
      readonly bucketBounds: readonly number[];
    }
  | { readonly ok: false; readonly errors: Readonly<Record<string, string>> };

/**
 * Validates the draft against the bounds the readback published (the same ones the runtime enforces)
 * and returns only the fields that actually changed, in the flat names the learning policy uses.
 */
export function validateLatencyOverrideDraft(
  draft: LatencyOverrideDraft,
  bounds: LatencyOverrideBounds,
): LatencyOverrideValidation {
  const errors: Record<string, string> = {};
  if (
    draft.minSamples < bounds.minSamples.min ||
    draft.minSamples > bounds.minSamples.max
  ) {
    errors.minSamples = `must be between ${bounds.minSamples.min} and ${bounds.minSamples.max}`;
  }
  if (draft.maxDeltaMs < bounds.maxDeltaMs.min || draft.maxDeltaMs > bounds.maxDeltaMs.max) {
    errors.maxDeltaMs = `must be between ${bounds.maxDeltaMs.min} and ${bounds.maxDeltaMs.max} ms`;
  }
  if (draft.windowHours < bounds.windowHours.min || draft.windowHours > bounds.windowHours.max) {
    errors.windowHours = `must be between ${bounds.windowHours.min} and ${bounds.windowHours.max} hours`;
  }
  if (
    draft.maxCandidates < bounds.maxCandidates.min ||
    draft.maxCandidates > bounds.maxCandidates.max
  ) {
    errors.maxCandidates = `must be between ${bounds.maxCandidates.min} and ${bounds.maxCandidates.max}`;
  }
  const bucketBounds = parseBucketBounds(draft.bucketBounds);
  if (bucketBounds === null) {
    errors.bucketBounds = "must be 1..8 strictly increasing integer token bounds";
  }
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const current = bounds.current;
  const changes: Record<string, unknown> = {};
  if (draft.enabled !== null && draft.enabled !== current.enabled) {
    changes.latencySelectionEnabled = draft.enabled;
  }
  if (draft.minStage !== current.minStage) {
    changes.latencySelectionMinStage = draft.minStage;
  }
  if (draft.windowHours !== current.windowHours) {
    changes.latencySelectionWindowHours = draft.windowHours;
  }
  if (draft.minSamples !== current.minSamples) {
    changes.latencySelectionMinSamples = draft.minSamples;
  }
  if (draft.maxDeltaMs !== current.maxDeltaMs) {
    changes.latencySelectionMaxDeltaMs = draft.maxDeltaMs;
  }
  if (draft.bucketBounds !== current.bucketBounds) {
    changes.latencySelectionBucketBounds = draft.bucketBounds;
  }
  if (draft.maxCandidates !== current.maxCandidates) {
    changes.latencySelectionMaxCandidates = draft.maxCandidates;
  }
  return { ok: true, changes, bucketBounds: bucketBounds ?? [] };
}

export interface LatencyEvidenceRow {
  readonly endpointId: string;
  readonly modelId?: string | null;
  readonly createdAtMs: number;
  readonly latencyMs?: number | null;
  readonly requestLatencyMs?: number | null;
}

export interface LatencyEvidenceSummary {
  readonly sampleCount: number;
  readonly windowStartMs: number;
  readonly windowEndMs: number;
  readonly endpointIds: readonly string[];
  readonly modelIds: readonly string[];
  readonly samplesBelowFloor: boolean;
  readonly minSamples: number;
  /** Requests in the window that carried no usable latency sample. */
  readonly rowsWithoutSamples: number;
}

/**
 * Counts the latency samples the current setting would see. The policy reads request durations from
 * the same window, so the card can show how far the evidence is from the configured floor without
 * inventing a number.
 */
export function summarizeLatencyOverrideEvidence(
  rows: readonly LatencyEvidenceRow[],
  input: { readonly windowHours: number; readonly nowMs: number; readonly minSamples?: number },
): LatencyEvidenceSummary {
  const windowStartMs = input.nowMs - input.windowHours * 60 * 60 * 1_000;
  const minSamples = input.minSamples ?? DEFAULT_MIN_SAMPLES;
  const endpointIds = new Set<string>();
  const modelIds = new Set<string>();
  let sampleCount = 0;
  let rowsWithoutSamples = 0;
  for (const row of rows) {
    if (row.createdAtMs < windowStartMs || row.createdAtMs > input.nowMs) {
      continue;
    }
    const latency = row.requestLatencyMs ?? row.latencyMs ?? null;
    if (typeof latency !== "number" || !Number.isFinite(latency) || latency <= 0) {
      rowsWithoutSamples += 1;
      continue;
    }
    sampleCount += 1;
    endpointIds.add(row.endpointId);
    if (row.modelId) {
      modelIds.add(row.modelId);
    }
  }
  return {
    sampleCount,
    windowStartMs,
    windowEndMs: input.nowMs,
    endpointIds: [...endpointIds].sort((left, right) => left.localeCompare(right, "en")),
    modelIds: [...modelIds].sort((left, right) => left.localeCompare(right, "en")),
    samplesBelowFloor: sampleCount < minSamples,
    minSamples,
    rowsWithoutSamples,
  };
}

export function formatBucketLabel(bucketUpperBoundTokens: number | null): string {
  return bucketUpperBoundTokens === null
    ? "no prompt-size bucket matched"
    : `≤ ${bucketUpperBoundTokens} tokens`;
}
