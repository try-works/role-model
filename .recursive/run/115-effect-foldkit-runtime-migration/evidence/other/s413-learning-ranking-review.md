# S413 — independent review: S412 Learning ranking + Activate/Roll back

Reviewer: `s9-private-readonly`, actual model **deepseek-flash** (live). Read-only on product files; no source edit, no commit. I ran the 4 affected UI files, UI tsc and anti-slop.

## Verified frozen artifacts

| File | sha256 | bytes |
| --- | --- | --- |
| `src/learning-ranking.ts` | `FA890F6F6B26A57FEC5BD1AE9D499C9783357E9FD65B8AC320CAFC7FF146DE44` | 7962 |
| `src/learning-ranking-view.ts` | `BEB3B7EE9C63601213044B53525B131D1031229AE50BE048D6D6991CCB2C7DC7` | 3605 |
| `src/readback.ts` | `3CB411CA3835AF6A8A16A291DDEABB82A9851987D1057B7B0E61F010D7633097` | 55461 |
| `src/message.ts` | `480A1648F2092F98C23B2B7C49FFE900DA31BFD086034456955124D4C3FC8969` | 13498 |
| `src/model.ts` | `BE98FB877AC7D94FD4481D550BB7730C2BBC82C71ECA39DC7CB93A0BA4700766` | 2339 |
| `src/commands.ts` | `21E834E3FC63AD6B3CF3BD14F157DD09356C44A99D9246DC8A6CD79B7408BC9F` | 25842 |
| `src/update.ts` | `1AA7597F4DF522EC76E7F3EECA323682ABBB1116E2CFF8FF3572416E899C8449` | 54157 |
| `src/view.ts` | `3D9357530B05D69291ADF7563DFF10CBACF5F59E6EE7CB88B8148509C2B720EB` | 71675 |
| `src/app.ts` | `AD60DE1945FC7FBF4AF2D3109659C060852530ABB876B2B9A64EFCD19713BE49` | 7363 |
| `test/s412-learning-ranking.test.ts` | `250D9409372207077450F8560362682E747D0AC3E2CEFC5158AF11AAFE7F2502` | 7372 |

All match. Affected 4 files: **25/25 pass**; UI tsc exit 0.

## Q1 — Typed parser: PASS

`parseLearningLadderPayload` requires an object with a `ladders` array and rejects a non-object, non-array ladders, non-string roleId/taskTypeId, missing/typed topEndpoints entries, non-numeric completeness, and unknown optional fields (endpoint status/reason/active types) rather than fabricating rows (`learning-ranking.ts:34-118`). Tests cover five malformed shapes plus the readback error mapping (`s412:56-62,66-76`). PASS.

## Q2 — Confirm/pending/error state: PASS for a single row

The key is `roleId + "\u0000" + taskTypeId` (`learning-ranking.ts:120-121`); first toggle sets confirming (no command), second emits exactly one Rollback command and pending, third is ignored while pending; failure keeps the row with error; success re-reads the learning readback (`update.ts:1045-1078`; `s412:118-152`). The view renders the per-row confirm label, pending aria-disabled, and error alert; no `window.confirm` is used (`learning-ranking-view.ts:34-55`). PASS for a single ladder row.

## Q3 — Rollback payload: PASS

`learningRollbackPayload` is exactly `{reason, roleId, rolledBack, scopeId, taskTypeId}` with the original literals `operator_ui_ladder_rollback` / `operator_ui_ladder_activate`; both directions and the POST path/body are tested (`learning-ranking.ts:123-141`; `s412:79-115`). The original learning.tsx uses the same literals and body; only the scopeId source differs (disclosed fallback). PASS.

## Q4 — Token fence/re-read: HOLD (cross-row)

The same-row success/failure is token-checked and a success issues one `ReadReadback({key:"learning"})` (`update.ts:1060-1078`). **But the token is global to the whole ranking section while the phase state is per-row.** Two different rows can both be confirmed and submitted: row A gets token 1/pending, row B gets token 2/pending. When A's result arrives with token 1 it is ignored (state token 2), and A's phase remains pending forever; its re-read/failure is dropped. There is no per-row token and no global busy guard. The tests exercise only one row. Required: use a per-row token (or serialize submissions globally) and add a two-row test proving each row settles.

## Q5 — Run: PASS

4 files **25/25 pass**; UI tsc exit 0.

## Q6 — Lint/limitations: HOLD on lint; limitations disclosed

The only new test file is clean and the view is clean, but **`src/learning-ranking.ts` is not lint-clean**: anti_slop_lint reports 19 findings, including `no-unknown-parameters` (the parser entry points), `no-runtime-typeof` (the shape guards), `no-unsafe-dictionary-type`, `no-unknown-returns`, and two `no-conditional-empty-object-spread` findings. The “lint clean” claim is false for the product module; the code needs typed guards/Schema parsing or explicit reviewed safety comments/suppressions. The disclosed scopeId fallback and section-not-route limitations are honest.

## VERDICT: HOLD (2 repairs)

1. **Fix cross-row token fencing:** per-row token or global serialization; two rows must be able to settle independently. Add a two-row pending/result test.
2. **Make `src/learning-ranking.ts` lint-clean** (or add explicit reviewed safety/suppression annotations) — 19 findings currently contradict the lint claim.

No product file was modified; no commit made.

## Final per-row-token/lint verification — PASS

Final hashes: learning-ranking 33D0CFA499B560C7B1B02255C1B6269C63510B62404548651A02DCBA0C9B3E97 (8000 B); commands 072B9D0DD929E3E08464992886FFAF8E9C0EFBF587546C2D64D915D12B8C5026 (25847 B); update 8AACCB718015ABD39C74364A52A134BFDABF11ECAD5A8891E1ECA4CC0F4BD767 (54333 B); readback EE0C83591A2629CF996B5AD4F85CAA02A6E3606ADEBCDF0AE6F543959E3BE074 (55609 B); s412 test A3460C6786776E4048497356F4468739F42054173E4A0E53060D9CAF07EFDB17 (8211 B). 4 files **26/26**; UI tsc 0.

- **Per-row tokens:** each pending phase entry stores its own token (initial state has no token; first submit uses 1); Updated/Failed require that row to be pending and the entry token to match (`update.ts:1045-1080`). The two-row test starts A and B pending with independent tokens and resolves both to idle (`s412:155-165`). The earlier global-token cross-row bug is closed.
- **Lint:** ranking module is rewritten with Effect Schema at the I/O boundary; anti_slop_lint on the absolute `src/learning-ranking.ts` path reports **0 findings**; test and view also clean.
- **RED:** s412-red2.log shows the probe-proven pre-fix overlay loading and three behavioral failures including the two-row test (TypeError not a handler); green is 26/26. The repair evidence is legitimate.

**FINAL VERDICT: PASS** — both S413 HOLD items are closed; no remaining numbered items. No product file was modified; no commit made.

