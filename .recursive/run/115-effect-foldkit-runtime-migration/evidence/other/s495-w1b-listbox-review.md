# S495 independent review — W1b real Listbox for Requests metric

Date: 2026-10-29. Read-only review; no source edits, no commit. I wrote only this file.

## Active model verification

`list_agents`: `s9b-eventlog` = **deepseek-flash**, running. Matches the required live route.

## Frozen hashes verified (relative to `role-model-router/apps/runtime-ui-next`)

- `src/ui/listbox.ts` = `A6A6C73D7606BEF482E7A15AF56A40C8205841204749C59BB6AA8AD1C9DC12DA` (match).
- `src/requests-ranking-view.ts` = `593526DBF4C8189F26C352310B6A17BD8C350798A9B3466915AA6318D06D4480` (match).
- `src/message.ts` = `C9AED9DE97392AD305BEF5270BDB287748572041E6B8B84FB9CFE5DCE26EB2C8` (match).
- `src/model.ts` = `A359CED79CBF550DA01A34609F362E49C3030C1E61CC2AB65059713005B947B0` (match).
- `src/update.ts` = `778431C8399C30DA2912FFE85C32CF54E4A0FD143E084B946FEBEDDABBEFAF1A` (match).
- `src/view.ts` = `A255025D0DA6321D8AD13E09EE2F03F3019C5521D029A2EB3A8C12D32E11AFAF` (match).
- `test/s491-listbox.test.ts` = `49969D983326B93C705BD807806B1257E7AAD6A3A341F6E44A9C48B87624A2AD` (match).

## Verdict: **HOLD** (RED integrity + required keyboard/selection coverage)

## Source: bounded and structurally correct

- `src/ui/listbox.ts:4` imports the real package `@role-model-router/foldkit-ui/listbox`; `package.json` exports it from `dist/listbox.js` with types. Not a fake.
- Only the Requests **metric** control migrated (`requests-ranking-view.ts:35-57`); the ranking-target native `<select data-ranking-target>` remains untouched (`:58`).
- Message flow: child Selected out-message maps to `GotRequestsRankingMetricListboxMessage` (`:44`) -> `update.ts:1253-1256` -> `updateRequestsMetricListbox` -> `updateRequestsRankingField(nextModel, "metric", child.outMessage.value)`, producing the same `RequestsRankingFieldChanged`-equivalent state/query behavior. The original tag still exists for rankingTarget.
- Child state is an optional slice (`model.ts:24`), and the parent keeps `RequestsRankingState` unchanged; `view.ts` passes it through.
- No other select/client touched; diff is bounded to these files plus the new test.

## Verification executed

- vitest `s458`, `s25d`, `s111`, `s491`: **4 files, 27/27 passed**, exit 0; matches `s491-green.log`.
- UI `tsc --noEmit`: **0**.
- anti-slop effect:true: `update.ts` **10 findings = HEAD baseline**, `view.ts` **30 = HEAD baseline**; `listbox.ts`, `requests-ranking-view.ts`, `s491-listbox.test.ts` **0**.

## Blocking finding 1 — RED is not a clean listbox RED

`s491-red.log` claims a pre-fix RED against clean HEAD, but the captured failure is preceded by an application crash:

```
[foldkit] Application crash: TypeError: h.DataAttribute is not a function
  at renderRequestsRanking (.../requests-ranking-view.ts:26:23)
```

The test then times out waiting for `requests-ranking-metric-button` (`s491-listbox.test.ts:33-35`). That timeout does not isolate “native select instead of listbox”; it is consistent with the renderer failing before any control mounted. The RED therefore does not prove the claimed pre-fix behavior. Re-run the RED with a clean HEAD checkout/build (and matching `view.ts` signature) and confirm the log reaches the native-select assertion without a renderer crash; otherwise the RED claim should be withdrawn.

## Blocking finding 2 — required keyboard/selection coverage is missing

