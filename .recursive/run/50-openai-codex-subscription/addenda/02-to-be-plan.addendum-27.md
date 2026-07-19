Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `02 To-Be Plan`
Status: `DRAFT`
Addendum: `27`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-27.md`
- `/role-model-router/apps/runtime-host-bridge/src/validate-ui.ts`
- `/role-model-router/apps/runtime-host-bridge/test/validate-ui.test.ts`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-27.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/03-implementation-summary.addendum-27.md`
- focused validate-ui cleanup regression
Scope note: add targeted coverage for validator resource cleanup, then make `runtime:validate-ui` shut down its backend after the HTTP server closes.

## Objective

Make `corepack pnpm run runtime:validate-ui` finish with a real process exit so Phase 3 no longer
depends on a timed-out harness workaround.

## Implementation Plan

### Phase 1: RED regression

1. add a focused `validate-ui` cleanup regression proving the validator teardown path must call
   backend shutdown after server close

Acceptance:
- the focused regression fails on the current code

### Phase 2: Cleanup fix

1. add a small validator cleanup helper or equivalent teardown path in `src/validate-ui.ts`
2. ensure the helper closes the HTTP server and then shuts down the runtime backend
3. keep cleanup tolerant when `backend.shutdown` is absent

Acceptance:
- focused cleanup regression passes

### Phase 3: Harness verification

1. rerun `corepack pnpm run runtime:validate-ui`
2. verify it prints the result payload and exits successfully without leaving managed vendor
   children behind
3. update the Phase 3 receipt so the old hanging-harness blocker is cleared

Acceptance:
- `runtime:validate-ui` exits `0`
- Phase 3 no longer needs a harness-replacement caveat for this blocker

