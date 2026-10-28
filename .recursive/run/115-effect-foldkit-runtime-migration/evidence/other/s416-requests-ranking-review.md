# S416 — independent review: S413 Requests ranking metric/target filters

Reviewer: `s9-private-readonly`, actual model **deepseek-flash** (live). Read-only on product files; no source edit, no commit. I ran the 4 affected UI files, UI tsc and anti-slop.

## Verified frozen artifacts

| File | sha256 | bytes |
| --- | --- | --- |
| `src/requests-ranking.ts` | `BEFE8D6EB7BEB2E3ADE1CAEA41E18CAAFA59E70BCA8AEE8489A1DD3D6AAC5F1A` | 5412 |
| `src/requests-ranking-view.ts` | `849159875465AA9F0711230667F5DF3A512030185A3E72BF201D3298C063D532` | 3824 |
| `src/message.ts` | `964898831B27F150B43635676458A12D0F7F88CD8D5C67B7F314B4B5637137DF` | 14327 |
| `src/model.ts` | `6C4D5F30A4D031B0F3D31AD00B04949E90C4DCD9B95A0D02F0C451549131A29D` | 2468 |
| `src/commands.ts` | `E2035A94D1892F29CE367283B2C8612A5267C721BCFCB0061B4195240B7BBF15` | 27228 |
| `src/update.ts` | `98309D626A4D8A90260DFFEB7B738E88C9833622DAADE3EC42EE14FA10A3393A` | 56157 |
| `src/view.ts` | `FCB1DE57990A7EA8088BE2363D82F925DA828575A7A602B0F993D29F46DACAC5` | 72135 |
| `src/app.ts` | `CF5D9FEF5A0758A21EBD389B7D40866E10752026B40E73BE2136E506C7EE0400` | 7692 |
| `test/s415-requests-ranking.test.ts` | `3911C19AC3E90D0FCB397D35086BE9EC7DCB1EC5104168E35338FABBF18820FC` | 5066 |

All match. Affected 4 files: **25/25 pass**; UI tsc exit 0.

## Q1 — Option sets: PASS

The five metrics are exactly the original `telemetryMetricOptions` intersection used by `rankingMetricOptions` (requestCount, totalTokens, effectiveCostUsd, averageLatencyMs, cacheHitTokenRate; the other three filtered values are not in telemetryMetricOptions) (`requests-ranking.ts:10-16`; `requests.tsx:100-111`; `telemetry-chart-config.ts:17-22`). The 12 targets match `rankingDimensionOptions` verbatim and in order (`requests-ranking.ts:18-31`; `requests.tsx:85-98`). The test asserts both sets (`s415:24-46`). PASS.

## Q2 — Query body: PASS

The body is `{breakdown:null, filters:{}, granularity:"day", metrics:[metric], ranking:{dimension:target,limit:8,metric}, windowMs:604800000}` (`requests-ranking.ts:65-90`). This matches `buildBaseQuery` with the default week range (windowMs 7*24*60*60*1000, resolveTelemetryGranularity→day), empty default filters, null breakdown and the ranking definition's dimension/metric/limit 8 (`telemetry-route-models.ts:34-53,287-304`; `requests.tsx:224,267-303`). The client POSTs it to `/api/role-model/telemetry/query` and the test compares the exact body (`s415:48-71`). PASS.

## Q3 — Busy refusal/token fence: PASS

`RequestsRankingSubmitRequested` returns early while `status === "loading"`; a submit increments the token, and Loaded/Failed ignore mismatched tokens (`update.ts:1049-1071`). The tests cover second-submit refusal and a stale token result (`s415:84-89`). PASS. (Selections remain editable during loading; only submission is fenced.)

## Q4 — Honest empty/error with selections preserved: PASS

Loaded rows empty maps to `empty`; failure maps to `error` with the message, while `...state` preserves metric/target (`update.ts:1063-1071`; `s415:91-100`). The view renders explicit empty/error/loading states and keeps the selects (`requests-ranking-view.ts:29-40`). PASS.

## Q5 — Run: PASS

4 files **25/25 pass**; UI tsc exit 0.

## Q6 — Lint/limitations: PASS

