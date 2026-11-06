# Vendored Effect 4.0.6 — API notes read from the source drop

Every claim below was read from `vendor/effect` at the pinned payload (tag `effect@4.0.6`, commit `3b28bf686bf26e9700edd39c025aff2744dc5303`, digest `7c7256252cf0b9b8aa25c1698ca1f5af171def4eb42048aedfeae9f2ee524702`). This file exists so implementation work cites the code we ship instead of remembered or online documentation. Re-read the cited lines before changing anything that depends on them.

## Runtime facts
- `vendor/effect/packages/effect/package.json` reports `4.0.6`.
- `vendor/effect/README.md` states Effect 4.x is an LTS line, requires TypeScript 5.9+ and strict type-checking, and that Node 18+ is the general floor while some integration packages need newer (for example `@effect/sql-sqlite-node` needs Node 22.16+). Our workspace is Node 24 and strict TS, so both hold.
- Effect values are lazy: an `Effect` needs a runtime to run. See `Effect.ts:122` (the `Effect` interface) and the note in the `runSync` family docs.

## Running
- `Effect.runSync: <A, E>(effect: Effect<A, E>) => A` — `Effect.ts:9587`. Throws on failure; use `runSyncExit` when an `Exit` is wanted. It cannot run asynchronous work.
- `Effect.runPromise` — `Effect.ts:9402`; `Effect.runFork` — `Effect.ts:9216`.
- `ManagedRuntime.make(layer, options?) => ManagedRuntime<R, ER>` — `ManagedRuntime.ts:325`. It builds the layer inside a scope, tracks fibers started through the runtime, and interrupts and awaits them on disposal (`ManagedRuntime.ts:330-346`). This is the shape for a long-lived process service, not a per-call `runSync`.

## Services and layers
- Class-style service: `Context.Service` — `Context.ts:209` (with `Service.use` at `Context.ts:103`, `ServiceClass` at `129`, `Key` at `68`). There is no `Context.Tag` in this tree; the class form is what we use.
- `Layer.succeed(service, value)` — `Layer.ts:827-835`; the `Layer` type itself is `Layer.ts:56`.
- Build a layer once at module scope and reuse it; `Layer.build` and `Layer.MemoMap` are the lower-level tools when a shared build is needed (`ManagedRuntime.ts:317-319`).

## Resources and scopes
- `Effect.acquireRelease(acquire, release, options?)` — `Effect.ts:6862`. The release receives the acquired value and the `Exit`, and the effect requires a `Scope`.
- `Effect.scoped` — `Effect.ts:6747`; `Effect.forkScoped` — `Effect.ts:9017`. A scoped resource is released when its scope closes, including on interruption.

## Concurrency, timeouts and **cancellation**
- `Effect.timeout(self, duration)` — `Effect.ts:4777` — fails with `Cause.TimeoutError` (`internal/effect.ts:3896-3906` builds `TimeoutError` from the duration). `timeoutOption` gives `Option.none` instead of an error.
- `Effect.race(self, that, options?)` — `Effect.ts:5068`; the documented behaviour is that when one side wins the other is interrupted (`Effect.ts:5040-5046`).
- **Promise interop carries an AbortSignal**: `Effect.promise: <A>(evaluate: (signal: AbortSignal) => PromiseLike<A>) => Effect<A>` — `Effect.ts:925`, and `Effect.tryPromise` accepts `try: (signal: AbortSignal) => PromiseLike<A>` — `Effect.ts:1008`.
  This is the single most important fact for our transport work: interruption can only cancel real I/O if the thunk **accepts and forwards that signal**. `apps/runtime-host-bridge/src/queue-runtime/workers.ts:246` currently calls `handler(job, { attempt })` inside `Effect.tryPromise` and ignores the provided signal, so a fiber timeout or interrupt does not cancel the underlying fetch. The fix is to take the signal and pass it into the handler, not to add a racing timer.

## Retries and schedules
- `Effect.retry` — `Effect.ts:4273`; schedule combinators live in `internal/schedule.ts` (for example `internal/schedule.ts:130`). Use these rather than hand-rolled retry loops when the work is effectful; our SQLite busy-retry stays a driver-level concern because it must not become an Effect in-memory transaction.

