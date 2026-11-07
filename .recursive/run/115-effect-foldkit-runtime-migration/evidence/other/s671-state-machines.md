# State machines: the single catalogue (run 115, S671)

This is the one file: every explicit and implicit state machine in the role-model runtime app — the
Foldkit UI (11), the host bridge (9), and the cross-repo track-b/capture/projection plane (9) — with
states, invariants, transition tables, reachable invalid states (with file:line evidence and
reachability checks), and disposition.

## Fix status (grouped issues, verified 2026-11-07)

| Issue | Machines | Disposition |
|---|---|---|
| A. Benchmark run chain (UI) | UI M4 | FIXED `9fb0a749`: dedicated `benchmarkRunToken` generation; stale start/poll/failure + runId fenced; s671 test 7/7. Plus S668 (off-by-one, poll-failure stop) and S669 (case timeout). |
| B. Benchmark runner (host) | Host M1/M2/M3 | M1 progress FIXED (S669 timeout `7d009224`); M2 gate admission leak FIXED `c840d974` (pre-abort + progress-creation release the gate; test 4/4); terminal-status overwrite FIXED `9b39c586` (terminal is final; 5/5); M3 timeout does not abort provider work ACCEPTED (deps have no AbortSignal; documented). |
| C. Device authorization | UI M6 / Host M6 | UI modal close FIXED `1f43f73d` (Cancel/Activated close the dialog; 45/45 across device suites); host readback expiry FIXED `a8253516` (expired sessions read as expired; 15/15). |
| D. Runtime config editor | UI M8 | FIXED `4346d9bf`: edit bumps the editor generation, save fenced, textarea disabled while pending; s672 3/3. |
| E. Runtime-config refresh gap | UI M9 | DOCUMENTED fix candidate (route-refresh falls into an empty routeId snapshot that RefreshResynced rejects). |
| F. Track-B public | Cross M4/M5/M6 | FIXED `76e2e49a`: ledger corruption fails closed (no budget reset), auto-replay cursor rewinds on deferral, history prune atomic; run97 18/18 + history-policy 5/5. |
| G. Capture/projection private | Cross M1/M2/M3 | DOCUMENTED P0s (private repo, read-only here): durable-queue drain deletes before consumer persist; event-log archive trim vs rollback retention. Unblock: fix in the private worktree. |
| H. Provider/dev-auth/lease host | Host M4/M5/M7/M8/M9 | M8 replay enqueue rejection FIXED `a8253516`; activation-batch pending-forever (M5) and lease/fence P2s DOCUMENTED (feasible follow-ups). |

### Verification summary
- UI: s672 3/3, device suites 45/45, benchmark state 7/7, config suites 13/13, tsc 0.
- Host: benchmark runner 22/22, progress 5/5, restart-rehydration + run98 22/22, replay run97 18/18, tsc PASS.
- sqlite-memory: history-policy 5/5.
- All fixes are RED-first (logs under evidence/logs/s671-*/s672-*).

## How to read
Each section below is the full per-plane audit (states, invariants, transition tables, ranked
reachable invalid states). Evidence is code-first (file:line) with a reachability note per finding.

---

# Part 1 — UI state machines (runtime-ui-next/src)


Audit only, HEAD inspected in `D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration`.
Scope: `apps/runtime-ui-next/src/{model,update,readback,route,commands,app}.ts`, `features/**`.
No source was modified. "Invalid" below means a combination the code can actually reach with the
cited dispatch sequence; latent guard defects with no UI path are marked NOT REACHABLE.

## Summary

- **11 machines** audited.
- **P0: 0. P1: 2** — runtime-config edit loss; device-auth dialog/state desynchronization.
- **P2: 6** — route-reset gaps, benchmark navigation/selection drift, refresh-gap dead end on
  control routes, localPolicy error masking, provider activation token gap (latent), studio
  in-flight tab switch.
- Main structural issue: most async features hand-synchronize `status` + `token` + a second
  `pendingAction/inflight/requested*` flag instead of one discriminated machine. Redundant flags make
  "terminal status + pending flag" and "new action accepted while old result is in flight" reachable.

---

## M1 — Route / navigation

| Item | Evidence |
| --- | --- |
| Source | `model.ts:60-63` (`route`, `pendingRedirectHref`, `refresh`); `update.ts:720-993` (`navigateToRoute`), `1221-1245` (`ChangedUrl`), `1259` (`NavigationCompleted`) |
| States | Explicit `AppRoute` tagged union; implicit `pendingRedirectHref` (none/redirect); route-scoped readbacks (all idle/loading per route). |
| Invariants | `route` matches the address-bar URL; a pending redirect is consumed only by the exact canonical href echo; readbacks for the previous route are idle; `chartInteraction.routeTag` matches `route._tag`; `refresh.resyncToken` advances on every route change. |
| Transitions | `ChangedUrl(canonical, no redirect)` → reset route readbacks/controls (per branch) → `read*` commands → `NavigationCompleted` no-op. `ChangedUrl(legacy path)` → `navigateToRoute(canonical)` + `replaceLegacyUrlCommand` → `pendingRedirectHref=href`; echo `ChangedUrl(href)` → consume and clear marker. |
| Invalid reachable | **P2**: navigating from a control route (Providers/Endpoints/Controller) to a readback route leaves the old `controls` object untouched because the readback branch only builds `readbacks` and never calls `emptyControls()` (`update.ts:947-972`). Old `controls.providers = loading/ok` survives into Benchmark/Models. UI hidden now but visible if a view reads a non-current control. |
| Fix candidate | Derive route-scoped slices from `route` (reset all controls/readbacks/modelsView route fields in one transition) instead of per-branch partial resets. |

## M2 — Readback per key (57-key family)

| Item | Evidence |
| --- | --- |
| Source | `readback.ts:149-157` (state), `159-218` (keys); `update.ts:3875-3906` (failed), `3907-3935` (loaded) |
| States | `idle | loading | ok | empty | error` + `token`, optional `message/detailId/scopeId`; rows. |
| Invariants | token monotonic per key; `loading` only while a request for that key is outstanding; `ok` has rows, `empty` has none; only the matching token may apply; route-scoped requests reset other keys. |
| Transitions | request → `loadingReadback(token=N)`; `ReadbackLoaded` with token N → snapshot (`ok/empty/error`) + token N; `ReadbackFailed` token N → `failedReadback`; stale token → no-op; navigation → `emptyReadbacks()` (token 0). |
| Invalid reachable | **P2**: `localPolicy` failure with prior rows is rewritten to `status: "ok"` plus the error message (`update.ts:3894-3898`), so the view can render "ready" from stale rows while the latest read failed. **P2**: a benchmark poll terminal result writes benchmarkSummary/Runs/ActiveRun loading+loaded even when `route` is no longer Benchmark (`update.ts:2581-2600` + token-only guard at 3912), leaving off-route benchmark readbacks populated. |
| Fix candidate | Derive `ok/empty` from rows in one constructor; carry a `freshness: "fresh" | "stale"` state rather than overloading `ok` with a message; include route id in the readback token identity. |

## M3 — Controls

| Item | Evidence |
| --- | --- |
| Source | `control.ts:26-32`; `update.ts:3766-3785` (action), `3712-3745` (completed), `3800-3821` (loaded) |
| States | control `status: idle/loading/ok/empty/error` + `actionStatus: idle/pending/ok/error` + shared `token`, `selectedEndpointId`, `actionMessage/notice`. |
| Invariants | action pending only while one action command is outstanding; control load and action result must not overwrite each other's terminal state; selected endpoint matches server value after a successful controller save. |
| Transitions | `ControlActionRequested` → `actionStatus=pending, token++` + command; completed token N → `ok` (+ read for controller); failed token N → `error`; `ControlLoaded` token N → replaces snapshot but preserves notice/selected. |
| Invalid reachable | **P2**: a control read that advances the token while an action is pending makes the action completion/failure a stale-token no-op (`update.ts:3722/3755`), leaving `actionStatus:"pending"` with a fresh `ControlLoaded` snapshot. The UI button remains disabled until a later action reset. (Reached by a telemetry/route-triggered read during the action; the handler has no action-generation guard.) |
| Fix candidate | One `ControlMachine = { status, action?: {kind, token} }`; action result fence on `action.token`, load fence on `read.token`; never share one token between read and action. |

## M4 — Benchmark run / progress / detail

