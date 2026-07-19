Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `02 To-Be Plan`
Status: `DRAFT`
Addendum: `20`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-20.md`
- `/role-model-router/packages/provider-openai/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/packages/provider-openai/test/index.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-20.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/03-implementation-summary.addendum-20.md`
- provider-openai and runtime-host-bridge patch
Scope note: minimal provider-native hosted-search expansion for Kimi, with no attempt yet to invent a DeepSeek hosted-search transport contract that the repo does not already model.

## Objective

Support exact Kimi hosted web-search requests end to end at the runtime contract level while
preserving:

- OpenAI exact hosted Responses search
- mixed-provider fallback to runtime-executed `web_search`
- DeepSeek eligibility through ordinary tool calling

## Implementation Plan

### Phase 1: RED regressions

1. add provider-adapter coverage proving Kimi hosted `"$web_search"` must stay on
   chat-completions and disable thinking
2. add bridge mapping coverage proving exact Kimi `responses` `web_search` requests map to a
   hosted Kimi contract, not to OpenAI hosted search or generic runtime fallback
3. add runtime passthrough coverage proving Kimi `"$web_search"` tool calls can be recorded as
   bridge-owned tool executions without trying to run local search again

Acceptance:
- focused tests fail against the current OpenAI-only hosted-tool logic

### Phase 2: Provider-native hosted-search shaping

1. extend hosted-tool handling in `provider-openai` so Kimi hosted tools can remain on
   `openai.chat.completions`
2. pass Kimi hosted-tool raw definitions through to chat-completions
3. inject the required `thinking: { type: "disabled" }` request body when using
   Kimi `"$web_search"`

Acceptance:
- exact Kimi hosted search no longer gets forced onto OpenAI Responses

### Phase 3: Bridge contract planning and passthrough execution

1. teach `mapResponsesRequest()` to recognize exact Kimi hosted search pools
2. emit hosted tool definitions using the Kimi `builtin_function.$web_search` raw shape
3. add a bridge-owned passthrough execution for `"$web_search"` that returns the supplied
   arguments unchanged as the tool output

Acceptance:
- exact Kimi hosted-search requests can progress through request shaping and tool execution
  without `TOOL_NOT_REGISTERED`

### Phase 4: Verification

1. run focused provider and bridge suites
2. if feasible, drive a live runtime request against an exact Kimi endpoint and inspect the
   resulting tool-call / tool-execution handoff
3. preserve the existing OpenAI exact hosted control case and the mixed-provider fallback case

Acceptance:
- focused suites pass
- Kimi hosted search is explicitly supported
- OpenAI hosted search remains green
- DeepSeek remains eligible through the current fallback path
