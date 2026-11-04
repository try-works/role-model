import assert from "node:assert/strict";
import { test } from "node:test";

import { generateSeedRecords, summarize } from "./seed-review-telemetry.mjs";

const NOW = Date.parse("2026-11-04T08:00:00.000Z");

test("seed generator is deterministic for a fixed seed", () => {
  const a = generateSeedRecords({ count: 240, seed: 7, nowMs: NOW });
  const b = generateSeedRecords({ count: 240, seed: 7, nowMs: NOW });
  assert.deepEqual(a, b);
});

test("seed generator spans 24 hourly buckets and the last 24h", () => {
  const rows = generateSeedRecords({ count: 240, seed: 7, nowMs: NOW });
  assert.equal(rows.length, 240);
  const buckets = new Set(rows.map((r) => new Date(r.createdAtMs).toISOString().slice(11, 13)));
  assert.equal(buckets.size, 24);
  const summary = summarize(rows);
  assert.equal(summary.buckets, 24);
  assert.ok(summary.lastAt <= new Date(NOW).toISOString());
  assert.ok(summary.firstAt >= new Date(NOW - 24 * 60 * 60 * 1000).toISOString());
});

test("seed data carries a success/failure mix, multiple models and cache/token values", () => {
  const summary = summarize(generateSeedRecords({ count: 320, seed: 20261104, nowMs: NOW }));
  assert.equal(summary.count, 320);
  assert.ok(summary.success > 200, "most requests succeed");
  assert.ok(summary.failures > 10, "failure mix is visible");
  assert.ok(summary.cacheHits > 50, "cache hit mix is visible");
  assert.ok(summary.totalTokens > 1000);
  assert.ok(summary.cacheReadTokens > 0);
  assert.ok(summary.p95LatencyMs > summary.p50LatencyMs);
  assert.ok(summary.models.length >= 3);
});
