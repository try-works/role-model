import { mkdtemp } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

import { expect, test } from "vitest";

import {
  initializeSqliteMemory,
  persistRuntimeTelemetryFailure,
} from "@role-model-router/sqlite-memory";
import { seedRun90CanonicalCorpus } from "../../../packages/sqlite-memory/test/fixtures/run90-canonical-corpus.ts";
import { createRuntimeBridgeBackend } from "../src/index.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

test("Run 90 exact request detail is wired to the indexed telemetry lookup contract", async () => {
  const source = await readFile(
    path.join(repoRoot, "role-model-router", "apps", "runtime-host-bridge", "src", "index.ts"),
    "utf8",
  );
  expect(source).toContain("readRuntimeTelemetryRecord({");
  const emitStart = source.indexOf("const emitTelemetryUpdate");
  expect(emitStart).toBeGreaterThanOrEqual(0);
  expect(source.slice(emitStart, emitStart + 1_200)).toContain("readRuntimeTelemetryRecord({");
  const summaryStart = source.indexOf("const readTelemetrySummaryData");
  const comparisonStart = source.indexOf("const listTelemetryComparisonData");
  expect(summaryStart).toBeGreaterThanOrEqual(0);
  expect(comparisonStart).toBeGreaterThan(summaryStart);
  expect(source.slice(summaryStart, comparisonStart)).toContain(
    "readRuntimeTelemetrySourceSummaries",
  );
  expect(source).toContain("readActivityCaptureByRequestId");
  expect(source).toContain("request_id: requestId");
});

test("Run 90 host aggregates ignore the activity page limit", async () => {
  const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "run90-host-telemetry-"));
  const scopeId = "run90-host";
  const initialized = initializeSqliteMemory({
    runtimeStateRoot,
    scopeId,
    channel: "development",
  });
  for (let index = 0; index < 60; index += 1) {
    persistRuntimeTelemetryFailure({
      databasePath: initialized.databasePath,
      requestId: `run90-host-request-${index}`,
      routingDecisionId: `run90-host-decision-${index}`,
      endpointId: "run90.host.endpoint",
      modelId: "run90-host-model",
      sourceType: "remote",
      statusCode: 200,
      errorClass: "none",
    });
  }
  const database = new DatabaseSync(initialized.databasePath);
  database.prepare("UPDATE runtime_telemetry_records SET created_at_ms = 1001").run();
  database
    .prepare(
      "UPDATE runtime_telemetry_records SET created_at_ms = 1000, endpoint_id = ? WHERE request_id = ?",
    )
    .run("run90.host.older-endpoint", "run90-host-request-0");
  database.close();

  const backend = await createRuntimeBridgeBackend({
    repoRoot,
    runtimeStateRoot,
    scopeId,
    runtimeChannel: "development",
    runtimeVendorStartup: "disabled",
  });
  try {
    const summary = await backend.readTelemetrySummary({
      startAtMs: 1000,
      endAtMs: 1002,
      limit: 50,
    });
    expect(summary).toMatchObject({
      requestCount: 60,
      failureCount: 60,
      sourceBreakdown: { remote: { requestCount: 60, failureCount: 60 } },
    });
    await expect(
      backend.listTelemetryRequests({
        startAtMs: 1000,
        endAtMs: 1002,
        limit: 50,
      }),
    ).resolves.toHaveLength(50);
    await expect(
      backend.listTelemetryComparisonRows({
        startAtMs: 1000,
        endAtMs: 1002,
        limit: 50,
      }),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          endpointId: "run90.host.endpoint",
          requestCount: 59,
          failureCount: 59,
        }),
        expect.objectContaining({
          endpointId: "run90.host.older-endpoint",
          requestCount: 1,
          failureCount: 1,
        }),
      ]),
    );
    await expect(
      backend.listTelemetryRequests({
        startAtMs: 1000,
        endAtMs: 1002,
        limit: 50,
        filters: { endpointIds: ["run90.host.older-endpoint"] },
      }),
    ).resolves.toMatchObject([
      { requestId: "run90-host-request-0", endpointId: "run90.host.older-endpoint" },
    ]);
  } finally {
    await backend.shutdown();
  }
});

