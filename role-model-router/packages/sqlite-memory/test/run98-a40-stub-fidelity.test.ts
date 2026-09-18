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
      profile: { measured_at_ms: nowMs },
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
});
