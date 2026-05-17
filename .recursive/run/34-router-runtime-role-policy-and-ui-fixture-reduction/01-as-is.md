Run: `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/`
Phase: `01 AS-IS`
Status: `LOCKED`
LockedAt: `2026-05-17T02:55:14Z`
LockHash: `b71ad15c9b2baf5115ca3d1032a2517e4e2f89982f81cd249119c62555c9abb0`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/00-requirements.md`
- `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/00-worktree.md`
- `/docs/architecture/07-router-runtime-routing-strategy-lock.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/packages/core/src/router.ts`
- `/role-model-router/packages/provider-account/src/index.ts`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.ts`
- `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `/role-model-router/apps/runtime-ui/app/routes/providers.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
- `/protocol/schemas/role-definition.schema.json`
- `/protocol/schemas/task-definition.schema.json`
Outputs:
- `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/01-as-is.md`
Scope note: Captures the exact pre-run gaps that justified runtime-owned role policy, request-time role execution, and the Roles/Models operator surfaces.

## TODO

- [x] Identify the live source of role/task policy and dynamic bindings.
- [x] Distinguish already-consumed versus still-unused role fields.
- [x] Record the concrete UI, fixture, and end-to-end gaps the run must close.

## AS-IS Summary

The runtime already has role-aware routing primitives, but live role policy ownership is split and incomplete:

- **dynamic model-role assignment is live** through provider-account `modelRoleBindings`
- **full role definitions and task allowlists are not live-owned** and still come from `adapter-role-task.json`
- **the router already consumes only a subset of role fields**
- **the runtime UI exposes only summary roles and account-centric assignment**
- **Control > Models is explicitly inspect-only because there is no dedicated persistence surface yet**

## Reproduction Steps (Novice-Runnable)

1. Read `00-requirements.md` and `00-worktree.md` to confirm the run scope and the selected baseline commit.
2. Inspect `role-model-router/apps/runtime-host-bridge/src/index.ts` for role/task loading, router inputs, and request mapping.
3. Inspect `role-model-router/apps/runtime-ui/app/lib/design-system.ts`, `app/lib/runtime-api.ts`, and `app/routes/control-models.tsx` for current operator surfaces and editability constraints.
4. Compare the live bridge/UI behavior to `protocol/schemas/role-definition.schema.json` and `protocol/schemas/task-definition.schema.json`.
5. Confirm that full role/task CRUD, request-time role targeting, and a complete live operator workflow are not yet present.

## Current Findings By Requirement

### `R1` Live role/task policy ownership

- `runtime-host-bridge` reads `roleDefinitions`, `taskDefinitions`, and static `roleBindings` from `fixtureRoot/adapter-role-task.json` during startup (`src/index.ts:5198-5204`)
- router-config readback still reports `routingModel: "fixture"` and `policyInputs: "fixture+runtime"` (`src/index.ts:6081-6088`)
- live routing calls still pass `taskDefinitions: roleTaskFixture.taskDefinitions` into `routeRuntimeRequest(...)` (`src/index.ts:6219-6237`)
- there is no existing runtime-owned persistence seam for role/task policy comparable to provider accounts or local policy

### `R2` Full router-grade role authoring

- the bridge exposes only `listRoles()` and it returns summary records with `roleId`, `label`, `description`, and `taskTypes` (`src/index.ts:1193-1201`, `src/index.ts:7469-7478`)
- `RuntimeRoleDefinition` in the UI client is likewise summary-only and omits the full schema fields (`app/lib/runtime-api.ts:160-165`)
- the full schema exists and requires:
  - `role_id`, `name`, `description`, `role_kind`
  - `default_system_instructions`
  - `task_types_supported`
  - `required_capabilities`, `preferred_capabilities`, `forbidden_capabilities`
  - `tool_policy`
  - `routing_policy_overrides`
  - `output_contracts`
  - `safety_policy_refs`
  (`protocol/schemas/role-definition.schema.json:7-47`)
- task allowlists are part of the canonical task schema via `allowed_roles` (`protocol/schemas/task-definition.schema.json:7-25`)

### `R3` Model-role assignment and live router bindings

