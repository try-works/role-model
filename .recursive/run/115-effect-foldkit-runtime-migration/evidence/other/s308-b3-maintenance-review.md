# S308 — independent review: S307 B3/R24 maintenance owner drain/fence

Reviewer: `s9-private-readonly`, actual model **deepseek-flash** (live). Read-only on product files; no source edit, no commit. I ran the package suite, the lock-probe test and anti-slop as requested.

## Verified frozen artifacts

| File | sha256 | bytes |
| --- | --- | --- |
| `role-model-router/packages/sql-sqlite-node/src/service.ts` | `96FE70E3FAC887F2430B891747B1C539863823A756B87F65D4A70FDD26E2F30B` | 24010 |
| `test/s307-maintenance-owner-fence.test.ts` | `772DA321C101C41B6C8F36196471D2E971447E1F7B5FCA64BFD1234ED0F9CECC` | 6287 |

Both match. Suite: `corepack pnpm --filter @effect/sql-sqlite-node exec vitest run` → **5 files, 43 passed (43)**, exit 0 (39 pre-existing + 4 new). Lock probe records a real 105 ms drain with 7 event-loop ticks (`evidence/other/s307-lock-probe.json`).

## Q1 — Fence correctness: HOLD (one race)

- Async owner: `activeTransaction` ref is checked by `drainMaintenanceOwners` (`service.ts:599-620`); the async-transaction test is refused with `MaintenanceBusyError` (`test:84-97`). PASS.
- Sync owner: `syncOwnerDepth` is incremented in `withSyncOwner`'s try and decremented in `finally`, and all four sync paths use it (`querySync/execSync/transactionSync/closeSync`, `src:487-549`); maintenance refuses typed when depth > 0 (`:603-606`). Code is correct, but no new test exercises a maintenance call while a sync owner is held — a coverage gap, not a demonstrated bypass.
- **Another maintenance race:** `maintenanceActive` is checked at `:600`, but only set to true *after* `await drainMaintenanceOwners(...)` at `:632-633`. Two maintenance calls made in the same turn both pass the `maintenanceActive === false` check before either sets it; the second is not refused with `MaintenanceBusyError`. The synchronous `work()` bodies mean the operations serialize rather than overlap in practice (no concurrent DB statement), but the claimed typed “another maintenance” refusal is not race-safe. Required: reserve the maintenance slot synchronously (set/clear with try/finally around the whole operation, or use a promise mutex) and add a concurrent-maintenance test.
- The fence is typed: `MaintenanceBusyError` (`src:90-103`), `MaintenanceDrainTimeoutError` (`:106-118`); no plain throw on these paths.

## Q2 — Drain boundedness: HOLD (non-finite timeout)

- Absent/0/negative `drainTimeoutMs` refuses immediately: `options?.drainTimeoutMs ?? 0` (`:632`), then `<= 0` throws `MaintenanceBusyError` (`:611-612`). The async-owner test covers absent; timeout test covers 80 ms (`test:99-118`). PASS.
- Bounded poll is 10 ms `setTimeout`, deadline check, typed timeout (`:614-620`); probe 100 ms → 105 ms and 7 ticks. No force-close/rollback: drain runs before `work()`; timeout leaves the active owner untouched and the target file absent (`test:84-118`). PASS.
- **Non-finite interval is unbounded:** `drainTimeoutMs: Infinity` gives a deadline of `Infinity` and the while loop never times out; `NaN` makes every `Date.now() >= deadline` false, also unbounded. There is no `Number.isFinite`/positive validation. Required: reject non-finite/NaN drain budgets with the typed busy/error (or a typed validation error) and add a test.

## Q3 — PRAGMA preservation: HOLD (silent best-effort)

- `storePragmas = readPragmas()` is captured after the store's setup baseline (`src:576`); `reset` sets non-store defaults then VACUUM and `restore` re-runs setup then VACUUM (`:647-663`); `reapplyPragmas(storePragmas)` runs in `finally` even on a work failure (`:636-643`). The test proves normal reset/restore deep-equal the pre snapshot and the naive `reapplyPragmas:false` loses `busy_timeout=5000` → `1` (`test:120-139`). PASS for the normal path.
- `backup` is `VACUUM INTO '<target>'` (`:648-651`) and the target file is asserted to exist (`test:136-138`). PASS.
- **Silent drop:** `reapplyPragmas` catches every failure per pragma and continues (`:578-587`) without re-reading/verifying the snapshot. A rejected/no-op re-apply (e.g. a read-only or connection-level pragma, or a SQLite refusal) is silently lost, directly contradicting the claim “no per-store PRAGMA is silently dropped”. The test only covers the success path. Required: after re-apply, read `pragmas()` and fail loudly if it differs from `storePragmas` (or at least throw on any rejected re-apply), plus a failing-work/re-apply test.

