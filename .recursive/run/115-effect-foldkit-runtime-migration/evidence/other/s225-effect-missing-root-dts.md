# S225 The `effect` package shipped without its root declaration - and now the app typechecks again

After installing workspace dependencies (S224 was blocked on an uninstalled tree), the app typecheck
that had been green turned red:

    src/commands.ts(2,46): error TS7016: Could not find a declaration file for module "effect".
    "…/packages/effect/dist/index.js" implicitly has an "any" type.

## Cause

`packages/effect/package.json` publishes:

    ".": { "types": "./dist/types/index.d.ts", "runtime": "./dist/index.js" }

and `dist/types/index.d.ts` **did not exist** - `dist/types` held 164 declarations but no root
`index.d.ts`. Rebuilding the package fixed it:

    node build.mjs  (packages/effect)  -> exit 0
    index.d.ts present: True
    tsc --noEmit (runtime-ui-next)     -> exit 0

The build script does emit the root declaration (build.mjs filters declaration entries so that
`index` is included); the `dist` on disk predated that emit. `dist/` is gitignored, so a fresh
checkout plus `pnpm build` regenerates it - **but nothing verifies that the published type entry
exists**, and CI has no typecheck step (S224).

## Why my earlier green was fragile, not wrong

Before the install, `effect` did not resolve at all in this worktree and tsc still exited 0 - the app
had no workspace link, so tsc skipped the module entirely instead of failing. That is worth stating
plainly: **a missing dependency can look like a passing typecheck** when the resolver silently drops
the import.

## Current state

| Check | Result |
|---|---|
| `packages/effect` build | exit 0, root declaration present |
| `runtime-ui-next` tsc | exit 0 |
| `pnpm run test` (tsc + vitest + invariants) | see below |
| git tree | clean (node_modules and dist are ignored) |

## The guard

`scripts/r39-workflow-flags.test.mjs` now asserts that every workspace package publishing a `types`
entry has that file on disk:

    ok  S225: every workspace package declared types entry resolves

Falsified by deleting `dist/types/index.d.ts`:

    pass 0 / fail 1

Restored -> 7/7 in that file.