- provider accounts already persist `modelRoleBindings` and validate them against the runtime role catalog via `allowedRoleIds` (`packages/provider-account/src/index.ts:317-370`)
- runtime-host-bridge derives dynamic endpoint role bindings from those account-level model bindings via `buildRuntimeRoleBindings(...)` (`src/index.ts:2394-2450`)
- the Providers page currently owns role assignment through account onboarding (`app/routes/providers.tsx:306`, `780-812`)
- Control > Models currently only displays roles; it does not edit them (`app/routes/control-models.tsx:191-209`, `242-259`)
- the design system explicitly says model cards stay observational unless a real persistence surface exists (`app/lib/design-system.ts:320-334`)

### `R4` Router-consumed role fields

- the router already consumes:
  - `required_capabilities`
  - `preferred_capabilities`
  - `forbidden_capabilities`
  - `routing_policy_overrides`
  - `task_types_supported`
  - task `allowed_roles`
  (`packages/core/src/router.ts:157-172`, `255-297`, `819-846`)
- dynamic role bindings are already used for active/inactive/disabled checks, capability checks, and task checks (`packages/core/src/router.ts:850-868`)

### `R5` Remaining full role fields

- `default_system_instructions`, `tool_policy`, `output_contracts`, and `safety_policy_refs` are populated in built-in role definitions but are not currently consumed by the routing core or execution path (`src/index.ts:2317-2331`; repo search found no live enforcement hook)
- current chat/responses request mapping builds `routingRequest` and `executionRequest` without any role-derived execution augmentation (`src/index.ts:2896-2984`, `3028-3075`)
- current public request shape has no first-class client-specified `requestedRoleId` input on chat/responses mapping; role selection mainly enters through controller guidance today (`src/index.ts:535-581`, `2896-2984`)

### `R6` Design-system-first roles/models UI

- the design system already owns route metadata and page semantics
- there is no dedicated Control > Roles surface today
- Control > Models is explicitly configured as an inspect-only inventory because editing belongs elsewhere until a persistence surface exists (`app/lib/design-system.ts:320-334`)
- the current role display in the runtime snapshot and provider flow is too summary-centric for full router-grade role authoring (`app/lib/runtime-api.ts:160-165`, `app/routes/providers.tsx:780-812`)

### `R7` Frontend fixtures and placeholders

- production runtime UI routes appear to rely on live backend data and empty states rather than shipping a standalone fixture-driven product shell
- however, operator copy and router-config provenance still explicitly mention fixture-backed guidance (`app/routes/router-config.tsx:80`, `228`)
- frontend tests contain large mocked runtime datasets and many placeholder model ids such as `local/mock-llama`, which is the main fixture-heavy frontend surface found in this audit (`app/lib/runtime-api.test.ts`, `app/lib/view-models.test.ts`)
- input placeholders still exist in forms, but these are ordinary form hints rather than fake runtime records

### `R8` TDD and verification baseline

- the selected worktree baseline is not fully green: `corepack pnpm run ci:check` fails on the inherited `validate-vendors` timeout recorded in `00-worktree.md`
- existing test coverage is strong around host bridge, runtime UI client, and routing surfaces, so the repo already has good seams for strict RED-first additions

### `R9` End-to-end role workflow

- the current runtime can expose policy sources and dynamic role bindings in router surfaces
- it cannot yet perform a full live operator workflow of:
  1. creating a role
  2. updating task allowlists
   3. assigning that role from a model surface
   4. executing a role-targeted request
   because creation/update APIs and role-targeted request handling are missing

## Current Behavior by Requirement

- See `Current Findings By Requirement`.

## Relevant Code Pointers

- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/packages/core/src/router.ts`
- `/role-model-router/packages/provider-account/src/index.ts`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.ts`
- `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `/role-model-router/apps/runtime-ui/app/routes/providers.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
- `/protocol/schemas/role-definition.schema.json`
- `/protocol/schemas/task-definition.schema.json`

## Known Unknowns

- None. The audit resolved where live role/task policy comes from, where dynamic bindings come from, and which seams must change.

## Evidence

- Evidence is the code and schema references cited under `Current Findings By Requirement` and `Reusable Existing Seams`.

## Reusable Existing Seams

- file-backed runtime-owned local policy persistence already exists under `runtimeStateRoot` via `readLocalPolicy()` and `updateLocalPolicy()` (`src/index.ts:8109-8129`)
- provider-account SQLite persistence and validation already exist and should remain the source for dynamic model-role bindings
- runtime snapshot fetch already centralizes role loading through `/api/role-model/roles` (`app/lib/runtime-api.ts:638-672`)
- router surfaces already expose policy-source readback, candidate role bindings, and decision details that can be extended instead of replaced

## Gaps That Must Be Closed

