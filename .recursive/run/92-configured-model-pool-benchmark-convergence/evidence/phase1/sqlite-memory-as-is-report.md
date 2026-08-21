# AS-IS Evidence — sqlite-memory persistence layer (Run 92 Phase 1)

Captured by delegated subagent `ead91e56` on `2026-08-21`, verified against source in
`role-model-router/packages/sqlite-memory/src/index.ts`.

## Key findings

- Endpoint row identity: `runtime_endpoints.endpoint_id TEXT PRIMARY KEY` (index.ts:504). Effort
  variant is encoded into `endpoint_id` (`{base}-{encodeURIComponent(effort)}`) via
  `createEndpointInstanceIdentity` (endpoint-registry/src/effort-instance-identity.ts:71-90) and
  also stored in nullable `reasoning_effort` (index.ts:512). No DB uniqueness constraint on the
  natural `(provider_account_id, model_id, region, reasoning_effort)` tuple.
- Profiles/samples are attributed by `endpoint_id` ONLY — never joined to `runtime_endpoints`:
  `readLatestBenchmarkProfilesByEndpointIds` (index.ts:4799-4842) re-aggregates raw
  `source_type='benchmark'` samples on the fly; `readLatestObservedProfile(s)` (4941-5003) reads
  materialized live-only snapshots.
- Benchmark "latest" = re-aggregation of ALL retained benchmark samples with NO completion-state,
  suite/version, or freshness filter at read time (index.ts:4814-4839).
- Clear operations are NOT transactional and are split: DB sample delete + profile rebuild
  (`clearObservedBenchmarkDataForEndpoint` 4033-4061, `clearAllObservedBenchmarkData` 4073-4109)
  vs filesystem `clearBenchmarkRunArtifacts` (4119-4135). No single atomic DB+artifact clear.
- Controller assignment: `runtime_controller_assignments` keyed by `scope` (index.ts:535-541);
  `upsertRuntimeControllerAssignment` (2174-2190), `readRuntimeControllerAssignment` (2192-2212),
  `deleteRuntimeControllerAssignment` (2214-2220).
- Legacy effort-variant repair lives in runtime-host-bridge (not sqlite-memory):
  `repairPersistedProviderAccountsFromRuntimeState` (runtime-host-bridge/src/index.ts:16752-16875).
- No production fixture/mock/synthetic fallback in sqlite-memory/src.
