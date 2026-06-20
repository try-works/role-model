Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `02 To-Be Plan`
Status: `DRAFT`
Addendum: `22`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-22.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/packages/provider-openai/src/index.ts`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-22.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/03-implementation-summary.addendum-22.md`
- bridge continuation-loop patch
- focused bridge regressions
Scope note: make exact-model search-capable requests converge on the public bridge surface by replaying tool results back into the selected provider turn with a bounded continuation loop.

## Objective

Complete the second half of the tool flow for Kimi and DeepSeek on the public HTTP bridge:

1. accept the provider tool call
2. execute the tool
3. append assistant plus tool messages
4. continue the turn against the same selected endpoint
5. stop only when a final assistant answer is returned or the bounded loop limit is reached

## Implementation Plan

### Phase 1: RED regressions

1. add a Kimi exact `responses` regression proving the bridge currently stops after
   provider-native `"$web_search"` instead of auto-finishing the second turn
2. add DeepSeek exact `responses` regressions for both Flash and Pro proving the bridge
   currently stops after runtime-managed `web_search`
3. add a `/v1/chat/completions` hosted-tool regression proving Kimi continuation tools can be
   rejected by the function-only parser

Acceptance:
- focused tests fail against the current bridge

### Phase 2: Continuation-loop implementation

1. add a bounded provider continuation loop inside `executeBridgePlan()` that:
   - preserves the already selected routed endpoint
   - executes returned tools
   - appends assistant tool-call and tool-result messages
   - re-runs provider execution until `finishReason !== "tool_calls"` or a loop limit is hit
2. preserve accumulated tool execution receipts across iterations
3. keep the final user-facing response as the converged assistant answer, not the first
   intermediate tool-call turn

Acceptance:
- Kimi exact hosted search converges to a final answer
- DeepSeek exact runtime-managed search converges to a final answer

### Phase 3: Hosted-tool parser compatibility

1. widen `toToolDefinition()` so chat-completions continuation requests can carry Kimi hosted
   `builtin_function` tools without tripping the function-only error
2. keep ordinary OpenAI function tools unchanged

Acceptance:
- public `/v1/chat/completions` no longer rejects valid Kimi hosted continuation tools

### Phase 4: Verification

1. run focused bridge regressions
2. relaunch the current worktree runtime on `3462`
3. verify exact-model web-search requests end to end for:
   - OpenAI GPT-5.4
   - DeepSeek V4 Flash
   - DeepSeek V4 Pro
   - Kimi K2.7 Code
4. inspect runtime request artifacts to confirm:
   - OpenAI still completes natively
   - Kimi completes after provider-native hosted search continuation
   - DeepSeek Flash / Pro complete after runtime-managed search continuation

Acceptance:
- all four connected models complete exact-model web-search requests to a final answer on
  the bridge surface
