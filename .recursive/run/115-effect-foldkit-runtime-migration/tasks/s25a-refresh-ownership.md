# S25a refresh ownership and injectable event source (public, R12)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
R12 requires preserved fallback/error/request semantics, an injectable RuntimeEventSourceFactory and test services, ONE owned Refresh subscription, stale diagnostics fields, and gap/snapshot resynchronisation.

## Read first
1. `00-requirements.md` R12 (lines 124-130).
2. Find the refresh code: search the client app and host bridge for the event source, refresh subscription and snapshot/gap handling. Report what exists before changing anything.
3. `evidence/other/foldkit-0.169-api-notes.md` section 3 for how this Foldkit version models subscriptions, if the client side is involved.

## Required work
1. CHARACTERIZE first: is the event source injectable today, and is there exactly ONE refresh subscription owner? Prove or disprove each with a test; a claim in a comment is not evidence.
2. If the source is not injectable, make it injectable without changing production default behaviour; if it is, pin it with a test that a fake source is used when injected.
3. Prove single ownership: starting/stopping the client twice must not leak a second subscription; a counter test should show exactly one active subscription and zero after stop.
4. Stale/gap resync: a known gap (missed events) must trigger a snapshot resync rather than silently continuing; a stale diagnostics field must be visible as stale, not silently reused. Test both, or report which does not exist.

## Files you may write
- the refresh code in the client app and/or host bridge that owns the subscription
- tests under the owning package
- `evidence/logs/s25a-*` and `evidence/other/s25a-tdd.json`

No packaging, no ECharts, no private repo. No installs, no commits, no subagents, no operator ports.

## Strict TDD
RED per numbered item. Report: what exists today, what you had to add, the ownership proof, the resync proof or its absence, RED/GREEN, counts and typecheck.