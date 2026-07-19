# Implementation Summary Addendum 09: Current-State Requirements And Proposal Audit

Run: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/`  
Phase: `03 Implementation Summary Addendum 09`  
Artifact: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.current-state-requirements-proposal-audit.addendum-09.md`  
Status: `DRAFT`  
Workflow version: `recursive-mode-audit-v1`  
Artifact kind: run-local implementation audit addendum  
CreatedAt: `2026-06-24`  
Base Artifact: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/03-implementation-summary.md`

Inputs:
- `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/02-to-be-plan.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/04-test-summary.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/05-manual-qa.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/05-manual-qa-addendum-01-healthy-backends.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/02-to-be-plan.current-state-requirements-proposal-gap-closure-implementation-plan.addendum-04.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.current-state-gap-closure-implementation.addendum-08.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/05-manual-qa.current-state-gap-closure-live-runtime-pi-package-qa.addendum-01.md`
- current worktree state on branch `recursive/57-role-model-taxonomy-v1-phase-1-4`

## Purpose

This addendum documents the current audit findings after comparing the Run 57 implementation state against the locked Run 57 requirements and the Role-Model Taxonomy V1 proposal.

This is a run-local recursive addendum for Run 57 implementation status. It is not an addendum to the external proposal.

## Audit Scope

The audit reviewed proposal Phase 1 through Phase 4 and Run 57 requirements `R2` through `R15`, with emphasis on:

- Pi progressive disclosure and request classification behavior;
- model role assignment semantics across runtime host, provider, local peer, llama-swap, and UI routes;
- public docs consistency with taxonomy V1;
- recursive QA artifact consistency;
- live UI evidence for proposal E2E cases;
- compact taxonomy parity between runtime data and the Pi package.

## Positive Findings

The current implementation has closed several previously identified gaps:

- canonical taxonomy runtime data exists with counts `6` groups, `28` roles, `280` tasks, `46` capabilities, `9` modalities, and `15` tool classes;
- `role-model-router/packages/core/testdata/taxonomy/proposal-v1-golden.json` exists and core taxonomy tests compare runtime taxonomy data against it exactly;
- `schemas/role-model/taxonomy/routing-policy-binding.schema.json` exists;
- effective taxonomy and routing policy schemas include the required RBAC action names;
- runtime normalized intent handling validates and diagnoses unknown advisory modalities and tool classes;
- built runtime defaults no longer expose legacy default fixture roles `general.chat`, `coder.patch`, or `tool.agent`;
- healthy-backend QA evidence exists in `05-manual-qa-addendum-01-healthy-backends.md`.

## Current Audit Findings

### F1: Pi Classification Is Still Mostly Static

Severity: High

The proposal requires Pi to classify progressively by narrowing groups, roles, and task chunks before emitting request metadata. The current classifier is still primarily a fixed regex rule table rather than a taxonomy-driven staged classifier.

Evidence:

- `packages/pi-role-model/src/taxonomy/classify-with-progressive-disclosure.ts` defines a static `rules` table at line `41`.
- `classifyWithProgressiveDisclosure()` chooses `rules.find(...) ?? rules[1]` at line `104`.
- `rules[1]` is the `security` / `security.audit` rule, so unknown prompts default to security classification.
- confidence and task confidence are hard-coded to `0.72` at lines `122` and `129`.
- `loadedChunks` is reported as `["groups", "roles:<role>", "tasks:<role>"]` without proving those chunks were actually loaded from runtime in the live extension path.

Impact:

- Unknown or low-confidence prompts can receive over-specific security metadata instead of broad advisory fallback.
- This conflicts with the user-approved principle that bad or stale Pi metadata should not degrade UX and should let the router/controller fall back safely.
- The implementation satisfies the six sampled prompts but does not yet satisfy the full proposal classification algorithm.

Requirement references:

- `R8`
- `R9`
- `R14`
- `R15`
- Proposal `Progressive Disclosure Requirements`
- Proposal `Classification Contract For Consumers`

### F2: Live Pi Extension Path Does Not Fetch Candidate Runtime Task Chunks Before Classification

Severity: High

Runtime task chunk supersession exists as a callable API path, but the live Pi extension startup/request path does not perform the two-pass candidate-role lookup required by the proposal.

Evidence:

- `packages/pi-role-model/src/extension.ts` calls `resolveEffectiveTaxonomy()` without `roleIds` at line `53`.
- `packages/pi-role-model/src/taxonomy/resolve-effective-taxonomy.ts` fetches runtime `tasks.compact` chunks only for supplied `roleIds` at lines `203` and `216-221`.
- `packages/pi-role-model/src/request-intent.ts` injects classification using the already resolved taxonomy and does not perform a request-time runtime role/task chunk fetch.

Impact:

- Runtime groups and role summaries can supersede package data, but runtime task details do not affect live request classification unless candidate role IDs are supplied by a separate caller.
- Runtime taxonomy updates for task labels, guidance, capabilities, modalities, or tool classes may not influence Pi classification until the package snapshot is updated.
- Progressive disclosure is structurally present, but not fully wired into the consumer request path.

Requirement references:

- `R8`
- `R9`
- `R14`
- `R15`
- Proposal `Progressive Disclosure Requirements`
- Proposal `Runtime Discovery`

### F3: Model Role Assignment Semantics Remain Inconsistent Outside `/app/models`

Severity: High

The proposal requires newly added or loaded models to default to all roles with visible checked controls, plus durable all/include/exclude semantics. The main `/app/models` path has improved conversion helpers, but local peer, llama-swap, and provider setup paths still expose legacy empty-role behavior.

Evidence:

- `role-model-router/apps/runtime-ui/app/routes/local-peer-models.tsx` sends raw `loadRoleIds` to `loadPeerModel()` at line `74`.
- the peer model route tells users to "Leave empty to register without role coverage" at lines `161-162`.
- the peer model route displays empty roles as `No roles` at line `204`.
- `role-model-router/apps/runtime-ui/app/routes/local-llama-swap-models.tsx` sends raw `roleIds` to `loadLlamaSwapModel()` at line `83`.
- the llama-swap route says "Assign roles before loading" at line `144`, implying empty selection is not default-all.
- the llama-swap route displays empty roles as `No roles` at line `223`.
- `role-model-router/apps/runtime-ui/app/routes/providers.tsx` drops empty bindings in `buildModelRoleBindings()` at line `94`.
- provider maintenance display still renders empty bindings as `No roles assigned` at line `983`.

Impact:

- Users can still create or view models as having no role coverage where the proposal expects all roles by default.
- Empty arrays remain ambiguous between "all roles by default" and "intentionally no roles" on several routes.
- Role-removal routing behavior may be inconsistent depending on which model setup path created the binding.

Requirement references:

- `R7`
- `R12`
- `R14`
- `R15`
- Proposal `UI And UX Requirements`
- Proposal `Endpoint And Model Configuration Shape`

### F4: Public Repo Docs Still Contain Legacy Taxonomy Guidance

Severity: Medium

The docs-site content appears to have a taxonomy V1 scan, but other public repo docs still teach legacy role/task/capability examples.

Evidence:

- `docs/public/concepts/protocol-overview.md` line `18` describes `RoleDefinition` with `general.chat` and `coder.patch`.
- `docs/public/concepts/protocol-overview.md` lines `63-65` use `coder.patch`, `code.edit`, and `code.edit` as role/task/capability examples.
- `docs/protocol/roles.md` lines `7-10` describe legacy roles `general.chat`, `coder.patch`, `coder.review`, and `tool.agent`.
- `docs/public/quickstart.md` lines `27-28` use `taskType: "code.edit"` and `requiredCapabilities: ["code.edit"]`.
- `docs/public/quickstart.md` line `57` still describes satisfying the required `code.edit` capability.

Impact:

- External users reading repo docs can learn stale taxonomy IDs that are no longer canonical in runtime defaults.
- The public documentation surface is inconsistent with taxonomy V1 and with the user-facing package/runtime behavior.
- This partially violates Run 57 documentation expectations even if docs-site MDX checks pass.

Requirement references:

- `R10`
- `R14`
- Proposal `Generated Documentation`
- Proposal `Runtime Responsibilities`
- Proposal `Consumer Responsibilities`

### F5: Phase 5 QA Evidence Is Split Across Canonical And Noncanonical Addenda

Severity: Medium

The strongest healthy-backend QA evidence exists, but the recursive record is difficult to audit because the locked base QA and later addenda disagree or live in different locations/statuses.

Evidence:

- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/05-manual-qa.md` is locked and records `Audit Result: PASS_WITH_QA_RUNTIME_LIMITATION`.
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/05-manual-qa-addendum-01-healthy-backends.md` is locked and states the earlier limitation is superseded.
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/05-manual-qa.current-state-gap-closure-live-runtime-pi-package-qa.addendum-01.md` is in the canonical `addenda/` directory but has `Status: DRAFT`.
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.current-state-gap-closure-implementation.addendum-08.md` is also `Status: DRAFT` while claiming final implementation verification.

Impact:

- Future reviewers cannot identify the authoritative final QA result without reading multiple artifacts and inferring precedence.
- Recursive-mode auditability is weakened because the canonical addenda are draft while a noncanonical top-level addendum carries locked supersession evidence.
- Run closeout or merge review may incorrectly rely on stale degraded-backend QA.

Requirement references:

- `R13`
- `R14`
- `R15`
- Recursive-mode Phase 5 addendum and evidence requirements

### F6: Live UI Behavior Evidence Does Not Fully Prove Proposal E2E-P3

Severity: Medium

Existing evidence proves route reachability and focused tests, but the audit did not find full rebuilt-runtime live UI behavior evidence for every Phase 3 E2E requirement.

Evidence:

- `05-manual-qa.md` records HTTP 200 route probes for `/app/models`, `/app/models/roles`, `/app/router/candidates`, `/app/router/decisions`, `/app/observe/requests`, and `/app/observe/routing`.
- HTTP route probes alone do not prove all roles are visibly checked by default, grouped checkboxes work, high-risk labels appear, task drill-in is usable, or role removal affects routing.
- The newer current-state QA addendum under `addenda/` verifies runtime/package behavior but does not include DOM/API evidence for all UI assignment interactions.

Impact:

- Proposal E2E cases `E2E-P3-001` through `E2E-P3-003` remain under-evidenced at the live rebuilt-runtime layer.
- Focused component tests are useful, but the proposal explicitly requires Phase 5 end-to-end practical verification.

Requirement references:

- `R7`
- `R14`
- `R15`
- Proposal `End-To-End Verification Requirements`

### F7: Pi Compact Taxonomy Parity Is Not Exhaustive Enough

Severity: Medium

Core taxonomy data is compared exactly to the proposal-derived golden fixture, but Pi compact taxonomy tests only compare versions, counts, IDs, and task ID sets.

Evidence:

- `role-model-router/packages/core/test/taxonomy-catalog.test.ts` compares runtime taxonomy data exactly against `proposal-v1-golden.json`.
- `packages/pi-role-model/test/taxonomy-data-files.test.ts` checks package taxonomy `taxonomyVersion`, `contentRevision`, `classificationContractVersion`, counts, group IDs, role IDs, and task IDs.
- The Pi package test does not exhaustively prove compact role/task chunks preserve required labels, descriptions, classifier guidance, required/preferred capabilities, modalities, tool classes, or content-hash linkage back to the golden fixture.

Impact:

- Pi compact data could drift semantically from the proposal/runtime while keeping matching counts and IDs.
- Progressive classification quality depends on the compact chunk content, not only the IDs.
- This leaves a traceability gap against the addendum 04 requirement for exact Pi compact parity.

Requirement references:

- `R2`
- `R3`
- `R8`
- `R13`
- `R15`
- `Exact Canonical Catalog Requirements`

## Recommended Gap Closure Scope

A follow-up implementation plan should use strict TDD and live rebuilt-runtime/Pi verification to close findings in this order:

1. Replace the Pi static rule fallback with a staged classifier that selects candidate groups, then roles, then loads candidate task chunks before final task selection.
2. Wire request-time Pi classification to fetch runtime task chunks for candidate roles when runtime taxonomy is available and compatible.
3. Normalize all model setup routes to the same all/include/exclude assignment semantics used by `/app/models`.
4. Update all public repo docs that still contain legacy taxonomy examples, or clearly mark them as historical if they must remain.
5. Create a canonical locked Phase 5 reconciliation addendum under `addenda/` that explicitly supersedes the degraded QA record and points to the healthy-backend evidence.
6. Add behavior-level live UI QA evidence for grouped all-role defaults, high-risk labels, task drill-in, role removal, and routing impact.
7. Strengthen Pi compact taxonomy parity tests to compare compact role/task row fields against the golden fixture, not only counts and IDs.

## Audit Gate

Audit: FAIL

The implementation has the core taxonomy, runtime discovery, metadata normalization, RBAC schema, and healthy-backend QA foundations in place, but the current state remains inconsistent with the locked Run 57 requirements and proposal Phase 1-4 scope in the areas listed above.

## Coverage Gate

Coverage: PASS

This addendum documents the current known gaps from comparing the implementation against the locked Run 57 requirements, the proposal, and the current worktree state.

## Approval Gate

Approval: PASS

This addendum is ready to use as the source input for a follow-up Run 57 gap-closure implementation plan.
