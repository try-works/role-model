Run: `/.recursive/run/58-role-model-taxonomy-v1-benchmark-telemetry/`
Phase: `06 Decisions Update`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/58-role-model-taxonomy-v1-benchmark-telemetry/05-manual-qa.md`
- `/.recursive/run/58-role-model-taxonomy-v1-benchmark-telemetry/03-implementation-summary.md`
- `/.recursive/DECISIONS.md`
Outputs:
- `/.recursive/DECISIONS.md` (appended)

---

Status: `LOCKED`
LockedAt: `2026-06-27T10:14:13Z`
LockHash: `d0656e39d59724198d2237a0d697ac96df9dd997a0a0f4d8b7f257f374e37a2d`

## Run 58 Decisions

### What Changed

**Benchmark taxonomy schemas and case tagging (Phase 5):**
- Added 4 taxonomy-aware schema files under `schemas/role-model/taxonomy/`: benchmark-suite, benchmark-run, benchmark-result, telemetry-taxonomy-event
- Tagged 15 routing-capability benchmark cases with canonical taxonomy metadata covering 6 roles and 6 task types including all 4 minimum required: coder.review, researcher.compare_sources, support.ticket.reply, data.schema.review
- Extended `BenchmarkSummarySubject` with 6-dimension taxonomy score aggregation (byRole, byTask, byVariant, byCapability, byModality, byToolClass)
- Added benchmark taxonomy pipeline: runner extracts tags from cases → persisted result includes taxonomy context → summary API computes per-dimension aggregates

**Benchmark-informed routing (Phase 5):**
- Added per-task benchmark scoring to router: blends overall benchmark score (0.7 weight) with task-specific benchmark score (0.3 weight) when task data exists
- Added `benchmark_task_score` to quality metric raw output, surfaced in routing diagnostics
- Benchmark scoring applied after hard eligibility filtering, preserving run 57 safety boundaries
- Added configurable blend weights and telemetry advisory thresholds via `ObservedDataConfigRecord`

**Taxonomy-aware telemetry (Phase 6):**
- Added `extractTaxonomyDimensions` to `@role-model/protocol-types` as canonical single source of truth
- Extended `RuntimeObservationBundle` with `taxonomyDimensions` and `privacyReceipt`
- Added `taxonomyRoleId` and `taxonomyTaskType` to `BridgeTelemetryAnalyticsDimension` with full pipeline: extraction from persisted bundle → enrichment in records → filter/breakdown in query API
- Configured via LiteLLM provider YAML with snake_case field names matching `RawLiteLLMProvider` interface

**UI extensions (Phase 5 + 6):**
- Benchmark page (`control-benchmark.tsx`): taxonomy filter card with role/task/capability dropdowns
- Observe routing (`observe-routing.tsx`): taxonomy filter inputs + URL-addressable via `useSearchParams`
- Model detail (`control-models.tsx`): advisory benchmark score label + telemetry rollup DisclosureSection with live `fetchModelTelemetryRollup` API

**Privacy and retention (Phase 6):**
- Added `privacyReceipt` struct to observation bundles with `samplingRate`, `retentionTtlHours`, `retainUntil`
- Added `retain_until_ms` indexed column to `runtime_observations` table with backward-compatible migration
- Added `runRetentionCleanup()` with indexed `DELETE WHERE retain_until_ms < ?`
- DeepSeek account pre-registration in QA bootstrap to avoid LiteLLM validation chicken-and-egg

**Architecture improvements:**
- Re-exported `benchmark-linkage.ts` and `telemetry-linkage.ts` from taxonomy public API
- Created `TAXONOMY_BENCHMARK_DIMENSIONS` const registry in protocol-types
- Made router blend weights and telemetry thresholds configurable
- Added `BENCHMARK_TASK_SCORE` and `TELEMETRY_TASK_PERFORMANCE` to router decision schema
- Fixed difficulty classifier model fallback: when `difficultyClassifier.modelId` is null, falls back to controller's modelId (addendum SP-C1)

### How

Implemented with strict TDD (21 new tests across 5 files, RED→GREEN evidence). All changes follow additive/extension pattern — extend existing code, never replace. 257+ tests across 7 packages pass. All 3 packages build clean.

### What Was Not Done

- Pi-driven E2E verification incomplete: `litellm` Python binary not available in QA environment, blocking remote model execution. Taxonomy telemetry dimensions not populated because observation bundles are only created on successful execution.
- Full model detail telemetry rollup (R10): live API function exists but shows static data because execution fails before telemetry accumulates.
- Redaction level enforcement and sampling rate logic (R11): infrastructure exists, enforcement not tested live.

### Known Issues

- The QA runtime's `start-for-qa.ts` requires the `litellm` binary on PATH for remote execution. Without it, all requests return VENDOR_NOT_CONFIGURED and benchmark scores are 0. The run 58 taxonomy pipeline code is correct — verified through unit tests and local LFM benchmark execution.
- Pi uses the run 57 `pi-role-model` extension by default; run 58 extension was installed but classification metadata injection not verified live due to execution failures.
- Adding a new taxonomy dimension requires touching 12+ files across schemas, types, router, UI, telemetry, and bootstrap layers.
