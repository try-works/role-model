# S24g close the learning domain boundary (private, R32)

Private worktree: D:/DEV/role-model-internal/.worktrees/115-effect-foldkit-runtime-migration
Next domain from the S24a inventory: learning (profile learner and knowledge tools), recorded as partially closed - authority and filePath are injectable but `defaultProfileFilePath()` and the envelope path are ambient.

## Read first
1. The S24a inventory and R32 at public `00-requirements.md:286-292`.
2. `extensions/profile-learner` and the `knowledge-*` extensions, plus the root construction site.
3. The retention/evaluation/artifacts/events/capture factories as the pattern.

## Required work
1. Add explicit factories for the learning entry points that currently decide their own paths, failing loudly when a required input is missing - no `defaultProfileFilePath()` decided by omission.
2. Keep behaviour identical where the same inputs are passed: re-run the accepted learning suites unchanged.
3. Prove the boundary: missing path throws; two learners with different paths do not see each other's profiles; the same path reopens its own; the versioned publication path from S23b still behaves (atomic rename, version bump).
4. State what R32 still needs for this domain.

## Files you may write
- `extensions/profile-learner/**`, the `knowledge-*` entry points, and the single construction site
- one new test under `tests/track-b/`
- evidence under the private run directory

No public changes. No commits, no installs, no subagents, no servers or operator ports; temp files on E:.

## Strict TDD
RED first for each boundary proof. Report: the factory shapes, behaviour-preservation counts, boundary REDs, and what remains.