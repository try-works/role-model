import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "vitest";

test("builds router candidates from batched profiles without per-endpoint sample history", async () => {
  const testDir = path.dirname(fileURLToPath(import.meta.url));
  const source = await readFile(path.join(testDir, "..", "src", "index.ts"), "utf8");
  const start = source.indexOf("const readCandidateProfileDataByEndpointId");
  const end = source.indexOf("const listRouterDecisionData", start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  const candidateSlice = source.slice(start, end);

  expect(candidateSlice).toContain("readLatestObservedProfilesByEndpointIds");
  expect(candidateSlice).toContain("readLiveTaskTelemetryScoresByEndpointIds");
  expect(candidateSlice).toContain("telemetryScores");
  expect(candidateSlice).not.toContain("readEndpointProfileData(");
  expect(candidateSlice).not.toContain("readObservedPerformanceSamples(");
  expect(candidateSlice).not.toContain("recentSamples.filter(");
});

test("projects variant-scoped live task telemetry on the endpoint profile API", async () => {
  const testDir = path.dirname(fileURLToPath(import.meta.url));
  const source = await readFile(path.join(testDir, "..", "src", "index.ts"), "utf8");
  const start = source.indexOf("const readEndpointProfileData");
  const end = source.indexOf("const readRouterSummaryData", start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  const endpointProfileSlice = source.slice(start, end);

  expect(endpointProfileSlice).toContain("readLiveTaskTelemetryScoresByEndpointIds");
  expect(endpointProfileSlice).toContain("endpointIds: [endpointId]");
  expect(endpointProfileSlice).toContain("telemetryScores:");
});

test("stamps a non-null membership and profile revision on routing decisions", async () => {
  const testDir = path.dirname(fileURLToPath(import.meta.url));
  const source = await readFile(path.join(testDir, "..", "src", "index.ts"), "utf8");
  const start = source.indexOf("const toRouterDecisionData");
  const end = source.indexOf("const listRouterDecisionData", start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  const decisionSlice = source.slice(start, end);

  expect(decisionSlice).toContain("membershipRevision,");
  expect(decisionSlice).toContain("profileRevision:");
  expect(decisionSlice).toContain("computeConfiguredMembershipRevision");
});

test("projects immutable decision-time live telemetry evidence", async () => {
  const module = await import("../src/index.js");
  const evidence = module.projectTelemetryDecisionEvidence(


    {
      scored_candidates: [
        {
          endpoint_id: "deepseek.personal.primary.deepseek-v4-flash-high",
          metric_breakdown: {
            latency: {
              value: 0.75,
              source: "measured",
              raw: {
                latency_ms_p50: 250,
                measured_at_ms: 2_000,
                operational_sample_count: 12,
                operational_window_start_ms: 1_000,
                operational_window_end_ms: 2_000,
                operational_profile_scope: "live-request-operational",
              },
            },
            quality: {
              value: 0.7,
              source: "benchmark",
              raw: {
                telemetry_advisory_available: true,
                telemetry_advisory_eligible: true,
                telemetry_advisory_applied: true,
                telemetry_success_rate: 0.6,
                telemetry_success_count: 6,
                telemetry_failure_count: 4,
                telemetry_sample_count: 10,
                telemetry_window_start_ms: 1_000,
                telemetry_window_end_ms: 2_000,
              },
            },
          },
        },
      ],
    },
    "deepseek.personal.primary.deepseek-v4-flash-high",
    {
      modelId: "deepseek/deepseek-v4-flash",
      reasoningEffort: "high",
      effortSource: "fixed",
    },
  );

  expect(evidence).toMatchObject({
    endpointId: "deepseek.personal.primary.deepseek-v4-flash-high",
    modelId: "deepseek/deepseek-v4-flash",
    reasoningEffort: "high",
    effortSource: "fixed",
    operationalProfile: {
      scope: "live-request-operational",
      sampleCount: 12,
      latencyP50Ms: 250,
    },
    taskTelemetry: {
      available: true,
      eligible: true,
      applied: true,
      successRate: 0.6,
      successCount: 6,
      failureCount: 4,
      sampleCount: 10,
    },
  });
});
