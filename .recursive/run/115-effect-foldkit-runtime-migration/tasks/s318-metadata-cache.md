# S318 — R27 metadata-cache identity: characterization and design (recorded BEFORE edits)

Task-24 (rev 2). Model: deepseek-flash (verified live). Backups E:/rm-tmp/s318; no commit.

## Current state (read, cited)

- DAG cache exists but is unwired: `composition-dag.ts:206` MetadataCacheKeyInput,
  :213 metadataCacheKey(authorityId, configGeneration, modelId) (NUL separated), :218 MetadataCacheContract,
  :231 makeMetadataCache (TTL + cap + invalidateGeneration). No Context.Service/Layer, no host use.
- Live routing prep cache: `index.ts:27302-27317` builds routingPrepRegistryIdentity (registry hash) and
  `routingPrepTickKey = <registryIdentity>:<TTL-tick>`; keys at :27319-27332 are
  `observed-profiles:<...>:<difficulty>` and `live-telemetry:<...>:<minSamples>`. TTL is the only staleness
  control; no authority/config generation and no invalidate call in the host.
- Routing prep cache implementation: `routing-prep-cache.ts` (TTL + bounded entries + in-flight coalescing).
- Config object: `currentUnifiedRuntimeConfig` in the backend closure; config updates go through
  rebuildCurrentState paths.

## Design (scope: composition-dag.ts + the routing-prep key construction region :27302-27332 + tests)

1. DAG registers `MetadataCacheService` (Context.Service over an owner contract): authorityId from
   CompositionConfig, config generation tracked by identity, keyFor(model) = metadataCacheKey(authority,
   generation, model), noteConfig(configIdentity) bumps the generation and invalidates the previous
   generation's entries when the identity changes (generation invalidation, not TTL-only). Layer +
   composeMetadataCacheOwner singleton.
2. Host wiring at the exact key-construction region: derive a stable config identity from
   currentUnifiedRuntimeConfig (sha256 of JSON, DAG helper), call noteConfig, and prefix the routing-prep keys
   with metadataCacheKey(authority, generation, registryIdentity) instead of the tick alone; additionally
   get/set a registry metadata entry through the DAG cache keyed by that generation (real routing read).
   routing-prep-cache keeps its TTL/coalescing role; the DAG cache owns identity + generation invalidation.
3. NEVER deduplicate distinct stochastic inference: the metadata cache stores metadata only; a source guard test
   asserts the host's metadata-cache wiring in the routing-prep region never touches executeChatCompletions/
   executeResponses, and a behavioral test asserts two same-shape stochastic inference invocations are both
   executed (distinct results) while the metadata-cache size is unchanged by them.
## Outcome (LANDED)

- MetadataCacheService registered in the DAG graph (CompositionServices union + layer), owner contract with authorityId/generation/keyFor/noteConfig/getSync/setSync/sizeSync; metadataConfigIdentity = sha256 of the config object.
- Live routing prep (:27302-27332) calls noteConfig(currentUnifiedRuntimeConfig identity), builds keys with metadataCacheKey(authority, generation, registryIdentity) + TTL bucket, and reads/writes registry metadata through the DAG cache keyed by generation.
- Generation invalidation test + TTL/cap test + no-dedup test + wiring guard: GREEN 6 files / 26 tests; tsc exit 0.
- Hashes: composition-dag 0461E824..., index AEC419BB..., cli unchanged C6AFCD73..., test 938B1E91.... Backups E:/rm-tmp/s318.
## S319 repair (LANDED)

1. LIVE-CACHE PAYLOAD: the DAG cache holds the observed-profiles JSON (JSON.stringify written on miss, JSON.parse read for the routing decision) keyed by authority+generation; the identity-marker entry removed. Owner TTL/cap configured from routingPrepCacheTtlMs (capacity 1024).
2. NO-DEDUP NARROWED: test 'narrowed no-dedup scope: the metadata cache has no stochastic-inference dedup API' asserts no in-flight/coalesce/dedup surface and single-entry overwrite; remaining scope: real provider stochastic path not exercised (no inference cached).
3. LINT: metadataConfigIdentity(config: object | null | undefined) — unknown parameter removed; DAG findings now the moved-boundary cast class only; test clean.
- RED s318-red2.log 1 failed -> GREEN s318-green2.log 6 files / 26 tests; tsc exit 0. Hashes: dag DB0D7B3A..., index AE56B17B..., test C74E3A42....
