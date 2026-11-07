# S671 UI state-machine audit — runtime-ui-next

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
