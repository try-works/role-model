# S508 independent review — W1c learning-ranking feature co-location

Date: 2026-10-29. Read-only; no source edits, no commit. I wrote only this file.

## Active model verification

`list_agents`: `s9b-eventlog` = **deepseek-flash**, running. Matches the required live route.

## Frozen hashes verified (relative to `role-model-router/apps/runtime-ui-next`)

- `src/features/learning-ranking/model.ts` = `E42453C196D7C48D151249C2F5ADD95979B347EB24DD2DA0A6A57670A0D1E9AE` (match).
- `messages.ts` = `4B87D56F890767117FA0E93833DEF0FC4416EEF83AFEDD838D8453D36A3E98B8` (match).
- `update.ts` = `589E09F2ECACD0146FE31B0E9641234D6A373A986714C8994C7A2ACB3127312E` (match).
- `view.ts` = `5FD145D09C9C02E6F817F4E22950640AA64BBEE40EACFEA1675E16C20859BAEC` (match).
- `index.ts` = `5F6265BF0B4304DE635D5219BFE0C3E3522F372E9396935E7214D4C94110B157` (match).
- `src/learning-ranking.ts` = `2BD5A7CCF1892E2DB9CB2C6900A7F7B5C97CAF35FF97F3CD159203F920B5AD06` (match).
- `src/learning-ranking-view.ts` = `EEB8EEAEDA1953101676F73D13AFB3E7A487A7F6F12A5BE378F3336B5EF9C05E` (match).
- `src/update.ts` = `2504142DAEF3238B3B243279F23D43A74B2D36FFC8381C962855F4AFD4ECEC11` (match).

## Verdict: bounded PASS

## Purity verification

- `features/learning-ranking/model.ts` is **byte-identical** to the old `src/learning-ranking.ts` (225 lines); the old path is an `export *` shim, preserving the import specifier.
- `features/learning-ranking/view.ts` differs from the old view only in three import paths (`../../readback`, `./model`, `../../message`); same markup, labels, selectors and messages.
- `features/learning-ranking/messages.ts` only re-exports existing phase/state schemas/types; no message value/flow added.
- `features/learning-ranking/update.ts` extracts `planLearningLadderToggle`, `mergeLearningLadderUpdated`, `mergeLearningLadderFailed` with the same pending/confirm/rollback, token, phase filter, scope-freshness and error logic as the old inline branches. The parent keeps command execution and readback updates; the command payload/token/scope values are equivalent (`plan.state.scopeId` is set in the rollback plan).
- `src/learning-ranking.ts`, `src/learning-ranking-view.ts`, `src/model.ts`, `src/view.ts` keep the same public import specifiers; no other family/HTTP client touched.
- **No test edits:** `git status` shows no changes under `test/`; unchanged suites pass.
- Flat `Model`/`routeContent`/`createUpdate` structure remains.

## Verification executed

- s491/s458/s25d/s111: **4 files, 28/28 passed**, exit 0.
- UI `tsc --noEmit -p tsconfig.json`: **0**.
- `audit-rendered-ui --routes /learning` against the packaged dev exe/static: **PASS /learning**, failures 0 (my run 653 chars; author log 872 chars — both rendered route text, not identical run state).
- anti-slop effect:true: all new feature files/re-export shims **0**; `update.ts` **10 = HEAD baseline**, `view.ts` **30 = HEAD baseline**.
- `s507-green.log` header records `TDD Mode pragmatic` and `RED=N/A rationale` as required.

## Non-blocking notes

- The packaged audit used the current final6 exe/static root; this source refactor was not rebuilt into a package in this slice. Behavior-preserving extraction plus unchanged suites cover it, but it is not a rebuilt-package proof.
- `features/learning-ranking/update.ts` is an extraction (not a pure re-export); that is the intended W1c shape, with the parent still the single dispatcher.
- No whole Workspace claim; only the learning-ranking family is reviewed. Other families remain untouched.

