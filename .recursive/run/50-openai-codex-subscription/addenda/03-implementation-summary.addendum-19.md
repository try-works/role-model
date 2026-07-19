Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `03 Implementation Summary`
Status: `DRAFT`
Addendum: `19`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-19.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-19.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/openai-codex-subscription-matrix.test.ts`
- `/role-model-router/apps/runtime-host-bridge/src/runtime-web-search.test.ts`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/03-implementation-summary.addendum-19.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/runtime-web-search.ts`
- `/role-model-router/apps/runtime-host-bridge/test/openai-codex-subscription-matrix.test.ts`
Scope note: preserve exact OpenAI hosted `web_search` behavior when the selected pool supports it, but keep Kimi and DeepSeek eligible for generic web-search turns through runtime-executed tool calling.

## Implemented

1. added `/role-model-router/apps/runtime-host-bridge/src/runtime-web-search.ts`
   - introduced a bridge-owned runtime `web_search` executor
   - uses DuckDuckGo HTML search as the minimal provider-agnostic upstream
   - returns structured results with `query`, `provider`, and normalized result rows
2. updated `/role-model-router/apps/runtime-host-bridge/src/index.ts`
   - added `createRuntimeWebSearchToolDefinition()`
   - added contract-aware Responses tool planning so hosted `web_search` stays raw only when the eligible endpoint pool fully supports the OpenAI hosted-tool contract
   - added fallback behavior that converts generic `web_search` turns into ordinary function-tool execution and filters the pool by `tools.function_calling` / declared tool-calling support instead of OpenAI-only hosted-tool support
   - added the built-in `runtime.builtin` connector and wired `web_search` execution through the bridge fetcher so runtime tests can stub the network path
3. updated `/role-model-router/apps/runtime-host-bridge/test/openai-codex-subscription-matrix.test.ts`
   - preserved the exact OpenAI hosted-path control case
   - replaced the mixed-provider runtime-vendor-dependent assertion with a mapper-level regression that verifies `controller.remote-only` mixed pools keep DeepSeek, Kimi, and OpenAI eligible while normalizing `web_search` into a runtime function tool

## TDD Evidence

RED Evidence:
- `/.recursive/run/50-openai-codex-subscription/evidence/logs/red/addendum-19-bridge-web-search.red.log`
- `/.recursive/run/50-openai-codex-subscription/evidence/logs/red/addendum-19-runtime-web-search.red.log`

GREEN Evidence:
- `/.recursive/run/50-openai-codex-subscription/evidence/logs/green/addendum-19-runtime-web-search.green.log`
- `/.recursive/run/50-openai-codex-subscription/evidence/logs/green/addendum-19-bridge-web-search.green.log`
- `/.recursive/run/50-openai-codex-subscription/evidence/logs/green/addendum-19-openai-web-search.green.log`

## Verification

Commands:

- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run src/runtime-web-search.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts --testNamePattern "web-search|web_search|hosted OpenAI responses tools"`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/openai-codex-subscription-matrix.test.ts --testNamePattern "hosted web search|web-search|web_search|mixed-provider controller.remote-only"`

Result:

- focused runtime web-search unit coverage passes
- mixed-provider Responses `web_search` requests now fall back to runtime tool calling instead of collapsing to the OpenAI-only hosted-tool pool
- exact OpenAI GPT-5.3+ Codex Subscription hosted `web_search` requests remain green as the control path
