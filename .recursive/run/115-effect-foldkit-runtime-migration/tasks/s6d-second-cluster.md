# S6d migrate the single-statement read-only and delete sites (public, R23)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
S6b migrated three cli.ts lookups and left a table of 21 sites with reasons. This slice takes the SECOND batch: sites that are single-statement and need no transaction design.

## Read first
1. `00-requirements.md` R23 and the S6b remaining-site table in `evidence/other/s6b-tdd.json`.
2. `role-model-router/packages/sql-sqlite-node/src/service.ts` for the sync facade.
3. The migrated helper in `cli.ts` (around line 183) as the pattern: one `makeSync` per lookup, read-only open, busy_timeout=0, close in finally.

## Required work
1. Migrate the listed read-only single-statement sites: `route-ladder-census:102`, `route-challenge-evidence:556/580`, `queue-runtime/admin:42`, `track-b-runtime:6235/6324/6434`, and the retention DELETE at `index.ts:21230` if it is a single statement (verify; if it is not, leave it and say so).
2. The DELETE is a write: it needs the write path, not the read-only open - state which service call you used and why it is safe as a single statement.
3. Do NOT take the transaction-owned sites (`index.ts:6974-7088`, the queue DDL, the outbox writers) in this slice - they need the transaction design.
4. Update the remaining-site table with what is left and why.

## Files you may write
- the named host source files (migrated sites only)
- tests under the host-bridge test directory
- `evidence/logs/s6d-*` and `evidence/other/s6d-tdd.json`

No other product files. No installs, no commits, no subagents, no operator ports; temp roots on E: or the repo override.

## Strict TDD
RED per migrated behaviour, including the DELETE (a row must actually be gone). Report: the migrated sites, the updated table, RED/GREEN, counts, typecheck.