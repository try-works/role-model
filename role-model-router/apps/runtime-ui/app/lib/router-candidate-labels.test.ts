import { describe, expect, test } from "vitest";

import {
  formatCandidateLatencyLine,
  selectOverviewRouterCandidates,
} from "./router-candidate-labels";

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

  test("prefers routing-eligible candidates for the overview sample instead of slicing raw rows", () => {
    expect(
      selectOverviewRouterCandidates(
        [
          {
            endpointId: "deepseek.personal.primary.global.deepseek-v4-flash",
            modelId: "deepseek/deepseek-v4-flash",
            providerId: "deepseek",
            sourceType: "remote",
            routingEligible: false,
            controllerEligible: true,
          },
          {
            endpointId: "openai.personal.primary.global.gpt-5.4",
            modelId: "chatgpt/gpt-5.4",
            providerId: "openai",
            sourceType: "remote",
            routingEligible: true,
            preferred: true,
          },
          {
            endpointId: "moonshot.personal.primary.global.kimi-k2.7-code",
            modelId: "moonshot/kimi-k2.7-code",
            providerId: "moonshot",
            sourceType: "remote",
            routingEligible: false,
          },
          {
            endpointId: "anthropic.personal.primary.global.claude-3.7",
            modelId: "anthropic/claude-3.7",
            providerId: "anthropic",
            sourceType: "remote",
            routingEligible: true,
          },
        ],
        3,
      ).map((candidate) => candidate.endpointId),
    ).toEqual([
      "openai.personal.primary.global.gpt-5.4",
      "anthropic.personal.primary.global.claude-3.7",
    ]);
  });

  test("returns all routing-eligible candidates by default instead of truncating the router page list", () => {
    expect(
      selectOverviewRouterCandidates([
        {
          endpointId: "deepseek.personal.primary.global.deepseek-v4-flash",
          modelId: "deepseek/deepseek-v4-flash",
          providerId: "deepseek",
          sourceType: "remote",
          routingEligible: true,
          controllerEligible: true,
        },
        {
          endpointId: "openai.personal.primary.global.gpt-5.4",
          modelId: "chatgpt/gpt-5.4",
          providerId: "openai",
          sourceType: "remote",
          routingEligible: true,
          preferred: true,
        },
        {
          endpointId: "moonshot.personal.primary.global.kimi-k2.7-code",
          modelId: "moonshot/kimi-k2.7-code",
          providerId: "moonshot",
          sourceType: "remote",
          routingEligible: true,
        },
        {
          endpointId: "anthropic.personal.primary.global.claude-3.7",
          modelId: "anthropic/claude-3.7",
          providerId: "anthropic",
          sourceType: "remote",
          routingEligible: true,
        },
      ]).map((candidate) => candidate.endpointId),
    ).toEqual([
      "deepseek.personal.primary.global.deepseek-v4-flash",
      "openai.personal.primary.global.gpt-5.4",
      "anthropic.personal.primary.global.claude-3.7",
      "moonshot.personal.primary.global.kimi-k2.7-code",
    ]);
  });
});
