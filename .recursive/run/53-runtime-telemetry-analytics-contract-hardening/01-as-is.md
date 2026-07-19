Run: `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/`
Phase: `01 AS-IS`
Status: `LOCKED`
LockedAt: `2026-06-21T18:38:44Z`
LockHash: `2579b9ab424da81b26435bbe115aa9f50b45d48218070f4ac10fa0bafe9ad68f`
Inputs:
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/00-requirements.md`
- `/docs/architecture/11-runtime-ui-telemetry-graph-matrix.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.ts`
- `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `/role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.ts`
- `/role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/requests.tsx`
Outputs:
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/01-as-is.md`
Scope note: This artifact records the pre-change telemetry analytics contract and chart-state findings used to drive Run 53 implementation.

## TODO

- [x] Audit backend analytics aggregation and request-ledger query paths
- [x] Audit metric and dimension support semantics
- [x] Audit shared runtime UI chart state behavior
- [x] Audit request-ledger and analytics filter alignment
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Reproduction Steps (Novice-Runnable)

1. From the Run 53 worktree, run the backend analytics test that creates more than `50` telemetry rows.
2. Query telemetry analytics with `breakdown: "sourceType"` and a `remote` source filter.
3. Compare the analytics totals with the request ledger using the same `sourceTypes=remote` filter.
4. Render unsupported cache-rate and sparse breakdown chart models through the runtime UI tests.

## Current Behavior by Requirement

- `R1`: design-system-first delivery was required, but telemetry chart states were not yet shared design-system vocabulary.
- `R2`: analytics values existed, but applied query, metadata, support, and coverage fields were missing.
- `R3`: analytics inherited request-ledger recent-row behavior.
- `R4`: metric support was implicit and mixed-support cache-rate slices were not truthfully represented.
- `R5`: dimension sparsity was implicit and could produce invisible series.
- `R6`: chart state was not a shared semantic model.
- `R7`: request-ledger filters and analytics filters were not aligned for the shared telemetry controls.
- `R8`: unavailable facts could collapse into unexplained `0`, `null`, or absent series.
- `R9`: the missing behaviors needed RED tests and rebuilt-runtime proof.
- `R10`: the graph matrix still described audit findings rather than the post-run contract.

## Relevant Code Pointers

- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `/role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.ts`
- `/role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/requests.tsx`
- `/docs/architecture/11-runtime-ui-telemetry-graph-matrix.md`

## Known Unknowns

- Fresh packaged-runtime QA state may contain no live telemetry rows, so populated chart behavior must be proven by automated seeded tests unless user/browser QA creates new runtime requests.
- Existing host-bridge validator timeouts are a baseline limitation outside this run.

## Evidence

- AS-IS audit findings are encoded by later RED logs:
  - `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/evidence/logs/red/backend-analytics-contract.red.log`
  - `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/evidence/logs/red/ui-semantic-chart-state.red.log`

## Findings

1. `queryTelemetryAnalyticsData` inherited the request-ledger default limit through the shared listing path, so charts could aggregate the latest `50` rows rather than the full requested slice.
2. The analytics response returned values, buckets, labels, and ranking data but did not return applied query metadata, scanned/matched/aggregated row counts, truncation status, or metric/dimension support coverage.
3. `cacheHitTokenRate` collapsed unsupported rows into an aggregate denominator, causing mixed-support slices to show a misleading rate rather than a supported-subset rate plus coverage status.
4. Breakdown charts could show totals with no visible series when the requested dimension was absent or sparse.
5. Runtime UI chart emptiness was derived mostly from bucket/series shape and did not have a shared semantic model for `unsupported`, `partial`, `truncated`, or sparse-dimension states.
6. `/app/observe/requests` used server-side analytics filters for charts but the request ledger did not receive the same shared filter shape.
7. `/docs/architecture/11-runtime-ui-telemetry-graph-matrix.md` was still an audit draft and needed to become the durable post-run architecture reference.

## Traceability

- `R2`, `R3`, `R4`, `R5`, `R7`, `R8`: backend analytics and ledger gaps.
- `R1`, `R6`: design-system and frontend semantic-state gaps.
- `R9`: TDD and rebuilt-runtime evidence requirements.
- `R10`: durable telemetry architecture documentation gap.

## Coverage Gate

- [x] Backend aggregation and telemetry-query semantics reviewed
- [x] Frontend model/component semantics reviewed
- [x] Documentation source of truth reviewed
- [x] Findings map to Run 53 requirements

Coverage: PASS

## Approval Gate

- [x] AS-IS findings are concrete enough to drive RED tests
- [x] Findings preserve the run boundary and avoid unrelated redesign

Approval: PASS

## Audit Gate

- [x] AS-IS findings have concrete code pointers and reproduction steps

Audit: PASS
