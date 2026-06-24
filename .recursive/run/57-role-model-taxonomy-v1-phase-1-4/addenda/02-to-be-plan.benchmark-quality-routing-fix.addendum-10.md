# To-Be Plan Addendum 10: Benchmark Quality Routing Fix

Run: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/`
Phase: `02 To-Be Plan Addendum 10`
Artifact: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/02-to-be-plan.benchmark-quality-routing-fix.addendum-10.md`
Status: `LOCKED`
Workflow version: `recursive-mode-audit-v1`
Artifact kind: run-local implementation plan addendum
CreatedAt: `2026-06-24`
Base Artifact: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/02-to-be-plan.md`
Audit Input: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.benchmark-quality-routing-gap.addendum-18.md`
TDD Mode: `strict`
QA Execution Mode: `agent-operated`

## Inputs

- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.benchmark-quality-routing-gap.addendum-18.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/addendum-09/live/pi-88-prompt-routing-report.md`
- `role-model-router/packages/core/src/router.ts` (lines 397-485, `getQualityMetric`, `resolveQualityFreshness`)
- `role-model-router/apps/runtime-host-bridge/src/index.ts` (lines 14959-15153, candidate construction)

## Purpose

This addendum defines the implementation plan to fix the benchmark quality routing gap documented in addendum 18. The `getQualityMetric` function in the router core currently ignores `benchmarkCapability.overallScore` and `routingBenchmarkQuality.quality_score`, causing all models to default to neutral quality (0.500) regardless of benchmark performance.

The fix adds a benchmark quality fallback in `getQualityMetric` so that benchmark scores properly differentiate model quality in routing decisions. The plan uses strict TDD with RED/GREEN evidence, real benchmark runs against all configured endpoints, and end-to-end Pi→Role-Model routing verification after runtime rebuild.

## Non-Negotiable Rules

- Do not modify benchmark data collection or storage — the data is correct; only the consumption is broken
- Preserve existing `judge_score` and `quality_score` priority — benchmark is a fallback, not an override
- Benchmark scores must use freshness decay consistent with other metrics
- Do not change the scoring weight configuration — the default 0.3 quality weight stays

---

## Implementation Steps

### Step 1: TDD — RED Phase

**File:** `role-model-router/packages/core/test/routing-intent.test.ts` (extend existing test file)

**TDD RED tests to add:**

```typescript
test("getQualityMetric uses benchmark quality when live quality is unavailable", () => {
  // Simulate a candidate with benchmark data but no live quality data
  const candidate = createTestCandidate({
    endpointId: "test-endpoint",
    observed: {
      latency_ms_p50: 100,
      latency_ms_p95: 200,
      tokens_per_sec: 50,
      failure_rate: 0,
      cost_per_1k_tokens_est: 0.002,
      // No quality_score or judge_score — simulating no live quality data
    },
    benchmarkCapability: {
      overallScore: 0.85,  // Good benchmark score
    },
  });

  const input = createTestRouteRequestInput({
    observedDataConfig: { enabled: true, metricHalflives: { qualityMs: 15 * 60_000 } },
  });

  const quality = getQualityMetric(candidate, input);
  
  // Should use benchmark quality, not default 0.5
  expect(quality.value).toBeGreaterThan(0.5);
  expect(quality.value).toBeLessThanOrEqual(0.85);
  expect(quality.source).toBe("benchmark");
  expect(quality.raw.benchmark_quality_score).toBe(0.85);
});

test("getQualityMetric prefers live quality_score over benchmark", () => {
  const candidate = createTestCandidate({
    endpointId: "test-endpoint",
    observed: {
      quality_score: 0.92,  // Live quality data exists
      quality_measured_at_ms: Date.now(),
      quality_freshness_score: 1.0,
      quality_live_request_samples: 5,
    },
    benchmarkCapability: {
      overallScore: 0.70,  // Lower benchmark score
    },
  });

  const input = createTestRouteRequestInput({
    observedDataConfig: { enabled: true, metricHalflives: { qualityMs: 15 * 60_000 } },
  });

  const quality = getQualityMetric(candidate, input);
  
  // Should prefer live quality over benchmark
  expect(quality.source).toBe("measured");
  expect(quality.raw.quality_score).toBe(0.92);
});

test("getQualityMetric prefers judge_score over both quality_score and benchmark", () => {
  const candidate = createTestCandidate({
    endpointId: "test-endpoint",
    observed: {
      judge_score: 0.95,
      quality_score: 0.80,
      quality_measured_at_ms: Date.now(),
      quality_freshness_score: 1.0,
    },
    benchmarkCapability: {
      overallScore: 0.60,
    },
  });

  const quality = getQualityMetric(candidate, input);
  
  // judge_score is highest priority
  expect(quality.source).toBe("measured");
  expect(quality.raw.judge_score).toBe(0.95);
});

