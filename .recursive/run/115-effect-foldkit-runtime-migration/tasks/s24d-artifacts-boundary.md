# S24d close the artifacts domain boundary (private, R32)

Private worktree: D:/DEV/role-model-internal/.worktrees/115-effect-foldkit-runtime-migration
Next ambient domain from the S24a inventory: artifacts. It is constructed inline from a state root with injected keys, so it is closer to closed than evaluation was, but still ambient at the root.

## Read first
1. The S24a inventory and R32 at public `00-requirements.md:286-292`.
2. `extensions/artifact-store/index.mjs` and its root construction site.
3. The retention and evaluation factories from S24a/S24c as the pattern.

## Required work
1. Add an explicit factory for the artifact store that takes the state root and the key material, and FAILS LOUDLY when either is missing or blank - today the root decides both inline.
2. Keep behaviour identical where the same inputs are passed: re-run the accepted artifact-store suites unchanged.
3. Prove the boundary: missing root throws, missing/blank key material throws, two stores with different roots do not see each other's artifacts, and the same root reopens its own.
4. State what R32 still needs for this domain (a Layer, bounded joins, readiness).

## Files you may write
- `extensions/artifact-store/index.mjs` and the single root construction site
- one new test under `tests/track-b/`
- evidence under the private run directory

No public changes. No commits, no installs, no subagents, no servers or operator ports; temp files on E:.

## Strict TDD
RED first for each boundary proof. Report: the factory shape, behaviour-preservation evidence with counts, the boundary REDs, and what remains.