Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `02 To-Be Plan`
Status: `DRAFT`
Addendum: `19`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-19.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/packages/provider-openai/src/index.ts`
- `/role-model-router/packages/tool-registry/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/openai-codex-subscription-matrix.test.ts`
- `/role-model-router/packages/provider-openai/test/index.test.ts`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-19.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/03-implementation-summary.addendum-13.md`
- bridge routing patch
- runtime web-search tool patch
- focused regression updates
Scope note: minimal behavior change that preserves exact OpenAI hosted-tool semantics while broadening mixed or non-OpenAI web-search routing to runtime-executed tool calling.

## Objective

Keep Kimi and DeepSeek eligible for requests that require web search or ordinary
function tools they support, while preserving OpenAI exact hosted-tool routing when that
specific contract is available.

## Implementation Plan

### Phase 1: RED regressions

1. update bridge mapping tests so mixed-provider or exact non-OpenAI `responses`
   `web_search` requests no longer expect OpenAI-only narrowing or hard rejection
2. add runtime tool execution coverage for a built-in `web_search` tool
3. keep exact OpenAI hosted-tool expectations green as the control case

Acceptance:
- focused tests fail against the current OpenAI-only hosted-tool narrowing behavior

### Phase 2: Contract-aware request mapping

1. teach `mapResponsesRequest()` to classify `web_search` into:
   - OpenAI-hosted contract
   - runtime-executed function-tool contract
2. preserve raw hosted-tool pass-through only when the eligible endpoint pool supports
   the OpenAI hosted-tool contract
3. otherwise convert `web_search` into a function tool definition with a stable schema
   and filter the pool only by ordinary function-calling support

Acceptance:
- exact OpenAI hosted-tool requests still map to hosted tools
- exact DeepSeek or Kimi `responses` web-search requests map to function tools instead
  of throwing
- mixed remote aliases no longer collapse to OpenAI-only for generic web-search turns

### Phase 3: Runtime web-search execution

1. add a built-in runtime `web_search` tool to the bridge-owned tool registry
2. implement a minimal search executor that returns structured top results
3. keep the implementation isolated so tests can mock the fetch path

Acceptance:
- when a model issues a `web_search` tool call, the runtime can execute it and return a
  structured result instead of `TOOL_NOT_REGISTERED`

### Phase 4: Verification

1. run focused bridge and provider tests
2. verify no exact OpenAI hosted-tool regression
3. verify Kimi and DeepSeek are no longer excluded at request-mapping level for
   web-search-capable turns

Acceptance:
- focused suites pass
- exact OpenAI hosted-tool path remains intact
- mixed/non-OpenAI pools retain eligibility through runtime-executed tool calling
