# S25c apply the resync payload and keep failures sticky (public, R12)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The review found two real defects in S25b, not just weak tests. Fix the defects first.

## Defect A - the resync result is discarded
`RefreshResynced({token})` never applies the fetched snapshot. Failing input: initial read returns record A; emit 1 then 3; the resync reader returns record B; the page ends live **still showing A** while the stale banner is gone. Fix: a successful resync must apply its payload (or, if the payload cannot be applied on that route, keep the page stale until a real diagnostics read lands). Either way the page must never say live while showing pre-gap data.

## Defect B - a failed resync is hidden by the next contiguous revision
Emit 1, 3 with the snapshot rejecting -> stale; then emit 4 -> status becomes live although the gap was never resynced. Fix: failure is sticky until a resync actually succeeds; a contiguous revision must not clear it.

## Test gaps to close
1. OWNER: assert no second source appears AFTER mount and navigation - recheck the source count after a route change, not just once.
2. BANNER ABSENCE: assert the stale banner is NOT rendered when live (an unconditional-render mutation must fail), as well as present when stale.
3. RESYNC TOKEN RACE: two resyncs in flight, the OLD one resolving last must not win; removing the token fences in RefreshResynced/Failed must fail.
4. FAILED-THEN-CONTIGUOUS: the exact sequence from defect B.

## Files you may write
- `role-model-router/apps/runtime-ui-next/src/**` and its tests
- `evidence/logs/s25c-*` and `evidence/other/s25c-tdd.json`

No legacy app changes beyond reading. No ECharts, no packaging, no private repo. No installs, no commits, no subagents.

## Strict TDD
RED for both defects first (they are failing inputs today), then the four test gaps. Report: how the payload is applied, how stickiness works, per-mutation RED/GREEN, counts and typecheck.