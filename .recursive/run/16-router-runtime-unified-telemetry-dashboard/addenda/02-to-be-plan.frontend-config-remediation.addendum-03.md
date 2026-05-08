Run: `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/`
Phase: `02 To-Be Plan`
Status: `LOCKED`
LockedAt: `2026-05-08T06:28:34Z`
LockHash: `9ad4b14012c0316b593dd206aa893451ae25d99dee84515aac10356970e04eba`
Workflow version: `recursive-mode-audit-v1`
Addendum: `03`
Inputs:
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/02-to-be-plan.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/00-requirements.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/addenda/02-to-be-plan.audit-findings.addendum-01.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/addenda/02-to-be-plan.audit-remediation.addendum-02.md`
- verified runtime-ui control-surface state from:
  - `/role-model-router/apps/runtime-ui/app/routes/providers.tsx`
  - `/role-model-router/apps/runtime-ui/app/routes/accounts.tsx`
  - `/role-model-router/apps/runtime-ui/app/routes/endpoints.tsx`
  - `/role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
  - `/role-model-router/apps/runtime-ui/app/routes/control-controller.tsx`
- verified backend config/control state from:
  - `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/validate-ui.ts`
- user scope decision: update the remediation plan with the corresponding frontend/vendor-configuration fixes, strict TDD, and browser verification
Outputs:
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/addenda/02-to-be-plan.frontend-config-remediation.addendum-03.md`
Scope note: This addendum records a newly confirmed control-surface asymmetry in the current runtime UI. Remote onboarding flows are live for provider accounts, device OAuth, endpoint activation, and controller assignment, but local llama-swap configuration and the underlying unified runtime config remain startup-derived rather than operator-editable, and `Control > Models` still behaves as an observational modal rather than a true mutation surface. This addendum converts that gap into an explicit remediation plan without reopening the telemetry work that is already implemented.

## TODO

- [x] Record the currently working remote control-plane flows
- [x] Record the confirmed local/runtime-config wiring gap
- [x] Define strict-TDD remediation slices for backend config control and frontend route ownership
- [x] Define browser-backed proof for local + remote configuration behavior
- [x] Reconcile this correction with the earlier run-16 audit/remediation addenda
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Confirmed Current State

### Live today and must be preserved

- `Providers` is a real catalog/onboarding surface that deep-links into account setup and endpoint activation.
- `Accounts` is a real mutation surface for:
  - provider-account persistence
  - allowed-model selection
  - model-role bindings
  - device OAuth start/poll for the supported Moonshot/Kimi variant slice
- `Endpoints` is a real mutation surface for endpoint activation from configured provider accounts.
- `Control > Controller` is a real mutation surface for controller assignment.
- `Control > Models` is a real unified local+remote inventory and detail surface.

### Confirmed gap that still blocks an honest “fully wired” closeout

- there is no role-model-owned API for reading and mutating the normalized unified runtime config
- local llama-swap model definitions and process settings still come from `runtime-config.yaml` at bridge startup rather than from an operator-editable repo-owned UI flow
- LiteLLM provider mappings and process settings are likewise parsed internally from unified runtime config but are not exposed through a repo-owned configuration mutation surface
- `Control > Models` exposes a `Settings` affordance, but the modal is observational and does not persist model/runtime changes
- `Endpoints` activates already-configured accounts/models but does not solve the missing local/runtime-config editing path
- there is no automated or browser-backed proof that an operator can change supported local/remote vendor configuration inside the app and then continue through account/OAuth/endpoint flows without dropping back to manual YAML edits
- current browser evidence for `Control > Models` is not trustworthy yet because the route can fail with a controller `500` when the runtime-config editor leaves the bridge in a valid zero-endpoint `decision_only` state

## Requirement Reconciliation

### `R4` Design-system-first frontend delivery

Current disposition: `partially complete`

Confirmed correction:

- the telemetry design-system work landed, but there is still no explicit design-system route contract for mutation-capable runtime-config control surfaces
- if run 16 closes out claiming the frontend is “wired to vendor configuration,” the repo must first define where local runtime config editing lives, where remote provider mapping editing lives, and how those flows relate to the existing Accounts / Endpoints / Models surfaces

Required plan adjustment:

- update `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md` before implementing any new control-surface route or mutation-capable modal
- route ownership must stay explicit:
  - `Providers`: provider catalog and deep-link entry only
  - `Accounts`: provider-account persistence and device OAuth
  - `Endpoints`: endpoint activation
  - `Control > Models`: unified inventory plus explicit edit handoff, not a fake save surface
  - `Control > Runtime Config` (new route): local llama-swap config and LiteLLM provider/process config

### `R5` Coherent telemetry dashboard and inspection experience

Current disposition: `partially complete`

Confirmed correction:

- the telemetry dashboard itself is unified, but the surrounding operator workflow is still split between:
  - repo-owned UI for remote account/OAuth/endpoint actions
  - manual unified-runtime YAML edits for local vendor config and LiteLLM provider/process config
- this means the repo-owned runtime UI is not yet one coherent operator flow for configuring the supported local + remote runtime slice that feeds the dashboard

Required plan adjustment:

- add one repo-owned runtime-config control path so operators can configure the supported local llama-swap slice and the supported LiteLLM provider-mapping slice without editing YAML manually
- make `Control > Models` honest by either:
  - converting it into a mutation-capable settings surface backed by the new config API, or
  - changing it to a drill-in/read surface with explicit “Edit runtime config” / “Edit account” handoff actions

### `R7` Automated validation and browser-backed QA

Current disposition: `partially complete`

Confirmed correction:

- current validation proves telemetry parity and remote account/endpoint onboarding, but not runtime-config editing symmetry
- there is no browser-backed evidence that an operator can edit local config, edit remote provider config, run account/OAuth/endpoint flows, and then still see the unified dashboard reflect the resulting local + remote runtime state

Required plan adjustment:

- extend automated validation to cover the new runtime-config contract and route-level flow ownership
- add browser-backed proof for the control flow, not only for the dashboard pages

### Carry-forward rules for `R1`, `R2`, `R3`, and `R6`

- do not regress or reopen the already-completed canonical telemetry contract, request-detail repair, telemetry SSE path, or browser/API telemetry proof except where the new config-control work must demonstrate that those surfaces still behave correctly after configuration changes
- the new control work remains scoped to the currently supported local llama-swap and remote LiteLLM/Moonshot/Kimi slice; it does not widen run 16 into a broader vendor-family expansion

## Additional Remediation Slices

1. **SP12. Unified runtime-config control contract**
   - Add RED coverage first for:
     - reading the normalized unified runtime config through a role-model-owned API rather than only from backend startup code
     - writing validated llama-swap model/process settings through that API
     - writing validated LiteLLM provider mappings and process settings through that API
     - preserving advanced fields on round-trip:
       - llama-swap model `path`, `contextWindow`, `command`, `proxyBaseUrl`, `checkEndpoint`, `useModelName`
       - process `command`, `args`, `env`, `cwd`, `startupTimeoutMs`
       - LiteLLM `apiKeyRef`, `modelMappings`, and nested `litellmParams`
     - returning a typed apply result that proves whether the save has been applied to the live bridge state
   - Repair targets:
     - `role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
     - `role-model-router/apps/runtime-host-bridge/test/unified-runtime-config.test.ts`
     - `role-model-router/apps/runtime-host-bridge/test/backend-unified-runtime-config.test.ts`
     - `role-model-router/apps/runtime-host-bridge/src/index.ts`
     - `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
     - `role-model-router/apps/runtime-host-bridge/src/validate-ui.ts`
     - `role-model-router/apps/runtime-host-bridge/test/validate-ui.test.ts`
   - Goal:
     - expose a role-model-owned runtime-config read/write contract for the supported local + remote vendor slice instead of requiring manual YAML edits

2. **SP13. Design-system-led config/editor delivery**
   - Before route implementation, update `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md` to define:
     - route ownership for runtime-config editing
     - shared layout primitives for local vendor config, remote provider mapping config, and explicit edit handoff from model inventory
     - light/dark token usage and narrow/mobile behavior for the new control surface
   - Add RED coverage first for:
     - `runtime-api` support for the runtime-config read/write API
     - a validate-ui contract that proves the control-plane flow includes:
       - provider catalog discovery
       - runtime-config discovery/editing
       - account persistence and OAuth
       - endpoint activation
       - controller/model visibility after config changes
     - honest route behavior for `Control > Models`, so it no longer presents a faux-settings affordance with no persistence path
   - Repair targets:
     - `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
     - `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
     - `role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`
     - `role-model-router/apps/runtime-ui/app/routes/providers.tsx`
     - `role-model-router/apps/runtime-ui/app/routes/accounts.tsx`
     - `role-model-router/apps/runtime-ui/app/routes/endpoints.tsx`
     - `role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
     - `role-model-router/apps/runtime-ui/app/routes/control-controller.tsx`
     - `role-model-router/apps/runtime-ui/app/routes/control-runtime-config.tsx` (new route)
   - Goal:
     - make the runtime UI truthful and operator-complete for the currently supported local + remote configuration slice

