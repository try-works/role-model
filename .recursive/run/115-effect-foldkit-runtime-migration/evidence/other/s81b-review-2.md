# S81b second independent review: post-S70 client slices

Read-only. No product edits, no commits. Focus: models page, controller editing, Overview filters, runtime-config editor, Learning surfaces, single-title demotion; tests s71a/s71b/s73a/s75a/s76a/s67a; evidence s71-s80.

The six new test files were run: **50/50 passed** (`.recursive/run/115-effect-foldkit-runtime-migration/evidence/logs/s81b-review-rerun.log`). Passing does not settle the questions below.

## Verdicts

| Area | Verdict |
|---|---|
| Single-title invariant | **Overstated** - it counts one h1 in the document, but the only h1 is the shell title; a route whose own title is missing/renamed still passes |
| Models page / join | **Overstated** - assertions cannot distinguish a correct join from an empty join |
| Controller editing | **Sound** in code and test (re-read is load-bearing); evidence s74 is slightly overstated for the browser |
| Overview filters | **Mostly sound** query mapping; **overstated** on breakdown/source/difficulty coverage and stale breakdown values; model pool is not filtered |
| Runtime-config editor | **Overstated** - happy path works, but a PUT can be based on a stale/empty snapshot and the test never covers it; the save path is unauthenticated |
| Learning surfaces | **Sound** for the captured fixtures and four states; minor fabricated fallback |
| Host write auth | **Broken (critical, pre-existing but now exposed by the editors)** - runtime config PUT, controller PATCH and endpoint POST are outside the operator gate and behind wildcard CORS |

## Findings by severity

### F1 - CRITICAL: the new write surfaces reach unauthenticated host endpoints
The operator gate only covers `/api/role-model/operator/` (`index.ts:17530`). The endpoints the new UI writes are **not** under it:
- `PUT /api/role-model/runtime/config` - `index.ts:18970`;
- `PATCH /api/role-model/controller` - `index.ts:19498`;
- `POST /api/role-model/endpoints` - `index.ts:19955`.

`setCorsHeaders` sends `Access-Control-Allow-Origin: *` and `Allow-Methods: GET, POST, PUT, DELETE, OPTIONS` (`index.ts:16780-16785`) for every non-diagnostics path. So any web page the operator visits can PUT the runtime config (and PATCH the controller) on a reachable runtime without any credential. The runtime-config client does not even send a token (`runtime-config.ts:52-70`), and the E2E/unit tests inject fetch, so none of this is exercised.

This is a pre-existing host gap, not introduced by S76, but the new editor makes it an active, user-facing write path. Either gate those three paths (and keep same-origin loopback trust) or do not expose the editor until they are gated. This is the one thing I would not ship without.

### F2 - HIGH: config editor can send a PUT that is not what the diff showed
`RuntimeConfigSaveRequested` computes the diff against `runtimeConfigSnapshot(model)` (`update.ts:410-417`), and `RuntimeConfigConfirmRequested` sends `current.text` without recomputing anything (`update.ts:419-422`). `runtimeConfigSnapshot` reads `readbacks.runtimeConfig.rows[0].meta` (`update.ts:114-118`).

Concrete failures:
1. **Edit before Load.** The runtime page does not load `runtimeConfig` on entry (`init.ts` loads the `runtime` readback for the Runtime route; `readbackKeyForRouteTag("Runtime")` is `"runtime"`, `readback.ts:1154`). The view falls back to `{}` for both snapshot and textarea (`view.ts:719-722,728`). Type `{"a":1}`, press Review: diff says `added: a` against an empty snapshot. Confirm PUTs `{"a":1}` and replaces the server's whole config, deleting every existing key, none of which the diff showed. The tests always click Load first (`s76a-runtime-config.test.ts:52-61`), so this path is untested.
2. **Server changes between Review and Confirm.** `runtimeConfig` is only re-read by the Load button; a revision/other writer can change the server config while the confirm panel is open. The displayed diff and the PUT body remain based on the old snapshot; the PUT can remove keys added since. There is no test that mutates the host between Review and Confirm.
3. **Load does not reset the editor.** If the user typed before loading, Load refreshes the readback but not `editor.text`/`originalText`; the next Review uses a fresh snapshot against old text (less dangerous than 1, but the UI is inconsistent).
Editing the textarea after Review does clear the confirm state (`RuntimeConfigTextChanged` resets status to editing, `update.ts:405-408`), so the literal "textarea changed while confirm visible" case is guarded - but "snapshot changed" is not.

