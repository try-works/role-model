# S262 UI assessment — R6–R14, R21 (read-only)

Status: complete, read-only. No product source, tests, goals, or provider credentials were touched.
Output scope: this file only.

## Inspected revision and limits

- Public worktree `D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration`, branch
  `recursive/115-effect-foldkit-runtime-migration`, HEAD `9ac82847af56b3360fd423361d78253c8b78ae14`
  (`test(ui): restore integration coverage lost in scene conversion`).
- Locked diff basis is `00-worktree.md`: public baseline `f0d50fab083e3fe8daf2474cd9fb08b51066c8e1`.
  `git diff --stat` shows only S258/S260-owned test edits: 7 modified files under
  `apps/runtime-ui-next/test/` plus untracked `test/support/runtime-shell.ts`. No product `src` change
  is present in that working diff. S260 may still edit those owned test files, so test counts can move.
- Paired private worktree and S259 private repair were not inspected; no private content is included.
- Read order followed: `00-requirements.md`, `source-proposal.md` §4–§9, `owner-scope-decision.md`
  (E1/E2 only), `00-worktree.md`, `01-as-is.md`, `02-to-be-plan.md`, `implementation-slices.md`,
  `FINAL-STATUS.md`/`03-implementation-summary.md` as historical leads, `s258-coverage-repair.md`.
- Targeted verification only (no full suite): route/readback `routes.test.ts` + `s26e` 53/53;
  Foldkit graph closure 16/16; vendor pin tests 12/12; chart primitive 17/17; RM3 primitives 19/19
  with explicit `--environment happy-dom`; `runtime:parity --request-selfcheck` 10/10.
  `runtime:parity --selfcheck` exits 2 `NOT_RUN`.

## Bottom line

- R6/R7 vendored pins and wrapper graphs are real and fresh. R8–R10 are partial component/chart slices.
- R11 is not route-compatible with the original client: **none of the 53 legacy canonical `/app/*` URLs
  resolves except `/`**, and the 20 legacy redirect entries are not implemented.
- R12 has one owned refresh subscription and gap resync, but loses `telemetry.update` and issues
  duplicate production reads (notably the same runtime-summary path twice).
- R13 is far from the full inventory: 16 route modules and 22/24 components are absent, and many
  “verified” rows are generic readback lists, not the original forms/control/device-auth surfaces.
- R14 is a pure comparator foundation, not the required dual-build pixel/structure/network/selfcheck lane.
- R21 is a creditable server + Foldkit state-machine slice; packaged real read and mobile/focus remain open.
- S258 repair is effective for its scope (exact Studio request shapes and restored integration assertions)
  but does not change any of the route/parity conclusions above.

## Requirement table (assigned rows only)

