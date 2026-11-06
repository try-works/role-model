# S3c first-party browser platform wrapper (public, R5)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
Requirement R5 (closed browser graph). Effect and Foldkit are pinned; the two Foldkit wrappers exist and pass their graph-closure test.

## Why this slice exists
`@role-model-router/foldkit` declares `@effect/platform-browser` as a peer at 4.0.6, but the workspace has no such package. The vendored drop contains it at `vendor/effect/packages/platform/browser` (version 4.0.6), and the previous wrappers deliberately did not create it. Without it a browser consumer cannot resolve the peer.

## Read first
- `.recursive/run/115-effect-foldkit-runtime-migration/evidence/other/effect-4.0.6-api-notes.md`
- the existing Effect wrapper: `role-model-router/packages/effect/{package.json,entries.mjs,build.mjs}`
- the new Foldkit wrappers and their `test/graph-closure.test.mjs` for the scanner approach
- `vendor/effect/packages/platform/browser/{package.json,src}`

## Required work
1. One new workspace package `role-model-router/packages/effect-platform-browser`, name `@role-model-router/effect-platform-browser`, version 4.0.6, built from `vendor/effect/packages/platform/browser/src` with entry generation derived from the vendored exports map.
2. `effect` stays a peer/workspace dependency and is never bundled. The package must not import any Node builtin and must not pull `@effect/platform-node` or `@effect/platform-node-shared`.
3. Repoint `@role-model-router/foldkit`'s `@effect/platform-browser` peer to the new workspace package, and make its graph-closure test resolve that peer through the workspace rather than assuming an external install. Say exactly what you changed.
4. Extend the graph-closure test (or add a sibling test) so it proves the browser platform package is itself Node-free and that the foldkit peer resolves to it.
5. Do not add the package to any server-only dependency list.

## Files you may write
- the new package directory
- `role-model-router/packages/foldkit/package.json` (peer specifier only) and its graph-closure test
- run evidence `evidence/logs/s3c-*` and `evidence/other/s3c-tdd.json`

Do not touch `vendor/**`, `scripts/vendor-upstream.mjs`, other packages, the private repo, or any root/lockfile file - the controller owns lockfile wiring.

## Strict TDD
Write or extend the graph assertion so it fails before the package exists, capture that RED, then create the package and get it green. A setup failure is acceptable only if you say so and also show the first behavioural assertion.

## Rules
- No installs (the controller will add the lockfile importer). If a dependency is missing, report it.
- No commits, no subagents, no providers.
Report: entry count and subpath coverage, the peer specifier you changed, RED and GREEN messages, build output and warnings, sha256 of new files, and anything unverified.