# S8a queue worker handler must receive the Effect AbortSignal (public, R26)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
Requirements R26 and the B8 cancellation gate. Vendor is Effect 4.0.6.

## Read first (mandatory)
`/.recursive/run/115-effect-foldkit-runtime-migration/evidence/other/effect-4.0.6-api-notes.md` and then the cited vendored lines themselves: `vendor/effect/packages/effect/src/Effect.ts:1008` (`tryPromise` accepts `try: (signal: AbortSignal) => PromiseLike<A>`) and `Effect.ts:925` (`promise`). Do not code from memory of another Effect version.

## Defect
`role-model-router/apps/runtime-host-bridge/src/queue-runtime/workers.ts:246-247` builds the attempt as:
```ts
Effect.tryPromise({ try: () => handler(job, { attempt: info.attempts }), catch: ... })
```
The `try` thunk takes no signal, so `Effect.timeout`/`raceFirst` interruption (`workers.ts:301-304`) interrupts the fiber but leaves the handler's underlying Promise running. A hung handler keeps its socket and its work while the queue believes the attempt was abandoned.

## Required contract
1. The attempt thunk accepts the `AbortSignal` Effect supplies and forwards it to the job handler.
2. The handler contract gains an optional `signal`, with every in-repo handler and every call site updated, and no handler silently ignoring it where the work is cancellable.
3. A test proves the signal actually reaches the underlying I/O and that interrupting the attempt aborts it: construct a handler that awaits a promise which only settles when its signal aborts, run it under a short `Effect.timeout`, and assert the abort was observed. A test that only asserts the fiber was interrupted is not sufficient, and a test that asserts the timeout error alone is not sufficient.
4. Behaviour that must not change: attempt accounting and the retry/exhaustion callbacks, the cancel watch and its named `QueueJobCancelledError`, lock and fence semantics, and the store's interrupt-only cause handling.
5. If a handler's work is genuinely not cancellable (a synchronous SQLite call, for example), it must say so at the call site rather than accepting a signal and ignoring it.

## Files you may write
- `role-model-router/apps/runtime-host-bridge/src/queue-runtime/workers.ts`
- the handler type and its in-repo implementations/call sites inside that same app
- one new test under `role-model-router/apps/runtime-host-bridge/test/`
- run evidence `evidence/logs/s8a-*` and `evidence/other/s8a-tdd.json`

Nothing else: no other package, no root/lockfile, no private repo.

## Strict TDD
Write the abort-observation test first against the current code and capture the RED. The RED must show the missing cancellation (for example the abort never observed and the attempt resolving after the timeout), not a type error you have not explained.

## Rules
- No installs, no commits, no subagents, no providers, no operator ports 3456/3457/3458.
- Do not add a second racing timer; the bound already exists as `Effect.timeout`. The fix is to make cancellation real.
Report: the vendored lines you relied on, the RED message, GREEN counts, the existing queue/stream suites you re-ran, handler call sites updated, the Layer/runtime unaffected statement, sha256 of changed files, and anything still not cancellable.
