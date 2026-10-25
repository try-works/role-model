# S40a shell rail + Overview charts and window filters (public, R13)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The reference UI (0.0.20 at :3456/app) is the bar. Two gaps are implementable NOW because the host already exposes the data: the global shell rail and the Overview charts with filters.

## Reference evidence

`evidence/reference/reference-app-home.png`, `reference-observe.png`, `reference-studio.png`; the comparison is in `evidence/other/s39-reference-parity.md`.

## 1. Shell rail (all 10 sections share it)

Show in the shell: model count, request count, cache %, router endpoint (`http://<host>:<port>/v1`), execution mode. Source them from endpoints that EXIST (`/api/role-model/runtime/summary`, `/api/role-model/telemetry/summary`, health/status). Capture the real bodies as fixtures. If a value is genuinely unavailable, render an explicit dash with a tooltip/aria-label saying why - never a fabricated zero.

## 2. Overview charts + window filters

- Two charts on `/`: latency (average + p95) and success-vs-failure volume, rendered with the existing pure-SVG primitives (`packages/ui/foldkit-chart.ts`, `foldkit-chart-interaction.ts`) - NOT recharts, no new dependency.
- Window filters Day / Week / Month / 90 days that change the request window and re-render, with the SAME obsolete-work suppression discipline as S13e (old window resolving last must not win).
- Source/status/bucket filters only if the host endpoints accept them; otherwise say so and omit them rather than rendering dead controls.
- States: success (charts with axes/labels), empty (no telemetry: explicit empty message, no fake zero chart), loading (aria-busy), error (exact phrase + role=alert).

## 3. Verification discipline

Captured host fixtures for every endpoint; row-level assertions (point counts, axis labels, totals); a test that a fabricated window response cannot pass; inventory rows updated where a route gains real content.

## Files
`apps/runtime-ui-next/src/**`, tests, fixtures; evidence `s40a-*`.

NO recharts, no ECharts, no new dependency, no legacy/host changes, no packaging, no installs, no commits, no subagents; ephemeral ports and temp state only.

## Report
The rail fields with their sources and fallbacks, the two charts with their data mapping, the filter mechanism and its stale-response test, the fixtures, RED/GREEN, counts and typecheck.