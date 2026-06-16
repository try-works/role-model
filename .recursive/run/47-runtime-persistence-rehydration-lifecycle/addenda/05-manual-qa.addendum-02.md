Run: `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/`
Phase: `05 Manual QA`
Addendum: `02`
Status: `LOCKED`
LockedAt: `2026-06-16T08:12:21Z`
LockHash: `a6bc2a344c481f2eef96200f85d17cffabcdfa8565cb9dbd285ec712708de9ca`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/05-manual-qa.md` (LOCKED)
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/addenda/05-manual-qa.addendum-01.md` (LOCKED)
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/addenda/02-to-be-plan.addendum-03.md` (effective follow-up plan)
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/addenda/04-test-summary.upstream-gap.02-to-be-plan.addendum-01.md` (DRAFT at QA time)
- Operator-directed live packaged-runtime verification on `http://127.0.0.1:3456` (2026-06-16)
Outputs:
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/addenda/05-manual-qa.addendum-02.md`
Scope note: Post-lock live-runtime QA addendum for the SP47-M through SP47-Q follow-up. Preserves the earlier standalone-runtime audit findings that motivated the fix, then records the post-implementation rebuilt-runtime verification results.

## TODO

- [x] Preserve the pre-implementation standalone-runtime findings that motivated addendum-03 planning
- [x] Verify the rebuilt packaged runtime on `http://127.0.0.1:3456`
- [x] Check API truth and rendered UI together for the affected routes
- [x] Record residual issues without reclassifying backend-truth warnings as product regressions

## Effective Inputs Re-read

- `05-manual-qa.md`
- `addenda/05-manual-qa.addendum-01.md`
- `addenda/02-to-be-plan.addendum-03.md`
- `addenda/04-test-summary.upstream-gap.02-to-be-plan.addendum-01.md`
- `role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`
- `role-model-router/apps/runtime-ui/app/routes/router.tsx`
- `role-model-router/apps/runtime-ui/app/lib/view-models.ts`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/packages/sqlite-memory/src/index.ts`

## Preserved Pre-Implementation Audit Summary

The earlier standalone-runtime audit on `:3456` established the defects that drove `SP47-M` through `SP47-Q`:

- failed local-path requests incremented summary failures but were not usable ledger rows
- `/app` latest requests behaved like a shallow canonical-row teaser instead of an interaction-oriented view
- `/app/observe/activity` drifted from backend recency order
- `/app/router` alias inventory discarded resolved model coverage and rendered endpoints as an unreadable joined string
- the overview top strip duplicated the summary role already served better by `Recent telemetry window`

Those findings remain the input justification for the implementation, but the acceptance question for this addendum is whether the rebuilt runtime now behaves correctly.

## QA Execution Mode

QA Execution Mode: `agent-operated`

Tools used:

- live HTTP probes via `Invoke-RestMethod`
- packaged runtime rebuild and launch on `http://127.0.0.1:3456`
- in-app browser verification via Playwright MCP

## Live API Verification

Health:

- `GET /healthz`
  - returned `status: "degraded"` with `executionMode: "decision_only"`
  - credential lifecycle remained `authoritative`
  - one alias drift warning remained for `mixed.local-remote -> moonshot/kimi-k2.6`, which matches current persisted config truth and is not stale UI residue

Telemetry summary:

- `GET /api/role-model/telemetry/summary`
  - `requestCount: 50`
  - `successCount: 41`
  - `failureCount: 9`
  - `totalEstimatedCostUsd: 0.004261`
  - `totalEffectiveCostUsd: 0.004261`
- Result:
  - the overview tokens card backend contract still includes estimate-only DeepSeek cost via `totalEffectiveCostUsd`

Telemetry ledger:

- `GET /api/role-model/telemetry/requests?limit=5`
  - newest failure row now appears as:
    - `requestId: req-8f00fbee-f3db-4ab0-a3fc-ed1c5b49ed46`
    - `endpointId: routing.failed.pre-execution`
    - `clientRequestId: req-run47-failure-001`
    - `requestClass: live_request`
    - `sourceType: local`
  - next rows are the three latest successful live requests with correlation ids `req-run47-verify-003`, `002`, and `001`
- Result:
  - `SP47-M` is verified end to end on the packaged runtime

Metrics ordering:

- `GET /api/metrics`
  - backend remains newest-first for recent activity
- Result:
  - the activity route now has the right source order to preserve

Router summary:

- `GET /api/role-model/router/summary`
  - alias `mixed.local-remote` reports:
    - `configuredHintModelIds: ["lfm2.5-8b-a1b", "moonshot/kimi-k2.6"]`
    - `resolvedModelIds: ["deepseek/deepseek-v4-flash", "deepseek/deepseek-v4-pro", "lfm2.5-8b-a1b", "moonshot/kimi-k2.7-code"]`
    - `allowEndpointIds`: four structured endpoint ids
    - `readiness: "ready"`
- Result:
  - the backend already publishes the canonical alias truth and the UI now has the right data to render it cleanly

## Browser Verification

### `/app`

Observed:

