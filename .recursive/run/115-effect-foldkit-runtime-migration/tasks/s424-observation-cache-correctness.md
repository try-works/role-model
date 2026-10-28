# S424 — observation mutable-read freshness and snapshot bounds (verified bounded; S428 independent PASS)

Patch basis public 71151644. Active author model verified deepseek-flash via list_agents. TDD Mode: strict.

## Behavioral RED before product
evidence/logs/s424-red.log: EXIT_CODE=1, 10 tests / 8 failed, captured with the new real test suite before any source edit:
- readHydrated returned captured {version:1} after drain instead of {version:2};
- fresh readHydrated calls created queue work (queueDepth 1, cached snapshot);
- readHydrated served an explicit snapshot instead of the live reader;
- capacity 2 retained 3+ snapshots across 6 keys;
- a successful write left the old same-key snapshot authoritative;
- failed/overflowed hydration left the old snapshot authoritative;
- a late old hydration restored {stale:true} after a newer same-key write;
- capacity 0/negative/NaN were accepted.
These are assertion failures on real code, no missing-module/setup failure. One real-SQLite mutable-read test (telemetry summary) was included in the suite and now verifies fresh persisted telemetry between reads.

## Design (single file: role-model-router/apps/runtime-host-bridge/src/composition-dag.ts)
- readHydrated(key, read): MUTABLE facade. Calls read() on EVERY invocation and returns its exact value/error; no cache read, no capture, no queue/job creation. Comment documents that it is not an async/nonblocking claim.
- read(key, read): explicit SNAPSHOT compatibility API only. Returns a bounded successful hydration snapshot if present, otherwise the synchronous read(). Snapshots are created only by persist(..., hydrate, key); never by readHydrated.
- Bounds: positive integer capacity is the hard snapshot bound and is validated (0/negative/NaN/fraction -> RangeError "observation storage capacity must be a positive integer"). Cache is a Map bounded to capacity by evicting oldest entries after insertion; no unbounded Map.
- Invalidation/order: every successful write increments a monotonic write sequence and deletes the key's old snapshot immediately (a failed write changes nothing). Each hydration job carries its write sequence. A newer same-key write sets a pending-write intent that fences the older job; a late older job cannot install its value. Failed hydration installs nothing; overflow installs nothing. pendingWrites bookkeeping is keyed only for keys with active/queued hydrations (<= queue capacity + one active), and is cleaned when no matching job remains; no per-key revision map.
- Queue/drain/timeout/abandonment behavior preserved (same 5s drain watchdog, job timeout typed error, generation abandonment, pending accounting, later-job progress). Overflow remains typed at queue capacity; writes still apply; drain joins.
- Invalid capacity is rejected at construction, not normalized to unbounded.

## Tests
- NEW test/s424-observation-cache-correctness.test.ts: 10 behavioral tests covering readHydrated freshness/no async work, explicit snapshot vs live distinction, real disposable SQLite mutable read, capacity bound across 6 keys, write invalidation, failed+overflowed hydration, late-old hydration fence, invalid capacity rejection, sync read/write error identity.
- test/s337: prior stale expectation (readHydrated value1 reused as value2) corrected to the original mutable-read semantic, with fallbackCalls=2; no assertion deletion. persist-family snapshot test preserved.
- test/s334: queue overflow/drain/hung/timeout/abandonment tests unchanged and passing.
- test/s341: backend storage close/drain and identity tests passing (no diagnosticRecords dependency).

## Evidence
- RED: evidence/logs/s424-red.log (EXIT_CODE=1, 8/10 failed).
- GREEN: evidence/logs/s424-green.log: EXIT_CODE=0, 5 files / 34 tests (s424 10 + s334 9 + s337 4 + s341 6 + s421 5). Host tsc EXIT=0.
- anti_slop_lint absolute effect:true: composition-dag.ts filesScanned=1, total 161 findings = HEAD baseline 161; observation-storage region (lines 495-730) has 0 findings. Tests: s424 clean (0, 1 file); s337 clean (0, 1 file); s334 2 pre-existing findings at 29/105 no-object-parameters; s341 3 pre-existing at 58/59/93 (known-value-widening, safety-cast comments). No new storage-region findings; full-file baseline disclosed, not a clean-product claim.
- Real DB: s424 SQLite test persists telemetry between two readHydrated calls and observes requestCount 1 -> 2; no mocks-only freshness.