### F3 - HIGH: models join test cannot fail for a broken join
`view.ts:683-707` joins `configuredModels` with `modelEndpoints` by `endpoint.modelId === entry.id || meta.endpointIds.includes(endpoint.endpointId)`. The test (`s71b-models.test.ts:23-31`) asserts only: rows > 0, and text containing "Provider:", "Endpoint:", "Status:", "Effort:", "Roles:", "unavailable". If the join returns no endpoints for every model, all rows still render with `—` endpoint/status and `unavailable` effort, so the test passes. It also never asserts a specific endpoint id, model id, health value, role name, or row count.

Mutation: make `endpointsForModel` always return `[]`; the six assertions stay green. This is a self-fulfilling test for the join, the exact thing the slice claims to prove.

### F4 - HIGH: single-title invariant only counts the shell h1
`s71a-single-title.test.ts:35-38` waits only until `document.querySelectorAll("h1").length > 0`, then asserts 1. The view has exactly one h1, the shell title (`view.ts:952`); all route content titles are now h2. Therefore:
- a route with no page-specific title (or a renamed/removed content heading) still passes because the shell h1 exists;
- a content h1 rendered after an async state (e.g., loaded page) can appear after the test has already asserted the loading shell and passed;
- the test does not assert the h1 text matches the route, so `/models` could show "Runtime overview" and pass.
The 35-route set is a useful count guard, but "single title" is only proven for the top bar. A mutation that removes every route-specific heading passes all 35 tests.

### F5 - MEDIUM/HIGH: Overview filters - mapping is real, but not all filters are proven, and the model pool is not filtered
The query mapping is correct and reaches the host: `overviewQuery` maps source/status/difficulty/breakdown to `sourceTypes/statusFamilies/difficultyBuckets/endpointIds|modelIds|providerIds` (`overview-filters.ts:29-40`), `OverviewFilterChanged` sends it as `query` (`update.ts:391-399`), and the reader sets `url.search` (`readback.ts:986`). The host query type supports those fields (`index.ts:2908-2921`). The mounted test only proves `statusFamilies=success`; `sourceTypes`, `difficultyBuckets`, and the three breakdown params are unit-tested for string shape, never exercised against the host or in the DOM. s76a itself records "difficulty: not captured with real rows" and "local: 0".

Two concrete client defects:
- **Stale breakdown value.** Changing `breakdown` from endpoint to model keeps the old `breakdownValue` (the handler spreads the previous filters, `update.ts:394-395`); the UI then sends `modelIds=<old endpoint id>` and correctly gets 0 rows while the summary says `Breakdown: model=<endpoint id>`. No test covers a dimension change.
- **Model pool is not filtered.** The Overview model-pool card is built from `routerCandidates` (`view.ts:574-596`), a separate readback of all configured candidates, not from the filtered `/api/metrics/page` body. So a filtered Overview can show models with no rows in the filtered window - contrary to s75a's "charts/cost strip aggregate only returned rows". The latency/token/volume cards use the filtered body; the pool does not.

The summary and period labels are client-derived from the selected filters/window, not from the returned body; if the host ignores a filter, the UI still claims it. That is a "value the host never sent" class issue, though the host currently supports the params.

### F6 - MEDIUM: controller path is sound, but the test's proof is indirect
`ControlActionCompleted` dispatches `readControl({key:"controlController", token})` after a successful PATCH (`update.ts:259-263`); `renderControlPage` displays `state.rows` (`control-view.ts:55-63`), not the PATCH response. The test's harness changes the GET controller to endpoint-c on PATCH, so removing the re-read leaves the old rows and the test fails: the re-read is load-bearing. Good.

Weak spots:
- the test never counts GETs, so it does not directly prove "server-authoritative"; it proves the display changes when the server's GET does. A mutation that sets `rows` from the PATCH response would also pass.
- the notice is built from the PATCH response (`Server assigned <endpointId>`, `update.ts:272`); if the GET disagrees, the notice can name a different endpoint than the displayed current.
- no test covers Save with no endpoint selected; `ControllerSaveRequested` can send `{endpointId:""}` when options are empty (`update.ts:244-249`, `control-view.ts:62`), and there is no validation on the client or test.

