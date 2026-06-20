Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `03 Implementation Summary`
Status: `DRAFT`
Addendum: `07`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-11.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-11.md`
- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `/role-model-router/apps/runtime-host-bridge/src/routable-inventory.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/docs/architecture/09-runtime-routing-strategy-interactions.md`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/03-implementation-summary.addendum-07.md`
- `/docs/architecture/09-runtime-routing-strategy-interactions.md`
Scope note: This addendum closes the persisted-controller-timeout and canonical-alias-matrix slice, and records the follow-on architecture documentation for how routing inputs interact in the live runtime.

## Implemented

1. updated `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
   - raised `DEFAULT_UNIFIED_RUNTIME_CONTROLLER_TIMEOUT_MS` from `5000` to `15_000`
   - preserved the existing routing-strategy to alias-family normalization contract while allowing the live bridge to wait long enough for persisted controller assignments
2. updated `/role-model-router/apps/runtime-host-bridge/src/routable-inventory.ts`
   - made alias resolution strict to `alias.modelIds`
   - removed the old broad inventory fallback behavior for alias pools
   - preserves `ALIAS_POOL_EMPTY` diagnostics when a canonical or custom alias resolves to no routable endpoints
3. updated `/role-model-router/apps/runtime-host-bridge/src/index.ts`
   - replaced single-primary alias materialization with full canonical matrix generation across supported strategy families and execution modes
   - preserves non-primary custom aliases while regenerating canonical primary aliases
   - derives canonical alias slices from execution-mode-filtered routable inventory first, then configured model ids if the live inventory is still empty
   - keeps controller routing candidate pools scoped to the execution-mode-specific alias slice instead of a generic whole-inventory pool
   - relaxes startup validation for generated canonical aliases so transiently unavailable matrix slices do not block runtime boot while custom aliases still validate strictly
4. updated focused regression suites
   - `/role-model-router/apps/runtime-host-bridge/src/routable-inventory.test.ts`
   - `/role-model-router/apps/runtime-host-bridge/test/unified-runtime-config.test.ts`
   - `/role-model-router/apps/runtime-host-bridge/test/backend-unified-runtime-config.test.ts`
   - `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
5. added `/docs/architecture/09-runtime-routing-strategy-interactions.md`
   - documents the current codepath for execution-mode filtering, canonical alias matrix generation, strict alias resolution, controller guidance scoping, capability and role/task interactions, and benchmark plus observed-data influence

## Test Results

Passed focused regressions:

- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run src/routable-inventory.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/unified-runtime-config.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/backend-unified-runtime-config.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts --testNamePattern "executes every canonical remote alias|maps the full canonical alias matrix|routes execution-facing planning|controller budget|compatibility strategy aliases|remote-only routing inside the remote-only alias slice"`

Passed build validation:

- `corepack pnpm --filter @role-model-router/runtime-ui build`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge build`

## Live Verification

Rebuilt and relaunched the runtime-host bridge on `http://127.0.0.1:3461` against the run-50 manual OAuth state root.

Fresh live `controller.remote-only` requests now show the repaired controller path:

1. `routingDiagnostics.controllerRouting.active = true`
2. accepted controller directives are present instead of the earlier `invalid-controller-output` fallback shape
3. fresh inspected requests no longer show the earlier `controller-timeout` fallback after the default timeout increase

Current live alias behavior is now the intended matrix behavior:

1. `controller.remote-only` resolves to the remote-only canonical slice
2. the slice contains the currently routable remote endpoints, not one special-cased primary alias target
3. controller guidance is therefore choosing within the remote-only pool rather than being silently widened by generic inventory fallback

Example live evidence from `/api/role-model/requests/req-15644e48-cc0c-40a5-b5a3-89aefb078492`:

- `acceptedDirectives.requestedRoleId = "coder.patch"`
- `acceptedDirectives.taskType = "code.edit"`
- `acceptedDirectives.preferredEndpointIds` contains only the remote-only candidate set
- `aliasResolution.aliasId = "controller.remote-only"`

## Remaining Validation Note

This slice was validated against the rebuilt live runtime and focused bridge regressions. It did not rerun every package-level host test command because the known workspace-level executable packaging failure in `test/executable.test.ts` remains outside the logic changed here.
