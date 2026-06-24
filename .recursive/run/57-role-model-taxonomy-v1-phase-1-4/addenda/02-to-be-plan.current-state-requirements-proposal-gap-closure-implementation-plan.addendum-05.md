# To-Be Plan Addendum 05: Current-State Requirements And Proposal Gap Closure Implementation Plan

Run: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/`  
Phase: `02 To-Be Plan Addendum 05`  
Artifact: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/02-to-be-plan.current-state-requirements-proposal-gap-closure-implementation-plan.addendum-05.md`  
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
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/02-to-be-plan.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.current-state-requirements-proposal-audit.addendum-09.md`
- current worktree state on branch `recursive/57-role-model-taxonomy-v1-phase-1-4`

## Purpose

This addendum defines the implementation plan for closing the current Run 57 audit findings in addendum 09.

This is a run-local recursive implementation plan for Run 57 and is not an addendum to the external proposal. The work remains scoped to proposal Phase 1 through Phase 4. Proposal Phase 5 benchmark implementation and proposal Phase 6 taxonomy telemetry implementation remain out of scope except for already-required extension points, placeholders, diagnostics, and verification notes.

## Effective Inputs Re-Read Requirement

Before implementation starts, re-read:

1. `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md`
2. `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
3. `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/02-to-be-plan.md`
4. `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.current-state-requirements-proposal-audit.addendum-09.md`
5. this addendum

Record the re-read in the next implementation summary addendum before any production code changes.

## Non-Negotiable Taxonomy Contract

The implementation must preserve the proposal taxonomy exactly. Any change to IDs, counts, group relationships, naming semantics, row content, or version fields requires a new audit addendum and user approval before implementation continues.

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

Canonical task IDs:

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

Canonical version fields:

| Field | Required value for this run |
| --- | --- |
| `schemaVersion` | `role-model.taxonomy.schema.v1` |
| `taxonomyVersion` | `1.0.0-alpha.1` |
| `databaseVersion` | `1` |
| `contentRevision` | `taxonomy-v1-alpha.1` |
| `classificationContractVersion` | `role-model.classification.v1` |

## Finding-To-Slice Map

| Audit finding | Implementation slice |
| --- | --- |
| `F1` Pi classification mostly static | Slice 1: staged taxonomy-driven Pi classifier |
| `F2` live Pi path does not fetch runtime task chunks | Slice 2: request-time runtime task chunk supersession |
| `F3` role assignment inconsistent outside `/app/models` | Slice 3: all/include/exclude semantics across all model routes |
| `F4` public repo docs contain legacy taxonomy guidance | Slice 4: public repo docs taxonomy V1 update |
| `F5` Phase 5 QA evidence split across artifacts | Slice 5: canonical QA reconciliation addendum |
| `F6` live UI behavior evidence incomplete | Slice 6: rebuilt runtime plus Pi plus UI end-to-end QA |
| `F7` Pi compact parity not exhaustive | Slice 0: Pi compact golden parity |

## Implementation Slices

### Slice 0: Exhaustive Pi Compact Golden Parity

Requirements: `R2`, `R3`, `R8`, `R13`, `R15`

Changed paths expected:

- `packages/pi-role-model/test/taxonomy-data-files.test.ts`
- `packages/pi-role-model/src/taxonomy/load-compact-taxonomy.ts`
- `packages/pi-role-model/data/taxonomy/**`
- `role-model-router/packages/core/testdata/taxonomy/proposal-v1-golden.json` only if the fixture is discovered to be malformed

RED tests to add first:

- Pi compact taxonomy parity fails if a compact role summary label, primary group, secondary group list, or task ID differs from `proposal-v1-golden.json`.
- Pi compact task parity fails if a task label, primary role, compatible roles, required/preferred capabilities, required modalities, tool classes, variants, or classifier guidance differs from the runtime golden fixture fields that compact data is supposed to carry.
- Pi compact manifest parity fails if content revision, classification contract version, counts, chunk file paths, or chunk content hashes do not reflect the compact files.
- A targeted negative test or fixture mutation proves the parity test fails on a changed task label and a removed required capability.