anti_slop_lint (absolute paths) is clean for requests-ranking.ts, requests-ranking-view.ts and s415. The stated follow-up limitation (fixed week/day range and empty filters; no range/filter UI) matches the implementation and the Requests GET readback remains separate/untouched (`view.ts:908-911`).

## Q7 — Metric-change command: HOLD

The claim “controlled metric change → one command + token fence” is **not implemented**. `RequestsRankingFieldChanged` only updates `metric`/`rankingTarget` and clears the message; it emits no command (`update.ts:1049-1051`). The view's selects only dispatch that message; a separate “Run ranking” click dispatches `RequestsRankingSubmitRequested` (`requests-ranking-view.ts:30-32`). The test named “changes controls and submits one token-fenced query” performs two separate updates and never asserts a command on the change (`s415:75-82`). Required: either make metric/target changes issue one query (with the busy/token guard) or correct the claim to “change + explicit Run”; if auto-query is intended, add the assertion/test.

## VERDICT: HOLD (1 claim/wiring repair)

1. **Metric/target change does not emit a command.** Wire the change to a single query (with the existing loading/token guard) or explicitly document that a separate Run click is required; update the test/claim accordingly.

No product file was modified; no commit made.

## Lead re-review — auto-query repair and loading-selection risk

Active routing verified with list_agents: s9-private-readonly is deepseek-flash. Read tasks/s411-m9-characterization.md and the prior review; HEAD is 475616bb. New update.ts hash 04E1F61B97D4A8119A64177308FACB281DF2EBDB01E9194283B5F65C227062FE (56959 B); s415 test hash 85067CD30992763797EBEE32837738E853552EC26A7BBE9E51317FC4B256BC06 (5439 B). requests-ranking.ts and requests-ranking-view.ts are untracked pending files; update.ts is a modified pending file. No product mutation was performed.

### Auto-query when idle: PASS

RequestsRankingFieldChanged now computes nextState and, when status is not loading, increments the token, builds the query and emits exactly one QueryRequestsRanking command (update.ts:1049-1063). Tests cover metric change and target change (s415:75-88).

### Selection change DURING loading: HOLD (reproduced by code)

The loading branch returns the labels-only nextState with no token bump and no follow-up query (update.ts:1051-1054). An in-flight Loaded with the old token therefore still matches state.token and is applied: rows from the old query are shown under the new metric/target labels (update.ts:1075-1078). Concretely: state status=loading, token=2, metric=averageLatencyMs; FieldChanged metric=requestCount -> new metric, same token 2, no command; Loaded(token 2, old rows) -> status ok with old rows and the new label. This is false freshness. Required: bump the token and issue a follow-up query on a change during loading (or freeze the selects while loading, or tag results with the query selection); add a test that changing metric while loading either cancels/refences the old result and queries the new selection or refuses the change.

### Real host response vs parser: PASS

The host queryTelemetryAnalyticsData returns ranking {dimension, metric, rows:[{key,label,value}]} with value number|null (index.ts:26283-26334). The RequestsRankingRowsSchema matches key/label/value and Schema.Struct ignores the host's extra response fields; a decode probe of the real shape with extras succeeded. The parser is not relying only on the self-generated fixture.

### Direct counts: HOLD on s415 count claim

Direct runs: s415 = 7 tests, s412 = 8, s40a = 4, s26k = 7; total 26/26. The total 26 is real, but the claimed s415 8 is false (7 actual). If the author claimed s415 8 and full 26, the counts are internally inconsistent; record 7/8/4/7=26.

### Lint: HOLD on changed update.ts

Absolute anti_slop_lint: requests-ranking.ts filesScanned=1/findings=0; s415 test filesScanned=1/findings=0. update.ts has four require-safety-comment findings on the new casts at :1057, :1058 and :1069 (two); the changed update file is not lint-clean. Relative paths scanned zero files and are not evidence. Add SAFETY/typed accessors or correct the lint claim.

### RUN: PASS

4 files 26/26; UI tsc exit 0.

## FINAL VERDICT: HOLD (3 items)

1. FieldChanged while loading updates labels without token bump/query; old result can appear under new labels. Fix and test the loading-change case.
2. s415 test count is 7, not 8 (total 26 = 7+8+4+7); correct the count evidence.
3. Changed update.ts has four anti-slop findings on the new casts (:1057/:1058/:1069); make it clean or correct the lint claim.

No product file was modified; no commit made.

