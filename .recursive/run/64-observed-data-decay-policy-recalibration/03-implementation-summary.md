Run: `/.recursive/run/64-observed-data-decay-policy-recalibration/`
Phase: `03 Implementation Summary`
Status: `LOCKED`
LockedAt: `2026-07-11T22:46:26Z`
LockHash: `d778fdf45eb7de9df662e6a2f1f0b34fa1dcc12cd2db6f33f746a680afdf9f0d`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/64-observed-data-decay-policy-recalibration/00-requirements.md` (LOCKED)
- `/.recursive/run/64-observed-data-decay-policy-recalibration/02-to-be-plan.md` (LOCKED)
Outputs:
- `/.recursive/run/64-observed-data-decay-policy-recalibration/03-implementation-summary.md`
Scope note: Captures the repaired run-64 implementation: narrowed observed-data decay contract, 10%-per-day latency/throughput aging, non-decay for quality/reliability/cost, and aligned diagnostics.

## TODO

- [x] Add failing config tests for the new decay contract
- [x] Add failing router-core tests for the new decay math and non-decay rules
- [x] Add failing protocol-routing tests for local/remote route outcomes
- [x] Update shared types and host-bridge config truth
- [x] Update router scoring and diagnostics
- [x] Update existing fixtures and rerun the router-owned verification floor

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `unavailable`
Subagent Capability Probe: worktree-local only; the repaired implementation was completed directly in this worktree.
Delegation Decision Basis: the changed files were tightly coupled across shared types, config normalization, router scoring, and diagnostics, so direct implementation kept the TDD loop coherent.
Audit Inputs Provided: locked plan, locked requirements, live worktree source files, and RED evidence from the newly added tests.

## Effective Inputs Re-read

- `/.recursive/run/64-observed-data-decay-policy-recalibration/02-to-be-plan.md`
- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/packages/core/src/types.ts`
- `/role-model-router/packages/core/src/router.ts`
- `/role-model-router/packages/runtime-observability/src/index.ts`

## Changes Applied

### `/role-model-router/packages/core/src/types.ts`

- Replaced `ObservedDataConfigRecord.metricHalflives` with `metricDecayPercentPerDay`.
- Narrowed the typed decayable metrics to `latency` and `throughput`.

### `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`

- Replaced the normalized observed-data contract with:
  - `metricDecayPercentPerDay.latency`
  - `metricDecayPercentPerDay.throughput`
- Set defaults to `10` and `10`.
- Accepted both new `metric_decay_percent_per_day` keys and legacy `metric_halflives` / `metricHalflives` inputs for compatibility.
- Normalized legacy latency/throughput halflife keys onto the new contract while intentionally refusing to preserve `quality`, `reliability`, and `cost` decay knobs in canonical rendered truth.
- Updated rendered runtime config text to emit only `metric_decay_percent_per_day`.

### `/role-model-router/packages/core/src/router.ts`

- Replaced the minute-scale half-life math in `getFreshnessWeight()` with the required 10%-per-day curve:
  - `Math.pow(1 - decayPercentPerDay / 100, ageDays)`
- Switched latency and throughput to the new `metricDecayPercentPerDay` config values.
- Removed ordinary time decay from quality, reliability, and cost by keeping their effective freshness weight at `1`.
- Preserved benchmark-quality precedence while surfacing profile freshness metadata only as diagnostics, not as score neutralization.
- Extended raw effective-metric receipts:
  - latency and throughput now emit `freshness_source: "time-decay"`, `time_decay_applied`, and `decay_percent_per_day`
  - quality, reliability, and cost now emit pass-through provenance with `freshness_source: "passthrough"` or `"profile"` and `time_decay_applied: false`

### `/role-model-router/packages/runtime-observability/src/index.ts`

- Extended `routingDiagnostics.effectiveMetrics.*` with optional `freshnessSource` and `timeDecayApplied` fields.

### `/role-model-router/apps/runtime-host-bridge/src/index.ts`

- Threaded `freshnessSource` and `timeDecayApplied` through `summarizeEffectiveMetricsFromDecision()` so request-detail summaries preserve the new diagnostics contract.

### New Tests

- `/role-model-router/apps/runtime-host-bridge/test/observed-data-decay-policy.test.ts`
  - verifies default contract shape, default values, new config key parsing, legacy-key normalization, and canonical render output
- `/role-model-router/packages/core/test/observed-data-decay-policy.test.ts`
  - verifies 24-hour and multi-day decay math, fresh-sample reset behavior, benchmark-quality non-decay, and pass-through reliability/cost
- `/role-model-router/packages/protocol-routing/test/observed-data-decay-policy.test.ts`
  - verifies fresh-local vs stale-remote latency outcomes and benchmark-quality route stability

### Updated Existing Tests

- `/role-model-router/apps/runtime-host-bridge/test/unified-runtime-config.test.ts`
- `/role-model-router/packages/core/test/routing-intent.test.ts`
- `/role-model-router/packages/protocol-routing/test/index.test.ts`
- `/role-model-router/packages/protocol-routing/test/catalog-economics-routing.test.ts`

## TDD Compliance Log

TDD Mode: `strict`

RED Evidence:
- `/.recursive/run/64-observed-data-decay-policy-recalibration/evidence/logs/red/observed-data-decay-red.log`

GREEN Evidence:
- `/.recursive/run/64-observed-data-decay-policy-recalibration/evidence/logs/green/observed-data-decay-green.log`

### Workstream 1 — Config contract narrowing

| Step | Evidence | Status |
| --- | --- | --- |
| RED: expect `metricDecayPercentPerDay` and no rendered legacy decay knobs | host-bridge observed-data config tests failed before the production change | PASS |
| GREEN: normalize and render the new contract | host-bridge observed-data config tests and existing config tests now pass | PASS |

