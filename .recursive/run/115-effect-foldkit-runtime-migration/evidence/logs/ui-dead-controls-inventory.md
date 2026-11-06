# UI dead-control inventory

Date: 2026-11-03. Read-only inventory; no product code changed.

## Method

- Enumerated every route in `src/route.ts` (47 route cases) and the route view mapping in `src/view.ts`.
- For each route view, inspected the producing source for `h.button`, `h.input`, `h.select`, clickable/selected row constructs, and checked for a Foldkit event attribute (`h.OnClick`, `h.OnInput`, `h.OnChange`, `h.OnSubmit`) or `h.Href`.
- Primitive helpers were expanded to their call sites: `referenceSelect` (`features/layout/reference.ts:60-64`), `filterBar`/`segmented` (`features/s563-layout.ts:62-100`), `observeFilterBar` (`features/observe/views.ts:49-100`), and `familyPage` (`families-view.ts:41-80`).
- Controls explicitly rendered `Disabled(true)` with a `reason-disabled` are not counted as dead; they advertise that they are unavailable.
- Output is source-level; no browser DOM walk was needed because route views are plain render functions.

## Dead-control table

| Route | file:line | Control | User-facing label | Wired |
|---|---|---|---|---|
| /models | features/models/routes.ts:100 | clickable model row (div) | each model display name | no |
| /models | features/models/routes.ts:61 | detail selection | hard-coded `cards[0]`; no row selection | no |
| /models/roles | features/models/routes.ts:181 | input ×4 | Role id, Name, Description, Default system instructions | no |
| /models/roles | features/models/routes.ts:188 | select ×2 | "Kindassistant", "tool policy allowed · supported tasks co" | no |
| /models/roles | features/models/routes.ts:190 | button | Create role | no |
| /models/roles | features/models/routes.ts:191 | button | Reset | no |
| /models/roles | features/models/routes.ts:192 | button | Advanced policy fields | no |
| /models/roles | features/models/routes.ts:196,199 | table rows | Role catalog / Role task allowlists (no row action) | no |
| /models/roles | features/models/routes.ts:202 | table rows | Edit selected role (hard-coded field rows) | no |
| /system/benchmark | features/models/routes.ts:214 | select ×2 | Benchmark mode, Judge endpoint | no |
| /system/benchmark | features/models/routes.ts:216 | button | Run quick benchmark (3 models, 12 cases) | no |
| /system/benchmark | features/models/routes.ts:217 | button | Clear all benchmark data | no |
| /learning | features/learning/routes.ts:16 | password input | Operator token | no |
| /learning/configuration | features/learning/routes.ts:16 | password input | Operator token | no |
| /learning/packs | features/learning/routes.ts:16 | password input | Operator token | no |
| /learning/packs | features/learning/routes.ts:139 | button | Roll back active pack (scope-wide) | no |
| /learning/packs | features/learning/routes.ts:140 | button | Engage kill switch | no |
| /learning/packs | features/learning/routes.ts:141 | button | Release kill switch | no |
| /learning/decisions | features/learning/routes.ts:16 | password input | Operator token | no |
| /learning/decisions | features/learning/routes.ts:155 | select ×3 | Role, Task, Outcome | no |
| /learning/evidence | features/learning/routes.ts:16 | password input | Operator token | no |
| /learning/history | features/learning/routes.ts:16 | password input | Operator token | no |
| /requests | features/observe/views.ts:155 | button ×4 | Day, Week, Month, 90 days | no |
| /requests | features/observe/views.ts:173 | select | Breakdown | no |
| /requests | features/observe/views.ts:174 | select | Source | no |
| /requests | features/observe/views.ts:136 | button | Expand (Advanced controls) | no |
| /requests | features/observe/views.ts:211 | select | Status family | no |
| /requests | features/observe/views.ts:225 | table rows | Recent telemetry requests (no row drill-in despite copy) | no |
| /observe/logs | features/observe/views.ts:298 | segmented button ×2 | All sources, combined | no |
| /observe/routing | features/observe/views.ts:312 → 71 | button ×4 | Day, Week, Month, 90 days | no |
| /observe/routing | features/observe/views.ts:312 → 86-88 | select ×3 | Breakdown, Source, Difficulty | no |
| /observe/routing | features/observe/views.ts:312 → 96 | button | Expand | no |
| /observe/observability-snapshot | features/observe/views.ts:324 | button | Refresh | no |
| /observe/store-degradation-receipts | features/observe/views.ts:345 | button | Refresh | no |
| /observe/activity | features/observe/views.ts:257 | activity rows (div) | recent host activity; no capture drill-in | no |
| /local/peers | families-view.ts:371 | input | Endpoint URL | no |
| /local/peers | families-view.ts:372 | password input | Auth token (optional) | no |
| /local/peers | families-view.ts:366 | table row actions | Check health / Remove (plain text, no buttons) | no |
| /local/peer-models | families-view.ts:383 | input | Model ID | no |
| /local/llama-swap/models | families-view.ts:588 | input | Model ID | no |
| /local/llama-swap/models | families-view.ts:592 | static text | "28 selected · click to clear" (looks actionable) | no |
| /system/operator | families-view.ts:450 | password input | Operator access token | no |
| /system/operator | families-view.ts:450 | button | Load Operator State | no |
| /system/operator | families-view.ts:460 | input | Trace root id | no |
| /system/operator | families-view.ts:461 | number input | Max requests | no |

