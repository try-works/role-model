# R14 packaged selfcheck surface + 0diff (shared-source repair)

Status: GREEN. One shared contract now owns the specimen, checksum, DOM parser and evaluator. Both
clients import it; the packaged runner imports/re-exports the same evaluation. A fresh package built at
`e07b60c3` produced 0DIFF across two identical runs.

## Single source of truth
- `role-model-router/packages/ui-parity/src/selfcheck-surface-core.js` owns:
  `SELFCHECK_ENTRIES`, `SELFCHECK_MARKER`, `selfcheckMarker`, `parseSelfcheckSurfaceDom`,
  `evaluateSelfcheckSurfaceRuns`.
- React imports it in `apps/runtime-ui/app/routes/not-found.tsx`; Foldkit imports it in
  `apps/runtime-ui-next/src/view.ts`. Neither app defines a specimen list or FNV hash.
- `scripts/runtime/parity-selfcheck-surface.mjs` imports and re-exports the same parser/evaluator; it
  no longer has its own copy.
- `packages/ui-parity/test/selfcheck-surface-guard.test.ts` fails if either app or the runner
  reintroduces a hand-written specimen/hash/evaluator.

## Fresh packaged identity
- Public HEAD: `e07b60c3` (tree `066f04da3860a08ce8836b5d717a272a269d313a`).
- Package: `E:/role-model-run115/r14-release-e07b60c3/win32-x64/role-model-dev.exe`
  sha256 `1412aa7270d35e168a16fd5c4f2cefd8a5eafa5822d72849383e902db9336a9d`.
- Version: `0.0.20-722-ge07b60c3`.
- Private distribution rebuilt at the same public tree
  (`publicSourceTree=066f04da...`, `publicCommit=e07b60c3...`).

## Evidence
- RED shared-source guard: `.../logs/r14-selfcheck-shared-red.log` (guard failed: core module absent).
- GREEN shared-source: `.../logs/r14-selfcheck-shared-green.log` (guard + ui-parity + lane helpers +
  probe pass; no duplicate specimen).
- Fresh packaged 0diff: `.../logs/r14-selfcheck-surface-e07b60c3.log` / `.json`:
  head `e07b60c3`, exe sha `1412aa72...`, React and Foldkit both marker `06b996f0`, six entries,
  two identical runs, `RESULT: PASSED`.
- Fresh candidate verify: `.../logs/r14-selfcheck-shared-verify.log`: version/sha match and all
  packaged checks PASS.
- Full Foldkit suite: 122 files / 1027 tests; node invariants 21/21; `S247` 4/4.
- `ui-parity`: 136/136 (including the new guard); lane helpers 9/9; typecheck 0 for ui-parity,
  runtime-ui-next and runtime-ui.

## Remaining
- None for this clause: one source of truth, no duplicated specimen/evaluator, fresh packaged 0diff at
  the reviewed HEAD+sha.
