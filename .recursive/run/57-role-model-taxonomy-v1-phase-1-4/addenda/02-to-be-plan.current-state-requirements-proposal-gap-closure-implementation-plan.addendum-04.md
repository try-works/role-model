# To-Be Plan Addendum 04: Current-State Requirements And Proposal Gap Closure Implementation Plan

Run: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/`  
Phase: `02 To-Be Plan Addendum 04`  
Artifact: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/02-to-be-plan.current-state-requirements-proposal-gap-closure-implementation-plan.addendum-04.md`  
Status: `DRAFT`  
Workflow version: `recursive-mode-audit-v1`  
Artifact kind: run-local implementation plan addendum  
CreatedAt: `2026-06-23`  
Base Artifact: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/02-to-be-plan.md`  
TDD Mode: `strict`  
QA Execution Mode: `agent-operated`

Inputs:
- `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.current-state-requirements-proposal-audit.addendum-07.md`
- current worktree state on branch `recursive/57-role-model-taxonomy-v1-phase-1-4`

## Purpose

This addendum defines the implementation plan for closing the remaining Run 57 audit findings in addendum 07. It is a run-local recursive implementation plan for Run 57 and is not an addendum to the external proposal.

The implementation must remain scoped to proposal Phase 1 through Phase 4. Proposal Phase 5 benchmark implementation and proposal Phase 6 telemetry implementation remain out of scope except for the schema, metadata, UI placeholder, and diagnostics extension points already required by Run 57.

## Effective Inputs Re-Read Requirement

Before implementation starts, re-read:

1. `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md`
2. `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
3. `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.current-state-requirements-proposal-audit.addendum-07.md`
4. this addendum

Record the re-read in the next implementation summary addendum before any code changes.

## Non-Negotiable Taxonomy Contract

The implementation must preserve the proposal taxonomy exactly. Any change to these IDs, group relationships, counts, naming semantics, or row content requires a new audit addendum and user approval before implementation continues.

Canonical counts:

| Resource | Required count |
| --- | ---: |
| Groups | 6 |
| Roles | 28 |
| Task types | 280 |
| Capabilities | 46 |
| Modalities | 9 |
| Tool classes | 15 |

Canonical groups:

```text
engineering, product_design, knowledge_research, business, communication, governance_safety
```

Canonical roles:

```text
coder, architect, security, researcher, writer, operator, analyst, planner, tester, data, product, designer, support, legal, finance, creative, educator, translator, marketer, seller, recruiter, procurement, coordinator, knowledge, strategist, mathematician, scientist, health
```

Canonical role group membership:

| Role ID | Primary Group | Secondary Groups |
| --- | --- | --- |
| `coder` | `engineering` |  |
| `architect` | `engineering` |  |
| `security` | `engineering` | `governance_safety` |
| `researcher` | `knowledge_research` |  |
| `writer` | `communication` |  |
| `operator` | `engineering` |  |
| `analyst` | `product_design` |  |
| `planner` | `product_design` |  |
| `tester` | `engineering` |  |
| `data` | `engineering` |  |
| `product` | `product_design` |  |
| `designer` | `product_design` |  |
| `support` | `communication` |  |
| `legal` | `governance_safety` | `business` |
| `finance` | `business` | `governance_safety` |
| `creative` | `communication` |  |
| `educator` | `knowledge_research` |  |
| `translator` | `communication` |  |
| `marketer` | `business` |  |
| `seller` | `business` |  |
| `recruiter` | `governance_safety` | `business` |
| `procurement` | `business` |  |
| `coordinator` | `communication` |  |
| `knowledge` | `knowledge_research` |  |
| `strategist` | `business` |  |
| `mathematician` | `knowledge_research` |  |
| `scientist` | `knowledge_research` |  |
| `health` | `governance_safety` | `knowledge_research` |

Canonical capabilities:

```text
text.chat, code.read, code.write, reasoning.multi_step, tools.function_calling, tools.command_execution, json.schema_adherence, security.analysis, web.search, citation.synthesis, long_context, tools.browser_control, vision.input, data.query, data.schema, data.transform, legal.analysis, finance.analysis, reasoning.divergent, vision.output, communication.user_facing, communication.follow_up, education.tutoring, education.assessment, language.translation, language.localization, marketing.analysis, marketing.copy, sales.analysis, sales.communication, recruiting.analysis, procurement.analysis, coordination.workflow, calendar.planning, knowledge.organization, knowledge.retrieval, memory.write, strategy.analysis, market.analysis, math.solve, math.verify, math.modeling, science.analysis, science.method, health.general_info, health.safety
```

