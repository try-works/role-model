Run: `/.recursive/run/59-observe-taxonomy-analytics-completion/`
Phase: `00 Requirements`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/RECURSIVE.md`
- `/.codex/AGENTS.md`
- `/.agent/PLANS.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/pi-role-model-package.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md`
- `/.recursive/run/58-role-model-taxonomy-v1-benchmark-telemetry/00-requirements.md`
- `/.recursive/run/58-role-model-taxonomy-v1-benchmark-telemetry/04-test-summary.md`
- `/.recursive/run/58-role-model-taxonomy-v1-benchmark-telemetry/05-manual-qa.md`
- `/.recursive/run/58-role-model-taxonomy-v1-benchmark-telemetry/06-decisions-update.md`
- `/.recursive/run/58-role-model-taxonomy-v1-benchmark-telemetry/addenda/05-final-audit.addendum-01.md`
- `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/05-manual-qa.md`
- `/.recursive/run/56-pi-role-model-gap-closure/00-requirements.md`
- `/.recursive/run/56-pi-role-model-gap-closure/05-manual-qa.md`
- `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
- `role-model-router/apps/runtime-ui/DESIGN_APPLE_REFERENCE.md`
- `docs/architecture/11-runtime-ui-telemetry-graph-matrix.md`
- `ui-design-system` skill guidance
- External proposal: `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md`
Outputs:
- `/.recursive/run/59-observe-taxonomy-analytics-completion/00-requirements.md`
Scope note: This follow-up run closes the missing Phase 6 operator-facing telemetry work that run 58 only partially implemented and treats `pi-role-model` runtime-alignment as a P0 requirement. The scope is not limited to `/app/observe/*`; it includes the richer taxonomy telemetry contract, persistence, query semantics, graph surfaces under `/app/observe/*`, request-ledger/detail visibility, the missing taxonomy-aware model rollups under `/app/models`, and the Pi package classification/diagnostic parity needed to surface runtime-owned routing reason codes during live verification. This run does not reopen the benchmark authoring and dashboard program wholesale, but it must explicitly disposition carried-forward Phase 5 dependencies that telemetry, routing diagnostics, Pi explanation, and model rollups still rely on. If one of those dependencies is broken, Phase 1 or Phase 2 must classify it as `repair in scope`, `regression-only verification`, or `defer with follow-up`, rather than leaving it implicit.
Status: `LOCKED`
LockedAt: `2026-06-28T05:50:49Z`
LockHash: `60601e3eb31e8c55872bc2a8962924c2bf2510d8cb0f3cb68a2eb44c57bd1807`

## TODO

- [x] Re-read recursive-mode workflow and bridge docs
- [x] Re-read current state and decision history for runs 49, 53, 56, 57, and 58
- [x] Reconcile the user-reported Observe gap against the current implementation
- [x] Convert the gap into repo-owned requirement IDs
- [x] Narrow the run to the unfinished Phase 6 telemetry/operator-surface work instead of reopening unrelated benchmark work
- [x] Reconcile the spec against runtime UI design-system authority and `ui-design-system` guidance
- [x] Reconcile Pi package scope against the runtime request-detail and router-decision APIs
- [x] Add Phase 0 entry metadata, prior-run dependencies, and verification expectations needed before worktree setup
- [x] Convert the artifact from an exploratory draft into a lock-ready Phase 0 input

## Run Metadata

- Priority: `P0`
- Run type: follow-up implementation and integration gap closure
- Primary subsystems:
  - `role-model-router/apps/runtime-host-bridge/**`
  - `role-model-router/apps/runtime-ui/**`
  - `role-model-router/packages/runtime-observability/**`
  - `role-model-router/packages/sqlite-memory/**`
  - `packages/protocol-types/**`
  - `packages/pi-role-model/**`
- User-visible outcomes:
  - richer taxonomy telemetry graphs on Observe routes
  - richer taxonomy rollups in Models
  - Pi-visible runtime request diagnostics and routing reason reporting
- Main risk theme: operator trust drift between what the runtime records and what Pi can classify, inspect, and explain

## Relevant Prior Runs

| Run | Why it matters here |
| --- | --- |
| `49-runtime-telemetry-analytics-charts` | Established the current telemetry query contract, chart-state semantics, and Observe route ownership |
| `53-runtime-telemetry-analytics-contract-hardening` | Defined the backend-owned analytics contract and semantic chart states that this run must extend, not bypass |
| `54-alias-capability-discovery-contract` | Defined the downstream alias/discovery contract that Pi and runtime consumers rely on |
| `56-pi-role-model-gap-closure` | Established Pi package trust/auth/runtime-boundary rules and live Pi command verification patterns |
| `57-role-model-taxonomy-v1-phase-1-4` | Established taxonomy discovery, runtime intent normalization, and the first live Pi taxonomy injection flow |
| `58-role-model-taxonomy-v1-benchmark-telemetry` | Intended to land benchmark plus telemetry Phase 5/6 scope, but left Observe and Pi diagnostic gaps unresolved |

## Assumptions

