Run: `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/`
Phase: `02 TO-BE Plan`
Status: `LOCKED`
LockedAt: `2026-05-17T02:55:15Z`
LockHash: `5e02a787536fb48eb30f82fd8a2ab512b8b1243b7831f8e59a09788c39c3c860`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/00-requirements.md`
- `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/00-worktree.md`
- `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/01-as-is.md`
Outputs:
- `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/02-to-be-plan.md`
Scope note: Defines the concrete implementation and verification plan for runtime-owned role policy, request-time execution policy, and design-system-first UI delivery.

## TODO

- [x] Break the work into runtime persistence, API, execution-policy, UI, and fixture-reduction slices.
- [x] Define strict RED/GREEN coverage for each slice.
- [x] Define runtime and browser end-to-end proof before implementation starts.

## Planned Outcome

Run `34` will convert runtime role policy into a backend-owned persistent control-plane surface, expose full-fidelity role and task policy editing to operators, keep model-role assignment as the live dynamic binding source, and then extend the request/execution path so the remaining full role fields are observably active. The runtime UI will gain a design-system-backed Roles surface and editable model-role workflow, while the touched frontend paths will stop relying on oversized fake runtime datasets.

## Implementation Strategy

### Slice A - Runtime-managed role/task policy persistence and validation

1. Add a runtime-owned persistent role-policy document under `runtimeStateRoot` (parallel to `local-policy.json`) containing:
   - `roleDefinitions`
   - `taskDefinitions`
2. Seed first-run defaults from repo-owned built-in defaults, not from frontend fixtures.
3. Add validation helpers for:
   - role definition required fields
   - unique role ids
   - unique task types
   - task allowlists referencing known role ids
4. Replace live `roleTaskFixture` consumption in runtime policy reads and routing inputs with the persisted role-policy state.

### Slice B - Backend role/task control-plane APIs

1. Expand `/api/role-model/roles` to return full-fidelity role definitions.
2. Add:
   - `GET /api/role-model/roles/:roleId`
   - `POST /api/role-model/roles`
   - `PUT /api/role-model/roles/:roleId`
   - `GET /api/role-model/tasks`
   - `PUT /api/role-model/tasks`
3. Add a repo-owned model-role assignment mutation surface for the model inventory workflow.
4. Update router-config policy-source reporting from `fixture+runtime` to honest runtime-owned provenance.

### Slice C - Request-time role targeting and Product Phase 2 enforcement

1. Add a request-time role targeting seam for chat/responses mapping so E2E requests can explicitly target a role.
2. Apply `default_system_instructions` into the live execution request message set.
3. Enforce `tool_policy` before provider execution:
   - reject tools when disabled
   - limit tools when in `limited` mode and `allowed_tools` is present
4. Add observable post-routing/post-execution handling for:
   - `output_contracts`
   - `safety_policy_refs`
5. Persist the applied role policy/effects into runtime diagnostics so Router/Observe surfaces can verify the active behavior.

### Slice D - Design-system-first UI update

1. Update the existing design system first:
   - add `Control > Roles`
   - change `Control > Models` from inspect-only to editable role-management posture
   - add shared role-editor and model-role-assignment interaction patterns
2. Only after the design-system update, implement:
   - a Roles page with list/detail/create/edit
   - task-to-role policy editing
   - assignment readback (models/endpoints per role)
   - model-side role assignment save flow

### Slice E - Frontend fixture and placeholder reduction

1. Keep production pages live-data-only with honest empty states.
2. Reduce oversized mocked frontend runtime datasets in touched tests.
3. Remove any touched fake model/endpoint fixtures that only exist to make UI tests or pages look populated when simpler local test doubles suffice.

## Planned Changes by File

- See `Planned File Surfaces` and `Implementation Strategy`.

## Implementation Steps

1. Deliver `Slice A` through `Slice E` in order, keeping design-system updates ahead of route implementation.
2. Preserve strict RED/GREEN TDD for each slice.
3. Finish with runtime and browser end-to-end verification.

## TDD Plan

TDD Mode: `strict`

### RED/GREEN slices

1. **Backend policy persistence**
   - failing host-bridge tests for missing runtime-managed role/task persistence and CRUD
2. **Router consumption**
   - failing host-bridge or protocol-routing tests proving persisted role/task policy changes affect routing
3. **Role-targeted execution**
   - failing host-bridge tests proving request-time role targeting and role-field enforcement
4. **Design system and navigation**
   - failing runtime-ui design-system tests for new Roles route and editable model-role contract
5. **Roles page and model assignment UI**
   - failing runtime-ui route/client tests for full role editing and model-side assignment
6. **Fixture-free honest states**
    - failing runtime-ui tests proving touched pages render empty/setup-needed states without fake runtime datasets

## Testing Strategy

- See `TDD Plan` and `Validation Plan`.

## Playwright Plan (if applicable)

- Not applicable. Browser proof for this run is owned by the existing runtime UI plus agent-operated QA rather than a new Playwright harness.

## Manual QA Scenarios

1. Reach `Control > Roles` from the runtime shell.
2. Create or edit a role through the live UI.
3. Save a model-side role binding through `Control > Models`.
4. Confirm the touched UI shows honest live data or honest empty states instead of placeholder runtime records.

## Idempotence and Recovery

- Runtime-owned role policy should survive bridge restart through `runtimeStateRoot\role-policy.json`.
- Re-running the role/task save flows should update the same runtime-owned policy document rather than create duplicate records.
- If the host validator fails, preserve the failure boundary in a root-cause artifact before fixing it.

## Implementation Sub-phases

- SP1: runtime-owned role/task persistence and validation
- SP2: role/task and model-role control-plane APIs
- SP3: request-time role execution policy
- SP4: design-system-first Roles/Models UI
- SP5: touched frontend fixture reduction
- SP6: runtime and browser end-to-end verification

## Validation Plan

### Focused automated verification

- `corepack pnpm --filter @role-model-router/runtime-host-bridge test`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge build`
- `corepack pnpm --filter @role-model-router/runtime-ui test`
- `corepack pnpm --filter @role-model-router/runtime-ui build`

