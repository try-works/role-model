# S28a packaged release vs candidate comparison (public, R16)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
R16 requires preserving the released v0.0.20 (R), clean dev (D) and candidate (C) identities separately, with artifact/process/served closure, independent state/config, and every difference CLASSIFIED (pre-existing R-to-D, migration regression, approved intentional change, known baseline defect, absent/inconclusive/environmental).

## Inputs that already exist
- R: the released package at `D:/role-model-router/0.0.20` (its `role-model.exe` and manifest).
- C: the candidate package at `role-model-router/dist/release/win32-x64` (our build, source_tree 9febf859).
- D: not built yet - say so rather than substituting the source tree.

## Required work
1. Capture each artifact's identity (executable sha256, manifest fields, extension count, version/source_tree/commit).
2. Run BOTH packages the same way - separate temp state roots, ephemeral loopback ports (never 3456/3457/3458), the same fixture root - and capture: healthz, runtime summary, taxonomy, extension catalog, and the diagnostics endpoint. Record process facts (pid, start/stop) and served facts (status codes, body bytes, asset counts).
3. Produce a difference table where EVERY difference is classified from the allowed vocabulary with a one-line justification. An unclassified difference is a failure, not a note.
4. Do not silently normalize: if C differs because we added a route/endpoint, that is 'approved intentional change' with the run115 evidence cited; if R differs because it is older, that is 'pre-existing R-to-D'.
5. State explicitly what D would add and why it is not yet run.

## Files you may write
a comparison script and its output under `evidence/other/s28a-*`, `evidence/logs/s28a-*`, `evidence/other/s28a-tdd.json`.

No product changes, no installs, no commits, no subagents, ephemeral ports only, temp state on E: and removed afterwards.

## Rules
The comparison must be reproducible: one command that re-runs both and regenerates the table. Report the identities, the table with classifications, the exact commands, and anything INCONCLUSIVE.