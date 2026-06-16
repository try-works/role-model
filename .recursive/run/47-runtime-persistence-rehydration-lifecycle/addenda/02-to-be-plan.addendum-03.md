Run: `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/`
Phase: `02 To-Be Plan`
Addendum: `03`
Status: `LOCKED`
LockedAt: `2026-06-16T08:12:13Z`
LockHash: `cbfc06e8fa4ea20d3d04664ee6d360474b51148973e9c5bfe36bb73826105d33`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/00-requirements.md` (LOCKED)
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/02-to-be-plan.md` (LOCKED)
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/addenda/02-to-be-plan.addendum-01.md` (LOCKED)
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/addenda/02-to-be-plan.addendum-02.md` (LOCKED)
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/addenda/05-manual-qa.addendum-02.md` (DRAFT)
- Live standalone runtime audit evidence from `http://127.0.0.1:3456` on 2026-06-16
Outputs:
- `/.recursive/run/47-runtime-persistence-rehydration-lifecycle/addenda/02-to-be-plan.addendum-03.md`
Scope note: Root-cause-corrected implementation plan for the post-lock dashboard/router/telemetry follow-up. Refines prior Phase 2 addenda by separating actual product bugs from already-fixed or operator-data-truth items, and by attaching strict TDD plus rebuilt-runtime verification to only the slices that still require code.

## TODO

- [x] Re-read the locked base plan and prior follow-up addenda
- [x] Reconcile the latest live-runtime evidence against the earlier hypotheses
- [x] Identify exact root causes for F7-F12
- [x] Convert only the still-open code defects into implementation slices
- [x] Add strict TDD and rebuilt-runtime verification requirements
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Effective Inputs Re-read

- `00-requirements.md`: especially `R4`, `R8`, `R10`, `R15`, `R16`, `R17`
- `02-to-be-plan.md`: locked baseline SP47-A through SP47-F plan
- `addenda/02-to-be-plan.addendum-01.md`: first follow-up plan for F1-F6
- `addenda/02-to-be-plan.addendum-02.md`: source-of-truth, identity, and exact-command refinements
- `addenda/05-manual-qa.addendum-02.md`: live `3456` audit findings F7-F12
- `role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`
- `role-model-router/apps/runtime-ui/app/routes/router.tsx`
- `role-model-router/apps/runtime-ui/app/routes/observe-activity.tsx`
- `role-model-router/apps/runtime-ui/app/routes/requests.tsx`
- `role-model-router/apps/runtime-ui/app/lib/view-models.ts`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `role-model-router/packages/sqlite-memory/src/index.ts`

## Earlier Addendum Reconciliation

`02-to-be-plan.addendum-01.md` and `02-to-be-plan.addendum-02.md` set the correct direction, but the newer live-runtime evidence changes the implementation baseline in four important ways:

1. `F7` is not a pure "missing request row" bug. The failed requests exist in the telemetry ledger, but they lose operator-meaningful metadata.
2. `F3` should not drive new code by default. The current worktree and live `3456` summary already compute effective DeepSeek cost correctly.
3. `F6` is not currently proven to be a UI cache defect. The live router summary still reports `moonshot/kimi-k2.6` in canonical configured hints, so the visible warning matches current backend truth.
4. `F8` and `F12` should be solved together as one dashboard interaction/information-architecture slice after the failure-metadata seam is fixed.

This addendum supersedes the implementation detail of the earlier follow-up plan where it conflicts with these corrected findings.

## Root-Cause Corrections

### F7 — failure rows persist, but they lose correlation and routing metadata

**Live evidence**

- Live `3456` telemetry summary showed `failureCount: 8`.
- Live `3456` telemetry request rows included a failed record such as:
  - `endpointId: "unknown.endpoint"`
  - `clientRequestId: null`
  - `requestClass: "unknown"`
  - `sourceType: "local"`

**Exact root cause**

- `executeChatCompletions()` failure handling calls `persistRuntimeTelemetryFailure(...)`.
- `persistRuntimeTelemetryFailure()` inserts only a skeletal telemetry row:
  - request id
  - model id
  - status/error
  - latency
  - fallback `endpointId: "unknown.endpoint"` when no endpoint is provided
- `clientRequestId` and `requestClass` are not stored in the telemetry table.
- `readObservationTelemetryMeta()` derives `clientRequestId` and `requestClass` only from the observation bundle.
- Failure-only executions that do not persist a matching observation bundle therefore remain queryable, but they become operator-unfriendly rows with null correlation and degraded classification.

