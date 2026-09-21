import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import {
  buildCompactRuntimeObservationStub,
  initializeSqliteMemory,
  persistRuntimeObservationBundle,
  readRuntimeTelemetryRecord,
} from "../src/index.ts";

/**
 * Stub fidelity (run 98 addendum 40 audit).
 *
 * A request whose route capture is skipped or deferred is persisted as the bounded compact stub. The
 * telemetry ledger is derived from whatever observation is persisted, so **every non-rich field the
 * ledger reads must survive the stub projection**. A field that is silently dropped does not fail
 * loudly — it flips a capability flag to its default, which is how 434 live rows ended up reporting
 * "cache hit tokens unsupported" while still recording 129k cached tokens on average.
 *
 * This test is the mechanical audit for that class: persist the same bundle twice (once whole, once
 * stubbed) and require the resulting telemetry rows to agree on everything that is not rich content.
 */
function buildObservation(requestId: string) {
  const nowMs = Date.now();
  return {
    requestId,
    routingDecisionId: `decision-${requestId}`,
    endpointId: "deepseek.personal.deepseek-api-key.global.deepseek-flash-high",
    conversationId: "conversation-stub-fidelity",
    usageEvent: {
      timestamp_ms: nowMs,
      request_id: requestId,
      latency_ms: 2_592,
      tokens_in: 219_361,
      tokens_out: 63,
      tokens_in_source: "measured",
      tokens_in_available: true,
      tokens_out_source: "measured",
      tokens_out_available: true,
    },
    observedPerformance: {
      sample: {
        endpoint_id: "deepseek.personal.deepseek-api-key.global.deepseek-flash-high",
        model_id: "deepseek/deepseek-flash",
        source_type: "live_request",
        timestamp_ms: nowMs,
        latency_ms: 2_592,
        success: true,
      },
      // The real profile shape (`aggregateOperationalPerformanceSamples`): the model pool reads
      // `latency_ms_p50` / `latency_ms_p95` / `sample_size` from here, so a stub that keeps
      // `latency_ms` / `sample_count` / `success_rate` instead stores a metadata-only profile and the
      // quality and speed axes render empty.
      profile: {
        endpoint_id: "deepseek.personal.deepseek-api-key.global.deepseek-flash-high",
        endpoint_version: "v1",
        measured_at_ms: nowMs,
        measurement_window: "7d",
        sample_size: 18,
        sources: { live_request_samples: 18, benchmark_samples: 0 },
        latency_ms_p50: 2_100,
        latency_ms_p95: 9_400,
        failure_rate: 0.02,
        freshness_score: 0.97,
        confidence_score: 0.81,
        tokens_per_sec: 42.5,
        cost_per_1k_tokens_est: 0.004,
        currency: "USD",
      },
    },
    // The cost charts read these; the stub previously dropped the whole snapshot.
    telemetrySnapshot: {
      providerId: "deepseek",
      providerAccountId: "deepseek.personal.deepseek-api-key",
      sourceType: "remote",
      endpointKind: "remote_api",
      servingSource: "remote-service",
      region: null,
      lifecycleStateAtRequest: "active",
      healthStatusAtRequest: "healthy",
      requestedModelId: "deepseek/deepseek-flash",
      selectedModelId: "deepseek/deepseek-flash",
      requestOperation: "chat",
      roleIds: ["coder"],
      toolingUsed: true,
      cacheState: "hit",
      eligibleEndpointIds: ["deepseek.personal.deepseek-api-key.global.deepseek-flash-high"],
      eligibleModelIds: ["deepseek/deepseek-flash"],
      candidateCostSnapshot: { "deepseek/deepseek-flash": { inputPer1kUsd: 0.004 } },
      selectedPricingSnapshot: { inputPer1kUsd: 0.004, outputPer1kUsd: 0.012 },
      selectedUncachedCostUsd: 0.91,
      baselineMaxEligibleCostUsd: 1.4,
      routingCostSavingsUsd: 0.49,
      cacheCostSavingsUsd: 0.32,
      totalAvoidedCostUsd: 0.81,
      costBaselineSource: "catalog-max-eligible",
      costSavingsSupport: "full",
    },
    cacheObservability: {
      promptCacheRequested: true,
      promptCacheRequestSource: "explicit",
      promptCacheUsed: true,
      cacheReadTokens: 217_600,
      cacheWriteTokens: 0,
    },
    executionTelemetry: {
      providerFamily: "deepseek",
      vendorId: "deepseek",
      finishReason: "tool_calls",
      costProvenance: "measured",
      usageSupport: {
        inputTokens: true,
        outputTokens: true,
        cacheReadTokens: true,
        cacheWriteTokens: true,
      },
      promptCaching: { supported: true },
      stream: { requested: false, textDeltas: 0, toolCallDeltas: 7, toolArgumentDeltas: 21 },
      streamSupport: { text: "supported", toolCalls: "supported", toolArguments: "supported" },
    },
    // Run 98 addendum 40 L5: the measured-latency verdict is decision evidence, so it must survive the
    // stub the same way the capability facts do — the live window found 0 of 31 stored observations
    // carrying it because the routing-diagnostics projection is an allowlist.
    routingDiagnostics: {
      decisionTrace: { strategy: "baseline", candidates: 7 },
      latencySelection: {
        outcome: "kept_router_choice",
        chosenEndpointId: "deepseek.personal.deepseek-api-key.global.deepseek-flash-high",
        bucketUpperBoundTokens: 150_000,
        candidates: [
          {
            endpointId: "deepseek.personal.deepseek-api-key.global.deepseek-flash-high",
            p95LatencyMs: 12_000,
            sampleCount: 18,
          },
        ],
        reason: "the router's chosen endpoint already has the best measured p95 for this bucket",
      },
    },
  } as never;
}

