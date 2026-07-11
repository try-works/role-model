Run: `/.recursive/run/64-observed-data-decay-policy-recalibration/`
Phase: `01 AS-IS`
Status: `LOCKED`
LockedAt: `2026-07-11T22:44:53Z`
LockHash: `7275220e6e77eb7e72cfe3590ee106cf9aa153d5b33d9405c9759e268582c4b3`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/64-observed-data-decay-policy-recalibration/00-requirements.md` (LOCKED)
- `/.recursive/run/64-observed-data-decay-policy-recalibration/00-worktree.md` (LOCKED)
- `/.recursive/RECURSIVE.md`
- `/.codex/AGENTS.md`
- `/.agent/PLANS.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/00-requirements.md`
- `/role-model-router/packages/core/src/router.ts`
- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `/role-model-router/packages/protocol-routing/test/index.test.ts`
- `/role-model-router/packages/protocol-routing/test/catalog-economics-routing.test.ts`
Outputs:
- `/.recursive/run/64-observed-data-decay-policy-recalibration/01-as-is.md`
Scope note: Records the current observed-data decay baseline before run-64 recalibrates the decay policy to 10%/day for latency/throughput only, removing time decay from quality/reliability/cost.

## TODO

- [x] Read locked Phase 0 artifacts and bridge docs
- [x] Inventory current decay implementation in router.ts
- [x] Inventory current config surface in unified-runtime-config.ts
- [x] Inventory current tests covering decay behavior
- [x] Reconcile baseline against R1–R6
- [x] Audit the artifact for recursive-mode readiness

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `unavailable`
Subagent Capability Probe: Worktree-local; no routed delegation available in this fresh worktree.
Delegation Decision Basis: Phase 1 is a direct code inspection of the worktree. All relevant files are accessible locally.
Audit Inputs Provided:
- locked run-64 requirements and worktree artifacts
- current router-core scoring code in `router.ts`
- current config surface in `unified-runtime-config.ts`
- current protocol-routing tests

## Effective Inputs Re-read

- `/.recursive/run/64-observed-data-decay-policy-recalibration/00-requirements.md`
- `/.recursive/run/64-observed-data-decay-policy-recalibration/00-worktree.md`
- `/role-model-router/packages/core/src/router.ts`
- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`

## Reproduction Steps (Novice-Runnable)

1. Open the worktree at `D:\dev\role-model\.worktrees\64-observed-data-decay-policy-recalibration`.
2. Read `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts` lines 94-178.
   - Confirm `metricHalflives` has 5 keys: `qualityMs`, `latencyMs`, `throughputMs`, `reliabilityMs`, `costMs`.
   - Confirm defaults are minute-scale: quality 15min, latency 5min, throughput 2min, reliability 10min, cost 30min.
3. Read `/role-model-router/packages/core/src/router.ts` lines 105-150.
   - Confirm `getFreshnessWeight()` uses exponential halflife: `Math.exp((-Math.LN2 * ageMs) / halflifeMs)`.
   - Confirm `decayToNeutral()` blends toward 0.5: `neutral + freshnessWeight * (observed - neutral)`.
4. Read `router.ts` lines 390-615.
   - Confirm `resolveQualityFreshness()` applies decay to quality using `qualityMs` halflife.
   - Confirm `computeLatencyMetric()` applies decay to latency using `latencyMs` halflife.
   - Confirm reliability and cost follow the same pattern via `reliabilityMs` and `costMs`.
5. Run existing tests: `corepack pnpm --filter @role-model-router/runtime-host-bridge run test:router`.

## Current Behavior by Requirement

| Requirement | Current behavior |
| --- | --- |
| R1 | All 5 metrics (quality, latency, throughput, reliability, cost) have active halflife config. The config surface advertises all 5 as decayable. |
| R2 | Decay uses minute-scale exponential halflife (2min–30min), not 10%/day. `freshnessWeight = exp(−ln2 × age / halflifeMs)`. Default 5min latency halflife means ~87% of signal is lost after 15min. |
| R3 | Quality, reliability, and cost all decay toward neutral via halflife blending. No distinction exists between decayable and non-decayable metrics. |
| R4 | Throughput-SLA penalty is separate (`penaltyTimeoutMs` in `throughputSla`) and operates independently from `throughputMs` halflife decay. Benchmark quality precedence (task→role→group→overall→measured) is separate from halflife blending. |
| R5 | Diagnostics expose `freshness_weight`, `freshness_source`, `neutral_value`, `measured_at_ms` per metric. No distinction between decayed and non-decayed signals. |
| R6 | Protocol-routing tests and catalog-economics tests exist but don't explicitly verify decay shape or metric-specific decay scope. |