| R# | Requirement clause (short) | Actual implemented surface/caller | Source / test evidence | Lane / freshness | Remaining work | Status |
|---|---|---|---|---|---|---|
| R6 | Pin Foldkit/UI/oxlint, wrappers/exports/declarations, untouched upstream, no Vite plugin | `vendor/foldkit` 2,020 files at `7ee21426`; wrappers `foldkit`, `foldkit-ui`, `effect-platform-browser` expose 37/30/18 subpaths; no Vite plugin | `vendor/foldkit/VENDORED.json`; `packages/foldkit/test/graph-closure.test.mjs:26-63`; `scripts/foldkit-vendored.test.mjs` | Fresh Foldkit pin 6/6; graph 16/16; no packaged browser | App-level browser import smoke; oxlint preset is vendored but not wired into repo lint | VERIFIED-SLICE |
| R7 | Crease Tailwind first, Foldcn only with justified gap, untouched snapshot separate from adapted ledger | `vendor/crease` 1,512 files at `bb447e36`, MIT/provenance/digest; no selected-file/adaptation/dependency/owner ledger; no Crease import in a build; Foldcn absent with no documented gap decision | `vendor/crease/VENDORED.json`; `PROVENANCE.md`; `scripts/crease-vendored.test.mjs:84-150`; `packages/ui/src/foldkit-chart.ts:36-40` | Fresh pin 6/6; no adapted component compile/browser test | Selection and adaptation ledger; target-version compile/state/browser checks; explicit Foldcn decision | PARTIAL |
| R8 | Single role-model facade/owner, RM3 tokens/Geist/geometry, keyboard/focus/RTL/disabled/reduced-motion, `cn` semantics | Button/checkbox/input/textarea/chart primitives exist; route code still uses raw `h.select`/`h.input`/`h.textarea`; theme toggle imports `@role-model-router/foldkit-ui/button` beside `@role-model/ui/foldkit-button`; button joins classes with a space, not `cn` | `src/view.ts:1-3,573,645-656,730,972-980`; `packages/ui/src/foldkit-button.ts:133-137`; `packages/foldkit/test/s12b-*`, `s12c-*`; `src/test/s111-a11y.test.ts:11-14` | Primitives 19/19 with explicit `--environment happy-dom`; package script runs only graph closure; a11y names on 7 routes | Put all route fields behind one facade; port select/typeahead/modal; RTL/reduced-motion/overlay tests; decide `cn` replacement | PARTIAL |
| R9 | Real time-series/ranking pilot, exact values/units/axes/buckets/formats/states/HTML alternative, live/range/theme/resize, no React | Pure-SVG time-series + model cost strip; units/buckets/table and window-switch stale suppression; primitive supports states/legend/tooltip/theme/multi-instance, but the route passes no interaction and always `{status:"ready"}`; no ranking chart; no ECharts/canvas; no resize/live-update path | `src/view.ts:548-638,627-637`; `packages/ui/src/foldkit-chart.ts:36-40,294-360,443-509`; `packages/ui/src/foldkit-chart-interaction.ts` used only by `s13e`; `s40b-overview.test.ts` | Chart primitive 17/17; overview DOM tests; no browser | Wire legend/tooltip/point interactions; ranking pilot; per-chart stale/partial/truncated/unsupported states; live update and resize; prove built client has no React | PARTIAL |
| R10 | Mount/unmount/partial acquire/observer/frame/font/registry/multi-instance, bounded captures, chart-only approvals | Pure SVG avoids canvas; multi-instance, theme, determinism tested; no ResizeObserver, frame, font-ready, DPR/timezone, heap, unmount, or bounded-capture path in source/tests | `packages/ui/src/foldkit-chart.ts:40`; `s13b-foldkit-chart.test.ts`; `s13e-chart-interaction.scene.test.ts:182-217`; no `runtime-ui-next/e2e` | Primitive 17/17; lifecycle lane NOT RUN | Choose SVG-lifecycle policy or ECharts mount adapter; add hidden/zero-size, repeated mount/unmount heap, font/canvas/DPR/timezone browser tests and bounded captures | PARTIAL |
| R11 | All actual routes/redirects, typed parse/build, deep links, history, not-found, shell/theme/submodels/focus | New union has 35 cases (34 routable, 58 literals) at root paths; only `/` matches legacy; 20 legacy redirect entries / 22 map paths exist, but new client replaces one with a direct `LocalChoose` parse and has no redirect Command; nav hrefs are string literals; no parent auth/device state | `src/route.ts:19-55,130-171`; route probe below; `apps/runtime-ui/app/routes/legacy-redirect.tsx:3-26`; `apps/runtime-ui/app/routes.ts`; `src/model.ts:11-24`; `s26b-wave1.test.ts:53-170` | 53/53 route+s26e; new-path history/title/focus/scroll pass; no legacy lane | Serve `/app/*` or redirect it; implement all 20 redirects as Commands; typed link builders; auth/device parent facts; stale route-instance tests | PARTIAL |
| R12 | Exact request/fallback/error semantics, no duplicate fetch/listener, one refresh owner, gap/snapshot resync | One persistent refresh subscription and stale/gap resync; but it listens only to `revision.update`, losing `telemetry.update`; production rail loads `runtimeSummary` and `health` from the same path on every route, and on `/models` loads `models` and `configuredModels` from the same path; no React-vs-Foldkit request trace | `src/refresh.ts:61-86` vs `apps/runtime-ui/app/lib/runtime-api.ts:3016-3030`; `src/init.ts:175-187`; `src/runtime-endpoints.ts:18-19`; `src/app.ts:116`; `src/s25b-refresh-owner-gap.test.ts:100-160`; `s26e-readback-routes.test.ts:368-441` | Gap/resync tested; targeted 53/53; no request-parity lane | Add `telemetry.update`; dedupe rail endpoints per route; preserve original fallbacks; run source-QA React vs Foldkit request logs | PARTIAL |
| R13 | Every inventoried read/control/write/heavy/learning/studio route/component, modals/palette/media/device auth, maintained state/mobile/theme journeys | 34 route surfaces; 16 legacy route modules and 22/24 components absent per inventory; only 20 routes in the rendered audit; readback pages are generic success/empty/loading/error lists; control pages are read-only plus one action; no provider form, device auth, or modal; Studio sends 5 request shapes; Audio sends only speech; Learning is 3 lists | `evidence/other/s26a-route-inventory.json:32-53`; `scripts/runtime/audit-rendered-ui.mjs:29`; `src/view.ts:684-736,751-840`; `src/control-view.ts:50-108`; `src/studio.ts:68-88`; original `providers.tsx:1026,1180-1346,1373-1376,1597-1600`; `device-authorization-modal.tsx:25-47` | 20-route browser audit; targeted readback 53/53; no Foldkit e2e/mobile/theme journeys | Complete route waves; restore provider/model/endpoint write forms and device-auth card+modal; broad Studio/learning/heavy surfaces; per-route mobile/theme/denied/degraded states | PARTIAL |
| R14 | Separate mock/source-QA/packaged lanes, React selfcheck 0 diff, mutation sensitivity, deterministic double run, bounded readiness, dual-build pixels/structure/network | Pure request/target/structure comparators and a CLI; `--request-selfcheck` runs 10 controls; full `--selfcheck` returns NOT_RUN; no capture adapter, React baseline, pixel/ARIA comparator, mutation/double run, or packaged React-vs-Foldkit lane; CI runs comparator unit tests, not the dual-build command | `packages/ui-parity/README.md:11-19`; `scripts/runtime-parity.mjs:4-14`; `packages/ui-parity/src/structure.ts:2-4,121-122`; `package.json:41-43` | Request controls 10/10; `--selfcheck` exit 2 NOT_RUN | Implement DOM/style/accessibility/pixel capture adapter; React-vs-React and mutation/double-run; packaged dual-build lane and CI wiring | PARTIAL |
| R21 | Authorized bounded local query + Foldkit page, peer/trust/credential/Host/Origin/redaction, identity/loss/cursor, denied/stale/drop/empty/disabled/mobile/focus, no fiber dump | Server read path with bounded body, identity, loss, cursor, 5 states, forwarded-owner rejection, Host/CORS rejection; `/diagnostics/:id` page renders all states with loading/denied/build identity; no fibers; production source defaults disabled; no explicit redaction test; UI tests are happy-dom | `local-diagnostics-read.ts:20-23,25-34,38-44`; `run115-s15a-local-diagnostics-read.test.ts:76-356`; `src/diagnostics.ts:32-65`; `src/view.ts:337-411`; `test/diagnostics.test.ts`, `diagnostics-e2e.test.ts` | Server+state suite exists; not rerun here; packaged browser/real read NOT RUN | Wire production source (R20 decision); packaged/mobile/focus run; explicit redaction test; retain observability/degradation pages | VERIFIED-SLICE |

