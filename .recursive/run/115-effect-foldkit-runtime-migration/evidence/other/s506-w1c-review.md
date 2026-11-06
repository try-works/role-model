# S506 independent review — W1c requests-ranking feature co-location

Date: 2026-10-29. Read-only; no source edits, no commit. I wrote only this file.

## Active model verification

`list_agents`: `s9b-eventlog` = **deepseek-flash**, running. Matches the required live route.

## Frozen hashes verified (relative to `role-model-router/apps/runtime-ui-next`)

- `src/features/requests-ranking/model.ts` = `FF2F927D9E4E3100B59EF06873F97725561C66CD59099C563169D792446A81EC` (match).
- `messages.ts` = `4702AE1D78F932B9BDF394F7565A08AF4F2786A6281485B442CF47440FD4EC76` (match).
- `update.ts` = `415B062FD63B96E144BBFC32651EA8B4BD25ED34DF487EFCE1B6444BB3316180` (match).
- `view.ts` = `DE8D48F9D4206DC71717E4DCE7CF512AE76605EEC502EF7DE6D1A0677DEA166B` (match).
- `index.ts` = `5F6265BF0B4304DE635D5219BFE0C3E3522F372E9396935E7214D4C94110B157` (match).
- `src/requests-ranking.ts` = `FEE9D4A59DF874CB0C93C94F0BF49F5AC8F557C2615115E0F2EDE0953DD51328` (match).
- `src/requests-ranking-view.ts` = `A6686FF2560BD5DA194563FCA71921872DCE0FF62E66A828312CCA0CF92A9A00` (match).
- `src/update.ts` = `DAAAB1B53CCBAC9DF2E8717C8E73CF387C92DC417FF2CFE2D2E64B068E694A39` (match).

## Verdict: bounded PASS

## Purity verification

- `features/requests-ranking/model.ts` is **byte-identical** to the old `src/requests-ranking.ts` (153 lines, same schemas/options/query/client); the old path is now an `export *` re-export, so existing import specifiers resolve unchanged.
- `features/requests-ranking/view.ts` differs from the old view only in three import paths (`./model`, `../../message`, `../../ui/listbox`); markup/props/messages/query flow unchanged.
- `src/requests-ranking-view.ts`, `src/requests-ranking.ts`, `src/update.ts`, `src/model.ts`, and `src/view.ts` keep the same public import specifiers (`./requests-ranking`, `./requests-ranking-view`).
- `features/requests-ranking/update.ts` extracts the old inline logic into `planRequestsRankingFieldChange`, `mergeRequestsRankingLoaded`, `mergeRequestsRankingFailed`; side-by-side with the HEAD `createUpdate` branches the token/status/message/payload behavior is identical. The parent still builds the same `requestsRankingCommands.query` payload via `JSON.stringify(plan.payload)` and keeps the same stale-token handling.
- `messages.ts` only re-exports the existing schemas/types; no message value was added or changed.
- **No test edits:** `git status` shows no changes under `test/`; 28/28 behavior suites pass unchanged.
- Flat `Model`/`routeContent`/`createUpdate` structure remains; no other family or shared HTTP client touched.

## Verification executed

- s491/s458/s25d/s111: **4 files, 28/28 passed**, exit 0.
- UI `tsc --noEmit -p tsconfig.json`: **0**.
- `audit-rendered-ui --routes /requests` against the packaged dev exe/static root: **PASS /requests (360 chars), failures 0**.
- anti-slop effect:true: all new feature files/re-export shims **0**; `update.ts` **10 = HEAD baseline**, `view.ts` **30 = HEAD baseline**.
- `s505-green.log` header records `TDD Mode pragmatic`, `RED=N/A rationale` and the compensation evidence, as required.

## Non-blocking notes

- The packaged audit used the current final6 exe/static root; the source refactor was not rebuilt into a package in this slice. Since the refactor is behavior-preserving and the unchanged suites cover it, this is acceptable for W1c, but it is not a rebuilt-package proof.
- The feature `update.ts` is an extraction, not a pure re-export; that is the intended co-location shape, and the parent remains the single dispatcher.
- No whole Workspace claim; this is one feature family. Other families, Dialog/Listbox, and HTTP client remain unchanged.

