# Taxonomy V1

Role-Model Taxonomy V1 is the versioned vocabulary used to describe what a request needs before routing. It defines groups, roles, task types, capabilities, modalities, and tool classes as stable runtime data rather than ad hoc strings.

The canonical role and task naming rule is:

```text
{role-family}.{task-action}[.{variant}]
```

Examples include `coder.edit`, `security.audit`, `researcher.web_research.current`, and `product.requirements`. The role family identifies the primary role that owns the task. The task action describes the work. The optional variant narrows the task when a more specific routing or policy distinction is useful.

## Concepts

| Concept | Definition |
| --- | --- |
| group | A first-level organizing bucket such as `engineering`, `product_design`, or `governance_safety`. Groups are used for UI grouping and progressive disclosure. |
| role | A durable work identity such as `coder`, `security`, `researcher`, or `support`. Every role has one primary group and may have secondary groups. |
| task type | A role-owned unit of work such as `coder.review` or `support.ticket.reply`. Task types declare compatible roles, capabilities, modalities, and tool classes. |
| capability | A model or endpoint ability such as `code.write`, `web.search`, `json.schema_adherence`, or `security.analysis`. |
| modality | A required input or output form such as `text`, `image`, `structured_json`, `code_patch`, or `document`. |
| tool class | A coarse class of external action such as `filesystem.read`, `shell.execute`, `browser.control`, or `memory.write`. |

Taxonomy V1 ships with 6 groups, 28 canonical roles, 280 canonical task types, 46 capabilities, 9 modalities, and 15 tool classes. Canonical JSON data is stored under `role-model-router/packages/core/data/taxonomy/`, and schema files are stored under `schemas/role-model/taxonomy/`.

## Progressive Disclosure

The taxonomy is large enough that consumers should not load every task description into prompt context by default. Consumers should use progressive disclosure:

1. Read the manifest and compact groups.
2. Pick likely groups from the prompt, active tools, attachments, explicit user hints, and trusted runtime context.
3. Load role summaries only for likely groups.
4. Load task chunks only for likely roles or ambiguous role pairs.
5. Send the final classification as request metadata.

The runtime exposes compact discovery endpoints under `/api/role-model/taxonomy/*`. The `@try-works/pi-role-model` package also includes compact offline data under `packages/pi-role-model/data/taxonomy/` so Pi can classify when the runtime is unavailable.

## Request Metadata

Consumers send classifications in `role_model.intent` on OpenAI-compatible request bodies. The runtime accepts this metadata on Chat Completions and Responses requests.

```json
{
  "role_model": {
    "contract_version": 1,
    "intent": {
      "classification_version": "role-model.pi-classifier.v1",
      "taxonomy_version": "1.0.0-alpha.1",
      "content_revision": "taxonomy-v1-alpha.1",
      "classification_contract_version": "role-model.classification.v1",
      "source": "explicit_user",
      "confidence": 0.98,
      "role_hint_id": "security",
      "task_type": "security.audit",
      "task_action": "audit",
      "task_variant": null,
      "task_source": "heuristic",
      "task_confidence": 0.82,
      "preferred_capabilities": ["security.analysis", "code.read"],
      "required_modalities": ["text"],
      "output_modalities": ["text"],
      "tool_classes": ["filesystem.read"],
      "evidence": ["security/risk/diff signal"],
      "alternatives": [
        { "role_hint_id": "coder", "task_type": "coder.review", "confidence": 0.42 }
      ]
    }
  }
}
```

Stable Pi-facing fields such as `requested_role_id`, `role_hint_id`, and `task_type` are advisory hints. Unknown, stale, incompatible, or out-of-taxonomy advisory values are ignored or degraded with diagnostics instead of rejecting the user request. Advisory fields influence diagnostics and scoring without excluding otherwise eligible candidates.

Trusted internal or admin policy paths may use the legacy internal hard-shape with `role: { "id": "...", "hard": true }` and `task: { "id": "...", "hard": true }`. That shape is not the stable Pi heuristic contract.

## Router And Controller Use

The router normalizes `role_model.intent` into its routing request. Hard role, task, capability, modality, and tool requirements narrow candidate endpoints. Preferred capabilities and low-confidence classifications remain advisory. Controller routing receives runtime-known role, task, capability, and endpoint facts after hard eligibility filtering, so the controller cannot invent unknown taxonomy identifiers or route outside the eligible candidate universe.

## Pi Integration

`@try-works/pi-role-model` includes compact taxonomy data and a progressive classifier. Pi should use the live runtime taxonomy when reachable and compatible, then fall back to the package snapshot when offline. Pi should not start, stop, install, update, or own the Role-Model runtime process, and it should not read or sync provider secrets.

<!-- TAXONOMY_V1_CATALOG:START -->

### Manifest

- schemaVersion: role-model.taxonomy.schema.v1
- taxonomyVersion: 1.0.0-alpha.1
- classificationContractVersion: role-model.classification.v1
- contentRevision: taxonomy-v1-alpha.1
- `entryCounts`:
  - groups: 6
  - roles: 28
  - capabilities: 46
  - modalities: 9
  - toolClasses: 15
  - intentPresets: 0
  - taskTypes: 280

### Groups

| Group | Label | Primary roles | Secondary roles |
| --- | --- | --- | --- |
| `engineering` | Engineering | `coder`, `architect`, `operator`, `tester`, `security`, `data` |  |
| `product_design` | Product And Design | `product`, `designer`, `planner`, `analyst` |  |
| `knowledge_research` | Knowledge And Research | `researcher`, `knowledge`, `scientist`, `mathematician`, `educator` | `health` |
| `business` | Business | `strategist`, `marketer`, `seller`, `finance`, `procurement` | `legal`, `recruiter` |
| `communication` | Communication | `writer`, `translator`, `creative`, `support`, `coordinator` |  |
| `governance_safety` | Governance And Safety | `legal`, `health`, `recruiter` | `security`, `finance` |

### Roles

| Role | Label | Primary group | Secondary groups | Task count |
| --- | --- | --- | --- | ---: |
| `coder` | Coder | `engineering` |  | 10 |
| `architect` | Architect | `engineering` |  | 10 |
| `security` | Security | `engineering` | `governance_safety` | 10 |
| `researcher` | Researcher | `knowledge_research` |  | 10 |
| `writer` | Writer | `communication` |  | 10 |
| `operator` | Operator | `engineering` |  | 10 |
| `analyst` | Analyst | `product_design` |  | 10 |
| `planner` | Planner | `product_design` |  | 10 |
| `tester` | Tester | `engineering` |  | 10 |
| `data` | Data | `engineering` |  | 10 |
| `product` | Product | `product_design` |  | 10 |
| `designer` | Designer | `product_design` |  | 10 |
| `support` | Support | `communication` |  | 10 |
| `legal` | Legal | `governance_safety` | `business` | 10 |
| `finance` | Finance | `business` | `governance_safety` | 10 |
| `creative` | Creative | `communication` |  | 10 |
| `educator` | Educator | `knowledge_research` |  | 10 |
| `translator` | Translator | `communication` |  | 10 |
| `marketer` | Marketer | `business` |  | 10 |
| `seller` | Seller | `business` |  | 10 |
| `recruiter` | Recruiter | `governance_safety` | `business` | 10 |
| `procurement` | Procurement | `business` |  | 10 |
| `coordinator` | Coordinator | `communication` |  | 10 |
| `knowledge` | Knowledge | `knowledge_research` |  | 10 |
| `strategist` | Strategist | `business` |  | 10 |
| `mathematician` | Mathematician | `knowledge_research` |  | 10 |
| `scientist` | Scientist | `knowledge_research` |  | 10 |
| `health` | Health | `governance_safety` | `knowledge_research` | 10 |

### Task Types

