Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `03 Implementation Summary`
Status: `DRAFT`
Addendum: `20`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-20.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-20.md`
- `/role-model-router/packages/provider-openai/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/packages/provider-openai/test/index.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/03-implementation-summary.addendum-20.md`
- `/role-model-router/packages/provider-openai/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/packages/provider-openai/test/index.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
Scope note: add exact Kimi provider-native hosted web-search support while preserving the existing OpenAI hosted path and the mixed-provider runtime fallback.

## Implemented

1. updated `/role-model-router/packages/provider-openai/src/index.ts`
   - preserved Kimi hosted `builtin_function.$web_search` on chat-completions
   - passed hosted Kimi tool definitions through without coercing them into ordinary
     function tools
   - injected `thinking: { type: "disabled" }` for Kimi hosted web-search requests
2. updated `/role-model-router/apps/runtime-host-bridge/src/index.ts`
   - added the Kimi hosted web-search contract and mapper recognition for exact Kimi pools
   - added passthrough `"$web_search"` execution so Kimi tool-call continuations are
     recorded without trying to re-run local search
   - preserved runtime fallback for non-uniform or non-native hosted-search pools
3. updated focused regression coverage
   - provider-openai tests now pin the Kimi chat-completions shaping behavior
   - runtime-host-bridge tests now pin exact Kimi hosted contract mapping and passthrough
     tool execution

## TDD Evidence

RED Evidence:
- `/.recursive/run/50-openai-codex-subscription/evidence/logs/red/addendum-20-provider-openai-kimi-hosted.red.log`
- `/.recursive/run/50-openai-codex-subscription/evidence/logs/red/addendum-20-bridge-kimi-hosted.red.log`

GREEN Evidence:
- `/.recursive/run/50-openai-codex-subscription/evidence/logs/green/addendum-20-provider-openai-kimi-hosted.green.log`
- `/.recursive/run/50-openai-codex-subscription/evidence/logs/green/addendum-20-bridge-kimi-hosted.green.log`

## Verification

Commands:

- `corepack pnpm --filter @role-model-router/provider-openai exec vitest run test/index.test.ts --testNamePattern "Kimi hosted web search|forces the OpenAI Responses API path when hosted tools are requested|preserves hosted OpenAI responses tools"`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts --testNamePattern "Kimi hosted web-search requests and records passthrough tool executions|exact Kimi responses web-search|mixed-provider responses web_search|maps exact non-OpenAI responses web-search"`

Result:

- exact Kimi hosted search now stays on chat-completions with the provider-native
  `builtin_function.$web_search` contract
- the bridge records the Kimi passthrough tool execution correctly
- OpenAI exact hosted search and mixed-provider fallback behavior remain green
