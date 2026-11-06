# S24e close the events domain boundary (private, R32)

Private worktree: D:/DEV/role-model-internal/.worktrees/115-effect-foldkit-runtime-migration
The S24a inventory recorded events as the worst kind of ambient reach: an inline path construction AND a module singleton that reads `process.env` at import time. Close the singleton's ambient dependency without changing behaviour.

## Read first
1. S24a's inventory (private run evidence) and R32 at public `00-requirements.md:286-292`.
2. `extensions/event-log/index.mjs` - find the module singleton and every `process.env` read at import time.
3. The retention/evaluation/artifacts factories as the established pattern.

## Required work
1. Replace the import-time `process.env` read with an explicit factory/configuration that the caller passes: the module must not decide its own environment. Keep a documented default only where a caller genuinely passes nothing, and make that default explicit in the factory signature rather than hidden at import.
2. Keep behaviour identical: re-run the accepted event-log suites unchanged.
3. Prove the boundary: constructing with an explicit environment uses it (a test proves the value came from the argument, not from the process); two constructs with different environments do not interfere; the singleton no longer captures a value at import (a test changes the env after import and shows the constructed instance follows the argument).
4. State what R32 still needs for this domain.

## Files you may write
- `extensions/event-log/index.mjs` and the root construction site
- one new test under `tests/track-b/`
- evidence under the private run directory

No public changes. No commits, no installs, no subagents, no servers or operator ports; temp files on E:.

## Strict TDD
RED first for each boundary proof. Report: the factory shape, what the singleton used to capture, behaviour-preservation counts, REDs, and what remains.