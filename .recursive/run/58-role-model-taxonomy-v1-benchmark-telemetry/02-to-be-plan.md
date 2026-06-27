Run: `/.recursive/run/58-role-model-taxonomy-v1-benchmark-telemetry/`
Phase: `02 TO-BE Plan`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/58-role-model-taxonomy-v1-benchmark-telemetry/00-requirements.md`
- `/.recursive/run/58-role-model-taxonomy-v1-benchmark-telemetry/00-worktree.md`
- `/.recursive/run/58-role-model-taxonomy-v1-benchmark-telemetry/01-as-is.md`
- External proposal: `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md`
Outputs:
- `/.recursive/run/58-role-model-taxonomy-v1-benchmark-telemetry/02-to-be-plan.md`
TDD Mode: `strict`

Status: `LOCKED`
LockedAt: `2026-06-27T10:14:13Z`
LockHash: `54d2409a49b164cf17d1175e92d38768ed2d06f3db75696634d336e3b4f70f3b`

## TODO

- [x] Map all 12 requirements to implementation slices
- [x] Define TDD approach with RED/GREEN evidence paths
- [x] Specify changed files per slice
- [x] Define verification commands
- [x] Plan Phase 5 QA approach

## Implementation Sub-phases

- **SP1**: Taxonomy-aware benchmark schemas and case tagging (R2, R3)
- **SP2**: Benchmark score aggregation by taxonomy dimensions (R4)
- **SP3**: Benchmark UI with taxonomy filters and model recommendations (R5)
- **SP4**: Task-specific benchmark-informed routing (R6)
- **SP5**: Telemetry taxonomy schema and dimension extraction (R7, R8)
- **SP6**: Observe dashboards with taxonomy filters (R9)
- **SP7**: Model detail telemetry rollup (R10)
- **SP8**: Privacy, retention, and redaction controls (R11)
- **SP9**: Telemetry advisory scoring boundary (R12)

## Planned Changes by File

| Path | Planned change |
| --- | --- |
| `schemas/role-model/taxonomy/benchmark-suite.schema.json` | NEW — taxonomy-specific benchmark suite schema extending protocol schema |
| `schemas/role-model/taxonomy/benchmark-run.schema.json` | NEW — taxonomy-specific benchmark run schema |
| `schemas/role-model/taxonomy/benchmark-result.schema.json` | NEW — benchmark result schema with taxonomy dimensions |
| `schemas/role-model/taxonomy/telemetry-taxonomy-event.schema.json` | NEW — telemetry event schema with taxonomy fields |
| `role-model-router/packages/core/src/taxonomy/benchmark-linkage.ts` | NEW — benchmark-to-taxonomy linkage helpers |
| `role-model-router/packages/core/src/taxonomy/telemetry-linkage.ts` | NEW — telemetry taxonomy dimension extraction |
| `role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts` | Extend — add taxonomy tags to case definitions |
| `role-model-router/apps/runtime-host-bridge/src/benchmark-summary.ts` | Extend — add per-dimension aggregation |
| `role-model-router/apps/runtime-host-bridge/src/index.ts` | Extend — extract taxonomy dimensions in telemetry recording, add benchmark reason codes |
| `role-model-router/apps/runtime-ui/app/routes/control-benchmark.tsx` | Extend — add taxonomy filter controls |
| `role-model-router/apps/runtime-ui/app/routes/control-models.tsx` | Extend — add benchmark recommendation state, telemetry rollup |
| `role-model-router/apps/runtime-ui/app/routes/observe-requests.tsx` | Extend — add taxonomy dimension filters |
| `role-model-router/apps/runtime-ui/app/routes/observe-routing.tsx` | Extend — add taxonomy dimension filters |
| `role-model-router/packages/runtime-observability/src/index.ts` | Extend — add extracted taxonomy fields, privacy controls |
| `role-model-router/packages/core/src/router.ts` | Extend — add task-specific benchmark scoring |

## TDD Slice Plan

### Slice 1: Taxonomy-Aware Benchmark Schemas and Case Tagging (R2, R3)

RED tests:
- Schema validation: taxonomy benchmark schemas reject cases without taxonomy tags
- Schema validation: taxonomy tags reference valid canonical IDs
- Case tagging: `loadRoutingCapabilitySuite()` returns cases with taxonomy fields

Implementation:
- Create `schemas/role-model/taxonomy/benchmark-suite.schema.json` extending `protocol/schemas/benchmark-suite.schema.json` with `taxonomyTags` object
- Create `schemas/role-model/taxonomy/benchmark-run.schema.json` extending `protocol/schemas/benchmark-run.schema.json`
- Create `schemas/role-model/taxonomy/benchmark-result.schema.json`
- Tag existing 12 routing-capability cases with `roleId`, `taskType`, `capabilities`, `modalities`, `toolClasses`
- Tag at minimum: `coder.review`, `researcher.compare_sources`, `support.ticket.reply`, `data.schema.review`

### Slice 2: Benchmark Score Aggregation by Taxonomy Dimensions (R4)

RED tests:
- `buildBenchmarkSummary()` includes `byRole`, `byTask`, `byVariant`, `byCapability`, `byModality`, `byToolClass` aggregates
- Aggregates compute correctly for each dimension: e.g., role average = mean of all cases tagged with that role, variant average = mean of cases with matching variant
- Empty dimensions return empty aggregates, not errors

Implementation:
- Extend `benchmark-summary.ts`: compute per-dimension aggregates from tagged case results
- Add `byRole`, `byTask`, `byVariant`, `byCapability`, `byModality`, `byToolClass` to summary output
- Expose through existing benchmark summary API

### Slice 3: Benchmark UI with Taxonomy Filters (R5)

RED tests:
- Component test: benchmark page renders role/task filter dropdowns
- Component test: selecting a role filter shows only cases tagged with that role
- Component test: model detail shows benchmark recommendation when data exists
- Component test: benchmark recommendation is clearly labeled as "Advisory" and does not visually suggest it overrides role assignments
- Component test: missing-data state renders correctly

Implementation:
- Extend `control-benchmark.tsx`: add filter row with role/task/capability dropdowns
- Extend `control-models.tsx` model detail: add benchmark recommendation section (advisory, clearly labeled)
- Replace run 57 placeholder states with real data-driven views

### Slice 4: Task-Specific Benchmark-Informed Routing (R6)

RED tests:
- Router test: task-specific benchmark quality adjustment applied when benchmark data exists
- Router test: model with higher task-specific score gets preference
- Router test: hard constraints still remove ineligible candidates before benchmark scoring
- Diagnostics test: `BENCHMARK_TASK_SCORE` appears in selection reasons

Implementation:
- In `getQualityMetric` or new `getTaskBenchmarkAdjustment`: look up per-task benchmark score for the requested `task_type`
- Add task-specific quality boost (e.g., `+0.05 * (taskScore - 0.5)` where taskScore > 0.5)
- Add `BENCHMARK_TASK_SCORE` to selection reasons
- Add benchmark reason codes to `routingDiagnostics`

### Slice 5: Telemetry Taxonomy Schema and Dimension Extraction (R7, R8)

RED tests:
- Schema test: `telemetry-taxonomy-event.schema.json` validates taxonomy fields
- Telemetry test: extracted fields present on observation bundle
- Telemetry test: `POST /api/role-model/telemetry/query` accepts `roleId` and `taskType` filter parameters and returns filtered results
- Telemetry test: query without taxonomy filters returns all records (backward compat)
- Backward compat: existing records without taxonomy fields query successfully

Implementation:
- Create `schemas/role-model/taxonomy/telemetry-taxonomy-event.schema.json`
- Create `core/src/taxonomy/telemetry-linkage.ts`: `extractTaxonomyDimensions(normalizedIntent)` → `{ taxonomy_role_id, taxonomy_task_type, ... }`
- In telemetry recording: call `extractTaxonomyDimensions` and store alongside `normalizedIntent` blob
- Extend telemetry query API to accept taxonomy dimension filters

### Slice 6: Observe Dashboards with Taxonomy Filters (R9)

RED tests:
- Component test: observe-requests renders taxonomy filter controls
- Component test: selecting a role filter updates the displayed data
- Component test: cross-filter with endpoint/model works
- Component test: SSE telemetry stream events include taxonomy dimension fields on new records

Implementation:
- Extend `observe-requests.tsx`: add taxonomy dimension filter dropdowns
- Extend `observe-routing.tsx`: add taxonomy dimension filter dropdowns
- Filter controls AND-combine with existing endpoint/model/time filters
- URL-addressable filter state

### Slice 7: Model Detail Telemetry Rollup (R10)

RED tests:
- Component test: model inspect panel shows role/task usage section
- Component test: telemetry-derived warning appears when failure rate > 20%
- Component test: missing-data state when no telemetry exists

Implementation:
- Extend `control-models.tsx` model detail: fetch telemetry aggregates for the model
- Display: recent role/task usage, success/failure/latency by task type
- Display: telemetry-derived warnings (failure rate > 20% for a task over last 100 requests)
- Display: telemetry-derived strengths with clear provenance

### Slice 8: Privacy, Retention, and Redaction (R11)

RED tests:
- Test: redaction policy applied to telemetry records based on config level (`strict` redacts all body, `standard` redacts credential-like patterns, `permissive` redacts only explicit secrets)
- Test: taxonomy dimensions are never redacted regardless of redaction level
- Test: sampling rate correctly drops records at configured percentage
- Test: `retainUntil` timestamp set based on TTL config
- Test: expired records are cleaned up on startup

Implementation:
- Extend `runtime-observability`: add `samplingRate` and `retentionTtl` to config
- In telemetry recording: apply sampling (skip record if random > samplingRate)
- Set `retainUntil = now + retentionTtl` on each record
- Add automatic cleanup of expired records on startup
- Extend existing `capturePolicy` redaction to support configurable levels

### Slice 9: Telemetry Advisory Scoring Boundary (R12)

RED tests:
- Router test: telemetry-based advisory adjustment applied when failure data exists
- Router test: telemetry adjustment does not remove eligible candidates
- Router test: telemetry adjustment does not override role assignments
- Diagnostics test: telemetry reason code visible in routing diagnostics

Implementation:
- In router scoring: after benchmark quality, check telemetry-derived performance for the requested `task_type`
- If telemetry shows elevated failure rate for a model on the requested task, apply a configurable advisory adjustment (default: `-0.05` when failure rate exceeds a configured threshold)
- The threshold and adjustment magnitude are runtime-configurable, not hardcoded
- Add `TELEMETRY_TASK_PERFORMANCE` to selection reasons
- Ensure telemetry adjustments are applied AFTER hard eligibility filtering
- Expose telemetry reason codes in `routingDiagnostics`

## Testing Strategy

Strict TDD. Every production behavior begins with a focused failing test.

Test categories:
- Schema validation tests (R2, R7)
- Benchmark runner/judge tests (R3, R4)
- Router scoring tests (R6, R12)
- Telemetry recording tests (R8, R11)
- UI component tests (R5, R9, R10)
- API integration tests (R7 query extension)

## Verification Commands

```powershell
corepack pnpm run schemas:validate
corepack pnpm --filter @role-model-router/core test
corepack pnpm --filter @role-model-router/runtime-host-bridge test
corepack pnpm --filter @role-model-router/runtime-ui test
corepack pnpm --filter @role-model/schema-tools test
```

## Phase 5 QA Plan

After Phase 4 locks:
1. Rebuild runtime + UI + pi-role-model from worktree
2. Launch rebuilt runtime on known port
3. Run benchmark suite against 3+ configured endpoints
4. Send 20+ classified requests through Pi
5. Verify: benchmark UI taxonomy filters, observe taxonomy filters, model detail rollup, benchmark reason codes in routing diagnostics
6. Verify: failure telemetry, privacy redaction, advisory boundary
7. Record E2E receipts for P5-001 through P6-007

## Traceability

| Requirement | Slice | Key Files |
| --- | --- | --- |
| `R2`, `R3` | SP1 | Schemas, benchmark-runner.ts |
| `R4` | SP2 | benchmark-summary.ts |
| `R5` | SP3 | control-benchmark.tsx, control-models.tsx |
| `R6` | SP4 | router.ts |
| `R7`, `R8` | SP5 | Schemas, telemetry-linkage.ts, index.ts |
| `R9` | SP6 | observe-requests.tsx, observe-routing.tsx |
| `R10` | SP7 | control-models.tsx |
| `R11` | SP8 | runtime-observability/src/index.ts |
| `R12` | SP9 | router.ts |

## Coverage Gate

Coverage: PASS

This plan covers all 12 implementation requirements (R2-R12) across 9 TDD slices with specific file paths, test categories, and verification commands.

## Approval Gate

Approval: PASS

Phase 2 is ready to lock before implementation begins.
