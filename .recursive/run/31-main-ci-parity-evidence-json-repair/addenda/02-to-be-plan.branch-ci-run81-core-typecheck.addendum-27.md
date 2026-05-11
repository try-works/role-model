Run: `/.recursive/run/31-main-ci-parity-evidence-json-repair/`
Phase: `02 TO-BE PLAN`
Status: `LOCKED`
LockedAt: `2026-05-11T23:35:52Z`
LockHash: `378185ed585a46ba38ed2d8857c054b160b2fe9b0e239749c1bb4f1064828366`
Addendum: `27`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/01.5-root-cause.branch-ci-run81-core-typecheck.addendum-26.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/red/phase4-branch-ci-run81.red.log`
- User direction: continue fixing locally until ci passes
Outputs:
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/02-to-be-plan.branch-ci-run81-core-typecheck.addendum-27.md`
Scope note: This addendum plans the bounded run-81 core typecheck fix.

## TODO

- [x] Record the isolated core build failure
- [x] Define the focused regression and minimal type fix
- [x] Define the local validation path before pushing
- [x] Complete Coverage Gate and Approval Gate

## Remediation Target

The next implementation pass must clear the run-81 core typecheck blocker:

1. add a focused regression for the `@role-model-router/core` build
2. run it red first
3. replace the invalid indexed-access return type with `ThroughputPenaltyStateRecord | undefined`
4. rerun the focused core build
5. rerun the relevant local repo-wide build/lint proofs before pushing again

## Implementation Steps

1. Preserve `phase4-branch-ci-run81.red.log` as the authoritative RED evidence for this slice.
2. Add `packages/schema-tools/test/recursive-core-run81-typecheck.test.ts`.
3. Run the regression first and preserve its RED output.
4. Update `role-model-router/packages/core/src/router.ts` to use the concrete `ThroughputPenaltyStateRecord | undefined` return type.
5. Re-run the focused regression and capture GREEN evidence.
6. Re-run `corepack pnpm run build` and `corepack pnpm run lint` at repo scope before pushing again.

## Testing Strategy

- TDD Mode: `strict`
- RED plan:
  - preserve `phase4-branch-ci-run81.red.log`
  - add and run `packages/schema-tools/test/recursive-core-run81-typecheck.test.ts`
- GREEN plan:
  - run `corepack pnpm exec vitest run test/recursive-core-run81-typecheck.test.ts` from `packages/schema-tools`
  - run `corepack pnpm run build` from repo root
  - run `corepack pnpm run lint` from repo root

## Idempotence and Recovery

- Once the type signature is corrected, rerunning the focused core build regression should be idempotent.
- If repo-wide build surfaces a new failure after this fix, stop widening and root-cause that exact next blocker separately.

## Effective-Input Rule For Later Phases

Until superseded by a later locked addendum, later phases for run 31 must treat this file as an authoritative effective input together with:

- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/01.5-root-cause.branch-ci-run81-core-typecheck.addendum-26.md`

This addendum adds the bounded run-81 core typecheck repair to the run.

## Traceability

- `R4` -> the CI path now depends on clearing the isolated `@role-model-router/core` typecheck failure
- `R5` -> the fix remains RED-first and isolated to the real compile site

## Coverage Gate

- [x] Isolated failure recorded
- [x] Focused regression defined
- [x] Local validation steps defined

Coverage: PASS

## Approval Gate

- [x] The cleanup plan is explicit and bounded
- [x] Later phases can implement without reopening scope questions
- [x] Full local validation after the fix is required

Approval: PASS

## Audit Verdict

- Audit summary: the Phase 2 plan now includes the bounded run-81 core typecheck fix needed to move CI past the next blocker.
Audit: PASS