1. add runtime-managed persistence for full role and task policy
2. expose full-fidelity role and task policy CRUD/read APIs
3. upgrade runtime snapshot role types from summary-only to full router-grade definitions
4. add a first-class Roles UI surface and editable model-role workflow
5. add a real request-time role targeting seam for E2E execution proof
6. wire the remaining full role fields into execution/policy handling
7. reduce frontend test/placeholder data where the frontend still depends on oversized fake runtime datasets

## Traceability

- `R1` -> `Current Findings By Requirement > R1` identifies the fixture-owned live role/task policy source and missing runtime persistence seam.
- `R2` -> `Current Findings By Requirement > R2` identifies the summary-only role API and missing full schema fields.
- `R3` -> `Current Findings By Requirement > R3` identifies live model bindings, account-owned assignment, and inspect-only Models posture.
- `R4` -> `Current Findings By Requirement > R4` identifies which role fields the router already consumes.
- `R5` -> `Current Findings By Requirement > R5` identifies the remaining full role fields that are not yet active in execution.
- `R6` -> `Current Findings By Requirement > R6` identifies the missing Roles surface and design-system gap.
- `R7` -> `Current Findings By Requirement > R7` identifies touched frontend fixture and placeholder debt.
- `R8` -> `Current Findings By Requirement > R8` records the TDD-ready test seams and the inherited baseline caveat.
- `R9` -> `Current Findings By Requirement > R9` identifies the missing end-to-end role workflow.

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
  - `role-model-router/packages/provider-account/`
  - `role-model-router/packages/sqlite-memory/`
- Unexpected drift observed during AS-IS:
  - none after Phase 0 cleanup beyond the run-34 recursive artifact folder

## Requirement Completion Status

- R1 | Status: deferred | Rationale: analysis identified the live role/task ownership gap for later implementation. | Deferred By: `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/02-to-be-plan.md`
- R2 | Status: deferred | Rationale: analysis identified the summary-only role surface for later implementation. | Deferred By: `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/02-to-be-plan.md`
- R3 | Status: deferred | Rationale: analysis identified the inspect-only model-role workflow for later implementation. | Deferred By: `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/02-to-be-plan.md`
- R4 | Status: deferred | Rationale: analysis identified the router-consumed role fields and the missing execution-path behavior. | Deferred By: `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/02-to-be-plan.md`
- R5 | Status: deferred | Rationale: analysis identified the unused full role fields for later implementation. | Deferred By: `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/02-to-be-plan.md`
- R6 | Status: deferred | Rationale: analysis identified the missing Roles surface and inspect-only Models posture for later implementation. | Deferred By: `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/02-to-be-plan.md`
- R7 | Status: deferred | Rationale: analysis identified the touched frontend fixture and placeholder debt for later implementation. | Deferred By: `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/02-to-be-plan.md`
- R8 | Status: deferred | Rationale: analysis recorded the baseline validation posture and TDD-ready seams for later implementation. | Deferred By: `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/02-to-be-plan.md`
- R9 | Status: deferred | Rationale: analysis identified the missing live end-to-end role workflow for later implementation. | Deferred By: `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/02-to-be-plan.md`

## Coverage Gate

- [x] The current live source of role/task policy is identified
- [x] Existing router-consumed role fields versus unused full-schema fields are distinguished
- [x] Existing UI role surfaces, assignment surfaces, and inspect-only constraints are identified
- [x] Frontend fixture/placeholder findings are recorded

Coverage: PASS

## Approval Gate

- [x] The AS-IS analysis is specific enough to support a concrete TO-BE plan
- [x] The main architectural gap and the main UI gap are explicit
- [x] No blocking uncertainty remains about where the current runtime gets role/task policy or where dynamic bindings come from

Approval: PASS

## Prior Recursive Evidence Reviewed

- `/.recursive/run/30-router-runtime-strategy-convergence-e2e/02-to-be-plan.md`
  - Reused insight: run 30 already established the runtime-owned routing-strategy and request-receipt surfaces that run 34 could extend instead of replacing.
- `/.recursive/run/32-router-runtime-routing-operator-surface/03-implementation-summary.md`
  - Reused insight: the runtime UI already had a dedicated router/operator shell, so role-policy work could stay inside `Control` and `Observe` without inventing a parallel navigation model.

## Audit Context

