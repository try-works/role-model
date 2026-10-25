# S114/S115 R27: graph identity pinned, metadata cache identity implemented

## S114 - "closed once per owner, not recreated per request"

R27 states the graph is closed once per owner. That is now a **pinned property**, not a claim:

`test/s114-composition-identity.test.ts` builds `CompositionLayer` twice through **one memo map** and asserts the service instances are **identical** (`===`), and twice through **fresh memo maps** and asserts the instances are different objects with the same declared id.

Both pass. The property was already true; the test makes it falsifiable - a refactor that wrapped the layer in `Layer.fresh` per call would now fail a test instead of silently rebuilding the graph on every request.

## S115 - the metadata cache now exists with real identity

R27 lists cache identity among the unmodelled behaviours. Implemented in `composition-dag.ts`:

- `metadataCacheKey({authorityId, configGeneration, modelId})` - composite key; **NUL-separated** so an id containing a separator cannot collide with another field.
- `makeMetadataCache({capacity, ttlMs})` with `get(key, now)`, `set(key, value, now)`, `invalidateGeneration(generation)`, `size()`.
- **TTL** measured against an injected `now` (no wall clock in the logic, so the test is deterministic).
- **Capacity eviction** in insertion order; the generation is stored on the entry so `invalidateGeneration` removes exactly the superseded entries.

TDD: the test file was written and run **first** and failed on the missing exports (RED), then the implementation turned it green - 5 cases: key distinctness, TTL expiry, capacity eviction, generation invalidation, and an observable size.

```
S115 (5) + S21a shape (6) + S114 identity (2) = 13 passed
tsc = 0
```

## What R27 still needs

Unchanged and explicit: rewiring the real host onto these services (acquisition is still imperative in `cli.ts`), early readiness/partial shutdown, per-run judge/throttle isolation, and benchmark cancellation/overlap isolation. This slice adds the cache shape and pins the identity contract; it does not move the runtime onto the DAG.