Canonical modalities:

```text
text, image, audio, video, file, structured_json, tabular, code_patch, document
```

Canonical tool classes:

```text
filesystem.read, filesystem.write, shell.execute, browser.control, web.search, http.fetch, database.query, package.install, calendar.read, calendar.write, email.read, email.write, memory.read, memory.write, vector.search
```

Canonical task IDs must remain the exact 280 IDs in `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md` under `Canonical task type IDs`, and every task ID must use `{role-family}.{task-action}[.{variant}]` with the first segment equal to a canonical role ID. The implementation must add or confirm an exhaustive golden fixture that compares the full proposal row content, not only the ID list.

Required golden fixture behavior:

- Add or update a committed proposal-derived fixture, preferably `role-model-router/packages/core/testdata/taxonomy/proposal-v1-golden.json`, containing the exact proposal row content for groups, roles, task types, capabilities, modalities, and tool classes.
- The fixture must include IDs, labels, descriptions, primary and secondary group membership, primary role, compatible roles, classifier guidance, required/preferred capabilities, required modalities, tool classes, UI metadata, authority, stability, version metadata, and any proposal examples/non-examples or ambiguity guidance present in the source proposal.
- Tests must compare generated runtime taxonomy data and Pi compact taxonomy data against the fixture for IDs, counts, references, row fields, row order where order is meaningful, and content hashes.
- Tests must fail on a changed label, missing description, changed classifier guidance, missing capability, missing modality, missing tool class, wrong group membership, missing high-risk metadata, or stale Pi compact snapshot.

## Finding-To-Implementation Map

| Audit finding | Implementation slice |
| --- | --- |
| `F1` model role assignment semantics | Slice 1: assignment-mode semantics end to end |
| `F2` Pi progressive disclosure | Slice 2: real Pi group-first progressive lookup and classification |
| `F3` modality/tool-class normalization | Slice 3: complete normalized intent diagnostics |
| `F4` stale docs-site | Slice 4: docs-site taxonomy V1 update |
| `F5` RBAC/routing policy binding | Slice 5: future-proof schema/effective taxonomy contract |
| `F6` inconsistent QA artifacts | Slice 6: QA reconciliation artifact |
| `F7` exact row traceability | Slice 0: proposal golden fixture and taxonomy parity tests |
| `F8` insufficient live UI behavior evidence | Slice 7: rebuilt runtime and Pi end-to-end behavior QA |

## Implementation Slices

### Slice 0: Proposal Golden Fixture And Exact Taxonomy Parity

Requirements: `R2`, `R3`, `R13`, `R15`

Changed paths expected:

- `role-model-router/packages/core/testdata/taxonomy/proposal-v1-golden.json`
- `role-model-router/packages/core/test/taxonomy-catalog.test.ts`
- `role-model-router/packages/core/test/taxonomy-data-files.test.ts`
- `packages/pi-role-model/test/taxonomy-data-files.test.ts`
- taxonomy generator or manifest code if needed

RED tests to add first:

- A core taxonomy parity test that fails if any runtime row differs from the proposal-derived golden fixture.
- A Pi compact taxonomy parity test that fails if Pi compact files do not reflect the runtime fixture for counts, role summaries, role task chunks, content revision, and content hashes.
- A negative fixture mutation test or targeted assertion proving the parity check fails on at least one changed label and one removed required capability.

RED evidence paths:

- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/current-state-gap-closure-3/red/slice0-core-golden-fixture.log`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/current-state-gap-closure-3/red/slice0-pi-golden-fixture.log`

Implementation:

- Copy the exact proposal taxonomy row content into the golden fixture.
- Normalize fixture comparison code so it uses structured JSON and does not compare generated object-string output.
- Keep the canonical runtime data as the source shipped to runtime, but make tests prove it matches the fixture copied from the proposal.
- Ensure the Pi compact snapshot is generated from the same canonical runtime data and carries matching manifest content revision.

GREEN evidence:

- focused core taxonomy tests pass;
- focused Pi taxonomy data tests pass;
- `corepack pnpm run schemas:validate` still passes.

### Slice 1: Assignment-Mode Semantics End To End

Requirements: `R7`, `R12`, `R14`, `R15`

Changed paths expected:

- `role-model-router/apps/runtime-host-bridge/src/local-model-role-bindings.ts`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `role-model-router/apps/runtime-host-bridge/src/local-model-role-bindings.test.ts`
- `role-model-router/packages/provider-account/src/index.ts`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
- `role-model-router/apps/runtime-ui/app/routes/local-peer-models.tsx`
- `role-model-router/apps/runtime-ui/app/routes/local-llama-swap-models.tsx`
- `role-model-router/apps/runtime-ui/app/routes/providers.tsx`
- `role-model-router/apps/runtime-ui/app/components/local-model-role-picker.tsx`
- focused UI tests for these routes/components

RED tests to add first:

- Missing model role assignment resolves to all canonical role IDs for provider account, peer model, runtime endpoint readback, and llama-swap loaded model paths.
- Explicit `roleAssignmentMode: "all"` with `disabledRoleIds: ["security"]` resolves to all roles except `security`, persists through API readback, and renders as all checked except `security`.
- Explicit include mode resolves only `enabledRoleIds` and displays include-mode state without being confused with no roles.
- UI all-role toggle persists assignment mode rather than ambiguous empty `roleIds`.
- Existing legacy `roleIds` bindings migrate/read as include-mode without silently changing behavior.
- `/app/models` configured-model detail renders grouped role controls, high-risk labels, and a task drill-in affordance for each role.

RED evidence paths:

- `evidence/logs/current-state-gap-closure-3/red/slice1-host-role-assignment.log`
- `evidence/logs/current-state-gap-closure-3/red/slice1-provider-account-assignment.log`
- `evidence/logs/current-state-gap-closure-3/red/slice1-runtime-ui-assignment.log`

Implementation:

- Introduce one canonical role assignment conversion layer for runtime API and UI routes.
- Use `roleAssignmentMode`, `enabledRoleIds`, and `disabledRoleIds` in live mutations and readback; keep legacy `roleIds` as migration input only.
- Ensure absent assignment means all current canonical roles and future compatible roles.
- Ensure "remove one role" stores exclude-mode rather than a giant include list when starting from all roles.
- Ensure "select all" stores all-mode with no disabled roles.
- Ensure "select none" is representable only if explicitly supported by include-mode with an empty enabled list, and label it as no roles intentionally rather than conflating it with default all.
- Surface high-risk labels for roles in or secondarily attached to `governance_safety` and for policy-sensitive roles `security`, `legal`, `finance`, `recruiter`, and `health`.
- Add role task drill-in from `/app/models` without showing all task detail during initial add/load model flow.

GREEN evidence:

- focused host binding tests pass;
- focused provider-account tests pass;
- focused runtime UI tests pass;
- runtime UI typecheck passes.

### Slice 2: Real Pi Group-First Progressive Lookup And Classification

Requirements: `R8`, `R9`, `R14`, `R15`

Changed paths expected:

- `packages/pi-role-model/src/taxonomy/classify-with-progressive-disclosure.ts`
- `packages/pi-role-model/src/taxonomy/resolve-effective-taxonomy.ts`
- `packages/pi-role-model/src/request-intent.ts`
- `packages/pi-role-model/src/extension.ts`
- `packages/pi-role-model/test/taxonomy-classification.test.ts`
- `packages/pi-role-model/test/effective-taxonomy.test.ts`
- `packages/pi-role-model/test/request-intent.test.ts`
- `packages/pi-role-model/skills/role-model/SKILL.md`

RED tests to add first:

- Classification chooses candidate groups before task chunks for prompts from engineering, product/design, knowledge/research, business, communication, and governance/safety.
- Runtime role summaries supersede package role summaries when runtime content revision is compatible.
- Runtime task chunks are fetched only for candidate roles, not for all 28 roles.
- Classification of the six minimum proposal prompts fetches task chunks for the selected or ambiguous roles before final task selection.
- Classification records `loadedChunks` that match chunks actually loaded.
- A runtime-modified task label or guidance affects classification output after runtime chunk fetch, proving runtime task chunks supersede package snapshot for candidate roles.
- Low-confidence or unknown prompts degrade to broad advisory role hints with alternatives, not hidden model calls or failed requests.
- Active tools, attachments, explicit user hints, and prompt mode can influence candidate group selection.

