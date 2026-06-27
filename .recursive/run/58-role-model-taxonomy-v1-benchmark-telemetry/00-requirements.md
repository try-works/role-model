Run: `/.recursive/run/58-role-model-taxonomy-v1-benchmark-telemetry/`
Phase: `00 Requirements`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/RECURSIVE.md`
- `/.codex/AGENTS.md`
- `/.agent/PLANS.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/taxonomy-v1.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/.recursive/memory/domains/pi-role-model-package.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/01-as-is.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/03-implementation-summary.md`
- External proposal: `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md`
Outputs:
- `/.recursive/run/58-role-model-taxonomy-v1-benchmark-telemetry/00-requirements.md`
Scope note: This run implements Phase 5 and Phase 6 of the external Role-Model Taxonomy V1 proposal, which were explicitly deferred in run 57. Phase 5 adds taxonomy-aware benchmark schemas, case tagging, score aggregation, benchmark-informed routing recommendations, and benchmark dashboard UI. Phase 6 adds taxonomy-aware telemetry dimensions, request/decision observability, analytics dashboards, privacy controls, and advisory performance signals.
Status: `LOCKED`
LockedAt: `2026-06-27T10:14:13Z`
LockHash: `d7b56c79b5381fac110e6792e380518906a129bc9acb5e939c6fd04dd550b65a`

## TODO

- [x] Re-read recursive-mode workflow and bridge docs
- [x] Re-read current state, decisions, and taxonomy/routing memory
- [x] Re-read run 57 requirements for scope boundaries and extension points
- [x] Re-read `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md` Phase 5 and Phase 6 sections
- [x] Convert proposal phases 5-6 into repo-owned requirement IDs
- [x] Preserve run 57 safety boundaries (no runtime process ownership, no credential copying, no hidden model calls)
- [x] Make strict TDD mandatory for implementation
- [x] Make Phase 5 manual QA agent-operated with real benchmark runs and live Pi verification
- [ ] Obtain user approval before locking this requirements artifact

## Source Requirement Inventory

| Source | Contribution to this run |
| --- | --- |
| `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md` | Authoritative Phase 5 (benchmark) and Phase 6 (telemetry) design, E2E test cases, and acceptance criteria |
| `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md` | Run 57 scope boundaries, reserved extension points, and explicit deferral of Phase 5/6 |
| `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/01-as-is.md` | Run 57 AS-IS audit of benchmark and telemetry placeholder state |
| `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/03-implementation-summary.md` | Run 57 implementation record — what was built and what was deferred |
| `/.recursive/STATE.md` | Current runtime, UI, router, benchmark infrastructure, and telemetry/observability baseline from run 57 |
| `/.recursive/DECISIONS.md` | Run 57 decisions, deferred scope, and run 58 draft status |
| `/.recursive/memory/domains/taxonomy-v1.md` | Taxonomy V1 catalog, versioning, and classification field design |
| `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md` | Current benchmark quality routing integration and scoring pipeline |

## Normative Proposal Sections

| Proposal Section | Lines | Requirement |
| --- | ---: | --- |
| `Phase 5: Taxonomy-Aware Benchmarks Later` — deliverables | `2603-2617` | Benchmark schemas, case tagging, score aggregation, UI integration, advisory routing |
| `Phase 5` — acceptance criteria + E2E test cases `E2E-P5-001` through `E2E-P5-006` | `2618-2650` | QA receipts, UI visibility, hard-filter precedence, Pi-visible guidance |
| `Phase 6: Taxonomy-Aware Telemetry Later` — deliverables | `2652-2666` | Telemetry event schema, taxonomy dimensions, observe routes, privacy controls, performance rollups |
| `Phase 6` — acceptance criteria + E2E test cases `E2E-P6-001` through `E2E-P6-007` | `2667-2696` | QA receipts, dashboard visibility, advisory boundary, privacy verification |

## Requirements

### `R1` Audit AS-IS benchmark and telemetry infrastructure

Description:
Audit the current benchmark runner, benchmark UI, telemetry system, and observe routes to understand what exists and what needs to be extended.

Acceptance criteria:
- Inventory current benchmark suite structure, runner, judge, and artifact pipeline (59 host bridge references, 9 source files, 9 test files already exist from run 57)
- Inventory current `/app/models/benchmark` UI surface and its placeholder states
- Inventory current telemetry/observability routes (`/app/observe/*`) and existing telemetry analytics (135 host bridge references, `telemetry-charts`, `telemetry-analytics`, `telemetry-route-models`)
- Inventory current telemetry dimensions recorded per request (`endpointId`, `modelId`, `latencyMs`, `tokens`, `cost`, `roleIds`, `normalizedIntent` as opaque blob)
- Document which capabilities are production-ready and which are QA stubs (e.g., benchmark runner is functional, observe dashboards serve real data)
- Distinguish additive changes (new taxonomy-tagged fields, new filter dimensions) from extensions to existing code (extending benchmark runner, extending telemetry recording)
- Identify which Phase 5/6 extension points from run 57 are available (reserved schema paths, placeholder UI sections)
- Record compatibility constraints with existing benchmark and telemetry APIs

### `R2` Add taxonomy-aware benchmark schemas and case tagging

Description:
Define benchmark suite, case, run, result, and aggregate schemas that include taxonomy dimensions.

Acceptance criteria:
- Add taxonomy-specific benchmark schemas under `schemas/role-model/taxonomy/` per the proposal's reserved paths: `benchmark-suite.schema.json`, `benchmark-run.schema.json`, `benchmark-result.schema.json`
- These taxonomy schemas extend (do not replace) the existing `protocol/schemas/benchmark-suite.schema.json` and `protocol/schemas/benchmark-run.schema.json` — the protocol schemas define the core benchmark structure; the taxonomy schemas add taxonomy dimension fields
- Benchmark cases support taxonomy tags: `roleId`, `taskType`, `variant`, `requiredCapabilities`, `preferredCapabilities`, `requiredModalities`, `toolClasses`
- Benchmark results include per-case scores with taxonomy dimensions preserved
- Aggregate scores computed by role, task, variant, capability, modality, and tool class dimensions
- Schemas validated against sample data

### `R3` Tag benchmark cases with canonical taxonomy IDs

Description:
The existing routing-capability benchmark cases must be tagged with canonical taxonomy metadata so results can be aggregated by taxonomy dimension.

Acceptance criteria:
- Each benchmark case in the routing-capability suite includes taxonomy tags
- Tags reference canonical V1 role, task, capability, modality, and tool class IDs
- At minimum, tag cases for `coder.review`, `researcher.compare_sources`, `support.ticket.reply`, and `data.schema.review`
- Case validation ensures taxonomy tag references resolve against canonical data

### `R4` Aggregate benchmark scores by taxonomy dimensions

Description:
Benchmark results must be aggregated by role, task, variant, capability, modality, and tool class so model performance can be compared within taxonomy categories.

Acceptance criteria:
- `overallScore` per endpoint as currently computed
- Per-role aggregate scores (average across all cases tagged with that role)
- Per-task aggregate scores (average across all cases tagged with that task type)
- Per-variant aggregate scores (e.g., `root_cause` variants vs `e2e` variants)
- Per-capability aggregate scores (models handling `code.write` vs `code.read` tasks)
- Per-modality aggregate scores (models handling `text` vs `image` vs `structured_json` tasks)
- Per-tool-class aggregate scores (models handling `filesystem.read` vs `shell.execute` tasks)
- Aggregates exposed through benchmark summary API and UI

### `R5` Extend benchmark UI with taxonomy filters and score breakdowns

Description:
`/app/models/benchmark` must show taxonomy-filtered views of benchmark results, and `/app/models` must expose benchmark-informed recommendation state as advisory UI only.

Acceptance criteria:
- Role filter: show benchmark results for cases tagged with a selected role
- Task filter: show results for cases tagged with a selected task type
- Capability filter: show models scored on capability-specific cases
- Per-model score breakdowns by taxonomy dimension
- Model detail page (`/app/models`) exposes benchmark recommendation state as advisory UI (e.g., "This model scores 0.95 on coder.review benchmarks")
- Benchmark recommendations on model detail are clearly labeled as advisory and do not override user-configured role assignments
- Missing-data states for dimensions without benchmark coverage
- Placeholder states retained from run 57 are replaced with real data

### `R6` Benchmark-informed routing recommendations

Description:
Benchmark results must produce advisory routing recommendations that influence model selection without overriding hard policy. Run 57 addendum 10 already feeds `benchmarkCapability.overallScore` into `getQualityMetric` as a general quality signal. This requirement adds per-TASK benchmark scoring, benchmark reason codes in routing diagnostics, and Pi-visible benchmark guidance.

Acceptance criteria:
- Per-task benchmark scoring: when benchmark data exists for the requested `task_type`, the router applies a task-specific quality adjustment on top of the existing `overallScore` (e.g., a model scoring 0.95 on `coder.review` cases gets a boost for code review requests)
- Router scoring includes benchmark reason codes when benchmark data exists for the requested task (e.g., `BENCHMARK_TASK_SCORE` in selection reasons)
- Benchmark preference is advisory: hard constraints (role policy, required capabilities) still remove ineligible candidates first
- `E2E-P5-004`: benchmark-informed routing verified with real benchmark data — a model with higher task-specific benchmark scores is preferred
- `E2E-P5-005`: benchmark cannot bypass hard constraints — verified edge case where a high-scoring model is ineligible due to missing capability
- Routing diagnostics expose benchmark reason codes in `routingDiagnostics` for consumer visibility
- Pi can report benchmark-informed routing reasons via runtime diagnostics (`E2E-P5-006`)

### `R7` Add taxonomy telemetry event schema and dimensions

Description:
Request telemetry must record taxonomy dimensions alongside existing metrics.

Acceptance criteria:
- Add `telemetry-taxonomy-event.schema.json` under `schemas/role-model/taxonomy/`
- Each request telemetry record includes: original `role_hint_id`, original `task_type`, normalized `role_id`, normalized `task_type`, `variant`, `capabilities`, `modalities`, `tool_classes`, `taxonomy_version`, `classification_contract_version`
- Telemetry includes `source` (heuristic/user/trusted), `confidence`, and `alternatives`
- Extend the existing `POST /api/role-model/telemetry/query` API to accept taxonomy dimension filters (`roleId`, `taskType`, `capability`, `modality`, `toolClass`) and return dimension-grouped aggregates
- Backward compatible: existing telemetry records without taxonomy fields remain valid; queries without taxonomy filters return all records

### `R8` Record taxonomy dimensions on request and decision telemetry

Description:
Every routed request must record its taxonomy metadata in the telemetry system. The existing `RuntimeObservationBundle` already stores `normalizedIntent` as an opaque `Record<string, unknown>` blob (run 57). This requirement adds EXTRACTED, indexed, queryable taxonomy dimension fields alongside the existing blob.

Acceptance criteria:
- Extract taxonomy dimensions from `normalizedIntent` into top-level indexed fields on each telemetry record: `taxonomy_role_id` (normalized), `taxonomy_task_type` (normalized), `taxonomy_role_source` (heuristic/user/trusted), `taxonomy_task_source`, `taxonomy_confidence`, `taxonomy_version`, `classification_contract_version`
- The existing `normalizedIntent` blob field is preserved unchanged for backward compatibility and full detail retrieval
- Decision ID, endpoint ID, model ID recorded with taxonomy context
- `E2E-P6-001`: all 6 minimum proposal prompts produce telemetry with extracted taxonomy dimension fields
- Failure telemetry records rejection reason with taxonomy context (`E2E-P6-002`)
- Invalid hard taxonomy requests produce safe error metadata without forwarding invalid client data upstream

### `R9` Extend Observe dashboards with taxonomy dimensions

Description:
`/app/observe/requests` and `/app/observe/routing` must support filtering and aggregation by taxonomy dimensions.

Acceptance criteria:
- Filter telemetry by group, role, task, variant, capability, modality, tool class
- Aggregate views: request count, success rate, avg latency, avg cost by taxonomy dimension
- Cross-filter: combine taxonomy filters with endpoint/model/time-range filters
- Dashboard updates in real-time via SSE where supported
- Missing-data states for dimensions without telemetry coverage
- `E2E-P6-003`: dashboards verified after sending proposal request set

### `R10` Add model detail telemetry rollup

Description:
`/app/models` inspect panel must show taxonomy-aware telemetry rollups for each configured model.

Acceptance criteria:
- Recent role/task usage per model: which roles and tasks the model has handled
- Success/failure/latency breakdown by task type
- Telemetry-derived warnings (e.g., "this model underperforms on coder.review tasks")
- Telemetry-derived strengths with clear provenance
- Missing-data states when no telemetry exists
- `E2E-P6-004`: model detail telemetry verified

### `R11` Add privacy, retention, and redaction controls

Description:
Telemetry must respect privacy by redacting sensitive content while preserving taxonomy dimensions.

Acceptance criteria:
- Prompt and response body content is redacted or omitted from telemetry records
- Taxonomy dimensions are NEVER redacted — they are non-sensitive metadata
- Redaction policy is configurable per environment via runtime config (`strict`: redact all body content, `standard`: redact only credential-like patterns, `permissive`: redact only explicit secrets)
- Sampling rate is configurable as a percentage (0-100) via runtime config, defaulting to 100% in dev and a lower value in production
- Retention TTL is configurable via runtime config (e.g., `30d`, `90d`, `365d`), with automatic cleanup of expired records on startup and periodically thereafter
- Telemetry records carry a `retainUntil` timestamp derived from the TTL at record creation time
- `E2E-P6-005`: privacy verification with sensitive prompt content

### `R12` Telemetry advisory boundary — warn, don't enforce

Description:
Telemetry-based insights must remain advisory. They can warn about underperforming models but cannot override hard routing policy.

Acceptance criteria:
- Telemetry can add advisory score adjustments (e.g., -0.05 for models with high failure rates on a task)
- Telemetry cannot remove a candidate that passes hard eligibility filters
- Telemetry cannot override user-configured role assignments
- Warning diagnostics visible in routing decisions and Pi diagnostics
- `E2E-P6-006`: telemetry advisory boundary verified
- `E2E-P6-007`: Pi can report telemetry-based reason codes without inventing causality claims

### `R13` Preserve run 57 safety and scope boundaries

Description:
This run must not weaken any safety boundaries established in run 57 or retroactively change Phase 1-4 behavior.

Acceptance criteria:
- `pi-role-model` still does not start, stop, install, update, or own the runtime
- No hidden model calls for classification or benchmark scoring
- No credential reads or copies
- No change to Phase 1-4 role assignment semantics without explicit migration
- Benchmark signals and telemetry signals affect routing only after hard eligibility filtering
- No new top-level UI routes required

### `R14` Use strict TDD and phase-appropriate verification

Description:
Implementation must be test-driven and verified through unit, integration, browser, rebuilt-runtime, and Pi-driven QA layers.

Proposal background: This requirement implements the proposal's Phase 5/6 acceptance criteria as the required verification background for TDD and Phase 4 evidence.

Acceptance criteria:
- Phase 3 declares `TDD Mode: strict` for production code behavior
- every production behavior in `R2` through `R12` has RED evidence before the implementation that makes it pass
- GREEN evidence is captured after each meaningful implementation slice
- code review or Phase 3.5 review is planned unless explicitly waived with rationale
- Phase 4 verifies benchmark schema/data tests, benchmark runner/judge tests, telemetry schema tests, telemetry recording tests, runtime UI tests for benchmark and observe dashboards, and changed-path regression commands
- Phase 4 audits implementation against every requirement ID and every normative proposal section
- Phase 5 manual QA must not start until Phase 4 is locked and test evidence is complete

### `R15` Complete Pi-driven rebuilt-runtime end-to-end manual QA

Description:
Phase 5 must prove the implementation works through real benchmarks, real telemetry, live Pi, and a rebuilt local Role-Model runtime, not only tests.

Proposal background: This requirement implements the proposal's `End-To-End Verification Requirements` and Phase 5/6 E2E test cases as the mandatory Phase 5 verification source.

Acceptance criteria:
- `05-manual-qa.md` declares `QA Execution Mode: agent-operated`
- Phase 5 re-reads `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md` before QA and records that the proposal was used as the verification checklist
- Phase 5 rebuilds Role-Model runtime packages from the implementation worktree
- Phase 5 rebuilds runtime UI from the implementation worktree
- Phase 5 rebuilds `pi-role-model` from the implementation worktree or produced package artifact
- Phase 5 launches the rebuilt Role-Model router runtime locally on a known port
- Phase 5 commands the local Pi instance to update or install the rebuilt `pi-role-model` package
- Phase 5 commands Pi to configure the router endpoint URL, authentication if needed, and a user-facing alias
- Phase 5 commands Pi to run or trigger a benchmark suite covering at least `coder.review`, `researcher.compare_sources`, `support.ticket.reply`, and `data.schema.review`
- Phase 5 inspects benchmark results: model scores per case, aggregate scores by taxonomy dimension (role, task, capability), run metadata, and reproducible run IDs
- Phase 5 sends at least 20 classified requests through the configured alias to generate telemetry with taxonomy dimensions
- Phase 5 sends both valid and intentionally-invalid hard taxonomy requests to verify failure telemetry and safe error metadata
- Phase 5 sends requests with sensitive prompt content to verify privacy redaction in telemetry records
- Phase 5 inspects request responses, normalized intents, decision IDs, candidate filters, candidate scores, selected endpoint/model, benchmark-informed reason codes where applicable, and telemetry-derived diagnostics
- Phase 5 inspects `/app/models/benchmark` for taxonomy-filtered views with role/task filters and per-model score breakdowns
- Phase 5 inspects `/app/observe/requests` and `/app/observe/routing` for taxonomy-dimension filtering and aggregation
- Phase 5 inspects `/app/models` model detail for telemetry rollups showing recent role/task usage and performance
- Phase 5 inspects `/app/router/decisions/:requestId` for benchmark reason codes in routing diagnostics
- Phase 5 records explicit not-yet-implemented notes for any Phase 5/6 surface limitations
- Phase 5 records a proposal coverage table mapping observed QA evidence to every relevant Phase 5/6 proposal E2E case and acceptance criterion
- Phase 5 records exact runtime/package build identifiers, Pi commands/prompts, benchmark run IDs, endpoint/alias configuration, request prompts, decision receipts, screenshots or captured outputs, and any limitations
- implementation defects found during Phase 5 must be fixed through TDD before final QA pass unless they are true external Pi/runtime limitations documented with evidence

### `R16` Satisfy proposal E2E cases for phases 5-6

Description:
The run must execute or explicitly evidence every Phase 5-6 E2E case from the proposal.

Proposal background: This requirement implements the proposal's Phase 5-6 E2E test cases as the explicit Phase 5 verification checklist.

Acceptance criteria:
- Phase 5 records receipts for `E2E-P5-001` through `E2E-P5-006`
- Phase 5 records receipts for `E2E-P6-001` through `E2E-P6-007`
- the minimum benchmark case set is run and verified:
  - `coder.review`
  - `researcher.compare_sources`
  - `support.ticket.reply`
  - `data.schema.review`
- the minimum Phase 1-4 request set from run 57 is re-sent to generate telemetry with taxonomy dimensions
- if the Pi CLI cannot trigger benchmark runs or telemetry queries directly, the closest executable evidence and limitation must be recorded (curl-based API verification is acceptable with explicit Pi limitation documentation)

## Out of Scope

- Changing the canonical taxonomy vocabulary from V1
- Modifying run 57 role assignment semantics
- Adding new top-level UI routes
- Making telemetry signals override hard routing policy
- Adding hidden model calls for benchmark scoring or telemetry analysis
- Pi runtime process ownership, credential reads, or launcher calls

## Suggested Worktree

Use an isolated recursive worktree:

```text
.worktrees/58-role-model-taxonomy-v1-benchmark-telemetry
```

Branch:

```text
recursive/58-role-model-taxonomy-v1-benchmark-telemetry
```

## Expected Product Paths

Likely touched paths, subject to Phase 1 AS-IS findings:

- `schemas/role-model/taxonomy/benchmark-suite.schema.json` (extends `protocol/schemas/benchmark-suite.schema.json`)
- `schemas/role-model/taxonomy/benchmark-run.schema.json` (extends `protocol/schemas/benchmark-run.schema.json`)
- `schemas/role-model/taxonomy/benchmark-result.schema.json`
- `schemas/role-model/taxonomy/telemetry-taxonomy-event.schema.json`
- `role-model-router/packages/core/src/taxonomy/benchmark-linkage.ts`
- `role-model-router/packages/core/src/taxonomy/telemetry-linkage.ts`
- `role-model-router/apps/runtime-host-bridge/src/benchmark-*.ts`
- `role-model-router/apps/runtime-host-bridge/src/index.ts` (telemetry recording)
- `role-model-router/apps/runtime-ui/app/routes/control-benchmark.tsx`
- `role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
- `role-model-router/apps/runtime-ui/app/routes/observe-*.tsx`
- `role-model-router/packages/runtime-observability/src/index.ts`
- `protocol/schemas/router-decision.schema.json`

## Verification Floor

Phase 4 must choose the exact command set from the changed-path regression matrix, but the expected minimum includes:

- focused benchmark schema/data validation tests
- focused benchmark runner, judge, and artifact tests
- focused telemetry schema and recording tests
- focused runtime UI tests for benchmark dashboard and observe routes
- `corepack pnpm run schemas:validate`
- `corepack pnpm run runtime:test-critical` or a justified narrower equivalent during active TDD loops
- `corepack pnpm run runtime:test-browser` or targeted Playwright/browser validation for UI surfaces
- rebuilt-runtime local validation before Phase 5

Phase 5 must add the Pi-driven rebuilt-runtime evidence described in `R15` and `R16`.

## Coverage Gate

Coverage: PASS

This requirements draft covers proposal Phase 5 (benchmark) through R2-R6, proposal Phase 6 (telemetry) through R7-R12, safety boundaries through R13, strict TDD through R14, Pi-driven QA through R15, and E2E verification cases through R16. AS-IS audit covered by R1.

## Approval Gate

Approval: PASS

These requirements are ready for user review and approval before implementation begins in an isolated worktree.
