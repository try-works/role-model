import { describe, expect, test } from "vitest";

import {
  LATENCY_COMPARISON_METRIC_COPY,
  LATENCY_SELECTION_ENABLED_FIELD,
  buildLatencyOverrideToggle,
} from "./latency-override";

const flagField = (value: unknown) => [
  {
    name: "latencySelectionEnabled",
    type: "boolean",
    default: false,
    value,
    uiEditable: true,
    unit: "flag",
    description: "",
  },
];

const policyFields = [
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
];

/**
 * Post-lock addendum-03 (operator directive): the measured-latency override is one switch. The stage,
 * window, sample floor, threshold and candidate bounds are learning-policy fields edited on
 * Learning -> Configuration, so this page reads and writes the single enable flag and nothing else.
 */
describe("measured-latency override toggle", () => {
  test("states the comparison metric verbatim", () => {
    expect(LATENCY_COMPARISON_METRIC_COPY).toBe("p50 + 0.25 × (p95 − p50)");
  });

  test("reads the single enable flag out of the learning policy readback", () => {
    expect(buildLatencyOverrideToggle(flagField(true))).toEqual({ enabled: true, published: true });
    expect(buildLatencyOverrideToggle(flagField(false))).toEqual({
      enabled: false,
      published: true,
    });
  });

  test("reports a readback that does not publish the flag instead of inventing a value", () => {
    expect(buildLatencyOverrideToggle([])).toEqual({ enabled: null, published: false });
    expect(buildLatencyOverrideToggle(policyFields)).toEqual({ enabled: null, published: false });
  });

  test("names the policy field the checkbox writes", () => {
    expect(LATENCY_SELECTION_ENABLED_FIELD).toBe("latencySelectionEnabled");
  });
});