RED evidence paths:

- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/current-state-gap-closure-4/red/slice0-pi-compact-golden-parity.log`

Implementation:

- Build a structured comparison from Pi compact files to the runtime golden fixture.
- Compare compact chunks at the row-field level, not only IDs and counts.
- Permit compact data to omit fields only if the omission is explicitly documented in the test as a prompt-size/progressive-disclosure decision and the omitted field is not required by the proposal for Pi classification.
- Ensure every compact role task chunk has a corresponding content hash and every hash matches the file bytes.

GREEN evidence:

- `corepack pnpm --filter @try-works/pi-role-model exec vitest run test/taxonomy-data-files.test.ts`
- `corepack pnpm --filter @try-works/pi-role-model build`

### Slice 1: Staged Taxonomy-Driven Pi Classifier

Requirements: `R8`, `R9`, `R13`, `R14`, `R15`

Changed paths expected:

- `packages/pi-role-model/src/taxonomy/classify-with-progressive-disclosure.ts`
- `packages/pi-role-model/src/taxonomy/compact-data.ts`
- `packages/pi-role-model/src/taxonomy/load-compact-taxonomy.ts`
- `packages/pi-role-model/test/taxonomy-classification.test.ts`
- `packages/pi-role-model/test/request-intent.test.ts`
- `packages/pi-role-model/skills/role-model/SKILL.md`

RED tests to add first:

- Unknown or low-signal prompt does not default to `security` / `security.audit`; it emits low-confidence broad advisory metadata, alternatives, and fallback evidence.
- The classifier chooses candidate groups before candidate roles for prompts in all six canonical groups:
  - `engineering`
  - `product_design`
  - `knowledge_research`
  - `business`
  - `communication`
  - `governance_safety`
- The classifier chooses candidate roles from role summaries only after group narrowing.
- The classifier chooses final tasks only from loaded task chunks for selected or ambiguous candidate roles.
- `loadedChunks` records only chunks actually consulted by the classifier.
- Active tools, attachments, explicit user hints, and prompt mode influence group and role selection.
- The six proposal prompts still classify to the expected role/task families.
- No hidden model call is made by default.
- Hard fields are emitted only for explicit user instructions or trusted policy context; inferred fields remain advisory.

RED evidence paths:

- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/current-state-gap-closure-4/red/slice1-pi-staged-classifier.log`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/current-state-gap-closure-4/red/slice1-pi-low-confidence-fallback.log`

Implementation:

- Replace the fixed fallback rule behavior with staged deterministic functions:
  - `selectCandidateGroups(input, compactGroups, classificationGuide)`
  - `selectCandidateRoles(input, candidateGroups, roleSummaries)`
  - `selectCandidateTasks(input, candidateRoles, loadedTaskChunks)`
  - `buildRoleModelIntent(input, selectedRole, selectedTask, evidence)`
- Use taxonomy row fields, classifier guidance, capabilities, modalities, tool classes, task variants, explicit user hints, tool availability, and attachment shape as classification signals.
- Keep deterministic local classification as the default.
- Preserve `role_model.intent` wire compatibility.
- Unknown or ambiguous prompts must prefer low-confidence broad advisory intent with alternatives over precise high-confidence guesses.

GREEN evidence:

- `corepack pnpm --filter @try-works/pi-role-model exec vitest run test/taxonomy-classification.test.ts test/request-intent.test.ts`
- `corepack pnpm --filter @try-works/pi-role-model build`

### Slice 2: Request-Time Runtime Task Chunk Supersession

Requirements: `R8`, `R9`, `R14`, `R15`

Changed paths expected:

- `packages/pi-role-model/src/extension.ts`
- `packages/pi-role-model/src/request-intent.ts`
- `packages/pi-role-model/src/taxonomy/resolve-effective-taxonomy.ts`
- `packages/pi-role-model/src/taxonomy/classify-with-progressive-disclosure.ts`
- `packages/pi-role-model/test/effective-taxonomy.test.ts`
- `packages/pi-role-model/test/extension.test.ts`
- `packages/pi-role-model/test/request-intent.test.ts`

RED tests to add first:

- The live extension request hook performs a first-pass group/role classification, fetches runtime task chunks for candidate roles, and then performs final classification before injecting `role_model.intent`.
- Runtime task chunk labels/guidance/capabilities supersede package task chunk data for candidate roles.
- Only candidate role task chunks are fetched; the extension must not fetch all 28 role chunks for one request.
- If runtime task chunk fetch fails, Pi falls back to package compact chunks and records degraded source/evidence.
- If runtime taxonomy version is incompatible, Pi uses package fallback and records a version mismatch diagnostic.
- Request injection remains synchronous or safely async according to the Pi hook contract; if Pi only supports synchronous hooks, runtime chunk fetch must happen through a prewarmed cache refreshed by command/provider lifecycle and the limitation must be documented in code/tests.

RED evidence paths:

- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/current-state-gap-closure-4/red/slice2-pi-runtime-task-chunk-supersession.log`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/current-state-gap-closure-4/red/slice2-pi-extension-request-hook.log`

Implementation:

- Add a request-time or prewarmed effective-taxonomy resolver that supports candidate role IDs.
- Ensure `injectRoleModelIntentIntoPayload()` can use runtime task chunks for candidate roles before final intent construction.
- Cache runtime manifest, groups, role summaries, and recently used role task chunks with explicit content revision and endpoint keying.
- Never block or fail user requests solely because runtime taxonomy detail is unavailable; degrade to package compact classification and include advisory diagnostics/evidence.
- Do not add hidden model calls.
- Do not start, stop, install, update, or own the Role-Model runtime from `pi-role-model`.

GREEN evidence:

- `corepack pnpm --filter @try-works/pi-role-model exec vitest run test/effective-taxonomy.test.ts test/extension.test.ts test/request-intent.test.ts`
- `corepack pnpm --filter @try-works/pi-role-model build`

### Slice 3: All/Include/Exclude Role Assignment Across All Model Setup Routes

Requirements: `R7`, `R12`, `R14`, `R15`

Changed paths expected:

- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
- `role-model-router/apps/runtime-ui/app/routes/local-peer-models.tsx`
- `role-model-router/apps/runtime-ui/app/routes/local-llama-swap-models.tsx`
- `role-model-router/apps/runtime-ui/app/routes/providers.tsx`
- `role-model-router/apps/runtime-ui/app/components/local-model-role-picker.tsx`
- `role-model-router/apps/runtime-ui/app/routes/control-models.test.ts`
- focused route/component tests for peer, llama-swap, and providers
- runtime host/provider-account paths only if API payload support is missing

RED tests to add first:

- Peer model registration with no user changes persists `roleAssignmentMode: "all"` and readback shows all canonical roles selected.
- Llama-swap model load with no user changes persists or resolves as `roleAssignmentMode: "all"` and readback shows all canonical roles selected.
- Provider account save with a selected model and no role changes persists an explicit all-role assignment rather than dropping the binding.
- Removing `security` from an all-role model persists exclude-mode with `disabledRoleIds: ["security"]`.
- Selecting no roles intentionally persists include-mode with empty `enabledRoleIds` and displays "No roles" only for that explicit include-empty state.
- UI text no longer tells users that leaving the picker empty means no role coverage.
- Existing legacy non-empty `roleIds` bindings remain compatible and display as include-mode.
- High-risk role labels are visible for `security`, `legal`, `finance`, `recruiter`, and `health`.

RED evidence paths:

- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/current-state-gap-closure-4/red/slice3-runtime-ui-role-assignment.log`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/current-state-gap-closure-4/red/slice3-provider-peer-llama-assignment.log`

Implementation:

- Use one shared conversion helper for all runtime UI role assignment mutation routes.
- Treat absent assignment as all current and future canonical roles.
- Treat empty selected roles as all only when the picker is in default-all state; represent intentional no-role assignment explicitly as include-mode empty.
- Ensure mutation APIs preserve `roleAssignmentMode`, `enabledRoleIds`, and `disabledRoleIds`.
- Update peer, llama-swap, and provider pages to display default-all state accurately.
- Keep the existing `/app/models` task drill-in and grouped role behavior intact.

GREEN evidence:

- `corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/components/local-model-role-picker.test.tsx app/routes/control-models.test.ts app/lib/runtime-api.test.ts`
- add and run focused tests for peer, llama-swap, and providers if they do not exist
- `corepack pnpm --filter @role-model-router/runtime-ui exec tsc --noEmit`

### Slice 4: Public Repo Docs Taxonomy V1 Update

Requirements: `R10`, `R13`, `R14`

Changed paths expected:

- `docs/public/concepts/protocol-overview.md`
- `docs/public/concepts/routing-overview.md`
- `docs/public/concepts/how-role-model-works.md`
- `docs/public/quickstart.md`
- `docs/protocol/roles.md`
- `docs/protocol/tasks.md`
- `docs/protocol/capability-taxonomy.md`
- `docs/protocol/role-task-capability-mapping.md`
- any other non-historical repo docs still containing legacy taxonomy IDs
- docs/static scan scripts or tests

RED tests to add first:

- A repo-docs scan fails on active public guidance containing `general.chat`, `coder.patch`, `tool.agent`, or `code.edit`.
- The scan allows legacy IDs only in explicitly marked migration/history sections.
- The scan requires public docs to include canonical examples:
  - `coder.edit`
  - `security.audit`
  - `researcher.web_research.current`
  - `product.requirements`
  - `role_model.intent`
  - default-all model role assignment

RED evidence path:

- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/current-state-gap-closure-4/red/slice4-public-docs-taxonomy-v1.log`

