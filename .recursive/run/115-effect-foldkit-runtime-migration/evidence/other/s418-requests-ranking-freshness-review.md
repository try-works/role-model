# S418 — independent review: S417 Requests ranking freshness repair

Reviewer: `s9-private-readonly`, actual model **deepseek-flash** (verified via list_agents). Read-only on product files; no source edit, no commit. Worktree HEAD `475616bb`; inputs `tasks/s417-requests-ranking-freshness-repair.md` and the S416 review/HOLD re-read.

## Verified pending artifacts

| File | sha256 | bytes |
| --- | --- | --- |
| `src/requests-ranking.ts` | `FF2F927D9E4E3100B59EF06873F97725561C66CD59099C563169D792446A81EC` | 5766 |
| `src/update.ts` | `BA4A48B889D33E3422CBFF35BCEAB6103C86EDB4EF2143396F33189E06733A9A` | 57274 |
| `test/s415-requests-ranking.test.ts` | `3304A6613A4CEB3063566E52C71CC61EF02FEA49779FB838B93C0B4FEC30D4F3` | 7286 |

All three match the task. These are pending/uncommitted; no commit was made and no product file was modified by this review.

## Valid-selection latest-wins: PASS

`RequestsRankingFieldChanged` validates both selections through `requestsRankingMetricOf`/`requestsRankingTargetOf`, then always increments `state.token` and issues one `QueryRequestsRanking` for the new selection, including while `status === "loading"` (`update.ts:1049-1064`). `RequestsRankingLoaded` and `RequestsRankingFailed` require an exact token match and ignore stale results (`:1081-1089`). The S417 tests drive a valid metric change while loading, assert the new command/new token, then reject old Loaded and old Failed results (s415:75-98). PASS.

## Invalid-selection stale-token handling: HOLD (reproduced by code)

When either selection is unsupported, the branch sets `status:"error"` with a message but **does not advance the token and does not supersede the in-flight query** (`update.ts:1052-1055`). The pending valid query still has `state.token` (e.g. 2). Because Loaded/Failed only compare tokens, an old Loaded(token 2) or Failed(token 2) is accepted after the invalid-selection error: it can overwrite the error and publish rows while the state still has the invalid selection. This is the same false-freshness class as the S416 HOLD, narrowed to the invalid-option branch. Reproduction: loading token 2; FieldChanged metric="not-a-metric" -> status error, token remains 2; Loaded({rows:old}, token 2) -> status ok, old rows under invalid metric.

The completion note says unsupported selection becomes a typed error state, but it does not fence the pending query. Required: advance the token (and optionally cancel/ignore the old query) on the invalid branch before setting error, or reject invalid changes without mutating the labels; add a test for invalid selection during loading and both stale Loaded/Failed.

## Real host shape/parser: PASS

The host `queryTelemetryAnalyticsData` returns `ranking: {dimension, metric, rows:[{key,label,value}]}` with numeric/null values (`index.ts:26283-26334`); the `RequestsRankingRowsSchema` matches key/label/value, and Effect Schema accepts the host's extra fields (a decode probe of a real-shaped object with extras succeeded). The query body path/shape remains the original week/day empty-filter ranking query (`requests-ranking.ts:65-90`). PASS.

## Counts and run: PASS

