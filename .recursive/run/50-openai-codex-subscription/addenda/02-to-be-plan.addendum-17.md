Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `02 To-Be Plan`
Status: `DRAFT`
Addendum: `17`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-17.md`
- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/unified-runtime-config.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/backend-unified-runtime-config.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/docs/architecture/09-runtime-routing-strategy-interactions.md`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-17.md`
- runtime-host-bridge strategy/alias cleanup patch
- focused regression updates
- routing architecture documentation update
Scope note: This addendum removes `craft-ask` as a persisted routing strategy and canonical alias family while preserving any remaining Craft ask-mode heuristics only at request-analysis level.

## Objective

Keep the routing control plane limited to supported strategy families:

- `default` / baseline behavior
- `controller`
- `difficulty`
- `hybrid`

`craft-ask` must not remain as a saved routing strategy, canonical alias prefix, or documented matrix family.

## Implementation Plan

### Phase 1: RED regressions

1. update `test/unified-runtime-config.test.ts`
   - remove expectations that `craft-ask` derives its own alias prefix or mode
   - add coverage that unsupported/legacy strategy strings fall back to the default normalization path instead of becoming primary alias families
2. update `test/backend-unified-runtime-config.test.ts`
   - remove `craft-ask.*` expectations from the canonical alias-matrix coverage
3. update `test/index.test.ts`
   - remove any canonical alias assertions that still treat `craft-ask.remote-only` as a valid live alias id

Acceptance:
- the focused strategy and alias tests fail against the current `craft-ask` matrix behavior

### Phase 2: Production patch

1. update `src/unified-runtime-config.ts`
   - remove `craft-ask` from primary alias prefixes
   - keep alias derivation limited to supported routing families
2. update `src/index.ts`
   - remove `craft-ask` from the canonical alias strategy set used for matrix materialization
3. do not widen the patch into unrelated ask-mode heuristics unless they still feed persisted routing strategy values directly

Acceptance:
- the runtime no longer generates `craft-ask.*` aliases
- `isPrimaryRoutingAliasId(...)` no longer treats `craft-ask.*` as canonical

### Phase 3: Documentation update

1. update `docs/architecture/09-runtime-routing-strategy-interactions.md`
   - remove `craft-ask` from the routing-strategy normalization table
   - remove `craft-ask` from the canonical alias matrix and behavior matrix
   - clarify that Craft ask-mode behavior, if retained, is request analysis rather than a routing strategy family

Acceptance:
- the routing architecture doc matches the supported runtime control plane

### Phase 4: Verification

1. run focused runtime-host-bridge regressions covering:
   - unified runtime config alias derivation
   - backend canonical alias matrix expectations
   - any live alias-routing assertions touched by the cleanup
2. rebuild the runtime-host bridge if the patch changes exported runtime config behavior

Acceptance:
- targeted tests pass
- no `craft-ask.*` alias remains in code-owned canonical matrices or docs
