# MEMORY.md

<!-- RECURSIVE-MODE-MEMORY:START -->
## Memory Router

This file is the durable memory router for the repository.
It is not a knowledge dump. Store durable memory in sharded docs under `domains/`, `patterns/`, `incidents/`, `episodes/`, `skills/`, or `archive/`.

Control-plane docs are not memory docs:
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.codex/AGENTS.md`
- `/AGENTS.md`
- `/.agent/PLANS.md`

## Retrieval Rules

- Read this file before loading any other memory docs.
- Load only the memory docs relevant to the current task.

### Session 260624-clever-seal — Run 57 Post-Implementation Audit, Gap Closure, E2E Verification

**Pi Package — How It Adds Metadata to Requests:**

The `pi-role-model` package classifies requests and injects `role_model.intent` metadata before they reach the Role-Model runtime. The injection path is: Pi sends a chat request → `extension.ts` registers a `before_provider_request` hook → `injectRoleModelIntentIntoPayload()` calls `extractClassificationContext()` to pull prompt text, tool names, image/file presence, and file extensions from the payload → `classifyWithProgressiveDisclosure()` runs group-first classification → the resulting `role_model.intent` (snake_case wire contract) is attached to the request body. When the runtime is reachable, `resolveEffectiveTaxonomy()` fetches the runtime manifest, compares versions, and `injectRoleModelIntentIntoPayloadWithRuntimeTasks()` uses runtime task chunks to refine the classification. The metadata includes `role_hint_id`, `task_type`, `preferred_capabilities`, `modalities`, `tool_classes`, `taxonomy_version`, `classification_contract_version`, `confidence`, `evidence`, and `alternatives`. The classifier never makes hidden model calls (`hiddenModelCallUsed: false`).

**Taxonomy — Groups, Roles, and Classification:**

The V1 taxonomy defines 6 groups organizing 28 roles by work domain: `engineering` (coder, architect, operator, tester, security, data), `product_design` (product, designer, planner, analyst), `knowledge_research` (researcher, knowledge, scientist, mathematician, educator; health as secondary), `business` (strategist, marketer, seller, finance, procurement; legal and recruiter as secondary), `communication` (writer, translator, creative, support, coordinator), `governance_safety` (legal, health, recruiter; security and finance as secondary). Every role has exactly one `primaryGroupId` and zero or more `secondaryGroupIds`. Each role carries a `classification` object with `summary` (when to use this role), `positiveSignals` (keywords that suggest this role), and `negativeSignals` (keywords that suggest NOT this role) — these drive the group-first classifier's `scoreRoleForPrompt()` function. The classifier pipeline is: `selectCandidateGroupIds()` (regex patterns + keyword sets per group) → `classifyByGroupAndRoleScoring()` (scores all candidate roles using classification fields) → loads the best role's task chunk → `selectTask()` (picks best task within the chunk).

**Pattern: Data Pipeline Verification:**
Benchmark quality scores (`benchmarkCapability.overallScore`) were correctly computed (v4-pro 1.0, kimi 1.0, v4-flash 0.75), correctly stored on candidates in the host bridge (line 15148), but never read by `getQualityMetric()` in the router core — all models defaulted to 0.500. The fix added a third tier in `getQualityMetric`: judge_score → quality_score → benchmarkCapability.overallScore → default 0.5. After fix: v4-pro 0.925, kimi 1.000, v4-flash 0.833, routing shifted from v4-flash 89% → v4-pro 90%. Lesson: verify every step of collection→storage→consumption; the pipeline can be correct at every step except the last.

**Pattern: camelCase/snake_case Adapter Layer:**
This codebase maintains a clean split — external/wire uses snake_case (proposal contract, HTTP body, protocol schemas), internal TypeScript uses camelCase (router types, UI types, observation types). Two adapters bridge the boundary: `readRoleModelIntentFromRequestBody()` (snake→camel, host bridge line 6044) for incoming requests, and `toProposalWireContract()` (camel→snake, host bridge, added in addendum 09) for outgoing API responses. The decision detail API now returns both `normalizedIntent` (camelCase, backward compat) and `role_model` (snake_case, proposal wire contract).

**Key Implementation Facts:**
- All 28 roles have `classification` fields with 8-18 `positiveSignals` and 3-5 `negativeSignals` each.
- Compact Pi taxonomy chunk size guardrail: 20KB (raised from 16KB to accommodate classification data).
- `MetricSource` type: `"measured" | "declared" | "default" | "catalog" | "benchmark"`.
- `EndpointCandidate` type: `benchmarkCapability?: { overallScore?: number }`.
- 7 entity schemas have `replacement` and `deprecationReason` fields.
- `scripts/generate-taxonomy-docs.ts` auto-generates 6 markdown tables from canonical JSON.
- All test suites green: pi-role-model 71, core 23, host-bridge 446, schemas 33+30.
- Benchmark: routing-capability-v2 v3.4, 12 hard coding cases, judge: deepseek-v4-flash.
- 34 addenda total, 10 authoritative addenda locked, Phase 5 QA marked PASS.

**Domains updated:**
- `domains/runtime-routing-and-provider-capabilities.md`: benchmark quality feeds routing. `MetricSource` includes `"benchmark"`. v4-pro 0.925, kimi 1.0, v4-flash 0.833.
- `domains/taxonomy-v1.md`: 28 roles with classification fields, 6 groups with role membership, docs auto-generated, deprecation schemas complete.
- If the task plans delegated review, subagent help, review bundles, smoke-harness portability work, or capability-sensitive execution, read `/.recursive/memory/skills/SKILLS.md` and then load the relevant skill-memory shards.
- If Phase 8 will need to promote durable lessons, first capture run-local skill usage in the run artifact and only then promote generalized conclusions into skill-memory shards.
- Runtime routing, provider capability metadata, alias-matrix behavior, Codex Subscription lifecycle semantics, and benchmark quality routing: `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- Taxonomy V1 catalog, groups, roles, classification fields, versioning, deprecation, docs generation: `/.recursive/memory/domains/taxonomy-v1.md`
- Pi package classifier, metadata injection flow, context signals, runtime override, safety boundaries: `/.recursive/memory/domains/pi-role-model-package.md`
- Benchmark routing display and env credential lessons: `/.recursive/memory/episodes/run-43-benchmark-routing-display.md`
- GitHub Actions validation, docs deploy, binary release publication, and recursive-artifact changelog generation: `/.recursive/memory/patterns/github-ci-and-release-workflow.md`
- Prefer `Status: CURRENT` docs for planning and execution.
- `Status: SUSPECT` docs may be used as leads, but revalidate them before trust.
- Exclude `STALE` and `DEPRECATED` docs from default retrieval unless doing historical analysis.