| Item | Evidence |
| --- | --- |
| Source | `model.ts:184-238`; `update.ts:2450-2642` (run/poll), `2644-2698` (detail), `2333-2360` (endpoint selection), `2699-2717` (clear) |
| States | `benchmarkAction.status: idle/saving/saved/error`; `benchmarkProgress.status: running/completed/failed` + runId/phase/counts/outcome; `benchmarkRunToken`; selected vs requested endpoint ids; `benchmarkRunDetail.status: loading/loaded/error` + runId/token; `benchmarkClearPending + benchmarkClearEndpointId`. |
| Invariants | runToken monotonic per run generation; every start/poll/failure carries the current generation; `progress.runId` is the run the panel follows; requested IDs fixed at start; detail token+runId pair; action terminal iff progress terminal. |
| Transitions | `RunRequested` → runToken++, action=saving, requested=selected, run command. `RunStarted` token==runToken → progress running + poll. `RunPolled` token==runToken → running (re-poll) or completed/failed (action saved/error + refresh readbacks). `RunPollFailed` token==runToken → action error + progress failed. `RunDetailRequested` token++ → loading; loaded/failed require exact token+runId. |
| Invalid reachable | **P2**: route change does not reset `modelsView.benchmark*` (`update.ts:947-972` readback branch), so an in-flight run continues polling off-route and `benchmarkAction/progress` remain "saving/running" on Overview; the poll (2538-2610) has no route guard. **P2**: endpoint checkboxes remain enabled during a run (`features/models/routes.ts:2414-2424` always dispatches `BenchmarkEndpointSelected`; handler `update.ts:2333-2349` has no busy guard), so `benchmarkSelectedEndpointIds` can diverge from `benchmarkRunRequestedEndpointIds` fixed at 2485-2489, and the panel can show a requested set the user no longer sees selected. |
| Fix candidate | One `BenchmarkMachine` with explicit generation and route owner; disable/guard selection while `status in {saving,running}`; clear or park progress on route change; derive requested ids from the active run, not a separate array. |

## M5 — Provider account form

| Item | Evidence |
| --- | --- |
| Source | `provider-account.ts:45-52`; `update.ts:4846-4930` (key/update), `4869-4911` (activation), `5041-5078` (failure) |
| States | `status: draft/saving/saved/error` + `pendingAction: create/update-key/delete-model | absent` + `token`, draft, notice/error. |
| Invariants | `saving` ⇒ a pendingAction exists and exactly one command is outstanding; only the matching token may terminate; activation is part of the create/save chain and must not clear a newer chain. |
| Transitions | create/update/delete → token++, saving+pendingAction; key-updated token==state.token → activation or saved; activation → saved/pending cleared; failed token==state.token → error/pending cleared; special "not ready for endpoint activation" → saved/notice. |
| Invalid reachable | **P2 (latent guard defect, no UI path found)**: `ProviderAccountEndpointsActivated` ignores its token entirely (`update.ts:4869-4900`) and unconditionally sets `saved/pendingAction=undefined`. `providerAccountBusy` blocks a second UI action while pending, so no concrete UI sequence was found; an injected/duplicate activation result after a newer save can clear the newer pending state. Same shape in the special failure branch at 5048-5065 (token check comes after the special case). |
| Fix candidate | One save-chain token with a single reducer; activation result must carry and match it; remove the pre-token special case. |

## M6 — Device authorization (+ modal)

| Item | Evidence |
| --- | --- |
| Source | `features/device-auth/model.ts:50-67`; `update.ts:5233-5535`; `features/device-auth/update.ts:6-35`; `ui/dialog.ts` |
| States | `status: draft/starting/pending/connected/error`, `inflight`, `token`, `session.status: pending/connected/expired/failed`, `sessions`; separate `deviceAuthDialog` + `deviceAuthModalKey`. |
| Invariants | `inflight` only while a poll/start is outstanding; `status pending ⇒ session pending`; terminal session never pending; `deviceAuthDialog` open only while a pending session is being shown; cancel/complete closes the modal. |
| Transitions | StartRequested (guard inflight/starting/pending) → token++ starting + read; SessionsLoaded restore → pending + poll + open modal; Started → pending + poll + open; Polled pending → pending + poll; connected → connected + activations (inflight false); expired/failed → error. Cancel → interrupt + draft state. Activated token==token → readbacks. |
| Invalid reachable | **P1**: `DeviceAuthCancelled` resets only `model.deviceAuth` (`update.ts:5518-5534`), and `DeviceAuthActivated` only clears error (`5537-5555`); neither touches `deviceAuthDialog`/`deviceAuthModalKey`. The only modal transition helper opens it (`features/device-auth/update.ts:6-14`) and no `closeDeviceAuthDialog` exists (grep). Sequence: Start → SessionsLoaded/Started opens dialog while pending → click Cancel (or finish activation) → `deviceAuth.status=draft/connected`, dialog still open with the stale code. This is a normal, guarded UI path. |
| Fix candidate | Put `dialogOpen` in the same machine and transition it with `pending/connected/cancelled`; close on every terminal/cancel transition. |

## M7 — Studio

| Item | Evidence |
| --- | --- |
| Source | `studio.ts` (StudioState); `update.ts:4390-4506` |
| States | `status: idle/loading/success/error` + `token` + tab/fields/response. |
| Invariants | one request per token; tab switch cancels or fences the in-flight response; response tab matches the request tab. |
| Transitions | RunRequested (guard loading) → loading token N + command; Loaded/Failed token N → success/error; TabSelected/Key → `studioIdle(tab)` (token 0); field change updates draft. |
| Invalid reachable | **P2**: tab switch resets the whole studio state including token to 0 (`update.ts:4390-4397`), so the in-flight response is silently dropped (`4467-4469` token guard); no cancel/error is surfaced. Not corrupting, but the user loses the request outcome with no state. |
| Fix candidate | Keep token while switching tabs and mark the response as belonging to the origin tab; or issue a real cancel transition. |

## M8 — Runtime config editor

| Item | Evidence |
| --- | --- |
| Source | `model.ts:39-58`; `update.ts:4237-4375`; `view.ts:2244-2275` |
| States | `status: not-loaded/loading/editing/confirming/invalid/pending/saved/error` + token, text/originalText/diff. |
| Invariants | `pending` means one save is outstanding for the exact text snapshot; editing while pending must either be blocked or invalidate the pending response; `saved` text must equal the server snapshot the user confirmed. |
| Transitions | Load → loading/editing; TextChanged → editing (token unchanged); SaveRequested → confirming (parse/diff); ConfirmRequested → pending token N; Saved token N → saved + server text; Failed token N → error. |
| Invalid reachable | **P1**: the textarea stays editable while pending (`view.ts:2244-2250` has no disabled guard), and `RuntimeConfigTextChanged` sets `status:"editing"` without changing the token (`update.ts:4237-4263`); `RuntimeConfigSaved` fences only on token and overwrites `text/originalText` (`update.ts:4335-4373`). Sequence: Load → edit → Review → Confirm (pending token N) → type more (editing, token N) → Saved(N) → the new edit is silently replaced by the server snapshot. |
| Fix candidate | Block edits while pending or bump the token/abort the save on edit; make `pending` carry the exact submitted text and require equality before replacing the draft. |

## M9 — Refresh / revision

| Item | Evidence |
| --- | --- |
| Source | `refresh.ts:42-54`; `update.ts:1332-1498` (`RuntimeRevisionReceived`), `4509-4533` (`RefreshResynced`), `1310-1331` (failed) |
| States | `status: idle/live/stale` + lastAppliedRevision/resyncToken/message; per-route readback/observability. |
| Invariants | watermark monotonic; gaps only advance via a matching resync token; stale only while a resync is genuinely outstanding; every route with live data has a resync path. |
| Transitions | revision > watermark and contiguous → read current route (or observability), status live/stale sticky; gap → readback/observability branch or `refreshSnapshot(routeId="" for non-diagnostics)`, resyncToken++, stale; `RefreshResynced/ResyncFailed` require token and Diagnostics route id; next contiguous revision clears stale only if not sticky. |
| Invalid reachable | **P2 (functional dead end)**: a revision gap while on Providers/Endpoints/Controller (no `readbackKeyForRouteTag`, not Observability) takes the fallback at `update.ts:1480-1498` with `routeId:""`, but `RefreshResynced` rejects every non-Diagnostics route (`4518-4522`). The model stays `status:"stale", message:"resyncing after a revision gap"` forever until navigation; no re-read is issued for the control route. |
| Fix candidate | Give every route a resync owner (control read or a generic route snapshot) and key the resync by route tag+id; `stale` must be derived from an outstanding resync, not a flag that can strand. |

## M10 — Chart interaction

| Item | Evidence |
| --- | --- |
| Source | `chart-interaction.ts:1-30`; `update.ts:725-726` (route reset), handlers in `update.ts`; `packages/foldkit/test/s408` |
| States | `hiddenSeriesIds`, `tooltip {seriesId,label} | null`, `token`, `routeTag`. |
| Invariants | token monotonic per route; tooltip belongs to a visible series+label; hidden ids belong to current series; route change clears tooltip and bumps token. |
| Transitions | toggle/hide/show → token++ + hidden set; show tooltip → token+? and tooltip; route change → `chartInteractionForRoute` clears tooltip/bumps token; stale token ignored. |
| Invalid reachable | **P2**: `hiddenSeriesIds` is not reconciled when a chart is re-bound to new series data (same route); an id reused by a new series is hidden without a user toggle. The chart view filters hidden ids (`packages/ui/src/foldkit-chart.ts:305-306`) with no membership check against current series. |
| Fix candidate | Derive hidden series as a set intersect current series ids; keep only tooltip while its series/label still exists. |

## M11 — Endpoint admission