- The original proposal remains the normative source for Phase 5 and Phase 6 intent, while run 59 is the controlling execution contract for the narrowed follow-up scope
- The repo continues to use the current runtime UI shell, chart-state vocabulary, and telemetry graph ownership documented in `DESIGN_SYSTEM.md` and `11-runtime-ui-telemetry-graph-matrix.md` unless Phase 1 records a deliberate change
- Existing benchmark data contracts and runtime-owned routing reason-code surfaces remain available enough for regression-only verification unless Phase 1 proves a carried-forward dependency is broken
- The rebuilt runtime on `:3456` can access at least one credentialed remote endpoint through locally available production config without copying secrets into repo artifacts
- Mixed-version telemetry data will exist in realistic stores, so run 59 must treat old rows as a first-class compatibility scenario rather than an edge case

## Constraints

- The run must preserve run-56 and run-57 safety boundaries: no Pi runtime-process ownership, no credential copying, no Pi-side auth-file reads, and no hidden authority transfer from the runtime to Pi
- Telemetry remains advisory only; richer analytics and rollups may explain, warn, and compare, but they must not silently change hard routing eligibility or policy
- UI work must stay inside the runtime design-system contract: one shell header, approved chart states, approved shared telemetry primitives, and no bespoke route-level styling exceptions without explicit design-system updates
- The run must remain backward-compatible with telemetry stores and request records that only contain pre-run-59 role/task dimensions
- Benchmark program redesign, benchmark retagging, and new top-level navigation remain out of scope unless a carried-forward Phase 5 dependency is proven broken and explicitly reclassified in Phase 1 or Phase 2

## Phase 0 Entry Contract

- Worktree path target: `.worktrees/59-observe-taxonomy-analytics-completion`
- Branch target: `recursive/59-observe-taxonomy-analytics-completion`
- Required local prerequisites before Phase 0 lock:
  - local `pi` installation available for Phase 5 command-driven verification
  - rebuilt runtime can be started on `:3456` or the replacement port is explicitly documented if unavailable
  - production runtime config source on this device is locatable for non-secret credential-backed QA setup
  - no conflicting assumption that Pi owns or launches the runtime
- Phase 0 must record:
  - baseline branch and commit
  - normalized diff basis
  - package/runtime test baseline
  - whether `pi` is callable from the worktree shell
  - whether `:3456` is free or which process currently owns it
  - whether the expected alias `hybrid.remote-only` exists in the current runtime config

## Audit And QA Strategy

