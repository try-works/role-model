# S24c close the evaluation domain boundary (private, R32)

Private worktree: D:/DEV/role-model-internal/.worktrees/115-effect-foldkit-runtime-migration
S24a recorded evaluation as the most clearly AMBIENT domain: the runner defaults to `new EvaluationCore()` and no Layer exists, so an omitted option silently opens an in-memory core. Make its boundary explicit without changing behaviour.

## Read first
1. The S24a inventory (private run evidence) and R32 at public `00-requirements.md:286-292`.
2. `extensions/evaluation-core/index.mjs`, `evaluation-runner-local/index.mjs` and the root construction site (`runtime-operations-server.mjs:648-751`).
3. The retention factory from S24a (`shared/retention/index.mjs:196-215`) as the pattern to follow.

## Required work
1. Add an explicit factory for the evaluation domain that takes its dependencies (host callback, state root/store, clock if used) and FAILS LOUDLY when a required one is missing - the silent in-memory default is the thing to remove, replaced by an explicit in-memory choice the caller must ask for.
2. Keep behaviour identical where a caller passes the same dependencies; prove it by re-running the accepted evaluation suites unchanged.
3. Prove the boundary: constructing with a missing dependency throws; an explicit in-memory choice still works; two independent constructs do not share state.
4. Do not convert the domain to an Effect Layer in this slice - the shape first, the Layer later. Say so.

## Files you may write
- `extensions/evaluation-core/index.mjs`, `evaluation-runner-local/index.mjs` and the single root construction site
- one new test under `tests/track-b/`
- evidence under the private run directory

No public changes. No commits, no installs, no subagents, no servers or operator ports; temp files on E:.

## Strict TDD
RED first for each of the three boundary proofs. Report: the factory shape, the silent-default removal, the behaviour-preservation evidence, counts, and what R32 still needs.