- Audit Execution Mode: self-audit
- Subagent Availability: available
- Subagent Capability Probe: `task` plus the repository `recursive-subagent` skill were available, but no delegated audit action record or review bundle existed for the already-authored AS-IS artifact.
- Delegation Decision Basis: the phase needed direct reconciliation between the original analysis receipt, the final implementation diff, and the closeout evidence already produced in later phases.
- Delegation Override Reason: retrofitting the audited sections onto the historical Phase 1 artifact was lower-risk as a single-controller reconciliation task than as a fresh delegated pass over mutable run-closeout material.
- Audit Inputs Provided:
  - `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/00-requirements.md`
  - `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/00-worktree.md`
  - `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/02-to-be-plan.md`
  - `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/03-implementation-summary.md`
  - `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/04-test-summary.md`

## Effective Inputs Re-read

- `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/00-requirements.md`
- `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/00-worktree.md`
- `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/02-to-be-plan.md`
- `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/03-implementation-summary.md`
- `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/04-test-summary.md`

## Earlier Phase Reconciliation

- The phase-1 analysis still matches the implemented run outcome: runtime-owned role/task persistence, model-role assignment editing, request-time role execution policy, and frontend fixture reduction all closed the specific gaps recorded above without widening the problem statement.

## Subagent Contribution Verification

- Reviewed Action Records: none
- Main-Agent Verification Performed: re-read the original AS-IS findings against the final implementation and verification receipts listed above.
- Acceptance Decision: accepted as accurate after audit retrofit.
- Refresh Handling: not applicable
- Repair Performed After Verification: added audited closeout sections only; no semantic AS-IS findings changed.

## Gaps Found

- None.

## Repair Work Performed

- Added the audited metadata and reconciliation sections required by `recursive-mode-audit-v1`.

## Audit Verdict

- The AS-IS artifact still accurately describes the pre-run gap: live model bindings already existed, but router-grade role policy ownership, request-time execution policy, and operator authoring surfaces were missing.
Audit: PASS

## Prior Recursive Evidence Reviewed

- `/.recursive/run/30-router-runtime-strategy-convergence-e2e/02-to-be-plan.md`
  - Reused insight: run 30 already established the runtime-owned routing-strategy and request-receipt surfaces that run 34 could extend instead of replacing.
- `/.recursive/run/32-router-runtime-routing-operator-surface/03-implementation-summary.md`
  - Reused insight: the runtime UI already had a dedicated router/operator shell, so role-policy work could stay inside `Control` and `Observe` without inventing a parallel navigation model.

## Audit Context

- Audit Execution Mode: self-audit
- Subagent Availability: available
- Subagent Capability Probe: `task` plus the repository `recursive-subagent` skill were available, but no delegated audit action record or review bundle existed for the already-authored AS-IS artifact.
- Delegation Decision Basis: the phase needed direct reconciliation between the original analysis receipt, the final implementation diff, and the closeout evidence already produced in later phases.
- Delegation Override Reason: retrofitting the audited sections onto the historical Phase 1 artifact was lower-risk as a single-controller reconciliation task than as a fresh delegated pass over mutable run-closeout material.
- Audit Inputs Provided:
  - `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/00-requirements.md`
  - `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/00-worktree.md`
  - `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/02-to-be-plan.md`
  - `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/03-implementation-summary.md`
  - `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/04-test-summary.md`

## Effective Inputs Re-read

- `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/00-requirements.md`
- `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/00-worktree.md`
- `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/02-to-be-plan.md`
- `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/03-implementation-summary.md`
- `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/04-test-summary.md`

## Earlier Phase Reconciliation

- The phase-1 analysis still matches the implemented run outcome: runtime-owned role/task persistence, model-role assignment editing, request-time role execution policy, and frontend fixture reduction all closed the specific gaps recorded above without widening the problem statement.

## Subagent Contribution Verification

- Reviewed Action Records: none
- Main-Agent Verification Performed: re-read the original AS-IS findings against the final implementation and verification receipts listed above.
- Acceptance Decision: accepted as accurate after audit retrofit.
- Refresh Handling: not applicable
- Repair Performed After Verification: added audited closeout sections only; no semantic AS-IS findings changed.

## Gaps Found

- None.

## Repair Work Performed

- Added the audited metadata and reconciliation sections required by `recursive-mode-audit-v1`.

## Audit Verdict

- The AS-IS artifact still accurately describes the pre-run gap: live model bindings already existed, but router-grade role policy ownership, request-time execution policy, and operator authoring surfaces were missing.
Audit: PASS
