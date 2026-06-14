Run: `/.recursive/run/43-benchmark-routing-display/`
Phase: `01 AS-IS Analysis`
Status: `LOCKED`
LockedAt: `2026-06-14T12:15:04Z`
LockHash: `6f9d17d4956e03f0b41f6d4a211844bdfc6e4007c7fa9bdcb8ad1264fa028abc`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/43-benchmark-routing-display/00-requirements.md` (locked)
- `/.recursive/run/43-benchmark-routing-display/00-worktree.md` (locked)
Outputs:
- `/.recursive/run/43-benchmark-routing-display/01-as-is.md`
Scope note: Document benchmark display, routing quality, dashboard latency, and clear semantics on baseline `92fbc16` before run 43 product changes.

## TODO

- [x] Inventory benchmark summary/list/clear APIs
- [x] Inventory routing quality and candidate enrichment paths
- [x] Inventory dashboard telemetry latency path
- [x] Document exploratory WIP on worktree branch start
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Effective Inputs Re-read

- `00-requirements.md`: R0–R12, G1–G7, SP43-A–I, Q1–Q11 matrix
- `00-worktree.md`: worktree @ `92fbc166`, diff basis `git diff --name-only 92fbc16`

## Source Requirement Inventory

| R# | Disposition | AS-IS summary |
| --- | --- | --- |
| R0 | in-scope | Baseline `92fbc16`; run 42 tests must regress green |
| R1 | gap | Single global latest run in UI/API |
| R2 | gap | No run list API |
| R3–R4 | partial | Exploratory `benchmark-routing-quality.ts` on branch; not fully wired |
| R5 | gap | Version skew can drop profile quality |
| R6 | gap | No `benchmark_mode` on legacy samples |
| R7 | in-scope | Phase 4 floor not yet run |
| R8 | out-of-phase | Phase 6/8 docs |
| R9 | gap | Dashboard omits `detail`; failures store null latency |
| R10 | gap | `latencyMs` stripped from `result.json`; UI omits latency |
| R11 | gap | Per-endpoint sqlite clear only; artifacts remain |
| R12 | out-of-phase | Phase 5 packaged QA |

## Current Behavior

### Benchmark summary (`R1`, `R2`)

- `readLatestBenchmarkSummary` scans artifact root, picks single latest by `gradingCompletedAtMs` (`benchmark-summary.ts`).
- No `GET /benchmark/runs` list endpoint.
- UI `control-benchmark.tsx` shows one “Last completed run” banner from summary.

### Routing quality (`R3`, `R4`, `R5`)

- Exploratory WIP adds `resolveRoutingBenchmarkQuality`, hard blend, `benchmark_mode` tagging in runner.
- `buildBenchmarkCapabilityForEndpoint` overlays artifact `summarySubject` scores onto profile capability.
- `listRouterCandidates` enrichment partially implemented in WIP `index.ts`.

### Dashboard latency (`R9`)

- `summarizeTelemetryStats` formats avg/p95 (`view-models.ts`, run 41).
- `dashboard.tsx` renders FactCards **without** `detail` prop → p95 never shown.
- `persistRuntimeTelemetryFailure` writes `latency_ms: null` → failure-only windows yield `averageLatencyMs: null` → UI `n/a`.

### Benchmark latency (`R10`)

- Runner captures `latencyMs` per case; `result.json` write strips `latencyMs` from case results.
- `control-benchmark.tsx` per-case panel omits latency.
- `router-candidates.tsx` reads wrong profile keys (`latency_ms` vs `latency_ms_p50`).

### Clear benchmark (`R11`)

- `DELETE /benchmark/endpoints/:id/data` → `clearObservedBenchmarkDataForEndpoint` (sqlite benchmark samples only).
- Artifacts under `benchmark-runs/` untouched.
- UI still shows artifact-based scores via `summary.subjects` after profile clear.

## Exploratory WIP (worktree branch start)

Modified (in scope): `benchmark-runner.ts`, `benchmark-summary.ts`, `index.ts`, `control-benchmark.tsx`, `runtime-api.ts`, `profile-aggregator`, `sqlite-memory`, plus new `benchmark-routing-quality.ts` + test.

Reverted (out of scope): catalog/testdata kimi refresh.

Phase 3 must re-land WIP under strict RED/GREEN per SP43 slices or discard and rewrite with tests first.

## Open Unknowns Resolved

| # | Resolution |
| --- | --- |
| 1 | WIP reconciled in Phase 3 via SP43 strict logs, not merged blindly |
| 2 | Global clear deletes artifact dirs (Phase 2 plan) |
| 3 | Per-model clear hides artifact grades for endpoint in UI (Phase 2 plan) |
| 4 | Bucket routing test status checked in Phase 3 SP43-I |

## Current Behavior by Requirement

See **Current Behavior** sections above mapped to R1–R11. Phase 5 scenarios (R12) deferred.

## Evidence

- Code read: `benchmark-summary.ts`, `dashboard.tsx`, `view-models.ts`, `sqlite-memory` `persistRuntimeTelemetryFailure`, `clearObservedBenchmarkDataForEndpoint`, `control-benchmark.tsx` (2026-06-14)
- Worktree diff inventory @ branch start
- `benchmark-summary.test.ts`: 3/3 pass on worktree

## Known Unknowns

- Whether `routes hard requests using bucketed observed profiles` fails on clean `92fbc16` — resolve in SP43-I RED run

## Relevant Code Pointers

| Area | Path |
| --- | --- |
| Latest summary only | `apps/runtime-host-bridge/src/benchmark-summary.ts` `readLatestBenchmarkSummary` |
| Clear endpoint | `packages/sqlite-memory/src/index.ts` `clearObservedBenchmarkDataForEndpoint` |
| Dashboard cards | `apps/runtime-ui/app/routes/dashboard.tsx` |
| Latency view-model | `apps/runtime-ui/app/lib/view-models.ts` `summarizeTelemetryStats` |
| Failure telemetry | `packages/sqlite-memory/src/index.ts` `persistRuntimeTelemetryFailure` |
| Result.json strip | `apps/runtime-host-bridge/src/benchmark-runner.ts` (~2497) |

## Reproduction Steps (Novice-Runnable)

### R9 — Overview latency n/a with failures

1. Start runtime with telemetry containing failed chat rows only.
2. Open `/app` Overview.
3. Observe Latency card `n/a` while Requests/Failures > 0.

### R11 — Clear does not remove artifact scores

1. Run benchmark; note scores on Models → Benchmark.
2. Click **Clear benchmark data** for one model.
3. Observe profile quality clears but artifact-based overall may remain.

## Traceability

| R# | Gap / note | Phase 2 slice |
| --- | --- | --- |
| R0 | Baseline guard | run42 regression in Phase 4 |
| R1 | G1 dual display | SP43-A, SP43-H |
| R2 | G1 run history | SP43-A |
| R3 | G2 semantics | SP43-B, SP43-C |
| R4 | G3 hard blend | SP43-B, SP43-C |
| R5 | G2 persist n/a | SP43-B |
| R6 | legacy mode | SP43-B unit |
| R7 | verification floor | Phase 4 |
| R8 | docs | Phase 6 |
| R9 | G4 dashboard | SP43-D |
| R10 | G6 bench latency | SP43-E, SP43-F |
| R11 | G7 clear | SP43-G |
| R12 | packaged QA | Phase 5 Q1–Q11 |

## Subagent Capability Probe

- Subagent Availability: available
- Delegation Decision Basis: self-audit (AS-IS is read-only inventory)
- Audit Execution Mode: self-audit

## Audit Verdict

Audit: PASS

## Coverage Gate

- [x] Every in-scope R# has AS-IS disposition
- [x] G1–G7 mapped to gaps
- [x] WIP documented

Coverage: PASS

## Approval Gate

- [x] Sufficient for Phase 2 planning

Approval: PASS
