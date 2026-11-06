# S27 packaged runtime: built, paired and booted (public)

Owner direction in round 40: "commit as needed to fix the packaging blocker". This records what was committed, what the packaging gate was, and what the packaged artifact actually proves.

## Commits

- public `f0cb76c7` tree `9febf859299177608ef8c8e6dedd5f79260d7486` (branch `recursive/115-effect-foldkit-runtime-migration`, not pushed)
- private `c70889b2` tree `503fdb46a5a4f2fec60291f1abe33706755260b8`

## Private paired distribution

`node scripts/track-b/build-runtime-distribution.mjs` with `ROLE_MODEL_PUBLIC_WORKTREE` set to the public worktree: exit 0, 13 extensions, sidecar sha256 `eab56d1d5144e9667da6d4e65e3b965ebf18f79177f3b54550fcefef4de2a445`, wrappers built against Effect 4.0.6.

Manifest pairing (read back from `dist/run00-dev/track-b-runtime-manifest.json`):

- `publicCommit` f0cb76c7, `publicSourceTree` 9febf859 (matches the public HEAD tree)
- `privateCommit` c70889b2, `privateSourceTree` 503fdb46
- `manifestSha256` 0c21879998355acac90803c3323810fbe55d3742aa689e4e49c1344edad4aeef

## Public package

`pnpm run runtime:validate-packaging` with `ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT` pointing at the private distribution produced `dist/release/win32-x64`:

- `role-model-dev.exe` 104,824,832 bytes, sha256 `657902c3bb0852aa65c1ef5a10413a354c23f0179e66cd83af00a49699904d8b`
- `manifest.json` records `source_tree` 9febf859, `commit` f0cb76c7, `version` 0.0.17-10-gf0cb76c7, 13 extensions, `track_b_runtime.manifest_sha256` 0c2187..., and an artifact closure including the runtime UI tree

The dirty-worktree gate that blocked packaging in earlier rounds is gone: both worktrees are committed and clean.

## The validation step fails, for a pre-existing reason

`validate-packaging` starts the packaged executable with `--scope-id runtime-sea-validation`, and the packaged runtime aborts startup with:

```
runtime backend initialization failed Error: reader runtime channel context scope mismatch
    at assertRuntimeChannelContext
    at negotiateRuntimeChannelStartup
    at negotiatePackagedTrackBStartup
```

**The released v0.0.20 package fails identically.** Running `D:/role-model-router/0.0.20/role-model.exe` with the same argument list produced the same error from the same call chain. Neither `src/validate-packaging.ts` nor `src/runtime-channel.ts` differs from `origin/dev` in this run, so this is a pre-existing packaging-validation/harness defect, not a regression from the migration: the harness passes a scope override that the packaged channel context (built from the distribution) rejects.

## What the packaged artifact does prove

Started directly with its own packaged scope on an ephemeral loopback port and a temp state root (never 3456/3457/3458):

- `/healthz` -> 200 `status: "healthy"`, version 0.0.17-10-gf0cb76c7, commit f0cb76c7, source_tree 9febf859
- session bootstrap stages all ready or skipped with reasons, from the DAG Bootstrap owner
- `/` -> 200, 4945 bytes, 16 asset references: the new client ships in the package
- `/api/role-model/operator/diagnostics` -> 200 with the real `role-model.local-diagnostics-read.v1` body, `state: "disabled"` (no writer enabled outside R20)
- sidecar logs show the replay and evaluation queue planes and the durable task advisory, so the private extensions run inside the package

## Honest limits

- The packaged artifact was NOT produced by the failing validator path; it was produced by the packaging step and then started directly. The validator incompatibility is documented above with its release reproduction.
- Packaged real-client R/D/C parity (R15/R16) is still not run: no real provider inference, no release-vs-dev-vs-candidate comparison.
- Nothing was pushed; the commits are local to the run branch.

## Baseline correction (owner direction, round 42)

- `origin/dev` trailed `origin/main` by 35 commits with none of its own, so a dev-based candidate described itself as `0.0.17-10-…`.
- The run branch now CONTAINS `v0.0.20`: public merge `9fb59b67` (parents `5c8e69df` + `945a8906`), private merge `db504b89` (parents `c70889b2` + `266ccf76`).
- Rebuilt candidate: development channel, `0.0.20-7-gfd2a5f55`, commit `fd2a5f55`, source tree `d4095825`, executable sha256 `468bdc50…`, 13 extensions, packaging validation exit 0 (healthy, 8 models, 28 roles, packaged chat and responses replies).
- Baselines built from `origin/main` for like-channel comparison: D-prod (production, `0.0.20`, sha `20e7e894…`, source tree `d29e2a3c`) and D-dev (development, same commit/source tree).
- Remediation prepared but NOT pushed: a `chore/sync-dev-with-main-020` branch in a scratch worktree merges `origin/main` into `origin/dev` with ZERO conflicts, so dev can be brought forward by a reviewed pull request rather than a direct push.