- Phase 3 TDD target: `strict`
- Phase 3.5 review target: delegated review if subagent context bundle is available; self-audit only with recorded override reason
- Phase 5 QA target: `agent-operated`
- Pi is part of the acceptance surface for this run, not an optional adjacent smoke
- UI work must reference both:
  - `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
  - `ui-design-system` guidance
- Before Phase 3 edits any `runtime-ui` route, shared primitive, or view-model touched by this run, the run records where `ui-design-system` guidance was read and which guidance areas are being applied
- Phase 5 must verify both:
  - runtime UI surfaces
  - Pi command/runtime-diagnostic surfaces

## Problem Statement

Run 58 added only a partial taxonomy telemetry layer:

- backend analytics support stops at `taxonomyRoleId` and `taxonomyTaskType`
- `/app/observe/routing` can break existing charts down by role/task, but it does not provide richer taxonomy-specific graph surfaces
- `/app/observe/requests` still exposes only pre-taxonomy analytics controls and graphs
- stored telemetry does not yet persist the richer taxonomy dimensions required to graph by variant, capability, modality, or tool class
- `/app/models` does not yet expose the richer taxonomy-aware production rollups required by proposal Phase 6
- the telemetry contract does not yet fully preserve the original-vs-normalized taxonomy fields required by run 58
- privacy/retention/sampling/redaction closure remains incomplete even where scaffolding exists

As a result, the runtime UI does not yet display the richer taxonomy telemetry as graphs and rollups in the way the proposal and run-58 requirements implied.

Run 58 also left Pi package alignment incomplete:

- default-install Pi classification refinement does not fully exploit the runtime taxonomy/task-discovery path unless explicitly configured
- taxonomy/runtime state is not refreshed strongly enough after setup/refresh/recovery flows
- Pi command diagnostics focus on discovery health rather than runtime-owned request detail and router decision evidence
- Pi cannot yet reliably surface runtime selection reason codes for benchmark-informed and telemetry-informed routing decisions through a first-class command path

## Source Requirement Inventory

| Source | Contribution to this run |
| --- | --- |
| `D:/DEV/role-model-proposals/16-role-model-taxonomy-v1-proposal.md` | Primary normative source for Phase 6 implementation plus the carried-forward Phase 5 benchmark dependency surface this run still consumes |
| `/.recursive/run/57-role-model-taxonomy-v1-phase-1-4/00-requirements.md` | Canonical Phase 1-4 scope boundary, deferred Phase 5/6 contract, and safety/authority constraints that run 59 must preserve |
| `/.recursive/run/58-role-model-taxonomy-v1-benchmark-telemetry/00-requirements.md` | The intended run-58 telemetry and Observe scope that was only partially landed |
| `/.recursive/run/58-role-model-taxonomy-v1-benchmark-telemetry/06-decisions-update.md` | Locked record of run-58 telemetry and Pi verification shortfalls |
| `/.recursive/run/58-role-model-taxonomy-v1-benchmark-telemetry/addenda/05-final-audit.addendum-01.md` | Concrete implementation gaps to close rather than re-auditing from scratch |
| `/.recursive/run/58-role-model-taxonomy-v1-benchmark-telemetry/05-manual-qa.md` | Evidence that Observe graph coverage remained pending/partial |
| `/.recursive/memory/domains/pi-role-model-package.md` | Current Pi package architecture, boundaries, and extension points |
| `/.recursive/run/56-pi-role-model-gap-closure/00-requirements.md` | Pi package trust/auth/runtime-boundary requirements that must still hold |
| `/.recursive/run/56-pi-role-model-gap-closure/05-manual-qa.md` | Proven Pi verification patterns and command-surface expectations |
| Current code under `role-model-router/apps/runtime-ui/` and `role-model-router/apps/runtime-host-bridge/` | Actual shipped behavior and the contract drift to repair |
| Current code under `packages/pi-role-model/` | Actual Pi request classification and diagnostic behavior to align with the runtime |
| `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md` | Canonical runtime UI implementation contract for charted Observe pages, empty states, chart states, shell layout, and Apple-theme tokens |
| `docs/architecture/11-runtime-ui-telemetry-graph-matrix.md` | Existing telemetry graph builder map and route ownership to extend rather than bypass |

## Normative Proposal Sections

| Proposal Section | Lines | Requirement |
| --- | ---: | --- |
| `Phase 5: Taxonomy-Aware Benchmarks Later` — deliverables | `2650-2656` | carried-forward dependency surface for benchmark-informed reason codes, advisory model signals, and QA evidence that this run still consumes |
| `Phase 5` — acceptance criteria | `2658-2664` | benchmark signals remain post-hard-filter advisory and visible in diagnostics where proposal/run-58 work already established them |
| `Phase 6: Taxonomy-Aware Telemetry Later` — deliverables | `2668-2674` | richer taxonomy telemetry dimensions, Observe analytics dimensions, privacy/retention controls, production rollups |
| `Phase 6` — acceptance criteria | `2676-2682` | dimensions visible in dashboards, telemetry remains advisory, manual QA receipts |

## Explicit Scope Disposition

This run is intentionally narrower than original run 58, but the narrowing must be explicit and auditable.

| Upstream area | Disposition in run 59 | Notes |
| --- | --- | --- |
| Proposal Phase 5 benchmark schemas, case tagging, and aggregate computation | assumed complete unless Phase 1 finds regression | Run 59 does not re-author benchmark schemas or retag cases |
| Proposal Phase 5 benchmark dashboard under `/app/models/benchmark` | out of scope except regression-only verification when telemetry/model-rollup work depends on shared data contracts | This run does not redesign or extend benchmark dashboard UX |
| Proposal Phase 5 benchmark-informed routing reason codes | carried-forward dependency | Pi explanation and runtime diagnostics must surface runtime-owned reason codes if they exist |
| Proposal Phase 5 benchmark advisory signals in `/app/models` | regression-only verification unless model-rollup work exposes broken dependency | Benchmark-adjacent provenance must remain distinguishable from telemetry rollups |
| Proposal Phase 6 telemetry contract, Observe surfaces, privacy controls, model rollups | primary in-scope implementation surface | This is the core of run 59 |
| Run 58 Pi parity and live-verification gaps | primary in-scope implementation surface | This run closes the outstanding integration gap |

## Traceability And Disposition Contract

Phase 1 and Phase 2 must leave a durable, requirement-level answer to two questions:

- Which proposal Phase 5 and Phase 6 obligations still matter to this run?
- For every run 58 requirement, is it closed, carried forward here, regression-verified only, or explicitly deferred?

At minimum, the run must include a traceability matrix with these columns:

- upstream source id
- upstream source type (`proposal-phase5`, `proposal-phase6`, `run58`)
- disposition (`implemented-in-run59`, `regression-only`, `assumed-complete`, `deferred-with-follow-up`, `not-applicable`)
- owning run 59 requirement ids
- verification artifact owner (`01-as-is`, `02-to-be-plan`, `04-test-summary`, `05-manual-qa`)
- rationale

The matrix may live in `01-as-is.md` or `02-to-be-plan.md`, but Phase 2 must be the first artifact that marks the full matrix `Audit: PASS`.

## Requirements

### `R1` Audit the current telemetry analytics and Observe graph surfaces

Description:
Establish exactly which taxonomy dimensions are currently extracted, persisted, queryable, graphed, and visible across `/app/observe/requests`, `/app/observe/routing`, request detail, and model rollups.

Acceptance criteria:
- Inventory current persisted telemetry fields, indexed telemetry columns, analytics dimensions, filters, and graph definitions
- Distinguish between:
  - extracted but not indexed
  - indexed but not queryable
  - queryable but not graphed
  - graphed but not user-filterable
- Record the run-58 requirement drift that this run is explicitly closing
- Record a proposal/run-58 traceability matrix or an exact pointer to the matrix location required by `R14`
- Identify the minimum backward-compatibility constraints for old telemetry rows without richer taxonomy fields
- Identify the carried-forward Phase 5 benchmark dependencies that telemetry, Pi diagnostics, or model rollups still rely on and classify each one as:
  - assumed complete
  - regression-only verification
  - repair in scope if broken
  - defer with required follow-up
- Identify the runtime UI design-system constraints that apply to charted Observe and model-rollup surfaces

### `R2` Expand the canonical taxonomy telemetry contract to support richer analytics

Description:
The telemetry contract must include the richer taxonomy fields needed to power meaningful Observe graphs and model rollups, and it must preserve the original-vs-normalized distinction that run 58 intended.

Acceptance criteria:
- Extend the canonical extraction path so telemetry supports, at minimum:
  - original role hint id
  - original task type
  - normalized role id
  - normalized task type
  - group id derivation or a canonical group lookup path for analytics use
  - task variant
  - capabilities
  - modalities
  - tool classes
  - taxonomy version
  - classification contract version
  - classification source and confidence
  - classification alternatives
- The spec for each field states whether it is:
  - original classified metadata
  - normalized routing metadata
  - derived analytics metadata
- Preserve backward compatibility for telemetry rows that only contain role/task dimensions
- Keep the existing `normalizedIntent` blob untouched as the full-fidelity payload
- Document which fields are single-valued indexed dimensions versus multi-valued graph/query dimensions

### `R3` Introduce a centralized taxonomy analytics dimension registry

Description:
The richer telemetry work must not scatter dimension definitions across extractor, backend analytics, UI controls, and chart builders with no compiler-enforced linkage.

Acceptance criteria:
- Introduce or extend a shared registry or type authority for analytics dimensions used by:
  - telemetry extraction
  - telemetry persistence and enrichment
  - backend analytics filters and breakdowns
  - frontend filter controls
  - frontend chart builders
- Adding a new taxonomy analytics dimension in the future should require touching a small, explicit set of authority files rather than rediscovering dimensions ad hoc
- The run documents how single-valued and multi-valued dimensions are represented in that shared contract
- Phase 1 and Phase 2 identify every pre-run-59 dimension authority or dimension-like surrogate and classify it as:
  - retained as the canonical authority
  - updated to mirror the canonical authority without drift
  - removed or deprecated because it is misleading or redundant
- By the end of implementation, exactly one analytics-dimension authority remains normative for telemetry analytics semantics; comments, alias types, and helper exports that imply a second conflicting authority are updated or removed in the same run
- The shared authority must make it explicit which dimensions are:
  - benchmark-only
  - telemetry-analytics-capable
  - UI-filterable
  - multi-valued versus single-valued

### `R4` Persist and expose richer taxonomy dimensions through the telemetry analytics backend

Description:
The runtime telemetry pipeline must persist and query the richer taxonomy dimensions so Observe graphs and model rollups can aggregate against them consistently.

Acceptance criteria:
- Extend telemetry persistence and enrichment so analytics queries can filter and/or break down by:
  - taxonomy group
  - taxonomy role
  - taxonomy task
  - taxonomy variant
  - taxonomy capability
  - taxonomy modality
  - taxonomy tool class
- Query behavior for multi-valued dimensions is explicitly defined and tested
  - example: one request tagged with two capabilities contributes to both capability buckets
  - example: latency and cost aggregations over multi-valued buckets are defined as duplicated bucket membership based on request membership, not normalized fractional allocation, unless a different rule is explicitly documented
- Success rate, failure rate, ranking, and time-series semantics for multi-valued dimensions are documented and tested
- Existing queries without taxonomy filters remain backward-compatible
- Sparse-dimension support is explicit in API responses so the UI can distinguish `empty`, `unsupported`, and `partially populated`
- The backend exposes enough support metadata for frontend chart states to follow the runtime UI design system without inferring support from zero-valued series
- Storage/schema migration behavior for pre-run-59 telemetry stores is defined and tested:
  - startup upgrade path for added telemetry columns or indexes
  - any observation-to-telemetry enrichment/backfill that is intentionally performed
  - any richer dimensions intentionally left unbackfilled
- The backend defines how mixed-version telemetry windows are reported:
  - whether pre-taxonomy rows are excluded, included without certain buckets, or surfaced as partial coverage
  - whether coverage counts or percentages are returned for the selected range
  - whether backfill is intentionally not performed

### `R5` Add taxonomy-aware controls and graph surfaces to `/app/observe/requests`

Description:
The canonical request-ledger analytics page must support taxonomy exploration directly instead of remaining on the pre-taxonomy controls.

Acceptance criteria:
- Add taxonomy filters to `/app/observe/requests` for the supported dimensions from `R3`
- Extend breakdown and ranking controls so taxonomy dimensions can drive graphs
- Add dedicated taxonomy-oriented graph definitions, not only generic graphs with a hidden alternate breakdown key
- At minimum, provide graphs for:
  - request volume by taxonomy group, role, or task over time
  - request volume by taxonomy role or task over time
  - success/failure by taxonomy task
  - latency by taxonomy task or role
  - ranked comparison by capability, modality, or tool class
- Cross-filtering with endpoint/model/provider/time-range remains supported
- URL-addressable state remains supported
- Empty and sparse states are explicit and user-readable
- Chart states follow the runtime design-system contract for `loading`, `refreshing`, `empty`, `unsupported`, `partial`, `truncated`, `error`, and `populated`
- No route-level title/description duplication is added; implementation respects shell-header ownership

### `R6` Add richer taxonomy graph surfaces to `/app/observe/routing`

Description:
Routing analytics must expose taxonomy performance and routing mix as first-class graphs rather than only generic routing charts with role/task breakdown options.

Acceptance criteria:
- Keep existing routing mix graphs, but add taxonomy-focused routing graphs
- At minimum, provide graphs for:
  - routing decision volume by taxonomy group, role, or task
  - routing decision volume by taxonomy role/task
  - avoided cost by taxonomy role/task
  - success/failure or fallback posture by taxonomy task where data exists
  - ranked comparison by taxonomy capability and tool class where data exists
- Taxonomy graph definitions are first-class chart cards with explicit titles and descriptions
- Graphs degrade cleanly when the selected taxonomy dimension is sparsely populated
- Chart surfaces use the shared telemetry chart primitives and token contract rather than bespoke styling or layout exceptions

### `R7` Complete the taxonomy-aware production rollups in `/app/models`

Description:
To fully satisfy proposal Phase 6 and the unfinished run-58 `R10`, the runtime must expose richer taxonomy-aware production rollups in the model inventory and inspect surfaces.

Acceptance criteria:
- `/app/models` model cards and/or inspect surfaces expose taxonomy-aware telemetry rollups derived from live analytics data
- At minimum, the model inspect experience shows:
  - recent group/role/task usage
  - success/failure/latency breakdown by task type
  - strengths and warnings with clear provenance
  - empty/sparse states when no telemetry exists
- Phase 1 or Phase 2 chooses and documents the rollup authority model:
  - backend-owned rollup contract
  - frontend-composed rollup over generic analytics responses
- If the rollup remains frontend-composed, the plan defines:
  - exact source analytics queries
  - derivation formulas for request counts, success/failure posture, latency summaries, strengths, and warnings
  - ordering and tie-break semantics
  - provenance wording shown to operators
- If the rollup moves to a backend-owned contract, the response schema, provenance fields, and compatibility behavior are defined before implementation
- The implementation does not regress the existing inspect-only modal pattern documented in the runtime design system
- The UI clearly distinguishes benchmark-adjacent signals from telemetry-derived production rollups

### `R8` Make richer taxonomy visible in the request ledger and request detail surfaces

Description:
Observe graphs must be explainable from the canonical request-ledger surfaces. Users need to see the same richer taxonomy attached to concrete requests.

Acceptance criteria:
- Request rows and/or drill-in affordances expose the richer taxonomy metadata added in `R2`
- Request detail shows the normalized taxonomy data used by Observe analytics, including variant, capabilities, modalities, and tool classes when present
- The UI distinguishes raw classified metadata from derived aggregates
- Request detail includes a first-class structured taxonomy presentation, not only a raw JSON disclosure, with explicit labeling for:
  - original classified metadata
  - normalized routing metadata
  - derived analytics metadata used by Observe surfaces
- If raw observation JSON remains available, it is an adjunct evidence surface rather than the only way to inspect richer taxonomy
- Empty-state wording is explicit when a request predates richer taxonomy extraction

### `R9` Complete privacy, retention, sampling, and advisory boundaries while widening telemetry

Description:
Adding richer taxonomy analytics must not expand raw prompt/response exposure or turn telemetry into a hard routing authority. This run also closes the unfinished Phase 6 operational controls left partial in run 58.

Acceptance criteria:
- Taxonomy dimensions remain non-sensitive metadata and can be retained/queryable even when raw bodies are suppressed
- No new raw prompt/response graphing is introduced
- Sampling behavior is explicitly implemented or explicitly deferred by new follow-up requirement with rationale; it may not remain ambiguous scaffolding
- Redaction-level behavior is explicitly implemented or explicitly deferred by new follow-up requirement with rationale; it may not remain ambiguous scaffolding
- Retention cleanup behavior is verified against the current startup path and any periodic cleanup behavior is explicitly documented
- Telemetry analytics remain observational/advisory only
- The run does not widen model eligibility authority beyond the existing advisory boundary
- If sampling is less than 100%, API and UI semantics for partial observability are documented so operators do not mistake sampled telemetry for full census data

### `R10` Use the runtime UI design system and `ui-design-system` guidance for all UI work

Description:
This run changes operator-facing analytics pages. UI implementation must follow the runtime UI design-system contract and use `ui-design-system` guidance for accessibility, responsive behavior, and component/system consistency.

Acceptance criteria:
- The Phase 1 AS-IS and Phase 2 plan explicitly reference the runtime UI design-system constraints relevant to:
  - charted Observe pages
  - analytics control bands
  - empty/unsupported/partial chart states
  - model inspect rollups
- The Phase 1 AS-IS and Phase 2 plan cite the exact design-system and graph-matrix sections used for each changed route or shared primitive
- If new UI behavior requires a design-system change, the relevant design-system artifact is updated before or alongside route implementation
- Runtime UI tests are extended where needed to prove the implementation does not bypass approved token, chart-state, shell-header, or route-template contracts
- The run records that `ui-design-system` guidance was used for accessibility, responsive behavior, and component consistency in the changed UI surfaces
- The run records an explicit receipt that `ui-design-system` guidance was read before UI implementation, including which sections or guidance themes informed:
  - filter controls
  - chart cards and chart states
  - inspect/disclosure UX
  - responsive behavior
- Phase 5 records route-specific UI evidence for desktop and narrow/mobile-width layouts plus keyboard/screen-reader-relevant behavior for any changed filter controls or disclosure patterns

### `R11` Verify the richer taxonomy analytics end to end

Description:
The run must prove the new telemetry dimensions and Observe graphs work with both automated tests and rebuilt-runtime QA.

Acceptance criteria:
- Add focused tests for:
  - extraction and persistence of richer taxonomy dimensions
  - original-vs-normalized telemetry field preservation
  - centralized dimension registry coverage
  - analytics query semantics for multi-valued dimensions
  - mixed-version telemetry windows with partial richer-taxonomy coverage
  - carried-forward benchmark dependency behavior where Pi diagnostics or model rollups consume existing benchmark reason codes
  - truncation and high-cardinality response semantics
  - Observe request controls and graph definitions
  - Observe routing controls and graph definitions
  - model rollup visibility and empty states
  - request-detail visibility of richer taxonomy fields
- Manual QA records agent-operated evidence for:
  - generated telemetry with richer taxonomy fields
  - `/app/observe/requests` taxonomy graphs
  - `/app/observe/routing` taxonomy graphs
  - `/app/models` taxonomy-aware production rollups
  - empty/sparse-state behavior
- Phase 5 manual QA drives the local Pi agent to send prompts or requests through the rebuilt runtime on `:3456`
- Phase 5 uses the `hybrid.remote-only` alias for the Pi-driven end-to-end telemetry verification slice unless Phase 1 finds that the alias contract has changed and records the replacement explicitly
- Phase 5 verifies the Pi extension command surface against the rebuilt runtime, including:
  - `/role-model status`
  - `/role-model doctor`
  - `/role-model requests`
  - `/role-model explain latest`
- Phase 5 observes the resulting telemetry end to end:
  - Pi prompt or request
  - rebuilt runtime request handling
  - persisted telemetry records
  - `/app/observe/requests` graphs and ledger
  - `/app/observe/routing` graphs
  - `/app/models` rollups for the selected remote model
- Phase 5 records whether Pi-visible routing diagnostics include the runtime-owned benchmark/telemetry reason codes expected for the exercised request set, without inventing causality claims beyond the runtime output
- Existing endpoint credentials may be sourced from the production runtime config files already present on this device, but Phase 5 receipts must not copy secrets into recursive artifacts; only the config source, provider/account identifiers, alias used, and non-secret verification evidence are recorded
- Phase 5 records explicit receipts for:
  - `E2E-P6-001`
  - `E2E-P6-002`
  - `E2E-P6-003`
  - `E2E-P6-004`
  - `E2E-P6-005`
  - `E2E-P6-006`
  - `E2E-P6-007`
- Phase 5 includes a proposal coverage table mapping observed evidence to each relevant Phase 6 deliverable and acceptance criterion
- Phase 5 includes a separate dependency coverage table for the carried-forward Phase 5 surfaces this run relies on, even when those surfaces are only regression-verified rather than reimplemented
- If live Pi-driven traffic is unavailable, the closest executable rebuilt-runtime evidence is recorded explicitly

### `R12` Preserve local credential-handling and runtime-safety boundaries during QA

Description:
This run now depends on live Pi-driven QA against a rebuilt runtime using credentials that already exist on the local device. The run must verify end-to-end behavior without widening runtime ownership or leaking secrets into repo artifacts.

Acceptance criteria:
- Phase 5 may use existing production runtime config files on this device as the source of endpoint credentials and provider-account configuration for rebuilt-runtime QA
- No credential values, auth headers, tokens, API keys, copied config blobs, or raw secret-bearing screenshots are stored in recursive artifacts
- QA receipts record only:
  - the config source path or source description
  - the provider/account ids used
  - the alias used
  - the rebuilt runtime endpoint
  - the non-secret telemetry, routing, and UI evidence
- The run does not broaden Pi ownership of the runtime process beyond driving requests against the rebuilt runtime
- Any Phase 5 setup step that depends on the local production runtime config is documented precisely enough to reproduce without exposing secrets

### `R13` Bring `pi-role-model` to runtime-aligned classification and diagnostics parity

Description:
`pi-role-model` is a P0 acceptance surface for this run. The package must match what the runtime expects for request classification, alias handling, taxonomy refresh, and runtime-owned request diagnostics instead of stopping at discovery-only health checks.

Acceptance criteria:
- Default-install behavior on the loopback runtime path supports runtime taxonomy/task refinement without requiring an explicit custom endpoint option
- Runtime taxonomy and related classification state refresh after successful setup and alias-refresh flows instead of remaining stuck on startup-only state
- Alias selection accepts the runtime's canonical alias ids and does not misreport the active model id after Pi model selection
- Pi exposes a first-class command path to inspect recent runtime requests and explain a selected request using the runtime-owned request detail and router decision APIs
- Pi request explanation surfaces runtime-owned routing reason codes when present, including benchmark-informed and telemetry-informed reason codes added by the runtime, without claiming that the Pi package computed those signals itself
- Pi package docs and tests describe the runtime-owned boundary clearly:
  - Pi may inspect runtime diagnostics
  - Pi does not own runtime execution, benchmark scoring, or telemetry aggregation
- No Pi-side change widens runtime ownership, auth-file access, or credential copying beyond the run-56/run-57 safety boundary

### `R14` Make scope narrowing and upstream requirement disposition explicit

Description:
Run 59 intentionally narrows the original run 58 Phase 5+6 scope. That narrowing must be explicit so future runs do not need to rediscover which obligations were closed, carried forward, regression-verified only, or deferred.

Acceptance criteria:
- Phase 1 or Phase 2 contains the traceability matrix defined in `Traceability And Disposition Contract`
- The matrix covers, at minimum:
  - proposal Phase 5 deliverables and acceptance criteria that remain relevant as dependencies
  - proposal Phase 6 deliverables and acceptance criteria
  - run 58 requirements `R1` through `R16`
- Every upstream item is classified as one of:
  - implemented in run 59
  - regression-only verification
  - assumed complete and relied upon
  - deferred with required follow-up
  - not applicable to the narrowed scope
- If an upstream Phase 5 dependency is found broken during this run, the current phase records whether it becomes:
  - an in-scope regression repair
  - an explicit blocker
  - a separate follow-up requirement
- Phase 4 and Phase 5 both cite the matrix when proving coverage

### `R15` Define mixed-version telemetry, sparse coverage, and backfill policy explicitly

Description:
This run will operate over telemetry stores containing pre-taxonomy rows, partially populated rows, and new richer rows. The backend and UI need an explicit policy so analytics remain interpretable and testable.

Acceptance criteria:
- The run explicitly states whether richer taxonomy dimensions are:
  - backfilled
  - not backfilled
  - partially derivable from existing fields
- API responses define how they represent:
  - unsupported dimensions
  - empty windows with no rows
  - partial windows where only some rows contain a richer taxonomy dimension
  - sampled windows where analytics are observational rather than census-complete
- The UI surfaces human-readable wording for partial richer-taxonomy coverage and for requests that predate the richer contract
- Tests cover:
  - pre-taxonomy-only data
  - mixed old/new data in one selected time range
  - fully populated richer-taxonomy data
  - sampled or intentionally partial observability semantics when applicable
- Phase 4 includes at least one startup or migration verification slice against a representative pre-run-59 sqlite telemetry store so the documented mixed-version/backfill policy is proven under the real schema-upgrade path, not only post-migration query fixtures
- No implicit backfill or silent exclusion rule is left for implementers to guess

### `R16` Add analytics scalability, cardinality, and truncation guardrails

Description:
Richer taxonomy dimensions expand bucket count, payload size, and query complexity. The spec must define stable behavior for high-cardinality dimensions so future taxonomy growth does not silently degrade the runtime or UI.

Acceptance criteria:
- The backend defines stable ordering, bucket limits, and truncation semantics for:
  - ranking queries
  - grouped time-series queries
  - multi-valued taxonomy dimensions
- If top-N limiting or `other` bucketing is used, the API contract states:
  - how `other` is computed
  - whether hidden buckets remain queryable through filters
  - how truncation metadata is surfaced to the UI
- Query/index strategy for the added dimensions is documented sufficiently for Phase 1 and Phase 2 auditability
- Phase 4 includes at least one changed-path verification slice that exercises representative higher-cardinality taxonomy data or a justified synthetic equivalent
- The UI does not infer "no data" from truncated or support-limited responses

### `R17` Strengthen route-level UI evidence and design-system receipts

Description:
The UI portion of this run changes multiple operator surfaces. The spec must require route-level evidence that the implementation follows the runtime design system, uses `ui-design-system` guidance, and preserves accessibility/responsiveness.

Acceptance criteria:
- Phase 1 records a route-by-route UI authority map for:
  - `/app/observe/requests`
  - `/app/observe/routing`
  - `/app/models`
  - request detail surfaces changed by this run
- The authority map cites:
  - exact `DESIGN_SYSTEM.md` sections
  - exact `11-runtime-ui-telemetry-graph-matrix.md` sections or graph ownership entries
  - the `ui-design-system` guidance applied
- The authority map also records shared-primitive ownership for any changed:
  - telemetry controls
  - telemetry chart renderer/model files
  - chart configuration or semantic view-model helpers
- If changed route ownership, chart ownership, or chart-definition responsibility no longer matches `11-runtime-ui-telemetry-graph-matrix.md`, that document is updated in the same run; otherwise the run records explicitly why the existing graph-matrix artifact remains correct unchanged
- If a changed surface intentionally leaves the design-system artifact unchanged, the run records why no design-system doc update was required
- Phase 5 manual QA records:
  - desktop evidence
  - narrow/mobile-width evidence
  - keyboard interaction evidence for changed controls
  - chart-state evidence for `empty`, `unsupported`, `partial`, and `truncated` where each state is applicable
- Phase 4 or Phase 5 records any accessibility limitations discovered and whether they were fixed or deferred

## Out of Scope

- Reopening benchmark pipeline work except where telemetry or model-rollup surfaces already consume benchmark-adjacent runtime data
- Re-authoring benchmark schemas, retagging benchmark cases, or redesigning `/app/models/benchmark` unless Phase 1 finds a blocking regression in a carried-forward dependency
- Changing canonical taxonomy vocabulary IDs
- Reworking the benchmark UI under `/app/models/benchmark`
- New top-level navigation routes
- Telemetry-based hard routing enforcement
- General Pi package work unrelated to runtime classification parity or runtime-owned diagnostic visibility

## Suggested Worktree

Use an isolated recursive worktree:

```text
.worktrees/59-observe-taxonomy-analytics-completion
```

Branch:

```text
recursive/59-observe-taxonomy-analytics-completion
```

## Expected Product Paths

Likely touched paths, subject to Phase 1 findings:

- `packages/protocol-types/src/taxonomy-extraction.ts`
- `packages/protocol-types/src/taxonomy-dimensions.ts`
- `schemas/role-model/taxonomy/telemetry-taxonomy-event.schema.json`
- `role-model-router/packages/runtime-observability/src/index.ts`
- `role-model-router/packages/sqlite-memory/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.ts`
- `role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.test.ts`
- `role-model-router/apps/runtime-ui/app/lib/telemetry-chart-config.ts`
- `role-model-router/apps/runtime-ui/app/lib/telemetry-chart-config.test.ts`
- `role-model-router/apps/runtime-ui/app/lib/telemetry-route-models.ts`
- `role-model-router/apps/runtime-ui/app/lib/telemetry-route-models.test.ts`
- `role-model-router/apps/runtime-ui/app/lib/view-models.ts`
- `role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`
- `role-model-router/apps/runtime-ui/app/components/telemetry-controls.tsx`
- `role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx`
- `role-model-router/apps/runtime-ui/app/components/telemetry-charts.test.tsx`
- `role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
- `docs/architecture/11-runtime-ui-telemetry-graph-matrix.md`
- `role-model-router/apps/runtime-ui/app/routes/requests.tsx`
- `role-model-router/apps/runtime-ui/app/routes/observe-routing.tsx`
- `role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
- `role-model-router/apps/runtime-ui/app/routes/request-detail.tsx`
- `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
- `packages/pi-role-model/src/extension.ts`
- `packages/pi-role-model/src/commands.ts`
- `packages/pi-role-model/src/runtime-inspection.ts`
- `packages/pi-role-model/src/taxonomy/resolve-effective-taxonomy.ts`
- `packages/pi-role-model/README.md`
- `packages/pi-role-model/skills/role-model/SKILL.md`
- `packages/pi-role-model/test/commands.test.ts`
- `packages/pi-role-model/test/extension.test.ts`
- `packages/pi-role-model/test/runtime-inspection.test.ts`

