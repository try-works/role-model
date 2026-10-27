# S270 — independent SQL mixed-owner review

Run: `115-effect-foldkit-runtime-migration`. Read-only exact Flash reviewer, GPT Lead; no children, no
product edits, no commit. Inputs: task `s270`; effective plan (`REASSESSMENT-AND-EXECUTION.md` §B B-SQL,
`02-to-be-plan.md` R23/R24/SRC-027/028); `00-requirements.md` R23/R24; addenda 01/02; S268 task + report;
`git diff 9ac82847 -- .../sql-sqlite-node/src/service.ts`; current `test/s268-mixed-owner.test.ts`; legacy
`test/sqlite-service.test.ts`, `test/s18a-sql-truth.test.ts`. F-URL files ignored.

## Pinned reviewed artifacts

| Artifact | SHA-256 | Last write |
|---|---|---|
| `packages/sql-sqlite-node/src/service.ts` | `485AC00EC71FEC0134BD3CD094646FA81235E45824FD9211C8CA36413A5E82BF` | 14:54:02 |
| `packages/sql-sqlite-node/test/s268-mixed-owner.test.ts` | `87DBB1F0BD99ACE17A30B030C028D41F56A6DD1E72D24C8047973DA12F592622` | 15:04:48 |
| Baseline `9ac82847` | service diff +58/−13; test NEW 264 lines | — |

The test was re-saved **during this review** (task 15:00:24; `s268-green.log` 14:54:27; report 14:55:38). My
first read was the 261-line cast version (`caught as SqliteServiceError`, `as ReadonlyArray<...>`); the
current 264-line version is already cleaned to `assert.ok` + `Schema` decoding. Findings target the pinned
hashes above.

## Verdict

**PASS (bounded) on product behaviour at the pinned hashes.** No correctness defect found in the fence or
finalizer; I independently re-ran the current bytes green (7/7 new; 28/28 with legacy service + s18a, exit
0). **Evidence HOLD:** the S268 report/green log describe superseded test bytes and must not be used as the
current test's acceptance evidence; refresh them (or cite this run + hashes). **Flag to Lead:** new-test
teardown/error-masking cleanup (Finding 2).

## Findings (prioritized)

1. **[High — evidence/traceability] S268 GREEN/report are stale vs the reviewed test.** `s268-green.log`
   (14:54:27) and `s268-sql-owner-safety.md` (14:55:38) predate the 15:04:48 rewrite. The report still
   describes the cast helper (lines 55-57 and coverage bullets) and the Lead's anti-slop findings at test
   lines 37/47/55, none of which exist in the current bytes. `s268-red.log` is also pre-`biome --write`
   reflow (stack 49/83/146 vs current 45/81/143), though assertions are unchanged. Strict RED ordering
   holds (test created 14:51:03, red 14:51:26, service edited 14:54:02, green 14:54:27). **Action:**
   re-run/pin GREEN + anti_slop_lint on hash `87DB…` and update cited lines; do not lock from the old log.
2. **[Medium — test cleanup, flag to Lead] New-test teardown can mask failures.**
   `test/s268-mixed-owner.test.ts:32-36` unguarded `rmSync` over module-global `dirs`; legacy
   `test/sqlite-service.test.ts:31-39` guards exactly this on Windows. If `freshService` throws after
   `mkdtempSync` (`:24-30`) or a test fails before its `finally` (`:121,134,150,167,206,237,261`), the DB
   handle can stay open and teardown throws `EBUSY/EPERM`, hiding the real failure. Also
   `:93-105` `finally { await release(); await commit; }` replaces the `inspect()` assertion error with a
   commit rejection. Passing path is leak-free (awaited `Fiber.interrupt`, release+join; no orphan fibers
   observed).
3. **[Low — coverage note] Owner-allow is proven only indirectly by the new test.** New tests use the
   unfenced `tx.querySync`/`tx.execSync` handle; the fence's `Fiber.getCurrent()` owner match is exercised
   by legacy `test/sqlite-service.test.ts:222-232` (owner `service.querySync` inside work) and the 28/28
   combined run. Green, but the new test should cross-reference that oracle.
4. **[Low — pre-existing residual, not introduced] Owner bypass permits unsafe self-close; async close can
   deadlock.** `service.ts:293-298` refuses only different/absent fibers, so the owner can still call
   `service.closeSync()`/`transactionSync()` mid-transaction (legacy item 4 `:255-270` depends on owner
   `closeSync`, then expects rollback/close cleanup failures). `service.ts:451-463` async `close()` inside
   transaction work still waits on the held semaphore (pre-existing; only async `query`/`exec` reject
   nested). B-SQL follow-on, not this slice's defect.
