Run: `/.recursive/run/45-observe-surface-realignment/`
Phase: `02 To-Be Plan`
Status: `LOCKED`
LockedAt: `2026-06-15T07:35:57Z`
LockHash: `539154e19b41df7ed94ad8c41ed8d435c528428f7aef005aded48cde6eebbd3f`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/45-observe-surface-realignment/00-requirements.md`
- `/.recursive/run/45-observe-surface-realignment/00-worktree.md`
- `/.recursive/run/45-observe-surface-realignment/01-as-is.md`
Outputs:
- `/.recursive/run/45-observe-surface-realignment/02-to-be-plan.md`
Scope note: ExecPlan for realigning Observe so Requests/request detail are unmistakably the canonical telemetry surfaces, while Activity and Logs remain valuable preserved-host adjacency pages with stronger handoffs and explicit rebuilt-runtime verification.

## TODO

- [x] Map each requirement to bounded implementation sub-phases
- [x] Preserve design-system-first ordering before route changes
- [x] Define strict TDD and rebuilt-runtime verification expectations
- [x] Define focused package validation and browser QA
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Planned Outcome

Run 45 will:

1. Make the Observe contract explicit in the design system, route metadata, and regression tests.
2. Upgrade Observe → Requests into the unmistakable telemetry-first surface by using canonical summary plus ledger data instead of only a thin list view.
3. Reframe Observe → Activity and Observe → Logs as preserved-host adjacency pages with honest raw-host semantics and stronger request-detail handoffs.
4. Keep role-model-owned typed APIs as the canonical data layer and only add bounded bridge support if existing raw-host surfaces cannot support the new handoffs.
5. Require strict TDD for production changes and require verification on a rebuilt runtime with browser proof against the real operator surface.

All work executes from worktree `D:\DEV\role-model\.worktrees\45-observe-surface-realignment` on branch `recursive/45-observe-surface-realignment`.

## Requirement Mapping

| R# | Sub-phase(s) | Primary deliverable |
| --- | --- | --- |
| R1 | SP45-A | Observe contract, nav/route ownership, optional `/app/observe` -> `/app/observe/requests` landing |
| R2 | SP45-B | Requests summary + ledger uplift on canonical telemetry APIs |
| R3 | SP45-C | Activity becomes explicit raw-host/capture adjacency |
| R4 | SP45-D | Logs becomes explicit preserved-host adjacency with request-detail handoffs |
| R5 | SP45-B, SP45-C, SP45-D, SP45-E | Cross-surface handoffs and bounded correlation support |
| R6 | SP45-A, SP45-E | Design-system-first + typed-boundary preservation |
| R7 | SP45-A through SP45-E | Strict RED -> GREEN proof for every production slice |
| R8 | SP45-F | Rebuilt-runtime verification plus browser QA on Observe routes |

## Implementation Sub-phases

### SP45-A — Observe contract reset (`R1`, `R6`, `R7`)

**Order (mandatory):**

1. `DESIGN_SYSTEM.md`
   - update Observe navigation/route contract so Requests and request detail are explicitly the canonical structured telemetry path
   - describe Activity as raw host metrics/captures adjacency
   - describe Logs as preserved-host logs adjacency
   - record whether `/app/observe` redirects to `/app/observe/requests`
2. `design-system.ts`
   - align Observe route titles/descriptions/labels with the new contract
   - update `getRuntimeRouteDefinition()` if a default `/app/observe` landing or redirect is added
3. `design-system.test.ts`
   - add or update guards so Observe ownership cannot drift back:
     - Requests is canonical telemetry
     - Activity and Logs are secondary/raw-host adjacency
     - optional `/app/observe` landing resolves correctly
4. `routes.ts` / redirect plumbing (only if needed)
   - add the landing redirect if the chosen contract includes it

**TDD checkpoint:**

- Change regression expectations first, observe failure, then update route metadata and routing plumbing until green.

### SP45-B — Requests and request detail telemetry uplift (`R2`, `R5`, `R7`)

**Order:**

1. `runtime-api.ts` + `runtime-api.test.ts`
   - use the existing summary/dashboard telemetry APIs where needed for Observe → Requests
   - add any typed helper needed for page-level summary consumption
2. `view-models.ts` + `view-models.test.ts`
   - add summary-row builders or helper transforms for Observe → Requests
3. `requests.tsx`
   - render a telemetry-first summary strip (for example: total requests, local/remote breakdown, failure posture, latency posture) above the ledger
   - preserve SSE freshness from `/api/role-model/telemetry/stream`
   - add explicit links to Activity/Logs as secondary debugging surfaces, not peer primaries
4. `request-detail.tsx`
   - strengthen handoffs back out to captures/logs where available
   - keep request detail as the single richest canonical inspector

**TDD checkpoint:**

- RED: summary/helper expectations and page-level behavior fail first
- GREEN: route renders canonical telemetry summary and ledger together without losing SSE refresh or request drill-in

### SP45-C — Activity raw-host realignment (`R3`, `R5`, `R7`)

**Order:**

1. `view-models.ts` + tests (if summary copy/state helpers are extracted)
2. `observe-activity.tsx`
   - make the raw-host nature of the page explicit in headings/copy/empty states
   - keep `/api/metrics` and `/api/captures/:id` as preserved tools
   - add a strong handoff back to canonical Requests / Request detail
3. `runtime-api.ts` / host bridge support only if RED proves the current raw-host data cannot support the intended handoff cleanly

**TDD checkpoint:**

- RED: raw-host framing / handoff expectations fail
- GREEN: Activity still exposes raw metrics/captures but no longer reads like the primary telemetry surface

### SP45-D — Logs realignment and request handoffs (`R4`, `R5`, `R7`)

**Order:**

1. `view-models.ts` + `view-models.test.ts`
   - encode request-id linking or row metadata needed for handoffs from log rows
2. `observe-logs.tsx`
   - turn correlated request ids into direct handoffs to `/app/observe/requests/:requestId`
   - explain when raw logs are secondary to the canonical telemetry pages
   - preserve raw `/logs/stream/*` escape hatches
3. `runtime-api.ts` / host bridge support only if the current `/logs` payload lacks the typed data needed for a stable handoff

**TDD checkpoint:**

- RED: parsed log/request handoff expectations fail
- GREEN: correlated request rows can jump directly to canonical request detail while raw stream endpoints remain intact

### SP45-E — Bounded backend support only where the frontend proves it is necessary (`R5`, `R6`, `R7`)

**Scope rule:**

- Do not invent a new broad observability subsystem.
- Only add bridge/runtime API support if SP45-C or SP45-D RED cases prove the current raw-host surfaces cannot support the required correlation or request-detail handoff with stable typed semantics.

**Likely files if needed:**

- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/test/*.test.ts`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`

**TDD checkpoint:**

- any bridge/API production change must start from a failing host-bridge or runtime-api test before implementation

### SP45-F — Verification, rebuilt runtime, and browser QA (`R7`, `R8`)

**Focused automated floor:**

1. `corepack pnpm --dir role-model-router --filter @role-model-router/runtime-ui test`
2. `corepack pnpm --dir role-model-router --filter @role-model-router/runtime-ui build`
3. If bridge/API files change: focused `@role-model-router/runtime-host-bridge` tests covering the changed observe-facing surfaces

**Rebuilt runtime gate:**

4. Rebuild the runtime artifact used by operators:

   `corepack pnpm --dir role-model-router --filter @role-model-router/runtime-host-bridge package-sea`

5. Start the rebuilt runtime on the real operator path (expected host surface `http://127.0.0.1:3456`)

**Browser QA gate (required):**

6. Verify in a browser against the rebuilt runtime:
   - Observe → Requests loads the new telemetry-first summary plus ledger
   - Request drill-in opens the canonical detail view
   - Observe → Activity reads as raw-host/capture adjacency, not the primary telemetry ledger
   - Observe → Logs exposes parsed rows plus request-detail handoffs and raw stream actions
   - cross-links between Requests, Request detail, Activity, and Logs behave correctly

## Planned Changes by File

| File | SP | Change summary |
| --- | --- | --- |
| `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md` | SP45-A | Observe ownership contract and verification expectations |
| `app/lib/design-system.ts` | SP45-A | Observe route metadata, optional landing resolution |
| `app/lib/design-system.test.ts` | SP45-A | Observe ownership regression guards |
| `app/routes.ts` | SP45-A | optional `/app/observe` redirect registration |
| `app/lib/runtime-api.ts` | SP45-B, SP45-E | typed summary/correlation helpers only as needed |
| `app/lib/runtime-api.test.ts` | SP45-B, SP45-E | TDD coverage for any new typed helpers |
| `app/lib/view-models.ts` | SP45-B, SP45-C, SP45-D | request summary, raw-host framing, log handoff helpers |
| `app/lib/view-models.test.ts` | SP45-B, SP45-C, SP45-D | RED/GREEN coverage for view-model changes |
| `app/routes/requests.tsx` | SP45-B | telemetry-first summary + ledger |
| `app/routes/request-detail.tsx` | SP45-B | stronger raw-host adjacency handoffs |
| `app/routes/observe-activity.tsx` | SP45-C | explicit raw-host/capture framing |
| `app/routes/observe-logs.tsx` | SP45-D | request-detail links + clearer raw-host framing |
| `apps/runtime-host-bridge/src/index.ts` | SP45-E | bounded observe-support API adjustments only if RED requires them |
| `apps/runtime-host-bridge/test/*` | SP45-E | failing-test-first proof for any backend additions |

## Implementation Steps

1. Complete SP45-A and keep the Observe contract changes green in `design-system.test.ts`.
2. Complete SP45-B with RED -> GREEN request-summary coverage before route edits settle.
3. Complete SP45-C with RED -> GREEN raw-host-boundary coverage.
4. Complete SP45-D with RED -> GREEN request-handoff coverage.
5. Execute SP45-E only if earlier RED cases prove a bounded backend addition is necessary.
6. Run the focused verification floor.
7. Rebuild the runtime artifact and execute browser QA against the rebuilt runtime on `:3456`.
8. Record Phase 4 and Phase 5 evidence in the run artifacts before implementation closeout.

## TDD Plan

TDD Mode: `strict`

Policy:

- Documentation-only contract updates in `DESIGN_SYSTEM.md` may precede code.
- Every production TypeScript change after the contract update must be preceded by failing automated coverage at the closest relevant layer:
  - `design-system.test.ts` for route ownership/metadata
  - `runtime-api.test.ts` for typed fetchers/helpers
  - `view-models.test.ts` for Observe summary and log/activity transforms
  - focused runtime-host-bridge tests if backend/API support changes

### Planned RED/GREEN evidence paths

| Slice | RED log | GREEN log |
| --- | --- | --- |
| SP45-A Observe contract | `evidence/logs/sp45-a-observe-contract.red.log` | `evidence/logs/sp45-a-observe-contract.green.log` |
| SP45-B Requests telemetry summary | `evidence/logs/sp45-b-requests-summary.red.log` | `evidence/logs/sp45-b-requests-summary.green.log` |
| SP45-C Activity raw-host framing | `evidence/logs/sp45-c-activity-raw-host.red.log` | `evidence/logs/sp45-c-activity-raw-host.green.log` |
| SP45-D Logs request handoffs | `evidence/logs/sp45-d-logs-handoffs.red.log` | `evidence/logs/sp45-d-logs-handoffs.green.log` |
| SP45-E Optional backend support | `evidence/logs/sp45-e-observe-api.red.log` | `evidence/logs/sp45-e-observe-api.green.log` |

## Testing Strategy

Per implementation slice, run the strongest relevant focused checks from the worktree:

```powershell
cd D:\DEV\role-model\.worktrees\45-observe-surface-realignment
corepack pnpm --dir role-model-router --filter @role-model-router/runtime-ui test
corepack pnpm --dir role-model-router --filter @role-model-router/runtime-ui build
```

If backend/API support changes:

```powershell
cd D:\DEV\role-model\.worktrees\45-observe-surface-realignment
corepack pnpm --dir role-model-router --filter @role-model-router/runtime-host-bridge test
```

Phase 4 must record the focused runtime-ui verification floor and any runtime-host-bridge verification needed by the final diff.

## Playwright Plan (if applicable)

Not required.

This run's browser proof is still mandatory, but it will be executed as agent-operated browser verification against the rebuilt runtime on `http://127.0.0.1:3456` rather than through a dedicated Playwright suite unless a later implementation slice introduces repo-owned browser automation as part of the RED/GREEN path.

## Manual QA Scenarios

QA Execution Mode: `agent-operated`

All scenarios must run against the rebuilt runtime, not just a dev server:

1. **Requests is primary** — open `/app/observe/requests`; verify telemetry-first summary + ledger load on the rebuilt runtime
2. **Request detail is canonical** — drill into one request and verify the richer inspector remains the primary diagnostic surface
3. **Activity is secondary/raw-host** — open `/app/observe/activity`; verify the page clearly reads as raw host metrics/captures adjacency and points back to Requests
4. **Logs is secondary/raw-host** — open `/app/observe/logs`; verify request-id handoffs, raw stream actions, and explicit canonical-telemetry framing
5. **Cross-surface flow** — move between Requests, Request detail, Activity, and Logs without losing operator context
6. **Browser verification on rebuilt runtime** — capture proof from the real `:3456` operator surface after the runtime artifact has been rebuilt

## Idempotence and Recovery

- If SP45-A reveals the Observe contract is too broad, stop and narrow the plan before backend changes.
- If SP45-C or SP45-D require new backend support, add only the typed field/helper needed by the failing test.
- If rebuilt-runtime verification fails while focused tests are green, treat that as a blocking host-path regression and return to Phase 1.5 or Phase 2 addendum rather than softening the QA gate.

## Risks And Controls

| Risk | Control |
| --- | --- |
| Requests gains yet another dashboard clone | Keep Observe → Requests focused on telemetry summary + ledger, not a second top-level Overview |
| Activity/Logs lose useful raw-host utility | Preserve `/api/metrics`, `/api/captures/:id`, `/logs`, and `/logs/stream/*` as explicit operator tools |
| Proposal drifts into a broad observability rewrite | SP45-E is conditional and bounded; no new subsystem without failing-test evidence |
| Unit tests pass but packaged runtime still drifts | rebuilt-runtime browser verification on `:3456` is a hard requirement |

## Traceability

| R# | Planned sub-phase | Verification |
| --- | --- | --- |
| R1 | SP45-A | design-system tests + optional landing redirect proof |
| R2 | SP45-B | runtime-api/view-model tests + runtime-ui render behavior |
| R3 | SP45-C | route/view-model tests + browser QA |
| R4 | SP45-D | route/view-model tests + browser QA |
| R5 | SP45-B through SP45-E | cross-link tests + rebuilt-runtime browser flow |
| R6 | SP45-A, SP45-E | design-system-first diff + bounded API scope |
| R7 | all slices | RED/GREEN logs per sub-phase |
| R8 | SP45-F | rebuilt runtime rebuild + browser verification on `:3456` |

## Subagent Capability Probe

- Subagent Availability: available
- Delegation Decision Basis: self-audit for the planning artifact; no delegated implementation or review is needed yet
- Audit Execution Mode: self-audit

## Audit Verdict

Audit: PASS

## Coverage Gate

- [x] Every in-scope requirement is mapped to a bounded sub-phase
- [x] Strict TDD is explicit for production changes
- [x] Rebuilt-runtime browser verification is required, not optional

Coverage: PASS

## Approval Gate

- [x] Plan is bounded to Observe route realignment and adjacent typed API support only
- [x] Verification expectations include focused tests, rebuilt runtime, and browser proof

Approval: PASS
