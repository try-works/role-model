# S379c — Learning family canonical URLs (LANDED)

Region: UI route/legacy-redirect/view/init/readback/runtime-endpoints/update + tests; no other families.

## Real readback sources enumerated (original React Learning tabs, learning.tsx fetch map)
- configuration -> GET /api/role-model/operator/learning/policy (fetchLearningPolicy; original Configuration tab)
- packs -> GET /api/role-model/operator/learning/records?kind=pack (fetchLearningRecords kind=pack; original Packs tab)
- decisions -> GET /api/role-model/operator/learning/decisions (fetchLearningDecisions)
- evidence -> GET /api/role-model/operator/learning/measurement (fetchLearningMeasurement; original Evidence tab)
- history -> GET /api/role-model/operator/learning/history (fetchLearningHistory)
All five exist in the host route table (index.ts operator/learning/* GET routes) and in the original page; no fabricated projection.

## Landed
- runtime-endpoints.ts: five READBACK_PATHS entries (packs keeps ?kind=pack).
- readback.ts: five ReadbackKeys + schema/state/empty/client entries; parseLearningFamily maps the real payload generically into bounded rows (items/rows/data or a single record; null -> honest failed readback).
- route.ts: LearningConfiguration, LearningPacks, LearningDecisions, LearningEvidence, LearningHistory + /learning/{configuration,packs,decisions,evidence,history} routers.
- init.ts: each tag dispatches its own readback once (loadingReadback); update.ts readbackKeyForRouteTag maps each tag and noop defaults include all five.
- view.ts: titles, nav entries, learningFamilyPage renders renderReadbackPage for the panel's own readback with data-learning-family-state = loading/error/empty/ok (idle -> loading).
- legacy-redirects.ts: CANONICAL_TARGETS for /app/learning/{configuration,packs,decisions,evidence,history}; the five MISSING entries removed (5 left: llama-swap models/policy/matrix, system operator/extensions). Existing /app/learning/* now resolve through ReplaceLegacyUrl with query/hash preserved.

## Counts
- MISSING 10 -> 5; supported 42 -> 47; 47 + / + 5 = 53. s269 pins updated (47 supported / 45 static / 5 missing).
- Scene test's missing target moved from the now-landed /app/learning/configuration to /app/local/llama-swap/models.

## Tests
- test/s386-learning-family.test.ts: typed parse of the five routes; canonicalisation of all five original paths; query/hash preserved + exactly one ReplaceLegacyUrl; MISSING = 5 with the rest NotFound; requestId families unchanged; DOM panel tests (decisions loading->ok, error honest, history ok) mounted with real readback clients and fetch stubs.
- RED s386-red.log EXIT_CODE=1 (7/8 failed pre-implementation); GREEN s386-green.log 5 files / 125 tests; UI tsc exit 0.

## Hashes
route B396AF3E..., legacy-redirects 3DF4C7E6..., view B74AD247..., init 34BAEEC0..., readback 8E9DC042..., runtime-endpoints 6E625379..., update 6149B141..., s386 test 4BB8F0BA..., s269 test 9904EB80..., scene F75EE9CF...

Lint: s386 clean (0), s269 clean (0), scene clean (0).
