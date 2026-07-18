import { writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";

const baseUrl = process.env.RUN77_ADDENDUM_BASE_URL ?? "http://127.0.0.1:55725";
const outputPath = new URL("./api-telemetry-route-receipt.json", import.meta.url);

async function request(path: string, init?: RequestInit) {
  const startedAt = performance.now();
  const response = await fetch(`${baseUrl}${path}`, init);
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text.length > 0 ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return {
    path,
    status: response.status,
    bytes: Buffer.byteLength(text),
    elapsedMs: Number((performance.now() - startedAt).toFixed(3)),
    body,
  };
}

const routePaths = [
  "/healthz",
  "/api/role-model/runtime/summary",
  "/api/role-model/providers",
  "/api/role-model/accounts",
  "/api/role-model/endpoints",
  "/api/role-model/models",
  "/api/role-model/router/summary",
  "/api/role-model/router/candidates",
  "/api/role-model/benchmark/suite",
  "/api/role-model/benchmark/summary",
  "/api/role-model/benchmark/summaries/by-mode",
  "/api/role-model/benchmark/runs",
  "/api/role-model/telemetry/summary",
  "/api/role-model/telemetry/rows",
  "/api/role-model/telemetry/requests?limit=50",
  "/api/role-model/requests",
  "/api/role-model/requests/latest-ids?limit=10",
  "/api/role-model/downstream/openai",
  "/v1/models",
] as const;

const routeResponses = await Promise.all(routePaths.map((path) => request(path)));
const failures = routeResponses.filter((entry) => entry.status !== 200);
if (failures.length > 0) {
  throw new Error(`Affected API routes failed: ${JSON.stringify(failures)}`);
}

const telemetryResponse = routeResponses.find((entry) =>
  entry.path.startsWith("/api/role-model/telemetry/requests"),
);
const telemetryRows = Array.isArray(telemetryResponse?.body)
  ? (telemetryResponse.body as Array<Record<string, unknown>>)
  : [];
const requestedModels = [
  "baseline.remote-only",
  "difficulty.remote-only",
  "deepseek/deepseek-v4-pro",
  "moonshot/kimi-k3",
] as const;
const selectedRows = requestedModels.map((requestedModelId) => {
  const row = telemetryRows.find((entry) => entry.requestedModelId === requestedModelId);
  if (!row) throw new Error(`Missing telemetry row for ${requestedModelId}`);
  return row;
});

const detailReceipts = [];
for (const row of selectedRows) {
  const requestId = String(row.requestId);
  const detail = await request(`/api/role-model/requests/${encodeURIComponent(requestId)}`);
  const decision = await request(`/api/role-model/router/decisions/${encodeURIComponent(requestId)}`);
  if (detail.status !== 200 || decision.status !== 200) {
    throw new Error(`Detail/decision route failed for ${requestId}`);
  }
  const detailBody = detail.body as Record<string, unknown>;
  const diagnostics = (detailBody.routingDiagnostics ?? {}) as Record<string, unknown>;
  const aliasResolution = (diagnostics.aliasResolution ?? {}) as Record<string, unknown>;
  const rewrite = (diagnostics.rewrite ?? {}) as Record<string, unknown>;
  detailReceipts.push({
    requestId,
    requestedModelId: row.requestedModelId,
    selectedModelId: row.selectedModelId ?? null,
    endpointId: row.endpointId,
    providerId: row.providerId ?? null,
    statusFamily: row.statusFamily,
    statusCode: row.statusCode,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
    latencyMs: row.latencyMs,
    requestDetailBytes: detail.bytes,
    routerDecisionBytes: decision.bytes,
    aliasId: aliasResolution.aliasId ?? null,
    aliasResolvedModelIds: aliasResolution.resolvedModelIds ?? [],
    rewriteApplied: rewrite.applied ?? false,
    rewrittenModelId: rewrite.downstreamModelId ?? null,
  });
}

const successfulDetail = detailReceipts.find((entry) => entry.statusFamily === "success");
if (!successfulDetail) throw new Error("No successful Pi telemetry detail was found");
const profile = await request(
  `/api/role-model/endpoints/${encodeURIComponent(String(successfulDetail.endpointId))}/profile`,
);
if (profile.status !== 200) throw new Error("Selected endpoint profile route failed");

const analytics = await request("/api/role-model/telemetry/query", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    windowMs: 86_400_000,
    granularity: "hour",
    metrics: [
      "requestCount",
      "successCount",
      "failureCount",
      "totalTokens",
      "effectiveCostUsd",
      "averageLatencyMs",
    ],
    breakdown: "modelId",
    ranking: { dimension: "modelId", metric: "requestCount", limit: 10 },
  }),
});
if (analytics.status !== 200) throw new Error(`Telemetry analytics failed: ${analytics.status}`);

const streamController = new AbortController();
const streamResponse = await fetch(`${baseUrl}/api/role-model/telemetry/stream`, {
  signal: streamController.signal,
});
const streamReceipt = {
  status: streamResponse.status,
  contentType: streamResponse.headers.get("content-type"),
};
streamController.abort();

const summary = routeResponses.find(
  (entry) => entry.path === "/api/role-model/telemetry/summary",
)?.body as Record<string, unknown>;
const receipt = {
  generatedAt: new Date().toISOString(),
  routeMatrix: routeResponses.map(({ path, status, bytes, elapsedMs }) => ({
    path,
    status,
    bytes,
    elapsedMs,
  })),
  telemetrySummary: {
    requestCount: summary.requestCount,
    successCount: summary.successCount,
    failureCount: summary.failureCount,
    totalTokens: summary.totalTokens,
  },
  piRequestReceipts: detailReceipts,
  endpointProfile: {
    path: profile.path,
    status: profile.status,
    bytes: profile.bytes,
    elapsedMs: profile.elapsedMs,
  },
  analytics: {
    status: analytics.status,
    bytes: analytics.bytes,
    elapsedMs: analytics.elapsedMs,
    totals: (analytics.body as Record<string, unknown>).totals,
    metadata: (analytics.body as Record<string, unknown>).metadata,
  },
  telemetryStream: streamReceipt,
};

await writeFile(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
console.log(JSON.stringify(receipt, null, 2));
