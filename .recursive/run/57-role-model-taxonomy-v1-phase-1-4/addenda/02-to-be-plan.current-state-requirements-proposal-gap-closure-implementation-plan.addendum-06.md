# To-Be Plan Addendum 06: Current-State Requirements And Proposal Gap Closure Implementation Plan

Run: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/`  
Phase: `02 To-Be Plan Addendum 06`  
Artifact: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/02-to-be-plan.current-state-requirements-proposal-gap-closure-implementation-plan.addendum-06.md`  
Status: `DRAFT`  
Workflow version: `recursive-mode-audit-v1`  
Artifact kind: run-local implementation plan addendum  
CreatedAt: `2026-06-24`  
Base Artifact: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/02-to-be-plan.md`  
TDD Mode: `strict`  
QA Execution Mode: `agent-operated`

Inputs:
- `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-worktree.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/02-to-be-plan.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.current-state-requirements-proposal-audit.addendum-11.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.current-state-gap-closure-implementation.addendum-10.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/05-manual-qa.current-state-reconciliation.addendum-02.md`
- current worktree state on branch `recursive/57-role-model-taxonomy-v1-phase-1-4`

## Purpose

This addendum defines the implementation plan for closing every finding in audit addendum 11. It is a run-local Run 57 implementation plan addendum, not an addendum to the external proposal.

The work remains scoped to proposal Phase 1 through Phase 4. Proposal Phase 5 taxonomy-aware benchmarks and proposal Phase 6 taxonomy-aware telemetry remain out of scope except for preserved extension points, public documentation notes, diagnostics, and verification receipts that state those later phases are not built in Run 57.

## Effective Inputs Re-Read Requirement

Before implementation starts, re-read:

1. `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md`
2. `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
3. `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-worktree.md`
4. `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/02-to-be-plan.md`
5. `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.current-state-requirements-proposal-audit.addendum-11.md`
6. this addendum

The next implementation summary addendum must record this re-read before any production code changes.

## Non-Negotiable Safety And Scope Rules

- Preserve the user-approved permissive advisory metadata behavior: invalid advisory Pi metadata must not cause request failure. It must be ignored, degraded, or used only as diagnostics while the controller/runtime falls back to valid normalized intent.
- Preserve hard-field validation: explicit trusted hard taxonomy constraints may reject invalid IDs, but low-confidence Pi classification output must be sent as advisory unless it is backed by explicit user instruction or trusted policy/context.
- Do not make `pi-role-model` start, stop, install, update, or own the Role-Model runtime process.
- Do not call a Role-Model launcher path from `pi-role-model`.
- Do not read, print, copy, sync, or persist Pi provider secrets.
- Do not add hidden model calls for classification by default.
- Do not implement proposal Phase 5 benchmark scoring, benchmark dashboards, benchmark-informed routing, proposal Phase 6 production telemetry aggregation, telemetry dashboards, or telemetry-informed routing.

## Canonical Taxonomy Lock

The implementation must continue to match the proposal taxonomy exactly. The authoritative row content is the proposal's `Canonical Runtime Taxonomy Catalog`; this addendum restates the exact ID-level catalog that tests must lock against.

Required counts:

| Resource | Required count |
| --- | ---: |
| Groups | 6 |
| Roles | 28 |
| Task types | 280 |
| Capabilities | 46 |
| Modalities | 9 |
| Tool classes | 15 |

Groups:

```text
engineering, product_design, knowledge_research, business, communication, governance_safety
```

Roles:

```text
coder, architect, security, researcher, writer, operator, analyst, planner, tester, data, product, designer, support, legal, finance, creative, educator, translator, marketer, seller, recruiter, procurement, coordinator, knowledge, strategist, mathematician, scientist, health
```

Role group membership:

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

Task type IDs:

