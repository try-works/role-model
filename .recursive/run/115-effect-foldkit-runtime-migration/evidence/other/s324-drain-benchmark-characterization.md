# S324 Drain and Benchmark owner characterization

Read-only (s324). No product edits, commits, builds, installs, operator ports or processes. grep/read/git only; temp under E:/rm-tmp if used.

Worktree/HEAD: public D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration @ 27e0eecd.

Context: Backend/Server/cache and the partial-shutdown owner are now in the DAG (composition-dag.ts). This doc characterizes the two remaining blocked owners. S321 was R19 inventory body-verification only and changed no runtime ownership.

## Drain

### Semantics today (cross-owner shutdown phase, not one owner)

The DAG's `DrainContract` carries only ids: `{ id, captureWal: {id,owner:"capture_queue"}, retention: {id,scope:"retention"} }` (`composition-dag.ts:190-195`; layer at `:432-439`). It has no stop/join/drain functions. The actual drain work is spread across four owners:

1. **Route-capture deferred queue (host/backend closure).** Queue created in the backend closure at `index.ts:21175-21200`; drain scheduled fire-and-forget at `index.ts:21202-21213` (`routeCaptureDrainActive`, `void routeCaptureQueue.drain(...)`); queue implementation `track-b-capture-queue.ts:296` loops claims and delegates to `runtimeTrackBOperations.recordLocalRouteCapture`.
2. **Track-B capture queue (extension runtime).** `track-b-runtime.ts:5595` `.drain(runtime)`, `:5702` drain wiring, `:5796` `await this.drain(handler)`; queue drain implementation at `track-b-capture-queue.ts:296`.
3. **Post-observation outbox (CLI).** Created in CLI (`cli.ts` outbox near `:5340`); drained via `postObservationOutbox.drain(postObservationHandler(runtime))` at `cli.ts:8876-8877`.
4. **Backend vendor/supervisor teardown.** `backend.shutdown()` at `index.ts:34818-34824` clears the auto-swap interval, cleans pending Codex sessions, then `Promise.all([llamaSwap.shutdown(), liteLLM.shutdown()])` then `supervisor?.shutdown()`. It is registered as the Backend owner close finalizer at `cli.ts:12180-12184` (`Effect.acquireRelease(value, value.shutdown)`).
5. **Queue runtimes (CLI).** Replay/evaluation/learner queue runtimes are created at `cli.ts:8588, 8615, 8669, 8726`; each exposes `stop()` (replay: worker.stop + cleanup.stop + storeRuntime.dispose, `queue-runtime/index.ts:216-220`; evaluation `:319-323`; learner analogous). **No `queueRuntime.stop()` / `evaluationQueueRuntime.stop()` / learner stop call exists anywhere in `src`** (grep returns none).
6. **Retention cleanup.** `runRetentionCleanupAt` opens a sync connection, deletes, closes (`index.ts:20887-20903`); this is maintenance work, not a shutdown join.
7. **Auto-replay loop.** Only stopped, not joined: `activeAutoReplayLoop?.stop()` at `cli.ts:5163` before `hostScope.close()` (`:5171`).

Partial-shutdown owner exists and orders: stop admission → bounded join (10s) → interrupt → transport close → backend close, release-all (`composition-dag.ts:1045-1046, 1105-1128`). It does **not** include route/outbox/queue-runtime drains.

### What blocks a DAG move

- Drain is not one lifecycle object: route-capture queue and outbox are closure-local in two different owners (backend closure vs CLI/extension runtime), track-B queue is extension-runtime-owned, and vendor/supervisor shutdown is Backend-owned. Moving them into one Drain service would require exporting these closures or a new owner API.
- Queue runtimes have `stop()` but the CLI never calls it, so shutdown currently leaks workers/cleanup fibers at the process boundary.
- The drain loops are fire-and-forget (`void ...drain`) with no completion promise joined by shutdown.
- The DAG Drain contract has no behaviour, so there is nothing to move without first defining a phase API.

### Post-S321 / post-shutdown state

