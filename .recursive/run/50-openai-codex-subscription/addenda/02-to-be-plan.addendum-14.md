Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `02 To-Be Plan`
Status: `DRAFT`
Addendum: `14`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-14.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/controller-routing-contract.ts`
- `/role-model-router/packages/core/src/router.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-14.md`
- focused bridge regression coverage for controller bucket inference and endpoint-rank sanitization
- refreshed live routing evidence from `:3461`
Scope note: This addendum closes the remaining controller routing collapse by aligning controller quality strategy with difficulty-aware observed profiles and by removing no-op full-pool endpoint-rank bias.

## Objective

Make controller-driven routing consume the correct observed profile slice and ensure controller endpoint rankings only apply when they actually constrain the candidate pool.

## Implementation Plan

### Phase 1: RED regressions

1. extend `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
   - add a controller-mode routing regression where `strategy = "quality"` must route from hard-bucket observed profiles even without `difficultyRouting`
   - add a controller sanitization regression where `preferredEndpointIds` equal to the full allowed endpoint pool must not create a routing-model override
2. keep the assertions at the bridge level so they prove both request mapping and execution-time routing behavior

### Phase 2: bridge patch

1. update `/role-model-router/apps/runtime-host-bridge/src/index.ts`
   - infer an observed difficulty bucket from the effective controller strategy when difficulty routing is absent
   - use that inferred bucket when reading observed profiles for routing
2. update controller preferred-endpoint handling
   - preserve only strict-subset preferred endpoint lists
   - collapse full-pool endpoint rankings to no override

### Phase 3: Verification

1. rerun focused bridge coverage:
   - `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts --testNamePattern "controller|bucket|preferred endpoint"`
2. rerun the broader impacted suites if the bridge patch touches shared routing paths
3. rebuild the runtime packages
4. relaunch the runtime on `http://127.0.0.1:3461`
5. rerun harder `controller.remote-only` probes and inspect:
   - inferred bucket
   - selected strategy
   - selected endpoint
   - whether routing decisions diversify away from the freshest flash route when hard-quality evidence favors another model
