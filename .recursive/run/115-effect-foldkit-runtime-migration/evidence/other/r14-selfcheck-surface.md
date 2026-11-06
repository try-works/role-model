# R14 packaged selfcheck surface + 0diff

Status: GREEN. Both packaged clients serve `/selfcheck` with the same ordered semantic specimen and a
deterministic checksum marker; two identical packaged runs produced **0DIFF** with React and Foldkit.

## Identity
- Public source commit at package time: `c0021a3f` (tree `e4bc17486f42a6afb316928c898411e5968e7c82`).
- Packaged executable: `E:/role-model-run115/r14-release-c0021a3f/win32-x64/role-model-dev.exe`
  sha256 `b47d51501179601cf5b79dddfd91fcaab8d6fc1edce1adb48deea38b822f04e1`.
- Requested package version: `0.0.20-709-gc0021a3f` (matches the manifest and the verify output).
- Private distribution: `D:/DEV/role-model-internal/.worktrees/115-effect-foldkit-runtime-migration/dist/run00-dev`,
  rebuilt at the same public tree (manifest `publicSourceTree=e4bc1748...`, `publicCommit=c0021a3f...`).
- Harness-only follow-up commits after package time: `c0021a3f` -> `6d71ffd3` -> `b3d5bcf4`;
  these touch only the selfcheck runner/lane scripts, not the packaged client bundles.

## Surface
- Route: `/selfcheck` (served by the React catch-all route and the Foldkit catch-all/NotFound view;
  no production route table or inventory row changed).
- Marker: `data-selfcheck-marker="06b996f0"` on both clients.
- Specimen entries (ordered, visible): heading / button / badge / input / chart / table.
- Checksum contract: FNV-1a 32-bit over the key-sorted specimen; unit-pinned in
  `role-model-router/packages/ui-parity/test/selfcheck-surface.test.ts`.

## Evidence
- RED: `.recursive/run/115-effect-foldkit-runtime-migration/evidence/logs/r14-selfcheck-surface-red.log`
  (both contract tests failed: module missing + surface module missing).
- GREEN unit/lane: `.../logs/r14-selfcheck-surface-green.log`, `.../logs/r14-selfcheck-surface-green-surface.log`.
- Packaged 0diff: `.../logs/r14-selfcheck-surface-packaged.log` (and `.json`):
  run1/run2 React and Foldkit markers both `06b996f0`, six entries each, `RESULT: PASSED`.
- Packaged verify: `.../logs/r14-selfcheck-packaged-verify.log`: PASS health/models/telemetry/controller/
  learning/replay/evaluation/UI CSS+bundle+theme/chat/UI shell; sha/version match.
- Full packaged lane: `.../logs/r14-packaged-parity-b3d5bcf4.log`: routing double run **11/11 identical PASS**,
  `SELFCHECK SURFACE: 0DIFF`, `RESULT: PASS` (Phase 2 comparison skipped with `--skip-compare`).
- Full Foldkit UI suite: 122 files / 1027 tests passed; `S247` 4/4; node invariants 21/21.
- `ui-parity` suite: 132/132; packaged-lane helpers 9/9; typecheck clean for ui-parity, runtime-ui-next,
  and runtime-ui.

## Remaining
- None for the R14 selfcheck-surface clause: both clients serve it, the marker is served and compared,
  and two packaged runs are identical 0DIFF.
- The cross-artifact preserved-0.0.20 comparison (Phase 2) was not re-run in this slice
  (`--skip-compare`); the existing lane comparison is unchanged and outside this slice.
