import { expect, test } from "vitest";

import {
  type ObservedPerformanceSample,
  aggregateOperationalPerformanceSamples,
} from "../src/index.js";

function sample(sourceType: ObservedPerformanceSample["source_type"]): ObservedPerformanceSample {
  return {
    endpoint_id: "run104.endpoint",
    endpoint_version: "run104",
    model_id: "run104/model",
    reasoning_effort: "high",
    effort_source: "fixed",
    source_type: sourceType,
    timestamp_ms: 2_000,
    latency_ms: 250,
    latency_ms_p95: 250,
    failure: false,
    request_id: `run104-${sourceType}-2000`,
  };
}

/**
 * Run 104 / R14 (addendum-03): the persisted vocabulary adds `live`, so the operational projection must treat
 * a `live` sample as live traffic exactly like the legacy `live_request` value.
 */
test("run104: a persisted live sample counts as live traffic", () => {
  const profile = aggregateOperationalPerformanceSamples([sample("live")], { nowMs: 2_000 });
  expect(profile).toMatchObject({
    sample_size: 1,
    sources: { live_request_samples: 1, benchmark_samples: 0 },
  });
});

test("run104: the legacy live_request value still counts as live traffic", () => {
  const profile = aggregateOperationalPerformanceSamples([sample("live_request")], {
    nowMs: 2_000,
  });
  expect(profile).toMatchObject({
    sample_size: 1,
    sources: { live_request_samples: 1, benchmark_samples: 0 },
  });
});