The host log `s73a-controller-temp.log` genuinely shows PATCH 200 and a re-read returning the patched endpoint, so the contract claim is supported; the browser steps in s74 are narrative only.

### F7 - MEDIUM: Learning surfaces are honest but one fallback fabricates a state
`parseLearning` (`readback.ts:608-620`) renders "Production activation: disabled" when `productionActivation` is absent, even though the host sent no value. The captured fixture has `false`, so the normal path is honest, but a malformed/legacy body would display a state the host never sent. The test asserts "disabled" against the fixture, not against an absent field. Replay/evaluation rows correctly reject a fabricated `{id}` row (`s67a-learning.test.ts:77-86`). Otherwise the three sections, states and h1 are sound.

### F8 - LOW: the h1/learning tests use the shell title as the route title
Related to F4: `s67a-learning.test.ts:36-37` expects the one h1 to be "Learning". It passes because the shell h1 is route-derived; a change that removes the page heading but leaves the shell h1 still passes. This is acceptable if "single title" is defined as the shell title, but then the content-title regressions are not covered.

### F9 - Evidence support
- **s74-controller-verified.md**: the host contract is supported by `s73a-controller-temp.log` (PATCH 200, re-read shows the patched endpoint, restored). The claim "verified end-to-end in the browser" is **not** backed by a recorded browser step/screenshot; the UI behavior is backed by the test harness, and the recorded log is a host script. Also the narrative says the readback switched to "modelId claude-3.7-sonnet", while the UI's Current line reads the endpoint row, not modelId (`control-view.ts:58`). Verdict: host contract supported; browser claim overstated.
- **s78-config-editor-e2e.md**: **overstated/unsupported by recorded artifacts.** No log, script, screenshot, or raw request/response is stored for the claimed UI flow; `s76a-tdd.json` explicitly records the temp host as "NOT RUN"; there is only the narrative and a claimed direct PUT restore. The editor flow is covered by the injected-fetch test, not by a real host. Either store the actual browser/PUT transcript or mark it unproven.
- **s79-r16-refreshed.md**: "Overview filters closed" overstates: only Status was exercised in the browser; difficulty was not captured with real rows; source local had 0 rows; breakdown values are unit-only. "Runtime-config editor closed and E2E-proven" relies on s78's missing artifact.
- **s71a/s71b/s72**: s71a RED (9 routes with 2 h1) is plausible and the count test exists; s72's models claim is stronger than the test (F3).
- **s80**: accurately records the remaining lockfile/toolchain gap; fonts are repo-owned now (`build.mjs` copies `../runtime-ui/public/assets/fonts`), which fixes the earlier packaging finding.

## Three most important repairs

1. **Gate the three write endpoints** (`/api/role-model/runtime/config` PUT, `/api/role-model/controller` PATCH, `/api/role-model/endpoints` POST) behind the same operator authorization as `/api/role-model/operator/`, or keep the write editor disabled until they are. Add a host test that an unauthenticated cross-origin PUT/PATCH is rejected; add a token option to `createRuntimeConfigClient` so the guarded client can authenticate.
2. **Make the config editor diff truthful.** Do not allow Review/Save before a successful Load; show "not loaded" instead of `{}`; recompute the diff at Confirm and refuse if the readback/host snapshot changed since Review; send a diff (or re-read/verify) rather than an unchecked full-body PUT; add tests for edit-before-load, server-change-between-review-and-confirm, and an absent/rejected Load.
3. **Strengthen the tests that currently cannot fail for the claimed defect:** make the models test assert at least one exact endpoint id, health, role and row count with a broken-join mutation (always-`[]`) failing; make the h1 invariant assert the route's own title text (and wait for the settled state); make the filter test exercise source, difficulty and a breakdown dimension change, and build the model pool from the filtered body or label it as unfiltered.

## Method

Read the six tests, `view.ts`, `update.ts`, `readback.ts`, `overview-filters.ts`, `runtime-config.ts`, `control-view.ts`, `init.ts`, `app.ts`, host write handlers and gate (`index.ts:16780,17530,18970,19498,19955`), and the evidence s67-s80. Ran the six test files: 50/50 pass (`s81b-review-rerun.log`). Did not re-run the full client or host suite. No product files edited.
