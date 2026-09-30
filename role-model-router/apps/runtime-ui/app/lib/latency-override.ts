/**
 * Post-lock addendum-03 (operator directive): the measured-latency override is one switch.
 *
 * The override itself is the learning-policy flag `latencySelectionEnabled`. Its stage, window, sample
 * floor, threshold and candidate bounds are ordinary policy fields with a schema-driven editor on
 * Learning -> Configuration, so this page must not re-expose them: it reads the flag and writes the flag.
 */

export const LATENCY_COMPARISON_METRIC_COPY = "p50 + 0.25 × (p95 − p50)";

/** The learning-policy field the checkbox reads and writes. */
export const LATENCY_SELECTION_ENABLED_FIELD = "latencySelectionEnabled";

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

export interface LatencyOverrideToggleView {
  /** The saved flag; null when the readback does not publish it. */
  readonly enabled: boolean | null;
  /** False when the runtime build does not publish the field at all. */
  readonly published: boolean;
}

/**
 * Reads the single enable flag. A runtime that does not publish the field is reported as unpublished
 * rather than being guessed, so the page can disable the checkbox and say why.
 */
export function buildLatencyOverrideToggle(
  fields: readonly LatencyPolicyFieldReadback[],
): LatencyOverrideToggleView {
  const field = fields.find((entry) => entry.name === LATENCY_SELECTION_ENABLED_FIELD);
  if (!field || typeof field.value !== "boolean") {
    return { enabled: null, published: false };
  }
  return { enabled: field.value, published: true };
}
