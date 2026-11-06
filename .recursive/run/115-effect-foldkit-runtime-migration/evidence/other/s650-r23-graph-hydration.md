# S650 R23 rich graph hydration

Basis: public worktree, HEAD 0a0aebcf plus working tree (R5/R14 committed). Strict TDD. No private-repo or unrelated product edits.

## Gap and placement

R23's rich-graph clause was unmet for the production path: `composeBackendStorage` created the content-addressed file graph only when `useFixtures === true && trackBOperationsEndpoint === ""`, so production readback fell through to the compact SQL record. Hydration belongs at the host bridge boundary: the SQL row is the bounded pointer, and the graph store is the content-addressed rich authority.

## Change

- `composition-dag.ts`: a local graph authority is now created whenever no Track-B operations endpoint is configured (fixtures no longer gate it). A configured remote Track-B endpoint still owns the graph and leaves the local store undefined.
- `observation-graph.ts` (new): `readHydratedObservationGraph` reads `runtime_observations.observation_json`, resolves either an inline artifact reference or the legacy `legacy_graph_migration_refs` row on the same database, dereferences the content-addressed artifact, validates its sha256 and request identity, and returns the typed `HydratedObservationGraph` (requestId, scope, artifact id, content hash, rich graph). Missing row returns null; inconsistent/mismatched content throws instead of returning partial data.

## TDD evidence

- RED: `evidence/logs/s650-r23-graph-red.log` — 3/3 failed, first assertion `expected undefined to be defined` for the production graph store (not a missing module/setup failure). A temporary throwing scaffold only allowed the behavioural assertions to run; it was replaced by the implementation.
- GREEN: `evidence/logs/s650-r23-graph-green.log` — new suite 3/3; storage regressions 12/12; SQL package regressions 48/48 (sqlite-service, s268, s273, s307, s18a); host `tsc --noEmit` exit 0; anti-slop clean on new files and changed region.
- Real SQLite and real file graph store are used in the new tests; no mock-only hydration claim.

## Remaining

- R23 async observation ownership/backup/restore drain clause is separate and remains as previously audited; this slice closes only rich graph hydration and production graph authority.
- Independent review is delegated to the Lead (this worker has no child-agent depth).
