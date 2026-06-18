Run: `/.recursive/run/49-runtime-telemetry-analytics-charts/`
Phase: `02 TO-BE PLAN`
Status: `LOCKED`
LockedAt: `2026-06-17T08:39:46Z`
LockHash: `cb0bd6761f6bbcb4f2adb9bc2351a97e4daac63f4c6fbbc50ae479e8bcadd0df`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/49-runtime-telemetry-analytics-charts/00-requirements.md`
- `/.recursive/run/49-runtime-telemetry-analytics-charts/00-worktree.md`
- `/.recursive/run/49-runtime-telemetry-analytics-charts/01-as-is.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/00-requirements.md`
- `/.recursive/run/45-observe-surface-realignment/00-requirements.md`
- `/.recursive/run/48-runtime-ui-design-system-apple-theme/00-requirements.md`
- `/TEMP-FAS-7-telemetry-analytics-plan.md`
- `/TEMP-FAS-7-route-chart-spec.md`
- `/role-model-router/apps/runtime-ui/DESIGN_APPLE_REFERENCE.md`
Outputs:
- `/.recursive/run/49-runtime-telemetry-analytics-charts/02-to-be-plan.md`
Scope note: This ExecPlan-grade artifact converts the locked run-49 telemetry analytics requirements into a dependency-ordered implementation plan for immutable SQLite-backed telemetry facts, one generic backend analytics API, an Apple-theme shared chart system, and chart-led Overview/Observe analytics routes.

## TODO

- [x] Re-read the locked requirements, worktree basis, and AS-IS inventory
- [x] Choose the backend storage, query, and frontend sequencing strategy
- [x] Define expected changed files and likely new files
- [x] Record strict TDD slices, validation order, and Phase 5 browser QA obligations
- [x] Complete the audited sections and gates

## Planned Changes by File

- `role-model-router/packages/sqlite-memory/src/index.ts`
- `role-model-router/packages/sqlite-memory/test/index.test.ts`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/session-readiness-api.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/validate-ui.test.ts`
- `role-model-router/apps/runtime-ui/package.json`
- `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
- `role-model-router/apps/runtime-ui/app/app.css`
- `role-model-router/apps/runtime-ui/app/routes.ts`
- `role-model-router/apps/runtime-ui/app/components/app-shell.tsx`
- `role-model-router/apps/runtime-ui/app/components/page-primitives.tsx`
- `role-model-router/apps/runtime-ui/app/lib/design-system.ts`
- `role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`
- `role-model-router/apps/runtime-ui/app/lib/view-models.ts`
- `role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`
- `role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`
- `role-model-router/apps/runtime-ui/app/routes/requests.tsx`
- `role-model-router/apps/runtime-ui/app/routes/request-detail.tsx`
- `role-model-router/apps/runtime-ui/app/routes/observe-activity.tsx`
- `role-model-router/apps/runtime-ui/app/routes/observe-logs.tsx`
- `role-model-router/apps/runtime-ui/app/routes/app-layout.tsx`
- `role-model-router/apps/runtime-ui/app/routes/index.tsx`
- `role-model-router/apps/runtime-ui/app/routes/router.tsx`
- `role-model-router/apps/runtime-ui/app/routes/control-routing-strategy.tsx`
- `role-model-router/apps/runtime-ui/app/routes/control-controller.tsx`
- `role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
- `role-model-router/apps/runtime-ui/app/components/telemetry-chart-frame.tsx` (new)
- `role-model-router/apps/runtime-ui/app/components/telemetry-analytics-controls.tsx` (new)
- `role-model-router/apps/runtime-ui/app/components/telemetry-legend.tsx` (new)
- `role-model-router/apps/runtime-ui/app/components/telemetry-empty-state.tsx` (new)
- `role-model-router/apps/runtime-ui/app/components/telemetry-loading-state.tsx` (new)
- `role-model-router/apps/runtime-ui/app/lib/telemetry-chart-config.ts` (new)
- `role-model-router/apps/runtime-ui/app/lib/telemetry-chart-config.test.ts` (new)
- `role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.ts` (new)
- `role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.test.ts` (new)
- `role-model-router/apps/runtime-ui/app/routes/observe-routing.tsx` (new)