Implementation:

- Update public docs to use taxonomy V1 concepts and canonical IDs.
- Replace `code.edit` capability examples with `code.read` and/or `code.write` as appropriate.
- Replace legacy role examples with canonical roles and tasks.
- Keep docs public-facing; avoid internal run/proposal language.
- Preserve any historical architecture discussion only when clearly marked as legacy or pre-taxonomy.

GREEN evidence:

- repo docs scan command added or updated and passing
- `corepack pnpm --filter @role-model-docs-site run check:taxonomy-v1` or actual equivalent if docs-site package name differs

### Slice 5: Canonical QA Reconciliation Addendum

Requirements: `R13`, `R14`, `R15`

Changed paths expected:

- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/05-manual-qa.current-state-reconciliation.addendum-02.md`
- optional small references from the next implementation summary addendum

RED checks to add first:

- A recursive artifact check fails if the effective Phase 5 QA record cannot identify the latest authoritative QA result.
- A check fails if canonical `addenda/` contains DRAFT QA/implementation addenda claiming final PASS without a reconciliation note.

RED evidence path:

- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/current-state-gap-closure-4/red/slice5-recursive-qa-reconciliation.log`

Implementation:

- Create a canonical Phase 5 addendum under `addenda/` that:
  - explicitly lists all Phase 5 QA artifacts in chronological order;
  - states that `05-manual-qa-addendum-01-healthy-backends.md` supersedes the backend limitation in `05-manual-qa.md`;
  - states whether the DRAFT current-state QA addendum is superseded, supplemental, or still pending lock;
  - points to the exact healthy-backend Pi/runtime evidence;
  - includes a proposal E2E coverage table for `E2E-P1-001` through `E2E-P4-005`;
  - keeps benchmark Phase 5 and telemetry Phase 6 implementation deferred.