## Route completeness: 53 ≠ 34 ≠ 20 ≠ 51

- Locked AS-IS records **53 canonical leaf URL patterns**, 20 legacy redirects, 2 detail patterns and 6
  learning routes (`01-as-is.md:52`). The plan repeats the same 53/20/2/6 target
  (`implementation-slices.md:93`).
- The Foldkit union has **35 cases including NotFound**, i.e. 34 routable paths
  (`src/route.ts:19-55,130-166`). The rendered audit covers **20** routes
  (`scripts/runtime/audit-rendered-ui.mjs:29`). The route inventory counts **51 source modules**,
  not 53 URL patterns (`s26a-route-inventory.json:32-53`). These are four different measures.
- Legacy-path probe against the real parser (`routeFromUrl` with `fromString`):
  `/app` → `NotFound`, `/app/observe/requests` → `NotFound`, `/app/models` → `NotFound`,
  `/app/studio/chat` → `NotFound`, `/app/learning/packs` → `NotFound`,
  `/app/local/models` → `NotFound`; only `/` → `Index`, and `/models`, `/studio`, `/learning`,
  `/local/models` resolve under the **new** paths.
- The inventory’s “verified” rows claim legacy paths (`/app/models`, `/app/learning/*`, …), but the
  named proof tests mount the new bare paths (`s71b-models.test.ts:9` mounts `/models`; `s67a-learning`
  mounts `/learning`; `s26n-rows` mounts `/local/models`). The inventory test checks row/file/host
  coverage, not legacy-vs-new URL parity (`s26a-route-inventory.test.ts:127-179`).
