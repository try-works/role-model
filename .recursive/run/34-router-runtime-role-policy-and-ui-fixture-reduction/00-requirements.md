Run: `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-05-17T02:55:12Z`
LockHash: `8a399772c6df4b8369eeef5e7a6b9b4a7720028ce9e0b15c6265dfb4ec225589`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/docs/architecture/07-router-runtime-routing-strategy-lock.md`
- `/.recursive/run/14-router-runtime-ui-foundation/00-requirements.md`
- `/.recursive/run/22-router-runtime-routing-strategy-lock/00-requirements.md`
- `/.recursive/run/30-router-runtime-strategy-convergence-e2e/00-requirements.md`
- `/.recursive/run/32-router-runtime-routing-operator-surface/00-requirements.md`
- `/protocol/schemas/role-definition.schema.json`
- `/protocol/schemas/task-definition.schema.json`
- `/protocol/schemas/role-binding.schema.json`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.ts`
- `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `/role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/providers.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/router-config.tsx`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/packages/core/src/router.ts`
- `/role-model-router/packages/protocol-routing/src/index.ts`
- `ui-design-system` skill guidance
Outputs:
- `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/00-requirements.md`
Scope note: This run turns runtime roles from a mostly fixture-backed, partly read-only policy surface into a runtime-managed, router-consumed, operator-editable system. The run includes both product phases now in scope: **Phase 1** moves role definitions, task allowlists, and model-role assignment into live runtime ownership that the router uses immediately; **Phase 2** wires the remaining full role-definition fields into execution and policy enforcement so they are not stored as dead metadata. Any frontend work must update the existing design system first, then implement the runtime UI. The run must also remove frontend fixture and placeholder dependence so the app shows honest empty states instead of fake models, endpoints, roles, or requests.

## TODO

- [x] Consolidate the role-policy, operator-surface, and frontend-realism gap into one repo-owned recursive requirement contract
- [x] Define stable requirement identifiers and verifiable acceptance criteria
- [x] Record both in-scope product phases explicitly and distinguish them from recursive workflow phases
- [x] Record the design-system-first frontend rule and the no-frontend-fixtures rule
- [x] Record strict TDD, runtime end-to-end verification, and browser end-to-end verification obligations
- [x] Record scope boundaries, constraints, assumptions, and sequence integration
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## In-Scope Product Delivery Phases

These product phases are part of this run and are distinct from recursive-mode phase numbering.

### Product Phase 1 - Live role policy ownership and router consumption

- move live `roleDefinitions` and `taskDefinitions` out of fixture-only startup inputs and into runtime-managed state/config owned by the bridge
- expose full role-policy authoring and task-to-role allowlist management through repo-owned backend and operator UI surfaces
- keep model-role assignment as the source of dynamic endpoint role bindings used by the router
- prove that role edits and assignment changes are seen by the router and affect live routing behavior

### Product Phase 2 - Full role-definition execution and policy enforcement

- wire the remaining router-grade role fields into real execution/policy behavior rather than storing them only for display
- make the effect of those fields inspectable through runtime/router/operator surfaces
- prove end to end that role-authored behavior is active in both routing and execution paths

## Requirements

### `R1` Replace fixture-backed live role/task policy inputs with a runtime-managed source of truth

Description:
The live runtime must not depend on fixture-only role/task inputs for normal role-aware routing behavior. Role definitions and task allowlists must be owned by runtime-managed persistent state or config that the host bridge reads and updates directly.

Acceptance criteria:
- normal runtime startup no longer depends on `testdata/router-runtime/adapter-role-task.json` as the live source of `roleDefinitions` and `taskDefinitions`
- the bridge owns a runtime-managed persistent source of truth for:
  - full role definitions
  - task definitions or task-to-role allowlists required to make roles routable
  - any bootstrap/default role seeding behavior needed for first-run startup
- the same runtime-managed role/task data is used by:
  - router-config policy-source readback
  - runtime role read APIs
  - live `routeRuntimeRequest(...)` input construction
