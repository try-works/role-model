Run: `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/`
Phase: `05 Manual QA`
Addendum: `horizontal-ranking-plot-height.04`
Status: `LOCKED`
LockedAt: `2026-06-21T19:16:11Z`
LockHash: `b2c8ba1f27c1c0755b3ec55508325d14cd55e7e4689354b0d3d65e3d75214af0`
Inputs:
- User browser screenshots on 2026-06-21 showing horizontal ranking chart cards with legends but no visible bars
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/addenda/05-manual-qa.horizontal-ranking-legend.addendum-03.md`
- `/role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx`
- `/role-model-router/apps/runtime-ui/app/components/telemetry-charts.test.tsx`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
Outputs:
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/addenda/05-manual-qa.horizontal-ranking-plot-height.addendum-04.md`
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/evidence/manual-qa/observe-horizontal-ranking-plot-height.json`
- `/role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx`
- `/role-model-router/apps/runtime-ui/app/components/telemetry-charts.test.tsx`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
Scope note: This addendum records the follow-up repair for horizontal ranking charts whose bottom legend rendered while the Recharts plot had no concrete rendered bar area.

## TODO

- [x] Reproduce the blank chart regression with RED coverage
- [x] Fix the shared horizontal ranking primitive
- [x] Verify targeted tests, critical suite, and production build
- [x] Verify affected charts in the in-app browser
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Issue

After moving horizontal ranking labels from the Y-axis into a bottom legend, some chart cards displayed only title, description, and legend. The affected cards had data-backed legend rows but no visible bars.

## Root Cause

The shared `TelemetryRankingBarChart` wrapped `ResponsiveContainer` in a flex/min-height container. Recharts requires its parent to have a concrete measurable height. The ordinary DOM legend could render, but the SVG plot had unreliable geometry after the legend layout change.

## Changes Applied

- Updated `/role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx` so the horizontal ranking plot uses a fixed `h-[280px]` plot wrapper marked with `data-chart-horizontal-plot="true"`.
- Kept the bottom legend from addendum 03, so long labels remain outside the left axis.
- Added regression assertions in:
  - `/role-model-router/apps/runtime-ui/app/components/telemetry-charts.test.tsx`
  - `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`

## TDD Evidence

RED:
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/evidence/logs/red/horizontal-ranking-plot-height.red.log`

GREEN:
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/evidence/logs/green/horizontal-ranking-plot-height.green.log`
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/evidence/logs/green/horizontal-ranking-plot-height-runtime-ui-critical.green.log`
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/evidence/logs/green/horizontal-ranking-plot-height-build.green.log`

## Browser Verification

- Reloaded `http://127.0.0.1:3456/app/observe/requests` in the in-app browser.
- Reloaded `http://127.0.0.1:3456/app/observe/routing` in the in-app browser.
- Verified the affected horizontal ranking charts have `data-chart-horizontal-plot="true"`, `data-chart-horizontal-legend="bottom"`, a `280px` plot height, and nonzero Recharts bar shapes.

Evidence:
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/evidence/manual-qa/observe-horizontal-ranking-plot-height.json`

## Traceability

- `R1`: design-system regression asserts fixed horizontal plot geometry.
- `R6`: shared chart primitive now provides concrete Recharts plot height.
- `R9`: RED/GREEN, critical suite, build, and browser DOM evidence recorded.

## Coverage Gate

- [x] User-reported blank chart regression is captured
- [x] Shared primitive applies to all horizontal ranking charts
- [x] Automated regression tests cover the plot wrapper
- [x] Browser verification confirms visible bar shapes on affected pages

Coverage: PASS

## Approval Gate

- [x] Fix preserves bottom legend behavior from addendum 03
- [x] Fix is shared rather than route-local
- [x] Runtime UI build passed after implementation

Approval: PASS

## Audit Gate

- [x] Addendum cites changed files and verification artifacts

Audit: PASS
