Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `03 Implementation Summary`
Status: `DRAFT`
Addendum: `10`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-16.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-16.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/openai-codex-subscription-matrix.test.ts`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/03-implementation-summary.addendum-10.md`
Scope note: This addendum closes the hosted `responses` tool routing gap so alias/controller web-search requests stay inside the supported OpenAI Codex Subscription slice while ordinary controller routing still spans the non-OpenAI pool.

## Implemented

1. updated `/role-model-router/apps/runtime-host-bridge/src/index.ts`
   - added request-surface helpers that distinguish function tools from hosted `responses` tools
   - added hosted-tool eligibility filtering before difficulty/controller routing
   - restricted hosted `responses` tools to endpoints whose model ids are present in the OpenAI Codex Subscription GPT-5.3+ matrix
   - rewrote alias-resolution diagnostics after filtering so `resolvedModelIds` and `allowEndpoints` reflect the true hosted-tool pool
   - added a clearer early error when no endpoint supports the requested hosted `responses` tool surface
2. updated `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
   - added a RED/GREEN mapper regression proving hosted `web_search` alias pools collapse to the OpenAI endpoint only
   - added a RED/GREEN regression proving exact non-supporting models fail early for hosted `responses` tools
   - updated the existing hosted-tool mapping unit to target an actual OpenAI Codex Subscription endpoint
3. updated `/role-model-router/apps/runtime-host-bridge/test/openai-codex-subscription-matrix.test.ts`
   - added a backend regression for a mixed-provider `controller.remote-only` pool
   - proved a hosted `web_search` `responses` request routes to the OpenAI Codex Subscription endpoint and does not attempt a non-OpenAI `responses` execution

## Test Results

Passed focused RED/GREEN loops:

- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts --testNamePattern "hosted web-search|exact non-OpenAI responses web-search"`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/openai-codex-subscription-matrix.test.ts --testNamePattern "controller.remote-only hosted web search"`

Passed broader impacted verification:

- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts test/openai-codex-subscription-matrix.test.ts`

Result:

- `112/112` tests passed

## Live Verification

Runtime target:

- `http://127.0.0.1:3462`

Verified after restarting the patched runtime from the run-50 worktree:

1. exact hosted-tool OpenAI request
   - client request id: `live-openai-exact-web-001`
   - canonical request id: `req-178f0336-9033-43ab-b91c-74d8cce2d000`
   - selected endpoint: `openai.personal.openai-codex-subscription.global.gpt-5.4`
   - eligible endpoint pool: only the OpenAI endpoint
2. alias/controller hosted-tool request
   - client request id: `live-controller-web-001`
   - canonical request id: `req-7cccb729-4f8a-4f67-a044-e7237a5a7de4`
   - selected endpoint: `openai.personal.openai-codex-subscription.global.gpt-5.4`
   - `routingDiagnostics.aliasResolution.resolvedModelIds = ["chatgpt/gpt-5.4"]`
   - `routingDiagnostics.aliasResolution.allowEndpoints = ["openai.personal.openai-codex-subscription.global.gpt-5.4"]`
   - controller remained active, but the hosted-tool eligibility slice prevented DeepSeek/Kimi from entering the final pool
3. ordinary controller routing still spans the non-OpenAI pool
   - `live-controller-general-001` -> `req-86ba4f04-d2fc-41b7-b7fa-4eda4f8ce2e2` -> `deepseek/deepseek-v4-flash`
   - `live-controller-code-001` -> `req-3c31558d-f0ab-4339-a723-76bb1d2f025f` -> `moonshot/kimi-k2.7-code`

This confirms the patch is narrow:

- hosted `responses` tools now route only to the supported OpenAI endpoint
- normal controller traffic still distributes across DeepSeek Flash and Kimi as expected