- Capability collapse (Studio 5→1, Learning 6→1) can be legitimate, but it does not satisfy explicit
  deep-link and redirect preservation. The host serves `index.html` for non-API navigation
  (`runtime-host-bridge/src/index.ts:20398-20414`), and the client then falls back to NotFound
  (`src/route.ts:168-171`), so legacy bookmarks render the not-found page.

## Concrete missing behavior

- **Providers / device auth.** Original `/app/remote/providers` has a setup form
  (`providers.tsx:1026,1180-1346`), device-authorization card (`:1373-1376`), polling/start calls, and
  an Escape-dismissable `aria-modal` dialog (`device-authorization-modal.tsx:25-47`). New
  `/control/providers` is a GET list plus `POST /accounts/repair/reconnect` only
  (`control.ts:49-56,187-203`); no `/accounts/device/start|poll`, no form, no modal.
- **Endpoints / connect.** Original `/app/connect` is the connect/account surface; new
  `/control/endpoints` is a readback plus a deliberately disabled activate action
  (`control.ts:207`; `control-view.ts:90-108`).
- **Models / roles.** Original `/app/models` includes model role-eligibility and benchmark-preview surfaces
  (`control-models.tsx:18,321,404`); new `/models` is a read-only list (`view.ts:684-708`), and
  `/app/models/roles` is absent.
- **Studio / media.** New `/studio` has 5 tabs and exactly 5 request shapes: chat, image generation,
  audio speech, `/v1/rerank`, `/v1/responses` (`studio.ts:68-88`). It does not implement audio
  voices/transcriptions, `/v1/reranking`, `/v1/messages`, `/v1/messages/count_tokens`, or
  `/v1/embeddings` (the inventory’s own host-endpoint list). S258 explicitly leaves broad
  audio/advanced/rerank endpoints unverified (`s258-coverage-repair.md:34-38`).
- **Learning.** One `/learning` page renders knowledge/replay/evaluation readbacks
  (`view.ts:711-717`); the original six route ids and configuration/packs/history/evidence panels are
  not routed or ported.
- **Heavy / control.** `/system/benchmark` and `/system/storage-retention` are generic readback pages
  (`view.ts:779-780`); no benchmark run/edit or retention action. `control/roles`, routing strategy,
  agent strategy, workloads, extensions, operator, local policy/matrix/models, and workbench are absent
  from the route union.