test("Run 90 request pages carry a filter-bound snapshot cursor and total", async () => {
  const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "run90-host-page-"));
  const scopeId = "run90-host-page";
  const initialized = initializeSqliteMemory({
    runtimeStateRoot,
    scopeId,
    channel: "development",
  });
  for (let index = 0; index < 60; index += 1) {
    persistRuntimeTelemetryFailure({
      databasePath: initialized.databasePath,
      requestId: `run90-page-request-${index}`,
      routingDecisionId: `run90-page-decision-${index}`,
      endpointId: index % 2 === 0 ? "run90.page.a" : "run90.page.b",
      modelId: "run90-page-model",
      sourceType: "remote",
      statusCode: 200,
      errorClass: "none",
    });
  }
  const database = new DatabaseSync(initialized.databasePath);
  database.prepare("UPDATE runtime_telemetry_records SET created_at_ms = 1000").run();
  database.close();

  const backend = await createRuntimeBridgeBackend({
    repoRoot,
    runtimeStateRoot,
    scopeId,
    runtimeChannel: "development",
    runtimeVendorStartup: "disabled",
  });
  try {
    const pageApi = backend as unknown as {
      listTelemetryRequestPage(query?: Record<string, unknown>): Promise<{
        readonly items: readonly { readonly requestId: string }[];
        readonly totalMatching: number;
        readonly returned: number;
        readonly nextCursor: string | null;
      }>;
    };
    const first = await pageApi.listTelemetryRequestPage({
      startAtMs: 1000,
      endAtMs: 1001,
      limit: 50,
    });
    expect(first.totalMatching).toBe(60);
    expect(first.returned).toBe(50);
    expect(first.items).toHaveLength(50);
    expect(first.nextCursor).toEqual(expect.any(String));
    persistRuntimeTelemetryFailure({
      databasePath: initialized.databasePath,
      requestId: "run90-page-request-after-snapshot",
      routingDecisionId: "run90-page-decision-after-snapshot",
      endpointId: "run90.page.a",
      modelId: "run90-page-model",
      sourceType: "remote",
      statusCode: 200,
      errorClass: "none",
    });
    const inserted = new DatabaseSync(initialized.databasePath);
    inserted
      .prepare("UPDATE runtime_telemetry_records SET created_at_ms = 1002 WHERE request_id = ?")
      .run("run90-page-request-after-snapshot");
    inserted.close();
    const second = await pageApi.listTelemetryRequestPage({
      startAtMs: 1000,
      endAtMs: 1001,
      limit: 50,
      cursor: first.nextCursor,
    });
    expect(second.totalMatching).toBe(60);
    expect(second.items).toHaveLength(10);
    expect(
      second.items.some((item) => item.requestId === "run90-page-request-after-snapshot"),
    ).toBe(false);
    expect(new Set(first.items.map((item) => item.requestId)).size).toBe(50);
    expect(new Set([...first.items, ...second.items].map((item) => item.requestId)).size).toBe(60);
    const refreshed = await pageApi.listTelemetryRequestPage({
      startAtMs: 1000,
      endAtMs: 1003,
      limit: 100,
    });
    expect(refreshed.totalMatching).toBe(61);
    await expect(
      pageApi.listTelemetryRequestPage({
        startAtMs: 1000,
        endAtMs: 1001,
        limit: 50,
        cursor: `${first.nextCursor}tampered`,
      }),
    ).rejects.toThrow(/cursor/i);
    await expect(
      pageApi.listTelemetryRequestPage({ startAtMs: 1001, endAtMs: 1000, limit: 50 }),
    ).rejects.toThrow(/window/i);
    await expect(
      pageApi.listTelemetryRequestPage({ startAtMs: 1000, endAtMs: 1001, limit: 10_001 }),
    ).rejects.toThrow(/limit/i);
  } finally {
    await backend.shutdown();
  }
});

