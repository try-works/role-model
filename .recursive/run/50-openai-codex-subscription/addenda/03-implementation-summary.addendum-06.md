Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `03 Implementation Summary`
Status: `DRAFT`
Addendum: `06`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-08.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-08.md`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
- `/role-model-router/apps/runtime-ui/app/lib/role-task-hierarchy.test.tsx`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/03-implementation-summary.addendum-06.md`
Scope note: This addendum adds end-to-end regression coverage for the run-50 controller allowlist and role-first task-detail behaviors without reopening the production implementation.

## Implemented

1. updated `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
   - added a live bridge HTTP regression that posts to `/v1/chat/completions` through an intelligent alias
   - verifies request-detail telemetry records sanitized controller guidance at the real bridge boundary
   - verifies invalid controller fields such as unsupported `taskType` and `strategy` are dropped while valid directives survive
   - added a live control-plane regression that serves `/api/role-model/roles`, `/api/role-model/role-policy`, and `/api/role-model/tasks` from a real runtime backend and checks role/task coherence
2. updated `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
   - added a route/source regression that keeps the Roles surface role-first
   - verifies the route still delegates task drill-down to `RoleCatalogHierarchy`
   - verifies task-detail affordance text remains present in the hierarchy component
3. retained `/role-model-router/apps/runtime-ui/app/lib/role-task-hierarchy.test.tsx`
   - existing collapsed-versus-expanded hierarchy tests continue covering the component-level detail rendering path

## Test Results

Passed targeted regressions:

- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/lib/design-system.test.ts app/lib/role-task-hierarchy.test.tsx`

Passed package-level runtime-ui validation:

- `corepack pnpm --filter @role-model-router/runtime-ui test`

Package-level host validation remains in the same unrelated state as before:

- `corepack pnpm --filter @role-model-router/runtime-host-bridge test`

## Remaining Validation Note

The host package-level test command still fails only in `test/executable.test.ts` during the SEA-style executable bundle step because multiple workspace dependencies still do not expose built `dist/index.js` outputs in that packaging context.

Relevant facts:

1. the new HTTP controller-regression test passes
2. the new live role/task control-plane regression test passes
3. the touched runtime-ui regression suites pass
4. the full runtime-ui package test command passes
5. the host package-level failure remains the pre-existing executable-bundling problem, not a regression introduced by this slice
