import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

import { persistRuntimeTelemetryFailure } from "../../src/index.ts";

export const RUN90_CANONICAL_FIXTURE_NOW_MS = 1_700_000_000_000;
export const RUN90_CANONICAL_WINDOW_MS = 86_400_000;

export interface Run90CanonicalManifest {
  readonly schemaVersion: "run90-canonical-corpus.v1";
  readonly fixtureNowMs: number;
  readonly window: { readonly startAtMs: number; readonly endAtMs: number };
  readonly inWindowCount: 257;
  readonly outOfWindowCount: 9;
  readonly expected: {
    readonly modelCounts: Readonly<Record<string, number>>;
    readonly successCount: 179;
    readonly failureCount: 78;
    readonly totalInputTokens: number;
    readonly totalOutputTokens: number;
    readonly totalTokens: number;
    readonly totalEstimatedCostUsd: 0.289896;
    readonly totalActualCostUsd: 0.02247;
    readonly totalEffectiveCostUsd: 0.289896;
    readonly averageLatencyMs: 228;
    readonly p95LatencyMs: 344;
    readonly retryCount: 48;
    readonly rerouteCount: 16;
    readonly targetRequestIdOutsideNewest50: string;
    readonly targetRequestIdOutsideNewest200: string;
  };
  readonly digest: string;
}

const BASE_MANIFEST = {
  schemaVersion: "run90-canonical-corpus.v1" as const,
  fixtureNowMs: RUN90_CANONICAL_FIXTURE_NOW_MS,
  window: {
    startAtMs: RUN90_CANONICAL_FIXTURE_NOW_MS - RUN90_CANONICAL_WINDOW_MS,
    endAtMs: RUN90_CANONICAL_FIXTURE_NOW_MS,
  },
  inWindowCount: 257 as const,
  outOfWindowCount: 9 as const,
  expected: {
    modelCounts: {
      "run90-model-a": 86,
      "run90-model-b": 86,
      "run90-model-c": 85,
    },
    successCount: 179 as const,
    failureCount: 78 as const,
    totalInputTokens: Array.from({ length: 257 }, (_, index) => 100 + index).reduce(
      (sum, value) => sum + value,
      0,
    ),
    totalOutputTokens: Array.from({ length: 257 }, (_, index) => 50 + index).reduce(
      (sum, value) => sum + value,
      0,
    ),
    totalTokens: Array.from({ length: 257 }, (_, index) => 150 + index * 2).reduce(
      (sum, value) => sum + value,
      0,
    ),
    totalEstimatedCostUsd: 0.289896 as const,
    totalActualCostUsd: 0.02247 as const,
    totalEffectiveCostUsd: 0.289896 as const,
    averageLatencyMs: 228 as const,
    p95LatencyMs: 344 as const,
    retryCount: (Array.from({ length: 257 }, (_, index) => index).filter(
      (index) => index % 11 === 0,
    ).length * 2) as 48,
    rerouteCount: Array.from({ length: 257 }, (_, index) => index).filter(
      (index) => index % 17 === 0,
    ).length as 16,
    targetRequestIdOutsideNewest50: "run90-canonical-in-000",
    targetRequestIdOutsideNewest200: "run90-canonical-in-000",
  },
};

const manifestBody = JSON.stringify(BASE_MANIFEST);
export const RUN90_CANONICAL_MANIFEST_SHA256 = `sha256:${createHash("sha256")
  .update(manifestBody)
  .digest("hex")}`;

