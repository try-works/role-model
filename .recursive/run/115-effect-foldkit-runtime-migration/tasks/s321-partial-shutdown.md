# S321 — partial-shutdown owner (LANDED, RED evidence gap disclosed)

Scope identified before editing: composition-dag.ts Server/Backend owner contracts + index.ts listener/transport close hooks (bridgeServerTransport) + host-bridge test/**.

- ServerOwner.shutdown(): stopAccepting -> join -> interrupt -> transport.close -> backend.close via runReleaseAll (all releases run; AggregateError; no early exit). start()'s close delegates to shutdown (facade identity).
- BackendOwner close?: () => Promise<void> (host-provided, last).
- index transport implements stopAccepting/join/interrupt with an idempotent close (WeakMap of close promises).
- Tests: 5 (release-all, ordering, failing dependency, facade identity, seam) — 6 files / 28 tests GREEN; tsc 0.
- RED gap: no s321-red.log was captured before implementation (disclosed in evidence/other/s321-tdd.json).
- Hashes: composition-dag F971894E..., index 2D1232F6..., test 6154F3E8....
- Remaining: production backend close still via cli hostScope (cli outside task scope); DAG close member exists but wiring needs the cli shutdown region.
## S322 repair (LANDED)

| Item | Fix | Evidence |
| --- | --- | --- |
| Bounded join | ServerJoinTimeoutError + joinTimeoutMs (default 10s); join races transport.join() vs timer, typed rejection; runReleaseAll continues to interrupt/transport.close/backend.close | 'bounded join: a hung keep-alive connection does not block shutdown; interrupt runs after the bound' (~29ms; order stop-accepting -> join -> interrupt -> transport-close -> backend-close) |
| packagedScope leak | closePackagedScopeRef + onceClose finalizer closes Scope (Scope.close(packagedScope, Exit.void)); hostScope packagedRuntime resource = same closer | 'packaged runtime Effect scope closes exactly once across DAG shutdown and hostScope close'; source wiring test |
| Test lint | SAFETY comments on 5 as-never casts | anti_slop_lint test clean |

Final: tsc exit 0; 6 files / 33 tests passed (s321-green3.log). Hashes: composition-dag DEA2CE1A..., cli 2D374E8F..., test A72476E1....
## S322 lint micro-repair (LANDED)

- Test: SAFETY comments directly above each of the 7 as-never casts (lines 25,26,93,104,105,140,141); line 161 catch param typed Error. anti_slop_lint test = CLEAN.
- DAG: join rejection param typed Error; 161 findings unchanged (159 moved-boundary casts + 2 boundary no-unknown-returns), no new findings.
- GREEN s321-green4.log: 6 files / 33 tests; tsc 0. Hashes: composition-dag 9590F9C6..., test B8A90157....