S321 (R19 body verification) unblocks **none** of this: documentation only. The partial-shutdown owner unblocks the *phase skeleton*: a Drain implementation could hook into ServerOwner shutdown/Backend close, and Backend.close is already invoked (`composition-dag.ts:1127`, `cli.ts:12180`). What remains blocked is the **handles**: queue runtime stops, outbox drain, route-capture drain, and auto-replay join are not wired into that phase.

### Disposition / follow-on

**Reclassify Drain from “owner” to “shutdown phase coordinated by Server/Backend”**, because its work is inherently owned by the queues and runtimes that hold the state (evidence above). Named follow-on: **Drain shutdown-phase wiring slice** — (1) retain stop handles for replay/evaluation/learner queue runtimes and call them in order; (2) join post-observation outbox drain and route-capture drain with bounded waits; (3) stop+join auto-replay; (4) keep vendor/supervisor teardown in Backend.close; test stop-admission → queue stop/join → drain completion → backend close. Do not create a god Drain service.

## Benchmark

### Semantics today (runner + cancellation gate, both outside the DAG)

- DAG `BenchmarkContract` is only `{ id, providerPermits }` (`composition-dag.ts:197-201`; layer `:442-448`). No runner, no gate, no cancel.
- A cancellation/overlap gate already exists: `benchmark-gate.ts:3-69` — `cancel-previous` / `reject-overlap`, Ref state, `begin/end/isCancelled/active` (Effect). **It is not imported anywhere in src** (grep only definitions), so it is unwired.
- The runner is `benchmark-runner.ts`; `runRoutingCapabilityBenchmark` is invoked fire-and-forget in the backend closure: `index.ts:34289` `void runRoutingCapabilityBenchmark(...).then(...).catch(...)` with no AbortSignal/cancel token.
- The HTTP start route returns 202 immediately and calls `options.runBenchmark` (`index.ts:19694-19705`); `runBenchmark` body builds guards/eligibility, then fires the runner at `:34289`.
- No active-run/cancel owner: the gate's `isCancelled` is never consulted by the runner; no `stop`/abort method exists in the DAG or runner dependency object.

### What blocks a DAG move

- Gate is a standalone Effect value with no service/tag/layer; nothing owns its lifetime.
- Runner cancellation is not modelled: no AbortSignal/token in `BenchmarkRunnerDependencies`, no cancellation checks; the gate cannot stop a run.
- Run identity `runId` is generated inside the closure (`index.ts:34239`), not owned by a service.
- `runBenchmark` closes over backend, database path, currentRegistry, router candidates and revision emitter, so a Benchmark owner would need these injected or resolved through Backend.
- No shutdown/cancel path: Benchmark layer has no close; Benchmark runs are not interrupted by partial shutdown.

### Post-S321 / post-shutdown state

S321 changes none of this. The Backend DAG now exposes `runBenchmark` through the bound method map (`composition-dag.ts:940`), which gives a Benchmark owner a legal seam into the backend; partial shutdown's interrupt step (`composition-dag.ts:1125`) gives it a place to signal cancellation. The gate itself still needs wiring and the runner needs a cancellation check.

### Disposition / follow-on

Keep Benchmark as an owner (it has run identity, overlap policy and cancellation semantics). Named follow-on: **DAG Benchmark owner slice** — register `BenchmarkGate` as a DAG service/layer, pass it (or a token) into `BenchmarkRunnerDependencies`, check `isCancelled(runId)` between cases, have the route and shutdown path call `begin/end` and signal interrupt; test cancel-previous, reject-overlap, and shutdown-cancels-active-run.

## Not read

- Full `benchmark-runner.ts` (only cancellation/run-path greps and the call site; runner internals decide case loop).
- Full `track-b-runtime.ts` drain implementation (only the three drain call sites).
- Full `queue-runtime/index.ts` learner stop body (replay/evaluation read; learner pattern assumed from factory shape, not body-read).
- Full `postObservationOutbox` implementation; only the drain call site was read.
- `track-b-capture-queue.ts` full drain loop (only its start/loop shape read).
- Any test files (s5 owns them).
