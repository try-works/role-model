# S25b one owned refresh subscription with explicit gap resync (public, R12)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
S25a proved three absences: no page-global refresh owner (the shell and each route start independent subscriptions), no explicit gap marker/lastEventId/resync, and the new Foldkit client has no event source at all. Close them in the Foldkit client.

## Read first
1. S25a's characterization: `role-model-router/apps/runtime-ui/app/lib/s25a-refresh-ownership.test.ts` and `evidence/other/s25a-tdd.json`.
2. The legacy owner for the shape being mirrored: `runtime-api.ts` `startDeferredLiveRefresh` and `runtime-refresh-bus`.
3. `apps/runtime-ui-next/src/{app.ts,commands.ts,update.ts,index.ts}` and the diagnostics page for how Commands and Messages are wired.

## Required work
1. INJECTABLE SOURCE in the Foldkit client: a `RuntimeEventSourceFactory` option on the shell entry, defaulting to a real source, so tests inject a fake. No global.
2. ONE OWNER: the shell (not each route) starts exactly one refresh subscription and disposes it on stop. Starting the shell twice must not leak: prove exactly one active subscription and zero after stop, on the real entry.
3. GAP DETECTION + RESYNC: track the last applied revision; on a revision jump, dispatch a snapshot resync Command - including the hard case where the gap is followed by NO later event. Prove it: a jump 1 -> 3 with no further event must still resync, and the old revision must not be applied afterwards.
4. STALE VISIBILITY: while a resync is pending or has failed, the page must show stale rather than pretending freshness.

## Files you may write
- `role-model-router/apps/runtime-ui-next/src/**` and its tests
- `evidence/logs/s25b-*` and `evidence/other/s25b-tdd.json`

No legacy `apps/runtime-ui` changes beyond reading. No ECharts, no packaging, no private repo. No installs, no commits, no subagents.

## Strict TDD
RED per numbered item, including the no-later-event gap. Report: the factory seam, the ownership proof on the real entry, the resync proof, the stale state, RED/GREEN, counts and typecheck.