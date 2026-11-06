# S396 — M8 provider/model/connect forms + device auth characterization

Read-only characterization; no product edits. Public worktree HEAD a039b176.

## M8 / R13 source clause
- source-proposal.md:742 (M8 Control/write wave): control-*, providers, connect/*, local/*, extensions, models/*; write paths exercised by scenarios.
- 00-requirements.md:136 (R13): every inventoried read/control/write/heavy/learning/studio route/component, modals/palette/media/device auth: maintained success/empty/loading/error/denied/degraded/stale/mobile/theme journeys, not pilot-only.
- addenda/02-workspace-reference-implementation.md:26-31: typed HTTP adapters, controlled ViewInputs + typed parent facts, async/draft/conflict/race behavior, one RM3 facade over accessible controls, exact payload/failure mutation oracles.

## Exists today (Foldkit shell)

| Surface | State | Cite |
| --- | --- | --- |
| Controller assignment | controlled select + save button, pending guard, current/notice live region | view: control-view.ts:54-67; spec control.ts CONTROL_SPECS.controlController (PATCH /controller via runtime-endpoints CONTROL_ENDPOINTS.controllerUpdate); update/control command path in update.ts |
| Providers action | ONE non-destructive action: reconnect first-account target (providerAccountId from row), pending disable + action message | control.ts CONTROL_SPECS.providers action (id reconnect, POST /accounts/repair/reconnect); control-view.ts:90-116 |
| Endpoints action | button exists but DISABLED with an explicit reason | control.ts CONTROL_SPECS.endpoints action disabledReason: "Admission needs a provider account, a model and a region; the form is not ported yet (S208)."; control-view.ts:97 |
| Runtime config editor | draft text + diff + notice/status with real read/save command and client | model.ts:17 runtimeConfigEditor; commands.ts:285-305 defineSaveRuntimeConfig; update.ts:547-560 editing/diff/save transitions; app.ts:110 createRuntimeConfigClient + defineSaveRuntimeConfig |
| Studio form | typed field schema + field-change message + dispatch command (model/role/effort/prompt/body/query/media fields) | studio.ts:17-18 StudioFieldSchema; message.ts:76,137 StudioFieldChanged; dispatch command in commands/studio |
| Read-only control/backing pages | providers/endpoints/model rows render as rows (no edit form) | control.ts parseProviders/parseEndpoints; readback pages for models/configuredModels/endpoints |

## Missing (against original React and real host endpoints)

| Missing form/behavior | Original evidence | Real endpoint(s) available |
| --- | --- | --- |
| Provider account create/update form (provider/variant/auth mode/region/model set) | apps/runtime-ui/app/routes/providers.tsx imports inputs/SelectField/DeviceAuthorizationCard/Modal and handles upsert/device flow | POST /api/role-model/accounts (host index.ts:19828, JSON body passthrough); POST /accounts/repair/update-key (:19921); DELETE /accounts/{id}/models/{model} (:19844) |
| Device authorization start/poll UI (user code, verification URL, pending/connected, auto-open, polling interval, copy code) | components/device-authorization-card.tsx and device-authorization-modal.tsx; helpers in lib/device-authorization.ts (verification URL, shouldAutoPoll, intervalSeconds, restorePersistedDeviceAuthorization, syncConnectedDeviceAuthorizationEndpoints) | GET /api/role-model/accounts/device (:19538 list), POST /accounts/device/start (:19954), POST /accounts/device/poll (:19975) |
| Endpoint admission / connect form (provider account + model + region) | original endpoints/connect pages; current button disabled S208 | POST /api/role-model/endpoints (:20021), POST /api/role-model/endpoints/batch (:20005) |
| Model/role selection inside the provider form (checkbox/typeahead multi-model, role mapping) | providers.tsx ModelRoleSelection/totalSelectedCount/allRolesSelected and activation of selected models after connect | POST /endpoints body { providerAccountId, modelId, region }; GET /models, /endpoints, /accounts |
| Extensions writes (if the original page mutates) | extensions.tsx imports control helpers/actions | host currently exposes only GET /extensions (:18656) and GET /extensions/qa (:18665): NO write endpoint found -> stays read-only, not landable in M8 |
| No device-auth state at all in the shell | search of runtime-ui-next/src shows device only in trust-header/diagnostics docs; no DeviceAuthorization model/message/view | n/a |

## Current controlled-input/state pattern (the pattern a new form should follow)
- Control specs hold one read + one action; dispatch is guarded while pending (control.ts:6-10), rows carry id/label/value/meta, state carries status/token/actionStatus/actionMessage/notice/error/selection (control.ts:24-34).
- Controller form shows the controlled pattern: h.select with AriaLabel + selected option (control-view.ts:54-58), save button disabled while pending (:61-63), current + live-region notice (:60-67).
- Runtime config editor demonstrates draft/conflict-ish behavior: originalText/text/diff/status, notice/error, save command and re-read on success (update.ts:547-560; commands.ts:285-305).
- Studio demonstrates typed field changes: field schema + StudioFieldChanged message rather than raw DOM state (studio.ts:17-18; message.ts:76,137).
- Missing from the pattern for a write form: no draft model for account/device data, no typed validation errors, no retry/backoff state, no persisted-session restore, no timer/interval ownership, no selected-model conflict handling.

## Named first slice: S396a — provider device-authorization connect form

ONE form family, real endpoints, exact requests, controlled/draft/retry/conflict behavior:
1. Typed form state: providerId/variantId/authMode, region, selected modelIds (multi-select), device session fields (authRequestId, userCode, verificationUri/Complete, status pending/connected/error, intervalSeconds), draft dirty/validation errors; typed messages (FieldChanged, ModelToggled, StartRequested, PollRequested, Cancel).
2. Real requests (exact): POST /api/role-model/accounts/device/start with the form body; GET /api/role-model/accounts/device to restore a pending session for the provider account (no duplicate start when one is pending); POST /api/role-model/accounts/device/poll with { authRequestId } at the returned interval; on connected, POST /api/role-model/endpoints once per selected model { providerAccountId, modelId, region } (ordered, no duplicates).
3. State machine + conflict/retry: draft -> starting -> pending(polling) -> connected | error; conflict when a pending session is restored (no second start); retry after poll failure keeps the same authRequestId; cancel clears the timer and the draft; unmount/dispose clears the interval; one poll in flight at a time.
4. Controlled ViewInputs: one RM3 facade (select/typeahead/checklist/buttons) with labels, keyboard, disabled, aria-live status; no raw DOM state.
5. Tests (strict TDD next slice): exact method/path/body for start/poll/activate; one start per conflict-pending account; poll interval respected + one in flight; retry uses same authRequestId; connected activates each selected model exactly once; cancel/unmount clears the timer; validation blocks empty provider/model; error path surfaces typed failure without losing the draft.

Caller/region table:

| Region | Role | Cite |
| --- | --- | --- |
| host device endpoints | start/poll/list | index.ts:19538, 19954, 19975 |
| host account endpoint | upsert/update-key/model removal | index.ts:19828, 19921, 19844 |
| host endpoint admission | activate selected models after connect | index.ts:20021 (and /batch :20005) |
| original UI evidence | device card/modal + providers page + helpers | app/components/device-authorization-card.tsx, device-authorization-modal.tsx; app/routes/providers.tsx; app/lib/device-authorization.ts |
| new shell form | control/studio/editor patterns to reuse | control.ts, control-view.ts:54-67, commands.ts:162-305, update.ts:547-560, studio.ts:17-18 |
| mount point | Providers / Connect page (control route) | route.tsx Providers; control-view.ts route=control |

## State
No product edits, no RED/GREEN (characterization), no commit. HEAD a039b176.