- creating or editing a role no longer requires editing a checked-in fixture file or restarting from a fixture-only baseline
- validation rejects broken policy states such as unknown role ids, invalid task allowlists, or structurally invalid full role definitions before they can affect routing

### `R2` Expose full router-grade role authoring and task-to-role policy management

Description:
Operators must be able to create, inspect, and update the full role-definition schema and the task mappings that make a role routable. A new role is incomplete unless it can also be authorized for the relevant task types.

Acceptance criteria:
- the backend exposes repo-owned typed role-policy APIs that support, at minimum:
  - listing roles
  - reading one role in full fidelity
  - creating a role
  - updating a role
  - listing and updating the task-to-role policy needed to make roles routable
- the stored role contract preserves every required field from `role-definition.schema.json`
- the operator surface exposes the full router-grade role fields, including:
  - role id
  - label/name
  - description
  - role kind
  - default system instructions
  - task types supported
  - required, preferred, and forbidden capabilities
  - tool policy
  - routing policy overrides
  - output contracts
  - safety policy refs
- a newly created custom role can be made routable from the operator surface by updating the relevant task allowlist or equivalent task policy without hand-editing backend fixtures
- router-facing policy inspection surfaces show the full persisted role definition and the current task-policy mapping honestly rather than a summary-only projection

### `R3` Make role assignment a first-class model workflow that updates live router bindings

Description:
Users need to see which roles exist, which models serve them, and how to change those bindings. Model-role assignment must remain the bridge from model configuration to dynamic endpoint role bindings that the router actually evaluates.

Acceptance criteria:
- the operator surface exposes a first-class role assignment workflow from the model side and a first-class assignment readback workflow from the role side
- users can see:
  - all available roles
  - which roles are assigned to a given model
  - which models and endpoints currently serve a given role
- assigning or unassigning a role to a model updates the dynamic endpoint role bindings used by the live router
- router candidate and decision surfaces reflect the changed role binding without requiring a manual fixture edit in frontend or backend code
- end-to-end evidence shows that changing a model-role assignment can change routing eligibility or decision behavior for a request that targets that role

### `R4` Preserve and prove the router-consumed role fields in live routing behavior

Description:
The fields the router already knows how to use must be proven from the new runtime-managed role source of truth rather than only from legacy fixture-fed inputs.

Acceptance criteria:
- persisted role definitions continue to drive live routing for:
  - `task_types_supported`
  - `required_capabilities`
  - `preferred_capabilities`
  - `forbidden_capabilities`
  - `routing_policy_overrides`
- persisted task definitions or task-role allowlists continue to drive live routing decisions such as role/task compatibility checks
- router diagnostics and policy inspection surfaces make it clear when role-derived capability requirements or routing-policy overrides influenced a decision
- end-to-end verification includes at least one request where a persisted role definition changes routing eligibility or policy compared with the baseline role policy

### `R5` Product Phase 2 must make the remaining role-definition fields active in execution or policy enforcement

Description:
The remaining full role-definition fields must no longer exist only as stored metadata. This run must wire them into real execution or policy behavior and make their effect visible to operators.

Acceptance criteria:
- `default_system_instructions` are applied through the live execution path for requests that target a role, and the applied role instructions are observable through runtime request diagnostics, captures, or equivalent inspection surfaces
- `tool_policy` changes actual runtime behavior for role-targeted requests, such as permitting, limiting, or rejecting tool usage according to the role definition
- `output_contracts` affect runtime execution, validation, or post-execution policy handling in a way that is observable and testable for role-targeted requests
- `safety_policy_refs` are consumed by a live runtime policy/enforcement path or by an explicit policy-application layer that affects role-targeted request handling
- no full role-definition field remains silently stored-but-unused at run closeout unless a later locked addendum explicitly reclassifies that field as out of scope

### `R6` Update the design system first, then implement first-class Roles and updated Models surfaces

Description:
Frontend changes for roles and models must begin with the existing design system and navigation contract. The UI must keep alias semantics separate from role semantics and must not ship one-off screens before the shared surface contract is updated.

