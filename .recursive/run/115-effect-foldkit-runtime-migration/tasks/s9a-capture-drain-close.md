# S9a capture backlog drain must be joined before stores close (private, R29)

Worktree: D:/DEV/role-model-internal/.worktrees/115-effect-foldkit-runtime-migration
Requirement R29. Read-only analysis below was produced by an independent analyst and spot-checked by the controller.

## Defect
`scripts/track-b/runtime-operations-server.mjs`:
- The backlog drain timer is created at ~7319 (`setInterval`, 5_000 ms, single-flight flag at 7318-7321, `void flushCaptureQueue(null, null, 5)` at 7322, `.unref()` at 7328).
- `close()` at ~8601-8616 never calls `clearInterval` on it (the only `clearTimeout` at 8604 clears an unrelated job-completion timer declared ~5797). No promise handle for a drain pass is retained, and `flushCaptureQueue` (~7234-7289) has no closed check.
- `await persist()` at ~8605 is a real interleaving point: a drain continuation can run after `stateDb.close()` (8611), `captureQueue.close()` (8612), `artifacts.close()` (8613) or `events.close()` (8614), against closed handles. The sink's post-flush state UPDATE (~7285-7286) can also be lost, and a claim row can be left inflight.

## Required contract
1. `close()` clears the drain timer and awaits any in-flight drain pass before it closes `stateDb`, `captureQueue`, `artifacts` or `events`.
2. A drain pass that starts after close is a no-op, not an exception.
3. The bounded behaviour is preserved: one pass at a time, five items per pass, five-second cadence, `unref` so it never keeps the process alive.
4. No behaviour change to the request path, the capture sink ordering, retention, or the public surface of the factory.
5. `close()` remains idempotent and bounded: it must not hang if a drain pass is wedged (apply an explicit bounded wait, and if the bound is exceeded, record the fact rather than closing under a live pass silently).

## Files you may write
- `scripts/track-b/runtime-operations-server.mjs`
- `tests/track-b/run115-capture-drain-close.test.mjs` (new)
- private run evidence `s9a-*` logs and `evidence/other/s9a-tdd.json`.

Nothing else: no other script, no extension, no package.json or lockfile, no public repo.

## Strict TDD
1. Test first, with a temp state root (`mkdtemp` under the OS temp dir). Use the factory's capture commit hook (stage names around 6619-7205) to block a drain pass mid-flight.
2. RED must fail for the right reason: close() returns while the drain pass is still inside the hook, and/or a store is touched after close. Capture the log.
3. Then make the minimal change and get the same test GREEN.
4. Add a second test proving the timer is disarmed: after close, advancing time by more than five seconds starts no new pass.
5. Run the existing capture/eval suites you can reach without installs (glob for them) and capture the log.
6. Record `s9a-tdd.json` with red/green/existing paths, exits, and final file sha256.

## Rules
- No installs. If a dependency is missing, stop and report rather than installing.
- Temp state roots only; never an operator state root, never ports 3456/3457/3458.
- No commits, no subagents, no goals, no provider calls.
Report: commands and exits, the RED failure observed, the GREEN result, the close-join bound you chose and why, existing-suite counts, sha256, and anything unverified.
