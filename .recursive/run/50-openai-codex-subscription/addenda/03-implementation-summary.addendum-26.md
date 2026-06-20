Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `03 Implementation Summary`
Status: `DRAFT`
Addendum: `26`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-26.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-26.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/03-implementation-summary.addendum-26.md`
- requested-role bridge regressions
- explicit-role task-resolution fix
Scope note: close the non-controller requested-role header bug by forcing bridge-side task resolution onto a role-compatible task before router-core eligibility filtering.

## Summary

1. added focused bridge regressions for explicit `requestedRoleId: "coder.review"` on
   non-controller traffic, covering both request mapping and live backend execution
2. added bridge-side task resolution for explicit requested roles so multi-task roles no longer
   preserve impossible `text.chat` defaults when the role supports other task types
3. used message-aware heuristics to prefer `json.schema_adherence` for schema-heavy review asks
   while preserving current-task and single-task role behavior
4. restarted the source-launched runtime on `http://127.0.0.1:3462` and confirmed the prior live
   header repro now routes to a concrete endpoint instead of failing with the blank chosen-endpoint
   400

## Files Changed

- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`

## RED Evidence

- `/.recursive/run/50-openai-codex-subscription/evidence/logs/red/addendum-26-non-controller-requested-role.red.log`

Observed failures:

- `mapChatCompletionsRequest(...)` preserved `taskType: "text.chat"` and
  `requiredCapabilities: ["text.chat"]` for `requestedRoleId: "coder.review"`
- live backend execution rejected the same request with
  `Chosen endpoint  is not present in the registry result.`

## GREEN Evidence

- `/.recursive/run/50-openai-codex-subscription/evidence/logs/green/addendum-26-non-controller-requested-role.green.log`
- `/.recursive/run/50-openai-codex-subscription/evidence/logs/green/addendum-26-live-3462-requested-role.green.log`

Passing slice:

- focused bridge regressions now resolve explicit `coder.review` requests onto a role-compatible
  task and execute cleanly
- live `3462` replay now returns `200 OK` with
  `x-role-model-endpoint-id: moonshot.personal.kimi-code.global.kimi-k2.7-code`
  instead of the blank chosen-endpoint 400

## Verification Notes

- reran focused `runtime-host-bridge` Vitest coverage for the two new requested-role regressions
- restarted the source-launched `3462` runtime from the run-50 worktree against the existing
  `%LOCALAPPDATA%/Role Model Runtime/state` root
- live replay used exact model `moonshot/kimi-k2.7-code` with
  `x-role-model-requested-role-id: coder.review`; response still hit `finish_reason: "length"`
  because the probe intentionally capped `max_tokens` at `80`, but the routing failure itself is
  fixed