### Runtime E2E verification

At minimum, prove this live flow:

1. create a custom role
2. update task allowlist to permit the role for a target task
3. assign the role to a configured model from the model-management workflow
4. send a role-targeted request through the running runtime
5. confirm router policy-source, candidate binding, and decision detail reflect the role
6. confirm execution diagnostics/captures reflect:
   - applied default instructions
   - applied tool policy
   - applied output-contract and safety-policy handling

### Browser E2E verification

At minimum, prove:

1. Roles page is reachable from the runtime shell
2. role create/edit works through the UI
3. model-side role assignment save flow works
4. honest empty/setup-needed states appear without fake seeded frontend runtime data

## Planned File Surfaces

- `.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/test/`
- `role-model-router/apps/runtime-ui/app/lib/design-system.ts`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `role-model-router/apps/runtime-ui/app/routes.ts`
- `role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
- `role-model-router/apps/runtime-ui/app/routes/`
- `role-model-router/packages/core/src/router.ts`

## Risks And Controls

- **Risk:** request-time role targeting could drift from the router contract  
  **Control:** keep `requestedRoleId` on the existing `RoutingRequest` seam and verify through router decision diagnostics

- **Risk:** model-side assignment semantics may be ambiguous when multiple accounts expose the same model id  
  **Control:** make the assignment API explicit about which account bindings it mutates and surface that readback in the UI

- **Risk:** Product Phase 2 fields become only partially active  
  **Control:** add direct failing tests for each remaining field and persist applied-policy diagnostics in observations

- **Risk:** frontend fixture reduction becomes vague cleanup work  
  **Control:** constrain it to touched production pages plus touched tests and require browser proof of honest empty states

## Traceability

- `R1` -> `Slice A` plans runtime-managed role/task persistence and runtime-owned policy reads.
- `R2` -> `Slice B` plans full-fidelity role/task APIs.
- `R3` -> `Slice B` and `Slice D` plan model-role assignment mutation plus editable Models UI.
- `R4` -> `Slice C` plans request-time application of the remaining router-consumed role policy behavior.
- `R5` -> `Slice C` explicitly plans `default_system_instructions`, `tool_policy`, `output_contracts`, and `safety_policy_refs`.
- `R6` -> `Slice D` preserves design-system-first sequencing and the new Roles route.
- `R7` -> `Slice E` bounds fixture and placeholder reduction to touched production pages and tests.
- `R8` -> `TDD Plan` defines strict RED/GREEN slices.
- `R9` -> `Validation Plan` defines runtime and browser end-to-end proof.

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `e7add7780adfd9969d549c9edbda1cee86b43531`
- Comparison reference: `working-tree`
- Normalized baseline: `e7add7780adfd9969d549c9edbda1cee86b43531`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only e7add7780adfd9969d549c9edbda1cee86b43531`
- Expected product/worktree paths:
  - `.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/`
  - `role-model-router/apps/runtime-host-bridge/`
  - `role-model-router/apps/runtime-ui/`
  - `role-model-router/packages/core/`
