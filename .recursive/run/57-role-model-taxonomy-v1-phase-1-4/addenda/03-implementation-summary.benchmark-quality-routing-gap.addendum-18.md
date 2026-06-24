# Implementation Summary Addendum 18: Benchmark Quality Not Feeding Routing Quality Metric

Run: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/`
Phase: `03 Implementation Summary Addendum 18`
Artifact: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.benchmark-quality-routing-gap.addendum-18.md`
Status: `LOCKED`
Workflow version: `recursive-mode-audit-v1`
Artifact kind: run-local implementation audit findings addendum
CreatedAt: `2026-06-24`
Base Artifact: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/03-implementation-summary.md`
Prior Audit Addendum: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.current-state-gap-analysis.addendum-17.md`
Audit Execution Mode: `self-audit`
Subagent Availability: `not used`
Subagent Capability Probe: `This finding was discovered during live Pi→Role-Model routing analysis (88-prompt test). The controller traced the quality metric pipeline through router source code, observed profile building, and benchmark capability construction. No delegated subagent was needed.`
Delegation Decision Basis: `self-audit selected because the finding required direct source code tracing across router, profile aggregator, and host bridge.`

## Inputs

- `role-model-router/packages/core/src/router.ts` (lines 397-485, `getQualityMetric`)
- `role-model-router/apps/runtime-host-bridge/src/index.ts` (lines 2909-2925, 14959-14985, 15100-15153, 17993-18021)
- `role-model-router/packages/profile-aggregator/src/index.ts` (`resolveRoutingBenchmarkQuality`)
- Live benchmark run: `ff1af6bf-a08c-45f5-afaa-3bc3e62d5f55` (routing-capability-v2 v3.4)
- Live routing decisions from 88-prompt Pi→Role-Model test (2026-06-24)
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/addendum-09/live/pi-88-prompt-routing-report.md`

## Purpose

This addendum documents a finding discovered during end-to-end Pi→Role-Model routing analysis: benchmark quality scores are not being fed into the routing quality metric, causing all models to appear quality-equal (0.500) in routing decisions regardless of their benchmark performance.

## Finding: Benchmark Scores Disconnected from Routing Quality

### Severity: Medium

### Description

The benchmark suite (`routing-capability-v2 v3.4`) produces per-model quality scores: v4-pro (1.00), kimi-k2.7 (1.00), v4-flash (0.75). These scores are correctly stored in `candidate.benchmarkCapability.overallScore` and `candidate.routingBenchmarkQuality.quality_score`. However, the routing quality metric function (`getQualityMetric`) never reads these fields, causing all models to default to the neutral quality score of 0.500.

### Evidence

From live routing decisions during the 88-prompt Pi test:

```
Candidate scores:
  v4-pro   score: 0.7019  latency: 0.473  quality: 0.500  cost: 0.919
  v4-flash score: 0.7011  latency: 0.016  quality: 0.500  cost: 0.974
  kimi     score: 0.6207  latency: 0.492  quality: 0.500  cost: 0.640
```

All three models show `quality: 0.500` despite benchmark scores of 1.00, 1.00, and 0.75 respectively.

### Root Cause

The `getQualityMetric` function in `role-model-router/packages/core/src/router.ts` (line 430) checks quality sources in this order:

1. `candidate.observed?.judge_score` — from live request judging (e.g., a classifier model evaluating response quality). **None exist in the current runtime** — this field is only populated when a judge model actively scores live requests, which is not configured by default.

2. `candidate.observed?.quality_score` — from difficulty-bucketed observed profiles. **None exist for the current routing decisions** — this field is populated from difficulty-bucketed profile data that requires live request samples with quality annotations.

3. Falls back to `{ value: 0.5, source: "default" }` — **always hit in current configuration**.

The benchmark data is stored and available but in fields that `getQualityMetric` never reads:

| Benchmark Field | Populated? | Read by getQualityMetric? |
|---|---|---|
| `candidate.benchmarkCapability.overallScore` | ✅ (1.0, 1.0, 0.75) | ❌ |
| `candidate.routingBenchmarkQuality.quality_score` | ✅ (from benchmark samples) | ❌ |
| `candidate.observed.quality_score` | ❌ (empty) | ✅ (but empty) |
| `candidate.observed.judge_score` | ❌ (empty) | ✅ (but empty) |

### Data Flow Diagram

```
Benchmark Run
  └─ endpointGrades[].overallScore  (v4-pro: 1.0, kimi: 1.0, v4-flash: 0.75)
       │
       ├─ buildBenchmarkCapabilityForEndpoint()     ✅ STORED in candidate.benchmarkCapability
       └─ resolveRoutingBenchmarkQuality()          ✅ STORED in candidate.routingBenchmarkQuality
              │
              ▼
       getQualityMetric(candidate)                  ❌ NEVER READS either field
              │
              ▼
       return { value: 0.5, source: "default" }    ← ALWAYS
