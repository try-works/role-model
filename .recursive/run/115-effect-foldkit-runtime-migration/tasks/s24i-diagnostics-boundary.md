# S24i close the diagnostics domain boundary (private, R32)

Private worktree: D:/DEV/role-model-internal/.worktrees/115-effect-foldkit-runtime-migration
Last ambient domain from the S24a inventory: diagnostics. It is partially closed - `storageAudit` is injectable, but the default child spawner and the read path are ambient.

## Requirements
1. Give the diagnostics read/spawn path an explicit factory taking its dependencies (state root, child script, timeout, spawner); the default child spawner must be the only place that decides paths, and it must fail loudly on a missing required input.
2. Keep behaviour identical for the same inputs; re-run the accepted diagnostics/storage-audit suites unchanged.
3. Prove: missing input throws; two factories with different roots are isolated; the bounded timeout from S24b still fires; a failure to spawn surfaces as a typed error rather than a hang.
4. State what R32 still needs.

## Files
the diagnostics/storage-audit module and its construction site, one new test under `tests/track-b/`, evidence in the private run dir.

No public changes, no commits, no installs, no subagents, no servers or operator ports; temp files on E:.

## TDD
RED per proof. Report factory shape, counts, REDs, what remains.