| Item | Evidence |
| --- | --- |
| Source | `endpoint-admission.ts:37-61`; `features/endpoint-activation/**`; `update.ts` endpoint handlers |
| States | `status: draft/saving/saved/partial/error` + `pendingAction: activate/batch` + `run.pending/run.results` + draft. |
| Invariants | `saving` ⇔ outstanding action; `partial` means some run results failed; pending list empty when terminal; UI busy guard matches state. |
| Transitions | activate/batch requested → pendingAction/saving + run command; per-activation result merges into run; completion → saved/partial/error, pendingAction cleared. |
| Invalid reachable | **P2**: `status` and `run.pending` are independent; a completion that sets `status:"saved"` is accepted without checking that `run.pending` is empty (`endpoint-admissionCompletionState`), so a saved state with a non-empty pending run is representable; the UI busy guard then keeps the form disabled. |
| Fix candidate | Derive `status` from `run.pending/results`; one completion transition that clears pending and computes partial/saved. |

---

## Ranked invalid findings

| Rank | Machine | Concrete path |
| --- | --- | --- |
| **P1** | M8 Runtime config | Load → edit → Review → Confirm (pending token N) → edit again (editing, token unchanged) → `RuntimeConfigSaved(N)` overwrites the new text with the server snapshot (`view.ts:2244-2250`, `update.ts:4237-4263,4335-4373`). User edit lost. |
| **P1** | M6 Device auth | Start → pending opens dialog (`update.ts:5288-5302/5390-5428`) → Cancel resets only deviceAuth (`5518-5534`) or Activated only clears error (`5537-5555`) → `deviceAuthDialog` remains open with `status=draft/connected`; no close transition exists (`features/device-auth/update.ts:6-14`). Stale modal blocks the page. |
| **P2** | M1/M4 Benchmark | Navigate away while a run is saving/running: `navigateToRoute` readback branch does not reset `modelsView` or controls (`update.ts:947-972`); poll keeps applying off-route (`2538-2610`) and `benchmarkAction/progress` stay saving/running on Overview. |
| **P2** | M4 Benchmark selection | Checkbox remains enabled during a run (`features/models/routes.ts:2414-2424`) and `BenchmarkEndpointSelected` has no busy guard (`update.ts:2333-2349`), so selected ids diverge from the requested ids frozen at start (`2485-2489`). |
| **P2** | M9 Refresh gap | Gap on Providers/Endpoints/Controller → fallback `refreshSnapshot(routeId:"")` (`update.ts:1480-1498`) → `RefreshResynced` rejects non-Diagnostics (`4518-4522`); stale forever, no re-read. |
| **P2** | M2 Readback localPolicy | Failed read with previous rows is converted to `status:"ok"` + message (`update.ts:3894-3898`), hiding the error behind a ready state. |
| **P2** | M3 Controls | A control read advancing `controls[key].token` while an action is pending makes the action completion/failure stale (`update.ts:3722/3755`), leaving `actionStatus:"pending"` against a fresh snapshot. |
| **P2** | M5 Provider (latent) | `ProviderAccountEndpointsActivated` ignores the token (`update.ts:4869-4900`); no UI path found because `providerAccountBusy` blocks a second action, so this is a guard defect, not a confirmed reachable transition. |

## Cross-cutting fix candidates

1. Replace status + token + pendingAction/inflight/requested triples with one discriminated union per
   feature: `{tag:"idle"} | {tag:"saving", action, token} | {tag:"saved", token} | {tag:"error", token, message}`.
2. Make route transitions total: every route change resets all route-scoped slices (controls, modelsView
   run fields, chart interaction, dialog) in one reducer, rather than per-branch partial resets.
3. Fence every async result on a single generation owned by the action, never on a readback token; make
   terminal results clear the pending flag in the same transition.
4. Derive rows/empty/ok and selected/requested sets; do not store redundant flags that can disagree.
5. Add a model-schema invariant test (fast-check or explicit illegal-combination assertions) for the
   P1 paths above; tests currently cover behaviour but not illegal combinations.

## Coverage / limits

Read: model.ts, update.ts (route, readback, controls, benchmark, provider, device, studio, runtime
config, refresh), readback.ts, refresh.ts, control.ts, provider-account.ts, device-auth model/update,
endpoint-admission.ts, features/models/routes.ts and devices views. Not exhaustively audited:
learning ranking phases, requests/routing chart loaders, retention, roles CRUD, diagnostics
observability; they follow the same token+status shape and likely share the patterns above.

---

# Part 2 — Host bridge state machines (runtime-host-bridge/src)


Audit-only; no source modified. Scope: role-model-router/apps/runtime-host-bridge/src. Lines cite the audited tree at 3f7779fb. "Reachable" means no guard was found in the cited path; "latent" means current composition does not select that mode.

No explicit goal state machine exists in this directory (no GoalState/goal_status/active_goal symbol). Lease-shaped machines audited: queue attempt fence, replay intent claim, development-verification authorization.

## Machine index

| # | Machine | Source | Worst |
|---|---|---|---|
| M1 | Benchmark run progress/status | benchmark-progress.ts, benchmark-runner.ts | P2 |
| M2 | BenchmarkGate admission/cancel | benchmark-gate.ts, benchmark-runner.ts | P1 |
| M3 | Benchmark case timeout (implicit) | benchmark-runner.ts | P1 |
| M4 | Endpoint lifecycle/admission | index.ts | P2 |
| M5 | Endpoint activation batch | index.ts | P1 |
| M6 | Provider device-auth session | index.ts | P1 |
| M7 | Queue attempt lease fence | queue-runtime/fence.ts | P2 |
| M8 | Replay intent claim/retry | track-b-runtime.ts | P1 |
| M9 | Development-verification lease | development-verification.ts | P2 |

## M1 - Benchmark run progress/status

Source: benchmark-progress.ts:7-8 status union, :12-40 snapshot, :48-96 create, :99-169 update/plan, :171-218 complete/fail; benchmark-runner.ts:1751-1769 create, :1891-1913 position, :2453-2461 terminal.

States. Explicit status = running | completed | failed. Explicit runPhase = execution | grading | compare | complete. Explicit currentPhase = execute | judge | compare | null. Implicit "no active work" = currentEndpointId/currentCaseId/currentPhase null. Implicit terminal = status plus result/outcome presence.

Invariants.
1. status is monotonic: running -> completed or failed, never back.
2. completedSteps <= totalSteps; completed sets completedSteps = totalSteps (:183).
3. At case start completedSteps = endpointIndex * caseCount + caseIndex (0-based) (runner :1893-1894); snapshot indices are 1-based (:1900-1906).
4. status != running implies currentPhase null.
5. status running should have a live executor or pending step, not only a retained row.

Transitions.

| Event | From | To | Code |
|---|---|---|---|
| create | absent | running/execution, zeros | progress :48-96 |
| plan resolved | running | running; counts/total replaced | :141-169; runner :1810-1814, :1862-1873 |
| case begins | running | running, execute, indices | runner :1896-1913 |
| case completes, incl timeout | running | running, +1 step | :1971-1973 |
| grading case completes | running | running, +1 step | :2118-2120, :2310-2312 |
| result assembled | running | completed, phase complete | progress :171-192; runner :2453 |
| throw | running | failed, phase null | progress :194-218; runner :2457-2461 |

Invalid but reachable.
- P2 terminal overwrite without a guard. completeBenchmarkRunProgress and failBenchmarkRunProgress do not check current.status; both overwrite any retained snapshot (:171-192, :194-218). updateBenchmarkRunProgress does guard (:129-131), so the guard is inconsistent. Any late or duplicate terminal callback can turn failed into completed or completed into failed.
- P2 retained running row with no executor. The map is process memory (:42); nothing expires a run; listRunningBenchmarkRuns trusts status (:224-226). An abandoned executor that never reaches the catch leaves a visible running run with no work. No heartbeat/lease field exists.
- P2 result can disagree with status. complete copies any result counts/outcome (:179-189) without checking against totalSteps or current indices.

Fix candidates: make status a discriminated union; add finishOnce/CAS in the Map; derive completedSteps from (endpointIndex-1)*caseCount+caseIndex; add updatedAtMs staleness or heartbeat to readActiveBenchmarkRun.

## M2 - BenchmarkGate admission/cancel lifetime

Source: benchmark-gate.ts:31-46 contract, :48-82 owner, :102-146 Effect gate; benchmark-runner.ts:1737-1745 begin + first cancellation check, :1776 try start, :2453-2461 finish; composition-dag.ts:1058-1059 production mode reject-overlap.

States. Owner: activeRunId undefined|string, controller null|AbortController. Inner: active string|undefined, cancelled Set. Implicit: idle, admitted, cancelled, busy.

Invariants.
1. At most one active run in reject-overlap.
2. running() == (activeRunId !== undefined).
3. Every begin success is paired with finish on every exit path, including pre-work throws.
4. A cancelled run's signal is aborted and observed.

Transitions.

| Event | From | To | Code |
|---|---|---|---|
| begin idle | idle | admitted, new controller | :62-68 |
| begin while active, reject | admitted(r1) | busy(r1), unchanged | :63-64, :117-119 |
| begin while active, cancel-previous | admitted(r1) | admitted(r2), r1 cancelled in inner | :120-122 |
| cancel | admitted | idle + abort | :71-78 |
| finish current | admitted(r) | idle | :54-60 |
| finish stale | admitted(newer) | unchanged | :55-59 |