- **Modals / palette.** No device-auth or llama-swap modal exists in the Foldkit app. The legacy
  inventory has **zero command palette** entries (`s26a-route-inventory.json:1268`), so palette is not a
  real missing legacy behavior; do not invent one.
- **Charts.** The only route charts are the overview’s pure-SVG time-series plus a cost strip. They are
  always rendered `ready`; no chart-level loading/error/stale/partial/truncated/unsupported states, no
  ranking chart, no legend/tooltip interaction wiring, and no resize/observer/lifecycle path.
- **Keyboard / responsive.** Studio tabs support Home/End/ArrowLeft/ArrowRight (`update.ts:448-453`) and
  the shell has a skip link/focus rings; there is no typeahead/combobox keyboard contract, no modal
  Escape/focus trap, no RTL test, and only 20 routes are checked at 1440/390
  (`s182-rendered-ui-audit.md`, `scripts/runtime/audit-rendered-ui.mjs:29`).

## `runtime:parity` truth

`runtime:parity --request-selfcheck` is a **pure request-comparator self-check**, not a dual-build run.
`runtime:parity --selfcheck` returns `{status:"NOT_RUN", reason:"react-capture-runner-unavailable"}` and
exits 2 (`scripts/runtime-parity.mjs:4-14`). `structure.ts` is an explicit pure comparator whose own
header says the adapter owns DOM/browser/pixel/React self-check (`structure.ts:2-4,121-122`). No capture
adapter, pixel/ARIA comparator, React baseline, mutation check, deterministic double run, or identified
packaged React/Foldkit lane exists. CI invokes comparator unit tests through `runtime:test-critical`, not
`runtime:parity` (`package.json:41-43`). Therefore R14’s “dual-build deterministic pixels/structure/
network/selfcheck” is **not implemented**; only the request/structure comparators and 10 request controls
are real.

## Invalid or stale blockers / scope drift

