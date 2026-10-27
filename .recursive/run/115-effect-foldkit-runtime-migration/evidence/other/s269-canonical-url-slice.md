# S269 — canonical URL compatibility for existing Foldkit families

Date: 2026-10-27. Implementer: deepseek-official/deepseek-flash (exact model per task), GPT Lead.
Bounded task: `.recursive/run/115-effect-foldkit-runtime-migration/tasks/s269-canonical-url-slice.md`.
Status: bounded product slice complete; no commits, no children, no packaged acceptance.

## Inputs reread

- `REASSESSMENT-AND-EXECUTION.md` (effective Phase 3 plan), `addenda/02-workspace-reference-implementation.md`
  (required Workspace guidance).
- `evidence/other/s262-ui-assessment.md` (R11 gaps), locked `00-requirements.md` R11/R12/R13,
  `01-as-is.md` route-count basis (75 calls = 73 route + 2 index, 20 legacy redirect entries,
  53 canonical leaf patterns, 2 detail patterns, 6 Learning routes).
- Original `role-model-router/apps/runtime-ui/app/routes.ts` and
  `apps/runtime-ui/app/routes/legacy-redirect.tsx`.
- Stable Foldkit navigation/url API: `Navigation.replaceUrl` replaces the current history entry and
  dispatches `foldkit:urlchange` (`vendor/foldkit/packages/foldkit/src/navigation/index.ts:12-17`).

## Scope actually changed (no other product file)

| File | Change |
|---|---|
| `apps/runtime-ui-next/src/legacy-redirects.ts` | NEW: original 20 route entries + 22 map strings, supported target table, missing-target table, typed resolver, `ReplaceLegacyUrl` Command |
| `apps/runtime-ui-next/src/route.ts` | `resolveAppUrl` resolves a supported original URL to the same typed route; `sameRoute` compares route instances |
| `apps/runtime-ui-next/src/init.ts` | initial load resolves the canonical route, emits the redirect Command, and records the exact pending echo href; Studio tab from the canonical URL |
| `apps/runtime-ui-next/src/update.ts` | `ChangedUrl` redirects in-app URL changes, emits exactly one route read, and consumes only the exact pending replace echo; Studio route branch |
| `apps/runtime-ui-next/src/studio.ts` | typed `?tab=` decode (`Schema.decodeUnknownOption`), no free-form tab parsing |
| `apps/runtime-ui-next/test/s269-canonical-url.test.ts` | NEW: inventory/partition/resolution/Command/exactly-once reducer tests |
| `apps/runtime-ui-next/test/s269-canonical-url.scene.test.ts` | NEW: real mounted history/back-forward and route-state tests |

No `model.ts`, `message.ts`, `view.ts`, `control*`, facade, package/budget/integration-test or vendor
change. No dependency bump. No module aliasing: the URL is actually replaced by a Command.

## Supported original URLs (37) + the always-canonical `/`

The original 53 canonical leaf patterns = 51 non-redirect in-app routes + 2 indexes (`/`,
`/app`). `/` already parsed as Index; `/app` is included below. Every row below resolves to the
named real `AppRoute` and replaces the address bar with the bare canonical URL.

