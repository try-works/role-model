Run: `/.recursive/run/31-main-ci-parity-evidence-json-repair/`
Phase: `02 TO-BE PLAN`
Status: `LOCKED`
LockedAt: `2026-05-11T23:26:49Z`
LockHash: `33f04186a36a9959854800e1538c2d6cd5dced362c2e6026f167585fb811dbfa`
Addendum: `25`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/01.5-root-cause.branch-local-biome-repowide-parity.addendum-24.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/red/phase4-local-biome-after-runtime-package-format.red.log`
- User direction: continue fixing locally until ci passes
Outputs:
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/02-to-be-plan.branch-local-biome-repowide-parity.addendum-25.md`
Scope note: This addendum plans the repo-wide local Biome parity sweep.

## TODO

- [x] Define the repo-wide Biome parity regression
- [x] Define the repo-wide write and green proof steps
- [x] Include the full local lint rerun after Biome is green
- [x] Complete Coverage Gate and Approval Gate

## Remediation Target

The next implementation pass must clear repo-wide local Biome parity:

1. add a focused regression for repo-wide `corepack pnpm exec biome check .`
2. run that regression red first
3. apply repo-wide `corepack pnpm exec biome check --write --unsafe .`
4. rerun the repo-wide regression and repo-wide Biome check
5. run the full local lint command once Biome is green

## Implementation Steps

1. Preserve `phase4-local-biome-after-runtime-package-format.red.log` as the authoritative RED evidence for this widened scope.
2. Add `packages/schema-tools/test/recursive-biome-repo-wide.test.ts`.
3. Run the regression first and preserve its RED output.
4. Apply repo-wide Biome write.
5. Re-run the repo-wide regression and repo-wide Biome check and capture GREEN evidence.
6. Run `corepack pnpm run lint` to validate the same lint surface CI uses.

## Testing Strategy

- TDD Mode: `strict`
- RED plan:
  - preserve `phase4-local-biome-after-runtime-package-format.red.log`
  - add and run `packages/schema-tools/test/recursive-biome-repo-wide.test.ts`
- GREEN plan:
  - run `corepack pnpm exec vitest run test/recursive-biome-repo-wide.test.ts` from `packages/schema-tools`
  - run `corepack pnpm exec biome check .`
  - run `corepack pnpm run lint`
- Commands:
  - repo-wide write: `corepack pnpm exec biome check --write --unsafe .`
  - repo-wide green check: `corepack pnpm exec biome check .`
  - full lint: `corepack pnpm run lint`

## Idempotence and Recovery

- Once repo-wide Biome is clean, rerunning the repo-wide regression and Biome check should be idempotent.
- If repo-wide write leaves non-format or semantic lint errors, stop widening further and return to bounded targeted repair for the exact surfaced files.

## Effective-Input Rule For Later Phases

Until superseded by a later locked addendum, later phases for run 31 must treat this file as an authoritative effective input together with:

- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/01.5-root-cause.branch-local-biome-repowide-parity.addendum-24.md`

This addendum changes the active implementation scope to repo-wide local Biome parity.

## Traceability

- `R4` -> the local parity path is now explicitly repo-wide
- `R5` -> the widened scope stays RED-first and evidence-backed

## Coverage Gate

- [x] Repo-wide regression defined
- [x] Repo-wide write and green proof steps defined
- [x] Full local lint rerun included

Coverage: PASS

## Approval Gate

- [x] The widened cleanup plan is explicit and bounded by tool behavior
- [x] Later phases can implement without reopening scope questions
- [x] The fallback path for non-format issues is explicit

Approval: PASS

## Audit Verdict

- Audit summary: the Phase 2 plan now widens local parity clearing to a repo-wide Biome regression and write pass, followed by the full local lint script.
Audit: PASS