RED evidence paths:

- `evidence/logs/current-state-gap-closure-3/red/slice2-pi-progressive-classification.log`
- `evidence/logs/current-state-gap-closure-3/red/slice2-pi-runtime-supersession.log`
- `evidence/logs/current-state-gap-closure-3/red/slice2-pi-request-intent.log`

Implementation:

- Split Pi classification into staged functions:
  - `selectCandidateGroups(input, taxonomySummary)`
  - `selectCandidateRoles(input, candidateGroups, roleSummaries)`
  - `loadCandidateTaskChunks(candidateRoles, runtimeOrPackageSource)`
  - `selectTaskAndMetadata(input, candidateTasks, context)`
- Update the extension/request path so classification can request task chunks for candidate roles before sending the request.
- Keep classification local and deterministic by default; do not add hidden model calls.
- Emit `role_model.intent` with role, task, action/variant where derivable, capabilities, modalities, tool classes, confidence, source, evidence, alternatives, taxonomy version, content revision, and classification contract version.
- Keep all emitted Pi fields advisory unless the user explicitly requested a hard constraint or trusted policy context marks it hard.
- Preserve run 56 boundaries: no runtime process ownership, no launcher call, no secret reads/syncs, no remote endpoint trust bypass.

GREEN evidence:

- focused Pi taxonomy/classification tests pass;
- Pi package build passes;
- Pi package pack passes.

### Slice 3: Complete Normalized Intent Diagnostics For Modalities And Tool Classes

Requirements: `R5`, `R6`, `R12`, `R14`, `R15`

Changed paths expected:

- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `role-model-router/packages/core/src/router.ts`
- `role-model-router/packages/core/test/routing-intent.test.ts`
- `role-model-router/packages/runtime-observability/src/index.ts`

RED tests to add first:

- Unknown advisory modality succeeds, is removed from normalized intent, and records `ROLE_MODEL_INTENT_FIELD_IGNORED`.
- Unknown advisory tool class succeeds, is removed from normalized intent, and records `ROLE_MODEL_INTENT_FIELD_IGNORED`.
- Known required modality survives normalization and can filter candidates when it is a trusted hard runtime/internal constraint.
- Known advisory modality/tool class from Pi can influence scoring/needs-tools hints without rejecting otherwise valid requests.
- Stable Pi-shaped metadata with unknown role, task, capability, modality, and tool class in one request still routes successfully and persists diagnostics for every ignored field.
- Normalized intent persists `schemaVersion`, `taxonomyVersion`, `contentRevision`, and `classificationContractVersion`.

RED evidence paths:

- `evidence/logs/current-state-gap-closure-3/red/slice3-normalized-intent-modalities-tools.log`
- `evidence/logs/current-state-gap-closure-3/red/slice3-router-tool-modality-policy.log`

Implementation:

- Centralize canonical taxonomy validation for roles, tasks, capabilities, modalities, and tool classes.
- Treat Pi-provided stable fields as advisory by default.
- Do not fail the user request for unknown advisory metadata.
- Record accepted, ignored, normalized, and fallback diagnostics for all taxonomy metadata classes.
- Preserve hard filtering for trusted/internal required modalities and capabilities.
- Do not forward classification metadata upstream to providers.

GREEN evidence:

- focused host intent tests pass;
- focused router tests pass;
- runtime observability type/tests pass.

### Slice 4: Docs-Site Taxonomy V1 Update

Requirements: `R10`, `R14`, `R15`

Changed paths expected:

- `apps/docs-site/content/docs/protocol/roles-and-tasks.mdx`
- `apps/docs-site/content/docs/runtime/models-and-role-activation.mdx`
- `apps/docs-site/content/docs/integrations/pi.mdx`
- `apps/docs-site/content/docs/index.mdx`
- related concept/get-started/reference pages that still mention stale role/task IDs
- docs-site static tests or content scan tests

RED tests to add first:

- A docs-site content scan fails on stale examples `general.chat`, `coder.patch`, `tool.agent`, or task type `code.edit` outside changelog/history contexts.
- A docs-site content scan fails if taxonomy V1 docs do not mention `engineering`, `product_design`, `governance_safety`, `coder.edit`, `security.audit`, `product.requirements`, `role_model.intent`, and `@try-works/pi-role-model`.
- A docs-site content scan fails if model-role activation docs do not document default-all assignment and all/include/exclude semantics.

RED evidence paths:

- `evidence/logs/current-state-gap-closure-3/red/slice4-docs-site-taxonomy-v1.log`

Implementation:

- Update public docs-site pages to describe taxonomy V1 concepts, exact naming rules, canonical groups, roles/tasks examples, default-all model assignment, task drill-in, Pi progressive classification, advisory metadata fallback, and runtime/controller authority.
- Link to the repo protocol taxonomy doc where appropriate.
- Keep text public-facing and avoid internal run/proposal language.
- Mention proposal Phase 5 benchmark and Phase 6 telemetry as future phases only; do not document them as available production features.

GREEN evidence:

- docs-site content scan passes;
- docs-site type/build/static checks pass if available in the repo command matrix.

### Slice 5: RBAC And Routing Policy Binding Schema Contract

Requirements: `R11`, `R12`, `R13`

Changed paths expected:

- `schemas/role-model/taxonomy/routing-policy-binding.schema.json`
- `schemas/role-model/taxonomy/effective-taxonomy.schema.json`
- `schemas/role-model/taxonomy/*.schema.json` as needed
- `packages/schema-tools/test/validate-schemas.test.ts`
- taxonomy schema fixtures/tests

RED tests to add first:

- Schema validation fails before adding `routing-policy-binding.schema.json`.
- Effective taxonomy schema rejects unknown RBAC actions.
- Effective taxonomy schema accepts the exact required action set:
  - `taxonomy.read`
  - `taxonomy.suggest`
  - `taxonomy.create`
  - `taxonomy.update`
  - `taxonomy.deprecate`
  - `taxonomy.delete`
  - `taxonomy.bind_policy`
  - `taxonomy.use`
- Schema fixtures prove `core`, `provider`, `client`, `org`, `team`, and `user` authority scopes are valid where required.
- Unsupported runtime org/team/user effective-taxonomy enforcement returns an explicit degraded/unsupported diagnostic rather than silently accepting unauthorized hard metadata.

RED evidence paths:

- `evidence/logs/current-state-gap-closure-3/red/slice5-rbac-routing-policy-schema.log`
- `evidence/logs/current-state-gap-closure-3/red/slice5-effective-taxonomy-scope.log`

Implementation:

- Add the missing routing policy binding schema with resource/action/subject/scope fields aligned to the proposal.
- Tighten RBAC action enums and authority-scope fields in existing schemas.
- Keep actual org/team/user enforcement limited to extension points unless already supported, but expose explicit unsupported/degraded diagnostics.
- Ensure `schemas:validate` includes the new schema.

GREEN evidence:

- schema validation passes;
- focused schema tests pass.

### Slice 6: Phase 5 QA Artifact Reconciliation

Requirements: `R13`, `R14`, `R15`

Changed paths expected:

- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/05-manual-qa-addendum-02-current-state-gap-closure.md`
- optional updates to later implementation summary addendum references

RED checks to add first:

- A recursive artifact lint or explicit script/check fails if both `PASS_WITH_QA_RUNTIME_LIMITATION` and later healthy QA are present without a superseding reconciliation note.
- A checklist fails if the Phase 5 QA artifact does not explicitly state which QA artifact is authoritative after this gap closure.

RED evidence paths:

- `evidence/logs/current-state-gap-closure-3/red/slice6-qa-artifact-reconciliation.log`

Implementation:

- Create a Phase 5 QA addendum that explicitly supersedes the degraded-runtime limitation after the new QA pass.
- Preserve the older limitation as historical context; do not rewrite locked artifacts unless the recursive workflow permits it.
- Include a proposal coverage table mapping `E2E-P1-001` through `E2E-P4-005` to evidence.
- Include explicit not-yet-implemented notes for proposal Phase 5 benchmark and Phase 6 telemetry implementation.

GREEN evidence:

- recursive lint/check passes or the explicit reconciliation check passes.

### Slice 7: Rebuilt Runtime, Pi, And Live UI End-To-End QA

Requirements: `R7`, `R8`, `R9`, `R14`, `R15`

Changed paths expected:

- QA evidence under `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/current-state-gap-closure-3/qa/`
- `05-manual-qa-addendum-02-current-state-gap-closure.md`

RED checks to define before QA:

- QA checklist starts as failing until every required receipt is present.
- Required receipt paths are checked by a small script or documented manual checklist.

Required QA setup:

1. Rebuild runtime packages from this worktree.
2. Rebuild runtime UI from this worktree.
3. Rebuild or pack `packages/pi-role-model` from this worktree.
4. Launch the rebuilt Role-Model runtime locally on a known port.
5. Ensure QA backends are healthy and discoverable.
6. Command local Pi to install/update the rebuilt `pi-role-model` package from the worktree or produced package artifact.
7. Command Pi to configure the Role-Model endpoint URL, auth if applicable, and a user-facing alias.
8. Command Pi to read the taxonomy manifest, list groups, list roles by group, show secondary group membership, and show sample role task counts.

Required Pi request set:

```text
Review this diff for security risks and likely regressions.
Implement this small bug fix and add a regression test.
Compare current public documentation for this API and cite differences.
Turn these support notes into a clear customer reply.
Inspect this schema and propose a migration plan.
Create product requirements and acceptance criteria for this workflow.
```

Expected classifications:

| Prompt | Expected role | Expected task |
| --- | --- | --- |
| Security diff review | `security` or `coder` with `security` alternative | `security.audit` or `coder.review` with security evidence |
| Bug fix and regression test | `coder` | `coder.edit` or `coder.test.write` |
| Current public documentation comparison | `researcher` | `researcher.web_research.current` |
| Support notes to customer reply | `support` | `support.ticket.reply` |
| Schema migration plan | `architect` or `data` | `architect.migration.strategy` or `data.schema.review` |
| Product requirements and acceptance criteria | `product` | `product.requirements` or `product.acceptance` |

Required runtime verification after each prompt:

- request succeeded without metadata-caused rejection;
- response received from a selected endpoint;
- request detail contains normalized role/task intent;
- normalized intent contains taxonomy version, content revision, and classification contract version;
- ignored/normalized diagnostics are present when test metadata includes unknown fields;
- candidate filters and scores show hard constraints before advisory scoring;
- controller decision sees only eligible candidate facts;
- selected endpoint/model and alias are visible in request detail;
- classification metadata is not forwarded upstream to the provider.

Required UI behavior verification:

- `/app/models` loads from rebuilt runtime.
- A newly visible/loaded model shows all canonical roles checked by default.
- The role picker is grouped by canonical groups.
- High-risk labels are visible for `security`, `legal`, `finance`, `recruiter`, and `health`.
- Removing `security` from a model persists as explicit exclude-mode and affects routing eligibility for a security prompt.
- Re-enabling all roles persists as all-mode.
- Task drill-in from model details shows tasks for at least `coder`, `security`, `product`, and `support`.
- `/app/models/roles` is group-first and shows secondary group membership.
- `/app/router/candidates`, `/app/router/decisions/:requestId`, `/app/observe/requests`, and `/app/observe/routing` are reachable and show taxonomy-relevant facts where implemented.

Browser limitation rule:

- If the in-app browser still refuses local runtime URLs, use an available browser/control surface or direct HTTP/API checks plus focused UI tests.
- The QA addendum must state the limitation, the substitute evidence, and why it proves the same behavior.
- Route HTTP 200 alone is not sufficient for grouped role assignment, task drill-in, or role-removal routing impact; those need DOM evidence, API state evidence, or focused UI tests plus live API proof.

GREEN evidence:

- runtime package/build logs;
- runtime UI build/type/test logs;
- Pi install/update logs;
- Pi model list and alias configuration logs;
- six Pi prompt logs;
- runtime request detail JSON for each prompt;
- unknown advisory metadata request detail JSON;
- UI screenshots or DOM/API evidence for assignment behavior;
- QA reconciliation addendum with proposal E2E coverage table.

## Required Command Matrix

The implementation pass must choose exact commands from repo scripts, but the minimum expected verification matrix is:

```powershell
corepack pnpm run schemas:validate
corepack pnpm --filter @role-model/router-core test
corepack pnpm --filter @role-model/runtime-host-bridge test
corepack pnpm --filter @role-model/runtime-host-bridge build
corepack pnpm --filter @role-model/runtime-ui test
corepack pnpm --filter @role-model/runtime-ui typecheck
corepack pnpm --filter @try-works/pi-role-model test
corepack pnpm --filter @try-works/pi-role-model build
corepack pnpm --filter @try-works/pi-role-model pack
corepack pnpm run runtime:validate-ui
corepack pnpm run runtime:validate-packaging
```

If any command name differs in the current package scripts, record the actual equivalent command and why it is equivalent.

## TDD Compliance Requirements

Strict TDD is mandatory for production code behavior:

- Write the failing test first.
- Run the focused command and capture RED evidence.
- Implement the minimum production change.
- Run the focused command and capture GREEN evidence.
- Refactor only after GREEN, and rerun the focused command.
- Do not batch multiple findings behind one vague test.
- Do not mark a finding closed without at least one RED log and one GREEN log.

Evidence root:

```text
/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/current-state-gap-closure-3/
```

Required evidence subdirectories:

```text
red/
green/
qa/
```

## Scope Boundaries

Do not implement in this gap closure:

- benchmark runner, benchmark scoring engine, benchmark dashboard, or benchmark-informed routing;
- production telemetry aggregation dimensions, telemetry dashboard, telemetry rollups, or telemetry-informed routing;
- a new top-level taxonomy app route separate from the existing runtime UI surfaces;
- Pi runtime process ownership, launcher calls, runtime installation ownership, credential reads, credential sync, or hidden classification model calls.

This plan may add docs, schemas, placeholders, diagnostics, and UI references that preserve compatibility for proposal Phase 5 and Phase 6.

## Worktree Diff Audit

Expected product paths:

- `schemas/role-model/taxonomy/**`
- `role-model-router/packages/core/data/taxonomy/**`
- `role-model-router/packages/core/testdata/taxonomy/**`
- `role-model-router/packages/core/src/taxonomy/**`
- `role-model-router/packages/core/test/**`
- `role-model-router/apps/runtime-host-bridge/**`
- `role-model-router/apps/runtime-ui/**`
- `role-model-router/packages/provider-account/**`
- `role-model-router/packages/runtime-observability/**`
- `packages/pi-role-model/**`
- `apps/docs-site/content/docs/**`
- `docs/protocol/taxonomy-v1.md` only if repo docs need small consistency edits
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/**`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/current-state-gap-closure-3/**`

Unexpected changes must be explained in the implementation summary before audit.

## Requirement Completion Status

| Requirement | Planned disposition |
| --- | --- |
| `R2` | Close via Slice 0 and Slice 5 schema/golden-fixture tests |
| `R3` | Close via Slice 0 exact taxonomy parity and manifest/content hash checks |
| `R5` | Close via Slice 3 complete normalized metadata diagnostics |
| `R6` | Close via Slice 3 routing/controller metadata use verification and Slice 7 live requests |
| `R7` | Close via Slice 1 UI/API assignment semantics and Slice 7 live UI behavior |
| `R8` | Close via Slice 2 compact/runtime progressive lookup tests |
| `R9` | Close via Slice 2 Pi classification and Slice 7 real Pi prompts |
| `R10` | Close via Slice 4 docs-site and Pi skill documentation |
| `R11` | Close via Slice 5 RBAC/routing-policy schema extension points |
| `R12` | Close via Slice 1 assignment persistence, Slice 3 normalized versions, and Slice 5 schema versioning |
| `R13` | Close via strict RED/GREEN evidence for every slice |
| `R14` | Close via Slice 7 rebuilt-runtime and local Pi QA |
| `R15` | Close via Slice 6/7 proposal E2E coverage table and live receipts |

## Audit Gate

Audit: PASS

This plan directly maps every finding from addendum 07 to a TDD implementation slice and a practical rebuilt-runtime/Pi verification path.

## Coverage Gate

Coverage: PASS

This plan covers all remaining known Run 57 proposal Phase 1-4 gaps without expanding into proposal Phase 5 benchmark implementation or proposal Phase 6 telemetry implementation.

## Approval Gate

Approval: PASS

This addendum is ready to use as the implementation plan for the next Run 57 gap-closure pass.