## Requirement Mapping

- R1 | Disposition: planned | Source Quote: ### `R1` Persist historical telemetry as immutable request-time facts in the existing SQLite runtime store | Summary: extend SQLite-backed telemetry persistence so each request row carries immutable request-time routing/provider/cost facts | Coverage: direct | Implementation Surface: `role-model-router/packages/sqlite-memory/src/index.ts`, `role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: `role-model-router/packages/sqlite-memory/test/index.test.ts`, focused host-bridge telemetry persistence tests | QA Surface: request-detail cost audit plus populated chart verification
- R2 | Disposition: planned | Source Quote: ### `R2` Make historical analytics depend on request-time truth rather than current registry or endpoint state | Summary: remove live-state dependence from historical chart dimensions and labels | Coverage: direct | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: focused host-bridge analytics query/read-path tests | QA Surface: compare request-detail evidence and chart legends against generated request-time data
- R3 | Disposition: planned | Source Quote: ### `R3` Add one generic backend-owned telemetry analytics query API | Summary: add `POST /api/role-model/telemetry/query` for bucketed and ranked analytics reads | Coverage: direct | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/index.ts`, `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts` | Verification Surface: focused host-bridge analytics query tests, `runtime-api.test.ts` | QA Surface: populated chart routes in browser
- R4 | Disposition: planned | Source Quote: ### `R4` Preserve runtime boundary discipline while expanding telemetry analytics | Summary: keep analytics backend-owned while preserving config/evidence route boundaries | Coverage: direct | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/index.ts`, `role-model-router/apps/runtime-ui/app/routes.ts`, `role-model-router/apps/runtime-ui/app/lib/design-system.ts`, `role-model-router/apps/runtime-ui/app/routes/router.tsx`, `role-model-router/apps/runtime-ui/app/routes/control-routing-strategy.tsx`, `role-model-router/apps/runtime-ui/app/routes/control-controller.tsx`, `role-model-router/apps/runtime-ui/app/routes/control-models.tsx` | Verification Surface: `role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`, focused host-bridge analytics contract tests | QA Surface: `/app/router` remains config-first while Observe holds analytics
- R5 | Disposition: planned | Source Quote: ### `R5` Extend the runtime UI design system with a shared chart foundation and chart-token contract | Summary: add Apple-theme chart tokens, palette, shared primitives, and analytics controls before route styling | Coverage: direct | Implementation Surface: `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`, `role-model-router/apps/runtime-ui/app/app.css`, `role-model-router/apps/runtime-ui/app/lib/design-system.ts`, `role-model-router/apps/runtime-ui/app/components/telemetry-chart-frame.tsx`, `role-model-router/apps/runtime-ui/app/components/telemetry-analytics-controls.tsx`, `role-model-router/apps/runtime-ui/app/components/telemetry-legend.tsx`, `role-model-router/apps/runtime-ui/app/components/telemetry-empty-state.tsx`, `role-model-router/apps/runtime-ui/app/components/telemetry-loading-state.tsx`, `role-model-router/apps/runtime-ui/app/lib/telemetry-chart-config.ts` | Verification Surface: `role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`, `role-model-router/apps/runtime-ui/app/lib/telemetry-chart-config.test.ts` | QA Surface: light/dark chart parity and empty/loading states
- R6 | Disposition: planned | Source Quote: ### `R6` Make `/app` a chart-led runtime overview | Summary: convert Overview into the approved posture-first chart layout | Coverage: direct | Implementation Surface: `role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`, `role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.ts`, `role-model-router/apps/runtime-ui/app/components/telemetry-chart-frame.tsx`, `role-model-router/apps/runtime-ui/app/components/telemetry-analytics-controls.tsx` | Verification Surface: `role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`, `role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.test.ts` | QA Surface: `/app` with populated charts in light/dark and narrow width
- R7 | Disposition: planned | Source Quote: ### `R7` Make `/app/observe/requests` the primary structured telemetry analytics route | Summary: add the full analytics band, filters, and ranked comparison above the canonical ledger | Coverage: direct | Implementation Surface: `role-model-router/apps/runtime-ui/app/routes/requests.tsx`, `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`, `role-model-router/apps/runtime-ui/app/lib/view-models.ts`, `role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.ts`, `role-model-router/apps/runtime-ui/app/components/telemetry-chart-frame.tsx`, `role-model-router/apps/runtime-ui/app/components/telemetry-analytics-controls.tsx`, `role-model-router/apps/runtime-ui/app/components/telemetry-legend.tsx` | Verification Surface: `role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`, `role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`, `role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.test.ts` | QA Surface: `/app/observe/requests` with populated charts and aligned ledger
- R8 | Disposition: planned | Source Quote: ### `R8` Keep the other Observe routes evidence-oriented, with only light contextual charting where it adds operator value | Summary: add `/app/observe/routing`, keep Activity/Logs/detail evidence-first, and limit contextual charting elsewhere | Coverage: direct | Implementation Surface: `role-model-router/apps/runtime-ui/app/routes.ts`, `role-model-router/apps/runtime-ui/app/lib/design-system.ts`, `role-model-router/apps/runtime-ui/app/routes/observe-routing.tsx`, `role-model-router/apps/runtime-ui/app/routes/observe-activity.tsx`, `role-model-router/apps/runtime-ui/app/routes/observe-logs.tsx`, `role-model-router/apps/runtime-ui/app/routes/request-detail.tsx` | Verification Surface: `role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`, targeted runtime-ui route tests | QA Surface: Observe routing analytics plus bounded evidence-route checks
- R9 | Disposition: planned | Source Quote: ### `R9` Require strict TDD for all production changes in this run | Summary: enforce RED-GREEN-REFACTOR for every backend, design-system, and route slice | Coverage: direct | Implementation Surface: `role-model-router/packages/sqlite-memory/test/index.test.ts`, `role-model-router/apps/runtime-host-bridge/test/index.test.ts`, `role-model-router/apps/runtime-host-bridge/test/session-readiness-api.test.ts`, `role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`, `role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`, `role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`, `role-model-router/apps/runtime-ui/app/lib/telemetry-chart-config.test.ts`, `role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.test.ts` | Verification Surface: recorded failing-first test execution per slice plus focused package reruns | QA Surface: audit trail plus final focused test reruns
- R10 | Disposition: planned | Source Quote: ### `R10` Verify the rebuilt runtime through focused automated validation and browser QA | Summary: rebuild the runtime, generate telemetry, and prove every primary chart with real data in-browser | Coverage: direct | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/validate-ui.ts`, `role-model-router/apps/runtime-host-bridge/src/index.ts`, `role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`, `role-model-router/apps/runtime-ui/app/routes/requests.tsx`, `role-model-router/apps/runtime-ui/app/routes/observe-routing.tsx`, `role-model-router/apps/runtime-ui/app/routes/observe-activity.tsx`, `role-model-router/apps/runtime-ui/app/routes/observe-logs.tsx`, `role-model-router/apps/runtime-ui/app/routes/request-detail.tsx` | Verification Surface: focused automated tests and rebuilt-runtime validation commands | QA Surface: `/app`, `/app/observe/requests`, `/app/observe/routing`, bounded evidence routes, sampled request detail