Acceptance criteria:
- before feature-page implementation begins, the run updates the existing design system with the layouts, navigation metadata, shared states, and reusable primitives required for:
  - a first-class Roles surface
  - updated model-role assignment surfaces
  - role detail and policy inspection surfaces
- the implementation uses `ui-design-system` guidance for accessibility, reusable composition, responsive behavior, and WCAG-aware state design
- the runtime UI exposes a dedicated role-management surface where users can:
  - see available roles
  - create and edit roles
  - inspect full role policy
  - see model/endpoint assignment readback
- the model registry surfaces continue to show model roles and capabilities, but do not display router alias ids as model metadata
- router/downstream alias surfaces remain separate from model-role surfaces so alias semantics stay router-owned and user-visible in the correct place

### `R7` Remove frontend fixture, placeholder, and fake-runtime dependence from the runtime UI

Description:
The runtime UI must stop depending on frontend fixture corpora, placeholder models, placeholder endpoints, or fake runtime rows to look populated. Honest empty states are required.

Acceptance criteria:
- production runtime UI code does not import or render checked-in frontend fixture datasets for roles, models, endpoints, requests, or router decisions
- the runtime UI package removes checked-in placeholder or fake runtime records whose purpose is to make pages look populated without the live backend
- when runtime APIs return no data, the UI renders honest empty, loading, unavailable, or setup-needed states instead of fake models, endpoints, roles, or requests
- browser-level verification proves that a clean or sparsely configured runtime does not show seeded frontend placeholder data
- frontend automated coverage for the touched pages avoids large checked-in fixture corpora; tests use the minimum local test doubles needed to express the case under test instead of maintaining separate fake product datasets

### `R8` Implement the full run under strict TDD with backend, frontend, and integration coverage

Description:
This run includes risky routing, policy, and UI changes. Every production change must follow strict failing-test-first discipline.

Acceptance criteria:
- `TDD Mode` for the implementation phase is `strict`
- every production-code change is preceded by a failing automated test at the strongest reasonable layer before the implementation turns green
- the run adds or updates automated coverage for, at minimum:
  - role policy persistence and validation
  - role/task policy APIs
  - router consumption of persisted role/task state
  - execution/policy handling for the newly activated full role fields
  - design-system/navigation updates
  - role-management and model-role-assignment UI states
  - fixture-free honest empty states in the touched frontend pages
- focused package tests/builds for all touched packages and apps are part of the final verification set
- the run records the exact RED and GREEN evidence paths required by strict recursive TDD discipline

### `R9` Prove the full role-policy workflow end to end in the running runtime and browser

Description:
This run is not complete until an operator can author a role, make it routable, assign it to a model, and observe the live runtime using that policy in both router and execution surfaces.

Acceptance criteria:
- runtime end-to-end verification covers, at minimum, this flow:
  1. create or update a custom role
  2. update the task policy so the role is allowed for the target task
  3. assign the role to a configured model
  4. execute a request that targets that role
  5. verify the router sees the updated role definition and binding
  6. verify the execution path applies the relevant role-authored behavior
- end-to-end verification includes live router inspection of:
  - policy-source readback
  - candidate role-binding visibility
  - decision detail or equivalent routing diagnostics
- browser QA covers, at minimum:
  - navigating the role-management surface
  - creating or editing a role
  - viewing assignment readback from both the role and model sides
  - honest empty-state behavior after frontend fixture/placeholder reduction
- end-to-end verification uses the running runtime and browser surfaces; fixture-only frontend proofs do not satisfy this requirement

## Out of Scope

- `OOS1`: inventing new routing strategies, alias modes, or role concepts beyond the locked routing-strategy contract
- `OOS2`: broad runtime UI redesign outside the design-system, roles, models, router inspection, and honest-state surfaces required for this run
- `OOS3`: replacing the existing vendor/local execution stack or rewriting `llama-swap`, LiteLLM, or unrelated provider integrations
- `OOS4`: unrelated repo-wide formatting, packaging, or validation cleanup unless a later locked addendum explicitly widens the run