Invalid but reachable.
- P1 admission leaks on a pre-aborted caller signal. Runner calls begin at :1737, then checks throwIfCancelled at :1745; the try starts at :1776. If deps.signal is already aborted (:1741), the function throws before the catch, so admission.finish is never called. Gate stays active; in production reject-overlap every later benchmark gets BENCHMARK_BUSY forever. Concrete: runRoutingCapabilityBenchmark({signal: alreadyAborted}) -> :1738 no throw -> :1745 throw -> no finish.
- P2 cancel-previous does not abort the previous owner controller. Owner begin calls inner.begin (:63) but never aborts the old controller; old run's admission.signal stays live. Runner checks only deps.signal and its own admission.signal (:1740-1744), never gate.isCancelled(runId). In cancel-previous the old run keeps executing while the gate says cancelled. Latent because production hardcodes reject-overlap (composition-dag.ts:1059); P0/P1 if selected.
- P2 cancel/finish duplication. cancel clears active and ends inner (:71-78); later finish sees activeRunId != runId and returns (:55-59). No double-end, but no record that cancel already terminalized.

Fix candidates: wrap everything after begin in try/finally with admission.finish, including the first cancellation check; expose isCancelled on admission and check beside signal; abort previous controller in cancel-previous; single terminalize(runId).

## M3 - Benchmark case timeout (implicit)

Source: benchmark-runner.ts:463-505 runCaseWithTimeout, :1915 call, :287 caseTimeoutMs.

States. Implicit unbounded-running, bounded-running, timeout-returned, underlying-late-success/failure. Timeout is a synthetic failed execution: extractionMethod timeout, failure true, latencyMs timeoutMs.

Invariants.
1. After timeout, underlying work is cancelled or cannot affect run state.
2. A timeout counts one case and persists failure evidence.
3. Timers clear on every path.

Transitions.

| Event | From | To | Code |
|---|---|---|---|
| timeout absent/<=0 | ready | unbounded execution | :479-481 |
| case starts | ready | bounded-running | :482-490 |
| case settles first | bounded-running | completed execution | :490 |
| timer first | bounded-running | timeout-returned synthetic failure | :483-501 |
| underlying late settle | timeout-returned | ignored by race | :490, no abort |

Invalid but reachable.
- P1 timeout does not cancel the provider request. Promise.race (:490) rejects on the timer but neither runCaseOnEndpoint nor its fetch receives an AbortSignal; catch returns synthetic result (:491-501) while the original promise continues. No signal plumbing in :507+. A timed-out case can keep provider work and billing alive; late success is discarded. Run status is coherent, resource evidence is not.
- P2 timeout is a normal execution failure, not a distinct reason. Only failure:true and extractionMethod:"timeout" record it; status sees an ordinary case failure.

Fix candidates: pass AbortController into runCaseOnEndpoint and abort on timeout and in finally; or typed case-timed-out result with explicit timeout flag.

## M4 - Endpoint lifecycle/admission

Source: index.ts:23609-23787 activateRuntimeEndpoint, :24070-24140 admitRuntimeEndpoint, :24017-24032 OAuth recovery, :22341-22343 blocking derivation.

States. Explicit lifecycleState = pending-admission | active | degraded (:23614). healthStatus string: healthy, unknown, not-yet-executed, provider-unavailable, credentials-invalid, credentials-missing, degraded. Implicit admitted / not admitted / recovered.

Invariants.
1. pending-admission is never execution-eligible or role-bound.
2. active implies admission probe or OAuth account proof succeeded.
3. degraded carries non-healthy evidence.
4. Failed activation leaves no model-only side effect.

Transitions.

| Event | From | To | Code |
|---|---|---|---|
| activation requested | absent | pending-admission + unknown | :24089-24098 |
| OAuth account authenticated | pending | active + healthy | :24107-24128 |
| probe healthy | pending | active + healthy | :24118-24128 |
| probe unhealthy | pending | degraded + probe health | :24119-24127 |
| OAuth recovery | degraded/active | active + healthy | :24017-24032 |
| failed validation | pending | throw | :23625-23737 |

Invalid but reachable.
- P2 catalog mutation before later validation throw. activateRuntimeEndpoint adds a fallback model to currentNormalizedCatalog/currentModelsById at :23684-23690, then can throw at :23700-23703 (endpoint id mismatch) or :23731-23737 (untested reasoning effort). The model remains in memory with no endpoint. Next activation sees a phantom model. Reachable with unknown model id plus invalid reasoningEffort or mismatched endpointId.
- P2 degraded becomes active+healthy on account recovery without re-probing the endpoint. reconcileOAuthAuthenticatedRuntimeEndpoints promotes degraded endpoints from account/session evidence (:24017-24032), repeated at startup (:24043-24068). Intentional OAuth recovery, but the endpoint is not proved executable.
- P1 admission batch partial pending is M5.

Fix candidates: build fallback model locally and commit only after validation; make admission pending -> active|degraded|failed with persisted admissionError; separate account-authenticated from endpoint-executable evidence.

## M5 - Endpoint activation batch

Source: index.ts:24142-24423. Receipt pending|committed (:24179-24185); rows pending-admission -> active|degraded (:24320-24333, :24382-24405).

Invariants.
1. No committed receipt unless every member reached a final lifecycle.
2. Pending receipt retry only with identical payload (:24194-24198).
3. Rows durable before remote probe (:24318-24333); crash leaves pending, never healthy.
4. Every pending row eventually becomes active/degraded/failed.

Transitions.

| Event | From | To | Code |
|---|---|---|---|
| first request | absent | pending receipt + rows pending | :24274-24333 |
| same payload, pending | pending | reprobe | :24235, :24350 |
| all probes settle | pending | committed receipt + rows active/degraded | :24350-24423 |
| duplicate committed | committed | return receipt | :24199-24205 |
| admission probe throws (uncaught) | pending | no transition; throw | :24350-24381 |

Invalid but reachable.
- P1 permanent pending batch on one bad member. Promise.all at :24350 rejects on the first account/probe error; no catch, compensation, or committed receipt. Pending receipt (:24274-24282) and all pending rows (:24320-24333) remain. Retry re-enters :24235 and throws again if the probe failure is persistent: stuck pending forever, rows ineligible. (A missing account is rejected earlier at :23625-23632, before any pending receipt, so that case is clean.) Batch-scope version of admission leaking on throw.
- P2 pending receipt is written before operator intent/SQLite. A crash between :24274 and :24320 leaves a pending receipt whose rows do not exist; retry allowExisting true (:24235) can recover, but the receipt alone is not self-contained.
- P2 final receipt write is best-effort after rows commit. If writeReceipt at :24416 throws, rows are active/degraded but no committed receipt; retry reprobes and can change health states.

Fix candidates: prevalidate all accounts before writing pending receipt; Promise.allSettled and write terminal failed receipt/per-member failure instead of throw; make row commit + receipt transactional or an idempotent two-phase with recovery sweep.

## M6 - Provider device-auth session

Source: index.ts:7621-7650 result unions, :22038-22061 list/readback, :22091-22113 cleanup/supersede, :33320-33589 poll, :33328-33349 expiry.

States. Explicit pending | connected | expired | failed (:7635, :7645). Implicit superseded, transient-pending, awaiting-local-cache.

Invariants.
1. expiresAtMs <= now implies not pending when read.
2. connected implies token file and active/healthy account.
3. failed is terminal; a new attempt supersedes, never resurrects.
4. One poll transitions one session; no stale write after newer session.

Transitions.

| Event | From | To | Code |
|---|---|---|---|
| start | absent | pending | :7624, start handler |
| poll before expiry, provider pending | pending | pending(+retryAfter) | :33434-33440, :33565-33589 |
| transient transport error | pending | pending(+lastError) | :33396-33411 |
| token acquired | pending | connected | :33470-33477, :33528-33535 |
| poll after expiry | pending | expired | :33328-33349 |
| non-transient/malformed | pending | failed | :33354-33369, :33413-33428 |
| superseded by newer sign-in | pending | failed | :22062-22089 |

Invalid but reachable.
- P1 readback returns pending forever after expiry. Expiry is enforced only in pollProviderDeviceAuthorization (:33328-33349). listCurrentProviderDeviceAuthorizations (:22038-22061) maps session.status verbatim and never compares expiresAtMs with Date.now(). A never-polled session stays pending in GET responses indefinitely; UI shows an active code that cannot succeed. Concrete: start at T, no poll, GET at T+expiry -> pending.
- P2 pending has two meanings with no discriminator. Network-transient pending (:33396-33411) and provider-pending (:33434-33440) both return pending; only optional lastError distinguishes them (:22060).
- P2 auth cache not ready returns pending without persisting explanation. :33443-33453 returns pending with lastError but does not update the session; next readback loses it.

Fix candidates: derive status in readback (pending + expiresAtMs <= now -> expired); persist auth-cache-not-ready error; explicit pendingReason provider|transport|local-cache instead of overloading lastError.