## Target Contract

1. **Historical telemetry truth**
   - Extend the existing SQLite telemetry table so every persisted request row carries immutable request-time facts needed for charting and cost audit.
   - Persist authoritative effective cost per request, plus the supporting savings fields needed for routing-vs-baseline and cache-savings analytics.
   - Stop depending on current registry/account/endpoint state to reconstruct historical chart labels or dimensions.
2. **One generic analytics API**
   - Add `POST /api/role-model/telemetry/query` as the only chart query surface.
   - Support deterministic range, granularity, metric, breakdown, filter, ranking, and label-metadata responses from persisted request-time facts.
   - Keep existing summary/list/request-detail surfaces, but align them to the same authoritative persisted cost semantics.
3. **Apple-theme shared chart system**
   - Update the shared runtime UI design-system contract first.
   - Add an explicit chart token family, broader chart-specific palette, shared chart chrome, legends, tooltips, empty states, loading states, and analytics controls.
   - Use `SF Pro` first, `Inter` first fallback, then Apple/system fallbacks as already approved, while remaining Windows-safe.
4. **Route ownership**
   - `/app` becomes chart-led but posture-oriented.
   - `/app/observe/requests` becomes the primary structured analytics workbench.
   - `/app/observe/routing` is introduced for routing analytics.
   - `/app/router`, `/app/models`, and other config surfaces stay configuration-first.
   - `/app/observe/activity`, `/app/observe/logs`, and `/app/observe/requests/:requestId` remain evidence-oriented with only compact contextual charting where specified.

