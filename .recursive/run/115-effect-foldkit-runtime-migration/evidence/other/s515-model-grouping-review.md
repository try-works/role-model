# S515 independent review — S514 Model grouping

Date: 2026-10-29. Read-only; no source edits, no commit. I wrote only this file.

## Active model verification

`list_agents`: `s9b-eventlog` = **deepseek-flash**, running. Matches the required live route.

## Frozen hash verified

- `src/model.ts` = `469F6BC7FF6ABDB7FDB50206B060E938CB8D1E69F4AFB966B6D5410A3F0093F8`, 5766 B (match).

## Verdict: bounded PASS

## Grouping and ordering

- 23 fields are composed from `shellFields`, `runtimeFields`, `requestsFields`, `learningFields`, `deviceAuthFields`, `providersFields`, `endpointsFields`, `studioFields`.
- `modelFields` emits the exact historical key sequence: `clicks, controls, deviceAuth, deviceAuthDialog, deviceAuthModalKey, chartInteraction, diagnostics, requestsRanking, requestsRankingMetricListbox, requestsRankingTargetListbox, learningRanking, endpointAdmission, providerAccount, observability, overviewFilters, runtimeConfigEditor, overviewWindowMs, pendingRedirectHref, readbacks, refresh, route, studio, theme` — identical to clean HEAD.
- `Schema.Struct(modelFields)` remains the exported `Model`; runtime shape, hydration and serialization order are unchanged. The duplicate `runtimeFields` references reuse the same schema values; no new field/value.
- `Pick<Model, ...>` slice types and `with*Slice` helpers are additive exports; no runtime code uses them yet, so they cannot alter behavior.

## Compensation evidence

- 7 unchanged suites: **61/61 passed**, exit 0.
- UI `tsc --noEmit`: **0**.
- s247 click budget: **3/3** passed.
- `audit-rendered-ui` spot routes `/`, `/control/endpoints`, `/learning`, `/requests`: **4/4 PASS**, failures 0.
- anti-slop effect:true `src/model.ts`: **0 findings, filesScanned 1**.
- `s514-green.log` header records `TDD Mode pragmatic` and `RED=N/A rationale`; no test edits (`git status` shows only `src/model.ts`).

## Non-blocking notes

- `shellFields` and `runtimeFields` overlap (`runtimeConfigEditor`, `overviewWindowMs`, `pendingRedirectHref`); the values are the same schema objects and `modelFields` order is preserved. A later cleanup could keep runtime fields only in `runtimeFields` to remove the duplication without changing output.
- Spot audits used the current final6 exe/static, not a rebuilt package of this source change; the runtime schema is unchanged and the unchanged suites cover it.
- This is the first S512 design slice only; named view context and update partition remain future work. No whole Workspace claim.

