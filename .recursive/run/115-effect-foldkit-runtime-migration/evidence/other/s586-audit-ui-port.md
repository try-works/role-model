# S586 — Foldkit UI port audit against the preserved 0.0.20 reference and the functional-wiring bar

Status: READ-ONLY audit, 2026-10-31. Public worktree `D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration`, branch `recursive/115-effect-foldkit-runtime-migration`, HEAD `f3d700c6` ("feat(ui): wire the router family to the runtime config"), clean working tree. Only this file was written; no source, test, config or commit was touched. The packaged artifact, the preserved React build and the private repo were not inspected here.

Method: source read of `apps/runtime-ui-next/src` (route union, view registry, family renderers, update, commands, clients, app wiring) and the reference `apps/runtime-ui/app/routes/*.tsx` + `app/lib/runtime-api.ts`; grep-measured dead-control counts; targeted vitest run of the six audit files named in the task. Full suite, packaged gates and browser journeys were NOT run.

## Headline

The port is not a mock in the S46/S76 sense: providers, endpoints, controller, router posture, runtime config, Studio, the learning ladder and local policy all have a real message → update → Command → client → HTTP path (section 3). But it is also not yet the reference surface:

- **14 rendered buttons and 14 rendered inputs have no handler** (measured in `families-view.ts`), on Local peers / peer models / llama-swap models / llama-swap policy / storage retention / local logs / operator controls / extensions.
- **One fully wired path is shadowed:** `LocalPolicy` has a working `LocalPolicySaveRequested` → `PUT /api/role-model/local/policy` (and tests, `s458-local-policy.test.ts`), but `policySupplement` discards the wired page and renders a static form (`features/density/supplements.ts:89`). The user can click nothing that reaches it.
- **One page fabricates success:** `SessionReadiness` renders hardcoded "complete", "Host health ok", "Authority authoritative" and "no blockers" while only `readback.rows.length` is consulted (`families-view.ts:491-518`).
- **Story coverage is 40 of 50 routed tags**; Studio's five captured tab stories are unused by any test, and the Providers fixture still records the pre-fix placeholder values.

## 1. Routed page families

The port route union has **50 tags** (`src/route.ts:21-72`) and the view registry renders every one (`src/view.ts:1253-1326`, 50/50 entries). Reference `app/routes.ts` registers 51 entries (48 page modules + 20 legacy-redirect entries), and every original canonical path resolves via `legacy-redirects.ts` (`MISSING_ORIGINAL_TARGETS` is empty, `legacy-redirects.ts:173-177`).

Class key: **W** = functional-wired (a rendered control reaches a real client call); **R** = read-only by design (host readbacks, no mutation expected); **S** = static or disabled controls (reference-shaped, no handler or hardcoded disabled state).