3. **SP14. End-to-end config + telemetry proof**
   - Add RED coverage first for:
     - a validator slice that fails when runtime-config edits are unavailable or do not change the backend-visible state
     - a validator slice that proves config changes are reflected in runtime summary, model inventory, and endpoint/controller candidates
     - a validator slice that proves the post-config local + remote execution path still records unified telemetry
   - Required proof sequence:
     1. read the starting runtime config through the role-model API
     2. save at least one local llama-swap configuration change through the role-model API/UI
     3. save at least one remote LiteLLM provider-mapping or process change through the role-model API/UI
     4. confirm the updated config is reflected in live bridge-readable state
     5. continue through the repo-owned control flow:
        - provider catalog / variant selection
        - account save or OAuth device flow
        - endpoint activation
     6. execute one local request and one remote request through the updated runtime slice
     7. confirm unified telemetry summary / rows / requests and dashboard/request views still show both source types together
   - Repair targets:
     - `role-model-router/apps/runtime-host-bridge/src/validate-ui.ts`
     - `role-model-router/apps/runtime-host-bridge/test/validate-ui.test.ts`
     - `role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
     - any run-owned evidence/receipt files that describe the final control-plane verification
   - Goal:
     - prove the repo-owned app can configure the supported local + remote runtime slice and still feed the unified telemetry dashboard honestly

## Browser Verification Plan

Browser verification is required for this correction because the gap is about operator workflow truthfulness, not just backend contract shape.

Required browser-backed checks:

1. open the runtime UI and confirm the new runtime-config route is reachable from the intended control navigation
2. verify the runtime-config surface at desktop width:
   - local llama-swap settings are editable
   - remote LiteLLM provider/process settings are editable
   - save/apply state is explicit and honest
3. verify narrow/mobile width for the runtime-config surface
4. verify light and dark theme behavior for the runtime-config surface
5. from the same browser-backed session, continue through:
   - `Providers`
   - `Accounts`
   - `Endpoints`
   - `Control > Models`
   - `Control > Controller`
6. confirm the UI no longer implies that `Control > Models` can save settings unless a real persistence path exists
7. confirm `Control > Models` and `Control > Controller` render an honest empty/unassigned state instead of a `500` when no endpoints are configured yet
8. after saving config changes, execute one local request and one remote request and confirm the unified dashboard/request surfaces still show both source types without reload regressions

Required browser artifacts:

- runtime-config desktop screenshot
- runtime-config narrow/mobile screenshot
- account/OAuth state screenshot
- endpoint activation screenshot
- model inventory screenshot after config changes
- model inventory screenshot in the zero-endpoint pre-activation state
- dashboard screenshot after local + remote post-config requests
- any structured artifact needed to prove the saved config was applied to the live runtime state

## Validation Plan

- Focused RED/GREEN backend validation:
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/unified-runtime-config.test.ts test/backend-unified-runtime-config.test.ts test/index.test.ts test/validate-ui.test.ts test/validate-vendors.test.ts`
- Focused frontend validation:
  - `corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/lib/runtime-api.test.ts app/lib/view-models.test.ts app/lib/design-system.test.ts`