| Original `/app` path | Canonical now | Typed route |
|---|---|---|
| `/app` | `/` | Index |
| `/app/studio/chat` | `/studio?tab=chat` | Studio (chat tab) |
| `/app/studio/images` | `/studio?tab=images` | Studio (images tab) |
| `/app/studio/audio` | `/studio?tab=audio` | Studio (audio tab) |
| `/app/studio/rerank` | `/studio?tab=rerank` | Studio (rerank tab) |
| `/app/studio/advanced` | `/studio?tab=advanced` | Studio (advanced tab) |
| `/app/local/choose` | `/local/choose` | LocalChoose |
| `/app/local/models` | `/local/choose` | LocalChoose |
| `/app/local/peer-models` | `/local/peer-models` | LocalPeerModels |
| `/app/local/llama-swap/swap` | `/local/swap` | LocalSwap |
| `/app/local/llama-swap/logs` | `/local/logs` | LocalLogs |
| `/app/local/endpoints` | `/local/peers` | LocalPeers |
| `/app/remote/providers` | `/control/providers` | Providers |
| `/app/system/runtime` | `/runtime` | Runtime |
| `/app/system/runtime-config` | `/runtime` | Runtime |
| `/app/router/controller` | `/control/controller` | ControlController |
| `/app/connect` | `/control/endpoints` | Endpoints |
| `/app/connect/downstream` | `/integrations/downstream` | IntegrationsDownstream |
| `/app/connect/upstream` | `/integrations/upstream` | IntegrationsUpstream |
| `/app/models` | `/models` | Models |
| `/app/models/benchmark` | `/system/benchmark` | Benchmark |
| `/app/router` | `/router` | Router |
| `/app/router/candidates` | `/router/candidates` | RouterCandidates |
| `/app/router/decisions` | `/router/decisions` | RouterDecisions |
| `/app/router/decisions/:requestId` | `/router/decisions/:requestId` | RouterDecisionDetail (ID preserved) |
| `/app/observe/activity` | `/observe/activity` | ObserveActivity |
| `/app/observe/requests` | `/requests` | Requests |
| `/app/observe/requests/:requestId` | `/requests/:requestId` | RequestDetail (ID preserved) |
| `/app/observe/routing` | `/observe/routing` | ObserveRouting |
| `/app/observe/queues` | `/observe/queues` | Queues |
| `/app/observe/store-degradation-receipts` | `/observe/store-degradation-receipts` | StoreReceipts |
| `/app/observe/observability-snapshot` | `/observe/observability-snapshot` | Observability |
| `/app/observe/logs` | `/observe/logs` | ObserveLogs |
| `/app/system/session-readiness` | `/session-readiness` | SessionReadiness |
| `/app/system/peers` | `/system/peers` | SystemPeers |
| `/app/system/storage-retention` | `/system/storage-retention` | StorageRetention |
| `/app/learning` | `/learning` | Learning |

`SUPPORTED_ORIGINAL_PATHS` has 37 entries (35 static + 2 detail patterns); adding the already-canonical
`/` and the 15 missing paths below gives exactly 53 original canonical patterns.

### Runtime semantic decision (inspected, explicit)

There is no separate `/runtime-config` route in the current union. `/runtime` (`AppRoute.Runtime`)
renders both the runtime readback and the Runtime config editor (`src/view.ts:719-737,791`). Both
original `/app/system/runtime` and `/app/system/runtime-config` therefore canonicalize to the one
implemented `/runtime` route. The distinction is preserved in the inventory and asserted in
`s269-canonical-url.test.ts`; it is not a silent alias of an unrelated page.

### Bare-URL decision

Existing bare URLs stay the canonical compatible aliases (`/requests`, `/models`, `/local/*`,
`/observe/*`, `/router/*`, `/runtime`, `/learning`, `/studio`, ...). A bare URL emits no redirect
Command (unit + mounted tests). `/studio` remains the compatible chat alias; the tab is the typed
`?tab=` query alias, so `/app/studio/chat` maps to `/studio?tab=chat`.

## Explicit MISSING original targets (15) — remain NotFound

`MISSING_ORIGINAL_TARGETS` (tracked, never redirected to a generic success page):

