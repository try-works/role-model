Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `03 Implementation Summary`
Status: `DRAFT`
Addendum: `25`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-25.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-25.md`
- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/unified-runtime-config.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/backend-unified-runtime-config.test.ts`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/03-implementation-summary.addendum-25.md`
- legacy alias compatibility regressions
- startup rewrite fix for persisted runtime config
Scope note: remove the stale `craft-ask.*` alias family from runtime config parse, startup materialization, persisted YAML, and live operator readback.

## Summary

1. extended unified-runtime alias compatibility so `craft-ask.*` is treated as a legacy primary
   alias family alongside `mixed.local-remote`
2. canonicalized legacy alias ids during parse for multi-alias payloads and merged duplicates by
   canonical alias id
3. taught startup to rewrite the unified runtime config immediately when the raw config text still
   contains legacy alias markers, even when no later alias re-materialization delta exists
4. restarted `3462` and verified that the live model list, runtime-config API, and persisted YAML
   no longer expose `craft-ask.*`

## Files Changed

- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/unified-runtime-config.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/backend-unified-runtime-config.test.ts`

## RED Evidence

- `/.recursive/run/50-openai-codex-subscription/evidence/logs/red/addendum-25-legacy-alias-scrub.red.log`

Observed failures:

- multi-alias parse still returned `craft-ask.remote-only`
- startup left `craft-ask.decision-only`, `craft-ask.hybrid`, and `craft-ask.remote-only` in the
  persisted YAML when no further alias re-materialization was needed

## GREEN Evidence

- `/.recursive/run/50-openai-codex-subscription/evidence/logs/green/addendum-25-legacy-alias-scrub.green.log`
- `/.recursive/run/50-openai-codex-subscription/evidence/logs/green/addendum-25-live-3462-alias-matrix.green.log`

Passing slice:

- focused config regressions now fold `craft-ask.remote-only` into `default.remote-only`
- focused backend regressions now remove legacy `craft-ask.*` rows from startup config materialization
- startup now rewrites a fully populated legacy matrix file even when alias re-materialization would
  otherwise be a no-op
- live `http://127.0.0.1:3462/v1/models` no longer exposes any `craft-ask.*` ids
- live `http://127.0.0.1:3462/api/role-model/runtime/config` and the persisted YAML now both show
  only the canonical alias matrix

## Verification Notes

- targeted alias regressions were rerun green
- live runtime was restarted from `src/cli-entry.ts` in the run-50 worktree against the existing
  `%LOCALAPPDATA%/Role Model Runtime/state` root
- `runtime-host-bridge` TypeScript build is still blocked in this worktree by unrelated hosted
  web-search and tool-loop typing errors outside this alias slice, so live verification used the
  source-launched bridge rather than a green package build

