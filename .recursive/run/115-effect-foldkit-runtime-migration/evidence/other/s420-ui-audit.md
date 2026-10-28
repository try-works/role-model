# S420 — UI self-check audit (author contribution, NOT independent acceptance)

Reviewer: `s5-health-wait`, active model verified **deepseek-flash** via `list_agents` before starting. I authored the recent UI slices, so this is a self-check contribution; Lead cross-checks. Read-only product/test/config; no product edits, no commit, no operator ports. Public HEAD `22b3d9ab` (per S420 bundle).

Basis: UI reviewer scope in `evidence/review-bundles/s420-current-state-audit.md`; compared current `apps/runtime-ui-next` against original `apps/runtime-ui/app`; inputs reread: source-proposal §§5-10,14-17 (via bundle), addenda/02-workspace-reference-implementation.md, owner-scope-decision.md (E1/E2 deferred only).

## Findings (severity-ranked, confirmed unless noted)

### F1 HIGH — Device-auth form is free text, not the original provider/connection selects; no catalogue load/error
- Current: all device-auth fields are plain text inputs with `h.OnInput` (`apps/runtime-ui-next/src/control-view.ts:93-115`); model entry is free text + Add/Remove (`:116-134`).
- Original: `SelectField label="Provider"` and `SelectField label="Connection method"` sourced from the provider catalogue (`apps/runtime-ui/app/routes/providers.tsx:1181-1203`); model is a catalogue `SelectField` (`:1235-1249`); reasoning efforts are catalogue checkboxes (`:1251-1320`).
- Impact: any non-empty string passes local validation (`device-auth.ts` `validateDeviceAuthDraft` checks only non-empty provider/variant/model), so bogus ids are only rejected by the host. No catalogue loading/error/disabled states exist in the next UI (grep for provider catalogue reads returns only the Studio configured-models readback, `update.ts:657-661`).
- Classification: confirmed functional/parity defect (not just test-coverage gap).

### F2 HIGH — Device-auth verification actions and modal lifecycle are missing
- Current: after Start, the form shows only status text ("Waiting for authorization"/"Connected") and Cancel/Retry (`control-view.ts:135-172`). There is no user code, verification URL, copy-code, open-window, explicit "Check now", or modal.
- Original: user code + copy (`components/device-authorization-card.tsx:45-52`), open verification URL (`:97-101`), modal with backdrop/close and **Escape listened on window with cleanup** (`components/device-authorization-modal.tsx:25-32`), `role="dialog"` `aria-modal` and copy/open actions (`:36-86`), and an explicit "Check now" poll button plus "Start OAuth" (`routes/providers.tsx:1351-1369`).
- Impact: users cannot copy/open the device login URL or force a poll; keyboard dismissal/focus-return contract absent. Auto-poll exists but is not the original complete action set.
- Classification: confirmed missing actions/lifecycle.

### F3 HIGH — Provider create payload diverges from the original selection semantics
- Current payload (`src/provider-account.ts:137-159`): `baseUrlOverride` comes from a free-text draft field (`:141`); `credentialRef` uses a free-text ref for api-key mode (`:143-148`); role bindings apply ONE comma-separated `roleIdsInput` to every selected model (`:89-99`, `:152`).
- Original (`routes/providers.tsx:988-1023`): `baseUrlOverride: selectedVariant.baseUrl ?? selectedProvider.apiBase`, `credentialRef` from the selected variant/catalogue, and `modelRoleBindings: buildModelRoleBindings(selectedModel ? [selectedModel] : [], selectedModelRoles, availableRoleIds)` — per-model role selection for the single selected model (`buildModelRoleBindings` at `:279-305`; role picker at `:1488-1520`).
- The multi-model extension is documented, but "one global role list for all models" is not the original per-model assignment. The current form has no provider/variant selects at all (`control-view.ts:46-90`), so providerKind/authMode/baseUrl cannot be catalogue-derived.
- Classification: confirmed payload/selection divergence; host accepts it, so this is a parity/correctness risk rather than a wire-format break.

