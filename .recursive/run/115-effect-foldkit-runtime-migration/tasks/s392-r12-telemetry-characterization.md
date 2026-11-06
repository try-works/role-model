# S392 — R12 telemetry.update: exact request / multiplicity / fallback characterization

Read-only characterization; no product edits. Public worktree HEAD 5e74d5c4.

## R12 source clause (00-requirements.md:124-130)
- Preserve fallback/error/request semantics; compare method/path/query/body/headers/multiplicity/status/stream and causal write order; no duplicate fetch/listener; gap/snapshot resync.
- Retain injectable RuntimeEventSourceFactory/test services and ONE owned Refresh Subscription; lossy coalesced buffers cannot carry ordered tokens.
Addendum 02:30 adds: ONE refresh owner, telemetry.update and revision/gap/refetch, close-once, no duplicate GET/listener or stale publication.

## Exists today (client telemetry-update path)

| Region | Cite | Behavior |
| --- | --- | --- |
| One stream owner | refresh.ts:13-30, 107-221, 216-221 | injectable RuntimeEventSourceFactory; REFRESH_STREAM_URL /api/role-model/telemetry/stream; ONE generation active, one listener pair per generation; one Subscription entry (refreshRevisionStream). |
| Event contract | refresh.ts:57-90, 139-156 | decodes eventName telemetry.update + emittedAtMs (safe integer) + non-empty request.requestId; malformed events ignored, never classified as revisions; publishes RuntimeTelemetryReceived. |
| Close-once / restore | refresh.ts:120-213 | closeCurrent retires the generation + closes exactly once; dispose closes once; pagehide closes; persisted pageshow may reopen once (announce RuntimePageRestored); attach failure retires/close then throws. |
| Update transition | update.ts:285-326, 755, 756-758 | telemetry re-reads ONLY the current route through the same real commands; writes nothing to refresh (no watermark, no resyncToken, no status change). RuntimeTelemetryReceived and RuntimePageRestored both call invalidateCurrentRoute. |
| Readback invalidation | update.ts:291-317 | readbackKeyForRouteTag hit -> one readReadback({ id, key, query, token }), token+1, loadingReadback; typedd optional args so undefined is forwarded as absent. Query/id mirrored: dashboard id=windowMs; Index overview query=overviewQuery(filters, windowMs) + id; RequestDetail/RouterDecisionDetail id=requestId. |
| Observability invalidation | update.ts:318-324 | Observability route -> one readObservability({ token }) with loadingObservability. |
| Non-invalidating routes | update.ts:325 | every other route returns { model } with ZERO commands. |
| Exact request construction | commands.ts:162-193; readback.ts:1090-1104, 1115-1123 | ReadReadback is one Command; client builds GET URL from spec.path/pathFor(id), sets query via url.search = input.query, sends accept: application/json + optional bearer; one owner-local in-flight transport coalesces identical PENDING GETs (no settled cache). |
| Readback paths | readback.ts:845-851 (dashboard + ?windowMs=), 1018-1024 (overviewMetrics + ?windowMs=), 1262-1330 (tag -> key map) | exact method/path/query contract exists for the mapped read routes. |
| Tests | test/s278-telemetry-refresh.test.ts:181-217, 287-322, 323-360, 361-429, 430-458, 459-500 | one telemetry event -> exactly one ReadReadback and watermark untouched; malformed ignored; late read fenced by per-key token; stale gap watermark preserved; Index selected window/filters; Dashboard window through id; source disposed once. |

## Missing / gaps against R12

