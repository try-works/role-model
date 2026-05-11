Run: `/.recursive/run/31-main-ci-parity-evidence-json-repair/`
Phase: `02 TO-BE PLAN`
Status: `LOCKED`
LockedAt: `2026-05-11T22:12:32Z`
LockHash: `9803d846e755d638c8bec989dbc602ec6aae8538d369e52c040c05db2a6fe6b5`
Addendum: `05`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/01.5-root-cause.branch-ci-run75-biome-debt.addendum-04.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/red/phase4-branch-ci-run75.red.log`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/red/phase4-branch-ci-run75-repro.red.log`
- User direction: continue with the fixes
Outputs:
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/02-to-be-plan.branch-ci-run75-biome-debt.addendum-05.md`
Scope note: This addendum expands run 31 from the run-74 remediation to the next masked repo-owned Biome debt layer exposed by run `75`.

## TODO

- [x] Record the run-75 file scope from GitHub CI
- [x] Define the bounded formatter-plus-lint cleanup strategy
- [x] Keep validation explicit and evidence-backed
- [x] Complete Coverage Gate and Approval Gate

## Remediation Target

The next implementation pass must clear the run-75 blocker revealed after the run-74 remediation:

1. format the conformance test and schema-tools source files
2. format the three protocol JSON fixtures and `router-decision.schema.json`
3. format the gateway-smoke and runtime-host-bridge validation/tooling files
4. apply the minimal lint fixes in:
   - `role-model-router/apps/runtime-host-bridge/scripts/start-for-qa.ts`
   - `role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
   - `role-model-router/apps/runtime-host-bridge/src/validate-packaging.ts`
5. rerun focused Biome validation on the same bounded set
6. rerun branch GitHub CI

## Planned Changes by File