```text
coder.edit, coder.review, coder.debug.root_cause, coder.test.write, coder.refactor, coder.explain, coder.migrate, coder.generate, tester.e2e, architect.design, architect.review, architect.plan, architect.api_design, security.audit, security.audit.supply_chain, security.threat_model, security.vulnerability_triage, security.policy_review, researcher.web_research, researcher.web_research.current, researcher.compare_sources, researcher.literature_review, researcher.fact_check, writer.docs.write, writer.docs.public, writer.docs.edit, writer.summarize, writer.release_notes, operator.debug.startup, operator.debug.ui, operator.debug.api, operator.deploy.review, operator.incident_triage, operator.config, operator.install, analyst.compare, analyst.evaluate, analyst.prioritize, planner.requirements, planner.roadmap, planner.roadmap.release, planner.decompose, tester.plan, tester.regression, tester.reproduce, data.query, data.schema.review, data.transform, product.requirements, product.workflow.review, product.release_notes, designer.ui.review, designer.interaction, designer.visual_direction, support.triage, support.explain, support.escalate, legal.review, legal.compliance_check, finance.cost_estimate, finance.compare_options, creative.brainstorm, creative.copywriting, creative.storyboard, educator.tutor, educator.lesson.plan, educator.quiz.generate, educator.feedback, translator.translate, translator.localize.locale, translator.review, marketer.positioning, marketer.campaign.plan, marketer.content.seo, marketer.copy.ad, seller.discovery.plan, seller.outreach.write, seller.proposal.enterprise, seller.objection.handle, recruiter.job_description, recruiter.interview.plan, recruiter.candidate.screen, procurement.vendor.compare, procurement.rfp.write, procurement.requirements, procurement.contract.commercial, coordinator.meeting.agenda, coordinator.meeting.notes, coordinator.schedule.plan, coordinator.follow_up, knowledge.organize, knowledge.retrieve, knowledge.memory.update, knowledge.kb.write, strategist.business.plan, strategist.market.analyze, strategist.competitive.review, strategist.risk.scenario, mathematician.solve, mathematician.verify, mathematician.model, mathematician.explain, scientist.experiment.design, scientist.evidence.review, scientist.method.critique, scientist.literature.synthesize, health.info.general, health.info.safety, health.care_navigation, health.wellness.plan, coder.dependency.update, coder.config, architect.infrastructure.design, architect.data_model, architect.integration.plan, architect.scalability.review, architect.migration.strategy, architect.adr.write, security.secrets.scan, security.auth.review, security.privacy.review, security.incident.review, security.safe_prompt.review, researcher.source_find, researcher.timeline.build, researcher.market_scan, researcher.standards_lookup, researcher.document_extract, writer.email.write, writer.blog.write, writer.proposal.write, writer.style.rewrite, writer.outline, operator.monitor, operator.backup.restore, operator.release.execute, analyst.metrics.define, analyst.risk.assess, analyst.root_cause, analyst.report.write, analyst.data_interpret, analyst.decision_matrix, analyst.trend.analyze, planner.milestone, planner.sprint.plan, planner.acceptance.criteria, planner.rollout, planner.dependency.map, planner.resource.plan, tester.unit.plan, tester.integration.plan, tester.accessibility, tester.performance, tester.security, tester.acceptance, data.analyze, data.visualize, data.validate, data.extract, data.join, data.quality.audit, data.metric.define, product.spec.write, product.user_story, product.acceptance, product.prd.write, product.feature.prioritize, product.feedback.synthesize, product.launch.readiness, designer.prototype, designer.design_system, designer.accessibility.review, designer.content.layout, designer.usability.test, designer.mobile.responsive, designer.visual.qa, support.ticket.reply, support.runbook.write, support.issue.reproduce, support.knowledge_base.suggest, support.status.update, support.customer.apology, support.faq.write, legal.privacy.review, legal.terms.review, legal.license.review, legal.contract.summarize, legal.risk.issue_spot, legal.policy.draft, legal.retention.review, legal.accessibility.compliance, finance.invoice.review, finance.budget.plan, finance.forecast, finance.unit_economics, finance.pricing.model, finance.variance.analyze, finance.procurement.cost, finance.roi.calculate, creative.name.generate, creative.concept.develop, creative.script.write, creative.brand.voice, creative.visual.prompt, creative.tagline, creative.social.post, educator.curriculum.design, educator.study.plan, educator.example.generate, educator.rubric.create, educator.concept.explain, educator.practice.review, translator.tone.adapt, translator.glossary.create, translator.subtitles.translate, translator.technical.translate, translator.back_translate, translator.locale.review, translator.multilingual.reply, marketer.audience.research, marketer.email.sequence, marketer.landing_page.copy, marketer.social.plan, marketer.messaging.review, marketer.launch.plan, seller.account.plan, seller.demo.script, seller.follow_up.write, seller.competitor.battlecard, seller.call.summary, seller.mutual_action_plan, recruiter.sourcing.message, recruiter.scorecard.create, recruiter.interview.feedback, recruiter.offer.prepare, recruiter.pipeline.update, recruiter.role.intake, recruiter.candidate.compare, procurement.security.questionnaire, procurement.vendor.scorecard, procurement.renewal.review, procurement.sla.review, procurement.negotiation.plan, procurement.purchase.justification, coordinator.task.plan, coordinator.inbox.triage, coordinator.decision.log, coordinator.project.status, coordinator.reminder.plan, coordinator.handoff.prepare, knowledge.note.summarize, knowledge.taxonomy.design, knowledge.link.map, knowledge.runbook.update, knowledge.archive.clean, knowledge.context.brief, strategist.swot, strategist.okr.define, strategist.board.brief, strategist.operating.model, strategist.pricing.strategy, strategist.partnership.evaluate, mathematician.statistics.analyze, mathematician.optimize, mathematician.proof.write, mathematician.formula.derive, mathematician.simulation.plan, mathematician.error.check, scientist.hypothesis.formulate, scientist.protocol.write, scientist.data.interpret, scientist.peer_review, scientist.safety.review, scientist.technical.explain, health.medication.info, health.appointment.prepare, health.symptom.organize, health.exercise.general, health.nutrition.general, health.mental_wellness.info
```

