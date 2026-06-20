Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `02 To-Be Plan`
Status: `DRAFT`
Addendum: `25`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-25.md`
- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-25.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/03-implementation-summary.addendum-25.md`
- focused alias-compat regressions
Scope note: scrub legacy `craft-ask.*` alias ids from both parse-time config normalization and startup persistence, then re-verify the live `3462` operator runtime.

## Objective

Ensure the runtime only exposes the canonical routing alias matrix and rewrites any persisted
legacy `craft-ask.*` rows out of the runtime config on startup.

## Implementation Plan

### Phase 1: RED regressions

1. add a focused config regression proving multi-alias parse still leaks `craft-ask.remote-only`
2. add focused backend regressions proving startup must:
   - remove a lone persisted `craft-ask.remote-only`
   - remove `craft-ask.*` rows from a mostly canonical matrix
   - rewrite the YAML even when no further alias re-materialization is required

Acceptance:
- the focused regressions fail on the current code

### Phase 2: Alias compatibility scrub

1. classify `craft-ask.*` as legacy primary routing aliases
2. canonicalize legacy alias ids during config parse, not only for single-alias payloads
3. dedupe canonicalized alias rows by alias id so `craft-ask.*` folding cannot leave duplicate
   `default.*` entries
4. rewrite the unified runtime config at startup whenever the raw file text still contains legacy
   routing alias markers, even if the alias matrix is already otherwise complete

Acceptance:
- backend and unit regressions pass
- in-memory config and persisted config both remove `craft-ask.*`

### Phase 3: Live verification

1. restart the updated runtime on `http://127.0.0.1:3462`
2. verify `GET /v1/models` exposes only canonical aliases
3. verify `GET /api/role-model/runtime/config` exposes only canonical aliases
4. verify `%LOCALAPPDATA%/Role Model Runtime/state/runtime-config.yaml` is rewritten without
   `craft-ask.*`

Acceptance:
- no `craft-ask.*` ids remain in the live model list, runtime-config API, or persisted YAML