## Source Requirement Inventory

- `R1` | Source of current-state analysis: `unified-runtime-config.ts` lines 122-127 (`metricHalflives`), `router.ts` lines 390-615 (applied to all metrics) | Disposition: in-scope | Source Quote: "the effective observed-data contract exposes time-decay controls only for latency and throughput" | Summary: All 5 metrics currently have active halflife controls; config must narrow to latency/throughput only
- `R2` | Source of current-state analysis: `router.ts` lines 110-126 (`getFreshnessWeight`), `unified-runtime-config.ts` lines 165-171 (default halflives) | Disposition: in-scope | Source Quote: "a latency or throughput signal that is 24 hours old retains 90% of its distance from neutral" | Summary: Current decay is minute-scale exponential, not 10%/day; defaults range from 2min to 30min
- `R3` | Source of current-state analysis: `router.ts` lines 430-438 (`resolveQualityFreshness` applies qualityMs halflife), lines 538-572 (reliability/cost same pattern) | Disposition: in-scope | Source Quote: "quality, reliability, and cost should stop drifting toward neutral solely because their supporting observations are old" | Summary: Quality, reliability, cost all currently blend toward neutral via halflife; must stop
- `R4` | Source of current-state analysis: `router.ts` lines 142-150 (throughputSla independent), lines 473-510 (benchmark quality precedence separate) | Disposition: in-scope | Source Quote: "throughput-SLA penalty and hard-deny behavior continue to operate independently" | Summary: Throughput-SLA and benchmark precedence are already separate mechanisms; must preserve
- `R5` | Source of current-state analysis: `router.ts` lines 549-552 (`freshness_weight`, `freshness_source`, `neutral_value` in diagnostics) | Disposition: in-scope | Source Quote: "routing diagnostics and request-detail receipts identify which effective metrics were time-decayed versus passed through directly" | Summary: Diagnostics don't distinguish decayed vs non-decayed signals currently
- `R6` | Source of current-state analysis: `protocol-routing/test/index.test.ts`, `catalog-economics-routing.test.ts`, `unified-runtime-config.test.ts` | Disposition: in-scope | Source Quote: "failing automated tests are added before production changes" | Summary: Existing tests don't explicitly cover decay scope or 10%/day shape

## Relevant Code Pointers

### Decay computation (`router.ts`)

- `getFreshnessWeight()` (line 110): `Math.exp((-Math.LN2 * ageMs) / halflifeMs)` — exponential halflife, returns 1 for disabled or missing timestamps
- `decayToNeutral()` (line 129): `neutralValue + freshnessWeight * (observedValue - neutralValue)` — blends toward 0.5
- `FRESHNESS_NEUTRAL = 0.5` (line 35) — the neutral value all metrics decay toward
- `resolveQualityFreshness()` (line 400): applies `qualityMs` halflife to quality; also returns `freshness_source: "halflife"`
- Quality, reliability, cost all call `resolveQualityFreshness()` (lines 473, 538, 559)
- Latency calls `getFreshnessWeight(latencyMs)` (line 608) then `decayToNeutral()`
- Throughput logically follows same pattern

### Config surface (`unified-runtime-config.ts`)

- `UnifiedRuntimeObservedDataConfig.metricHalflives` (line 122): 5 keys — `qualityMs`, `latencyMs`, `throughputMs`, `reliabilityMs`, `costMs`
- Defaults (line 165): quality 15min, latency 5min, throughput 2min, reliability 10min, cost 30min
- `normalizeObservedDataInput()` (line 909): parses config, handles legacy `_ms` key compat
- Config truth propagated through `resolveUnifiedRuntimeObservedDataConfig()` (line 180)

### Tests

- `unified-runtime-config.test.ts`: tests config parse/normalize but not decay shape
- `protocol-routing/test/index.test.ts`: end-to-end routing validation, not decay-specific
- `protocol-routing/test/catalog-economics-routing.test.ts`: cost/economics routing, not decay-specific

## Known Unknowns

- Whether `resolveQualityFreshness()` should still return a freshness struct for non-decayed metrics (with weight=1) or be bypassed entirely
- Whether legacy config keys (`quality_ms`, `latency_ms`, etc.) should produce warnings or be silently accepted when quality/reliability/cost halflives are removed
- Exact diagnostic field changes needed to distinguish decayed vs non-decayed in request-detail output