Capabilities:

```text
text.chat, code.read, code.write, reasoning.multi_step, tools.function_calling, tools.command_execution, json.schema_adherence, security.analysis, web.search, citation.synthesis, long_context, tools.browser_control, vision.input, data.query, data.schema, data.transform, legal.analysis, finance.analysis, reasoning.divergent, vision.output, communication.user_facing, communication.follow_up, education.tutoring, education.assessment, language.translation, language.localization, marketing.analysis, marketing.copy, sales.analysis, sales.communication, recruiting.analysis, procurement.analysis, coordination.workflow, calendar.planning, knowledge.organization, knowledge.retrieval, memory.write, strategy.analysis, market.analysis, math.solve, math.verify, math.modeling, science.analysis, science.method, health.general_info, health.safety
```

Modalities:

```text
text, image, audio, video, file, structured_json, tabular, code_patch, document
```

Tool classes:

```text
filesystem.read, filesystem.write, shell.execute, browser.control, web.search, http.fetch, database.query, package.install, calendar.read, calendar.write, email.read, email.write, memory.read, memory.write, vector.search
```

The implementation must use proposal-derived golden fixtures or generated parity tests to verify not only IDs and counts, but also labels, descriptions, guidance, role/group relationships, task references, required/preferred capabilities, modalities, tool classes, classifier hints, UI metadata, authority metadata, stability, and content hashes.

## Finding-To-Work Mapping

