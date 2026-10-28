# S323 — B6/R27 partial-shutdown Lead acceptance

- Reviewer: s9 (deepseek-flash) FINAL PASS after two HOLD rounds — evidence/other/s322-partial-shutdown-review.md sha256 `7D0988B79421A26B35660057B3B33C3EBB09FCB6AF1452351ABDCE6BC9DBCCAA`.
- Committed bytes verified by Lead: composition-dag.ts `9590F9C673B0EE5A8CBB160CB60C97C3B68849F3E101055886EBB5E99E5AE189` (58701 B), cli.ts `2D374E8FDF106F640573E323B3A90723937A511CB36284BC0EAA81A547C31C85` (592920 B), test `B8A90157B5F51F1D196C1846C837E65E0FDFBEACD569C2223D1920A75FD139DA` (9602 B), index.ts unchanged `2D1232F6…`.
- Lead verification: suite 33/33 (6 affected files), tsc 0, test lint clean, DAG 161 classified (no new).
- What landed: ServerOwner.shutdown ordering stopAccepting -> join(BOUNDED, ServerJoinTimeoutError, 10s default) -> interrupt -> transport.close -> backend.close via runReleaseAll (all steps run, AggregateError, no early exit; hung keep-alive proven at 29ms); BackendOwner.close carries the REAL production teardown (closePackagedRuntimeOnce threaded cli -> createCliServerOptions -> composeBackendOwner); packaged Effect Scope closed through a onceClose-backed finalizer (acquireRelease ownership preserved, exactly-once across DAG shutdown + hostScope close).
- R27 partial-shutdown clause now holds in PRODUCTION, not just the contract.
