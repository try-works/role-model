# S26c make the inventory complete and its claims checkable (public, R13)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The review found the inventory misses real legacy UI and that several claims are unverified. Fix all six items - the inventory is only useful if it cannot lie.

## Fixes
1. COVERAGE: the scan is top-level-only and misses `app/root.tsx` (root layout/ErrorBoundary, rendered outside routes), `app/lib/role-task-hierarchy.tsx` and `app/lib/shell-header-context.tsx`. Recurse the scan over `app/**` (routes, components, lib, root) OR record explicit exclusions as data AND add a test that fails when a nested route file or a `routes.ts`-only addition appears. Add the three missing rows with correct categories.
2. STATUS: `route:app-layout` is marked `scaffolded`, but the new client has no `/app` route - visiting it yields NotFound. Correct that row (and any row relying on the same reasoning).
3. VERIFIED GATE: a `verified` row currently only requires the proof file to exist - `package.json` passes. Make the drift test require a NAMED test that exists and is executed for that row (parse the test name and assert the file contains it), and re-verify the one existing verified row under the stricter rule.
4. HOST-CLAIM: 'no legacy route needs a new host endpoint' is assumed. Add `hostEndpoints` (or `requiresHostEndpoint`) per row derived from the source, then correlate with the host's route table in a test so the claim is data-driven; if a row's endpoints are absent from the host, the test must fail.
5. CATEGORY CONSISTENCY: `device-authorization-modal` is `device-auth` while `llama-swap-setup-modal` is `modal` for the same widget kind, and `route:not-found` is `read` with no data read. Apply the vocabulary uniformly and record the rule you applied.
6. Keep the wave data (72 ids, unique) and the ordering. Update wave prose to reference the data rather than restating it.

## Files you may write
- `evidence/other/s26a-route-inventory.json`, `test/s26a-route-inventory.test.ts`
- `evidence/logs/s26c-*` and `evidence/other/s26c-tdd.json`

NO page or product changes. No installs, no commits, no subagents.

## Rules
RED first for each new check (nested route file, routes.ts-only route, verified-with-wrong-proof, endpoint missing from host). Report: the coverage mechanism chosen, the corrected statuses, the host correlation result, per-check RED/GREEN, counts and typecheck.