# S62b design review: R27 composition root in `cli.ts`

Review of the proposal in `s62-r27-boundary.md` / `s61-r27-slice1.md`. Read-only; no product edits. Sources checked:
`cli.ts:5546-5613` (server/backend holders and shutdown), `:5625-5673` (server before backend), `:9294-9322` (createBackend), `:12387-12523` (packaged runtime / backend creation and failure), `index.ts:20693-20753` (listener only), `StartBridgeServerOptions` at `3475-3553`, `r27-composition.ts`, `test/cli-startup-readiness.test.ts`, `test/packaged-standalone-restart.test.ts`, and the 218-test hosting file's use of `startBridgeServer`/`close`.

## Verdict

**The proposal is a legitimate ownership seam and probably the right next slice, but it is not the smallest change that satisfies R27, and it is not yet a composition root.** It scopes the backend+server pair; R27's text is a closed shared-leaf DAG that owns "CLI/backend/server/bootstrap/refresh/drains/benchmarks, early readiness and partial shutdown", with finalizer failures unable to skip later releases or force early exit (`00-requirements.md` R27). Two managed layers for two resources leaves the CLI holders, packaged-runtime/extension ownership, refresh/drain loops, benchmarks and `process.exit` outside the scope. It is a real first node, not the DAG.

It also risks moving the problem if the scope is introduced in `main()` before the existing early listener behaviour is reconciled: the current order is **server first (`:5625`) and backend much later (`:12508/:12516`)**, deliberately so `/healthz` and the static UI answer `503 pending` while the backend warms. A backend-first scope would break that; a server-first scope makes the requested "failed listen releases the backend" vacuous (there is no backend yet). That is the central design decision, not a detail.

### Q1 - smallest change satisfying R27?

No, and it should not claim to. The minimum honest slice is:

- one scoped **host pair** resource whose acquire/release order is explicitly chosen, with a typed `HostRuntimeResource` abstraction that covers both modes: plain `backend` (release `backend.shutdown()`) and packaged `packagedRuntime.backend` (release `packagedRuntime.close()` first). The current shutdown's `if (packagedRuntime) ... else backend.shutdown()` (`:5605-5606`) cannot be represented by two independent backend/server layers without either leaking the packaged runtime's supervisor/vendors or double-releasing.
- the existing `startBridgeServer` stays a listener-only function. Keep its signature. Close it from the pair's release, not from a new option.
- the CLI's `shutdown` becomes `await scope.close()` **after** stopping new admission and **before** `process.exit`, with idempotence for the HTTP `/api/role-model/runtime/shutdown` route (`index.ts:17467-17477` calls the same closure) and signal handlers (`cli.ts:5691-5696`).

Everything else in R27 (bootstrap/extension, refresh, drains, benchmarks, early readiness) remains an explicit follow-up, or the slice should be named "backend+server pair" rather than R27 completion.

### Q2 - what breaks first

1. **Behaviour first, not a test: early readiness.** `test/cli-startup-readiness.test.ts` ("binds health and static UI before backend initialization completes") calls `startBridgeServer` directly with `getBackend: () => null`; it will keep passing even if `main()` is reordered to backend-first, so the regression would be invisible. The real CLI would stop answering `/healthz` and serving the static shell until the backend is ready, and `openBrowser` (`cli.ts:5687-5689`) and the "listening" log would move. That is the first thing to pin with a CLI-composition test, not the 218-test file.
2. **Packaged restart/exit.** `test/packaged-standalone-restart.test.ts` spawns the packaged exe and stops it with SIGTERM (`:80-95`, `:425`, `:470`). The current `shutdown` awaits `server.close()`, `packagedRuntime.close()`/`backend.shutdown()` and extension close, then `process.exit(0)` (`:5600-5609`). If scope close is placed after `process.exit`, or if a finalizer throws before the remaining releases, the supervisor, llama-swap/LiteLLM vendors and SQLite writers are not shut down; restart can see locks/orphans. This is where R27's "finalizer failure cannot skip later releases/force early exit" actually bites.
3. **Startup/extension failure paths.** `failExtensionRuntime` (`:5567-5589`) nulls the backend and closes packaged runtime/extension but deliberately leaves the listener up, so `/healthz` can report the failure. A scope that closes the listener on backend failure changes that observable behaviour. `run96-f137-f139-f141-startup-readiness.test.ts` and `run96-f166-extension-restart-readiness.test.ts` exercise this class; they are the tests to run first.
4. **218-test hosting file.** 83 `startBridgeServer` call sites across ~25 test files (35 in `index.test.ts`; 80 close/shutdown references there). Keeping the signature unchanged means they should stay green; they do not test the CLI's ownership. That is the point: no current test would catch the composition regression.

### Q3 - safest sequence (host never red)