Direct stdout: s415 = 9, s412 = 8, s40a-rail = 4, s26k-control = 7; total **28/28**; UI tsc exit 0. This corrects the earlier false s415=8 claim; the correct s40a filename is `s40a-rail.test.ts` (a nonexistent `s40a` name explains the lead's 3-suite/24 result). The s26k suite emits noisy pre-existing localhost:3000 network errors but exits 0; it is not a console-clean or browser proof.

## RED/chronology: PASS with the expected limitation

`s417-red.log` shows the new loading tests running against the S416 product: 2 failed, 7 passed, including the stale-failure status mismatch. `s417-green.log` is 28/28. The task accurately says the tests were added first and the product changed afterward; no retroactive RED claim. This is strict TDD for the loading repair, not a claim about the earlier S416 implementation.

## Lint (absolute, file-count verified): PASS for the repair scope; pre-existing update findings disclosed

- `src/requests-ranking.ts`: filesScanned=1, findings=0.
- `src/requests-ranking-view.ts`: filesScanned=1, findings=0.
- `test/s415-requests-ranking.test.ts`: filesScanned=1, findings=0.
- `src/update.ts`: filesScanned=1, **10 findings**, all pre-existing lines 170-173/568/595/604; none on the S417 code (no findings at 1049-1089). Relative paths scanned zero files and were not treated as evidence.

## VERDICT: HOLD (1 repair)

1. **Fence the in-flight query on invalid selection.** The invalid branch at `update.ts:1054-1055` must advance the token (and/or cancel/supersede the pending query) before setting `error`, so a stale Loaded/Failed cannot clear the invalid-selection error and publish old rows under invalid labels. Add a loading->invalid-selection test covering stale success and stale failure. Everything else in the S417 repair (valid latest-wins, typed accessors, parser, counts, TDD RED, scoped lint) passes.

No product file was modified; no commit made.

## S418 invalid-selection token repair — PASS

Hashes: update.ts 0F14DD6BF53ADE2331719E453A9E2D43884F4E3C2FDCEA697B27C83B8F6C91C1 (57542 B); s415 test 017AF067E440C667C70583F5B067194B2AED9A6A3E666BEF5F178804A09BAC5F (8491 B).

Both invalid branches now advance the token with no query: FieldChanged stores token=state.token+1 in the error state (update.ts:1054-1058); explicit SubmitRequested does the same (1074-1077). RequestsRankingLoaded/Failed still compare tokens (1085-1093), so old token 2 cannot erase the invalid error. The new test sets an invalid metric while loading, asserts no command/status error/message/token 3, and then delivers stale Loaded and Failed token 2, both of which leave the error and empty rows intact (s415:93-107). s417-red-invalid.log is 1 failed/9 passed (token expected 2 to be 3); s417-green-invalid.log is 29/29. This closes the S418 HOLD.

## Counts and run — PASS

Direct run of the exact four suites: s415 = 10, s412 = 8, s40a-rail = 4, s26k-control = 7; total **29/29**; UI tsc exit 0. The earlier s415=9 count was pre-invalid-test; current s415 is 10. The s40a filename is s40a-rail.test.ts; s26k still emits pre-existing localhost:3000 noise but exits 0 (not console/browser proof).

## Absolute lint classification — HOLD (1 integration finding)

Targeted product/test scans (absolute paths, filesScanned=1): requests-ranking.ts 0; requests-ranking-view.ts 0; s415 test 0. update.ts remains 10 pre-existing findings at 170-173/568/595/604, none on the S418 lines. message.ts and model.ts are clean for this scope. app.ts is **not** whole-file clean: absolute scan is 1 file / 18 findings, including the newly introduced **no-conditional-empty-object-spread at app.ts:148** in defineRequestsRankingCommands(createRequestsRankingClient({...(requestsRankingFetchImpl === undefined ? {} : {fetchImpl: ...})})). This is a new finding from the S417 slice (the same pattern exists pre-existing at 144-147). Classification: a genuine new anti-slop finding, not a baseline-only one. Prefer the direct optional object `createRequestsRankingClient({ fetchImpl: options.requestsRankingFetchImpl })` if the interface accepts an optional property; otherwise build the options object conditionally in a statement. Do not stamp app.ts clean. commands findings are at most the earlier count; view baseline remains ~30.

## FINAL VERDICT: HOLD (1 integration lint item)

The S418 invalid-selection behavior is PASS and the S417 freshness repair is closed. The only remaining item is the new app.ts:148 conditional empty-object spread introduced by the Requests ranking client wiring; apply the one-line direct optional argument or conditional object construction, then re-run the absolute lint and four suites. This review is bounded to the slice, not full M9 acceptance.

No product file was modified; no commit made.

## Final Lead app.ts wiring repair — PASS (bounded)

The Lead applied exactly the requested one-line wiring repair: app.ts:148 now calls createRequestsRankingClient({ fetchImpl: options.requestsRankingFetchImpl }) with no conditional empty-object spread (credit: Lead repair; I did not edit product). The diff also adds the requestsRankingFetchImpl option/imports; no other change in the one-line target. New app.ts hash A854C1447E7D7A0460D148349D8CBC5678026635E29876D415FFBC750651BDA9 (7629 B); update.ts remains 0F14DD6B.../57542 and s415 remains 017AF067.../8491.

Absolute anti_slop_lint on app.ts: filesScanned=1, findings=17, and no finding at the new line 148; the 17 are the pre-existing conditional spreads at 144-147 and other baseline findings. Targeted product/test remain 1 file/0 findings; update remains 10 pre-existing, none on S418 lines. UI tsc exit 0. Post-repair exact four suites: s415 10 + s412 8 + s40a-rail 4 + s26k 7 = **29/29** (s26k noise unchanged, exit 0).

### FINAL BOUNDED VERDICT: PASS

The S417/S418 Requests ranking slice is closed: valid latest-selection wins for loading changes, both invalid branches now bump/fence tokens with no query, stale Loaded/Failed cannot overwrite validation, the app.ts new lint finding is repaired, and targeted lint/tests/tsc pass. Baseline app.ts/update.ts/view findings are pre-existing and outside this slice. This is not full M9 acceptance. No product file was modified by this reviewer; no commit made.