## Planned Backend Model

### Historical request-time telemetry additions

- Persist request-time dimensions needed for the approved charts, including:
  - `sourceType`
  - request operation/classification fields
  - requested role or role set
  - requested model id when present
  - selected model id
  - selected provider id / kind / family / account id
  - endpoint id plus persisted endpoint-kind / serving-source snapshot
  - request-time endpoint status / health snapshot when execution reached endpoint selection
  - routing mode / selected strategy / difficulty bucket
  - status family for chart grouping
  - cache-backed flags and cache-hit token fields
  - authoritative effective cost
  - cost calculation basis and version
  - uncached selected cost used for cache-savings math
  - routing baseline max-eligible cost and any required candidate-count/support flags
  - routing savings, cache savings, and total avoided cost fields
- Preserve no-execution or pre-execution failure cases with canonical zero-or-equivalent cost semantics rather than leaving cost undefined.

### Generic analytics API shape

- Query request contract will support:
  - time range presets plus explicit start/end
  - bucket granularity
  - one or more requested metric series
  - optional breakdown dimension per series
  - optional filters for source, provider, account, endpoint, model, role, strategy, mode, difficulty, operation, and status family
  - ranking/leaderboard mode for horizontal comparison charts
- Query response contract will support:
  - bucketed time series
  - ranked comparison rows
  - backend-returned label metadata for legends and selectors
  - honest no-data / unavailable signaling for unsupported metrics or slices

## Planned Frontend Model

### Shared design-system work before route styling

- Update `DESIGN_SYSTEM.md` to make the Apple baseline authoritative for analytics and chart styling.
- Extend `app.css` and design-system helpers with:
  - chart surface tokens
  - chart palette tokens for multi-series legends
  - tooltip, legend, hairline, empty-state, and loading-state tokens
  - analytics-control spacing, typography, and responsive rules
- Wrap chart rendering in repo-owned primitives rather than route-local raw chart markup.

### Route implementation plan

- `/app`
  - add shared analytics controls at top
  - render the six approved primary charts in the approved Hero/Half layout
  - keep inventory and latest requests beneath posture analytics
- `/app/observe/requests`
  - add shared filter/time-range controls
  - render the approved chart band plus ranked comparison surface
  - keep the canonical ledger below and aligned to active query filters
- `/app/observe/routing`
  - add Observe routing nav entry and dedicated route
  - render cost-avoided, decision-volume, difficulty, strategy, role-demand, and model-selection charts
- `/app/observe/activity`
  - optionally add compact contextual charts only if they can be backed cleanly by the same analytics contract or a bounded derived adapter
- `/app/observe/logs`
  - keep log-first; any severity chart stays compact and subordinate
- `/app/observe/requests/:requestId`
  - keep detail-first
  - add only compact contextual charts if the recent comparison query is straightforward and honest

## Implementation Steps

1. Freeze the contract in tests:
   - add failing SQLite tests for new persisted fields and cost/savings semantics
   - add failing host-bridge tests for generic query behavior, historical-truth invariants, and authoritative cost reads
   - add failing runtime-ui tests for typed analytics query helpers, chart config tokens, route metadata, and view-model state handling