### F4 HIGH — Product lint is not clean on the recently shipped form modules
Absolute `anti_slop_lint` with `filesScanned > 0`:
- `src/device-auth.ts`: **19 findings**, filesScanned 1 (unknown returns/params, unsafe dictionary, runtime typeof, unsafe cast at 190).
- `src/provider-account.ts`: **12 findings**, filesScanned 1 (unsafe cast at 92, known-value widening 164, unknown returns 170-172, unknown params 186).
- `src/endpoint-admission.ts`: **9 findings**, filesScanned 1 (conditional spreads 88/125, unknown returns 104-105, unknown params 119).
- `src/requests-ranking.ts`: clean (1 file).
Earlier "lint clean" claims for these modules were produced by relative-path scans that scanned **zero files**; those claims are false. Classification: confirmed quality/acceptance defect.

### F5 MEDIUM — Learning rollback scope is hard-coded, not the readback scope
- `update.ts:1104` posts `scopeId: "standalone-runtime-stage"` for every per-task toggle; the original uses `records.value.scopeId ?? fallback` when calling `rollbackLearningLadder`.
- Impact: a non-default scope receives a rollback for the wrong scope. Classification: confirmed (known limitation from S412, still open).

### F6 MEDIUM — Several original route actions remain readback-only/static
- `view.ts:43` renders "Router candidates | RM3 Foldkit shell" as a title; `:906` renders RouterCandidates as a generic readback; `:948` renders LocalChoose as a static section. Compare the original route families in `runtime-ui/app/routes` (router-candidates, local-choose, control-*, learning actions, etc.).
- Missing original provider actions also include reasoning-effort save batch (`providers.tsx:1343-1349`), role save per endpoint (`:1511-1520`), and the explicit poll action (F2).
- Classification: confirmed missing acceptance evidence/actions; not all routes were exhaustively re-read (see limitations).

### F7 MEDIUM — Workspace reference architecture is not adopted in the UI layout
- `apps/runtime-ui-next/src` has **no feature directories** (top-level files only; `view.ts` 1252 lines, `update.ts` 1194 lines, one Model + one message union + `routeContent` switch). Addendum 02 requires Definition -> Composition -> Block -> Program ownership with feature dirs and child Model/ViewInputs/OutMessage boundaries (issueList-style), plus a shared Listbox/Dialog facade over vendored `@foldkit/ui`.
- Grep finds no `@foldkit/ui`/Dialog/Listbox imports in `runtime-ui-next/src`; device auth is inline, not a Dialog (F2).
- Classification: confirmed architecture gap vs the required reference mapping; no child-graph/browser proof exists for these families.

### F8 HIGH — Host poll status `failed` is silently normalized to `pending` (endless poll)
- `device-auth.ts:193-206` `parseSession` maps every status that is not `connected`/`error` to `pending` (`:201`). The host poll response can carry `failed` (Lead probe), so the client keeps polling as if authorization were still pending and never surfaces the failure.
- Lead probe confirmed: failed host poll status -> client pending. Classification: confirmed defect.

### F9 HIGH — Cancel leaves `inflight: true`, so a restart is refused
- `update.ts:963-970` (`DeviceAuthCancelled`) clears session/sessions and advances the token but does not set `inflight: false`; `DeviceAuthStartRequested` refuses when `inflight === true` (`update.ts:874-878`). Lead probe: cancel then restart issues `[]` commands.
- Impact: after cancel the form is stuck for start until a retry path clears inflight; the S399 guard turns a stale flag into a dead UI. Classification: confirmed defect.

### F10 HIGH — Multi-model endpoint activation marks `saved` after the FIRST success, allowing duplicate activation
- `update.ts:1158-1174` emits ONE `ActivateEndpoint` per selected model with a single token; `EndpointAdmissionSucceeded` (`:1175-1179`) clears `pendingAction` and sets `status: "saved"` on the first success. The busy guard (`endpointAdmissionBusy`) is then false while the remaining activations are still in flight, so a second submit can issue another activation. Lead probe: endpoint two activates after first success marks saved.
- Classification: confirmed defect (per-command completion is not tracked).