| Task type | Label | Description | Use when | Do not use when | Primary role | Compatible roles | Required capabilities | Preferred capabilities | Required modalities | Tool classes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `coder.edit` | Code Edit | Modify source code, configuration, tests, or build files. | User asks to implement, fix, refactor, or change files. | User only asks for critique, explanation, or review. | `coder` | `coder`, `architect` | `code.read`, `code.write` | `reasoning.multi_step` | `text` | `filesystem.read`, `filesystem.write`, `shell.execute` |
| `coder.review` | Code Review | Review source changes for correctness, regressions, maintainability, and missing tests. | User asks to inspect existing code or a diff and identify issues. | User asks to implement changes directly. | `coder` | `coder`, `security`, `architect` | `code.read` | `reasoning.multi_step` | `text` | `filesystem.read` |
| `coder.debug.root_cause` | Root Cause Debugging | Investigate a failure to identify the underlying cause before proposing or applying fixes. | User reports failing tests, crashes, locks, regressions, or unexpected behavior. | User already knows the fix and asks to apply it. | `coder` | `coder`, `operator`, `architect` | `code.read`, `reasoning.multi_step` | `tools.function_calling` | `text` | `filesystem.read`, `filesystem.write`, `shell.execute` |
| `coder.test.write` | Test Writing | Create or update tests for code behavior. | User asks for tests, coverage, regression proof, or TDD. | User asks only to inspect code without changes. | `coder` | `coder` | `code.read`, `code.write` | `tools.function_calling` | `text` | `filesystem.read`, `filesystem.write`, `shell.execute` |
| `coder.refactor` | Code Refactor | Improve structure without intended behavior changes. | User asks to simplify, reorganize, deduplicate, or improve maintainability. | User asks for new product behavior. | `coder` | `coder`, `architect` | `code.read`, `code.write` | `reasoning.multi_step` | `text` | `filesystem.read`, `filesystem.write`, `shell.execute` |
| `coder.explain` | Code Explanation | Explain code behavior, architecture, or implementation details. | User asks how code works or why it behaves a certain way. | User asks to modify files. | `coder` | `coder`, `writer` | `code.read`, `text.chat` | `reasoning.multi_step` | `text` | `filesystem.read` |
| `coder.migrate` | Code Migration | Move code across APIs, frameworks, versions, or platforms. | User asks to upgrade, port, or migrate implementation. | User only asks for conceptual comparison. | `coder` | `coder`, `architect`, `operator` | `code.read`, `code.write` | `long_context` | `text` | `filesystem.read`, `filesystem.write`, `shell.execute` |
| `coder.generate` | Code Generation | Create new code from a specification. | User asks to scaffold, generate, or create a new implementation. | User asks to review existing code only. | `coder` | `coder`, `architect` | `code.write` | `reasoning.multi_step` | `text` | `filesystem.read`, `filesystem.write`, `shell.execute` |
| `tester.e2e` | End-to-End Test Implementation | Create or update browser, API, or workflow-level tests. | User asks for Playwright/Cypress/API workflow validation. | User asks for unit tests only. | `tester` | `tester`, `coder` | `code.read`, `code.write`, `tools.function_calling` | `tools.browser_control` | `text` | `filesystem.read`, `filesystem.write`, `shell.execute` |
| `architect.design` | System Design | Design architecture, modules, APIs, ownership boundaries, or technical approach. | User asks for design, architecture, plans, or tradeoff analysis. | User asks for direct implementation with known design. | `architect` | `architect`, `coder` | `reasoning.multi_step` | `long_context` | `text` |  |
| `architect.review` | Architecture Review | Review a design or implementation for architecture and long-term maintainability. | User asks whether a system shape, API, or module boundary is sound. | The review is primarily about code-level bugs or security risk. | `architect` | `architect`, `coder`, `security` | `reasoning.multi_step` | `code.read` | `text` |  |
| `architect.plan` | Technical Plan | Produce a technical implementation plan, phases, or tradeoff analysis. | User asks how to approach implementation before coding. | User asks to directly edit files now. | `architect` | `architect`, `planner`, `coder` | `reasoning.multi_step` | `long_context` | `text` |  |
| `architect.api_design` | API Design | Design public APIs, contracts, schemas, or integration boundaries. | User asks for API shape, schema, protocol, or backwards compatibility. | User asks to debug a runtime failure. | `architect` | `architect`, `coder`, `product` | `reasoning.multi_step` | `json.schema_adherence` | `text` |  |
| `security.audit` | Security Audit | Analyze a system, implementation, or configuration for security risk. | User asks for vulnerabilities, abuse cases, secrets, auth, permissions, or risk. | User asks for general code quality without security focus. | `security` | `security`, `architect` | `security.analysis` | `code.read` | `text` |  |
| `security.audit.supply_chain` | Supply Chain Security Audit | Review dependencies, packages, build provenance, lockfiles, and release artifacts for supply-chain risk. | User asks about dependency risk, package publishing, build artifacts, provenance, or release integrity. | User asks for normal code quality review without dependency or release risk. | `security` | `security`, `operator`, `coder` | `security.analysis`, `code.read` | `web.search` | `text` |  |
| `security.threat_model` | Threat Modeling | Identify assets, attackers, trust boundaries, threats, and mitigations. | User asks to model risk before or during design. | User asks to patch an already identified bug. | `security` | `security`, `architect` | `security.analysis`, `reasoning.multi_step` | `json.schema_adherence` | `text` |  |
| `security.vulnerability_triage` | Vulnerability Triage | Assess vulnerability reports, severity, exploitability, and mitigation priority. | User provides a CVE, scanner finding, or suspected vulnerability. | User asks for general best practices. | `security` | `security`, `operator`, `coder` | `security.analysis` | `web.search` | `text` |  |
| `security.policy_review` | Security Policy Review | Review permissions, RBAC, access policy, or compliance controls. | User asks about authz, RBAC, scopes, permissions, or policy enforcement. | User asks for code formatting. | `security` | `security`, `legal`, `architect` | `security.analysis` | `reasoning.multi_step` | `text` |  |
| `researcher.web_research` | Web Research | Find and synthesize current external information. | The answer depends on current docs, releases, prices, laws, products, schedules, or web facts. | The answer is fully available in local repo context. | `researcher` | `researcher`, `writer` | `web.search`, `text.chat` | `citation.synthesis` | `text` | `web.search`, `http.fetch` |
| `researcher.web_research.current` | Current Web Research | Verify the latest state of fast-changing facts, releases, policies, products, or public information. | User asks for latest/current/today status or the topic is likely to have changed. | User asks for stable background knowledge only. | `researcher` | `researcher`, `analyst`, `writer` | `web.search`, `text.chat` | `citation.synthesis` | `text` | `web.search`, `http.fetch` |
| `researcher.compare_sources` | Compare Sources | Compare multiple sources, claims, or documents. | User asks for comparison, synthesis, source quality, or tradeoffs across references. | User only asks to rewrite one known text. | `researcher` | `researcher`, `writer` | `text.chat` | `citation.synthesis` | `text` | `web.search`, `http.fetch` |
| `researcher.literature_review` | Literature Review | Review papers, standards, reports, or long-form technical sources. | User asks for academic/technical source synthesis. | User asks for current breaking news only. | `researcher` | `researcher`, `analyst` | `text.chat`, `long_context` | `citation.synthesis` | `text` |  |
| `researcher.fact_check` | Fact Check | Verify a claim against sources or local evidence. | User asks whether a statement is true, current, or supported. | User asks for creative ideation. | `researcher` | `researcher`, `writer`, `analyst` | `web.search` | `citation.synthesis` | `text` |  |
| `writer.docs.write` | Documentation Writing | Write or improve documentation, guides, READMEs, or public docs. | User asks to explain, document, publish, or structure information. | User asks for implementation, debugging, or security review. | `writer` | `writer`, `coder` | `text.chat` | `code.read` | `text` |  |
| `writer.docs.public` | Public Documentation | Write public-facing docs, installation instructions, guides, or website copy. | User asks for docs intended for external users or public release. | User asks for private notes, internal plans, or implementation only. | `writer` | `writer`, `product`, `coder` | `text.chat` | `communication.user_facing` | `text` |  |
| `writer.docs.edit` | Documentation Editing | Edit existing docs for clarity, structure, consistency, and correctness. | User asks to revise, streamline, or polish documentation. | User asks to implement code behavior. | `writer` | `writer`, `coder`, `product` | `text.chat` | `code.read` | `text` |  |
| `writer.summarize` | Summarization | Condense content while preserving important points. | User asks for a summary, digest, brief, or executive overview. | User asks to make a routing decision requiring tools. | `writer` | `writer`, `researcher`, `analyst` | `text.chat` | `long_context` | `text` |  |
| `writer.release_notes` | Release Notes | Write user-facing release notes, changelogs, or announcement copy. | User asks for release notes or public-facing change summary. | User asks for legal license interpretation. | `writer` | `writer`, `product`, `coder` | `text.chat` | `code.read` | `text` |  |
| `operator.debug.startup` | Startup Debugging | Diagnose runtime, launch, environment, or process startup failures. | User reports service launch, install, process, port, auth, or environment failures. | User asks to design a new feature. | `operator` | `operator`, `coder` | `reasoning.multi_step` | `tools.command_execution` | `text` |  |
| `operator.debug.ui` | UI Runtime Debugging | Diagnose UI runtime, rendering, browser, interaction, or frontend workflow failures. | User reports broken UI behavior, rendering issues, browser errors, or failed UI workflows. | User asks only for visual design critique. | `operator` | `operator`, `tester`, `coder`, `designer` | `tools.browser_control`, `reasoning.multi_step` | `tools.command_execution` | `text` |  |
| `operator.debug.api` | API Runtime Debugging | Diagnose API, HTTP, webhook, auth, integration, or service response failures. | User reports failed API calls, bad responses, webhook failures, request/response mismatches, or endpoint integration issues. | User asks to design a new API contract from scratch. | `operator` | `operator`, `coder`, `architect`, `support` | `tools.function_calling`, `reasoning.multi_step` | `tools.command_execution` | `text` |  |
| `operator.deploy.review` | Deployment Review | Review deployment configuration, release readiness, or rollout risk. | User asks whether a deployment/release is ready. | User asks to write unrelated prose. | `operator` | `operator`, `security`, `architect` | `reasoning.multi_step` | `tools.command_execution` | `text` |  |
| `operator.incident_triage` | Incident Triage | Triage outages, regressions, alerts, logs, or production symptoms. | User reports an incident or asks for operational triage. | User asks for normal feature planning. | `operator` | `operator`, `coder`, `security` | `reasoning.multi_step` | `tools.command_execution` | `text` |  |
| `operator.config` | Runtime Configuration | Configure services, endpoints, environments, or runtime settings. | User asks to set up or change runtime configuration. | User asks for conceptual explanation only. | `operator` | `operator`, `coder` | `tools.function_calling` | `tools.command_execution` | `text` |  |
| `operator.install` | Installation | Install, configure, and verify software on a local or managed environment. | User asks to install a package, set up a runtime, configure endpoints, or verify local integration. | User asks only for written installation instructions. | `operator` | `operator`, `coder`, `support` | `tools.function_calling` | `tools.command_execution` | `text` | `package.install`, `shell.execute` |
| `analyst.compare` | Comparative Analysis | Compare options, systems, plans, models, vendors, or tradeoffs. | User asks which option is better and why. | User asks to execute a direct edit. | `analyst` | `analyst`, `architect`, `researcher` | `reasoning.multi_step` | `json.schema_adherence` | `text` |  |
| `analyst.evaluate` | Evaluation | Score or assess quality, fit, risk, or performance against criteria. | User asks for an evaluation rubric or assessment. | User asks for pure creative brainstorming. | `analyst` | `analyst`, `product`, `architect` | `reasoning.multi_step` | `json.schema_adherence` | `text` |  |
| `analyst.prioritize` | Prioritization | Rank work, risks, options, or next steps. | User asks what to do first or how to sequence work. | User asks to write code immediately. | `analyst` | `analyst`, `planner`, `product` | `reasoning.multi_step` | `json.schema_adherence` | `text` |  |
| `planner.requirements` | Requirements Definition | Convert goals into requirements, acceptance criteria, and constraints. | User asks to define requirements or scope. | User asks for a final implementation patch. | `planner` | `planner`, `product`, `architect` | `reasoning.multi_step` | `json.schema_adherence` | `text` |  |
| `planner.roadmap` | Roadmap Planning | Build phased plans, milestones, dependencies, and rollout sequencing. | User asks for a roadmap or phased implementation plan. | User asks for a code review finding list. | `planner` | `planner`, `product`, `architect` | `reasoning.multi_step` | `long_context` | `text` |  |
| `planner.roadmap.release` | Release Roadmap | Plan phased release work, readiness gates, changelog, docs, packaging, and rollout steps. | User asks for release planning, alpha/beta sequencing, or launch readiness. | User asks to publish immediately without planning. | `planner` | `planner`, `product`, `operator` | `reasoning.multi_step` | `json.schema_adherence` | `text` |  |
| `planner.decompose` | Task Decomposition | Break a goal into tasks, phases, or executable work items. | User asks to split work into steps or tickets. | User asks for source citation research. | `planner` | `planner`, `operator`, `coder` | `reasoning.multi_step` | `json.schema_adherence` | `text` |  |
| `tester.plan` | Test Plan | Design a verification strategy, test cases, and acceptance checks. | User asks how to test or verify a feature. | User asks to write production code only. | `tester` | `tester`, `coder`, `product` | `reasoning.multi_step` | `json.schema_adherence` | `text` | `filesystem.read`, `filesystem.write`, `shell.execute` |
| `tester.regression` | Regression Testing | Verify existing behavior still works after changes. | User asks to validate no regressions. | User asks to design a product strategy. | `tester` | `tester`, `coder`, `operator` | `tools.function_calling` | `tools.command_execution` | `text` | `filesystem.read`, `filesystem.write`, `shell.execute` |
| `tester.reproduce` | Reproduction Testing | Reproduce a reported issue with clear steps, observed behavior, and expected behavior. | User reports a bug and needs a reliable repro before diagnosis or fix. | User already provided a verified repro and asks for implementation. | `tester` | `tester`, `coder`, `support` | `tools.function_calling` | `tools.command_execution` | `text` | `filesystem.read`, `filesystem.write`, `shell.execute` |
| `data.query` | Data Query | Write, inspect, or explain queries over structured data. | User asks for SQL/query work or data extraction. | User asks for web research. | `data` | `data`, `analyst`, `coder` | `data.query` | `json.schema_adherence` | `text` | `database.query` |
| `data.schema.review` | Data Schema Review | Review database, event, API, or analytics schemas. | User asks whether a schema is correct, stable, or useful. | User asks to edit frontend UI. | `data` | `data`, `architect`, `analyst` | `data.schema` | `reasoning.multi_step` | `text` | `database.query` |
| `data.transform` | Data Transformation | Transform, normalize, clean, or map data between shapes. | User asks to convert data formats or clean records. | User asks for legal advice. | `data` | `data`, `coder` | `data.transform` | `json.schema_adherence` | `text` | `database.query` |
| `product.requirements` | Product Requirements | Define user-facing behavior, constraints, and acceptance criteria. | User asks what a product/feature should do. | User asks for root-cause debugging. | `product` | `product`, `planner`, `architect` | `reasoning.multi_step` | `json.schema_adherence` | `text` |  |
| `product.workflow.review` | Workflow Review | Review user workflows, ergonomics, states, or product flows. | User asks whether a user flow makes sense. | User asks to run commands. | `product` | `product`, `designer`, `writer` | `text.chat` | `reasoning.multi_step` | `text` |  |
| `product.release_notes` | Product Release Notes | Define user-facing release messaging and notable behavior changes. | User asks what should be communicated in a release from a product perspective. | User asks for a raw technical changelog only. | `product` | `product`, `writer`, `planner` | `text.chat` | `communication.user_facing` | `text` |  |
| `designer.ui.review` | UI Review | Review interface layout, hierarchy, visual polish, accessibility, or usability. | User asks whether an interface looks or feels right. | User asks for backend debugging. | `designer` | `designer`, `product`, `writer` | `vision.input`, `text.chat` | `reasoning.multi_step` | `text` |  |
| `designer.interaction` | Interaction Design | Design states, flows, controls, and interaction behavior. | User asks how a UI should behave across workflows. | User asks for legal/compliance interpretation. | `designer` | `designer`, `product`, `architect` | `text.chat` | `json.schema_adherence` | `text` |  |
| `designer.visual_direction` | Visual Direction | Define visual style, hierarchy, mood, layout direction, or asset guidance. | User asks for visual direction, composition, design polish, or creative UI treatment. | User asks for code-level bug diagnosis. | `designer` | `designer`, `creative`, `product` | `vision.input`, `text.chat` | `vision.output` | `text` |  |
| `support.triage` | Support Triage | Understand a user issue and route it to next steps. | User reports a problem and needs diagnosis or escalation. | User asks for code generation. | `support` | `support`, `operator`, `writer` | `text.chat` | `reasoning.multi_step` | `text` |  |
| `support.explain` | User Explanation | Explain a system behavior or remediation in user-facing terms. | User needs a clear support response or troubleshooting guide. | User asks for internal architecture design. | `support` | `support`, `writer`, `operator` | `text.chat` | `communication.user_facing` | `text` |  |
| `support.escalate` | Support Escalation | Prepare escalation context, severity, repro notes, and routing for another team. | User issue needs handoff to engineering, operations, security, billing, or product. | User asks for direct implementation. | `support` | `support`, `operator`, `product` | `text.chat` | `json.schema_adherence` | `text` |  |
| `legal.review` | Legal Review | Review terms, licenses, policies, or compliance-sensitive text. | User asks about license, terms, privacy, or compliance implications. | User asks for code implementation. | `legal` | `legal`, `security` | `legal.analysis` | `citation.synthesis` | `text` |  |
| `legal.compliance_check` | Compliance Check | Check whether a plan, policy, or document appears to satisfy stated compliance constraints. | User asks about compliance posture, policy fit, or required controls. | User asks for binding legal advice or jurisdiction-specific counsel. | `legal` | `legal`, `security`, `operator` | `legal.analysis` | `json.schema_adherence` | `text` |  |
| `finance.cost_estimate` | Cost Estimate | Estimate cost, budget, or pricing impact. | User asks about price, spend, ROI, or budget. | User asks for code refactoring. | `finance` | `finance`, `analyst`, `operator` | `finance.analysis` | `web.search` | `text` |  |
| `finance.compare_options` | Financial Option Comparison | Compare cost, budget, pricing, or ROI across options. | User asks which option is more cost-effective or financially practical. | User asks for non-financial technical comparison only. | `finance` | `finance`, `analyst`, `operator` | `finance.analysis`, `reasoning.multi_step` | `json.schema_adherence` | `text` |  |
| `creative.brainstorm` | Brainstorming | Generate creative options, names, concepts, or variants. | User asks for ideation or alternatives. | User asks for verified factual claims. | `creative` | `creative`, `writer`, `product` | `text.chat` | `reasoning.divergent` | `text` |  |
| `creative.copywriting` | Copywriting | Produce persuasive, brand, product, or campaign copy variants. | User asks for headlines, taglines, short-form copy, or creative wording. | User asks for factual documentation or legal text. | `creative` | `creative`, `writer`, `product` | `text.chat` | `reasoning.divergent` | `text` |  |
| `creative.storyboard` | Storyboarding | Plan a visual, narrative, product, or media sequence. | User asks for scenes, flows, visual sequence, or narrative structure. | User asks for security triage. | `creative` | `creative`, `writer`, `product` | `text.chat` | `vision.output` | `text` |  |
| `educator.tutor` | Tutoring | Teach a concept interactively with explanations, examples, and checks for understanding. | User asks to learn, study, or be taught a subject. | User asks for a final answer only without explanation. | `educator` | `educator`, `writer`, `mathematician`, `scientist` | `education.tutoring`, `text.chat` | `reasoning.multi_step` | `text` |  |
| `educator.lesson.plan` | Lesson Planning | Create a lesson, curriculum segment, study path, or learning sequence. | User asks for a lesson plan, course outline, study schedule, or learning progression. | User asks for a short factual answer. | `educator` | `educator`, `planner`, `writer` | `education.tutoring` | `json.schema_adherence` | `text` |  |
| `educator.quiz.generate` | Quiz Generation | Generate questions, answer keys, rubrics, or practice exercises. | User asks for a quiz, flashcards, drills, or assessment material. | User asks to evaluate a real candidate or employee. | `educator` | `educator`, `tester`, `writer` | `education.assessment` | `json.schema_adherence` | `text` |  |
| `educator.feedback` | Learning Feedback | Provide constructive feedback on a learner's work. | User provides an answer, essay, solution, or draft and asks for learning-oriented feedback. | User asks for employment or hiring evaluation. | `educator` | `educator`, `writer`, `mathematician` | `education.assessment`, `text.chat` | `communication.user_facing` | `text` |  |
| `translator.translate` | Translation | Translate text from one language to another while preserving meaning. | User asks to translate content. | User asks to rewrite within the same language only. | `translator` | `translator`, `writer` | `language.translation`, `text.chat` | `communication.user_facing` | `text` |  |
| `translator.localize.locale` | Localization | Adapt language, examples, formatting, idioms, and tone for a target locale. | User asks for localization, regional adaptation, or market-language fit. | User only asks for literal translation. | `translator` | `translator`, `marketer`, `writer` | `language.localization`, `text.chat` | `communication.user_facing` | `text` |  |
| `translator.review` | Translation Review | Review translated or localized content for accuracy, tone, and consistency. | User asks whether translated content is correct or natural. | User asks to design a marketing campaign. | `translator` | `translator`, `writer`, `marketer` | `language.translation` | `reasoning.multi_step` | `text` |  |
| `marketer.positioning` | Positioning | Define audience, value proposition, differentiation, and messaging. | User asks how to position a product, feature, company, or offer. | User asks for legal claims approval. | `marketer` | `marketer`, `product`, `strategist` | `marketing.analysis`, `text.chat` | `reasoning.multi_step` | `text` |  |
| `marketer.campaign.plan` | Campaign Planning | Plan campaign channels, audience, message, assets, timing, and success measures. | User asks for a marketing campaign or launch campaign plan. | User asks for technical release readiness. | `marketer` | `marketer`, `planner`, `product` | `marketing.analysis` | `json.schema_adherence` | `text` |  |
| `marketer.content.seo` | SEO Content | Plan or write content aligned with search intent and discovery. | User asks for SEO strategy, keywords, article outline, or search-optimized copy. | User needs verified legal or medical guidance. | `marketer` | `marketer`, `writer`, `researcher` | `marketing.analysis`, `web.search` | `communication.user_facing` | `text` |  |
| `marketer.copy.ad` | Ad Copy | Produce short-form ad, landing-page, or campaign copy variants. | User asks for ad copy, headlines, CTAs, or campaign variants. | User asks for factual documentation. | `marketer` | `marketer`, `creative`, `writer` | `marketing.copy`, `text.chat` | `reasoning.divergent` | `text` |  |
| `seller.discovery.plan` | Sales Discovery Planning | Prepare discovery questions, qualification criteria, and account research prompts. | User asks how to run a sales discovery call or qualify an opportunity. | User asks for generic product requirements. | `seller` | `seller`, `product`, `strategist` | `sales.analysis` | `json.schema_adherence` | `text` |  |
| `seller.outreach.write` | Sales Outreach | Write prospecting, follow-up, or account-specific outreach messages. | User asks for cold email, LinkedIn outreach, or follow-up copy. | User asks for support remediation steps. | `seller` | `seller`, `writer`, `marketer` | `sales.communication`, `text.chat` | `communication.user_facing` | `text` | `email.write` |
| `seller.proposal.enterprise` | Enterprise Proposal | Draft or review enterprise sales proposals, rollout plans, and buying-committee materials. | User asks for proposal content, mutual action plans, security/commercial positioning, or enterprise rollout language. | User asks for legal contract approval. | `seller` | `seller`, `procurement`, `security`, `legal` | `sales.analysis`, `communication.user_facing` | `json.schema_adherence` | `text` |  |
| `seller.objection.handle` | Objection Handling | Prepare responses to buyer concerns, risks, pricing objections, or adoption blockers. | User asks how to respond to a sales objection. | User asks for support troubleshooting. | `seller` | `seller`, `marketer`, `product` | `sales.communication` | `reasoning.multi_step` | `text` |  |
| `recruiter.job_description` | Job Description | Write or revise role descriptions, responsibilities, qualifications, and hiring signals. | User asks for a job description or hiring profile. | User asks for employment-law compliance review. | `recruiter` | `recruiter`, `writer`, `product` | `recruiting.analysis`, `text.chat` | `communication.user_facing` | `text` |  |
| `recruiter.interview.plan` | Interview Planning | Create interview loops, questions, rubrics, and evaluation criteria. | User asks how to interview for a role or assess skills. | User asks to make a hiring decision from protected characteristics. | `recruiter` | `recruiter`, `planner`, `educator` | `recruiting.analysis` | `json.schema_adherence` | `text` |  |
| `recruiter.candidate.screen` | Candidate Screening Support | Summarize job-relevant candidate materials against explicit criteria. | User asks to screen resumes or compare candidates against stated job requirements. | User asks to infer protected attributes or make unlawful employment decisions. | `recruiter` | `recruiter`, `analyst`, `legal` | `recruiting.analysis` | `json.schema_adherence` | `text` |  |
| `procurement.vendor.compare` | Vendor Comparison | Compare vendors against requirements, cost, risk, security, and operational fit. | User asks which vendor/tool/provider is a better fit. | User asks for pure product marketing copy. | `procurement` | `procurement`, `finance`, `security`, `analyst` | `procurement.analysis`, `finance.analysis` | `json.schema_adherence` | `text` |  |
| `procurement.rfp.write` | RFP Writing | Draft request-for-proposal questions, scoring criteria, and response templates. | User asks to create an RFP, vendor questionnaire, or procurement checklist. | User asks for implementation code. | `procurement` | `procurement`, `legal`, `security`, `writer` | `procurement.analysis` | `json.schema_adherence` | `text` |  |
| `procurement.requirements` | Purchasing Requirements | Define purchasing, security, legal, operational, and commercial requirements. | User asks what requirements to give vendors or evaluate against. | User asks for a sales pitch. | `procurement` | `procurement`, `security`, `finance`, `operator` | `procurement.analysis` | `reasoning.multi_step` | `text` |  |
| `procurement.contract.commercial` | Commercial Contract Review | Review commercial contract terms such as pricing, renewal, SLA, and termination from a business perspective. | User asks about commercial terms or vendor contract tradeoffs. | User asks for binding legal advice. | `procurement` | `procurement`, `legal`, `finance` | `procurement.analysis`, `finance.analysis` | `legal.analysis` | `text` |  |
| `coordinator.meeting.agenda` | Meeting Agenda | Create meeting agendas, prep notes, goals, and decision points. | User asks to prepare for a meeting. | User asks for deep technical implementation. | `coordinator` | `coordinator`, `planner`, `product` | `coordination.workflow` | `json.schema_adherence` | `text` | `calendar.read` |
| `coordinator.meeting.notes` | Meeting Notes | Summarize meeting notes into decisions, action items, owners, and follow-ups. | User provides transcript or notes and asks for structured meeting output. | User asks for legal transcript certification. | `coordinator` | `coordinator`, `writer`, `planner` | `coordination.workflow`, `text.chat` | `json.schema_adherence` | `text` | `calendar.read` |
| `coordinator.schedule.plan` | Scheduling Plan | Plan schedule options, sequencing, reminders, or coordination logistics. | User asks to organize timing, schedules, or calendar-style plans. | User asks for product roadmap strategy. | `coordinator` | `coordinator`, `planner`, `support` | `calendar.planning` | `json.schema_adherence` | `text` | `calendar.read` |
| `coordinator.follow_up` | Follow-Up Drafting | Draft follow-up messages, reminders, and action-item communications. | User asks for follow-up after meetings, support, sales, or project work. | User asks to make technical changes. | `coordinator` | `coordinator`, `writer`, `seller`, `support` | `communication.follow_up` | `communication.user_facing` | `text` |  |
| `knowledge.organize` | Knowledge Organization | Structure notes, docs, links, memory, or project information into a usable system. | User asks to organize information, create a knowledge base, or clean up notes. | User asks for current external research only. | `knowledge` | `knowledge`, `writer`, `researcher` | `knowledge.organization`, `text.chat` | `long_context` | `text` | `memory.read`, `vector.search` |
| `knowledge.retrieve` | Knowledge Retrieval | Find and synthesize relevant remembered, local, or indexed knowledge. | User asks to find prior notes, docs, facts, or project context. | User asks to create new code. | `knowledge` | `knowledge`, `researcher`, `support` | `knowledge.retrieval` | `citation.synthesis` | `text` | `memory.read`, `vector.search` |
| `knowledge.memory.update` | Memory Update | Decide what durable memory or knowledge-base state should be created or updated. | User asks to remember, save, update, or curate durable context. | User asks for ephemeral chat only. | `knowledge` | `knowledge`, `coordinator`, `support` | `memory.write`, `knowledge.organization` | `json.schema_adherence` | `text` | `memory.read`, `vector.search` |
| `knowledge.kb.write` | Knowledge Base Writing | Write help-center, internal KB, runbook, or reference entries. | User asks to create reusable knowledge or support documentation. | User asks for one-off creative copy. | `knowledge` | `knowledge`, `writer`, `support`, `operator` | `knowledge.organization`, `communication.user_facing` | `text.chat` | `text` | `memory.read`, `vector.search` |
| `strategist.business.plan` | Business Planning | Develop business strategy, operating model, market approach, or strategic initiative plan. | User asks for business strategy, GTM shape, or strategic planning. | User asks for technical implementation steps only. | `strategist` | `strategist`, `product`, `finance`, `marketer` | `strategy.analysis` | `reasoning.multi_step` | `text` |  |
| `strategist.market.analyze` | Market Analysis | Analyze market dynamics, segments, competitors, trends, and opportunities. | User asks about market opportunity or strategic positioning. | User asks for verified breaking news only. | `strategist` | `strategist`, `researcher`, `marketer`, `analyst` | `market.analysis` | `web.search` | `text` |  |
| `strategist.competitive.review` | Competitive Review | Compare competitors, alternatives, differentiation, and strategic risks. | User asks how something compares competitively. | User asks for simple price comparison only. | `strategist` | `strategist`, `marketer`, `analyst`, `product` | `strategy.analysis`, `market.analysis` | `json.schema_adherence` | `text` |  |
| `strategist.risk.scenario` | Scenario Planning | Explore scenarios, assumptions, risks, mitigations, and decision triggers. | User asks what could happen under different strategic assumptions. | User asks for exact forecast certainty. | `strategist` | `strategist`, `analyst`, `planner`, `finance` | `strategy.analysis`, `reasoning.multi_step` | `json.schema_adherence` | `text` |  |
| `mathematician.solve` | Math Solving | Solve a math problem with steps and final result. | User asks for calculation, proof, algebra, statistics, or quantitative solution. | User asks for financial advice rather than math. | `mathematician` | `mathematician`, `educator`, `analyst` | `math.solve` | `reasoning.multi_step` | `text` |  |
| `mathematician.verify` | Math Verification | Check a calculation, proof, derivation, or quantitative claim. | User asks whether a mathematical solution is correct. | User asks for code review. | `mathematician` | `mathematician`, `tester`, `educator` | `math.verify` | `reasoning.multi_step` | `text` |  |
| `mathematician.model` | Mathematical Modeling | Build or critique a mathematical, statistical, or optimization model. | User asks to model a process, estimate relationship, or formulate constraints. | User asks for qualitative brainstorming only. | `mathematician` | `mathematician`, `data`, `analyst`, `finance` | `math.modeling`, `reasoning.multi_step` | `json.schema_adherence` | `text` |  |
| `mathematician.explain` | Math Explanation | Explain mathematical concepts, steps, or intuition. | User asks to understand math rather than only get an answer. | User asks for non-math writing. | `mathematician` | `mathematician`, `educator`, `writer` | `math.solve`, `education.tutoring` | `communication.user_facing` | `text` |  |
| `scientist.experiment.design` | Experimental Design | Design experiments, controls, variables, measurements, and interpretation plans. | User asks how to test a scientific or empirical hypothesis. | User asks for product A/B test logistics only. | `scientist` | `scientist`, `analyst`, `planner` | `science.method`, `reasoning.multi_step` | `json.schema_adherence` | `text` |  |
| `scientist.evidence.review` | Scientific Evidence Review | Review scientific claims, evidence quality, limitations, and uncertainty. | User asks whether a claim is scientifically supported. | User asks for current product pricing. | `scientist` | `scientist`, `researcher`, `analyst` | `science.analysis`, `citation.synthesis` | `web.search` | `text` |  |
| `scientist.method.critique` | Method Critique | Critique study design, methodology, bias, confounds, and validity. | User provides a method, paper, or experiment and asks for critique. | User asks to write marketing copy. | `scientist` | `scientist`, `researcher`, `analyst` | `science.method`, `reasoning.multi_step` | `long_context` | `text` |  |
| `scientist.literature.synthesize` | Scientific Literature Synthesis | Synthesize findings across scientific or technical literature. | User asks to synthesize papers, studies, standards, or evidence. | User asks for unsupported speculation. | `scientist` | `scientist`, `researcher`, `writer` | `science.analysis`, `long_context` | `citation.synthesis` | `text` |  |
| `health.info.general` | General Health Information | Provide general, non-diagnostic health information and explain concepts. | User asks for general health education or explanations. | User asks for diagnosis, emergency care, or individualized medical treatment. | `health` | `health`, `educator`, `writer` | `health.general_info`, `text.chat` | `communication.user_facing` | `text` |  |
| `health.info.safety` | Health Safety Triage | Provide cautious safety boundaries, urgency guidance, and care-seeking prompts. | User describes potentially concerning symptoms, medication risks, or safety-sensitive health questions. | User asks for definitive diagnosis or treatment instructions. | `health` | `health`, `support` | `health.safety`, `communication.user_facing` | `reasoning.multi_step` | `text` |  |
| `health.care_navigation` | Care Navigation | Help prepare questions, organize information, or plan discussion with a clinician. | User asks how to prepare for an appointment or communicate health concerns. | User asks the assistant to replace professional care. | `health` | `health`, `coordinator`, `writer` | `health.general_info`, `coordination.workflow` | `communication.user_facing` | `text` |  |
| `health.wellness.plan` | Wellness Planning | Create general wellness, habit, or tracking plans within safe non-medical boundaries. | User asks for general routine, habit, sleep, nutrition, or exercise planning. | User has symptoms, conditions, medications, injury, pregnancy, or other high-risk context requiring professional guidance. | `health` | `health`, `planner`, `educator` | `health.general_info` | `json.schema_adherence` | `text` |  |
| `coder.dependency.update` | Dependency Update | Update package dependencies, lockfiles, or version constraints. | User asks to update packages or dependency versions. | User asks for supply-chain risk review only. | `coder` | `coder`, `security`, `operator` | `code.read`, `code.write` | `tools.command_execution` | `text` | `filesystem.read`, `filesystem.write`, `shell.execute` |
| `coder.config` | Code Configuration | Modify project, build, lint, test, or runtime configuration files. | User asks to configure code tooling or project settings. | User asks for production runtime operations only. | `coder` | `coder`, `operator` | `code.read`, `code.write` | `json.schema_adherence` | `text` | `filesystem.read`, `filesystem.write`, `shell.execute` |
| `architect.infrastructure.design` | Infrastructure Design | Design infrastructure topology, deployment units, or service boundaries. | User asks for infra architecture or environment design. | User asks to execute deployment commands. | `architect` | `architect`, `operator`, `security` | `reasoning.multi_step` | `long_context` | `text` |  |
| `architect.data_model` | Data Model Design | Design entities, schemas, data ownership, and persistence boundaries. | User asks for data model or storage architecture. | User asks for SQL query implementation only. | `architect` | `architect`, `data`, `coder` | `reasoning.multi_step`, `data.schema` | `json.schema_adherence` | `text` |  |
| `architect.integration.plan` | Integration Plan | Plan how systems, APIs, events, and services should integrate. | User asks to connect systems or design integration flow. | User asks to debug one failed API call. | `architect` | `architect`, `operator`, `coder` | `reasoning.multi_step` | `json.schema_adherence` | `text` |  |
| `architect.scalability.review` | Scalability Review | Review scalability, bottlenecks, throughput, and growth tradeoffs. | User asks whether a system will scale. | User asks for visual UI review. | `architect` | `architect`, `operator`, `data` | `reasoning.multi_step` | `long_context` | `text` |  |
| `architect.migration.strategy` | Migration Strategy | Plan migrations across systems, data stores, APIs, or platforms. | User asks how to migrate safely with stages and rollback. | User asks to edit a small file directly. | `architect` | `architect`, `coder`, `operator` | `reasoning.multi_step` | `json.schema_adherence` | `text` |  |
| `architect.adr.write` | Architecture Decision Record | Write or review ADRs and architectural decision rationale. | User asks to document a technical decision. | User asks for public marketing copy. | `architect` | `architect`, `writer`, `coder` | `reasoning.multi_step`, `text.chat` | `communication.user_facing` | `text` |  |
| `security.secrets.scan` | Secrets Scan Review | Inspect code, config, or logs for exposed secrets and credential risks. | User asks to check for secrets or credential exposure. | User asks for general documentation edits. | `security` | `security`, `coder`, `operator` | `security.analysis`, `code.read` | `tools.command_execution` | `text` |  |
| `security.auth.review` | Auth Review | Review authentication, authorization, sessions, tokens, and access flows. | User asks about auth risk or permission behavior. | User asks for non-security code style review. | `security` | `security`, `architect`, `coder` | `security.analysis` | `reasoning.multi_step` | `text` |  |
| `security.privacy.review` | Privacy Review | Review data collection, retention, sharing, and privacy-sensitive flows. | User asks about privacy risk or personal data handling. | User asks for binding legal advice. | `security` | `security`, `legal`, `architect` | `security.analysis`, `legal.analysis` | `json.schema_adherence` | `text` |  |
| `security.incident.review` | Security Incident Review | Review suspected incidents, indicators, containment, and follow-up actions. | User reports a potential security incident. | User asks for ordinary uptime triage. | `security` | `security`, `operator`, `support` | `security.analysis`, `reasoning.multi_step` | `tools.command_execution` | `text` |  |
| `security.safe_prompt.review` | Prompt Safety Review | Review prompts, tools, or agent behavior for misuse and policy risk. | User asks about AI safety, prompt abuse, or tool misuse. | User asks for creative prompt writing only. | `security` | `security`, `researcher`, `writer` | `security.analysis`, `text.chat` | `reasoning.multi_step` | `text` |  |
| `researcher.source_find` | Source Finding | Find credible sources, documents, links, or references for a topic. | User asks to find sources or references. | User asks to write from known local context only. | `researcher` | `researcher`, `writer` | `web.search`, `text.chat` | `citation.synthesis` | `text` | `web.search`, `http.fetch` |
| `researcher.timeline.build` | Timeline Building | Build a chronology of events, releases, decisions, or changes. | User asks for a timeline or history. | User asks for mathematical proof. | `researcher` | `researcher`, `analyst`, `writer` | `text.chat`, `long_context` | `citation.synthesis` | `text` |  |
| `researcher.market_scan` | Market Scan | Gather current market, vendor, competitor, or product information. | User asks for market landscape or vendor scan. | User asks for internal-only code changes. | `researcher` | `researcher`, `strategist`, `marketer` | `web.search`, `text.chat` | `citation.synthesis` | `text` |  |
| `researcher.standards_lookup` | Standards Lookup | Find relevant standards, protocols, policies, or technical references. | User asks which standard or spec applies. | User asks to draft legal terms. | `researcher` | `researcher`, `architect`, `legal` | `web.search`, `long_context` | `citation.synthesis` | `text` |  |
| `researcher.document_extract` | Document Extraction | Extract facts, claims, obligations, or details from documents. | User provides docs and asks to pull out key information. | User asks for creative ideation. | `researcher` | `researcher`, `analyst`, `legal` | `text.chat`, `long_context` | `json.schema_adherence` | `text` |  |
| `writer.email.write` | Email Writing | Draft clear emails for business, support, sales, or coordination contexts. | User asks to write an email. | User asks for SMS-length ad copy only. | `writer` | `writer`, `coordinator`, `seller`, `support` | `text.chat` | `communication.user_facing` | `text` | `email.write` |
| `writer.blog.write` | Blog Writing | Draft blog posts, articles, essays, or explanatory long-form content. | User asks for a blog or article. | User asks for terse release notes. | `writer` | `writer`, `marketer`, `researcher` | `text.chat` | `long_context` | `text` |  |
| `writer.proposal.write` | Proposal Writing | Draft proposals, narratives, scopes, or persuasive structured documents. | User asks to write a proposal or formal document. | User asks for legal contract review. | `writer` | `writer`, `seller`, `planner` | `text.chat` | `communication.user_facing` | `text` |  |
| `writer.style.rewrite` | Style Rewrite | Rewrite text for tone, clarity, audience, or style. | User asks to make text clearer or change tone. | User asks for factual verification only. | `writer` | `writer`, `translator`, `marketer` | `text.chat` | `communication.user_facing` | `text` |  |
| `writer.outline` | Outline Writing | Create structured outlines for documents, talks, articles, or plans. | User asks to structure content before writing. | User asks for code implementation. | `writer` | `writer`, `planner`, `educator` | `text.chat` | `json.schema_adherence` | `text` |  |
| `operator.monitor` | Monitoring Setup | Plan or configure monitoring, alerts, health checks, and runtime signals. | User asks to monitor a service or runtime. | User asks for product positioning. | `operator` | `operator`, `architect` | `tools.function_calling`, `reasoning.multi_step` | `tools.command_execution` | `text` |  |
| `operator.backup.restore` | Backup And Restore | Plan or execute backup, restore, recovery, or state verification work. | User asks about backup/restore or recovery procedures. | User asks for code refactoring only. | `operator` | `operator`, `data`, `security` | `tools.command_execution`, `reasoning.multi_step` | `json.schema_adherence` | `text` |  |
| `operator.release.execute` | Release Execution | Execute or coordinate release steps, validation, rollback, and post-release checks. | User asks to run or coordinate a release. | User asks for release announcement copy only. | `operator` | `operator`, `planner`, `coder` | `tools.command_execution` | `reasoning.multi_step` | `text` |  |
| `analyst.metrics.define` | Metrics Definition | Define metrics, KPIs, dimensions, and measurement logic. | User asks what to measure or how to evaluate. | User asks for visual design. | `analyst` | `analyst`, `product`, `data` | `reasoning.multi_step` | `json.schema_adherence` | `text` |  |
| `analyst.risk.assess` | Risk Assessment | Identify, score, and compare risks across options or plans. | User asks what risks matter and how severe they are. | User asks for security exploit details only. | `analyst` | `analyst`, `security`, `strategist` | `reasoning.multi_step` | `json.schema_adherence` | `text` |  |
| `analyst.root_cause` | Analytical Root Cause | Analyze non-code causes behind outcomes, incidents, or business symptoms. | User asks why a metric, process, or outcome changed. | User reports a source-code failure. | `analyst` | `analyst`, `operator`, `product` | `reasoning.multi_step` | `long_context` | `text` |  |
| `analyst.report.write` | Analysis Report | Produce a structured analytical report with findings and recommendations. | User asks for an analysis write-up. | User asks for a short creative slogan. | `analyst` | `analyst`, `writer`, `strategist` | `reasoning.multi_step`, `text.chat` | `json.schema_adherence` | `text` |  |
| `analyst.data_interpret` | Data Interpretation | Interpret charts, tables, metrics, or experiment results. | User asks what data means. | User asks to transform raw data formats only. | `analyst` | `analyst`, `data`, `scientist` | `reasoning.multi_step`, `data.query` | `text.chat` | `text` |  |
| `analyst.decision_matrix` | Decision Matrix | Create a weighted decision matrix or scoring rubric. | User asks to choose among options with criteria. | User asks for free-form brainstorming. | `analyst` | `analyst`, `planner`, `procurement` | `reasoning.multi_step` | `json.schema_adherence` | `text` |  |
| `analyst.trend.analyze` | Trend Analysis | Analyze trends, changes, seasonality, or directional movement. | User asks how something is changing over time. | User asks for current facts only. | `analyst` | `analyst`, `researcher`, `data` | `reasoning.multi_step` | `web.search` | `text` |  |
| `planner.milestone` | Milestone Planning | Define milestones, gates, sequencing, and completion criteria. | User asks for milestones or phased delivery. | User asks to implement immediately. | `planner` | `planner`, `product`, `operator` | `reasoning.multi_step` | `json.schema_adherence` | `text` |  |
| `planner.sprint.plan` | Sprint Planning | Plan sprint scope, backlog slices, and delivery sequencing. | User asks for sprint or iteration planning. | User asks for long-term strategy only. | `planner` | `planner`, `coder`, `product` | `reasoning.multi_step` | `json.schema_adherence` | `text` |  |
| `planner.acceptance.criteria` | Acceptance Criteria | Write acceptance criteria and verifiable completion checks. | User asks what must be true for work to be done. | User asks for code review only. | `planner` | `planner`, `tester`, `product` | `reasoning.multi_step` | `json.schema_adherence` | `text` |  |
| `planner.rollout` | Rollout Planning | Plan rollout stages, risks, communications, and rollback points. | User asks how to roll something out. | User asks for a single announcement. | `planner` | `planner`, `operator`, `product` | `reasoning.multi_step` | `json.schema_adherence` | `text` |  |
| `planner.dependency.map` | Dependency Mapping | Map prerequisites, blockers, owners, and sequencing dependencies. | User asks what depends on what. | User asks for creative copy. | `planner` | `planner`, `architect`, `coordinator` | `reasoning.multi_step` | `json.schema_adherence` | `text` |  |
| `planner.resource.plan` | Resource Planning | Estimate effort, staffing, ownership, and resource needs. | User asks what resources are needed. | User asks for exact budget accounting. | `planner` | `planner`, `finance`, `coordinator` | `reasoning.multi_step` | `json.schema_adherence` | `text` | `web.search`, `http.fetch` |
| `tester.unit.plan` | Unit Test Planning | Design unit test cases, boundaries, and assertions. | User asks how to unit test behavior. | User asks for browser E2E validation. | `tester` | `tester`, `coder` | `reasoning.multi_step`, `code.read` | `json.schema_adherence` | `text` | `filesystem.read`, `filesystem.write`, `shell.execute` |
| `tester.integration.plan` | Integration Test Planning | Design integration tests across services, APIs, or components. | User asks how to test integrations. | User asks for isolated unit tests only. | `tester` | `tester`, `coder`, `operator` | `reasoning.multi_step` | `tools.function_calling` | `text` | `filesystem.read`, `filesystem.write`, `shell.execute` |
| `tester.accessibility` | Accessibility Testing | Verify accessibility expectations for UI, content, and interaction. | User asks for accessibility checks. | User asks for backend performance only. | `tester` | `tester`, `designer`, `product` | `vision.input`, `text.chat` | `json.schema_adherence` | `text` | `filesystem.read`, `filesystem.write`, `shell.execute` |
| `tester.performance` | Performance Testing | Plan or evaluate performance, load, latency, and throughput tests. | User asks to test performance. | User asks for UI visual polish. | `tester` | `tester`, `operator`, `architect` | `tools.command_execution`, `reasoning.multi_step` | `json.schema_adherence` | `text` | `filesystem.read`, `filesystem.write`, `shell.execute` |
| `tester.security` | Security Testing | Plan or execute security-oriented validation checks. | User asks how to test security behavior. | User asks for legal policy review. | `tester` | `tester`, `security`, `coder` | `security.analysis`, `tools.function_calling` | `reasoning.multi_step` | `text` | `filesystem.read`, `filesystem.write`, `shell.execute` |
| `tester.acceptance` | Acceptance Testing | Verify implementation against acceptance criteria and user outcomes. | User asks to validate readiness against requirements. | User asks for implementation only. | `tester` | `tester`, `product`, `planner` | `reasoning.multi_step` | `json.schema_adherence` | `text` | `filesystem.read`, `filesystem.write`, `shell.execute` |
| `data.analyze` | Data Analysis | Analyze structured data for patterns, summaries, and conclusions. | User asks what a dataset shows. | User asks for general web research. | `data` | `data`, `analyst` | `data.query`, `reasoning.multi_step` | `json.schema_adherence` | `text` | `database.query` |
| `data.visualize` | Data Visualization | Plan charts, tables, or visual summaries for data. | User asks how to visualize data. | User asks for illustrative creative art. | `data` | `data`, `analyst`, `designer` | `data.query`, `vision.output` | `json.schema_adherence` | `text` | `database.query` |
| `data.validate` | Data Validation | Validate data quality, constraints, completeness, and anomalies. | User asks whether data is correct or clean. | User asks for schema design only. | `data` | `data`, `tester`, `analyst` | `data.query`, `data.schema` | `json.schema_adherence` | `text` | `database.query` |
| `data.extract` | Data Extraction | Extract structured data from text, files, tables, or documents. | User asks to pull fields or records from content. | User asks for narrative summary only. | `data` | `data`, `researcher` | `data.transform`, `text.chat` | `json.schema_adherence` | `text` | `database.query` |
| `data.join` | Data Joining | Combine datasets, keys, records, or tables into a coherent shape. | User asks to merge or join data. | User asks for non-data writing. | `data` | `data`, `coder` | `data.query`, `data.transform` | `json.schema_adherence` | `text` | `database.query` |
| `data.quality.audit` | Data Quality Audit | Audit quality, lineage, anomalies, duplication, and fitness for use. | User asks for data quality review. | User asks for security audit only. | `data` | `data`, `analyst`, `tester` | `data.query`, `reasoning.multi_step` | `json.schema_adherence` | `text` | `database.query` |
| `data.metric.define` | Metric Definition | Define metrics, dimensions, calculations, and caveats. | User asks to define a metric or analytics logic. | User asks for business strategy only. | `data` | `data`, `analyst`, `product` | `data.query`, `reasoning.multi_step` | `json.schema_adherence` | `text` | `database.query` |
| `product.spec.write` | Product Spec Writing | Write product specs with behavior, states, and constraints. | User asks for a feature spec. | User asks for implementation code only. | `product` | `product`, `planner`, `designer` | `reasoning.multi_step`, `text.chat` | `json.schema_adherence` | `text` |  |
| `product.user_story` | User Story Writing | Write user stories, scenarios, and user value statements. | User asks for user stories. | User asks for legal terms. | `product` | `product`, `writer`, `planner` | `text.chat` | `communication.user_facing` | `text` |  |
| `product.acceptance` | Product Acceptance | Define acceptance criteria from a product perspective. | User asks what behavior must be accepted. | User asks for technical test implementation. | `product` | `product`, `planner`, `tester` | `reasoning.multi_step` | `json.schema_adherence` | `text` |  |
| `product.prd.write` | PRD Writing | Write product requirements documents and decision context. | User asks for a PRD. | User asks for marketing launch copy only. | `product` | `product`, `writer`, `strategist` | `reasoning.multi_step`, `text.chat` | `long_context` | `text` |  |
| `product.feature.prioritize` | Feature Prioritization | Prioritize product features by value, cost, risk, and evidence. | User asks which features to build first. | User asks for code-level sequencing only. | `product` | `product`, `analyst`, `planner` | `reasoning.multi_step` | `json.schema_adherence` | `text` |  |
| `product.feedback.synthesize` | Feedback Synthesis | Synthesize user feedback, themes, pain points, and opportunities. | User asks what feedback means. | User asks for scientific evidence review. | `product` | `product`, `analyst`, `researcher` | `text.chat`, `long_context` | `json.schema_adherence` | `text` |  |
| `product.launch.readiness` | Launch Readiness | Assess product readiness, blockers, messaging, and rollout risk. | User asks whether a feature is ready to launch. | User asks to execute deployment steps. | `product` | `product`, `planner`, `operator` | `reasoning.multi_step` | `json.schema_adherence` | `text` |  |
| `designer.prototype` | Prototype Design | Design prototype structure, screens, or flows. | User asks for a prototype or mock flow. | User asks for backend architecture only. | `designer` | `designer`, `product`, `creative` | `text.chat`, `vision.output` | `json.schema_adherence` | `text` |  |
| `designer.design_system` | Design System Work | Define or review components, tokens, states, and visual rules. | User asks for design system guidance. | User asks for database schema only. | `designer` | `designer`, `architect`, `product` | `text.chat`, `vision.input` | `json.schema_adherence` | `text` |  |
| `designer.accessibility.review` | Accessibility Review | Review UI accessibility, contrast, semantics, and interaction clarity. | User asks whether UI is accessible. | User asks for legal accessibility compliance only. | `designer` | `designer`, `tester`, `product` | `vision.input`, `text.chat` | `reasoning.multi_step` | `text` |  |
| `designer.content.layout` | Content Layout | Design page structure, information hierarchy, and content placement. | User asks how to lay out content. | User asks for copywriting only. | `designer` | `designer`, `writer`, `product` | `vision.input`, `text.chat` | `vision.output` | `text` |  |
| `designer.usability.test` | Usability Test Planning | Plan usability tests, tasks, observations, and evaluation criteria. | User asks how to test usability. | User asks for automated unit tests. | `designer` | `designer`, `tester`, `product` | `text.chat`, `reasoning.multi_step` | `json.schema_adherence` | `text` |  |
| `designer.mobile.responsive` | Responsive Design | Review or design responsive and mobile UI behavior. | User asks how UI should adapt to screen sizes. | User asks for server scaling review. | `designer` | `designer`, `coder`, `product` | `vision.input`, `text.chat` | `reasoning.multi_step` | `text` |  |
| `designer.visual.qa` | Visual QA | Inspect visual implementation for polish, overlap, spacing, and hierarchy. | User asks whether UI rendering looks correct. | User asks for product-market fit. | `designer` | `designer`, `tester`, `coder` | `vision.input`, `text.chat` | `tools.browser_control` | `text` |  |
| `support.ticket.reply` | Support Ticket Reply | Draft a response to a user support issue. | User asks to respond to a customer or support ticket. | User asks for internal-only root cause analysis. | `support` | `support`, `writer` | `text.chat`, `communication.user_facing` | `reasoning.multi_step` | `text` |  |
| `support.runbook.write` | Support Runbook | Write troubleshooting runbooks and remediation steps. | User asks to create support procedures. | User asks for legal policy. | `support` | `support`, `operator`, `knowledge` | `communication.user_facing`, `knowledge.organization` | `json.schema_adherence` | `text` |  |
| `support.issue.reproduce` | Support Reproduction | Convert a user issue into reproducible steps and expected behavior. | User reports an issue needing repro. | User asks for direct product strategy. | `support` | `support`, `tester`, `operator` | `text.chat`, `coordination.workflow` | `json.schema_adherence` | `text` |  |
| `support.knowledge_base.suggest` | Support KB Suggestion | Suggest or draft reusable knowledge-base entries from support issues. | User asks to turn support learnings into KB content. | User asks for one-off sales copy. | `support` | `support`, `knowledge`, `writer` | `communication.user_facing`, `knowledge.organization` | `text.chat` | `text` |  |
| `support.status.update` | Support Status Update | Draft clear incident or issue status updates for users. | User asks to communicate issue status. | User asks for internal-only logs. | `support` | `support`, `operator`, `writer` | `communication.user_facing` | `text.chat` | `text` |  |
| `support.customer.apology` | Customer Apology | Draft empathetic apologies, explanations, and next steps. | User asks for apology or customer-facing remediation language. | User asks for technical incident analysis only. | `support` | `support`, `writer` | `communication.user_facing` | `text.chat` | `text` |  |
| `support.faq.write` | FAQ Writing | Write FAQs, troubleshooting answers, and support snippets. | User asks for reusable support Q&A. | User asks for legal disclosure. | `support` | `support`, `writer`, `knowledge` | `communication.user_facing`, `text.chat` | `knowledge.organization` | `text` |  |
| `legal.privacy.review` | Privacy Legal Review | Review privacy terms, data processing, notices, or user rights text. | User asks for privacy legal review. | User asks for security implementation only. | `legal` | `legal`, `security` | `legal.analysis` | `citation.synthesis` | `text` |  |
| `legal.terms.review` | Terms Review | Review terms of service, acceptable use, or contract language. | User asks to review terms or policy text. | User asks for product copy. | `legal` | `legal`, `writer` | `legal.analysis` | `long_context` | `text` |  |
| `legal.license.review` | License Review | Review software licenses, obligations, compatibility, or notices. | User asks about open-source licensing. | User asks to update dependencies directly. | `legal` | `legal`, `security`, `coder` | `legal.analysis`, `code.read` | `citation.synthesis` | `text` |  |
| `legal.contract.summarize` | Contract Summary | Summarize contract clauses, obligations, risks, and open questions. | User provides contract text and asks for summary. | User asks for binding legal advice. | `legal` | `legal`, `procurement`, `finance` | `legal.analysis`, `long_context` | `json.schema_adherence` | `text` |  |
| `legal.risk.issue_spot` | Legal Issue Spotting | Identify legal-sensitive issues, risks, and questions for counsel. | User asks what legal issues may exist. | User asks for final legal advice. | `legal` | `legal`, `security`, `procurement` | `legal.analysis`, `reasoning.multi_step` | `json.schema_adherence` | `text` |  |
| `legal.policy.draft` | Policy Drafting | Draft internal or public policy language for review. | User asks to draft policy text. | User asks for code implementation. | `legal` | `legal`, `writer`, `security` | `legal.analysis`, `text.chat` | `communication.user_facing` | `text` |  |
| `legal.retention.review` | Retention Review | Review retention, deletion, audit, or records-management implications. | User asks about data retention or deletion policy. | User asks for database query writing. | `legal` | `legal`, `data`, `security` | `legal.analysis`, `data.schema` | `json.schema_adherence` | `text` |  |
| `legal.accessibility.compliance` | Accessibility Compliance | Review accessibility obligations or compliance-oriented text. | User asks about accessibility compliance. | User asks for UI visual polish only. | `legal` | `legal`, `designer`, `tester` | `legal.analysis` | `citation.synthesis` | `text` |  |
| `finance.invoice.review` | Invoice Review | Review invoices, charges, billing details, and anomalies. | User asks to inspect an invoice or bill. | User asks for tax advice. | `finance` | `finance`, `procurement` | `finance.analysis` | `json.schema_adherence` | `text` |  |
| `finance.budget.plan` | Budget Planning | Plan budget allocations, constraints, and spend categories. | User asks to plan a budget. | User asks for exact accounting treatment. | `finance` | `finance`, `planner`, `strategist` | `finance.analysis`, `reasoning.multi_step` | `json.schema_adherence` | `text` |  |
| `finance.forecast` | Financial Forecast | Forecast cost, spend, revenue, or usage under assumptions. | User asks for financial forecasting. | User asks for guaranteed financial prediction. | `finance` | `finance`, `analyst`, `strategist` | `finance.analysis`, `reasoning.multi_step` | `json.schema_adherence` | `text` |  |
| `finance.unit_economics` | Unit Economics | Analyze margins, unit costs, payback, or per-user economics. | User asks about unit economics. | User asks for engineering architecture. | `finance` | `finance`, `strategist`, `analyst` | `finance.analysis` | `json.schema_adherence` | `text` |  |
| `finance.pricing.model` | Pricing Model | Build or critique pricing structures and assumptions. | User asks how to price something. | User asks for sales outreach copy only. | `finance` | `finance`, `strategist`, `seller` | `finance.analysis`, `reasoning.multi_step` | `json.schema_adherence` | `text` |  |
| `finance.variance.analyze` | Variance Analysis | Analyze actual vs expected cost, budget, or revenue. | User asks why financial numbers changed. | User asks for vendor feature comparison only. | `finance` | `finance`, `analyst`, `data` | `finance.analysis`, `data.query` | `json.schema_adherence` | `text` |  |
| `finance.procurement.cost` | Procurement Cost Analysis | Analyze purchasing, vendor, or contract cost implications. | User asks about procurement cost tradeoffs. | User asks for legal contract approval. | `finance` | `finance`, `procurement` | `finance.analysis`, `procurement.analysis` | `json.schema_adherence` | `text` |  |
| `finance.roi.calculate` | ROI Calculation | Calculate or estimate return on investment and payback. | User asks for ROI or payback estimate. | User asks for non-financial prioritization only. | `finance` | `finance`, `analyst`, `strategist` | `finance.analysis`, `math.solve` | `json.schema_adherence` | `text` |  |
| `creative.name.generate` | Name Generation | Generate names for products, features, projects, or campaigns. | User asks for naming ideas. | User asks for legal trademark clearance. | `creative` | `creative`, `marketer`, `product` | `text.chat` | `reasoning.divergent` | `text` |  |
| `creative.concept.develop` | Concept Development | Develop creative concepts, themes, or directions. | User asks to develop an idea or concept. | User asks for factual verification. | `creative` | `creative`, `designer`, `marketer` | `text.chat` | `reasoning.divergent` | `text` |  |
| `creative.script.write` | Script Writing | Write scripts for video, audio, demos, or narrative scenes. | User asks for script or scene dialogue. | User asks for legal policy review. | `creative` | `creative`, `writer` | `text.chat` | `vision.output` | `text` |  |
| `creative.brand.voice` | Brand Voice | Define or apply brand voice, tone, and language style. | User asks for voice or tone direction. | User asks for literal translation only. | `creative` | `creative`, `marketer`, `writer` | `text.chat`, `marketing.copy` | `communication.user_facing` | `text` |  |
| `creative.visual.prompt` | Visual Prompting | Write prompts or briefs for visual generation or visual direction. | User asks for image prompt or visual creative brief. | User asks to inspect existing UI only. | `creative` | `creative`, `designer` | `vision.output`, `text.chat` | `reasoning.divergent` | `text` |  |
| `creative.tagline` | Tagline Writing | Generate concise taglines, slogans, and campaign lines. | User asks for taglines or slogans. | User asks for source-cited research. | `creative` | `creative`, `marketer`, `writer` | `marketing.copy`, `text.chat` | `reasoning.divergent` | `text` |  |
| `creative.social.post` | Social Post Writing | Draft social posts, captions, and short creative variants. | User asks for social media copy. | User asks for documentation. | `creative` | `creative`, `marketer`, `writer` | `text.chat`, `marketing.copy` | `communication.user_facing` | `text` |  |
| `educator.curriculum.design` | Curriculum Design | Design curriculum structure, modules, outcomes, and sequencing. | User asks to design a course or curriculum. | User asks for one answer only. | `educator` | `educator`, `planner` | `education.tutoring`, `reasoning.multi_step` | `json.schema_adherence` | `text` |  |
| `educator.study.plan` | Study Plan | Create study plans, schedules, practice progression, and review cadence. | User asks how to study a subject. | User asks for business roadmap. | `educator` | `educator`, `planner`, `coordinator` | `education.tutoring`, `calendar.planning` | `json.schema_adherence` | `text` |  |
| `educator.example.generate` | Learning Examples | Generate examples, analogies, worked examples, or practice cases. | User asks for examples to understand a topic. | User asks for verified sources only. | `educator` | `educator`, `writer` | `education.tutoring`, `text.chat` | `communication.user_facing` | `text` |  |
| `educator.rubric.create` | Rubric Creation | Create grading rubrics, criteria, and scoring guidance. | User asks for a rubric. | User asks to evaluate a job candidate. | `educator` | `educator`, `tester`, `recruiter` | `education.assessment` | `json.schema_adherence` | `text` |  |
| `educator.concept.explain` | Concept Explanation | Explain concepts at an appropriate learner level. | User asks to understand a concept. | User asks for professional medical advice. | `educator` | `educator`, `writer` | `education.tutoring`, `text.chat` | `communication.user_facing` | `text` |  |
| `educator.practice.review` | Practice Review | Review practice answers and suggest improvement steps. | User submits practice work for feedback. | User asks for hiring decision. | `educator` | `educator`, `mathematician`, `writer` | `education.assessment`, `communication.user_facing` | `reasoning.multi_step` | `text` |  |
| `translator.tone.adapt` | Tone Adaptation | Adapt translated or original text to a tone or audience. | User asks to make text more formal, casual, polite, or local. | User asks for factual source comparison. | `translator` | `translator`, `writer` | `language.localization`, `text.chat` | `communication.user_facing` | `text` |  |
| `translator.glossary.create` | Glossary Creation | Create or maintain bilingual/multilingual terminology lists. | User asks for glossary or term consistency. | User asks for marketing positioning only. | `translator` | `translator`, `knowledge` | `language.translation` | `json.schema_adherence` | `text` |  |
| `translator.subtitles.translate` | Subtitle Translation | Translate subtitles, captions, or timed dialogue. | User asks to translate subtitles or captions. | User asks for audio transcription itself. | `translator` | `translator`, `writer` | `language.translation`, `text.chat` | `communication.user_facing` | `text` |  |
| `translator.technical.translate` | Technical Translation | Translate technical docs, UI strings, or implementation text. | User asks to translate technical material. | User asks to design the system. | `translator` | `translator`, `coder`, `writer` | `language.translation`, `code.read` | `communication.user_facing` | `text` |  |
| `translator.back_translate` | Back Translation | Translate content back to check meaning preservation. | User asks to validate translation fidelity. | User asks for new creative copy. | `translator` | `translator`, `writer` | `language.translation` | `reasoning.multi_step` | `text` |  |
| `translator.locale.review` | Locale Review | Review locale-specific wording, formats, and cultural fit. | User asks if localized content works for a locale. | User asks for literal translation only. | `translator` | `translator`, `marketer` | `language.localization` | `communication.user_facing` | `text` |  |
| `translator.multilingual.reply` | Multilingual Reply | Draft replies in a target language for support, sales, or coordination. | User asks to respond in another language. | User asks for legal certification. | `translator` | `translator`, `support`, `seller` | `language.translation`, `communication.user_facing` | `text.chat` | `text` |  |
| `marketer.audience.research` | Audience Research | Research or define target audiences, segments, and needs. | User asks who the audience is. | User asks for scientific literature review. | `marketer` | `marketer`, `researcher`, `strategist` | `marketing.analysis`, `web.search` | `json.schema_adherence` | `text` |  |
| `marketer.email.sequence` | Marketing Email Sequence | Draft nurture, launch, or campaign email sequences. | User asks for marketing email sequence. | User asks for personal support ticket response. | `marketer` | `marketer`, `writer`, `seller` | `marketing.copy`, `text.chat` | `communication.user_facing` | `text` | `email.write` |
| `marketer.landing_page.copy` | Landing Page Copy | Write or revise landing page messaging and conversion copy. | User asks for landing page copy. | User asks for product spec only. | `marketer` | `marketer`, `writer`, `designer` | `marketing.copy`, `text.chat` | `communication.user_facing` | `text` |  |
| `marketer.social.plan` | Social Marketing Plan | Plan social channels, posts, cadence, and campaign themes. | User asks for a social media plan. | User asks for one social post only. | `marketer` | `marketer`, `creative`, `planner` | `marketing.analysis` | `json.schema_adherence` | `text` |  |
| `marketer.messaging.review` | Messaging Review | Review messaging for clarity, differentiation, and audience fit. | User asks whether messaging works. | User asks for legal claims approval. | `marketer` | `marketer`, `product`, `writer` | `marketing.analysis`, `text.chat` | `reasoning.multi_step` | `text` |  |
| `marketer.launch.plan` | Marketing Launch Plan | Plan marketing launch messaging, channels, and readiness. | User asks for launch marketing plan. | User asks for deployment execution. | `marketer` | `marketer`, `product`, `planner` | `marketing.analysis` | `json.schema_adherence` | `text` |  |
| `seller.account.plan` | Account Plan | Plan account strategy, stakeholders, risks, and next steps. | User asks for sales account planning. | User asks for general market strategy only. | `seller` | `seller`, `strategist` | `sales.analysis` | `json.schema_adherence` | `text` |  |
| `seller.demo.script` | Demo Script | Write product demo scripts and discovery-aligned walkthroughs. | User asks for demo talk track. | User asks for technical test plan. | `seller` | `seller`, `product`, `writer` | `sales.communication`, `text.chat` | `communication.user_facing` | `text` |  |
| `seller.follow_up.write` | Sales Follow-Up | Draft sales follow-up notes after calls, demos, or objections. | User asks for follow-up sales message. | User asks for support apology only. | `seller` | `seller`, `coordinator`, `writer` | `sales.communication`, `communication.follow_up` | `text.chat` | `text` |  |
| `seller.competitor.battlecard` | Competitor Battlecard | Create competitive sales positioning and objection responses. | User asks for a battlecard. | User asks for unbiased academic comparison only. | `seller` | `seller`, `marketer`, `strategist` | `sales.analysis`, `market.analysis` | `json.schema_adherence` | `text` |  |
| `seller.call.summary` | Sales Call Summary | Summarize sales calls into needs, risks, next steps, and owners. | User provides sales notes or transcript. | User asks for legal contract summary. | `seller` | `seller`, `coordinator`, `support` | `sales.analysis`, `coordination.workflow` | `json.schema_adherence` | `text` |  |
| `seller.mutual_action_plan` | Mutual Action Plan | Create shared buyer/seller action plans, timelines, and owners. | User asks for mutual action plan or close plan. | User asks for project sprint plan. | `seller` | `seller`, `planner`, `procurement` | `sales.analysis`, `coordination.workflow` | `json.schema_adherence` | `text` |  |
| `recruiter.sourcing.message` | Sourcing Message | Draft candidate outreach and sourcing messages. | User asks for recruiting outreach. | User asks for sales prospecting. | `recruiter` | `recruiter`, `writer` | `recruiting.analysis`, `communication.user_facing` | `text.chat` | `text` |  |
| `recruiter.scorecard.create` | Scorecard Creation | Create hiring scorecards, competencies, and evaluation criteria. | User asks for a hiring scorecard. | User asks for learner quiz rubric. | `recruiter` | `recruiter`, `planner` | `recruiting.analysis` | `json.schema_adherence` | `text` |  |
| `recruiter.interview.feedback` | Interview Feedback | Structure interview notes and job-relevant feedback. | User asks to write interview feedback. | User asks to infer protected attributes. | `recruiter` | `recruiter`, `writer`, `legal` | `recruiting.analysis`, `text.chat` | `json.schema_adherence` | `text` |  |
| `recruiter.offer.prepare` | Offer Preparation | Prepare offer discussion points, constraints, and candidate communication. | User asks for offer preparation. | User asks for payroll/legal final approval. | `recruiter` | `recruiter`, `finance`, `writer` | `recruiting.analysis`, `communication.user_facing` | `json.schema_adherence` | `text` |  |
| `recruiter.pipeline.update` | Pipeline Update | Summarize hiring pipeline status, blockers, and next steps. | User asks for recruiting pipeline update. | User asks for sales pipeline update. | `recruiter` | `recruiter`, `coordinator` | `recruiting.analysis`, `coordination.workflow` | `json.schema_adherence` | `text` |  |
| `recruiter.role.intake` | Role Intake | Define hiring role intake questions, requirements, and constraints. | User asks how to scope a role opening. | User asks for job ad copy only. | `recruiter` | `recruiter`, `product`, `planner` | `recruiting.analysis` | `json.schema_adherence` | `text` |  |
| `recruiter.candidate.compare` | Candidate Comparison Support | Compare candidates against explicit job criteria. | User asks to compare candidate materials using a rubric. | User asks for unlawful or protected-class inference. | `recruiter` | `recruiter`, `analyst`, `legal` | `recruiting.analysis`, `reasoning.multi_step` | `json.schema_adherence` | `text` |  |
| `procurement.security.questionnaire` | Security Questionnaire | Draft or review vendor security questionnaire content. | User asks for security questionnaire support. | User asks for internal security incident response. | `procurement` | `procurement`, `security` | `procurement.analysis`, `security.analysis` | `json.schema_adherence` | `text` |  |
| `procurement.vendor.scorecard` | Vendor Scorecard | Build vendor scoring criteria, weights, and summaries. | User asks for vendor scorecard. | User asks for marketing comparison. | `procurement` | `procurement`, `analyst`, `finance` | `procurement.analysis` | `json.schema_adherence` | `text` |  |
| `procurement.renewal.review` | Renewal Review | Review renewal timing, pricing, usage, risk, and negotiation points. | User asks whether to renew a vendor. | User asks for legal final approval. | `procurement` | `procurement`, `finance`, `legal` | `procurement.analysis`, `finance.analysis` | `reasoning.multi_step` | `text` |  |
| `procurement.sla.review` | SLA Review | Review service levels, support terms, penalties, and operational fit. | User asks about SLA implications. | User asks for uptime incident triage. | `procurement` | `procurement`, `operator`, `legal` | `procurement.analysis`, `legal.analysis` | `json.schema_adherence` | `text` |  |
| `procurement.negotiation.plan` | Negotiation Plan | Prepare vendor negotiation strategy, asks, and fallback positions. | User asks how to negotiate vendor terms. | User asks for sales objection handling. | `procurement` | `procurement`, `finance`, `seller` | `procurement.analysis`, `finance.analysis` | `reasoning.multi_step` | `text` |  |
| `procurement.purchase.justification` | Purchase Justification | Draft justification for purchase, renewal, or vendor selection. | User asks to justify buying something. | User asks for implementation code. | `procurement` | `procurement`, `finance`, `writer` | `procurement.analysis`, `communication.user_facing` | `json.schema_adherence` | `text` |  |
| `coordinator.task.plan` | Task Planning | Organize tasks, owners, deadlines, and dependencies. | User asks to organize work into tasks. | User asks for deep architecture. | `coordinator` | `coordinator`, `planner` | `coordination.workflow` | `json.schema_adherence` | `text` |  |
| `coordinator.inbox.triage` | Inbox Triage | Triage messages, requests, priorities, and responses. | User asks to sort or prioritize inbox-like items. | User asks for legal review. | `coordinator` | `coordinator`, `support` | `coordination.workflow`, `text.chat` | `json.schema_adherence` | `text` |  |
| `coordinator.decision.log` | Decision Log | Create or update decision logs, owners, and rationale. | User asks to record decisions. | User asks for creative naming. | `coordinator` | `coordinator`, `knowledge`, `planner` | `coordination.workflow`, `knowledge.organization` | `json.schema_adherence` | `text` |  |
| `coordinator.project.status` | Project Status | Draft project status updates, risks, and next steps. | User asks for status update. | User asks for formal financial forecast. | `coordinator` | `coordinator`, `planner`, `writer` | `coordination.workflow`, `communication.user_facing` | `json.schema_adherence` | `text` |  |
| `coordinator.reminder.plan` | Reminder Planning | Plan reminders, follow-ups, and timing. | User asks to remember or schedule follow-ups. | User asks for durable memory update only. | `coordinator` | `coordinator`, `knowledge` | `calendar.planning`, `communication.follow_up` | `json.schema_adherence` | `text` |  |
| `coordinator.handoff.prepare` | Handoff Preparation | Prepare handoff notes, context, decisions, and open items. | User asks to hand work to another person or team. | User asks for public release notes. | `coordinator` | `coordinator`, `support`, `operator` | `coordination.workflow`, `communication.user_facing` | `long_context` | `text` |  |
| `knowledge.note.summarize` | Note Summarization | Summarize notes into reusable facts, decisions, and follow-ups. | User provides notes for organization. | User asks for current web facts. | `knowledge` | `knowledge`, `writer` | `knowledge.organization`, `text.chat` | `json.schema_adherence` | `text` | `memory.read`, `vector.search` |
| `knowledge.taxonomy.design` | Knowledge Taxonomy Design | Design categories, tags, and organization for knowledge systems. | User asks how to organize a knowledge base. | User asks for runtime taxonomy implementation. | `knowledge` | `knowledge`, `architect` | `knowledge.organization`, `reasoning.multi_step` | `json.schema_adherence` | `text` | `memory.read`, `vector.search` |
| `knowledge.link.map` | Link Mapping | Map relationships between docs, notes, concepts, or references. | User asks how knowledge items relate. | User asks for vendor pricing. | `knowledge` | `knowledge`, `researcher` | `knowledge.organization`, `long_context` | `json.schema_adherence` | `text` | `memory.read`, `vector.search` |
| `knowledge.runbook.update` | Runbook Update | Update runbooks, operating procedures, and durable instructions. | User asks to update reusable operational knowledge. | User asks for ephemeral explanation only. | `knowledge` | `knowledge`, `operator`, `support` | `knowledge.organization`, `communication.user_facing` | `text.chat` | `text` | `memory.read`, `vector.search` |
| `knowledge.archive.clean` | Archive Cleanup | Clean, deduplicate, or organize old knowledge records. | User asks to clean a knowledge archive. | User asks for legal retention decision. | `knowledge` | `knowledge`, `coordinator` | `knowledge.organization` | `json.schema_adherence` | `text` | `memory.read`, `vector.search` |
| `knowledge.context.brief` | Context Brief | Create concise context briefs for projects, users, or teams. | User asks to brief someone on context. | User asks for raw data transformation. | `knowledge` | `knowledge`, `writer`, `coordinator` | `knowledge.retrieval`, `text.chat` | `long_context` | `text` | `memory.read`, `vector.search` |
| `strategist.swot` | SWOT Analysis | Analyze strengths, weaknesses, opportunities, and threats. | User asks for SWOT or strategic situation analysis. | User asks for code review. | `strategist` | `strategist`, `analyst` | `strategy.analysis` | `json.schema_adherence` | `text` |  |
| `strategist.okr.define` | OKR Definition | Define objectives, key results, initiatives, and measures. | User asks for OKRs or strategic goals. | User asks for sprint task details only. | `strategist` | `strategist`, `planner`, `product` | `strategy.analysis`, `reasoning.multi_step` | `json.schema_adherence` | `text` |  |
| `strategist.board.brief` | Board Brief | Prepare board or executive strategy briefs. | User asks for executive or board-level summary. | User asks for casual social post. | `strategist` | `strategist`, `writer`, `finance` | `strategy.analysis`, `text.chat` | `communication.user_facing` | `text` |  |
| `strategist.operating.model` | Operating Model | Design organizational operating models, responsibilities, and cadence. | User asks how an organization should operate. | User asks for database schema. | `strategist` | `strategist`, `planner`, `coordinator` | `strategy.analysis`, `reasoning.multi_step` | `json.schema_adherence` | `text` |  |
| `strategist.pricing.strategy` | Pricing Strategy | Develop pricing strategy, packaging, and market fit. | User asks for pricing strategy. | User asks for exact invoice review. | `strategist` | `strategist`, `finance`, `marketer` | `strategy.analysis`, `finance.analysis` | `json.schema_adherence` | `text` |  |
| `strategist.partnership.evaluate` | Partnership Evaluation | Evaluate partnerships, channels, alliances, or ecosystem opportunities. | User asks whether a partnership makes sense. | User asks for vendor procurement scorecard only. | `strategist` | `strategist`, `seller`, `procurement` | `strategy.analysis`, `market.analysis` | `reasoning.multi_step` | `text` |  |
| `mathematician.statistics.analyze` | Statistical Analysis | Analyze statistical results, distributions, uncertainty, or significance. | User asks for statistical interpretation. | User asks for scientific method critique only. | `mathematician` | `mathematician`, `data`, `scientist` | `math.solve`, `reasoning.multi_step` | `json.schema_adherence` | `text` |  |
| `mathematician.optimize` | Optimization | Formulate or solve optimization problems and constraints. | User asks to maximize, minimize, or optimize. | User asks for creative brainstorming. | `mathematician` | `mathematician`, `analyst`, `finance` | `math.modeling`, `reasoning.multi_step` | `json.schema_adherence` | `text` |  |
| `mathematician.proof.write` | Proof Writing | Write or structure mathematical proofs. | User asks for proof or rigorous derivation. | User asks for code implementation. | `mathematician` | `mathematician`, `educator` | `math.verify`, `reasoning.multi_step` | `text.chat` | `text` |  |
| `mathematician.formula.derive` | Formula Derivation | Derive equations, formulas, or transformations. | User asks to derive a formula. | User asks for financial advice. | `mathematician` | `mathematician`, `scientist` | `math.solve`, `reasoning.multi_step` | `json.schema_adherence` | `text` |  |
| `mathematician.simulation.plan` | Simulation Planning | Plan simulations, assumptions, variables, and outputs. | User asks how to simulate a system. | User asks to run production deployment. | `mathematician` | `mathematician`, `scientist`, `data` | `math.modeling`, `reasoning.multi_step` | `json.schema_adherence` | `text` |  |
| `mathematician.error.check` | Error Checking | Check arithmetic, formulas, calculations, and numerical consistency. | User asks to check math for mistakes. | User asks for prose editing only. | `mathematician` | `mathematician`, `tester`, `finance` | `math.verify` | `reasoning.multi_step` | `text` |  |
| `scientist.hypothesis.formulate` | Hypothesis Formulation | Formulate testable hypotheses and expected observations. | User asks how to turn an idea into a hypothesis. | User asks for business OKRs. | `scientist` | `scientist`, `educator`, `analyst` | `science.method`, `reasoning.multi_step` | `json.schema_adherence` | `text` |  |
| `scientist.protocol.write` | Protocol Writing | Write experimental protocols, materials, steps, and measurements. | User asks for experiment protocol structure. | User asks for clinical treatment plan. | `scientist` | `scientist`, `planner` | `science.method`, `text.chat` | `json.schema_adherence` | `text` |  |
| `scientist.data.interpret` | Scientific Data Interpretation | Interpret scientific data, results, uncertainty, and limitations. | User asks what scientific results mean. | User asks for legal compliance review. | `scientist` | `scientist`, `data`, `analyst` | `science.analysis`, `reasoning.multi_step` | `json.schema_adherence` | `text` |  |
| `scientist.peer_review` | Peer Review Support | Review scientific writing, claims, methods, and evidence quality. | User asks to peer review a paper or report. | User asks for marketing copy. | `scientist` | `scientist`, `researcher`, `writer` | `science.analysis`, `long_context` | `citation.synthesis` | `text` |  |
| `scientist.safety.review` | Scientific Safety Review | Review safety considerations for experiments or technical methods. | User asks about experiment safety considerations. | User asks for medical diagnosis. | `scientist` | `scientist`, `security`, `health` | `science.method`, `reasoning.multi_step` | `json.schema_adherence` | `text` |  |
| `scientist.technical.explain` | Scientific Explanation | Explain scientific concepts, mechanisms, or findings clearly. | User asks to understand a scientific topic. | User asks for current legal policy. | `scientist` | `scientist`, `educator`, `writer` | `science.analysis`, `text.chat` | `communication.user_facing` | `text` |  |
| `health.medication.info` | Medication Information | Provide general medication information and safety boundaries. | User asks general questions about medication facts or interactions. | User asks for personalized prescribing or dosing instructions. | `health` | `health`, `researcher` | `health.general_info`, `health.safety` | `communication.user_facing` | `text` |  |
| `health.appointment.prepare` | Appointment Preparation | Help prepare questions, notes, and concerns for a healthcare visit. | User asks to prepare for a medical appointment. | User asks assistant to diagnose. | `health` | `health`, `coordinator`, `writer` | `health.general_info`, `coordination.workflow` | `communication.user_facing` | `text` |  |
| `health.symptom.organize` | Symptom Organization | Organize symptoms, timing, context, and questions for care discussion. | User wants to organize health observations. | User asks for definitive diagnosis. | `health` | `health`, `coordinator` | `health.safety`, `coordination.workflow` | `json.schema_adherence` | `text` |  |
| `health.exercise.general` | General Exercise Information | Provide general exercise information within safe boundaries. | User asks for general fitness education or habit ideas. | User has injury, condition, or high-risk medical context. | `health` | `health`, `educator` | `health.general_info` | `communication.user_facing` | `text` |  |
| `health.nutrition.general` | General Nutrition Information | Provide general nutrition information and meal-planning concepts. | User asks for general nutrition education. | User asks for medical nutrition therapy. | `health` | `health`, `educator` | `health.general_info` | `communication.user_facing` | `text` |  |
| `health.mental_wellness.info` | Mental Wellness Information | Provide general mental wellness information and support-seeking guidance. | User asks for general stress, sleep, or wellness information. | User presents imminent self-harm or crisis requiring emergency escalation. | `health` | `health`, `support` | `health.safety`, `communication.user_facing` | `reasoning.multi_step` | `text` |  |