test("Run 90 canonical host view reconciles 257 totals with a 50-row page", async () => {
  const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "run90-host-canonical-"));
  const scopeId = "run90-host-canonical";
  const initialized = initializeSqliteMemory({
    runtimeStateRoot,
    scopeId,
    channel: "development",
  });
  const manifest = seedRun90CanonicalCorpus(initialized.databasePath);
  const backend = await createRuntimeBridgeBackend({
    repoRoot,
    runtimeStateRoot,
    scopeId,
    runtimeChannel: "development",
    runtimeVendorStartup: "disabled",
  });
  try {
    const summary = await backend.readTelemetrySummary({
      startAtMs: manifest.window.startAtMs,
      endAtMs: manifest.window.endAtMs,
      limit: 50,
    });
    expect(summary.requestCount).toBe(257);
    expect(summary.sourceBreakdown.local.requestCount).toBe(128);
    expect(summary.sourceBreakdown.remote.requestCount).toBe(129);
    const activityPageApi = backend as unknown as {
      listActivityMetricsPage(query?: Record<string, unknown>): Promise<{
        readonly totalMatching: number;
        readonly pageSize: number;
        readonly truncated: boolean;
      }>;
    };
    await expect(
      activityPageApi.listActivityMetricsPage({
        startAtMs: manifest.window.startAtMs,
        endAtMs: manifest.window.endAtMs,
        limit: 50,
      }),
    ).resolves.toMatchObject({ totalMatching: 257, pageSize: 50, truncated: true });
    await expect(
      backend.listTelemetryRequests({
        startAtMs: manifest.window.startAtMs,
        endAtMs: manifest.window.endAtMs,
        limit: 50,
      }),
    ).resolves.toHaveLength(50);
    const comparison = await backend.listTelemetryComparisonRows({
      startAtMs: manifest.window.startAtMs,
      endAtMs: manifest.window.endAtMs,
      limit: 50,
    });
    expect(comparison.reduce((sum, row) => sum + row.requestCount, 0)).toBe(257);
    const filteredPage = await (
      backend as unknown as {
        listTelemetryRequestPage(query: Record<string, unknown>): Promise<{
          readonly items: readonly unknown[];
          readonly totalMatching: number;
          readonly returned: number;
        }>;
      }
    ).listTelemetryRequestPage({
      startAtMs: manifest.window.startAtMs,
      endAtMs: manifest.window.endAtMs,
      limit: 50,
      filters: { endpointIds: ["run90-canonical.endpoint.0"] },
    });
    expect(filteredPage).toMatchObject({ totalMatching: 86, returned: 50 });
  } finally {
    await backend.shutdown();
  }
});

test("Run 90 router decisions expose a full total beside the bounded page", async () => {
  const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "run90-router-page-"));
  const scopeId = "run90-router-page";
  const initialized = initializeSqliteMemory({
    runtimeStateRoot,
    scopeId,
    channel: "development",
  });
  const manifest = seedRun90CanonicalCorpus(initialized.databasePath);
  const backend = await createRuntimeBridgeBackend({
    repoRoot,
    runtimeStateRoot,
    scopeId,
    runtimeChannel: "development",
    runtimeVendorStartup: "disabled",
  });
  try {
    const pageApi = backend as unknown as {
      listRouterDecisionPage(query?: Record<string, unknown>): Promise<{
        readonly items: readonly unknown[];
        readonly totalMatching: number;
        readonly returned: number;
        readonly truncated: boolean;
      }>;
    };
    const page = await pageApi.listRouterDecisionPage({
      startAtMs: manifest.window.startAtMs,
      endAtMs: manifest.window.endAtMs,
      limit: 50,
    });
    expect(page.totalMatching).toBe(257);
    expect(page.returned).toBe(50);
    expect(page.items).toHaveLength(50);
    expect(page.truncated).toBe(true);
  } finally {
    await backend.shutdown();
  }
});