## Verification Floor

Phase 4 must choose the exact command set from the changed-path regression matrix, but the expected minimum includes:

- focused protocol-types or schema validation covering richer telemetry fields
- focused sqlite-memory and runtime-observability tests
- focused runtime-host-bridge analytics-query tests
- focused sqlite migration or startup-upgrade verification against representative pre-run-59 telemetry storage
- at least one explicit verification slice for higher-cardinality or truncated taxonomy analytics behavior, recording the exercised dataset shape plus observed truncation metadata, payload shape, or representative query timing
- focused runtime-ui tests for Observe request/routing controls, graph definitions, request-detail taxonomy presentation, model rollups, shared telemetry primitives, and design-system contract compliance
- regression-only verification for `/app` dashboard charts if shared telemetry chart primitives, chart-state semantics, or shared telemetry view-model helpers change
- focused `pi-role-model` tests for runtime classification refresh, alias handling, and runtime diagnostic commands
- `corepack pnpm run schemas:validate`
- `corepack pnpm --filter @role-model-router/runtime-observability test`
- `corepack pnpm --filter @role-model-router/sqlite-memory test`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge test`
- `corepack pnpm --filter @role-model-router/runtime-ui test`
- `corepack pnpm --filter @role-model-router/runtime-ui build`
- `corepack pnpm --filter @try-works/pi-role-model build`
- `corepack pnpm --filter @try-works/pi-role-model test`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge run test:validate-ui` or the changed-path equivalent
- rebuilt-runtime browser verification of the changed Observe and Models surfaces before Phase 5 lock