## How this maps onto the migration
- Pure kernels stay pure: the route scorer is synchronous and is wrapped by a service, not rewritten as an Effect.
- Long-lived owners use `ManagedRuntime` and scoped layers, so shutdown interrupts and awaits fibers; that is the shape R22/R29/R30/R32 need.
- Any promise-based I/O must accept the `AbortSignal` from `Effect.promise`/`Effect.tryPromise`; that is the concrete cancellation contract behind the B5/B8 gates.
- `Effect.runSync` is acceptable only at a documented synchronous boundary with a module-scope layer, exactly as `route-decision-boundary.ts` does.

## Documentation index in the drop
- `vendor/effect/README.md` — packages, requirements, LTS policy.
- `vendor/effect/MIGRATION.md` — v3 to v4 migration notes.
- `vendor/effect/packages/effect/SCHEMA.md` — Schema (the large guide; read the section you need).
- `vendor/effect/packages/effect/CONFIG.md`, `HTTPAPI.md`, `MCP.md`, `OPTIC.md`, `ARBITRARY.md` — the other first-party guides.
- `vendor/effect/packages/effect/src/*.ts` — authoritative signatures with `@stability` and `@since` tags.

## Effect's own LLMS.md guidance, cross-checked against the pin

Reference the maintainers point agents at: `https://github.com/Effect-TS/effect/blob/main/LLMS.md`. It describes the `main` branch, which can be ahead of our pin, so every item below was checked for presence in the vendored 4.0.6 tree before being adopted.

| Guidance | Vendored 4.0.6 evidence | Verdict |
| --- | --- | --- |
| Prefer `Effect.gen` for inline code; `Effect.fn("name")` when a span is useful, `Effect.fnUntraced` when it is not; avoid functions that only wrap and return `Effect.gen` | `Effect.ts:14042` (`fn`), `Effect.ts:13917` (`fnUntraced`) | present, adopt |
| Attach behaviour with combinators, not `.pipe` inside `Effect.fn` | same section | present, adopt |
| Define services by extending `Context.Service` with a class-style id string, a `static readonly layer` built with `Layer.effect`, and `Service.of({...})` | `Context.ts:209`, `Layer.ts:1039` | present, adopt |
| Use `Schema.TaggedError<T>()("Name", {...})` for domain errors and `Effect.catchTag` / `catchTags` / `catchReason` to handle them | `Schema.ts:16646`, `Effect.ts:2859`, `Effect.ts:3085` | present, adopt |
| Manage resources with `Effect.acquireRelease`; use `Layer.effectDiscard` for background tasks and `LayerMap.Service` for keyed dynamic resources | `Effect.ts:6862`, `Layer.ts:1133`, `LayerMap.ts:414` | present, adopt |
| Run a program as the process entrypoint with `NodeRuntime.runMain`, or `Layer.launch` for long-running programs | `vendor/effect/packages/platform/node/src/NodeRuntime.ts:41`; package `@effect/platform-node` is 4.0.6 | present, but see the browser rule below |
| Broadcast with `PubSub`; model streams with `Stream`, including callback sources via `Stream.callback` | `PubSub.ts:520`, `Stream.ts:725` | present, adopt for SSE/event fan-out |
| Parse untrusted input with `Schema`, never predicates or hand-rolled parsers | `Schema.ts` (guide: `packages/effect/SCHEMA.md`) | present, adopt at I/O boundaries |

### Two consequences for this repository
1. `@effect/platform-node` exists in the drop, but it must not enter the browser bundle. The client port uses `@effect/platform-browser` semantics only; the Node platform packages stay in server graphs. `vite-plugin-foldkit` pulls Node platform packages, which is why it is excluded from the client graph.
2. Our staged route producer should follow the LLMS service shape (class-style `Context.Service`, `static readonly layer`, `Effect.fn` for the method) rather than a bare interface plus a hand-built layer, so that later slices do not have to rewrite it.