### F11 HIGH — Pending device-auth session does not render the user code or verification URL
- Session schema keeps `userCode` and `verificationUriComplete` (`device-auth.ts:1-15`), but the view renders only status text; for `pending` it shows `"Waiting for authorization"` and never the code/URL (`control-view.ts:169-172`; `userCode` is appended only in the non-pending branch). `verificationUriComplete` is not rendered anywhere.
- Original card shows the code + copy while pending (`components/device-authorization-card.tsx:45-52`) and the verification link (`:97-101`). Impact: the user cannot authorize. Classification: confirmed defect (Lead probe).

### F12 HIGH — Original local policy/matrix sources exist, but their canonical routes are missing and legacy redirects point at unserved paths
- Original canonical routes: `local/llama-swap/policy` -> `routes/local-policy.tsx` and `local/llama-swap/matrix` -> `routes/local-matrix.tsx` (`apps/runtime-ui/app/routes.ts:17-23`). `local-policy.tsx` is a real read/save page over `GET/PUT /api/role-model/local/policy` (`lib/runtime-api.ts` `fetchLocalPolicy`/`updateLocalPolicy`; `local-policy.tsx:16,30,48`); `local-matrix.tsx:5-7` redirects to `/app/local/llama-swap/models?view=grid`. The earlier "no source" claim was wrong.
- Current next routes: only `/local/llama-swap/models` exists (`route.ts:118,185`); there is no policy or matrix router. Yet `legacy-redirects.ts:27-29` maps `/app/local/policy` -> `/app/local/llama-swap/policy` and `/app/local/matrix` -> `/app/local/llama-swap/matrix`, i.e. legacy URLs are rewritten to paths the next router cannot serve (NotFound).
- Classification: confirmed missing canonical pages + broken redirect targets.

### Positive spot-checks (bounded)
- Device start payload has no `region` and computes per-model bindings (S398 contract); provider update-key/delete-model and endpoint admission single/batch payloads match host routes by earlier tests.
- `orgScope: "personal"` / `accountScope: "workspace-default"` match the original (`provider-account.ts:138,153` vs `providers.tsx:992-993`); endpoint region `global` matches.
- Requests ranking controls now auto-query with latest-selection-wins and invalid-selection token advance (S417/S418).

## Tests / checks executed
- Four suites: `node vitest run s397 s401 s404 s415` -> **EXIT=0, 4 files, 45/45 tests**.
- UI tsc: `tsc -p role-model-router/apps/runtime-ui-next/tsconfig.json --noEmit` -> **exit 0**.
- Lint: absolute paths, nonempty scans (above). Zero-file scans were rejected as evidence.

## Limitations / not read
- I did not mount every route or run the packaged browser; DOM conclusions are from the render code plus the existing scene tests, not a live browser session.
- I did not enumerate all 20 redirect entries or compare every generic route (Router/Controller/Local/System/Studio) line by line within the time bound; F6 is a sample, not an exhaustive parity list.
- No host request was issued for the payload claims; they are code-level comparisons (host acceptance was covered by earlier slices).

## Prioritized next work
1. Replace device-auth/provider free-text fields with catalogue-backed selects/Listbox + load/error/disabled states (F1), including per-model role selection (F3).
2. Restore device-auth user code/verification URL/copy/open and modal Escape/focus lifecycle, plus explicit Check now (F2).
3. Clean the three product modules' anti-slop findings or record per-finding justification (F4) — do not repeat zero-file lint claims.
4. Thread the learning readback scopeId (F5).
5. Continue route-family completion and adopt the Workspace ownership/Dialog-Listbox mapping with real graph/browser evidence (F6/F7).
## Lead-probe follow-ups (priority order)
1. F11/F8/F9 device auth: render pending userCode + verificationUriComplete (copy/open), normalize host `failed` to an error state, and clear `inflight` on cancel so start is reachable again.
2. F10 endpoint admission: track each activation completion (count/pending set) so `saved` is not published until all activations settle and duplicate submits stay fenced.
3. F12 local policy/matrix: add the canonical `/local/llama-swap/policy` (GET/PUT `/api/role-model/local/policy`) and `/local/llama-swap/matrix` (redirect to models?view=grid) routes, or correct the legacy redirect targets.
