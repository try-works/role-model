# Implementation Summary Addendum 05: Current-State Requirements And Proposal Audit

Run: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/`  
Phase: `03 Implementation Summary Addendum 05`  
Artifact: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.current-state-requirements-proposal-audit.addendum-05.md`  
Status: `DRAFT`  
Workflow version: `recursive-mode-audit-v1`  
Artifact kind: run-local implementation audit addendum  
CreatedAt: `2026-06-23`  
Base Artifact: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/03-implementation-summary.md`  

Prior Addenda:
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.current-state-audit-findings.addendum-03.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.current-state-gap-closure-implementation.addendum-04.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/05-manual-qa-addendum-01-healthy-backends.md`

Inputs:
- `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/04-test-summary.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/05-manual-qa.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/05-manual-qa-addendum-01-healthy-backends.md`
- current worktree state on branch `recursive/57-role-model-taxonomy-v1-phase-1-4`

## Purpose

This addendum documents the current implementation-state audit requested after the Run 57 gap-closure implementation and healthy-backend QA addendum.

This is a run-local recursive addendum for Run 57 implementation status. It is not an addendum to the external proposal.

## Audit Scope

The audit compared the current worktree implementation against:

- the approved Run 57 requirements;
- the taxonomy V1 proposal;
- prior Run 57 implementation and QA addenda;
- the current canonical taxonomy data, schema files, runtime host bridge, runtime UI, Pi package code, and Phase 5 evidence.

## Positive Findings

The current implementation has closed several earlier gaps:

- Canonical taxonomy JSON exists under `role-model-router/packages/core/data/taxonomy/` with the required 6 groups, 28 roles, 280 task types, 46 capabilities, 9 modalities, and 15 tool classes.
- Direct comparison of the proposal task table against `task-types.json` found no row-level drift for task IDs, labels, descriptions, use-when guidance, do-not-use-when guidance, primary roles, compatible roles, or required/preferred capabilities.
- Runtime discovery exposes the taxonomy route family and compact progressive-disclosure routes.
- The Pi package ships compact taxonomy data and can inject `role_model.intent` into real Pi provider requests for known Role-Model aliases.
- The healthy-backend QA addendum supersedes the earlier QA-runtime limitation: Pi installed the worktree package, configured endpoint and alias, sent a prompt through a Role-Model alias, received a live backend completion, and runtime telemetry recorded `requestedRoleId`, role IDs, `ROLE_POLICY_APPLIED`, and `TASK_POLICY_APPLIED`.

## Remaining Findings

### Finding 1: Taxonomy Schemas Are Not Wired Into The Canonical Schema Validation Path

Severity: High

Run 57 requires versioned JSON Schemas for taxonomy resources and schema tests proving valid proposal-shaped examples pass and malformed entries fail. The new taxonomy schemas live under:

- `schemas/role-model/taxonomy/`

However, the existing schema validation tool still loads only:

- `protocol/schemas`

Evidence:

- `packages/schema-tools/src/validate-schemas.ts` defines `schemaDir = path.join(repoRoot, "protocol", "schemas")`.
- `role-model-router/packages/core/test/taxonomy-data-files.test.ts` only checks that taxonomy schema files exist; it does not compile them with Ajv or validate valid/invalid taxonomy fixtures.

Impact:

- `corepack pnpm run schemas:validate` can pass without compiling the new taxonomy schemas.
- Malformed taxonomy schema changes can enter the run without the required schema validation gate catching them.

Requirement references:

- `R2` acceptance criteria for schema files and malformed-entry tests.
- `R13` verification floor for focused taxonomy/schema/data validation.

### Finding 2: Taxonomy Schemas Are Too Loose To Enforce The Proposal Contract

Severity: High

Several taxonomy schemas are permissive in ways that conflict with the requirement to encode the proposal data model exactly.

Examples:

- `schemas/role-model/taxonomy/task-type.schema.json` has `additionalProperties: true`.
- `task-type.schema.json` allows `kind` to be any non-empty string instead of the canonical `task_type`.
- `schemas/role-model/taxonomy/role.schema.json` and `group.schema.json` also use permissive `additionalProperties: true`.
- `schemas/role-model/taxonomy/manifest.schema.json` does not require `generatedAt`, `entryFiles`, or `contentHashes`, even though the manifest requirements name those release/package receipt fields.

Impact:

- The schemas do not prevent extra or incorrect fields where the proposal expects a stable contract.
- The schemas cannot be relied on as release gates for exact taxonomy shape, manifest receipt shape, or canonical kind-scoped identity.

Requirement references:

- `Exact Schema And Data Model Requirements`.
- `R2` manifest and schema acceptance criteria.
- `R12` versioning and persisted metadata requirements.

### Finding 3: Model Role Assignment Persistence Does Not Implement `roleAssignmentMode`

Severity: High

The proposal and Run 57 requirement require model role assignment persistence to support:

- `roleAssignmentMode`
- `enabledRoleIds`
- `disabledRoleIds`
- `taskOverrides`
- `capabilityOverrides`
- `modalityOverrides`
- `toolClassOverrides`

Current implementation still persists simple per-account model role bindings:

- `modelRoleBindings: [{ modelId, roleIds }]`

Evidence:

- `role-model-router/apps/runtime-ui/app/routes/control-models.tsx` creates account mutation payloads with `modelRoleBindings` and `roleIds`.
- `role-model-router/apps/runtime-host-bridge/src/index.ts` removes a model binding entirely when the role ID list is empty.
- `schemas/role-model/taxonomy/model-role-assignment.schema.json` exists, but the UI/API persistence path does not use this assignment shape.

Impact:

- The runtime cannot distinguish "all roles, inherit future roles" from "no explicit role binding."
- The `All roles` proposal semantics cannot be represented durably.
- Future minor taxonomy additions cannot be inherited by assignment mode as required.

Requirement references:

- `R7` model role assignment acceptance criteria.
- Proposal `Add/Load Model Flow In Existing UI`.
- Proposal `Endpoint And Model Configuration Shape`.

### Finding 4: `/app/models` Does Not Yet Meet The Taxonomy-Aware Model Detail Requirements

Severity: High

The proposal makes `/app/models` the primary configured-model surface for role coverage, role assignment, task coverage by role, and task drill-in. The current `/app/models` inspect modal is only partially taxonomy-aware.

Current gaps:

- Backing-account role bindings render as a flat checkbox list, not canonical group sections.
- The configured-model modal does not use the upgraded `LocalModelRolePicker`.
- Missing model role bindings initialize as an empty list, which renders as no selected roles instead of the proposal's all-roles default.
- There is no task drill-in by role inside `/app/models`.
- High-risk role indicators are not visible.

Evidence:

- `role-model-router/apps/runtime-ui/app/routes/control-models.tsx` renders role checkboxes by mapping `rolePolicy.roleDefinitions` directly.
- `role-model-router/apps/runtime-ui/app/routes/control-models.tsx` initializes draft role IDs from existing bindings only.
- No high-risk marker or task drill-in component is present in the configured-model modal.

Impact:

- Users cannot verify or adjust configured remote/local model taxonomy coverage according to the proposed grouped all-roles UX.
- Phase 3 UI acceptance criteria are not fully implemented.

Requirement references:

- `R7` `/app/models` and UI acceptance criteria.
- Proposal `Existing Routes To Extend`.
- Proposal `Add/Load Model Flow In Existing UI`.

### Finding 5: `/app/models/roles` Is Role-First But Not Group-First

Severity: Medium

Groups are a first-level taxonomy concept in the proposal and requirement. The role catalog route exposes role/task drill-in, but `RoleCatalogHierarchy` still sorts roles alphabetically in a flat grid.

Evidence:

- `role-model-router/apps/runtime-ui/app/lib/role-task-hierarchy.tsx` sorts role definitions by `role_id` and renders them directly.
- The role catalog does not section roles by `primaryGroupId`.
- Secondary group membership is not visible in the role catalog.

Impact:

- The UI does not yet reflect the proposal's group-first taxonomy model.
- Operators cannot scan groups as the first-level concept before drilling into roles/tasks.

