Run: `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-05-08T06:28:32Z`
LockHash: `a275853ab8bc6e014caacd4c7683dc40e0d7e299705705612a41b179a70afcd8`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/run/11-router-runtime-observability-feedback/00-requirements.md`
- `/.recursive/run/14-router-runtime-ui-foundation/00-requirements.md`
- `/role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
- `/.agents/skills/ui-design-system/references/DESIGN_TOKENS.md`
- `/.agents/skills/ui-design-system/references/RESPONSIVE_PATTERNS.md`
Outputs:
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/00-requirements.md`
Scope note: This document defines the stable requirement contract for unifying runtime telemetry across local and remote endpoints and for delivering a single role-model-owned telemetry dashboard and inspection surface on top of that unified telemetry contract.

## TODO

- [x] Define a stable repo run id and sequence position for the telemetry unification work
- [x] Record the canonical telemetry-contract requirements for local and remote endpoints
- [x] Define the backend persistence and API requirements needed for a single dashboard source of truth
- [x] Record the frontend delivery rule that design-system layouts and theming must land before telemetry page implementation
- [x] Define verification criteria for backend parity, UI behavior, and browser-backed validation
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Requirements

### `R1` Establish one canonical telemetry contract for both local and remote runtime endpoints

Description:
This run must define and implement one role-model-owned telemetry contract that is emitted for both local and remote runtime executions and is suitable as the canonical source of truth for operator dashboards and request inspection.

Acceptance criteria:
- the canonical dashboard telemetry source is the role-model-owned structured observation path, not the preserved raw host `/api/metrics` surface
- the canonical per-request telemetry record is grounded in `RuntimeObservationBundle`, `UsageEventRecord`, and `ObservedPerformanceProfile` semantics rather than a parallel ad hoc frontend shape
- both local and remote runtime endpoints emit the same top-level dashboard-critical telemetry dimensions for a successfully observed request:
  - `requestId`
  - `routingDecisionId`
  - `endpointId`
  - `sourceType`
  - `endpointKind`
  - `providerFamily`
  - `providerKind`
  - `modelId`
  - `createdAtMs`
  - `statusCode`
  - `finishReason`
  - `errorClass`
  - `latencyMs`
  - `inputTokens`
  - `outputTokens`
  - `cacheReadTokens`
  - `cacheWriteTokens`
  - `streamTextDeltaCount`
  - `streamToolCallDeltaCount`
  - `streamToolArgumentDeltaCount`
  - `toolCallCount`
  - `toolExecutionCount`
- unsupported telemetry dimensions are distinguishable from zero or unused values through explicit support flags, nullability rules, or equivalent typed semantics; the run must not treat `0` as the universal encoding for both `'unsupported'` and `'observed zero'`
- the canonical telemetry contract distinguishes cost provenance:
  - actual observed cost when available
  - estimated cost when only estimate-grade data is available
  - unavailable cost when neither is available
- the canonical telemetry contract distinguishes cache capability from cache usage so the dashboard can tell `'cache unsupported'`, `'cache supported but unused'`, and `'cache used'` apart

### `R2` Make telemetry parity real for the currently supported local and remote execution paths

Description:
This run must close the current asymmetry where some runtime paths surface structured telemetry while others still depend on captures, placeholders, or host-owned raw metrics.

Acceptance criteria:
- the runtime paths used for the unified dashboard produce live role-model observations for at least one current local endpoint and one current remote endpoint
- telemetry shown in the unified dashboard must not depend on the static response-capture fallback path as the canonical observation source for the supported local/remote comparison slice
- latency values surfaced to the dashboard and endpoint profiles are measured from real execution timing rather than hardcoded placeholder constants
- the normalized telemetry path records response status for both local and remote executions and preserves provider/adapter identifiers alongside `sourceType`
- when provider-specific response metadata such as provider request ids, rate-limit headers, or cache headers is available, the run captures and normalizes it into the role-model-owned telemetry layer without making the dashboard depend on vendor-specific header names directly
- if a current endpoint family cannot yet produce live parity-grade telemetry, the run must either bring it up to parity or explicitly exclude it from the unified-dashboard source of truth with a typed, inspectable reason instead of silently mixing it with telemetry-enabled endpoints
- the run records the exact parity-validation slice by naming the supported local endpoint and supported remote endpoint that feed unified-dashboard verification, so later phases do not silently change the comparison basis

### `R3` Add queryable persistence and backend APIs for a single dashboard source of truth

Description:
This run must add or extend backend persistence and read APIs so the frontend can render unified telemetry without reconstructing it from raw host metrics or page-local aggregation.

Acceptance criteria:
- the runtime persists enough flattened or indexed telemetry data to query dashboard summaries, endpoint/model comparisons, and recent-request ledgers without reparsing every request bundle on the client
- dashboard summary telemetry exposes a stable default aggregation slice that includes at minimum total request volume, success/error counts or rates, latency percentiles, token totals, and cost posture across both local and remote sources
- the run adds or extends role-model-owned APIs for at least:
  - dashboard summary telemetry
  - endpoint or model telemetry rows
  - recent telemetry-backed requests
  - request-detail telemetry reads
  - endpoint profile/history reads
- the run implements live dashboard freshness through `GET /api/role-model/telemetry/stream` as a required SSE surface derived from the canonical role-model telemetry contract
- the returned dashboard/API rows include local-vs-remote-identifying fields so the frontend can compare the two classes directly without inferring source type from display labels
- the API contract distinguishes:
  - raw host surfaces that remain preserved for adjacent debugging
  - structured role-model telemetry surfaces that are the canonical dashboard inputs
- `/api/metrics` and `/api/captures/:id` remain preserved raw/operator endpoints, but the run explicitly demotes them to secondary/debug surfaces rather than the primary dashboard backend
- backend read APIs are specific enough that the frontend does not need to calculate p50/p95 latency, aggregate error rates, or infer support-vs-zero semantics in page code
- the dashboard-summary, comparison, and recent-request APIs define deterministic query semantics including default time window, ordering, and pagination/filter behavior so frontend code and automated verification can assert stable results
- the SSE freshness surface streams canonical role-model telemetry updates derived from the structured telemetry layer rather than replaying raw host metrics directly

### `R4` Deliver frontend telemetry work through the design system first, then theming, then page implementation

Description:
This run must treat telemetry UI changes as a design-system-led frontend expansion. Shared design-system layouts and theme primitives must be defined first, then implemented in shared infrastructure, and only then consumed by route-level telemetry pages.

Acceptance criteria:
- before telemetry page implementation begins, the run updates `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md` with the telemetry-specific route and layout contract for the affected surfaces
- the design-system update defines or revises the layout patterns required for the telemetry work at minimum across:
  - the top-level dashboard summary surface
  - endpoint/model comparison surfaces
  - telemetry ledger and request-inspection surfaces
  - raw-vs-structured telemetry adjacency where preserved host tools remain visible
- the design-system update names the concrete route ownership for the unified dashboard, comparison, and request-inspection surfaces, including whether the work lands in existing routes or introduces an explicitly documented new route
- before telemetry page implementation begins, the run defines or updates the design-system token contract using the existing three-tier model:
  - primitive tokens
  - semantic tokens
  - component tokens
- before telemetry page implementation begins, the run implements theme-aware shared primitives for the telemetry surfaces, including semantic-token-driven theming rather than page-local color literals
- theme support must include light and dark modes for the telemetry surfaces through semantic token switching rather than duplicate page implementations
- telemetry pages and shared components may not introduce one-off visual rules that bypass the design system, including:
  - hardcoded route-local colors
  - route-local bespoke card systems that duplicate existing shared primitives
  - route-local spacing or border rules that ignore the shared token model
- frontend implementation order is explicit and verifiable:
  1. design-system artifact update
  2. shared token and theme implementation
  3. shared layout/component implementation
  4. route/page implementation on top of those shared primitives

### `R5` Implement one coherent telemetry dashboard and inspection experience inside the runtime UI

Description:
This run must use the unified telemetry contract to create one coherent operator experience rather than leaving telemetry split across unrelated pages and raw JSON dumps.

Acceptance criteria:
- the repo-owned runtime UI surfaces the unified telemetry in a way that makes local and remote endpoints directly comparable from one operator flow
- the top-level dashboard shows aggregated telemetry that includes both local and remote request activity within the same summary surface
- the UI exposes endpoint or model comparison views that include at minimum:
  - source type
  - lifecycle/health state
  - request volume
  - latency
  - failure or error posture
  - token usage
  - cache posture
  - cost posture
- the request-inspection experience renders structured telemetry panels for `usageEvent`, `observedPerformance`, `cacheObservability`, diagnostics, and endpoint profile/history instead of treating the raw bundle JSON as the primary user-facing presentation
- any route that still links to raw host telemetry surfaces does so as an adjacent/operator escape hatch and not as the canonical dashboard view
- the route/layout contract stays aligned with the runtime UI design-system templates already used by the app, especially `summary-board`, `model-inventory`, `ledger-inspector`, and related operator layouts

### `R6` Preserve runtime architecture boundaries while extending telemetry

Description:
This run must extend telemetry and dashboard capability without collapsing runtime boundaries between host-owned raw surfaces, role-model-owned structured inspection, provider adapters, and the UI layer.

Acceptance criteria:
- the run does not replace the preserved raw host/operator surfaces with frontend-only reconstructions
- the role-model-owned telemetry APIs remain separate from vendor-owned raw endpoints and are clearly named and routed as role-model surfaces
- the frontend consumes typed role-model telemetry APIs and view models rather than parsing host logs or vendor-specific raw payloads as its primary data source
- the implementation preserves the existing split between:
  - adapter normalization
  - runtime observation aggregation
  - persistence/query surfaces
  - runtime UI presentation
- browser, peer, or future endpoint families that are not part of the active local/remote telemetry parity slice are not silently widened into scope without an explicit addendum

### `R7` Make the run verifiable through automated validation and browser-backed QA

Description:
This run must be specific enough that later phases can prove telemetry parity and UI correctness through both automated validation and browser-backed operator verification.

Acceptance criteria:
- automated validation must prove that at least one supported local request and one supported remote request produce telemetry records shaped for the unified dashboard
- automated validation must prove that dashboard-summary and endpoint/model telemetry APIs return data for both source types in the same read surface
- automated validation must prove that `GET /api/role-model/telemetry/stream` emits canonical telemetry updates for the supported parity slice and does not depend on raw host metric events as its primary payload source
- automated validation must cover the backend layers changed by the run, including the relevant adapter, observability, persistence, host-bridge API, runtime UI, and view-model paths
- browser-backed verification is required for the repo-owned runtime UI and must include:
  - desktop layout verification
  - narrow/mobile-width layout verification
  - theme verification for the telemetry surfaces
  - verification that local and remote telemetry appear together in the intended unified dashboard experience
  - verification that dashboard freshness updates arrive through the SSE-backed telemetry path without requiring manual page reload
- manual or browser-backed verification must confirm that raw host links remain contextual/secondary and that the telemetry UI does not regress the current route shell or accessibility posture

## Out of Scope

- `OOS1`: replacing the preserved raw host telemetry endpoints such as `/api/metrics`, `/api/captures/:id`, `/logs`, or `/api/events`
- `OOS2`: broad real-time transport work beyond the dashboard-freshness SSE slice, including websocket transport, generalized event-bus productization, or unrelated streaming telemetry surfaces
- `OOS3`: public docs-site telemetry or marketing/documentation surfaces outside the repo-owned runtime operator shell
- `OOS4`: full vendor-family expansion beyond the active local and remote runtime endpoint slice required for unified-dashboard parity
- `OOS5`: speculative charting or analytics productization that is not necessary for the first unified local+remote telemetry dashboard

## Constraints

- Repo run `16-router-runtime-unified-telemetry-dashboard` follows the existing observability and runtime UI foundations and is intentionally scoped as the first telemetry-unification/dashboard run rather than a total runtime redesign.
- The run must consume the structured observability baseline from run `11-router-runtime-observability-feedback`.
- The run must consume the runtime UI shell, route, and design-system baseline from run `14-router-runtime-ui-foundation`.
- The design-system artifact at `/role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md` remains the repo-local source of truth for route layout contracts and shared surface planning.
- The three-tier token model in `DESIGN_TOKENS.md` remains the source of truth for design-token layering, including theme-aware semantic-token switching.
- The responsive/accessibility guidance in `RESPONSIVE_PATTERNS.md` remains in force for telemetry surfaces.
- Preserved host/operator surfaces remain visible as contextual tools, but the dashboard source of truth must be role-model-owned structured telemetry.
- The run must preserve existing runtime architecture boundaries and may not make the UI depend on vendor-specific header names, host-log scraping, or route-local ad hoc telemetry aggregation.
- Frontend telemetry implementation must follow the required order recorded in `R4`; page work may not bypass design-system and theming work.

## Assumptions

- The existing runtime observation bundle, profile aggregation, and runtime UI shell provide enough baseline structure for this run to unify telemetry without inventing a wholly separate telemetry system.
- The current runtime has at least one meaningful local endpoint and one meaningful remote endpoint that can be used as the parity-validation slice for this run.
- The existing runtime UI foundation is mature enough to accept telemetry-specific layout, theming, and shared-component expansion without replacing the shell contract.
- Some provider-specific telemetry fields may remain unavailable for certain families as long as the run encodes that limitation explicitly and keeps the canonical dashboard semantics typed and inspectable.

## Sequence Integration

- Roadmap slot: `post-run14 runtime telemetry unification and unified dashboard`
- Previous repo dependencies:
  - `11-router-runtime-observability-feedback`
  - `14-router-runtime-ui-foundation`
- Additional prerequisite surface: the current local/remote runtime execution baseline present in `runtime-host-bridge`, adapter execution, and provider adapters at implementation time
- Next repo dependency: `TBD after run 16 closeout`
- Required handoff:
  - one canonical local+remote telemetry contract
  - backend query surfaces for unified dashboard reads
  - design-system and theme updates for telemetry layouts
  - repo-owned frontend telemetry pages that consume the canonical telemetry APIs

## Detailed Requirement Specification

- Use the existing role-model structured observability model as the canonical starting point:
  - `RuntimeObservationBundle`
  - `UsageEventRecord`
  - `ObservedPerformanceSample`
  - `ObservedPerformanceProfile`
- Extend the execution/observation path so the unified-dashboard telemetry slice records the same dashboard-critical facts for local and remote endpoints.
- Replace placeholder latency reporting with measured timing for the supported telemetry slice.
- Add explicit support semantics so unsupported metrics are not collapsed into zero.
- Distinguish cost provenance at the telemetry-contract level.
- Preserve raw host telemetry surfaces but move dashboard-critical aggregation to role-model-owned structured APIs.
- Add or extend persistence/query surfaces so the frontend can read:
  - top-level summary facts
  - endpoint/model comparison rows
  - recent telemetry-backed request rows
  - structured request-detail telemetry
  - endpoint profile/history detail
- Add required live dashboard freshness through:
  - `GET /api/role-model/telemetry/stream`
  - SSE events derived from the canonical role-model telemetry layer rather than the preserved raw host metrics feed
- Update the runtime UI design-system artifact before route implementation to define:
  - telemetry dashboard layout
  - endpoint/model comparison layout
  - telemetry ledger and request-inspection layout
  - the placement rule for preserved raw host links
- Implement telemetry theming through shared semantic tokens and component tokens before route implementation.
- Implement route-level frontend changes only after shared design-system and theming work is in place.
- Use shared runtime UI primitives and templates rather than bespoke route-local telemetry widgets wherever the design system already covers the needed surface.
- Keep request-detail inspection typed and operator-friendly:
  - `usageEvent`
  - `observedPerformance`
  - `cacheObservability`
  - diagnostics by category
  - endpoint profile/history
  - tooling receipts
- Keep raw JSON or raw host links as secondary/operator aids rather than the main UI contract.
- Validate the run with both automated checks and browser-backed verification over the unified local+remote telemetry slice.

## Coverage Gate

- [x] A concrete repo run id and sequence position were defined
- [x] Canonical local+remote telemetry parity requirements were captured
- [x] Backend persistence/API requirements for one dashboard source of truth were captured
- [x] Design-system-first, theming-first, then frontend implementation ordering was captured
- [x] Verification expectations for backend parity and browser-backed UI validation were captured

Coverage: PASS

## Approval Gate

- [x] The run is specific enough to drive later AS-IS and TO-BE planning
- [x] The requirements are detailed enough to be tested and audited without relying on chat history
- [x] Scope boundaries are narrow enough to keep this as telemetry unification plus dashboard delivery rather than a full runtime redesign

Approval: PASS
