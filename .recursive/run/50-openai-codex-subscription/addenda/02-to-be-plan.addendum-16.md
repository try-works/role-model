Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `02 To-Be Plan`
Status: `DRAFT`
Addendum: `16`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-16.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/openai-codex-subscription-matrix.test.ts`
- `/role-model-router/packages/provider-openai/src/index.ts`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-16.md`
- hosted-tool routing regressions
- runtime-host-bridge hosted-tool eligibility patch
- refreshed live verification from `:3462`
Scope note: This addendum repairs hosted `responses` tool routing so alias/controller execution only targets endpoints that actually support the requested hosted surface.

## Objective

Make routed `POST /v1/responses` requests with hosted tools, especially `web_search`, resolve only to supported OpenAI Codex Subscription GPT-5.3+ endpoints instead of leaking to non-supporting DeepSeek or Kimi endpoints.

## Implementation Plan

### Phase 1: RED regressions

1. extend `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
   - add a unit regression proving `mapResponsesRequest()` filters alias candidate endpoints down to the hosted-tool-capable OpenAI slice when `tools:[{type:"web_search"}]` is present
   - add a unit regression proving an exact non-supporting model surfaces an empty routed pool for hosted `responses` tools
2. extend `/role-model-router/apps/runtime-host-bridge/test/openai-codex-subscription-matrix.test.ts`
   - add a backend-level regression where a routed alias pool contains both OpenAI Codex Subscription and a non-supporting remote provider
   - execute a hosted `web_search` `responses` request through the alias and assert the chosen endpoint is the OpenAI Codex Subscription endpoint

### Phase 2: production patch

1. update `/role-model-router/apps/runtime-host-bridge/src/index.ts`
   - add helper logic that detects hosted `responses` tools
   - constrain `allowEndpoints` before difficulty/controller routing when hosted tools are present
   - use the OpenAI Codex Subscription model matrix as the canonical support gate for GPT-5.3+ models
2. preserve existing function-tool routing behavior
   - function tools must remain eligible on other providers that already support function calling
3. keep the patch request-surface-specific
   - do not change chat-completions routing
   - do not mutate provider adapter behavior

### Phase 3: verification

1. run focused bridge regressions
   - `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts --testNamePattern "hosted|responses|web_search"`
   - `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/openai-codex-subscription-matrix.test.ts --testNamePattern "hosted web search|alias"`
2. rebuild the updated runtime packages if required by the touched files
3. keep the live runtime on `http://127.0.0.1:3462`
4. re-run live probes against:
   - exact `chatgpt/gpt-5.4` hosted `web_search`
   - alias `controller.remote-only` hosted `web_search`
5. confirm:
   - exact GPT hosted tool requests still succeed
   - exact non-supporting providers still fail honestly when requested directly
   - alias/controller hosted-tool requests route to the OpenAI endpoint instead of failing downstream
