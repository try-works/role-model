# S24h explicit factories for the knowledge worker (private, R32)

Private worktree: D:/DEV/role-model-internal/.worktrees/115-effect-foldkit-runtime-migration
S24g audited but did not change the knowledge entry points: `knowledge-store/index.mjs:1293` is already explicit, but `knowledge-worker/index.mjs:367` still reads process env at call time for key/database candidates (lines ~325/381). Close that.

## Requirements
1. Give the worker-resolver an explicit factory taking state root, key material and database candidates; it must never read `process.env` itself. Keep the call-time adapter for legacy callers, but make the factory the only decision point and state the default explicitly in the signature.
2. Keep behaviour identical for the same inputs; re-run the accepted knowledge suites unchanged.
3. Prove: explicit inputs win over the environment; two containers with different roots/keys are isolated; a missing/blank input fails loudly; no import-time capture.
4. State what R32 still needs.

## Files
`extensions/knowledge-worker/**` (and `knowledge-store` only if the resolver lives there), one new test under `tests/track-b/`, evidence in the private run dir.

No public changes, no commits, no installs, no subagents, no servers or operator ports; temp files on E:.

## TDD
RED per proof. Report factory shape, what the env reads were, counts, REDs, what remains.