Run: `/.recursive/run/31-main-ci-parity-evidence-json-repair/`
Phase: `03 IMPLEMENTATION SUMMARY`
Status: `LOCKED`
LockedAt: `2026-05-11T23:16:54Z`
LockHash: `4a3823b4e8bcb7af81740004aa6396a4bb255f8caaa6fbdd7e5366a8fdbd51dc`
Addendum: `15`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/02-to-be-plan.branch-ci-run80-biome-debt.addendum-15.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/red/phase3-recursive-biome-run80.red.log`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/red/phase4-branch-ci-run80.red.log`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/red/phase4-branch-ci-run80-repro.red.log`
Outputs:
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/03-implementation-summary.branch-ci-run80-biome-debt.addendum-15.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/green/phase3-recursive-biome-run80.write.log`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/green/phase3-recursive-biome-run80.green.log`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/green/phase4-biome-run80.green.log`
- `packages/schema-tools/test/recursive-biome-run80.test.ts`
Scope note: This addendum records the bounded run-80 Biome cleanup that cleared the next runtime-ui-routes-plus-vendored-helper parity blocker after the run-79 remediation.

## TODO

- [x] Add a focused failing regression for the run-80 file set
- [x] Preserve RED evidence for the focused failure
- [x] Apply the bounded formatter / organize-import / lint cleanup
- [x] Capture focused GREEN evidence after the cleanup
- [x] Record the final changed-file surface and rationale

## TDD Cycle

### RED

- Added `packages/schema-tools/test/recursive-biome-run80.test.ts`, a focused Vitest regression that shells out to `corepack pnpm exec biome check` over the exact 8-file run-80 set.
- Ran the regression before any implementation changes and preserved the failure in:
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/red/phase3-recursive-biome-run80.red.log`
- Preserved the matching focused file-set repro in:
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/red/phase4-branch-ci-run80-repro.red.log`
- The RED failure matched the run-80 root-cause findings: the bounded file set still failed repository-configured Biome checks.

### GREEN

- Ran a bounded write pass:
  - `corepack pnpm exec biome check --write --unsafe <8-file-set>`
- Captured the cleanup evidence in:
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/green/phase3-recursive-biome-run80.write.log`
- The write pass cleared the format and import debt across the full run-80 slice and auto-fixed the explicit `integrations-upstream.tsx` lint findings, but left `local-logs.tsx` and `local-peers.tsx` red on button-type, stable-key, and label-association issues.
- Applied the minimal manual fixes in `local-logs.tsx` and `local-peers.tsx`, then reran Biome write on those two files to restore formatter alignment.
- Re-ran the focused regression and captured:
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/green/phase3-recursive-biome-run80.green.log`
- Re-ran the bounded file-set Biome check and captured:
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/green/phase4-biome-run80.green.log`

## Implemented Changes

### Test

- Added `packages/schema-tools/test/recursive-biome-run80.test.ts`
  - locks the run-80 file set into a repeatable regression so later parity widening cannot silently reintroduce this exact blocker layer

### Runtime-ui and vendored cleanup

- Formatted and/or organized imports in:
  - `role-model-router/apps/runtime-ui/app/routes/endpoints.tsx`
  - `role-model-router/apps/runtime-ui/app/routes/integrations-downstream.tsx`
  - `role-model-router/apps/runtime-ui/app/routes/integrations-upstream.tsx`
  - `role-model-router/apps/runtime-ui/app/routes/local-logs.tsx`
  - `role-model-router/apps/runtime-ui/app/routes/local-matrix.tsx`
  - `role-model-router/apps/runtime-ui/app/routes/local-peers.tsx`
  - `role-model-router/vendor/llama-swap/ui-svelte/src/lib/audioApi.ts`
  - `role-model-router/vendor/llama-swap/ui-svelte/src/lib/chatApi.ts`

- Manually repaired the remaining explicit lint hotspots in:
  - `role-model-router/apps/runtime-ui/app/routes/local-logs.tsx`
    - added `type="button"` to the refresh action and replaced index-based log keys with content-plus-occurrence keys derived from the current log stream
  - `role-model-router/apps/runtime-ui/app/routes/local-peers.tsx`
    - added explicit `type="button"` to every route action button and connected the two labels to their inputs with `htmlFor` / `id`

## Result

- The focused run-80 regression now passes.
- The focused 8-file Biome check now passes with no further fixes needed.
- The run-80 masked runtime-ui-routes-plus-vendored-helper Biome layer is locally cleared and ready for the next branch-CI proof run.

## Traceability

- `R4` -> the new branch-CI parity blocker is addressed by the focused regression, bounded write pass, and the small manual fixes in `local-logs.tsx` and `local-peers.tsx`
- `R5` -> the implementation remains limited to the explicit 8-file run-80 surface plus the new regression test

## Coverage Gate

- [x] RED failure preserved before implementation
- [x] GREEN evidence preserved after implementation
- [x] Changed file surface matches the Phase 2 plan
- [x] Manual lint repairs recorded with rationale

Coverage: PASS

## Approval Gate

- [x] The run-80 blocker is locally cleared
- [x] The implementation is evidence-backed
- [x] The run is ready to move back to Phase 4 branch-CI proof

Approval: PASS

## Audit Verdict

- Audit summary: the run-80 runtime-ui-routes-plus-vendored-helper Biome debt layer is now covered by a focused regression and a bounded cleanup that leaves the branch ready for the next CI parity rerun.
Audit: PASS
