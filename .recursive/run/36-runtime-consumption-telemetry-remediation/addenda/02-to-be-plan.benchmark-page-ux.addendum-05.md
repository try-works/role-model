Run: `/.recursive/run/36-runtime-consumption-telemetry-remediation/`
Phase: `02 To-Be Plan`
Status: `APPROVED`
Addendum: `05`
Inputs:
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/00-requirements.md`
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/02-to-be-plan.md`
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/addenda/02-to-be-plan.benchmark-routing-visibility.addendum-04.md`
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/addenda/03-implementation-summary.benchmark-routing-visibility.addendum-04.md`
- Operator feedback on `http://127.0.0.1:8091/app/models/benchmark` and Models pillar routes
- `/role-model-router/apps/runtime-ui/app/routes/control-benchmark.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/control-roles.tsx`
- `/role-model-router/apps/runtime-ui/app/lib/shell-header-context.tsx`
- `/role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts`
- `/role-model-router/apps/runtime-host-bridge/src/benchmark-progress.ts`
- `/role-model-router/packages/sqlite-memory/src/index.ts`
Outputs:
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/addenda/02-to-be-plan.benchmark-page-ux.addendum-05.md`
Scope note: Post–addendum-04 operator UX follow-on for the Models pillar and Benchmark page. Removes duplicate shell-header actions, surfaces per-model benchmark scores and routing impact, adds per-endpoint benchmark reset, clarifies two-phase run progress, and resumes in-flight runs after SPA navigation. Does not change benchmark suite content, judge rubrics, or routing algorithms.

## Problem Statement

Addendum 04 placed Benchmark under the Models pillar and exposed benchmark → routing visibility, but operator testing on `:8091` revealed usability gaps:

1. **Duplicate header actions** — `usePageActions` on `/app/models`, `/app/models/benchmark`, and `/app/models/roles` injected buttons (run benchmark, edit roles, model bindings, routing config) that duplicate pillar tabs and in-page links. Other routes use title + description only in the route header.
2. **Low-value last-run panel** — FactCards showing run id and artifact counts did not answer the operator question: *how did each model score, and how does that affect routing?*
3. **No per-model reset** — Operators cannot clear stale benchmark profiles for one endpoint and re-benchmark from scratch without manual database intervention.
4. **Opaque run progress** — During grading the UI read as a single “judge grading pass” even though the runner executes in two distinct phases: record all model responses, then judge all deliverables.
5. **Lost progress on navigation** — `activeRunId` and `running` lived only in React component state. Navigating away unmounted the page and dropped the progress panel although the server-side run continued.

## Fixed Decisions

1. **Models pillar route headers carry no action buttons** — Navigation stays in left-rail pillar + section tabs (Models | Roles | Benchmark). In-page links and run controls remain in body content.
2. **Benchmark scores section is per-model and routing-oriented** — Show overall score, profile quality score, difficulty breakdown, plain-language routing impact, and optional per-case results. Last-run metadata is a single metadata line, not a FactCard block.
3. **Clear benchmark is endpoint-scoped** — One button per model card clears only that endpoint’s `source_type = 'benchmark'` samples and rebuilds observed profiles from remaining live samples.
4. **Progress copy reflects runner phases** — Phase 1: recording responses; Phase 2: judge grading. Backend `runPhase` (`execution` | `grading`) is the source of truth.
5. **Active run recovery uses server + sessionStorage** — `GET /api/role-model/benchmark/runs/active` plus `sessionStorage` key `role-model.benchmark.activeRunId` for SPA remount within the same runtime process.

## Requirement Delta

| ID | Requirement | Disposition |
| --- | --- | --- |
| U1 | Remove `usePageActions` from Models pillar routes (`/app/models`, `/app/models/benchmark`, `/app/models/roles`) | new |
| U2 | Benchmark page primary section shows per-model scores and routing impact | new |
| U3 | Per-model **Clear benchmark data** control with confirmation via disabled/running guard | new |
| U4 | `DELETE /api/role-model/benchmark/endpoints/{endpointId}/data` clears benchmark samples and rebuilds profiles | new |
| U5 | Progress UI labels Phase 1 (recording) vs Phase 2 (judge grading) | new |
| U6 | `GET /api/role-model/benchmark/runs/active` returns in-flight run progress or `null` | new |
| U7 | Benchmark page resumes polling after SPA navigation when run still active | new |
| U8 | Summary API enriches empty `subjects` from router candidate profiles when `result.json` missing | new |

## Requirements

### `U1` Models pillar header consistency

Description:
Route headers on Models pillar pages must not register duplicate action buttons via `usePageActions`.

Acceptance criteria:
- `/app/models`, `/app/models/benchmark`, `/app/models/roles` render title + description only in shell route header
- Pillar section tabs (Models | Roles | Benchmark) remain the canonical cross-page navigation
- In-page links (e.g. Open Local Models, benchmark links on cards) unchanged

### `U2` Per-model scores and routing profiles

Description:
Replace artifact-oriented “last completed benchmark” FactCards with operator-useful per-model score rows.

Acceptance criteria:
- Section title **Model scores and routing profiles**
- Each row shows: model id, endpoint id, benchmark overall %, profile quality score, benchmark sample count, by-difficulty breakdown, routing impact narrative
- Expandable per-case results when run result or summary includes them
- Slim last-run line (date, mode, judge) when a completed run exists
- Empty state directs operator to run benchmark below

### `U3` Clear benchmark data per model

Description:
Operators can reset benchmark-derived routing state for one endpoint.

Acceptance criteria:
- **Clear benchmark data** button on each model score card
- Disabled while a benchmark run is in progress or while that endpoint’s clear is executing
- After clear, card disappears or shows empty-state-consistent inventory; live-request profiles preserved

### `U4` Clear benchmark API

Description:
Bridge exposes an endpoint-scoped clear operation backed by SQLite.

Acceptance criteria:
- `DELETE /api/role-model/benchmark/endpoints/{endpointId}/data` returns `{ endpointId, clearedSampleCount }`
- Deletes `observed_performance_samples` and `observed_performance_samples_by_difficulty` where `source_type = 'benchmark'` for that endpoint
- Rebuilds or deletes `observed_profile_snapshots` and bucket snapshots from remaining samples
- Rejects unknown endpoint ids

### `U5` Two-phase progress labeling

Description:
In-progress panel must reflect execution-then-grading runner semantics.

Acceptance criteria:
- When `runPhase === 'execution'`: header reads **Phase 1 of 2 · Recording responses**
- When `runPhase === 'grading'`: header reads **Phase 2 of 2 · Judge grading**
- Detail line describes current model/case without redundant “judge grading pass” duplication

### `U6` Active run API

Description:
Clients can discover an in-flight benchmark without knowing run id upfront.

Acceptance criteria:
- `GET /api/role-model/benchmark/runs/active` returns latest `status === 'running'` snapshot or JSON `null`
- Completed/failed runs are not returned as active

### `U7` Progress resume on navigation

Description:
Leaving and returning to the Benchmark page restores the progress panel for the same runtime session.

Acceptance criteria:
- On mount, page queries active run API and/or `sessionStorage` run id
- If run still `running`, progress panel and polling resume
- On completed/failed, session key cleared and summary refreshed

### `U8` Summary enrichment fallback

Description:
Older completed runs without `result.json` still surface per-model scores from persisted routing profiles.

Acceptance criteria:
- When `readLatestBenchmarkSummary` returns `subjects: []`, summary handler merges capability/profile data from `listRouterCandidates`
- UI `buildModelScoreRows` continues to prefer live run result, then summary subjects, then `benchmarkCapability`

## Implementation Slices

### SP11-A — Header cleanup (`U1`)

Files:
- `control-benchmark.tsx` — remove `usePageActions` (done in addendum-04 follow-up)
- `control-models.tsx` — remove Benchmark / Edit roles header buttons
- `control-roles.tsx` — remove Model bindings / Routing config header buttons

Verification:
- Manual: route headers show no action buttons on three Models routes

### SP11-B — Scores section (`U2`, `U8`)

Files:
- `control-benchmark.tsx` — `buildModelScoreRows`, `describeRoutingImpact`, scores section layout
- `index.ts` — summary enrichment when `subjects` empty

Verification:
- Manual: Kimi/LFM cards show scores and routing impact after profiles persisted

### SP11-C — Clear benchmark (`U3`, `U4`)

Files:
- `packages/sqlite-memory/src/index.ts` — `clearObservedBenchmarkDataForEndpoint`
- `index.ts` — DELETE handler + `clearBenchmarkEndpointData`
- `runtime-api.ts` — `clearBenchmarkEndpointData`
- `control-benchmark.tsx` — per-card clear button + refresh
- `cli.ts` — wire new handler

Verification:
- `packages/sqlite-memory/test/index.test.ts` — clear removes benchmark samples and profile when no live samples remain

### SP11-D — Progress UX + resume (`U5`, `U6`, `U7`)

Files:
- `benchmark-progress.ts` — `listRunningBenchmarkRuns`, `readActiveBenchmarkRun`
- `index.ts` — `GET /api/role-model/benchmark/runs/active`
- `runtime-api.ts` — `fetchActiveBenchmarkRun`
- `control-benchmark.tsx` — `describeBenchmarkProgress`, resume effect, `sessionStorage` key

Verification:
- Manual: start quick benchmark, navigate to Models, return to Benchmark — progress panel visible
- Manual: during run, Phase 1 label during execution half, Phase 2 during grading half

### SP11-E — Evidence

Verification:
- `evidence/logs/benchmark-page-ux-validation.json`

## Out of Scope

- `OOS-U1`: Cancelling an in-flight benchmark run from the UI
- `OOS-U2`: Clearing benchmark artifact directories on disk (SQLite profile reset only)
- `OOS-U3`: Cross-tab or cross-browser run resume (runtime restart clears in-memory progress)
- `OOS-U4`: Header action audit on non–Models-pillar routes
- `OOS-U5`: Changing benchmark runner step interleaving (still all execution then all grading)

## Traceability (planned)

| Requirement | Primary files |
| --- | --- |
| U1 | `control-benchmark.tsx`, `control-models.tsx`, `control-roles.tsx` |
| U2, U8 | `control-benchmark.tsx`, `index.ts` |
| U3, U4 | `control-benchmark.tsx`, `sqlite-memory/index.ts`, `index.ts`, `runtime-api.ts` |
| U5–U7 | `control-benchmark.tsx`, `benchmark-progress.ts`, `index.ts`, `runtime-api.ts` |

## Dependency Notes

- Builds on addendum 04 (Models pillar placement, summary/preferences APIs, `benchmarkCapability` on candidates).
- Requires runtime rebuild (`package-sea`) after bridge changes; UI rebuild after `control-*.tsx` edits.
- Active-run resume is valid only while `role-model-runtime` process retains `benchmark-progress` in-memory map.

## Coverage Gate

- [x] U1–U8 each have observable acceptance criteria
- [x] Requirements mapped to implementation slices SP11-A–SP11-E
- [x] Fixed decisions record header, clear-scope, and phase-labeling choices
- [x] Out-of-scope boundaries prevent runner algorithm and artifact-deletion drift
- [x] Inputs include operator feedback and affected file paths

Coverage: PASS

## Approval Gate

- [x] User confirms Models pillar header should have no duplicate action buttons
- [x] User confirms per-model clear benchmark and two-phase progress labeling
- [x] User confirms navigation resume expectation (same runtime session)

Approval: PASS