The task required arrow navigation, typeahead (if supported), `aria-activedescendant`/selected, Escape, and no focus-trap regression, plus the same Msg flow. The only test (`s491-listbox.test.ts:25-54`) checks: trigger `aria-haspopup`, absence of the native select, option count, exactly one `aria-selected`, Escape close, focus return. It does **not**:
- press ArrowDown/ArrowUp or assert the active option/`aria-activedescendant`;
- type a prefix and assert typeahead;
- select an option and assert the parent receives the same `RequestsRankingFieldChanged`-equivalent result / query token;
- assert focus is not trapped inside the listbox after close beyond `activeElement === trigger`.

The test title “same message flow” is therefore not supported by its assertions. This is a test-integrity gap, not a source defect.

## Non-blocking notes

- `requestsRankingMetricListbox` is `Schema.Any` and the message is `Schema.Unknown`; this keeps the child opaque at the model/message boundary. Acceptable for W1b, but it weakens type safety worth tightening in W1c.
- `src/ui/listbox.ts` is untracked and the test file is new; no commit is expected in this review.
- No whole Workspace/W1b/W1c claim; this review is limited to the Requests metric select.


---

# S495 FINAL re-review on refrozen bytes — **bounded PASS**

Date: 2026-10-29. Read-only; no source edits; this append only.

## Refrozen hashes verified
- `src/ui/listbox.ts` = `A6A6C73D7606BEF482E7A15AF56A40C8205841204749C59BB6AA8AD1C9DC12DA` (match).
- `src/requests-ranking-view.ts` = `593526DBF4C8189F26C352310B6A17BD8C350798A9B3466915AA6318D06D4480` (match).
- `src/message.ts` = `C9AED9DE97392AD305BEF5270BDB287748572041E6B8B84FB9CFE5DCE26EB2C8` (match).
- `src/model.ts` = `A359CED79CBF550DA01A34609F362E49C3030C1E61CC2AB65059713005B947B0` (match).
- `src/update.ts` = `778431C8399C30DA2912FFE85C32CF54E4A0FD143E084B946FEBEDDABBEFAF1A` (match).
- `src/view.ts` = `A255025D0DA6321D8AD13E09EE2F03F3019C5521D029A2EB3A8C12D32E11AFAF` (match).
- `test/s491-listbox.test.ts` = `87ADCB25EC3C1C8F220AC83AAFE9533D28FDD7995C13AD18087BE0B3F339C66B` (match).
- RED log = `2345124360C8E3476B3D1238E3A19CCFC8AFBAD01300D61D851A66465D1EE869` (match).
- Active model: `s9b-eventlog` = **deepseek-flash** via `list_agents`.

## Prior HOLD items — resolved
1. **RED redone clean:** `s491-red.log` command states “SAME current imports/signature but native select markup (only select kind differs)”; no `h.DataAttribute` TypeError appears. Failure is the expected `timed out waiting for metric listbox trigger`, i.e. the native select lacks the listbox trigger. This isolates the select-kind difference.
2. **Coverage added:** the test now asserts ArrowDown sets a non-empty `aria-activedescendant`, typeahead `t` activates “Total tokens”, exactly one `aria-selected` option, Escape closes, focus returns to the trigger, and selecting “Requests” emits the ranking query with `metrics: ["requestCount"]` and `ranking: {dimension:"endpointId", metric:"requestCount"}`.

## Verification executed
- vitest s458/s25d/s111/s491: **4 files, 27/27 passed**, exit 0.
- UI `tsc --noEmit`: **0**.
- Source hashes unchanged from the previously reviewed bounded implementation; only the test was refrozen.
- Lint unchanged from prior review: update 10 = HEAD baseline, view 30 = HEAD baseline; new files 0.

## Verdict: **bounded PASS**
The source migration remains bounded to the Requests metric select, the real Foldkit Listbox is exercised, and the prior RED/coverage HOLD items are addressed.

## Remaining non-blocking notes
- The test name still says “open/close” though it now covers selection too (cosmetic).
- The typeahead expectation “Total tokens” is option-label-specific; acceptable for this fixture but tied to label text.
- No whole Workspace/W1b/W1c claim; other selects and features remain untouched.
