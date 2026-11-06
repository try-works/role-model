# S340 — R23 graph-store family: STOP characterization (Backend factory split required)

Task-32. No product edits, no commit. Files byte-unchanged.

## Precisely identified regions (current HEAD)

- makeSync import: `src/index.ts:19`; its only construction is `openRetentionCleanupDatabase` (`:20970-20974`, separate retention connection, busy_timeout=0).
- SQLite initialization: `initializeSqliteMemory({ runtimeStateRoot, scopeId, channel })` at `src/index.ts:21185-21189`; its `databasePath` is used by every observation/telemetry/graph call in the backend closure.
- Graph file store: `src/index.ts:21276-21282` `localGraphStore = useFixtures && !configuredTrackBOperationsEndpoint ? createTrackBFileGraphStore({ scopeId, rootPath: <runtimeStateRoot>/<scopeId>/track-b-graph }) : undefined`.
- Observation storage currently created just after: `:21284` `composeObservationStorage({ capacity: 64 })` (module singleton; no runtime config).
- Graph-store consumers: persist paths `:21353`, `:29035-29036`, `:29940-29942`; read path `:21355` (+ fallback `:21375-21378`); direct graph artifact write `localGraphStore.write({...})` at `:29772-29782`; readBundle consumers keep passing the same store.

## Blocking closures / state

1. **Initialization ownership is backend-wide, not graph-scoped.** `initializeSqliteMemory` owns the database path/migrations; every sqlite-memory call in `createRuntimeBridgeBackend` (`:21000` closure) consumes `initialization.databasePath`. Moving it into the DAG service requires the service to be constructed per backend with `{ runtimeStateRoot, scopeId, channel }` — today `composeObservationStorage()` is a module singleton with no config and its identity is shared across backends. That is an identity/lifecycle change to the storage service itself, not a graph-family wiring.
2. **The graph store is fixture-mode conditional.** `useFixtures && !configuredTrackBOperationsEndpoint` is decided from fixture loading and the Track-B operations endpoint, and the graph store's rootPath depends on runtime scope. The service would need those inputs at construction, i.e. the service factory becomes part of the Backend factory.
3. **makeSync ownership means owning the retention connection too.** The only makeSync construction is the retention-cleanup connection (`:20970`); a service that "owns makeSync" must own this separate connection's lifecycle as well, or the statement is false.
4. **No dual store.** Keeping `initializeSqliteMemory`/`localGraphStore` in the backend closure while routing graph writes through a DAG service would leave two store owners for the same artifacts — exactly what the contract forbids. A graph-only migration is therefore not acceptable.

## Decision: STOP (S21d)

The graph family cannot be extracted without first moving the backend's SQLite initialization + storage lifecycle into a per-backend DAG storage factory and threading it through the Backend owner; that is the Backend factory split, and it should not be hidden in an observation-family slice.

## Unblock (next task shape)

1. Add DAG `composeBackendStorage({ runtimeStateRoot, scopeId, channel, useFixtures, trackBOperationsEndpoint })` returning `{ initialization, graphStore?, close() }` (owning makeSync connections + initializeSqliteMemory + createTrackBFileGraphStore, one close).
2. Construct it in the Backend factory region and expose it on the Backend owner (storage contract).
3. Index consumes `storage.initialization.databasePath` and `storage.graphStore`; graph persist/read go through the storage service with collision-free graph keys (`graph:<scope>:<artifact>`), using readHydrated/persist as established.
4. Migrate callers family-by-family with the caller table; close the storage in the shutdown phase.

## Caller table (graph family, stayed)

| Site | Current role | Status |
| --- | --- | --- |
| index.ts:21276-21282 | graph store construction | STAYED (blocked by factory split) |
| index.ts:21353, 29035-29036, 29940-29942 | persist graph into observation bundle | STAYED |
| index.ts:21355, 21375-21378 | read graph through observation bundle + fallback | STAYED |
| index.ts:29772-29782 | direct graph artifact write | STAYED |