- `packages/conformance/src/router-fixture-conformance.test.ts`
- `packages/schema-tools/src/validate-schemas.ts`
- `protocol/fixtures/router-golden/cases/advisory-vs-hard-budget.json`
- `protocol/fixtures/router-golden/cases/latency-strategy-prefers-faster.json`
- `protocol/fixtures/router-golden/cases/measured-profile-partial-coverage.json`
- `protocol/schemas/router-decision.schema.json`
- `role-model-router/apps/runtime-host-bridge/scripts/start-for-qa.ts`
- `role-model-router/apps/gateway-smoke/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/src/litellm-catalog.ts`
- `role-model-router/apps/runtime-host-bridge/src/package-sea.ts`
- `role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `role-model-router/apps/runtime-host-bridge/src/validate-host.ts`
- `role-model-router/apps/runtime-host-bridge/src/validate-operations.ts`
- `role-model-router/apps/runtime-host-bridge/src/validate-packaging.ts`
- `role-model-router/apps/runtime-host-bridge/src/validate-tools.ts`

## Implementation Steps

1. Preserve `phase4-branch-ci-run75.red.log` and `phase4-branch-ci-run75-repro.red.log` as the authoritative RED evidence for this slice.
2. Apply Biome-managed formatting and organize-import cleanup to the full run-75 file set.
3. Allow the bounded write pass to take the safe / explicitly suggested fixes in:
   - `start-for-qa.ts` (`noUnusedTemplateLiteral`)
   - `unified-runtime-config.ts` (`useLiteralKeys`)
4. Repair `validate-packaging.ts` manually so stderr cleanup still runs but any stderr-based failure is raised outside the `finally` block, satisfying `noUnsafeFinally` without masking earlier control flow.
5. Re-run the focused local Biome check over the same 15-file set and capture GREEN evidence.
6. Push the updated branch and rerun GitHub Actions CI.

## Testing Strategy

- TDD Mode: `strict`
- RED plan:
  - preserve `phase4-branch-ci-run75.red.log`
  - preserve `phase4-branch-ci-run75-repro.red.log`
- GREEN plan:
  - run `corepack pnpm exec biome check packages/conformance/src/router-fixture-conformance.test.ts packages/schema-tools/src/validate-schemas.ts protocol/fixtures/router-golden/cases/advisory-vs-hard-budget.json protocol/fixtures/router-golden/cases/latency-strategy-prefers-faster.json protocol/fixtures/router-golden/cases/measured-profile-partial-coverage.json protocol/schemas/router-decision.schema.json role-model-router/apps/runtime-host-bridge/scripts/start-for-qa.ts role-model-router/apps/gateway-smoke/src/index.ts role-model-router/apps/runtime-host-bridge/src/litellm-catalog.ts role-model-router/apps/runtime-host-bridge/src/package-sea.ts role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts role-model-router/apps/runtime-host-bridge/src/validate-host.ts role-model-router/apps/runtime-host-bridge/src/validate-operations.ts role-model-router/apps/runtime-host-bridge/src/validate-packaging.ts role-model-router/apps/runtime-host-bridge/src/validate-tools.ts`
  - rerun branch CI
- Commands:
  - focused write: `corepack pnpm exec biome check --write --unsafe packages/conformance/src/router-fixture-conformance.test.ts packages/schema-tools/src/validate-schemas.ts protocol/fixtures/router-golden/cases/advisory-vs-hard-budget.json protocol/fixtures/router-golden/cases/latency-strategy-prefers-faster.json protocol/fixtures/router-golden/cases/measured-profile-partial-coverage.json protocol/schemas/router-decision.schema.json role-model-router/apps/runtime-host-bridge/scripts/start-for-qa.ts role-model-router/apps/gateway-smoke/src/index.ts role-model-router/apps/runtime-host-bridge/src/litellm-catalog.ts role-model-router/apps/runtime-host-bridge/src/package-sea.ts role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts role-model-router/apps/runtime-host-bridge/src/validate-host.ts role-model-router/apps/runtime-host-bridge/src/validate-operations.ts role-model-router/apps/runtime-host-bridge/src/validate-packaging.ts role-model-router/apps/runtime-host-bridge/src/validate-tools.ts`
  - focused green check: `corepack pnpm exec biome check packages/conformance/src/router-fixture-conformance.test.ts packages/schema-tools/src/validate-schemas.ts protocol/fixtures/router-golden/cases/advisory-vs-hard-budget.json protocol/fixtures/router-golden/cases/latency-strategy-prefers-faster.json protocol/fixtures/router-golden/cases/measured-profile-partial-coverage.json protocol/schemas/router-decision.schema.json role-model-router/apps/runtime-host-bridge/scripts/start-for-qa.ts role-model-router/apps/gateway-smoke/src/index.ts role-model-router/apps/runtime-host-bridge/src/litellm-catalog.ts role-model-router/apps/runtime-host-bridge/src/package-sea.ts role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts role-model-router/apps/runtime-host-bridge/src/validate-host.ts role-model-router/apps/runtime-host-bridge/src/validate-operations.ts role-model-router/apps/runtime-host-bridge/src/validate-packaging.ts role-model-router/apps/runtime-host-bridge/src/validate-tools.ts`
  - GitHub proof: rerun workflow `CI`

## Idempotence and Recovery

- Once the run-75 file set is clean, rerunning the focused check should be idempotent.
- The remediation must stay bounded to the 15 GitHub-reported files unless a later branch-CI run surfaces a new explicit blocker.
- If the focused write pass leaves `validate-packaging.ts` red, repair only that file manually and rerun the bounded check before widening further.

## Effective-Input Rule For Later Phases

Until superseded by a later locked addendum, later phases for run 31 must treat this file as an authoritative effective input together with:

- `/.recursive/run/31-main-ci-parity-evidence-json-repair/02-to-be-plan.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/02-to-be-plan.branch-ci-run74-biome-crash.addendum-04.md`

This addendum adds the bounded run-75 repo-owned Biome debt cleanup to the run.

## Traceability

- `R4` -> the widened parity path is captured in `## Remediation Target`, `## Implementation Steps`, and `## Testing Strategy`
- `R5` -> the cleanup remains RED-first and bounded to explicit CI evidence

## Coverage Gate

- [x] Newly exposed file scope recorded
- [x] RED and GREEN evidence paths defined
- [x] Cleanup remains bounded to the run-75 surface

Coverage: PASS

## Approval Gate

- [x] The widened cleanup plan is explicit and bounded
- [x] Later phases can implement without reopening scope questions
- [x] The manual lint-repair hotspot is explicit

Approval: PASS

## Audit Verdict

- Audit summary: the Phase 2 plan now includes the bounded run-75 remediation needed to move branch CI past the next repo-owned Biome debt layer.
Audit: PASS
