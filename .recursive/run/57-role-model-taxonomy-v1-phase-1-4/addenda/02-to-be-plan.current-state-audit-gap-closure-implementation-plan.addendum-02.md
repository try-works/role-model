# TO-BE Plan Addendum 02: Current-State Audit Gap Closure Implementation Plan

Run: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/`  
Phase: `02 TO-BE Plan Addendum 02`  
Artifact: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/02-to-be-plan.current-state-audit-gap-closure-implementation-plan.addendum-02.md`  
Status: `DRAFT`  
Workflow version: `recursive-mode-audit-v1`  
Artifact kind: run-local TO-BE plan addendum  
CreatedAt: `2026-06-23`  
Base Artifact: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/02-to-be-plan.md`  
Prior Addenda:
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/02-to-be-plan.run57-gap-closure-implementation-plan.addendum-01.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.run57-gap-closure-audit.addendum-01.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.pi-facing-advisory-metadata.addendum-02.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.current-state-audit-findings.addendum-03.md`
Inputs:
- `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/02-to-be-plan.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.current-state-audit-findings.addendum-03.md`
Target Scope: Close all current-state audit findings for proposal phases 1 through 4.
Required Discipline: Strict TDD, rebuilt runtime verification, rebuilt `pi-role-model` package verification, and local Pi-driven end-to-end QA.

## Purpose

This addendum turns the current-state audit findings into a concrete implementation plan. The implementation must close the documented gaps without weakening the approved user-experience decision that Pi-facing stable taxonomy metadata is advisory and must not cause avoidable user-visible request failures.

This is a run-local plan addendum for Run 57. It is not an addendum to the external proposal.

## TODO

- [x] Map every current-state audit finding to implementation work.
- [x] Require strict RED/GREEN/REFACTOR evidence for each work slice.
- [x] Require exact taxonomy implementation from the proposal and this addendum's canonical taxonomy appendix.
- [x] Require schema, manifest, docs, runtime, UI, and Pi package verification.
- [x] Require rebuilt runtime and rebuilt Pi package artifacts.
- [x] Require local Pi-driven end-to-end practical verification.
- [x] Define completion criteria and non-acceptance criteria.

## Governing Decisions

1. `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md` remains the source of truth for taxonomy semantics unless explicitly amended.
2. This addendum copies the canonical taxonomy identity data needed to prevent ambiguity during implementation.
3. Pi-facing stable external metadata is advisory. Unknown, stale, unauthorized, or out-of-taxonomy stable Pi metadata must be ignored or degraded with diagnostics, not rejected solely because the metadata is imperfect.
4. Explicit hard constraints remain supported only for trusted/internal/admin policy paths, not for heuristic Pi metadata.
5. The implementation is incomplete until automated tests and live Pi/runtime QA both pass.

## Finding-To-Work Map

| Audit Finding | Required Fix Area | Primary Verification |
| --- | --- | --- |
| F1 JSON-first taxonomy | Canonical taxonomy source and loader | Core taxonomy parity and data-source tests |
| F2 placeholder hashes | Manifest receipt hashing | Hash recomputation and stale-artifact tests |
| F3 generic task guidance | Complete task records | No-placeholder tests and proposal golden fixture |
| F4 weak schemas | Strict schemas | Valid/invalid schema fixtures |
| F5 missing schemas | Add missing schema files | Schema file existence and validation tests |
| F6 advisory signals no-op | Router scoring | Routing intent scoring tests |
| F7 shallow Pi progressive disclosure | Pi group/role/task lookup | Pi classifier tests and runtime chunk fetch tests |
| F8 compact manifest incomplete | Pi compact receipts | Compact manifest hash/path tests |
| F9 UI assignment persistence | Explicit model role assignment | UI and runtime API tests |
| F10 stale hard/advisory docs | Runtime guide/docs/proposal reconciliation | Docs tests and classification-guide tests |
| F11 missing diagnostics | Ignored/degraded diagnostics | Runtime request diagnostics tests |
| F12 missing Pi fields | Stable Pi contract fields | Pi contract tests |
| F13 RBAC placeholder | Explicit placeholder or implementation | Effective taxonomy schema/API tests |
| F14 runtime validation timeouts | QA backend/runtime reliability | Full validation logs |
| F15 misleading evidence labels | Evidence hygiene | Phase summary and log-location audit |
| F16 dirty worktree | Final reconciliation | Git status and generated-artifact audit |

