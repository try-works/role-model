Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `02 To-Be Plan`
Status: `DRAFT`
Addendum: `10`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-10.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- live runtime evidence on `http://127.0.0.1:3461`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-10.md`
- future controller-budget regression test and production patch
Scope note: This addendum fixes the live controller truncation path that still surfaces as `invalid-controller-output` after the strategy-compatibility layer landed.

## Objective

Add RED-first regression coverage for controller-response truncation, increase the bounded controller output budget, then rebuild and relaunch the runtime to re-check live `controller.remote-only` fallback behavior.

## Implementation Plan

### Phase 1: RED truncation regression

1. extend `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
2. add a runtime-backed controller test with a scripted remote vendor that:
   - detects controller requests
   - returns empty `content` with `finish_reason: "length"` when the bridge sends the old low output budget
   - returns valid compact JSON when the bridge sends a larger bounded budget
3. assert the request observation preserves accepted controller directives and avoids `fallbackReason: "invalid-controller-output"`

Acceptance:
- the new test fails against the old `256` controller budget

### Phase 2: Production patch

1. update `/role-model-router/apps/runtime-host-bridge/src/index.ts`
2. raise the controller execution `maxOutputTokens` budget from `256` to a larger bounded value that fits the current live prompt envelope
3. keep the controller request deterministic and bounded; do not uncap output

Acceptance:
- the new truncation regression passes
- existing controller compatibility regressions remain green

### Phase 3: Verification and relaunch

1. rerun the focused runtime-host-bridge tests
2. rebuild runtime UI and bridge assets if needed
3. relaunch the same `run50-manual-oauth` runtime state on port `3461`
4. issue fresh `controller.remote-only` requests
5. inspect request details for:
   - lower or zero `invalid-controller-output`
   - populated `acceptedDirectives`
   - any remaining timeout-only fallbacks tracked separately

Acceptance:
- live `invalid-controller-output` fallbacks drop materially after relaunch
- any remaining controller issues are narrowed to timeout or policy behavior, not empty parsed output
