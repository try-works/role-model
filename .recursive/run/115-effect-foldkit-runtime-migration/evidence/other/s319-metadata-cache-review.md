# S319 — independent review: S318 R27 metadata-cache identity

Reviewer: `s9-private-readonly`, actual model **deepseek-flash** (live). Read-only on product files; no source edit, no commit. I ran the affected 6 files, tsc and anti-slop.

## Verified frozen artifacts

| File | sha256 | bytes |
| --- | --- | --- |
| `src/composition-dag.ts` | `0461E824EF03F2A23879E349FA98CDD741D6472FE72F52406D3F3C6A29776C40` | 54722 |
| `src/index.ts` | `AEC419BB4679AB97F2A9C59657F2EDB55FAB4D8344F5A72644BAB0330D4813FE` | 1364935 |
| `src/cli.ts` | `C6AFCD7354C2E5869D03B5D794974434B2B3308D49B29E8F0C1267EC0751F60A` | 592126 (byte-unchanged) |
| `test/s318-metadata-cache.test.ts` | `938B1E91971C9CF05C108230D28E8C4EAD5BEBFDB95C152E499159634CB876F8` | 4290 |

Backups `E:/rm-tmp/s318` exist for the pre-edit files. Affected 6 files: **26/26 pass**; tsc exit 0.

## Q1 — Key identity / generation invalidation: PASS

`metadataCacheKey` is authority NUL generation NUL model (`composition-dag:208-216`); `keyFor` uses the owner authority and current generation (`:305`); `noteConfig` invalidates the **previous generation** and bumps generation when the config identity changes (`:306-318`). The test asserts generation bump, `invalidated >= 1`, size 0, and a changed `keyFor` (`test:25-39`); the live routing path derives the sha256 config identity and calls `noteConfig` before building keys (`index:27320-27327`). No TTL-only identity fallback in that path: the generation is in the key and old entries are invalidated. PASS.

## Q2 — Wiring: PARTIAL (HOLD)

The live routing-prep region does prefix its `routingPrepTickKey` with `metadataCacheKey(...)` and does call `getSync/keyFor/setSync` through the DAG owner (`index:27318-27336`); the existing `routingPrepCache` TTL/coalescing remains for observed-profile/telemetry reads and does not silently drift because it is a separate cache. PASS for the key wiring and no double-cache collision.

But the DAG cache value written at the live site is only `routingPrepRegistryIdentity` (a registry hash string), not the routing metadata payload; it is written and never read for a decision. The actual metadata used by routing still comes from `routingPrepCache` (`index:27338-27361`). The claim “reads/writes registry metadata through the DAG cache” is therefore a warm marker, not a real metadata read/write. Required: either cache an actual metadata payload/readback used by routing, or label this explicitly as an identity marker and narrow the claim. The source-string wiring guard (`test:74-86`) cannot distinguish these.

## Q3 — No-dedup test: HOLD (tautology)

The test sets the same metadata key twice (size stays 1), then calls a **local** `runInference(seed)` twice and checks `calls === 2` and distinct results while the cache size stays 1 (`test:56-72`). `runInference` has no connection to the cache or to any routing/inference path; two direct function calls are necessarily two executions, and the unchanged metadata size is the metadata entry overwritten by the preceding sets. This is a size-only/tautological assertion with respect to “the cache never collapses distinct stochastic inference”; it would pass for any cache that deduplicated inference, because inference never enters it. The source guard separately asserts the metadata region never calls `executeChatCompletions/executeResponses` (`test:74-86`), but that is a different claim. Required: exercise the actual routing/provider path with two same-shape requests and assert both reach the provider (distinct results/call count), or explicitly scope the test to “metadata cache is not an inference cache” and remove the dedup proof claim.

## Q4 — TTL/cap/run: PASS

`makeMetadataCache` validates positive capacity and finite non-negative TTL, evicts insertion-order oldest above capacity, expires on TTL, and exposes `size` (`composition-dag:233-275`); the TTL/capacity test covers eviction and expiry (`test:41-54`). The owner defaults 256/30s (`:297`). Affected 6 files **26/26**, tsc exit 0; `cli.ts` hash is byte-unchanged.

## Q5 — Lint: HOLD (new finding not justified)

`anti_slop_lint(composition-dag.ts, effect:true)` = **162** findings: 159 `require-safety-comment-for-type-assertion`, 2 `no-unknown-returns`, and **one new `no-unknown-parameters` at `:343`** on `metadataConfigIdentity(config: unknown)`. That is the claimed +1, and it is new, not part of the moved/boundary set. There is no SAFETY/rationale or named domain type at the definition; the task doc records the count but does not justify this specific boundary. Required: give `config` a named domain type/schema (or record an explicit, reviewed justification), then keep the cache region otherwise clean. `anti_slop_lint(test/s318-metadata-cache.test.ts)` is clean.