- Do not edit locked base artifacts unless recursive tooling explicitly permits it.

GREEN evidence:

- recursive artifact check or explicit PowerShell/Node check proving the authoritative QA record is unambiguous
- new addendum includes `Audit: PASS`, `Coverage: PASS`, and `Approval: PASS` only after the reconciliation is complete

### Slice 6: Rebuilt Runtime, Pi, And Live UI End-To-End QA

Requirements: `R7`, `R8`, `R9`, `R14`, `R15`

Changed paths expected:

- QA evidence under `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/current-state-gap-closure-4/qa/`
- the canonical Phase 5 reconciliation addendum from Slice 5
- implementation fixes discovered during QA, each with RED/GREEN tests before repair

RED checks to define before QA:

- QA checklist starts failing until every required receipt exists.
- Live UI evidence is missing until DOM/API proof exists for all required model role assignment behaviors.
- Live Pi evidence is missing until Pi installs/updates the worktree package, configures endpoint/alias, sends the six prompts, and runtime ledgers confirm role/task routing.

Required rebuilt artifacts:

1. Rebuild runtime host packages from this worktree.
2. Rebuild runtime UI from this worktree.
3. Rebuild and pack `packages/pi-role-model` from this worktree.
4. Launch rebuilt Role-Model runtime locally on a known port with healthy managed QA backends.
5. Verify `/healthz` reports healthy runtime and vendor backends.
6. Verify runtime taxonomy routes expose the canonical counts and version fields.

