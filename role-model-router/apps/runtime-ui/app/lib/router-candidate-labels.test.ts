import { describe, expect, test } from "vitest";

import { formatCandidateLatencyLine } from "./router-candidate-labels";

describe("formatCandidateLatencyLine", () => {
  test("uses latency_ms_p50 and latency_ms_p95 from the observed profile", () => {
    expect(
      formatCandidateLatencyLine({
        latency_ms: 999,
        latency_ms_p50: 120,
        latency_ms_p95: 410,
      }),
    ).toBe("Latency p50 120 ms • p95 410 ms");
  });

  test("shows n/a when percentile fields are missing even if latency_ms is present", () => {
    expect(formatCandidateLatencyLine({ latency_ms: 999 })).toBe("Latency p50 n/a ms • p95 n/a ms");
  });

  test("accepts camelCase percentile aliases", () => {
    expect(
      formatCandidateLatencyLine({
        latencyMsP50: 65,
        latencyMsP95: 180,
      }),
    ).toBe("Latency p50 65 ms • p95 180 ms");
  });
});
