Run: `/.recursive/run/31-main-ci-parity-evidence-json-repair/`
Phase: `02 TO-BE PLAN`
Status: `LOCKED`
LockedAt: `2026-05-11T22:58:57Z`
LockHash: `cc786e56948d98eb22f96e87ff6260b5855a5b40a9c1d6f943184a2ceb0a0b91`
Addendum: `13`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/01.5-root-cause.branch-ci-run79-biome-debt.addendum-12.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/red/phase4-branch-ci-run79.red.log`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/red/phase4-branch-ci-run79-repro.red.log`
- User direction: fix the issues locally before pushing to GitHub
Outputs:
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/02-to-be-plan.branch-ci-run79-biome-debt.addendum-13.md`
Scope note: This addendum expands run 31 from the run-78 remediation to the next masked runtime-ui-plus-vendored-test Biome debt layer exposed by run `79`.

## TODO

- [x] Record the run-79 file scope from GitHub CI and local repro
- [x] Define the bounded formatter-plus-lint cleanup strategy
- [x] Keep validation explicit and evidence-backed
- [x] Complete Coverage Gate and Approval Gate

## Remediation Target

The next implementation pass must clear the run-79 blocker revealed after the run-78 remediation:

1. format the bounded 6-file runtime-ui-plus-vendor-test set
2. organize imports in the files Biome flagged
3. repair `future-surface.tsx` `useImportType`
4. repair `control-runtime-config.tsx` `useExhaustiveDependencies`
5. repair the repeated `histogram.test.ts` `noNonNullAssertion` sites without weakening the assertions
6. rerun focused local Vitest and Biome validation on the same bounded set
7. push only after the bounded local surface is green, then rerun branch GitHub CI

## Planned Changes by File

- `role-model-router/apps/runtime-ui/app/components/future-surface.tsx`
- `role-model-router/apps/runtime-ui/app/components/page-primitives.tsx`
- `role-model-router/apps/runtime-ui/app/routes/control-routing-strategy.tsx`
- `role-model-router/apps/runtime-ui/app/routes/control-runtime-config.tsx`
- `role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`
- `role-model-router/vendor/llama-swap/ui-svelte/src/lib/histogram.test.ts`

## Implementation Steps

1. Preserve `phase4-branch-ci-run79.red.log` and `phase4-branch-ci-run79-repro.red.log` as the authoritative RED evidence for this slice.
2. Add a focused regression covering the exact run-79 file set.
3. Run the regression first and preserve its RED output.
4. Apply Biome-managed formatting and organize-import cleanup to the full run-79 file set.
5. Manually repair:
   - `app/routes/control-runtime-config.tsx` by making the initial load effect dependency-safe without widening behavior
   - `vendor/llama-swap/ui-svelte/src/lib/histogram.test.ts` by reusing a guarded non-null local per test case instead of compile-only assertions
6. Re-run the focused regression and the bounded file-set Biome check and capture GREEN evidence.
7. Push the updated branch and rerun GitHub Actions CI.

## Testing Strategy

- TDD Mode: `strict`
- RED plan:
  - preserve `phase4-branch-ci-run79.red.log`
  - preserve `phase4-branch-ci-run79-repro.red.log`
  - add and run `packages/schema-tools/test/recursive-biome-run79.test.ts`
- GREEN plan:
  - run `corepack pnpm exec vitest run test/recursive-biome-run79.test.ts` from `packages/schema-tools`
  - run `corepack pnpm exec biome check role-model-router/apps/runtime-ui/app/components/future-surface.tsx role-model-router/apps/runtime-ui/app/components/page-primitives.tsx role-model-router/apps/runtime-ui/app/routes/control-routing-strategy.tsx role-model-router/apps/runtime-ui/app/routes/control-runtime-config.tsx role-model-router/apps/runtime-ui/app/routes/dashboard.tsx role-model-router/vendor/llama-swap/ui-svelte/src/lib/histogram.test.ts`
  - rerun branch CI after the local bounded surface is green
- Commands:
  - focused write: `corepack pnpm exec biome check --write --unsafe role-model-router/apps/runtime-ui/app/components/future-surface.tsx role-model-router/apps/runtime-ui/app/components/page-primitives.tsx role-model-router/apps/runtime-ui/app/routes/control-routing-strategy.tsx role-model-router/apps/runtime-ui/app/routes/control-runtime-config.tsx role-model-router/apps/runtime-ui/app/routes/dashboard.tsx role-model-router/vendor/llama-swap/ui-svelte/src/lib/histogram.test.ts`
  - focused green check: `corepack pnpm exec biome check role-model-router/apps/runtime-ui/app/components/future-surface.tsx role-model-router/apps/runtime-ui/app/components/page-primitives.tsx role-model-router/apps/runtime-ui/app/routes/control-routing-strategy.tsx role-model-router/apps/runtime-ui/app/routes/control-runtime-config.tsx role-model-router/apps/runtime-ui/app/routes/dashboard.tsx role-model-router/vendor/llama-swap/ui-svelte/src/lib/histogram.test.ts`
  - GitHub proof: rerun workflow `CI`

## Idempotence and Recovery

- Once the run-79 file set is clean, rerunning the focused check should be idempotent.
- The remediation must stay bounded to the 6 GitHub-reported files unless a later branch-CI run surfaces a new explicit blocker.
- If the write pass leaves `control-runtime-config.tsx` or `histogram.test.ts` red, repair only those hotspots manually and rerun the bounded checks before widening further.

## Effective-Input Rule For Later Phases

Until superseded by a later locked addendum, later phases for run 31 must treat this file as an authoritative effective input together with:

- `/.recursive/run/31-main-ci-parity-evidence-json-repair/02-to-be-plan.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/02-to-be-plan.branch-ci-run78-biome-debt.addendum-11.md`

This addendum adds the bounded run-79 runtime-ui-plus-vendored-test Biome debt cleanup to the run.

## Traceability

- `R4` -> the widened parity path is captured in `## Remediation Target`, `## Implementation Steps`, and `## Testing Strategy`
- `R5` -> the cleanup remains RED-first and bounded to explicit CI evidence

## Coverage Gate

- [x] Newly exposed file scope recorded
- [x] RED and GREEN evidence paths defined
- [x] Cleanup remains bounded to the run-79 surface

Coverage: PASS

## Approval Gate

- [x] The widened cleanup plan is explicit and bounded
- [x] Later phases can implement without reopening scope questions
- [x] The manual lint repairs are explicit

Approval: PASS

## Audit Verdict

- Audit summary: the Phase 2 plan now includes the bounded run-79 remediation needed to move branch CI past the next runtime-ui-plus-vendored-test Biome debt layer.
Audit: PASS
