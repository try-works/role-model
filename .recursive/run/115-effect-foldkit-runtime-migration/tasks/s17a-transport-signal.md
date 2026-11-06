# S17a transport AbortSignal and scoped cleanup (public, R26 B5 first slice)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
R26 (Transport/SSE B5) requires an actual AbortSignal reaching transport I/O, scoped reader/listener cleanup, typed failures, and exact per-operation retry preserving the private delays 250/1000/2500/5000ms. This slice does the first two with tests and does not touch SSE frame semantics.

## Correction to note
Earlier this run attributed the queue-worker signal work to R26. That was wrong: R26 is transport/SSE. The queue work stays attributed to the queue slices. Do not restate it as R26 progress.

## Read first
1. `00-requirements.md` R26 (lines 238-244).
2. `evidence/other/effect-4.0.6-api-notes.md` - especially the arity rule for `Effect.tryPromise` (`internal/effect.ts:1166`).
3. The transport/provider request code in `role-model-router/apps/runtime-host-bridge/src/` (find the actual fetch call sites; do not assume which module).

## Required work
1. The transport's outbound I/O accepts an `AbortSignal` and forwards it to the underlying `fetch`, so an interrupt or timeout actually cancels the network operation. Prove it with a handler/fetch that settles only on abort, run under a short timeout: the RED must show the request continuing after the fiber was interrupted.
2. Scoped cleanup: any reader, stream or listener created for a request is released when the request scope ends, including on failure and on abort. Prove it by counting releases on the failure path and on the abort path.
3. Typed failures: distinct typed errors for abort, status failure and protocol failure rather than a generic wrapped error. Preserve the caller-visible failure identity where the current code already distinguishes them.
4. Per-operation retry: the exact delays 250/1000/2500/5000ms with no retry on a caller abort or a protocol violation. If the current code already has that schedule, pin it with a test rather than rewriting it; if it does not, implement it and say so.
5. Do not change SSE frame semantics (tool/reasoning/fragmentation/drain/first-substantive/DONE/error) in this slice. State that they are untouched.

## Files you may write
- the transport/request modules inside `role-model-router/apps/runtime-host-bridge/src/`
- one new test file under its `test/`
- `evidence/logs/s17a-*` and `evidence/other/s17a-tdd.json`

Do not touch the queue runtime, the diagnostics modules, the client app, wrappers, packages/ui, root, lockfile, vendor, or the private repo.

## Strict TDD
One behavioural RED per numbered item. Report: the fetch call sites you changed, the abort proof, cleanup counts, typed failure names, the retry schedule as pinned, and anything you could not do without touching SSE.