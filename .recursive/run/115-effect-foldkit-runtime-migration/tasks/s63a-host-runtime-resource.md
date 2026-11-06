# S63a backend+server pair: the HostRuntimeResource primitive (public, R27 first node)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The design review (`evidence/other/s62b-r27-design-review.md`) accepted the seam and refused the framing. Implement its STEP 1 only. No CLI change, no `startBridgeServer` change.

## Verified facts behind the design

- CLI acquisition order is **server first** (`cli.ts:5625 startBridgeServer`) and backend later, deliberately, so `/healthz` and the static UI answer pending-503 while the backend warms.
- Therefore 'failed listen releases backend' is **vacuous** in the current order, and backend-first would break early readiness.
- `process.exit(0)` at `cli.ts:5609` runs before/around finalizers today - that is a refused pattern.

## Step 1 (this task)

1. Implement `HostRuntimeResource` - ONE resource covering the pair: `acquireServer()`, `acquireBackend()` (and the packaged-runtime variant), with an explicit, typed release order: **packagedRuntime -> server -> backend** (packaged runtime closes before `backend.shutdown()`); the HTTP close must be idempotent.
2. Factories are injectable; nothing in this module imports the CLI or the real server.
3. Tests in a NEW file `test/cli-composition-scope.test.ts` using injected factories and a REAL ephemeral port for bind failures:
   - server-first: a failed backend acquisition AFTER a successful bind closes the server and releases what was acquired, exactly once;
   - scope close order asserted from recorded events (server before backend, packaged runtime before backend);
   - a finalizer that throws still releases the remaining resources and the failure surfaces (no swallowing);
   - double close is a no-op (idempotent HTTP shutdown).
4. Each guarantee needs a captured RED (mutate the order / swallow the error / remove idempotence and show the failure).

## Refusals from the review (must be honoured)

- Do NOT claim this closes R27. Name it 'backend+server pair'; R27 stays open.
- No backend-first acquisition; no untyped `as never` layer tags; no dual ownership (scope + direct `server.close`/`backend.shutdown` in the same path); no swallowed finalizer errors; no `process.exit` before finalizers.
- Do not touch `startBridgeServer`'s signature or the CLI in this step.

## Files
`apps/runtime-host-bridge/src/**` (new module only) and the new test; evidence `s63a-*`.

NO packaging, no installs, no commits, no subagents; host tsc 0 and the new test green.

## Report
The resource's acquire/release contract and order, the tests with RED logs, host tsc, and what step 2 must do in the CLI (server-first, old shutdown kept as fallback).