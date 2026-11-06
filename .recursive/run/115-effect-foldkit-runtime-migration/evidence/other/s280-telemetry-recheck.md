# S280-A recheck — finite query repair (current bytes)

- Reviewer: native teammate `s9-private-readonly`, actual model **deepseek-flash**; read-only, no product/test edits, no tests/builds/suites run, no children/commits.
- Status: **PASS (bounded) on the FINAL FROZEN repair bytes** (typed optional args, no empty-spread form; Lead freeze confirmed). Lead-reported: the two prior failing wire cases now pass (8 pass), tsc exit 0; I did not re-run them (Lead query job owns execution).
- FROZEN hashes (SHA-256; verified by this recheck against the Lead freeze):
  - `src/update.ts` `5C4232A2465407E979D11644EF158C8A8CD3ACE58E0EF36AC126D6DD218485CD`
  - `test/s278-telemetry-refresh.test.ts` `E96B1845995E7020CD405740C49A1951AE4A646F22A9C06BD9F2B2E74C11460B` (8 tests)
  - `src/refresh.ts` `A48BE129D57B2FB661F5E448EE6FE51F6E90D001B366400A9D350B39655981BC` (unchanged)
  - `src/message.ts` `3B5540B924571A209D7042F49EA8A76D2B7998D7D6C98F75F3A604312A90C5A6` (unchanged)

## Confirmed repair (Index / Dashboard contract)

- `src/update.ts:281-316` `invalidateCurrentRoute` now mirrors the route's own read args:
  - `windowMs = model.overviewWindowMs ?? 86_400_000` (`:293`), matching the shell's own read defaults (`:504-505,514`).
  - `id = readbackKey === "dashboard" ? String(windowMs) : detailId` (`:294`) — Dashboard re-reads with the selected/default window as the id (`readback.ts:760-762`).
  - `query = readbackKey === "overviewMetrics" ? overviewQuery(model.overviewFilters ?? DEFAULT_OVERVIEW_FILTERS, windowMs) : undefined` (`:295-298`) — Index (`readbackKeyForRouteTag("Index") === "overviewMetrics"`, `readback.ts:1169-1170`) keeps the window and all selected filters (`overview-filters.ts:26-36`: `windowMs`, `sourceTypes`, `statusFamilies`, `difficultyBuckets`, breakdown id list).
  - **Detail routes unchanged:** `detailId` is still only `RequestDetail`/`RouterDecisionDetail` → `route.requestId` (`:285-288`); `query` stays undefined for them.
- Command args are `Schema.optional(Schema.String)` (`src/commands.ts:164`) and execute forwards `{ id, query, signal }` to the reader (`:166-172`); `createReadbackClient` treats `id` as `id ?? ""` and `query` as absent when undefined (`readback.ts` client). So the pending s5 undefined-vs-spread form is behaviourally equivalent; an explicit `undefined` cannot become a literal `"undefined"` window.
- **Watermark untouched:** the invalidator writes only `readbacks[key] = loading` (`:299-306`) and never `refresh`; the telemetry handler is `RuntimeTelemetryReceived: () => invalidateCurrentRoute(model)` (`:745`). No revision, gap, resync token or status write.

## New wire coverage (2 added tests, now 8)

- `test/s278-telemetry-refresh.test.ts:361-428` (Index): asserts command query equals `overviewQuery(filters, 3_600_000)`, executes the real readback client and checks the real GET contains `windowMs=3600000`, `endpointIds=endpoint-s278`, `statusFamilies=failure`, and no empty `windowMs=(&|$)`; default Index uses `overviewQuery(DEFAULT_OVERVIEW_FILTERS, 86_400_000)` and `windowMs=86400000`; late pre-telemetry token is fenced; `lastAppliedRevision`/`resyncToken` remain 0.
- `test/s278-telemetry-refresh.test.ts:430-457` (Dashboard): command `id` equals `"7200000"` (window), real GET `/api/role-model/telemetry/summary?windowMs=7200000`, no empty window; default command id `"86400000"`.
- Existing S278 rows still cover: one current-route re-read, malformed telemetry rejected, watermark/gap untouched, stale-result fencing, single source/close-once/post-disposal silence.

## Verdict

**PASS (bounded)** on the frozen bytes for the S280-A defect: Index preserves the selected window + filters and defaults to `86400000`; Dashboard preserves the selected window through `id`; detail-route args unchanged; telemetry invalidation still writes no refresh watermark. Not a full R12 closure; validation of the 8-test S278 run and the final frozen hashes belongs to the Lead's running job and s5's final hash.

## Limits

- Read-only static recheck; I ran no tests/builds; the Lead's query-test job result (2 failing cases → 8 pass, tsc exit 0) is Lead-reported and external to this file.
- Frozen `update.ts` `5C4232A2…485CD` and `s278` test `E96B1845…460B` were verified unchanged at recheck time; typed-optional args forward `undefined` as absent (`commands.ts:164,171`), so no empty-spread form is needed.

## Addendum — post-freeze annotation-only change (Lead edit, read-only recheck)

- Single change: `test/s278-telemetry-refresh.test.ts:97` dropped the explicit return annotation ``: unknown` from `bodyForUrl = (url: string) => ...`. No other byte changed: re-adding `: unknown` and hashing reproduces the frozen `E96B1845995E7020CD405740C49A1951AE4A646F22A9C06BD9F2B2E74C11460B` **exactly** (reconstruction performed on a temp copy, then removed).
- New test hash: `740DD5C91ADBDC3FE8AA1F2D2944D383A681120F3E79251C1374C43B27F6986C` (8 tests). `anti_slop_lint`: clean (0 findings).
- Inference is concrete: the function returns one of three JSON literal shapes (`/api/metrics/page`, `/api/role-model/telemetry/summary`, requests fallback), consumed only by `JSON.stringify(bodyForUrl(url))`; the serialized bodies and every assertion are byte-identical (proved by the reconstruction above), so runtime behaviour is identical.
- `src/update.ts` remains the frozen `5C4232A2465407E979D11644EF158C8A8CD3ACE58E0EF36AC126D6DD218485CD`; no product changes after the freeze. Lead reran `tsc` + the 8 S278 tests; not re-run by this reviewer.
- **Verdict: PASS (bounded)** for the annotation-only test edit; no defect, no assertion change.

