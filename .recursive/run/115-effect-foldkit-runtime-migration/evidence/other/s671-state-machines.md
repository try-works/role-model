# State machines: the single catalogue (run 115, S671)

This is the one file: every explicit and implicit state machine in the role-model runtime app — the
Foldkit UI (11), the host bridge (9), and the cross-repo track-b/capture/projection plane (9) — with
states, invariants, transition tables, reachable invalid states (with file:line evidence and
reachability checks), and disposition.

## Fix status (grouped issues, final 2026-11-07)

| Issue | Machines | Disposition |
|---|---|---|
| A. Benchmark run chain (UI) | UI M4 | FIXED: dedicated generation token `9fb0a749`; route reset + off-route ignore + active-run token seed + selection busy guard `662e67ff`; S668 off-by-one/poll-failure; S669 case timeout. |
| B. Benchmark runner (host) | Host M1/M2/M3/M5/M7 | FIXED: gate admission release `c840d974`; terminal status final `9b39c586`; case ceiling `7d009224`; activation-batch compensation + kill-fence expiry `4ecf0d43`; M3 provider abort still absent (deps have no AbortSignal) — DOCUMENTED. |
| C. Device authorization | UI M6 / Host M6 | FIXED: modal close `1f43f73d`; readback expiry `a8253516`. |
| D. Runtime config editor | UI M8 | FIXED `4346d9bf` (generation token + disabled while pending). |
| E. Refresh/readback gaps | UI M9 / M2 / M3 / M5 | FIXED `662e67ff`: control-route ReadControl gap, localPolicy error preserved, pending action not cleared by a read, provider activation generation fence. |
| F. Track-B public | Cross M4/M6/M7/M8 | FIXED: ledger corruption fail-closed + cursor rewind + atomic prune `76e2e49a`; cross-process ledger lock + capture claim/lease + terminal disposition guard `4ecf0d43`/`0562a130`. |
| G. Capture/projection private | Cross M1/M2/M3/M5/M9 | FIXED in the private repo: drain claim/ack P0 + event-log archive-trim P0 + close/flush + two-phase CAS + disposition CAS `b4688938` (49/49); projection generation + persist rollback `223c82af`; replay lease re-fence + exclusive expiry `423f439d` (40/40 targeted, full replay 184/184 on rerun). |

### Known residuals (documented, not claimed fixed)
- Host M3: a timed-out case is failed but the underlying provider request is not aborted (no AbortSignal in the runner deps).
- Capture at-least-once: exact-once after a post-handler crash needs the handler receipt/idempotency key before ack (the queue does not own the handler).
- Activation-batch compensation is implemented and typechecked but could not be exercised through the public API without a test seam.
- Private `run96-runtime-graph-capture` showed 2 failures outside the S671 targeted set; cause not established in this run.
- One 100 ms-lease replay test is timing-sensitive under parallel load (passes alone and on rerun).

### Verification summary
- UI: s672 3/3, s673 7/7, s671 7/7, device 45/45, benchmark 27/27, config 13/13, tsc 0.
- Host: benchmark runner 22/22, progress 5/5, restart+claim 22/22, replay 18/18, host P1/P2 32/32, tsc PASS.
- Private: S671 34/34 targeted (drain/trim/close/two-phase/disposition + projection/lease), node --check 0.
- sqlite-memory: history-policy 5/5.
- All fixes RED-first (logs under evidence/logs/).

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