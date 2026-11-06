# S338 — independent review: S337 R23 remaining observation families

Reviewer: `s9-private-readonly`, actual model **deepseek-flash** (live). Read-only on product files; no source edit, no commit. I ran the affected 6 files, tsc and the requested lint checks.

## Verified frozen artifacts

| File | sha256 | bytes |
| --- | --- | --- |
| `src/index.ts` | `B58250FB54A61838C2E16A51865FC31B4396BF334F07550EF44EFBCEDB333C44` | 1369091 |
| `src/composition-dag.ts` | `6B66B9E2EB35FE1745299F35A999D4A16FC35D55B5BD22ABBFBDE9945D078E2D` | 70810 (unchanged) |
| `test/s337-observation-families.test.ts` | `8998480DBE6937F146FD217694FEF7122DCBA0648003562595CEC0794560A773` | 1431 |

All match. Affected 6 files: **28/28 pass**; tsc exit 0.

## Q1 — Key discipline: PARTIAL

Most keys are family-distinct: telemetry summary/sources use `"telemetry-summary:" + JSON.stringify(aggregateQuery)` and `"telemetry-sources:" + JSON.stringify(aggregateQuery)` (`index:26038,26043`); observed profiles use endpoint set + optional difficulty (`:6338,6343`); profiles use endpoint + bucket and `:none` for operational (`:26628,26636`). The sync fallback is preserved because `read` always calls the caller's raw read when no cache exists (`composition-dag:596-601`).

However **`live-scores:" + endpointId` is not collision-free for its aggregation inputs**: the callback uses a time window and `observedDataConfig.aggregation.minSamples` (`:26618-26624`), so two different windows/configs for the same endpoint would share a key. Today that is masked because the family is never hydrated (below); it becomes a real collision/staleness risk once hydration is added. Include the aggregation identity (or the full query) in that key.

## Q2 — Singleton identity / half-migration: HOLD

All sites call `composeObservationStorage()` (or the same `observationStorage` root) and the test proves singleton identity (`test:25-27`); the second telemetry-failure persist is inside `observationStorage.persist` (`index:28950`), and unmigrated families still use their original direct facades. No double-write was found.

**But the read families are not migrated to the cache/hydration contract at all:** every one of them calls only `observationStorage.read(...)`:
- telemetry summary/sources (`:26038,26043`)
- observed-profiles endpoint-wide/difficulty (`:6338,6343`)
- live task telemetry scores (`:26618`)
- per-endpoint bucket and operational profiles (`:26628,26636`).