## M7 - Queue attempt lease fence

Source: queue-runtime/fence.ts:71-80 states, :200-264 DDL/statements, :272-331 begin, :338-369 complete, :372-378 kill, :380-432 read/evidence.

States. Explicit active | completed | expired (:71). Implicit killed (separate table), lease_held.

Invariants.
1. One row per (job_id, attempt); one active lease id.
2. completed implies durable evidence with same lease (:282-303, :359-369).
3. complete succeeds only for current active unexpired lease (:352-358).
4. Lease past expires_at is not accepted; marked expired (:355-357, :415-421).
5. Killed job cannot begin/record/complete (:274-276, :339, :402-404).

Transitions.

| Event | From | To | Code |
|---|---|---|---|
| begin no row | absent | active | :315-330 |
| begin active unexpired | active | lease_held throw | :305-310 |
| begin active expired | active | expired then new active | :311-330 |
| begin completed with evidence | completed | completed idempotent | :282-299 |
| begin completed no evidence | completed | already_completed throw | :300-303 |
| record evidence | active | active + evidence | :401-433 |
| complete with evidence | active | completed | :338-369 |
| complete expired/other lease | active/expired | expired / reject | :352-358 |
| kill | any | killed marker; fence unchanged | :376-378 |

Invalid but reachable.
- P2 kill leaves attempt row active forever. kill only inserts queue_attempt_kill (:376-378); it never expires/completes the fence. beginAttempt then throws killed (:274-276), so the row is unreachable but readAttempt still reports active (:380-392). Operator sees an active lease for a killed job.
- P2 unknown/corrupt state is coerced to active. readAttempt maps anything other than completed/expired to active (:391), while complete requires row.state === active (:352). A non-canonical state reads active but never completes; read/write models disagree.
- No P0/P1 in normal fencing. Conditional SQL updates (:256-261, :366-369) are race-safe; evidence+lease check is right.

Fix candidates: add killed to AttemptState or expire row on kill; reject unknown DB states; kill writes a terminal state.

## M8 - Replay intent claim/retry

Source: track-b-runtime.ts:1866-1893 claim/expired unions, :1901-1961 claimReplayIntentWithRecovery, :1964-1981 scheduler contract.

States. Explicit claimed | empty | expired(scheduler_intent_expired) (:1885-1893). Implicit retry-fresh-intent, malformed-receipt.

Invariants.
1. Claim receipt names same replayJobId/scope enqueued (:1933-1937).
2. leaseId/fence/attempt safe (:1927-1932).
3. Expired intent gets exactly one fresh intent referencing same durable job (:1896-1900, :1914-1924).
4. Failed enqueue is not silently treated as no work.

Transitions.

| Event | From | To | Code |
|---|---|---|---|
| enqueue accepted, claim returns | absent | claimed | :1917-1954 |
| claim null | absent | empty | :1922-1923 |
| claim expired | expired | retry retry-N | :1924, :1915 |
| retries exhausted | expired | expired(maxAttempts) | :1955-1961 |
| malformed claim | claimed? | throw | :1944-1953 |

Invalid but reachable.
- P1 enqueue rejection is ignored and becomes empty. await scheduler.enqueue at :1917 discards {accepted:boolean}. If enqueue returns accepted:false and claim returns null, function returns {state:"empty"} (:1923) as if no work existed. Replay job never dispatched; no error. Silent lost work.
- P2 malformed claim throws after enqueue, leaving intent durable. :1944-1953 throws after enqueue at :1917; caller sees error but scheduler intent remains. Retry uses a new intent id (:1915), stranding the old one unless scheduler dead-letters.
- P2 empty is not distinguished from scheduler unavailable. Null claim from a broken scheduler equals legitimately empty queue; no health signal.

Fix candidates: check enqueue.accepted and return typed enqueue-rejected; compensate/release/dead-letter on malformed receipt; distinguish scheduler health from empty.

## M9 - Development-verification lease

Source: development-verification.ts:18-35 fields, :135-190 negotiation, :181 expiry.

States. Capability enabled:false reason authorization_absent, or enabled:true fields (:36-45). Implicit expired, revoked-epoch, wrong-scope/deployment, wrong-key, not-yet-active.

Invariants.
1. Channel development and destination development_verification.
2. Scope, deployment set, signer key, data class match host policy.
3. issuedAt <= now <= expiresAt.
4. revocationEpoch equals current operator epoch.
5. Lease signed by trusted key, not a key named inside itself.

Transitions.

| Event | From | To | Code |
|---|---|---|---|
| absent | disabled | disabled authorization_absent | :136-139 |
| valid | disabled | enabled | :181-190 |
| expired/not-yet-active | enabled? | throw | :181-184 |
| epoch mismatch | enabled? | throw | :168-180 |
| scope/deployment/key mismatch | enabled? | throw | :150-167 |

Invalid but reachable.
- P2 no state contradiction found. Checks are ordered fail-closed; malformed lease throws rather than enabling. Only weakness: now sampled once (:178), no skew allowance; boundary can flip if a caller samples again.
- P2 non-single-use lease. Capability is a lease, not a nonce; replay within TTL is allowed by design; no consumption record in this module.

Fix candidates: record consumed authorization id/digest if replay protection required; keep single now snapshot.

## Cross-machine observations

1. Recurring shape: durable pending with no terminalizer. M5 pending batch, M6 pending after expiry, M7 active after kill, M8 enqueued after malformed claim. Read path reports live-looking state and no sweep/finally moves it. Prefer persisted terminal reasons plus startup reconciliation.
2. try/finally missing at admission boundaries. M2 begin outside runner try; M5 pending write before throwing Promise.all. Highest-impact leaks because transient error becomes permanent busy/pending.
3. No P0 proven. Worst are P1 liveness/leak: benchmark admission leak on pre-aborted signal, batch pending forever on one bad member, device-auth stale pending after expiry, replay enqueue rejection lost as empty, uncancelled timeout work. None corrupts completed evidence; all can block or misreport work.
4. Positive controls. Queue fence conditional SQL and evidence/lease check (M7), device poll expiry-first branch (M6), development lease fail-closed ordering (M9) are the strongest; use as template.

---

# Part 3 — Cross-repo track-b / capture / projection state machines


Audit only. No source was modified. One findings file written.

- Public worktree: `D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration`, HEAD `23fbfdf2`.
- Private worktree: `D:/DEV/role-model-internal/.worktrees/115-effect-foldkit-runtime-migration`, HEAD `a42bf551`.
- Method: read every listed path, followed each state variable through its writers/readers, and checked whether each invalid state has a concrete reachable interleaving or crash point. Line numbers are current at the above heads.
- Public `role-model-router/scripts/track-b/**` does not exist in this worktree (the Track-B scripts are private); the public audit covers the host-bridge `track-b-*.ts` surfaces and `packages/sqlite-memory/src`.

## Machine count and priority summary

Nine explicit or implicit state machines were found.

| # | Machine | Owner | Priority findings |
|---|---|---|---|
| M1 | Durable capture WAL (pending/inflight/maintenance/closed/degraded) | private `shared/capture/durable-queue.mjs` | P0 data loss in `drain`; P1 close/flush duplicate |
| M2 | Capture maintenance/drain epoch | private `shared/capture/durable-queue.mjs` | P1 two-phase gap; P2 stale-owner takeover |
| M3 | Projection generation/persistence | private `shared/projections/index.mjs` | P1 alias generation regression; P1 persist/memory divergence; P2 join collapse |
| M4 | Deferred route-capture queue | public `track-b-capture-queue.ts` | P1 no claim/lease; P1 crash-after-handler duplicate |
| M5 | EventLog append/archive/rollback | private `extensions/event-log/index.mjs` | P0 archive trim vs rollback receipt; P2 post-commit error ambiguity |
| M6 | Performance history policy/prune | public `sqlite-memory/src/history-policy.ts` | P1 non-transactional prune; P2 unarchived policy |
| M7 | Replay budget reservation ledger | public `track-b-replay-ledger.ts` | P1 corrupt-load budget reset; P1 cross-process lost update |
| M8 | Auto-replay tick/disposition/cursor | public `track-b-auto-replay.ts` + private `shared/capture/replay-disposition.mjs` | P1 terminal disposition overwrite; P1 cursor skips deferred; P1 dispatch/cursor crash gap |
| M9 | Replay job lease/fence | private `extensions/replay-core/index.mjs` | P2 lapsed-owner duplicate dispatch; P2 exact-expiry boundary |

Counts: **2 unique P0 (3 occurrences: M1 drain, M2 drain duplicate, M5 archive trim), 14 P1, 15 P2**.

---

## M1 - Durable capture WAL

Files: private `shared/capture/durable-queue.mjs`; lifecycle `capture-layer.mjs:1-40`.

### States
- `ready/pending`: row is enqueued and claimable (`state='pending'`, `durable-queue.mjs:172-175`).
- `inflight`: claimed with `lease_id`, `lease_owner`, `lease_expires_at_ms`, `fence` (`:236-244`).
- `maintenance`: `capture_maintenance.active=1`; claims blocked by `NOT EXISTS (... active=1)` (`:240`).
- `closed`: handle marked closed and DB nulled (`:465-470`).
- `degraded/pressure`: storage failure or capacity refusal (`:166-170`, `:210-215`).