### Capabilities

| Capability | Label |
| --- | --- |
| `text.chat` | Text Chat |
| `code.read` | Code Read |
| `code.write` | Code Write |
| `reasoning.multi_step` | Reasoning Multi Step |
| `tools.function_calling` | Tools Function Calling |
| `tools.command_execution` | Tools Command Execution |
| `json.schema_adherence` | Json Schema Adherence |
| `security.analysis` | Security Analysis |
| `web.search` | Web Search |
| `citation.synthesis` | Citation Synthesis |
| `long_context` | Long Context |
| `tools.browser_control` | Tools Browser Control |
| `vision.input` | Vision Input |
| `data.query` | Data Query |
| `data.schema` | Data Schema |
| `data.transform` | Data Transform |
| `legal.analysis` | Legal Analysis |
| `finance.analysis` | Finance Analysis |
| `reasoning.divergent` | Reasoning Divergent |
| `vision.output` | Vision Output |
| `communication.user_facing` | Communication User Facing |
| `communication.follow_up` | Communication Follow Up |
| `education.tutoring` | Education Tutoring |
| `education.assessment` | Education Assessment |
| `language.translation` | Language Translation |
| `language.localization` | Language Localization |
| `marketing.analysis` | Marketing Analysis |
| `marketing.copy` | Marketing Copy |
| `sales.analysis` | Sales Analysis |
| `sales.communication` | Sales Communication |
| `recruiting.analysis` | Recruiting Analysis |
| `procurement.analysis` | Procurement Analysis |
| `coordination.workflow` | Coordination Workflow |
| `calendar.planning` | Calendar Planning |
| `knowledge.organization` | Knowledge Organization |
| `knowledge.retrieval` | Knowledge Retrieval |
| `memory.write` | Memory Write |
| `strategy.analysis` | Strategy Analysis |
| `market.analysis` | Market Analysis |
| `math.solve` | Math Solve |
| `math.verify` | Math Verify |
| `math.modeling` | Math Modeling |
| `science.analysis` | Science Analysis |
| `science.method` | Science Method |
| `health.general_info` | Health General Info |
| `health.safety` | Health Safety |

