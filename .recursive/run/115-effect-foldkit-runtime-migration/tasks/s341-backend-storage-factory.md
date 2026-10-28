# S341 — R23 Backend storage factory split (PARTIAL; residual gaps disclosed)

Regions (current HEAD): index.ts makeSync import :19 / retention connection :20970-20974; initializeSqliteMemory :21185-21189; configuredTrackBOperationsEndpoint :21190-21191; graph store :21276-21282; observation storage :21283-21284; graph persist/read sites :21353/:21355/:21375-21378/:29035-29036/:29772-29782/:29940-29942; backend shutdown :34853-34862.

## Landed
- DAG `composeBackendStorage({ runtimeStateRoot, scopeId, channel, useFixtures, trackBOperationsEndpoint, capacity? })` returns `{ id, initialization, graphStore (fixture-conditional), observationStorage (per-backend), openRetentionCleanupDatabase, close }`; one close drains the observation storage (bounded, idempotent).
- Observation storage is now PER-BACKEND through the storage factory (module singleton removed from the backend construction path).
- index consumes `backendStorage.initialization`, `backendStorage.graphStore`, `backendStorage.observationStorage`; the fixture-mode conditional is preserved exactly (useFixtures && no Track-B operations endpoint).
- `graphObservationKey(scopeId, requestId) = "graph:<scope>:<requestId>"` exported; the bundle READ uses it as the hydration/cache key. Backend shutdown awaits `backendStorage.close()` (joining the bounded shutdown phase behind the existing backend close finalizer).
- Tests: per-backend identity/no singleton leakage; graph-store fixture conditional; collision-free graph keys; close drains + idempotent.

## Residual gaps (NOT claimed complete)
1. Persist-side hydration keys are still the raw `requestId`, while the bundle read now keys `graph:<scope>:<requestId>`. The sync fallback keeps byte behavior, but persisted bundles do not hit the read cache. One pass over the three persist sites is still required (my programmatic key rewrite matched 0 sites).
2. `composeBackendStorage` is used once inside the backend closure but the storage is not exposed on the BackendOwner (no field added); identity is evidenced by the per-backend factory tests + single construction site, not by owner exposure.
3. makeSync ownership is partial: `openRetentionCleanupDatabase` is available on the storage contract, but index's global retention helper still constructs its own makeSync connection.

## Evidence
- RED s341-red.log: 3/3 failed pre-implementation.
- GREEN s341-green.log: 3 files / 16 tests (s341 3 + s337 4 + s334 9); full 6-file run was green earlier in this slice except the stale s334 wiring assertion (fixed). tsc exit 0.
- Hashes: composition-dag F7174C55..., index FD0F6D83..., s341 test 2F0AC305..., s334 test 80A5B4BC....
## S341 gap-closure attempt (NOT complete; honest state)