## Completion Definition

The implementation is complete only when all of these are true:

- canonical taxonomy JSON is the source of truth;
- runtime TypeScript exports are loaded or generated from canonical JSON, not from generic TypeScript task templates;
- all canonical taxonomy files validate through strict schemas;
- all manifest hashes are computed from canonical file content and are non-placeholder release receipts;
- generated docs, runtime bundles, and Pi compact snapshots prove they were generated from the same taxonomy content revision and hashes;
- every role has exactly one primary group and at least 10 task types whose first segment equals the role ID;
- all task entries have non-generic labels, descriptions, use-when guidance, do-not-use guidance, compatible roles, capabilities, modalities, tool classes, authority, stability, and variants where applicable;
- stable Pi request metadata remains advisory and cannot fail a user request solely because role/task metadata is unknown or stale;
- ignored/degraded advisory metadata is visible in diagnostics;
- explicit trusted hard constraints still reject or filter when unsatisfiable;
- advisory role/task/capability signals materially influence scoring only after hard eligibility filtering;
- runtime UI persists explicit role assignment semantics, not ambiguous empty arrays;
- Pi resolves the live runtime taxonomy progressively and falls back to package taxonomy only when runtime discovery is unavailable or incompatible;
- rebuilt runtime and rebuilt Pi package are installed and exercised through a local Pi instance;
- end-to-end Pi prompts prove classification, runtime setup, endpoint/alias configuration, routing, diagnostics, and UI visibility.

## Non-Acceptance Criteria

The implementation must be rejected if any of these remain true:

- taxonomy data is still generated from placeholder TypeScript task templates;
- manifest hashes are repeated placeholder values;
- any task description or classifier guidance matches generic patterns like `* work for the * role` or `Use for * requests assigned to * work`;
- schemas allow arbitrary unexpected fields outside explicit extension containers;
- `taxonomy.schema.json` or `intent-preset.schema.json` is missing;
- advisory metadata is parsed but never affects routing score/reasoning;
- Pi loads all role task chunks by default for ordinary classification;
- Pi compact manifest lacks file paths or content hashes;
- UI can represent "all roles" and "no roles" only through the same empty array state;
- runtime diagnostics do not expose ignored/degraded advisory taxonomy metadata;
- full rebuilt runtime validation or Pi-driven QA is skipped.

## Strict TDD Contract

Every implementation slice must follow RED/GREEN/REFACTOR.

For each slice:

1. Write one or more failing tests that reproduce the audit finding.
2. Save RED evidence under:

```text
/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/current-state-gap-closure/red/
```

3. Implement the smallest production/data/schema change needed.
4. Re-run the focused tests.
5. Save GREEN evidence under:

```text
/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/current-state-gap-closure/green/
```

6. Refactor only after focused tests are green.
7. Run package-level and integration-level verification before moving to the next dependent slice.

Generated data changes still require RED evidence. A failing validation test must exist before regenerating taxonomy JSON, compact Pi files, docs, or manifest receipts.

## Implementation Slices

### Slice 1: Canonical Taxonomy JSON Source

Covers: F1, F3, F16

RED tests:

- core test fails if `canonicalTaxonomy` is constructed from TypeScript task suffix templates instead of canonical JSON files;
- core test fails if canonical JSON files do not include all required groups, roles, tasks, capabilities, modalities, tool classes, and zero intent presets;
- core test fails on any generic task description or classifier guidance pattern;
- core test fails if any role has fewer than 10 own-prefix tasks;
- core test fails if a task's first segment does not equal its `primaryRole`.

Implementation:

- Move canonical source-of-truth data into JSON files under:

```text
role-model-router/packages/core/data/taxonomy/
  groups.json
  roles.json
  task-types.json
  capabilities.json
  modalities.json
  tool-classes.json
  intent-presets.json
  manifest.json
```