5. **[Low — pre-existing] `transactionSync` BEGIN outside `try`.** `service.ts:440` raw driver error and no
   `rollbackAndMaybeClose` on failed BEGIN; owner-allow can reach it, external callers are now refused
   before it. Not introduced.

## Checks performed at pinned hashes

- **Interleaving/fence ordering:** ✅ `refuseUnlessTransactionOwnerSync` reads `activeTransaction`
  synchronously and runs before `prepare`/`exec`/`close` (`service.ts:425-440,465-472`). Owner set before
  BEGIN (`:378-389`), cleared only after rollback in the same `Effect.sync` finalizer (`:413-420`); no
  await separates owner-set from BEGIN/COMMIT. Pre-BEGIN window has no open transaction; async close is
  semaphore-serialized.
- **`Fiber.getCurrent` detection:** ✅ `Effect.fiberId` and `Fiber.getCurrent()?.id` are the same numeric id;
  owner path passes legacy item 4 inside the running fiber; absent/different fiber refuses. No incorrect
  refusal in 28/28.
- **Refusal BEFORE SQL/close:** ✅ writing-`RETURNING` `querySync` never runs (count 2), `execSync` never
  runs (count 2), `transactionSync` never reaches BEGIN (count 2), `closeSync` leaves `isOpen()` true.
- **tx-local sync calls:** ✅ handle built per transaction and unfenced (`service.ts:243-256`); current test
  suspends after INSERT, owner asserts count 1, `tx.execSync` adds row 2; commit yields 2.
- **failure/interrupt BEGIN/COMMIT/ROLLBACK timing:** ✅ BEGIN failure → no rollback; COMMIT success → flag
  false; COMMIT/work failure → flag true → finalizer rollback; interruption captured by `Effect.exit(work)`
  then re-raised → finalizer rollback. Rollback precedes `clearTransactionOwner()` in one sync step, so no
  next operation can see a stale owner.
- **Uninterruptible cleanup gap:** ✅ none found — cleanup is one `Effect.sync` (rollback + clear cannot be
  split/interrupted mid-way). `Effect.ensuring` is `onExit`; if cleanup ever becomes async, wrap it
  `Effect.uninterruptible`.
- **Primary error:** ✅ rollback/close failures go through `onCleanupFailure` and never replace the primary;
  legacy rollback+close-failure test and new primary-identity test both hold.
- **Deadlock:** ✅ fenced external sync calls cannot enter; async `query`/`exec` still reject nested (legacy
  6b). No new deadlock; pre-existing async `close()`-from-work deadlock remains (Finding 4).
- **Test sensitivity/handles:** ✅ real disposable SQLite files under `TMP`, `Deferred` gates (no sleeps);
  refusal asserts observe post-commit counts and `isOpen`; interruption awaited via `Fiber.interrupt` then
  state inspected. Teardown/masking caveats in Finding 2.
- **Sync compatibility:** ✅ `makeSync`-only services never set `activeTransaction`, so sync/sync legacy
  behaviour is unchanged; owner `service.querySync` in `work` still allowed; close idempotent async/sync.
- **Extra probe (temp file only):** a factory that throws synchronously from
  `transaction(() => { throw primary; })` still yields a Failure exit, rolls back (count 0 → next insert 1),
  leaves the connection usable, `isOpen()` true, `closeSync()` OK — finalizer covers this path too.

## Anti-slop status

- Service: Lead's 5 existing findings (`service.ts:33/34/129/153/214`) are pre-existing `unknown`/cast
  patterns; new helper block (`:281-298`) adds no `as`/`unknown` by inspection. Legacy not rewritten.
- New test: Lead's 3 findings (`37 unknownReturn`, `47/55 assertions`) are already absent from the current
  hash (`:38 () => void`; `:48 assert.ok` narrowing; `:56-58 Schema` decode), but the cleanup is
  unrecorded in `s268-sql-owner-safety.md`; re-lint on the current hash.

## Commands / evidence for this review

```powershell
# from role-model-router/packages/sql-sqlite-node, TMP=TEMP=E:\rm-tmp
node ../../../node_modules/vitest/vitest.mjs run test/s268-mixed-owner.test.ts
# -> 7/7 passed, exit 0; hash 87DB… unchanged before/after
node ../../../node_modules/vitest/vitest.mjs run test/s268-mixed-owner.test.ts test/sqlite-service.test.ts test/s18a-sql-truth.test.ts
# -> 28/28 passed, exit 0
```

No full suite, packaged/SEA, private, provider, maintenance drain/fence, or live verification was run or
claimed. No approval from log counts alone: the PASS is from targeted runs against the pinned current
hashes. If evidence-artifact fidelity is a gate, treat as **HOLD until the S268 report/green are re-pinned**;
the code behaviour itself needs no change found here.
