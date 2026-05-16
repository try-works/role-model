Run: `/.recursive/run/31-main-ci-parity-evidence-json-repair/`
Phase: `02 TO-BE PLAN`
Status: `LOCKED`
LockedAt: `2026-05-11T23:20:14Z`
LockHash: `63f8509dcce3df4812571d7181a95355456e452f70825afc49f8f0ee56262b6c`
Addendum: `19`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/01.5-root-cause.branch-local-biome-router-config-format.addendum-18.md`
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/evidence/logs/red/phase4-local-biome-after-config-format.red.log`
- User direction: continue fixing locally until ci passes
Outputs:
- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/02-to-be-plan.branch-local-biome-router-config-format.addendum-19.md`
Scope note: This addendum plans the next role-model-router config/JSON formatter batch exposed after the preceding local config/JSON slice cleared.

## TODO

- [x] Record the role-model-router config/JSON file scope from the repo-wide local repro
- [x] Define the bounded formatter cleanup strategy
- [x] Keep validation explicit and evidence-backed
- [x] Complete Coverage Gate and Approval Gate

## Remediation Target

The next implementation pass must clear the role-model-router config/JSON formatter blocker:

1. format the bounded 20-file role-model-router/config/JSON set
2. rerun a focused regression and focused Biome check over the same 20 files
3. rerun repo-wide local Biome only after the bounded batch is green

## Planned Changes by File

- `role-model-router/apps/gateway-smoke/package.json`
- `role-model-router/apps/router-devtools/package.json`
- `role-model-router/apps/runtime-host-bridge/package.json`
- `role-model-router/apps/runtime-ui/package.json`
- `role-model-router/apps/runtime-ui/tsconfig.json`
- `role-model-router/packages/adapter-execution/tsconfig.json`
- `role-model-router/packages/bench-core/package.json`
- `role-model-router/packages/bench-core/tsconfig.json`
- `role-model-router/packages/bench-judge/package.json`
- `role-model-router/packages/bench-judge/tsconfig.json`
- `role-model-router/packages/catalog/package.json`
- `role-model-router/packages/catalog/tsconfig.json`
- `role-model-router/packages/context-envelope/package.json`
- `role-model-router/packages/context-envelope/tsconfig.json`
- `role-model-router/packages/core/package.json`
- `role-model-router/packages/core/tsconfig.json`
- `role-model-router/packages/endpoint-registry/package.json`
- `role-model-router/packages/endpoint-registry/tsconfig.json`
- `role-model-router/packages/openai-compat/package.json`
- `testdata/router-runtime/routing-role-task.json`

## Implementation Steps

1. Preserve `phase4-local-biome-after-config-format.red.log` as the authoritative RED evidence for this slice.
2. Add a focused regression covering the exact 20-file role-model-router/config/JSON set.
3. Run the regression first and preserve its RED output.
4. Apply Biome-managed formatting to the full 20-file set.
5. Re-run the focused regression and the bounded file-set Biome check and capture GREEN evidence.
6. Re-run repo-wide local Biome to expose the next remaining layer only after this bounded batch is green.

## Testing Strategy

- TDD Mode: `strict`
- RED plan:
  - preserve `phase4-local-biome-after-config-format.red.log`
  - add and run `packages/schema-tools/test/recursive-biome-local-router-config-format.test.ts`
- GREEN plan:
  - run `corepack pnpm exec vitest run test/recursive-biome-local-router-config-format.test.ts` from `packages/schema-tools`
  - run `corepack pnpm exec biome check role-model-router/apps/gateway-smoke/package.json role-model-router/apps/router-devtools/package.json role-model-router/apps/runtime-host-bridge/package.json role-model-router/apps/runtime-ui/package.json role-model-router/apps/runtime-ui/tsconfig.json role-model-router/packages/adapter-execution/tsconfig.json role-model-router/packages/bench-core/package.json role-model-router/packages/bench-core/tsconfig.json role-model-router/packages/bench-judge/package.json role-model-router/packages/bench-judge/tsconfig.json role-model-router/packages/catalog/package.json role-model-router/packages/catalog/tsconfig.json role-model-router/packages/context-envelope/package.json role-model-router/packages/context-envelope/tsconfig.json role-model-router/packages/core/package.json role-model-router/packages/core/tsconfig.json role-model-router/packages/endpoint-registry/package.json role-model-router/packages/endpoint-registry/tsconfig.json role-model-router/packages/openai-compat/package.json testdata/router-runtime/routing-role-task.json`
  - rerun repo-wide local `corepack pnpm exec biome check .`
- Commands:
  - focused write: `corepack pnpm exec biome check --write --unsafe role-model-router/apps/gateway-smoke/package.json role-model-router/apps/router-devtools/package.json role-model-router/apps/runtime-host-bridge/package.json role-model-router/apps/runtime-ui/package.json role-model-router/apps/runtime-ui/tsconfig.json role-model-router/packages/adapter-execution/tsconfig.json role-model-router/packages/bench-core/package.json role-model-router/packages/bench-core/tsconfig.json role-model-router/packages/bench-judge/package.json role-model-router/packages/bench-judge/tsconfig.json role-model-router/packages/catalog/package.json role-model-router/packages/catalog/tsconfig.json role-model-router/packages/context-envelope/package.json role-model-router/packages/context-envelope/tsconfig.json role-model-router/packages/core/package.json role-model-router/packages/core/tsconfig.json role-model-router/packages/endpoint-registry/package.json role-model-router/packages/endpoint-registry/tsconfig.json role-model-router/packages/openai-compat/package.json testdata/router-runtime/routing-role-task.json`
  - focused green check: `corepack pnpm exec biome check role-model-router/apps/gateway-smoke/package.json role-model-router/apps/router-devtools/package.json role-model-router/apps/runtime-host-bridge/package.json role-model-router/apps/runtime-ui/package.json role-model-router/apps/runtime-ui/tsconfig.json role-model-router/packages/adapter-execution/tsconfig.json role-model-router/packages/bench-core/package.json role-model-router/packages/bench-core/tsconfig.json role-model-router/packages/bench-judge/package.json role-model-router/packages/bench-judge/tsconfig.json role-model-router/packages/catalog/package.json role-model-router/packages/catalog/tsconfig.json role-model-router/packages/context-envelope/package.json role-model-router/packages/context-envelope/tsconfig.json role-model-router/packages/core/package.json role-model-router/packages/core/tsconfig.json role-model-router/packages/endpoint-registry/package.json role-model-router/packages/endpoint-registry/tsconfig.json role-model-router/packages/openai-compat/package.json testdata/router-runtime/routing-role-task.json`

## Idempotence and Recovery

- Once the 20-file set is clean, rerunning the focused check should be idempotent.
- The remediation must stay bounded to the extracted 20-file set unless the next repo-wide local run surfaces an additional explicit blocker.
- Because the diagnostics are format-only, no manual logic fixes are planned for this batch.

## Effective-Input Rule For Later Phases

Until superseded by a later locked addendum, later phases for run 31 must treat this file as an authoritative effective input together with:

- `/.recursive/run/31-main-ci-parity-evidence-json-repair/addenda/01.5-root-cause.branch-local-biome-router-config-format.addendum-18.md`

This addendum adds the bounded role-model-router config/JSON formatter cleanup to the run.

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

- Audit summary: the Phase 2 plan now includes the bounded role-model-router config/JSON formatter batch needed to move local parity past the next exposed layer.
Audit: PASS
