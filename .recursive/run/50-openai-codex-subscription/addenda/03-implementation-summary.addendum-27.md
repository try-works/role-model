Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `03 Implementation Summary`
Status: `DRAFT`
Addendum: `27`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-27.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-27.md`
- `/role-model-router/apps/runtime-host-bridge/src/validate-ui.ts`
- `/role-model-router/apps/runtime-host-bridge/test/validate-ui.test.ts`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/03-implementation-summary.addendum-27.md`
- focused validate-ui cleanup regression
- validator teardown fix
Scope note: repair validator cleanup so `runtime:validate-ui` exits cleanly and can clear the last explicit Phase 3 harness blocker.

## Summary

1. added a focused validator-cleanup regression covering the missing backend shutdown path
2. added `cleanupRuntimeUiValidationResources(...)` in `src/validate-ui.ts`
3. wired validator teardown to close the bridge server and then shut down the runtime backend
4. reran `runtime:validate-ui` and confirmed it now exits `0` after printing the validation
   payload instead of hanging behind a surviving managed vendor child

## Files Changed

- `/role-model-router/apps/runtime-host-bridge/src/validate-ui.ts`
- `/role-model-router/apps/runtime-host-bridge/test/validate-ui-cleanup.test.ts`
- `/role-model-router/apps/runtime-host-bridge/package.json`

## RED Evidence

- `/.recursive/run/50-openai-codex-subscription/evidence/logs/red/addendum-27-validate-ui-cleanup.red.log`

Observed failures:

- the new cleanup regression failed because `cleanupRuntimeUiValidationResources` did not exist
- live `runtime:validate-ui` reached its JSON result payload but still kept the process alive

## GREEN Evidence

- `/.recursive/run/50-openai-codex-subscription/evidence/logs/green/addendum-27-validate-ui-cleanup.green.log`
- `/.recursive/run/50-openai-codex-subscription/evidence/logs/green/addendum-27-runtime-validate-ui.green.log`

Passing slice:

- focused cleanup regression now proves validator teardown closes the server before backend shutdown
- `corepack pnpm run runtime:validate-ui` now exits successfully after printing the runtime/UI
  validation payload

## Verification Notes

- the prior live process-tree inspection showed the old hang came from an unclosed backend-managed
  `llama-swap.exe` child rather than from validator scenario execution itself
- after the fix, the validator command returned `0` and no longer required manual process cleanup