## Q4 — Composition / mixed-owner: PASS

The s268 mixed-owner fence is still present (`refuseUnlessTransactionOwnerSync` checks the active fiber, `src:351-359`) and the full package suite includes `s268-mixed-owner.test.ts` plus the async maintenance refusal; **43/43** passes. No regression.

## Q5 — R24 constraints: PASS

`DatabaseSync` remains the blocking store; the only new scheduling is the 10 ms drain poll (`src:619`), plus existing `Effect.runSync` Ref reads/writes. No `runSync` DB substitute and no scheduled/async replacement was added. The s18a blocking measurement remains in the 43/43 suite.

## Q6 — Lock probe: PASS

`s307-lock-probe.json` records `drainTimeoutMs: 100`, `elapsedMs: 105`, `eventLoopTicks: 7`, mode `async-poll-drain`; the test asserts a typed timeout, elapsed bounds and ≥3 ticks, and writes the measurement (`test:141-166`). It is a real event-loop measurement and bounds this drain path.

## Q7 — Lint: PASS (same 5, shifted lines)

- `anti_slop_lint(src/service.ts)`: **5 findings**, rules identical to HEAD (`no-unsafe-dictionary-type`, `require-safety-comment-for-type-assertion`, `no-unknown-returns`, `no-known-value-widening`), at current lines 33, 34, 191, 215, 276. HEAD (git-show copy) has the same 5 rules at 33, 34, 129, 153, 214; the later lines are shifted by the ~62-line S307 insertion, not new findings.
- `anti_slop_lint(test/s307-maintenance-owner-fence.test.ts)`: **clean**.

## Q8 — TDD: PASS

`s307-red.log`: **4 failed / 4** against the weak stub — missing typed refusal (backup returned a result), missing typed drain timeout, `busy_timeout` read `undefined` instead of 5000, and the probe test not seeing `MaintenanceDrainTimeoutError`. These are behavioural assertion failures, not setup/import errors. GREEN `s307-green.log`: 43/43.

## VERDICT: HOLD (3 required repairs)

1. **Make the maintenance fence race-safe:** reserve the maintenance slot synchronously (or use a promise mutex) before the drain await so a second concurrent maintenance gets the typed `MaintenanceBusyError`; add a concurrent-maintenance test. Also add a sync-facade-owner maintenance test.
2. **Validate the drain budget:** reject non-finite/NaN `drainTimeoutMs` as a typed refusal; add a test proving it cannot poll forever.
3. **Do not silently drop pragmas:** verify the re-applied `pragmas()` equals the captured baseline (or throw on any failed re-apply) and add a failure-path/re-apply test; the current catch-all best-effort can silently lose a per-store pragma.

No product file was modified; no commit made.

## Re-review (S308 final) — HOLD (1 remaining)

Verified final hashes:

| File | sha256 | bytes |
| --- | --- | --- |
| `src/service.ts` | `22E2FE5BC8DE3CEDFF3F0EEE3F21EFE542FE01AA539D1D472AF3B9F6E5FB900D` | 26292 |
| `test/s307-maintenance-owner-fence.test.ts` | `9E0BA4FE184945000FC043B11DD349B2857EBCDB454D5AC62C17E6424F23EAD9` | 8822 |

Full suite: `corepack pnpm --filter @effect/sql-sqlite-node exec vitest run` → **47/47 pass**. RED2 is behavioral: 3 failed / 5 passed first, including the concurrent-reservation, re-entrant sync-owner and pragma-verification failures. Lint: service has the same 5 rules as HEAD (current lines 33, 34, 225, 249, 310; line shifts from the insertion), new test clean.

### Closed in this round

