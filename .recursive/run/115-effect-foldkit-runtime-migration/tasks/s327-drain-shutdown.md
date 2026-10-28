# S327 — R27 Drain shutdown-phase wiring (characterization recorded before edits)

Scope regions: composition-dag.ts (ServerOwnerInput drains + bounded drain helper); cli.ts queue-runtime creation sites 8588/8615/8669/8726 (stop() never called), outbox drain 8874-8876/5348 (never joined), auto-replay stop 5163 (standalone), startServer lifecycle wiring; index.ts route-capture drain 21199-21231 (void fire-and-forget) + exported join handle; test/**.

Design: DAG owns the phase contract: ShutdownDrain {name, run, timeoutMs} + DrainTimeoutError (code DRAIN_TIMEOUT) + boundedDrain; ServerOwner.shutdown inserts drains after join and before interrupt, inside runReleaseAll (failing drain cannot skip later releases; no early exit). Production cli registers the four queue-runtime stops, auto-replay stop, post-observation outbox drain and the route-capture drain join, passing them through the startBridgeServer lifecycle into the DAG owner; the standalone auto-replay stop is removed (it is now a phase step).

RED: s327-red.log before implementation (drains unsupported / imports missing / no stop wiring).
## Outcome (LANDED)

- DAG: DrainTimeoutError (code DRAIN_TIMEOUT), ShutdownDrain {name, run, timeoutMs}, boundedDrain (default 5s); ServerOwnerInput.drains inserted between join and interrupt inside runReleaseAll (a failing/hung drain cannot skip later drains, interrupt, transport.close or backend.close; failures aggregate).
- CLI: shutdownDrains registry at hostScope: auto-replay stop (standalone stop removed), route-capture join (drainDeferredRouteCapture), four queue-runtime stops (replay/evaluation/learner-derive/learner-promote — previously never called), post-observation outbox drain; passed through startBridgeServer lifecycle into the DAG owner.
- INDEX: route-capture drain promise captured (activeDrain) and exposed as drainDeferredRouteCapture for the shutdown phase; the previous void fire-and-forget remains the schedule path but the in-flight drain is joinable.

Evidence: RED s327-red.log 3/3 failed (pre-implementation); GREEN s327-green.log 6 files / 36 tests; tsc exit 0. Hashes: composition-dag C1BECB52..., index 909BB4D2..., cli BE9BD078..., test 924BBA70.... Lint: DAG 161 (unchanged classification), test CLEAN (repo-relative target).