| Family | Route tags | Class | Rendered by / evidence |
|---|---|---|---|
| Overview | Index, Dashboard | W (Index filters/window/chart), R (Dashboard) | `view.ts:1326` overview + `OverviewFilterChanged`/`SelectedOverviewWindow` read Commands; Dashboard is `READBACK_SPECS.dashboard` only (`view.ts:1317`) |
| Providers | Providers | **W** | `families-view.ts:78-258`: catalog-driven Provider/Connection method/Model selects, `Save provider account`, `Update API key`, device-auth start/poll, control action; see section 3 |
| Endpoints | Endpoints | **W** | `families-view.ts:261-338` + `features/endpoint-activation/view.ts:6-45`: admission form → `EndpointAdmissionSubmitRequested` → POST `/api/role-model/endpoints[/batch]` |
| Controller | ControlController | **W** | `router-family-view.ts:558-607`: endpoint cards, "Use as controller" → `ControllerSaveRequested` → `dispatchControl`; select+save in `control-view.ts:111-129` |
| Router | Router, RouterStrategy, RouterWorkloads, RouterAgentStrategy, RouterConfig, RouterCandidates, RouterDecisions, RouterDecisionDetail | **W** (strategy/agent-strategy/workloads/config), **R** (overview, candidates, decisions, detail) | `router-family-view.ts:356-420` (posture selects + Save) and `:455-556` (block editor + Save/Reload); overview/candidates/decisions read `routerConfig`/`routerCandidates`/`routerDecisions` |
| Models / Roles / Benchmark | Models, ModelsRoles, Benchmark | **R** | `features/models/routes.ts`, readbacks only; Benchmark readback view (`view.ts:1291`) |
| Requests / Decisions / Candidates | Requests, RequestDetail (+ RouterDecisions/Detail above) | **R** | Requests sorts/ranks client-side over the readback (`features/requests-ranking/update.ts:13` — same dispatcher, read Commands); detail pages are `READBACK_SPECS` |
| Observe | ObserveActivity, ObserveLogs, ObserveRouting, Queues, QueuesConfiguration, Observability, StoreReceipts, Diagnostics | **R** | `features/observe/views.ts`, `s563-pages.ts`, `view.ts:1264-1267,1319-1321` |
| Studio | Studio (5 tabs) | **W** (client), host endpoints absent | `features/studio/routes.ts` + `studio.ts:90-100` POST `/v1/*`; route-inventory rows for studio-* are `requiresHostEndpoint: true` (host 404 is the honest outcome, per s581 context) |
| Learning | Learning + 5 children | **W** (ladder), **R** (evidence/config) | `features/learning-ranking/view.ts:53` toggle → `LearningLadderToggled` → POST `/api/role-model/operator/learning/rollback-pack` (`learning-ranking/model.ts:198-210`); other panels are readbacks |
| Local | LocalChoose, LocalPeers, LocalPeerModels, LocalLlamaSwapModels, LocalSwap, LocalLogs, LocalPolicy | **S** for Peers/PeerModels/LlamaModels/LocalPolicy/Logs; **R** for Choose/Swap | `families-view.ts:342-626`; see section 2 |
| System | SystemPeers, SystemOperator, SystemExtensions, StorageRetention, SessionReadiness, Runtime, RuntimeConfig | **W** (Runtime/RuntimeConfig PUT), **S** (Operator, Extensions, StorageRetention, SessionReadiness), **R** (Peers) | `features/runtime/routes.ts` + `update.ts:406-443` (config save); static pages `families-view.ts:420-545` |
| Integrations | IntegrationsDownstream, IntegrationsUpstream | **R** | `s563-pages.ts:18+`, readback-driven setup contract pages |
| Error | NotFound | **R** | `view.ts:1327+` terminal error page |

## 2. Remaining mock / disabled patterns (measured)

Grep of `src` (`h.Disabled(true)`, `h.AriaDisabled(true)`, `controlButton(..., undefined, h)`, "Preview only", "not wired", dead helper names):

- `controlButton(label, undefined, h)`: **0 current call sites**. The helper still supports the undefined branch (`router-family-view.ts:45-55`), and only one real use exists ("Use as controller", `:597`).
- "**Preview only: these editors and controls are not wired to the runtime yet**" exists once, in `previewDisclosure` (`router-family-view.ts:166-170`) — a **dead helper** (no call site). `textField`/`selectField` (`:57-82`) are also dead, still disabling inputs/selects. They are leftover from the pre-wiring router family (commit f3d700c6 wired the family); they should be deleted so the mock surface is not searchable/quotable.
- Legitimate status-driven disables (not findings): studio Run while loading (`features/studio/routes.ts:36`), endpoint admission while pending/settled with a summary message (`features/endpoint-activation/view.ts:7-39`), router save while saving (`router-family-view.ts:133,388,513`), "Current controller" (`:596`), control action pending (`control-view.ts:162`).
- `control.ts:171` + `control-view.ts:162-163` implement `disabledReason` (disabled button titled with the reason); **no CONTROL_SPECS entry sets it today**, so that path is dormant, not a mock.

Measured dead controls (8-line window, handler absent): `families-view.ts` **14 buttons / 14 inputs**; `view.ts` 3 buttons + 6 inputs that are **unreachable registry children** (familyPage returns the specialised page first, `families-view.ts:46-60`); `features/density/supplements.ts` 3 buttons in a `legacyLlamaModelsSupplement` **dead helper** (`:74-87`); `features/control/routes.ts` `providersRoute`/`endpointsRoute` are **dead duplicates** (imported by `view.ts:30` but the registry uses `families-view` pages), so the shipped Providers/Endpoints page is the families-view one.

Rendered dead controls by page:

| Page | Dead controls | Hardcoded/static content |
|---|---|---|
| LocalPeers | Add endpoint (disabled), Endpoint URL + Auth token inputs | "No peer endpoints configured" copy |
| LocalPeerModels | Register model (disabled), + Add role (disabled), Select all roles (disabled), Model ID input | — |
| LocalLlamaSwapModels | Load model (disabled), All roles (no handler), Model ID input | "roles: coder, architect, …" fixed 28-role string (`families-view.ts:547`) |
| LocalPolicy | Save policy, Reset (no handler), TTL/Max concurrency inputs, auto-unload checkbox | policy JSON falls back to a literal `{ttl:300,maxConcurrency:1,autoUnload:true}` (`:610`) |
| LocalLogs | Refresh (no handler), Auto-refresh checkbox | "No proxy/llama-swap log lines" placeholders |
| StorageRetention | Save policy, Dry-run, Execute plan (no handler), size/age inputs | "Not measured"/"0"/"Idle" stat strip (`:520-545`) |
| SystemOperator | Create Replay, Update Mode, Roll Back Shadow State (no handler), operator token input | "No … recorded" copy |
| SystemExtensions | Pause, Download & validate latest (no handler) | "2291 ticks · running · last degraded: 1 disposition(s)", "fetch failed", "Loading contribution policy…" |
| SessionReadiness | (none) | "complete", "Host health ok", "Authority authoritative", "no blockers", "No alias hint drift warnings" — only `rows.length` read |

Reference comparison for the same pages: peers add (`local-peers.tsx:18,60` `updatePeers`), peer-model register (`local-peer-models.tsx:69-78,151`), llama-swap load/roles (`local-llama-swap-models.tsx:82-113`), retention policy/prune (`storage-retention.tsx`), extension replay pause/resume (`extensions.tsx:258`), operator replay/learning actions (`operator-controls.tsx`), session bootstrap derived from the summary (`session-readiness.tsx:82-129`). So each port "S" page is a regression against a wired reference page, not a design that was read-only by design.

## 3. Write-path verification (message → update → Command → client → HTTP)

| Flow | Message | Update | Command | Client | Request | Wired at app? |
|---|---|---|---|---|---|---|
| Provider create | `ProviderAccountCreateRequested` (`message.ts:125`) | `update.ts:1299-1310` builds the payload, sets saving | `commands.ts:433-445` | `provider-account.ts:223` | **POST `/api/role-model/accounts`** | `app.ts:148` |
| API-key repair | chained from create success (`update.ts:1315-1320`) and `Update API key` (`:1359-1367`) | `update.ts:1401` | `commands.ts:461-473` | `provider-account.ts:232-233` | **POST `/api/role-model/accounts/repair/update-key`** | yes |
| Endpoint activation after save | `ProviderAccountActivationBatch` | `update.ts:1327-1336` (after key) and `:1409-1418` | `commands.ts:419-431` | `provider-account.ts:222` | **POST `/api/role-model/endpoints/batch`** | yes |
| Post-save re-read | `ProviderAccountEndpointsActivated` | `update.ts:1368-1399` reloads catalog, providers, models, endpoints, accounts, control | — | — | — | yes |
| Delete model | `ProviderAccountModelDeleteRequested` | `update.ts:1422-1430` | `commands.ts:447-459` | `provider-account.ts:224-231` | **DELETE `/api/role-model/accounts/{id}/models/{modelId}`** | yes |
| Endpoint admission | `EndpointAdmissionSubmitRequested` | `update.ts:1795-1825` | `commands.ts:530+` | `endpoint-admission.ts:142-143` | **POST `/api/role-model/endpoints` or `/batch`** | `app.ts:149` |
| Router posture | `RouterPostureSaveRequested` | `update.ts:827-841` | `commands.ts:500-512` | `router-config.ts:56-60` | **PUT `/api/role-model/runtime/config`** body `{execution_mode, routing:{mode,pin_weights,scoring_strategy}}` | `app.ts:152` |
| Router blocks | `RouterBlockSaveRequested` | `update.ts:842-851` | `commands.ts:490-498` | `router-config.ts:52-55` | **PUT `/api/role-model/runtime/config`** body `{agent_strategies|workloads, replace_blocks:true}` | yes |
| Runtime config editor | save/confirm | `update.ts:406-443` | `commands.ts:285-304` | `runtime-config.ts:66-69` | PUT `/api/role-model/runtime/config` (read-compare before write, 409 path) | `app.ts:128` |
| Controller | `ControllerSaveRequested` | `update.ts:910-924` | `defineDispatchControl` | `control.ts` clients | control endpoint | `app.ts:127` |
| Studio run | `StudioRunRequested` | `update.ts:459-469` | `commands.ts:306-330` | `studio.ts:90-100` | POST `/v1/chat/completions`, `/v1/images/generations`, `/v1/audio/speech`, `/v1/rerank`, `/v1/responses` | `app.ts:131` |
| Learning ladder | `LearningLadderToggled` | `features/learning-ranking/update.ts:44-70` | learning command | `features/learning-ranking/model.ts:198-210` | POST `/api/role-model/operator/learning/rollback-pack` | `app.ts:150` |
| Local policy | `LocalPolicySaveRequested` | `update.ts:1469-1478` | `commands.ts:606-611` | local policy client | PUT `/api/role-model/local/policy` | wired in app **but the rendered page never dispatches it** (`policySupplement`) |

