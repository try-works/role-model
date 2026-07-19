Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `03 Implementation Summary`
Status: `DRAFT`
Addendum: `24`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-24.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-24.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/03-implementation-summary.addendum-24.md`
- focused consumer-managed DeepSeek tool normalization regressions
- removal of router-owned generic runtime web-search execution helper

## Summary

1. changed the bridge tool-loop contract so only hosted tools remain bridge-managed; ordinary
   function tools are now surfaced back to the consumer instead of being auto-executed by the
   router runtime
2. changed DeepSeek exact-model hosted `web_search` requests from runtime-executed fallback to
   consumer-managed normalized `tool_calls`
3. added DSML normalization for DeepSeek `web_search`, `web_open`, and `web_browse`, including
   parameter-tag parsing for `url`
4. removed the router-owned generic runtime web-search execution helper and its tests because that
   behavior no longer matches the intended architecture boundary

## Files Changed

- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- deleted `/role-model-router/apps/runtime-host-bridge/src/runtime-web-search.ts`
- deleted `/role-model-router/apps/runtime-host-bridge/src/runtime-web-search.test.ts`

## RED Evidence

- `/.recursive/run/50-openai-codex-subscription/evidence/logs/red/addendum-24-consumer-tool-normalization.red.log`

Observed failure:

- the initial focused slice failed before the bridge split because DeepSeek DSML markup was still
  leaking or the modeled continuation path was not yet using a consumer-visible tool surface

## GREEN Evidence

- `/.recursive/run/50-openai-codex-subscription/evidence/logs/green/addendum-24-consumer-tool-normalization.green.log`
- `/.recursive/run/50-openai-codex-subscription/evidence/logs/green/addendum-24-consumer-tool-normalization.regression.log`

Passing slice:

- exact `deepseek/deepseek-v4-flash` hosted web-search now returns normalized consumer-visible
  `tool_calls`
- exact `deepseek/deepseek-v4-pro` hosted web-search now returns normalized consumer-visible
  `tool_calls`
- DeepSeek DSML `web_search` markup normalizes to `tool_calls`
- DeepSeek DSML `web_open` markup normalizes to `tool_calls`
- DeepSeek DSML `web_browse` markup normalizes to `tool_calls`
- Kimi hosted web-search exact-model flow still converges through the bridge-managed hosted path