- **Foldkit upstream preview is not an R27 prerequisite.** `FINAL-STATUS.md:28-36` treats Foldkit
  Phase 3 (Blocks/Effect Layers, PR #1655) as the path to R27’s closed Layer DAG. No backend import of
  Foldkit exists; R27 is host composition. Keep Foldkit preview adoption optional and sequence it after
  the UI requirements; do not block backend R27 on it.
- **“20 rendered routes × 2 viewports” is not complete UI acceptance.** It covers 20 of the 34
  Foldkit paths and does not exercise any legacy `/app/*` URL (53 canonical patterns), redirects,
  states, or legacy deep links.
- **D-vs-C “7 same/2 environment” is not R14 parity.** It is a release comparison on selected surfaces,
  not React-vs-Foldkit packaged pixel/network/structure parity.
- **Stale “absent” labels.** The inventory marks request-detail and decision-detail absent, but the
  routes exist (`/requests/:requestId`, `/router/decisions/:requestId`); they are generic readback and
  unproven with real IDs. “Models missing” from `s70b` is also stale: `/models` exists, but is read-only.
- **Stale “R21 not started.”** The server read path and the `/diagnostics/:id` state machine exist and
  are tested; the remaining gap is production enablement and a packaged browser run.
- **S258 is test-hygiene evidence, not adoption.** Its 326-test/27-click-budget repair restores exact
  Studio request assertions and is effective, but it does not close the 53-route, redirect,
  device-auth, form, or parity gaps.

## Next vertical slices, ranked by critical path

| # | Slice | Owned write scope (disjoint) | Depends on | Concrete RED → GREEN |
|---|---|---|---|---|
| 1 | Legacy route + redirect closure (R11) | `src/route.ts`, new `src/legacy-redirects.ts`, `src/init.ts`, `src/update.ts`, `test/routes.test.ts` | Shell/runtime only | RED: probe all 53 canonical `/app/*` URLs plus 20 redirect paths; expect typed route or redirect, not NotFound. GREEN: every legacy URL resolves/redirects with history replace, title/focus preserved; typed link builder used by nav. |
| 2 | Request/refresh parity (R12) | `src/refresh.ts`, `src/commands.ts`, `src/readback.ts`, `src/runtime-endpoints.ts`, `src/update.ts` | Slice 1 owns `update.ts` first | RED: emit `telemetry.update` and assert exactly one refresh; count production GETs for runtime-summary/models and assert one each; compare fallback/error against React baseline. GREEN: one subscription, exact request trace, no duplicate endpoint. |
| 3 | Control/write/device-auth/facade completion (R8/R13) | `src/control.ts`, `src/control-view.ts`, new `src/device-auth.ts`, provider/model/endpoint sections of `src/view.ts`, `packages/ui/src/foldkit-*.ts` | Slices 1–2 | RED: provider form POST, device start/poll, modal Escape/focus, role eligibility save, endpoint form; assert exact method/path/body. GREEN: forms and modal wired through the one facade; state/a11y/RTL/reduced-motion tests pass. |
| 4 | Chart interaction + lifecycle (R9/R10) | `packages/ui/src/foldkit-chart.ts`, `foldkit-chart-interaction.ts`, new `src/overview-view.ts` (extract from `view.ts`), chart browser tests | Slice 2 data path | RED: ranking chart, legend/tooltip/point interaction, per-chart states, hidden/zero-size resize, repeated mount/unmount heap, font/DPR/timezone. GREEN: browser lifecycle tests and bounded captures; approved chart deltas recorded separately. |
| 5 | Dual-build parity harness (R14) | `packages/ui-parity/src/capture-*.ts` (new), `scripts/runtime-parity.mjs`, `apps/runtime-ui-next/e2e/*`, CI wiring | Slices 1 and 4 for stable routes | RED: React-vs-React 0 diff, mutation check, two identical runs, unmocked endpoint/console checks. GREEN: packaged React/Foldkit run with deterministic freeze/readiness; non-chart pixel/structure/network diff zero. |

## Recommendations

1. **Do slice 1 before any more route styling.** The current 20-route audit cannot be a completion gate
   while `/app`, `/app/models`, `/app/observe/requests`, `/app/studio/chat`, and `/app/local/models`
   are NotFound. Add a maintained legacy-route test that asserts all 53 patterns and 20 redirects.
2. **Fix R12 before adding route waves.** The production rail currently fetches the same runtime-summary
   path twice (`runtimeSummary` + `health`) and the same models path twice on `/models`
   (`models` + `configuredModels`). Add `telemetry.update` to the one refresh stream and assert exact
   multiplicity; otherwise parity will compare a client that fetches differently from React.
3. **Make the control/device-auth slice the next product wave.** Use the already-vendored
   `@foldkit/ui/dialog`, select, and field primitives behind `@role-model/ui/foldkit-*`; do not leave raw
   `h.input`/`h.select`/`h.textarea` in route code or import `@role-model-router/foldkit-ui/button`
   beside the RM3 button. Restore provider form, device start/poll, modal Escape/focus, and model role
   eligibility with exact request assertions.
4. **Do not mark R13/R14 done from render counts.** Replace the 20-route audit with the 53-route matrix
   (plus states/mobile/theme) and build the actual parity capture adapter before claiming parity.
5. **Remove the Foldkit preview blocker from R27.** R27 is backend composition; keep Foldkit PR #1655
   as optional UI follow-up only.
6. **Promote the primitive/chart test lanes.** The RM3 scene suite needs an explicit happy-dom config or
   script; `packages/foldkit/package.json:210` runs only graph closure, so the 19 scene tests are not a
   maintained package lane. Add the chart/overview browser lane at the same time.
7. **Keep S258 repairs and extend their shape.** The exact Studio method/path/body assertions are the
   right pattern; apply the same exact-request/negative-assertion style to every new form and redirect
   slice, and do not treat the current 326-test count as adoption evidence.
