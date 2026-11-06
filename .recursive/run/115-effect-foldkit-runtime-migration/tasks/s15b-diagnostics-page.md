# S15b Foldkit diagnostics page on the accepted route and read path (public, R21 UI half)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The route exists (`/diagnostics/:id`) and the authorized read endpoint exists (`src/local-diagnostics-read.ts`). Build the page that consumes it.

## Read first
1. `role-model-router/apps/runtime-host-bridge/src/local-diagnostics-read.ts` - the exact response shape, the disabled/stale/dropped/empty states and the caps.
2. `evidence/other/foldkit-0.169-api-notes.md` sections 1, 2 and 5.
3. The shell: `role-model-router/apps/runtime-ui-next/src/*` and its routing test.
4. The primitives in `role-model-router/packages/ui/src/foldkit-*.ts`.

## Required work
1. A diagnostics view inside the shell that renders the read endpoint's states distinctly: ok, empty, disabled, stale (showing the rule and age), dropped (showing loss counts), denied and transport error. Disabled must read as a state, never as an error.
2. Identity and build information are shown honestly; a missing or unknown build identity is labelled as missing rather than blank.
3. Keyboard and focus behaviour: every actionable control is reachable and focus is visible; the page works at a narrow viewport (a mobile layout, not a desktop layout shrunk).
4. The fetch is modelled the way this Foldkit version models async work (Command + Message), not with an ad-hoc effect inside the view; a test drives it with an injected reader so no server is started.
5. A test per state, plus one test that a denied response renders the denied state rather than an empty list.

## Files you may write
- `role-model-router/apps/runtime-ui-next/src/**` and its tests
- `evidence/logs/s15b-*` and `evidence/other/s15b-tdd.json`

Do not touch the host bridge, wrappers, packages/ui, root, lockfile, vendor, or the private repo.

## Strict TDD
One behavioural RED per state. A missing module is a setup RED and does not count.
Report: the async pattern you used and its citations, RED/GREEN per state, counts, typecheck exit, and what a DOM simulation cannot prove about this page.