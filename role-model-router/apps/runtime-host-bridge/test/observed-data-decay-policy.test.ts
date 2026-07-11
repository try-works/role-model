import { describe, expect, test } from "vitest";

import {
  DEFAULT_UNIFIED_RUNTIME_OBSERVED_DATA_CONFIG,
  normalizeUnifiedRuntimeConfigInput,
  parseUnifiedRuntimeConfigText,
  renderUnifiedRuntimeConfigText,
} from "../src/unified-runtime-config.js";

describe("observed-data decay policy (run-64 RED)", () => {
  test("default decay controls expose only latency and throughput percent-per-day settings", () => {
    const keys = Object.keys(
      DEFAULT_UNIFIED_RUNTIME_OBSERVED_DATA_CONFIG.metricDecayPercentPerDay,
    ).sort();
    expect(keys).toEqual(["latency", "throughput"]);
  });

  test("default latency and throughput decay values are 10 percent per day", () => {
    expect(DEFAULT_UNIFIED_RUNTIME_OBSERVED_DATA_CONFIG.metricDecayPercentPerDay.latency).toBe(10);
    expect(DEFAULT_UNIFIED_RUNTIME_OBSERVED_DATA_CONFIG.metricDecayPercentPerDay.throughput).toBe(
      10,
    );
  });

  test("parsed config exposes the renamed decay-percent-per-day contract", () => {
    const result = parseUnifiedRuntimeConfigText(`
version: "1.0"
observed_data:
  metric_decay_percent_per_day:
    latency: 10
    throughput: 10
`);

    const observedData = (result as Record<string, unknown>).observedData as
      | Record<string, unknown>
      | undefined;

    expect(observedData).toBeDefined();
    if (observedData) {
      const decay = observedData.metricDecayPercentPerDay as Record<string, number>;
      expect(Object.keys(decay).sort()).toEqual(["latency", "throughput"]);
      expect(decay.latency).toBe(10);
      expect(decay.throughput).toBe(10);
    }
  });

  test("legacy halflife keys are accepted but normalized to the new percent-per-day surface", () => {
    const result = parseUnifiedRuntimeConfigText(`
version: "1.0"
observed_data:
  metric_halflives:
    quality_ms: 900000
    reliability_ms: 600000
    cost_ms: 1800000
    latency_ms: 10
    throughput_ms: 10
`);

    const observedData = (result as Record<string, unknown>).observedData as
      | Record<string, unknown>
      | undefined;

    expect(observedData).toBeDefined();
    if (observedData) {
      const decay = observedData.metricDecayPercentPerDay as Record<string, number>;
      expect(Object.keys(decay).sort()).toEqual(["latency", "throughput"]);
      expect(decay.latency).toBe(10);
      expect(decay.throughput).toBe(10);
      expect((observedData as Record<string, unknown>).metricHalflives).toBeUndefined();
    }
  });

  test("rendered runtime config truth uses the new decay contract and omits legacy halflife keys", () => {
    const rendered = renderUnifiedRuntimeConfigText(
      normalizeUnifiedRuntimeConfigInput({
        version: "1.0",
        observedData: {
          enabled: true,
          aggregation: { minSamples: 2 },
          metricDecayPercentPerDay: {
            latency: 10,
            throughput: 10,
          },
          throughputSla: {
            enabled: true,
            minTokensPerSec: 24,
            penaltyTimeoutMs: 600000,
            penaltyFactor: 0,
          },
        },
      }) as unknown as Parameters<typeof renderUnifiedRuntimeConfigText>[0],
    );

    expect(rendered).toContain("metric_decay_percent_per_day:");
    expect(rendered).toContain("latency: 10");
    expect(rendered).toContain("throughput: 10");
    expect(rendered).not.toContain("metric_halflives:");
    expect(rendered).not.toContain("quality_ms:");
    expect(rendered).not.toContain("reliability_ms:");
    expect(rendered).not.toContain("cost_ms:");
  });
});