## Counts

- Dead interactive control instances: **53**
- Routes with dead controls: **19 of 47**
- Structural dead row/detail gaps: **6** (/models row selection, /models hard-coded detail, /models/roles catalog/edit rows, /requests ledger drill-in, /observe/activity capture drill-in)
- Explicitly disabled controls with a reason (not counted): local peers Add endpoint, local peer models Add role/Select all/Register, system extensions Pause, router family filter text/selects, operator Create Replay.

## Routes with no dead interactive controls

| Route(s) | Status |
|---|---|
| /, /diagnostics/:id, /runtime, /runtime/config, /session-readiness, /dashboard | render-only/readback; nav links wired |
| /control/providers | provider form save/field/select wired; device-auth dialog wired |
| /control/endpoints | endpoint admission form + control action wired; connection table rows read-only |
| /control/controller | controller select/save wired |
| /router, /router/candidates, /router/decisions, /router/decisions/:id, /router/strategy, /router/workloads, /router/config, /router/agent-strategy | actions wired where enabled; filter text/selects disabled on purpose |
| /local/choose, /local/policy, /local/swap, /local/logs | nav links wired; local policy inputs/save/reset wired |
| /local/peer-models, /local/peers, /local/llama-swap/models | see dead controls above |
| /studio (all tabs) | fields/run/select wired |
| /observe/queues, /observe/queues-config, /integrations/downstream, /integrations/upstream | read-only/readback |
| /system/peers, /system/extensions, /system/storage-retention, /system/benchmark | readback/read-only except benchmark dead controls above |
| /requests/:id, /observe/logs, /observe/activity, /observe/observability-snapshot, /observe/store-degradation-receipts | rows/refresh as listed above |
| /device-auth dialog (on providers) | fully wired |
| /metrics? (none) | n/a |

## Totals by source file

| File | Dead enabled controls |
|---|---|
| features/models/routes.ts | 13 |
| features/learning/routes.ts | 12 rendered instances (6 routes) |
| features/observe/views.ts | 20 |
| families-view.ts (local peers/peer models/llama models) | 4 |
| families-view.ts (system operator) | 4 |
| **Total** | **53** |

## Highest-impact findings

1. `/models` is entirely static: rows are plain divs (`features/models/routes.ts:100`), and the right detail panel always renders `cards[0]` (`:61`).
2. `/models/roles` presents a complete Create-role form and three action buttons with no event attributes (`:181-192`); the role tables have no row actions.
3. `/system/benchmark` offers mode/judge selects and Run/Clear buttons with no handlers (`:214-217`).
4. Every Learning route renders an operator-token password field with no input handler; Packs adds three dead action buttons, Decisions adds three dead filter selects.
5. Observe/Requests and Observe/Routing expose time-range, breakdown/source/difficulty and Expand controls that only toggle ARIA state in markup; no dispatch.
