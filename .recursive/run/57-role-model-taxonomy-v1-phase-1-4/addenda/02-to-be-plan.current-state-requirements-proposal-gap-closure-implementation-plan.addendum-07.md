# To-Be Plan Addendum 07: Progressive Disclosure And Release-Parity Gap Closure Implementation Plan

Run: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/`  
Phase: `02 To-Be Plan Addendum 07`  
Artifact: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/02-to-be-plan.current-state-requirements-proposal-gap-closure-implementation-plan.addendum-07.md`  
Status: `DRAFT`  
Workflow version: `recursive-mode-audit-v1`  
Artifact kind: run-local implementation plan addendum  
CreatedAt: `2026-06-24`  
Base Artifact: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/02-to-be-plan.md`  
Audit Input: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.current-state-requirements-proposal-audit.addendum-13.md`  
TDD Mode: `strict`  
QA Execution Mode: `agent-operated`

## Purpose

This addendum defines the implementation plan to close every finding in audit addendum 13. It is a run-local Run 57 implementation plan addendum, not an addendum to the external proposal.

The plan remains scoped to proposal Phase 1 through Phase 4. Proposal Phase 5 benchmark implementation and proposal Phase 6 telemetry implementation remain out of scope except for preserved extension points, public documentation notes, and explicit QA notes that those later phases are deferred.

## Effective Inputs Re-Read Requirement

Before implementation starts, re-read and record the receipt in the implementation summary addendum:

1. `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md`
2. `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
3. `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-worktree.md`
4. `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/02-to-be-plan.md`
5. `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.current-state-requirements-proposal-audit.addendum-13.md`
6. this addendum

The next implementation summary must explicitly state how every finding in addendum 13 was handled.

## Non-Negotiable Safety And Scope Rules

- Preserve the user-approved permissive advisory metadata behavior: invalid advisory Pi metadata must not cause request failure. It must be ignored, degraded, or used only as diagnostics while the controller/runtime falls back to valid normalized intent.
- Preserve hard-field validation only for explicit trusted hard constraints. Low-confidence Pi classifier output must remain advisory unless backed by explicit user instruction or trusted policy/context.
- Do not make `pi-role-model` start, stop, install, update, or own the Role-Model runtime process.
- Do not call a Role-Model launcher path from `pi-role-model`.
- Do not read, print, copy, sync, or persist Pi provider secrets.
- Do not add hidden model calls for classification by default.
- Do not implement proposal Phase 5 benchmark scoring, benchmark dashboards, benchmark-informed routing, proposal Phase 6 production telemetry aggregation, telemetry dashboards, or telemetry-informed routing.

## Canonical Taxonomy Lock

The implementation must continue to match the proposal's canonical taxonomy exactly. The source of truth remains versioned runtime JSON under `role-model-router/packages/core/data/taxonomy/**`, generated from or checked against the proposal catalog. Tests must verify IDs, counts, labels, descriptions, classifier guidance, role/group relationships, task references, required/preferred capabilities, modalities, tool classes, UI metadata, authority metadata, stability, versions, and hashes.

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

## Finding-To-Work Mapping

| Audit finding | Required fix | Primary paths |
| --- | --- | --- |
| `F1` Pi compact taxonomy loader eagerly loads every role task chunk | Add staged Pi taxonomy loader APIs and move request-time classification off full-taxonomy loading. | `packages/pi-role-model/src/taxonomy/load-compact-taxonomy.ts`, new/updated staged loader module, `packages/pi-role-model/src/request-intent.ts`, Pi tests |
| `F2` Pi classifier is rule-first, not group-first progressive classification | Refactor classification into group-first, role-second, task-chunk-third stages with observable loaded resources. | `packages/pi-role-model/src/taxonomy/classify-with-progressive-disclosure.ts`, staged loader module, Pi tests |
| `F3` Generated public task docs omit classifier guidance columns | Generate or check task-level description/use-when/do-not-use-when guidance in public docs and docs site. | `docs/protocol/taxonomy-v1.md`, `apps/docs-site/content/docs/protocol/roles-and-tasks.mdx`, docs scripts/tests |
| `F4` Packaged runtime taxonomy parity is not directly validated | Extend packaged-runtime validation to fetch and verify taxonomy manifest/version/summary/sample role chunk from the packaged executable. | `role-model-router/apps/runtime-host-bridge/src/validate-packaging.ts`, package scripts/tests |
| `F5` Recursive state package version stale | Update recursive state or record explicit public-baseline/worktree-version distinction. | `.recursive/STATE.md`, Phase 7 state receipt |

## Implementation Plan

### Step 0 - Worktree And Effective Input Reconciliation

1. Confirm the active implementation path is `D:/DEV/role-model/.worktrees/57-role-model-taxonomy-v1-phase-1-4`.
2. Confirm branch is `recursive/57-role-model-taxonomy-v1-phase-1-4`.
3. Re-read the proposal, approved requirement, worktree baseline, base plan, audit addendum 13, and this addendum.
4. Record `git status --short --branch` before changes.
5. Record that the accidentally misplaced audit addendum 13 was moved into the worktree run folder if not already present.

### Step 1 - F1/F2 RED Tests For True Staged Pi Loading

Add failing tests before implementation:

1. `packages/pi-role-model/test/taxonomy-staged-loader.test.ts`
   - Assert loading the compact manifest reads only `compact-manifest.json`.
   - Assert loading groups reads only `compact-groups.json`.
   - Assert loading role summaries reads only `compact-role-summaries.json`.
   - Assert loading role-task index reads only `compact-role-task-index.json`.
   - Assert loading task chunks for `security` reads only `roles/security/tasks.compact.json` and does not read `roles/coder/tasks.compact.json` or any unrelated role chunk.
2. `packages/pi-role-model/test/taxonomy-classification.test.ts`
   - Add a test harness that injects a tracked staged loader.
   - For the security prompt, assert actual loaded resources are `manifest`, `groups`, `role-summaries`, `role-task-index`, and `tasks:security` only.
   - For the code implementation prompt, assert task chunk reads include `tasks:coder` only.
   - For an ambiguous low-confidence prompt, assert the classifier uses broad role hints and does not load every role task chunk.
3. `packages/pi-role-model/test/request-intent.test.ts`
   - Assert `injectRoleModelIntent()` does not call full `loadCompactTaxonomy()` in the default request path.
   - Assert runtime task chunk fetches are limited to first-pass candidate roles.
4. Add a negative guard test that fails if request-time classification reads more than three role task chunks for the six proposal prompt set.

Required RED evidence logs:

- `evidence/logs/red/addendum-07/pi-staged-loader.log`
- `evidence/logs/red/addendum-07/pi-progressive-classification.log`
- `evidence/logs/red/addendum-07/pi-request-intent-staged-loading.log`

### Step 2 - F1/F2 GREEN Implementation For Staged Pi APIs

Implement only after RED tests fail for the intended reason:

1. Introduce a staged compact taxonomy reader, for example `packages/pi-role-model/src/taxonomy/staged-compact-taxonomy.ts`.
2. The staged reader must expose APIs equivalent to:
   - `loadCompactManifest()`
   - `loadCompactGroups()`
   - `loadCompactRoleSummaries()`
   - `loadCompactRoleTaskIndex()`
   - `loadCompactRoleTaskChunk(roleId)`
   - `loadCompactRoleTaskChunks(roleIds)`
3. Preserve `loadCompactTaxonomy()` only as an explicit full-load/admin/test helper. Its name or docs must make clear that it loads all chunks.
4. Refactor `resolveEffectiveTaxonomy()` so the runtime-first path reads only manifest/groups/role summaries and candidate role chunks. It must not merge `...packageTaxonomy.roleTaskChunks` into runtime results in request-time paths.
5. Refactor `injectRoleModelIntent()` to run first-pass classification from staged summary/index data, fetch runtime task chunks only for candidate roles where available, and fall back to package chunk reads only for those same candidate roles.
6. Refactor `classifyWithProgressiveDisclosure()` into explicit stages:
   - group candidate scoring;
   - role candidate scoring constrained by candidate groups;
   - task candidate scoring after loading candidate role chunks;
   - advisory fallback when confidence is low or chunk/detail fetch fails.
7. Preserve the current six approved prompt outputs:
   - security review -> `security` / `security.audit`, alternative `coder.review`;
   - bug fix/regression -> `coder` / `coder.edit`, alternative `coder.test.write`;
   - current docs comparison -> `researcher` / `researcher.web_research.current`, alternative `researcher.compare_sources`;
   - support reply -> `support` / `support.ticket.reply`, alternative `writer.email.write`;
   - schema migration -> `architect` / `architect.migration.strategy`, alternative `data.schema.review`;
   - product requirements -> `product` / `product.requirements`, alternative `planner.requirements`.
8. Keep emitted metadata advisory by default unless explicit trusted hard constraints are present.

GREEN verification:

- `corepack pnpm --filter @try-works/pi-role-model test`
- `corepack pnpm --filter @try-works/pi-role-model build`

Required GREEN evidence logs:

- `evidence/logs/green/addendum-07/pi-staged-loader.log`
- `evidence/logs/green/addendum-07/pi-progressive-classification.log`
- `evidence/logs/green/addendum-07/pi-request-intent-staged-loading.log`
- `evidence/logs/green/addendum-07/pi-build.log`

### Step 3 - F3 RED Tests For Generated Classifier Guidance Docs

Add failing docs parity checks before implementation:

1. Update `scripts/check-public-taxonomy-v1-docs.mjs` so it fails if public docs omit canonical task `description`, `classifier.useWhen`, and `classifier.doNotUseWhen` for representative task IDs.
2. Update `apps/docs-site/scripts/check-taxonomy-v1-docs.mjs` with the same coverage for docs-site MDX content.
3. Add or update core docs tests to compare generated task docs against canonical task fields, not only IDs/counts.
4. Required representative rows:
   - `coder.edit`
   - `security.audit`
   - `researcher.web_research.current`
   - `support.ticket.reply`
   - `architect.migration.strategy`
   - `product.requirements`

Required RED evidence logs:

- `evidence/logs/red/addendum-07/docs-classifier-guidance.log`
- `evidence/logs/red/addendum-07/docs-site-classifier-guidance.log`

### Step 4 - F3 GREEN Docs Generation And Parity

Implement after RED tests fail:

1. Update generated public taxonomy docs so the task section includes at least:
   - task type ID;
   - label;
   - description;
   - use when;
   - do not use when;
   - primary role;
   - compatible roles;
   - required capabilities;
   - preferred capabilities;
   - required modalities;
   - tool classes.
2. Update docs-site generated taxonomy content with equivalent fields or a generated task classification guide adjacent to the catalog.
3. Keep docs readable. If the full 280-row table becomes too large for one section, split generated sections by role/group while preserving parity checks.
4. Ensure generated docs still include the proposal Phase 5 benchmark and Phase 6 telemetry deferral notes.

GREEN verification:

- `corepack pnpm run docs:taxonomy-v1-check`
- `corepack pnpm run docs:build`
- `corepack pnpm --filter @role-model-router/core test -- taxonomy-docs` or the repo-native focused docs test command

Required GREEN evidence logs:

- `evidence/logs/green/addendum-07/docs-classifier-guidance.log`
- `evidence/logs/green/addendum-07/docs-site-classifier-guidance.log`
- `evidence/logs/green/addendum-07/docs-build.log`

### Step 5 - F4 RED Tests For Packaged Runtime Taxonomy Parity

Add failing validation before implementation:

1. Extend `role-model-router/apps/runtime-host-bridge/src/validate-packaging.ts` tests or add a focused validator test so packaged runtime validation must fetch:
   - `/api/role-model/taxonomy/manifest`;
   - `/api/role-model/taxonomy/version`;
   - `/api/role-model/taxonomy/summary`;
   - `/api/role-model/taxonomy/roles/security/tasks.compact`.
2. Assert packaged runtime responses match canonical:
   - `schemaVersion`;
   - `taxonomyVersion`;
   - `databaseVersion`;
   - `classificationContractVersion`;
   - `contentRevision`;
   - `entryCounts.groups`;
   - `entryCounts.roles`;
   - `entryCounts.taskTypes`;
   - `entryCounts.capabilities`;
   - `entryCounts.modalities`;
   - `entryCounts.toolClasses`;
   - `contentHashes` or equivalent manifest hash parity fields where exposed.
3. Assert a sampled task chunk includes `security.audit`, `security.threat_model`, at least 10 security tasks, classifier guidance, required/preferred capabilities, modalities, and tool classes.

Required RED evidence logs:

- `evidence/logs/red/addendum-07/runtime-packaged-taxonomy-parity.log`

### Step 6 - F4 GREEN Packaged Runtime Validation

Implement after RED test failure:

1. Update packaged-runtime validator to fetch and compare taxonomy endpoints from the packaged executable.
2. If packaged endpoint responses omit content hashes today, add safe exposure through existing taxonomy manifest/summary responses rather than a new release-only API.
3. Keep packaged validation deterministic and offline-capable using the managed QA/mock backend strategy already used by the runtime validator.
4. Ensure validator failure messages identify the mismatched version/count/hash/route.

GREEN verification:

- `corepack pnpm run runtime:validate-packaging`
- Focused runtime host bridge tests covering validator behavior.

Required GREEN evidence logs:

- `evidence/logs/green/addendum-07/runtime-packaged-taxonomy-parity.log`
- `evidence/logs/green/addendum-07/runtime-validate-packaging.log`

### Step 7 - F5 Recursive State And Control-Plane Repair

1. Update `.recursive/STATE.md` so it no longer states stale package version information.
2. Use one of these precise forms:
   - public npm baseline: `@try-works/pi-role-model@0.1.0`;
   - current run 57 worktree package: `@try-works/pi-role-model@0.1.1`;
   - if both are true, explicitly distinguish them in the same sentence.
3. Update Phase 7 state receipt if the run requires it.
4. Do not edit unrelated historical state lines.

Verification:

- `rg -n "@try-works/pi-role-model@0\\.1\\.0|@try-works/pi-role-model@0\\.1\\.1" .recursive/STATE.md packages/pi-role-model/package.json`
- `node scripts/check-run57-qa-reconciliation.mjs`

Required GREEN evidence logs:

- `evidence/logs/green/addendum-07/state-package-version-reconciliation.log`
- `evidence/logs/green/addendum-07/run57-qa-reconciliation.log`

### Step 8 - Full Automated Verification Matrix

After focused green tests pass, run the affected validation matrix:

```powershell
corepack pnpm --filter @try-works/pi-role-model test
corepack pnpm --filter @try-works/pi-role-model build
corepack pnpm --filter @role-model-router/core test
corepack pnpm --filter @role-model-router/runtime-host-bridge test
corepack pnpm --filter @role-model-router/runtime-host-bridge build
corepack pnpm --filter @role-model-router/runtime-ui test
corepack pnpm --filter @role-model-router/runtime-ui build
corepack pnpm run schemas:validate
corepack pnpm run docs:taxonomy-v1-check
corepack pnpm run docs:build
corepack pnpm run runtime:validate-ui
corepack pnpm run runtime:validate-packaging
corepack pnpm run runtime:test-browser
node scripts/check-run57-qa-reconciliation.mjs
```

If a command is too broad for the local environment, record the exact failure and run the narrower affected command with rationale. Do not mark the addendum verified without all affected package tests, docs checks, runtime packaging validation, and reconciliation checks passing or having a concrete environmental blocker.

### Step 9 - Agent-Operated Pi And Rebuilt Runtime QA

Phase 5 QA must be repeated after implementation, using the proposal as the verification checklist.

QA setup:

1. Rebuild the runtime packages from the run 57 worktree.
2. Rebuild the runtime UI from the run 57 worktree.
3. Rebuild and/or pack `packages/pi-role-model` from the run 57 worktree.
4. Launch the rebuilt Role-Model router runtime locally on a known port using the managed healthy QA backend setup.
5. Command local Pi to install/update the rebuilt local `pi-role-model` package.
6. Command Pi to configure/verify the Role-Model runtime endpoint URL and alias.
7. Command Pi to list/inspect aliases and select the Role-Model alias.

Required Pi/runtime verification:

1. Pi reports installed package version and taxonomy version.
2. Pi reads package manifest/groups/role summaries without reading all role task chunks.
3. Pi inspects one role from each group and loads only that role's task chunk:
   - engineering -> `security` or `coder`;
   - product_design -> `product` or `designer`;
   - knowledge_research -> `researcher` or `knowledge`;
   - business -> `strategist` or `finance`;
   - communication -> `support` or `writer`;
   - governance_safety -> `health` or `legal`.
4. Pi compares package taxonomy version/summary/hash metadata to runtime taxonomy manifest/summary endpoints.
5. Pi sends the six proposal request prompts through the configured alias:
   - "Review this diff for security risks and likely regressions."
   - "Implement this small bug fix and add a regression test."
   - "Compare current public documentation for this API and cite differences."
   - "Turn these support notes into a clear customer reply."
   - "Inspect this schema and propose a migration plan."
   - "Create product requirements and acceptance criteria for this workflow."
6. For each prompt, inspect runtime request detail, router decision detail, and telemetry/observe records where available.
7. Verify normalized intent contains the expected role/task and advisory metadata.
8. Verify routing diagnostics include role/task policy effects where applicable.
9. Verify the runtime returns successful completions through healthy QA backends.
10. Verify no hidden model call was used for classification.
11. Verify invalid advisory metadata degrades to diagnostics/controller/runtime fallback rather than dropping the user request.
12. Verify explicit trusted invalid hard metadata still rejects or fails closed with a clear diagnostic.
13. Verify UI routes still load:
    - `/app/models`;
    - `/app/models/roles`;
    - `/app/router/candidates`;
    - `/app/router/decisions`;
    - `/app/observe/requests`;
    - `/app/observe/routing`.

Required QA evidence logs:

- `evidence/logs/addendum-07/live/pi-install-local-package.log`
- `evidence/logs/addendum-07/live/pi-command-checklist.log`
- `evidence/logs/addendum-07/live/pi-staged-taxonomy-loading.log`
- `evidence/logs/addendum-07/live/pi-taxonomy-runtime-parity.log`
- `evidence/logs/addendum-07/live/pi-six-prompts-through-runtime.log`
- `evidence/logs/addendum-07/live/runtime-requests-after-six-prompts.json`
- `evidence/logs/addendum-07/live/runtime-decisions-after-six-prompts.json`
- `evidence/logs/addendum-07/live/runtime-telemetry-after-six-prompts.json`
- `evidence/logs/addendum-07/live/runtime-ui-route-probes.json`
- `evidence/logs/addendum-07/live/pi-invalid-advisory-degrades.log`
- `evidence/logs/addendum-07/live/pi-invalid-hard-rejects.log`

### Step 10 - Required Implementation Summary

Create an implementation summary addendum after implementation:

`/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/03-implementation-summary.current-state-requirements-proposal-gap-closure-implementation.addendum-14.md`

It must include:

1. Effective inputs re-read receipt.
2. Worktree diff basis.
3. Finding closure table for `F1` through `F5`.
4. RED evidence paths and failure summaries.
5. GREEN evidence paths and pass summaries.
6. Pi/rebuilt-runtime QA evidence paths and result.
7. Explicit confirmation that proposal Phase 5 benchmark and Phase 6 telemetry implementation remain deferred.
8. Any remaining limitation, if present, with code evidence and a clear scope decision.

## Acceptance Criteria

This addendum is complete only when:

- `F1` is closed by real staged Pi taxonomy loading in request-time code, not only by chunked files.
- `F2` is closed by group-first progressive classification with tests proving candidate-role-only task chunk reads.
- `F3` is closed by generated public docs/docs-site classifier guidance and parity checks.
- `F4` is closed by packaged-runtime taxonomy manifest/version/summary/sample task-chunk parity validation.
- `F5` is closed by corrected recursive state package-version metadata.
- The canonical taxonomy still matches the exact counts, role/group membership, task IDs, capability IDs, modality IDs, and tool-class IDs listed above.
- Automated tests/builds/docs/runtime packaging validations pass.
- Live Pi QA against the rebuilt runtime and rebuilt package passes and records staged-loading, runtime parity, six-prompt routing, invalid advisory degradation, and invalid hard rejection evidence.

## Disposition

Status: DRAFT

This plan is ready for implementation once approved. It intentionally requires strict TDD and live Pi/rebuilt-runtime verification before any addendum 13 finding can be marked closed.