Required Pi setup:

1. Command local Pi to install or update the rebuilt `pi-role-model` package from this worktree or packed tarball.
2. Command Pi to run `/role-model status`, `/role-model setup`, `/role-model doctor`, alias list/recommended/use/current/refresh, and endpoint configuration against the rebuilt runtime.
3. Command Pi to read runtime taxonomy summary and compare it with the packaged compact manifest.
4. Command Pi to list groups, roles by group, secondary memberships, and sample role task counts.
5. Command Pi to select a user-facing alias such as `role-model/default.decision-only`.

Required prompt set:

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
| Current public documentation comparison | `researcher` | `researcher.web_research.current` or `researcher.compare_sources` |
| Support notes to customer reply | `support` or `writer` | `support.ticket.reply` or `writer.email.write` |
| Schema migration plan | `architect` or `data` | `architect.migration.strategy` or `data.schema.review` |
| Product requirements and acceptance criteria | `product` or `planner` | `product.requirements` or `product.acceptance` |

Required runtime verification after each prompt:

- request succeeds without metadata-caused rejection;
- selected endpoint/model is a live healthy QA backend;
- response body is returned to Pi;
- request detail records normalized role/task intent;
- normalized intent includes taxonomy version, content revision, and classification contract version;
- decision record includes candidate filters, candidate scores, selected endpoint/model, and role/task policy reason codes;
- controller receives eligible candidates only;
- unknown advisory metadata test records ignored diagnostics and still routes successfully;
- classification metadata is not forwarded upstream as provider-visible prompt text or provider-specific parameters.

Required live UI verification:

- `/app/models` loads from rebuilt runtime.
- newly visible/loaded models show all canonical roles checked by default.
- role picker is grouped by canonical groups.
- high-risk labels are visible for `security`, `legal`, `finance`, `recruiter`, and `health`.
- removing `security` persists as exclude-mode and affects eligibility for a hard/trusted security request.
- re-enabling all roles persists as all-mode.
- intentional no-role state is representable and visibly distinct from default-all.
- task drill-in from model details shows tasks for at least `coder`, `security`, `product`, and `support`.
- `/app/models/roles` is group-first and shows secondary group membership.
- `/app/router/candidates`, `/app/router/decisions/:requestId`, `/app/observe/requests`, and `/app/observe/routing` are reachable and display taxonomy-relevant facts where implemented.

Browser limitation rule:

- HTTP 200 route probes alone are not sufficient for this slice.
- If in-app browser automation is blocked, use another available browser/control surface or direct API state evidence plus focused UI DOM tests.
- The QA addendum must state the limitation and why the substitute evidence proves the same behavior.

GREEN evidence:

- runtime build/package logs;
- runtime UI build/test/typecheck logs;
- Pi install/update logs;
- Pi command checklist logs;
- six prompt logs;
- runtime request, decision, candidate, and telemetry JSON receipts;
- UI screenshots, DOM snapshots, or API state evidence for role assignment behavior;
- canonical QA reconciliation addendum with proposal E2E coverage table.

### Slice 7: Final Regression Matrix And Scope Boundary Verification

Requirements: `R10`, `R11`, `R12`, `R13`, `R14`, `R15`