## Hashes
- src/composition-dag.ts 76490 B 6D1ED656E9E7AF6F731A2C2EFF8B416421EBBDDC85FCEB259E5F699A401712A5
- test/s424-observation-cache-correctness.test.ts 6312 B 680C9BBB11E53D9987AC4FC3632A7F424470E3A4C7DE92D37A78C6AD76805AEC
- test/s334-observation-storage.test.ts 6128 B 1E3D8548016F22C1571C55BF719371442F5C4D4EB5A1336A124AE1615F182A36
- test/s337-observation-families.test.ts 2672 B A7E584D61F8508BF0629F4613883383EE89C315F96FCC40F409B3F010610F5A5
- test/s341-backend-storage.test.ts 6020 B 8F89501BED8BA219CB72B1C2FCB9163D7165C06C9F06C086721878E019CD02FE

## Limitations / not claimed
- No real asynchronous rich-graph hydration or off-thread/nonblocking guarantee; that remains separate work.
- Explicit snapshots are process-lifetime compatibility state, not durable or revision-authoritative; no TTL/stale allowance added.
- This is a bounded R23/R27 correctness repair, not R23/R27 whole completion; metadata cache/TTL/cap and other composition owners untouched.
- Independent s9 review required before Lead commit. No commit made.
## S428 HOLD repair (author deepseek-flash; independent review pending)

Review evidence: evidence/other/s428-cache-review.md (HOLD 1 abandonment catch; HOLD 2 capacity test not sequential; HOLD 3 not a true overflow + SQLite root leak).

Chronology: strengthened tests were written and run BEFORE the product fix -> evidence/logs/s424-red2.log: EXIT_CODE=1, 12 tests / 1 failed: 'a late rejection after the drain timeout does not overwrite the typed timeout' (expected typed ObservationHydrationJobTimeoutError, received Error: late-reject). Sequential six-cycle and true-overflow tests passed at RED, confirming they exercise the intended normal/overflow paths rather than queue overflow.

Product fix (generation guard FIRST): pump catch now begins with `if (runGeneration !== generation) return;` BEFORE assigning hydrationError or deleting pendingWrites, so an abandoned job's late rejection cannot overwrite the typed job-timeout diagnostic or mutate bookkeeping. No scheduler/framework rewrite; only composition-dag observation storage.

Tests strengthened:
- Six SEQUENTIAL persist/drain cycles with capacity 2: all 6 hydration callbacks run, retained snapshots <= 2.
- True same-key overflow: old snapshot hydrated, then active + two queued jobs fill capacity 2, then same-key hydrate is offered -> typed ObservationHydrationOverflowError, old snapshot is gone, and after draining a fresh same-key hydrate succeeds.
- Late REJECTION after 5s drain timeout: drain rejects ObservationHydrationTimeoutError; hydrationError stays ObservationHydrationJobTimeoutError with the typed 'job timed out' message after the late rejection settles.
- Real SQLite root removed in finally (awaited cleanup path).

GREEN2: evidence/logs/s424-green2.log EXIT_CODE=0, 5 files / 36 tests (s424 12 + s334 9 + s337 4 + s341 6 + s421 5). Host tsc EXIT=0.

Lint absolute effect:true: s424 test clean (filesScanned=1, 0); composition-dag.ts 161 findings = HEAD baseline 161, observation-storage region (495-745) 0 findings. Full-file baseline disclosed.

Frozen hashes after repair: composition-dag.ts 76703 B 252D8B4148EDAD63CA52DCB0DEBB5F9FE7EEC2E35191D6B02663F567A98C40D2; test/s424-observation-cache-correctness.test.ts 8227 B 4584816DE68790C06F7BE6E6E382591EE1A3A708FC8719B1FE7445B5B5642BE2. No commit.
