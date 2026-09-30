import { describe, expect, test } from "vitest";

import {
  ROUTING_MODE_NAMES,
  ROUTING_MODE_OPTIONS,
  SCORING_PRESETS,
  SCORING_STRATEGY_NAMES,
  SCORING_STRATEGY_OPTIONS,
  WEIGHT_METRICS,
  WEIGHT_SUM_TOLERANCE,
  buildRoutingPatchDocument,
  canonicalizeRoutingDocument,
  formatCanonicalRoutingAlias,
  formatRoutingModeLabel,
  formatScoringStrategyLabel,
  isLegacyRoutingModeSpelling,
  isLegacyScoringStrategySpelling,
  normalizeRoutingModeValue,
  normalizeScoringStrategyValue,
  readWeightProfile,
  resolveRoutingPostureSummary,
  showsCustomWeightEditor,
  validateWeightProfile,
  weightsSum,
} from "./routing-mode";

describe("run 103 routing vocabulary", () => {
  test("publishes exactly the run-103 mode and scoring vocabularies", () => {
    expect(ROUTING_MODE_NAMES).toEqual(["baseline", "difficulty", "hybrid", "intelligent"]);
    expect(SCORING_STRATEGY_NAMES).toEqual(["balanced", "quality", "latency", "cost", "custom"]);
    expect(WEIGHT_METRICS).toEqual([
      "quality",
      "latency",
      "throughput",
      "cost",
      "reliability",
      "preference",
    ]);
    expect(ROUTING_MODE_OPTIONS.map((option) => option.value)).toEqual([...ROUTING_MODE_NAMES]);
    expect(SCORING_STRATEGY_OPTIONS.map((option) => option.value)).toEqual([
      ...SCORING_STRATEGY_NAMES,
    ]);
  });

  test("labels Intelligent exactly as the design document does and keeps the stored value", () => {
    const intelligent = ROUTING_MODE_OPTIONS.find((option) => option.value === "intelligent");
    expect(intelligent?.label).toBe("Intelligent");
    expect(formatRoutingModeLabel("intelligent")).toBe("Intelligent");
    expect(formatRoutingModeLabel("controller")).toBe("Intelligent");
    expect(formatRoutingModeLabel("basic")).toBe("Baseline");
    expect(formatRoutingModeLabel("not-a-mode")).toBe("unset");
    expect(formatRoutingModeLabel(null)).toBe("unset");
  });

  test("normalizes legacy mode spellings on read and never widens the vocabulary", () => {
    expect(normalizeRoutingModeValue("controller")).toBe("intelligent");
    expect(normalizeRoutingModeValue(" basic ")).toBe("baseline");
    expect(normalizeRoutingModeValue("difficulty")).toBe("difficulty");
    expect(normalizeRoutingModeValue("hybrid")).toBe("hybrid");
    // Scoring spellings are not modes: the old page collapsed them onto baseline, so a legacy
    // `latency` file would have silently rendered as Baseline with no way to notice.
    expect(normalizeRoutingModeValue("balanced")).toBeNull();
    expect(normalizeRoutingModeValue("latency")).toBeNull();
    expect(normalizeRoutingModeValue("")).toBeNull();
    expect(normalizeRoutingModeValue(undefined)).toBeNull();
  });

  test("normalizes every documented legacy scoring spelling and rejects unknown ones", () => {
    expect(normalizeScoringStrategyValue("balanced")).toBe("balanced");
    expect(normalizeScoringStrategyValue("baseline")).toBe("balanced");
    expect(normalizeScoringStrategyValue("basic")).toBe("balanced");
    expect(normalizeScoringStrategyValue("high-quality")).toBe("quality");
    expect(normalizeScoringStrategyValue("quality")).toBe("quality");
    expect(normalizeScoringStrategyValue("low-latency")).toBe("latency");
    expect(normalizeScoringStrategyValue("latency-first")).toBe("latency");
    expect(normalizeScoringStrategyValue("low-cost")).toBe("cost");
    expect(normalizeScoringStrategyValue("custom")).toBe("custom");
    expect(normalizeScoringStrategyValue("craft-ask")).toBeNull();
    expect(normalizeScoringStrategyValue("org.routing.v2")).toBeNull();
    expect(formatScoringStrategyLabel("quality")).toBe("Quality");
    expect(formatScoringStrategyLabel("latency-first")).toBe("Latency");
    expect(formatScoringStrategyLabel("org.routing.v2")).toBe("unrecognized strategy");
  });

  test("detects the legacy spellings a save has to migrate", () => {
    expect(isLegacyRoutingModeSpelling("controller")).toBe(true);
    expect(isLegacyRoutingModeSpelling("basic")).toBe(true);
    expect(isLegacyRoutingModeSpelling("intelligent")).toBe(false);
    expect(isLegacyScoringStrategySpelling("latency-first")).toBe(true);
    expect(isLegacyScoringStrategySpelling("baseline")).toBe(true);
    expect(isLegacyScoringStrategySpelling("balanced")).toBe(false);
    expect(isLegacyScoringStrategySpelling("custom")).toBe(false);
  });

  test("mirrors the core preset weight profiles and keeps them summing to 1", () => {
    for (const strategy of ["balanced", "quality", "latency", "cost"] as const) {
      const preset = SCORING_PRESETS[strategy];
      expect(Object.keys(preset).sort()).toEqual([...WEIGHT_METRICS].sort());
      expect(Math.abs(weightsSum(preset) - 1)).toBeLessThanOrEqual(WEIGHT_SUM_TOLERANCE);
      expect(validateWeightProfile(preset).ok).toBe(true);
    }
    expect(SCORING_PRESETS.balanced).toEqual({
      quality: 0.3,
      latency: 0.2,
      throughput: 0.1,
      cost: 0.2,
      reliability: 0.15,
      preference: 0.05,
    });
    expect(SCORING_PRESETS.quality.quality).toBe(0.5);
    expect(SCORING_PRESETS.latency.latency).toBe(0.45);
    expect(SCORING_PRESETS.cost.cost).toBe(0.5);
  });

  test("blocks a weight profile whose sum leaves the 1 +- 0.001 window", () => {
    const drifted = { ...SCORING_PRESETS.balanced, preference: 0.06 };
    const validation = validateWeightProfile(drifted);
    expect(validation.ok).toBe(false);
    expect(validation.sum).toBeCloseTo(1.01, 5);
    expect(validation.sumError).toMatch(/sum/i);
    const withinTolerance = { ...SCORING_PRESETS.balanced, preference: 0.0505 };
    expect(validateWeightProfile(withinTolerance).ok).toBe(true);
  });

  test("reads a weight profile from the config readback and refuses a malformed one", () => {
    expect(readWeightProfile({ ...SCORING_PRESETS.cost })).toEqual(SCORING_PRESETS.cost);
    expect(readWeightProfile({ ...SCORING_PRESETS.cost, quality: "0.15" })).toBeNull();
    expect(readWeightProfile({ ...SCORING_PRESETS.cost, preference: 2 })).toBeNull();
    expect(readWeightProfile(null)).toBeNull();
    expect(readWeightProfile("custom")).toBeNull();
  });

  test("derives the canonical routing alias from the resolved posture, not the raw string", () => {
    expect(formatCanonicalRoutingAlias("intelligent", "remote_only")).toBe(
      "controller.remote-only",
    );
    expect(formatCanonicalRoutingAlias("controller", "hybrid")).toBe("controller.hybrid");
    expect(formatCanonicalRoutingAlias("basic", "decision_only")).toBe("baseline.decision-only");
    expect(formatCanonicalRoutingAlias("difficulty", "local_only")).toBe("difficulty.local-only");
    expect(formatCanonicalRoutingAlias(null, "hybrid")).toBe("default.hybrid");
    expect(formatCanonicalRoutingAlias("org.routing.v2", "hybrid")).toBe("default.hybrid");
  });

  test("summarizes the saved posture and names where the effective values came from", () => {
    const structured = resolveRoutingPostureSummary({
      routing: {
        legacyStrategy: null,
        mode: "intelligent",
        scoringStrategy: "custom",
        pinWeights: true,
        weights: { ...SCORING_PRESETS.cost },
        degradations: [],
      },
      persisted: { strategy: "controller", executionMode: "hybrid" },
    });
    expect(structured.mode).toBe("intelligent");
    expect(structured.modeLabel).toBe("Intelligent");
    expect(structured.scoringStrategy).toBe("custom");
    expect(structured.pinWeights).toBe(true);
    expect(structured.weights).toEqual(SCORING_PRESETS.cost);
    expect(structured.source).toBe("routing-block");
    expect(structured.routingAliasId).toBe("controller.hybrid");

    const legacy = resolveRoutingPostureSummary({
      routing: {
        legacyStrategy: "latency-first",
        mode: "baseline",
        scoringStrategy: "latency",
        pinWeights: false,
        weights: null,
        degradations: [],
      },
      persisted: { strategy: "latency-first", executionMode: "remote_only" },
    });
    expect(legacy.source).toBe("legacy-string");
    expect(legacy.legacyStrategy).toBe("latency-first");
    expect(legacy.scoringStrategyLabel).toBe("Latency");
    expect(legacy.routingAliasId).toBe("baseline.remote-only");
  });

  test("migrates a legacy string the runtime config readback still carries", () => {
    const modeOnly = resolveRoutingPostureSummary({
      routing: null,
      persisted: { strategy: "controller", executionMode: "remote_only" },
    });
    expect(modeOnly.mode).toBe("intelligent");
    expect(modeOnly.scoringStrategy).toBeNull();
    expect(modeOnly.routingAliasId).toBe("controller.remote-only");
    expect(modeOnly.source).toBe("legacy-string");

    const scoringOnly = resolveRoutingPostureSummary({
      routing: null,
      persisted: { strategy: "latency-first", executionMode: "hybrid" },
    });
    expect(scoringOnly.mode).toBe("baseline");
    expect(scoringOnly.scoringStrategy).toBe("latency");
    expect(scoringOnly.routingAliasId).toBe("baseline.hybrid");

    const noPosture = resolveRoutingPostureSummary({
      routing: null,
      persisted: { strategy: "craft-ask", executionMode: "hybrid" },
    });
    expect(noPosture.source).toBe("default");
    expect(noPosture.routingAliasId).toBe("default.hybrid");
  });

  test("canonicalizes the raw config editor document before it is written", () => {
    const result = canonicalizeRoutingDocument({
      version: "1.0",
      routingStrategy: "latency-first",
      routing: { mode: "controller", scoring_strategy: "high-quality" },
    });
    expect(result.document.routingStrategy).toBe("latency");
    expect(result.document.routing).toEqual({
      mode: "intelligent",
      scoring_strategy: "quality",
    });
    expect(result.migrated).toHaveLength(3);

    const craftAsk = canonicalizeRoutingDocument({ version: "1.0", routingStrategy: "craft-ask" });
    expect("routingStrategy" in craftAsk.document).toBe(false);
    const canonical = canonicalizeRoutingDocument({
      version: "1.0",
      routing: { mode: "intelligent", scoring_strategy: "quality" },
    });
    expect(canonical.migrated).toEqual([]);
    // An unknown spelling stays untouched so the runtime rejects it instead of the UI guessing.
    const unknown = canonicalizeRoutingDocument({
      version: "1.0",
      routing: { mode: "turbo" },
    });
    expect(unknown.document.routing).toEqual({ mode: "turbo" });
  });

  test("builds a canonical patch document and never persists a legacy synonym", () => {
    const built = buildRoutingPatchDocument({
      mode: "controller",
      routing: {
        legacyStrategy: "latency-first",
        mode: "controller",
        scoringStrategy: "high-quality",
        pinWeights: false,
        weights: null,
        degradations: [],
      },
      scoringStrategy: "latency-first",
      weights: null,
      pinWeights: false,
      executionScope: "remote_only",
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.document).toEqual({
      routing: {
        mode: "intelligent",
        scoring_strategy: "latency",
        pin_weights: false,
      },
      execution_mode: "remote_only",
    });

    const custom = buildRoutingPatchDocument({
      mode: "baseline",
      routing: null,
      scoringStrategy: "custom",
      weights: { ...SCORING_PRESETS.quality },
      pinWeights: true,
      executionScope: "hybrid",
    });
    expect(custom.ok).toBe(true);
    if (!custom.ok) return;
    expect(custom.document).toEqual({
      routing: {
        mode: "baseline",
        scoring_strategy: "custom",
        pin_weights: true,
        weights: { ...SCORING_PRESETS.quality },
      },
      execution_mode: "hybrid",
    });

    const presetWithWeights = buildRoutingPatchDocument({
      mode: "baseline",
      routing: null,
      scoringStrategy: "quality",
      weights: { ...SCORING_PRESETS.quality },
      pinWeights: false,
      executionScope: "hybrid",
    });
    expect(presetWithWeights.ok).toBe(true);
    if (!presetWithWeights.ok) return;
    // The config contract rejects weights unless the strategy is custom, so the page must never
    // submit them for a preset.
    expect(presetWithWeights.document.routing).toEqual({
      mode: "baseline",
      scoring_strategy: "quality",
      pin_weights: false,
    });

    const invalid = buildRoutingPatchDocument({
      mode: "baseline",
      routing: null,
      scoringStrategy: "custom",
      weights: { ...SCORING_PRESETS.quality, cost: 0.9 },
      pinWeights: false,
      executionScope: "hybrid",
    });
    expect(invalid.ok).toBe(false);
    if (invalid.ok) return;
    expect(invalid.error).toMatch(/sum/i);
  });

  /**
   * Post-lock repair 4 (operator report): "Save and apply strategy ... just stays baseline". The builder
   * derived the mode from the saved readback instead of the operator's selection, so a mode change was
   * written back as the mode that was already saved.
   */
  test("writes the mode the operator selected, not the mode that was already saved", () => {
    const built = buildRoutingPatchDocument({
      mode: "intelligent",
      routing: {
        legacyStrategy: null,
        mode: "baseline",
        scoringStrategy: "balanced",
        pinWeights: false,
        weights: null,
        degradations: [],
      },
      scoringStrategy: "balanced",
      weights: null,
      pinWeights: false,
      executionScope: "remote_only",
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.document).toEqual({
      routing: {
        mode: "intelligent",
        scoring_strategy: "balanced",
        pin_weights: false,
      },
      execution_mode: "remote_only",
    });

    for (const selected of ["difficulty", "hybrid", "intelligent"] as const) {
      const next = buildRoutingPatchDocument({
        mode: selected,
        routing: null,
        scoringStrategy: "cost",
        weights: null,
        pinWeights: false,
        executionScope: "remote_only",
      });
      expect(next.ok).toBe(true);
      if (!next.ok) return;
      expect(next.document.routing).toMatchObject({ mode: selected });
    }
  });

  test("rejects a mode outside the vocabulary instead of writing it", () => {
    const built = buildRoutingPatchDocument({
      mode: "turbo",
      routing: null,
      scoringStrategy: "balanced",
      weights: null,
      pinWeights: false,
      executionScope: "remote_only",
    });
    expect(built.ok).toBe(false);
    if (built.ok) return;
    expect(built.error).toMatch(/mode/i);
  });

  /**
   * Post-lock repair 4 (operator report): the weights were rendered whatever the scoring strategy was,
   * captioned "Enabled when the scoring strategy is Custom", so the page looked like it always ran on
   * hand-tuned weights. The editor belongs to the custom strategy and to nothing else.
   */
  test("exposes the custom weight editor only for the custom scoring strategy", () => {
    expect(showsCustomWeightEditor("custom")).toBe(true);
    expect(showsCustomWeightEditor(" custom ")).toBe(true);
    expect(showsCustomWeightEditor("balanced")).toBe(false);
    expect(showsCustomWeightEditor("quality")).toBe(false);
    expect(showsCustomWeightEditor("latency-first")).toBe(false);
    expect(showsCustomWeightEditor(null)).toBe(false);
    expect(showsCustomWeightEditor("")).toBe(false);
  });
});
