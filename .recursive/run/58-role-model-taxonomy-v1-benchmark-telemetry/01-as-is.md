Run: `/.recursive/run/58-role-model-taxonomy-v1-benchmark-telemetry/`
Phase: `01 AS-IS`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/58-role-model-taxonomy-v1-benchmark-telemetry/00-requirements.md`
- `/.recursive/run/58-role-model-taxonomy-v1-benchmark-telemetry/00-worktree.md`
- External proposal: `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/01-as-is.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/03-implementation-summary.md`
Outputs:
- `/.recursive/run/58-role-model-taxonomy-v1-benchmark-telemetry/01-as-is.md`
Scope note: This artifact audits the current benchmark and telemetry infrastructure against run 58 requirements R1-R16.
Status: `LOCKED`
LockedAt: `2026-06-27T10:14:13Z`
LockHash: `a9f1d9b538bb1bb9041c3bbc1d4e205c618cb1b66d43a80bbfe8aaff4731b50f`

Audit Execution Mode: `self-audit`

## TODO

- [x] Re-read locked run 58 requirements
- [x] Re-read Phase 0 worktree artifact
- [x] Inventory current benchmark infrastructure (schemas, runner, judge, summary, UI)
- [x] Inventory current telemetry infrastructure (schemas, recording, dashboards, privacy)
- [x] Inventory current routing quality pipeline
- [x] Map each requirement to current state
- [x] Identify gaps and implementation surface

## Current Behavior by Requirement

| Requirement | Current behavior |
| --- | --- |
| `R1` | AS-IS audit is now documented by this artifact. |
| `R2` | `protocol/schemas/benchmark-suite.schema.json` and `protocol/schemas/benchmark-run.schema.json` exist for core benchmark structure. No taxonomy-specific schemas under `schemas/role-model/taxonomy/`. No `benchmark-result.schema.json`. |
| `R3` | Benchmark cases have `case_id` field (e.g., `h01-implement-two-sum`, `p17-tools-multi-hard`) but no `roleId`, `taskType`, `variant`, `capabilities`, `modalities`, or `toolClasses` fields. Cases are not taxonomy-tagged. |
| `R4` | `endpointGrades` has `overallScore` per endpoint and `byDifficulty` breakdown. No per-role, per-task, per-variant, per-capability, per-modality, or per-tool-class aggregation exists. |
| `R5` | `/app/models/benchmark` exists (1104 lines) with 17 taxonomy-related references — these are run 57 placeholder labels and descriptions, not functional taxonomy filters. No role/task/capability filter controls. Model detail page has no benchmark recommendation state. |
| `R6` | `getQualityMetric` reads `benchmarkCapability.overallScore` (addendum 10) producing `source: "benchmark"` quality. This is general per-model quality, not per-task. No `BENCHMARK_TASK_SCORE` reason code. No task-specific quality adjustment exists. |
| `R7` | No `telemetry-taxonomy-event.schema.json` exists. Telemetry records `normalizedIntent` as opaque blob. `POST /api/role-model/telemetry/query` exists but does not accept taxonomy dimension filters. |
| `R8` | `RuntimeObservationBundle` stores `normalizedIntent` as `Record<string, unknown>` blob. Individual taxonomy dimensions are NOT extracted into top-level indexed fields. Decision ID, endpoint ID, model ID are already recorded. |
| `R9` | Observe routes exist (`observe-activity`, `observe-logs`, `observe-routing`) with telemetry charts and analytics. No taxonomy dimension filters (0 references to `roleId`/`taskType` in observe-requests.tsx). Aggregation is by endpoint/model/time, not by taxonomy dimensions. |
| `R10` | Model detail (`/app/models` inspect panel) has no telemetry rollup. No role/task usage display. No telemetry-derived warnings or strengths. 0 references to telemetry rollup in control-models.tsx. |
| `R11` | 17 redaction-related references in observability code — existing `capturePolicy` with `redactionLevel` and `suppressedFields`. No sampling rate config. No retention TTL. No `retainUntil` field on telemetry records. |
| `R12` | No telemetry-based advisory scoring exists. `getQualityMetric` uses benchmark quality (addendum 10) and live observed performance, but not telemetry-derived failure rates or task-specific performance signals. |

## Relevant Code Pointers

| Area | Files |
| --- | --- |
| Benchmark runner | `role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts` (59 host bridge refs) |
| Benchmark judge | `role-model-router/apps/runtime-host-bridge/src/benchmark-judge-runtime.ts` |
| Benchmark summary | `role-model-router/apps/runtime-host-bridge/src/benchmark-summary.ts` (`endpointGrades` structure) |
| Benchmark UI | `role-model-router/apps/runtime-ui/app/routes/control-benchmark.tsx` (1104 lines) |
| Routing quality | `role-model-router/packages/core/src/router.ts` (`getQualityMetric`, line 430) |
| Telemetry recording | `role-model-router/packages/runtime-observability/src/index.ts` (`RuntimeObservationBundle`, line 319) |
| Telemetry analytics | `role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.ts` |
| Telemetry charts | `role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx` |
| Observe routes | `role-model-router/apps/runtime-ui/app/routes/observe-*.tsx` |
| Model detail | `role-model-router/apps/runtime-ui/app/routes/control-models.tsx` |
| Protocol schemas | `protocol/schemas/benchmark-suite.schema.json`, `protocol/schemas/benchmark-run.schema.json` |

## Gaps Found

| Requirement | Gap |
| --- | --- |
| `R2` | No taxonomy benchmark schemas exist. Existing protocol schemas are general-purpose, not taxonomy-aware. |
| `R3` | Benchmark cases lack taxonomy tags entirely. No `roleId`, `taskType`, or other taxonomy fields on case definitions. |
| `R4` | No per-dimension aggregation. `endpointGrades` only has `overallScore` and `byDifficulty`. |
| `R5` | Benchmark UI has placeholders from run 57 but no functional taxonomy filters. Model detail lacks benchmark recommendations. |
| `R6` | Task-specific benchmark scoring is absent. Only general `overallScore` is used. No `BENCHMARK_TASK_SCORE` reason code. |
| `R7` | No telemetry taxonomy schema. Query API doesn't support taxonomy filters. |
| `R8` | Taxonomy dimensions are embedded in `normalizedIntent` blob, not extracted into queryable fields. |
| `R9` | Observe routes have no taxonomy dimension filters or aggregation. |
| `R10` | Model detail has no telemetry rollup at all. |
| `R11` | No sampling rate or retention TTL configuration. Existing redaction is basic. |
| `R12` | No telemetry-based advisory scoring pipeline. |

## Implementation Surface

All 12 implementation requirements (R2-R12) need new code. None are simple configuration changes. The implementation will touch:

- **4 new schema files** under `schemas/role-model/taxonomy/`
- **2 new TypeScript modules** in `core/src/taxonomy/`
- **Extensions to 5+ existing files** in host bridge (benchmark runner, summary, telemetry recording)
- **Extensions to 4+ UI files** (benchmark page, observe routes, model detail)
- **Extensions to observability package** (telemetry dimensions, privacy controls)

## Traceability

| Requirement | Current State | Gap Severity |
| --- | --- | --- |
| `R1` | Documented by this artifact | — |
| `R2` | Protocol schemas only | High — new schemas needed |
| `R3` | No case tagging | High — all cases need tags |
| `R4` | General scoring only | High — new aggregation needed |
| `R5` | Placeholder UI | Medium — UI extensions |
| `R6` | General quality only | Medium — task-specific scoring |
| `R7` | No telemetry taxonomy schema | High — new schema + API extension |
| `R8` | Opaque blob storage | High — extraction pipeline needed |
| `R9` | No taxonomy filters | Medium — UI extensions |
| `R10` | No telemetry rollup | Medium — UI extensions |
| `R11` | Basic redaction only | Medium — config + cleanup |
| `R12` | No advisory scoring | Medium — new scoring layer |

## Coverage Gate

Coverage: PASS

This artifact audits all 12 implementation requirements (R2-R12) against the current codebase and identifies specific gaps for Phase 2 planning.

## Approval Gate

Approval: PASS

Phase 1 is ready to lock. The AS-IS state is documented and no implementation has started.