| Audit finding | Required fix | Primary paths |
| --- | --- | --- |
| `F1` Manifest schema uses `counts` instead of `entryCounts` | Rename the canonical runtime/Pi/API/schema/docs contract to `entryCounts`; remove or quarantine undocumented `counts` drift; add tests that fail on missing `entryCounts`. | `schemas/role-model/taxonomy/manifest.schema.json`, `role-model-router/packages/core/data/taxonomy/manifest.json`, runtime taxonomy API, Pi compact manifest, docs, tests |
| `F2` Pi compact index is not compact | Rebuild the Pi compact taxonomy generator/output so top-level indexes contain only staged summary fields; detailed task data lives only in per-role chunks; add hard size guardrail tests. | `packages/pi-role-model/data/taxonomy/**`, `packages/pi-role-model/src/taxonomy/**`, generator scripts, Pi tests |
| `F3` Docs checks do not prove canonical parity | Replace token-only checks with canonical-data parity checks for generated docs/tables and public docs snippets. | `scripts/check-public-taxonomy-v1-docs.mjs`, `apps/docs-site/scripts/check-taxonomy-v1-docs.mjs`, docs, docs-site content, tests |
| `F4` E2E coverage incomplete/mislabeled | Produce one-to-one proposal Phase 1-4 E2E reconciliation and missing automated/agent-operated QA receipts. | `05-manual-qa` addenda, evidence logs, runtime/Pi QA scripts |
| `F5` UI live evidence incomplete | Add browser-driven receipts for grouped role assignment, role removal, high-risk labels, and task drill-in on actual runtime routes. | runtime UI tests/evidence, `/app/models`, `/app/models/roles`, browser screenshots |
| `F6` Classifier evidence does not match minimum request set | TDD-lock the six proposal prompts with accepted primary and alternative tasks/capabilities; improve classifier output where required without turning advisory errors into hard failures. | `packages/pi-role-model/src/taxonomy/**`, Pi tests, QA receipts |
| `F7` ETag/cache behavior under-evidenced | Add deterministic `ETag`/`If-None-Match` behavior and tests for taxonomy discovery routes. | runtime host bridge taxonomy routes/tests |
| `F8` Runtime/package/docs/release hash parity under-proven | Add one parity check proving runtime taxonomy, Pi snapshot, generated docs, and release/package bundle taxonomy metadata share the same version/content hashes. | scripts, package data, runtime data, release validation, docs checks |

## Implementation Plan

### Step 0 - Reconcile Worktree And Baseline

1. Confirm the active worktree is `.worktrees/57-role-model-taxonomy-v1-phase-1-4` on branch `recursive/57-role-model-taxonomy-v1-phase-1-4`.
2. Read `00-worktree.md` and record the normalized diff basis in the next implementation summary addendum.
3. Run `git status --short` and identify only Run 57-owned changes. Do not revert user changes.
4. Record the existing latest passing commands from addendum 10 as historical evidence only; do not treat them as current green evidence after changes.

### Step 1 - F1 Manifest Contract Repair With TDD

RED tests first:

1. Add or update manifest schema tests that fail unless manifest JSON exposes `entryCounts` and does not rely on `counts`.
2. Add runtime API tests that fetch taxonomy manifest/version responses and assert `entryCounts.groups`, `entryCounts.roles`, `entryCounts.taskTypes`, `entryCounts.capabilities`, `entryCounts.modalities`, and `entryCounts.toolClasses`.
3. Add Pi package tests that assert compact manifest runtime hash/count parity reads `entryCounts`.
4. Add docs/static checks that fail if public taxonomy docs describe `counts` as the canonical manifest field.

GREEN implementation:

1. Update canonical runtime manifest data to use `entryCounts`.
2. Update manifest JSON Schema to require `entryCounts`.
3. Update runtime host bridge taxonomy responses to return `entryCounts`.
4. Update all runtime/Pi/doc consumers to read `entryCounts`.
5. If any internal migration compatibility path accepts legacy `counts`, keep it private and diagnostic-only; do not document or emit `counts` as the canonical field.

Verification:

- Run focused manifest/schema tests.
- Run runtime host taxonomy discovery tests.
- Run Pi taxonomy data tests.
- Run docs taxonomy checks.

### Step 2 - F2 Pi Progressive-Disclosure Snapshot Repair With TDD

RED tests first:

1. Add a Pi compact snapshot shape test that fails if `compact-role-task-index.json` contains any detailed task fields beyond role IDs, task IDs, task labels, and stable summary metadata.
2. Add tests that fail if task descriptions, classifier hints, compatible roles, required/preferred capabilities, modalities, tool classes, variants, examples, or ambiguity guidance appear in the top-level role-task index.
3. Add lazy-loading tests proving Pi can load:
   - compact manifest first;
   - compact groups second;
   - compact role summaries third;
   - role task chunks only for likely roles.
4. Add size guardrail tests:
   - `compact-manifest.json`, `compact-groups.json`, `compact-role-summaries.json`, each group chunk, and each role task chunk must be under 16 KB unless an explicit addendum approves a larger limit.
   - `compact-role-task-index.json` should target under 16 KB; if the full IDs/labels-only index cannot fit under 16 KB after minification, split the index by group/role while keeping the proposal-required file as a small pointer/index and record the chosen hard limit in tests.
