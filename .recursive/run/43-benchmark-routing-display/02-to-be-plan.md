Run: `/.recursive/run/43-benchmark-routing-display/`
Phase: `02 To-Be Plan`
Status: `LOCKED`
LockedAt: `2026-06-14T12:15:36Z`
LockHash: `b63eb4e1aac892c5c601cb7abf2fa2b65fa36d21c44ea9a899cf4dd93522d9a8`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/43-benchmark-routing-display/00-requirements.md` (locked)
- `/.recursive/run/43-benchmark-routing-display/00-worktree.md` (locked)
- `/.recursive/run/43-benchmark-routing-display/01-as-is.md` (locked)
Outputs:
- `/.recursive/run/43-benchmark-routing-display/02-to-be-plan.md`
Scope note: ExecPlan for benchmark display, routing quality, dashboard latency, and clear semantics. **No further product commits until locked.**

## TODO

- [x] Map R# to files, slices, and tests
- [x] Define strict RED→GREEN per SP43 slice
- [x] Define Phase 4 floor and Phase 5 Q matrix execution
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Effective Inputs Re-read

- Requirements: R0–R12, Iron Law, Q1–Q11, Phase 4 floor commands
- AS-IS: single latest summary, dashboard detail gap, failure latency null, clear sqlite-only

## Requirement Mapping

| R# | Slice | Primary files | Verification |
| --- | --- | --- | --- |
| R1,R2 | SP43-A | `benchmark-summary.ts`, `index.ts`, `control-benchmark.tsx` | SP43-A tests + Q4/Q6 |
| R3–R6 | SP43-B,C | `benchmark-routing-quality.ts`, `index.ts`, `sqlite-memory` | SP43-B/C tests + Q5 |
| R9 | SP43-D | `dashboard.tsx`, `sqlite-memory`, `index.ts` | SP43-D tests + Q1/Q2 |
| R10 | SP43-E,F | `benchmark-runner.ts`, `router-candidates.tsx` | SP43-E/F + Q7 |
| R11 | SP43-G | `sqlite-memory`, `index.ts`, UI | SP43-G + Q8–Q10 |
| R7 | SP43-I | all tests | phase4 floor log |
| R12 | Phase 5 | SEA rebuild | Q1–Q11 |

## Implementation Steps

1. SP43-D RED → GREEN (dashboard latency)
2. SP43-A RED → GREEN (per-mode summary + run list API)
3. SP43-B RED → GREEN (routing quality unit tests)
4. SP43-C RED → GREEN (candidate API integration)
5. SP43-G RED → GREEN (global + per-endpoint clear)
6. SP43-E RED → GREEN (result.json latency persist)
7. SP43-F UI (benchmark + candidates latency labels)
8. SP43-H UI (dual-run panels wired to SP43-A)
9. Phase 4 verification floor
10. Phase 5 packaged QA (post SEA rebuild)

## Planned Changes by File

### `benchmark-summary.ts`

- `listBenchmarkRuns`, `readLatestBenchmarkSummaryByMode`, `readBenchmarkSummariesByMode`
- Include `latencyMs` in persisted grade types and summary subjects

### `benchmark-runner.ts`

- Persist full case fields in `result.json` including `latencyMs`, `rationale`, `gradingMethod`
- Tag samples with `benchmark_mode` (existing WIP)

### `packages/sqlite-memory/src/index.ts`

- `persistRuntimeTelemetryFailure`: accept optional `latencyMs`
- `clearAllObservedBenchmarkData`, `clearBenchmarkRunArtifacts` (delete artifact dirs)

### `apps/runtime-host-bridge/src/index.ts`

- Wire new benchmark GET routes
- `DELETE /api/role-model/benchmark/data` global clear
- Failure handlers pass elapsed ms to telemetry persist
- Candidate enrichment via `routingBenchmarkQuality`

### `apps/runtime-ui`

- `dashboard.tsx`: pass `detail` to FactCards
- `control-benchmark.tsx`: dual panels, run history, global clear, honest per-model clear labels
- `router-candidates.tsx`: `latency_ms_p50` / `latency_ms_p95`

### `packages/profile-aggregator`

- `benchmark-routing-quality.ts` (strict unit coverage)

## Testing Strategy

| Slice | Mode | RED log | GREEN log |
| --- | --- | --- | --- |
| SP43-D | strict | `sp43-d-dashboard-latency.red.log` | `sp43-d-dashboard-latency.green.log` |
| SP43-A | strict | `sp43-a-per-mode-summary.red.log` | `sp43-a-per-mode-summary.green.log` |
| SP43-B | strict | `sp43-b-routing-quality.red.log` | `sp43-b-routing-quality.green.log` |
| SP43-C | strict | `sp43-c-candidates.red.log` | `sp43-c-candidates.green.log` |
| SP43-G | strict | `sp43-g-clear.red.log` | `sp43-g-clear.green.log` |
| SP43-E | strict | `sp43-e-benchmark-latency-persist.red.log` | `sp43-e-benchmark-latency-persist.green.log` |
| SP43-F/H | pragmatic | — | UI tests + Phase 5 screenshots |

Phase 4 floor: single log `phase4-verification-floor.green.log` running all package tests + `runtime:validate-ui` + `runtime:validate-host`.

## Playwright Plan (if applicable)

Not required. Phase 5 uses agent-operated API probes + screenshots per Q1–Q11.

## Manual QA Scenarios

Execute Q1–Q11 from locked requirements **only after** `runtime:package-sea` rebuild on `:3456`.

## Idempotence and Recovery

- Global clear is destructive; confirmation dialog required
- Benchmark re-run after clear restores state from new artifacts only
- Failed Phase 5 benchmark: one retry per run id, then Phase 1.5 addendum if still INVALID

## Implementation Sub-phases

| Sub-phase | Deliverables |
| --- | --- |
| SP43-D | R9 backend + dashboard UI |
| SP43-A + H | R1,R2 APIs + dual panels |
| SP43-B,C | R3–R6 routing quality |
| SP43-G | R11 clear |
| SP43-E,F | R10 latency |
| Phase 4–5 | R7,R12 verification |

## Traceability

| R# | Slice | Test / QA |
| --- | --- | --- |
| R0 | baseline | run42 spot-check Q11 |
| R1 | SP43-A,H | SP43-A GREEN + Q4 |
| R2 | SP43-A | SP43-A GREEN + Q6 |
| R3 | SP43-B,C | SP43-C + Q5 |
| R4 | SP43-B,C | SP43-B + Q5 hardBlend |
| R5 | SP43-B | version test + Q3/Q4 |
| R6 | SP43-B | legacy unit |
| R7 | Phase 4 | floor log |
| R8 | Phase 6 | DECISIONS |
| R9 | SP43-D | SP43-D + Q1/Q2 |
| R10 | SP43-E,F | SP43-E + Q7 |
| R11 | SP43-G | SP43-G + Q8–Q10 |
| R12 | Phase 5 | all Q rows |

## Subagent Capability Probe

- Subagent Availability: available
- Delegation Decision Basis: self-audit for plan lock
- Audit Execution Mode: self-audit

## Audit Verdict

Audit: PASS

## Coverage Gate

- [x] All R1–R11 mapped to slices and tests
- [x] RED/GREEN paths named
- [x] Phase 4/5 gates defined

Coverage: PASS

## Approval Gate

- [x] Plan bounded; no catalog/OOS work

Approval: PASS
