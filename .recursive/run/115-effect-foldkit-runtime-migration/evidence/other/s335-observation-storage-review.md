# S335 — independent review: S334 R23 Backend-owned observation storage

Reviewer: `s9-private-readonly`, actual model **deepseek-flash** (live). Read-only on product files; no source edit, no commit. I ran the affected 6 files, tsc and the requested lint checks.

## Verified frozen artifacts

| File | sha256 | bytes |
| --- | --- | --- |
| `src/composition-dag.ts` | `B223328F30677400E1616DFA2CC9839AAD0BCC9D3ACA3327458BC931DCC617BA` | 69436 |
| `src/index.ts` | `533868DD0792ACCD5D6745F0C3E162C0A9579A17B488D31E43251A46A1E4B9E5` | 1368295 |
| `test/s334-observation-storage.test.ts` | `29356DFF5B66AA8D2508AAF968126F616C3E49145246D96B6B6AF9BF108A79FD` | 2751 |

All match. Backups `E:/rm-tmp/s334` exist. Affected 6 files: **30/30 pass**; tsc exit 0.

## Q1 — Sync facade fidelity: PASS

`persist` calls `write()` **before** deciding whether to hydrate/enqueue (`composition-dag:554-560`); overflow therefore still applies the synchronous write. `read` returns the cached hydrated value when present, otherwise calls the caller's sync `read()` unchanged (`:563-568`). The migrated telemetry-failure site uses `input.requestId` as the key and hydrates via `readRuntimeObservationBundle` (`index:21332-21355`); the migrated bundle site uses `requestId` (`index:29929-29939`) and `readPersistedRuntimeObservation` reads through the facade (`index:21369-21375`). The test covers miss fallback then hydrated cache hit (`test:44-52`). PASS.

## Q2 — Bounds: HOLD

- Boundary overflow is typed and writes are preserved: capacity test uses capacity 1, three writes, queueDepth <=1, `ObservationHydrationOverflowError`, writes 3 (`test:24-42`; code `:554-560`). PASS.
- **A hung hydration job blocks all later jobs and leaves the pump stuck.** The pump is a single serial loop (`composition-dag:530-540`) that `await job.run()` for each job. If one `hydrate` never settles, `active` stays true forever, later jobs never run, and the queue grows until overflow. The 5s `drain()` timer rejects with `ObservationHydrationTimeoutError` (`:545-550`) but does not cancel or skip the hung job; it only makes the caller see a timeout. This directly contradicts the claim that a hung hydration job cannot block later jobs.
- **The test does not cover the timeout/hung path at all**: it imports only `ObservationHydrationOverflowError`, and no test asserts `ObservationHydrationTimeoutError` or later-job progress after a hang (`test:1-61`). Required: add a per-job timeout/isolated pump (or otherwise bound each job) so later jobs/drain can proceed, and add the hung-job timeout + later-job test.

## Q3 — Effect-first justification: PARTIAL

The service is still a DAG `Context.Service` with a layer (`composition-dag:522,581`), and the recorded rationale explains why a plain bounded pump was chosen over an Effect Queue under the synchronous test path. That registration/ownership is honest. However the plain pump's serial `await` is not suitable for the claimed hung-job isolation; the rationale does not address cancellation or per-job bounds. This is the same defect as Q2, not a separate ownership issue.

## Q4 — Identity/no-fallback: PASS

`composeObservationStorage` memoizes one owner; `makeObservationStorage` adds it to a WeakSet; `assertComposedObservationStorage` rejects an unbranded object (`composition-dag:574-580`); the test checks singleton identity and the unbranded refusal (`test:14-22`). Production uses the DAG singleton (`index:21283`). The migrated telemetry-failure and bundle sites both go through `observationStorage.persist/read`; the second persist site remains the named stayed family (`index:28950`), so the migrated families do not double-write. PASS on the source evidence (no behavioral double-write test).

## Q5 — Run/lint

Affected 6 files **30/30 pass**; tsc exit 0. Test file has no obvious cast finding; the absolute-path `anti_slop_lint` tool still returns its lossless-JSON serialization bug and repo-relative scans 0 files, so the claimed DAG 161/test-clean cannot be machine-certified here; manual inspection of the new service shows the read cast has SAFETY.

## Q6 — R23 disposition: PARTIAL

