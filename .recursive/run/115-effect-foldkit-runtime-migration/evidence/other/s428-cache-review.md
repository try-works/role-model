# S428 — independent review: S424 observation-cache correctness

Reviewer: `s9-private-readonly`, actual model **deepseek-flash** (verified via list_agents). Read-only product/test/config; no source overlays, product edits, or commit. Baseline public 71151644 (S424 patch basis); frozen DAG hash and tests below match.

## Verified artifacts

| File | sha256 | bytes |
| --- | --- | --- |
| `src/composition-dag.ts` | `6D1ED656E9E7AF6F731A2C2EFF8B416421EBBDDC85FCEB259E5F699A401712A5` | 76490 |
| `test/s424-observation-cache-correctness.test.ts` | `680C9BBB11E53D9987AC4FC3632A7F424470E3A4C7DE92D37A78C6AD76805AEC` | 6312 |
| `test/s337-observation-families.test.ts` | `A7E584D61F8508BF0629F4613883383EE89C315F96FCC40F409B3F010610F5A5` | 2672 |
| `test/s334-observation-storage.test.ts` | `1E3D8548016F22C1571C55BF719371442F5C4D4EB5A1336A124AE1615F182A36` | 6128 |
| `test/s341-backend-storage.test.ts` | `8F89501BED8BA219CB72B1C2FCB9163D7165C06C9F06C086721878E019CD02FE` | 6020 |

The DAG hash matches the frozen value. The policy change is confined to the observation-storage region.

## Product behavior: mostly correct

- `readHydrated` now calls the supplied reader every time and never reads the cache or enqueues work (`composition-dag.ts:664-667`). s424 tests and a direct sequential probe confirm fresh v1/v2 reads and no queue work.
- `capacity` is validated as a positive integer (`:537-540`); explicit hydration snapshots are bounded by `boundCache` (`:552-558`), and writes delete the same-key snapshot before hydration (`:636-655`).
- Jobs carry a monotonic write sequence; `pendingWrites` fences an older same-key job after a newer write; failed/overflowed jobs install nothing (`:577-609`).
- A disposable probe of the actual new product with capacity 2 and six **sequential** persist+drain cycles reports six callbacks run and exactly 2 retained snapshots. Queue/timeout/abandon behavior in s334 remains 9/9.
- No unbounded key map was found: cache is bounded; `pendingWrites` is set only for keys with active/queued work (or a no-hydrate write while such work exists) and is deleted when no matching job remains (`:559-575,607-608`).

## HOLD 1 — abandoned generation catch overwrites the typed timeout with a late rejection

`abandonActiveJob` increments `generation`, records `ObservationHydrationJobTimeoutError`, and clears the active job (`composition-dag.ts:561-575`). The abandoned pump's `catch` has **no generation check**: a late rejection from the abandoned `job.run()` executes `hydrationError = error` (`:599-602`) before the later `runGeneration !== generation` return at `:605`. I reproduced this with a disposable probe:

- drain timed out with `ObservationHydrationTimeoutError` (and hydrationError was `ObservationHydrationJobTimeoutError`);
- after the abandoned promise rejected with a test error, `hydrationError().message` became **late-reject**, overwriting the typed timeout.

This is a real product defect in the abandonment path and contradicts the claimed typed timeout diagnosis. Fix: check `runGeneration === generation` in the catch before assigning/deleting anything (or move the generation check to the catch entry). Add a late-**reject** after-drain test; existing s334 only covers a late resolve.

## HOLD 2 — capacity test does not prove sequential bound

The s424 capacity test schedules six jobs in a tight loop with capacity 2 and awaits drain (`s424:66-77`). The queue overflows while the first jobs run, so only the callbacks that got queued can execute; the test therefore catches the old unbounded-cache symptom only partially. It does **not** prove six sequential successful hydrations each drain and all six callbacks run, then <=2 retained. The task asks exactly that. My independent sequential probe passes (6 callbacks, 2 retained), so the product behavior is likely correct, but the regression test must be strengthened: for each of six keys, persist/drain and assert the callback ran; after all six assert retained <=2. Current test is insufficient evidence.

## HOLD 3 — same-key overflow test is not an overflow; real root cleanup missing

