Run: `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/`
Phase: `05 Manual QA`
Addendum: `horizontal-ranking-legend.03`
Status: `LOCKED`
LockedAt: `2026-06-21T18:55:27Z`
LockHash: `817731ee43e61d78b24fc746271a41217ec5af44f67225f920ad9544a6e70549`
Inputs:
- User browser comment on 2026-06-21 for `/app/observe/requests` Ranked Comparison chart
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/05-manual-qa.md`
- `/role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.ts`
- `/role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx`
Outputs:
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/addenda/05-manual-qa.horizontal-ranking-legend.addendum-03.md`
- `/role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.ts`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
- `/role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx`
- `/role-model-router/apps/runtime-ui/app/components/telemetry-charts.test.tsx`
Scope note: This addendum records the browser-QA repair for horizontal ranking charts whose left-axis category labels could not fit long model or endpoint names.

## TODO

- [x] Record the browser-QA issue
- [x] Apply design-system-first change
- [x] Add RED/GREEN evidence
- [x] Verify rebuilt runtime UI bundle
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Issue

The Ranked Comparison chart on `/app/observe/requests` used a horizontal bar chart with category labels on the left Y-axis. Long model and endpoint identifiers competed with the plot area and could not reliably fit.

## Decision

Keep ranked comparisons as horizontal bars rather than switching to a pie chart. The chart is ranking/outlier-oriented; horizontal bars preserve ordering, magnitude comparison, and long technical labels better than pie slices.

The design-system rule is now: horizontal ranking charts place category labels in a bottom legend, not on the left axis.

## Changes Applied

- Added `chartHorizontalRankingLegend` in `/role-model-router/apps/runtime-ui/app/lib/design-system.ts`.
- Updated `/role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md` to document bottom legend placement for horizontal ranking charts and the decision not to use pie charts for ranked comparisons.
- Updated `/role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx` so `TelemetryRankingBarChart` hides Y-axis category ticks, gives the bar plot the full width, and renders row labels in a bottom legend.
- Added regression coverage in:
  - `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
  - `/role-model-router/apps/runtime-ui/app/components/telemetry-charts.test.tsx`

## TDD Evidence

RED:
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/evidence/logs/red/horizontal-ranking-legend.red.log`

GREEN:
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/evidence/logs/green/horizontal-ranking-legend.green.log`
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/evidence/logs/green/horizontal-ranking-runtime-ui-critical.green.log`
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/evidence/logs/green/horizontal-ranking-runtime-ui-build.green.log`

## Browser Verification

- Rebuilt the runtime UI production bundle.
- Reloaded `http://127.0.0.1:3456/app/observe/requests` in the in-app browser.
- Verified the Ranked Comparison section has `data-chart-horizontal-legend="bottom"`.
- Verified the Ranked Comparison section has no `.recharts-yAxis text` category labels.

Evidence:
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/evidence/manual-qa/observe-requests-horizontal-ranking-bottom-legend.json`

Screenshot capture note: viewport and full-page screenshot capture timed out in the browser bridge, so DOM verification was recorded instead.

## Traceability

- `R1`: design-system-first update before component behavior.
- `R6`: shared chart primitive behavior changed for horizontal ranking state.
- `R9`: RED/GREEN, critical suite, build, and browser DOM evidence recorded.

## Coverage Gate

- [x] Browser-QA issue is captured
- [x] Design-system rule is documented
- [x] Shared primitive applies to all horizontal ranking charts
- [x] Automated and browser verification evidence exists

Coverage: PASS

## Approval Gate

- [x] Fix is shared rather than route-local
- [x] Pie chart alternative was considered and rejected with rationale
- [x] Runtime UI build passed after implementation

Approval: PASS

## Audit Gate

- [x] Addendum cites changed files and verification artifacts

Audit: PASS
