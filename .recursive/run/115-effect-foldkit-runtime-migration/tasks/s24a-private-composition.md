# S24a private composition: closed domains and bounded joins (private, R32)

Private worktree: D:/DEV/role-model-internal/.worktrees/115-effect-foldkit-runtime-migration
R32 requires closed private domain Layers, authenticated compatible DTO/version/capability/readiness, bounded joins, scoped processes/stores, child-process scope with a readline ready protocol, ephemeral auth and timeouts, and partial-startup release of a child.

## Read first
1. R32 in the public requirements: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration/.recursive/run/115-effect-foldkit-runtime-migration/00-requirements.md lines 286-292.
2. The private extensions and server code that own domains today (`extensions/`, `scripts/track-b/runtime-operations-server.mjs`), and the public R27 composition module for the shape being mirrored (`role-model-router/apps/runtime-host-bridge/src/composition-dag.ts`).

## Required work (first slice - characterize before building)
1. A domain inventory: list the private domains that exist today (evaluation, capture, artifacts, events, retention, learning, contribution, diagnostics) with the module that owns each and how it is currently reached (module import, injected dependency, global). Say which are closed and which are ambient.
2. Pick ONE domain with an ambient/global reach and make its boundary explicit WITHOUT changing behaviour: a factory that takes its dependencies, so a test can construct it in isolation. Prove it: constructing it with a missing dependency fails loudly, and the existing tests still pass.
3. Child-process scope: find where the private code spawns children (sandbox/evaluation runner). Pin the current ready/timeout/partial-startup behaviour with a mutation-proven test - including whether a child is released when startup partially fails. If it is not released, report it rather than fixing it.
4. Do not attempt the full R32 conversion. List what remains.

## Files you may write
- the single domain module you make explicit, plus one new test under `tests/track-b/`
- evidence under the private run directory

No public worktree changes. No commits, no installs, no subagents, no servers or operator ports; temp files on E:.

## Rules
Characterize honestly; a gap reported is worth more than a half-conversion. Report: the domain inventory with closure status, the factory you added and why that domain, the child-scope mutation RED, counts, and what R32 still needs.