Contract notes:
- The provider/endpoint clients send `content-type`+`accept` and only add `authorization` when a token is supplied; `app.ts:148-149` supplies none, matching the reference client for these endpoints (`runtime-api.ts:3499-3603` has no operator header on accounts/endpoints calls). Runtime-config and control paths DO receive the stored operator token (`app.ts:128,146,152`), matching the reference's operator-header rule (`runtime-api.ts:1802-1820`).
- Router posture is **narrower than the reference page**: the reference edits scoring weights, the measured-latency override via the learning policy (with policy version and an operator-token reveal) and persists a routing block (`control-routing-strategy.tsx:96-148`); the port offers three selects + an off/on "pin weights" select and a fire-and-forget PUT. No weights editor, no latency policy integration, no token prompt on 401.

## 4. Story / reference coverage and deviations

`test/support/page-stories.ts` captures 40 page stories + 5 studio-tab stories from :3456 at 1806x963 (title, ordered headings, table column sets, named combos, input placeholders, text length).

- **Route tags without a page story (10):** Diagnostics, RequestDetail, RouterDecisionDetail, QueuesConfiguration, IntegrationsDownstream, IntegrationsUpstream, Studio, RuntimeConfig, Dashboard, NotFound. Studio has 5 tab stories, but **no test consumes `STUDIO_TAB_STORIES`** (only `PAGE_STORIES` is imported by s565), so those five captures are dead evidence. Integrations/Dashboard/QueuesConfiguration get title coverage from s567 only, not section coverage.
- **Weak matcher:** s565 accepts a combo if the accessible name *contains* the fixture label OR the fixture text (`s565-page-stories.scene.test.ts:84-89`). The Providers fixture still records the **pre-fix placeholder UI** ("302.AI", "302.AI API Key", "Select a model…"), captured before the provider-catalog repair; the port no longer renders those values, yet the test passes on the label alone. The fixture should be re-captured from the current :3456 build and the matcher tightened to the value.
- The story assertion scope is headings/tables/control labels only; `textLen` and `inputs` are captured but unasserted, so a page can lose most of its body and still pass.
- **Deviations that are intentional and recorded:** the five Studio URLs collapse to `/studio?tab=…` (`legacy-redirects.ts:125-129`); `/router/config` canonicalises to the strategy surface (`router-family-view.ts:549-556`); `/app/local/models` → `/local/choose`; `/app/local/llama-swap/matrix` → `/local/llama-swap/models?view=grid` (the reference `local-matrix.tsx` is itself a redirect to that URL, `local-matrix.tsx:4-6`, and neither build parses `view=grid`, so this is parity, not a gap).
- **Reference pages missing from the port: none.** All 20 legacy-redirect entries + 22 map strings exist (`legacy-redirects.ts:24-79`), and every canonical target parses to a real route.
- Tests that pin the static surfaces: `s540-system-local-density.test.ts:53-56` asserts "28 selected · click to clear" and "Add peer endpoint"; `s563-learningmodelsstudiolocal-layout.test.ts:156-174` asserts the dead local forms; `s565` asserts LocalLlamaSwapModels headings. Any wiring repair must move/update these assertions rather than delete them.

