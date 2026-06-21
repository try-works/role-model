Run: `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-06-21T17:46:53Z`
LockHash: `16633c5e02efc54ebb62b93935644df45558df6e1f4cffac7fedcd216f1a9fae`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/00-requirements.md`
- `/.recursive/run/45-observe-surface-realignment/00-requirements.md`
- `/.recursive/run/48-runtime-ui-design-system-apple-theme/00-requirements.md`
- `/.recursive/run/49-runtime-telemetry-analytics-charts/00-requirements.md`
- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/00-requirements.md`
- `/docs/architecture/10-runtime-testing-architecture.md`
- `/docs/architecture/11-runtime-ui-telemetry-graph-matrix.md`
- `/role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.ts`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
- `/role-model-router/apps/runtime-ui/app/lib/telemetry-route-models.ts`
- `/role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.ts`
- `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `/role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx`
- `/role-model-router/apps/runtime-ui/app/components/telemetry-charts.test.tsx`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/packages/runtime-observability/src/index.ts`
- `/role-model-router/packages/sqlite-memory/src/index.ts`
- User guidance in chat on 2026-06-21:
  - the telemetry remediation proposal must become a new recursive run requirement
  - frontend and design principles require design-system updates first, and only then frontend implementation
  - use TDD in the proposal and make every change verifiable
