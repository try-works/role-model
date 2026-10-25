# S25d request/response parity for the diagnostics route (public, R12/R14)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
R12 requires the new client's requests to preserve the fallback/error/request semantics of the old one: method, path, query, body, relevant headers, multiplicity, status and stream. R14 wants a self-validating parity harness. Do this for ONE route - the diagnostics read - as the pattern for the rest.

## Read first
1. The legacy request path: `packages/ui-parity` or `apps/runtime-ui` for how the old client issues the diagnostics read.
2. The new client: `apps/runtime-ui-next/src/diagnostics-client.ts`.
3. R12 and R14 in `00-requirements.md` (lines 124-146).

## Required work
1. Build a small, deterministic REQUEST-INVENTORY comparator: run the same scenario through both clients against an injected fetch, capture method, path, query keys, body, the relevant header set, request multiplicity and the response status handling, and compare them as data.
2. Assert the comparison in a test, and make it self-validating: a mutation to the new client's method, path, header or multiplicity must fail with the differing field named.
3. Where the two clients genuinely differ (for example the new client omits a header the host accepts), record the difference and classify it as intended or a defect - do not silently normalize it away.
4. State what the comparator does NOT cover (streams, redirects, retries).

## Files you may write
- a comparator module plus test under `packages/ui-parity` or `apps/runtime-ui-next/test`
- `evidence/logs/s25d-*` and `evidence/other/s25d-tdd.json`

No product behaviour changes to either client unless a real defect is found; if you find one, report it before fixing.

## Strict TDD
RED per compared field. Report: the comparator's capture surface, the difference table with classifications, mutation REDs, counts and typecheck.