- Replace TypeScript task generation with JSON loading, validation, normalization, and typed exports.
- Preserve helper derivations only for indexes and compact views.
- Remove generic `taskSuffixesByRole` descriptions from runtime authority.
- Populate every task record from the proposal's canonical task table. If any row is absent from the proposal table but present in the required 280 IDs, author a complete row following the proposal grammar and document it in a run-local generated-data note.

GREEN verification:

- `corepack pnpm --filter @role-model-router/core test`
- targeted taxonomy catalog tests;
- no-placeholder taxonomy data test;
- role minimum task count test;
- exact ID parity test against this addendum's appendix.

### Slice 2: Manifest Receipts And Hash Consistency

Covers: F2, F8, F15

RED tests:

- manifest test fails when any `contentHashes` value is a repeated placeholder pattern;
- manifest test fails when `contentHashes.<entry>` does not equal the SHA-256 of the canonical JSON file bytes or normalized canonical payload, whichever policy is documented;
- Pi compact manifest test fails when file paths or content hashes are absent;
- runtime/docs/Pi hash consistency test fails when generated docs or compact snapshots use a different content revision/hash than runtime taxonomy.

Implementation:

- Add deterministic hash generation for every canonical taxonomy file.
- Add deterministic hash generation for compact Pi taxonomy files.
- Add a build/validation command that fails if data, docs, runtime exports, or Pi compact files are stale.
- Rename or relocate evidence logs so failed commands are not stored under `green`.

GREEN verification:

- `corepack pnpm schemas:validate`
- taxonomy manifest receipt tests;
- Pi compact manifest tests;
- stale generated artifact tests;
- evidence directory audit test or scripted check.

### Slice 3: Strict Schemas

Covers: F4, F5, F13

RED tests:

- schema tests fail because `taxonomy.schema.json` is missing;
- schema tests fail because `intent-preset.schema.json` is missing;
- classification schema tests fail when unknown fields are accepted outside extension containers;
- task-type schema tests fail when invalid IDs, missing classifier guidance, invalid references, or unexpected properties are accepted;
- model-role-assignment schema tests fail when invalid modes or ambiguous assignment payloads are accepted;
- effective-taxonomy schema tests fail when RBAC/scope placeholders are not explicit.

Implementation:

- Add:

```text
schemas/role-model/taxonomy/taxonomy.schema.json
schemas/role-model/taxonomy/intent-preset.schema.json
```

- Strengthen all taxonomy schemas.
- Use `additionalProperties: false` by default.
- Add explicit extension containers where future extensibility is needed:
  - `extensions`
  - `authority`
  - `scope`
  - `ui`
  - `rbac`
- Encode ID patterns, required fields, enums, arrays, and nested object shapes.
- Add TypeScript cross-reference validation for references that JSON Schema cannot enforce alone.
- Document that RBAC filtering is either implemented or an explicit Phase 1-4 placeholder with stable schema shape.

GREEN verification:

- valid proposal examples pass;
- invalid fixtures fail with deterministic errors;
- canonical taxonomy validates;
- runtime effective taxonomy validates;
- model assignment payloads validate.

### Slice 4: Runtime Classification Contract, Advisory Semantics, And Diagnostics

Covers: F10, F11, F12

RED tests:

- stable `role_model.contract_version: 1` snake_case payload tests for chat completions and responses;
- tests proving unknown stable `requested_role_id` and `task_type` do not reject;
- tests proving ignored/degraded advisory metadata appears in routing diagnostics;
- tests proving internal hard `role/task.hard: true` can reject or filter when trusted and unsatisfiable;
- tests proving raw `role_model` metadata is stripped before upstream provider calls.

Implementation:

- Normalize all stable external Pi metadata into an internal `RoutingIntent`.
- Mark stable external role/task metadata as advisory by default.
- Add diagnostic structures for:
  - accepted metadata;
  - ignored metadata;
  - degraded metadata;
  - rejected trusted hard metadata;
  - taxonomy version mismatch;
  - content revision mismatch;
  - unknown role/task/capability/modality/tool values.
- Update runtime classification guide so Pi-facing stable fields are not documented as hard by default.
- Keep trusted hard constraints in a clearly separate internal/admin path.

GREEN verification:

- runtime-host bridge request mapping tests;
- request observation tests;
- provider sanitization tests;
- diagnostics tests;
- docs/classification-guide tests.