- Focused builds:
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge build`
  - `corepack pnpm --filter @role-model-router/runtime-ui build`
- End-to-end validator path:
  - `corepack pnpm run runtime:validate-ui`
  - `corepack pnpm run runtime:validate-vendors`
- Direct API proof after the implementation lands:
  - `GET /api/role-model/runtime/config`
  - config write/apply call through the new runtime-config API
  - `GET /api/role-model/runtime/summary`
  - `GET /api/role-model/providers`
  - `GET /api/role-model/accounts`
  - `GET /api/role-model/endpoints`
  - `GET /api/role-model/telemetry/summary`
  - `GET /api/role-model/telemetry/rows`
  - `GET /api/role-model/telemetry/requests`
- Browser verification commands:
  - `browser-use open http://127.0.0.1:<port>/app`
  - browser-side navigation, save/apply interactions, and screenshots for the new config/editor flow

## Receipt And Closeout Expectations

- `03-implementation-summary.md` must distinguish:
  - telemetry remediation already completed
  - new runtime-config control contract work
  - UI route ownership / design-system alignment work
  - browser-backed proof for config + telemetry continuity
- `04-test-summary.md` must separate:
  - runtime-config RED/GREEN evidence
  - control-plane validator evidence
  - post-config local + remote telemetry proof
  - browser verification
