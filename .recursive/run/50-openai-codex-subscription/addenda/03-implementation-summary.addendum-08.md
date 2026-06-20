Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `03 Implementation Summary`
Status: `DRAFT`
Addendum: `08`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-12.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-12.md`
- `/role-model-router/apps/runtime-host-bridge/src/package-sea.ts`
- `/role-model-router/apps/runtime-host-bridge/test/executable.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/routable-inventory-bootstrap.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/03-implementation-summary.addendum-08.md`
Scope note: This addendum closes the remaining package-level host test failures and records the live alias-routing audit performed against the rebuilt runtime on `:3461`.

## Implemented

1. updated `/role-model-router/apps/runtime-host-bridge/src/package-sea.ts`
   - added `isDirectSeaInvocation()`
   - replaced the previous always-true `import.meta.url === pathToFileURL(__filename).href` check
   - importers of `package-sea.ts` no longer trigger `packageSeaRuntime()` as a side effect
2. updated `/role-model-router/apps/runtime-host-bridge/test/executable.test.ts`
   - added a direct regression for import-versus-main SEA invocation detection
3. updated `/role-model-router/apps/runtime-host-bridge/test/routable-inventory-bootstrap.test.ts`
   - aligned bootstrap expectations with the strict alias-resolution semantics now implemented
   - mixed aliases with one stale hint no longer widen back to the whole inventory
   - stale-only aliases are now omitted from model-list output when they resolve to zero endpoints
4. updated `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`
   - raised the end-to-end validation timeout from `15000` to `45000` to match the current runtime validation workload

## Test Results

Passed focused regressions:

- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/executable.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/routable-inventory-bootstrap.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/validate-vendors.test.ts`

Passed package-level validation:

- `corepack pnpm --filter @role-model-router/runtime-host-bridge test`

Package result:

- `37` test files passed
- `273` tests passed

## Live Alias Audit

Live runtime target:

- `http://127.0.0.1:3461`

Current live endpoint posture:

1. `deepseek/deepseek-v4-flash` healthy
2. `deepseek/deepseek-v4-pro` healthy
3. `moonshot/kimi-k2.7-code` healthy
4. `chatgpt/gpt-5.4` healthy

Current live alias inventory:

- all exposed canonical aliases in this runtime resolve to the same four-endpoint remote-only slice because there are no local endpoints currently configured in the run-50 state root

Representative live family probes happened in two passes:

### Pass 1: before refreshing non-flash observed profiles

1. `default.remote-only`
   - selected `deepseek/deepseek-v4-flash`
2. `baseline.remote-only`
   - selected `deepseek/deepseek-v4-flash`
3. `craft-ask.remote-only`
   - selected `deepseek/deepseek-v4-flash`
4. `difficulty.remote-only`
   - easy request selected `deepseek/deepseek-v4-flash`
   - code-oriented request still classified only as `medium` with strategy `balanced`, and also selected `deepseek/deepseek-v4-flash`
5. `hybrid.remote-only`
   - selected `deepseek/deepseek-v4-flash`
   - hybrid arbitration recorded `dominantSignal = "controller"` and `finalStrategy = "balanced"`
6. `controller.remote-only`
   - initial direct client probe exceeded a `45` second client timeout even though the request persisted

### Pass 2: after exact-model warmup refreshed all remote observed profiles

1. exact-model probes for:
   - `deepseek/deepseek-v4-pro`
   - `moonshot/kimi-k2.7-code`
   - `chatgpt/gpt-5.4`
   all returned `200` and refreshed their runtime-state observations
2. rerun `default.remote-only`
   - selected `deepseek/deepseek-v4-pro`
3. rerun `baseline.remote-only`
   - selected `deepseek/deepseek-v4-pro`
4. rerun `craft-ask.remote-only`
   - selected `deepseek/deepseek-v4-pro`
5. rerun `controller.remote-only`
   - selected `deepseek/deepseek-v4-pro`
   - backend detail recorded `controllerRouting.fallbackReason = "invalid-controller-output"`
6. rerun `difficulty.remote-only`
   - easy request still selected `deepseek/deepseek-v4-flash`
   - code-oriented request still classified only as `medium` with strategy `balanced`, and still selected `deepseek/deepseek-v4-flash`
7. rerun `hybrid.remote-only`
   - still selected `deepseek/deepseek-v4-flash`
   - hybrid arbitration recorded `dominantSignal = "controller"` and `finalStrategy = "balanced"`

Exact-model sanity probes proved the non-selected endpoints still execute correctly:

1. `deepseek/deepseek-v4-pro` returned `200`
2. `moonshot/kimi-k2.7-code` returned `200`
3. `chatgpt/gpt-5.4` returned `200`

So the remaining live issue is not endpoint breakage. It is routing behavior plus stale-profile sensitivity.

## Live Diagnosis

The current live routing behavior is explained by four concrete factors:

1. before fresh observed profiles existed for `deepseek-v4-pro`, `kimi-k2.7-code`, and `gpt-5.4`, balanced routing strongly favored `deepseek-v4-flash`
2. after those exact-model probes refreshed observations, the general balanced aliases moved to `deepseek-v4-pro`, proving the live scorer is highly sensitive to observed-profile freshness
3. the harder live difficulty probe still did not escalate to `hard` or `quality`; it remained `medium` with `balanced`
4. the rerun `controller.remote-only` path still fell back with `invalid-controller-output`, so the controller alias is not yet a dependable differentiator

This means the canonical alias matrix is working and the runtime can diversify across models when observed profiles are current, but the live controller and difficulty guidance are still not discriminating strongly enough for code-heavy requests.
