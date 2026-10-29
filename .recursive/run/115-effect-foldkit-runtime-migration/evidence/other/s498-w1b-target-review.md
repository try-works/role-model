# S498 independent review — W1b Requests ranking target Listbox

Date: 2026-10-29. Read-only; no source edits, no commit. I wrote only this file.

## Active model verification

`list_agents`: `s9b-eventlog` = **deepseek-flash**, running. Matches the required live route.

## Frozen hashes verified (relative to `role-model-router/apps/runtime-ui-next`)

- `src/ui/listbox.ts` = `1302D6FBEA17BF5D19BD14395C83DBCA0EC6B94533DF31DF61EA7A21F61633D1` (match).
- `src/requests-ranking-view.ts` = `6FB1199200D8C8A25139B905D37AC1A268E47129EACEA250557D9F02F07601AB` (match).
- `src/message.ts` = `1523BFC943164823C79D624CE486C96992E5AA3CB78565C6EB4B4C92B520143E` (match).
- `src/model.ts` = `273F04401A73219D9F0B9D6CF9B062D4350ECFD40FB415B6504F899877D7CACB` (match).
- `src/update.ts` = `88144AB84F258BA917C9CEC1D0EE225111FCAF8A670B5FF1C4DCE32167888984` (match).
- `src/view.ts` = `5ADB855A053BBDF395E50283C135E3A71C3EE5E5A298677AFE95F72373E22168` (match).
- `test/s491-listbox.test.ts` = `581CAB83D8014148C6B6433E459742CA8A3ADF76DEDF0DF134BAADF10036F489` (match).
- `s496-red.log` = `38278856F10F120356B0578A956B6EBF9278976ACC41A28BBBC38F27348C6A22` (corrected author value; verified, 32457 B).

## Verdict: bounded PASS

## Source verification

- **Target-only migration:** the metric listbox call at `requests-ranking-view.ts:35-55` is unchanged in structure and still uses `requestsMetricListboxView`; only the native ranking-target `<select>` at the old `:48` was replaced by `requestsTargetListboxView` (`:46-58`). `select[data-ranking-target]` is gone; `select[data-ranking-metric]` was already gone from S491.
- **Reuses the S491 wrapper:** `src/ui/listbox.ts` factors the shared `requestsListboxView` helper and exposes metric/target wrappers with distinct ids, slots, value/option data attributes. Metric exports and id `requests-ranking-metric` are preserved; target uses `requests-ranking-target` / `ranking-target-option` / `ranking-target-value`.
- **Same flow:** `GotRequestsRankingTargetListboxMessage` -> `updateRequestsTargetListbox` -> `updateRequestsRankingField(nextModel, "rankingTarget", child.outMessage.value)`, which is the same helper used by the legacy `RequestsRankingFieldChanged` branch (`update.ts:1277-1285`). The existing `RequestsRankingFieldChanged` tag remains for both fields.
- **Metric untouched:** no metric option/value/trigger changes; only shared helper extraction. Target listbox is a separate optional model slice (`model.ts:24`), passed through `view.ts` alongside the metric slice.
- Diff is bounded to the listed files + test; no commands/payload/device-auth changes.

## Verification executed

- **RED:** `s496-red.log` command states same imports/signature with native target markup only; no `h.DataAttribute`/renderer crash. Failure is `timed out waiting for target listbox trigger`, isolating the target select difference.
- **GREEN:** vitest s491/s458/s25d/s111: **4 files, 28/28 passed**, exit 0; matches `s496-green.log`.
- UI `tsc --noEmit`: **0**.
- anti-slop effect:true: `update.ts` **10 = HEAD baseline**, `view.ts` **30 = HEAD baseline**; `listbox.ts`, `requests-ranking-view.ts`, `s491-listbox.test.ts` **0**, filesScanned 1 each.

## Coverage confirmed in test

The S496 test (`s491-listbox.test.ts:106-181`) opens the target trigger, asserts `role=listbox`/`option` and exactly one `aria-selected`, ArrowDown sets `aria-activedescendant`, typeahead `m` activates “Upstream models”, Escape closes and returns focus to the trigger, and selecting “Upstream models” emits the ranking query with `metrics: ["averageLatencyMs"]` and `ranking: {dimension:"modelId", metric:"averageLatencyMs"}`.

## Non-blocking notes

- The target child model is typed as `RequestsMetricListboxModel`; it is the same `Listbox.Model`, but a neutral alias would read better in a later cleanup.
- The target wrapper still uses `toParentMessage` and `updateRequestsRankingField` directly rather than emitting the public `RequestsRankingFieldChanged` tag; behavior/query parity is tested, but the named message flow is one indirection shorter than the legacy branch.
- No whole Workspace/W1b claim; provider/device-auth selects remain untouched.

