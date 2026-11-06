# S268 — B3 SQL mixed-owner safety vertical slice (R23/R24)

Run: `115-effect-foldkit-runtime-migration`
Task: `tasks/s268-sql-owner-safety.md` — explicit deepseek-official/deepseek-flash implementer, GPT Lead.
Date: 2026-10-27
Owned files: `role-model-router/packages/sql-sqlite-node/src/service.ts`, NEW
`role-model-router/packages/sql-sqlite-node/test/s268-mixed-owner.test.ts`, this evidence file and
`evidence/logs/s268-*`. No existing tests edited. No commits, no children, no CLI/host/public/private changes.

Status: bounded slice RED -> GREEN. **No full-plan or requirement-completion claim.** B-SQL follow-ons
(async observation/graph hydration, maintenance drain/fence, host callers) remain with Lead/B6 as scoped
by `REASSESSMENT-AND-EXECUTION.md` §B/§S266 repairs.

## Inputs reread

- `tasks/s268-sql-owner-safety.md`
- `REASSESSMENT-AND-EXECUTION.md` (including S266 repairs; B-SQL owns `service.ts` + colocated tests only)
- locked `00-requirements.md` R23/R24, `00-worktree.md` diff basis, `02-to-be-plan.md` R23/R24
- `evidence/other/s266-plan-review.md` (narrow HOLD; B-SQL/F-URL/V-CAPTURE safe to start)
- `addenda/01-transaction-ownership-semantics.md`
- `.agents/skills/effect-ts/SKILL.md` (and the vendored `Fiber.getCurrent` contract in
  `vendor/effect/packages/effect/src/Fiber.ts:575-606`) before writing Effect test/guard code

## Defect proven (strict RED, before any production edit)

The async `transaction` holds the single semaphore permit and sets `activeTransaction`, but
`querySync`/`execSync`/`transactionSync`/`closeSync` bypassed both the semaphore and the owner state and
wrote/read/closed the same `DatabaseSync` connection.

Evidence: `evidence/logs/s268-red.log` — `Test Files 1 failed (1)`, `Tests 6 failed | 1 passed (7)`:

- external `querySync("INSERT ... RETURNING ...")` ran inside the suspended transaction; the owner's
  post-gate count was 2 instead of 1 (querySync is not read-only and the refusal did not exist);
- external `execSync("INSERT 99")` likewise executed inside the transaction (same count mismatch);
- external `transactionSync` reached SQLite and raised the driver's raw
  `cannot start a transaction within a transaction` (not a typed `SqliteServiceError`);
- external `closeSync` closed the connection mid-transaction; the owner then failed with
  `database is not open`;
- external sync access did not refuse at all;
- only the pre-existing failure/primary-identity path passed.

The RED run also exposed a second, real cancellation defect: after interruption, ownership was cleared but
the open `BEGIN` and its uncommitted INSERT survived (`expected [{ c: 1 }] to deeply equal [{ c: 0 }]`).
`Effect.exit(work)` is aborted by interruption before the body's rollback runs.

No production source was edited before `s268-red.log` was produced.

## Production change (minimal, same file)

`src/service.ts`

- `syncOwnershipError` (line 281): typed `SqliteServiceError` with operation identity; the message
  documents the intentional refusal because "a synchronous call cannot await the semaphore".
- `refuseUnlessTransactionOwnerSync` (line 293): reads the `activeTransaction` fiber id and compares it
  with `Fiber.getCurrent()?.id` (public Effect v4 synchronous accessor). A different or absent fiber
  throws before any `prepare`/`exec`/`close`; the owning fiber and the transaction handle keep working.
  This is an intentional race-safety refusal, not pretended asynchronous serialization.
- Applied to `querySync` (427), `execSync` (433), `transactionSync` (439), `closeSync` (469). `isOpen`
  and the async `query`/`exec` nested-rejection semantics are unchanged; no broad call conversion.
- `transaction` (363-423): BEGIN/COMMIT/ROLLBACK, 100/200 ms retries, 5 s busy timeout, semaphore and
  primary-error identity are preserved. A local `transactionOpen` flag is set inside the atomic
  BEGIN/COMMIT thunks, and the existing `Effect.ensuring` finalizer (413-420) is now the single rollback
  authority: it rolls an open transaction back and then clears ownership on success, failure **and
  interruption**. Rollback/close failures are reported through `onCleanupFailure` and never replace the
  primary cause.
- The synchronous facade contract comment (108-112) records the owner-aware refusal for callers.

## GREEN

Evidence: `evidence/logs/s268-green.log` — `Test Files 3 passed (3)`, `Tests 28 passed (28)`, exit 0:

- `test/s268-mixed-owner.test.ts` — 7/7 new;
- `test/sqlite-service.test.ts` — 11/11 unchanged (owner sync calls inside the transaction, nested
  rejection, primary error across rollback/close failures, 100/200 ms + 5 s, serialization);
