# S513 independent review — W1c endpoint-activation feature co-location

Date: 2026-10-29. Read-only; no source edits, no commit. I wrote only this file.

## Active model verification

`list_agents`: `s9b-eventlog` = **deepseek-flash**, running. Matches the required live route.

## Frozen hashes verified (relative to `role-model-router/apps/runtime-ui-next`)

- `src/features/endpoint-activation/model.ts` = `E0750FF26B110D6FE46E863F30AC8F1E8F8DCF1F4C2A2A0859D0513249F393D4` (match).
- `messages.ts` = `79D472902E5B7B757F56744E19CB504C170A56249407EC099D1B092229C60E24` (match).
- `update.ts` = `55642E946A016D395F477543C1C9C89FF3C7E8AFCB5F28881BA7DFF711375B48` (match).
- `view.ts` = `62B67F3CAA1299723806B267CC5135D7FFDABD81D1A577B61084D99E9B217A62` (match).
- `index.ts` = `5F6265BF0B4304DE635D5219BFE0C3E3522F372E9396935E7214D4C94110B157` (match).
- `src/endpoint-activation-tracker.ts` = `8B4632FBE68F3FA16BE4A005036D432ED6C687CFBC2FF9039EAA39681A1FC6A8` (match).
- `src/control-view.ts` = `E2C0DA894579DDB1667BFF3F18CAC3655B8063A9CF7DE1AE12E7C2C2CB328E40` (match).
- `src/update.ts` = `9BB2DD8E58273541BEBFD7F147B488BE4960C16E7DFBC66F10C249B0AC995020` (match).

## Verdict: bounded PASS

## Purity verification

- `features/endpoint-activation/model.ts` is **byte-identical** to clean-HEAD `src/endpoint-activation-tracker.ts` (138 lines); the old path is an `export *` shim, so existing imports resolve unchanged.
- `features/endpoint-activation/view.ts` carries the old `renderEndpointAdmissionForm` markup verbatim (`data-route`, `endpoint-admission-state`, submit/reset/error/summary selectors and labels); `control-view.ts` now only re-exports it.
- `features/endpoint-activation/update.ts` extracts `endpointAdmissionFieldChangedState`, `ModelAddedState`, `ModelRemovedState`, `ResetState`, `CompletionState` with the same busy/needs-reset guards, model-id trim/dedup, reset-pending guard, and status/error/pendingAction logic. Parent submit/settle branches still call `endpointAdmissionCompletion` and `settleEndpointActivation` with the same commands and state.
- `messages.ts` only re-exports existing schemas/types; no message value/flow added.
- **No test edits:** `git status` shows no changes under `test/`; unchanged suites pass.
- Flat `Model`/`routeContent`/`createUpdate` remains; no other family or shared client touched.

## Verification executed

- s397/s425/s499/s491/s458/s25d/s111: **7 files, 61/61 passed**, exit 0.
- UI `tsc --noEmit`: **0**.
- s247 click budget: **3/3** passed.
- `audit-rendered-ui --routes /control/endpoints`: **PASS**, failures 0.
- anti-slop effect:true: all new feature/shim/control-view files **0**; parent `update.ts` **10 = HEAD baseline**.
- `s511-green.log` header records `TDD Mode pragmatic` and `RED=N/A rationale` as required.

## Non-blocking notes

- The packaged audit used the current final6 exe/static root; this source refactor was not rebuilt into a package in this slice. Behavior-preserving extraction plus unchanged suites cover it, but this is not a rebuilt-package proof.
- `features/endpoint-activation/update.ts` is an extraction (not a pure re-export); that is the intended W1c shape, with the parent still the single dispatcher.
- No whole Workspace claim; only the endpoint-activation family is reviewed. Other families remain untouched.

