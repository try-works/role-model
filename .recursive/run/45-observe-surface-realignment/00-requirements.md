Run: `/.recursive/run/45-observe-surface-realignment/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-06-15T07:35:56Z`
LockHash: `f43701b44edbe89359b9f6a2781750a3fb2f9dba1eaf78ea0fcb3b83f1298640`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/00-requirements.md`
- `/.recursive/run/35-runtime-ui-connect-declutter/00-requirements.md`
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/00-requirements.md`
- `/role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.ts`
- `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `/role-model-router/apps/runtime-ui/app/routes.ts`
- `/role-model-router/apps/runtime-ui/app/routes/requests.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/request-detail.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/observe-activity.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/observe-logs.tsx`
- User clarification (2026-06-15): "make sure that the requirement includes tdd and verification of the rebuilt runtime that includes browser verification"
Outputs:
- `/.recursive/run/45-observe-surface-realignment/00-requirements.md`
Scope note: This document defines the proposal contract for improving the Observe section so the runtime UI clearly distinguishes canonical structured telemetry from preserved raw-host debugging surfaces, while requiring strict TDD and rebuilt-runtime browser verification before implementation can close.

## TODO

- [x] Consolidate Observe-route drift into stable requirements
- [x] Define acceptance criteria for telemetry, raw-host adjacency, and cross-surface handoffs
- [x] Record design-system-first and typed-boundary constraints
- [x] Record strict TDD and rebuilt-runtime browser verification as non-negotiable requirements
- [x] Document out-of-scope boundaries
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Source Requirement Inventory

| Source | Contribution |
| --- | --- |
| Current Observe audit findings | Requests/request detail are canonical; Activity and Logs are drifted legacy/raw-host surfaces |
| Run `16` requirements | canonical unified telemetry contract and SSE-backed runtime UI telemetry surfaces |
| Run `35` requirements | design-system-first runtime UI delivery order |
| Run `36` requirements + manual QA | packaged-runtime logs/telemetry behavior on rebuilt runtime `:3456` |
| Current runtime-ui route code | exact Observe route/data-source drift to be corrected |
| User clarification (2026-06-15) | strict TDD plus rebuilt-runtime browser verification are mandatory |

## Design-System-First Rule

Frontend delivery for this run must follow the same order enforced by the runtime-ui program:

1. `DESIGN_SYSTEM.md`
2. `design-system.ts`
3. `design-system.test.ts`
4. typed helpers and shared view-model/runtime API support
5. route implementations

No Observe route implementation change may land ahead of the corresponding design-system contract and regression coverage for that same slice.

## Requirements

### `R1` Make Observe ownership explicit and operator-default

Description:
The Observe route family must make it obvious which pages are canonical structured telemetry and which pages are preserved raw-host adjacency.

Acceptance criteria:
- `DESIGN_SYSTEM.md` and `design-system.ts` explicitly define:
  - `/app/observe/requests` and `/app/observe/requests/:requestId` as the canonical structured telemetry path
  - `/app/observe/activity` as preserved raw-host metrics/captures adjacency
  - `/app/observe/logs` as preserved raw-host logs adjacency
- if the route family adds a direct `/app/observe` landing, it resolves to `/app/observe/requests` rather than inventing a second primary telemetry interpretation surface
- automated regression coverage prevents the Observe ownership contract from drifting back

### `R2` Upgrade Observe -> Requests into a telemetry-first surface

Description:
Observe -> Requests must present the runtime's canonical telemetry data more clearly than it does today by combining summary posture with the live request ledger.

Acceptance criteria:
- the page continues to consume role-model-owned telemetry APIs, not raw `/api/metrics`
- the page surfaces a bounded telemetry summary above the request ledger using canonical summary/request data already exposed by the runtime
- the ledger remains live via `/api/role-model/telemetry/stream`
- the route keeps direct drill-in into `/app/observe/requests/:requestId`
- the page does not become a second copy of the top-level Overview dashboard; it stays focused on Observe use cases

### `R3` Reframe Observe -> Activity as raw-host/capture adjacency

Description:
Observe -> Activity should remain useful, but it must read as preserved raw-host tooling rather than as the primary telemetry ledger.

Acceptance criteria:
- Activity continues to use `/api/metrics` and `/api/captures/:id` only as preserved raw-host operator surfaces
- page titles, descriptions, section copy, and empty states make the raw-host nature of the page explicit
- Activity exposes a clear handoff back to canonical Requests / Request detail for structured telemetry interpretation
- the route preserves capture inspection without pretending it is the source of truth for request telemetry

### `R4` Reframe Observe -> Logs as preserved-host adjacency with request handoffs

Description:
Observe -> Logs should remain the place for combined host logs and raw stream endpoints, but it must guide the operator back into canonical request detail whenever correlation exists.

Acceptance criteria:
- Logs continues to consume preserved `/logs` and `/logs/stream/*` surfaces
- parsed log rows preserve request-id correlation when present
- correlated request ids become direct handoffs into `/app/observe/requests/:requestId`
- the page explains that raw logs are secondary to canonical telemetry when request-level interpretation is needed

### `R5` Strengthen cross-surface Observe handoffs without broad observability rewrites

Description:
The Observe routes must feel like one flow: Requests -> Request detail is canonical, while Activity and Logs act as adjacent raw-host investigations that can route the operator back to the canonical detail page.

Acceptance criteria:
- Requests, Request detail, Activity, and Logs expose explicit handoffs to the correct adjacent surfaces
- if existing raw-host data is insufficient for a stable handoff, the run may add only the smallest role-model-owned typed support needed to make the handoff honest and durable
- the run must not introduce a second ad hoc observability data model or a broad new Observe API family without a later scoped addendum

### `R6` Preserve typed role-model boundaries and design-system ownership

Description:
The implementation must preserve the existing architectural split between role-model-owned telemetry APIs and preserved raw-host tools.

Acceptance criteria:
- route components consume typed runtime API helpers and view models rather than scraping raw host payloads as their primary data source
- raw host endpoints remain available as contextual tools instead of being replaced by frontend-only reconstructions
- design-system contract updates precede dependent route implementation changes

### `R7` Use strict TDD for production changes

Description:
Any implementation that lands from this proposal must follow strict failing-test-first discipline for production code.

Acceptance criteria:
- `TDD Mode` for Phase 3 is `strict`
- every production TypeScript change is preceded by failing automated coverage at the closest relevant layer before turning green
- RED and GREEN evidence paths are recorded per implementation slice
- documentation-only contract edits may precede code, but code changes may not bypass the failing-test-first rule

### `R8` Verify the rebuilt runtime in the browser

Description:
This run is not complete if it only passes unit tests or a dev preview. The final verification must include the rebuilt runtime artifact and browser proof against the real operator surface.

Acceptance criteria:
- focused package tests and builds pass for every touched runtime-ui and runtime-host-bridge surface
- the runtime artifact used by operators is rebuilt before final QA
- browser verification runs against the rebuilt runtime host surface (expected packaged/operator path on `:3456`, or an equivalent rebuilt runtime path that exercises the same operator flow)
- browser verification covers at minimum:
  - Observe -> Requests summary + ledger
  - request-detail drill-in
  - Observe -> Activity raw-host framing
  - Observe -> Logs raw-host framing plus request handoffs
  - cross-surface movement between Requests, Request detail, Activity, and Logs

## Out of Scope

- `OOS1`: replacing or deleting preserved raw-host endpoints such as `/api/metrics`, `/api/captures/:id`, `/logs`, or `/logs/stream/*`
- `OOS2`: inventing a brand-new broad observability subsystem or duplicating the top-level Overview dashboard inside Observe
- `OOS3`: unrelated runtime UI redesign outside the Observe route family and the smallest adjacent typed helper support required for it
- `OOS4`: speculative analytics, charts, or productized reporting beyond the request/capture/log/operator flow needed for Observe
- `OOS5`: repo-wide formatting or cleanup unrelated to the Observe scope

## Constraints

- Preserve the canonical unified telemetry baseline established by run `16`
- Preserve the design-system-first runtime-ui discipline established by run `35`
- Preserve the packaged-runtime validation reality from run `36`: final proof must exercise a rebuilt runtime, not just unit tests
- Keep Activity and Logs as preserved-host adjacency, not as deleted or hidden pages
- Keep scope bounded to Observe route semantics, request-detail handoffs, and the minimum typed API support needed for those surfaces

## Assumptions

- The current telemetry APIs already expose enough structured data to improve Observe -> Requests without a major backend redesign
- Request detail remains the best single canonical inspector and should stay that way
- Some additional correlation glue for Activity/Logs may be needed, but it can remain small and typed if required
- The rebuilt runtime verification path will continue to use the operator-facing host surface at `http://127.0.0.1:3456`

## Coverage Gate

- [x] All in-scope Observe improvements map to stable `R#` identifiers
- [x] Strict TDD is explicitly required
- [x] Rebuilt-runtime browser verification is explicitly required
- [x] Out-of-scope boundaries prevent the proposal from turning into a broad observability rewrite

Coverage: PASS

## Approval Gate

- [x] Requirements are specific enough for AS-IS analysis and Phase 2 planning
- [x] Verification expectations are strong enough to prevent "tests only" closeout

Approval: PASS
