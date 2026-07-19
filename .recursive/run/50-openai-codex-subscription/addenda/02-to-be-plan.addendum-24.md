Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `02 To-Be Plan`
Status: `DRAFT`
Addendum: `24`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-24.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-24.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/03-implementation-summary.addendum-24.md`
- focused DeepSeek DSML `web_open`/`web_browse` normalization regressions
- consumer-surface tool-call normalization patch
Scope note: normalize DeepSeek DSML search-followup tools into the bridge's consumer-facing tool-call surface rather than hosting generic browsing inside the router runtime.

## Objective

Teach the bridge to normalize DeepSeek DSML `web_open` and `web_browse` turns into structured
consumer-visible tool calls so downstream apps can execute them and continue the turn.

## Implementation Plan

### Phase 1: RED regressions

1. add focused DeepSeek exact-model regressions that force:
   - DSML `web_open` after an initial search tool turn
   - DSML `web_browse` with parameter-tag payloads
2. assert that the bridge response surfaces structured tool calls instead of raw DSML assistant text

Acceptance:
- the focused tests fail on the current bridge

### Phase 2: DSML tool-call normalization

1. extend the DeepSeek DSML parser to read parameter-tag payloads like `url`
2. map supported DeepSeek DSML tool names into bridge-normalized tool calls
3. surface those normalized calls on `/v1/chat/completions` and `/v1/responses`
4. keep runtime-owned execution limited to explicitly request-scoped or runtime-managed tools, not generic provider browsing

Acceptance:
- focused regressions return structured tool calls without raw DSML leakage

### Phase 3: Live verification

1. rerun the focused bridge slice
2. restart `3462`
3. re-probe exact-model web-search for:
   - `chatgpt/gpt-5.4`
   - `moonshot/kimi-k2.7-code`
   - `deepseek/deepseek-v4-flash`
   - `deepseek/deepseek-v4-pro`
4. repeat DeepSeek Flash/Pro probes to confirm DSML tool requests now surface structurally to the caller instead of leaking raw markup

Acceptance:
- DeepSeek Flash/Pro no longer leak raw DSML markup on the public bridge