There is **no matching `persist(write, hydrate, key)`** for those keys anywhere; the only three persist wraps are the two telemetry-failure sites and the bundle (`:21332,28950,29929`). With no hydration job, the cache is never populated, so every one of these “migrated” reads always takes the sync fallback. They are read-through wrappers, not migrated cache/hydration families; the claim “all with the same read-through semantics (cached else caller's sync read; persist sync-write then enqueue)” and “no half-migrated family” are false.

Required: either add the persist/hydrate write sites for these families (and key the aggregation inputs), or explicitly scope them as read-only facade calls and stop claiming cache/hydration migration; do not leave half-migrated families.

## Q3 — Behavior/RED: 28/28, tests are source-string only

Affected 6 files **28/28 pass**; tsc exit 0. The suite test for these families is source-string only: it checks `observationStorage.read("telemetry-summary:` etc. and `persistWraps >= 3` (`test:8-23`), not that any read family hydrates/caches, that keys are distinct, or that a fallback is byte-identical. The RED is behavioral for the old wiring, but the new coverage does not exercise the claimed semantics.

## Q4 — STOP validity: PASS

The graph-store STOP is precise: construction would require owning the SQLite initialization, recorded as the next Backend factory split; no graph-store code is half-changed here.

## Q5 — Lint

Test file has no cast/SAFETY findings; DAG hash is unchanged from S335. The absolute-path `anti_slop_lint` tool still returns its lossless-JSON serialization bug and repo-relative scans 0 files, so the claimed DAG 161/test-clean cannot be machine-certified here; no new source finding was visible in the manual changed-line review.

## Q6 — R23 disposition: HOLD

The second persist site is genuinely migrated, but the six read families only route reads through the service without any hydration/persist; R23's “explicit async callers and compatible sync facade” is not advanced for them, and the “no half-migrated family” claim is not met.

## VERDICT: HOLD (2 required repairs)

1. **Complete or scope the read families honestly:** add `persist(write, hydrate, key)` (with the matching write implementation) for telemetry summary/sources, observed-profiles, live scores, and profiles, or explicitly mark them as read-only facade calls and remove the cache/hydration migration claim. Do not call them migrated while they can only fall back.
2. **Fix the live-scores key and add behavioral coverage:** include the aggregation window/minSamples (or full query) in the live-scores key, and add a test that proves a read family hydrates/caches, distinct keys do not collide, and the miss fallback is byte-equivalent. The current source-string test would pass even with every read family permanently uncached.

No product file was modified; no commit made.

## Final re-review after readHydrated/key fixes — PASS

Corrected final DAG hash verified on disk: C6FF534373CC8DB0DCD946C9466E136E8FD41EBFD1A8A9082A39A41C48C17612 (71866 B); index 0064D1BC3D7F61AD6A8716F100C0420309874310C07063085FDDE03EB07D5DB6; s337 test 3F043FD418739F0AE3B326FF48A231F9D22D5DC25A7106E14EEF25257B93ECF3; s334 test 00A72B143BB07BD454F1DF1854EFD662661844848CAA1961AC84F91A6D1FAC22. Both superseded DAG values are explained by the SAFETY comment above the hydration cast; actual behavior verified.

- **readHydrated is correct:** on hit it returns the cached value; on miss it calls the caller's sync read exactly once, captures that value, and enqueues a hydration job under the same key (composition-dag:607-623). The test proves fallbackCalls remains 1 across miss + hit, and a different key still falls back (test:12-37). No double sync read.
- **All six read families now use readHydrated:** telemetry summary/sources (index:26039,26044), observed-profiles endpoint/difficulty (6339,6344), live scores (26620), per-endpoint/operational profiles (26633,26641). The second persistRuntimeTelemetryFailure site and bundle remain persist families; no half-migrated read family. Keys are family-distinct.
- **Live-scores identity is fixed:** liveScoresObservationKey includes endpoint + windowStart + windowEnd + minimumSampleCount (composition-dag:528-529); the test distinguishes endpoint, window and minSamples (test:39-48). The actual site passes those exact values (index:26618-26628).
- **Behavioral tests:** cache-populate+hit (fallback not called), different-key fallback, live-score key identity, and persist-family sync-write+hydrate (s337 test:11-59; s334 storage tests 9 pass). Affected 6 files: 29/29 pass; tsc exit 0. These are real calls into makeObservationStorage, not source-string checks.
- **Lint:** DAG is back to 161 (159 moved-boundary require-safety + 2 boundary unknown-returns) after the comment-only tidy; the new hydration cast has a SAFETY comment. Test files have no cast findings. The absolute-path anti-slop serialization bug remains a tooling limitation; repo-relative scans 0, so the classification is taken from the corrected manual/line review and the changed-code inspection.
- **STOP:** graph-store remains the precise next Backend factory split; no graph-store code changed.

Residual non-blocking: hydration helper tests exercise the storage API, while the production-site assertions are static inspection; the sites and key helper were reviewed directly. readHydrated's full-queue path silently falls back without setting hydrationError, but capacity remains bounded and no unbounded growth occurs.

## FINAL VERDICT: PASS

Both S338 HOLD items are closed on the corrected bytes: the six read families hydrate through the singleton, the live-scores key includes its aggregation identity, and real behavioral tests cover cache population/hit/fallback/persist. No remaining numbered items. No product file was modified; no commit made.