### Invariants
1. A row is completed only by the holder's `(lease_id,lease_owner,fence)` identity; wall-clock expiry does not deny completion (`:284-300`).
2. A sink result is acknowledged only after the sink returns `committed===true` (`:346-347`).
3. `close` rejects new entry points and a flush already awaiting its sink rejects with a distinct error (`:143-145`, `:342-355`).
4. An in-flight row is reclaimed only after its lease expires or its process is gone (`:85-94`, `:239`).

### Transitions
| From | Event | To | Guard / side effect |
|---|---|---|---|
| absent | `enqueue` | pending | insert `:172-184` |
| pending/expired inflight | `#claimRow` | inflight | fence+1, attempts+1, no active maintenance `:236-251` |
| inflight | sink `committed` | deleted | `#completeClaim` identity delete `:284-300` |
| inflight | sink throws | pending | `#requeueClaim` only if lease still live `:307-314`, `:355` |
| pending | `beginMaintenance` | maintenance active | no inflight + stale check `:362-383` |
| maintenance active | `endMaintenance` | inactive | token+fence `:386-393` |
| any | `close` | closed | DB closed `:465-483` |

### Invalid-but-reachable states
**P0-1: `drain` commits the delete before the caller has persisted the drained rows.**
- Reachability: caller opens maintenance, calls `drain` (`:396-408`); `DELETE FROM capture_wal WHERE state='pending'` and `COMMIT` at `:406-407` run before the returned rows are written anywhere else. A process death or a caller exception after the return leaves the rows permanently gone: no receipt is inserted, and the caller has no durable copy. This is reachable on every normal shutdown/migration path, not only a crash.
- Evidence: `:396-408` (return only in memory), no receipt/outbox table in the schema (`:55-95`).
- Rank: **P0**.
- Fix: make drain two-phase (mark `draining` in the transaction, return rows plus a durable drain receipt id, delete only after the consumer acknowledges), or write an outbox row in the same transaction.

**P1-1: `close` after the sink commits strands the row until lease expiry and replays it.**
- Reachability: sink returns `{committed:true}` at `:341`; before `:344` another task calls `close` (sets `closed`, nulls DB, `:466-470`); `:344` sees `closed` and throws; the catch at `:349-355` deliberately does not requeue after close, so the row remains `inflight`. A later owner reclaims it after expiry (`:85-94`, `:239`) and calls the sink again, re-persisting an already-committed capture.
- Evidence: `:341-355`, `:465-470`.
- Rank: **P1** (at-least-once duplicate after committed side effect).
- Fix: persist a `completed_unacked` state before the close check, or have `close` await the in-flight sink and complete/fence it; never leave an unacknowledged committed row as plain inflight.

**P1-2: lease lost after sink commit requeues a committed sink when the lease is still live.**
- Reachability: sink returns committed; renewal sets `lost=true` (`:268-281`); `:345` throws before `:347`; catch `:355` calls `#requeueClaim`, which succeeds if `lease_expires_at_ms>now` (`:307-314`), so the row is reset to pending despite the sink having committed. Next flush re-runs the sink.
- Evidence: `:341-347`, `:258-281`, `:307-314`.
- Rank: **P1**.
- Fix: treat renewal loss as an ambiguous commit: persist a durable `sink_committed` marker before renewal check, or require sink idempotency keys; do not blind-requeue after a successful sink.

**P2-1: `close` closes the DB while the renewal timer can still fire.**
- Reachability: `#startRenewal` interval (`:268-276`) runs while sink awaits; `close` closes DB (`:479`); timer catches and sets `lost=true` (`:272-275`); flush then reports a spurious lease-loss/closed error. The row is still fenced, so no corruption, but the error class misdiagnoses the shutdown.
- Rank: **P2**.

**P2-2: capacity pressure is not a row state.**
`enqueue` returns false with a volatile receipt at `:166-170`, but the row is not recorded; `receipts()` after close returns only volatile receipts (`:414-423`). This is an intentional bounded degradation, not a lost state; rank P2 for observability.

## M2 - Capture maintenance/drain epoch

Files: private `shared/capture/durable-queue.mjs` (`:362-413`).

### States
inactive; active (`owner_id, token, fence`); stale-reclaimable (>5 min); fenced-out; closed.

### Invariants
- Only one maintenance owner per channel; a live owner's token is required to drain/end.
- Drain requires zero inflight and an active token (`:398-404`).

### Transition table
| From | Event | To | Guard |
|---|---|---|---|
| inactive | begin | active | no active <5m, zero inflight `:368-377` |
| active | begin by another owner | active (new token/fence) | age >=5m `:369-377` |
| active | end | inactive | owner+token+fence `:388-392` |
| active | drain | deleted pending set | token+fence+zero inflight `:398-407` |

### Invalid-but-reachable states
**P1-3: stale takeover has no liveness check.**
- Reachability: owner A begins maintenance at t0 (`:362-379`) and stalls but stays alive; at t0+5m owner B begins. `beginMaintenance` only checks age (`:369`) and zero inflight (`:372-373`), not `lease_process_id`/owner liveness (contrast row reclaim at `:92`). B replaces A's token/fence; A's later `endMaintenance`/drain is fenced, so no concurrent deletion, but A's maintenance work is silently discarded.
- Rank: **P1** (lost maintenance work / operator false success), no row data loss.
- Fix: store and check maintenance owner process id (or a heartbeat) before takeover; expose a `fenced` result to A instead of a generic token error.

**P0-2 (same code as M1 P0-1): drain's delete-before-consumer.**
The maintenance epoch does not add a durable handoff, so `drain` has the same P0 loss window (`:405-408`).

## M3 - Projection generation/persistence

Files: private `shared/projections/index.mjs`; `projection-layer.mjs`.

### States
absent; built/ready; degraded; stale (`source_invalidated`); persisted; persist-failed (in-memory only); rolled-back.

### Invariants
1. A projection alias resolves the highest source generation (`#refreshAlias`, `:206-217`).
2. A row is durable before a caller observes success (`#persist` after map set, `:291-298`).
3. A stale row keeps its identity but reports `generationReadiness='stale'` (`:326-339`).

### Transition table
| From | Event | To | Guard |
|---|---|---|---|
| absent | `build/buildFromEvidence` | ready/degraded | refs/evidence `:291-309` |
| ready | `verifyEvidence` | rebuilt | evidence ref exists `:311-323` |
| any | `invalidateByArtifact` | stale/degraded | source ref matches `:326-339` |
| any | `evict` | absent | alias refresh `:341-347` |
| any | `rollback` | empty | none `:381-385` |

### Invalid-but-reachable states
**P1-4: building a lower generation regresses the alias.**
- Reachability: `build("cap", gen2)` sets alias to p2 (`:295-296`); `build("cap", gen1)` sets alias to p1 unconditionally (`:296`) while p2 remains in `#v`; `get("cap")` follows the alias at `:349-352` and returns gen1. `#refreshAlias` would have chosen gen2, but it is only called on evict/invalidate paths.
- Evidence: `:206-217`, `:291-298`, `:349-352`.
- Rank: **P1** (serves stale projection generation; list still contains both).
- Fix: route every build through `#refreshAlias` or compare generations before replacing the alias; evict/retire the older projectionId.

**P1-5: persist failure leaves memory ahead of durable state.**
- Reachability: `build` sets `#v` and alias (`:295-296`) then `#persist` writes temp and renames (`:241-248`). Disk-full/permission/rename failure throws; the caller sees failure but `get/list` return the new row for the process lifetime. A retry builds another row; `list` contains both, and a restart loses the first.
- Evidence: `:241-248`, `:291-298`, `:301-309`.
- Rank: **P1**.
- Fix: clone/rollback the map+alias on persist failure, or build into a staged row and swap only after rename succeeds; fsync temp before rename.

**P2-3: page join collapses missing vs unavailable for non-evidence rows.**
- Reachability: `build` uses `includeEvidence=false` (`:291-298`); `degradationReasons` maps both `item.missing` and `item.available===false` to the single reason `"missing"` (`:100-101`); `page` falls back to that reason (`:372-377`), so an unavailable source is counted as missing and `unavailable` is 0. Only `buildFromEvidence` rows keep the distinction.
- Evidence: `:100-101`, `:291-298`, `:361-379`.
- Rank: **P2** (operator census under-reports unavailability).
- Fix: carry separate `missingSources`/`unavailableSources` fields on every row, not only evidence rows, or derive from normalized source entries.

**P2-4: concurrent persists use the same temp name.**
`#persist` names temp `${filePath}.tmp-${process.pid}` (`:244`); two engine instances in the same process write/rename the same temp path, so one can rename the other's bytes and the last rename wins. Cross-process uses different pids but still last-writer-wins with no lock.
- Rank: **P2**.
- Fix: unique random temp + atomic rename; cross-process lock or single-writer service.