2. Extend the SQLite telemetry schema and persistence layer:
   - add the new historical columns/serialized fields required by charts and cost audit
   - update success and failure telemetry writers
   - preserve deterministic reads for existing consumers
3. Add the backend analytics query layer:
   - implement `POST /api/role-model/telemetry/query`
   - add aggregation helpers for bucketed time series and ranked comparisons
   - align request-detail/read APIs to the same authoritative effective-cost semantics
4. Update the shared Apple-theme design system before route-level chart styling:
   - reconcile `DESIGN_SYSTEM.md`, `app.css`, and `design-system.ts`
   - add the chart palette, chart token family, and shared analytics-control contract
5. Add repo-owned shared chart primitives and typed runtime-ui helpers:
   - add chart frame/loading/empty/legend/control components
   - add typed analytics query client helpers and chart-config helpers
   - keep chart theming decoupled from route code
6. Migrate the charted routes:
   - `/app`
   - `/app/observe/requests`
   - `/app/observe/routing`
   - bounded contextual charts for approved evidence routes only
7. Rebuild and verify:
   - run focused automated validation
   - rebuild the runtime used for manual QA
   - generate real request traffic and verify every required primary chart with populated data in light/dark and narrow-width states

## Testing Strategy

- SQLite persistence slices:
  - `corepack pnpm --filter @role-model-router/sqlite-memory exec vitest run test/index.test.ts`
- Host-bridge analytics slices:
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts test/session-readiness-api.test.ts`
  - add focused host-bridge telemetry analytics query and validation tests if new files are created for them
- Runtime UI slices:
  - `corepack pnpm --filter @role-model-router/runtime-ui test`
  - if targeted vitest execution is needed, run focused tests for `runtime-api`, `view-models`, `design-system`, and new analytics helper/component tests
- Focused validators and builds:
  - `corepack pnpm run runtime:validate-ui`
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge build`
  - `corepack pnpm --filter @role-model-router/runtime-ui build`

## Playwright Plan (if applicable)

- Not applicable for this run.
- Browser verification will use the in-app browser against the rebuilt runtime and must prove populated chart behavior, not only static render snapshots.

## Manual QA Scenarios

- Generate or replay request traffic that covers:
  - local and remote requests
  - success and failure requests
  - cache-backed requests where supported
  - multiple providers, endpoints, models, roles, strategies, and difficulty buckets
  - vendor-actual-cost requests
  - pricing-snapshot fallback requests
  - local-free routing cases
  - routing cases where the chosen request is cheaper than at least one more expensive eligible configured candidate
- Verify in browser:
  - `/app`
  - `/app/observe/requests`
  - `/app/observe/routing`
  - `/app/observe/activity`
  - `/app/observe/logs`
  - at least one `/app/observe/requests/:requestId`
- Verify each required primary chart in both:
  - empty or loading conditions where applicable
  - populated real-data conditions from generated telemetry
- Verify both light and dark themes.
- Verify at least one narrow/mobile-width pass for the charted routes.
- Reconcile a few sampled request-detail cost records against:
  - persisted effective cost
  - calculation basis/version
  - savings-support fields
  - matching aggregate API totals
  - rendered browser charts for the same slice

## Plan Drift Check

- No plan drift is expected if implementation follows the declared sub-phase order:
  - backend truth first
  - generic analytics query second
  - shared Apple-theme chart system third
  - route consumers and rebuilt-runtime proof last
- If implementation requires route-local styling before the shared chart system exists, stop and repair the shared design-system layer first.
- If a required chart cannot be backed by persisted request-time fields and the generic analytics API, stop and raise an addendum rather than shipping frontend approximation logic.
- If host-bridge validation or runtime rebuild reveals inherited failures unrelated to run 49, record them as inherited baseline issues rather than weakening the telemetry requirements.

## Idempotence and Recovery