5. Add hash tests proving every compact chunk listed in the compact manifest has a matching content hash.

GREEN implementation:

1. Update the generator/output so `compact-role-task-index.json` is IDs/labels-only.
2. Move detailed task data into `roles/{roleId}/tasks.compact.json`.
3. Ensure each `roles/{roleId}/tasks.compact.json` contains only one role's compact task descriptions, use-when/do-not-use-when guidance, and required/preferred capabilities.
4. Update `load-compact-taxonomy.ts`, `resolve-effective-taxonomy.ts`, and `classify-with-progressive-disclosure.ts` to use the staged files.
5. Update Pi package docs/skill guidance to describe the actual staged loading order.

Verification:

- Run `corepack pnpm --filter @try-works/pi-role-model test`.
- Run `corepack pnpm --filter @try-works/pi-role-model build`.
- Record file sizes for compact files and include them in the implementation summary.

### Step 3 - F3/F8 Canonical Docs And Hash Parity With TDD

RED tests first:

1. Add a canonical taxonomy docs parity check that fails when docs omit or misstate canonical counts, groups, roles, manifest field names, request metadata fields, progressive-disclosure file names, or hard/advisory semantics.
2. Add a generated-docs check that compares docs tables against canonical runtime taxonomy data instead of only scanning for tokens.
3. Add a parity script/test that proves runtime taxonomy data, Pi compact snapshots, generated docs metadata, and release/package bundle taxonomy manifests share the same `schemaVersion`, `taxonomyVersion`, `classificationContractVersion`, `contentRevision`, `entryCounts`, and content hashes.

GREEN implementation:

1. Generate or repair docs sections from canonical taxonomy data.
2. Update root/public docs, docs-site content, protocol docs, and Pi skill guidance where the manifest field or compact snapshot shape changed.
3. Update docs checks to fail on stale `counts` references where `entryCounts` is required.
4. Update release/package validation so built runtime artifacts include the current taxonomy manifest and hash metadata.

Verification:

- Run root taxonomy docs check.
- Run docs-site taxonomy docs check.
- Run schema validation where docs/schema coupling is affected.
- Run release/package parity validation or record a narrower focused equivalent if full SEA packaging is too expensive during TDD loops.

### Step 4 - F6 Classification Fidelity With TDD

RED tests first:

Add Pi classifier tests for the proposal minimum request set with these required accepted outputs:

| Request | Required classification evidence |
| --- | --- |
| `Review this diff for security risks and likely regressions.` | group `engineering`; role `security` or `coder`; task `coder.review` or security review/audit task; capabilities include `code.read`, `security.analysis`; tool class includes `filesystem.read` when file/diff context is present. |
| `Implement this small bug fix and add a regression test.` | group `engineering`; role `coder`; primary or alternative tasks include both `coder.edit` and `coder.test.write`; capabilities include `code.write`, `tools.command_execution`; tool class includes `filesystem.write` when write context is present. |
| `Compare current public documentation for this API and cite differences.` | group `knowledge_research`; role `researcher`; primary or alternative task includes `researcher.compare_sources`; capabilities include `web.search`, `citation.synthesis`. |
| `Turn these support notes into a clear customer reply.` | group `communication`; role `support` or `writer`; task includes `support.ticket.reply` or `writer.email.write`; capability includes `communication.user_facing`. |
| `Inspect this schema and propose a migration plan.` | group `engineering`; role `data` or `architect`; primary or alternative task includes `data.schema.review`; capabilities include `data.schema`, `reasoning.multi_step`. |
| `Create product requirements and acceptance criteria for this workflow.` | group `product_design`; role `product` or `planner`; task includes `product.requirements` or `planner.requirements`. |

GREEN implementation:

1. Update classifier heuristics to preserve one primary task while adding proposal-required secondary tasks through `alternatives` or a schema-valid advisory multi-task field.
2. Ensure all low-confidence secondary tasks are advisory.
3. Ensure unknown/advisory metadata still degrades to controller/runtime classification rather than failing the request.
4. Update runtime normalization diagnostics so accepted, ignored, and degraded fields are visible in request detail.

