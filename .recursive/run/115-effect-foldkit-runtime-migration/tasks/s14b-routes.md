# S14b routes and URL state in the Foldkit shell (public, R11/R21)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The shell mounts and disposes correctly. Add real routing so the diagnostics page and route families have somewhere to live.

## Read first
1. `evidence/other/foldkit-0.169-api-notes.md` section 4 (navigation/route/URL) - cite it or the source lines.
2. `vendor/foldkit/packages/foldkit/src/route/parser.ts`, `src/runtime/browserListeners.ts`, `src/navigation/index.ts`.
3. The existing app: `role-model-router/apps/runtime-ui-next/src/*`.

## Required work
1. A route union covering at least three routes (an index, a diagnostics route with a required path parameter, and a not-found route) defined the way the digest says this version defines route unions.
2. The app parses the current URL on start, renders the matching view, and reacts to navigation events through the runtime's routing configuration rather than a hand-rolled listener.
3. In-app navigation: a control that pushes a new URL, and a test proving the rendered view changes because the URL changed, not because local state changed.
4. An unknown URL renders the not-found view and does not throw.

## Files you may write
- `role-model-router/apps/runtime-ui-next/src/**` and its tests
- `evidence/logs/s14b-*` and `evidence/other/s14b-tdd.json`

Do not touch the wrappers, packages/ui, root, lockfile, vendor, or the private repo.

## Strict TDD
Write the routing tests first. Capture a behavioural RED if you can (for example the route renders the index while the URL says diagnostics), otherwise say honestly that the RED was a setup failure.
Report: the routing API you used and its citations, RED/GREEN, counts, the typecheck exit, and anything the environment cannot support (happy-dom history/location behaviour must be stated, not assumed).