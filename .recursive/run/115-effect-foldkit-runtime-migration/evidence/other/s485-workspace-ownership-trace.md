# S485 — read-only Workspace feature-ownership trace

Status: READ-ONLY; no product/test/config edits, no commit, no live provider/operator port. The only write is this evidence file.
Snapshot: public HEAD `8a49c5faccea823c7cfd0c070607add8f833635b`; source status for `role-model-router/apps/runtime-ui-next` clean at trace time.
Inputs: `.recursive/run/115-effect-foldkit-runtime-migration/addenda/02-workspace-reference-implementation.md` (authority), `00-requirements.md` R11/R13, `evidence/other/s420-current-state-review.md`, original React source under `role-model-router/apps/runtime-ui/app`, current Foldkit source under `role-model-router/apps/runtime-ui-next/src`.

## Requirement being traced

Addendum 02 requires:

- Definition -> Composition -> Block -> Program feature owners for Observe, Router/Providers/Models/Local/Learning/Studio/Diagnostics/RuntimeConfig; production parent consumes each feature; co-located model/message/update/view/commands/lifecycle; no unused abstract composition credited.
- Child owns interaction state, parent owns canonical URL/query/auth/catalogue/refresh facts, with explicit controlled inputs.
- Typed WorkspaceRepository HTTP adapters with one application-lifetime client-service owner; exact request/fallback/status/headers/signal.
- One RM3 facade over actual vendored `@foldkit/ui` controls, including a **Dialog** and **Listbox**, device-auth modal and native text editing; names/typeahead/arrows/Escape/dismissal/focus-return/disabled/RTL/mobile/reduced-motion; scene AND shipped-browser proof.
- Keyed detail/editor instances and separate baseline/draft/pending-save/revision state.

This trace measures current runtime-ui-next against those obligations, not against route-title presence.

## Current state

### 1. Feature ownership is not present; the architecture is a flat shell

- There is no `src/features/` directory. The full source is a flat module list; see the 35 files under `role-model-router/apps/runtime-ui-next/src`.
- `src/model.ts:17-40` is one global `Model` struct with optional feature states (`deviceAuth`, `providerAccount`, `endpointAdmission`, `learningRanking`, `requestsRanking`, `runtimeConfigEditor`, `studio`) plus all readbacks. No feature owns its own model or lifecycle.
- `src/view.ts:929-1045` is one `routeContent(AppRoute.match)` function taking 15 positional arguments; feature views are either in this file or in `view.ts` helpers. `src/update.ts:208-223` is one `createUpdate` with 15 command parameters and 1,456 lines of transition code. `src/message.ts` is one global message union.
- Some modules separate domain state/clients (`device-auth.ts`, `provider-account.ts`, `endpoint-admission.ts`, `learning-ranking.ts`, `requests-ranking.ts`, `runtime-config.ts`, `studio.ts`), but their messages/update/view/tests are not co-located: device-auth view is `control-view.ts:213-290`, handlers are in `update.ts`, commands in `commands.ts`, tests in `test/s397*`/`s425*`. That is state-module extraction, not feature ownership.
- No per-feature lifecycle/close or feature-scoped resource exists; only the shell refresh stream owns a lifecycle (`refresh.ts:107-222`).

Consequence: the addendum acceptance "Production parent consumes each feature; co-located model/message/update/view/commands/lifecycle" is **not met**, even though many route titles exist.

### 2. Several routes are generic readback projections, not original feature behavior

`renderReadbackPage` (`src/readback.ts:1290`) and `finalFamilyPage`/`learningFamilyPage` (`src/view.ts:881-892`) render rows from one GET; they do not own the original forms, actions, keyed instances, or modal flows. Concrete examples:

- `LocalLlamaSwapModels` is a single readback page (`src/view.ts:994`; spec at `src/readback.ts:1092`). Original `role-model-router/apps/runtime-ui/app/routes/local-llama-swap-models.tsx` loads models, role policy and overrides, then performs load/unload/set-roles/update-overrides actions with per-model pending state. Current code has no load/unload/role/override commands for this route (search: no `llamaSwap`/action client in `src/commands.ts`).
- `ModelsRoles` is explicitly a read-only projection (`src/view.ts:808-852`: "Read-only role eligibility projection...").
- `LocalChoose` is a placeholder paragraph (`src/view.ts:1004`) versus original `routes/local-choose.tsx`, which has peer-backed and llama-swap cards with navigation actions.
- `QueuesConfiguration`, Router family, Observe family, Learning child pages, storage/benchmark/integrations are generic row pages via `renderReadbackPage`; original counterparts (`components/queues-configuration-card.tsx`, `routes/control-routing-strategy.tsx`, `routes/control-runtime-config.tsx`, `routes/observe-queues.tsx`, `components/learning-history-panels.tsx`, etc.) have forms/filters/actions.
- Detail/editor keys are not per actual instance: readbacks are keyed by one route key (`ReadbacksState` in `src/readback.ts`), and there is no keyed editor/draft map for request/entity instances as required by the issueDetail reconciliation row.

