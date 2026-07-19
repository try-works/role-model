Run: `/.recursive/run/58-role-model-taxonomy-v1-benchmark-telemetry/`
Phase: `08 Memory Impact`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/taxonomy-v1.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/.recursive/run/58-role-model-taxonomy-v1-benchmark-telemetry/03-implementation-summary.md`
Outputs:
- `/.recursive/memory/domains/taxonomy-v1.md` (updated)
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md` (updated)
- `/.recursive/run/58-role-model-taxonomy-v1-benchmark-telemetry/08-memory-impact.md`

---

Status: `LOCKED`
LockedAt: `2026-06-27T10:14:13Z`
LockHash: `3b7dbdd03804d05b579c8f40e17a00c2cd51d6beb211f6c25f2e9920519b395a`

## Memory Updates

### taxonomy-v1.md

**Appended under "Canonical Catalog" section:**

- Run 58 added taxonomy-aware benchmark case tagging: 15 routing-capability cases now carry `taxonomy_tags` with canonical role, task, capability, modality, and tool class IDs. The canonical taxonomy IDs used in benchmark tags are: coder, operator, analyst (roles); coder.review, coder.edit, coder.debug.root_cause, coder.refactor, operator.debug.startup, analyst.metrics.define, researcher.compare_sources, support.ticket.reply, data.schema.review (task types).
- Run 58 extended the taxonomy schema set with 4 benchmark/telemetry schemas: `benchmark-suite.schema.json`, `benchmark-run.schema.json`, `benchmark-result.schema.json`, `telemetry-taxonomy-event.schema.json`. All live under `schemas/role-model/taxonomy/` alongside existing taxonomy schemas.
- Taxonomy dimensions used in benchmark aggregation and telemetry analytics: role, task, variant, capability, modality, toolClass. Centralized in `TAXONOMY_BENCHMARK_DIMENSIONS` const in `@role-model/protocol-types`.
- Taxonomy version and classification contract version are preserved in telemetry records via `extractTaxonomyDimensions`.

**Updated fields:**
- Last Validated: `2026-06-27`
- Validated By: `260626-still-diamond`

### runtime-routing-and-provider-capabilities.md

**Appended under relevant sections:**

- `getQualityMetric` now supports per-task benchmark scoring: blends existing `overallScore` with task-specific `taskScores[taskType]` when benchmark data exists. Blend weight configurable via `ObservedDataConfigRecord.benchmarkTaskBlendWeight` (default 0.7).
- Telemetry advisory scoring added: when `telemetryScores.taskSuccessRates[taskType]` shows failure rate exceeding configurable threshold (default 0.20), an advisory penalty (default −0.05) is applied. Penalty is advisory only — hard eligibility filtering runs first, and the penalty cannot remove an otherwise-eligible candidate.
- `EndpointCandidate` extended with `benchmarkCapability.taskScores` and `telemetryScores.taskSuccessRates` fields.
- Difficulty classifier now falls back to controller's modelId when `difficultyClassifier.modelId` is null. This prevents routing degradation when controller is configured but classifier is not.
- Router decision schema extended with `BENCHMARK_TASK_SCORE` and `TELEMETRY_TASK_PERFORMANCE` in `selection_reasons` enum.
- `MetricEntry.source` already includes `"benchmark"` as valid value; `raw` field uses `additionalProperties: true` for forward-compatible diagnostic data.

## Coverage Gate

Coverage: PASS

Two memory domain files updated with run 58 changes. No new domains created.

## Approval Gate

Approval: PASS
