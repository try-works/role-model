# S417 — Requests ranking freshness repair

Status: in_progress
TDD Mode: strict

Inputs: tasks/s411-m9-characterization.md; evidence/other/s416-requests-ranking-review.md; pending Requests ranking slice against HEAD 475616bb. Owner mandate: native exact deepseek-official/deepseek-flash worker, independent reviewer; no operator ports/state.

Expected write scope: runtime-ui-next/src/requests-ranking.ts, src/update.ts, src/requests-ranking-view.ts if necessary, test/s415-requests-ranking.test.ts, and run-local S417 evidence only. Preserve unrelated dirty files. No commit.

## Required repairs
1. Capture behavioral RED BEFORE editing product: begin an old query, change metric/target during loading, deliver old result; old rows must never appear under new labels. Preserve selection-change auto-query parity. Prefer latest-selection-wins with a new query/token; if serializing, queue latest selection and never publish mismatched rows. Test out-of-order Loaded AND Failed. Explicit Run duplicate-submit guard remains.
2. Replace new unsafe metric/target assertions with Schema/literal-validated domain accessors or directly justified boundary narrowing; no new anti-slop findings. Run anti_slop_lint with absolute file paths and require filesScanned > 0. Zero-file scans are not evidence.
3. Correct previous counts: pre-repair s415=7, s412=8, s40a=4, s26k=7, total26. Report actual post-repair counts from stdout.
4. Run four affected suites and UI tsc, capture RED/GREEN logs under evidence/logs/s417-*.log. No reversal can retroactively make test-after-code strict TDD; preserve chronology honestly.

## Acceptance
Independent review required; bounded implementation only, not M9 or overall parity closure. Report exact files/hashes, real nonempty lint scan counts, test counts and remaining limitations.
## Completion (author: deepseek-flash, verified via list_agents)

Chronology: tests for the loading-change case were added first and run against the S416 product -> RED (2 failed: 'refences an in-flight query when the metric changes while loading', 'ignores a stale failure from the superseded query'); product was changed afterwards. No retroactive RED claim.

Repair:
- FieldChanged is now latest-selection-wins: every metric/target change (including during loading) increments the token and issues exactly one QueryRequestsRanking for the NEW selection. The old in-flight result/failure has a stale token and is ignored, so old rows can never render under new labels. Explicit Run keeps its duplicate-submit guard.
- Metric/target are validated through Schema-derived accessors requestsRankingMetricOf/requestsRankingTargetOf; the unsafe casts in update.ts (previous :1057/:1058/:1069) are gone. An unsupported selection becomes a typed error state.

Counts (from s417-green.log stdout): s415 9 + s412 8 + s40a 4 + s26k 7 = 28/28. This corrects the earlier false s415=8 claim (pre-repair s415 was 7).

Lint (absolute paths, filesScanned > 0): requests-ranking.ts clean (1 file), requests-ranking-view.ts clean (1 file), s415 test clean (1 file). update.ts: 10 pre-existing findings at lines 170-173, 568, 595, 604 (none on S417/S416 code; the four HOLD casts are gone). Unrelated findings were not edited by scope.

Evidence: evidence/logs/s417-red.log (EXIT_CODE=1, 2 failed), evidence/logs/s417-green.log (EXIT_CODE=0, 28/28), UI tsc exit 0.

Hashes: requests-ranking.ts FF2F927D..., update.ts BA4A48B8..., s415 test 3304A661....

Remaining limitation: range stays the original default week/day and filters stay empty (no range/filter UI); that is the documented follow-up from S413, unchanged by this repair.
## S418 invalid-selection token repair (author: deepseek-flash, verified via list_agents)

HOLD: the invalid-selection branch set status error without advancing the token, so a late Loaded/Failed for the previous valid selection could overwrite the validation error and publish stale rows.

Chronology: test added first against the S417 product -> RED (s417-red-invalid.log, EXIT_CODE=1, 1 failed: expected 2 to be 3 on the token); product changed afterwards.

Fix: both invalid branches (FieldChanged and explicit SubmitRequested) now advance the token (state.token + 1), store it in the error state, and issue NO query. The stale Loaded/Failed carries the old token and is ignored; the validation error and its message survive.

Test: 'invalidates the active token when an unsupported selection is set' — invalid metric while loading yields no command, status error, /supported metric/ message, token 3; late Loaded(token 2) keeps error + empty rows; late Failed(token 2) keeps the validation message.

GREEN (s417-green-invalid.log): EXIT_CODE=0; 4 files, 29/29 (s415 10, s412 8, s40a 4, s26k 7); UI tsc exit 0.

Lint absolute: requests-ranking.ts clean (1 file), requests-ranking-view.ts clean (1 file), s415 test clean (1 file); update.ts still has the same 10 pre-existing findings at 170-173/568/595/604, none on S418 code.

Hashes: update.ts 0F14DD6B..., s415 test 017AF067....