The migration advances the explicit async hydration + compatible sync facade for the two named families, with the stayed families honestly listed. But the bounded/hung guarantee is not met: a hung hydration job blocks later jobs and the pump forever (drain only rejects). R23 is advanced structurally, not fully on the hydration isolation claim.

## VERDICT: HOLD (2 required repairs)

1. **Fix the hung-job pump**: a single stuck `hydrate` must not block later jobs or keep the pump active forever. Add a per-job timeout/abort or process jobs in a way that isolates a hung job, and make `drain` settle with `ObservationHydrationTimeoutError` without leaving the pump permanently stuck.
2. **Add the missing timeout/later-job tests**: assert a hung hydration rejects drain after 5s with the typed error, and that a subsequent queued job still runs (or is explicitly failed) rather than being blocked. Also test the failure path “later jobs continue” behaviorally.

No product file was modified; no commit made.

## Final re-review after abandonment fix — HOLD (1 test-coverage item)

Verified final hashes: composition-dag 6B66B9E2EB35FE1745299F35A999D4A16FC35D55B5BD22ABBFBDE9945D078E2D (70810 B); index unchanged 533868DD...; test D63D4D1512AAF4D71175E0700FD0818D42D71E41C831BD2E79FFF51EBC09CB0C (4327 B). Affected 6 files: 33/33 pass; tsc exit 0.

- **Pump abandonment code is materially improved:** the job timeout/generation token clears the active flag, decrements once, starts a new pump for queued jobs, and the old pump returns before cache set/pending decrement when its generation is stale (composition-dag:529-570). The overflow bound remains queued-jobs only, with the sync write applied first (:586-592). PASS by inspection.
- **Hung drain test:** the 5s drain rejects with ObservationHydrationTimeoutError, records ObservationHydrationJobTimeoutError, and pumpActive goes false (test:65-72). PASS.
- **Remaining HOLD — the claimed abandonment later-job test does not exercise drain abandonment.** The "later-job progress" test uses makeObservationStorage(2, 30), so the **per-job 30ms timeout** fires and the pump continues normally; abandonActiveJob (the 5s drain watchdog path) is never called (test:74-81). The only test that calls abandonActiveJob has no queued later job, so the "new pump resumes queued jobs" branch is untested.
- **The eventual-settle no-double-decrement/cache-write case is untested.** The hung promise in the drain test never settles; no test resolves/rejects a job after abandonment and asserts the cache was not written and pending was not decremented twice. The generation code looks correct by inspection, but the task's explicit eventual-settle check is not behaviorally proven. Required: add a drain-abandonment test with a queued later job (jobTimeout > 5s, drain rejects at 5s, later job runs/caches), and an eventual-settle test that resolves the abandoned job after abandonment and asserts no cache entry/extra decrement. This is a test-coverage repair; the product behavior inspection is otherwise sound.

**FINAL VERDICT: HOLD (1 test-coverage repair).** No product file was modified; no commit made.

## Final coverage verification — PASS

Final test hash verified: 30576083FA52342E7F6213926D3FF8A2291C0C32D7DCCCE4FE07E89F7911E897 (6103 B); product hashes unchanged (DAG 6B66B9E2..., index 533868DD...). Affected 6 files: 35/35 pass; tsc exit 0.

- The drain-watchdog test uses the default 5s watchdog with per-job timeout 60s (so the drain, not the job timer, drives abandonment), rejects with ObservationHydrationTimeoutError, asserts the queued later job runs/caches, the abandoned key has no cache entry, and pumpActive() is false (test:92-101). This genuinely exercises abandonActiveJob's new-pump branch.
- The eventual-settle test releases the hung promise after abandonment, waits, asserts no cache entry, pumpActive false, and a fresh job still drains (which would hang/fail if pending were double-decremented) (test:103-118). This is a behavioral check of the generation/no-double-decrement path.
- The test file has no casts and no safety-comment findings; the overflow/read-through/failure tests remain. The only residual is the old pump's own per-job timer remaining until its timeout after abandonment, but it is generation-guarded and writes/decrements nothing; this is bounded by jobTimeoutMs and not a correctness leak in the tested behavior.

**FINAL VERDICT: PASS.** Both prior HOLD items are covered behaviorally, 35/35 + tsc 0 reproduce, and product hashes are unchanged. No remaining numbered items. No product file was modified; no commit made.

