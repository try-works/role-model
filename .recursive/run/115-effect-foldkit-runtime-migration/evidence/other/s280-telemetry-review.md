# S280-A — independent cross-review of frozen S278 telemetry refresh

- Reviewer: native teammate `s9-private-readonly`, actual model **deepseek-flash** per `list_agents` (not assumed). Read-only: no product/test edits, no commits, no children, no CLI, no full suite.
- Frozen inputs verified by hash (SHA-256 / bytes):
  - `src/message.ts` `3B5540B924571A209D7042F49EA8A76D2B7998D7D6C98F75F3A604312A90C5A6` / 7673
  - `src/refresh.ts` `A48BE129D57B2FB661F5E448EE6FE51F6E90D001B366400A9D350B39655981BC` / 5455
  - `src/update.ts` `1F451AE71943B04373402927155D1A3F8506FBDF5FE27496FD2A6F4F47E643A2` / 33155
  - `test/s278-telemetry-refresh.test.ts` `C45BC893D752B70FE7B5DD493B2D89947383D9C2BB85754F0A210C899001B5ED` / 15853
- Verdict: **HOLD (bounded)** — the telemetry event/decode/watermark/fencing/lifetime contracts pass, but a real observable Dashboard/Overview invalidation defect is present in the frozen bytes (inherited from the revision path and now newly reachable from telemetry events). No product edit made.

## Defect (HOLD): Index/Dashboard invalidation drops the selected window/filter query

- **Index route is `overviewMetrics`:** `readbackKeyForRouteTag("Index") === "overviewMetrics"` (`src/readback.ts:1169-1170`). Its real read is `/api/metrics/page?windowMs=<window>` (`overviewMetrics.pathFor`, `src/readback.ts:917-919`), initialised with `id: "86400000"` for the rail (`src/init.ts:198-202`), and the user's live selection is carried as `query: overviewQuery(filters, windowMs)` on `SelectedOverviewWindow`/`OverviewFilterChanged` (`src/update.ts:493,503`).
- `src/update.ts:281-305` `invalidateCurrentRoute` issues `readReadback({ id: detailId, key: readbackKey, token })` (`:290`) with **no `query`**. `detailId` is set only for `RequestDetail`/`RouterDecisionDetail` (`:285-288`), so for Index it is `undefined` and `pathFor(undefined)` produces `?windowMs=` (empty), losing the selected window and filters.
- The real route reads carry the user's selection: `overviewMetrics` is read with `query: overviewQuery(filters, windowMs)` (`update.ts:493,503`, window/filters from `model.overviewWindowMs`/`model.overviewFilters`); Dashboard is loaded with `id: "86400000"` (`src/init.ts:198-202`).
- Specs use `id` as the window: `overviewMetrics.pathFor = (windowMs) => "/api/metrics/page?windowMs=" + ...` (`src/readback.ts:917-919`) and `dashboard.pathFor` (`:760-762`). With the invalidation's `id === undefined`, the re-read becomes `?windowMs=` (empty query) and loses `SelectedOverviewWindow`/`OverviewFilterChanged` request fields.
- This is copied from the revision handler (`update.ts:637,683`), so it is **pre-existing for revision refresh**, but S278 makes telemetry events trigger it too (new event source → broader observable exposure). The S278 test covers only `Requests` and has no Dashboard/Overview invalidation row, so the gap is unpinned.
- Expected direction (not applied by me): carry `id`/`query` for Dashboard/Overview from the model in `invalidateCurrentRoute` (same fields the real reads use), so telemetry/revision invalidation preserves the selected window/filter request.

## PASS items on the frozen bytes

- **Producer wire contract (real, not fabricated):** `role-model-router/apps/runtime-host-bridge/src/index.ts:26186-26204` emits `{ eventName: "telemetry.update", emittedAtMs: Date.now(), request: <enriched persisted record>, summary }`; telemetry stream listeners receive it. The decoder matches exactly: eventName literal `telemetry.update`, `emittedAtMs` a safe integer, `request.requestId` non-empty (`src/refresh.ts:50-77`). No revision is invented; `RuntimeTelemetryReceived` carries only `{ emittedAtMs, requestId }` (`src/message.ts:109-112`).
- **Malformed rejected:** JSON failures, non-objects, wrong eventName, string/fractional/Infinity timestamps, missing/empty requestId all decode to `null` and emit nothing (`refresh.ts:57-77`; test `:234-275`).
- **Watermark/gap untouched:** the telemetry handler (`update.ts:734` → `:281-305`) writes no `refresh` fields; the test drives the real stream+reducer and asserts `lastAppliedRevision/resyncToken/status/message` unchanged (`:181-184`, `:331-345`).
- **Current-route re-read via real client:** the test executes the emitted Command's Effect with the real `createReadbackClients` and an injected fetch, asserting exactly one GET to `/api/role-model/telemetry/requests` and the applied readback rows (`:192-203`).
- **Pending old results fenced by per-key token:** away/back re-issues with a new token; the stale result does not apply (`:277-311`). Inherited limitation (per-key token, not route identity) is recorded in the test, not hidden.
- **Single source / close once / post-disposal non-publication:** one factory call, one close; retained post-close callbacks are guarded by the stream's own `active` flag and produce nothing (`refresh.ts:93-131`; test `:351-382`).
- **No false success:** telemetry invalidation never marks `live`; `ReadbackLoaded` auto-live on any non-error snapshot remains the pre-existing shared behaviour (`update.ts:470-486`), recorded in the test; no revision synthesized.

## Test / RED chronology evidence

- RED `evidence/logs/s278-red.log` 17:01:10: 6 tests, **5 failed | 1 passed** (pure pre-implementation behaviour).
- GREEN `evidence/logs/s278-green.log` 17:10:47: **6/6 passed**; source saves after the RED (message 17:02:15, refresh 17:09:42).
- `evidence/logs/s278-tsc.log`: `tsc --noEmit -p tsconfig.json`, EXIT_CODE=0.
- Lead's serial combined run reported 7 files / 180 tests PASS exit 0 (`E:/rm-tmp/s280-r12-final.log`), accepted as Lead-run; this review did not re-run tests (frozen bytes only).

## Limits

- Read-only bounded review of the four frozen hashes; no full suite, packaging/SEA, live browser/client trace, provider/operator.
- The Dashboard/Overview defect is established from source wiring and the real read specs; no new test was run for it (Lead serial job owns test execution), and the frozen S278 test does not cover it.
- This is a bounded slice verdict, not full R12 closure (integrated browser/package/client-trace evidence still required).

