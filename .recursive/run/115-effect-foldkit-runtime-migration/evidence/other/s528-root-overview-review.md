# S528 independent review — S527 root Runtime overview

Date: 2026-10-29. Read-only; no source edits, no commit. I wrote only this file.

## Active model verification

`list_agents`: `s9b-eventlog` = **deepseek-flash**, running. Matches the required live route.

## Frozen hashes verified (relative to `role-model-router/apps/runtime-ui-next`)

- `src/view.ts` = `F14F998D6CCEA8F78CC5976C011FA4FBCD23680148052CF93A33A4075B8DE9E0` (match).
- `src/features/overview/charts.ts` = `DF402B16AAC1E368BC19A339A94AF3D1DB7B9A9C1DB18AF1AA2A50524CAE975A` (match).
- `test/s527-root-overview.test.ts` = `B99E5DAF6BEF88E252BD119AC47F19C7C76B403F7229E03F291A7DAA0EACFAA6` (match).

## Verdict: bounded PASS

## Structural verification

- Seven reference section titles render in reference order: **Model pool**, **Token usage over time**, **Cache efficiency trend**, **Effective cost over time**, **Cost avoided over time**, **Latency trend**, **Success vs failure volume** (`src/view.ts:701-728`).
- Candidate-space SVG has the reference axes **← Cost**, **↑ Quality**, **Speed →** and the **CANDIDATES · ROUTE SCORE (0–1)** list (`charts.ts:54-116`).
- Five filter groups use the reference labels/option sets: **Time range** (Day/Week/Month/90 days), **Breakdown** (Total/By endpoint variant/By upstream model/By provider), **Source filter** (All sources), **Status**, **Difficulty** (`view.ts:664-686`); reference root `_app.json` uses these same labels.
- All charts are inline SVG; `charts.ts` is the single overview chart module. It uses the workspace chart view for line/area and a local bar SVG; no canvas and no external chart dependency. Empty states are honest per card.
- Detail rows include **C** (cost), **Q** (quality), **S** (speed) and route-score formatting; the candidate-space checks are structural, not data-count claims.

## RED/GREEN

- **RED** `s527-red.log`: strict structural test against pre-S527 HEAD fails on **Model pool**; old view text was **Model cost strip** and no seven-section structure. Genuine behavioral RED.
- **GREEN**: s397/s425/s499/s491/s458/s25d/s111/s527 = **8 files, 62/62 passed**, exit 0.
- UI `tsc --noEmit`: **0**.
- s247 click budget: **3/3**.
- Lint: `charts.ts` **0**, `s527` test **0**, `view.ts` **29 findings** (lower than the HEAD baseline 30; zero added-line).

## Structural audit

- I ran `audit-rendered-ui` on the current static (`role-model-router/apps/runtime-ui-next/dist/client`) against the packaged dev exe for `/`: **PASS, textLen 2171**. Reference `_app.json` is **1745**, ratio **1.24x** (>=0.9 target). The test independently asserts seven SVGs and the candidate-space axes.
- Author evidence includes the RED/GREEN logs; a separate author structural-audit log was not present, so this ratio is from my read-only run against the current rebuilt static.

## Non-blocking notes

- `charts.ts` delegates line/area geometry to the workspace `@role-model/ui/foldkit-chart` while bars are local SVG. That satisfies “single chart module/no canvas/no external library,” but the line/area primitive is shared rather than fully local.
- The test asserts titles/axes/control labels but not their DOM order; order is source-verified (charts array) rather than test-enforced.
- No whole Workspace/release-parity claim; this is the root overview structural slice only.

