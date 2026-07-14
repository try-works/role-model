Run: `/.recursive/run/70-cache-hit-token-rate-analytics-fix/`
Phase: `02 TO-BE Plan`
Status: `LOCKED`
LockedAt: `2026-07-14T13:45:08Z`
LockHash: `008767cd06b0e8e4d7628f5ec5203d14cecc101a003de989c938b98d3c6d3981`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/00-requirements.md` (LOCKED)
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/00-worktree.md` (LOCKED)
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/01-as-is.md` (LOCKED)
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/01.5-root-cause.md` (LOCKED)
- `/role-model-router/apps/runtime-ui/app/lib/telemetry-route-models.ts`
- `/role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.ts`
- `/role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx`
- user-approved scope expansion in chat on `2026-07-14`
Outputs:
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/addenda/02-to-be-plan.upstream-gap.00-requirements.addendum-01.md`
Scope note: This addendum records a discovered locked-requirements gap for the shared cache-efficiency chart presentation and constrains the compensation to the existing Overview and Observe surfaces.

## TODO

- [x] Record the upstream gap precisely
- [x] Add discovery evidence (commands, files, outputs)
- [x] State impact and compensation plan
- [x] Update current-phase planning accordingly
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Gap Statement

- Missing or incorrect upstream content:
  - `00-requirements.md` correctly scopes the validated math defect to the backend analytics formula, but it omits a second operator-visible requirement now confirmed during Phase 2 planning: the shared cache-efficiency charts on Overview and Observe plot absolute `cacheHitTokens` together with fractional `cacheHitTokenRate` on a single Y axis.
  - Because the shared line renderer uses one Y axis today, the rate series becomes visually flattened whenever token volume is large. Repairing the denominator alone would still leave the operator-visible chart outcome misleading on both existing surfaces.
  - The locked requirements also allow Phase 5 operator proof on either Overview or Observe. The newly confirmed shared-chart issue affects both surfaces, so rebuilt-runtime verification must now cover both.

## Discovery Evidence

- How the gap was found:
  - The user reviewed the current cache-efficiency charts and supplied Overview and Observe screenshots on `2026-07-14`, explicitly requesting dual Y axes because the same graph displays both absolute cache-hit tokens and cache-hit rate.
  - Phase 2 code inspection confirmed both pages reuse the same metric pair and the same shared line-chart renderer rather than route-local chart code.
- Supporting evidence:
  - `/role-model-router/apps/runtime-ui/app/lib/telemetry-route-models.ts` defines Overview `Cache Efficiency` and Observe `Cache Efficiency Trend` with the same mixed metric pair: `["cacheHitTokens", "cacheHitTokenRate"]`.
  - `/role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.ts` currently models time-series series data without any axis ownership metadata.
  - `/role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx` currently renders `TelemetryLineTimeSeriesChart` with a single `<YAxis {...chartCompactYAxisProps} />`.
  - An ad hoc `tsx` render of `TelemetryLineTimeSeriesChart` on `2026-07-14` returned only the `ResponsiveContainer` shell, proving that Phase 3 renderer verification must use a mocked `recharts` seam plus rebuilt-runtime Phase 5 proof instead of raw SSR markup inspection.

## Impact

- Impact on current phase:
  - Phase 2 cannot remain backend-only. It must plan a narrow shared runtime-ui change covering the existing cache-efficiency charts on both Overview and Observe.
  - Strict TDD scope expands to include runtime-ui route/model/renderer coverage in addition to the host-bridge regression.
- Impact on later phases:
  - Phase 3 must implement both the denominator repair and the shared dual-axis presentation under strict RED-first discipline.
  - Phase 5 must verify the rebuilt runtime on both the Overview cache-efficiency card and the Observe Requests cache-efficiency chart, in addition to backend query proof.

## Compensation Plan

- Tests, validation, or process compensations applied now:
  - Amend `/.recursive/run/70-cache-hit-token-rate-analytics-fix/02-to-be-plan.md` to add shared runtime-ui ownership across `/role-model-router/apps/runtime-ui/app/lib/telemetry-route-models.ts`, `/role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.ts`, and `/role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx`.
  - Keep the UI change narrow: add dual-axis presentation only for the existing mixed-unit cache-efficiency charts, preserve chart titles, metric names, and route ownership, and avoid route-local hacks or broader dashboard redesign.
  - Require RED-first runtime-ui regression coverage via route/model tests and a mocked `recharts` chart-render test because raw server-rendered markup does not expose axes in this package.
  - Expand Phase 5 rebuilt-runtime verification to capture backend query proof plus both Overview and Observe cache-efficiency charts.

## Traceability Impact

- Affected requirements: `R3`, `R5`

## Coverage Gate

- [x] The upstream gap is recorded precisely
- [x] Discovery evidence cites the relevant files and the user-supplied operator evidence
- [x] The compensation plan is concrete, narrow, and actionable in the current phase
- [x] Downstream phases can re-read this addendum without unlocking prior history

Coverage: PASS

## Approval Gate

- [x] The addendum stays within the approved user scope expansion
- [x] The addendum does not edit or relock locked earlier artifacts
- [x] The addendum is ready to be cited by `02-to-be-plan.md` and downstream artifacts

Approval: PASS