- Planned out-of-scope protection:
  - do not widen into unrelated packaging, vendor refresh, or repo-wide formatting work

## Requirement Completion Status

- R1 | Status: deferred | Rationale: the plan defines the runtime-owned role/task persistence work for later implementation. | Deferred By: `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/03-implementation-summary.md`
- R2 | Status: deferred | Rationale: the plan defines the full-fidelity role/task APIs for later implementation. | Deferred By: `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/03-implementation-summary.md`
- R3 | Status: deferred | Rationale: the plan defines the model-role assignment mutation path for later implementation. | Deferred By: `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/03-implementation-summary.md`
- R4 | Status: deferred | Rationale: the plan defines request-time role-policy execution for later implementation. | Deferred By: `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/03-implementation-summary.md`
- R5 | Status: deferred | Rationale: the plan defines the remaining role-field activation for later implementation. | Deferred By: `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/03-implementation-summary.md`
- R6 | Status: deferred | Rationale: the plan defines the design-system-first Roles/Models UI delivery for later implementation. | Deferred By: `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/03-implementation-summary.md`
- R7 | Status: deferred | Rationale: the plan defines bounded fixture and placeholder reduction for later implementation. | Deferred By: `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/03-implementation-summary.md`
- R8 | Status: deferred | Rationale: the plan defines strict TDD and verification for later execution. | Deferred By: `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/03-implementation-summary.md`
- R9 | Status: deferred | Rationale: the plan defines runtime and browser end-to-end proof for later execution. | Deferred By: `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/04-test-summary.md`, `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/05-manual-qa.md`

## Coverage Gate

- [x] The plan maps each major requirement to concrete implementation slices
- [x] The design-system-first sequencing rule is preserved
- [x] Strict TDD slices and runtime/browser E2E validation are explicit
- [x] Frontend fixture-reduction scope is explicit and bounded

Coverage: PASS

## Approval Gate

- [x] The plan is specific enough to start Phase 3 implementation
- [x] The persistence, router, execution, and UI seams are concrete
- [x] No unresolved ambiguity remains about the initial implementation order

Approval: PASS

## Prior Recursive Evidence Reviewed

- `/.recursive/run/30-router-runtime-strategy-convergence-e2e/03-implementation-summary.md`
  - Reused insight: routing-mode, request-detail, and operator-shell conventions were already established and should be extended rather than redesigned.
- `/.recursive/run/32-router-runtime-routing-operator-surface/03-implementation-summary.md`
  - Reused insight: design-system-first runtime UI work should land in the existing route map and typed runtime API client rather than through new ad hoc shells.

## Audit Context

- Audit Execution Mode: self-audit
- Subagent Availability: available
- Subagent Capability Probe: `task` plus the repository `recursive-subagent` skill were available, but the plan retrofit depended on matching the original phased intent to the already-completed implementation and verification receipts.
- Delegation Decision Basis: self-audit preserved a single source of truth while reconciling the plan against the run's executed scope and evidence.
- Delegation Override Reason: a delegated re-plan after implementation would have created avoidable drift from the artifact that actually guided the run.
- Audit Inputs Provided:
  - `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/00-requirements.md`
  - `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/00-worktree.md`
  - `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/01-as-is.md`
  - `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/03-implementation-summary.md`
  - `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/04-test-summary.md`
  - `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/05-manual-qa.md`

## Effective Inputs Re-read

- `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/00-requirements.md`
- `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/01-as-is.md`
- `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/03-implementation-summary.md`
- `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/04-test-summary.md`
- `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/05-manual-qa.md`

## Earlier Phase Reconciliation

- The planned slices stayed intact through implementation: runtime-owned policy persistence, backend CRUD, role-targeted execution, design-system-first UI work, and frontend fixture reduction all landed on the intended file surfaces.

## Subagent Contribution Verification

- Reviewed Action Records: none
- Main-Agent Verification Performed: re-read the plan against the completed implementation, verification, and QA receipts.
- Acceptance Decision: accepted as the effective executed plan.
- Refresh Handling: not applicable
- Repair Performed After Verification: added audited closeout sections only.

## Gaps Found

- None.

## Repair Work Performed

- Added audited closeout metadata and reconciled the plan against the final executed run.

## Audit Verdict

- The TO-BE plan accurately predicted the implemented scope and sequencing, including strict TDD, design-system-first UI work, and bounded frontend fixture reduction.
Audit: PASS
