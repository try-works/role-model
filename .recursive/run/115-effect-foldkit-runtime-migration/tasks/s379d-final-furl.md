# S379d — final F-URL families (LANDED 3 of 5; 2 stay explicit NotFound)

Region: UI route/legacy-redirect/view/init/readback/runtime-endpoints/update + tests.

## Real readback sources (enumerated first)
- llama-swap models -> GET /api/role-model/local/llama-swap/models (host route index.ts:20134; models + /load + /roles under the same prefix).
- system operator -> GET /api/role-model/operator/status + GET /api/role-model/operator/trace-roots (host routes; original operator-controls page fetches fetchOperatorStatus + fetchOperatorTraceRoots).
- system extensions -> GET /api/role-model/extensions (host route index.ts:18656; original page fetchExtensions).
- llama-swap policy -> NO host readback route exists (/api/role-model/local/llama-swap/policy absent); original local-policy.tsx page exists but the shell/host serves no policy readback.
- llama-swap matrix -> NO host readback route exists (/api/role-model/local/llama-swap/matrix absent).
Both unlandable families stay explicit NotFound with their recorded MISSING reasons; no fabricated projection.

## Landed
- route.ts: LocalLlamaSwapModels, SystemOperator, SystemExtensions + /local/llama-swap/models, /system/operator, /system/extensions.
- runtime-endpoints/readback: localLlamaSwapModels, operatorStatus, operatorTraceRoots, extensions keys + paths + generic parse (same bounded parser used by the Learning family) + clients.
- init.ts: models/extensions dispatch one readback; SystemOperator dispatches operatorStatus + operatorTraceRoots together; update.ts route->key mapping and noop defaults include the four keys.
- view.ts: finalFamilyPage renders one or more real readback sections under data-route + data-final-family-state (loading/error/empty/ok); SystemOperator shows Operator status + Trace roots; nav entries added.
- legacy-redirects.ts: CANONICAL_TARGETS for /app/local/llama-swap/models, /app/system/operator, /app/system/extensions; their MISSING entries removed. /app/local/llama-swap/policy and /matrix remain explicit NotFound.

## Final F-URL arithmetic
- Supported original paths 47 -> 50; MISSING 5 -> 2; root index /. Partition: 50 + 1 + 2 = 53 original canonical patterns accounted.
- s269 pins: 50 supported (48 static + 2 dynamic detail), 2 missing; scene missing-target probe moved from the now-landed /app/local/llama-swap/models to /app/local/llama-swap/policy.

## Tests
- test/s389-final-furl.test.ts: typed parse of the three routes; canonicalisation of the three original URLs with query/hash + exactly one ReplaceLegacyUrl; MISSING = exactly [policy, matrix] and both NotFound; requestId families unchanged; DOM states (models loading->ok, extensions error, operator ok).
- RED s389-red.log EXIT_CODE=1 (pre-implementation); GREEN s389-green.log 5 files / 125 tests; UI tsc exit 0.

## Hashes
route 214DE88D..., legacy-redirects F94AA3C4..., view C24E817A..., init E619141E..., readback 539652F9..., runtime-endpoints 0C865C1C..., update 50BBA3EA..., s389 test E559AE59..., s269 test 89D0846A..., scene 42C16A75....

Lint: s389 clean (0), s269 clean (0), scene clean (0).