### Modalities

| Modality | Label |
| --- | --- |
| `text` | Text |
| `image` | Image |
| `audio` | Audio |
| `video` | Video |
| `file` | File |
| `structured_json` | Structured Json |
| `tabular` | Tabular |
| `code_patch` | Code Patch |
| `document` | Document |

### Tool Classes

| Tool class | Label |
| --- | --- |
| `filesystem.read` | Filesystem Read |
| `filesystem.write` | Filesystem Write |
| `shell.execute` | Shell Execute |
| `browser.control` | Browser Control |
| `web.search` | Web Search |
| `http.fetch` | Http Fetch |
| `database.query` | Database Query |
| `package.install` | Package Install |
| `calendar.read` | Calendar Read |
| `calendar.write` | Calendar Write |
| `email.read` | Email Read |
| `email.write` | Email Write |
| `memory.read` | Memory Read |
| `memory.write` | Memory Write |
| `vector.search` | Vector Search |
<!-- TAXONOMY_V1_CATALOG:END -->

## Future Phases

Taxonomy-aware benchmark suites and taxonomy-level telemetry are later phases. Taxonomy V1 reserves stable identifiers and version fields so future benchmark and telemetry work can score and observe models by group, role, task type, capability, modality, and tool class without changing the core naming model.



<!-- AUTO-GENERATED-TAXONOMY-TABLES-START -->