- page header reads `Runtime overview`
- the first summary block is `Recent telemetry window`
- the redundant `Providers / Endpoints / Execution-ready / Bootstrap` strip is gone
- `Current endpoint inventory` appears ahead of `Latest requests`
- `Latest requests` shows the forced failure row followed by the three latest successful request interactions

Acceptance:

- PASS for `SP47-N`

### `/app/router`

Observed:

- `Alias inventory` renders as a structured table
- the route separates:
  - configured hints
  - resolved models
  - allowed endpoints
  - readiness
- the visible `moonshot/kimi-k2.6` drift warning is paired with the resolved current model pool instead of masquerading as full alias coverage

Acceptance:

- PASS for `SP47-P`

### `/app/observe/activity`

Observed:

- the page retains its raw-host adjacency framing
- the newest metrics entries now match the backend recency order instead of being reversed by client-side synthetic-id sorting

Acceptance:

- PASS for `SP47-O`

### `/app/observe/requests`

Observed:

- the top row is the newly forced failure entry with:
  - explicit failure-stage endpoint marker
  - client correlation id
  - live-request classification
- recent successful requests follow beneath it as canonical ledger rows

Acceptance:

- PASS for `SP47-M`

## Residual Findings

- Historical pre-fix failure rows still exist lower in the ledger with older `unknown.endpoint` style fallback data; no backfill migration was performed
- The current `moonshot/kimi-k2.6` alias drift warning remains correct until the persisted runtime config is changed; the targeted test proved that canonical removal clears it, so no product bug remains in this slice
- Runtime `healthz` remains `degraded` in `decision_only` mode because both vendors are inactive; this is expected for the current operator state and not part of the follow-up defect set

## Acceptance Matrix

| Scenario | Result | Evidence |
| --- | --- | --- |
| Failed local-path request visibility | PASS | `/api/role-model/telemetry/requests` newest failure row with correlation + explicit failure-stage endpoint id |
| Latest requests interaction view | PASS | `/app` shows failure interaction plus newest live rows; stale benchmark pinning is not present |
| Overview IA replacement | PASS | `/app` starts with `Recent telemetry window`; redundant summary strip removed |
| Activity ordering parity | PASS | `/app/observe/activity` aligns with backend newest-first order |
| Router alias inventory clarity | PASS | `/app/router` separates configured hints, resolved models, allowed endpoints, and readiness |
| Tokens card effective-cost regression | PASS | backend `totalEffectiveCostUsd: 0.004261` remains the operator-facing summary truth |
| Alias drift removal proof | PASS | targeted canonical-removal test passes; live remaining warning matches backend truth |

## Coverage Gate

- [x] The motivating live-runtime defects are preserved as QA context
- [x] The rebuilt packaged runtime was verified through both API and browser reads
- [x] Each affected operator surface now has a concrete PASS/FAIL outcome
- [x] Residual issues are separated from the fixed defect set

Coverage: PASS

## Approval Gate

- [x] Agent-operated QA evidence is concrete and replayable
- [x] The rebuilt packaged runtime stayed live long enough for API and browser proof
- [x] The addendum closes the SP47-M through SP47-Q acceptance questions without rewriting locked earlier receipts

Approval: PASS

## Audit Context

- Audit Execution Mode: self-audit
- Subagent Availability: available
- Subagent Capability Probe: browser automation and direct HTTP probing were both available in the current environment
- Delegation Decision Basis: this QA receipt depends on live local runtime behavior, direct API reads, and same-session browser inspection
- Delegation Override Reason: controller-operated live verification was lower-risk than delegating access to the active packaged runtime session
- Audit Inputs Provided:
  - `05-manual-qa.md`
  - `addenda/05-manual-qa.addendum-01.md`
  - `addenda/02-to-be-plan.addendum-03.md`
  - `addenda/04-test-summary.upstream-gap.02-to-be-plan.addendum-01.md`
  - live `:3456` API responses and browser snapshots

## Subagent Contribution Verification

- Reviewed Action Records: none
- Main-Agent Verification Performed: re-queried `healthz`, telemetry summary, telemetry requests, metrics, and router summary; navigated `/app`, `/app/router`, `/app/observe/activity`, and `/app/observe/requests` in the live packaged runtime
- Acceptance Decision: accepted
- Refresh Handling: QA results were captured against the current live packaged runtime session rather than stale earlier notes
- Repair Performed After Verification: none

## Requirement Completion Status

- `R4` | Status: verified | Verification Evidence: this addendum, `/app` and `/app/router` live proof
- `R8` | Status: verified | Verification Evidence: this addendum, telemetry ledger and requests browser proof
- `R10` | Status: verified | Verification Evidence: this addendum, telemetry summary and requests API proof
- `R15` | Status: verified | Verification Evidence: this addendum, router summary plus `/app/router` browser proof
- `R16` | Status: verified | Verification Evidence: this addendum, targeted stale-hint removal regression recorded in Phase 4
- `R17` | Status: verified | Verification Evidence: this addendum, cross-surface parity between dashboard, requests ledger, activity page, and router inventory

Audit: PASS
