# S535 independent review — S533 learning/models families

Date: 2026-10-30. Read-only; no source edits, no commit. I wrote only this file.

## Active model verification

`list_agents`: `s9b-eventlog` = **deepseek-flash**, running. Matches the required live route.

## Frozen hashes verified (relative to `role-model-router/apps/runtime-ui-next`)

- `src/features/learning/routes.ts` = `B3EFAA83F8268C87416A875120118DFC6B225FD89C6516B1A6D77BCDF1F165BC` (match).
- `src/features/models/routes.ts` = `B0DBDF366DBF94CB3F1CB8E3624080685A7A9EBFD1AE126B8BFA75D6A633194F` (match).
- `test/s533-learning-models.test.ts` = `DDFDDEA0902870CB74BBC4901270CF9820722EF0105C05E8FAC286A9E61E63A3` (match).
- Current `src/view.ts` = `1BE8A3F2427B9C5695A66D30485A043DAFE6EB6237E68EEE329A4DFDA5548DB6` (current S534-extended bytes, not the author’s older C6EF reference). The 9 registry entries are present and wired to the reviewed route modules.

## Verdict: bounded PASS

## Structural verification

- Nine pages render the reference titles: Learning overview, Learning configuration, Decision receipts, Cohort evidence, Learning history, Learned packs, Model inventory, Create role, Capability benchmark.
- Each page renders at least one table (`thead`+`tbody`, colspan empty row) and one inline-SVG `telemetryChartCard`; the test asserts SVG>=1 and table>=1 per route.
- Selects carry `AriaLabel`: learning filter helper (`routes.ts:31`), model benchmark select (`models/routes.ts:69`); credentials/profile selects are labeled by their field helper.
- Learning overview preserves the S491 ranking surface and the reference sub-blocks “Live replay & evaluation” and “Recent decisions”; the models route includes RUNTIME/COST/BENCHMARK/ROLES subheads.
- Strict RED is genuine: **9/9** fail against pre-S533 HEAD (`s533-red.log`), including the table/SVG count failure for learning history.

## Verification executed

- 10 unchanged/affected suites: **77/77 passed**, exit 0 (s397/s425/s499/s491/s458/s25d/s111/s527/s529/s533).
- UI `tsc --noEmit`: **0**.
- s247 click budget: **3/3**.
- anti-slop effect:true: learning routes **0**, models routes **0**, s533 test **0**; `view.ts` **29 = HEAD baseline**, zero added-line.
- `s533-green.log` records 9/9 rendered-route audit PASS and the structure gate PASS.

## Data disclosure check

- The text ratios are honestly reported and data-dependent: configuration 93.8% PASS, benchmark 597.1% PASS; learning overview 82.6%, decisions 82.2%, history 82.3%, evidence 43.5%, packs 62.9%, models 75.9%, roles 15.6% on empty/fixture local data. No rows are fabricated. This is consistent with the reference pages holding live telemetry/registry data; it is not a structural failure.

## Non-blocking notes

- The learning/models chart cards are structural empty-state charts (`hasData:false` with an empty series), like S529; populated APIs would still need the rows wired into chart series. This is a data-wiring follow-on, not a missing primitive.
- The `/models/roles` 15.6% text ratio reflects the reference’s much larger role catalogue/data surface; the port’s create/catalog/allowlist/edit sections are present but the reference content is data-rich.
- No whole Workspace/release-parity claim; only these nine routes are reviewed.