test("getQualityMetric falls back to default when no quality data exists", () => {
  const candidate = createTestCandidate({
    endpointId: "test-endpoint",
    observed: {},
    // No benchmarkCapability
  });

  const input = createTestRouteRequestInput({
    observedDataConfig: { enabled: false },
  });

  const quality = getQualityMetric(candidate, input);
  
  expect(quality.value).toBe(0.5);
  expect(quality.source).toBe("default");
});

test("benchmark quality with freshness decay approaches neutral over time", () => {
  const candidate = createTestCandidate({
    endpointId: "test-endpoint",
    observed: {},
    benchmarkCapability: {
      overallScore: 1.0,
    },
  });

  // With freshness decay enabled, old benchmark should decay toward 0.5
  const input = createTestRouteRequestInput({
    observedDataConfig: { 
      enabled: true, 
      metricHalflives: { qualityMs: 1 } // Very short halflife
    },
  });

  const quality = getQualityMetric(candidate, input);
  
  // Should be closer to neutral due to decay
  expect(quality.value).toBeLessThan(1.0);
  expect(quality.value).toBeGreaterThan(0.45);
  expect(quality.source).toBe("benchmark");
});

test("multiple candidates with different benchmark scores get different quality metrics", () => {
  const v4pro = createTestCandidate({
    endpointId: "v4-pro",
    observed: {},
    benchmarkCapability: { overallScore: 1.0 },
  });
  const v4flash = createTestCandidate({
    endpointId: "v4-flash", 
    observed: {},
    benchmarkCapability: { overallScore: 0.75 },
  });

  const input = createTestRouteRequestInput({
    observedDataConfig: { enabled: false },
  });

  const proQuality = getQualityMetric(v4pro, input);
  const flashQuality = getQualityMetric(v4flash, input);

  expect(proQuality.value).toBeGreaterThan(flashQuality.value);
  expect(proQuality.source).toBe("benchmark");
  expect(flashQuality.source).toBe("benchmark");
});
```

**Expected RED result:** Tests fail because `getQualityMetric` doesn't check `benchmarkCapability`.

**RED evidence path:** `evidence/logs/red/addendum-10/slice1-benchmark-quality.log`

### Step 2: Implementation — GREEN Phase

**File:** `role-model-router/packages/core/src/router.ts`

**Change in `getQualityMetric` (after the `quality_score` check, before the default return):**

```typescript
// After the existing quality_score check (line ~475), before default return:

  // Benchmark-derived quality (from benchmarkCapability or routingBenchmarkQuality)
  const benchmarkQualityScore = 
    candidate.benchmarkCapability?.overallScore ??
    (candidate as Record<string, unknown>).routingBenchmarkQuality as
      { readonly quality_score?: number } | undefined;
  const bqScore = typeof benchmarkQualityScore === "number" 
    ? benchmarkQualityScore 
    : typeof (benchmarkQualityScore as Record<string, unknown>)?.quality_score === "number"
      ? (benchmarkQualityScore as Record<string, unknown>).quality_score as number
      : undefined;

  if (typeof bqScore === "number") {
    const freshness = resolveQualityFreshness(input, candidate);
    const freshnessWeight = freshness.freshnessWeight;
    // Benchmark scores have fixed freshness from benchmark timestamp
    const benchmarkFreshnessWeight = input.observedDataConfig?.enabled
      ? freshnessWeight
      : 1.0;
    const value = input.observedDataConfig?.enabled
      ? decayToNeutral(bqScore, FRESHNESS_NEUTRAL, benchmarkFreshnessWeight)
      : bqScore;
    return {
      value,
      source: "benchmark",
      raw: {
        benchmark_quality_score: bqScore,
        benchmark_source: "routing-capability-benchmark",
        freshness_weight: benchmarkFreshnessWeight,
        neutral_value: FRESHNESS_NEUTRAL,
        effective_value: value,
      },
    };
  }

  return {
    value: 0.5,
    source: "default",
  };
```

**GREEN evidence path:** `evidence/logs/green/addendum-10/slice1-benchmark-quality.log`

### Step 3: Run Full Test Suite

After the code change, verify no regressions:

```powershell
# From the implementation worktree
corepack pnpm --filter @role-model-router/core test
corepack pnpm --filter @role-model-router/runtime-host-bridge test  
corepack pnpm --filter @try-works/pi-role-model test
```

All existing tests must pass. The new benchmark quality tests must pass.

**GREEN evidence path:** `evidence/logs/green/addendum-10/slice2-full-suite.log`

### Step 4: Rebuild and Deploy Runtime

```powershell
# Rebuild affected packages
corepack pnpm --filter @role-model-router/core build
corepack pnpm --filter @role-model-router/runtime-host-bridge build
corepack pnpm --filter @role-model-router/runtime-ui build