### Slice 5: Router Scoring And Controller Handoff

Covers: F6

RED tests:

- two otherwise eligible candidates with different role/task fit scores produce different rankings for advisory `role_hint_id` and `task_type`;
- advisory preferred capabilities affect score/reason codes after hard filters;
- hard required role/capability/modality/tool filters run before advisory scoring;
- controller receives only eligible candidate facts and cannot choose a hard-filtered model;
- decision records include taxonomy versions, normalized intent, hard filters, advisory score components, and reason codes.

Implementation:

- Extend router scoring inputs with advisory role fit, task fit, preferred capability fit, modality fit, and tool fit.
- Keep hard filtering as a separate earlier stage.
- Add reason codes for advisory taxonomy matches and misses.
- Ensure controller prompt/context includes normalized intent and eligible candidate facts, not the full taxonomy catalog.

GREEN verification:

- `@role-model-router/core` routing intent tests;
- runtime-host integration tests with controller enabled and deterministic fallback;
- decision record diagnostics tests.

### Slice 6: Explicit UI Role Assignment Persistence

Covers: F9

RED tests:

- UI state test fails because `all` and `none` cannot be represented distinctly;
- runtime API type test fails because model role assignment payload lacks `roleAssignmentMode`;
- backend persistence test fails because assignment payload is reduced to plain `roleIds`;
- browser or component test fails if grouped roles are not displayed by group.

Implementation:

- Introduce explicit assignment shape:

```json
{
  "roleAssignmentMode": "all|include|exclude|custom",
  "enabledRoleIds": [],
  "disabledRoleIds": [],
  "taskOverrides": {},
  "capabilityOverrides": {},
  "modalityOverrides": {},
  "toolClassOverrides": {}
}
```

- Store role assignment state explicitly for local and peer models.
- Preserve backward compatibility by migrating legacy `roleIds` into the explicit shape at load time.
- Keep "all roles" checked by default for newly added models.
- Display roles grouped by canonical group.
- Keep task drill-down on configured model detail pages, not in the add-model first step.

GREEN verification:

- UI component tests;
- runtime API tests;
- migration tests;
- runtime UI validation command;
- manual browser check during Phase 5 QA.

### Slice 7: Pi Progressive Disclosure And Stable Contract Fields

Covers: F7, F8, F12

RED tests:

- Pi classifier test fails if it loads all role task chunks for ordinary classification;
- Pi classifier test fails if it classifies only through static regex rules without consulting taxonomy group/role/task data;
- Pi resolver test fails if runtime compatible taxonomy is available but package fallback wins;
- Pi contract test fails if `classification_version`, `source`, `confidence`, `output_modalities`, `evidence`, or `alternatives` are missing when applicable;
- Pi compact manifest test fails if hashes/file paths are missing.

Implementation:

- Implement progressive lookup:
  1. load compact manifest;
  2. load compact group list;
  3. score likely groups from prompt and request shape;
  4. load role summaries for likely groups;
  5. score likely roles;
  6. load task chunks only for top likely roles;
  7. select task and alternatives;
  8. emit advisory stable metadata.
- Prefer live runtime taxonomy when compatible.
- Fall back to package snapshot only when runtime is unavailable, incompatible, or times out.
- Emit stable Pi metadata:

```json
{
  "role_model": {
    "contract_version": 1,
    "intent": {
      "classification_version": "role-model.pi-classifier.v1",
      "taxonomy_version": "1.0.0-alpha.1",
      "content_revision": "taxonomy-v1-alpha.1",
      "classification_contract_version": "role-model.classification.v1",
      "source": "heuristic",
      "confidence": 0.0,
      "role_hint_id": "coder",
      "task_type": "coder.edit",
      "task_action": "edit",
      "task_variant": null,
      "task_source": "heuristic",
      "task_confidence": 0.0,
      "required_capabilities": [],
      "preferred_capabilities": [],
      "required_modalities": ["text"],
      "output_modalities": ["text"],
      "tool_classes": [],
      "context_tokens_estimate": null,
      "evidence": [],
      "alternatives": []
    }
  }
}
```

GREEN verification:

- Pi taxonomy data tests;
- Pi progressive classifier tests;
- Pi runtime precedence tests;
- Pi package build;
- Pi package pack.

### Slice 8: Documentation And Generated Docs

Covers: F10, F15

RED tests:

- docs tests fail if generated taxonomy docs are stale relative to manifest hash;
- docs tests fail if classification guide says Pi stable `requested_role_id` is hard by default;
- docs tests fail if "advisory metadata does not reject user request" behavior is absent.

Implementation:

- Generate docs from canonical JSON.
- Update protocol docs, package README/skill docs, and runtime classification guide.
- Document:
  - stable Pi metadata is advisory;
  - trusted internal hard metadata path;
  - diagnostics;
  - progressive disclosure;
  - role assignment UI semantics;
  - Phase 5 benchmark and Phase 6 telemetry placeholders as future phases.

GREEN verification:

- docs consistency tests;
- generated docs hash tests;
- package README/skill static tests.

### Slice 9: Runtime Validation And Packaging Reliability

Covers: F14, F16

RED tests:

- preserve failing validation logs for current timeout behavior;
- add or repair targeted tests that prove health endpoints are reachable after rebuilt runtime/package startup;
- add validation that packaged runtime serves taxonomy endpoints and `/healthz`.

Implementation:

- Fix timeout/root-cause issues if caused by this run's runtime-host changes.
- If failures are inherited and unrelated, document exact unrelated cause and add passing targeted validation for this run's taxonomy surfaces.
- Rebuild runtime packages after taxonomy, schema, docs, and Pi compact changes.

GREEN verification:

