Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `03 Implementation Summary`
Status: `DRAFT`
Addendum: `11`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-17.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-17.md`
- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/unified-runtime-config.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/backend-unified-runtime-config.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/docs/architecture/09-runtime-routing-strategy-interactions.md`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/03-implementation-summary.addendum-11.md`
- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/unified-runtime-config.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/backend-unified-runtime-config.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/docs/architecture/09-runtime-routing-strategy-interactions.md`
Scope note: This addendum removes `craft-ask` as a supported routing strategy and canonical alias family while preserving legacy config safety through default-family normalization.

## Implemented

1. updated `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
   - removed `craft-ask` from primary alias-prefix recognition
   - normalized legacy `routing.strategy: craft-ask` inputs to `null`
   - kept alias derivation bounded to the supported routing families
2. updated `/role-model-router/apps/runtime-host-bridge/src/index.ts`
   - removed `craft-ask` from the canonical alias-matrix strategy set
   - canonical alias generation now yields only the supported `20` strategy-by-execution-mode aliases
3. updated focused regressions
   - `test/unified-runtime-config.test.ts`
   - `test/backend-unified-runtime-config.test.ts`
   - `test/index.test.ts`
   - added explicit legacy fallback coverage proving `craft-ask` normalizes to the `default.*` alias family instead of surviving as `craft-ask.*`
4. updated `/docs/architecture/09-runtime-routing-strategy-interactions.md`
   - removed `craft-ask` from the supported routing-strategy and canonical-alias matrices
   - clarified that any remaining Craft ask-mode behavior is request analysis, not a routing strategy family

## TDD Note

This addendum was applied during recursive run repair rather than from a clean lock-valid Phase 2 baseline, so it does not have separate archived RED log files under `evidence/logs/red/`.

Compensating evidence:

1. the regression suite was updated first to express the intended supported-matrix contract
2. legacy `craft-ask` expectations were removed from canonical-matrix assertions
3. explicit fallback coverage was added for persisted legacy config input
4. all touched focused suites were rerun green after the production patch

## Verification

Focused automated verification:

- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/unified-runtime-config.test.ts`
  - result: PASS (`23` tests)
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/backend-unified-runtime-config.test.ts`
  - result: PASS (`20` tests)
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts --testNamePattern "remote-only|canonical alias matrix"`
  - result: PASS (`3` passed, `103` skipped)

Result:

- `craft-ask.*` is no longer generated as part of the canonical alias matrix
- legacy `craft-ask` config input falls back to the `default` alias family
- the routing architecture doc now matches the supported runtime control plane