**Planning consequence**

- The fix target is metadata completeness, not row existence.
- Phase 3 must either:
  - persist a minimal failure observation bundle, or
  - extend the failure persistence contract so the telemetry row itself retains correlation and routing metadata.

### F8 — latest requests lacks an interaction-level projection, not just a sort fix

**Live evidence**

- The old “benchmark rows pinned forever” symptom no longer reproduced on `3456`.
- The widget still shows the top three non-benchmark canonical request records.

**Exact root cause**

- `buildDashboardLatestRequestRows()` filters only `requestClass !== "benchmark"`, then sorts newest-first and slices to `3`.
- The widget does not have a distinct "latest operator interactions" contract.
- It renders canonical request ids first and only shows correlation opportunistically.
- Alias-routed requests are therefore presented as low-level execution rows rather than as meaningful interaction summaries.
- This problem is amplified by `F7`, because failed rows lose the correlation metadata the widget would need to present them usefully.

**Planning consequence**

- Do not spend Phase 3 on a fake sort fix.
- First fix failure metadata completeness.
- Then add an explicit latest-interaction projection for `/app`, with clear labels for alias-routed traffic and request provenance.

### F9 — observe-activity is reversed by a synthetic-id re-sort

**Exact root cause**

- `listRecentRuntimeObservations()` already returns newest-first by `created_at_ms DESC`.
- `buildObservedActivityEntries()` maps that ordered list and assigns `id = index + 1`.
- `buildActivitySummary()` then re-sorts by `id DESC`.
- Because `id` is synthetic and assigned after the newest-first list is built, the UI reverses the intended order and drifts from `/api/metrics`.

**Planning consequence**

- This is a narrow, deterministic presentation bug.
- Fix the row ordering contract instead of redesigning the activity API.

### F10 / F11 — router backend already publishes the right truth; the route discards it

**Exact root cause**

- Backend router summary already publishes:
  - `configuredHintModelIds`
  - `resolvedModelIds`
  - `allowEndpointIds`
  - `driftWarnings`
- `router.tsx` currently:
  - maps `Alias coverage` from `configuredHintModelIds`
  - ignores `resolvedModelIds`
  - collapses endpoints into `allowEndpointIds.join(", ")`
- The mismatch is therefore not missing backend data. It is route-level presentation loss.

**Planning consequence**

- Keep the backend summary contract.
- Refactor the route/view-model so configured hints, resolved models, and allowed endpoints are separate structured fields.

### F12 — the overview row duplication is a route-level IA choice

**Exact root cause**

- `dashboard.tsx` renders:
  - a top `stateCards` row (`Providers`, `Endpoints`, `Execution-ready`, `Bootstrap`)
  - a separate `Recent telemetry window` card row later in the page
- Both rows occupy the same “page summary” role.
- The user direction is to keep the telemetry summary row and remove the redundant state-card row.

**Planning consequence**

- No backend work is required for this change.
- Fold it into the same dashboard slice as `F8`.

### F3 — effective cost appears already fixed; keep as regression verification unless a RED test proves otherwise

**Live evidence**

- Live `3456` telemetry summary reported:
  - `totalEstimatedCostUsd: 0.003425`
  - `totalEffectiveCostUsd: 0.003425`
- Current `summarizeTelemetryStats()` already renders `summary.totalEffectiveCostUsd`.

**Current disposition**

- Do not plan new production code for `F3` by default.
- Carry it as a required regression and rebuilt-runtime verification check.
- Only reopen code work if a focused RED test reproduces an actual UI mismatch against the current summary contract.

### F6 — current alias-drift warning matches persisted config truth until a config-update repro says otherwise

**Live evidence**

- Live router summary for `mixed.local-remote` still reports `configuredHintModelIds` containing `moonshot/kimi-k2.6`.
- Session readiness warning is therefore consistent with current backend state.

**Current disposition**

- Do not treat the current visible warning as a presentation bug.
- Treat this as a verification-first item:
  - if removing the hint through the canonical config-update path still leaves the warning behind, that becomes a real Phase 3 code defect
  - if the warning clears after actual config mutation/reload, the remaining problem is operator data, not product code

## Revised Implementation Slices

### SP47-M — failure request metadata completeness (`F7`)

**Objective**

- Preserve operator-meaningful metadata for failed executions so the canonical request ledger remains debuggable.