1. **No CLI change.** Add the pair/composition helper with injectable `acquireServer`/`acquireBackend` and a fake-based test for: acquire order, release order, backend-acquire failure, server-listen failure, throwing finalizer. Keep the toy graph tests. This is test-first, no behaviour.
2. **Add the release-marker scope in CLI behind a factory seam** (e.g. an exported `createCliHostComposition` used by `main`, with the real factories at the edge). It can initially acquire in the current order (server then backend) and release in the same order via one pair resource; wire it but keep the existing `shutdown` calls as a fallback. Run `cli-startup-readiness`, startup/extension tests, and the 218 file.
3. **Migrate only the non-packaged path** first. Keep packaged mode on the old branch. This isolates the plain `backend.shutdown()` release and the early-listener behaviour. Run the same set.
4. **Migrate packaged mode** with the `packagedRuntime` release as the backend release; keep extension runtime in its own layer acquired before the pair so reverse release is server -> packagedRuntime -> extension. Run `packaged-standalone-restart` and the supervisor/vendor tests.
5. **Replace the direct `server.close()` / `backend.shutdown()` / `packagedRuntime.close()` calls** in `shutdown` with `await scope.close()`, keeping the HTTP-route and signal idempotence and `process.exit` only after close settles. Remove the fallback only in a separate commit/step.
6. Only then delete the CLI holder locals if the scope handles make them redundant; until then the holders are the read seam for `getBackend` and must not become stale. Run the full host suite at every step.

Ordering decision to settle at step 1: if the pair acquires **server then backend**, "failed listen releases backend" is vacuous and the honest RED is "failed backend acquisition after a successful listen closes the listener and releases whatever was acquired"; if it acquires **backend then server**, the requested RED is real but early readiness changes and `cli-startup-readiness` must be rewritten to exercise the composition, not direct `startBridgeServer`.

### Q4 - legitimate RED and location

The requested "failed listen releases the backend" cannot be observed through `startBridgeServer` as it stands: the function has no backend, and the proposal refuses to change its signature. A test in `index.test.ts` would either have to change the contract or assert nothing. Put it in a **new `test/cli-composition-scope.test.ts`** (or extend `cli-startup-readiness.test.ts`), against an exported CLI composition helper with injected factories:

- RED A: `acquireBackend` records a release; `acquireServer` rejects with `EADDRINUSE`; expect exactly one backend release (and zero server release). This RED is only valid if the chosen order is backend-first.
- RED B (server-first order): `acquireServer` succeeds; `acquireBackend` rejects; expect server close exactly once and no backend release (it was never acquired).
- RED C: on scope close, expect `server.close` before `backend.shutdown`/`packagedRuntime.close`.
- RED D: a backend finalizer throws; expect server was already released and the remaining finalizers still ran, and the CLI exits non-zero rather than `process.exit(0)` before things settle.

Use a real ephemeral port for the listen-failure case (bind one first) rather than a mock rejection, so it is a genuine failed listen. Do not put these in the 218-test file; its contract is the listener, not CLI ownership. A pure toy test alone is not enough (s61's own gap: no throw-continue RED).

### Q5 - things I would refuse

1. **Refuse the claim that two layers for backend+server satisfy R27.** It leaves bootstrap/CLI/refresh/drains/benchmarks and partial shutdown outside; rename the slice or extend it.
2. **Refuse a backend-first `main()` without an explicit early-readiness decision and a CLI-level test.** The current pending-503 behaviour is real and only weakly tested (direct `startBridgeServer`), so a silent change would pass CI.
3. **Refuse `process.exit(0)` inside the scope-managed shutdown before all finalizers settle**, and refuse swallowing finalizer failures into a zero exit. Current `:5609` does this; moving the same code under a scope does not satisfy R27's finalizer rule.
4. **Refuse dual ownership**: if `shutdown` keeps `server.close()`/`backend.shutdown()` while the scope also releases, double close must be explicitly idempotent; preferably remove the direct calls in the same reviewed step as the wiring, not permanently alongside.
5. **Refuse the unsigned `Context.make(tag as never, value)` seam being used for ordering-sensitive layers without a dependency edge.** `managedLayer` is a fine primitive, but two layers must be merged with an explicit order and typed tags; otherwise the DAG is only a naming claim. Keep the fake-graph tests as the proof of the primitive, and add the real pair test.
6. **Refuse "failed listen releases backend" as written** unless backend-first is chosen; otherwise demand the precise partial-acquisition RED B above. Do not add an optional backend hook to `startBridgeServer` to manufacture the test.

## Short sequence I would follow

1. Pair/composition helper + fake tests (no CLI wiring).
2. Wire helper in CLI in current server-first order; keep old shutdown as fallback; run startup/restart/218 tests.
3. Migrate non-packaged path; run again.
4. Migrate packaged path and extension layer; run restart/supervisor/vendor tests.
5. Replace direct closes with `scope.close`; remove fallback; run full host suite.
6. Only then consider refresh/drain/benchmark scopes for the rest of R27.

**Verdict: proceed only as an explicitly scoped "backend+server pair" slice, with the early-readiness decision and the CLI-level composition test; do not call it R27 completion, and do not let the requested failed-listen RED dictate a backend-first order it cannot justify.**