## 5. Requested test run (source tree, not packaged)

Command (from `role-model-router/apps/runtime-ui-next`):
`corepack pnpm exec vitest run test/s383-router-family.test.ts test/s540-system-local-density.test.ts test/s563-learningmodelsstudiolocal-layout.test.ts test/s563-routerobserveconnect-layout.test.ts test/s565-page-stories.scene.test.ts test/s584-router-posture-wiring.test.ts`

Result: **6 files / 97 tests passed**, exit 0.

- s383-router-family 8/8, s540-system-local-density 11/11, s563-learningmodelsstudiolocal-layout 21/21, s563-routerobserveconnect-layout 16/16, s565-page-stories 40/40, s584-router-posture-wiring 1/1.
- Coverage note: s584 (1 test) is the only router-posture wiring proof; there is no equivalent single test for the provider create→key→activate chain (update-level pieces exist, but no test asserts the POST path/bodies end to end).

## 6. REMAINING-WORK, ranked by owner visibility

1. **P0 — LocalPolicy: render the wired page.** `policySupplement` discards it (`features/density/supplements.ts:89`), so Save/Reset/TTL never reach the working PUT. Fix: delete the override (return `base`), re-point s540/s563 assertions at the wired controls, then prove with a mutation on `LocalPolicySaveRequested`. Highest visibility: a page whose tested write path is unreachable.
2. **P0 — SessionReadiness: stop fabricating success.** Replace the hardcoded "complete/ok/authoritative/no blockers" with values derived from `readback.rows`/summary; missing data must read as unavailable (the reference derives it, `session-readiness.tsx:82-129`). This is the only page that currently claims health it did not read.
3. **P1 — LocalPeerModels register-model flow.** Add `PeerModelRegisterRequested` → client → POST (reference `local-peer-models.tsx:69-78`), enable the button only when a peer is ready, assert the POST in a DOM test.
4. **P1 — LocalLlamaSwapModels load/roles.** Wire Load model and All roles to the host load/unload contract (reference `local-llama-swap-models.tsx:82-113`), replace the fixed 28-role string with the roles readback.
5. **P1 — LocalPeers add endpoint.** Wire `updatePeers` (reference `local-peers.tsx:18,60`) and health check; enable the form.
6. **P1 — SystemExtensions / SystemOperator dead actions.** Either wire replay pause/resume, recommendation download, operator replay/evaluation/learning mode (reference pages do) or remove the controls and the hardcoded "2291 ticks/fetch failed" text. Dead action buttons on an operator page read as mock to the owner.
7. **P1 — StorageRetention dead policy/prune controls.** Wire save/dry-run/execute (reference form) or render the readback-only view without inactive inputs.
8. **P2 — LocalLogs refresh/auto-refresh.** Wire the refresh read (the shell already has a refresh subscription) or remove the checkbox.
9. **P2 — Router posture parity.** Add the weights editor + measured-latency override (policy version, token-on-401) or record the reduced scope as an explicit deviation; today the page looks like a working editor but persists only three fields.
10. **P2 — Story coverage.** Capture the 10 missing route stories (especially Integrations*, Dashboard, RuntimeConfig, detail pages), consume `STUDIO_TAB_STORIES` in a test, re-capture Providers after the catalog fix, and assert the fixture value rather than a label substring.
11. **P2 — Dead-code cleanup (mock surface reduction):** `previewDisclosure`/`textField`/`selectField` in router-family-view, `legacyLlamaModelsSupplement`/`legacyPolicySupplement`, `features/control/routes.ts` duplicate routes + the unused `view.ts:30` imports, and the unreachable registry children at `view.ts:1279-1302`.
12. **P3 — Add a provider save path test** (create → update-key → endpoints/batch POST bodies) mirroring s584's style.

## 7. Limits

- No full suite, no packaged/SEA run, no browser journey, no live provider call, no :3456 re-capture; the s565 fixtures are taken as-is.
- Dead-control counts are static (no handler within 8 lines); they do not prove runtime behaviour, and the "S" classification is by source read only.
- The reference build was read as source; no rendered comparison was made here.