**Implementation target**

- Ensure failed execution rows retain, at minimum:
  - canonical request id
  - client correlation id when provided
  - request class / origin
  - selected endpoint id when known, or an explicit failure-stage marker when not
  - source type / routing posture sufficient for UI rendering

**Preferred design**

- Prefer a minimal failure-observation bundle or an equivalent explicit failure metadata payload over more UI-side inference.

**Primary files**

- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/packages/sqlite-memory/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `role-model-router/packages/sqlite-memory/test/index.test.ts`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `role-model-router/apps/runtime-ui/app/lib/view-models.ts`

**RED/GREEN evidence**

- RED: `evidence/logs/sp47-m-failure-request-metadata.red.log`
- GREEN: `evidence/logs/sp47-m-failure-request-metadata.green.log`

### SP47-N — dashboard latest-interaction projection and top-row replacement (`F8`, `F12`)

**Objective**

- Make `/app` start with the telemetry summary row and give `Latest requests` an explicit interaction-level contract.

**Implementation target**

- Remove the redundant `Providers / Endpoints / Execution-ready / Bootstrap` row.
- Promote `Recent telemetry window` into the primary summary position.
- Replace raw top-3 canonical-row behavior with a latest-interaction projection that:
  - excludes benchmark traffic intentionally
  - surfaces alias-routed traffic with meaningful labels
  - uses correlation metadata when present
  - remains distinct from the full canonical ledger on `/app/observe/requests`

**Primary files**

- `role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`
- `role-model-router/apps/runtime-ui/app/lib/view-models.ts`
- `role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`
- `role-model-router/apps/runtime-ui/app/lib/design-system.ts`
- `role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`

**Dependency**

- Must build on `SP47-M`; otherwise failure rows remain semantically incomplete.

**RED/GREEN evidence**

- RED: `evidence/logs/sp47-n-dashboard-latest-interactions.red.log`
- GREEN: `evidence/logs/sp47-n-dashboard-latest-interactions.green.log`

### SP47-O — observe-activity recency ordering (`F9`)

**Objective**

- Make `/app/observe/activity` display the newest host activity first, matching the underlying source order.

**Implementation target**

- Remove the synthetic-id recency contract.
- Sort by true event timestamp or preserve the API order as authoritative.

**Primary files**

- `role-model-router/apps/runtime-ui/app/lib/view-models.ts`
- `role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`
- `role-model-router/apps/runtime-ui/app/routes/observe-activity.tsx`

**RED/GREEN evidence**

- RED: `evidence/logs/sp47-o-activity-ordering.red.log`
- GREEN: `evidence/logs/sp47-o-activity-ordering.green.log`

### SP47-P — structured router alias inventory presentation (`F10`, `F11`)

**Objective**

- Present alias inventory using the backend truth that already exists.

**Implementation target**

- Split the current alias row into structured fields:
  - configured hints
  - resolved model coverage
  - allowed endpoints
  - readiness
  - drift warnings
- Make endpoint presentation scan-friendly rather than comma-joined.

**Primary files**

- `role-model-router/apps/runtime-ui/app/routes/router.tsx`
- `role-model-router/apps/runtime-ui/app/lib/view-models.ts`
- `role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`

**RED/GREEN evidence**

- RED: `evidence/logs/sp47-p-router-alias-presentation.red.log`
- GREEN: `evidence/logs/sp47-p-router-alias-presentation.green.log`

### SP47-Q — verification-first alias-drift removal proof (`F6`)

**Objective**

- Determine whether alias drift after config changes is a real code defect or only a persisted-config truth issue.

**Execution rule**

1. Write a focused RED test that removes the stale hint through the same canonical config-update path used by the product.
2. Recompute summary/router state through the normal reload flow.
3. If the warning remains, implement the minimal code repair and capture GREEN evidence.
4. If the warning clears immediately, record that no production code is required for `F6` and treat the remaining issue as operator-data cleanup.

**Primary files**

- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`

**RED/GREEN evidence**

- RED: `evidence/logs/sp47-q-alias-drift-removal.red.log`
- GREEN: `evidence/logs/sp47-q-alias-drift-removal.green.log`

## Items Removed From Default Code Scope

### F3 — tokens cost

- Keep as a mandatory regression/runtime verification item.
- Do not schedule code unless a new RED test proves the UI still diverges from `totalEffectiveCostUsd`.

### F6 — current visible stale warning

- Do not "fix" by suppressing a backend-truth warning.
- Only implement if `SP47-Q` proves the warning survives a real canonical config removal and reload.

## TDD Compliance Plan

TDD Mode: `strict`

Policy:

- Documentation-only route/design-system wording may precede code where needed.
- Every production TypeScript change must start from a failing test or a failing route/view-model assertion at the nearest useful layer.
- Verification-first slices (`F3`, `F6`) do not get speculative production code. They get RED reproduction first.

| Slice | RED required | GREEN required | Notes |
| --- | --- | --- | --- |
| `SP47-M` | yes | yes | failure metadata must be proven missing before repair |
| `SP47-N` | yes | yes | dashboard widget and row replacement |
| `SP47-O` | yes | yes | deterministic order regression |
| `SP47-P` | yes | yes | route/view-model presentation contract |
| `SP47-Q` | yes | conditional | code only if RED proves stale-after-removal bug |
| `F3` regression | verification-only | verification-only | reopen code only if RED proves mismatch |

## Exact Phase 4 Verification Floor

Append any newly introduced dedicated test files to these exact commands rather than replacing them.

### Runtime UI

```powershell
cd D:\DEV\role-model\.worktrees\47-runtime-persistence-rehydration-lifecycle\role-model-router\apps\runtime-ui
corepack pnpm exec vitest run app/lib/design-system.test.ts app/lib/runtime-api.test.ts app/lib/view-models.test.ts
```

### SQLite memory

```powershell
cd D:\DEV\role-model\.worktrees\47-runtime-persistence-rehydration-lifecycle\role-model-router\packages\sqlite-memory
corepack pnpm exec vitest run test/index.test.ts
```

### Runtime host bridge

```powershell
cd D:\DEV\role-model\.worktrees\47-runtime-persistence-rehydration-lifecycle\role-model-router\apps\runtime-host-bridge
corepack pnpm exec vitest run src/routable-inventory.test.ts test/index.test.ts test/account-repair.test.ts test/backend-unified-runtime-config.test.ts test/restart-rehydration.test.ts test/session-readiness-api.test.ts test/session-bootstrap-health.test.ts test/remote-health-bootstrap.test.ts test/operator-intent-corrupt-bootstrap.test.ts test/validate-ui.test.ts test/validate-restart-rehydration.test.ts
```

### Packaged runtime rebuild

```powershell
cd D:\DEV\role-model\.worktrees\47-runtime-persistence-rehydration-lifecycle
corepack pnpm run runtime:package-sea
```

### Post-build runtime execution requirement

Phase 4 is not complete after `runtime:package-sea` alone. After the rebuild:

1. launch the rebuilt runtime artifact/executable
2. record the live listening URL and startup evidence
3. verify `/healthz` and the relevant runtime APIs against that launched process
4. keep that same launched runtime alive for the end-to-end browser pass in Phase 5

## Rebuilt-Runtime Verification Matrix

All runtime verification runs against the rebuilt-and-launched runtime artifact, not only dev-host APIs. Browser checks must be executed against that live launched runtime, not a dev server and not a separate helper runtime.

| ID | Scenario | Pass criteria |
| --- | --- | --- |
| `Q-B1` | Failed local-path request visibility | a forced/observed failed local-path request appears in `/api/role-model/telemetry/requests` and `/app/observe/requests` with usable correlation and non-blank routing metadata |
| `Q-B2` | Latest requests interaction view | repeated live requests append distinct rows; alias-routed traffic is labeled meaningfully; benchmark traffic does not occupy the primary widget by default |
| `Q-B3` | Overview IA in browser | on the live `/app` page, the redundant `Providers / Endpoints / Execution-ready / Bootstrap` row is gone and the telemetry summary row is the primary summary surface |
| `Q-B4` | Activity ordering in browser | on the live `/app/observe/activity` page, the newest rendered entry matches the newest `/api/metrics` entry rather than reversing the list |
| `Q-B5` | Router alias inventory in browser | on the live `/app/router` page, `Alias coverage` includes resolved model coverage, configured hints remain distinct context, and endpoints are structured and readable |
| `Q-B6` | Tokens card regression in browser | on the live `/app` page, the tokens card matches backend `totalEffectiveCostUsd` for estimate-only DeepSeek traffic |
| `Q-B7` | Alias drift removal proof | after canonical config removal of the stale hint, the warning either clears correctly or a proven RED/GREEN repair lands and then clears it |
| `Q-B8` | Browser end-to-end pass | the rebuilt runtime stays live long enough to navigate and verify `/app`, `/app/router`, `/app/observe/activity`, and `/app/observe/requests` in the browser with matching API/runtime data |

## Implementation Order

1. `SP47-M` first, because failure metadata quality is a prerequisite for trustworthy dashboard/request verification.
2. `SP47-O` next, because it is isolated and gives a clean activity surface for later runtime checks.
3. `SP47-P` next, because router alias inventory is a direct route-presentation defect with no dependency on dashboard work.
4. `SP47-N` after `SP47-M`, so the dashboard can project meaningful latest-interaction data and remove the redundant row in the same pass.
5. `SP47-Q` as a verification-first slice:
   - if the RED test proves stale-after-removal drift, repair it before rebuild
   - if not, record no code required and carry only the runtime verification note
6. Rebuild the runtime artifact with `runtime:package-sea`.
7. Launch the rebuilt runtime, capture startup/URL/health evidence, and keep that process live.
8. Execute `Q-B1` through `Q-B8`, including browser verification against the live launched runtime.

## Traceability

| Requirement / finding | Slice / disposition | Verification |
| --- | --- | --- |
| `R4`, `F10`, `F11`, `F12` | `SP47-N`, `SP47-P` | dashboard and router rebuilt-runtime checks |
| `R8`, `F7`, `F8`, `F9`, `F12` | `SP47-M`, `SP47-N`, `SP47-O` | ledger/activity/dashboard runtime proof |
| `R10`, `F7`, `F8`, `F9`, `F3` | `SP47-M`, `SP47-N`, `SP47-O`, verification-only `F3` | rebuilt runtime plus runtime API parity |
| `R15`, `F10`, `F11`, `F6` | `SP47-P`, `SP47-Q` | backend-truth router/readiness verification |
| `R16`, `F6` | `SP47-Q` | canonical config update/remove proof |
| `R17`, `F7`, `F8`, `F10`, `F11`, `F12` | `SP47-M`, `SP47-N`, `SP47-P` | no split truth across dashboard/router/request surfaces |

## Out of Scope

- Speculative code for `F3` without a new RED reproduction
- Suppressing the current alias-drift warning when canonical config still contains the stale hint
- Reopening locked run-47 lifecycle/persistence receipts outside addendum-based follow-up

## Coverage Gate

- [x] The latest live `3456` evidence is reconciled against the earlier follow-up plan
- [x] F7 is corrected from “missing row” to “metadata-loss” and mapped to a concrete code slice
- [x] F3 and F6 are downgraded from speculative code work to verification-first/verification-only where appropriate
- [x] The remaining code work is expressed as strict-TDD slices with rebuilt-runtime launch and browser verification
- [x] The addendum supplements locked planning artifacts without editing them

Coverage: PASS

## Approval Gate

- [x] The revised plan is more systematic than the earlier addenda because it targets only still-open defects
- [x] The TDD, rebuilt-runtime launch, and browser verification path is concrete enough to drive Phase 3 follow-up work
- [x] No code is being planned for items already fixed or not yet proven broken

Approval: PASS

## Audit Context

- Audit Execution Mode: self-audit
- Subagent Availability: available
- Subagent Capability Probe: current tool surface exposes delegated-agent discovery, but this turn required direct reconciliation of locked run artifacts against live runtime evidence and local code paths
- Delegation Decision Basis: this artifact is a planning correction document grounded in current repo files and live local runtime responses
- Delegation Override Reason: a delegated reviewer would still require the same live-runtime and locked-artifact reconciliation; direct controller authorship was lower-risk for this narrow plan-refinement pass
- Audit Inputs Provided:
  - `00-requirements.md`
  - `02-to-be-plan.md`
  - `addenda/02-to-be-plan.addendum-01.md`
  - `addenda/02-to-be-plan.addendum-02.md`
  - `addenda/05-manual-qa.addendum-02.md`
  - affected `runtime-ui`, `runtime-host-bridge`, `sqlite-memory`, and `unified-runtime-config` code refs

## Subagent Contribution Verification

- Reviewed Action Records: none
- Main-Agent Verification Performed: re-read locked planning and QA addenda, checked current source contracts, queried live `3456` telemetry summary and request rows, and corrected the implementation plan to match observed backend/runtime behavior
- Acceptance Decision: accepted
- Refresh Handling: not applicable
- Repair Performed After Verification: none

Audit: PASS