- The “failed and overflowed hydration” test fills capacity with a hung job, then persists the same key (`s424:88-103`). Because the active job has been shifted out of `jobs`, the queue is empty when the same-key hydration is offered; it is queued, not overflowed. `hydrationError()` is already set by the earlier failed hydration, so the assertion can pass without exercising the overflow branch or the \`pendingWrites\` cleanup for a true same-key overflow. Add a real queue-full scenario (active + queued capacity consumed, then a same-key write/hydration) and assert the old snapshot is gone and no pending intent leaks.
- The real-SQLite test creates a temp root (`s424:54`) and never removes it. Add an `afterEach`/finally removal after the storage is closed; test roots should not accumulate.

## TDD/run/lint

- RED `s424-red.log`: **8 failed / 2 passed** in 10 tests (EXIT 1), including stale snapshot, queue work, capacity, write invalidation, late-old, capacity validation. No setup/import failure. The failures are behavioral.
- GREEN: 5 files / **34/34 passed**; host tsc exit 0 in my run.
- Absolute lint, filesScanned=1: composition-dag 161 (matches frozen baseline 161; observation region 495-730 has 0 findings); s424 0; s337 0; s334 2 pre-existing; s341 3 pre-existing. No new storage-region finding.

## Bounded verdict: HOLD

The mutable-read/snapshot design is correct in the normal and sequential paths, and tests/tsc/lint are mostly sound. The abandonment catch is a concrete behavioral defect (HOLD 1), and the capacity/overflow tests are not sufficient evidence for the claimed cases (HOLD 2/HOLD 3). Fix the generation guard, add the sequential and true same-key overflow tests, and clean the real-SQLite root; then re-run 34/34, tsc and the absolute scans. This is a bounded R23/R27 cache repair review, not whole R23/R27 or B1 completion.

No product/test/config file was modified; no commit.

## Final re-review after S428 repairs — PASS (bounded)

Active model verified **deepseek-flash**. Final hashes: composition-dag.ts `252D8B4148EDAD63CA52DCB0DEBB5F9FE7EEC2E35191D6B02663F567A98C40D2` (76703 B); s424 test `4584816DE68790C06F7BE6E6E382591EE1A3A708FC8719B1FE7445B5B5642BE2` (8227 B). No source overlay or edit by me.

- **Abandoned generation catch:** the catch now checks `runGeneration !== generation` before assigning `hydrationError` or touching `pendingWrites` (composition-dag.ts:599-604). `s424-red2.log` is the genuine behavioral RED: the late-rejection test failed with the error message `late-reject` instead of `ObservationHydrationJobTimeoutError` (line 172 assertion), then green2 is 36/36. The final test asserts the typed timeout/name survives and does not contain the late message.
- **Sequential capacity:** the test now performs six persist+drain cycles, asserts all six callbacks ran, and then retains at most two snapshots (s424:76-91). My earlier independent sequential probe also produced 6 callbacks/2 retained.
- **True same-key overflow:** the test fills the active+queue capacity (capacity 2), then writes/hydrates the same key and asserts the typed overflow, old snapshot removed/fallback, and a fresh same-key hydration succeeds after drain (s424:111-133). The previous non-overflow setup is gone.
- **Real SQLite cleanup:** the mutable-read test wraps the temp root in try/finally rmSync (s424:58-71); no root leak.
- **Pending bookkeeping/no unbounded map:** the bounded cache, sequence-fenced pendingWrites, no-hydrate invalidation and abandon cleanup remain; no new storage-region finding.

### Run/lint — PASS

5 files **36/36 passed**; host tsc exit 0. Absolute lint filesScanned=1: composition-dag 161 (baseline 161; observation region 495-730 zero findings); s424 0; s337 0; s334 2 pre-existing; s341 3 pre-existing. No new storage-region finding.

### FINAL BOUNDED VERDICT: PASS

The S424 cache repair now satisfies the mutable-read freshness/snapshot-bound/write-invalidation contract in the normal, sequential, true-overflow and abandoned-late-rejection cases, with behavioral RED2 and 36/36 green. This is not whole R23/R27 completion; durable async rich-graph hydration/TTL/revision authority and other composition owners remain out of scope. No product/test/config file was modified; no commit made.

