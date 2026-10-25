# S17c close the transport HOLD (public, R26)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The review proved three gaps with concrete mutations. Fix them; do not restate them as limits.

## Gap 1 - the abort path has no production caller
`privateRetentionRequestEffect` appears only in its definition and its test, and `requestPrivate`'s optional 4th signal argument is never supplied by any operation call site. So a real private operation cannot be interrupted by a caller or fiber abort; only the internal timeout aborts fetch.
Fix: pass the operation's abort signal into the request at the REAL boundary (the operation call sites), and test through that real entry - interrupt an operation and assert the fetch observed the caller signal, not only the timeout signal. If wiring the boundary needs a signature change across call sites, do it and list them.

## Gap 2 - cleanup counts are markers, not observed resources
Deleting `reader.releaseLock()` while keeping the `onRelease(reader)` callback leaves both cleanup tests green, and the abort listener is a no-op added only to be countable.
Fix: assert the real state - for example that `response.body.locked === false` after success, failure and abort - and count add/remove on a real signal wrapper rather than a no-op listener. A mutation that removes `releaseLock` or `removeEventListener` must fail.

## Gap 3 - no-retry on status and timeout is not pinned
The status and timeout tests only assert the error class, so a retry-on-status or retry-on-timeout mutation still passes. The Effect wrapper path is also not retry-tested.
Fix: assert fetch call counts and sleep lists for the status and timeout cases (exactly one call, no sleeps), and cover the Effect path's retry behaviour rather than only its abort behaviour.

## Files you may write
- `role-model-router/apps/runtime-host-bridge/src/track-b-operations.ts` and the operation call sites that must pass the signal
- `role-model-router/apps/runtime-host-bridge/test/s17a-transport-signal.test.ts` (extend)
- `evidence/logs/s17c-*` and `evidence/other/s17c-tdd.json`

Nothing else. Do not touch the SSE reader, queue runtime, diagnostics, client app, wrappers, packages/ui, root, lockfile, vendor, or the private repo.

## Rules
Mutation-first for each gap: apply the mutation, observe the RED, restore byte-identically. No installs, no commits, no subagents.
Report: the call sites that now pass a signal, the resource-state assertions, the call/sleep counts pinned, each mutation RED, GREEN counts and tsc.