## Q6 — Scope honesty: PARTIAL

The key/TTL/cap/invalidation contract does satisfy the structural part of R27's cache-identity clause: authority + generation + model keys, bounded size, TTL, generation invalidation. The live integration is not yet a cache of routing metadata; it is a generation-keyed identity marker beside the existing TTL/coalescing cache. The no-dedup proof is also not behavioral. So R27's cache-identity is advanced structurally, but not honestly complete at the live data path or the dedup claim.

## VERDICT: HOLD (3 required repairs)

1. **Make the live metadata cache write/read meaningful**: cache an actual routing metadata payload/readback used by routing (or explicitly scope it as an identity marker and correct the claim). The current `routingMetadataKey` value is only `routingPrepRegistryIdentity`.
2. **Replace the tautological no-dedup test**: exercise the real routing/provider path for two same-shape requests and prove both dispatch distinctly (or explicitly narrow the claim/remove the proof). The current `runInference` never touches the cache.
3. **Fix or explicitly justify the new `no-unknown-parameters` finding** at `composition-dag:343`; give `metadataConfigIdentity` a named domain input type/schema or record a reviewed boundary rationale.

No product file was modified; no commit made.

## Final re-review after payload/narrowed/lint fixes — PASS

Verified on-disk final hashes (the frozen set in the first final message was stale):

| File | sha256 | bytes |
| --- | --- | --- |
| `composition-dag.ts` | `95FBA09F9BF166ECE9486A138BFCE7C6EEC6E79C57364B839D44415E9DC4BA35` | 55065 |
| `index.ts` | `AE56B17BB3332CA221367F7F50D8BAB2E272DACB986552721EBC6305CA56DC4D` | 1365679 |
| `test/s318-metadata-cache.test.ts` | `BC8C7AFD010149BF79FB0144113C3CFB4F20762807712C5FBF78D920566B49D1` | 4733 |
| `cli.ts` | `C6AFCD7354C2E5869D03B5D794974434B2B3308D49B29E8F0C1267EC0751F60A` | 592126 (unchanged) |

- **Payload path is real:** on a metadata miss, `observedProfilesMetadataKey` is built with `keyFor("observed-profiles:<registry>:<bucket>")`, the value is `JSON.stringify(profiles)` after the coalesced `routingPrepCache.read`, and on a hit `JSON.parse(cachedObservedProfilesJson)` becomes `runtimeObservedProfiles` (`index:27333-27358`), which is consumed by the routing plan (`:27660,27665,29380`). The identity-marker write is gone. JSON round-trip is string/number/array/object-safe for this plain shape; there is no date/bigint/undefined-bearing payload. PASS.
- **TTL/cap parity:** `metadataCacheOwner = composeMetadataCacheOwner({capacity:1024, ttlMs: routingPrepCacheTtlMs})` (`index:21218-21221`), so the DAG cache follows the routing-prep TTL and a bounded 1024 cap; the `routingPrepCache` coalescing path is retained for misses. PASS.
- **Narrowed no-dedup is honest:** the test explicitly claims only that the metadata owner has no in-flight/dedupe/coalescing API (get/set/invalidate/size), and its comment states the real provider path is not exercised (`test:56-68`). It no longer claims the tautological `runInference` proof. PASS as a narrowed claim; the remaining scope is named in the task doc.
- **Lint matches final bytes:** DAG `effect:true` = **161**: 159 `require-safety-comment-for-type-assertion` (moved-boundary casts) + 2 `no-unknown-returns` boundary callbacks; the new `no-object-parameters` and `no-unknown-parameters` findings are gone. Test file is clean. PASS.
- **Run myself:** affected 6 files **26/26**; tsc exit 0; `cli.ts` byte-unchanged. The green re-run evidence agrees.

Residual non-blocking note: the wiring test remains a source-string guard, not an end-to-end hit/miss/provider execution assertion; the implementation path is real, but a future behavioral integration test would strengthen it. The narrowed no-dedup claim intentionally does not exercise the provider path.

## FINAL VERDICT: PASS

The payload path is real and feeds the decision, JSON round-trips, TTL/cap follow routing-prep settings, the no-dedup claim is honestly narrowed, and lint/test/verification are clean on the on-disk bytes. No remaining numbered items. No product file was modified; no commit made.