Requirement references:

- `R7` group and secondary membership UI criteria.
- Proposal `Role And Group Catalog UI`.
- Proposal progressive-disclosure model.

### Finding 6: High-Risk Roles Are Not Explicitly Labeled

Severity: Medium

Run 57 requires high-risk roles to be labeled consistently. The taxonomy has governance-sensitive roles and tasks, but the current data and UI do not expose a canonical high-risk marker.

Evidence:

- Searches for `highRisk`, `high-risk`, `riskLevel`, and `policy_guarded` in taxonomy data and UI role-picker/model routes did not find a role-level marker or rendering path.
- `governance_safety` is a group, but group membership alone does not satisfy the explicit high-risk label requirement for roles such as `legal`, `health`, `finance`, `recruiter`, and `security`.

Impact:

- Operators are not warned when assigning or inspecting policy-sensitive roles.
- Future benchmark/telemetry and RBAC layers lack a clean role-level signal for risk-sensitive treatment.

Requirement references:

- `R7` high-risk role indicator acceptance criteria.
- Proposal `UX Safeguards`.

### Finding 7: Pi Progressive Disclosure Is Implemented As Compact Data Plus Fixed Heuristics, Not A Full Group-Then-Role-Then-Task Lookup Flow

Severity: Medium

The Pi package ships compact data and can resolve selected runtime role chunks, but the classifier does not yet use the taxonomy catalog as a real progressive classification source.

Evidence:

- `packages/pi-role-model/src/taxonomy/classify-with-progressive-disclosure.ts` uses a fixed regex rule table for a small set of roles/tasks.
- `packages/pi-role-model/src/taxonomy/resolve-effective-taxonomy.ts` defaults to all package role IDs and fetches every role task chunk when `roleIds` is not supplied.
- Tests cover six proposal examples but do not prove group-first candidate narrowing across the full taxonomy or that ordinary classification avoids loading all role task chunks.

Impact:

- Pi can emit useful metadata for known patterns, but it does not yet satisfy the full progressive-disclosure classification algorithm.
- Large taxonomy growth may still overload runtime fetches or package context unless callers explicitly constrain role IDs.

Requirement references:

- `R8` compact snapshot lazy-load and guardrail criteria.
- `R9` group-first Pi classification criteria.
- Proposal `Progressive Disclosure Requirements`.

### Finding 8: Ignored Advisory Metadata Is Safe But Not Diagnosed Explicitly Enough

Severity: Medium

The approved UX change is that malformed or unknown stable Pi metadata should not fail the user's request. The implementation follows that safety rule by treating stable Pi metadata as advisory. However, the runtime does not yet record detailed ignored/normalized diagnostics for unknown advisory role/task/capability fields.

Evidence:

- `role-model-router/apps/runtime-host-bridge/src/index.ts` parses stable proposal-shaped metadata into `hard: false` role/task hints.
- Unknown stable advisory role/task values are not promoted to hard routing policy.
- The persisted routing diagnostics do not include explicit ignored-field diagnostics for those unknown advisory fields.

Impact:

- User requests are protected from metadata-caused failures, which is correct.
- Operators and future telemetry cannot easily see which Pi metadata was accepted, ignored, normalized, or superseded.

Requirement references:

- `R5` accepted/rejected/ignored/normalized diagnostics.
- Proposal `Validation Rules`.
- Proposal `Router And Controller Decision Use`.

### Finding 9: Persisted Request Detail Does Not Include A Durable Normalized Intent Object

Severity: Medium

Runtime observations persist router decisions, policy snapshots, eligibility, scores, and role policy diagnostics, but they do not persist the normalized `role_model.intent` object or a dedicated `normalizedIntent` field with taxonomy/content/classification versions.

Evidence:

- `role-model-router/apps/runtime-host-bridge/src/index.ts` creates runtime observation bundles from the routed decision and merged diagnostics.
- The live QA request detail evidence shows `requestedRoleId`, policy snapshot, eligibility, scored candidates, and `rolePolicy`, but not the full normalized request intent object.

