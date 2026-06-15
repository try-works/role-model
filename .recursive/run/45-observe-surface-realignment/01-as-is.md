Run: `/.recursive/run/45-observe-surface-realignment/`
Phase: `01 AS-IS Analysis`
Status: `LOCKED`
LockedAt: `2026-06-15T07:35:56Z`
LockHash: `08457525fb03a567b8a46e885a8ff6b138e6c1fd31a42204f4c847f0d22594a2`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/45-observe-surface-realignment/00-requirements.md`
- `/.recursive/run/45-observe-surface-realignment/00-worktree.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/00-requirements.md`
- `/.recursive/run/35-runtime-ui-connect-declutter/00-requirements.md`
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/00-requirements.md`
- `/role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.ts`
- `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `/role-model-router/apps/runtime-ui/app/lib/view-models.ts`
- `/role-model-router/apps/runtime-ui/app/routes.ts`
- `/role-model-router/apps/runtime-ui/app/routes/requests.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/request-detail.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/observe-activity.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/observe-logs.tsx`
Outputs:
- `/.recursive/run/45-observe-surface-realignment/01-as-is.md`
Scope note: Captures the current Observe route drift: Requests and request detail are the real structured telemetry surfaces, while Activity and Logs still lean on preserved raw-host sources and do not consistently hand operators back to the canonical telemetry flow.

## TODO

- [x] Re-read current Observe requirements inputs and prior telemetry/UI runs
- [x] Inventory the current Observe route family, route metadata, and typed data sources
- [x] Record which Observe pages are canonical structured telemetry versus preserved raw-host adjacency
- [x] Record current gaps in cross-linking, page semantics, and verification
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Effective Inputs Re-read

- `00-requirements.md`: R1-R8, including strict TDD and rebuilt-runtime browser verification
- `00-worktree.md`: isolated worktree on `recursive/45-observe-surface-realignment`, baseline `0b07b10`, green focused runtime-ui test floor
- Prior run context:
  - run `16` established the canonical unified telemetry contract and SSE-backed dashboard/read-request surfaces
  - run `35` established the design-system-first runtime UI discipline
  - run `36` hardened logs/telemetry fallback behavior on packaged `:3456`

## AS-IS Summary

The Observe section already contains the ingredients needed for a good operator flow, but the route family is semantically split:

1. **Requests is canonical** — `/app/observe/requests` consumes role-model telemetry from `/api/role-model/telemetry/requests` and live SSE refresh from `/api/role-model/telemetry/stream`.
2. **Request detail is canonical** — `/app/observe/requests/:requestId` loads `/api/role-model/requests/:requestId` plus `/api/role-model/endpoints/:endpointId/profile` and already presents the richest inspection surface in Observe.
3. **Activity is raw-host adjacency** — `/app/observe/activity` reads `/api/metrics` and `/api/captures/:id`, but the UI still looks telemetry-like enough that operators can misread it as the primary request ledger.
4. **Logs is preserved-host adjacency** — `/app/observe/logs` reads `/logs` and `/logs/stream/*`, parses structured rows, and can carry request ids, but it does not hand the operator back into canonical request detail strongly enough.
5. **Verification gap** — the repo has focused runtime-ui test coverage and older packaged-runtime observability proof, but it does not yet encode one explicit Observe-route requirement that must be revalidated on a rebuilt runtime with browser proof.

## Source Requirement Inventory

| R# | Disposition | AS-IS summary |
| --- | --- | --- |
| R1 | partial | Design-system metadata already says Requests is canonical and Activity/Logs are adjacent, but the route family has no single enforced Observe ownership contract in tests. |
| R2 | gap | Requests route shows only ledger-oriented facts; it does not surface the richer telemetry summary already available through the unified telemetry API family. |
| R3 | gap | Activity uses raw `/api/metrics` and `/api/captures/:id`, but its presentation still looks close enough to canonical telemetry that the boundary is easy to miss. |
| R4 | gap | Logs parses preserved `/logs` output, but request-id correlation and telemetry-first handoffs are weak. |
| R5 | gap | Cross-surface handoffs exist unevenly: Request detail is rich, but Activity and Logs do not consistently push the operator back to the canonical request-detail path. |
| R6 | partial | The design system and typed runtime API already define the right architectural split, but the route implementations have drifted from that contract. |
| R7 | gap | The runtime-ui package is green, but there is no Observe-specific strict TDD slice yet. |
| R8 | gap | No current recursive artifact requires rebuilt-runtime browser verification of the full Observe route family after these improvements. |

## Reproduction Steps (Novice-Runnable)

1. `cd D:\DEV\role-model\.worktrees\45-observe-surface-realignment`
2. `corepack pnpm --dir role-model-router --filter @role-model-router/runtime-ui test` — expect the focused runtime-ui baseline to pass
3. Open `role-model-router/apps/runtime-ui/app/routes/requests.tsx`
   - note the route reads only `fetchTelemetryRequests({ limit: 50 })`
   - note the page facts are request count, endpoint-linked count, and distinct endpoint count only
4. Open `role-model-router/apps/runtime-ui/app/routes/request-detail.tsx`
   - note the route loads `/api/role-model/requests/:requestId` and endpoint profile data
   - note this page already contains the richest structured telemetry evidence in Observe
5. Open `role-model-router/apps/runtime-ui/app/routes/observe-activity.tsx`
   - note the route reads `/api/metrics` and `/api/captures/:id`
   - note the UI still renders status, tokens, and captures in a request-ledger-style layout
6. Open `role-model-router/apps/runtime-ui/app/routes/observe-logs.tsx`
   - note the route reads `/logs`
   - note parsed rows expose `requestId` text but do not currently become first-class handoffs to request detail
7. Open `role-model-router/apps/runtime-ui/app/lib/design-system.ts`
   - note the route contract already describes Activity as preserved raw-host adjacency and Requests as canonical telemetry

## Current Behavior by Requirement

### `R1` Clarify Observe ownership and landing

- `design-system.ts` already says:
  - Activity = `"Host activity and metrics"` with preserved raw-host adjacency
  - Requests = `"Telemetry request ledger"` with canonical runtime telemetry
  - Request detail = `"Telemetry request detail"` with aligned usage/cache/capture/profile/tooling receipts
- `routes.ts` registers `/app/observe/activity`, `/app/observe/requests`, `/app/observe/requests/:requestId`, and `/app/observe/logs`
- **Gap:** the route family has no dedicated `/app/observe` landing or regression guard that makes Requests the default interpretive surface for operators.

### `R2` Upgrade Requests as the telemetry-first page

- `requests.tsx` fetches only `/api/role-model/telemetry/requests`
- it subscribes to `/api/role-model/telemetry/stream` correctly
- `buildTelemetryRequestRows()` already exposes useful labels for source, status, cache, stream posture, latency, tokens, and cost
- **Gap:** the route does not consume the already-available summary/dashboard telemetry APIs, so Observe → Requests under-represents the telemetry data the runtime already owns

### `R3` Re-scope Activity as raw-host adjacency

- `observe-activity.tsx` reads `fetchActivityMetrics()` -> `/api/metrics`
- capture drill-in uses `fetchActivityCapture()` -> `/api/captures/:id`
- `buildActivitySummary()` computes facts over raw metric-window entries
- **Gap:** Activity currently uses the same ledger/card idioms as the canonical telemetry path, which makes the raw-vs-canonical distinction easy to miss

### `R4` Re-scope Logs as preserved-host adjacency with request correlation

- `observe-logs.tsx` reads `fetchTextLogs("/logs")`
- `buildStructuredLogRows()` can parse timestamp, severity, source class, and `req-*` ids from combined log lines
- raw stream escape hatches `/logs/stream/proxy` and `/logs/stream/upstream` are already exposed
- **Gap:** request ids are displayed as inert text, and the page does not clearly frame when the operator should pivot to canonical telemetry instead of staying in raw logs

### `R5` Strengthen cross-surface Observe handoffs

- Request detail already pulls endpoint profile and rich request diagnostics from role-model-owned APIs
- Activity route can inspect raw captures but does not consistently hand off to canonical request detail
- Logs route can surface request ids but does not link them into `/app/observe/requests/:requestId`
- **Gap:** the best data surface exists, but the secondary raw-host pages do not consistently guide the operator back to it

### `R6` Preserve typed boundaries and design-system-first ownership

- `runtime-api.ts` already separates:
  - role-model telemetry APIs
  - request detail APIs
  - raw `/api/metrics`
  - raw `/api/captures/:id`
  - raw `/logs`
- `DESIGN_SYSTEM.md` already declares Observe as request ledgers plus raw host activity/log adjacency
- **Gap:** current route behavior does not yet encode enough regression coverage to keep implementations aligned with that contract

### `R7` Strict TDD baseline

- baseline command `corepack pnpm --dir role-model-router --filter @role-model-router/runtime-ui test` passes with 103 tests
- existing runtime-ui tests already cover `runtime-api`, `view-models`, and `design-system`
- **Gap:** no Observe-improvement slice has yet defined failing tests first for new request-summary, raw-host-boundary, or request-linking behavior

### `R8` Rebuilt runtime and browser verification

- run `36` proved earlier packaged-runtime logs/telemetry behavior on `http://127.0.0.1:3456`
- current proposal target has no fresh QA artifact requiring the full Observe route family to be checked on a rebuilt runtime after implementation
- **Gap:** without an explicit rebuilt-runtime/browser gate, the run could stop at unit tests or a dev preview and still miss packaged host-path regressions

## Relevant Code Pointers

| Area | Path | Notes |
| --- | --- | --- |
| Observe route registration | `role-model-router/apps/runtime-ui/app/routes.ts` | current route family has activity, requests, request detail, logs |
| Observe route metadata | `role-model-router/apps/runtime-ui/app/lib/design-system.ts` | already claims Requests is canonical and Activity/Logs are adjacent |
| Typed telemetry fetchers | `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts` | telemetry summary/dashboard/requests/SSE already exist beside raw metrics/log APIs |
| Request ledger | `role-model-router/apps/runtime-ui/app/routes/requests.tsx` | canonical live telemetry list, but only a thin summary |
| Request detail | `role-model-router/apps/runtime-ui/app/routes/request-detail.tsx` | richest structured inspector in Observe |
| Raw metrics + captures | `role-model-router/apps/runtime-ui/app/routes/observe-activity.tsx` | preserved raw-host adjacency route |
| Raw logs | `role-model-router/apps/runtime-ui/app/routes/observe-logs.tsx` | preserved `/logs` reader with request-id parsing |
| View-model transforms | `role-model-router/apps/runtime-ui/app/lib/view-models.ts` | request rows, structured log rows, activity summary |

## Evidence

- Focused baseline: `corepack pnpm --dir role-model-router --filter @role-model-router/runtime-ui test` -> 103 passing tests in the isolated worktree
- Code readback:
  - `requests.tsx`
  - `request-detail.tsx`
  - `observe-activity.tsx`
  - `observe-logs.tsx`
  - `runtime-api.ts`
  - `view-models.ts`
  - `design-system.ts`
- Prior recursive evidence:
  - run `16` requirements (canonical telemetry contract)
  - run `35` requirements/AS-IS/plan (design-system-first runtime-ui discipline)
  - run `36` requirements + manual QA (packaged-runtime logs/telemetry remediation on `:3456`)

## Known Unknowns

- Whether Activity can gain direct request-detail correlation with existing raw metrics/capture fields or needs a bounded bridge-side helper
- Whether a lightweight `/app/observe` redirect to `/app/observe/requests` is sufficient, or whether the run should keep the route family tab-only
- Whether rebuilt-runtime verification should use the packaged SEA path exclusively or allow the repo-owned rebuilt host bundle when it exercises the same `:3456` operator surface

## Traceability

| R# | AS-IS gap recorded | Primary evidence |
| --- | --- | --- |
| R1 | Observe ownership exists in docs, not strongly enforced in route behavior | `design-system.ts`, `routes.ts` |
| R2 | Requests page underuses unified telemetry summary APIs | `requests.tsx`, `runtime-api.ts` |
| R3 | Activity presents raw metrics in telemetry-like chrome | `observe-activity.tsx`, `buildActivitySummary()` |
| R4 | Logs parses request ids but does not strongly hand off to canonical request detail | `observe-logs.tsx`, `buildStructuredLogRows()` |
| R5 | Secondary Observe pages do not consistently route operators back to canonical request detail | route implementations above |
| R6 | Typed architectural split exists; regression guard is weak | `runtime-api.ts`, `DESIGN_SYSTEM.md` |
| R7 | Green baseline exists; no Observe-specific RED/GREEN slice yet | focused runtime-ui test floor |
| R8 | No fresh rebuilt-runtime/browser Observe QA gate | run `36` manual QA versus current proposal scope |

## Subagent Capability Probe

- Subagent Availability: available
- Delegation Decision Basis: self-audit (read-only Observe inventory and proposal prep)
- Audit Execution Mode: self-audit

## Audit Verdict

Audit: PASS

## Coverage Gate

- [x] Every in-scope requirement has an AS-IS disposition
- [x] Canonical structured telemetry surfaces are distinguished from raw-host adjacency
- [x] TDD and rebuilt-runtime verification gaps are recorded

Coverage: PASS

## Approval Gate

- [x] The AS-IS artifact is sufficient to plan bounded Observe improvements
- [x] No blocking unknown prevents Phase 2 proposal work

Approval: PASS
