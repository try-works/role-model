import { readFileSync } from "node:fs";
import path from "node:path";

import { type RouteLearningDefaults } from "@role-model-router/core";

/**
 * Run 105 R11: the runtime read side of the routeLearning block in product-defaults.json.
 *
 * The read path is NET-NEW wiring: the runtime has no product-defaults loader today (the only 0.7
 * in the learner lives in extensions/evaluation-core/learning-integrity.mjs and gates a DIFFERENT
 * quantity - C4/D6). This loader deliberately mirrors readLearningPolicyFile:
 *  1. the durable operator state (first), then
 *  2. the shipped guidance copy (second), then
 *  3. the documented constants (always).
 * It DEGRADES - it never throws - so a missing or damaged file can never take routing down.
 *
 * R11: stalenessWindowDays is ONE constant used for both the request-count window and the idle
 * (plan drift check #7). All four values are bounded: an out-of-range value is refused to its
 * documented default rather than trusted.
 */

/** The shipped guidance copy, relative to the repository root. */
export const PRODUCT_DEFAULTS_RELATIVE_PATH =
  "fixtures/source-authority/crowdsourced-evals-docs/guidance/product-defaults.json";

/** Alternate layouts some packaged runtimes stage the guidance under. */
const PRODUCT_DEFAULTS_FALLBACK_PATHS = [
  "guidance/product-defaults.json",
  "crowdsourced-evals-docs/guidance/product-defaults.json",
] as const;

/** The durable operator override, relative to the resolved state root (two-tier resolution). */
export const PRODUCT_DEFAULTS_STATE_RELATIVE_PATH = "learning/product-defaults-state.json";

export const PRODUCT_DEFAULTS_SCHEMA_VERSION = "role-model.product-defaults.v2";

/**
 * R11: the documented shipped constants. Exported so a caller (and the runtime fallback) names the
 * same numbers the guidance copy carries, and so the "never throw" path has one definition.
 */
export const ROUTE_LEARNING_DOCUMENTED_DEFAULTS: RouteLearningDefaults = Object.freeze({
  minComparisons: 5,
  minConfidence: 0.7,
  stalenessWindowDays: 30,
  challengeBatchSize: 1,
});

export interface RouteLearningDefaultsDegradation {
  readonly reason:
    | "product_defaults_missing"
    | "product_defaults_unreadable"
    | "product_defaults_unknown_version";
  readonly detail: string;
  readonly source: string;
}

export interface RouteLearningDefaultsSnapshot {
  readonly routeLearning: RouteLearningDefaults;
  /** Which source answered: the durable state, the guidance copy, or the documented constants. */
  readonly source: string;
  /** Non-null when the answer came from a lower tier or a field was refused to its default. */
  readonly degradation: RouteLearningDefaultsDegradation | null;
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

/** A bounded integer, else its documented default. min is inclusive. */
function boundedInt(value: unknown, fallback: number, min: number): number {
  return Number.isSafeInteger(value) && Number(value) >= min ? Number(value) : fallback;
}

function boundedConfidence(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1
    ? value
    : fallback;
}

/**
 * R11: resolve one block field-by-field. A partial or out-of-range block is completed from the
 * documented constants rather than refused wholesale, so one typo does not disable the ladder.
 */
export function normalizeRouteLearningBlock(
  value: unknown,
  fallback: RouteLearningDefaults = ROUTE_LEARNING_DOCUMENTED_DEFAULTS,
): RouteLearningDefaults {
  const block = asRecord(value);
  return {
    minComparisons: boundedInt(block.minComparisons, fallback.minComparisons, 1),
    minConfidence: boundedConfidence(block.minConfidence, fallback.minConfidence),
    stalenessWindowDays: boundedInt(block.stalenessWindowDays, fallback.stalenessWindowDays, 1),
    challengeBatchSize: boundedInt(block.challengeBatchSize, fallback.challengeBatchSize, 0),
  };
}

interface ResolvedDefaultsDocument {
  readonly ok: true;
  readonly routeLearning: RouteLearningDefaults;
  readonly source: string;
}

interface FailedDefaultsDocument {
  readonly ok: false;
  readonly optional?: boolean;
  readonly degradation: RouteLearningDefaultsDegradation;
}

type DefaultsSourceResolution = ResolvedDefaultsDocument | FailedDefaultsDocument;

const degradation = (
  reason: RouteLearningDefaultsDegradation["reason"],
  detail: string,
  source: string,
): RouteLearningDefaultsDegradation => ({ reason, detail, source });

/** Read and normalize one candidate file; a missing file is "optional" (falls through). */
function resolveDefaultsFile(
  filePath: string,
  source: string,
  optional: boolean,
): DefaultsSourceResolution {
  let text: string;
  try {
    text = readFileSync(filePath, "utf8");
  } catch {
    return {
      ok: false,
      optional,
      degradation: degradation(
        "product_defaults_missing",
        "no readable product-defaults source",
        source,
      ),
    };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      degradation: degradation(
        "product_defaults_unreadable",
        "the product-defaults document could not be parsed: " + detail,
        source,
      ),
    };
  }
  const document = asRecord(parsed);
  if (document.schema !== undefined && document.schema !== PRODUCT_DEFAULTS_SCHEMA_VERSION) {
    return {
      ok: false,
      degradation: degradation(
        "product_defaults_unknown_version",
        "the product-defaults document declares an unknown schema " + String(document.schema),
        source,
      ),
    };
  }
  return { ok: true, routeLearning: normalizeRouteLearningBlock(document.routeLearning), source };
}