- Gap 1 (persist keys): only ONE of the three persist hydration keys was rewritten (programmatic last-argument scan matched 1); the first persist tail still shows raw `input.requestId,` at index.ts:21357 and the other two persist keys remain raw. Read-side key is `graphObservationKey(options.scopeId, requestId)` (verified). Behavioral cache-hit test added ("persisted bundle hits the graph read cache with the same helper key") and passes at the storage-unit level, but the index persist sites are not all keyed yet, so a real persisted bundle can still miss. NOT CLOSED.
- Gap 2 (BackendOwner exposure): NOT DONE. The BackendOwner is constructed in cli createCliServerOptions (outside this slice's authorized index/DAG regions); exposing the index-constructed storage on that owner needs the cli owner-construction region or a WeakMap keyed by the owner's options object that index cannot reach. Requires scope decision.
- Gap 3 (makeSync ownership): NOT DONE. index's global openRetentionCleanupDatabase still builds its own makeSync connection; the storage factory exposes openRetentionCleanupDatabase but the global helper was not re-pointed at it.

Evidence: s341-green2.log 3 files / 17 tests (s341 4 + s337 4 + s334 9); tsc exit 0. Hashes: index 46BF43DE..., composition-dag F7174C55..., s341 test DB2EA76D....
## S341 gap 1+3 closure (final)

- Gap 1 CLOSED: all three persist hydration keys rewritten to graphObservationKey(options.scopeId, ...) (index.ts persist tails; 4 graph keys total incl. read). DAG-level behavioral test "persisted bundle hits the graph read cache with the same helper key" present.
- Gap 3 CLOSED: index no longer imports/constructs makeSync; its global openRetentionCleanupDatabase delegates to a module factory installed from backendStorage.openRetentionCleanupDatabase; grep: makeSync( appears ONLY at composition-dag.ts:641 (makeRetentionCleanupDatabase).
- Gap 2 REMAINING: the composed storage is not yet exposed on the BackendOwner; cli createCliServerOptions owner construction was NOT edited. Storage is constructed once in the backend and bound to the retention factory; no owner exposure yet.

Final evidence: tsc exit 0; 3 files / 17 tests (s341 4 + s337 4 + s334 9); s341-green2.log. Lint: DAG 161 {"no-unknown-returns":2,"require-safety-comment-for-type-assertion":159}. Hashes: composition-dag AF32B9D7..., index 559C2B65..., s341 test DB2EA76D....
## S341 gap 2 closure (LANDED)

- composition-dag.ts: BackendOwner gains a `storage: BackendStorageContract | undefined` getter; BackendOwnerInput accepts `storageRef`; `bindBackendStorageRef(options, ref)` / `backendStorageRefOf(options)` bind the host options object to the mutable holder; testSeamBackendOwner sets storage: undefined.
- cli.ts createCliServerOptions: creates `storageRef`, passes it into composeBackendOwner, and binds it to the returned options object.
- index.ts: reads `backendStorageRefOf(options)`; uses the bound storage instance when present, otherwise composes one (test seam); writes the instance back into the ref so the owner getter resolves the SAME storage.
- Identity test: "BackendOwner exposes the same composed storage instance through the storage ref (identity)" (s341).

Final: tsc exit 0; 3 files / 18 tests (s341 5 + s337 4 + s334 9); s341-green3.log / s341-red3.log. Lint DAG 163 {"no-object-parameters":2,"no-unknown-returns":2,"require-safety-comment-for-type-assertion":159}. Hashes: composition-dag 91B837A8..., index BDEBD562..., cli 086A8128..., s341 test 40E4E32B....
## S341 gap-2 lint classification (final)

- The two no-object-parameters findings were fixed by typing, not suppressed: `bindBackendStorageRef<T extends object>(options: T, ref: ...)` and `backendStorageRefOf<T extends object>(options: T)`. No residual object-parameter justification is needed.
- Final DAG classification: 161 = 159 require-safety-comment-for-type-assertion (moved-boundary set) + 2 no-unknown-returns (boundary projections). No store/gap-2 findings.
- Test file CLEAN (repo-relative target). Green4: tsc 0; 3 files / 18 tests (s341 5 + s337 4 + s334 9). Hashes: composition-dag D4DAD9C0..., index BDEBD562..., cli 086A8128..., s341 test 40E4E32B....
## S342 repair (LANDED)

- SINGLETON LEAK fixed: readObservedProfilesForRouting now takes the bound observationStorage parameter; the two observed-profiles readHydrated calls use that instance instead of composeObservationStorage(); the single caller (routing prep) passes the backend's `observationStorage` (backendStorage.observationStorage). Family identity test: "observed-profiles read family uses the bound backend storage instance (family identity)" — a spy storage passed to the helper records the readHydrated call, proving the family uses the provided per-backend store.
- TEST LINT: SAFETY comments added above the as-never casts in the owner test; both test files CLEAN.
- Evidence: RED s341-red5.log (identity test failing pre-implementation); GREEN s341-green5.log 3 files / 19 tests; tsc exit 0. Lint DAG 161 {"no-unknown-returns":2,"require-safety-comment-for-type-assertion":159}. Hashes: composition-dag D4DAD9C0..., index 5672D0A2..., cli 086A8128..., s341 test 8F89501B..., s334 test 1E3D8548....