**P2-5: `rollback` is destructive and not a durable rollback.**
`rollback` clears all rows and persists empty (`:381-385`); there is no previous-version snapshot. A caller treating it as "roll back the last generation" loses every projection.
- Rank: **P2**.
- Fix: rename to `clear` or implement versioned snapshots.

**P2-6: constructor does not recover a crash-left temp file.**
It reads only `filePath` (`:219-239`); a temp from a crash is ignored, and the prior committed file is used. This is safe for consistency but leaves garbage and gives no recovery receipt.
- Rank: **P2**.

## M4 - Deferred route-capture queue (public host bridge)

File: public `role-model-router/apps/runtime-host-bridge/src/track-b-capture-queue.ts`.

### States
pending waiting (`next_attempt_at_ms`); pending due; retry/backoff; delivered (receipt); expired; failed (attempts exhausted); deferred.

### Invariants
1. A handler runs at most once per item at a time (intended; not enforced).
2. A successful handler deletes the pending row and inserts exactly one receipt in one transaction (`:357-379`).
3. A terminal failure deletes pending and records `expired`/`failed` (`:389-417`).

### Transition table
| From | Event | To | Guard |
|---|---|---|---|
| absent | enqueue | pending due | no existing pending/receipt, capacity `:192-228` |
| pending due | drain select | handler | none `:301-337` |
| handler ok | receipt transaction | delivered | delete+insert commit `:357-379` |
| handler throws | retry update | pending backoff | attempts<max, not expired `:418-430` |
| handler throws | terminal transaction | expired/failed | deadline or max attempts `:387-417` |
| handler returns deferral | update | pending future | `deferredUntilMs` `:338-355` |

### Invalid-but-reachable states
**P1-6: no claim/lease between select and handler; two drains deliver the same item.**
- Reachability: drain A selects row R at `:301-334` and awaits `handler` at `:337`; the row is still `pending` with the same `next_attempt_at_ms`. Drain B (periodic + shutdown, or two processes) selects the same R and runs the handler. Both then delete/receipt; the second delete affects 0 rows and `INSERT OR REPLACE` rewrites the receipt. The handler side effect ran twice.
- Evidence: `:301-334` (select only), `:337` (outside lane), `:357-379` (delete/receipt, no compare-and-set on attempts).
- Rank: **P1** (at-least-once duplicate route capture).
- Fix: add a claim column/state with token+lease and `UPDATE ... WHERE state='pending' AND next_attempt...` in the selecting transaction; handler result commit uses the token as CAS.

**P1-7: handler success then process death before the receipt transaction replays the item.**
- Reachability: handler returns at `:337`; process dies before `:357-379`; the pending row remains. Restart sees `next_attempt_at_ms <= now` and re-delivers. There is no `delivering` tombstone.
- Rank: **P1**.
- Fix: write an `in_flight` claim/tombstone before the handler, and make the receipt transaction require that token; recovery can decide whether to retry or mark unknown.

**P2-7: retry update has no attempt/fence compare.**
Two drains that both saw `attempts=n` each write `attempts=n+1` at `:420-429`; one increment is lost, extending retries; `next_attempt_at_ms` last-writer-wins.
- Rank: **P2**.

**P2-8: capacity only counts pending rows.**
`maxItems` checks `COUNT(*) FROM track_b_route_capture_pending` (`:205-209`); delivered/expired receipts in `track_b_route_capture_receipts` are unbounded (schema `:115-119`). A long-lived runtime can grow receipts without bound.
- Rank: **P2**.

## M5 - EventLog append/archive/rollback

File: private `extensions/event-log/index.mjs`.

### States
append transaction open; committed; recovered/clean; recovery-failed; retained (archived); rolled-back.

### Invariants
1. Hash chain extends the maximum sequence across facts+archive (`:177-188`).
2. Exact idempotency replay returns the existing row (`:171-173`, `:191-198`).
3. A retention receipt can restore exactly the rows archived under it (`:321-335`).

### Transition table
| From | Event | To | Guard |
|---|---|---|---|
| absent | append | committed fact | insert+commit `:189-190` |
| committed | retain | archived | transaction `:303-317` |
| archived | rollbackRetention | fact restored | receipt not rolled back `:323-335` |
| append error pre-commit | recovery | clean or recovery-failed | rollback still open `:223-240` |
| append error post-commit | recovery | committed fact + error | no open transaction `:203-207` |

### Invalid-but-reachable states
**P0-3: archive trimming deletes rows that a live rollback receipt still needs.**
- Reachability: `retain` archives rows under receipt R and inserts R (`:309-313`); the same transaction then trims `event_fact_archive` to `maxArchiveRowsPerChannel` **without regard to receipts** (`:314`), and can trim receipt rows independently (`:315`). Later `rollbackRetention(R)` selects only surviving archive rows (`:327`), restores them, deletes that subset, and marks R rolled back (`:334-335`) even when 0 or partial rows remain. The rollback reports success with `restored` less than the receipt's `removed` count; the missing events are unrecoverable.
- Evidence: `:303-318` (trim), `:321-338` (rollback).
- Rank: **P0** (silent audit/event loss; rollback reports a clean terminal state).
- Fix: never trim archive rows referenced by a non-rolled-back receipt; enforce with FK/trigger or compute the trim against receipts as a unit; return `partial`/`unavailable` instead of marking rolled back when rows are missing.

**P2-9: post-commit append failure is returned as an append failure.**
`COMMIT` at `:190` can be followed by a failed readback (`:200`) or prune (`:201`); the catch at `:203-207` surfaces the error although the event is committed. A caller that does not retry with the same idempotency key records a false failure. The idempotent retry path at `:171-173` makes recovery possible, but only if the caller retries.
- Rank: **P2** (ambiguous outcome, no data loss).
- Fix: separate commit from post-commit pruning; return the committed row and a non-fatal prune warning.

## M6 - Performance history policy/prune

File: public `role-model-router/packages/sqlite-memory/src/history-policy.ts`.

### States
policy current; sample retained; sample pruned; rollup updated; policy archived (intended, not implemented).

### Invariants
1. Prune keeps rows within age/count/bytes (`:150-162`).
2. Rollup matches the retained set (`:165-179`).
3. A policy change is versioned/archived (`:80-85` table, `:101-112` write).

### Transition table
| From | Event | To | Guard |
|---|---|---|---|
| sample | enforce | retained/pruned | age/count/bytes `:150-162` |
| retained/pruned set | rollup upsert | rollup | after delete loop `:165-179` |
| policy | write | new policy | validate only `:101-112` |

