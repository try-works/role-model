Run: `/.recursive/run/31-main-ci-parity-evidence-json-repair/`
Phase: `02 TO-BE PLAN`
Status: `LOCKED`
LockedAt: `2026-05-11T23:18:01Z`
LockHash: `d130829b858d0b7ddb5b766c13315b121cf32116c27c37d5db4c7fff1061e545`
Addendum: `17`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/01.5-root-cause.branch-local-biome-config-format.addendum-16.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/red/phase4-local-biome-after-run80.red.log`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/red/phase4-local-biome-config-format-repro.red.log`
- User direction: continue fixing locally until ci passes
Outputs:
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/02-to-be-plan.branch-local-biome-config-format.addendum-17.md`
Scope note: This addendum plans the local config/JSON formatter batch exposed after the run-80 runtime-ui slice cleared.

## TODO

- [x] Record the config/JSON file scope from the repo-wide and focused local repro
- [x] Define the bounded formatter cleanup strategy
- [x] Keep validation explicit and evidence-backed
- [x] Complete Coverage Gate and Approval Gate

## Remediation Target

The next implementation pass must clear the local config/JSON formatter blocker:

1. format the bounded 20-file config/JSON set
2. rerun a focused regression and focused Biome check over the same 20 files
3. rerun repo-wide local Biome only after the bounded batch is green

## Planned Changes by File

- `apps/docs-site/package.json`
- `apps/docs-site/tsconfig.json`
- `package.json`
- `packages/conformance/package.json`
- `packages/conformance/tsconfig.json`
- `packages/packaging/package.json`
- `packages/packaging/tsconfig.json`
- `packages/protocol-types/package.json`
- `packages/protocol-types/tsconfig.json`
- `packages/schema-tools/package.json`
- `packages/schema-tools/tsconfig.json`
- `packages/store-contract/package.json`
- `packages/store-contract/tsconfig.json`
- `role-model-router/apps/bench-cli/package.json`
- `role-model-router/apps/bench-cli/tsconfig.json`
- `role-model-router/apps/gateway-smoke/tsconfig.json`
- `role-model-router/apps/router-devtools/tsconfig.json`
- `role-model-router/apps/runtime-host-bridge/tsconfig.json`
- `testdata/traces/sample-trace.json`
- `tsconfig.base.json`

## Implementation Steps

1. Preserve `phase4-local-biome-after-run80.red.log` and `phase4-local-biome-config-format-repro.red.log` as the authoritative RED evidence for this slice.
2. Add a focused regression covering the exact 20-file config/JSON set.
3. Run the regression first and preserve its RED output.
4. Apply Biome-managed formatting to the full 20-file set.
5. Re-run the focused regression and the bounded file-set Biome check and capture GREEN evidence.
6. Re-run repo-wide local Biome to expose the next remaining layer only after this bounded batch is green.

## Testing Strategy

- TDD Mode: `strict`
- RED plan:
  - preserve `phase4-local-biome-after-run80.red.log`
  - preserve `phase4-local-biome-config-format-repro.red.log`
  - add and run `packages/schema-tools/test/recursive-biome-local-config-format.test.ts`
- GREEN plan:
  - run `corepack pnpm exec vitest run test/recursive-biome-local-config-format.test.ts` from `packages/schema-tools`
  - run `corepack pnpm exec biome check apps/docs-site/package.json apps/docs-site/tsconfig.json package.json packages/conformance/package.json packages/conformance/tsconfig.json packages/packaging/package.json packages/packaging/tsconfig.json packages/protocol-types/package.json packages/protocol-types/tsconfig.json packages/schema-tools/package.json packages/schema-tools/tsconfig.json packages/store-contract/package.json packages/store-contract/tsconfig.json role-model-router/apps/bench-cli/package.json role-model-router/apps/bench-cli/tsconfig.json role-model-router/apps/gateway-smoke/tsconfig.json role-model-router/apps/router-devtools/tsconfig.json role-model-router/apps/runtime-host-bridge/tsconfig.json testdata/traces/sample-trace.json tsconfig.base.json`
  - rerun repo-wide local `corepack pnpm exec biome check .`
- Commands:
  - focused write: `corepack pnpm exec biome check --write --unsafe apps/docs-site/package.json apps/docs-site/tsconfig.json package.json packages/conformance/package.json packages/conformance/tsconfig.json packages/packaging/package.json packages/packaging/tsconfig.json packages/protocol-types/package.json packages/protocol-types/tsconfig.json packages/schema-tools/package.json packages/schema-tools/tsconfig.json packages/store-contract/package.json packages/store-contract/tsconfig.json role-model-router/apps/bench-cli/package.json role-model-router/apps/bench-cli/tsconfig.json role-model-router/apps/gateway-smoke/tsconfig.json role-model-router/apps/router-devtools/tsconfig.json role-model-router/apps/runtime-host-bridge/tsconfig.json testdata/traces/sample-trace.json tsconfig.base.json`
  - focused green check: `corepack pnpm exec biome check apps/docs-site/package.json apps/docs-site/tsconfig.json package.json packages/conformance/package.json packages/conformance/tsconfig.json packages/packaging/package.json packages/packaging/tsconfig.json packages/protocol-types/package.json packages/protocol-types/tsconfig.json packages/schema-tools/package.json packages/schema-tools/tsconfig.json packages/store-contract/package.json packages/store-contract/tsconfig.json role-model-router/apps/bench-cli/package.json role-model-router/apps/bench-cli/tsconfig.json role-model-router/apps/gateway-smoke/tsconfig.json role-model-router/apps/router-devtools/tsconfig.json role-model-router/apps/runtime-host-bridge/tsconfig.json testdata/traces/sample-trace.json tsconfig.base.json`

## Idempotence and Recovery

- Once the 20-file set is clean, rerunning the focused check should be idempotent.
- The remediation must stay bounded to the extracted 20-file set unless the next repo-wide local run surfaces an additional explicit blocker.
- Because the diagnostics are format-only, no manual logic fixes are planned for this batch.

## Effective-Input Rule For Later Phases

Until superseded by a later locked addendum, later phases for run 31 must treat this file as an authoritative effective input together with:

- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/01.5-root-cause.branch-local-biome-config-format.addendum-16.md`

This addendum adds the bounded local config/JSON formatter cleanup to the run.

## Traceability

- `R4` -> the widened local parity path is captured in `## Remediation Target`, `## Implementation Steps`, and `## Testing Strategy`
- `R5` -> the cleanup remains RED-first and bounded to explicit local evidence

## Coverage Gate

- [x] Newly exposed file scope recorded
- [x] RED and GREEN evidence paths defined
- [x] Cleanup remains bounded to the extracted 20-file surface

Coverage: PASS

## Approval Gate

- [x] The widened cleanup plan is explicit and bounded
- [x] Later phases can implement without reopening scope questions
- [x] No manual logic repair is required for this batch

Approval: PASS

## Audit Verdict

- Audit summary: the Phase 2 plan now includes the bounded local config/JSON formatter batch needed to move local parity past the next exposed layer.
Audit: PASS