| Gap | Evidence | Why it matters |
| --- | --- | --- |
| Mapped-route coverage is incomplete | readbackKeyForRouteTag readback.ts:1262-1330 maps Requests/Index/Dashboard/Models/Learning/Router*/Observe*/detail/etc., but NOT LearningConfiguration/Packs/Decisions/Evidence/History (landed S379c), ModelsRoles, SystemOperator, SystemExtensions, LocalLlamaSwapModels; those hit the zero-command branch (update.ts:325). | A telemetry.update while on these pages does nothing; missing exact read is a real R12 multiplicity hole (0 vs 1). |
| Multi-key pages cannot invalidate all their readbacks | ModelsRoles reads configuredModels + modelEndpoints (view.ts:869); SystemOperator reads operatorStatus + operatorTraceRoots (view.ts:884); invalidator emits ONE read per key (update.ts:291-317). | The page can remain stale on one of its sources after telemetry. |
| Control surfaces never invalidate | controlKeyForRouteTag control.ts:238-249 covers Providers/Endpoints/ControlController with readControl; update.ts:288-290 records that control has no telemetry invalidation yet. | R12 requires preserve/refresh semantics for read/control surfaces; control pages never re-read on telemetry.update. |
| Fallback is inert, not demonstrated | refresh.ts:32-38 returns inertSource when EventSource is unavailable; no polling/HTTP fallback and no test of stream-unavailable behavior; restored pageshow + revision-gap resync are separate paths (refresh.ts:171-192; update.ts:723-753). | R12 fallback semantics are unproven for the stream-down case; characterization must not claim a fallback that does not exist. |
| Query mirroring is partial | update.ts:299-308 mirrors only dashboard/Index window + detail ids; no query is forwarded for other filtered reads (requests/observe windows/learning queries) because those specs do not expose pathFor filters (readback.ts specs). | Selected filters can silently drop on a telemetry re-read for future filter routes; currently the specs have no filters, so this is latent, not active. |
| Concurrent-event exact multiplicity untested | readback.ts:1118-1123 coalesces identical in-flight GETs; s278 tests one event per case (\u00a7 above), none assert two telemetry events while pending, or the resulting exact command/fetch count and token behavior. | R12 'no duplicate fetch/listener' and multiplicity are only partially proven. |
| Listener/dispose multiplicity only partially covered | s278:459-500 proves dispose once/after-events; no per-event listener-count assertion beyond one source, and no test that a reopen (persisted pageshow) does not duplicate listeners. | close-once/no-duplicate listener is a named R12 acceptance clause. |

## Named first slice: S392a — telemetry invalidation coverage with exact multiplicity

Bounded, test-first (no route/handler rewrites): make ONE telemetry event produce the exact expected read set for EVERY mapped route, and prove the count/path/query.
1. Extend readbackKeyForRouteTag to the readback-backed routes: LearningConfiguration/Packs/Decisions/Evidence/History -> their readback keys; LocalLlamaSwapModels -> localLlamaSwapModels; SystemExtensions -> extensions; ModelsRoles -> configuredModels; SystemOperator -> operatorStatus.
2. Represent multi-source pages: invalidateCurrentRoute returns a typed read plan (list of { key, id?, query? }) instead of a single key; ModelsRoles = [configuredModels, modelEndpoints]; SystemOperator = [operatorStatus, operatorTraceRoots]; other pages stay one read.
3. Control surfaces: controlKeyForRouteTag match -> one readControl({ key, token }) with the control token bumped and control state loading (no new endpoints).
4. Exact-multiplicity tests (extend s278): one RuntimeTelemetryReceived -> exactly N ReadReadback/ReadControl commands for N sources (0 for unmapped/NotFound), exact spec path + mirrored query/id, per-key token increment, refresh watermark/resyncToken unchanged, one source/listener, dispose-once, and two concurrent events producing two logical reads with at most the S279 in-flight coalescing (asserted request count).
5. Keep the honest fallback note: no polling fallback is added; document stream-unavailable as remaining (or add an injectable fallback if the bounded slice allows).

Caller/region table:

| Region | Role for S392a | Cite |
| --- | --- | --- |
| refresh stream/listeners | unchanged input edge; one listener pair | refresh.ts:107-221 |
| invalidateCurrentRoute | typed read plan + control branch | update.ts:285-326 |
| RuntimeTelemetryReceived / RuntimePageRestored | call the same invalidator | update.ts:755-758 |
| readbackKeyForRouteTag | add missing readback-backed routes | readback.ts:1262-1330 |
| controlKeyForRouteTag | control invalidation map | control.ts:238-249 |
| read commands | add readControl emission next to readReadback | commands.ts:162-193; control read command |
| READBACK_SPECS paths | exact path/query source of truth | readback.ts:845-851, 1018-1024, 1090-1104 |
| tests | exact-multiplicity matrix | test/s278-telemetry-refresh.test.ts |

## State
No product edits, no RED/GREEN (characterization), no commit. HEAD 5e74d5c4.