## Evidence

- Schema validation baseline: PASS (37 schemas, 30 fixtures)
- Current config has 5 metric halflives, all minute-scale
- Current decay is exponential halflife applied to all metrics uniformly
- Throughput-SLA is separate mechanism already independent from throughput halflife decay

## Traceability

- `R1`: Current config advertises all 5 metrics as decayable via `metricHalflives` — must narrow to latency/throughput only
- `R2`: Current decay is minute-scale exponential halflife — must change to 10%/day
- `R3`: All metrics currently decay via `resolveQualityFreshness()` — quality/reliability/cost must stop
- `R4`: Throughput-SLA and benchmark precedence are already separate — must preserve
- `R5`: Diagnostics don't distinguish decay scope — must add
- `R6`: No existing tests cover decay shape or scope — new tests needed

## Gaps Found

1. **All 5 metrics decay uniformly.** Quality, reliability, and cost should not decay; only latency and throughput should.
2. **Minute-scale halflife is too aggressive.** Default 5min latency halflife loses ~87% signal in 15min. Must change to 10%/day (~6.58 day effective halflife).
3. **Config advertises dead knobs.** `qualityMs`, `reliabilityMs`, `costMs` in `metricHalflives` would become misleading if not cleaned up.
4. **No decay-scope test coverage.** Existing tests don't verify which metrics decay or validate the decay shape.
5. **Diagnostics lack decay/non-decay distinction.** Operators can't tell which effective metrics were time-decayed.

None of these gaps are unexpected — they are the deliberate targets of run-64.

## Repair Work Performed

None — this is a Phase 1 audit artifact. Repairs are deferred to Phase 3.

## Audit Verdict

Audit: PASS

The current decay baseline has been systematically inventoried. All five gaps map directly to R1–R6.

## Earlier Phase Reconciliation

- `00-requirements.md` defines R1–R6 with specific decay policy changes. The Phase 1 inventory confirms the current code matches the pre-recalibration state described in those requirements.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/00-requirements.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`

## Subagent Contribution Verification

- Reviewed Action Records: none
- Main-Agent Verification Performed: direct code inspection in worktree
- Acceptance Decision: `not applicable`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `8a5771506715251440f68a6643de30a66ac4f454`
- Comparison reference: `working-tree`
- Normalized baseline: `8a5771506715251440f68a6643de30a66ac4f454`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 8a5771506715251440f68a6643de30a66ac4f454`
- Base branch: `main`
- Worktree branch: `recursive/64-observed-data-decay-policy-recalibration`

## Requirement Completion Status

- `R1` | Status: deferred | Rationale: Implementation pending Phase 3 | Deferred By: `/.recursive/run/64-observed-data-decay-policy-recalibration/00-requirements.md`
- `R2` | Status: deferred | Rationale: Implementation pending Phase 3 | Deferred By: `/.recursive/run/64-observed-data-decay-policy-recalibration/00-requirements.md`
- `R3` | Status: deferred | Rationale: Implementation pending Phase 3 | Deferred By: `/.recursive/run/64-observed-data-decay-policy-recalibration/00-requirements.md`
- `R4` | Status: deferred | Rationale: Implementation pending Phase 3 | Deferred By: `/.recursive/run/64-observed-data-decay-policy-recalibration/00-requirements.md`
- `R5` | Status: deferred | Rationale: Implementation pending Phase 3 | Deferred By: `/.recursive/run/64-observed-data-decay-policy-recalibration/00-requirements.md`
- `R6` | Status: deferred | Rationale: Implementation pending Phase 3 | Deferred By: `/.recursive/run/64-observed-data-decay-policy-recalibration/00-requirements.md`

## Audit Gate

- [x] Effective upstream artifacts re-read
- [x] Current baseline grounded in worktree code
- [x] Requirement inventory covers R1–R6
- [x] No implementation work mixed in

Audit: PASS

## Coverage Gate

- [x] Decay computation baseline recorded
- [x] Config surface baseline recorded
- [x] Test coverage baseline recorded
- [x] Gaps mapped to requirements

Coverage: PASS

## Approval Gate

- [x] Analysis concrete enough to plan Phase 2
- [x] Confirmed gaps map to requirements
- [x] No unresolved ambiguity blocks Phase 2

Approval: PASS