| Original path | Reason |
|---|---|
| `/app/learning/configuration` | Learning configuration child panel not implemented |
| `/app/learning/decisions` | Learning decisions child panel not implemented |
| `/app/learning/evidence` | Learning evidence child panel not implemented |
| `/app/learning/history` | Learning history child panel not implemented |
| `/app/learning/packs` | Learning packs child panel not implemented |
| `/app/local/llama-swap/models` | llama-swap model catalogue page not implemented |
| `/app/local/llama-swap/policy` | llama-swap policy page not implemented |
| `/app/local/llama-swap/matrix` | llama-swap compatibility matrix page not implemented |
| `/app/models/roles` | model role eligibility not implemented |
| `/app/router/agent-strategy` | agent strategy editing not implemented |
| `/app/router/config` | router config editing not implemented |
| `/app/router/strategy` | routing strategy editing not implemented |
| `/app/router/workloads` | workload control not implemented |
| `/app/system/extensions` | extensions surface not implemented |
| `/app/system/operator` | operator controls not implemented |

Each is asserted `NotFound` with its unchanged pathname and no redirect Command, and the mounted
`/app/learning/configuration` test additionally proves no Learning read is issued.

## 20 redirect entries / 22 map strings reconciliation

- `LEGACY_REDIRECT_ROUTE_ENTRIES` = exact 20 `routes/legacy-redirect.tsx` entries from the original
  `routes.ts`; `LEGACY_REDIRECT_MAP` = exact 22 map strings from `legacy-redirect.tsx`.
- All 20 route entries are keys of the 22-string map.
- 2 map-only keys: `/app/local/models` (original canonical local-models route; normalizes to
  `/local/choose`) and `/app/router/config` (map target `/app/router/strategy` is missing).
- 16 of the 20 route entries resolve to an implemented target; 4 do not because their target family
  is missing: `/app/local/policy`, `/app/local/matrix`, `/app/control/routing-strategy`,
  `/app/control/roles`. They stay NotFound.

## RED evidence (before production)

- Log: `evidence/other/s269-red-tests.log`. Command:
  `pnpm --filter @role-model-router/runtime-ui-next exec vitest run test/s269-canonical-url.test.ts test/s269-canonical-url.scene.test.ts`.
- **Setup failure, not behavioural RED:** the unit suite failed to resolve `../src/legacy-redirects`
  because the module did not exist yet, so the 52 unit resolver/Command/inventory tests never ran.
  That resolution error must not be counted as behavioural RED.
- **Actual behavioural RED:** the 6 mounted supported-redirect failures showed the original
  `/app/...` mounts staying on `route: { _tag: 'NotFound', path: '/app/...' }` (requests list/detail,
  Studio tab, runtime-config). The 2 passing tests were the negative guards (missing target stays
  NotFound, bare URL untouched).
- No production change was made before this RED run. S272 later ran a separate behavioural RED
  (`evidence/other/s272-red-tests.log`) for the same-route echo and `/studio` alias defects.

## GREEN evidence (after production)

- Log: `evidence/other/s269-green-tests.log`; raw logs under `E:/rm-tmp`.
- Typecheck: exit 0.
- S269 targeted: 60/60 passed (52 inventory/reducer + 8 mounted).
- Affected regression lane (`routes`, `s25b`, `s26b` + S269): 77/77 passed.
- Full package lane (`tsc --noEmit && vitest run && node --test test/*.test.mjs`): exit 0,
  41/41 files, 386/386 tests, 20/20 node invariants.

During the first full run this slice introduced a regression: `update.ts` used the wrapper
`Url` schema's inherited `toString`, producing `/[object Function]` for every native link. That run
is preserved in `E:/rm-tmp/s269-full-app-tests.log` (4 failures: routes + s25b + s26b); the fix uses
the exported `toString` codec (`urlToString`), and the full suite was rerun to the 386/386 + 20/20
green above. This is disclosed, not waived.

## Bounded behaviour proven

- Real mounted browser history: `/app/observe/requests` becomes `/requests` with
  `history.replaceState` (history length unchanged), then back goes to the previous `/` entry and
  forward returns to the replaced `/requests` entry; no NotFound route in the DOM.