## Phase Receipt Expectations

- `00-worktree.md`
  - proves isolated worktree creation, baseline branch/commit, diff basis, and whether `pi` plus `:3456` are ready for later QA
- `01-as-is.md`
  - enumerates current telemetry contract, Observe graph gaps, request-detail gaps, model-rollup gaps, Pi package classification/diagnostic gaps, and the upstream traceability/disposition matrix with code refs
- `02-to-be-plan.md`
  - maps every `R#` to concrete backend, UI, and Pi package changes plus Phase 4/5 verification, including carried-forward Phase 5 dependency disposition
- `03-implementation-summary.md`
  - records strict TDD evidence for runtime, UI, and Pi package slices
- `04-test-summary.md`
  - includes changed-path verification plus `pi-role-model` command/runtime-inspection coverage, mixed-version telemetry coverage, and scalability/truncation evidence
- `05-manual-qa.md`
  - proves end-to-end runtime UI and Pi verification against the rebuilt runtime on `:3456` with non-secret evidence only, plus route-level UI evidence and dependency coverage tables

## Lock Readiness Notes

- This artifact is intended to be lockable before Phase 0 begins.
- All known scope changes requested in chat up to this point are now reflected in repo-owned requirements.
- No unresolved TODO items should remain once the final pre-lock pass is complete.

## Coverage Gate

Coverage: PASS

This requirements artifact converts the user-reported Observe gap into a bounded but complete Phase 6 follow-up: richer telemetry contract coverage, centralized analytics dimensions, backend query semantics, Observe graphing surfaces, request-ledger visibility, `/app/models` production rollups, operational privacy controls, design-system-governed UI work, explicit Pi package runtime-alignment work, explicit upstream traceability/disposition rules, mixed-version telemetry policy, and explicit E2E receipts.

## Approval Gate

Approval: PASS

This artifact is ready for Phase 0 worktree setup and Phase 1 AS-IS analysis.
