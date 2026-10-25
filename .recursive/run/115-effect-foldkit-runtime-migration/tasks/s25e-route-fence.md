# S25e make route change a resync fence (public, R12)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The S25c review accepted the two defect fixes but found the fence is incomplete: a route change does not invalidate a pending resync. Fix both concrete inputs.

## Concrete input 1 - round-trip overwrite
Mount `/diagnostics/a`, emit revisions `1 -> 3` (resync pending). Navigate to `/b` and back to `/a` (ChangedUrl issues a fresh read showing `build-A-fresh`). Resolve the OLD resync with `build-A-stale`. Today the token still matches and the route id matches, so the stale payload overwrites and marks live. Fix: a route change must invalidate pending resyncs - bump `resyncToken` and settle the stale state on `ChangedUrl` (or equivalently require a token that navigation advances). Prove the round-trip leaves the fresh data and no stale banner.

## Concrete input 2 - failure attributed to the wrong route
`RefreshResyncFailed` carries no routeId, so an old failure can mark a route that never resynced as stale. Fix: carry the routeId (as success does) and require a current-route match before showing the stale message.

## Tests to add
1. The round-trip from input 1, with the OLD payload resolving last.
2. Input 2: a failure for route A resolving after navigating to B must not mark B stale.
3. Assert a fresh route read does not leave the page stale forever when no gap follows.

## Files you may write
- `role-model-router/apps/runtime-ui-next/src/**` and its tests
- `evidence/logs/s25e-*` and `evidence/other/s25e-tdd.json`

No legacy app changes beyond reading, no ECharts, no packaging, no private repo. No installs, no commits, no subagents.

## Strict TDD
RED for both inputs first - they are failing inputs today. Report: how navigation fences resyncs, how failures are attributed, per-mutation RED/GREEN, counts and typecheck.