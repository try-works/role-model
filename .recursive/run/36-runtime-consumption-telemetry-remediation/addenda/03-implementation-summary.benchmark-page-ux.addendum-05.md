Run: `/.recursive/run/36-runtime-consumption-telemetry-remediation/`
Phase: `03 Implementation Summary`
Addendum: `05`
Status: `DRAFT`
TDD Mode: `strict` (SP11-C `sqlite-memory` clear test; SP11-A/B manual QA)
Inputs:
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/addenda/02-to-be-plan.benchmark-page-ux.addendum-05.md`
Outputs:
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/addenda/03-implementation-summary.benchmark-page-ux.addendum-05.md`
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/evidence/logs/benchmark-page-ux-validation.json`

## Changes Applied

### SP11-A — Models pillar header cleanup (`U1`)

- `control-benchmark.tsx`: removed `usePageActions` (run benchmark / view candidates / view strategy header strip)
- `control-models.tsx`: removed `usePageActions` (Benchmark models / Edit runtime roles header buttons)
- `control-roles.tsx`: removed `usePageActions` (Model bindings / Routing config header buttons)

### SP11-B — Per-model scores section (`U2`, `U8`)

- `control-benchmark.tsx`:
  - **Model scores and routing profiles** primary section with per-model overall %, profile quality score, difficulty breakdown, routing impact narrative, expandable per-case results
  - Slim last-run metadata line (date, mode, judge)
  - `buildModelScoreRows` merges summary subjects, in-flight result grades, and `benchmarkCapability` / profile fallbacks
- `index.ts` (`readBenchmarkSummary`): when latest run `subjects` empty, enriches from `listRouterCandidateData` profile/capability fields

### SP11-C — Clear benchmark per endpoint (`U3`, `U4`)

- `packages/sqlite-memory/src/index.ts`: `clearObservedBenchmarkDataForEndpoint` deletes benchmark samples, rebuilds or clears profile snapshots
- `index.ts`: `DELETE /api/role-model/benchmark/endpoints/{endpointId}/data`, `clearBenchmarkEndpointData` handler
- `runtime-api.ts`: `clearBenchmarkEndpointData` fetcher
- `control-benchmark.tsx`: **Clear benchmark data** button per model card; refreshes candidates + summary after clear
- `cli.ts`: wired `clearBenchmarkEndpointData`

### SP11-D — Phased progress + navigation resume (`U5`, `U6`, `U7`)

- `benchmark-progress.ts`: `listRunningBenchmarkRuns`, `readActiveBenchmarkRun`
- `index.ts`: `GET /api/role-model/benchmark/runs/active`, `readActiveBenchmarkRun` handler
- `runtime-api.ts`: `fetchActiveBenchmarkRun`
- `control-benchmark.tsx`:
  - `describeBenchmarkProgress` — **Phase 1 of 2 · Recording responses** vs **Phase 2 of 2 · Judge grading**
  - `sessionStorage` key `role-model.benchmark.activeRunId` on run start; cleared on complete/fail
  - Mount effect resumes polling from active API + stored run id

## Requirement Completion Status

| ID | Disposition | Changed Files | Verification |
| --- | --- | --- | --- |
| U1 | verified | `control-benchmark.tsx`, `control-models.tsx`, `control-roles.tsx` | manual: no header action buttons on Models pillar routes |
| U2 | verified | `control-benchmark.tsx` | manual: per-model score rows with routing impact |
| U3 | verified | `control-benchmark.tsx` | manual: clear button per card |
| U4 | verified | `sqlite-memory/index.ts`, `index.ts`, `runtime-api.ts`, `cli.ts` | `sqlite-memory/test/index.test.ts` clear test |
| U5 | verified | `control-benchmark.tsx` | manual: phase labels during execution vs grading |
| U6 | verified | `benchmark-progress.ts`, `index.ts`, `runtime-api.ts`, `cli.ts` | `GET .../runs/active` returns `null` or running snapshot |
| U7 | verified | `control-benchmark.tsx` | manual: navigate away and return during run |
| U8 | verified | `index.ts`, `control-benchmark.tsx` | manual: scores visible from profiles when `result.json` absent |

## Evidence

- `evidence/logs/benchmark-page-ux-validation.json`
- `packages/sqlite-memory`: `vitest run test/index.test.ts` — 20/20 pass (includes `clearObservedBenchmarkDataForEndpoint` test)
- `apps/runtime-ui`: `npm run build` — pass
- `apps/runtime-host-bridge`: `npm run package-sea` — pass (sha256 `3563db57d18fdbfeb8b9098ff097f71e82b56327ecb7fd78438b2ee7a9f2e095`)

## Coverage Gate

- [x] All U1–U8 requirements mapped to changes and verification
- [x] TDD mode declared; automated test for clear path; manual QA for header, phases, resume

Coverage: PASS

## Approval Gate

- [ ] Operator sign-off on live `:8091` after clear + navigate-away resume smoke test

Approval: PENDING
