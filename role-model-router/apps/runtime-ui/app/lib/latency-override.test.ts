import { describe, expect, test } from "vitest";

import {
  LATENCY_COMPARISON_METRIC_COPY,
  buildLatencyOverrideDraft,
  summarizeLatencyOverrideEvidence,
  validateLatencyOverrideDraft,
} from "./latency-override";

const FIELDS = [
  {
    name: "latencySelectionEnabled",
    type: "boolean",
    default: false,
    value: false,
    uiEditable: true,
    unit: "flag",
    description: "",
  },
  {
    name: "latencySelectionMinStage",
    type: "enum",
    values: ["S0", "S1", "S2", "S3", "S4"],
    default: "S2",
    value: "S2",
    uiEditable: true,
    unit: "stage",
    description: "",
  },
  {
    name: "latencySelectionWindowHours",
    type: "integer",
    default: 24,
    value: 24,
    min: 1,
    max: 168,
    uiEditable: true,
    unit: "hours",
    description: "",
  },
  {
    name: "latencySelectionMinSamples",
    type: "integer",
    default: 5,
    value: 5,
    min: 5,
    max: 30,
    uiEditable: true,
    unit: "samples",
    description: "",
  },
  {
    name: "latencySelectionMaxDeltaMs",
    type: "integer",
    default: 10000,
    value: 2000,
    min: 0,
    max: 60000,
    uiEditable: true,
    unit: "ms",
    description: "",
  },
  {
    name: "latencySelectionBucketBounds",
    type: "string",
    default: "50000,150000",
    value: "50000,150000",
    uiEditable: true,
    unit: "tokens",
    description: "",
  },
  {
    name: "latencySelectionMaxCandidates",
    type: "integer",
    default: 4,
    value: 4,
    min: 1,
    max: 32,
    uiEditable: true,
    unit: "candidates",
    description: "",
  },
] as const;

describe("run 103 measured-latency override card", () => {
  test("states the comparison metric verbatim", () => {
    expect(LATENCY_COMPARISON_METRIC_COPY).toBe("p50 + 0.25 × (p95 − p50)");
  });

  test("builds the draft from the learning policy readback with its bounds and defaults", () => {
    const view = buildLatencyOverrideDraft(FIELDS);
    expect(view.draft).toEqual({
      enabled: false,
      minStage: "S2",
      windowHours: 24,
      minSamples: 5,
      maxDeltaMs: 2000,
      bucketBounds: "50000,150000",
      maxCandidates: 4,
    });
    expect(view.defaults.maxDeltaMs).toBe(10000);
    expect(view.defaults.minSamples).toBe(5);
    expect(view.bounds.minSamples).toEqual({ min: 5, max: 30 });
    expect(view.bounds.maxDeltaMs).toEqual({ min: 0, max: 60000 });
    expect(view.missingFields).toEqual([]);
    expect(view.stages).toEqual(["S0", "S1", "S2", "S3", "S4"]);
  });

  test("names the fields a runtime build does not publish instead of inventing defaults", () => {
    const view = buildLatencyOverrideDraft(
      FIELDS.filter((field) => field.name !== "latencySelectionEnabled"),
    );
    expect(view.missingFields).toEqual(["latencySelectionEnabled"]);
    expect(view.draft.enabled).toBeNull();
  });

  test("validates the draft against the published bounds and the 5..30 sample floor", () => {
    const view = buildLatencyOverrideDraft(FIELDS);
    const belowFloor = validateLatencyOverrideDraft({ ...view.draft, minSamples: 3 }, view.bounds);
    expect(belowFloor.ok).toBe(false);
    if (belowFloor.ok) return;
    expect(belowFloor.errors.minSamples).toMatch(/5/);
    const above = validateLatencyOverrideDraft({ ...view.draft, maxCandidates: 99 }, view.bounds);
    expect(above.ok).toBe(false);
    const badBounds = validateLatencyOverrideDraft(
      { ...view.draft, bucketBounds: "150000,50000" },
      view.bounds,
    );
    expect(badBounds.ok).toBe(false);
    if (badBounds.ok) return;
    expect(badBounds.errors.bucketBounds).toMatch(/increasing/i);
    const ok = validateLatencyOverrideDraft({ ...view.draft, minSamples: 6 }, view.bounds);
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.changes).toEqual({ latencySelectionMinSamples: 6 });
  });

  test("counts the latency evidence behind the current setting from the telemetry window", () => {
    const nowMs = 1_000_000_000;
    const rows = [
      {
        endpointId: "a",
        modelId: "m1",
        createdAtMs: nowMs - 60_000,
        latencyMs: 120,
        requestLatencyMs: 140,
      },
      {
        endpointId: "a",
        modelId: "m1",
        createdAtMs: nowMs - 120_000,
        latencyMs: 100,
        requestLatencyMs: null,
      },
      { endpointId: "b", modelId: "m2", createdAtMs: nowMs - 3 * 60 * 60 * 1000, latencyMs: 90 },
      { endpointId: "c", modelId: "m3", createdAtMs: nowMs - 60_000, latencyMs: null },
    ];
    const evidence = summarizeLatencyOverrideEvidence(rows, { windowHours: 1, nowMs });
    expect(evidence.sampleCount).toBe(2);
    expect(evidence.endpointIds).toEqual(["a"]);
    expect(evidence.modelIds).toEqual(["m1"]);
    expect(evidence.windowStartMs).toBe(nowMs - 60 * 60 * 1000);
    expect(evidence.samplesBelowFloor).toBe(true);
  });
});
