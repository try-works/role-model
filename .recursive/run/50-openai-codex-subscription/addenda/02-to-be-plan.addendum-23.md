Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `02 To-Be Plan`
Status: `DRAFT`
Addendum: `23`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-23.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-23.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/03-implementation-summary.addendum-23.md`
- focused DeepSeek continuation regression
- bridge DeepSeek DSML continuation patch
Scope note: teach the bridge to detect DeepSeek DSML web-search tool markup and continue the provider turn instead of returning the textual tool block to the caller.

## Objective

Recognize DeepSeek DSML web-search tool markup as another continuation surface for the bridge
tool loop, then execute and replay it just like the existing structured `tool_calls` path.

## Implementation Plan

### Phase 1: RED regression

1. add a DeepSeek V4 Pro exact `responses` regression where:
   - first turn returns structured `web_search`
   - second turn returns DSML `web_search` markup in assistant text
   - third turn should only happen if the bridge recognizes and continues the DSML markup

Acceptance:
- the focused test fails on the current bridge

### Phase 2: DSML continuation parsing

1. add a small DeepSeek-specific parser that extracts supported web-search tool calls from DSML
   assistant text
2. fold those parsed tool calls into the existing bounded continuation loop
3. keep unsupported DSML tools non-fatal and avoid inventing behavior for tools the runtime
   does not actually implement

Acceptance:
- DeepSeek V4 Pro converges to a final answer in the focused regression

### Phase 3: Live verification

1. rerun the focused bridge slice
2. relaunch `3462`
3. re-test exact-model web-search for all four connected models
4. inspect request observations so the final closeout can show which models now fully converge

Acceptance:
- all four connected models return final-answer web-search responses on the public bridge