- `05-manual-qa.md` must explicitly record the config-editor/browser flow and whether the apply behavior was live, reload-based, or restart-mediated

## Effective-Input Rule For Later Phases

Until superseded by a later locked addendum, later phases for run 16 must treat this file as an authoritative effective input together with:

- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/00-requirements.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/02-to-be-plan.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/addenda/02-to-be-plan.audit-findings.addendum-01.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/addenda/02-to-be-plan.audit-remediation.addendum-02.md`

This addendum narrows a newly confirmed implementation/truthfulness gap. It does **not** widen run 16 into a new vendor-family or secret-storage redesign.

## Traceability

- `R4` -> `## Requirement Reconciliation` (`R4`) and `## Additional Remediation Slices` (`SP13`) | Evidence: route ownership and design-system-first delivery are now explicit for runtime-config editing
- `R5` -> `## Requirement Reconciliation` (`R5`) and `## Additional Remediation Slices` (`SP12`, `SP13`, `SP14`) | Evidence: one coherent operator flow now requires repo-owned config editing rather than manual YAML edits
- `R7` -> `## Requirement Reconciliation` (`R7`) and `## Browser Verification Plan` | Evidence: validation/browser proof now covers config symmetry plus post-config telemetry continuity
- `R2` -> `## Additional Remediation Slices` (`SP14`) | Evidence: post-config proof must still execute and display one supported local request and one supported remote request together

## Coverage Gate

- [x] The addendum records the confirmed live control-plane surfaces and the missing config-editing surface
- [x] The remediation work is specific about backend contract, frontend ownership, and browser proof
- [x] Strict TDD is preserved for the new remediation slices
- [x] The new plan stays scoped to the supported local + remote runtime slice
- [x] The addendum does not reopen already-completed telemetry work unnecessarily

Coverage: PASS

## Approval Gate

- [x] The addendum is consistent with the original requirements and earlier run-16 addenda
- [x] The new work is concrete enough to implement and verify
- [x] The browser verification obligations are specific and reproducible
- [x] Later phases can treat this file as an authoritative effective input

Approval: PASS
