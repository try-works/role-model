Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `02 To-Be Plan`
Status: `DRAFT`
Addendum: `21`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-21.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/docs/architecture/09-runtime-routing-strategy-interactions.md`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-21.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/03-implementation-summary.addendum-21.md`
- runtime-host-bridge metadata patch
- focused regression updates
- routing architecture documentation update
Scope note: clarify and verify transport-aware native-search contracts while preserving existing OpenAI exact hosted search, existing Kimi exact hosted search, and runtime fallback eligibility for DeepSeek and mixed provider pools.

## Objective

Make web-search routing decisions depend on transport-aware provider metadata instead of
an implicit OpenAI-only assumption, and document exactly which providers are native
versus runtime-fallback on the current runtime transport.

## Implementation Plan

### Phase 1: RED regressions

1. add mapper-level coverage proving DeepSeek exact `responses` `web_search` requests stay
   eligible through runtime-managed fallback because the current runtime transport is not
   the documented Anthropic-native web-search surface
2. add coverage proving mixed Kimi + DeepSeek remote pools keep both providers eligible
   through runtime-managed fallback when there is no single native hosted contract
3. add metadata-level coverage proving Kimi is native on the current transport while
   DeepSeek is documented on a different transport

Acceptance:
- focused tests fail until transport-aware metadata is explicit

### Phase 2: Transport-aware metadata shaping

1. replace ad-hoc hosted-search checks with one provider-native web-search matrix
2. model whether a native contract is active on the current runtime transport versus only
   documented on another transport
3. use endpoint-level helpers instead of model-id-only OpenAI checks where hosted-tool
   filtering depends on the active transport

Acceptance:
- request mapping uses explicit contract metadata
- DeepSeek is not misrepresented as OpenAI-surface native hosted search

### Phase 3: Documentation alignment

1. update `09-runtime-routing-strategy-interactions.md` with a hosted-search contract
   matrix
2. distinguish:
   - provider-native hosted tool
   - runtime-managed tool fallback
   - documented but inactive-on-current-transport support
3. include the current OpenAI / Kimi / DeepSeek examples in diagrams or tables

Acceptance:
- docs match the implemented runtime behavior

### Phase 4: Verification

1. run focused bridge tests
2. drive live localhost requests on `3462` for:
   - exact OpenAI hosted search
   - exact Kimi hosted search
   - exact DeepSeek runtime-managed search
3. inspect request observations or telemetry to confirm the chosen path

Acceptance:
- focused suites pass
- live runtime confirms OpenAI native, Kimi native, and DeepSeek runtime-fallback behavior
