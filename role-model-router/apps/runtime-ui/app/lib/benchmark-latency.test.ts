import { describe, expect, test } from "vitest";

import { computeLatencyPercentiles } from "./benchmark-latency";

describe("computeLatencyPercentiles", () => {
  test("returns p50 and p95 for benchmark case latencies", () => {
    expect(computeLatencyPercentiles([100, 200, 300, 400, 500])).toEqual({
      p50: 300,
      p95: 500,
    });
  });

  test("returns null percentiles when no values are available", () => {
    expect(computeLatencyPercentiles([])).toEqual({ p50: null, p95: null });
  });
});
