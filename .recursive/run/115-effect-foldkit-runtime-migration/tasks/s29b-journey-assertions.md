# S29b make the journey script an assertion harness (public, R17)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The review is right: `s29a-journeys.mjs` drives the packaged runtime but ASSERTS nothing and narrates some claims. Rewrite it so a broken runtime fails it.

## Required changes
1. EXE IDENTITY: read the artifact's `manifest.json`, hash the executable, and assert the version/commit/source_tree/exe sha match the manifest before the journey starts. A stale or substituted binary must fail.
2. IDS FROM STATE, NOT RESPONSES: read `runtime_observations`, `runtime_telemetry_records` and the retention capture rows from SQLite and JOIN them to the HTTP results - assert the request id, decision id, attempt id and capture id appear in the persisted rows, not only in the response bodies. Deleting the persisted rows must fail the journey.
3. J5 RESTART: kill the process and WAIT for the exit (assert exitCode/exit), assert the pid is gone, restart on the same state root, then re-read SQLite and assert the row identity (ids and counts) is unchanged with throws - no hardcoded `restarted:true`, no `0===0` capture survival, and capture waits must not swallow errors.
4. REMOVE FABRICATED CLAIMS: the capture API 404 was never exercised - call it and record the real status; the marker-in-state claim must come from an actual search of the state files (report redaction only if the data really is unreadable); the call/result boundary must be parsed from the artifact JSON rather than a regex that requires a status field. Anything still unproven becomes INCONCLUSIVE only with the concrete attempt recorded.
5. THROW ON FAILURE: every matrix row becomes an assertion. A run where captures are not written, ids are fabricated, the stream lacks its marker/DONE, tool_calls is absent, the exe is replaced, the restart is skipped, or post-restart ids differ must FAIL.
6. STATE in the evidence which mutations you applied to prove the harness fails (at least: disable capture writes, echo fake ids, skip the restart kill, replace the exe).

## Files
`evidence/other/s29a-journeys.mjs` (rewrite), its log, and `evidence/other/s29a-tdd.json`; keep the run worktree clean of temp state.

No product changes, no installs, no subagents, no operator ports; temp state on E: and removed.

## Report
The assertion set, the state queries, the restart proof, the mutation REDs, and the honest INCONCLUSIVE list (only what remains genuinely unreachable).