- `corepack pnpm --filter @role-model-router/runtime-host-bridge build`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge test`
- `corepack pnpm runtime:validate-host`
- `corepack pnpm runtime:validate-packaging`
- packaged executable taxonomy probe:
  - `/healthz`
  - `/api/role-model/taxonomy/manifest`
  - `/api/role-model/taxonomy/compact/groups`
  - `/api/role-model/taxonomy/roles/coder/tasks.compact`

## Canonical Taxonomy Appendix

The implementation must use the canonical taxonomy from the proposal. This appendix copies the identity and membership data that must be matched exactly. Full labels, descriptions, use-when guidance, do-not-use guidance, compatible roles, capabilities, modalities, tool classes, variants, examples, and ambiguity guidance for task rows must be copied from the proposal's `Canonical Runtime Taxonomy Catalog` and stored in canonical JSON. Placeholder generation is not acceptable.

### Canonical Groups

| Group ID | Label | Primary Roles | Secondary Roles |
| --- | --- | --- | --- |
| `engineering` | Engineering | `coder`, `architect`, `operator`, `tester`, `security`, `data` |  |
| `product_design` | Product And Design | `product`, `designer`, `planner`, `analyst` |  |
| `knowledge_research` | Knowledge And Research | `researcher`, `knowledge`, `scientist`, `mathematician`, `educator` | `health` |
| `business` | Business | `strategist`, `marketer`, `seller`, `finance`, `procurement` | `legal`, `recruiter` |
| `communication` | Communication | `writer`, `translator`, `creative`, `support`, `coordinator` |  |
| `governance_safety` | Governance And Safety | `legal`, `health`, `recruiter` | `security`, `finance` |

### Canonical Role Group Membership

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

### Canonical Role IDs

```text
coder, architect, security, researcher, writer, operator, analyst, planner, tester, data, product, designer, support, legal, finance, creative, educator, translator, marketer, seller, recruiter, procurement, coordinator, knowledge, strategist, mathematician, scientist, health
```

### Canonical Task Type IDs

```text
coder.edit, coder.review, coder.debug.root_cause, coder.test.write, coder.refactor, coder.explain, coder.migrate, coder.generate, tester.e2e, architect.design, architect.review, architect.plan, architect.api_design, security.audit, security.audit.supply_chain, security.threat_model, security.vulnerability_triage, security.policy_review, researcher.web_research, researcher.web_research.current, researcher.compare_sources, researcher.literature_review, researcher.fact_check, writer.docs.write, writer.docs.public, writer.docs.edit, writer.summarize, writer.release_notes, operator.debug.startup, operator.debug.ui, operator.debug.api, operator.deploy.review, operator.incident_triage, operator.config, operator.install, analyst.compare, analyst.evaluate, analyst.prioritize, planner.requirements, planner.roadmap, planner.roadmap.release, planner.decompose, tester.plan, tester.regression, tester.reproduce, data.query, data.schema.review, data.transform, product.requirements, product.workflow.review, product.release_notes, designer.ui.review, designer.interaction, designer.visual_direction, support.triage, support.explain, support.escalate, legal.review, legal.compliance_check, finance.cost_estimate, finance.compare_options, creative.brainstorm, creative.copywriting, creative.storyboard, educator.tutor, educator.lesson.plan, educator.quiz.generate, educator.feedback, translator.translate, translator.localize.locale, translator.review, marketer.positioning, marketer.campaign.plan, marketer.content.seo, marketer.copy.ad, seller.discovery.plan, seller.outreach.write, seller.proposal.enterprise, seller.objection.handle, recruiter.job_description, recruiter.interview.plan, recruiter.candidate.screen, procurement.vendor.compare, procurement.rfp.write, procurement.requirements, procurement.contract.commercial, coordinator.meeting.agenda, coordinator.meeting.notes, coordinator.schedule.plan, coordinator.follow_up, knowledge.organize, knowledge.retrieve, knowledge.memory.update, knowledge.kb.write, strategist.business.plan, strategist.market.analyze, strategist.competitive.review, strategist.risk.scenario, mathematician.solve, mathematician.verify, mathematician.model, mathematician.explain, scientist.experiment.design, scientist.evidence.review, scientist.method.critique, scientist.literature.synthesize, health.info.general, health.info.safety, health.care_navigation, health.wellness.plan, coder.dependency.update, coder.config, architect.infrastructure.design, architect.data_model, architect.integration.plan, architect.scalability.review, architect.migration.strategy, architect.adr.write, security.secrets.scan, security.auth.review, security.privacy.review, security.incident.review, security.safe_prompt.review, researcher.source_find, researcher.timeline.build, researcher.market_scan, researcher.standards_lookup, researcher.document_extract, writer.email.write, writer.blog.write, writer.proposal.write, writer.style.rewrite, writer.outline, operator.monitor, operator.backup.restore, operator.release.execute, analyst.metrics.define, analyst.risk.assess, analyst.root_cause, analyst.report.write, analyst.data_interpret, analyst.decision_matrix, analyst.trend.analyze, planner.milestone, planner.sprint.plan, planner.acceptance.criteria, planner.rollout, planner.dependency.map, planner.resource.plan, tester.unit.plan, tester.integration.plan, tester.accessibility, tester.performance, tester.security, tester.acceptance, data.analyze, data.visualize, data.validate, data.extract, data.join, data.quality.audit, data.metric.define, product.spec.write, product.user_story, product.acceptance, product.prd.write, product.feature.prioritize, product.feedback.synthesize, product.launch.readiness, designer.prototype, designer.design_system, designer.accessibility.review, designer.content.layout, designer.usability.test, designer.mobile.responsive, designer.visual.qa, support.ticket.reply, support.runbook.write, support.issue.reproduce, support.knowledge_base.suggest, support.status.update, support.customer.apology, support.faq.write, legal.privacy.review, legal.terms.review, legal.license.review, legal.contract.summarize, legal.risk.issue_spot, legal.policy.draft, legal.retention.review, legal.accessibility.compliance, finance.invoice.review, finance.budget.plan, finance.forecast, finance.unit_economics, finance.pricing.model, finance.variance.analyze, finance.procurement.cost, finance.roi.calculate, creative.name.generate, creative.concept.develop, creative.script.write, creative.brand.voice, creative.visual.prompt, creative.tagline, creative.social.post, educator.curriculum.design, educator.study.plan, educator.example.generate, educator.rubric.create, educator.concept.explain, educator.practice.review, translator.tone.adapt, translator.glossary.create, translator.subtitles.translate, translator.technical.translate, translator.back_translate, translator.locale.review, translator.multilingual.reply, marketer.audience.research, marketer.email.sequence, marketer.landing_page.copy, marketer.social.plan, marketer.messaging.review, marketer.launch.plan, seller.account.plan, seller.demo.script, seller.follow_up.write, seller.competitor.battlecard, seller.call.summary, seller.mutual_action_plan, recruiter.sourcing.message, recruiter.scorecard.create, recruiter.interview.feedback, recruiter.offer.prepare, recruiter.pipeline.update, recruiter.role.intake, recruiter.candidate.compare, procurement.security.questionnaire, procurement.vendor.scorecard, procurement.renewal.review, procurement.sla.review, procurement.negotiation.plan, procurement.purchase.justification, coordinator.task.plan, coordinator.inbox.triage, coordinator.decision.log, coordinator.project.status, coordinator.reminder.plan, coordinator.handoff.prepare, knowledge.note.summarize, knowledge.taxonomy.design, knowledge.link.map, knowledge.runbook.update, knowledge.archive.clean, knowledge.context.brief, strategist.swot, strategist.okr.define, strategist.board.brief, strategist.operating.model, strategist.pricing.strategy, strategist.partnership.evaluate, mathematician.statistics.analyze, mathematician.optimize, mathematician.proof.write, mathematician.formula.derive, mathematician.simulation.plan, mathematician.error.check, scientist.hypothesis.formulate, scientist.protocol.write, scientist.data.interpret, scientist.peer_review, scientist.safety.review, scientist.technical.explain, health.medication.info, health.appointment.prepare, health.symptom.organize, health.exercise.general, health.nutrition.general, health.mental_wellness.info
```

### Canonical Capabilities

```text
text.chat, code.read, code.write, reasoning.multi_step, tools.function_calling, tools.command_execution, json.schema_adherence, security.analysis, web.search, citation.synthesis, long_context, tools.browser_control, vision.input, data.query, data.schema, data.transform, legal.analysis, finance.analysis, reasoning.divergent, vision.output, communication.user_facing, communication.follow_up, education.tutoring, education.assessment, language.translation, language.localization, marketing.analysis, marketing.copy, sales.analysis, sales.communication, recruiting.analysis, procurement.analysis, coordination.workflow, calendar.planning, knowledge.organization, knowledge.retrieval, memory.write, strategy.analysis, market.analysis, math.solve, math.verify, math.modeling, science.analysis, science.method, health.general_info, health.safety
```

### Canonical Modalities

```text
text, image, audio, video, file, structured_json, tabular, code_patch, document
```

### Canonical Tool Classes

```text
filesystem.read, filesystem.write, shell.execute, browser.control, web.search, http.fetch, database.query, package.install, calendar.read, calendar.write, email.read, email.write, memory.read, memory.write, vector.search
```

## Required End-To-End QA With Local Pi And Rebuilt Runtime

Phase 5 QA for the implementation must be agent-operated unless the user explicitly chooses hybrid/human QA.

### Build And Install Steps

The QA operator must:

1. Rebuild core, runtime host bridge, runtime UI, and Pi package.
2. Regenerate canonical taxonomy JSON, manifest, generated docs, and Pi compact taxonomy.
3. Package the runtime artifact used by installers.
4. Package `@try-works/pi-role-model`.
5. Launch the rebuilt local Role-Model runtime.
6. Drive the local Pi instance on this device.
7. Command Pi to update/install the rebuilt local `pi-role-model` package.
8. Command Pi to install/update the rebuilt local Role-Model runtime if needed, using the public Role-Model runtime README instructions.
9. Command Pi to configure the Role-Model endpoint and alias.
10. Send real prompts through Pi and inspect runtime diagnostics/UI.

### Required Pi Prompts

Use prompts that force different roles, tasks, capabilities, modalities, and advisory/fallback behavior:

1. "Implement this small bug fix and add a regression test."
   - Expected: `engineering`, `coder`, `coder.edit` or `coder.test.write`, `code.write`, `filesystem.write`, shell/test capability as applicable.

2. "Review this diff for security risks and likely regressions."
   - Expected: `engineering`, `security` or `coder`, `security.audit` or `coder.review`, `security.analysis`, `code.read`, `filesystem.read`.

3. "Compare the latest public docs for two providers and cite the differences."
   - Expected: `knowledge_research`, `researcher`, `researcher.web_research.current` or `researcher.compare_sources`, `web.search`, `citation.synthesis`.

4. "Inspect this schema and propose a migration plan."
   - Expected: `engineering`, `data` or `architect`, `data.schema.review` or `architect.migration.strategy`, `data.schema`, `reasoning.multi_step`.

5. "Write public installation instructions for Pi users."
   - Expected: `communication`, `writer`, `writer.docs.public`, `communication.user_facing`.

6. "Prepare a support reply and escalation notes for a customer install failure."
   - Expected: `communication`, `support`, `support.ticket.reply` or `support.escalate`, `communication.user_facing`.

7. "Create a vendor comparison and purchasing justification."
   - Expected: `business`, `procurement`, `procurement.vendor.compare` or `procurement.purchase.justification`.

8. "Organize these symptoms into notes for an appointment without diagnosing me."
   - Expected: `governance_safety`, `health`, `health.symptom.organize`, `health.safety`, advisory safety diagnostics.

9. "Use intentionally stale metadata for a nonexistent role/task and still answer normally."
   - Expected: request is not rejected; diagnostics show ignored/degraded advisory metadata; controller/router falls back to normal routing.

10. "Send a trusted hard internal role/task constraint that cannot be satisfied."
    - Expected: trusted hard path rejects or reports no eligible model with explicit diagnostics. This should not use the stable Pi heuristic contract unless an admin/test harness intentionally sends the internal hard shape.

### Required Runtime UI And Diagnostics Checks

The QA operator must verify:

- `/api/role-model/taxonomy/manifest` returns real non-placeholder hashes;
- `/api/role-model/taxonomy/compact/groups` returns 6 groups;
- `/api/role-model/taxonomy/roles/coder/tasks.compact` returns the coder task chunk only;
- Pi package manifest hashes match runtime manifest or records a clear runtime override/mismatch diagnostic;
- configured model role assignment defaults to all roles with visible checked roles;
- all and none role assignment states are distinct and persisted;
- request diagnostics show normalized intent, accepted metadata, ignored/degraded metadata, hard filters, advisory scoring, selected endpoint/model, and taxonomy versions;
- controller routing cannot choose candidates removed by hard filters;
- advisory role/task signals can change candidate ranking or reason codes among eligible candidates;
- no raw `role_model` metadata is forwarded to upstream model providers;
- generated docs and package docs describe Pi-facing metadata as advisory.

### Required Evidence

Record evidence under:

```text
/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/current-state-gap-closure/
```

Minimum evidence:

- RED and GREEN logs for each implementation slice;
- schema validation log;
- core package test/build log;
- runtime-host test/build log;
- runtime-ui test/build/validation log;
- Pi package test/build/pack log;
- packaged runtime health/taxonomy probe logs;
- local Pi install/update transcript or command log;
- local Pi prompts and observed classifications;
- runtime diagnostics captures for valid advisory, invalid advisory, and trusted hard cases;
- browser or API evidence for model role assignment UI persistence.

## Implementation Sequence

The next implementation pass should execute slices in this order:

1. Taxonomy JSON source and exact content.
2. Strict schemas and validation.
3. Manifest receipts and generated artifact consistency.
4. Runtime stable contract and diagnostics.
5. Router scoring and controller handoff.
6. UI role assignment persistence.
7. Pi progressive classification and compact manifest.
8. Generated docs and classification guide updates.
9. Rebuilt runtime/package validation.
10. Local Pi-driven end-to-end QA.

Do not start Slice 4 until Slices 1 through 3 are green. Do not start local Pi QA until all automated package/build/validation tests for changed surfaces are green or explicitly documented as unrelated inherited failures with targeted replacement evidence.

## Audit Gate

Audit: PASS

This addendum directly maps all current-state audit findings to implementation slices, TDD evidence, and practical rebuilt-runtime/Pi verification.

## Coverage Gate

Coverage: PASS

The plan covers canonical taxonomy content, schemas, manifest receipts, docs, runtime normalization, routing/scoring, controller handoff, UI assignment, Pi progressive disclosure, diagnostics, package validation, and local Pi-driven QA.

## Approval Gate

Approval: PASS

The addendum is ready to serve as the implementation plan for the current Run 57 gap-closure pass or for a follow-up recursive run that targets the documented audit findings.
