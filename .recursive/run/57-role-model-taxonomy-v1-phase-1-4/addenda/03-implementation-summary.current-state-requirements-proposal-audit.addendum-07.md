# Implementation Summary Addendum 07: Current-State Requirements And Proposal Audit

Run: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/`  
Phase: `03 Implementation Summary Addendum 07`  
Artifact: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.current-state-requirements-proposal-audit.addendum-07.md`  
Status: `DRAFT`  
Workflow version: `recursive-mode-audit-v1`  
Artifact kind: run-local implementation audit addendum  
CreatedAt: `2026-06-23`  
Base Artifact: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/03-implementation-summary.md`  

Prior Addenda:
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.current-state-requirements-proposal-audit.addendum-05.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.current-state-requirements-proposal-gap-closure-implementation.addendum-06.md`

Inputs:
- `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/03-implementation-summary.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/04-test-summary.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/05-manual-qa.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/05-manual-qa-addendum-01-healthy-backends.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.current-state-requirements-proposal-gap-closure-implementation.addendum-06.md`
- current worktree state on branch `recursive/57-role-model-taxonomy-v1-phase-1-4`

## Purpose

This addendum documents the latest current-state audit requested after addendum 06. It compares the current Run 57 implementation against the locked Run 57 requirements and the external taxonomy V1 proposal.

This is a run-local recursive addendum for Run 57 implementation status. It is not an addendum to the external proposal.

## Audit Scope

The audit reviewed the current implementation against proposal Phase 1 through Phase 4 and Run 57 requirements `R2` through `R15`, with emphasis on:

- canonical taxonomy data, schemas, and generated package data;
- runtime request metadata parsing, normalization, diagnostics, and routing use;
- runtime UI model-role assignment and role/task catalog behavior;
- `pi-role-model` compact taxonomy loading, progressive classification, and request metadata emission;
- docs-site and repo documentation consistency;
- RBAC and future extensibility placeholders;
- Phase 5 QA artifacts and evidence consistency.

## Positive Findings

The current implementation has important pieces in place:

- Runtime taxonomy and Pi compact taxonomy counts match: 6 groups, 28 roles, 280 tasks, 46 capabilities, 9 modalities, and 15 tool classes.
- Every canonical role has at least 10 native tasks.
- Pi compact taxonomy content revision matches the runtime taxonomy content revision, currently `taxonomy-v1-alpha.1`.
- Core taxonomy data files exist under `role-model-router/packages/core/data/taxonomy/`.
- Pi compact taxonomy files exist under `packages/pi-role-model/data/taxonomy/`.
- The runtime accepts stable Pi-shaped `role_model` metadata as advisory fields instead of rejecting otherwise routable user requests.
- Addendum 06 records rebuilt-runtime and Pi-driven QA evidence for six proposal-style prompts and normalized role/task observations.

## Current Audit Findings

### F1: Model Role Assignment Semantics Remain Inconsistent

Severity: High

The proposal requires newly added or loaded models to default to all roles, with visible checked role controls and durable all/include/exclude semantics. The current implementation remains inconsistent across runtime binding construction, API readback, and UI routes.

Evidence:

- `role-model-router/apps/runtime-host-bridge/src/local-model-role-bindings.ts` has assignment-mode support in some paths, but `resolveEndpointRoleIds()` still calls `resolveAssignedRoleIds()` with `roleDefinitions: []`, so missing bindings can read back as no roles instead of all roles.
- `buildLlamaSwapRegistryRoleBindings()` still falls back to `[]` for missing llama-swap role overrides, which makes loaded llama-swap models look unassigned instead of all-role by default.
- `role-model-router/apps/runtime-ui/app/components/local-model-role-picker.tsx` treats empty selected roles as all-selected in default mode, but the all-role toggle can emit `[]`, which is ambiguous with all-selected unless callers also persist assignment mode.
- `role-model-router/apps/runtime-ui/app/routes/control-models.tsx`, `local-peer-models.tsx`, `local-llama-swap-models.tsx`, and `providers.tsx` still display and persist legacy empty `roleIds` states that can render as `No roles`.
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts` contains role assignment conversion helpers, but those helpers are not wired into the live UI mutation routes.

Impact:

- Users can see or save a model as having no roles even where routing or proposal semantics expect all roles.
- The UI/API cannot reliably distinguish "all current and future roles" from "no roles" or "legacy empty binding."
- Proposal Phase 3 model-role assignment behavior is not fully implemented.

Requirement references:

- `R7`
- `R14`
- `R15`
- Proposal `UI And UX Requirements`
- Proposal `Endpoint And Model Configuration Shape`

### F2: Pi Progressive Disclosure Is Still Partially Static

Severity: High

The Pi package ships compact taxonomy data and can fetch runtime taxonomy summaries, but the live extension path does not yet perform the full group-first, role-second, task-lazy progressive classification flow required by the proposal.

Evidence:

- `packages/pi-role-model/src/extension.ts` calls `resolveEffectiveTaxonomy({ endpoint })` without candidate role IDs.
- `packages/pi-role-model/src/taxonomy/resolve-effective-taxonomy.ts` only fetches runtime role task chunks when explicit role IDs are supplied. Without those role IDs, runtime task chunks do not supersede package task details before classification.
- `packages/pi-role-model/src/taxonomy/classify-with-progressive-disclosure.ts` uses a fixed rule table for a small prompt set rather than a taxonomy-driven classifier using groups, roles, tasks, tools, attachments, explicit hints, ambiguity handling, and staged lookup.
- The classifier can report loaded chunks such as `tasks:<role>` even when the live runtime resolution path did not actually fetch that task chunk from the runtime.

Impact:

- Pi can classify the tested examples, but the implementation does not yet satisfy the full proposal classification algorithm.
- Runtime task updates may not influence live Pi classification unless the package snapshot is also updated or callers supply candidate role IDs.
- Progressive disclosure is structurally present but not fully exercised by the consumer agent path.

Requirement references:

- `R8`
- `R9`
- `R14`
- `R15`
- Proposal `Progressive Disclosure Requirements`
- Proposal `Classification Contract For Consumers`

### F3: Request Metadata Normalization Does Not Fully Validate Modalities And Tool Classes

Severity: High

The approved UX change is that invalid Pi metadata should not fail user requests; unknown metadata should be treated as hints and the controller/router should fall back safely. The current implementation does this for core advisory role/task/capability fields, but modality and tool-class validation remains incomplete.

Evidence:

- `role-model-router/apps/runtime-host-bridge/src/index.ts` maps stable Pi fields into advisory `RoleModelIntent` fields in `readRoleModelIntentFromRequestBody()`.
- `createRoleModelNormalizedIntentObservation()` filters unknown roles, tasks, and capabilities and records ignored-field diagnostics.
- The same normalized-intent path copies `roleModelIntent.modalities` and `roleModelIntent.toolClasses` through without equivalent canonical taxonomy validation and ignored-field diagnostics.
- `role-model-router/packages/core/src/router.ts` uses tool classes mainly to derive `needsTools` for selected concrete tool classes; it does not enforce full canonical tool-class eligibility for all abstract tool classes.

Impact:

- Invalid modality or tool-class metadata can be persisted or used inconsistently.
- Operators cannot reliably diagnose which modality/tool-class hints were accepted, ignored, normalized, or superseded.
- Proposal metadata validation and diagnostics are only partially satisfied.

Requirement references:

- `R5`
- `R6`
- `R12`
- `R14`
- Proposal `Request Metadata Shape`
- Proposal `Router And Controller Decision Use`
- Proposal `Validation Rules`

### F4: Docs-Site Content Is Stale Relative To Taxonomy V1

Severity: High

Repo protocol docs have been updated, but the docs-site content still describes the older role/task model and conflicts with the new proposal.

Evidence:

- `apps/docs-site/content/docs/protocol/roles-and-tasks.mdx` still documents roles such as `general.chat`, `coder.patch`, and task types such as `code.edit`.
- `apps/docs-site/content/docs/runtime/models-and-role-activation.mdx` still advises against assigning every role to every model, which conflicts with the new default-all proposal behavior.
- `apps/docs-site/content/docs/index.mdx`, concept pages, and get-started pages still contain old examples such as `general.chat`, `coder.patch`, and `code.edit`.
- `apps/docs-site/content/docs/integrations/pi.mdx` has Pi setup guidance but does not fully explain taxonomy V1 discovery, progressive classification, `role_model.intent`, or fallback diagnostics.

Impact:

- External users reading the public docs-site will learn stale taxonomy IDs and model-role guidance.
- The docs-site does not satisfy Run 57 public documentation expectations for proposal Phase 1-4.

Requirement references:

- `R10`
- `R14`
- Proposal `Generated Documentation`
- Proposal `Runtime Responsibilities`
- Proposal `Consumer Responsibilities`

### F5: RBAC And Routing Policy Binding Extensibility Are Incomplete

Severity: Medium

Run 57 requires schemas and effective-taxonomy logic to preserve future RBAC, org/team/user, and routing-policy binding extension points. The current implementation has some placeholders, but the full schema surface is incomplete.

Evidence:

- `schemas/role-model/taxonomy/routing-policy-binding.schema.json` is missing.
- Effective taxonomy schema has scope/RBAC placeholders, but RBAC actions are not constrained to the required action set: `taxonomy.read`, `taxonomy.suggest`, `taxonomy.create`, `taxonomy.update`, `taxonomy.deprecate`, `taxonomy.delete`, `taxonomy.bind_policy`, and `taxonomy.use`.
- The effective taxonomy route currently returns static core taxonomy data rather than caller/scope-filtered taxonomy.
- Unsupported org/team/user scope behavior is not clearly enforced or diagnosed.

Impact:

- The schema set does not cover all resource kinds required by `R11`.
- Future RBAC and policy-binding implementation lacks a precise validated contract to build against.
- The implementation may pass current tests while failing proposal future-proofing requirements.

Requirement references:

- `R11`
- `R12`
- Proposal `Extensibility, Authority, And RBAC`

### F6: Recursive QA Artifacts Are Internally Inconsistent

Severity: Medium

The latest addendum 06 records healthy runtime and Pi QA, but the locked base Phase 5 artifact still records degraded runtime QA.

Evidence:

- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/05-manual-qa.md` still says `PASS_WITH_QA_RUNTIME_LIMITATION` and records a degraded runtime where request execution failed before routing.
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.current-state-requirements-proposal-gap-closure-implementation.addendum-06.md` records healthy rebuilt-runtime and Pi QA.
- The later QA evidence reports UI route reachability for a subset of required routes, while the base QA artifact records other route probes under a degraded-backend context.
- Browser DOM automation remained blocked by the in-app browser URL policy, so live UI behavior evidence is split between focused tests, route probes, and API checks.

Impact:

- Run 57 history is difficult to audit because base Phase 5 and later addenda appear to disagree.
- A future reviewer cannot tell which QA artifact is authoritative without a reconciliation addendum or updated Phase 5 addendum.

Requirement references:

- `R13`
- `R14`
- `R15`
- Recursive-mode Phase 5 evidence requirements

### F7: Exact Proposal Row Traceability Is Not Exhaustive Enough

Severity: Medium

The catalog counts and many structural checks pass, and addendum 05 previously claimed proposal row parity. The current test suite still appears to rely on sampled semantic checks rather than an explicit proposal-derived golden fixture that exhaustively proves every canonical row exactly matches the proposal.

Evidence:

- `role-model-router/packages/core/test/taxonomy-catalog.test.ts` verifies counts, group and role membership, content hashes, at least 10 tasks per role, reference integrity, and selected semantic examples.
- The audit did not find a standalone proposal-derived fixture that exhaustively compares every group, role, task, capability, modality, and tool-class row for labels, descriptions, classifier guidance, required/preferred capabilities, modalities, and tool classes.

Impact:

- The implementation may drift from the proposal row text while still passing count/reference/sample tests.
- This leaves a traceability gap against the locked requirement wording that implementation must exactly match the proposal catalog and schema.

Requirement references:

- `R2`
- `R3`
- `R13`
- `R15`
- `Exact Canonical Catalog Requirements`
- `Exact Schema And Data Model Requirements`

### F8: Phase 5 UI Behavior Evidence Does Not Fully Cover Proposal E2E Cases

Severity: Medium

The latest QA evidence proves rebuilt runtime/Pi execution and some route/API reachability, but it does not yet prove all required UI behaviors end to end.

Evidence:

- Addendum 06 records route reachability for `/app/models`, `/app/models/roles`, `/app/router/decisions`, and `/app/observe/requests`.
- The requirement also calls out `/app/router/candidates`, `/app/router/decisions/:requestId`, and `/app/observe/routing` where applicable.
- Route HTTP 200 checks do not prove that configured models show all roles checked by default, grouped role checkboxes work, high-risk indicators appear, removing a role affects routing, or task drill-in is usable from `/app/models`.

Impact:

- Proposal E2E cases `E2E-P3-001` through `E2E-P3-003` are not fully evidenced.
- UI acceptance remains covered mainly by focused tests rather than live rebuilt-runtime behavior.

Requirement references:

- `R7`
- `R14`
- `R15`
- Proposal `End-To-End Verification Requirements`

## Advisory Metadata Scope Note

The current implementation intentionally treats stable Pi-shaped role/task metadata as advisory when it comes from the Pi package. This is consistent with the user-approved direction to avoid failed user requests when request metadata is wrong or stale.

This audit therefore does not treat advisory fallback itself as a defect. The remaining defect is narrower: all taxonomy metadata fields, including modalities and tool classes, should be normalized against the canonical taxonomy, ignored when invalid, and recorded with diagnostics so the router/controller can fall back safely and operators can see what happened.

## Recommended Gap Closure Scope

A follow-up addendum implementation plan should use strict TDD and live rebuilt-runtime/Pi verification to close the findings in this order:

1. Fix model-role assignment semantics end to end across host binding construction, API readback, provider accounts, llama-swap models, peer models, and UI mutation routes.
2. Make Pi progressive disclosure real in the live extension path: group-first candidate narrowing, role summaries, task chunks only for likely roles, and runtime chunk supersession before classification.
3. Normalize and diagnose modalities and tool classes the same way roles, tasks, and capabilities are normalized.
4. Update docs-site content for taxonomy V1, model default-all role assignment, Pi progressive classification, and `role_model.intent`.
5. Add the missing routing-policy binding schema and tighten RBAC action/scope placeholders to the proposal contract.
6. Add exhaustive proposal-derived golden fixture tests for canonical taxonomy row content, or document an equivalent generated source-of-truth path.
7. Reconcile Phase 5 QA artifacts so the latest healthy rebuilt-runtime/Pi QA supersedes the older degraded-runtime artifact cleanly.
8. Add behavior-level live UI QA for grouped role assignment, task drill-in, high-risk indicators, route coverage, and routing impact after role removal.

## Audit Gate

Audit: FAIL

The implementation has the canonical taxonomy data and several important runtime/Pi pieces in place, but it is not yet fully consistent with the locked Run 57 requirements and proposal Phase 1-4 scope. The main remaining blockers are model-role assignment semantics, Pi progressive classification reality, complete metadata normalization, stale docs-site content, incomplete RBAC schema coverage, inconsistent QA artifacts, and incomplete exact proposal traceability.

## Coverage Gate

Coverage: PASS

This addendum covers the current known gaps from comparing the implementation against the locked Run 57 requirements and the external proposal after addendum 06.

## Approval Gate

Approval: PASS

This addendum is ready to use as the source input for a follow-up Run 57 gap-closure implementation plan.
