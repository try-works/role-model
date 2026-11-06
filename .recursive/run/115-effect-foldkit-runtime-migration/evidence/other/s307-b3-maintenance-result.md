# S307 — B3/R24 maintenance owner drain/fence result

Task-20 (rev 2). Model: deepseek-flash verified live. Scope: ONLY `packages/sql-sqlite-node/**` + s307 evidence.
No commit; s9 review then Lead commit. DatabaseSync remains blocking; no runSync/scheduled substitute added.

## API (service.ts)

- `MaintenanceBusyError` — `code = "MAINTENANCE_BUSY"`, `owner` ("active async transaction" / "sync facade
  owner" / "another maintenance operation"). Immediate typed refusal when `drainTimeoutMs` is 0/absent and an
  owner holds the connection.
- `MaintenanceDrainTimeoutError` — `code = "MAINTENANCE_DRAIN_TIMEOUT"`, `timeoutMs`. Bounded drain (10 ms
  event-loop polls up to the bound) then typed failure; never force-closes an owner.
- `SqliteService.maintenance`: `pragmas()`, `backup(targetPath, options)`, `reset(options)`,
  `restore(options)`; `MaintenanceOptions { drainTimeoutMs?, reapplyPragmas? }`.
- Ownership inputs: `activeTransaction` (async Effect transaction fiber id) and the new `syncOwnerDepth`
  (sync facade stack, so a re-entrant sync owner also refuses typed). The s268 mixed-owner fence is untouched and
  composes: sync calls still refuse against a foreign async transaction, and maintenance refuses against both.

## PRAGMA preservation evidence

- Baseline captured after open + `config.setup` (`busy_timeout 5000`, `journal_mode wal`, `foreign_keys 1`,
  `synchronous 1`, plus cache/temp/locking/auto_vacuum/wal_autocheckpoint).
- `reset({ reapplyPragmas: false })` (loss hook) leaves `busy_timeout = 1` — the naive restore really loses the
  store's PRAGMAs (RED assertion).
- Normal `reset()` and `restore()` re-apply the captured baseline in `finally`: `pragmas()` after each equals the
  pre-maintenance snapshot (deep-equal assertion). `backup()` writes `VACUUM INTO` target and the file exists.
- reset/restore internally reset connection pragmas to non-store defaults (`busy_timeout 1`, `foreign_keys OFF`,
  `synchronous OFF`) before `VACUUM`/setup — the loss hook proves the reset path is exercised.

## Lock / event-loop probe (measured, not skipped)

`evidence/other/s307-lock-probe.json`: drain with `drainTimeoutMs: 100` while an async transaction holds →
elapsed 106 ms, 7 event-loop interval ticks; DatabaseSync itself stays blocking, only the fence drain yields.

## TDD

- RED (`evidence/logs/s307-red.log`): new file 4 tests, **4 failed | 0 passed** against the weak maintenance stub
  (no refusal, no timeout, empty pragmas).
- GREEN (`evidence/logs/s307-green.log`): full package suite **5 files, 43 passed (43)** — the four existing
  suites stay green: sqlite-service 11, s18a-sql-truth 10, s268-mixed-owner 7, s273-cleanup 11; new S307 4.

## Lint

`src/service.ts`: the same 5 pre-existing findings as HEAD (`git show HEAD:` copy lints identically:
no-unsafe-dictionary-type 33/34, require-safety-comment-for-type-assertion, no-unknown-returns, no-known-value-widening
— all in pre-existing helpers, line-shifted only). New test file: clean.

## Hashes

- src/service.ts 24010 B `96FE70E3FAC887F2430B891747B1C539863823A756B87F65D4A70FDD26E2F30B`
- test/s307-maintenance-owner-fence.test.ts 6287 B `772DA321C101C41B6C8F36196471D2E971447E1F7B5FCA64BFD1234ED0F9CECC`
## S308 HOLD repair (3 items)

1. **maintenanceActive race fixed**: the single maintenance slot is reserved SYNCHRONOUSLY at entry (before any
   await / before the drain loop), so two concurrent callers cannot both pass the fence; the second gets
   `MaintenanceBusyError` (owner "another maintenance operation"). The sync-facade-owner refusal is also checked
   synchronously at entry (owner "sync facade owner"). Tests: "concurrent maintenance reserves the slot
   synchronously: the second caller gets MAINTENANCE_BUSY" and "maintenance is refused while a synchronous facade
   owner holds the connection".
2. **drainTimeoutMs validation**: `MaintenanceBudgetError` (code MAINTENANCE_INVALID_BUDGET) is thrown before the
   loop for non-finite (Infinity/NaN) or negative budgets; the drain loop therefore always has a finite deadline.
   Test: "non-finite drain budgets are rejected with a typed validation error before any loop" (Infinity + NaN,
   no backup file created).
3. **reapply verification**: after re-apply the service RE-READS `pragmas()` and compares it to the store
   baseline; drift throws `MaintenancePragmaVerificationError` (code MAINTENANCE_PRAGMA_UNVERIFIED, `pragmas`
   list). Primary work errors still take precedence; the failure-path hook `reapplyFailurePragma` simulates a
   rejected/no-op re-apply. Test: "a rejected/no-op pragma re-apply is surfaced by the post-re-apply verification"
   (busy_timeout drift).

RED (`s307-red2.log`): 8 tests, **3 failed | 5 passed** (concurrent slot, budget validation, reapply verification).
GREEN (`s307-green2.log`): full package suite **5 files, 47 passed (47)** (39 existing + 4 S307 + 4 S308).

S308 hashes: src/service.ts 26292 B `22E2FE5BC8DE3CEDFF3F0EEE3F21EFE542FE01AA539D1D472AF3B9F6E5FB900D`;
test/s307-maintenance-owner-fence.test.ts 8822 B `9E0BA4FE184945000FC043B11DD349B2857EBCDB454D5AC62C17E6424F23EAD9`.
Lint: service.ts keeps the same 5 pre-existing findings (33/34, 225, 249, 310 — all pre-existing helpers); new
test file clean.
## S309 micro-repair: a refused drain writes nothing

`runMaintenance` now tracks `drained`: only after `drainMaintenanceOwners` actually succeeds does the service
re-apply PRAGMAs and verify them. An immediate busy refusal or a drain timeout skips re-apply AND verification
entirely, so a refused maintenance leaves the live owner's connection untouched. `maintenanceActive` is still
released on every path, and the synchronous reservation / budget validation / post-re-apply verification /
primary-error precedence are unchanged.

Test: "a refused drain leaves the store untouched: no PRAGMA writes and no backup target (busy + timeout)" —
sets a caller-mutated `busy_timeout = 777` (different from the setup baseline 5000), then hits both the immediate
busy and the 60 ms drain-timeout paths and asserts `pragmas()` still deep-equals the pre-call snapshot and no
backup target exists. RED on the old code: the busy path re-applied the baseline (777 → 5000).

RED (`s307-red3.log`): 9 tests, **1 failed | 8 passed**. GREEN (`s307-green3.log`): full package suite
**5 files, 48 passed (48)**.

Final hashes: src/service.ts 26542 B `7B771085F7C0A0BDD3C77CB2703AC38AFEFF6BBBFA0FA76C6D680C3DCC8CC221`;
test/s307-maintenance-owner-fence.test.ts 9923 B `F90C70227E4A8C19A8D15A38B32DF5EE44711CEC0ED76012B5F5C2291278B105`.
Lint unchanged: service.ts same 5 pre-existing findings; test clean.
