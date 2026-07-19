Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `02 To-Be Plan`
Status: `DRAFT`
Addendum: `09`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-09.md`
- `/role-model-router/apps/runtime-host-bridge/src/controller-routing-contract.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- live runtime request-detail evidence on `http://127.0.0.1:3461`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-09.md`
- future controller compatibility tests and production patch
Scope note: This addendum salvages live controller output that uses adjacent strategy vocabulary so `controller.remote-only` can preserve intent instead of falling back to `invalid-controller-output`.

## Objective

Add a bounded compatibility layer for known controller strategy aliases, prove it with RED-first regression coverage, then rebuild and relaunch the runtime to re-check live `controller.remote-only` behavior.

## Implementation Plan

### Phase 1: RED contract tests

1. extend `/role-model-router/apps/runtime-host-bridge/test/controller-routing-contract.test.ts`
2. add failing tests for:
   - `capability_based` -> `quality`
   - `prefer-capability` -> `quality`
   - `remote_only` -> preserved `preferLocal: false`

Acceptance:
- current code fails the new expectations before production edits

### Phase 2: RED live request-path test

1. extend `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
2. add a runtime-backed or live-bridge regression where the controller vendor returns one of the loose strategy values
3. assert the persisted request detail records `acceptedDirectives` rather than `fallbackReason: "invalid-controller-output"`

Acceptance:
- the failure is locked at the real request path, not just the helper seam

### Phase 3: Compatibility patch

1. update `/role-model-router/apps/runtime-host-bridge/src/controller-routing-contract.ts`
2. add a normalization step that:
   - maps `capability_based` and `prefer-capability` to `quality`
   - maps `remote_only` to remote-preference guidance (`preferLocal: false`)
   - preserves existing strict handling for already-valid values
3. keep the allowlist discipline: only known compatibility aliases are remapped; unknown strategy strings still drop out

Acceptance:
- live controller guidance is salvaged only for explicit, bounded compat cases

### Phase 4: Verification and relaunch

1. run the targeted bridge test suites
2. rebuild the updated runtime if production code changes land
3. relaunch the runtime on the expected port
4. send fresh `controller.remote-only` requests and inspect persisted request details to confirm fallback drops and accepted directives appear

Acceptance:
- the runtime no longer reports `invalid-controller-output` for the known controller strategy aliases