- SQLite telemetry schema updates must remain rerunnable for the same runtime state store.
- Historical analytics queries must be deterministic for the same stored rows and query payload.
- Route-level charts must tolerate empty, loading, and partially unavailable metric states without collapsing the shell or widening the layout.
- Background refresh should prefer stale-while-refreshing where prior valid data exists.
- If a metric or breakdown is unavailable for a slice, the backend must signal that honestly so the frontend can render an explicit unavailable/empty state rather than synthetic fallback data.

## Implementation Sub-phases

### SP1. Backend telemetry truth and authoritative cost persistence

- Add failing tests first for immutable request-time fields, authoritative effective-cost persistence, routing baseline persistence, and savings-field persistence.
- Implement SQLite schema and telemetry writer updates behind those tests.

### SP2. Generic analytics query API and read-path alignment

- Add failing tests first for bucketed query results, ranked comparisons, label metadata, historical-truth invariants, and request-detail/read-path cost alignment.
- Implement `POST /api/role-model/telemetry/query` and align request-detail/summary consumers to the persisted cost model.

### SP3. Apple-theme chart system and shared frontend primitives

- Add failing tests first for chart token coverage, chart config helpers, route metadata additions, and no-data/loading-state view-model handling.
- Implement shared Apple-theme chart tokens, palette, controls, and repo-owned chart primitives before any route-level chart consumers.

### SP4. Route consumers and rebuilt-runtime proof

- Add failing tests first for Overview, Observe Requests, and Observe Routing analytics surfaces.
- Implement route-level consumers and bounded contextual charts for evidence routes.
- Rebuild the runtime, generate telemetry, and complete the required populated-chart browser proof.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/49-runtime-telemetry-analytics-charts/01-as-is.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/00-requirements.md`
- `/.recursive/run/45-observe-surface-realignment/00-requirements.md`
- `/.recursive/run/48-runtime-ui-design-system-apple-theme/00-requirements.md`
- `/TEMP-FAS-7-telemetry-analytics-plan.md`
- `/TEMP-FAS-7-route-chart-spec.md`
- `/role-model-router/apps/runtime-ui/DESIGN_APPLE_REFERENCE.md`

## Traceability

- `R1` -> Target Contract, Planned Backend Model, Implementation Steps, SP1
- `R2` -> Target Contract, Planned Backend Model, Testing Strategy, SP2
- `R3` -> Target Contract, Planned Backend Model, Testing Strategy, SP2
- `R4` -> Target Contract, Planned Changes by File, Implementation Steps
- `R5` -> Target Contract, Planned Frontend Model, SP3
- `R6` -> Planned Frontend Model, Manual QA Scenarios, SP4
- `R7` -> Planned Frontend Model, Manual QA Scenarios, SP4
- `R8` -> Planned Frontend Model, Planned Changes by File, Manual QA Scenarios, SP4
- `R9` -> Implementation Steps, Testing Strategy, Implementation Sub-phases
- `R10` -> Testing Strategy, Manual QA Scenarios, SP4

## Audit Context

- Phase: `02 TO-BE PLAN`
- Auditor: self (main agent)
- Audit Inputs Provided:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/00-requirements.md`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/00-worktree.md`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/01-as-is.md`
  - `/.recursive/STATE.md`
  - `/.recursive/DECISIONS.md`
  - `/.recursive/memory/MEMORY.md`
  - prior run requirements and approved planning/reference docs listed in `## Prior Recursive Evidence Reviewed`
- Diff Basis: `git diff --name-only a9162d5907019f9270510bdbcd947b0bd283bbfe`
- Worktree: `D:\DEV\role-model\.worktrees\49-runtime-telemetry-analytics-charts`
- Subagent Availability: unavailable
- Subagent Capability Probe: `tool_search` exposed `multi_agent_v1`, but active policy only permits spawning subagents when the user explicitly requests delegation or parallel agent work.
- Delegation Decision Basis: self-audit; Phase 2 needs one controller-owned sequencing narrative across SQLite persistence, bridge query semantics, Apple-theme chart-system work, and rebuilt-runtime QA.
- Audit Execution Mode: self-audit

## Effective Inputs Re-read

