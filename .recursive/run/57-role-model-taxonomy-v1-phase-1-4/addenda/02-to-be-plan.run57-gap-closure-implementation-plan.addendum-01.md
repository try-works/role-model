# TO-BE Plan Addendum 01: Run 57 Gap Closure Implementation Plan

Run: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/`  
Phase: `02 TO-BE Plan Addendum 01`  
Artifact: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/02-to-be-plan.run57-gap-closure-implementation-plan.addendum-01.md`  
Status: `LOCKED`
LockedAt: `2026-06-23T14:21:38Z`
LockHash: `1228ab619b316cbbc956cd90e6892ae69c7f85fc48ad4aed3d61528057c8dda1`
Workflow version: `recursive-mode-audit-v1`  
Artifact kind: run-local TO-BE plan addendum  
CreatedAt: `2026-06-23`  
Base Artifact: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/02-to-be-plan.md`  
Prior Addendum: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.run57-gap-closure-audit.addendum-01.md`  
Target Scope: Proposal phases 1 through 4 only  
Required Discipline: Strict TDD plus rebuilt local runtime and live Pi verification  
Inputs:
- `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.run57-gap-closure-audit.addendum-01.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/02-to-be-plan.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/03-implementation-summary.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/04-test-summary.md`
- Run 57 implementation audit findings against proposal phases 1 through 4
Outputs:
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/02-to-be-plan.run57-gap-closure-implementation-plan.addendum-01.md`
Scope note: Run-local addendum to the locked Run 57 TO-BE plan. It turns the post-implementation audit findings into a strict-TDD implementation plan for a follow-up recursive run.

## Purpose

This plan turns the Run 57 gap-closure audit addendum into an implementation sequence. The goal is to close every audit finding against proposal phases 1 through 4 and prove the result with automated tests, rebuilt packaged/runtime validation, and live Pi-driven end-to-end verification on this local device.

This plan should be used as the implementation plan for the next recursive run. The implementation run must treat `16-role-model-taxonomy-v1-proposal.md`, `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.run57-gap-closure-audit.addendum-01.md`, and this plan as effective inputs.

## TODO

- [x] Preserve the base proposal and audit addendum as effective inputs
- [x] Convert each audit gap into an ordered implementation step
- [x] Require strict RED/GREEN/REFACTOR evidence for every behavior change
- [x] Require automated tests for taxonomy, schemas, runtime routing, UI, and Pi package behavior
- [x] Require rebuilt local runtime and live local Pi verification
- [x] Require packaged runtime and Pi package staleness checks
- [x] Add traceability from each gap to implementation steps, tests, and live QA

## Workflow Alignment

This file follows the recursive run-local addendum naming pattern:

```text
addenda/<base-phase-artifact>.<slug>.addendum-<NN>.md
```

This addendum amends the Run 57 TO-BE plan after post-implementation audit. A follow-up recursive run that implements this plan must list this file as an effective input in its `00-requirements.md`, `01-as-is.md`, `02-to-be-plan.md`, and later phase artifacts that depend on the implementation plan.

## Completion Definition

The implementation is complete only when all of the following are true:

- the canonical runtime taxonomy exactly matches the approved proposal/addendum semantics;
- canonical JSON taxonomy data is the source of truth;
- schemas reject malformed taxonomy and classification data;
- manifest receipts include counts, entry files, and content hashes;
- Pi compact taxonomy is generated from canonical runtime taxonomy and includes all `280` tasks;
- Pi prefers the live runtime effective taxonomy over the package snapshot;
- Pi emits the stable proposal-shaped `role_model` contract;
- runtime validates, normalizes, diagnoses, strips, and uses classified intent correctly;
- hard constraints filter or reject before scoring and controller routing;
- advisory signals can influence scoring only after hard filters;
- runtime UI role assignment supports all, partial, and none states with explicit persistence;
- live rebuilt runtime and live local Pi verification pass.

## TDD Rules For This Run

Strict TDD is mandatory.

- Each implementation area must start with a failing test.
- RED evidence must be recorded before production changes for that area.
- GREEN evidence must be recorded after the production change.
- Refactors are allowed only after the area is green.
- No production code may be changed for a behavior without a corresponding failing test first.
- Generated data changes must still be guarded by failing validation tests before regenerating or rewriting source data.
- Phase 5 QA cannot substitute for automated tests; it verifies implementation reality after automated tests pass.

## Implementation Order

The work should be implemented in the order below. Later steps depend on earlier data and contract corrections.

### Step 0: Worktree And Baseline

Actions:

- Create a fresh worktree from current `main`.
- Read the proposal, gap addendum, this implementation plan, Run 57 artifacts, and current recursive state.
- Record the exact baseline commit and diff basis in `00-worktree.md`.
- Run targeted baseline tests to prove the current audit findings are reproducible.

Baseline tests to run or create as RED checks:

- taxonomy catalog parity tests;
- classification contract mapping tests;
- live request validation tests;
- Pi compact taxonomy count tests;
- Pi runtime taxonomy precedence tests;
- UI role assignment state tests.

Exit criteria:

- The run has a clean isolated worktree.
- The implementation has concrete RED evidence for each major gap area.

### Step 1: Canonical Taxonomy Data And Manifest Receipts

Covers audit findings:

- generic task catalog does not match proposal;
- manifest lacks release receipts;
- Pi compact snapshot has stale/incomplete source data dependency.

TDD RED:

- Add failing tests proving `coder.review` and `operator.install` do not match proposal semantics.
- Add failing tests requiring exact `280` task count, exact manifest `entryFiles`, and exact manifest `contentHashes`.
- Add failing tests proving runtime JSON data is authoritative and runtime exports cannot diverge.
- Add failing tests requiring all proposal-explicit task rows to match labels, descriptions, classifier guidance, compatible roles, capabilities, modalities, tools, variants, authority, and stability.

Implementation:

- Move authoritative taxonomy task records into versioned JSON files under `role-model-router/packages/core/data/taxonomy/`.
- Replace generic task-generation semantics with JSON loading, validation, normalization, and typed exports.
- Keep helper derivation allowed only for non-authoritative indexes.
- Add manifest `entryFiles` and `contentHashes`.
- Add deterministic hashing over canonical JSON payloads.
- Make runtime taxonomy endpoints serve the validated canonical data.

GREEN verification:

- `@role-model-router/core` taxonomy catalog tests pass.
- JSON data equals runtime exported data.
- Manifest count/hash tests pass.
- Runtime taxonomy discovery tests pass for full, summary, compact, role task, and task detail endpoints.

Implementation notes:

- If the proposal contains fewer than `280` fully explicit task rows, the implementation must complete the missing rows in canonical JSON while preserving the proposal rules and addendum requirements.
- Any completed row must be human-readable and must not use generic placeholder descriptions like "`Review work for the coder role.`"

### Step 2: Strong Schemas And Canonical Validation

Covers audit findings:

- schemas too permissive;
- exact taxonomy and classification data are not enforced before build/release.

TDD RED:

- Add schema tests where valid proposal-shaped examples fail under the current weak schema coverage.
- Add malformed examples for every taxonomy schema:
  - missing required field;
  - invalid ID;
  - wrong enum;
  - wrong type;
  - unexpected property;
  - invalid reference where the validator can check cross-reference integrity.
- Add classification schema tests for the stable proposal contract.
- Add model role assignment schema tests for `all`, `include`, `exclude`, and `custom`.

Implementation:

- Strengthen all schemas under `schemas/role-model/taxonomy/`.
- Use `additionalProperties: false` except for explicit extension containers.
- Encode ID patterns, required fields, enums, array bounds, and object shape constraints.
- Add cross-reference validation in TypeScript where JSON Schema alone is insufficient.
- Wire taxonomy schema validation into runtime/core tests and package/release validation.

GREEN verification:

- Valid examples pass.
- Malformed examples fail with deterministic diagnostics.
- Canonical taxonomy data validates through the schemas.
- Package/build validation fails on stale or malformed taxonomy data.

### Step 3: Stable Request Contract And Runtime Normalization

Covers audit findings:

- stable request wire contract mismatch;
- live request validation incomplete;
- runtime diagnostics do not fully expose accepted/ignored/rejected/degraded metadata.

TDD RED:

- Add chat-completions request mapping tests for the proposal-shaped `role_model.contract_version` and snake_case `role_model.intent`.
- Add responses request mapping tests for the same contract.
- Add tests proving current camelCase-only payloads are not the documented primary contract.
- Add tests proving provider-bound payloads do not include raw `role_model`.
- Add tests for persisted normalized intent and version metadata in request observations.

Implementation:

- Add a parser for the stable external contract.
- Normalize stable external metadata into one internal router intent shape.
- Keep transitional camelCase support only behind an adapter path if needed.
- Strip `role_model` before upstream provider calls.
- Persist:
  - original contract version;
  - taxonomy version;
  - content revision;
  - classification contract version;
  - normalized role/task/capability/modality/tool fields;
  - accepted/ignored/rejected/degraded diagnostics.

GREEN verification:

- Runtime ingress tests pass on chat-completions and responses.
- Request observation tests show normalized intent and version metadata.
- Provider mock tests prove upstream requests are sanitized.

### Step 4: Hard And Advisory Validation In Live Routing

Covers audit findings:

- unknown hard fields are ignored instead of rejected;
- advisory fields lack deterministic diagnostics;
- controller and routing constraints are insufficiently proven.

TDD RED:

- Add tests for unknown hard `requested_role_id`.
- Add tests for unknown hard `task_type`.
- Add tests for unknown required capability and required modality.
- Add tests for incompatible requested role/task.
- Add tests for unsupported taxonomy version.
- Add tests for unknown advisory `role_hint_id` and preferred capability.
- Add tests proving hard constraints apply before scoring and before controller selection.
- Add tests proving advisory signals can affect scoring without changing eligibility.

Implementation:

- Validate normalized intent before routing.
- Reject invalid hard metadata with deterministic HTTP errors.
- Ignore invalid advisory metadata with diagnostics.
- Enforce role/task compatibility from canonical task `compatibleRoles`.
- Apply hard role/task/capability/modality/tool constraints before scoring.
- Pass only normalized intent, eligible candidate facts, scores, and diagnostics to the controller.
- Reject controller output that violates hard constraints and record deterministic fallback.

GREEN verification:

- Router tests pass for hard filtering, advisory scoring, and controller blocking.
- Runtime host tests pass for valid, invalid hard, invalid advisory, and incompatible role/task metadata.
- Request diagnostics show accepted, ignored, rejected, and degraded fields.

### Step 5: Pi Compact Taxonomy Generation And Runtime Taxonomy Precedence

Covers audit findings:

- Pi compact snapshot has only `86` tasks;
- Pi uses package snapshot instead of live runtime effective taxonomy;
- Pi emits implementation-specific camelCase metadata.

TDD RED:

- Add Pi tests requiring compact manifest task count `280`.
- Add Pi tests requiring each role to have at least `10` compact tasks.
- Add Pi tests proving compact `coder.review` and `operator.install` match canonical runtime data.
- Add Pi tests for runtime taxonomy success, unavailable fallback, malformed fallback, incompatible version fallback, and runtime-precedence over package snapshot.
- Add Pi tests proving emitted request metadata uses the stable proposal-shaped contract.

Implementation:

- Generate `packages/pi-role-model/data/taxonomy/**` from canonical runtime taxonomy JSON.
- Include compact hashes and source manifest metadata.
- Add `resolve-effective-taxonomy.ts`.
- Make classification accept an effective taxonomy source:
  - live runtime effective taxonomy when reachable and compatible;
  - package compact snapshot when runtime taxonomy is unavailable, malformed, or incompatible.
- Preserve progressive disclosure:
  - fetch groups first;
  - fetch role summaries next;
  - fetch task chunks only for likely roles;
  - fetch detail only when needed.
- Update Pi request injection to emit stable proposal-shaped `role_model` metadata.
- Update Pi skill/docs to show only the stable contract.

GREEN verification:

- `@try-works/pi-role-model` tests pass.
- Package data files match generated compact taxonomy.
- Package tarball includes complete compact taxonomy data.
- Runtime taxonomy mocked integration tests prove live taxonomy precedence.

### Step 6: Runtime UI Role Assignment Semantics

Covers audit findings:

- ambiguous `[]` means all roles;
- `All roles` checkbox cannot represent unchecked all;
- indeterminate and high-risk role UI coverage is incomplete.

TDD RED:

- Add component tests for default all roles selected.
- Add component tests for unchecking all roles.
- Add component tests for partial selection and indeterminate state.
- Add component tests for grouped roles and high-risk labels.
- Add persistence tests for explicit model role assignment state.
- Add routing tests proving role removal affects eligibility.

Implementation:

- Introduce explicit model role assignment shape:
  - `roleAssignmentMode`;
  - `enabledRoleIds`;
  - `disabledRoleIds`;
  - `taskOverrides`;
  - `capabilityOverrides`;
  - `modalityOverrides`;
  - `toolClassOverrides`.
- Update local model role picker and model configuration surfaces to use explicit state.
- Default newly added or loaded models to `roleAssignmentMode: "all"`.
- Implement true checked, unchecked, and indeterminate `All roles` behavior.
- Preserve group rendering and add visible high-risk role labels.
- Keep task detail in role/model drill-down, not initial model add/load flow.

GREEN verification:

- Runtime UI component tests pass.
- Runtime API persistence tests pass.
- Runtime routing tests prove role assignment affects candidate eligibility.
- UI build passes.

### Step 7: Runtime Diagnostics, Request Detail, And Existing UI Surfacing

Covers audit findings:

- router/controller use of classified intent is insufficiently visible;
- UI/diagnostics need to prove role/task intent affected routing.

TDD RED:

- Add request observation tests requiring normalized intent, classification diagnostics, and selected model/endpoint.
- Add request-detail view-model tests requiring classification fields.
- Add router decision detail tests requiring accepted/ignored/rejected/degraded metadata where available.
- Add tests for phase-appropriate links/placeholders in `/app/models/benchmark`, `/app/router/*`, and `/app/observe/*`.

Implementation:

- Add normalized classification diagnostics to request observations.
- Expose classification diagnostics in request detail and routing decision surfaces.
- Keep benchmark and telemetry integration as later-phase placeholders only.
- Ensure diagnostics avoid leaking raw provider-bound `role_model` payloads.

GREEN verification:

- Runtime host diagnostics tests pass.
- Runtime UI tests and build pass.
- Manual QA can inspect each live Pi request in UI and confirm classification influence.

## Cross-Cutting Validation Commands

The exact package manager commands may be adjusted to match the current workspace scripts, but the run must record the commands actually executed and their results.

Minimum automated verification set:

```powershell
corepack pnpm --filter @role-model-router/core test
corepack pnpm --filter @role-model-router/core build
corepack pnpm --filter @role-model-router/runtime-host-bridge test
corepack pnpm --filter @role-model-router/runtime-host-bridge build
corepack pnpm --filter @role-model-router/runtime-ui test
corepack pnpm --filter @role-model-router/runtime-ui build
corepack pnpm --filter @try-works/pi-role-model test
corepack pnpm --filter @try-works/pi-role-model build
corepack pnpm run schemas:validate
corepack pnpm run runtime:validate-host
corepack pnpm run runtime:validate-ui
corepack pnpm run runtime:validate-vendors
corepack pnpm run runtime:validate-packaging
```

If a broader command is known to fail for inherited unrelated reasons, the run must still execute the targeted commands above and document the inherited failure separately with current evidence.

## Live Runtime And Pi Verification Plan

This verification is mandatory after automated tests are green.

### QA Setup

Actions:

1. Rebuild runtime host, runtime UI, and packaged runtime artifacts from the worktree.
2. Rebuild `@try-works/pi-role-model` from the worktree.
3. Start the rebuilt local Role-Model runtime on the expected local endpoint.
4. Confirm runtime health and taxonomy endpoints:
   - `/healthz`;
   - `/api/role-model/taxonomy/manifest`;
   - `/api/role-model/taxonomy/effective`;
   - `/api/role-model/taxonomy/compact/groups`;
   - `/api/role-model/taxonomy/roles/coder/tasks.compact`;
   - `/api/role-model/taxonomy/task-types/coder.review`.
5. Install or update the rebuilt local `pi-role-model` package into the local Pi instance.
6. Run Pi setup and doctor flows.
7. Configure the Role-Model endpoint and choose a routable alias.

Receipts:

- runtime build log;
- runtime launch command and health response;
- taxonomy endpoint responses or summarized hashes;
- Pi package build/tarball path;
- Pi install/update output;
- Pi `/role-model setup`, `/role-model doctor`, alias list, and alias selection output.

### QA Valid Requests

Drive Pi to send requests through Role-Model that should classify as:

| Prompt Goal | Expected Task | Expected Role Behavior |
| --- | --- | --- |
| Review a code diff for regressions and maintainability. | `coder.review` | Advisory or hard role compatible with `coder`, with `security` or `architect` allowed as compatible lens where prompted. |
| Install and configure a package/runtime endpoint. | `operator.install` | Compatible with `operator`, `coder`, and `support`; requires tool/function capability semantics. |
| Audit a system for security risk. | `security.audit` | Security role/task diagnostics visible. |
| Verify latest/current external docs or releases. | `researcher.web_research.current` | Research task and web/current capability semantics visible. |
| Reply to a customer support issue. | `support.ticket.reply` | Support role/task diagnostics visible. |
| Use a role with a secondary group. | Example: `legal`, `finance`, or `recruiter` task | Primary and secondary group metadata visible where relevant. |

Each valid request must prove:

- Pi used live runtime taxonomy or clearly recorded fallback reason;
- Pi emitted stable proposal-shaped `role_model` metadata;
- runtime accepted and normalized metadata;
- raw `role_model` was not forwarded upstream;
- routing diagnostics show accepted classification fields;
- selected endpoint/model is recorded;
- request detail UI shows normalized intent and diagnostics.

### QA Invalid Hard Metadata

Drive Pi or a Pi-accessible diagnostic path to send invalid hard metadata:

- unknown `requested_role_id`;
- unknown hard `task_type`;
- incompatible requested role and task;
- unknown required capability;
- unsupported taxonomy version.

Expected result:

- runtime rejects deterministically;
- response includes actionable diagnostics;
- no upstream provider request is made;
- request/diagnostic record shows rejected metadata.

### QA Invalid Advisory Metadata

Drive Pi or a Pi-accessible diagnostic path to send invalid advisory metadata:

- unknown `role_hint_id`;
- unknown preferred capability;
- unauthorized advisory taxonomy entry if the test harness supports it.

Expected result:

- runtime does not reject solely for advisory invalidity;
- invalid advisory fields are ignored;
- diagnostics explain what was ignored;
- routing uses remaining valid metadata.

### QA Role Assignment Routing Reality

Actions:

1. Configure two or more candidate models/endpoints where at least one is eligible for a target role/task.
2. Confirm a request routes with the role enabled.
3. Use runtime UI or API to remove that role from one model.
4. Repeat the same request.

Expected result:

- role removal changes eligibility or selected candidate according to diagnostics;
- `ROLE_BINDING_TASK_NOT_ALLOWED`, `ROLE_BINDING_DISABLED`, or equivalent reason codes appear when appropriate;
- UI shows all/partial/none role assignment state correctly.

### QA Packaged Runtime And Package Staleness

Actions:

1. Validate the packaged runtime after rebuild.
2. Inspect packaged runtime taxonomy manifest.
3. Inspect `pi-role-model` package tarball contents.
4. Compare taxonomy versions, content revisions, counts, and hashes.

Expected result:

- packaged runtime and source runtime expose the same taxonomy manifest;
- Pi package compact taxonomy has matching content revision and expected hashes;
- task count is `280`;
- no stale Run 57 `86` task compact snapshot remains.

## Implementation Traceability

| Gap | Implementation Steps | Required Test Type | Required Live QA |
| --- | --- | --- | --- |
| Exact canonical task catalog | Step 1 | Core catalog and endpoint parity tests | Valid request diagnostics for `coder.review`, `operator.install` |
| Stable request contract | Step 3 | Chat/responses mapping, Pi emission, provider sanitization tests | Pi request shows proposal-shaped metadata accepted |
| Hard/advisory validation | Step 4 | Runtime ingress and router validation tests | Invalid hard rejected, invalid advisory ignored |
| Pi runtime taxonomy precedence | Step 5 | Mock runtime taxonomy precedence tests | Pi reads live runtime taxonomy before classifying |
| Complete Pi compact snapshot | Step 5 | Compact count/hash/package tests | Tarball and runtime hash comparison |
| Strong schemas | Step 2 | Valid/malformed schema tests | Packaged/runtime validation passes |
| Manifest release receipts | Step 1 and Step 5 | Hash/stale build tests | Packaged runtime and Pi package hashes match |
| UI all/partial/none state | Step 6 | Component and persistence tests | Role removal changes routing eligibility |
| Router/controller intent use | Step 4 and Step 7 | Router/controller/diagnostic tests | Request detail shows normalized intent and controller/fallback diagnostics |

## Phase 5 Manual QA Exit Gate

The recursive run must not mark Phase 5 QA as passing until:

- all automated verification commands required by the run have passed or inherited unrelated failures are documented;
- rebuilt runtime is launched locally;
- rebuilt Pi package is installed or updated in the local Pi instance;
- Pi setup, endpoint configuration, alias selection, and taxonomy discovery have been exercised;
- valid and invalid Pi-driven requests have been sent;
- runtime request observations and UI diagnostics have been inspected;
- role assignment changes have been verified to affect routing;
- packaged runtime and Pi tarball taxonomy manifests have been checked for staleness.

If any check fails, the implementation must iterate in the same run until it passes, or record a concrete blocker with file/code evidence and create a follow-up requirement.

## Audit Gate

Audit: PASS

This addendum has been checked against the Run 57 gap-closure audit addendum and covers each required correction with strict TDD, automated verification, and live runtime/Pi QA requirements.

## Coverage Gate

Coverage: PASS

This implementation-plan addendum covers every correction from addendum 01: exact canonical task catalog, strong schemas, stable request contract, hard/advisory live validation, Pi compact taxonomy, Pi runtime taxonomy precedence, explicit UI role assignment semantics, runtime diagnostics, router/controller classified-intent behavior, and live rebuilt-runtime plus Pi verification.

## Approval Gate

Approval: PASS

This implementation-plan addendum is ready to be used as an effective input for a follow-up recursive requirement. It remains DRAFT until a recursive lock step is explicitly run for this post-run addendum.
