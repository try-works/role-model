Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `02 To-Be Plan`
Status: `DRAFT`
Addendum: `11`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-11.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/routable-inventory.ts`
- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/backend-unified-runtime-config.test.ts`
- `/role-model-router/apps/runtime-host-bridge/src/routable-inventory.test.ts`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-11.md`
- future timeout/matrix regressions and production patch
Scope note: This addendum patches the persisted-controller timeout path and replaces single-primary alias behavior with a strict canonical alias matrix.

## Objective

Raise the persisted-controller timeout budget, generate/persist the full canonical alias matrix, resolve aliases strictly against their matrix slices, and make controller routing consume the execution-mode-specific alias pool.

## Implementation Plan

### Phase 1: RED timeout and matrix regressions

1. extend `/role-model-router/apps/runtime-host-bridge/test/unified-runtime-config.test.ts`
2. extend `/role-model-router/apps/runtime-host-bridge/test/backend-unified-runtime-config.test.ts`
3. extend `/role-model-router/apps/runtime-host-bridge/src/routable-inventory.test.ts`
4. extend `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`

Required RED coverage:

1. persisted controller fallback default timeout is larger/configurable than the old 5000 ms budget
2. runtime config persistence materializes the full canonical alias matrix rather than one primary alias
3. alias resolution only returns endpoints whose model ids belong to the alias slice
4. controller-routing candidate pools for `controller.remote-only` stay inside the remote-only matrix slice

Acceptance:
- new regressions fail against the current single-alias/broad-resolution/5000 ms behavior

### Phase 2: Production patch

1. update `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
   - raise the shared default controller timeout
   - add canonical alias-matrix helpers as needed
2. update `/role-model-router/apps/runtime-host-bridge/src/index.ts`
   - replace `materializePrimaryRoutingAlias()` with full canonical-matrix materialization
   - preserve non-primary custom aliases
   - keep controller candidate pools execution-mode scoped through the strict alias matrix
3. update `/role-model-router/apps/runtime-host-bridge/src/routable-inventory.ts`
   - resolve aliases strictly from their configured model ids instead of broad inventory fallback

Acceptance:
- all new RED tests pass
- existing controller compatibility tests stay green
- existing routing summary/config tests are updated to the new full-matrix behavior

### Phase 3: Verification

1. rerun focused runtime-host-bridge tests
2. rebuild the runtime assets
3. relaunch the runtime on `http://127.0.0.1:3461`
4. issue fresh live `controller.remote-only` requests
5. inspect request telemetry and router/config output

Acceptance:

1. persisted controller fallbacks no longer primarily fail at `controller-timeout`
2. router/config and router/summary expose the canonical alias matrix
3. alias inventories match the expected execution-mode slices