```

The benchmark data is correctly placed in the candidate object. The routing code builds and attaches `benchmarkCapability` and `routingBenchmarkQuality` at lines 15148-15153 in the host bridge. These fields are present on every candidate. The `getQualityMetric` function simply does not consider them.

### Impact

**Routing decisions are made without quality differentiation.** All models appear equally capable to the router, so decisions are based purely on latency and cost:

- v4-flash wins 89% of requests because it's cheapest (cost score 0.974) and fast (latency score varies)
- v4-pro wins 6% of requests only when latency/cost accidentally favor it
- Kimi k2.7 wins **0%** of requests — despite perfect 1.00 benchmark — because its cost (0.640) and latency are worse, and it gets no quality boost to compensate

If benchmark quality were fed into the quality metric with the default weight of 0.3 (for declared profiles), the scoring would shift substantially:

| Model | Current Quality | Actual Benchmark | Would Change Routing? |
|-------|----------------|-----------------|----------------------|
| v4-pro | 0.500 (default) | 1.00 | Yes — quality boost would make it competitive for more requests |
| kimi | 0.500 (default) | 1.00 | Yes — quality boost could offset latency/cost disadvantage for hard requests |
| v4-flash | 0.500 (default) | 0.75 | Slight decrease — would correctly reflect its lower benchmark score |

### Recommended Fix

The `getQualityMetric` function should be extended to consider benchmark-derived quality when live quality data is unavailable. After the existing checks for `judge_score` and `quality_score`, add a third check before the default fallback:

```typescript
// In getQualityMetric, after existing checks, before default return:

// 3. Benchmark-derived quality (from benchmarkCapability or routingBenchmarkQuality)
const benchmarkQualityScore = 
  candidate.benchmarkCapability?.overallScore ??
  candidate.routingBenchmarkQuality?.quality_score;
if (typeof benchmarkQualityScore === "number") {
  const freshnessWeight = 1.0; // Benchmark scores don't decay like live metrics
  const value = input.observedDataConfig?.enabled
    ? decayToNeutral(benchmarkQualityScore, FRESHNESS_NEUTRAL, freshnessWeight)
    : benchmarkQualityScore;
  return {
    value,
    source: "benchmark",
    raw: {
      benchmark_quality_score: benchmarkQualityScore,
      freshness_weight: freshnessWeight,
      neutral_value: FRESHNESS_NEUTRAL,
      effective_value: value,
    },
  };
}

return { value: 0.5, source: "default" };
```

This should be placed after the `quality_score` check and before the default return. The `benchmarkCapability.overallScore` provides the aggregate benchmark quality, while `routingBenchmarkQuality.quality_score` provides benchmark sample-derived quality. Using `benchmarkCapability.overallScore` as the primary source is recommended since it represents the aggregate across all benchmark cases.

### Affected Files

| File | Change |
|------|--------|
| `role-model-router/packages/core/src/router.ts` | Add benchmark quality fallback in `getQualityMetric` |
| `role-model-router/packages/core/test/` (routing tests) | Add test verifying benchmark quality feeds into scoring |

### Verification

After the fix, re-run the 88-prompt routing test and verify:
1. v4-pro and kimi show `quality > 0.500` with `source: "benchmark"`
2. v4-flash shows `quality ≈ 0.75` based on benchmark
3. Routing distribution shifts to reflect benchmark quality differences
4. Kimi becomes competitive for hard/complex prompts where quality matters most

---

## Audit Verdict

- Summary: Benchmark quality scores are correctly computed and stored but are not read by the routing quality metric function. All models default to neutral quality (0.500), eliminating quality differentiation from routing decisions.
- Follow-up required: Extend `getQualityMetric` to consider `benchmarkCapability.overallScore`
- Audit: FAIL (quality metric disconnection)

## Coverage Gate

Coverage: PASS

This addendum documents the finding with root cause analysis, data flow tracing, impact assessment, and a recommended fix with specific code location and implementation approach.

## Approval Gate

Approval: PASS

This addendum is ready to serve as the authoritative record of the benchmark quality routing gap. It remains DRAFT until a recursive lock step is explicitly run.