export function seedRun90CanonicalCorpus(databasePath: string): Run90CanonicalManifest {
  for (let index = 0; index < 266; index += 1) {
    const inWindow = index < 257;
    const requestId = inWindow
      ? `run90-canonical-in-${String(index).padStart(3, "0")}`
      : `run90-canonical-out-${String(index - 257).padStart(3, "0")}`;
    const modelId = `run90-model-${["a", "b", "c"][index % 3]}`;
    const isFailure = inWindow && index % 10 < 3;
    persistRuntimeTelemetryFailure({
      databasePath,
      requestId,
      routingDecisionId: `run90-canonical-decision-${requestId}`,
      endpointId: `run90-canonical.endpoint.${index % 3}`,
      modelId,
      sourceType: index % 2 === 0 ? "remote" : "local",
      providerKind: "run90-provider",
      providerId: "run90-provider",
      statusCode: isFailure ? 503 : 200,
      errorClass: isFailure ? "run90_failure" : "none",
      retryCount: index % 11 === 0 ? 2 : 0,
      rerouteCount: index % 17 === 0 ? 1 : 0,
      latencyMs: 100 + index,
    });
  }

  const database = new DatabaseSync(databasePath);
  const update = database.prepare(
    "UPDATE runtime_telemetry_records SET created_at_ms = ?, input_tokens = ?, output_tokens = ?, total_tokens = ?, estimated_cost_usd = ?, effective_cost_usd = ?, actual_cost_usd = ?, latency_ms = ?, error_class = ?, status_family = ? WHERE request_id = ?",
  );
  database.exec("BEGIN IMMEDIATE");
  try {
    for (let index = 0; index < 266; index += 1) {
      const inWindow = index < 257;
      const requestId = inWindow
        ? `run90-canonical-in-${String(index).padStart(3, "0")}`
        : `run90-canonical-out-${String(index - 257).padStart(3, "0")}`;
      const createdAtMs = inWindow
        ? BASE_MANIFEST.window.startAtMs + Math.floor(index / 2) * 600_000
        : BASE_MANIFEST.window.startAtMs - (index - 256) * 1_000;
      const inputTokens = inWindow ? 100 + index : 0;
      const outputTokens = inWindow ? 50 + index : 0;
      const totalTokens = inputTokens + outputTokens;
      const cost = inWindow ? Number((0.001 + index / 1_000_000).toFixed(6)) : 0;
      const failure = inWindow && index % 10 < 3;
      update.run(
        createdAtMs,
        inputTokens,
        outputTokens,
        totalTokens,
        cost,
        cost,
        index % 13 === 0 && inWindow ? cost : null,
        100 + index,
        failure ? "run90_failure" : null,
        failure ? "failure" : "success",
        requestId,
      );
    }
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  } finally {
    database.close();
  }

  return {
    ...BASE_MANIFEST,
    digest: RUN90_CANONICAL_MANIFEST_SHA256,
  };
}

/** Separate metadata-only corpus for query-plan/performance checks. */
export function seedRun90PerformanceCorpus(databasePath: string, rowCount = 10_000): void {
  const seed = "run90-perf-seed";
  persistRuntimeTelemetryFailure({
    databasePath,
    requestId: seed,
    routingDecisionId: "run90-perf-seed-decision",
    endpointId: "run90-perf.endpoint",
    modelId: "run90-perf-model",
    sourceType: "remote",
    statusCode: 200,
    errorClass: "none",
  });
  const database = new DatabaseSync(databasePath);
  const columns = (
    database.prepare("PRAGMA table_info(runtime_telemetry_records)").all() as Array<{
      name: string;
    }>
  ).map((row) => row.name);
  const insertColumns = columns.join(", ");
  const projection = columns
    .map((column) =>
      column === "request_id"
        ? "?"
        : column === "routing_decision_id"
          ? "?"
          : column === "created_at_ms"
            ? "?"
            : column,
    )
    .join(", ");
  const insert = database.prepare(
    `INSERT OR REPLACE INTO runtime_telemetry_records (${insertColumns})
     SELECT ${projection} FROM runtime_telemetry_records WHERE request_id = ?`,
  );
  database.exec("BEGIN IMMEDIATE");
  try {
    for (let index = 0; index < rowCount; index += 1) {
      insert.run(
        `run90-perf-${index}`,
        `run90-perf-decision-${index}`,
        1_700_000_000_000 + index,
        seed,
      );
    }
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  } finally {
    database.close();
  }
}