Verification:

- Run Pi classifier tests.
- Run runtime metadata validation tests proving invalid advisory alternatives do not reject requests.
- Include the six-prompt classification receipt in Phase 5 QA evidence.

### Step 5 - F7 Taxonomy Discovery Cache Semantics With TDD

RED tests first:

1. Add runtime host bridge tests for taxonomy discovery endpoints asserting deterministic `ETag` headers on manifest/version/summary/chunk responses where response content is cacheable.
2. Add `If-None-Match` tests proving matching tags return `304 Not Modified` with no response body.
3. Add invalidation tests proving changed taxonomy version/content revision/hash changes the ETag.

GREEN implementation:

1. Add content-hash-based ETag helpers for taxonomy discovery responses.
2. Apply ETag handling to cacheable taxonomy endpoints.
3. Ensure responses still include version fields in normal `200` responses.
4. Ensure Pi/runtime clients can use the headers without depending on them for correctness.

Verification:

- Run runtime host taxonomy discovery tests.
- Run Pi runtime discovery tests if Pi client cache behavior is touched.

### Step 6 - F4/F5 Routing, Controller, UI, And E2E Evidence Closure

Automated RED tests first:

1. Add or update router tests for two configured models with different role/capability/tool assignments:
   - a request requiring `code.read` and `filesystem.read` must remove candidates lacking hard role/capability/tool constraints before controller selection.
   - diagnostics must expose role, capability, modality, tool, RBAC, health, and context exclusion reason codes where applicable.
2. Add advisory scoring tests:
   - changing advisory `role_hint_id`, `task_type`, and `preferred_capabilities` must change ranking/reason codes without making otherwise eligible candidates ineligible.
3. Add controller constraint tests:
   - the controller must receive normalized intent plus eligible candidates only.
   - a blocked candidate cannot be selected even if the controller would otherwise prefer it.
4. Add runtime UI tests for actual existing routes:
   - `/app/models` new/loaded model role assignment defaults to all roles checked.
   - visible `All roles` control can disable/enable role groups.
   - removing `security` from a model persists and affects routing eligibility.
   - `/app/models` or `/app/models/roles` exposes task drill-in under role/group context without loading the full catalog in add/load flow.
   - high-risk roles are visibly labeled.

GREEN implementation:

1. Repair router/core/controller logic only where tests expose real gaps.
2. Repair runtime UI integration on existing pages only; do not create a new top-level taxonomy app.
3. Ensure UI persisted model role assignment writes the existing model assignment contract with `roleAssignmentMode`, `enabledRoleIds`, and `disabledRoleIds` semantics.
4. Preserve future Phase 5/6 placeholders without implementing benchmark/telemetry features.

Verification:

- Run focused core routing tests.
- Run runtime host bridge tests.
- Run runtime UI tests and build.
- Run browser E2E or Playwright validation for `/app/models`, `/app/models/roles`, `/app/router/candidates`, `/app/router/decisions/:requestId`, `/app/observe/requests`, and `/app/observe/routing`.

## Required Automated Verification Floor

After implementation, run and record:

```powershell
corepack pnpm --filter @role-model-router/core test
corepack pnpm --filter @role-model-router/runtime-host-bridge test
corepack pnpm --filter @role-model-router/runtime-host-bridge build
corepack pnpm --filter @role-model-router/runtime-ui test
corepack pnpm --filter @role-model-router/runtime-ui build
corepack pnpm --filter @try-works/pi-role-model test
corepack pnpm --filter @try-works/pi-role-model build
corepack pnpm run schemas:validate
corepack pnpm run docs:taxonomy-v1-check
corepack pnpm run runtime:validate-ui
```

If changed-path scope touches broader runtime packaging or release artifacts, also run:

```powershell
corepack pnpm run runtime:validate-packaging
```

If a command cannot complete because of a verified environmental limitation, record the exact command, failure output path, limitation, and compensating evidence. Do not call a product behavior verified without a distinct passing or compensating evidence path.

## Phase 5 Agent-Operated Manual QA Plan