test("stub fidelity: a stubbed observation yields the same telemetry capabilities as the whole bundle", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "run98-a40-stub-fidelity-"));
  const initialized = initializeSqliteMemory({
    runtimeStateRoot: root,
    scopeId: "run98-a40-stub-fidelity",
    channel: "development",
  });
  const bundle = buildObservation("req-fidelity-rich");
  persistRuntimeObservationBundle({
    databasePath: initialized.databasePath,
    channel: "development",
    observation: bundle,
  });
  persistRuntimeObservationBundle({
    databasePath: initialized.databasePath,
    channel: "development",
    observation: {
      ...buildCompactRuntimeObservationStub(bundle as unknown as Readonly<Record<string, unknown>>),
      requestId: "req-fidelity-stub",
    } as never,
  });

  const rich = readRuntimeTelemetryRecord({
    databasePath: initialized.databasePath,
    requestId: "req-fidelity-rich",
  });
  const stub = readRuntimeTelemetryRecord({
    databasePath: initialized.databasePath,
    requestId: "req-fidelity-stub",
  });
  expect(rich).not.toBeNull();
  expect(stub).not.toBeNull();

  // The fields the operator surfaces read must not depend on whether the capture was rich or stubbed.
  expect(stub?.cacheReadTokens).toBe(rich?.cacheReadTokens);
  expect(stub?.cacheWriteTokens).toBe(rich?.cacheWriteTokens);
  expect(stub?.promptCacheRequested).toBe(rich?.promptCacheRequested);
  expect(stub?.promptCacheUsed).toBe(rich?.promptCacheUsed);
  expect(stub?.cacheReadTokensSupported).toBe(rich?.cacheReadTokensSupported);
  expect(stub?.cacheWriteTokensSupported).toBe(rich?.cacheWriteTokensSupported);
  expect(stub?.promptCacheSupported).toBe(rich?.promptCacheSupported);
  expect(stub?.streamTextDeltaCount).toBe(rich?.streamTextDeltaCount);
  expect(stub?.streamToolCallDeltaCount).toBe(rich?.streamToolCallDeltaCount);
  expect(stub?.streamToolArgumentDeltaCount).toBe(rich?.streamToolArgumentDeltaCount);
  expect(stub?.streamTextSupported).toBe(rich?.streamTextSupported);
  expect(stub?.streamToolCallSupported).toBe(rich?.streamToolCallSupported);
  expect(stub?.latencyMs).toBe(rich?.latencyMs);
  expect(stub?.inputTokens).toBe(rich?.inputTokens);
  expect(stub?.outputTokens).toBe(rich?.outputTokens);

  // Decision evidence: the measured-latency verdict must survive the stub.
  const stubObservation = buildCompactRuntimeObservationStub(
    bundle as unknown as Readonly<Record<string, unknown>>,
  );
  const routingDiagnostics = stubObservation.routingDiagnostics as Record<string, unknown>;
  expect(routingDiagnostics?.latencySelection).toMatchObject({
    outcome: "kept_router_choice",
    chosenEndpointId: "deepseek.personal.deepseek-api-key.global.deepseek-flash-high",
    bucketUpperBoundTokens: 150_000,
  });

  // The operational profile is what the model pool's quality and speed axes read.
  const stubObserved = stubObservation.observedPerformance as {
    profile: Record<string, unknown>;
  };
  expect(stubObserved?.profile).toMatchObject({
    sample_size: 18,
    latency_ms_p50: 2_100,
    latency_ms_p95: 9_400,
    failure_rate: 0.02,
  });

  // The telemetry snapshot carries the cost evidence the cost charts read.
  const stubSnapshot = stubObservation.telemetrySnapshot as Record<string, unknown>;
  expect(stubSnapshot).toMatchObject({
    costSavingsSupport: "full",
    routingCostSavingsUsd: 0.49,
    totalAvoidedCostUsd: 0.81,
    cacheState: "hit",
    eligibleEndpointIds: ["deepseek.personal.deepseek-api-key.global.deepseek-flash-high"],
  });

  // End to end: the persisted telemetry row for the stubbed observation must expose the same cost
  // evidence as the row built from the whole bundle.
  expect(stub?.costSavingsSupport).toBe(rich?.costSavingsSupport);
  expect(stub?.routingCostSavingsUsd).toBe(rich?.routingCostSavingsUsd);
  expect(stub?.totalAvoidedCostUsd).toBe(rich?.totalAvoidedCostUsd);
  expect(stub?.eligibleEndpointIds).toEqual(rich?.eligibleEndpointIds);
});
