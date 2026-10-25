# S3b Foldkit wrapper packages built from the vendored source (public, R6/R5)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
Requirements R6 and R5. Effect is pinned 4.0.6; vendor/foldkit is pinned foldkit@0.169.0 commit 7ee21426, digest 14a19d18.

## Read first
- .recursive/run/115-effect-foldkit-runtime-migration/evidence/other/effect-4.0.6-api-notes.md
- the existing Effect wrapper pattern: role-model-router/packages/effect/{package.json,entries.mjs,build.mjs}
- the vendored sources: vendor/foldkit/packages/foldkit/src and vendor/foldkit/packages/ui/src

## Why a wrapper is needed
The published Foldkit manifests point at ./dist/*, and dist is excluded from the vendoring payload. The workspace therefore cannot consume the drop as-is; it needs first-party packages that build from the vendored src and expose the published subpath map.

## Required work
1. Two new workspace packages: role-model-router/packages/foldkit (name @role-model-router/foldkit) and role-model-router/packages/foldkit-ui (name @role-model-router/foldkit-ui), each with package.json, tsconfig.json, entries.mjs and build.mjs following the Effect wrapper structure.
2. Entry generation must mirror the published exports map of each vendored package, derived from the vendored package.json rather than hand-typed, and must fail loudly if a mapped source file is missing.
3. effect stays a peer/workspace dependency and is never bundled. @effect/platform-browser is the browser platform package; do NOT pull @effect/platform-node or the vendored vite-plugin-foldkit.
4. A maintained test test/graph-closure.test.mjs (node:test) proving, on the built output: no Node builtin or @effect/platform-node import reaches either browser entry; imports of effect resolve to one shared specifier; every subpath in the vendored manifest has a wrapper export; and a deliberately missing source file makes entry generation fail.
5. Root wiring: add the two packages only if the repo enumerates workspaces; otherwise leave the root alone and say so.

## Files you may write
- the two new package directories under role-model-router/packages/
- pnpm-workspace.yaml or root package.json only if that file enumerates workspaces and needs the additions (state exactly what you changed and why)
- run evidence evidence/logs/s3b-* and evidence/other/s3b-tdd.json

Do not touch scripts/vendor-upstream.mjs, vendor/**, any existing package source, or the private repo.

## Strict TDD
Write the graph-closure test first. It will fail because the packages do not exist yet; that is a setup failure, so report exactly which RED you got and whether it is behavioural. If you can honestly produce a graph-level RED once the packages exist (for example a Node builtin leaking into a browser entry), capture that instead and say so.

## Rules
- No installs. If a dependency is missing, report it.
- No commits, no subagents, no providers.
- Build with the existing esbuild from the workspace, the same way the Effect wrapper does.
Report: entry counts per package, subpath coverage number, graph-closure evidence, build warnings, exact commands and exits, sha256 of new files, and anything unverified, especially any subpath you could not map.