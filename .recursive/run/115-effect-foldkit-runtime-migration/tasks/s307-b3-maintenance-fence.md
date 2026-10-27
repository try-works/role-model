# S307 — B3/R24 maintenance owner drain/fence (design recorded BEFORE implementation)

Task-20 (rev 2, in_progress, owner s5-health-wait). Model: deepseek-flash verified live. Scope: ONLY
`role-model-router/packages/sql-sqlite-node/**` + s307 evidence. No commit.

## Requirement (R23:220, R24:226-228)

> Drain/fence all owners for backup/reset/restore and preserve actual per-store PRAGMAs...
> DatabaseSync remains blocking; no scheduled runSync/Tx-memory substitute. Preserve per-store PRAGMA,
> measure lock/event loop, drain/fence reset/restore.

## Existing truth (read, not assumed)

- `service.ts` opens with `PRAGMA busy_timeout = 5000` (:169) then `config.setup?.(database)` (:170) — per-store
  PRAGMAs can be set by the caller's setup, so the maintenance fence snapshots the ACTUAL pragmas after open and
  re-applies them.
- Ownership is Effect Ref/Semaphore based: `activeTransaction` holds the owning fiber (:261,:294); the sync
  facade refuses while a different fiber's transaction owns the connection (:293-298). No maintenance surface
  exists today.
- DatabaseSync is blocking throughout; no runSync/schedule substitute will be added.

## Design

- `MaintenanceBusyError` (code MAINTENANCE_BUSY) and `MaintenanceDrainTimeoutError` (code
  MAINTENANCE_DRAIN_TIMEOUT) extend SqliteServiceError.
- `SqliteService.maintenance`: `pragmas()`, `backup(targetPath, options)`, `reset(options)`,
  `restore(options)`; options `drainTimeoutMs` (0/absent = immediate typed refusal; >0 = bounded drain) and
  `reapplyPragmas` (loss-hook for the naive path).
- Fence: refuse if another maintenance is active, if a sync owner is on the stack (`syncOwnerDepth > 0`), or if
  `activeTransaction` is set and `drainTimeoutMs` <= 0. Drain: poll the event loop every ~10ms up to the bound;
  never force-close an owner; timeout throws the typed error.
- Operations: backup = `VACUUM INTO`; reset = reset connection PRAGMAs to non-store defaults then `VACUUM`;
  restore = reset PRAGMAs then re-run `config.setup`. ALL paths re-apply the captured PRAGMA snapshot in
  `finally` (unless the loss hook is used).
- RED first: busy refusal, drain timeout, pragma loss after naive reset (reapplyPragmas:false), and a measured
  event-loop probe (10ms interval ticking during a bounded drain).
## Outcome (GREEN)

- Maintenance fence/drain implemented: MaintenanceBusyError (immediate refusal) + MaintenanceDrainTimeoutError
  (bounded 10ms-poll drain, typed timeout), never force-closing an owner; syncOwnerDepth added to the
  ownership fence and the s268 mixed-owner fence composes untouched.
- backup/reset/restore re-apply the store's actual PRAGMAs (captured after open + config.setup) in finally;
  the loss hook proves the naive path really loses them (busy_timeout 1 vs 5000).
- Probe: drain with 100ms bound while a transaction holds -> elapsed 106ms, 7 event-loop ticks (s307-lock-probe.json).
- RED 4/4 failed (weak stub) -> GREEN 5 files / 43 passed (existing 39 + new 4).
- Hashes: service.ts 96FE70E3…, test 772DA321…. Lint: service.ts same 5 pre-existing findings as HEAD (verified via
  git show HEAD copy); new test clean.
