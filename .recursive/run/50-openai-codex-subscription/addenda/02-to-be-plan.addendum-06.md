Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `02 To-Be Plan`
Status: `DRAFT`
Addendum: `06`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-06.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/unified-runtime-config.test.ts`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-06.md`
- future runtime-host bridge code and test changes
Scope note: This addendum restores controller-guided alias routing by giving the remote controller a realistic default timeout budget while preserving explicit overrides and existing alias inventory behavior.

## Objective

Make controller-based routing use a shared realistic default timeout so intelligent aliases can arbitrate across Kimi, DeepSeek, and OpenAI instead of always dropping to fallback scoring.

## Implementation Plan

### Phase 1: Shared controller timeout default

1. Introduce a shared exported controller timeout constant in unified runtime config code.
2. Raise the controller default timeout from `1500ms` to a realistic remote budget.
3. Reuse the same constant when a persisted controller assignment is promoted into an active controller config at runtime.

Acceptance:
- there is one authoritative default for controller timeout behavior

### Phase 2: TDD regression coverage

RED already exists for:

1. remote controller response at `2000ms` with no explicit `timeout_ms` still yields accepted directives

Add or update coverage for:

1. unified runtime config default expectations if they assert the old controller default
2. explicit controller timeout overrides remaining unchanged

Acceptance:
- controller default tests fail before production change and pass after it

### Phase 3: Rebuild and runtime verification

1. rebuild `@role-model-router/runtime-host-bridge` and `@role-model-router/runtime-ui`
2. relaunch the runtime on port `3461` using the preserved state root
3. act as a consumer and send alias traffic through controller routing
4. inspect request artifacts and verify:
   - controller guidance no longer times out by default
   - Kimi remains available for coding traffic
   - DeepSeek remains available for API-backed routing

Acceptance:
- live alias routing shows cross-provider controller participation instead of universal DeepSeek Flash fallback

### Phase 4: Verification matrix

1. re-run targeted OpenAI Codex Subscription matrix tests
2. re-run Kimi/DeepSeek coding-route regression tests
3. send consumer requests through the live runtime alias and inspect routing decisions

Acceptance:
- OpenAI provider capability changes do not regress multi-provider routing behavior