### Invalid-but-reachable states
**P1-8: prune deletes rows outside a transaction, then writes the rollup.**
- Reachability: `for (const sampleId of pruned) remove.run(sampleId)` at `:163-164` is not wrapped in a transaction; the process can die after some deletes and before the rollup at `:165-179`. The table is partially pruned while the rollup still names the old counts/bytes (or a previous run's). A later enforce repairs it, but until then readers see inconsistent history.
- Evidence: `:163-179`.
- Rank: **P1**.
- Fix: one `BEGIN IMMEDIATE` around delete+rollup; or delete via a single bounded statement and update rollup in the same transaction.

**P2-10: policy updates are not archived.**
`performance_history_policy_archives` and `MAX_ARCHIVES/MAX_ARCHIVE_*` are declared (`:6-8`, `:80-85`), but `writePerformanceHistoryPolicy` only updates the singleton and returns a receipt (`:101-112`). The previous policy cannot be restored; the receipt is not durable.
- Rank: **P2**.

**P2-11: concurrent insert between select and delete makes the rollup stale.**
Rows are selected at `:135-146`; a concurrent insert after that is neither in `retained` nor deleted, but the rollup is written as if it were absent (`:165-179`). Rank P2.

## M7 - Replay budget reservation ledger

File: public `role-model-router/apps/runtime-host-bridge/src/track-b-replay-ledger.ts`.

### States
none; reserved; dispatch recorded; terminal counterfactual; released; pruned-stale.

### Invariants
1. Reserve before dispatch, accounting reservations in the daily ceiling (`:297-351`).
2. A terminal capture cannot be reserved again in the same window (`:303-309`).
3. A reservation is released or consumed exactly once (`:353-368`, `:410-425`).

### Transition table
| From | Event | To | Guard |
|---|---|---|---|
| none | reserve | reserved | limits `:297-351` |
| reserved | record | reservation decremented/removed | dispatch accepted `:390-427` |
| reserved | release | none | reservation id `:353-368` |
| reserved | pruneStale | none | age > TTL `:370-388` |
| reserved | completeCounterfactual | terminal | capture+policy `:429-440` |

### Invalid-but-reachable states
**P1-9: a corrupt ledger silently becomes an empty ledger and is overwritten.**
- Reachability: `load` catches any parse/read error and returns `{ schemaVersion, windows:{} }` (`:248-256`); the next `reserve` pushes a reservation and `persist` renames over the corrupt file (`:259-264`, `:343-350`). All prior terminal counterfactuals/reservations disappear, resetting the daily ceiling and allowing re-dispatch/overspend.
- Evidence: `:248-256`, `:259-264`, `:297-351`.
- Rank: **P1** (cost/abuse ceiling reset; audit loss).
- Fix: fail closed on parse error, quarantine the file, and require an explicit recovery path; never treat corruption as empty for a budget authority.

**P1-10: reserve is a cross-process read-modify-write with no lock.**
- Reachability: two processes call `reserve` concurrently; both `load` the same file (`:300`), both append a reservation to their own copy (`:343-349`), and both `persist` with last-rename-wins (`:259-264`). One reservation is lost, so the daily dispatch ceiling is under-counted; both dispatches proceed.
- Evidence: `:297-351`, `:259-264`.
- Rank: **P1**.
- Fix: SQLite/append-only WAL or a cross-process lock; make reserve an atomic compare-and-append with a monotonic reservation sequence.

**P2-12: terminal dedupe is window-local.**
`hasTerminalCounterfactual` and `reserve` inspect only `windowOf(file, now())` (`:303`, `:442-445`); a capture that completed yesterday can be reserved again today after midnight. This may be intended daily accounting, but it is a repeat-dispatch path. Rank P2.

**P2-13: reservation id uses a mutable length and millisecond time.**
`reservationId = hash(key\0atMs\0reservations.length)` (`:339-342`); two processes/writers can mint the same id at the same ms and length, making release/prune target the wrong row when files merge. Rank P2.

## M8 - Auto-replay tick/disposition/cursor

Files: public `track-b-auto-replay.ts`; private `shared/capture/replay-disposition.mjs`.

### States
capture pending/unsettled; deferred; replayed; refused; cursor at last processed; disposition row terminal/deferred.

### Invariants
1. A terminal disposition (`replayed`/`refused`) is final; only unsettled captures are pending (`replay-disposition.mjs:6`, `:283-296`).
2. The cursor resumes after the last capture the tick actually started (`track-b-auto-replay.ts:1029-1038`).
3. Ledger terminal + release + disposition are written in a terminal order with no lost work (`:1528-1537`).

### Transition table
| From | Event | To | Guard |
|---|---|---|---|
| pending | tick | replayed/refused/deferred | gates `:1027-1537` |
| cursor n | tick starts capture n | cursor n | set before work `:1037-1038` |
| deferred | next tick after cursor | never revisited | cursor slice `:1009-1016` |
| any | disposition `record` | overwritten row | unconditional upsert `replay-disposition.mjs:242-267` |
| terminal | later deferred write | deferred | no terminal guard `:242-254` |

### Invalid-but-reachable states
**P1-11: a deferred capture at the end of the cursor range is permanently skipped.**
- Reachability: captures `[A,B]`, no start cursor; A deferred, B deferred; loop sets `cursor=B` before each (`:1037-1038`) and returns B (`:1540`). Caller passes `startCursor=B`; `pending.findIndex(B)` is length-1, slice after it is empty (`:1009-1012`), so both deferred captures are never retried with the same corpus. `skipped` is only set when the cursor is absent (`:1013-1015`); it does not reset to the beginning.
- Evidence: `:1009-1016`, `:1033-1038`.
- Rank: **P1** for any caller that persists the returned cursor (the API advertises a resumable cursor at `:30`); no production caller was found in the public host-bridge at this HEAD, so reachability is via the documented contract.
- Fix: advance the cursor only after a terminal outcome; deferred captures must stay before the cursor, or wrap the cursor when the tail is exhausted.

**P1-12: terminal disposition can be overwritten by a later deferred write.**
- Reachability: capture C gets `replayed` via `record` (`replay-disposition.mjs:242-267`); a later resume/tick writes `deferred` for the same `(capture,policy)`; the unconditional `ON CONFLICT DO UPDATE` changes the row to `deferred` (`:247-254`). `pending()` then no longer filters it as terminal (`:293`) and the capture is replayed.
- Evidence: `:242-267`, `:283-296`.
- Rank: **P1** (terminal-state regression, duplicate work).
- Fix: `ON CONFLICT DO UPDATE ... WHERE outcome NOT IN ('replayed','refused')`, or apply the deferral/terminal decision in one transaction that reads the current row.

**P1-13: crash between ledger terminal and disposition leaves a terminal capture without its receipt.**
- Reachability: `completeCounterfactual` at `:1528-1531` persists the terminal ledger row; the process dies before `emitCapture` at `:1534-1537`. On restart `reserve` returns `duplicate_already_processed` (`track-b-replay-ledger.ts:303-309`) and the capture is emitted as `refused`/`duplicate` rather than `replayed`; the operator disposition is wrong even though the work was paid for.
- Rank: **P1** (status/accounting inconsistency), no additional dispatch.
- Fix: write the disposition before or atomically with the terminal ledger marker, or make `reserve` surface the prior terminal row so the tick can emit `replayed`.

**P1-14: crash after dispatch records but before terminal re-dispatches paid work.**
- Reachability: dispatches recorded at `:1447-1459`; process dies before `completeCounterfactual` (`:1528`); reservations remain; `pruneStaleReservations` releases them after TTL (`:997-1000`), and the next tick reserves again and re-dispatches. There is no branch-level terminal tombstone in the capture path.
- Rank: **P1** (duplicate provider spend).
- Fix: persist a per-capture dispatch receipt/terminal marker before or with each dispatch, and have the next tick reconcile whether the branch already exists.

## M9 - Replay job lease/fence

File: private `extensions/replay-core/index.mjs`.

### States
unleased; leased; expired; reclaimed; awaiting_evaluation; terminal.

### Invariants
1. A live lease cannot be stolen; exact expiry is claimable (`:1006`).
2. Reclaim bumps `fenceToken` and abandons old `dispatching` markers (`:1037-1057`).
3. Only the current `(leaseOwner,fenceToken)` may dispatch (`:1081-1083`).

### Transition table
| From | Event | To | Guard |
|---|---|---|---|
| unleased/expired | claim | leased | no live lease, owner cap `:1006-1018` |
| leased | expiry/claim | reclaimed | fence+1, abandon dispatches `:1037-1057` |
| leased | release | unleased | owner+fence `:1068-1077` |
| any | release by old owner | rejected | fence mismatch `:1071` |

### Invalid-but-reachable states
**P2-14: a lapsed owner's provider call can still be running when a new owner reclaims and re-dispatches.**
- Reachability: owner A's lease expires during a long provider call; owner B claims, marks A's `dispatching` markers `abandoned`, releases their reservations and dispatches again (`:1037-1057`). A's call then completes; its receipt is fenced, but the provider was paid twice. This is the documented recovery tradeoff, not a correctness bug, but it is a real duplicate-cost state.
- Rank: **P2**.
- Fix: make dispatch cancellation cooperative (abort token per lease) and/or reconcile A's late receipt against the abandoned marker before B dispatches.

**P2-15: exact-expiry boundary is claimable.**
`if (job.leaseExpiresAtMs > now) throw` (`:1006`) lets a claim at `now === leaseExpiresAtMs` through, while `#assertCurrentJobLease` rejects `<= now` (`:1081-1082`). At the exact millisecond, the old holder cannot dispatch but the new holder can claim; this is intentional boundary semantics but can produce a transient double-attempt.
- Rank: **P2**.

---

## Cross-machine repair candidates (ordered)

1. **Make every destructive handoff two-phase/durable.** CaptureQueue.drain, host route-capture drain, and history prune currently delete before a durable consumer ack. Add `draining`/`in_flight` states with token+lease and only delete after the consumer receipt commits.
2. **Put a fence/epoch on all queue work.** The private WAL has a fence; the public host queue does not. Add `claim_token`/`claimed_at_ms` to `track_b_route_capture_pending`, claim in the selecting transaction, and CAS every handler result.
3. **Never trim evidence needed by a rollback receipt.** EventLog archive trim must be receipt-aware, and `rollbackRetention` must return a partial/unavailable result instead of marking a receipt rolled back when archived rows are missing.
4. **Protect terminal states.** ReplayDispositionStore upsert must be conditional on non-terminal; projection aliases must compare generations; auto-replay cursor must advance only after a terminal disposition.
5. **Fail closed on accounting corruption.** ReplayLedger.load must not turn a corrupt budget file into an empty one; quarantine and require explicit recovery.
6. **Atomic durability.** Projection persist should stage and swap (with fsync); history prune should be one transaction; ledger reserve should use a lock/WAL.
7. **Separate commit from post-commit maintenance.** EventLog append should not report failure after COMMIT because a prune/readback failed.

## Reachability caveats

- M1 P0 drain loss and M5 P0 archive trim loss are direct code paths with no external precondition beyond a caller using the documented API and a process death/exception.
- M4 duplicate delivery is reachable with two concurrent `drain` calls in one process; the host-bridge timer plus shutdown path is sufficient, and two processes on the same SQLite file are also possible.
- M8 cursor skip requires a caller that persists the returned cursor; the API documents it as resumable (`track-b-auto-replay.ts:30`), but no public caller was found at this HEAD, so it is ranked P1 contract-level rather than P0.
- M3 alias regression is directly reachable through the public `build` API; no clock or crash is needed.
- P0/P1 rankings reflect data loss/duplicate paid work/security of accounting, not test coverage.