# S16a packaged SEA build and start proof (public, R33/S16)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The objective requires actual packaged real-client parity, and nothing in this run has built or started a packaged artifact yet. This slice establishes the artifact; parity comparison is the next slice.

## Read first
1. `package.json` scripts `runtime:package-sea` and `runtime:validate-packaging`, and `role-model-router/apps/runtime-host-bridge/scripts` or `src/package-sea.ts` for what they actually do.
2. `.recursive/memory/skills/issues/sea-inject-host-join-and-seed-scope.md` - a known packaged-SEA incident in this repository. Do not repeat its failure mode; in particular do not claim a packaged behaviour from unit tests alone.
3. `00-requirements.md` R33 and R16 (packaging/release comparison).

## Required work
1. Build the packaged artifact from THIS tree using the repository's own command (`corepack pnpm run runtime:package-sea`, or the narrowest equivalent if the top-level script also builds unrelated apps - say which you ran). Record wall time, exit code and the produced artifact path(s) with size and sha256.
2. Prove the artifact STARTS: run it in an isolated state root under `E:` with its own port that is NOT 3456/3457/3458, wait for readiness with a bounded wait, and capture its version/build identity from its own output or endpoint. Stop it cleanly and prove the process exited.
3. Prove it reports identity honestly: the version/build strings the artifact reports must match the tree it was built from (package version and the build id used by the repo). If they do not, stop and report rather than papering over.
4. Record what the artifact does NOT prove: no real client request, no parity comparison, and any warning the build emitted.

## Files you may write
- `evidence/logs/s16a-*` and `evidence/other/s16a-tdd.json`
- no product code: if the build fails for a reason that requires a code change, report it with the exact error instead of fixing it here

Never touch operator state roots or the operator ports 3456/3457/3458. Use `E:/role-model-run115/sea-<something>` for any state directory and clean it up.

## Strict TDD
This is an integration slice: state plainly that there is no unit RED, and instead give a falsifiable start proof (the artifact must be observed serving its identity; a start failure must be captured as the failure). If you can produce a negative control (an artifact built from a deliberately wrong version reporting the wrong identity), do that and say so.
Report: the command, wall time, artifact size/hash, how you proved start and exit, the identity strings, and every gap.