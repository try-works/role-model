#!/usr/bin/env node
/**
 * Reproducible review-instance telemetry seeding.
 *
 * The review UI charts read `runtime_telemetry_records` from the instance's
 * memory.sqlite. Live fixture traffic only produces a handful of rows, so the
 * charts are mostly empty. This script writes a deterministic synthetic day of
 * telemetry into a STOPPED review state root, then prints a summary.
 *
 * Usage:
 *   node scripts/runtime/seed-review-telemetry.mjs --state-root D:/DEV/rm-clean/ui-review9
 *   node scripts/runtime/seed-review-telemetry.mjs --state-root <root> --count 320 --seed 20261104
 *
 * Re-run after deleting the seed rows is safe: rows are prefixed seed-review- and
 * replaced in one transaction. The host must be stopped while this runs (SQLite).
 */
import { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";
import path from "node:path";

const MODELS = [
  { endpointId: "anthropic.team.shared.us-east-1.default", modelId: "claude-3.7-sonnet", providerFamily: "anthropic", providerKind: "remote", region: "us-east-1" },
  { endpointId: "openai.personal.primary.us-east-1.fast", modelId: "openai/gpt-4.1-mini-fast", providerFamily: "openai", providerKind: "remote", region: "us-east-1" },
  { endpointId: "cli.local.coder", modelId: "gpt-5.4", providerFamily: "openai", providerKind: "local", region: "local" },
  { endpointId: "moonshot.personal.primary.global.kimi-k2.5", modelId: "moonshot/kimi-k2.5", providerFamily: "moonshot", providerKind: "remote", region: "global" },
];
const DAY_MS = 24 * 60 * 60 * 1000;

const parseArgs = (argv) => {
  const value = (name, fallback) => {
    const index = argv.indexOf(name);
    return index >= 0 ? argv[index + 1] : fallback;
  };
  const count = Number.parseInt(value("--count", "320"), 10);
  const seed = Number.parseInt(value("--seed", "20261104"), 10);
  const now = value("--now", undefined);
  const stateRoot = value("--state-root", undefined);
  if (!stateRoot) throw new Error("--state-root is required");
  if (!Number.isInteger(count) || count < 1) throw new Error("--count must be a positive integer");
  return { count, seed, nowMs: now === undefined ? Date.now() : Date.parse(now), stateRoot: path.resolve(stateRoot) };
};

const mulberry32 = (seed) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const between = (rng, min, max) => Math.floor(min + rng() * (max - min + 1));
const pick = (rng, values) => values[Math.floor(rng() * values.length)];

export function generateSeedRecords({ count, seed, nowMs }) {
  const rng = mulberry32(seed);
  const rows = [];
  // The activity/overview chart readback pages the newest 50 raw requests before it joins
  // observations, so a 320-row even spread would only draw the last ~4 hours. Keep the
  // newest 50 rows as a 23-hour sweep; the bulk rows sit just older than that sweep. The
  // ledger still carries the full 320 rows and the 50 sweep rows are the chart series.
  const chartCount = Math.min(50, count);
  const chartStart = count - chartCount;
  for (let i = 0; i < count; i += 1) {
    const chartIndex = i - chartStart;
    const ageMs = i >= chartStart
      ? Math.round(DAY_MS - (0.5 + ((chartIndex + 0.5) / chartCount) * 23) * 60 * 60 * 1000)
      : Math.round(DAY_MS - between(rng, 5, 30) * 60 * 1000);
    const created = nowMs - Math.max(60_000, Math.min(DAY_MS - 60_000, ageMs));
    const model = pick(rng, MODELS);
    const failure = rng() < 0.12;
    const status = failure ? pick(rng, [429, 500, 503]) : 200;
    const highLatency = rng() < 0.08;
    const latency = highLatency ? between(rng, 1800, 4500) : between(rng, 110, 900);
    const inputTokens = between(rng, 40, 1200);
    const outputTokens = failure ? between(rng, 0, 20) : between(rng, 10, 450);
    const cacheHit = !failure && rng() < 0.58;
    const cacheRead = cacheHit ? Math.floor(inputTokens * (0.35 + rng() * 0.5)) : 0;
    const id = `seed-review-${String(i + 1).padStart(4, "0")}`;
    rows.push({
      requestId: id,
      routingDecisionId: `route-${id}`,
      endpointId: model.endpointId,
      conversationId: `conversation-${id}`,
      createdAtMs: created,
      modelId: model.modelId,
      requestedModelId: model.modelId,
      selectedModelId: model.modelId,
      providerFamily: model.providerFamily,
      providerKind: model.providerKind,
      region: model.region,
      statusCode: status,
      statusFamily: failure ? "error" : "success",
      errorClass: failure ? (status === 429 ? "rate_limit" : status === 503 ? "provider_unavailable" : "provider_error") : null,
      latencyMs: latency,
      requestLatencyMs: latency,
      providerCompletionLatencyMs: Math.max(0, latency - between(rng, 5, 60)),
      timeToFirstTokenMs: Math.max(1, Math.floor(latency * (0.12 + rng() * 0.25))),
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      promptCacheRequested: 1,
      promptCacheSupported: 1,
      promptCacheUsed: cacheHit ? 1 : 0,
      cacheReadTokens: cacheRead,
      cacheReadTokensSupported: 1,
      cacheWriteTokens: 0,
      cacheWriteTokensSupported: 1,
      cacheState: cacheHit ? "hit" : "miss",
      requestOperation: "chat.completions",
      routingMode: "automatic",
      finishReason: failure ? "error" : "stop",
      toolCallCount: 0,
      toolExecutionCount: 0,
      retryCount: failure && rng() < 0.5 ? 1 : 0,
      streamTextSupported: 0,
      baseCostUsd: (inputTokens / 1_000_000) * 2.5 + (outputTokens / 1_000_000) * 10,
    });
  }
  return rows;
}

export function summarize(rows) {
  if (rows.length === 0) return { count: 0 };
  const latencies = rows.map((r) => r.latencyMs).sort((a, b) => a - b);
  const p = (q) => latencies[Math.min(latencies.length - 1, Math.floor(q * latencies.length))];
  return {
    count: rows.length,
    buckets: new Set(rows.map((r) => new Date(r.createdAtMs).toISOString().slice(11, 13))).size,
    success: rows.filter((r) => r.statusFamily === "success").length,
    failures: rows.filter((r) => r.statusFamily === "error").length,
    cacheHits: rows.filter((r) => r.cacheState === "hit").length,
    totalTokens: rows.reduce((sum, r) => sum + r.totalTokens, 0),
    cacheReadTokens: rows.reduce((sum, r) => sum + r.cacheReadTokens, 0),
    p50LatencyMs: p(0.5),
    p95LatencyMs: p(0.95),
    maxLatencyMs: latencies[latencies.length - 1],
    models: [...new Set(rows.map((r) => r.modelId))],
    firstAt: new Date(Math.min(...rows.map((r) => r.createdAtMs))).toISOString(),
    lastAt: new Date(Math.max(...rows.map((r) => r.createdAtMs))).toISOString(),
  };
}

const INSERT = `INSERT OR REPLACE INTO runtime_telemetry_records (
  request_id, routing_decision_id, endpoint_id, conversation_id, created_at_ms,
  model_id, requested_model_id, selected_model_id, provider_kind, provider_family, region,
  request_operation, routing_mode, status_code, status_family, error_class, finish_reason,
  latency_ms, request_latency_ms, provider_completion_latency_ms, time_to_first_token_ms,
  input_tokens, output_tokens, total_tokens, prompt_cache_requested, prompt_cache_supported,
  prompt_cache_used, cache_read_tokens, cache_read_tokens_supported, cache_write_tokens,
  cache_write_tokens_supported, cache_state, tool_call_count, tool_execution_count, retry_count,
  stream_text_supported, actual_cost_usd, estimated_cost_usd, effective_cost_usd
) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;

export function seedTelemetry({ stateRoot, count, seed, nowMs }) {
  const dbPath = path.join(stateRoot, "standalone-runtime-dev", "memory", "memory.sqlite");
  if (!existsSync(dbPath)) throw new Error(`review database not found: ${dbPath} (start the host once to create the schema, then stop it)`);
  const rows = generateSeedRecords({ count, seed, nowMs });
  // The activity/overview charts read the observations page (bounded page), not every raw
  // telemetry row. Seed observations for a 50-point sweep across the full day so the chart
  // line spans all 24 buckets while the ledger still carries the full 200-500 request set.
  const ordered = [...rows].sort((a, b) => a.createdAtMs - b.createdAtMs);
  const observationRows = ordered.slice(-Math.min(48, ordered.length));
  const observationIds = new Set(observationRows.map((row) => row.requestId));
  const database = new DatabaseSync(dbPath);
  try {
    database.exec("BEGIN");
    database.exec("DELETE FROM runtime_telemetry_records WHERE request_id LIKE 'seed-review-%'");
    database.exec("DELETE FROM runtime_observations WHERE request_id LIKE 'seed-review-%'");
    const statement = database.prepare(INSERT);
    const observationStatement = database.prepare(
      "INSERT OR REPLACE INTO runtime_observations (request_id, routing_decision_id, endpoint_id, conversation_id, created_at_ms, observation_json) VALUES (?,?,?,?,?,?)",
    );
    for (const r of rows) {
      statement.run(
        r.requestId, r.routingDecisionId, r.endpointId, r.conversationId, r.createdAtMs,
        r.modelId, r.requestedModelId, r.selectedModelId, r.providerKind, r.providerFamily, r.region,
        r.requestOperation, r.routingMode, r.statusCode, r.statusFamily, r.errorClass, r.finishReason,
        r.latencyMs, r.requestLatencyMs, r.providerCompletionLatencyMs, r.timeToFirstTokenMs,
        r.inputTokens, r.outputTokens, r.totalTokens, r.promptCacheRequested, r.promptCacheSupported,
        r.promptCacheUsed, r.cacheReadTokens, r.cacheReadTokensSupported, r.cacheWriteTokens,
        r.cacheWriteTokensSupported, r.cacheState, r.toolCallCount, r.toolExecutionCount, r.retryCount,
        r.streamTextSupported, r.baseCostUsd, r.baseCostUsd, r.baseCostUsd,
      );
      if (observationIds.has(r.requestId)) observationStatement.run(
        r.requestId,
        r.routingDecisionId,
        r.endpointId,
        r.conversationId,
        r.createdAtMs,
        JSON.stringify({
          usageEvent: {
            request_id: r.requestId,
            routing_decision_id: r.routingDecisionId,
            endpoint_id: r.endpointId,
            model_id: r.modelId,
            timestamp_ms: r.createdAtMs,
            latency_ms: r.latencyMs,
            tokens_in: r.inputTokens,
            tokens_out: r.outputTokens,
            total_tokens: r.totalTokens,
            error_class: r.errorClass,
            status_code: r.statusCode,
            finish_reason: r.finishReason,
          },
          cacheObservability: {
            cacheReadTokens: r.cacheReadTokens,
            cacheWriteTokens: r.cacheWriteTokens,
            promptCacheUsed: r.promptCacheUsed === 1,
          },
          inspection: { request: { requestCapture: { body: { path: "/v1/chat/completions" }, headers: {} }, responseCapture: { body: {}, headers: { "content-type": "application/json" }, statusCode: r.statusCode } } },
        }),
      );
    }
    database.exec("COMMIT");
  } catch (error) {
    try { database.exec("ROLLBACK"); } catch {}
    throw error;
  } finally {
    database.close();
  }
  return { databasePath: dbPath, summary: summarize(rows) };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replaceAll("\\", "/")}`).href) {
  const options = parseArgs(process.argv.slice(2));
  const result = seedTelemetry(options);
  console.log(JSON.stringify(result, null, 2));
}
