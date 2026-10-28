# S334 — R23 Backend-owned observation storage (LANDED)

## Effect-first justification

The registered DAG service remains an Effect `Context.Service` (`ObservationStorageService`) with an Effect layer. The hydration queue/worker is a **deterministic bounded plain-array queue + async pump**, not an Effect Queue: the Effect Queue + `Effect.runFork` worker did not drain under the synchronous vitest path (offer/take scheduling never reached zero), and a plain bounded pump has the same ownership semantics while being the suitable shape behind a sync read-through facade. This is the recorded reason required by the Effect-first rule.

## Mechanism
- `ObservationStorageContract`: `persist(write, hydrate, key)`, `read(key, read)` (sync read-through: cached hydration if present, else the caller's sync read), `cached`, `queueDepth`, `hydrationError`, `drain`.
- Pump: capacity-bounded (`composeObservationStorage({capacity:64})` in production); overflow sets typed `ObservationHydrationOverflowError` (code OBSERVATION_HYDRATION_OVERFLOW) without dropping the synchronous write; `drain` joins via resolver list with a 5s typed `ObservationHydrationTimeoutError` (code OBSERVATION_HYDRATION_TIMEOUT); hydration failures are recorded (typed error) and do not break later jobs.
- Identity/no-fallback: one `composeObservationStorage()` singleton; `isComposedObservationStorage` WeakSet brand; `assertComposedObservationStorage` throws for any unbranded store. Registered in the DAG CompositionServices graph via `observationStorageLayer`.

## Migrated families
| Family | Status |
| --- | --- |
| persistRuntimeTelemetryFailure (recordPreExecutionFailure site) | MIGRATED via `observationStorage.persist(() => persistRuntimeTelemetryFailure(...), async () => readRuntimeObservationBundle(...), input.requestId)` |
| persistRuntimeObservationBundle | MIGRATED via `observationStorage.persist(..., async () => readRuntimeObservationBundle(...), requestId)` |
| readRuntimeObservationBundle (readPersistedRuntimeObservation wrapper) | MIGRATED via `observationStorage.read(requestId, () => readRuntimeObservationBundle(...))`; storage-record fallback preserved |
| persistRuntimeTelemetryFailure second call site (:28943 region) | STAYED — named follow-on |
| telemetry summary/observed-profile/live-score/graph-store families | STAYED — named follow-on (caller table unchanged) |

## Evidence
- RED `s333? s334-red.log`: 4/4 failed pre-implementation.
- GREEN `s334-green.log`: 6 files / 30 tests passed (s334 4 + s331 2 + s330 4 + s327 3 + s324 7 + s321 10); tsc exit 0.
- Tests: identity/no-fallback; bounded overflow + writes applied + drain; sync read-through fallback then cached; production wiring source guard.
- Lint: DAG 165 ({"no-unknown-returns":5,"require-safety-comment-for-type-assertion":160}); test clean.
- Hashes: composition-dag 9877A1FA..., index 533868DD..., test 5211ACC7....
## S334 lint repair (final)

- Fixed the 4 new store-region findings: hydration job/cached returns typed as object unions (3 no-unknown-returns removed); the read-through cast is a generic `read: <T>(key, read): T` with a directly adjacent SAFETY comment (160th require-safety justified, NO residual). Store region now has no findings.
- Classified DAG: 161 = 159 require-safety-comment-for-type-assertion (moved-boundary cast set) + 2 no-unknown-returns (boundary projections). No new/store findings; no residual list needed.
- Test file: CLEAN (repo-relative target, 0 findings).
- GREEN s334-green2.log: 6 files / 30 tests; tsc exit 0. Hashes: composition-dag B223328F..., index 533868DD..., test 29356DFF....
## S335 per-job isolation repair (LANDED)

| Item | Fix |
| --- | --- |
| Hung-job isolation | Each pump job races its hydrate against a per-job timeout (default 10s, typed ObservationHydrationJobTimeoutError, code OBSERVATION_HYDRATION_JOB_TIMEOUT); a hung ACTIVE job is abandoned by the drain watchdog at 5s: generation token invalidates its result, pending is decremented, active clears, the typed job error is recorded, and the pump immediately resumes queued jobs. Queue capacity still bounds only queued jobs. drain() rejects with the typed ObservationHydrationTimeoutError at 5s after abandonment. |
| pumpActive | ObservationStorageContract exposes pumpActive() so tests assert the pump does not stay permanently active. |

Tests (all passing):
- "hung job: drain rejects with the typed 5s timeout and the pump does not stay permanently active"
- "later-job progress: after a hung job is abandoned, a queued later job runs"
- "failure continues: a failing hydration job does not stop the pump"

Evidence: RED s334-red3.log (2 failed pre-fix); GREEN s334-green3.log: 6 files / 33 tests; tsc exit 0. Hashes: composition-dag 6B66B9E2..., index 533868DD..., test D63D4D15.... Lint: DAG 161 ({"no-unknown-returns":2,"require-safety-comment-for-type-assertion":159}), test clean.
## S335 test repair (LANDED, tests-only)

1. "drain watchdog abandons a hung active job and queued later jobs still run" — default per-job timeout 60s so ONLY the 5s drain watchdog can abandon; asserts drain rejects with ObservationHydrationTimeoutError, the later queued job runs and caches, the abandoned hung job leaves no cache, pumpActive false.
2. "eventual settle after abandonment writes no cache entry and does not double-decrement pending" — hung job resolves AFTER abandonment; asserts no cache write for the abandoned key, pumpActive false, and a fresh job still drains (pending sanity).

RED4: tests passed on their first run against the landed isolation implementation (no product defect exposed; no product change in this repair). GREEN4: 6 files / 35 tests; tsc exit 0. Test hash 30576083.... Test file CLEAN (repo-relative target).
