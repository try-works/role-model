# S301 — independent review: S300 R19/B0 inventory correction

Reviewer: `s9-private-readonly`, actual model **deepseek-flash** (live). Read-only on product files; no source edit, no commit. I did run the committed machine check and the lint tool as requested.

## Verified frozen artifacts

| File | sha256 | bytes |
| --- | --- | --- |
| `scripts/s4-contracts-inventory.test.mjs` | `0D33E9DFCD20491390A762CD84E07C9D4A20289B155CFCFD97AA35A9E0DC2EF5` | 10590 |
| `evidence/other/s4-contracts-inventory.json` | `9B6BF05D680C8F1390F13F481233699601D2CBDAACE3FA55B09FF4145F71F58D` | 23239 |

Both match exactly. Machine check: `node --test scripts/s4-contracts-inventory.test.mjs` → **6/6 pass** (6328 ms). JSON now has 27 entries, 11 SQL-service entries, and 6 `scope.excluded` entries.

## Q1 — Guard semantics: PARTIAL / HOLD

The new guard (`test:224-248`) asserts:
- the exact sentence `"Effect SQLite service has no product caller"` is absent from `scope.excluded`;
- no excluded `area` contains the literal `sql-sqlite-node`;
- at least 7 SQL-service entries exist;
- all seven product caller `file:line` citations appear across those entries;
- each SQL disposition is allowed and reason non-empty.

That is a meaningful content guard for the current false claim, and it fails on the old JSON (Q8). But it is **not robust to a reworded falsehood**: I cloned the current JSON in memory, removed the SQL area, and added

> area: `Effect SQLite service`; reason: `No product code calls it; package tests only.`

All four guard conditions still passed (exact text absent; area has no `sql-sqlite-node`; 11 entries/citations present). The exact-string and area-substring checks are therefore a regression trap for the original wording, not a semantic exclusion policy. A future author can reintroduce a false “no product caller” exclusion under a different area/reason and stay green.

**Required:** make the exclusion semantic — e.g., structured excluded entries with an id/file, reject any exclusion covering `role-model-router/packages/sql-sqlite-node/**`, or reject any excluded area/reason that mentions SQL/Sqlite/Effect SQLite service; add a negative test using a reworded false reason.

## Q2 — Entry truth: PASS for spot checks, one disposition inconsistency

Spot-verified service bodies:
- `make` line 490: `Effect.map(attemptOpenAsync(...), buildService)` → `existing-effect` correct.
- `query` line 337: `Effect.flatMap` + `serialize` + `Effect.gen` + `Effect.try` → `existing-effect` correct.
- `transaction` line 363: `serialize` + `Effect.gen` + `Effect.ensuring` → `existing-effect` correct.
- `querySync` line 425: open/ownership sync checks + `readRows`, no Effect → `pure` correct.
- `exec/transaction/close` also show Effect constructs; `execSync/transactionSync/closeSync/isOpen` are sync/no Effect → `pure` correct.
- **`makeSync` line 494** is `buildService(config, openWithRetrySync(config))` — a synchronous facade, no Effect in its body — yet it is classified `existing-effect` (test/evidence table lines 40; JSON id `sql-service-make-sync`). Its sync siblings (querySync/execSync/etc.) are `pure`, so the “body-verified” taxonomy is inconsistent. The author's note explains “sync facade over the same Effect-backed owner”, but that is a **surface** rationale, not a body fact. Either mark it `pure` (then the counts become 5 existing-effect / 6 pure, contradicting the claimed 6/5) or document a consistent factory rule and apply it to the other sync wrappers. No SQL entries are `not-read`; all 11 have body reasons and caller citations.

## Q3 — Citations: PASS

All seven cited product import lines are real (read from the files):
`cli.ts:11` `import { type SqliteService, makeSync } from "@effect/sql-sqlite-node/service"`; `index.ts:19` `import { makeSync } ...`; `queue-runtime/admin.ts:19` makeSync import; `queue-runtime/store.ts:18` `import { SqliteClient } from "@effect/sql-sqlite-node"`; `route-challenge-evidence.ts:2` makeSync import; `route-ladder-census.ts:3` makeSync import; `track-b-runtime.ts:30` makeSync import. The guard finds all seven across the SQL entries.

## Q4 — Excluded list: PASS

The false SQL exclusion is absent; the remaining 6 are:
1. private repository — public artifact only (scope claim, accurate);
2. vendor/effect, effect-mq, foldkit — vendored payload, wrappers inventoried (accurate);
3. `packages/effect/src/sql.ts` + `packages/effect-mq/src/index.ts` — no direct in-repo wrapper imports found by repository grep (accurate for the wrapper files; host `package.json` dependency/comments are not imports);
4. `packages/effect-platform-browser` — no `src`, dist-only (verified: no `src` directory);
5. legacy `apps/runtime-ui` client surfaces — belongs to R7/R8 (scope accurate);
6. generated dist/tests — not source contracts (accurate).
No SQL-service area remains in `scope.excluded`.

## Q5 — Observability citation drift 322→333: PASS

JSON entry `observability-snapshot` now cites `run108-observability.ts:333`, and the actual line is `export function collectObservabilitySnapshot(` (line 322 is blank). The correction is JSON-only; the validator's line/file checks are unchanged, so this is a data fix, not a weakened check. The pre-existing “validates against the code” test now passes for this citation (RED log showed the blank-line failure).

