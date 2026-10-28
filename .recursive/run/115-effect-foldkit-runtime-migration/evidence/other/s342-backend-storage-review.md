# S342 — independent review: S341 R23 Backend storage factory split

Reviewer: `s9-private-readonly`, actual model **deepseek-flash** (live). Read-only on product files; no source edit, no commit. I ran the 3 affected files, tsc, diffed index against edf7ea54 and checked anti-slop.

## Verified frozen artifacts

| File | sha256 | bytes |
| --- | --- | --- |
| `src/composition-dag.ts` | `D4DAD9C08A553AC9D2F88755E3297FF22C1CB7D6FEA4FE7DD620C8E4558484BC` | 75021 |
| `src/index.ts` | `BDEBD5622404C5E5A68C36598A703A30AB4AB29156F8063B7F48AD864FAF84CC` | 1369855 |
| `src/cli.ts` | `086A812886352CBC50E84B23FE71D2F7BAF0BC206605B25C32A3926A783A03B0` | 594641 |
| `test/s341-backend-storage.test.ts` | `40E4E32B3D3AB78EF8983C71EDEB8D517F075BADB6047C7EF5C7832AC12A638D` | 4563 |

All match. Affected 3 files: **18/18 pass**; tsc exit 0.

## Q1 — Single lifecycle: PASS (with singleton caveat in Q3)

`composeBackendStorage` creates one initialization, one graphStore (conditional), one observationStorage, and an idempotent `close` that drains the observation store (`composition-dag:665-687`). The backend `shutdown()` awaits `backendStorage.close()` (`index:34854-34861`); the close test calls twice and sees one hydration (`test:43-52`). Index imports no `makeSync` and the only `makeRetentionCleanupDatabase` is composition-dag:640; the remaining `new DatabaseSync` functions in index are pre-existing config-delete helpers, not a second backend initialization. PASS for the factory path.

## Q2 — Fixture-conditional graphStore: PASS

The factory creates a file graph store only when `useFixtures && (trackBOperationsEndpoint ?? "") === ""` (`composition-dag:667-670`); the test asserts a fixture store exists and is undefined when a Track-B endpoint is configured (`test:11-22`). The read/write implementation is the existing `createTrackBFileGraphStore`; no behavior change.

## Q3 — Per-backend identity: HOLD

The factory itself is per-backend (test a/b distinct `observationStorage`, `test:11-17`) and `BackendOwner.storage` resolves through the bound `storageRef` (`composition-dag:947-954,1230-1236`); cli binds the ref (`cli:4353-4355,4486-4488`) and index writes the composed instance back (`index:21189-21199`). The identity test is real for the getter but manually sets `storageRef.current` before asserting (`test:54-74`).

**However the per-backend storage is not the only observation store in the backend path:** the observed-profiles read family still calls `composeObservationStorage()` directly at `index:6342,6347`, i.e. the module singleton, while the same backend uses `backendStorage.observationStorage` for bundle/telemetry/profile reads. That is a dual-store/singleton leak: observed-profiles cache entries are not in the per-backend store, are not drained by `backendStorage.close()`, and the identity claim “the storage is per-backend” is false for that family. Required: pass the per-backend observation storage into the observed-profiles helper (or resolve it from the backend storage) and add a family-level identity assertion; drain the singleton if any legacy site remains.

## Q4 — Persist/read key agreement: PASS

All three persist hydration keys use `graphObservationKey(options.scopeId, requestId)` (`index:21357,29037,29944`) and the read uses the same helper (`:21373`); the helper is scope+request (`composition-dag:642-643`). The persisted-bundle-hit test uses the helper key and proves fallback is not called (`test:24-35`). PASS for graph keys; the observed-profiles key remains separate from the per-backend store as noted.

## Q5 — Truncation recovery: PASS

`git diff edf7ea54 -- index.ts` is 25 insertions / 23 deletions, limited to the S341 changes: remove the makeSync import, add the storage imports/factory/ref wiring, replace local initialization/graphStore/observationStorage composition, switch graph keys to `graphObservationKey`, and add `backendStorage.close()` (`diff hunks at imports, :20970, :21185, :21276, :21356, :21372, :29036, :29943, :34859`). No lost/reordered regions beyond those edits. PASS.