Phase 5 must be re-run after implementation. It must use the proposal as the verification checklist and produce a new QA addendum or update the active Phase 5 addendum allowed by the recursive workflow.

### Build And Install Steps

1. Rebuild the Role-Model runtime packages from this worktree.
2. Rebuild the runtime UI from this worktree.
3. Rebuild `pi-role-model` from this worktree or create a local package artifact.
4. Launch the rebuilt Role-Model router runtime locally on an explicit port.
5. Command the local Pi instance to install/update the rebuilt `pi-role-model` package.
6. Command Pi to configure the local router endpoint URL, auth if needed, and a user-facing alias.
7. Command Pi to verify installed package version, taxonomy version, classification contract version, `entryCounts`, and compact snapshot hashes.
8. Command Pi to send representative requests through the alias.
9. Inspect runtime UI/API evidence for normalized intent, candidate filters, candidate scores, selected endpoint/model, controller output or deterministic fallback, and diagnostics.
10. Iterate through TDD repairs if any QA observation contradicts the proposal, requirement, or this addendum.

### Required E2E Coverage Table

| Test ID | Required QA evidence |
| --- | --- |
| `E2E-P1-001` | Pi reads installed compact taxonomy snapshot and compares it to runtime taxonomy version/summary endpoints; receipt includes matching `schemaVersion`, `taxonomyVersion`, `contentRevision`, `entryCounts`, and hashes or explicit runtime override. |
| `E2E-P1-002` | Pi lists all groups, roles by group, and secondary group membership; runtime UI shows same grouping. |
| `E2E-P1-003` | Pi inspects one role from each group and lists at least 10 tasks for each sampled role using staged loading; receipt proves it did not load the full taxonomy at once. |
| `E2E-P2-001` | Pi fetches effective taxonomy summary, one group, one role summary, and one role task detail from running router; responses show stable versions, valid references, and ETag behavior. |
| `E2E-P2-002` | Pi sends one valid `coder.review` request, one invalid hard task ID, and one invalid advisory role hint; valid metadata normalizes, invalid hard metadata rejects, invalid advisory metadata degrades with diagnostics. |
| `E2E-P2-003` | Two configured models with different role/capability assignments; Pi sends a request requiring `code.read` and `filesystem.read`; router removes candidates missing hard constraints before controller selection. |
| `E2E-P2-004` | Pi sends similar advisory-only requests with different `role_hint_id`, `task_type`, and `preferred_capabilities`; eligible candidate set remains stable while ranking/reason codes change. |
| `E2E-P2-005` | Controller routing receives only normalized intent and eligible candidates; QA proves a hard-blocked candidate cannot be selected. |
| `E2E-P3-001` | Browser-driven receipt for `/app/models` showing new/loaded model all roles checked by default, grouped roles, `All roles` control, and high-risk indicators. |
| `E2E-P3-002` | Browser/API/Pi receipt removing `security` from one model, sending a security review request, and observing role-assignment exclusion in `/app/router/decisions/:requestId`. |
| `E2E-P3-003` | Browser-driven receipt showing task drill-in under configured model role/group context from `/app/models` or `/app/models/roles` without forcing full task catalog into add/load flow. |
| `E2E-P4-001` | Pi installs/updates rebuilt `pi-role-model`; receipt includes package version, taxonomy version, compact manifest load, compact groups, role summaries, and task chunk load. |
| `E2E-P4-002` | Pi verifies or guides runtime setup, endpoint URL, auth if needed, alias selection, health, taxonomy version, and routing endpoint availability. |
| `E2E-P4-003` | Pi classifies code review, research, product planning, support, and data/schema requests through progressive group-role-task loading; metadata contains role/task/action/variant/capability/modality/tool fields accepted by Role-Model. |
| `E2E-P4-004` | Pi sends the six minimum proposal requests through the configured alias; each has response plus decision record with normalized intent, candidate filters, candidate scores, selected endpoint/model, and controller output or deterministic fallback. |
| `E2E-P4-005` | Simulated taxonomy detail outage or version mismatch; Pi falls back to compact package snapshot or broad role hints, reports degraded mode, and runtime diagnostics show accepted/ignored fields. |

### Minimum Prompt Set

Phase 5 must classify and route all six prompts:

