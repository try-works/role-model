# S26o audit every ported route against the real packaged host (public, R13)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The browser visual pass against the packaged artifact found a defect that tests did not:

`/runtime` renders `Runtime read failed: invalid response` (`data-readback-state="error"`) against the packaged backend, while its unit test passes with an invented body. This is the same class as the `/dashboard` bug already fixed.

## Required work
1. Build a route-to-endpoint audit table for EVERY ported route (readback + control + observability + diagnostics): the client path it calls, the parser it applies, and the REAL response captured from the packaged runtime on an ephemeral port with a temp state root.
2. For each mismatch, fix the parser (or the path) against the real body shape - read the host handler to confirm field names, do not invent them.
3. Replace invented test bodies with bodies captured from the packaged host (saved as fixtures under the client's test fixtures directory), and keep a test per route that parses the captured body.
4. Add a route-level contract test that fails if a parser rejects its captured fixture, so this class cannot silently return.
5. Report the audit table: route, endpoint, real status, parser result before/after, and any route that genuinely cannot parse because the host shape is ambiguous.

## Files
`apps/runtime-ui-next/src/**`, its tests and fixtures; evidence `s26o-*`.

NO legacy/host changes, no ECharts, no packaging, no installs, no commits, no subagents; ephemeral ports and temp state only.

## Report
The audit table, the fixed parsers with host field names, the captured fixtures, the contract test, and anything still uncertain.