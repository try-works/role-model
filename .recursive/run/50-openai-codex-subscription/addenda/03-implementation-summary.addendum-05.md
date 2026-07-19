Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `03 Implementation Summary`
Status: `DRAFT`
Addendum: `05`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-07.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-07.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/controller-routing-contract.ts`
- `/role-model-router/apps/runtime-ui/app/routes/control-roles.tsx`
- `/role-model-router/apps/runtime-ui/app/lib/role-task-hierarchy.tsx`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/03-implementation-summary.addendum-05.md`
Scope note: This addendum covers the controller allowlist and guidance-sanitization fix plus the role-first task-detail hierarchy update on the runtime Roles page.

## Implemented

1. added `/role-model-router/apps/runtime-host-bridge/src/controller-routing-contract.ts`
   - builds a bounded controller system prompt from runtime-known roles, task types, capabilities, supported strategy values, and candidate endpoint ids
   - tells the controller to omit unmatched fields instead of inventing new ones
   - sanitizes controller guidance so invalid fields are dropped while valid partial guidance is preserved
   - extracts JSON objects robustly from raw controller output instead of assuming the whole reply is directly parseable JSON
2. updated `/role-model-router/apps/runtime-host-bridge/src/index.ts`
   - controller prompt generation now includes live role/task allowlists
   - live controller output parsing now routes through the new sanitize step before diagnostics or fallback decisions
3. added `/role-model-router/apps/runtime-host-bridge/test/controller-routing-contract.test.ts`
   - bounded prompt contract
   - invalid-field dropping with valid-role preservation
   - valid-task preservation when the role id is unknown
4. added `/role-model-router/apps/runtime-ui/app/lib/role-task-hierarchy.tsx`
   - pure role-first hierarchy builder
   - pure `RoleCatalogHierarchy` renderer for collapsed versus expanded task detail
5. updated `/role-model-router/apps/runtime-ui/app/routes/control-roles.tsx`
   - role catalog now shows role-level information first
   - task types are no longer rendered on every role card by default
   - `Task detail` / `Hide task detail` toggles reveal lower-level task data only on demand
   - task allowlist editing is now role-first and scoped to the expanded role instead of rendering all tasks as a first-layer list
6. added `/role-model-router/apps/runtime-ui/app/lib/role-task-hierarchy.test.tsx`
   - verifies tasks stay hidden until task-detail expansion
   - verifies expanded role detail shows grouped task information
7. updated package test manifests so both new suites are part of the package-level test commands

## Test Results

Passed targeted bridge validation:

- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/controller-routing-contract.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/validate-vendors.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge build`

Passed runtime-ui validation:

- `corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/lib/role-task-hierarchy.test.tsx app/lib/design-system.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-ui test`
- `corepack pnpm --filter @role-model-router/runtime-ui build`

## Remaining Validation Note

`corepack pnpm --filter @role-model-router/runtime-host-bridge test` still ends with one unrelated package-level failure in `test/executable.test.ts` during SEA-style bundling because multiple workspace dependencies do not have built `dist/index.js` outputs available to the packaging step in that test context.

Relevant facts:

1. the new controller-contract suite passes
2. the existing controller-heavy host bridge suite passes
3. the isolated vendor end-to-end validation passes
4. the bridge package itself builds successfully with `tsc -p tsconfig.json`

So the new slice is functionally validated for the touched routing and UI surfaces, while the remaining package-level executable bundling failure stays outside the direct logic changed here.