- `/.recursive/run/49-runtime-telemetry-analytics-charts/00-requirements.md`
- `/.recursive/run/49-runtime-telemetry-analytics-charts/00-worktree.md`
- `/.recursive/run/49-runtime-telemetry-analytics-charts/01-as-is.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/00-requirements.md`
- `/.recursive/run/45-observe-surface-realignment/00-requirements.md`
- `/.recursive/run/48-runtime-ui-design-system-apple-theme/00-requirements.md`
- `/TEMP-FAS-7-telemetry-analytics-plan.md`
- `/TEMP-FAS-7-route-chart-spec.md`
- `/role-model-router/apps/runtime-ui/DESIGN_APPLE_REFERENCE.md`

## Earlier Phase Reconciliation

- `01-as-is.md` established:
  - the current telemetry schema is too narrow for historical analytics
  - historical reads still depend on live-state enrichment
  - the generic analytics query API does not exist
  - the runtime UI design system still carries Swiss-era contract drift and no shared chart foundation
  - `/app/observe/routing` is missing entirely
- `00-requirements.md` remains the source of truth for:
  - route ownership and chart scope
  - TDD obligations
  - Phase 5 rebuilt-runtime proof requirements
- This plan intentionally sequences backend truth before chart consumers and shared Apple-theme chart-system work before route-level chart styling.

## Subagent Contribution Verification

- Reviewed Action Records: none
- Main-Agent Verification Performed:
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/00-requirements.md`
  - `/.recursive/run/49-runtime-telemetry-analytics-charts/01-as-is.md`
  - approved planning/reference docs listed in `## Prior Recursive Evidence Reviewed`