## Constraints

- the run must execute from the isolated worktree recorded in `00-worktree.md`
- the run baseline is the selected Phase 0 diff basis recorded in `00-worktree.md`
- aliases remain router-level requested model ids; models do not gain aliases as model metadata
- roles and capabilities remain model/endpoint metadata and router policy inputs
- any frontend work must update the existing design system first and apply `ui-design-system` guidance before page implementation begins
- the runtime UI must not rely on frontend fixture corpora, placeholder models, placeholder endpoints, or fake runtime rows to present a populated app state
- the live role/task policy source of truth must be backend-owned and runtime-managed rather than frontend-owned
- strict TDD and end-to-end verification are mandatory for this run
- local and remote runtime support must remain intact; role policy must not narrow the runtime to one execution class only

## Assumptions

- the current provider-account `modelRoleBindings` path remains the correct basis for dynamic endpoint role bindings once the role/task catalog becomes runtime-managed
- the existing router, router-config, and runtime inspection surfaces are the right foundation for proving that role changes are seen and used by the router
- the existing design-system and runtime shell are the correct foundation for first-class Roles and updated Models surfaces
- a clean runtime with little or no configured data is a supported operator state and should be represented with honest UI states rather than placeholders

## Sequence Integration

- Roadmap slot: `post-run32 live role policy, role authoring, model assignment, and frontend realism`
- Previous repo dependencies:
  - `14-router-runtime-ui-foundation`
  - `22-router-runtime-routing-strategy-lock`
  - `30-router-runtime-strategy-convergence-e2e`
  - `32-router-runtime-routing-operator-surface`
- Next repo dependency: implementation phases for `34-router-runtime-role-policy-and-ui-fixture-reduction`
- Required handoff: runtime-managed role/task policy, first-class role authoring and model-assignment surfaces, active enforcement of the full role schema, fixture-free honest frontend states, and end-to-end proof that router and execution paths honor the authored role policy

## Targeted Package And File Inventory

- `role-model-router/apps/runtime-host-bridge/src/`
- `role-model-router/apps/runtime-ui/app/routes.ts`
- `role-model-router/apps/runtime-ui/app/lib/design-system.ts`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `role-model-router/apps/runtime-ui/app/routes/`
- `role-model-router/packages/core/src/`
- `role-model-router/packages/protocol-routing/src/`
- `role-model-router/packages/provider-account/src/`
- `role-model-router/packages/sqlite-memory/src/`
- `protocol/schemas/role-definition.schema.json`
- `protocol/schemas/task-definition.schema.json`
- `protocol/schemas/role-binding.schema.json`
- runtime validation, browser-QA, and policy-inspection evidence under this run folder's `evidence/`

## Validation Expectations

- every production slice must have explicit RED evidence before GREEN evidence
- backend verification must cover runtime-managed role/task persistence, validation, API contracts, and router consumption
- execution-path verification must cover the role-definition fields activated in Product Phase 2
- frontend verification must cover the design-system update first, role-management pages, model-role assignment pages, and honest empty-state behavior after fixture reduction
- end-to-end verification must include live runtime and browser proof that authored role policy changes are seen and used by the router and execution path
- final evidence must show that the touched frontend surfaces no longer rely on fake runtime data to appear populated

## Coverage Gate

- [x] Stable requirement identifiers and acceptance criteria are defined
- [x] Product Phase 1 and Product Phase 2 are both explicit, specific, and verifiable
- [x] Design-system-first frontend sequencing and the no-frontend-fixtures rule are explicit
- [x] Strict TDD and runtime/browser end-to-end verification are explicit

Coverage: PASS

## Approval Gate

- [x] The run is specific enough for downstream AS-IS analysis and planning
- [x] The requirements make clear how role changes must become visible to and used by the router
- [x] No unresolved ambiguity remains about the full role-schema scope, the design-system-first rule, or the frontend fixture-reduction obligation

Approval: PASS
