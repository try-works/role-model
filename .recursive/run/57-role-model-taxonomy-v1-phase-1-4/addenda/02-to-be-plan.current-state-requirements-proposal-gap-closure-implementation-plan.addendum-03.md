# To-Be Plan Addendum 03: Current-State Requirements And Proposal Gap Closure Implementation Plan

Run: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/`  
Phase: `02 To-Be Plan Addendum 03`  
Artifact: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/02-to-be-plan.current-state-requirements-proposal-gap-closure-implementation-plan.addendum-03.md`  
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
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/02-to-be-plan.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.current-state-requirements-proposal-audit.addendum-05.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/05-manual-qa-addendum-01-healthy-backends.md`

## Purpose

This addendum defines the implementation plan to close the remaining gaps documented in `03-implementation-summary.current-state-requirements-proposal-audit.addendum-05.md`.

This is a run-local addendum to the Run 57 recursive implementation plan. It is not an addendum to the external proposal.

## TODO

- [x] Map every audit finding to an implementation slice.
- [x] Require strict RED/GREEN TDD for every production behavior change.
- [x] Include canonical taxonomy guardrails from the proposal.
- [x] Require rebuilt runtime and rebuilt `pi-role-model` package verification.
- [x] Require real local Pi install/configure/alias/request verification.
- [x] Define concrete evidence and acceptance checks.

## Scope

This addendum closes the remaining proposal Phase 1-4 implementation gaps only. It does not implement proposal Phase 5 taxonomy-aware benchmark suites or proposal Phase 6 taxonomy-aware telemetry dashboards/rollups, except where normalized intent and diagnostics are required as Phase 1-4 extension points.

In scope:

- taxonomy schema validation and strict schema shape;
- model role assignment mode persistence and routing semantics;
- taxonomy-aware `/app/models` and `/app/models/roles` UI behavior;
- high-risk role indicators;
- Pi progressive group-first classification and lazy taxonomy lookup;
- ignored/normalized taxonomy diagnostics;
- persisted normalized intent in runtime observations;
- live rebuilt-runtime and real Pi verification.

Out of scope:

- benchmark scoring engine, benchmark suite creation, or benchmark-informed routing;
- production telemetry rollups by role/task/capability/modality/tool class;
- changing Pi core itself outside the `pi-role-model` package integration surface;
- making `pi-role-model` own, install, start, stop, or update the Role-Model runtime process.

## Canonical Taxonomy Guardrail

The implementation must continue to match the taxonomy in `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md`, especially the `Canonical Runtime Taxonomy Catalog`. Tests must compare against a proposal-derived fixture or an exact checked fixture generated from the proposal, not against implementation code alone.

Required counts:

| Kind | Count |
| --- | ---: |
| Groups | 6 |
| Roles | 28 |
| Task types | 280 |
| Capabilities | 46 |
| Modalities | 9 |
| Tool classes | 15 |
| Intent presets | 0 |

Canonical groups:

```text
engineering, product_design, knowledge_research, business, communication, governance_safety
```

Canonical roles and primary/secondary groups:

| Role | Primary Group | Secondary Groups |
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

Canonical high-risk roles for UI labeling and policy-sensitive diagnostics:

```text
security, legal, finance, recruiter, health
```

Canonical task type IDs:

```text
coder.edit, coder.review, coder.debug.root_cause, coder.test.write, coder.refactor, coder.explain, coder.migrate, coder.generate, tester.e2e, architect.design, architect.review, architect.plan, architect.api_design, security.audit, security.audit.supply_chain, security.threat_model, security.vulnerability_triage, security.policy_review, researcher.web_research, researcher.web_research.current, researcher.compare_sources, researcher.literature_review, researcher.fact_check, writer.docs.write, writer.docs.public, writer.docs.edit, writer.summarize, writer.release_notes, operator.debug.startup, operator.debug.ui, operator.debug.api, operator.deploy.review, operator.incident_triage, operator.config, operator.install, analyst.compare, analyst.evaluate, analyst.prioritize, planner.requirements, planner.roadmap, planner.roadmap.release, planner.decompose, tester.plan, tester.regression, tester.reproduce, data.query, data.schema.review, data.transform, product.requirements, product.workflow.review, product.release_notes, designer.ui.review, designer.interaction, designer.visual_direction, support.triage, support.explain, support.escalate, legal.review, legal.compliance_check, finance.cost_estimate, finance.compare_options, creative.brainstorm, creative.copywriting, creative.storyboard, educator.tutor, educator.lesson.plan, educator.quiz.generate, educator.feedback, translator.translate, translator.localize.locale, translator.review, marketer.positioning, marketer.campaign.plan, marketer.content.seo, marketer.copy.ad, seller.discovery.plan, seller.outreach.write, seller.proposal.enterprise, seller.objection.handle, recruiter.job_description, recruiter.interview.plan, recruiter.candidate.screen, procurement.vendor.compare, procurement.rfp.write, procurement.requirements, procurement.contract.commercial, coordinator.meeting.agenda, coordinator.meeting.notes, coordinator.schedule.plan, coordinator.follow_up, knowledge.organize, knowledge.retrieve, knowledge.memory.update, knowledge.kb.write, strategist.business.plan, strategist.market.analyze, strategist.competitive.review, strategist.risk.scenario, mathematician.solve, mathematician.verify, mathematician.model, mathematician.explain, scientist.experiment.design, scientist.evidence.review, scientist.method.critique, scientist.literature.synthesize, health.info.general, health.info.safety, health.care_navigation, health.wellness.plan, coder.dependency.update, coder.config, architect.infrastructure.design, architect.data_model, architect.integration.plan, architect.scalability.review, architect.migration.strategy, architect.adr.write, security.secrets.scan, security.auth.review, security.privacy.review, security.incident.review, security.safe_prompt.review, researcher.source_find, researcher.timeline.build, researcher.market_scan, researcher.standards_lookup, researcher.document_extract, writer.email.write, writer.blog.write, writer.proposal.write, writer.style.rewrite, writer.outline, operator.monitor, operator.backup.restore, operator.release.execute, analyst.metrics.define, analyst.risk.assess, analyst.root_cause, analyst.report.write, analyst.data_interpret, analyst.decision_matrix, analyst.trend.analyze, planner.milestone, planner.sprint.plan, planner.acceptance.criteria, planner.rollout, planner.dependency.map, planner.resource.plan, tester.unit.plan, tester.integration.plan, tester.accessibility, tester.performance, tester.security, tester.acceptance, data.analyze, data.visualize, data.validate, data.extract, data.join, data.quality.audit, data.metric.define, product.spec.write, product.user_story, product.acceptance, product.prd.write, product.feature.prioritize, product.feedback.synthesize, product.launch.readiness, designer.prototype, designer.design_system, designer.accessibility.review, designer.content.layout, designer.usability.test, designer.mobile.responsive, designer.visual.qa, support.ticket.reply, support.runbook.write, support.issue.reproduce, support.knowledge_base.suggest, support.status.update, support.customer.apology, support.faq.write, legal.privacy.review, legal.terms.review, legal.license.review, legal.contract.summarize, legal.risk.issue_spot, legal.policy.draft, legal.retention.review, legal.accessibility.compliance, finance.invoice.review, finance.budget.plan, finance.forecast, finance.unit_economics, finance.pricing.model, finance.variance.analyze, finance.procurement.cost, finance.roi.calculate, creative.name.generate, creative.concept.develop, creative.script.write, creative.brand.voice, creative.visual.prompt, creative.tagline, creative.social.post, educator.curriculum.design, educator.study.plan, educator.example.generate, educator.rubric.create, educator.concept.explain, educator.practice.review, translator.tone.adapt, translator.glossary.create, translator.subtitles.translate, translator.technical.translate, translator.back_translate, translator.locale.review, translator.multilingual.reply, marketer.audience.research, marketer.email.sequence, marketer.landing_page.copy, marketer.social.plan, marketer.messaging.review, marketer.launch.plan, seller.account.plan, seller.demo.script, seller.follow_up.write, seller.competitor.battlecard, seller.call.summary, seller.mutual_action_plan, recruiter.sourcing.message, recruiter.scorecard.create, recruiter.interview.feedback, recruiter.offer.prepare, recruiter.pipeline.update, recruiter.role.intake, recruiter.candidate.compare, procurement.security.questionnaire, procurement.vendor.scorecard, procurement.renewal.review, procurement.sla.review, procurement.negotiation.plan, procurement.purchase.justification, coordinator.task.plan, coordinator.inbox.triage, coordinator.decision.log, coordinator.project.status, coordinator.reminder.plan, coordinator.handoff.prepare, knowledge.note.summarize, knowledge.taxonomy.design, knowledge.link.map, knowledge.runbook.update, knowledge.archive.clean, knowledge.context.brief, strategist.swot, strategist.okr.define, strategist.board.brief, strategist.operating.model, strategist.pricing.strategy, strategist.partnership.evaluate, mathematician.statistics.analyze, mathematician.optimize, mathematician.proof.write, mathematician.formula.derive, mathematician.simulation.plan, mathematician.error.check, scientist.hypothesis.formulate, scientist.protocol.write, scientist.data.interpret, scientist.peer_review, scientist.safety.review, scientist.technical.explain, health.medication.info, health.appointment.prepare, health.symptom.organize, health.exercise.general, health.nutrition.general, health.mental_wellness.info
```

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

Minimum proposal request set for Pi/runtime QA:

| Prompt | Expected Focus |
| --- | --- |
| `Review this diff for security risks and likely regressions.` | `engineering`, `security` or `coder`, `security.audit` or `coder.review`, `code.read`, `security.analysis`, `filesystem.read` |
| `Implement this small bug fix and add a regression test.` | `engineering`, `coder`, `coder.edit` and `coder.test.write`, `code.write`, `tools.command_execution`, `filesystem.write` |
| `Compare current public documentation for this API and cite differences.` | `knowledge_research`, `researcher`, `researcher.web_research.current` or `researcher.compare_sources`, `web.search`, `citation.synthesis` |
| `Turn these support notes into a clear customer reply.` | `communication`, `support` or `writer`, `support.ticket.reply` or `writer.email.write`, `communication.user_facing` |
| `Inspect this schema and propose a migration plan.` | `engineering`, `data` or `architect`, `architect.migration.strategy` or `data.schema.review`, `data.schema`, `reasoning.multi_step` |
| `Create product requirements and acceptance criteria for this workflow.` | `product_design`, `product` or `planner`, `product.requirements` or `planner.requirements` |

## Requirement-To-Finding Map

| Audit Finding | Requirement IDs | Implementation Slice |
| --- | --- | --- |
| F1 taxonomy schemas not validated | `R2`, `R13` | Slice 1 |
| F2 taxonomy schemas too loose | `R2`, `R3`, `R12` | Slice 1 |
| F3 missing `roleAssignmentMode` persistence | `R7`, `R12` | Slice 2 |
| F4 `/app/models` model detail gaps | `R7`, `R14`, `R15` | Slice 3 |
| F5 `/app/models/roles` not group-first | `R7` | Slice 3 |
| F6 missing high-risk labels | `R7`, `R11` | Slice 3 |
| F7 Pi progressive disclosure incomplete | `R8`, `R9` | Slice 4 |
| F8 ignored advisory metadata lacks diagnostics | `R5`, `R6`, `R12` | Slice 5 |
| F9 persisted request detail lacks normalized intent | `R5`, `R12`, `R14` | Slice 5 |
| F10 Phase 5 UI evidence too shallow | `R14`, `R15` | Slice 6 |
| F11 worktree hygiene | recursive handoff | Slice 7 |

## Implementation Slices

### Slice 1: Taxonomy Schema Validation And Strict Schema Contract

Goal:

Make taxonomy schemas executable release gates and tighten them so they enforce the proposal data model.

RED tests first:

- Add a schema test that compiles every file under `schemas/role-model/taxonomy/` with Ajv 2020 and fails before schema-tool integration.
- Add valid fixtures for manifest, group, role, task type, capability, modality, tool class, intent preset array, classification metadata, effective taxonomy, and model role assignment.
- Add invalid fixtures proving failures for:
  - wrong `kind`;
  - missing authority scope/owner;
  - missing manifest `entryFiles`;
  - missing manifest `contentHashes`;
  - extra unknown field where `additionalProperties: false` is required;
  - duplicate assignment role IDs;
  - invalid `roleAssignmentMode`;
  - malformed classification confidence;
  - invalid task classifier guidance shape.
- Add a test proving `schemas:validate` or a named taxonomy validation command includes taxonomy schemas.

Implementation:

- Extend `packages/schema-tools` to support taxonomy schema roots or add a dedicated root command such as `taxonomy:schemas:validate`, then include it in the run verification commands.
- Tighten taxonomy schema files:
  - use canonical `const` values for `kind`;
  - use `additionalProperties: false` except where proposal-defined `extensions` are explicitly allowed;
  - require manifest `generatedAt`, `counts`, `entryFiles`, and `contentHashes`;
  - require classifier `useWhen` and `doNotUseWhen`;
  - require authority scopes to be one of `core`, `provider`, `client`, `org`, `team`, `user`;
  - model role assignments must validate `roleAssignmentMode`, `enabledRoleIds`, `disabledRoleIds`, and override objects.
- Add schema fixture paths to the relevant validation manifest.

GREEN verification:

- `corepack pnpm run schemas:validate`
- taxonomy schema validation command if separate
- `corepack pnpm --filter @role-model-router/core exec vitest run test/taxonomy-data-files.test.ts test/taxonomy-catalog.test.ts`

Acceptance:

- Every taxonomy schema compiles.
- Valid fixtures pass.
- Invalid fixtures fail for the intended reasons.
- Manifest schema requires release/package receipt fields.
- Task, role, group, capability, modality, and tool-class schemas enforce canonical `kind` values.

### Slice 2: Durable Model Role Assignment Mode

Goal:

Represent the proposal's all/include/exclude/custom model role assignment semantics in persistence, UI, and routing.

RED tests first:

- Add runtime-host tests proving model assignment payloads can persist and read back:
  - `roleAssignmentMode: "all"`;
  - `roleAssignmentMode: "allow_list"` or implementation-equivalent include mode with `enabledRoleIds`;
  - `roleAssignmentMode: "deny_list"` or implementation-equivalent exclude mode with `disabledRoleIds`;
  - task, capability, modality, and tool-class override objects.
- Add migration/readback tests proving existing `modelRoleBindings: [{ modelId, roleIds }]` are interpreted safely.
- Add routing tests proving:
  - `all` allows current canonical roles and future minor-version roles;
  - deny-list removes a role from hard role eligibility;
  - include-list only allows explicitly enabled roles;
  - no explicit assignment does not accidentally mean no roles when the default should be all.
- Add UI API tests proving `All roles` persists assignment mode, not only a 28-item role array.

Implementation:

- Add typed model assignment helpers in a shared runtime/core location.
- Preserve backward compatibility with existing `modelRoleBindings`.
- Define canonical read normalization:
  - absent assignment for a newly added/loaded model normalizes to `all` unless policy says otherwise;
  - legacy non-empty `roleIds` normalizes to include/allow-list;
  - explicit empty deny/include modes stay explicit and distinguishable.
- Update provider account or model override storage to include the assignment shape without losing existing bindings.
- Update role binding construction to respect normalized assignment mode.

GREEN verification:

- focused runtime-host tests for persistence and routing;
- focused core routing tests for hard role eligibility;
- runtime build.

Acceptance:

- The persisted assignment shape supports the proposal fields.
- Existing persisted bindings keep working.
- Future canonical roles are inherited by `all` mode.
- Removing `security` from a model makes the model ineligible for hard `security` requests.

### Slice 3: Runtime UI Grouped Role Assignment, Task Drill-In, And High-Risk Labels

Goal:

Make `/app/models` and `/app/models/roles` match the proposal's existing-route UI requirements.

RED tests first:

- Add runtime UI component tests for:
  - `LocalModelRolePicker` rendering canonical group sections;
  - `All roles` checked by default;
  - indeterminate state when partially selected;
  - high-risk roles visibly labeled;
  - secondary group membership visible but not duplicated as a separate assignment target.
- Add `/app/models` route tests proving configured model inspect modal:
  - uses grouped role assignment;
  - reads/writes assignment mode;
  - shows all roles checked by default;
  - exposes task drill-in by assigned role;
  - labels high-risk roles.
- Add `/app/models/roles` tests proving role catalog is grouped by canonical groups and exposes task detail without forcing all task detail into initial view.
- Add browser validation or Playwright coverage for `/app/models` and `/app/models/roles` behavior.

Implementation:

- Extend `RuntimeRolePolicyRole` or taxonomy UI data to include:
  - `primaryGroupId`;
  - `secondaryGroupIds`;
  - `riskLevel` or `policySensitivity` for the canonical high-risk roles.
- Upgrade `LocalModelRolePicker` to operate on assignment mode, not only selected IDs.
- Reuse the picker inside `/app/models` configured-model inspect modal.
- Add a role/task drill-in section to `/app/models` model detail:
  - grouped roles first;
  - tasks revealed only when a role row is expanded;
  - task detail shows task ID, label/description, required/preferred capabilities, modalities, tool classes, and classifier guidance.
- Group `RoleCatalogHierarchy` by canonical group and show secondary membership as metadata.
- Add placeholders/links in router/observe/model benchmark surfaces only where proposal Phase 5/6 placeholders are required.

GREEN verification:

- `corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/components/local-model-role-picker.test.tsx ...`
- `corepack pnpm --filter @role-model-router/runtime-ui exec tsc --noEmit`
- `corepack pnpm run runtime:validate-ui`
- targeted Playwright/browser validation for `/app/models` and `/app/models/roles`

Acceptance:

- `/app/models` is the primary configured-model role/task surface.
- Newly added/loaded/configured models default to all roles checked.
- Users can remove roles they do not want a model to serve.
- High-risk roles are visibly labeled.
- Tasks are progressively disclosed from model/role detail, not forced into initial add/load.

### Slice 4: Real Pi Progressive Classification And Lazy Taxonomy Lookup

Goal:

Replace fixed shallow heuristics with a deterministic group-first, role-second, task-chunk classification path that uses the packaged or runtime taxonomy progressively.

RED tests first:

- Add tests that instrument taxonomy loading and fail if ordinary classification loads all role task chunks.
- Add tests proving the classifier:
  - selects candidate groups first;
  - loads only role summaries for likely groups;
  - loads task chunks only for likely roles;
  - fetches full task detail only for ambiguity/final validation where supported;
  - emits evidence and alternatives for ambiguous prompts.
- Add tests for all six minimum proposal prompts and at least one prompt from each canonical group.
- Add degraded-runtime tests:
  - runtime unavailable falls back to package snapshot;
  - incompatible runtime taxonomy reports fallback reason;
  - missing role task route falls back to broad role hint.
- Add no-hidden-model-call tests.

Implementation:

- Add explicit group scoring based on prompt, mode, tools, attachments, and trusted hints.
- Add role scoring constrained by selected groups.
- Add task scoring over role chunks using labels, descriptions, use-when/do-not-use-when guidance, capabilities, modalities, and tool classes.
- Keep stable Pi metadata advisory by default unless explicit user command/trusted policy marks fields hard.
- Ensure `resolveEffectiveTaxonomy` defaults to summary/group/likely-role lookup, not every role task chunk.
- Record `loadedChunks` precisely for diagnostics and tests.

GREEN verification:

- `corepack pnpm --filter @try-works/pi-role-model exec vitest run test/taxonomy-classification.test.ts test/effective-taxonomy.test.ts test/request-intent.test.ts`
- `corepack pnpm --filter @try-works/pi-role-model build`
- `corepack pnpm --filter @try-works/pi-role-model pack`

Acceptance:

- Pi classification can classify all minimum proposal prompts.
- Pi does not load the full taxonomy for ordinary classification.
- Pi emits role/task/action/variant/capability/modality/tool metadata using the stable request contract.
- Runtime taxonomy supersedes package snapshot when reachable and compatible.

### Slice 5: Runtime Normalized Intent, Ignored Diagnostics, And Persistence

Goal:

Make runtime request observations expose the normalized role/task/capability/modality/tool intent and diagnostics for accepted, ignored, rejected, and normalized fields.

RED tests first:

- Add host bridge tests for stable Pi metadata with:
  - valid advisory role/task/capabilities;
  - unknown advisory role;
  - unknown advisory task;
  - unknown advisory capability;
  - invalid hard role/task path;
  - taxonomy version mismatch.
- Tests must assert:
  - advisory unknowns do not reject the request;
  - diagnostics record ignored field IDs and reasons;
  - hard invalids reject or fail before routing as appropriate;
  - normalized intent is included in request observations and router decision detail.
- Add observation persistence tests proving persisted request detail includes:
  - `normalizedIntent`;
  - schema version;
  - taxonomy version;
  - content revision;
  - classification contract version;
  - source/confidence/evidence/alternatives where present.

Implementation:

- Introduce a runtime-owned normalized intent structure.
- Separate client-supplied intent, accepted normalized intent, ignored fields, rejected fields, and runtime-derived routing facts.
- Add diagnostics such as:
  - `ROLE_MODEL_INTENT_ACCEPTED`;
  - `ROLE_MODEL_INTENT_FIELD_IGNORED`;
  - `ROLE_MODEL_INTENT_FIELD_NORMALIZED`;
  - `ROLE_MODEL_INTENT_VERSION_MISMATCH`;
  - `ROLE_MODEL_INTENT_HARD_FIELD_REJECTED`.
- Persist normalized intent inside `RuntimeObservationBundle` and expose it from:
  - `/api/role-model/requests/:requestId`;
  - `/app/router/decisions/:requestId` backing data;
  - observe request detail backing data.
- Ensure `role_model` metadata remains sanitized before upstream provider execution.

GREEN verification:

- focused host bridge tests;
- core routing intent tests;
- runtime-host build;
- direct HTTP request against rebuilt runtime showing normalized intent in request detail.

Acceptance:

- Malformed stable Pi advisory metadata cannot fail the user request solely because the taxonomy hint is wrong.
- Operators can see what metadata was accepted, ignored, normalized, or rejected.
- Persisted diagnostics include versioned taxonomy/classification fields.

### Slice 6: End-To-End QA With Rebuilt Runtime And Real Pi

Goal:

Verify implementation reality, not just unit tests.

Prerequisites:

- Slices 1 through 5 are GREEN.
- Rebuilt runtime package and runtime UI bundle are available.
- Rebuilt `pi-role-model` package is packed or installable from the worktree.
- Managed healthy QA backends are enabled, following the approach proven in `05-manual-qa-addendum-01-healthy-backends.md`.

Agent-operated QA steps:

1. Re-read:
   - `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md`;
   - this addendum;
   - the audit addendum.
2. Rebuild runtime host, runtime UI, and packaged runtime from the worktree.
3. Rebuild and pack `@try-works/pi-role-model` from the worktree.
4. Launch the rebuilt runtime locally on a known port with healthy managed local and remote QA vendors.
5. Command local Pi to install/update the rebuilt worktree package.
6. Command Pi to run `/role-model setup`, `/role-model doctor`, alias list/current/use, and endpoint status against the rebuilt runtime.
7. Command Pi to read taxonomy summary, groups, roles by group, secondary group memberships, and sample role task counts from runtime and package.
8. Command Pi to classify and send the six minimum proposal prompts through the configured Role-Model alias.
9. For each prompt, capture:
   - Pi prompt and selected alias;
   - outbound `role_model.intent`;
   - runtime response;
   - request ID;
   - routing decision ID;
   - normalized intent;
   - ignored/accepted/normalized diagnostics;
   - candidate eligibility filters;
   - candidate scores;
   - selected endpoint/model;
   - role policy/task policy application;
   - telemetry row.
10. Drive the runtime UI/browser to verify:
    - `/app/models` grouped role assignment;
    - all roles checked by default;
    - high-risk role labels;
    - task drill-in under a configured model;
    - removing `security` from a model makes it ineligible for hard `security` requests;
    - `/app/models/roles` group-first role catalog;
    - `/app/router/decisions/:requestId` shows normalized intent and diagnostics;
    - `/app/observe/requests/:requestId` shows normalized intent and diagnostics.
11. Record all evidence paths under a new gap-closure evidence folder.

Required QA pass checks:

- Pi can install the rebuilt `pi-role-model` package.
- Pi can configure the endpoint and choose a Role-Model alias.
- Pi can read compact package taxonomy and live runtime taxonomy.
- Pi classifies using group-first progressive disclosure without loading all task chunks.
- Pi sends stable `role_model.intent` for all six prompts.
- Runtime routes requests successfully through healthy QA backend completion.
- Runtime request details expose normalized intent.
- Runtime diagnostics expose accepted/ignored/normalized fields.
- UI behavior validates all proposal Phase 3 cases, not only route reachability.

### Slice 7: Handoff Hygiene

Goal:

Keep the final diff intentional.

Steps:

- Remove or intentionally ignore generated local residue such as `__pycache__/` and `*.pyc`.
- Review all untracked addenda/evidence before staging.
- Ensure no accidental base-repo copy of worktree addenda remains.
- Run `git status --short` from the worktree and record the result in the final implementation summary addendum.

Acceptance:

- Product files, recursive addenda, and evidence are intentionally included or intentionally left untracked.
- No generated Python bytecode is staged.

## Required Test Matrix

Minimum commands after implementation:

```text
corepack pnpm run schemas:validate
corepack pnpm --filter @role-model-router/core exec vitest run test/taxonomy-catalog.test.ts test/taxonomy-data-files.test.ts test/taxonomy-docs.test.ts test/routing-intent.test.ts
corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/taxonomy-discovery.test.ts test/index.test.ts -t "taxonomy|role_model|normalized intent|role policy|requests"
corepack pnpm --filter @role-model-router/runtime-host-bridge build
corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/components/local-model-role-picker.test.tsx
corepack pnpm --filter @role-model-router/runtime-ui exec tsc --noEmit
corepack pnpm run runtime:validate-ui
corepack pnpm --filter @try-works/pi-role-model exec vitest run test/taxonomy-classification.test.ts test/effective-taxonomy.test.ts test/request-intent.test.ts test/taxonomy-data-files.test.ts
corepack pnpm --filter @try-works/pi-role-model build
corepack pnpm --filter @try-works/pi-role-model pack
corepack pnpm --filter @role-model-router/runtime-host-bridge run runtime:package-sea
corepack pnpm --filter @role-model-router/runtime-host-bridge run runtime:validate-packaging
```

If inherited baseline commands still time out, record the inherited evidence separately and do not use inherited failures to mask new run 57 regressions.

## Evidence Requirements

Every slice must record:

- RED test command and log path before production changes;
- changed files;
- GREEN test command and log path after implementation;
- any refactor follow-up and re-run evidence;
- traceability to audit finding and requirement IDs.

The final implementation summary addendum must include:

- a finding-to-fix table;
- exact files changed;
- exact tests run;
- exact Pi commands/prompts used;
- rebuilt runtime/package identifiers;
- request IDs and routing decision IDs from live QA;
- screenshots or captured browser outputs for UI behavior checks where practical.

## Requirement Completion Status

| Requirement | Status For This Plan | Evidence Needed For Completion |
| --- | --- | --- |
| `R2` | planned | taxonomy schemas compile, valid/invalid fixtures pass/fail, manifest schema requires receipt fields |
| `R3` | planned | strict taxonomy schema/data tooling and generated docs consistency checks |
| `R4` | existing plus verify | runtime taxonomy discovery still passes after schema/data changes |
| `R5` | planned | normalized intent and accepted/ignored/normalized diagnostics tests and live request detail |
| `R6` | planned | role/task metadata affects routing and controller constraints with persisted diagnostics |
| `R7` | planned | assignment mode persistence, grouped UI, high-risk labels, task drill-in, role-removal routing behavior |
| `R8` | planned | compact taxonomy lazy lookup and hash/count validation |
| `R9` | planned | group-first Pi classifier with lazy chunk loading and six-prompt coverage |
| `R10` | planned | docs/skill guidance updated for assignment mode, diagnostics, and progressive classification |
| `R11` | planned | safety boundaries preserved; no runtime ownership or hidden model classification |
| `R12` | planned | versioned normalized intent persisted with request observations |
| `R13` | planned | strict TDD evidence recorded for all production changes |
| `R14` | planned | rebuilt runtime and Pi QA with endpoint/alias/configure/install/request evidence |
| `R15` | planned | proposal E2E P1-P4 receipts, especially behavior-level UI and normalized-intent checks |

## Risks And Controls

| Risk | Control |
| --- | --- |
| Assignment-mode migration breaks existing provider account bindings | Add compatibility normalization tests and preserve existing `modelRoleBindings` reads until migration is proven |
| UI all-roles default accidentally grants roles after user explicitly cleared them | Persist explicit mode; distinguish absent assignment from explicit empty include/deny state |
| Pi classifier becomes too broad and emits misleading hard metadata | Stable Pi metadata remains advisory by default; hard metadata only for explicit user/trusted policy |
| Normalized intent persistence exposes raw prompt/body data | Persist structured taxonomy metadata only; preserve existing request/response capture redaction |
| Schema tightening breaks current canonical data | RED tests should identify the mismatch; fix data or schema to match proposal, not loosen silently |
| Browser QA becomes flaky | Prefer stable `data-testid` selectors and API-backed assertions, then supplement with screenshots |

## Audit Gate

Audit: PASS

This plan maps every finding in `03-implementation-summary.current-state-requirements-proposal-audit.addendum-05.md` to a strict TDD slice, defines concrete implementation targets, includes proposal taxonomy guardrails, and requires rebuilt-runtime plus real Pi verification.

## Coverage Gate

Coverage: PASS

This addendum covers the audit findings, Run 57 requirements, proposal Phase 1-4 implementation scope, TDD requirements, and Phase 5 practical verification requirements.

## Approval Gate

Approval: PASS

This addendum is ready to use as the implementation plan for closing the current Run 57 requirements/proposal gaps.