Impact:

- Phase 5 QA can infer role/task routing from policy snapshots and telemetry, but cannot directly inspect the normalized intent object required by the proposal.
- Historical debugging and future telemetry cannot reliably distinguish client-supplied intent, normalized runtime intent, and controller-derived routing facts.

Requirement references:

- `R5` normalized metadata diagnostics.
- `R12` persisted decision version fields.
- `R14` Phase 5 normalized-intent inspection requirement.

### Finding 10: Phase 5 UI Evidence Proves Route Reachability More Than Required UI Behavior

Severity: Medium

The healthy-backend QA addendum closes the live Pi/backend execution gap. The UI portion of Phase 5 evidence still appears limited to route probes and automated focused tests, not end-to-end verification of all proposed UI behaviors.

Current evidence proves:

- `/app/models`, `/app/models/roles`, `/app/router/candidates`, `/app/router/decisions`, `/app/observe/requests`, and `/app/observe/routing` return HTTP 200.

Current evidence does not prove:

- configured models show all roles checked by default;
- grouped role checkboxes appear in `/app/models`;
- high-risk indicators appear;
- removing a role from a model affects routing through the UI path;
- task drill-in is usable from `/app/models`.

Impact:

- Phase 5 should not be treated as fully satisfying `E2E-P3-001` through `E2E-P3-003` until the behavior-level UI checks are added.

Requirement references:

- `R14` UI inspection criteria.
- `R15` proposal E2E coverage criteria.
- Proposal `E2E-P3-001` through `E2E-P3-003`.

### Finding 11: Worktree Hygiene Needs Cleanup Before Commit

Severity: Low

The run 57 branch still has untracked run artifacts and a modified generated Python bytecode file:

- `.agents/skills/recursive-mode/scripts/__pycache__/lint-recursive-run.cpython-314.pyc`

Impact:

- Product changes may be mixed with generated local residue unless cleaned before commit.
- Recursive evidence/addenda should be reviewed intentionally before staging.

Requirement references:

- Recursive-mode diff audit and handoff hygiene expectations.

## Non-Findings

The following earlier issues should no longer be treated as current gaps:

- Canonical taxonomy JSON content is no longer generic/template-only.
- Manifest content hashes are no longer placeholder repeated hashes.
- Pi package/runtime taxonomy content hashes are traceable through compact manifest `runtimeContentHashes`.
- Stable Pi advisory metadata no longer rejects otherwise routable user requests.
- QA runtime backends are no longer the blocker after `05-manual-qa-addendum-01-healthy-backends.md`.

## Recommended Gap Closure Scope

A follow-up implementation plan should use TDD and live Pi/runtime verification to close the remaining gaps in this order:

1. Wire taxonomy schemas into validation and add valid/invalid fixtures for all taxonomy schema kinds.
2. Tighten schemas to enforce canonical kinds, required manifest receipt fields, and the proposal data model.
3. Implement durable model role assignment mode semantics and migrate/read existing `modelRoleBindings` safely.
4. Upgrade `/app/models` and `/app/models/roles` to group-first, high-risk-aware, task-drill-in UI behavior.
5. Improve Pi classification to perform real group-first progressive lookup and prove lazy loading.
6. Persist normalized intent and ignored/normalized taxonomy diagnostics in runtime observations.
7. Add behavior-level browser/runtime/Pi QA for the UI and diagnostics requirements.
8. Clean generated local residue before commit.

## Audit Gate

Audit: FAIL

The implementation is substantially closer to the proposal than prior audit states, and the canonical taxonomy content now matches the proposal task catalog. Remaining gaps still exist in taxonomy schema enforcement, model role assignment persistence, UI behavior, Pi progressive classification, and runtime normalized-intent diagnostics.

## Coverage Gate

Coverage: PASS

This addendum covers the current known gaps from comparing the implementation against the approved Run 57 requirements and proposal Phase 1-4 scope after prior gap closure and healthy-backend QA addenda.

## Approval Gate

Approval: PASS

This addendum is ready to use as the source input for a follow-up gap-closure implementation plan.
