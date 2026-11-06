# S317 — Lead disposition: R27 Refresh owner + remaining B6 clauses

## Refresh owner — reclassified, no parallel owner fabricated

- s5's S316 characterization (evidence/other/s316-tdd.json, tasks/s316-refresh-owner.md): the R27 'refresh' semantics are (1) UI-layer — apps/runtime-ui-next/src/readback-flight.ts (in-flight GET sharing, a01230f0) + refresh.ts (telemetry invalidation, c88aecdf) — and (2) backend-internal state — the rebuildCurrentState closure (index.ts:22656, 38 sites) inside the Backend owner. The DAG RefreshContract is shape-only {id, eventLog}.
- DECISION: 'Refresh' is NOT a standalone DAG owner. The DAG owns refresh transitively through the Backend owner (Backend MOVED, 6ade412f). No parallel behaviorless owner will be fabricated.
- Named follow-ons: (F1) reclassify the runtime-ui-next refresh/readback-flight surface as the R27 client-refresh owner with its existing owner-local tests (evidence-only reclassification; no code); (F2) Backend-internal refresh service — extract rebuildCurrentState as a typed internal service of the Backend owner (Backend-internal split, later slice).

## R27 remaining clauses (s9b characterization, evidence/other/s316-r27-remaining-clauses.md)

- Early readiness: CLI bootstrapState projection (cli.ts:5117/12180 -> composition-dag.ts:640, enforced post-hoc index.ts:17530). Follow-on: DAG early-readiness owner (transition/gate consumed by Server admission; pending->ready/failed tests).
- Partial shutdown: one hostScope.close() (cli.ts:5155); ServerOwner closes transport only (composition-dag.ts:872-874); Backend has no close member (:531-534). Follow-on: DAG partial-shutdown owner (close/quiesce/join/interrupt; stop-admission->join->drain->interrupt with a failing dependency).
- Cache identity: MetadataCache implemented at composition-dag.ts:199-274 but UNWIRED; live routing keys (index.ts:27313-27317) carry no config generation/authority and are TTL-only. Follow-on (NEXT SLICE): DAG metadata-cache owner — register the service, feed metadataCacheKey(authority, configGeneration, model), wire routing prep, invalidate by generation on config change, TTL/cap tests, NEVER deduplicate distinct stochastic inference.