### Workstream 2 — Router decay policy

| Step | Evidence | Status |
| --- | --- | --- |
| RED: encode 24h/48h decay, fresh reset, and non-decay rules | new router-core tests failed before the scoring changes | PASS |
| GREEN: implement 10%-per-day decay for latency and throughput only | router-core observed-data tests now pass | PASS |

### Workstream 3 — Route-level behavior and diagnostics

| Step | Evidence | Status |
| --- | --- | --- |
| RED: encode local/remote route outcomes and benchmark-quality stability | protocol-routing observed-data tests failed before the fix | PASS |
| GREEN: route outcomes now match the required policy | protocol-routing observed-data tests now pass | PASS |
| GREEN: request-detail diagnostics distinguish decayed vs pass-through metrics | bridge/request-detail shaping plus router-owned verification floor stay green | PASS |

## Plan Deviations

None. The repaired implementation followed the locked plan without widening scope.

## Implementation Evidence

| Command | Result |
| --- | --- |
| `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/observed-data-decay-policy.test.ts` | PASS (5 tests) |
| `corepack pnpm --filter @role-model-router/core exec vitest run test/observed-data-decay-policy.test.ts` | PASS (4 tests) |
| `corepack pnpm --filter @role-model-router/protocol-routing exec vitest run test/observed-data-decay-policy.test.ts` | PASS (2 tests) |

## Traceability

- `R1`: shared types and host-bridge config now expose only latency and throughput time-decay controls
- `R2`: router-core now applies the 10%-per-day curve in one owning path
- `R3`: quality, reliability, and cost no longer decay by age
- `R4`: throughput-SLA, benchmark precedence, and eligibility behavior were preserved
- `R5`: effective-metric diagnostics now distinguish time-decayed vs pass-through metrics
- `R6`: new RED-first tests span config, router-core, and protocol-routing layers

## Gaps Found

None. The repaired implementation closes the plan-defined gaps directly.

## Repair Work Performed

- corrected the previously misimplemented config contract rename and normalization path
- corrected router scoring so only latency and throughput time-decay
- corrected diagnostics so non-decayed metrics no longer advertise misleading time-decay behavior
- added missing regression coverage across all required layers

## Audit Verdict

Audit: PASS

## Earlier Phase Reconciliation

- `02-to-be-plan.md` committed to the new config surface, one owning decay formula, diagnostic distinction, and cross-layer RED-first coverage.
- All of those planned surfaces were implemented directly, with no plan drift.

## Subagent Contribution Verification

- Reviewed Action Records: none
- Main-Agent Verification Performed: direct implementation and reread of all changed code and tests against the locked plan
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

- `R1` | Status: implemented | Changed Files: `/role-model-router/packages/core/src/types.ts`, `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`, `/role-model-router/apps/runtime-host-bridge/test/unified-runtime-config.test.ts`, `/role-model-router/apps/runtime-host-bridge/test/observed-data-decay-policy.test.ts` | Implementation Evidence: `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`, `/role-model-router/packages/core/src/types.ts`
- `R2` | Status: implemented | Changed Files: `/role-model-router/packages/core/src/router.ts`, `/role-model-router/packages/core/test/observed-data-decay-policy.test.ts`, `/role-model-router/packages/protocol-routing/test/observed-data-decay-policy.test.ts` | Implementation Evidence: `/role-model-router/packages/core/src/router.ts`
- `R3` | Status: implemented | Changed Files: `/role-model-router/packages/core/src/router.ts`, `/role-model-router/packages/core/test/observed-data-decay-policy.test.ts` | Implementation Evidence: `/role-model-router/packages/core/src/router.ts`
- `R4` | Status: implemented | Changed Files: `/role-model-router/packages/core/src/router.ts`, `/role-model-router/packages/protocol-routing/test/index.test.ts`, `/role-model-router/packages/protocol-routing/test/catalog-economics-routing.test.ts` | Implementation Evidence: `/role-model-router/packages/core/src/router.ts`
- `R5` | Status: implemented | Changed Files: `/role-model-router/packages/core/src/router.ts`, `/role-model-router/packages/runtime-observability/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/src/index.ts` | Implementation Evidence: `/role-model-router/packages/core/src/router.ts`, `/role-model-router/packages/runtime-observability/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `R6` | Status: implemented | Changed Files: `/role-model-router/apps/runtime-host-bridge/test/observed-data-decay-policy.test.ts`, `/role-model-router/packages/core/test/observed-data-decay-policy.test.ts`, `/role-model-router/packages/protocol-routing/test/observed-data-decay-policy.test.ts` | Implementation Evidence: `/role-model-router/apps/runtime-host-bridge/test/observed-data-decay-policy.test.ts`, `/role-model-router/packages/core/test/observed-data-decay-policy.test.ts`, `/role-model-router/packages/protocol-routing/test/observed-data-decay-policy.test.ts`

## Audit Gate

- [x] RED evidence captured
- [x] Production changes match the locked plan
- [x] Diagnostics and compatibility surfaces updated with the implementation

Audit: PASS

## TDD Compliance

- [x] RED tests were added before the repaired production changes
- [x] GREEN results were captured after the repaired changes
- [x] Existing router-owned verification remained green

TDD Compliance: PASS

## Coverage Gate

- [x] Config contract covered
- [x] Router-core behavior covered
- [x] Protocol-routing outcome proof covered
- [x] Existing fixture-based suites updated where the renamed contract changed their inputs

Coverage: PASS

## Approval Gate

- [x] Implementation matches the locked requirements and plan
- [x] No unresolved implementation gap remains
- [x] Ready for Phase 3.5 and Phase 4

Approval: PASS