### Groups

| ID | Label | Primary Roles | Secondary Roles |
| --- | --- | --- | --- |
| `business` | Business | strategist, marketer, seller, finance, procurement | legal, recruiter |
| `communication` | Communication | writer, translator, creative, support, coordinator | — |
| `engineering` | Engineering | coder, architect, operator, tester, security, data | — |
| `governance_safety` | Governance And Safety | legal, health, recruiter | security, finance |
| `knowledge_research` | Knowledge And Research | researcher, knowledge, scientist, mathematician, educator | health |
| `product_design` | Product And Design | product, designer, planner, analyst | — |

### Roles

| ID | Label | Group | Secondary | Description |
| --- | --- | --- | --- | --- |
| `analyst` | Analyst | `product_design` | — | Structured analysis, metrics, comparison, prioritization, and decision support. |
| `architect` | Architect | `engineering` | — | System design, API design, technical planning, and tradeoff analysis. |
| `coder` | Coder | `engineering` | — | Code implementation, review, debugging, refactoring, and tests. |
| `coordinator` | Coordinator | `communication` | — | Meetings, schedules, task follow-up, inbox-style triage, and administrative workflows. |
| `creative` | Creative | `communication` | — | Ideation, naming, visual direction, storytelling, and creative variants. |
| `data` | Data | `engineering` | — | Data modeling, query analysis, schema review, transformation, and data quality. |
| `designer` | Designer | `product_design` | — | Interface design, interaction design, visual review, and experience quality. |
| `educator` | Educator | `knowledge_research` | — | Teaching, tutoring, curriculum, study support, quizzes, and feedback. |
| `finance` | Finance | `business` | governance_safety | Cost, budget, pricing, ROI, billing, and financial comparison work. |
| `health` | Health | `governance_safety` | knowledge_research | General health information, symptom-safety triage, care-navigation support, and wellness explanations. |
| `knowledge` | Knowledge | `knowledge_research` | — | Notes, memory, knowledge bases, retrieval organization, and institutional context. |
| `legal` | Legal | `governance_safety` | business | Legal, licensing, compliance, terms, and policy interpretation support. |
| `marketer` | Marketer | `business` | — | Positioning, messaging, campaigns, SEO, content strategy, and audience research. |
| `mathematician` | Mathematician | `knowledge_research` | — | Mathematical solving, verification, modeling, and explanation. |
| `operator` | Operator | `engineering` | — | Runtime, deployment, logs, diagnostics, and operational response. |
| `planner` | Planner | `product_design` | — | Breaks goals into requirements, milestones, phased plans, and acceptance criteria. |
| `procurement` | Procurement | `business` | — | Vendor comparison, purchasing requirements, RFPs, and commercial review. |
| `product` | Product | `product_design` | — | Product requirements, user workflows, prioritization, and release readiness. |
| `recruiter` | Recruiter | `governance_safety` | business | Job descriptions, interview plans, hiring rubrics, and candidate screening support. |
| `researcher` | Researcher | `knowledge_research` | — | Search, compare, synthesize, cite, and summarize information. |
| `scientist` | Scientist | `knowledge_research` | — | Scientific reasoning, experimental design, evidence review, and method critique. |
| `security` | Security | `engineering` | governance_safety | Security review, threat modeling, abuse/risk analysis. |
| `seller` | Seller | `business` | — | Sales discovery, outreach, proposals, account planning, and objection handling. |
| `strategist` | Strategist | `business` | — | Business strategy, market entry, competitive analysis, and organizational tradeoffs. |
| `support` | Support | `communication` | — | Troubleshooting, user-facing diagnosis, remediation steps, and escalation. |
| `tester` | Tester | `engineering` | — | Test design, QA, validation, reproduction, and end-to-end verification. |
| `translator` | Translator | `communication` | — | Translation, localization, tone transfer, and multilingual communication. |
| `writer` | Writer | `communication` | — | Write, edit, summarize, explain, and structure prose. |

