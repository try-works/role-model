import assert from "node:assert/strict";
import { test } from "node:test";

import { generateSeedRecords, summarize } from "./seed-review-telemetry.mjs";
import benchSuite from "../../role-model-router/packages/bench-routing/data/routing-capability-suite.json" with { type: "json" };
import registrySources from "../../testdata/router-runtime/fixtures/registry-sources.json" with { type: "json" };

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

test("the review fixture registry provides three runnable endpoints including a distinct judge", () => {
  const cloud = registrySources.cloud.filter((entry) => entry.healthStatus === "healthy");
  const all = [...cloud, ...registrySources.local];
  assert.ok(all.length >= 3, "at least three runnable registry endpoints");
  const ids = all.map((entry) => entry.endpointId);
  const judge = "anthropic.team.shared.us-east-1.default";
  assert.ok(ids.includes(judge), "the dedicated judge endpoint is present");
  const subjects = [
    "openai.personal.primary.us-east-1.fast",
    "cli.local.coder",
  ];
  for (const subject of subjects) {
    assert.ok(ids.includes(subject), "subject endpoint is present: " + subject);
    assert.notEqual(judge, subject);
  }
});

test("the bundled benchmark suite has an eligible quick case for the Run control", () => {
  const quickEligible = benchSuite.cases.filter(
    (entry) => entry.benchmark_eligible === true && entry.quick_benchmark === true,
  );
  assert.ok(quickEligible.length > 0, "at least one benchmark_eligible quick_benchmark case must exist");
});
