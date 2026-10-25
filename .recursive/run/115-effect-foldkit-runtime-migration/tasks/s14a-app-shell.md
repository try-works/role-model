# S14a Foldkit app shell that actually runs (public, R11)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
Requirements R11 (shell/bootstrap) and the integration risk that the wrapper stack can host a real app.

## Read first
1. `evidence/other/foldkit-0.169-api-notes.md` - especially section 1 (app definition/run) and section 6 (tests). Cite it or the source lines you rely on.
2. `vendor/foldkit/packages/typing-game` for a real app laid out across files.
3. The accepted primitive `role-model-router/packages/ui/src/foldkit-button.ts`.

## Required work
1. A new minimal app package `role-model-router/apps/runtime-ui-next` with package.json, tsconfig.json and src. It must depend on the first-party wrappers (`@role-model-router/foldkit`, `@role-model-router/foldkit-ui`, `@role-model-router/effect-platform-browser`) and `effect`, all `workspace:*`.
2. The app defines a Model (a theme flag plus a click counter is enough), a tagged Message union, init, a pure update, and a view that mounts the RM3 button primitive inside a container. Follow the digest's app shape exactly - `BaseApplicationConfig`-style config, runtime-supplied builder that is never stored.
3. A test that mounts the app into a DOM container under happy-dom and asserts: the container renders a button with the RM3 classes, a click dispatches the Message and the counter updates in the rendered output, and unmount does not throw. Use the real runtime entry (`run`/`hydrate`/`embed` per the digest), not a hand-rolled update loop, unless the digest says that entry cannot be used in this environment - in which case say so precisely and use the closest honest API.
4. `tsc -p tsconfig.json --noEmit` must pass for the new package.

## Files you may write
- the new app package directory
- run evidence `evidence/logs/s14a-*` and `evidence/other/s14a-tdd.json`

Do not touch: root, lockfile, other packages, vendor, the private repo. If a new external dependency is needed, report it instead of adding it.

## Strict TDD
Write the mount test first and capture the RED (missing app entry). If you can also produce a behavioural RED (for example click not updating the rendered output), capture that and say which you got.

## Rules
- No installs by you; the controller wires the workspace links.
- No commits, no subagents, no providers, no servers.
Report: the app shape and which digest lines justify it, the mount API you used and why, RED/GREEN, test counts, typecheck exit, and anything the environment could not support.