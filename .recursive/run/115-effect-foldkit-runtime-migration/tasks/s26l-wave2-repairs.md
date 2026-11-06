# S26l fix the wave-2 overclaims and port the two detail routes (public, R13)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The refusals review found one REAL BUG and several overclaims. Fix the bug first.

## 1. REAL BUG - /dashboard parses the wrong shape
`parseDashboard` reads `record.requests`, but `READBACK_PATHS.dashboard` points at `/api/role-model/telemetry/summary`, whose host body is `RuntimeTelemetrySummary` (`requestCount`, `successCount`, ...). The verified page would render EMPTY against the real host; the test only passes because it feeds a fabricated `{requests:[...]}` body. Fix the parser to the real host shape (read the host handler to confirm the fields) and add a test using a body captured from the host's own type/fixture - not a hand-invented one. Check the other verified readbacks for the same class of mismatch while you are there, and report any you find.

## 2. Port the two dynamic detail routes instead of refusing them
The mechanism already exists in this codebase: `Route.string("id")` parameters (`src/app.ts` diagnostics). Extend the shared surface rather than forking it: the spec path becomes a builder over params, the read command carries `{key, token, params}`, and the key includes the params so per-record state stays one slot for the visible detail. Host endpoints exist (`/api/role-model/requests/<id>`, `/api/role-model/router/decisions/<id>`). Assert both with tests, including that a different id replaces the visible detail.

## 3. Correct the chart refusal reason
The five presentational components do NOT use ECharts (they use recharts and the UI kit, or are pure). Replace the wrong reason with the true one, and split the overclaim: the dashboard/observe-activity ROUTE being verified does not mean their chart JOURNEY is ported. Say that explicitly in the inventory or evidence.

## 4. Record the missing absence reason
`component:telemetry-controls` is absent with NO reason and was silently dropped from the read denominator. Give it a reason and make the counts report both denominators honestly (read routes vs read items).

## 5. Make the claims testable
Add a test that a row cannot be marked `verified` without its named proof (already exists) AND one that an `absent` row must carry a reason - so the next silent drop fails. Add a test that the wave totals in the inventory match the rows.

## Files
`apps/runtime-ui-next/src/**`, tests, inventory; `evidence/logs/s26l-*`; `evidence/other/s26l-tdd.json`.

NO legacy/host changes, no ECharts, no packaging, no installs, no commits, no subagents.

## TDD
RED for the dashboard mismatch (real body), the detail routes, the absence-reason rule and the totals rule. Report the parser fix with the host field names, both detail routes, corrected reasons, RED/GREEN, counts and typecheck.