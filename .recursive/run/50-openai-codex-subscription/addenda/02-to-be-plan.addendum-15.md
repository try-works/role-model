Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `02 To-Be Plan`
Status: `DRAFT`
Addendum: `15`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-15.md`
- `/role-model-router/packages/core/src/router.ts`
- `/role-model-router/packages/core/src/reason-codes.ts`
- `/protocol/schemas/router-decision.schema.json`
- `/packages/protocol-types/src/generated.ts`
- `/role-model-router/packages/runtime-observability/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/packages/conformance/src/router-conformance.test.ts`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-15.md`
- focused router + bridge diagnostics regressions
- refreshed live routing evidence from `:3462`
Scope note: This addendum repairs the routing-diagnostics truthfulness gap for score-near-tie decisions without changing the intended routing policy itself.

## Objective

Make routed request detail explicitly show when the router chose the winner through the score-tie epsilon plus tie-break path instead of through a strict larger raw `total_score`.

## Implementation Plan

### Phase 1: RED regressions

1. extend `/packages/conformance/src/router-conformance.test.ts`
   - add a near-tie routing regression where one candidate has the slightly lower `total_score` but wins because the delta is inside the configured epsilon and it has better tie-break quality
   - assert the router emits an explicit tie-break selection reason
2. extend `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
   - add a request-detail regression proving runtime routing diagnostics expose the selection mode for a tie-break-selected request

### Phase 2: production patch

1. update `/role-model-router/packages/core/src/reason-codes.ts`
   - add a new selection reason for score-tie comparator wins
2. update `/protocol/schemas/router-decision.schema.json`
   - admit the new selection reason in the protocol schema
3. regenerate `/packages/protocol-types/src/generated.ts`
4. update `/role-model-router/packages/core/src/router.ts`
   - detect when the winning choice came from the score-tie epsilon comparator rather than a strict larger raw score
   - emit the new selection reason alongside the existing reasons
5. update `/role-model-router/packages/runtime-observability/src/index.ts` and `/role-model-router/apps/runtime-host-bridge/src/index.ts`
   - surface a small `routingDiagnostics.selection` block with:
     - decision mode
     - score delta
     - score tie epsilon
     - runner-up endpoint when present

### Phase 3: verification

1. rerun focused regressions:
   - `corepack pnpm --filter @role-model/conformance exec vitest run src/router-conformance.test.ts`
   - `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts --testNamePattern "tie-break|selection diagnostics"`
2. regenerate protocol types and rerun impacted package tests if schema changes require it
3. rebuild the runtime packages
4. relaunch the runtime on `http://127.0.0.1:3462`
5. rerun:
   - direct exact-model warmup for `flash`, `pro`, and `kimi`
   - `controller.remote-only` hard code probe
6. confirm the final live detail shows:
   - the same selected endpoint as before
   - explicit tie-break diagnostics instead of an apparently contradictory `BEST_TOTAL_SCORE`-only story
