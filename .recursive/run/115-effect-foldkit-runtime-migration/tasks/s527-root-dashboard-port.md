# S527 — port the root Runtime overview page to structural parity

Status: pending
TDD Mode: strict (behavioral RED per section) + structural acceptance gate
Public basis 50d251ab.

Reference: role-model-router/apps/runtime-ui/app/routes/dashboard.tsx plus components overview-chart-block.tsx, candidate-space-chart.tsx, telemetry-charts.tsx, telemetry-controls.tsx, page-primitives.tsx, lib/overview-chart-adapter.ts, lib/telemetry-chart-config.ts and app-shell.tsx sidebar stats. Reference rendered page (live) serves seven chart blocks: Model pool (candidate space SVG + CANDIDATES list with route scores), Token usage over time, Cache efficiency trend, Effective cost over time, Cost avoided over time, Latency trend, Success vs failure volume; plus TIME RANGE/BREAKDOWN/SOURCE/STATUS/DIFFICULTY controls and a sidebar with MODELS/REQUESTS/CACHE/ROUTER ENDPOINT stats.

Current port: src/view.ts Index route renders only filters + "No telemetry yet" (327 chars vs 1745 reference).

Deliverable: Foldkit Index route renders, in the reference order and with the reference labels: the five filter groups (same option sets), the Model pool card (SVG candidate space with quality/cost/speed axes + candidate rows with score and C1/C8/C100·Q·S detail), and all six telemetry chart cards with their titles, subtitles, axes ticks, legends and honest empty-state messages. Charts drawn as inline SVG (no canvas, no external libs). Reuse one chart primitive module for line/area/bars.

Strict RED: a structural test asserting the Index view output contains each reference section title and the candidate-space SVG with axis labels; today it fails. Then implement. Acceptance gate: capture the page against :51970 with the audit tool and require textLen >= 0.9 x reference structural length with all seven section titles present and svg count >= 7; no test edits to unrelated suites; UI tsc 0; s247 3/3; nonempty lint with zero added-line findings; freeze hashes; independent review by a different member; no commit.
