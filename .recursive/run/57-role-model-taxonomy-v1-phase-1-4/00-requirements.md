Run: `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-06-23T09:38:27Z`
LockHash: `870179b2dbe05983e5c27c33ddb15ca4b88ad7a6327a48666cc093fae757b417`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/RECURSIVE.md`
- `/.codex/AGENTS.md`
- `/.agent/PLANS.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/00-requirements.md`
- `/.recursive/run/54-alias-capability-discovery-contract/00-requirements.md`
- `/.recursive/run/55-pi-role-model-package/00-requirements.md`
- `/.recursive/run/56-pi-role-model-gap-closure/00-requirements.md`
- External proposal: `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md`
Outputs:
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
Scope note: This run implements Phase 1 through Phase 4 of the external Role-Model Taxonomy V1 proposal. It must create the canonical taxonomy, expose runtime discovery and validation, integrate existing runtime UI role/task configuration, and update `pi-role-model` so Pi can classify requests progressively and send role/task/capability/modality/tool metadata to Role-Model. Proposal Phase 5 benchmark implementation and Phase 6 telemetry implementation are out of scope except for explicit extension points, placeholders, and QA notes.

## TODO

- [x] Re-read recursive-mode workflow and bridge docs
- [x] Re-read current state, decisions, and relevant runtime-routing/Pi memory
- [x] Re-read prior testing, downstream discovery, Pi package, and Pi gap-closure run requirements
- [x] Re-read `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md`
- [x] Convert proposal phases 1-4 into repo-owned requirement IDs
- [x] Make strict TDD mandatory for implementation
- [x] Make Phase 5 manual QA agent-operated and Pi-driven on this local device
- [x] Require rebuilt runtime, rebuilt runtime UI, rebuilt `pi-role-model`, real Pi installation/update, endpoint/alias configuration, routed prompts, and runtime UI diagnostics in QA
- [x] Repair audit findings for exact taxonomy/schema matching, versioning, classification contract, UI persistence, RBAC/extensibility, and Pi-driven rebuilt-runtime QA
- [x] Audit combined run 57/run 58 coverage against the full proposal and repair Phase 1-4 traceability gaps
- [x] Make every requirement ID explicitly reference the proposal as background and require proposal-based Phase 5 verification
- [x] Obtain user approval before locking this requirements artifact

## Source Requirement Inventory

| Source | Contribution to this run |
| --- | --- |
| `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md` | Authoritative taxonomy design, canonical catalog, phased scope, runtime/controller semantics, UI requirements, Pi integration, and E2E verification cases |
| `/.recursive/STATE.md` | Current runtime, UI, router, telemetry, release, and public `@try-works/pi-role-model@0.1.0` package baseline |
| `/.recursive/DECISIONS.md` | Prior run index and known boundaries from runs 54-56 |
| `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md` | Durable routing, downstream discovery, Pi provider, runtime UI, and telemetry surface truth |
| run `51-runtime-testing-architecture-and-regression-matrix` | Testing architecture, named validation commands, browser E2E expectations, and rebuilt-runtime QA discipline |
| run `54-alias-capability-discovery-contract` | Downstream discovery, alias capability metadata, capability-constrained routing, and Pi consumer visibility baseline |
| run `55-pi-role-model-package` | First `pi-role-model` package implementation and Pi install/setup/manual QA baseline |
| run `56-pi-role-model-gap-closure` | Current public Pi package behavior, safety boundaries, discovery/trust/auth/alias semantics, and local-device Pi QA caveats |

## Normative Proposal Sections

The implementation must exactly match the proposal sections listed below. "Exactly match" means canonical IDs, labels, descriptions, role/group relationships, task guidance, required/preferred capabilities, compatible roles, modality/tool references, schema fields, version fields, and manifest semantics must be reproduced in code/data/tests without semantic drift. If the implementation discovers a repo constraint that requires changing any of these sections, it must stop, create an addendum, and obtain approval before changing scope.

| Proposal Section | Lines | Requirement |
| --- | ---: | --- |
| `Purpose`, `Goals`, and `Delivery Phases` | `3-34` | Exact phase split, scope boundary, and no-premature-benchmark/telemetry implementation source. |
| `Core Concepts`, `Role And Task Relationship`, and `Canonical Naming Rules` | `35-382` | Exact definitions for role, group, task type, role family, task action, variant, capability, modality, tool class, intent preset, task compatibility, and naming semantics. |
| `Canonical Runtime Taxonomy Catalog` | `383-860` | Exact V1 catalog source: groups, role group membership, roles, task types, capabilities, modalities, and tool classes. |
| `Data Model` | `861-1045` | Exact schema/data-shape source for taxonomy identity, group entries, role entries, task entries, intent preset entries, and UI metadata. |
| `UI And UX Requirements` | `1046-1270` | Exact UI and persistence behavior source for existing routes, role assignment, task drill-down, model config shape, UX safeguards, and high-risk policy states. |
| `Progressive Disclosure Requirements` | `1271-1325` | Exact compact discovery, staged retrieval, response metadata, and consumer lookup behavior source. |
| `Classification Contract For Consumers` | `1632-1747` | Exact Pi/consumer classification input, output, source, hard/advisory, and classification algorithm source. |
| `Extensibility, Authority, And RBAC` | `1748-1921` | Exact authority, namespace, owner, RBAC resource/action/subject, custom group, effective taxonomy, and RBAC-aware classification source. |
| `Runtime Discovery` | `1922-1963` | Exact runtime discovery route family and response version fields source. |
| `Request Metadata Shape` and `Router And Controller Decision Use` | `1964-2117` | Exact request metadata, normalized `RoutingIntent`, hard/advisory routing semantics, controller constraints, and decision-record source. |
| `Validation Rules` and `Versioning` | `2118-2252` | Exact validation, versioning, compatibility, deprecation, cache invalidation, and persisted-classification metadata source. |
| `Repository Shape` and `Generated Documentation` | `2253-2404` | Exact schema/data/source/docs paths and generated documentation source. |
| `Runtime Responsibilities` and `Consumer Responsibilities` | `2405-2435` | Exact Role-Model authority, routing, diagnostics, policy boundary, and Pi/consumer responsibility source. |
| `End-To-End Verification Requirements` | `2436-2495` | Exact Phase 1-4 E2E source for Phase 5 manual QA. |
| `Implementation Plan` Phase 1 through Phase 4 | `2524-2647` | Exact deliverable and acceptance-criteria source for the run 57 phase split. |

## Exact Canonical Catalog Requirements

The implementation must build the exact taxonomy from the proposal, not a reduced, renamed, or inferred subset.

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

The exact canonical row content for groups, roles, task types, capabilities, modalities, and tool classes is the proposal content in `Canonical Runtime Taxonomy Catalog`. The implementation must include tests that compare generated runtime taxonomy data against the proposal-derived golden fixture for IDs, labels, descriptions, guidance, references, and counts.

## Exact Schema And Data Model Requirements

The implementation schemas must encode the proposal `Data Model` section exactly. At minimum:

- taxonomy identity is kind-scoped as `{kind}:{id}`;
- all entries have `id`, `kind`, `label`, `description` where applicable, `authority`, `ui` where applicable, and `stability`;
- group entries support `primaryRoleIds`, `secondaryRoleIds`, `ui.sortOrder`, `ui.recommendedIcon`, and `ui.recommendedAccent`;
- role entries support `primaryGroupId`, `secondaryGroupIds`, task references, capability references, UI metadata, authority, and stability;
- task entries support `primaryRole`, `compatibleRoles`, `requiredCapabilities`, `preferredCapabilities`, `requiredModalities`, `toolClasses`, classifier guidance, variants, ambiguity guidance, examples/non-examples where present in the proposal row content, authority, and stability;
- intent preset entries support `expandsTo` with canonical role/task/capability/modality/tool metadata;
- UI metadata excludes group membership, which must live on role entries as top-level `primaryGroupId` and `secondaryGroupIds`;
- model role assignment entries support `roleAssignmentMode`, `enabledRoleIds`, `disabledRoleIds`, `taskOverrides`, `capabilityOverrides`, `modalityOverrides`, and `toolClassOverrides`;
- classification schema supports all fields named in `R5`;
- manifest schema supports the exact fields named in `R2`;
- benchmark and telemetry schemas remain reserved for later phases unless needed only as placeholder schema references.

The implementation must include schema tests proving that valid proposal-shaped examples pass and malformed entries for each schema fail.

## Problem Summary

Role-Model currently has role and routing concepts, but it does not yet have the full versioned taxonomy proposed in `16-role-model-taxonomy-v1-proposal.md`. Pi can install and use `@try-works/pi-role-model`, discover Role-Model aliases, and route prompts through the runtime, but Pi does not yet have a compact canonical taxonomy snapshot or request classifier that can send structured role/task/capability/modality/tool intent metadata for routing.

The runtime also needs canonical taxonomy data and discovery APIs so clients do not hardcode stale vocabularies. The router must validate and normalize classified request metadata, use hard taxonomy fields as eligibility filters, use advisory fields for scoring, and pass only eligible candidate facts to the controller. The existing runtime UI must expose group/role/task assignment and drill-down through existing routes instead of adding a separate top-level taxonomy product surface.

This run implements the initial taxonomy rollout only: proposal Phase 1 through Phase 4. Benchmark suites and production telemetry dimensions remain later phases, but the implementation must reserve compatible schemas, dimensions, UI placeholders, and diagnostics so later benchmark and telemetry runs can build on the taxonomy without reworking core data shape or routing semantics.

## Fixed Decisions

1. `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md` is the authoritative source for this run.
2. This run implements proposal Phase 1, Phase 2, Phase 3, and Phase 4 only.
3. Proposal Phase 5 benchmark implementation and Phase 6 telemetry implementation are out of scope for this run except for extension points, placeholder links, reserved schema fields, generated docs references, and explicit non-goal notes.
4. The canonical runtime taxonomy source of truth must be versioned JSON data plus generated manifest, not hand-maintained Markdown tables.
5. The V1 runtime catalog must include 6 groups, 28 roles, 280 task types, 46 capabilities, 9 modalities, and 15 tool classes unless the proposal is explicitly amended before implementation.
6. Every role must have exactly one `primaryGroupId` and may have zero or more `secondaryGroupIds`.
7. Every canonical role must have at least 10 task types whose first ID segment matches the role ID.
8. Task type IDs must use `{role-family}.{task-action}[.{variant}]`.
9. Groups are first-level discovery/UI/progressive-disclosure objects, not routing roles.
10. Runtime discovery must support progressive disclosure so Pi and other agents do not need to load the full taxonomy into prompt context.
11. Role-Model remains the routing and policy authority. Client classifications are inputs, not final decisions.
12. Classification metadata must be removed or sanitized before forwarding upstream to providers.
13. Hard taxonomy constraints must filter candidates before scoring or controller selection.
14. Advisory taxonomy signals may affect scoring only after hard eligibility filtering.
15. Controller routing must not bypass RBAC, policy, endpoint health, role assignment, required capability, required modality, required tool, or context-window constraints.
16. UI work must extend existing runtime UI routes and components, especially `/app/models`, `/app/models/roles`, `/app/models/benchmark`, `/app/router/*`, and `/app/observe/*`.
17. Newly added or loaded models must default to all canonical roles checked, with visible grouped checkboxes and an `All roles` control.
18. Task detail must be progressively disclosed from existing model or role catalog surfaces, not forced into the initial add/load model flow.
19. `packages/pi-role-model` must include a compact generated taxonomy snapshot for offline first-pass classification and progressive lookup.
20. Runtime effective taxonomy takes precedence over the package snapshot when reachable.
21. `pi-role-model` must continue to respect run 56 safety boundaries: external runtime only, no runtime process ownership, no launcher calls, no credential copying/syncing, no Pi auth-file reads, and no hidden benchmark command.
22. Phase 3 implementation must use strict TDD for production code behavior.
23. Phase 5 manual QA execution mode must be `agent-operated`.
24. Phase 5 manual QA must drive the local Pi instance against a rebuilt local runtime and rebuilt `pi-role-model` package.
25. If actual Pi APIs or runtime APIs make a proposed behavior impossible, the implementation must document the limitation with code evidence and provide the closest safe verifiable behavior.
26. V1 canonical `intentPresets` count is `0` unless an approved addendum changes the proposal; preset expansion tests may use non-canonical fixtures.
27. Schema version, taxonomy version, database/storage version, content revision, and classification contract version are separate version axes and must not be collapsed into one package version.
28. Persisted classifications and routing decisions must retain the schema/taxonomy/content versions used at request time.
29. Any implementation artifact that cannot exactly reproduce the proposal taxonomy must fail validation before runtime release/package build.

## Assumptions

- The implementation starts from local `main` at `cf78d869` in the isolated worktree `/.worktrees/57-role-model-taxonomy-v1-phase-1-4`.
- The approved proposal remains available at `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md` for Phase 1-5 traceability and verification.
- Existing run 54, run 55, and run 56 behavior remains the compatibility baseline for downstream discovery, alias handling, and `pi-role-model` safety boundaries.
- Run 58 remains a draft and does not affect run 57 implementation scope.

## Constraints

- Implementation must follow recursive-mode phase order and use the isolated worktree for code and run artifacts.
- Phase 3 production behavior must use strict TDD with recorded RED and GREEN evidence.
- Canonical taxonomy data must match the proposal exactly unless an approved addendum changes the requirement.
- `pi-role-model` must not own the Role-Model runtime process, copy secrets, or introduce hidden model calls by default.
- Proposal Phase 5 benchmark implementation and Phase 6 telemetry implementation are deferred except for extension points and placeholders explicitly required by run 57.

## Requirements

### `R1` Establish the actual AS-IS taxonomy, routing, UI, and Pi contracts before implementation

Description:
Phase 1 must audit the real codebase before planning implementation.

Proposal background: This requirement uses `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md` as the background source for proposal Phase 1-4 scope, repository-shape reconciliation, and AS-IS comparison.

Acceptance criteria:
- Phase 1 identifies all current role, task, capability, modality, and tool strings used by runtime core, protocol routing, runtime-host bridge, runtime UI, fixtures, docs, and `pi-role-model`
- Phase 1 identifies current model role assignment data shapes and persistence paths
- Phase 1 identifies existing router candidate, decision, controller, diagnostics, and request observation data shapes that taxonomy metadata must extend
- Phase 1 identifies current runtime API route ownership for `/api/role-model/*`, `/v1/models`, router routes, observe routes, and downstream discovery routes
- Phase 1 identifies current runtime UI route/component files for `/app/models`, `/app/models/roles`, `/app/models/benchmark`, `/app/router/*`, and `/app/observe/*`
- Phase 1 identifies current `packages/pi-role-model` extension, skill, command, provider registration, discovery, alias, and request-handling code
- Phase 1 records compatibility constraints from run 56, including Pi command invocation behavior and Windows Pi CLI teardown caveat
- Phase 1 maps every proposal Phase 1-4 deliverable to actual files, planned tests, and verification commands
- Phase 1 reconciles the proposal repository-shape paths against the actual repo and records any path adjustment before Phase 2 planning
- Phase 1 identifies the exact golden source used to verify that implementation taxonomy rows match the proposal rows

### `R2` Add canonical taxonomy schemas, data, manifest, and validation

Description:
The runtime must ship the V1 taxonomy as canonical data, not illustrative examples.

Proposal background: This requirement implements the proposal's `Canonical Runtime Taxonomy Catalog`, `Data Model`, `Repository Shape`, and Phase 1 implementation-plan sections.

Acceptance criteria:
- versioned JSON Schemas exist for groups, roles, task types, capabilities, modalities, tool classes, intent presets, model role assignments, classification metadata, and taxonomy manifest
- canonical JSON data exists for all proposal V1 groups, roles, task types, capabilities, modalities, and tool classes, exactly matching the proposal canonical tables
- V1 canonical `intent-presets.json` exists and contains zero canonical presets unless the proposal is amended; tests for preset expansion use fixture data or explicit non-canonical sample data
- the taxonomy manifest includes `schemaVersion`, `taxonomyVersion`, `databaseVersion`, `contentRevision`, `generatedAt`, `entryCounts`, `entryFiles`, and `contentHashes`
- manifest `entryCounts` exactly reports `groups: 6`, `roles: 28`, `taskTypes: 280`, `capabilities: 46`, `modalities: 9`, `toolClasses: 15`, and `intentPresets: 0`
- manifest `entryFiles` and `contentHashes` cover every canonical taxonomy file and are used as release/package receipts
- canonical roles store `primaryGroupId` and `secondaryGroupIds`
- canonical task types include label, description, use-when guidance, do-not-use-when guidance, primary role, compatible roles, required/preferred capabilities, modalities or modality requirements where applicable, tool classes where applicable, and classification guidance
- canonical groups, roles, task types, capabilities, modalities, and tool classes match the exact IDs and row content from the proposal-derived golden fixture
- taxonomy entries include authority/stability fields required by the proposal data model where applicable
- build-time validation fails on duplicate IDs within a kind
- build-time validation fails on invalid group, role, task, capability, modality, tool-class, or preset references
- build-time validation fails if any canonical role has fewer than 10 matching task types
- build-time validation fails if the proposal-required counts drift without an intentional taxonomy version/update note
- tests cover valid catalog load, exact proposal fixture parity, duplicate ID rejection, invalid reference rejection, role group membership validation, task role-family validation, manifest hash/count validation, zero canonical preset validation, and preset expansion validation against fixtures

### `R3` Add taxonomy loading, resolving, normalization, and generated documentation support

Description:
Core runtime packages must provide reusable taxonomy APIs rather than duplicating ad hoc parsing in the bridge, UI, or Pi package.

Proposal background: This requirement implements the proposal's core concept definitions, canonical naming rules, generated documentation requirements, repository shape, and Phase 1 taxonomy deliverables.

Acceptance criteria:
- `@role-model-router/core` or an equivalent shared package exposes typed load, validate, resolve, normalize, migration/alias, and model-assignment helpers for taxonomy data
- implementation uses the proposal repository shape unless Phase 1 records and Phase 2 approves an equivalent repo-native path:
  - `/schemas/role-model/taxonomy/taxonomy.schema.json`
  - `/schemas/role-model/taxonomy/group.schema.json`
  - `/schemas/role-model/taxonomy/role.schema.json`
  - `/schemas/role-model/taxonomy/task-type.schema.json`
  - `/schemas/role-model/taxonomy/capability.schema.json`
  - `/schemas/role-model/taxonomy/modality.schema.json`
  - `/schemas/role-model/taxonomy/tool-class.schema.json`
  - `/schemas/role-model/taxonomy/intent-preset.schema.json`
  - `/schemas/role-model/taxonomy/classification.schema.json`
  - `/schemas/role-model/taxonomy/model-role-assignment.schema.json`
  - `/role-model-router/packages/core/data/taxonomy/manifest.json`
  - `/role-model-router/packages/core/data/taxonomy/groups.json`
  - `/role-model-router/packages/core/data/taxonomy/roles.json`
  - `/role-model-router/packages/core/data/taxonomy/task-types.json`
  - `/role-model-router/packages/core/data/taxonomy/capabilities.json`
  - `/role-model-router/packages/core/data/taxonomy/modalities.json`
  - `/role-model-router/packages/core/data/taxonomy/tool-classes.json`
  - `/role-model-router/packages/core/data/taxonomy/intent-presets.json`
  - `/role-model-router/packages/core/src/taxonomy/load.ts`
  - `/role-model-router/packages/core/src/taxonomy/validate.ts`
  - `/role-model-router/packages/core/src/taxonomy/normalize.ts`
  - `/role-model-router/packages/core/src/taxonomy/resolve.ts`
  - `/role-model-router/packages/core/src/taxonomy/classify-contract.ts`
  - `/role-model-router/packages/core/src/taxonomy/model-assignment.ts`
  - `/role-model-router/packages/core/src/taxonomy/migrations.ts`
  - `/role-model-router/packages/core/src/taxonomy/types.ts`
- generated TypeScript types are available where existing protocol/schema tooling expects them
- schema validation and generated type checks are wired into existing workspace validation commands
- generated docs tables or generated docs data are produced from the canonical JSON data rather than manually maintained Markdown
- generated docs include groups, roles, task types, capabilities, modalities, tool classes, intent presets, classification guide, model configuration UX, progressive disclosure, extension/RBAC model, Phase 5 benchmark placeholders, and Phase 6 telemetry placeholders
- stable docs or generated artifacts make `Canonical Role Group Membership` explicit
- tests or static checks prove docs/generated tables match canonical data and manifest counts
- tests prove generated docs, compact Pi snapshots, and runtime bundles were produced from the same content hashes

### `R4` Expose runtime taxonomy discovery and progressive disclosure APIs

Description:
Role-Model must expose full and compact taxonomy discovery so Pi and other clients can fetch only what they need.

Proposal background: This requirement implements the proposal's `Progressive Disclosure Requirements`, `Runtime Discovery`, effective taxonomy model, and Phase 2 implementation-plan sections.

Acceptance criteria:
- runtime exposes taxonomy version and summary endpoints
- runtime exposes full taxonomy, effective taxonomy, classification guide, group list, role list, role summary, group roles, role detail, role task types, task-type list, task-type detail, capabilities, modalities, and tool-class discovery routes
- runtime exposes the proposal route family unless Phase 1 records and Phase 2 approves an equivalent repo-native route name:
  - `GET /api/role-model/taxonomy`
  - `GET /api/role-model/taxonomy/version`
  - `GET /api/role-model/taxonomy/summary`
  - `GET /api/role-model/taxonomy/effective`
  - `GET /api/role-model/taxonomy/classification-guide`
  - `GET /api/role-model/taxonomy/groups`
  - `GET /api/role-model/taxonomy/roles`
  - `GET /api/role-model/taxonomy/roles?view=summary`
  - `GET /api/role-model/taxonomy/groups/{groupId}/roles`
  - `GET /api/role-model/taxonomy/roles/{roleId}`
  - `GET /api/role-model/taxonomy/roles/{roleId}/task-types`
  - `GET /api/role-model/taxonomy/task-types`
  - `GET /api/role-model/taxonomy/task-types/{taskType}`
  - `GET /api/role-model/taxonomy/capabilities`
  - `GET /api/role-model/taxonomy/modalities`
  - `GET /api/role-model/taxonomy/tool-classes`
- runtime responses include `taxonomyVersion`, `schemaVersion`, `databaseVersion`, `contentRevision`, `classificationContractVersion`, and `ETag` where relevant
- compact summary responses are small enough for agent prompt use and target less than 16 KB uncompressed for the core taxonomy summary
- detailed task responses can be fetched for a specific role or task without loading the full catalog
- group, role, task, capability, modality, and tool-class responses include `related`, `next`, or equivalent links/IDs that support progressive lookup
- large custom/effective taxonomy responses support `limit`, `cursor`, and `next` mechanics where needed
- response schemas support `locale` for labels/descriptions without changing canonical IDs
- runtime effective taxonomy can be computed by caller scope and includes core, provider, client, org, team, user, and policy annotations where those concepts exist or are stubbed
- effective taxonomy caches are invalidated by `taxonomyVersion`, `contentRevision`, caller scope, and locale
- unsupported taxonomy versions degrade or reject explicitly
- tests cover summary, detail, effective taxonomy, role-task detail, invalid version, compact-size guardrail, pagination/cursor behavior, `ETag`/version fields, locale stability, cache invalidation, and reference validity in API responses

### `R5` Validate and normalize classified request metadata

Description:
The runtime must accept structured `role_model.intent` metadata from Pi and other clients, validate it against the effective taxonomy, and normalize it before routing.

Proposal background: This requirement implements the proposal's `Classification Contract For Consumers`, `Request Metadata Shape`, `Validation Rules`, and Phase 2 validation deliverables.

Acceptance criteria:
- request metadata contract supports the exact proposal classification fields: `classification_version`, `taxonomy_version`, `contract_version`, `source`, `confidence`, `role_hint_id`, `requested_role_id`, `task_type`, `task_action`, `task_variant`, `task_source`, `task_confidence`, `required_capabilities`, `preferred_capabilities`, `required_modalities`, `output_modalities`, `tool_classes`, `context_tokens_estimate`, `evidence`, and `alternatives`
- runtime accepts the wire wrapper `role_model.intent` and normalizes it into a router-owned `RoutingIntent`
- runtime validates all hard taxonomy IDs against effective taxonomy
- runtime rejects unknown hard `requested_role_id`, hard `task_type`, required capabilities, required modalities, incompatible requested role/task pairs, unsupported taxonomy versions, and unauthorized hard entries
- runtime ignores unknown or unauthorized advisory fields with diagnostics
- runtime expands intent presets into canonical metadata
- runtime normalizes aliases, deprecated IDs, task action, task variant, confidence, and source fields
- runtime records accepted, rejected, ignored, normalized, evidence, alternatives, source, confidence, schema version, taxonomy version, content revision, and classification contract version fields in routing diagnostics where applicable
- runtime removes or sanitizes `role_model` metadata before forwarding requests upstream
- tests cover valid metadata, invalid hard task, invalid advisory role hint, incompatible role/task, unknown capability, deprecated alias normalization, preset expansion, evidence/alternatives recording, source/confidence handling, output modality handling, version metadata persistence, authorization/policy placeholder behavior, and upstream forwarding sanitization

### `R6` Use taxonomy metadata in router and controller decisions

Description:
Classified request metadata must materially affect routing eligibility, scoring, diagnostics, and controller handoff without weakening policy.

Proposal background: This requirement implements the proposal's `Router And Controller Decision Use`, `Runtime Responsibilities`, and Phase 2 routing/controller deliverables.

Acceptance criteria:
- runtime converts validated request metadata into a router-owned `RoutingIntent`
- explicit `requested_role_id`, required capabilities, required modalities, required tool classes, RBAC/policy limits, endpoint health, role assignment, model availability, and context-window requirements are applied as hard eligibility filters before scoring
- `role_hint_id`, compatible roles, `task_type`, `task_action`, `task_variant`, preferred capabilities, modality fit, tool fit, cost, latency, and context fit are advisory scoring inputs after hard filtering
- groups are not used as routing constraints
- benchmark and telemetry fields are reserved but no-op in this run; they must not alter eligibility or scoring until later runs implement Phase 5 and Phase 6
- controller receives normalized intent, eligible candidate facts, candidate scores, and policy-visible diagnostics, not the full taxonomy catalog
- controller cannot select candidates removed by hard eligibility filters
- deterministic router fallback uses the same normalized metadata when controller routing is unavailable, disabled, or disallowed
- decision records expose normalized intent, candidate filters, candidate scores, controller output or deterministic fallback output, final selection, and reason codes tied to taxonomy dimensions
- decision records persist `schemaVersion`, `taxonomyVersion`, `contentRevision`, and normalized taxonomy IDs used at request time
- `/app/router/candidates` and `/app/router/decisions/:requestId` can inspect taxonomy-aware eligibility and scoring diagnostics
- tests cover hard role filtering, required capability filtering, required modality filtering, required tool filtering, advisory role/task scoring, no-op benchmark/telemetry placeholders, controller blocked-candidate protection, deterministic fallback, and decision record diagnostics

### `R7` Extend existing runtime UI for groups, roles, tasks, and model assignment

Description:
Runtime UI must expose taxonomy configuration through existing operator surfaces.

Proposal background: This requirement implements the proposal's `UI And UX Requirements`, `Endpoint And Model Configuration Shape`, `UX Safeguards`, and Phase 3 implementation-plan sections.

Acceptance criteria:
- `/app/models` shows taxonomy-aware model role coverage and assignment state
- `/app/local/peer-models` and `/app/local/llama-swap/models` use the upgraded grouped role picker when a model is added or loaded through existing local model flows
- `/app/remote/providers` remains focused on account/auth/readiness; remote model role assignment happens after models appear in `/app/models`
- newly added or loaded models default to all roles checked
- role checkboxes are grouped by canonical groups with visible checked states
- an `All roles` control selects/deselects all visible roles and shows indeterminate state when partially selected
- `All roles` checked persists `roleAssignmentMode: "all"` and inherits future canonical roles added in a later minor taxonomy version unless policy blocks them
- partial selection persists `roleAssignmentMode: "allow_list"` or `roleAssignmentMode: "deny_list"` according to the chosen implementation, with tests proving readback and routing behavior
- model role assignment persistence supports `roleAssignmentMode`, `enabledRoleIds`, `disabledRoleIds`, `taskOverrides`, `capabilityOverrides`, `modalityOverrides`, and `toolClassOverrides`
- task override modes support `inherit_role`, `enabled`, `disabled`, and `policy_disabled`
- secondary group membership is visible where relevant without duplicating role assignment semantics
- high-risk roles are labeled consistently
- users can remove roles they do not want a model to serve
- removing a role affects runtime eligibility for hard role requests
- tasks are disclosed from `/app/models` model detail/inspect or `/app/models/roles`, not forced into initial add/load flow
- `/app/models/roles` uses canonical taxonomy-backed role/task browsing through existing `RoleCatalogHierarchy` or equivalent current component
- `/app/models/benchmark`, `/app/router/*`, and `/app/observe/*` include placeholders or links for taxonomy dimensions without requiring Phase 5/6 data
- UI uses existing design system primitives and route structure; no new top-level route is required for V1
- frontend tests cover local peer flow, llama-swap flow, grouped role picker defaults, `All roles` behavior, future-role inheritance semantics, role removal, persisted role assignment readback, task drill-in, high-risk indicators, model detail role coverage, and placeholder states
- browser E2E or runtime UI validation covers `/app/models`, `/app/models/roles`, `/app/router/candidates`, and `/app/router/decisions/:requestId`

### `R8` Add compact generated taxonomy snapshot to `pi-role-model`

Description:
Pi must have a compact local taxonomy snapshot for first-pass classification and offline resilience.

Proposal background: This requirement implements the proposal's Pi package repository paths, progressive-disclosure data shape, consumer responsibilities, and Phase 4 compact snapshot deliverables.

Acceptance criteria:
- `packages/pi-role-model` includes generated compact taxonomy data from the canonical runtime taxonomy
- compact data uses the proposal repository shape unless Phase 1 records and Phase 2 approves an equivalent package-native path:
  - `/packages/pi-role-model/data/taxonomy/compact-manifest.json`
  - `/packages/pi-role-model/data/taxonomy/compact-groups.json`
  - `/packages/pi-role-model/data/taxonomy/compact-role-summaries.json`
  - `/packages/pi-role-model/data/taxonomy/compact-role-task-index.json`
  - `/packages/pi-role-model/data/taxonomy/compact-classification-guide.json`
  - `/packages/pi-role-model/data/taxonomy/groups/{groupId}.json`
  - `/packages/pi-role-model/data/taxonomy/roles/{roleId}/tasks.compact.json`
  - `/packages/pi-role-model/src/taxonomy/load-compact-taxonomy.ts`
  - `/packages/pi-role-model/src/taxonomy/resolve-effective-taxonomy.ts`
  - `/packages/pi-role-model/src/taxonomy/classify-with-progressive-disclosure.ts`
- compact data includes `compact-manifest.json`, `compact-groups.json`, `compact-role-summaries.json`, `compact-role-task-index.json`, `compact-classification-guide.json`, group chunks, and role task chunks
- compact manifest includes versions, counts, hashes, and file paths
- compact groups include group summaries and role IDs by group
- compact role summaries omit full task detail
- compact role-task index includes role-to-task IDs and labels only
- role task chunks include compact task descriptions, use-when/do-not-use-when guidance, and required/preferred capabilities for one role only
- any single compact chunk stays under the implementation-defined hard prompt-size guardrail, with target under 16 KB
- Pi package APIs can load group summaries first, role summaries second, and task chunks only for likely roles
- runtime effective taxonomy summary supersedes the package snapshot when reachable and compatible
- package snapshot content hashes must match the runtime taxonomy manifest content or explicitly record a version/content mismatch diagnostic
- tests cover compact manifest load, hash/count validation, group-first lookup, role summary lookup, task chunk lazy load, size guardrails, runtime-version comparison, and offline fallback

### `R9` Add Pi progressive request classification and metadata sending

Description:
`pi-role-model` must classify requests progressively and send validated metadata to Role-Model using the stable request contract.

Proposal background: This requirement implements the proposal's consumer classification contract, consumer classification algorithm, request metadata shape, and Phase 4 Pi integration deliverables.

Acceptance criteria:
- Pi classification first chooses candidate groups from prompt, mode, tools, attachments, explicit user hints, and trusted package/runtime context
- Pi loads roles only for likely groups
- Pi loads task indexes only for likely roles
- Pi fetches full task detail only for ambiguous candidates or final validation where the runtime supports it
- Pi emits role, task, action, variant, capability, modality, tool-class, confidence, and source metadata in `role_model.intent`
- Pi emits `classification_version`, `taxonomy_version`, `source`, `confidence`, `output_modalities`, `evidence`, and `alternatives` when those values are known or useful for ambiguity diagnostics
- Pi uses hard fields only for explicit user instructions or trusted policy/context
- Pi treats low-confidence fields as advisory and includes alternatives/evidence where the contract supports it
- Pi handles runtime diagnostics and taxonomy version mismatches as authoritative
- Pi degrades to broad role hints or package snapshot classification when runtime detail is unavailable
- Pi does not hide extra model calls for classification unless explicitly enabled by a documented user setting
- Pi keeps existing run 56 provider registration, alias, endpoint trust, auth failure, and safety behavior intact
- tests cover group-first classification, task selection across at least six proposal request examples, hard/advisory field selection, runtime override, version mismatch, degraded runtime, diagnostics handling, and no-hidden-model-call default

### `R10` Add generated docs, README, and skill guidance for taxonomy usage

Description:
The repo, docs site source, and Pi skill must explain how consumers and operators use the taxonomy.

Proposal background: This requirement implements the proposal's `Generated Documentation`, runtime responsibilities, consumer responsibilities, and public documentation expectations for Phase 1-4.

Acceptance criteria:
- repo docs describe canonical groups, roles, task types, capabilities, modalities, tool classes, and intent presets from generated taxonomy data
- docs define role, group, task type, role family, task action, variant, capability, modality, tool class, and intent preset using the proposal semantics
- docs explain the role/task relationship and `{role-family}.{task-action}[.{variant}]` naming rules
- docs explain how Pi and other consumers classify requests progressively
- docs explain router/controller use of hard and advisory taxonomy metadata
- docs explain model role assignment defaults and task drill-down UI behavior
- docs explain Phase 5 benchmarks and Phase 6 telemetry as later phases only
- root README or relevant runtime docs link to taxonomy docs where appropriate without bloating setup instructions
- `packages/pi-role-model/skills/role-model/SKILL.md` explains how Pi should use taxonomy discovery, compact snapshot fallback, role/task classification, diagnostics, and routing authority boundaries
- docs avoid internal-only conversational language and remain public-facing
- static checks or tests verify key docs sections and generated docs consistency where practical

### `R11` Preserve scope boundaries and future extension points

Description:
The implementation must not accidentally build later benchmark/telemetry systems or weaken existing safety boundaries.

Proposal background: This requirement implements the proposal's Phase 5/6 non-goals for earlier phases, extensibility/RBAC model, and consumer/runtime authority boundaries.

Acceptance criteria:
- no benchmark suite runner, benchmark scoring engine, benchmark dashboard implementation, or benchmark-informed routing behavior is added beyond placeholders/reserved fields
- no production telemetry aggregation dimensions, telemetry dashboards, or telemetry-influenced routing behavior are added beyond placeholders/reserved fields
- taxonomy data model reserves fields or link points for future benchmark and telemetry dimensions
- taxonomy schemas include `authority.scope` and ownership metadata for `core`, `provider`, `client`, `org`, `team`, and `user` scopes
- taxonomy schemas support resource kinds `group`, `role`, `task_type`, `capability`, `modality`, `tool_class`, `intent_preset`, `model_role_assignment`, and `routing_policy_binding`
- taxonomy schemas and effective taxonomy logic support RBAC actions `taxonomy.read`, `taxonomy.suggest`, `taxonomy.create`, `taxonomy.update`, `taxonomy.deprecate`, `taxonomy.delete`, `taxonomy.bind_policy`, and `taxonomy.use`, even if only core read/use enforcement is active in this run
- custom groups are schema-valid for `client`, `org`, `team`, and `user` scopes and custom roles may reference custom groups only when visible in the caller effective taxonomy
- unsupported RBAC scopes or unavailable org/team/user enforcement degrade explicitly rather than silently accepting unauthorized hard metadata
- `pi-role-model` does not start, stop, install, update, or own the Role-Model runtime process
- `pi-role-model` does not call the Role-Model launcher path
- `pi-role-model` does not read, print, copy, sync, or persist Pi provider secrets
- remote endpoint trust and auth-required fail-closed behavior from run 56 remain intact
- tests or static scans verify forbidden runtime-process, credential, benchmark-command, and hidden-classification-model-call boundaries where practical

### `R12` Implement versioning, compatibility, and deprecation semantics

Description:
Taxonomy versioning must follow the proposal exactly so runtime decisions and historical diagnostics remain interpretable.

Proposal background: This requirement implements the proposal's `Versioning`, `Compatibility Rules`, `Deprecation`, and database/storage-version sections.

Acceptance criteria:
- schema version, taxonomy version, database/storage version, content revision, and classification contract version are represented separately
- `schemaVersion` changes when JSON Schema or TypeScript contracts change
- `taxonomyVersion` follows semver for canonical taxonomy content changes
- `databaseVersion` is a monotonic integer for persisted taxonomy tables, local overrides, RBAC bindings, effective-taxonomy caches, and migration receipts
- `contentRevision` changes whenever packaged taxonomy data changes, even if the taxonomy semver bump is patch-level
- `classificationContractVersion` changes when request metadata wire shape changes
- deprecated taxonomy entries can include `deprecated`, `replacement`, `deprecationReason`, and migration/alias behavior
- breaking taxonomy changes require an explicit major taxonomy version or deprecation/migration path
- cached effective taxonomy is invalidated when `taxonomyVersion`, `contentRevision`, caller RBAC scope, or locale changes
- persisted classifications and routing decisions store `schemaVersion`, `taxonomyVersion`, `contentRevision`, and normalized IDs used at request time
- tests cover version compatibility, unsupported version rejection/degradation, deprecation replacement, cache invalidation, and persisted decision version fields

### `R13` Use strict TDD and phase-appropriate verification

Description:
Implementation must be test-driven and verified through unit, integration, browser, rebuilt-runtime, and Pi-driven QA layers.

Proposal background: This requirement implements the proposal's `End-To-End Verification Requirements` and Phase 1-4 acceptance criteria as the required verification background for TDD and Phase 4 evidence.

Acceptance criteria:
- Phase 3 declares `TDD Mode: strict` for production code behavior
- every production behavior in `R2` through `R12` has RED evidence before the implementation that makes it pass
- GREEN evidence is captured after each meaningful implementation slice
- code review or Phase 3.5 review is planned unless explicitly waived with rationale
- Phase 4 verifies taxonomy schema/data tests, runtime discovery tests, routing/controller tests, runtime UI tests, Pi package tests, docs/static checks, and changed-path regression commands
- Phase 4 audits implementation against every requirement ID, every normative proposal section, and every exact canonical catalog/schema/path requirement
- Phase 4 explicitly states that proposal Phase 5/6 implementation is deferred and that only extension points/placeholders were added
- Phase 5 manual QA must not start until Phase 4 is locked and test evidence is complete

### `R14` Complete Pi-driven rebuilt-runtime end-to-end manual QA

Description:
Phase 5 must prove the implementation works through real Pi and a rebuilt local Role-Model runtime, not only tests.

Proposal background: This requirement implements the proposal's `End-To-End Verification Requirements` and Phase 1-4 E2E test cases as the mandatory Phase 5 verification source.

Acceptance criteria:
- `05-manual-qa.md` declares `QA Execution Mode: agent-operated`
- Phase 5 re-reads `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md` before QA and records that the proposal was used as the verification checklist for this run
- Phase 5 rebuilds Role-Model runtime packages from the implementation worktree
- Phase 5 rebuilds runtime UI from the implementation worktree
- Phase 5 rebuilds `pi-role-model` from the implementation worktree or produced package artifact
- Phase 5 launches the rebuilt Role-Model router runtime locally on a known port
- Phase 5 commands the local Pi instance to update or install the rebuilt `pi-role-model` package
- Phase 5 commands Pi to update, install, or explicitly guide/verify the rebuilt Role-Model router runtime setup on this device, because this run changes the runtime; if Pi cannot perform runtime update/install directly, the limitation and Pi-visible verification path must be recorded
- Phase 5 commands Pi to configure the router endpoint URL, authentication if needed, and a user-facing alias
- Phase 5 commands Pi to read the package taxonomy snapshot and compare it to runtime taxonomy version/summary
- Phase 5 commands Pi to list groups, roles by group, secondary membership, and sample role task counts
- Phase 5 commands Pi to configure or inspect model role assignments where UI/API supports it
- Phase 5 has Pi classify and send the minimum proposal request set through the configured alias
- Phase 5 inspects request responses, response headers where available, normalized intents, decision IDs, candidate filters, candidate scores, selected endpoint/model, controller output or deterministic fallback, and runtime diagnostics
- Phase 5 inspects `/app/models`, `/app/models/roles`, `/app/router/candidates`, `/app/router/decisions/:requestId`, `/app/observe/requests`, and `/app/observe/routing` where applicable
- Phase 5 records explicit not-yet-implemented notes for Phase 5 benchmark and Phase 6 telemetry surfaces
- Phase 5 records a proposal coverage table mapping observed QA evidence to every relevant Phase 1-4 proposal E2E case and acceptance criterion
- Phase 5 records exact runtime/package build identifiers, Pi commands/prompts, endpoint/alias configuration, request prompts, decision receipts, screenshots or captured outputs, and any limitations
- implementation defects found during Phase 5 must be fixed through TDD before final QA pass unless they are true external Pi/runtime limitations documented with evidence

### `R15` Satisfy proposal E2E cases for phases 1-4

Description:
The run must execute or explicitly evidence every Phase 1-4 E2E case from the proposal.

Proposal background: This requirement implements the proposal's `Phase 1-4 End-To-End Test Cases` and minimum Phase 1-4 request set as the explicit Phase 5 verification checklist.

Acceptance criteria:
- Phase 5 records receipts for `E2E-P1-001` through `E2E-P1-003`
- Phase 5 records receipts for `E2E-P2-001` through `E2E-P2-005`
- Phase 5 records receipts for `E2E-P3-001` through `E2E-P3-003`
- Phase 5 records receipts for `E2E-P4-001` through `E2E-P4-005`
- the minimum Phase 1-4 request set is both classified and sent through the configured alias:
  - "Review this diff for security risks and likely regressions."
  - "Implement this small bug fix and add a regression test."
  - "Compare current public documentation for this API and cite differences."
  - "Turn these support notes into a clear customer reply."
  - "Inspect this schema and propose a migration plan."
  - "Create product requirements and acceptance criteria for this workflow."
- if a specific E2E case cannot be fully automated because of current Pi, runtime, or browser constraints, the closest executable evidence and limitation must be recorded

## Out of Scope

- Implementing proposal Phase 5 taxonomy-aware benchmark suites, benchmark runs, benchmark result aggregation, or benchmark-informed routing
- Implementing proposal Phase 6 taxonomy-aware production telemetry dimensions, telemetry dashboards, telemetry rollups, or telemetry-informed routing
- Creating a new top-level runtime UI taxonomy application route
- Replacing the existing alias capability discovery contract from run 54
- Changing Pi upstream itself
- Making `pi-role-model` own, install, start, stop, or upgrade the Role-Model runtime process
- Reading, copying, syncing, or persisting Pi provider credentials
- Adding hidden classification model calls by default

## Suggested Worktree

Use an isolated recursive worktree:

```text
.worktrees/57-role-model-taxonomy-v1-phase-1-4
```

The branch should be:

```text
recursive/57-role-model-taxonomy-v1-phase-1-4
```

## Expected Product Paths

Expected exact paths from the proposal include, subject only to an approved Phase 1/Phase 2 repo-native path reconciliation:

- `/schemas/role-model/taxonomy/**`
- `/role-model-router/packages/core/data/taxonomy/**`
- `/role-model-router/packages/core/src/taxonomy/**`
- `/packages/pi-role-model/data/taxonomy/**`
- `/packages/pi-role-model/src/taxonomy/**`

Likely additional touched paths include, subject to Phase 1 AS-IS findings:

- `/protocol/schemas/**`
- `/packages/schema-tools/**`
- `/packages/protocol-types/**`
- `/role-model-router/packages/core/**`
- `/role-model-router/packages/protocol-routing/**`
- `/role-model-router/packages/runtime-observability/**`
- `/role-model-router/apps/runtime-host-bridge/**`
- `/role-model-router/apps/runtime-ui/**`
- `/packages/pi-role-model/**`
- `/docs/**`
- `/docs-site/**`
- `/testdata/**`

## Verification Floor

Phase 4 must choose the exact command set from the changed-path regression matrix, but the expected minimum includes:

- focused taxonomy/schema/data validation tests
- exact proposal-derived golden fixture parity tests for canonical taxonomy IDs and row content
- focused runtime-host bridge tests for discovery, validation, routing diagnostics, and controller constraints
- focused runtime UI tests for model role assignment and taxonomy catalog display
- focused `packages/pi-role-model` tests for compact snapshot and progressive classification
- docs/static checks for generated taxonomy docs and README/skill guidance
- `corepack pnpm run runtime:test-critical` or a justified narrower equivalent during active TDD loops
- `corepack pnpm run runtime:test-browser` or targeted Playwright/browser validation for the runtime UI surfaces
- rebuilt-runtime local validation before Phase 5

Phase 5 must add the Pi-driven rebuilt-runtime evidence described in `R14` and `R15`.

## Coverage Gate

Coverage: PASS

This requirements draft covers:

- proposal Phase 1 canonical taxonomy through `R2`, `R3`, `R10`, and `R13`
- exact proposal taxonomy/schema/path matching through `Normative Proposal Sections`, `Exact Canonical Catalog Requirements`, `Exact Schema And Data Model Requirements`, `R2`, `R3`, `R12`, and `R13`
- proposal Phase 2 runtime discovery, validation, router, and controller behavior through `R4`, `R5`, `R6`, and `R13`
- proposal Phase 3 existing runtime UI integration through `R7`, `R10`, and `R13`
- proposal Phase 4 Consumer/Pi integration through `R8`, `R9`, `R10`, `R11`, `R14`, and `R15`
- proposal Phase 1-4 end-to-end verification through `R14` and `R15`
- proposal core concepts, role/task relationship, naming rules, runtime responsibilities, and consumer responsibilities through `Normative Proposal Sections`, `R2`, `R3`, `R4`, `R5`, `R6`, `R8`, `R9`, `R10`, and `R11`
- versioning, compatibility, deprecation, and persisted decision metadata through `R12`
- later benchmark and telemetry scope boundaries through `R11`

Coverage passes because the approved requirement covers proposal Phase 1-4 taxonomy, runtime, UI, Pi integration, docs, verification, and proposal traceability requirements.

## Approval Gate

Approval: PASS

The user approved requirement 57 for implementation on 2026-06-23 and directed implementation in an isolated worktree. Run 58 remains draft and out of scope for this implementation run.
