Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `02 To-Be Plan`
Status: `DRAFT`
Addendum: `12`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-12.md`
- `/role-model-router/apps/runtime-host-bridge/src/package-sea.ts`
- `/role-model-router/apps/runtime-host-bridge/test/executable.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/routable-inventory-bootstrap.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-12.md`
- package-level host suite restored to green
- alias verification evidence from the live runtime
Scope note: This addendum closes the remaining package-level validation failures and then performs a live alias-routing inspection pass.

## Objective

Restore the package-level host bridge suite to green and then verify live alias-routing behavior by observing real routing decisions rather than just static matrix state.

## Implementation Plan

### Phase 1: RED-to-GREEN packaging and test repairs

1. update `/role-model-router/apps/runtime-host-bridge/src/package-sea.ts`
   - replace the import-time self-execution check with a real direct-invocation guard
2. extend `/role-model-router/apps/runtime-host-bridge/test/executable.test.ts`
   - add an explicit regression that the direct-invocation guard does not treat imported modules as main
3. update `/role-model-router/apps/runtime-host-bridge/test/routable-inventory-bootstrap.test.ts`
   - assert strict alias behavior:
     - mixed alias resolves only the valid hint-backed endpoint
     - stale-only alias is omitted from model-list output
4. update `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`
   - raise timeout to match the current end-to-end runtime validation cost

### Phase 2: Package-level verification

1. rerun:
   - `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/executable.test.ts`
   - `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/routable-inventory-bootstrap.test.ts`
   - `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/validate-vendors.test.ts`
2. rerun:
   - `corepack pnpm --filter @role-model-router/runtime-host-bridge test`

### Phase 3: Live alias verification

1. issue requests against the rebuilt runtime on `http://127.0.0.1:3461`
2. cover the canonical alias families that are actually present in the current runtime config
3. inspect request observations and summarize:
   - alias id
   - resolved endpoint pool
   - chosen endpoint
   - controller or difficulty diagnostics when applicable
4. if requests still all choose the same model, inspect the decision diagnostics and explain why rather than treating that as acceptable by default