/** The durable operator state is the control plane; a foreign or damaged file is ignored. */
function resolveDurableDefaultsState(stateRoot: string | null | undefined): DefaultsSourceResolution {
  if (typeof stateRoot !== "string" || !stateRoot.trim()) {
    return {
      ok: false,
      optional: true,
      degradation: degradation(
        "product_defaults_missing",
        "no durable product-defaults state root is configured",
        PRODUCT_DEFAULTS_STATE_RELATIVE_PATH,
      ),
    };
  }
  return resolveDefaultsFile(
    path.join(stateRoot, PRODUCT_DEFAULTS_STATE_RELATIVE_PATH),
    PRODUCT_DEFAULTS_STATE_RELATIVE_PATH,
    true,
  );
}

/** The staged guidance copy is the shipped seed used before any operator change exists. */
function resolveStagedDefaultsFile(repoRoot: string): DefaultsSourceResolution {
  const candidates = [PRODUCT_DEFAULTS_RELATIVE_PATH, ...PRODUCT_DEFAULTS_FALLBACK_PATHS];
  let lastFailure: FailedDefaultsDocument | null = null;
  for (const relative of candidates) {
    const resolved = resolveDefaultsFile(path.join(repoRoot, relative), relative, false);
    if (resolved.ok) return resolved;
    // A file that EXISTS but is damaged is a real degradation and stops the search; a missing
    // file falls through to the next documented layout.
    if (resolved.optional !== true) lastFailure = resolved;
  }
  if (lastFailure) return lastFailure;
  return {
    ok: false,
    degradation: degradation(
      "product_defaults_missing",
      "no readable product-defaults source",
      PRODUCT_DEFAULTS_RELATIVE_PATH,
    ),
  };
}

/**
 * R11: resolve the routeLearning block with two-tier resolution (durable state, then the guidance
 * copy, then the documented constants). NEVER throws and always answers a complete block, so the
 * routing path degrades to the shipped defaults instead of failing.
 */
export function readRouteLearningDefaults(input: {
  readonly repoRoot: string;
  readonly channel: string;
  readonly stateRoot?: string | null;
}): RouteLearningDefaultsSnapshot {
  try {
    const durable = resolveDurableDefaultsState(input?.stateRoot);
    const staged = durable.ok ? null : resolveStagedDefaultsFile(String(input?.repoRoot ?? ""));
    const resolved = durable.ok ? durable : staged?.ok ? staged : null;
    if (resolved) {
      // A durable state that exists but cannot be read is a degradation even when the guidance
      // copy saves the day - the operator has to see why their override did not apply.
      const inherited =
        durable.ok === false &&
        durable.optional !== true &&
        resolved.source !== durable.degradation.source
          ? durable.degradation
          : null;
      return { routeLearning: resolved.routeLearning, source: resolved.source, degradation: inherited };
    }
    const stagedFailure = staged && staged.ok === false && staged.optional !== true ? staged.degradation : null;
    const durableFailure = durable.ok === false ? durable.degradation : null;
    const failure =
      stagedFailure ??
      durableFailure ??
      degradation(
        "product_defaults_missing",
        "no readable product-defaults source",
        PRODUCT_DEFAULTS_RELATIVE_PATH,
      );
    return {
      routeLearning: { ...ROUTE_LEARNING_DOCUMENTED_DEFAULTS },
      source: "documented_defaults",
      degradation: failure,
    };
  } catch {
    // Defence in depth: the contract is "never throw", so even an unforeseen failure answers.
    return {
      routeLearning: { ...ROUTE_LEARNING_DOCUMENTED_DEFAULTS },
      source: "documented_defaults",
      degradation: degradation(
        "product_defaults_missing",
        "the product-defaults read failed unexpectedly",
        PRODUCT_DEFAULTS_RELATIVE_PATH,
      ),
    };
  }
}