Outputs:
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/00-requirements.md`
Scope note: This run hardens the runtime telemetry analytics system from a first-generation chart feature into a backend-owned, contract-driven analytics surface with explicit metric and dimension semantics, design-system-backed chart states, aligned ledger and analytics filters, truthful coverage and truncation metadata, and durable regression coverage on the rebuilt runtime.

## TODO

- [x] Re-read the recursive control-plane inputs required for a new run
- [x] Identify the prior telemetry, design-system, Observe, and testing runs that form the starting baseline
- [x] Convert the approved telemetry hardening proposal into stable repo-owned requirements
- [x] Encode the design-system-first frontend rule explicitly in the run contract
- [x] Encode strict TDD and verifiable proof obligations explicitly in the run contract
- [x] Define backend contract, frontend semantics, coverage, and regression requirements
- [x] Record out-of-scope boundaries, constraints, and assumptions
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Source Requirement Inventory

| Source | Contribution to this run |
| --- | --- |
| `/.recursive/STATE.md` | current runtime truth for telemetry surfaces, host bridge responsibilities, SQLite persistence, and existing validator/test commands |
| `/.recursive/DECISIONS.md` | prior implementation history for telemetry, Observe surfaces, Apple-theme design-system work, and testing architecture |
| runtime routing and provider-capabilities domain memory | durable truth for backend-owned telemetry, operator-surface boundaries, and rebuilt-runtime verification expectations |
| run `16` requirements | original unified telemetry/dashboard baseline |
| run `45` requirements | Observe ownership and separation between analytics and evidence/raw-host pages |
| run `48` requirements | design-system-first rule, Apple-theme authority, and shared runtime UI token ownership |
| run `49` requirements | first-generation telemetry analytics chart contract and route inventory |
| run `51` requirements and `/docs/architecture/10-runtime-testing-architecture.md` | canonical regression tiers, TDD expectations, browser E2E, rebuilt-runtime, and packaged-runtime verification rules |
| `/docs/architecture/11-runtime-ui-telemetry-graph-matrix.md` | current audited failure matrix: 50-row cap, misleading empty chart shells, missing breakdown series, cost/cache truthfulness gaps, and ledger/filter divergence |
| current runtime-ui and runtime-host telemetry files | actual implementation seams for design-system tokens, view models, chart rendering, analytics query transport, observation capture, persistence, and backend aggregation |
| chat guidance on 2026-06-21 | fixed product direction for design-system-first frontend work, strict TDD, and verifiable changes |

## Problem Summary

The current runtime telemetry system is functional but architecturally under-specified. Run `49` established the first telemetry chart surfaces, but the follow-up audit in `/docs/architecture/11-runtime-ui-telemetry-graph-matrix.md` shows that the present contract still allows misleading operator states:

1. analytics can aggregate only the most recent `50` rows rather than the full requested slice
2. time-series charts can render shells even when the metric has no meaningful data
3. single-metric breakdown charts can render with totals but no visible series
4. cost, avoided-cost, and cache telemetry can appear as zero or null without a truthful explanation of support or coverage
5. request ledgers and analytics charts can disagree because their filter semantics diverge

This run closes that gap by making telemetry a contract-driven subsystem rather than a loose collection of route-specific chart queries and fallback rendering decisions.

## Contract-First Delivery Rule

Implementation for this run must follow this order:

1. requirements contract
2. AS-IS telemetry audit against the current backend, persistence, route models, and chart rendering path
3. failing backend and model-layer tests for the required analytics-contract and semantics changes
4. backend analytics contract, metric registry, dimension registry, and filter-alignment implementation
5. shared runtime UI design-system update for telemetry-specific states and affordances
6. shared frontend semantic view-model and chart-primitives implementation against the updated design system
7. route-level frontend consumers
8. telemetry emission and coverage repair where backend-recorded facts are incomplete or misleading
9. browser E2E, rebuilt-runtime verification, and documentation closeout

This run may not ship as route-level chart tweaks only. Backend contract, design-system contract, automated tests, and rebuilt-runtime browser proof are all in scope.

## Frontend Design-System-First Rule

Frontend delivery for this run must follow this order:

1. `/role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
2. `/role-model-router/apps/runtime-ui/app/lib/design-system.ts`
3. `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
4. shared telemetry semantic view models and shared chart primitives
5. route-level chart consumers and controls

No route-level telemetry UI change may land ahead of the corresponding shared design-system update and design-system regression coverage for that same slice.

## Fixed Decisions

1. Telemetry analytics remain backend-owned. The runtime host, not route-local frontend logic, is the source of truth for metric semantics, dimension semantics, support coverage, and truncation state.
2. Ledger queries and analytics queries are different contracts and must not silently share a recent-row cap.
3. Telemetry chart states are first-class design-system concepts, not incidental component behavior. At minimum the runtime UI must distinguish `loading`, `refreshing`, `empty`, `unsupported`, `partial`, `truncated`, `error`, and `populated`.
4. Charts must remain truthful. The runtime UI may not render fake sample data or visually imply meaningful telemetry when the selected metric or dimension is absent, unsupported, or under-covered.
5. Frontend route pages under `/app` and `/app/observe/*` may consume telemetry analytics, but setup and control pages must not regress into analytics dashboards just to surface missing metrics.
6. Strict TDD is required for every code-bearing slice in this run unless a documented pragmatic exception is explicitly recorded in the implementation phase artifact.
7. Every change must be verifiable through at least one automated layer and, for operator-facing telemetry UI, rebuilt-runtime browser verification.
8. The telemetry contract must be extensible: adding a new metric or dimension later should be primarily a registry and test update, not a multi-file ad hoc patch.

## Requirements

### `R1` Enforce design-system-first telemetry frontend delivery

Description:
Telemetry UI work must follow the repository rule that the shared design system is updated first and route-level consumption follows later.

Acceptance criteria:
- Phase 2 planning explicitly sequences telemetry frontend work as `DESIGN_SYSTEM.md` -> `design-system.ts` -> `design-system.test.ts` -> shared telemetry view models/primitives -> route consumers
- Phase 3 evidence shows no route-level telemetry UI slice was implemented without the corresponding shared design-system update and regression coverage
- telemetry-specific visual states, affordances, and copy conventions are introduced first in the shared design-system contract rather than being hardcoded inside route files

### `R2` Define a canonical telemetry analytics response contract

Description:
The runtime host must expose one canonical analytics response contract that communicates not only metric values, but also whether those values are complete, truncated, unsupported, sparse, or otherwise limited.

Acceptance criteria:
- the analytics response contract includes the applied query shape, applied filters, bucket results, optional breakdown results, optional ranking results, and explicit metadata about slice size and data quality
- the response metadata includes at least `matchedRowCount`, `scannedRowCount`, `aggregationRowCount`, `truncated`, and `truncationReason` or their canonical equivalents
- the response contract includes explicit support and coverage metadata for requested metrics and dimensions rather than forcing the frontend to infer support from `0`, `null`, or missing series
- the response remains deterministic for empty but valid slices by returning explicit empty arrays and truthful state metadata instead of omitted structures

### `R3` Separate analytics aggregation semantics from request-ledger semantics

Description:
Analytics reads must aggregate the requested slice truthfully rather than inheriting a recent-row ledger limit.

Acceptance criteria:
- the default analytics contract aggregates the full requested time slice unless the caller explicitly requests sampling or truncation behavior
- if truncation or sampling is supported, it is opt-in or explicitly surfaced in response metadata rather than silently applied
- request-ledger read limits remain available for canonical ledgers without leaking that same limit into chart aggregation
- automated regression coverage proves that a slice larger than `50` records is fully aggregated by the analytics endpoint when no explicit truncation is requested

### `R4` Introduce a metric registry with explicit support semantics

Description:
Metric behavior must be defined centrally so charts do not each improvise aggregation, support, or empty-state rules.

Acceptance criteria:
- the runtime owns a metric registry or equivalent canonical layer for telemetry metrics such as request count, tokens, latency, cost, avoided cost, cache metrics, failure volume, and tool usage
- each metric definition declares its aggregation semantics, support requirements, formatting expectations, and empty or unsupported behavior
- mixed-support metrics such as cache-hit rate expose truthful supported-subset coverage or explicit unsupported semantics rather than collapsing to unexplained null behavior
- adding a new metric later is primarily a registry, test, and documentation update rather than a route-specific one-off implementation

### `R5` Introduce a dimension registry with explicit sparsity semantics

Description:
Breakdowns and rankings must handle absent or sparse dimensions explicitly instead of yielding invisible charts.

Acceptance criteria:
- the runtime owns a dimension registry or equivalent canonical layer for dimensions such as provider, endpoint, model, source, requested role, task, selected strategy, execution mode, difficulty bucket, and status family
- each dimension definition declares its label behavior, eligibility, and sparse-data semantics
- when a breakdown dimension is absent or under-populated for a valid slice, the response and frontend semantic model distinguish that from `no data`
- single-metric breakdown charts may not silently render with totals but no visible series; they must either fall back through a documented rule or render an explicit sparse-dimension state

### `R6` Implement a shared semantic telemetry chart-state model

Description:
The runtime UI must render telemetry charts through one explicit semantic state model rather than ad hoc empty checks inside chart components.

Acceptance criteria:
- the shared frontend telemetry model can represent at least `loading`, `refreshing`, `empty`, `unsupported`, `partial`, `truncated`, `error`, and `populated`
- `DESIGN_SYSTEM.md` documents the visual and copy contract for those states before route consumers are updated
- component and view-model code consume the semantic state model rather than deriving emptiness from bucket length alone
- populated charts remain visible during background refresh when stale-while-refreshing is appropriate, and the design system provides a calm refreshing affordance for that case

### `R7` Align request-ledger and analytics filter semantics

Description:
The request ledger and telemetry charts must either use the same effective filter semantics for shared dimensions or surface their differences explicitly.

Acceptance criteria:
- the chart query model and request-ledger model share one canonical definition for overlapping filters such as date range, source, provider, endpoint, model, role, operation, and status family, or else their differences are explicit and documented
- the runtime returns applied filter metadata so the UI can show the actual slice being rendered
- automated coverage proves that common filtered views produce aligned ledger and analytics results for the same slice
- the UI no longer silently mixes server-side analytics filtering with materially different client-side ledger filtering for the same operator controls

### `R8` Repair telemetry fact coverage where the runtime emits misleading empties

Description:
The telemetry system must record or explicitly classify missing facts for metrics and dimensions that operator charts depend on.

Acceptance criteria:
- runtime observation creation and persistence are audited for cost, avoided-cost, cache, requested-role, task, selected-strategy, execution-mode, difficulty, status, and tool-usage fields used by the telemetry surfaces
- when a metric is genuinely unavailable for the selected slice, the backend exposes that truth explicitly instead of allowing the UI to imply a valid zero
- when a metric should be available but is currently dropped on part of the runtime path, the run repairs the emission path and adds regression coverage
- cost and cache semantics shown in analytics stay aligned with the same stored authoritative fields used elsewhere in the runtime

### `R9` Add thorough automated regression coverage across backend, frontend, and rebuilt-runtime layers

Description:
The telemetry hardening must be guarded by durable regression coverage, not only by manual inspection.

Acceptance criteria:
- strict TDD is used for code-bearing changes in this run, with concrete RED and GREEN evidence captured in the implementation artifact
- automated coverage includes unit tests for metric and dimension registries, integration tests for analytics-query semantics, component or view-model tests for semantic chart states, and browser E2E for the rebuilt runtime telemetry surfaces
- the verification plan reuses and extends the canonical test architecture from run `51`, including named commands and artifact capture
- runtime UI/browser proof is executed against a rebuilt runtime surface rather than a frontend-only mock or component preview

### `R10` Update the durable telemetry architecture documentation

Description:
The repo must end this run with telemetry documentation that explains how storage, analytics contract, semantic chart states, and operator routes interact.

Acceptance criteria:
- `/docs/architecture/11-runtime-ui-telemetry-graph-matrix.md` is updated from its current audit-draft state to reflect the post-run truth, or it is explicitly superseded by a new durable architecture document with clear cross-references
- the durable documentation explains the end-to-end path from observation creation through SQLite persistence, analytics query processing, view-model semantics, and chart rendering
- the documentation includes at least one matrix or diagram that makes metric/dimension semantics and route ownership understandable without reading implementation code
- the documentation reflects the design-system-first rule for future telemetry UI extensions

## Out of Scope

- `OOS1`: turning the runtime into a generic business-intelligence product with arbitrary ad hoc dashboard authoring
- `OOS2`: introducing a separate analytics database or warehouse outside the existing runtime SQLite storage baseline
- `OOS3`: live-provider or real-credential telemetry testing in the default CI floor
- `OOS4`: redesigning unrelated runtime UI information architecture outside the work needed to make telemetry truthful and design-system-consistent
- `OOS5`: backfilling perfect analytics for historical rows that were never recorded with the necessary facts, beyond the explicit migration or support-classification work chosen in this run
- `OOS6`: broad packaging or release-pipeline redesign unrelated to the verification obligations for telemetry changes

## Constraints

- frontend telemetry work must follow the shared design-system-first rule with no route-level bypass
- backend analytics, not frontend inference, remains the source of truth for metric and dimension semantics
- all code-bearing changes must follow TDD unless a documented pragmatic exception is justified in Phase 3
- every change must be verifiable through automated evidence, and operator-facing UI changes additionally require rebuilt-runtime browser verification
- the default automated floor must remain deterministic and not require live external credentials
- charts may not render fake sample series or visually overclaim unsupported metrics
- the run must preserve the existing route ownership boundary between analytics pages and evidence/raw-host pages

## Assumptions

- the current telemetry query endpoint remains the canonical transport surface for runtime analytics rather than being replaced wholesale in this run
- the current audit findings in `/docs/architecture/11-runtime-ui-telemetry-graph-matrix.md` are an accurate enough starting point for Phase 1 AS-IS analysis
- the regression harness and command architecture from run `51` can be extended for telemetry-specific coverage without replacing the broader repository testing model

## Coverage Gate

Coverage: PASS

- `R1` encodes the user’s explicit design-system-first rule for frontend changes
- `R2` through `R5` cover the backend analytics contract, full-slice aggregation semantics, and explicit metric and dimension registry behavior
- `R6` covers the shared frontend semantic chart-state model the current implementation lacks
- `R7` and `R8` cover the current audit findings around filter divergence and missing or misleading telemetry facts
- `R9` encodes strict TDD and thorough automated plus rebuilt-runtime verification obligations
- `R10` ensures the run leaves durable architecture documentation rather than only code changes
- out-of-scope items and constraints keep the run focused on truthful telemetry hardening rather than broad unrelated dashboard or infra expansion

## Approval Gate

Approval: PASS

- the artifact is repo-specific and grounded in the actual telemetry audit, prior telemetry/design/testing runs, and current runtime files
- the requirement is implementation-ready: it specifies order of operations, fixed decisions, concrete `R#` acceptance criteria, and verification obligations
- the user’s additional constraints on design-system-first delivery, TDD, and verifiable proof are explicitly incorporated
- the scope is systematic and extensible rather than a one-off patch for one chart or one route