- Exactly-once route read: one read Command for the legacy change, and the replace's own
  `foldkit:urlchange` echo consumes the model's exact `pendingRedirectHref` marker with zero
  Commands. A genuine same-route navigation is no longer suppressed (S272 repaired the over-broad
  `sameRoute` shortcut). Mounted fetch counts remain 1 for requests, request-detail and
  runtime-config.
- In-app URL changes redirect through the same path (pushState + real runtime `urlchange` listener),
  not only the initial load.
- Detail IDs and query strings survive: `/app/observe/requests/req-7?window=3600000` ->
  `/requests/req-7?window=3600000`, read Command id `req-7`.
- Studio tab selected from URL and painted by scene/mounted assertions (`images` tab selected,
  tabpanel `aria-label=images`).
- Route title/state data asserted in mounted tests (`Requests`, `Request req-9`, `Studio`,
  `Runtime`; readback `ok` data `m-legacy`), not a parser-only name check.
- No reducer location mutation: `Navigation.replaceUrl` runs in the Command; reducer returns data.
- Native links unchanged: `ClickedLink` still reports the same native URL and pushes it; the
  route/nav shell files were untouched.

## Gaps and honest limits

- This is the first vertical R11 repair, not full R11/R13. The 15 missing paths above stay open for
  later dependent feature slices; no feature was fabricated to inflate coverage.
- No packaged acceptance: source changed, so the Lead must rebuild the packaged artifact before any
  packaged/browser claim. No provider/operator calls and no channel-state writes were made.
- `anti_slop_lint` is UNAVAILABLE in this harness. Equivalent disclosed review is in
  `evidence/other/s269-antislop-equivalent-scan.log`: no new casts/any/unknown/suppression/runtime
  typeof in the new product code; pre-existing casts untouched; positive control matched.
- No commit, branch push, PR, child agent, submodel, or dependency/vendor change.

## S272 correction addendum (authoritative for this report's known errors)

S272 repaired the two P1/P2 defects found by the independent S271 review and corrected this
report. Full bounded evidence: `evidence/other/s272-url-review-repair.md`,
`s272-red-tests.log`, `s272-green-tests.log`, `s272-antislop-equivalent-scan.log`.

1. **Table correction.** The two rows previously marked "same path" are actually:
   `/app/observe/store-degradation-receipts` -> `/observe/store-degradation-receipts` and
   `/app/observe/observability-snapshot` -> `/observe/observability-snapshot`.
2. **RED labelling.** The historical unit failure was a missing-module setup failure, not
   behavioural RED. The 6 mounted supported-redirect failures were the actual RED. The S272 RED
   (`s272-red-tests.log`) is behavioural: 7 failures on the pre-repair source, 84 passes.
3. **P1 repair.** The previous `sameRoute` shortcut suppressed every same-route `ChangedUrl`.
   The model now stores the exact canonical `pendingRedirectHref`; only the first exact matching
   URL change consumes that one echo, every other navigation clears the marker, and a genuine
   same-route navigation reads/resets/resyncs/scrolls as baseline. Changed query, different detail
   IDs/diagnostics, interleaved navigation and stale echoes are covered by tests.
4. **P2 repair.** A bare `/studio` navigation now explicitly resets the Studio tab to `chat`
   (including from `/studio?tab=images`), so the address bar and the selected tab agree. Preserving
   a `?tab=` query is not a claim that filters are applied.
5. **Bounded limitation.** `ChangedUrl` carries only the URL, with no source identity for the
   replace echo. The first exact matching URL change is therefore consumed as the echo. If a
   genuine navigation to that exact href arrived first, its read is delayed until the real echo
   arrives (which then runs the baseline navigation); navigation is not silently dropped.
6. **Lint.** The legacy dictionaries are exact object constants with `Object.entries`-built
   `ReadonlyMap` lookups (no widened `Record<string,string>` or unchecked index reads),
   `searchAndHash` has an explicit return type, and the scene-test JSON body uses a named
   JSON-compatible type. The real `anti_slop_lint` was unavailable; the Lead must run it.