## Q6 — Lint: HOLD for the test file

The new test has three bare `as never` assertions with no SAFETY comments: `test/s341-backend-storage.test.ts:60,61,69` (`emptyCatalog`, `emptyRegistry`, the composer input). This contradicts “test clean.” The absolute-path anti-slop tool bug remains; repo-relative returns 0 files, so the test claim is not machine-certified; manual scan is conclusive. DAG 161 appears unchanged (new generic helpers are typed; no visible new cast). Required: add SAFETY comments/typed test helper.

## Q7 — R23 disposition: PARTIAL/HOLD

The graph-store residual is now owned by the factory, and graph keys/close are wired. But the observed-profiles family still uses the singleton store, so the per-backend storage is not universal and the storage lifecycle does not own every observation family. R23 is close but not fully dispositioned until that family is moved/drained or explicitly scoped as singleton.

## VERDICT: HOLD (2 required repairs)

1. **Remove the singleton leak:** route `index:6342,6347` observed-profiles reads through the bound per-backend `backendStorage.observationStorage` (pass it into the helper), so every family uses the same store and `backendStorage.close()` drains all of it; add a family-level identity assertion. If a singleton site must remain, document it and drain it explicitly.
2. **Fix the test lint:** add SAFETY comments or typed test helpers for the three `as never` casts at `test/s341-backend-storage.test.ts:60,61,69`; the current test is not clean.

No product file was modified; no commit made.

## Final re-review after singleton/identity fix — PASS

Verified final hashes: index 5672D0A2597B2001B3B2F17614DCF953F68A544A4D4A9039B45C5B5C463C639D (1369947 B); s341 test 8F89501BED8BA219CB72B1C2FCB9163D7165C06C9F06C086721878E019CD02FE (6020 B); s334 test 1E3D8548016F22C1571C55BF719371442F5C4D4EB5A1336A124AE1615F182A36 (6128 B); DAG D4DAD9C0.../75021 and cli 086A8128.../594641 unchanged. Affected 3 files: 19/19 pass; tsc exit 0.

- **Singleton leak is closed in the backend path:** a src-wide grep finds no composeObservationStorage() call outside the layer construction in composition-dag; the observed-profiles helper now takes an explicit ObservationStorageContract and its two readHydrated calls use it (index:6322-6348). The routing-prep caller passes backendStorage.observationStorage (index:27405), so the family shares the per-backend store.
- **Family identity is tested:** the spy storage receives the readHydrated call (s341 test:79-108), and the production call passes the same observationStorage variable used by bundle/telemetry/profile reads. The test is a function-contract identity check, not just the owner getter.
- **The owner getter/cli binding remain:** storageRef is bound to owner.options in cli, index resolves/writes it back, and the factory is per-backend; no singleton read remains in index.
- **Graph/close/key behavior unchanged and green:** all three graph persist keys and read use graphObservationKey; fixture-conditional graphStore preserved; idempotent close drains the per-backend observation store and is awaited in backend shutdown. Index diff against edf7ea54 is limited to the intended S341/S342 edits (31/28) with no lost regions.
- **Test lint is clean:** all four as-never casts in s341 test (61,63,72,100) now have direct SAFETY comments; s334 test has no casts. Absolute-path anti-slop remains a tooling limitation; repo-relative scans 0, but manual scan is complete.
- **Run:** 19/19 tests pass, tsc 0.

Residual non-blocking: the family identity test passes an explicit spy store rather than the exact backendStorage instance; the production call is statically verified, and the function contract is tested. The absolute lint tool bug still prevents a machine-certified DAG count.

## FINAL VERDICT: PASS

The singleton/dual-store leak is removed from the backend path, the observed-profiles family uses the bound per-backend store, the test lint is clean, and graph keys/lifecycle/truncation integrity are all verified on the final bytes. No remaining numbered items. No product file was modified; no commit made.