```text
Review this diff for security risks and likely regressions.
Implement this small bug fix and add a regression test.
Compare current public documentation for this API and cite differences.
Turn these support notes into a clear customer reply.
Inspect this schema and propose a migration plan.
Create product requirements and acceptance criteria for this workflow.
```

For each prompt, record:

- Pi command/prompt used.
- Package taxonomy source used: runtime effective taxonomy or package snapshot fallback.
- Group narrowing receipt.
- Role narrowing receipt.
- Task chunk load receipt.
- Final primary role/task and advisory alternatives.
- Capabilities, modalities, and tool classes sent.
- Runtime normalized intent.
- Candidate eligibility and scoring diagnostics.
- Decision ID and selected endpoint/model.
- Response status/body summary.

## Evidence To Produce

The next implementation/test/QA addenda must include:

- RED evidence paths for each production behavior changed.
- GREEN evidence paths for each TDD slice.
- Current compact taxonomy file size table.
- Manifest/API/schema before-after evidence showing `entryCounts`.
- Docs parity output.
- Hash parity output across runtime/Pi/docs/release artifacts.
- Browser screenshots or Playwright traces for UI E2E cases.
- Pi command logs and runtime request/decision IDs for all E2E cases.
- Explicit proposal Phase 5/6 deferred-scope note.

## Requirement Completion Status

| Requirement / Finding | Planned disposition | Verification required |
| --- | --- | --- |
| `F1` / `R2`, `R4`, `R8`, `R10`, `R12` | To be fixed | Manifest/schema/API/Pi/docs tests prove `entryCounts`. |
| `F2` / `R8`, `R9` | To be fixed | Pi compact shape, lazy-load, size, and hash tests pass; Pi QA proves staged loading. |
| `F3` / `R10`, `R13` | To be fixed | Docs parity checks compare canonical data, not only tokens. |
| `F4` / `R14`, `R15` | To be fixed | One-to-one E2E table receipts for `E2E-P1-001` through `E2E-P4-005`. |
| `F5` / `R7`, `R14`, `R15` | To be fixed | Browser-driven receipts for `/app/models`, `/app/models/roles`, router decisions, and observe surfaces. |
| `F6` / `R9`, `R14`, `R15` | To be fixed | Six-prompt classifier tests and Pi QA show proposal-required primary/alternative task/capability evidence. |
| `F7` / `R4`, `R8`, `R12` | To be fixed | Runtime taxonomy discovery tests prove ETag/cache validation. |
| `F8` / `R10`, `R12`, `R13` | To be fixed | Hash parity check proves runtime/Pi/docs/release artifacts derive from same content. |

## Subagent And Review Plan

Subagent Capability Probe: not executed for this plan addendum.  
Delegation Decision Basis: the user requested an immediate addendum implementation plan. This artifact is authored by the main agent and must be self-audited before use. If implementation proceeds and subagent tools are available, create a review bundle for the post-implementation audit or record a concrete self-audit fallback reason.

## Plan Self-Audit

Audit Execution Mode: self-audit  
Subagent Availability: not probed for this document-only plan  
Delegation Override Reason: document-only planning addendum; no implementation artifact was ready for delegated review.

Audit checklist:

- Audit addendum 11 findings `F1` through `F8` are all mapped to concrete implementation work.
- TDD is required before production code changes for each behavior-bearing fix.
- The proposal taxonomy is directly referenced and the ID-level catalog is restated in this addendum.
- Pi and rebuilt runtime end-to-end QA is required after implementation.
- Proposal Phase 1-4 E2E cases are listed one-to-one.
- Invalid advisory metadata remains non-fatal.
- Proposal Phase 5 benchmarks and Phase 6 telemetry remain later-phase scope.

Audit: PASS

## Coverage Gate

Coverage: PASS

This addendum covers every finding from `03-implementation-summary.current-state-requirements-proposal-audit.addendum-11.md` and maps each finding to TDD implementation, automated verification, and rebuilt-runtime/Pi Phase 5 QA evidence.

## Approval Gate

Approval: PASS

This plan is ready to be used as the effective implementation input for closing audit addendum 11, subject to user direction to implement.
