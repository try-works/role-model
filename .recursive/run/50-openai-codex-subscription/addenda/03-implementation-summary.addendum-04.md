Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `03 Implementation Summary`
Status: `DRAFT`
Addendum: `04`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-06.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-06.md`
- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/unified-runtime-config.test.ts`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/03-implementation-summary.addendum-04.md`
Scope note: This addendum covers the controller default-timeout fix, the supporting regression tests, and the subsequent live validation findings against the rebuilt runtime.

## Implemented

1. introduced a shared controller default timeout constant:
   - `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
   - `DEFAULT_UNIFIED_RUNTIME_CONTROLLER_TIMEOUT_MS = 5000`
2. updated unified runtime controller config normalization to use the shared default
3. updated persisted controller assignment fallback in:
   - `/role-model-router/apps/runtime-host-bridge/src/index.ts`
   so runtime-promoted controller config also uses the shared default instead of a hardcoded `1500ms`
4. added parser-level regression coverage in:
   - `/role-model-router/apps/runtime-host-bridge/test/unified-runtime-config.test.ts`
   proving omitted controller timeout fields inherit the shared default

## Test Results

Passed:

- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts -t "uses the default controller timeout budget for realistic remote controller latency"`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/unified-runtime-config.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/openai-codex-subscription-matrix.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts -t "keeps Kimi Code and DeepSeek coding endpoints coder.patch-eligible from the tracked catalog"`
- `corepack pnpm --filter @role-model-router/provider-openai exec vitest run`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge build`
- `corepack pnpm --filter @role-model-router/runtime-ui build`

## Live Runtime Verification

Runtime rebuilt and relaunched successfully from source entrypoint:

- port: `3461`
- state root: `C:/Users/erikb/AppData/Local/Temp/role-model-run50-manual-oauth`
- scope id: `run50-manual-oauth`

Verified after restart:

1. session bootstrap rehydrated all three provider accounts
2. remote health probe marked DeepSeek Flash, DeepSeek Pro, and Kimi healthy
3. alias inventory for `controller.remote-only` includes OpenAI, DeepSeek, and Kimi endpoints

## Remaining Live Issue

The controller timeout regression is fixed in the sense that live routing no longer reports `controller-timeout`. New live request artifacts now report:

- `routingDiagnostics.controllerRouting.fallbackReason = "invalid-controller-output"`

Direct probing of the controller model shows it often emits JSON that is semantically close to the requested contract but uses looser values such as:

- `strategy: "capability_based"`
- `strategy: "prefer-capability"`
- `strategy: "remote_only"`

Because the bridge rejects the live controller output, routing still falls back to observed-data scoring and continues to over-select DeepSeek Flash for recent coding and general requests.

## Conclusion

This addendum closes the controller timeout defect but not the full live routing validation objective. The next required fix is a controller-output compatibility pass so valid-but-looser controller JSON is accepted and can influence endpoint selection across Kimi, DeepSeek, and OpenAI.
