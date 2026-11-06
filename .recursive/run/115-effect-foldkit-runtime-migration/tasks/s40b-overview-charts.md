# S40b Overview charts and window filters (public, R13)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
Slice 2 of the reference parity work: the Overview page must show what the 0.0.20 reference shows instead of an empty readback table.

## Reference

`evidence/reference/reference-app-home.png`: 'Runtime overview' with a latency chart (average + p95 lines) and a success-vs-failure volume chart, plus Day / Week / Month / 90 days filters and source/status/bucket selectors.

## Required work

1. Render the two charts with the now-exported pure-SVG primitive (`@role-model/ui/foldkit-chart`): latency (average and p95 series, ms axis) and volume (success and failure series, count axis). Axes must be labelled; units must be exact (ms, count); series must be distinguishable.
2. Data source: `/api/metrics/page?windowMs=` items (windowed) with the summary as a secondary source only where a field exists. Capture a REAL windowed body as a fixture and derive chart data from it.
3. Window filters: Day / Week / Month / 90 days dispatch a read with the window; the S13e discipline applies - an OLD window resolving LAST must not win, and the rendered period label must match the data shown.
4. Source/status/bucket selectors ONLY if the host accepts those parameters; otherwise omit them and say so - no dead controls.
5. States: success (charts + labels), empty (explicit 'No telemetry in this window', no fake flat-line chart), loading (aria-busy), error (exact phrase + role=alert).
6. Tests: row/point-level assertions (series count, point counts, axis labels, totals) and a captured RED for the fabricated-data guard you owe from slice 1 (fabricated body -> dashes/no chart) and for the stale window race.

## Files
`apps/runtime-ui-next/src/**`, tests, fixtures; evidence `s40b-*` including the RED logs.

NO recharts/ECharts, no new dependency, no legacy/host changes, no packaging, no installs, no commits, no subagents; ephemeral ports and temp state only.

## Report
The chart data mapping (which host field feeds which series), the window mechanism and its stale test, the fixtures with their capture provenance, the four states, the captured REDs, counts and typecheck.