### 3. Shared HTTP has no single application-lifetime client-service owner

- `src/app.ts:108-148` constructs at least eight independent clients in `createShellApp`: observability, readback, control, runtime-config, studio, device-auth, provider-account, endpoint-admission, learning-ranking, requests-ranking. Each factory has its own `fetchImpl`/base/token options.
- `src/readback.ts:1215-1225` creates one owner-local in-flight transport for the readback client family, but this is a per-`createReadbackClients` transport, not an application-lifetime service shared by feature commands; explicit comment says "no global/shared-shell transport".
- `src/commands.ts:550-563` bypasses the client family entirely: `localPolicyCommands` calls global `fetch` directly with only accept/content-type headers, no base URL, operator token, or caller signal.
- Result: no one owner for base URL, token, headers, retry/fallback, AbortSignal, or close. Exact request parity is therefore assembled per call site; the addendum's "typed HTTP adapters with one application-lifetime client-service owner" and "resources closed at owner shutdown" are **not met**.
- Partial credit: diagnostics/observability/readback/control clients do accept an injected `fetchImpl` and signal at their own layer, and `readback-flight.ts` coalesces identical pending GETs; that is not the required shared owner.

### 4. Dialog/Listbox obligations are absent

- No source file imports `@foldkit/ui` (zero matches for `@foldkit/ui` in `src`). The vendored package does export `dialog`, `listbox`, `select` (`vendor/foldkit/packages/ui/package.json`), so the required facade is not blocked by missing vendor capability.
- No element uses `Role("dialog")`, `Role("listbox")`, `Role("option")`, `AriaSelected` on listbox options, `AriaActiveDescendant`, or focus-return logic. The only selection controls are native `h.select` at `control-view.ts:342`, `requests-ranking-view.ts:30-31`, and `view.ts:668`; no custom listbox exists.
- Device authorization is an inline form (`control-view.ts:213-290`), not the original modal. Original `app/components/device-authorization-modal.tsx:16-95` uses `<dialog aria-modal="true">`, Escape close, backdrop close, focused dismissal, verification code/link, and is consumed by `app/routes/providers.tsx:5,815-825`. Current Providers route renders the inline form at `view.ts:1016-1021`.
- The original grouped role picker/modal (`app/components/local-model-role-picker.tsx:145+`, 543 lines, used by `routes/local-llama-swap-models.tsx`, `routes/local-peer-models.tsx`, `routes/providers.tsx`) has no current counterpart; current local/peer/providers pages have no role picker.
- The original llama-swap setup hint/modal (`app/components/llama-swap-setup-hint.tsx:19,88` + `llama-swap-setup-modal.tsx`) has no current counterpart; `LocalLlamaSwapModels` is the generic readback page above.
- Accessibility tests only assert accessible names on seven routes (`test/s111-a11y.test.ts:11-14,57-71`); there are no dialog Escape/dismiss/focus-return, listbox typeahead/arrows/disabled/RTL/mobile/reduced-motion, or shipped-browser widget tests.

Consequence: the "one RM3 facade over actual vendored @foldkit/ui controls" row is **not met**, and the modal/focus/keyboard slice of R13 is missing.

### 5. Controlled child state / parent facts are only partial

- `overviewFilters` is typed in the model and used by Overview, and ranking states are optional slices, which is useful partial work.
- But route query/filter facts are not systematically parent-owned: filters for Requests/local families exist only where a readback spec encodes them; there is no typed child OutMessage boundary or per-feature parent/child operation split.
- No test proves back/forward/deep-link restores child filter values while parent owns canonical URL facts, except the URL/route tests around `s269`.

## Missing pieces and bounded repair needs

