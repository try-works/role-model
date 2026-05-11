Run: `/.recursive/run/31-main-ci-parity-evidence-json-repair/`
Phase: `02 TO-BE PLAN`
Status: `LOCKED`
LockedAt: `2026-05-11T22:53:15Z`
LockHash: `f5657fbf12052d06603e4c9aa560123561d4e174ab3ebf02709d08da2ba9674b`
Addendum: `11`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/01.5-root-cause.branch-ci-run78-biome-debt.addendum-10.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/red/phase4-branch-ci-run78.red.log`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/red/phase4-branch-ci-run78-repro.red.log`
- User direction: fix the issues locally before pushing to GitHub
Outputs:
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/02-to-be-plan.branch-ci-run78-biome-debt.addendum-11.md`
Scope note: This addendum expands run 31 from the run-77 remediation to the next masked runtime-ui Biome debt layer exposed by run `78`.

## TODO

- [x] Record the run-78 file scope from GitHub CI and local repro
- [x] Define the bounded formatter-plus-lint cleanup strategy
- [x] Keep validation explicit and evidence-backed
- [x] Complete Coverage Gate and Approval Gate

## Remediation Target

The next implementation pass must clear the run-78 blocker revealed after the run-77 remediation:

1. format the runtime-ui library, test, route, and root files in the bounded 10-file set
2. organize imports in the files Biome flagged
3. repair `app/root.tsx` `useConst`
4. repair `app/routes/control-controller.tsx` `useExhaustiveDependencies`
5. rerun focused local Vitest and Biome validation on the same bounded set
6. push only after the bounded local surface is green, then rerun branch GitHub CI

## Planned Changes by File

- `role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
- `role-model-router/apps/runtime-ui/app/lib/design-system.ts`
- `role-model-router/apps/runtime-ui/app/lib/device-authorization.test.ts`
- `role-model-router/apps/runtime-ui/app/lib/device-authorization.ts`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`
- `role-model-router/apps/runtime-ui/app/root.tsx`
- `role-model-router/apps/runtime-ui/app/routes/control-controller.tsx`
- `role-model-router/apps/runtime-ui/app/routes/control-models.tsx`

## Implementation Steps

1. Preserve `phase4-branch-ci-run78.red.log` and `phase4-branch-ci-run78-repro.red.log` as the authoritative RED evidence for this slice.
2. Add a focused regression covering the exact run-78 file set.
3. Run the regression first and preserve its RED output.
4. Apply Biome-managed formatting and organize-import cleanup to the full run-78 file set.
5. Manually repair:
   - `app/root.tsx` by making only the mutable error detail binding use `let`
   - `app/routes/control-controller.tsx` by making the initial load effect dependency-safe without widening behavior
6. Re-run the focused regression and the bounded file-set Biome check and capture GREEN evidence.
7. Push the updated branch and rerun GitHub Actions CI.

## Testing Strategy

- TDD Mode: `strict`
- RED plan:
  - preserve `phase4-branch-ci-run78.red.log`
  - preserve `phase4-branch-ci-run78-repro.red.log`
  - add and run `packages/schema-tools/test/recursive-biome-run78.test.ts`
- GREEN plan:
  - run `corepack pnpm exec vitest run test/recursive-biome-run78.test.ts` from `packages/schema-tools`
  - run `corepack pnpm exec biome check role-model-router/apps/runtime-ui/app/lib/design-system.test.ts role-model-router/apps/runtime-ui/app/lib/design-system.ts role-model-router/apps/runtime-ui/app/lib/device-authorization.test.ts role-model-router/apps/runtime-ui/app/lib/device-authorization.ts role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts role-model-router/apps/runtime-ui/app/lib/runtime-api.ts role-model-router/apps/runtime-ui/app/lib/view-models.test.ts role-model-router/apps/runtime-ui/app/root.tsx role-model-router/apps/runtime-ui/app/routes/control-controller.tsx role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
  - rerun branch CI after the local bounded surface is green
- Commands:
  - focused write: `corepack pnpm exec biome check --write --unsafe role-model-router/apps/runtime-ui/app/lib/design-system.test.ts role-model-router/apps/runtime-ui/app/lib/design-system.ts role-model-router/apps/runtime-ui/app/lib/device-authorization.test.ts role-model-router/apps/runtime-ui/app/lib/device-authorization.ts role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts role-model-router/apps/runtime-ui/app/lib/runtime-api.ts role-model-router/apps/runtime-ui/app/lib/view-models.test.ts role-model-router/apps/runtime-ui/app/root.tsx role-model-router/apps/runtime-ui/app/routes/control-controller.tsx role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
  - focused green check: `corepack pnpm exec biome check role-model-router/apps/runtime-ui/app/lib/design-system.test.ts role-model-router/apps/runtime-ui/app/lib/design-system.ts role-model-router/apps/runtime-ui/app/lib/device-authorization.test.ts role-model-router/apps/runtime-ui/app/lib/device-authorization.ts role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts role-model-router/apps/runtime-ui/app/lib/runtime-api.ts role-model-router/apps/runtime-ui/app/lib/view-models.test.ts role-model-router/apps/runtime-ui/app/root.tsx role-model-router/apps/runtime-ui/app/routes/control-controller.tsx role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
  - GitHub proof: rerun workflow `CI`

## Idempotence and Recovery

- Once the run-78 file set is clean, rerunning the focused check should be idempotent.
- The remediation must stay bounded to the 10 GitHub-reported files unless a later branch-CI run surfaces a new explicit blocker.
- If the write pass leaves `app/root.tsx` or `app/routes/control-controller.tsx` red, repair only those hotspots manually and rerun the bounded checks before widening further.

## Effective-Input Rule For Later Phases

Until superseded by a later locked addendum, later phases for run 31 must treat this file as an authoritative effective input together with:

- `/.recursive/run/31-main-ci-parity-evidence-json-repair/02-to-be-plan.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/02-to-be-plan.branch-ci-run77-biome-debt.addendum-09.md`

This addendum adds the bounded run-78 runtime-ui Biome debt cleanup to the run.

## Traceability

- `R4` -> the widened parity path is captured in `## Remediation Target`, `## Implementation Steps`, and `## Testing Strategy`
- `R5` -> the cleanup remains RED-first and bounded to explicit CI evidence

## Coverage Gate

- [x] Newly exposed file scope recorded
- [x] RED and GREEN evidence paths defined
- [x] Cleanup remains bounded to the run-78 surface

Coverage: PASS

## Approval Gate

- [x] The widened cleanup plan is explicit and bounded
- [x] Later phases can implement without reopening scope questions
- [x] The manual lint repairs are explicit

Approval: PASS

## Audit Verdict

- Audit summary: the Phase 2 plan now includes the bounded run-78 remediation needed to move branch CI past the next runtime-ui Biome debt layer.
Audit: PASS
