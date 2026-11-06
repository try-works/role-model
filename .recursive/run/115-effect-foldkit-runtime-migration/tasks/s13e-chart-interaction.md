# S13e chart interaction and live range updates (public, R9)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The chart renders and models states, but R9 also requires tooltip/legend interaction, live range/filter switching with OBSOLETE WORK SUPPRESSED, and a stable variant across theme updates. Do this in pure SVG - no ECharts, no canvas.

## Read first
1. `00-requirements.md` R9 (lines 100-106).
2. `role-model-router/packages/ui/src/foldkit-chart.ts` and its Scene test.
3. The diagnostics page's Command pattern for how async work and stale responses are handled (`apps/runtime-ui-next/src/commands.ts`, `update.ts` route-id guard) - the same discipline applies to a range switch.

## Required work
1. TOOLTIP/LEGEND: a legend entry toggles series visibility through a Message, and a point/tooltip exposes its exact value and unit. The accessible alternative must follow the same visibility (a hidden series must not linger in the table).
2. RANGE SWITCH WITH OBSOLETE-WORK SUPPRESSION: switching range/domain dispatches a Command carrying a monotonic token; a response for an older token must NOT change the rendered chart. Prove it: resolve the old request AFTER the new one and assert the new one wins.
3. STABLE VARIANT ON THEME UPDATE: a theme change re-renders the same data without changing series identity or point count; prove the rendered structure is identical apart from the theme-dependent class.
4. MULTI-INSTANCE: two charts on one page must not collide (no ids used); assert both render and their interactive state is independent.

## Files you may write
- `role-model-router/packages/ui/src/foldkit-chart.ts` (or one sibling module) and its Scene test
- the client app files only if the range Command lives there
- `evidence/logs/s13e-*` and `evidence/other/s13e-tdd.json`

No ECharts or any dependency. No host, wrappers, root, lockfile, vendor, or private repo.

## Strict TDD
One behavioural RED per numbered item, including the stale-response case where the OLD response resolves last. Report: the interaction model, the token mechanism, the multi-instance proof, RED/GREEN, counts and typecheck.