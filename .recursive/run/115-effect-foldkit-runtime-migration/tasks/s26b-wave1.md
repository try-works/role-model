# S26b wave 1: real shell entries with maintained states (public, R13)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The inventory marks 4 rows as `scaffolded`: app layout, index, not-found and app shell. R13 requires maintained success/empty/loading/error states on every ported entry. Make wave 1 real and update the inventory only where the test actually proves it.

## Read first
1. `evidence/other/s26a-route-inventory.json` - the 8 wave-1 entries and their categories.
2. `apps/runtime-ui-next/src/{app.ts,router.ts,mount.ts}` and the existing route tests.
3. The legacy layout/shell sources named in the inventory, for the behaviour to preserve (title, theme, navigation, focus and scroll handling).

## Required work
1. Make the four scaffolded entries real ports: layout with the persistent navigation the legacy shell has, an index that lands somewhere sensible rather than blank, and a not-found that is a real state.
2. For each, implement the maintained states that apply (success/empty/loading/error) - an index or not-found with no loading/error state is acceptable only if you state why it cannot have one.
3. Preserve the legacy shell facts the inventory recorded where they apply: document title, theme handling, focus restoration and scroll behaviour.
4. Update the inventory statuses to `wired` or `verified` ONLY where a named test proves it, and extend the drift test so a `verified` row's proof test must exist and pass by name.

## Files you may write
- `apps/runtime-ui-next/src/**`, its tests, and `evidence/other/s26a-route-inventory.json` statuses
- `evidence/logs/s26b-*` and `evidence/other/s26b-tdd.json`

NO legacy app changes beyond reading. No ECharts, no packaging, no private repo. No installs, no commits, no subagents.

## Strict TDD
One behavioural RED per state you claim. Report: the entries made real, the states per entry and any justified absence, the shell facts preserved, inventory status changes with their proving tests, counts and typecheck.