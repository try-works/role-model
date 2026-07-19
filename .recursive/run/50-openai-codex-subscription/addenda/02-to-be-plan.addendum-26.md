Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `02 To-Be Plan`
Status: `DRAFT`
Addendum: `26`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-26.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-26.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/03-implementation-summary.addendum-26.md`
- focused requested-role regressions
Scope note: add regression coverage for explicit requested roles on non-controller alias traffic, then make the bridge infer a compatible role task before router-core role filtering runs.

## Objective

Ensure alias-backed non-controller requests with `requestedRoleId` never keep an impossible
role/task pairing such as `coder.review + text.chat`.

## Implementation Plan

### Phase 1: RED regressions

1. add a focused `mapChatCompletionsRequest(...)` regression proving:
   - explicit `requestedRoleId: "coder.review"` on alias traffic currently preserves `text.chat`
   - the request should instead resolve to a role-compatible task
2. add a focused backend regression proving:
   - exact or alias-backed execution with `requestedRoleId: "coder.review"` no longer throws the
     blank chosen-endpoint 400

Acceptance:
- the focused regressions fail on the current code

### Phase 2: Bridge task coercion repair

1. add a bridge helper that resolves a task definition for explicit requested roles by:
   - keeping the current task when already compatible
   - falling back to the sole supported task when unambiguous
   - otherwise using message-aware heuristics to select among supported tasks
2. wire that helper into `applyRequestedRoleExecutionPolicy(...)`
3. keep the existing controller path intact so valid controller-selected tasks still win

Acceptance:
- requested multi-task roles always leave the bridge with a router-valid task
- `coder.review` can resolve to `json.schema_adherence` or `code.edit` based on request content

### Phase 3: Verification

1. rerun the focused bridge test slice green
2. rerun the focused backend execution regression green
3. if the source-launched runtime is already available on `3462`, replay the live header repro and
   verify it no longer returns the blank chosen-endpoint error

Acceptance:
- RED and GREEN evidence are captured under run 50
- live replay no longer fails with empty chosen-endpoint routing