| ID | Missing piece | Current paths | Bounded repair need |
|---|---|---|---|
| W1 (P1) | Feature owners do not exist; flat model/update/view/message | `src/model.ts:17-40`; `src/view.ts:929-1045`; `src/update.ts:208-223`; `src/message.ts` | Pick ONE family first (addendum F2 suggests RuntimeConfig or Controller; Providers is the next highest-value because it also exercises dialog). Add `src/features/<family>/{model,message,update,view,commands}.ts` and tests; parent imports its view/update and keeps URL/auth/catalogue/refresh facts. Do not create empty abstractions or claim other families. |
| W2 (P1) | Local llama-swap/peer-model feature behavior absent (actions, role picker, setup modal) | `src/view.ts:994`; `src/readback.ts:1092`; `src/commands.ts` (no llama-swap actions) | New local feature slice with commands for load/unload/set-roles/update-overrides, exact paths/methods/body; port `local-model-role-picker` state (grouped selection) and `llama-swap-setup-hint/modal`; tests for action failures/pending per model. |
| W3 (P1) | Device-auth modal and focus/Escape/dismissal absent | `src/control-view.ts:213-290` inline; `src/view.ts:1016-1021` | Build `src/ui/dialog.ts` facade over vendored `@foldkit/ui/dialog`; render device-auth dialog from Providers; wire Escape/backdrop/Dismiss/focus return and code/link actions; scene + browser tests. |
| W4 (P1) | No application-lifetime shared HTTP client owner | `src/app.ts:108-148`; `src/readback.ts:1215-1225`; `src/commands.ts:550-563` | Create one `src/http/runtime-client.ts` service (base URL, token, headers, signal, fallback) constructed once in `createShellApp`; inject into readback/feature commands; replace localPolicy global fetch; tests exact method/path/body/headers/signal and multiplicity; owner close. |
| W5 (P1) | No Listbox facade or actual vendored control adoption | no `@foldkit/ui` imports; native selects at `control-view.ts:342`, `requests-ranking-view.ts:30-31`, `view.ts:668` | Add `src/ui/listbox.ts` over `@foldkit/ui/listbox` (single+multi) and migrate one real consumer; implement names/typeahead/arrows/Home-End/Escape/disabled/RTL/mobile/reduced-motion; scene and shipped-browser proof. Keep native select/story where original used native controls. |
| W6 (P1) | Keyed detail/editor instances and baseline/draft/pending/revision separation absent | one `ReadbacksState`; no keyed editor map | Add keyed model by request/entity id for detail/editor flows; separate loaded baseline, draft, pending save, incoming revision; tests for A/B late results, dirty-refresh retention, conflict reload, double-submit fence with exact PUT/PATCH. |
| W7 (P2) | Feature-scoped tests/resources absent; tests are shell/route snapshots | `test/*` 61 files; no `features/` tests | Each bounded family slice gets story/update protocol, scene/view, client serialization, mounted wire tests; one refresh owner remains `refresh.ts`; feature resources close once. |
| W8 (P2) | Generic readback routes lack original filters/actions/empty/loading distinctions | `src/readback.ts:1290`; `src/view.ts:959-1015` | For each migrated family, replace generic row page with feature view; keep readback state distinctions (denied/stale/dropped/disabled/truncated); add browser tests. Do not add demo-only issue boards/comments. |

## What is already satisfied or partial (do not overclaim)

- Typed route/legacy redirect ownership and URL inventory exist in `src/route.ts`/`src/legacy-redirects.ts` (S269/S458 work).
- One shell-owned refresh subscription exists in `src/refresh.ts:9-13,107-222`; event/revision handling is scoped.
- Readback family has an owner-local pending-GET transport (`src/readback.ts:1218-1223`), useful but not an application-lifetime client owner.
- Some feature domain modules separate pure state/clients (device-auth, provider-account, endpoint-admission, rankings, runtime-config, studio), but their view/update/commands/tests are not co-located.

## Verdict

The Workspace architecture gate is **not satisfied** in runtime-ui-next. The largest concrete gaps are: no feature owners (W1), no shared application-lifetime HTTP client (W4), no Dialog/Listbox facade or modal/focus behavior (W3/W5), and generic readback pages where original local/providers/models behavior and keyed editor flows should be (W2/W6/W8). A bounded repair should start with one feature family plus the shared client/facade, not a wholesale rewrite; stage/prod and route URL ownership must remain unchanged.

No product/test/config code was modified; no test suite was run for this source-only trace.
