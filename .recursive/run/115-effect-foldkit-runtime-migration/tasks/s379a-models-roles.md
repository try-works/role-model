# S379a — Models/roles family canonical URL (LANDED)

Region: UI route/legacy-redirect/init modules + view/nav + tests; no other families.

## Landed
- route.ts: ModelsRoles case + modelsRolesRouter (/models/roles), added to appRouter after Models; typed parse/build via the existing Route union.
- legacy-redirects.ts: CANONICAL_TARGETS '/app/models/roles' -> '/models/roles'; removed /app/models/roles from MISSING_ORIGINAL_TARGETS (now 14). /app/control/roles already mapped to /app/models/roles, so it now resolves through the existing ReplaceLegacyUrl Command; query/hash preserved by canonicalHref (no new mapping logic).
- view.ts: ModelsRoles title, nav item ('Model roles', /models/roles, dataNav models-roles), and a minimal READ-ONLY roles page: role eligibility projected from configured models + endpoint role metadata; loading/empty/error states honest.
- s269-canonical-url.test.ts pins updated: 38 supported + / + 14 missing = 53; 17 resolvable + 3 missing redirect entries; /app/control/roles is now a resolvable redirect.

## Tests
- New test/s380-models-roles.test.ts (5 tests): typed /models/roles parse; /app/models/roles canonicalisation; legacy /app/control/roles with query+hash preserved and exactly one ReplaceLegacyUrl Command; remaining 14 missing families still explicit NotFound (no generic success); requestId detail families unchanged.
- GREEN s380-green.log: 5 files / 123 tests (s380 5 + s269 81 + s269 scene + s110 25 + s26n); UI tsc exit 0.

## Evidence
- RED s380-red.log: EXIT_CODE=1, 4/5 failed pre-implementation.
- Hashes: route 23E69112..., legacy-redirects 85A4892B..., view AE279FCC..., s380 test 16E7BD91..., s269 test 17078F9D....
- Lint: s380 clean (0), s269 clean (0).
## S381 repair (roles page state honesty)

- State model now includes BOTH readbacks: loading = models or endpoints loading/idle; error = either error; empty = models empty/rows empty or endpoints empty; ok otherwise. Message: 'Loading model roles…', the readback error message (models then endpoints), or 'No configured models.' The endpoints readback can no longer be masked as ok and its error can no longer be hidden.
- Wired the route: init.ts now dispatches configuredModels + modelEndpoints for ModelsRoles (same branch as Models), so the page has real loading/error/empty states instead of idle.
- New DOM page tests (mountShell at /models/roles with fetch stubs): 'renders loading while either readback is loading (endpoints loading is not masked as ok)', 'renders error with the readback message when either readback errors', 'renders empty when both readbacks are empty'.
- RED s380-red2.log: EXIT_CODE=1, 3 page-state tests failed pre-fix; GREEN s380-green2.log: 5 files / 126 tests; UI tsc exit 0. Hashes: view 46909409..., init DB5DC53C..., s380 test 2C9EC34B.... Lint: s380 clean (0).