### Task Types (280 total)

| Task Type | Label | Primary Role | Compatible Roles | Required Caps |
| --- | --- | --- | --- | --- |
| `analyst.compare` | Comparative Analysis | `analyst` | analyst, architect, researcher | `reasoning.multi_step` |
| `architect.design` | System Design | `architect` | architect, coder | `reasoning.multi_step` |
| `coder.edit` | Code Edit | `coder` | coder, architect | `code.read`, `code.write` |
| `coordinator.meeting.agenda` | Meeting Agenda | `coordinator` | coordinator, planner, product | `coordination.workflow` |
| `creative.brainstorm` | Brainstorming | `creative` | creative, writer, product | `text.chat` |
| `data.query` | Data Query | `data` | data, analyst, coder | `data.query` |
| `designer.ui.review` | UI Review | `designer` | designer, product, writer | `vision.input`, `text.chat` |
| `educator.tutor` | Tutoring | `educator` | educator, writer, mathematician, scientist | `education.tutoring`, `text.chat` |
| `finance.cost_estimate` | Cost Estimate | `finance` | finance, analyst, operator | `finance.analysis` |
| `health.info.general` | General Health Information | `health` | health, educator, writer | `health.general_info`, `text.chat` |
| `knowledge.organize` | Knowledge Organization | `knowledge` | knowledge, writer, researcher | `knowledge.organization`, `text.chat` |
| `legal.review` | Legal Review | `legal` | legal, security | `legal.analysis` |
| `marketer.positioning` | Positioning | `marketer` | marketer, product, strategist | `marketing.analysis`, `text.chat` |
| `mathematician.solve` | Math Solving | `mathematician` | mathematician, educator, analyst | `math.solve` |
| `operator.debug.startup` | Startup Debugging | `operator` | operator, coder | `reasoning.multi_step` |
| `planner.requirements` | Requirements Definition | `planner` | planner, product, architect | `reasoning.multi_step` |
| `procurement.vendor.compare` | Vendor Comparison | `procurement` | procurement, finance, security, analyst | `procurement.analysis`, `finance.analysis` |
| `product.requirements` | Product Requirements | `product` | product, planner, architect | `reasoning.multi_step` |
| `recruiter.job_description` | Job Description | `recruiter` | recruiter, writer, product | `recruiting.analysis`, `text.chat` |
| `researcher.web_research` | Web Research | `researcher` | researcher, writer | `web.search`, `text.chat` |
| `scientist.experiment.design` | Experimental Design | `scientist` | scientist, analyst, planner | `science.method`, `reasoning.multi_step` |
| `security.audit` | Security Audit | `security` | security, architect | `security.analysis` |
| `seller.discovery.plan` | Sales Discovery Planning | `seller` | seller, product, strategist | `sales.analysis` |
| `strategist.business.plan` | Business Planning | `strategist` | strategist, product, finance, marketer | `strategy.analysis` |
| `support.triage` | Support Triage | `support` | support, operator, writer | `text.chat` |
| `tester.e2e` | End-to-End Test Implementation | `tester` | tester, coder | `code.read`, `code.write`, `tools.function_calling` |
| `translator.translate` | Translation | `translator` | translator, writer | `language.translation`, `text.chat` |
| `writer.docs.write` | Documentation Writing | `writer` | writer, coder | `text.chat` |

