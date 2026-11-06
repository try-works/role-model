# S26a route/component inventory for the waves (public, R13)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
R13 starts with an inventory: every read/control/write/heavy/learning/studio route and component, with modals/palette/media/device-auth, and maintained success/empty/loading/error states. Build the inventory as DATA first - no page rewrites in this slice.

## Read first
1. R13 in `00-requirements.md` (lines 132-137) and R11 (root routes) for the route vocabulary.
2. The legacy client's routes and pages under `apps/runtime-ui`, and the new shell's routes in `apps/runtime-ui-next`.

## Required work
1. Produce `evidence/other/s26a-route-inventory.json`: every legacy route/page/component you find, each with its category (read/control/write/heavy/learning/studio/modal/palette/media/device-auth), the source file, and its status in the new client (absent, scaffolded, wired, or verified with the test that proves it).
2. Add a machine-checkable drift test: every entry's source path must exist, categories must come from the fixed vocabulary, and a route added to the legacy app without an inventory row must fail the test (scan a defined directory and compare).
3. Order the inventory into waves by dependency - say which routes can be ported without new host endpoints and which need one. Do not start porting.

## Files you may write
- `evidence/other/s26a-route-inventory.json`, its drift test under `scripts/` or the package's test dir
- `evidence/logs/s26a-*` and `evidence/other/s26a-tdd.json`

NO page or product changes. No installs, no commits, no subagents.

## Rules
RED first for the drift test: add a fake route file, watch it fail, remove it. Report: the inventory counts by category and status, the wave ordering rationale, the drift RED, counts and typecheck.