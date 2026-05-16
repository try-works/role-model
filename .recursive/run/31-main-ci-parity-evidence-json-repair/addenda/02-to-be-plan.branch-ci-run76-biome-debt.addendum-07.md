Run: `/.recursive/run/31-main-ci-parity-evidence-json-repair/`
Phase: `02 TO-BE PLAN`
Status: `LOCKED`
LockedAt: `2026-05-11T22:19:18Z`
LockHash: `930234fbd62f18a29768e3d72086fa62f58d4637b3a5df55b1fa179ed79b96cb`
Addendum: `07`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/01.5-root-cause.branch-ci-run76-biome-debt.addendum-06.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/red/phase4-branch-ci-run76.red.log`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/red/phase4-branch-ci-run76-repro.red.log`
- User direction: continue with the fixes
Outputs:
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/02-to-be-plan.branch-ci-run76-biome-debt.addendum-07.md`
Scope note: This addendum expands run 31 from the run-75 remediation to the next masked runtime-host-bridge/runtime-ui Biome debt layer exposed by run `76`.

## TODO

- [x] Record the run-76 file scope from GitHub CI
- [x] Define the bounded formatter-plus-lint cleanup strategy
- [x] Keep validation explicit and evidence-backed
- [x] Complete Coverage Gate and Approval Gate

## Remediation Target

The next implementation pass must clear the run-76 blocker revealed after the run-75 remediation:

1. format the two runtime-host-bridge validator source files
2. format and organize imports in the eight runtime-host-bridge test files that Biome flagged
3. format the two runtime UI shell files
4. replace the test-only non-null assertions in `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
5. rerun focused Biome validation on the same bounded set
6. rerun branch GitHub CI

## Planned Changes by File

- `role-model-router/apps/runtime-host-bridge/src/validate-ui.ts`
- `role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
- `role-model-router/apps/runtime-host-bridge/test/executable.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/litellm-catalog.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/local-policy.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/runtime-assets.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/unified-runtime-config.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/validate-operations.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/validate-tools.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/validate-ui.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`
- `role-model-router/apps/runtime-ui/app/app.css`
- `role-model-router/apps/runtime-ui/app/components/app-shell.tsx`

## Implementation Steps

1. Preserve `phase4-branch-ci-run76.red.log` and `phase4-branch-ci-run76-repro.red.log` as the authoritative RED evidence for this slice.
2. Add a focused regression covering the exact run-76 file set.
3. Apply Biome-managed formatting and organize-import cleanup to the full run-76 file set.
4. Manually replace the `reader!` usage in `role-model-router/apps/runtime-host-bridge/test/index.test.ts` with an explicit guard so the test still fails loudly if a reader is absent while satisfying `lint/style/noNonNullAssertion`.
5. Re-run the focused local Biome check over the same 14-file set and capture GREEN evidence.
6. Push the updated branch and rerun GitHub Actions CI.

## Testing Strategy

- TDD Mode: `strict`
- RED plan:
  - preserve `phase4-branch-ci-run76.red.log`
  - preserve `phase4-branch-ci-run76-repro.red.log`
- GREEN plan:
  - run `corepack pnpm exec biome check role-model-router/apps/runtime-host-bridge/src/validate-ui.ts role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts role-model-router/apps/runtime-host-bridge/test/executable.test.ts role-model-router/apps/runtime-host-bridge/test/index.test.ts role-model-router/apps/runtime-host-bridge/test/litellm-catalog.test.ts role-model-router/apps/runtime-host-bridge/test/local-policy.test.ts role-model-router/apps/runtime-host-bridge/test/runtime-assets.test.ts role-model-router/apps/runtime-host-bridge/test/unified-runtime-config.test.ts role-model-router/apps/runtime-host-bridge/test/validate-operations.test.ts role-model-router/apps/runtime-host-bridge/test/validate-tools.test.ts role-model-router/apps/runtime-host-bridge/test/validate-ui.test.ts role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts role-model-router/apps/runtime-ui/app/app.css role-model-router/apps/runtime-ui/app/components/app-shell.tsx`
  - rerun branch CI
- Commands:
  - focused write: `corepack pnpm exec biome check --write --unsafe role-model-router/apps/runtime-host-bridge/src/validate-ui.ts role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts role-model-router/apps/runtime-host-bridge/test/executable.test.ts role-model-router/apps/runtime-host-bridge/test/index.test.ts role-model-router/apps/runtime-host-bridge/test/litellm-catalog.test.ts role-model-router/apps/runtime-host-bridge/test/local-policy.test.ts role-model-router/apps/runtime-host-bridge/test/runtime-assets.test.ts role-model-router/apps/runtime-host-bridge/test/unified-runtime-config.test.ts role-model-router/apps/runtime-host-bridge/test/validate-operations.test.ts role-model-router/apps/runtime-host-bridge/test/validate-tools.test.ts role-model-router/apps/runtime-host-bridge/test/validate-ui.test.ts role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts role-model-router/apps/runtime-ui/app/app.css role-model-router/apps/runtime-ui/app/components/app-shell.tsx`
  - focused green check: `corepack pnpm exec biome check role-model-router/apps/runtime-host-bridge/src/validate-ui.ts role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts role-model-router/apps/runtime-host-bridge/test/executable.test.ts role-model-router/apps/runtime-host-bridge/test/index.test.ts role-model-router/apps/runtime-host-bridge/test/litellm-catalog.test.ts role-model-router/apps/runtime-host-bridge/test/local-policy.test.ts role-model-router/apps/runtime-host-bridge/test/runtime-assets.test.ts role-model-router/apps/runtime-host-bridge/test/unified-runtime-config.test.ts role-model-router/apps/runtime-host-bridge/test/validate-operations.test.ts role-model-router/apps/runtime-host-bridge/test/validate-tools.test.ts role-model-router/apps/runtime-host-bridge/test/validate-ui.test.ts role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts role-model-router/apps/runtime-ui/app/app.css role-model-router/apps/runtime-ui/app/components/app-shell.tsx`
  - GitHub proof: rerun workflow `CI`

## Idempotence and Recovery

- Once the run-76 file set is clean, rerunning the focused check should be idempotent.
- The remediation must stay bounded to the 14 GitHub-reported files unless a later branch-CI run surfaces a new explicit blocker.
- If the write pass leaves `test/index.test.ts` red, repair only that guard pattern manually and rerun the bounded check before widening further.

## Effective-Input Rule For Later Phases

Until superseded by a later locked addendum, later phases for run 31 must treat this file as an authoritative effective input together with:

- `/.recursive/run/31-main-ci-parity-evidence-json-repair/02-to-be-plan.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/02-to-be-plan.branch-ci-run75-biome-debt.addendum-05.md`

This addendum adds the bounded run-76 runtime-host-bridge/runtime-ui Biome debt cleanup to the run.

## Traceability

- `R4` -> the widened parity path is captured in `## Remediation Target`, `## Implementation Steps`, and `## Testing Strategy`
- `R5` -> the cleanup remains RED-first and bounded to explicit CI evidence

## Coverage Gate

- [x] Newly exposed file scope recorded
- [x] RED and GREEN evidence paths defined
- [x] Cleanup remains bounded to the run-76 surface

Coverage: PASS

## Approval Gate

- [x] The widened cleanup plan is explicit and bounded
- [x] Later phases can implement without reopening scope questions
- [x] The manual test guard repair is explicit

Approval: PASS

## Audit Verdict

- Audit summary: the Phase 2 plan now includes the bounded run-76 remediation needed to move branch CI past the next runtime-host-bridge/runtime-ui Biome debt layer.
Audit: PASS