# Kill old runtime and restart
# Kill vendor processes
# Clear stale state
# Start runtime on :3456
```

**GREEN evidence path:** `evidence/logs/green/addendum-10/slice3-rebuild-deploy.log`

### Step 5: Run Fresh Benchmark

With the rebuilt runtime, run a new benchmark to generate fresh benchmark data:

```bash
POST /api/role-model/benchmark/runs
```

Monitor until completion. Verify the benchmark produces `endpointGrades` with `overallScore` per endpoint.

**Evidence path:** `evidence/logs/addendum-10/live/benchmark-run.log`

### Step 6: Verify Quality Scores in Routing Decisions

After the benchmark completes, send test requests and verify:

1. **Quality source is "benchmark"** for all three models (no live quality data exists yet)
2. **v4-pro gets quality > 0.85** (benchmark 1.0 with some freshness decay)
3. **v4-flash gets quality ~0.70-0.75** (benchmark 0.75)
4. **kimi gets quality > 0.85** (benchmark 1.0)

Send 10 test requests with role_model intent:

```bash
for each model in default.decision-only:
  POST /v1/chat/completions with role_model.intent
  GET /api/role-model/router/decisions/{requestId}
  Verify: normalizedIntent.quality.source === "benchmark"
  Verify: normalizedIntent.quality.value > 0.5
```

**Evidence path:** `evidence/logs/addendum-10/live/quality-verification.log`

### Step 7: Re-Run 88-Prompt Pi Routing Test

Run the full 88-prompt routing test from addendum 09 to measure the impact:

```bash
node evidence/logs/addendum-09/live/pi-100-prompt-test.mjs
```

Compare against the baseline from addendum 09:

| Metric | Before (addendum 09) | After (expected) |
|--------|---------------------|-----------------|
| v4-flash share | 89% | ~60-70% (quality penalty from 0.75) |
| v4-pro share | 6% | ~15-25% (quality boost from 1.0) |
| kimi share | 0% | ~5-15% (quality boost, offset by cost/latency) |
| Quality source | "default" (0.5) | "benchmark" (varies) |
| Kimi competitiveness | Never selected | Selected for hard prompts |

**Evidence path:** `evidence/logs/addendum-10/live/pi-88-prompt-after-fix.json`

### Step 8: Verify End-to-End with Hard Role/Task Constraints

Test the interaction between benchmark quality and hard role/task constraints:

1. Send prompts with `requested_role_id` (hard role) to verify quality still feeds correctly
2. Send prompts with `task_hard: true` to verify task policy + quality work together
3. Verify `ROLE_POLICY_APPLIED` + `TASK_POLICY_APPLIED` still appear alongside benchmark quality

**Evidence path:** `evidence/logs/addendum-10/live/hard-constraints-quality.log`

---

## Changed Files

| File | Change |
|------|--------|
| `role-model-router/packages/core/src/router.ts` | Add benchmark quality fallback in `getQualityMetric` (~15 lines) |
| `role-model-router/packages/core/test/routing-intent.test.ts` | Add 6 new tests for benchmark quality |

No other files changed. The benchmark data pipeline (collection, storage, candidate attachment) is already correct.

---

## TDD Evidence Paths

- RED: `evidence/logs/red/addendum-10/`
- GREEN: `evidence/logs/green/addendum-10/`
- Live QA: `evidence/logs/addendum-10/live/`

## Completion Definition

This plan is complete when:

1. 6 new tests pass verifying benchmark quality feeds into `getQualityMetric`
2. `getQualityMetric` returns `source: "benchmark"` with correct values when no live quality data exists
3. Live quality data (`judge_score`, `quality_score`) still takes priority over benchmark
4. All existing test suites pass (core, host-bridge, pi-role-model)
5. Fresh benchmark run completes successfully
6. Routing decisions show `quality.source === "benchmark"` with differentiated values
7. 88-prompt Pi routing test shows redistribution: v4-pro and kimi gain share from v4-flash
8. Kimi becomes competitive (selected for at least some requests)

## Implementation Traceability

| Step | What | TDD | Live Verification |
|------|------|-----|------------------|
| 1 | RED tests | 6 failing tests | N/A |
| 2 | GREEN implementation | 6 passing tests | N/A |
| 3 | Full test suite | All existing tests pass | N/A |
| 4 | Rebuild + deploy | N/A | Runtime on :3456 |
| 5 | Fresh benchmark | N/A | endpointGrades with overallScore |
| 6 | Quality verification | N/A | quality.source === "benchmark" |
| 7 | 88-prompt Pi test | N/A | Redistribution verified |
| 8 | Hard constraints + quality | N/A | POLICY flags + benchmark quality |

## Audit Gate

Audit: PASS

This addendum covers the benchmark quality routing gap with specific implementation steps, TDD test specifications, and end-to-end verification via real benchmark runs and Pi→Role-Model routing tests.

## Coverage Gate

Coverage: PASS

This implementation plan covers the single finding from addendum 18 with strict TDD, automated verification, benchmark re-execution, and live Pi routing analysis.

## Approval Gate

Approval: PASS

This addendum is ready to be used as an effective input for the implementation pass that fixes the benchmark quality routing gap. It remains DRAFT until a recursive lock step is explicitly run.
