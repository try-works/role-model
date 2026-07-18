import { DatabaseSync } from "node:sqlite";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";

import {
  hydrateNormalizedCatalog,
  type NormalizedCatalog,
} from "../../../../../role-model-router/packages/catalog/src/index.ts";
import {
  initializeSqliteMemory,
  listRecentRuntimeObservations,
} from "../../../../../role-model-router/packages/sqlite-memory/src/index.ts";

const sampleCount = 30;
const warmupCount = 5;
const observationCount = 256;
const observationBytes = 1024 * 1024;

function percentile(values: readonly number[], fraction: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.ceil(sorted.length * fraction) - 1] ?? 0;
}

function summary(values: readonly number[]) {
  return {
    samplesMs: values.map((value) => Number(value.toFixed(3))),
    p50Ms: Number(percentile(values, 0.5).toFixed(3)),
    p95Ms: Number(percentile(values, 0.95).toFixed(3)),
    maxMs: Number(Math.max(...values).toFixed(3)),
  };
}

function measure(operation: () => void): number {
  const startedAt = performance.now();
  operation();
  return performance.now() - startedAt;
}

async function measureFetch(url: string): Promise<{ elapsedMs: number; bytes: number }> {
  const startedAt = performance.now();
  const response = await fetch(url);
  const body = await response.arrayBuffer();
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return { elapsedMs: performance.now() - startedAt, bytes: body.byteLength };
}

const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..", "..", "..");
const scratchRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-run77-perf-"));
const databasePath = initializeSqliteMemory({
  runtimeStateRoot: scratchRoot,
  scopeId: "run77-perf",
}).databasePath;
const catalogPath = path.join(
  repoRoot,
  "role-model-router",
  "packages",
  "catalog",
  "data",
  "normalized-catalog.json",
);

try {
  const database = new DatabaseSync(databasePath);
  const insert = database.prepare(`
    INSERT INTO runtime_observations (
      request_id, routing_decision_id, endpoint_id, conversation_id, created_at_ms,
      client_request_id, observation_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const observationJson = JSON.stringify({ payload: "x".repeat(observationBytes - 14) });
  database.exec("BEGIN IMMEDIATE");
  for (let index = 0; index < observationCount; index += 1) {
    insert.run(
      `request-${index.toString().padStart(4, "0")}`,
      `decision-${index}`,
      `endpoint-${index % 16}`,
      `conversation-${index}`,
      1_800_000_000_000 + index,
      `client-${index}`,
      observationJson,
    );
  }
  database.exec("COMMIT");
  const queryPlan = database
    .prepare(
      "EXPLAIN QUERY PLAN SELECT request_id, client_request_id, routing_decision_id, endpoint_id, created_at_ms FROM runtime_observations ORDER BY created_at_ms DESC, request_id DESC LIMIT 20",
    )
    .all();
  database.close();

  for (let index = 0; index < warmupCount; index += 1) {
    listRecentRuntimeObservations({ databasePath, limit: 20 });
  }
  const requestSamples = Array.from({ length: sampleCount }, () =>
    measure(() => {
      const records = listRecentRuntimeObservations({ databasePath, limit: 20 });
      if (records.length !== 20) throw new Error(`Expected 20 records; received ${records.length}`);
    }),
  );

  const server = createServer((request, response) => {
    if (request.url === "/requests") {
      const records = listRecentRuntimeObservations({ databasePath, limit: 20 });
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(records));
      return;
    }
    response.writeHead(200, { "content-type": "application/json" });
    response.end('{"status":"ok"}');
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Performance server did not bind");
  const baseUrl = `http://127.0.0.1:${address.port}`;
  for (let index = 0; index < warmupCount; index += 1) {
    await Promise.all([measureFetch(`${baseUrl}/requests`), measureFetch(`${baseUrl}/healthz`)]);
  }
  const httpPairs = [];
  for (let index = 0; index < sampleCount; index += 1) {
    const [requestResult, healthResult] = await Promise.all([
      measureFetch(`${baseUrl}/requests`),
      measureFetch(`${baseUrl}/healthz`),
    ]);
    httpPairs.push({ requestResult, healthResult });
  }
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  const httpRequestSamples = httpPairs.map((pair) => pair.requestResult.elapsedMs);
  const healthSamples = httpPairs.map((pair) => pair.healthResult.elapsedMs);

  const catalogText = await readFile(catalogPath, "utf8");
  for (let index = 0; index < warmupCount; index += 1) JSON.parse(catalogText);
  const parseSamples = Array.from({ length: sampleCount }, () =>
    measure(() => void JSON.parse(catalogText)),
  );
  const serializedCatalog = JSON.parse(catalogText) as unknown;
  let hydratedCatalog: NormalizedCatalog | null = null;
  for (let index = 0; index < warmupCount; index += 1) {
    hydratedCatalog = hydrateNormalizedCatalog(serializedCatalog);
  }
  const hydrateSamples = Array.from({ length: sampleCount }, () =>
    measure(() => {
      hydratedCatalog = hydrateNormalizedCatalog(serializedCatalog);
    }),
  );
  if (!hydratedCatalog) throw new Error("Catalog hydration did not run");

  const databaseStats = await stat(databasePath);
  const catalogStats = await stat(catalogPath);
  console.log(
    JSON.stringify(
      {
        platform: `${os.platform()} ${os.release()} ${os.arch()}`,
        node: process.version,
        method: "5 warmups followed by 30 sequential post-warmup samples using performance.now()",
        requestFixture: {
          databaseBytes: databaseStats.size,
          observationCount,
          observationBytes,
          selectedRows: 20,
          queryPlan,
          timing: summary(requestSamples),
          httpTiming: summary(httpRequestSamples),
          responseBytes: httpPairs[0]?.requestResult.bytes ?? 0,
          concurrentHealthTiming: summary(healthSamples),
          concurrentHealthResponseBytes: httpPairs[0]?.healthResult.bytes ?? 0,
        },
        compactCatalog: {
          fileBytes: catalogStats.size,
          wireVersion: (serializedCatalog as { catalogVersion?: unknown }).catalogVersion,
          providers: hydratedCatalog.providers.length,
          models: hydratedCatalog.models.length,
          parseTiming: summary(parseSamples),
          hydrateTiming: summary(hydrateSamples),
        },
      },
      null,
      2,
    ),
  );
} finally {
  try {
    await rm(scratchRoot, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  } catch (error) {
    console.warn(`Could not remove temporary fixture ${scratchRoot}: ${String(error)}`);
  }
}