## Q6 — Machine checks / no weakening: PASS

Ran the test: 6/6. Diff of the test against committed baseline `84a5c1fd` is **+42 insertions, 0 deletions** (`git diff 84a5c1fd -- scripts/s4-contracts-inventory.test.mjs`): only the SQL guard constants/test were added; the existing validator, sample, kinds/dispositions, wrong-citation and duplicate tests are unchanged. The new guard is additive, not a loosening.

## Q7 — Lint: PASS (pre-existing findings only)

`anti_slop_lint({ target: "D:/DEV/.../scripts/s4-contracts-inventory.test.mjs" })` returns exactly **9 `no-runtime-typeof`** findings at lines 32, 38, 62, 65, 73, 76, 87, 104, 108. I also linted the committed baseline extracted from `84a5c1fd`: same 9 findings at the identical lines. The guard adds none; these are the JSON-boundary validator's `typeof` checks and pre-date this slice.

## Q8 — TDD: PASS

`s300-red.log`: 2 failed / 4 passed — the guard fails with `the inventory must not claim the SQL service has no product caller`, and the real-inventory test fails with `observability-snapshot: definition cites a blank line ...:322`. Both are behavioural assertion failures, not import/setup errors. `s300-green.log` / my run: 6/6 green.

## VERDICT: HOLD (2 required repairs)

1. **Strengthen the semantic guard** so a reworded false “no product caller” exclusion cannot pass (structured exclusion, package-path match, or SQL/Sqlite/Effect SQLite area/reason rejection); add the reworded-negative test. The current guard only traps the exact original sentence/area.
2. **Resolve the `makeSync` disposition**: its body is a synchronous facade with no Effect, so either classify it `pure` (and correct the claimed 6 existing-effect / 5 pure counts to 5/6) or document and consistently apply a factory-level “returns Effect-backed service” rule; update entries/docs/tests accordingly.

No product file was modified; no commit made.

## Re-review (S301 final) — FINAL PASS

Verified final frozen hashes:

| File | sha256 | bytes |
| --- | --- | --- |
| `scripts/s4-contracts-inventory.test.mjs` | `62EFA2B6B7F19EF33456C0BF298C14DF0D830A59B1204E40E2D3BAE335C53961` | 11940 |
| `evidence/other/s4-contracts-inventory.json` | `B451276D2389D8CA7BF8F98A9D1C6BD4C8A0529A538ADE905F9C40AD336A47AF` | 23291 |

Machine check: `node --test scripts/s4-contracts-inventory.test.mjs` → **7/7 pass** (6007 ms). Diff vs committed baseline `84a5c1fd` is **+67/−1**, the one deletion being the final-newline replacement after the appended guard tests; no existing validator/sample/wrong-citation/duplicate assertion was weakened.

### Closure of the two S301 items

1. **Structured guard — CLOSED, with one noted over-rejection risk.** `validateSqlServiceCoverage` (`test:226-254`) returns explicit issue codes (`sql-service-excluded`, `not-inventoried`, `package-path`, `caller-missing`, `disposition`, `reason`, `false-claim`). The new reworded-negative test (`:261-272`) clones the real inventory, pushes `{area: "Effect SQLite service", reason: "No product code calls it; package tests only."}`, and calls the **same** `validateSqlServiceCoverage` path, asserting `sql-service-excluded`. Its RED-first failure is in `s300-red2.log`; GREEN 7/7 confirms closure. This catches both the exact removed sentence and any excluded area matching `/sqlite/i`.
   - **Noted residual:** `/sqlite/i` on any excluded area is broader than the SQL service path. A legitimate future exclusion of a different SQLite surface (e.g. `sqlite-memory`/another sqlite package) would be rejected by this guard and require a test change. It does not affect this slice, but the guard should be narrowed to the `sql-sqlite-node` package/statement if unrelated SQLite exclusions become legitimate.
2. **`make-sync` disposition — CLOSED.** JSON id `sql-service-make-sync` line 494 is now `disposition: "pure"`; the reason records the body evidence: `buildService(config, openWithRetrySync(config))`, synchronous, constructs no Effect, and its sync siblings are pure (the returned service uses Effect internally, but this entry's own body is sync). Final SQL counts are **5 existing-effect / 6 pure** (verified: 11 entries, 6 excluded). The prior claimed 6/5 is corrected.

### Other checks still hold

- All 7 product caller import lines remain real; the 6 remaining exclusions retain their accurate reasons.
- `observability-snapshot` still cites `run108-observability.ts:333` (`export function collectObservabilitySnapshot(`), a JSON-only correction.
- TDD: `s300-red2.log` has 7 tests with the one new reworded-negative guard failing first; `s300-green2.log` 7/7.
- Anti-slop on the test is unchanged: exactly 9 pre-existing `no-runtime-typeof` findings at lines 32, 38, 62, 65, 73, 76, 87, 104, 108; the guard adds none.
- No product source was edited; the inventory JSON remains the only data change and no prior assertion was weakened.

## FINAL VERDICT: PASS

Both S301 HOLD items are closed on the final frozen bytes; the machine check, anti-slop comparison, RED/GREEN evidence, citations, exclusions, and drift correction all hold. The only remaining note is the non-blocking `/sqlite/i` over-breadth for future unrelated SQLite exclusions. No numbered repairs remain.