- Acceptance Decision: accepted
- Refresh Handling: not applicable
- Repair Performed After Verification: none

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `a9162d5907019f9270510bdbcd947b0bd283bbfe`
- Comparison reference: `working-tree`
- Normalized baseline: `a9162d5907019f9270510bdbcd947b0bd283bbfe`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only a9162d5907019f9270510bdbcd947b0bd283bbfe`
- Planning-phase review covered the current run artifacts and the expected backend/frontend/test path families without claiming product completion in Phase 2.

## Gaps Found

- none; all planning gaps identified in Phase 1 were converted into explicit implementation steps, changed-file expectations, testing slices, and rebuilt-runtime QA scenarios in this artifact.

## Repair Work Performed

- none; this draft was authored directly in the audited Phase 2 format.

## Requirement Completion Status

- R1 | Status: planned | Implementation Surface: `role-model-router/packages/sqlite-memory/src/index.ts`, `role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: `role-model-router/packages/sqlite-memory/test/index.test.ts`, focused host-bridge telemetry persistence tests | QA Surface: request-detail cost audit plus populated chart verification | Audit Note: self-audit
- R2 | Status: planned | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: focused host-bridge analytics query/read-path tests | QA Surface: request-detail evidence and chart legends | Audit Note: self-audit
- R3 | Status: planned | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/index.ts`, `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts` | Verification Surface: focused host-bridge query tests, `runtime-api.test.ts` | QA Surface: populated chart routes in browser | Audit Note: self-audit
- R4 | Status: planned | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/index.ts`, `role-model-router/apps/runtime-ui/app/routes.ts`, `role-model-router/apps/runtime-ui/app/lib/design-system.ts`, `role-model-router/apps/runtime-ui/app/routes/router.tsx`, `role-model-router/apps/runtime-ui/app/routes/control-routing-strategy.tsx`, `role-model-router/apps/runtime-ui/app/routes/control-controller.tsx`, `role-model-router/apps/runtime-ui/app/routes/control-models.tsx` | Verification Surface: `role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`, focused host-bridge analytics contract tests | QA Surface: Observe analytics vs Router config boundary check | Audit Note: self-audit
- R5 | Status: planned | Implementation Surface: `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`, `role-model-router/apps/runtime-ui/app/app.css`, `role-model-router/apps/runtime-ui/app/lib/design-system.ts`, `role-model-router/apps/runtime-ui/app/components/telemetry-chart-frame.tsx`, `role-model-router/apps/runtime-ui/app/components/telemetry-analytics-controls.tsx`, `role-model-router/apps/runtime-ui/app/components/telemetry-legend.tsx`, `role-model-router/apps/runtime-ui/app/components/telemetry-empty-state.tsx`, `role-model-router/apps/runtime-ui/app/components/telemetry-loading-state.tsx`, `role-model-router/apps/runtime-ui/app/lib/telemetry-chart-config.ts` | Verification Surface: `role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`, `role-model-router/apps/runtime-ui/app/lib/telemetry-chart-config.test.ts` | QA Surface: light/dark chart-system verification | Audit Note: self-audit
- R6 | Status: planned | Implementation Surface: `role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`, `role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.ts`, `role-model-router/apps/runtime-ui/app/components/telemetry-chart-frame.tsx`, `role-model-router/apps/runtime-ui/app/components/telemetry-analytics-controls.tsx` | Verification Surface: `role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`, `role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.test.ts` | QA Surface: `/app` populated-chart verification | Audit Note: self-audit
- R7 | Status: planned | Implementation Surface: `role-model-router/apps/runtime-ui/app/routes/requests.tsx`, `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`, `role-model-router/apps/runtime-ui/app/lib/view-models.ts`, `role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.ts`, `role-model-router/apps/runtime-ui/app/components/telemetry-chart-frame.tsx`, `role-model-router/apps/runtime-ui/app/components/telemetry-analytics-controls.tsx`, `role-model-router/apps/runtime-ui/app/components/telemetry-legend.tsx` | Verification Surface: `role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`, `role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`, `role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.test.ts` | QA Surface: `/app/observe/requests` populated-chart verification | Audit Note: self-audit
- R8 | Status: planned | Implementation Surface: `role-model-router/apps/runtime-ui/app/routes.ts`, `role-model-router/apps/runtime-ui/app/lib/design-system.ts`, `role-model-router/apps/runtime-ui/app/routes/observe-routing.tsx`, `role-model-router/apps/runtime-ui/app/routes/observe-activity.tsx`, `role-model-router/apps/runtime-ui/app/routes/observe-logs.tsx`, `role-model-router/apps/runtime-ui/app/routes/request-detail.tsx` | Verification Surface: `role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`, targeted runtime-ui route tests | QA Surface: Observe routing plus bounded evidence-route verification | Audit Note: self-audit
- R9 | Status: planned | Implementation Surface: `role-model-router/packages/sqlite-memory/test/index.test.ts`, `role-model-router/apps/runtime-host-bridge/test/index.test.ts`, `role-model-router/apps/runtime-host-bridge/test/session-readiness-api.test.ts`, `role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts`, `role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`, `role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`, `role-model-router/apps/runtime-ui/app/lib/telemetry-chart-config.test.ts`, `role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.test.ts` | Verification Surface: recorded RED/GREEN execution per slice | QA Surface: audit trail plus final focused reruns | Audit Note: self-audit
- R10 | Status: planned | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/validate-ui.ts`, `role-model-router/apps/runtime-host-bridge/src/index.ts`, `role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`, `role-model-router/apps/runtime-ui/app/routes/requests.tsx`, `role-model-router/apps/runtime-ui/app/routes/observe-routing.tsx`, `role-model-router/apps/runtime-ui/app/routes/observe-activity.tsx`, `role-model-router/apps/runtime-ui/app/routes/observe-logs.tsx`, `role-model-router/apps/runtime-ui/app/routes/request-detail.tsx` | Verification Surface: focused automated validation commands | QA Surface: rebuilt-runtime, populated-data browser proof | Audit Note: self-audit

## Coverage Gate

- [x] Backend storage, analytics API, and historical-truth sequencing are explicit
- [x] Shared Apple-theme chart-system work is sequenced ahead of route-level chart styling
- [x] Changed-file expectations, test slices, and rebuilt-runtime QA obligations are explicit

Coverage: PASS

## Approval Gate

- [x] Implementation can proceed without reopening the plan
- [x] TDD and populated-chart verification expectations are explicit

Approval: PASS

## Audit Verdict

Audit: PASS