- `test/s18a-sql-truth.test.ts` — 10/10 unchanged (real PRAGMAs, blocking, real commit/rollback).

New test coverage (real disposable SQLite file, deterministic `Deferred` gates, no sleeps):

- external `querySync` (including a writing `RETURNING` statement), `execSync`, `transactionSync`,
  `closeSync` each throw a typed `SqliteServiceError` with the exact operation tag while a real async
  transaction is suspended after its INSERT;
- the connection is untouched: the owner's post-gate count stays 1, `closeSync` leaves `isOpen()` true,
  and only the owner's two rows commit;
- the owner's `tx.querySync`/`tx.execSync` stay usable across the suspension;
- after commit every facade operation works (`querySync`, `execSync`, `transactionSync`, async
  `exec`/`query`) and async/sync close stay idempotent; `busy_timeout` is still 5000;
- interruption rolls the transaction back and clears ownership before the next sync operation (the
  RED failure above is now green);
- a failed transaction keeps the exact primary `Error` identity, rolls back, clears ownership, and the
  next operation succeeds.

## Actual commands (cwd = `role-model-router/packages/sql-sqlite-node`, `TMP=TEMP=E:\rm-tmp`)

```powershell
# RED (before production edits)
node ../../../node_modules/vitest/vitest.mjs run test/s268-mixed-owner.test.ts

# GREEN (new + unchanged legacy service + s18a)
node ../../../node_modules/vitest/vitest.mjs run test/s268-mixed-owner.test.ts test/sqlite-service.test.ts test/s18a-sql-truth.test.ts

# package build + declarations
node build.mjs
node ../../../node_modules/typescript/bin/tsc -p tsconfig.service.json

# changed-file hygiene
node ../../../node_modules/@biomejs/biome/bin/biome check test/s268-mixed-owner.test.ts src/service.ts
```

Logs: `evidence/logs/s268-red.log`, `s268-green.log`, `s268-build.log`, `s268-biome.log`.

Build/declarations: `node build.mjs` -> `{"status":"PASS","package":"@effect/sql-sqlite-node",...}`;
`tsc -p tsconfig.service.json` -> exit 0, no diagnostics. The known vendored
`vendor/effect/packages/sql/sqlite-node/tsconfig.json` base-config warning (baseline limitation recorded in
`00-worktree.md`) is unchanged and is not a product failure. Declarations/dist are ignored build output, not
tracked product changes.

Hygiene: `biome check` clean on both changed files. The `anti_slop_lint` tool is **unavailable in this
harness** (as recorded by S260), so it was not run and no shell-equivalent PASS is claimed; **Lead must run
the actual anti_slop_lint tool**.

## Tested limits / not claimed

- No CLI, host, packaged SEA, browser, provider, operator-port/state, or private-repo verification; temp
  files only under `E:\rm-tmp`, synthetic fixtures only.
- Async observation/graph hydration, maintenance drain/fence, backup/reset/restore owner fences, and the
  `sqlite-memory`/host caller conversions are not part of this slice (B-SQL follow-ons serialized with B6
  by the effective plan).
- No schema, PRAGMA, retry-policy, or sync-only legacy behavior change; no existing test edits/weakening.
- Full suite and packaged R-D-C remain open; this evidence supports only the bounded R23/R24 mixed-owner
  refusal/recovery slice.
- Worker route record: `evidence/router/s268-sql-owner.jsonl` (launched session). Durable worker
  configuration/session/output verification remains Lead-owned per the task's A0 rules.

## S273 addendum — current cleanup-repair receipt (supersedes the test-byte claims above)

The S268 test bytes changed again in S273. This report and `s268-green.log` describe hash `87DBB1F0…`; the
current test hash is `1BB6116F…`. Use `evidence/other/s273-sql-cleanup-repair.md` and
`evidence/logs/s273-green.log` as the current receipt. Fresh run: 4 files, **39/39 tests passed** (S273 11,
S268 7, legacy service 11, s18a 10), exit 0. `src/service.ts` is unchanged at the S270-pinned
`485AC00E…` hash; no service or URL product edit was made by S273. Previous S268 GREEN/report line citations
are historical, not current.

S273 closes S270 Finding 2's test-side teardown/error-masking concern: inspect primary survives release+commit
failures while both cleanup steps are attempted; ready failure still releases and joins; falsey primaries are
preserved; failed setup closes the acquired database; teardown reports errors separately without masking an
existing assertion and does not suppress a sole cleanup failure. S270 Findings 4/5 and full R23/R24 remain
open. `anti_slop_lint` was unavailable in this harness; Lead must run it. Biome and targeted strict tsc on
the changed test files were clean.

