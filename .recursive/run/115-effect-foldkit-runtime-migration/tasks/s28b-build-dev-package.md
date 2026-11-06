# S28b build the dev baseline package (public+private) for R/D/C parity (R16)

Goal: produce a packaged artifact for the clean dev baseline (D) so R/D/C comparison can isolate R-to-D differences from our changes. R and C already exist; D does not.

## Inputs
- Public baseline worktree: `D:/DEV/role-model/.worktrees/baseline-effect-foldkit-20261024` (branch proposal/effect-foldkit-rebaseline-20261024, clean, equals origin/dev f0d50fab). It has NO dependencies installed.
- Private baseline worktree: `D:/DEV/role-model-internal/.worktrees/baseline-effect-foldkit-20261024` (same branch name, clean, equals origin/dev 16021cc5). Also no dependencies.
- The pairing rule: the private build records the public worktree's HEAD tree, so the PUBLIC baseline must be built/committed first and must stay clean while the private build runs.

## Steps (in this order)
1. In the PUBLIC baseline worktree: `pnpm install --frozen-lockfile` with TMP/TEMP on E:. Report the lockfile-integrity result; if it cannot install offline, stop and report exactly what is missing rather than switching to a different tree.
2. In the PRIVATE baseline worktree: same install.
3. Build the private paired distribution in the PRIVATE baseline with `ROLE_MODEL_PUBLIC_WORKTREE` pointing at the PUBLIC baseline; capture the manifest identity (publicCommit/publicSourceTree/privateCommit) and confirm it records f0d50fab's tree, not ours.
4. Build the public baseline package with `ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT` pointing at that private distribution, channel development, output to a DISTINCT directory (for example `D:/DEV/role-model/.worktrees/baseline-effect-foldkit-20261024/role-model-router/dist/release`). Do NOT overwrite the candidate artifact at `D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration/role-model-router/dist/release`.
5. Prove the D artifact boots: ephemeral loopback port, temp state root on E:, `/healthz` healthy, `/` served, `/api/role-model/operator/diagnostics` status recorded (expect 404 on D, since the endpoint is ours). Never bind 3456/3457/3458.
6. Extend `evidence/other/s28a-compare.mjs` (or add a sibling script) to run all THREE artifacts and regenerate the table with D included, so R-to-D-only differences become isolable.

## Rules
No commits, no pushes, no installs into the candidate worktrees (only the two baseline worktrees), no subagents. Temp files on E:. If a step cannot complete (network offline, lockfile mismatch), report it precisely and leave the trees as you found them.

Report: install results, the D manifest identity, the boot proof, the three-way table with classifications, and exactly what remains inconclusive.