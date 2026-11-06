# S412 — Learning per-task ranking + Activate/Roll back (LANDED, S413 repaired)

## Landed
- src/learning-ranking.ts: exact Schema decode of the REAL { ladders: [...] } payload at the I/O boundary; typed rows; malformed shape -> typed parse failure.
- src/learning-ranking-view.ts: top-3 ranked endpoints + full-ranking <details>, per-row confirm -> pending -> error (no window.confirm).
- readback.ts: ladder rows appended; malformed ladders fail the readback.
- message/model/commands/update/app: toggle messages, one RollbackLearningLadder command (exact POST body), token-fenced re-read, client seam.

## S413 repair table
| Hold | Fix | Evidence |
| --- | --- | --- |
| Cross-row global token | Per-row token stored in each phase entry; Updated/Failed only apply to the pending row whose token matches. | 'resolves two pending rows independently': A and B pending token 1 -> A resolves idle, B stays pending, then B resolves. |
| learning-ranking.ts 19 lint findings | Rewrote on Effect Schema at the I/O boundary; typed JSON domain; no unknown helpers/typeof narrowing; no conditional empty spreads; client Promise<void>; error body decoded by Schema + one SAFETY cast; headers typed, no widening. Absolute-path scan: CLEAN (0 findings, 1 file). | anti_slop_lint absolute path |

## RED evidence (repaired)
The earlier copy-based attempts failed silently because E:/rm-tmp/s412/update.ts.bak did not exist (Copy-Item errors were swallowed), so the fixed file stayed in place. The working probe: overlay the HEAD (pre-S412) src/update.ts via `git show HEAD:...`, touch its mtime, remove the vite/vitest caches, and run s412 — the module graph demonstrably loaded the pre-fix bytes because the learning tests failed:
- EXIT_CODE=1; 3 failed | 5 passed.
- FAIL 'confirms on the second click, then submits once and refuses double submits'.
- FAIL 'keeps the row on failure and re-reads the learning readback on success'.
- FAIL 'resolves two pending rows independently' (the per-row token test).
After restoring the fixed bytes (hash verified) GREEN is 26/26. The earlier 'pre-fix still passed' observation was an overlay bug, not a harness limitation.

## Tests (test/s412-learning-ranking.test.ts, 8)
typed parse; unknown-shape rejection; readback valid/empty/malformed; exact payloads both directions; exact POST; second-click confirm; no double submit; error keeps row; success re-read; two-row per-row token.

## Evidence
- RED s412-red2.log: EXIT_CODE=1, 3 failed (incl. two-row) against HEAD update.ts.
- GREEN s412-green2.log: 4 files / 26 tests; UI tsc 0; s412 lint CLEAN.

## Hashes
learning-ranking 33D0CFA4... (8000 B), commands 072B9D0D..., update 8AACCB71..., readback EE0C8359..., s412 test A3460C67....

## Known limitation
scopeId is the original fallback literal 'standalone-runtime-stage'; the readback scopeId is not yet threaded.
