import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "vitest";

import {
  initializeSqliteMemory,
  persistRuntimeTelemetryFailure,
} from "@role-model-router/sqlite-memory";

import { createRuntimeBridgeBackend } from "../src/index.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/**
 * Run 104 / R14: the telemetry query/readback must be able to filter by traffic class so the operator surfaces
 * can default to live traffic and offer an explicit include-filter. `live` also matches the legacy
 * `live_request` rows.
 */
test("run104: the telemetry request query filters by traffic class", async () => {
  const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "run104-traffic-filter-"));
  const scopeId = "run104-traffic-filter";
  const initialized = initializeSqliteMemory({
    runtimeStateRoot,
    scopeId,
    channel: "development",
  });
  const seed = (requestId: string, requestClass: string) =>
    persistRuntimeTelemetryFailure({
      databasePath: initialized.databasePath,
      requestId,
      routingDecisionId: `decision-${requestId}`,
      endpointId: "run104.endpoint",
      modelId: "run104/model",
      sourceType: "remote",
      statusCode: 200,
      errorClass: "none",
      requestClass: requestClass as "live",
    });
  seed("run104-live-1", "live");
  seed("run104-legacy-1", "live_request");
  seed("run104-replay-1", "replay");
  seed("run104-bench-1", "benchmark");

  const backend = await createRuntimeBridgeBackend({
    repoRoot,
    runtimeStateRoot,
    scopeId,
    runtimeChannel: "development",
    runtimeVendorStartup: "disabled",
  });
  try {
    const all = await backend.listTelemetryRequests({});
    expect(all).toHaveLength(4);

    const liveOnly = await backend.listTelemetryRequests({ filters: { trafficClasses: ["live"] } });
    expect(liveOnly.map((record) => record.requestId).sort()).toEqual([
      "run104-legacy-1",
      "run104-live-1",
    ]);

    const nonLive = await backend.listTelemetryRequests({
      filters: { trafficClasses: ["replay", "benchmark"] },
    });
    expect(nonLive.map((record) => record.requestId).sort()).toEqual([
      "run104-bench-1",
      "run104-replay-1",
    ]);

    // Analytics body filters must carry the same traffic-class dimension, and the
    // dimension must be reflected in the response labels so operator surfaces can
    // render the filtered axis.
    const analytics = await backend.queryTelemetryAnalytics({
      metrics: ["requestCount"],
      granularity: "hour",
      filters: { trafficClasses: ["replay"] },
    });
    expect(analytics.totals.requestCount).toBe(1);
    expect(analytics.metadata.matchedRowCount).toBe(1);
    expect(analytics.labels.requestClass?.replay).toBeDefined();
  } finally {
    await backend.close?.();
  }
});