1. **Synchronous reservation — CLOSED.** `runMaintenance` now checks `maintenanceActive` and `syncOwnerDepth`, then sets `maintenanceActive = true` **before** `await drainMaintenanceOwners` (`src:663-681`); no await lies between check and reservation. Concurrent maintenance gets `MAINTENANCE_BUSY` with owner `"another maintenance operation"` (`test:170-179`); maintenance inside `transactionSync` gets `"sync facade owner"` (`test:181-191`). PASS.
2. **Budget validation — CLOSED.** `Number.isFinite(drainTimeoutMs)` / `< 0` throws `MaintenanceBudgetError` before the loop (`src:663-666`); Infinity and NaN tests pass with no backup file (`test:193-204`). Negative is covered by the same code (not a separate test; noted). PASS.
3. **Pragma verification — CLOSED on the normal path.** After re-applying, `readPragmas()` is compared to `storePragmas` and `MaintenancePragmaVerificationError` lists drifted names (`src:686-695`); the `reapplyFailurePragma` hook skips `busy_timeout` and the test sees it in `pragmas` (`test:206-215`). Primary work errors take precedence over verification (`src:700-705`); no force-close/rollback is introduced (only PRAGMA setters). PASS.

### Remaining HOLD

- **The drain-failure path still touches the store.** `runMaintenance` catches a drain failure into `primary` (`src:680-685`), then **always** runs the second try: `reapplyPragmas(storePragmas, ...)` and (skipped only when primary is set) verification (`:686-699`). That means an immediate `MaintenanceBusyError` or `MaintenanceDrainTimeoutError` caused by an active async owner still executes PRAGMA setters against that owner's live connection, even though no maintenance work started. This contradicts the task requirement that a timeout leaves the store untouched and usable (and the existing tests do not check pragmas after drain failure, only that the backup target is absent). Required: track whether the drain/work actually started (e.g. a `workAttempted`/drain-success flag or move re-apply inside the post-drain work path) and skip all re-apply/verification on drain refusal/timeout; add a test asserting `pragmas()` is unchanged and no target file exists after both an immediate busy refusal and a drain timeout. This is not force-close/rollback, but it is an unintended write to a store owned by another operation.

**FINAL VERDICT: HOLD (1 item).** No product file was modified; no commit made.

## Final re-review after drain-failure fix — PASS

Verified final hashes:

| File | sha256 | bytes |
| --- | --- | --- |
| `src/service.ts` | `7B771085F7C0A0BDD3C77CB2703AC38AFEFF6BBBFA0FA76C6D680C3DCC8CC221` | 26542 |
| `test/s307-maintenance-owner-fence.test.ts` | `F90C70227E4A8C19A8D15A38B32DF5EE44711CEC0ED76012B5F5C2291278B105` | 9923 |

- **Guard cannot be bypassed:** `drained` starts false (`src:680`), is set true only immediately after `await drainMaintenanceOwners` resolves (`:682-684`), and the entire re-apply/verification block is inside `if (drained)` (`:688-705`). Every throw from the drain (sync-owner/busy, timeout) leaves `drained=false`, skips all PRAGMA setters and verification, then releases `maintenanceActive` and throws `primary` (`:706-708`). No connection write on refusal.
- **Regression test is behavioral:** `test:217-238` mutates `busy_timeout` to 777, holds an async transaction, exercises the immediate-busy and 60 ms timeout paths, and asserts `pragmas()` still deep-equals the pre-refusal snapshot and neither backup target exists. This is exactly the prior failure (old code changed 777 back to the 5000 baseline).
- **Unchanged safeguards:** synchronous reservation before the drain await (`src:663-681`), budget validation (`:663-666`), maintenanceActive release on every path (`:706`), primary-work precedence over verification (`:707-712`), and the no-force-close/no-rollback behavior all remain; only the drained work path re-applies pragmas.
- **Full suite:** `corepack pnpm --filter @effect/sql-sqlite-node exec vitest run` → **48/48 pass** (9 new maintenance tests). RED3 is the expected one-failure old-code reapply; GREEN3 48/48.
- **Lint:** service has the same 5 rules as HEAD (current lines 33, 34, 225, 249, 310; lines shifted by the insertion), new test **clean**.

## FINAL VERDICT: PASS

The refused-drain path now performs zero connection writes; busy and timeout both leave the store untouched and the target absent; the suite is 48/48; lint is unchanged at 5 pre-existing service findings and a clean new test. No remaining numbered items. No product file was modified; no commit made.