## Registry

- `domains/` - stable functional-area knowledge with `Owns-Paths`
- `patterns/` - reusable playbooks and solution patterns
- `incidents/` - recurring failure signatures and fixes
- `episodes/` - distilled lessons from specific runs
- `skills/` - durable skill and capability memory, routed via `skills/SKILLS.md`
- `archive/` - historical or deprecated memory docs

## Freshness Rules

- Durable memory docs must declare the metadata defined in `references/artifact-template.md`.
- Any doc whose `Owns-Paths` or `Watch-Paths` overlaps final changed code paths must be reviewed in Phase 8.
- Affected `CURRENT` docs should be downgraded to `SUSPECT` until revalidated against final code, `STATE.md`, and `DECISIONS.md`.
- If changed paths have no owning domain doc, create one or record the uncovered-path follow-up in `08-memory-impact.md`.
- Skill-memory docs should record source runs, last validated date, environment notes, and current trust/fit guidance.
- If a run materially teaches the repo something about skill availability, delegated-review quality, review-bundle usage, or toolchain fallback behavior, Phase 8 must either create/refresh a skill-memory shard or record why no durable lesson was promoted.
- If the repo itself is a reusable skill/workflow distribution, durable memory must remain generalized. Do not store current-session run residue or temp-environment observations as if they were universal truth.
<!-- RECURSIVE-MODE-MEMORY:END -->