### Capabilities (46)

| ID | Label |
| --- | --- |
| `calendar.planning` | Calendar Planning |
| `citation.synthesis` | Citation Synthesis |
| `code.read` | Code Read |
| `code.write` | Code Write |
| `communication.follow_up` | Communication Follow Up |
| `communication.user_facing` | Communication User Facing |
| `coordination.workflow` | Coordination Workflow |
| `data.query` | Data Query |
| `data.schema` | Data Schema |
| `data.transform` | Data Transform |
| `education.assessment` | Education Assessment |
| `education.tutoring` | Education Tutoring |
| `finance.analysis` | Finance Analysis |
| `health.general_info` | Health General Info |
| `health.safety` | Health Safety |
| `json.schema_adherence` | Json Schema Adherence |
| `knowledge.organization` | Knowledge Organization |
| `knowledge.retrieval` | Knowledge Retrieval |
| `language.localization` | Language Localization |
| `language.translation` | Language Translation |
| `legal.analysis` | Legal Analysis |
| `long_context` | Long Context |
| `market.analysis` | Market Analysis |
| `marketing.analysis` | Marketing Analysis |
| `marketing.copy` | Marketing Copy |
| `math.modeling` | Math Modeling |
| `math.solve` | Math Solve |
| `math.verify` | Math Verify |
| `memory.write` | Memory Write |
| `procurement.analysis` | Procurement Analysis |
| `reasoning.divergent` | Reasoning Divergent |
| `reasoning.multi_step` | Reasoning Multi Step |
| `recruiting.analysis` | Recruiting Analysis |
| `sales.analysis` | Sales Analysis |
| `sales.communication` | Sales Communication |
| `science.analysis` | Science Analysis |
| `science.method` | Science Method |
| `security.analysis` | Security Analysis |
| `strategy.analysis` | Strategy Analysis |
| `text.chat` | Text Chat |
| `tools.browser_control` | Tools Browser Control |
| `tools.command_execution` | Tools Command Execution |
| `tools.function_calling` | Tools Function Calling |
| `vision.input` | Vision Input |
| `vision.output` | Vision Output |
| `web.search` | Web Search |

### Modalities (9)

| ID | Label |
| --- | --- |
| `audio` | Audio |
| `code_patch` | Code Patch |
| `document` | Document |
| `file` | File |
| `image` | Image |
| `structured_json` | Structured Json |
| `tabular` | Tabular |
| `text` | Text |
| `video` | Video |

### Tool Classes (15)

| ID | Label |
| --- | --- |
| `browser.control` | Browser Control |
| `calendar.read` | Calendar Read |
| `calendar.write` | Calendar Write |
| `database.query` | Database Query |
| `email.read` | Email Read |
| `email.write` | Email Write |
| `filesystem.read` | Filesystem Read |
| `filesystem.write` | Filesystem Write |
| `http.fetch` | Http Fetch |
| `memory.read` | Memory Read |
| `memory.write` | Memory Write |
| `package.install` | Package Install |
| `shell.execute` | Shell Execute |
| `vector.search` | Vector Search |
| `web.search` | Web Search |

<!-- AUTO-GENERATED-TAXONOMY-TABLES-END -->

