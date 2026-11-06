# S6b migrate the first host caller onto the SQLite service (public, R23)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The Effect SQLite service exists, is typechecked and is reachable through the built `./service` subpath. R23's remaining work is caller migration. This slice migrates ONE coherent cluster and states the rest.

## Read first
1. `00-requirements.md` R23 (lines 214-220).
2. `role-model-router/packages/sql-sqlite-node/src/service.ts` for the API and its contracts (make/makeSync, query/exec, transaction/transactionSync, busy schedule, Semaphore serialization).
3. The direct `node:sqlite` sites S6a listed: `apps/runtime-host-bridge/src/cli.ts` (around 7, 190-192, 286-288, 466-468, 11553-11556) and `scriptsn`-adjacent files - verify the actual current lines rather than trusting these numbers.

## Required work
1. Pick the `cli.ts` cluster and migrate it onto the service: same statements, same PRAGMAs, same error surfaces, same sync semantics where the call site is synchronous. Where a call site must stay synchronous, use the service's sync facade rather than a second connection.
2. Prove behaviour is unchanged: for each migrated call site, a test that exercises the behaviour through the new path (a temp state root, short-lived, cleaned) and would fail if the migration changed a result, an error, or a transaction boundary.
3. Do not migrate everything: list the remaining direct `node:sqlite` sites with file:line and a one-line reason each (sync-only, hot path, needs design), so the next slice is mechanical.
4. If a call site cannot migrate without changing a public contract, stop and report it rather than changing the contract.

## Files you may write
- `role-model-router/apps/runtime-host-bridge/src/cli.ts` (migrated call sites only)
- tests under the host-bridge test directory
- `evidence/logs/s6b-*` and `evidence/other/s6b-tdd.json`

No other product files. No installs, no commits, no subagents, no servers or operator ports; temp roots on E:.

## Strict TDD
RED per migrated behaviour before the migration. Report: the migrated sites, the remaining-site table, RED/GREEN, counts, typecheck, and any contract risk you hit.