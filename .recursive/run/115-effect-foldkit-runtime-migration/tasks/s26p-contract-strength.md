# S26p make the captured contracts able to fail (public, R13)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The audit fixed four parsers but its contract test only pins two, and it is self-fulfilling: it calls the production parser on a file and asserts only 'not error'. Reverting `parseDashboard` or `parseObserveActivity` keeps it green.

## Required work
1. FIXTURE MANIFEST: every fixture carries the URL, HTTP status, capture timestamp and sha256 it was captured from, plus the artifact identity it came from. The test asserts the recorded hash matches the file.
2. ROW-LEVEL ASSERTIONS: each contract asserts the parsed rows/values it expects (counts, ids, labels, units), not just a status. A parser that silently returns empty where the fixture has rows must fail.
3. PIN THE TWO FIXES: capture or construct a NON-EMPTY dashboard summary (`requestCount > 0`, tokens/cost/latency) and a non-empty `items` list for activity, then assert the rendered values. Reverting the old lookups must now FAIL.
4. REJECT INVALID BODIES: `endpoints.json` -> `[{}]` must be an error, not an indexed row. Add invalid-body cases per route family and assert the error state.
5. CAPTURE THE MISSING BODIES: observability snapshot (a real GET), a diagnostics read with a writer configured so the response has records, and ONE real control action (POST/PATCH) whose response is captured - not only the client-side request assertion.
6. Prove the suite can fail: revert each fixed parser in turn and show the contract RED, then restore.

## Files
`apps/runtime-ui-next/test/**`, `test/fixtures/s26o/**` (or a new fixtures dir), `src/**` where a parser genuinely needs a fix.

NO legacy/host changes unless a writer configuration is needed for the diagnostics capture (say so), no ECharts, no packaging, no installs, no commits, no subagents; ephemeral ports and temp state only.

## Report
The manifest shape, row-level expectations per route, the non-empty dashboard/activity fixtures, the invalid-body cases, the three newly captured bodies, the per-parser mutation REDs, counts and typecheck.