# S10 CaptureQueue close() must not silently succeed during a flush (private, R30)

Worktree: D:/DEV/role-model-internal/.worktrees/115-effect-foldkit-runtime-migration
Requirement R30; source analysis controller-verified read-only.

## Defect
`shared/capture/durable-queue.mjs`: `close()` (line ~396) sets `this.database = null`,
but `this.closed` is only consulted at ~397. A `flush()` already in progress keeps
running, its completion path hits a null handle, the error is swallowed by the flush
catch (~286-290) and flush resolves `{committed:0,requeued:0}` — a silent no-op that
callers read as "nothing to do". `enqueue`/`health`/`peek` after close also hit the
null handle (and `health()` even mutates state to degraded) instead of a controlled error.

## Required contract
1. `flush()` that is in flight when `close()` begins must NOT resolve as a successful
   no-op. It must reject with one documented, stable message (choose one and use it
   consistently, e.g. `capture queue closed during flush`).
2. `enqueue`, `flush`, `peek`, `receipts`, `health` after close must fail with a
   controlled "closed" error, never a TypeError from a null handle.
3. Do NOT change the lease/fence semantics, the claim SQL, the requeue rules or the
   maintenance-token protocol.
4. Existing behaviour preserved: normal flush, commit/ack, requeue on sink failure,
   close idempotence.

## Files you may write
- `shared/capture/durable-queue.mjs`
- `tests/track-b/run115-capture-queue-close.test.mjs` (new)
- private run evidence logs `s10-*` and `evidence/other/s10-tdd.json`.

Nothing else: no sidecar, no extensions, no package.json/lockfile.

## Strict TDD
1. Test first: temp root via `mkdtemp`; `CaptureQueue({filePath, channel:"development", leaseMs:1000})`;
   enqueue one row; start `const p = queue.flush(channel, async () => { hit(); await deferred; return {committed:true}; })`;
   await `hit()`; `queue.close()`; resolve the deferred; then assert `await assert.rejects(p)`.
   Today `p` resolves `{committed:0,requeued:0}` → RED. Capture the log.
2. Minimal fix, then GREEN on the same test.
3. Add a second test for a controlled post-close error from `enqueue`/`flush`.
4. Run the existing capture queue tests (glob for them; do not invent paths) and capture the log.
5. Record tdd json with red/green/existing paths, exits and sha256 of both files.

## Rules
- No installs. If a dependency is missing, stop and report.
- Temp SQLite under the OS temp dir only; never an operator state root.
- No commits, no subagents, no goals, no provider calls.
Report: commands/exits, RED message, GREEN result, existing-suite counts, sha256s, unverified items.
