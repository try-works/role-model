Run: `/.recursive/run/31-main-ci-parity-evidence-json-repair/`
Phase: `03 IMPLEMENTATION SUMMARY`
Status: `LOCKED`
LockedAt: `2026-05-11T23:00:54Z`
LockHash: `a377573c37c317eacbd9a1ec76d4a368db6a5d83e13a8f17e6192a4188c1f2ed`
Addendum: `13`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/02-to-be-plan.branch-ci-run79-biome-debt.addendum-13.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/red/phase3-recursive-biome-run79.red.log`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/red/phase4-branch-ci-run79.red.log`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/red/phase4-branch-ci-run79-repro.red.log`
Outputs:
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/03-implementation-summary.branch-ci-run79-biome-debt.addendum-13.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/green/phase3-recursive-biome-run79.write.log`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/green/phase3-recursive-biome-run79.green.log`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/green/phase4-biome-run79.green.log`
- `packages/schema-tools/test/recursive-biome-run79.test.ts`
Scope note: This addendum records the bounded run-79 Biome cleanup that cleared the next runtime-ui-plus-vendored-test parity blocker after the run-78 remediation.

## TODO

- [x] Add a focused failing regression for the run-79 file set
- [x] Preserve RED evidence for the focused failure
- [x] Apply the bounded formatter / organize-import / lint cleanup
- [x] Capture focused GREEN evidence after the cleanup
- [x] Record the final changed-file surface and rationale

## TDD Cycle

### RED

- Added `packages/schema-tools/test/recursive-biome-run79.test.ts`, a focused Vitest regression that shells out to `corepack pnpm exec biome check` over the exact 6-file run-79 set.
- Ran the regression before any implementation changes and preserved the failure in:
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/red/phase3-recursive-biome-run79.red.log`
- The RED failure matched the run-79 root-cause findings: the bounded file set still failed repository-configured Biome checks.

### GREEN

- Ran a bounded write pass:
  - `corepack pnpm exec biome check --write --unsafe <6-file-set>`
- Captured the cleanup evidence in:
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/green/phase3-recursive-biome-run79.write.log`
- The write pass cleared the formatting/import debt and auto-applied the safe import-type cleanup in `future-surface.tsx`, but left `control-runtime-config.tsx` red on `useExhaustiveDependencies`.
- Applied the minimal manual fixes in `control-runtime-config.tsx` and `histogram.test.ts`, then reran Biome write on those files to restore formatter alignment.
- Re-ran the focused regression and captured:
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/green/phase3-recursive-biome-run79.green.log`
- Re-ran the bounded file-set Biome check and captured:
  - `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/green/phase4-biome-run79.green.log`

## Implemented Changes

### Test

- Added `packages/schema-tools/test/recursive-biome-run79.test.ts`
  - locks the run-79 file set into a repeatable regression so later widening cannot silently reintroduce this exact parity layer

### Runtime-ui and vendored cleanup

- Formatted and/or organized imports in:
  - `role-model-router/apps/runtime-ui/app/components/future-surface.tsx`
  - `role-model-router/apps/runtime-ui/app/components/page-primitives.tsx`
  - `role-model-router/apps/runtime-ui/app/routes/control-routing-strategy.tsx`
  - `role-model-router/apps/runtime-ui/app/routes/control-runtime-config.tsx`
  - `role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`
  - `role-model-router/vendor/llama-swap/ui-svelte/src/lib/histogram.test.ts`

- Manually repaired the explicit lint hotspots in:
  - `role-model-router/apps/runtime-ui/app/routes/control-runtime-config.tsx`
    - inlined the initial `fetchRuntimeConfig()` load sequence into the mount-only `useEffect` so the route keeps the same one-time fetch behavior without an unstable external dependency
  - `role-model-router/vendor/llama-swap/ui-svelte/src/lib/histogram.test.ts`
    - introduced a `requireHistogramData()` helper so the test keeps strong non-null expectations without compile-only assertions or weaker optional chaining

## Result

- The focused run-79 regression now passes.
- The focused 6-file Biome check now passes with no further fixes needed.
- The run-79 masked runtime-ui-plus-vendored-test Biome layer is locally cleared and ready for the next branch-CI proof run.

## Traceability

- `R4` -> the new branch-CI parity blocker is addressed by the focused regression, bounded write pass, and the small manual fixes in `control-runtime-config.tsx` and `histogram.test.ts`
- `R5` -> the implementation remains limited to the explicit 6-file run-79 surface plus the new regression test

## Coverage Gate

- [x] RED failure preserved before implementation
- [x] GREEN evidence preserved after implementation
- [x] Changed file surface matches the Phase 2 plan
- [x] Manual lint repairs recorded with rationale

Coverage: PASS

## Approval Gate

- [x] The run-79 blocker is locally cleared
- [x] The implementation is evidence-backed
- [x] The run is ready to move back to Phase 4 branch-CI proof

Approval: PASS

## Audit Verdict

- Audit summary: the run-79 runtime-ui-plus-vendored-test Biome debt layer is now covered by a focused regression and a bounded cleanup that leaves the branch ready for the next CI parity rerun.
Audit: PASS