Final command matrix:

```powershell
corepack pnpm run schemas:validate
corepack pnpm --filter @role-model-router/core test
corepack pnpm --filter @role-model-router/runtime-host-bridge test
corepack pnpm --filter @role-model-router/runtime-host-bridge build
corepack pnpm --filter @role-model-router/runtime-ui test
corepack pnpm --filter @role-model-router/runtime-ui exec tsc --noEmit
corepack pnpm --filter @try-works/pi-role-model test
corepack pnpm --filter @try-works/pi-role-model build
corepack pnpm --filter @try-works/pi-role-model pack
corepack pnpm run runtime:validate-ui
corepack pnpm run runtime:validate-packaging
```

If command names differ, record the actual equivalent command and why it is equivalent.

Scope boundary checks:

- no benchmark runner, benchmark scoring engine, benchmark dashboard, or benchmark-informed routing behavior added;
- no taxonomy telemetry aggregation dashboard, rollup system, or telemetry-informed routing behavior added;
- no new top-level taxonomy app route added;
- `pi-role-model` does not start, stop, install, update, or own the Role-Model runtime process;
- `pi-role-model` does not call the Role-Model launcher path;
- `pi-role-model` does not read, print, copy, sync, or persist Pi provider secrets;
- remote endpoint trust and auth fail-closed behavior remain intact;
- no hidden classification model calls by default.

## TDD Compliance Requirements

Strict TDD is mandatory for production code behavior:

- write the failing test first;
- run the focused command and capture RED evidence;
- implement the minimum production change;
- run the focused command and capture GREEN evidence;
- refactor only after GREEN and rerun focused tests;
- do not batch multiple findings behind one vague test;
- do not mark a finding closed without at least one RED log and one GREEN log;
- if Phase 5 QA finds a defect, return to the relevant implementation slice with a new RED test before repairing it.

Evidence root:

```text
/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/current-state-gap-closure-4/
```

Required subdirectories:

```text
red/
green/
qa/
```

## Requirement Completion Status Plan

| Requirement | Planned disposition |
| --- | --- |
| `R2` | Close via Slice 0 compact row parity and final core/Pi taxonomy tests |
| `R3` | Close via runtime/Pi golden parity and manifest/content hash verification |
| `R7` | Close via Slice 3 assignment semantics and Slice 6 live UI QA |
| `R8` | Close via Slice 0 compact parity and Slice 2 runtime chunk supersession |
| `R9` | Close via Slice 1 classifier and Slice 2 request-time runtime taxonomy use |
| `R10` | Close via Slice 4 public docs update and docs scans |
| `R11` | Reverify in Slice 7 scope boundary checks |
| `R12` | Reverify version fields, assignment persistence semantics, and runtime decision receipts |
| `R13` | Close via RED/GREEN evidence for every slice and final regression matrix |
| `R14` | Close via Slice 6 rebuilt-runtime and local Pi end-to-end QA |
| `R15` | Close via Slice 5/6 proposal E2E coverage table and live receipts |

## Worktree Diff Audit Plan

Expected product paths:

- `packages/pi-role-model/**`
- `role-model-router/apps/runtime-ui/**`
- `role-model-router/apps/runtime-host-bridge/**` only if API support is needed for assignment semantics or QA
- `role-model-router/packages/provider-account/**` only if API support is needed for assignment semantics
- `docs/**`
- `apps/docs-site/**` only if shared docs scans or links require it
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/**`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/evidence/logs/current-state-gap-closure-4/**`

Unexpected changes must be explained in the implementation summary addendum before audit.

## Audit Gate

Audit: PASS

This plan directly maps every finding in addendum 09 to a strict TDD implementation slice and an agent-operated rebuilt-runtime/Pi verification path.

## Coverage Gate

Coverage: PASS

This plan covers all current known Run 57 proposal Phase 1-4 gaps without expanding into proposal Phase 5 benchmark implementation or proposal Phase 6 telemetry implementation.

## Approval Gate

Approval: PASS

This addendum is ready to use as the implementation plan for the next Run 57 gap-closure pass.
