# Run 115 Phase 1 — AS-IS public backend analysis

**Mode:** bounded read-only. No files edited, no child delegation, no runtime/provider requests. 20 tool calls used. Baseline: public `f0d50fab083e3fe8daf2474cd9fb08b51066c8e1` / tree `b3d5cf9…`, branch `recursive/115-effect-foldkit-runtime-migration`, same worktree as this bundle. Upstreams read first: `00-requirements.md` (lock `eaf8d6f…`), `owner-scope-decision.md`, `00-worktree.md` (lock `142096f8…`), proposal §15. Tags below: **[O]** = I read the current source; **[P]** = proposal-reported anchor, not re-verified within budget; **[B]** = baseline receipt from `00-worktree.md`, not rerun.

---

## 1. Existing Effect islands (what must not be replaced)

**[O] Queue plane is already Effect.** `apps/runtime-host-bridge/src/queue-runtime/index.ts` imports `Effect, Fiber, Layer, ManagedRuntime` (line 10) and creates **one `ManagedRuntime` per plane**: 157 (main), 280, 393 (learner) — the store layer is intentionally built once, then reused. `Fiber.interrupt` is awaited at line 74. Workers are forked as children of a scoped claim loop: `workers.ts:327-345` (`Effect.forkChild`, `Fiber.interrupt` per fiber, `signalStop`).

**[O] The claim loop already uses Effect concurrency primitives**: `Effect.sleep`, `Effect.tryPromise` (246), cancel watchdog `Effect.sleep(cancelPollMs)` (284) raced against `Effect.timeout(attempt, attemptTimeoutMs)` via `Effect.raceFirst` (301-302), and interrupt-only cause handling (314-317). This is real adoption — retain it; the gap is signal propagation, not the queue.

**[P] Other existing islands** (not re-read): `track-b-auto-replay-runtime.ts` handoff/claim helpers, `run108-observability.ts` scoped metrics/spans, `runtime-observability/src/otel.ts` GenAI attribute projection (an attribute mapper, **not** an exporter). Per §15.1 these stay authoritative.

**Net:** "existing Effect" ≠ "Effect everywhere". Supervisor, sqlite-memory public API, protocol-routing index and host HTTP bootstrap are Promise/sync code with no Effect service boundary.

---

## 2. Current owners, callers, storage/transport truth

### 2.1 `packages/process-supervisor/src/index.ts` — B2, R22

**[O] No Effect.** Only `node:child_process` (line 1) and no `effect` import; exports are types plus `class ProcessSupervisor` (226). Mutable record fields include `restartPromise: Promise<void> | null` (54); restart chain at 367-369, 373-421 with `await sleep(restartDelay)` (393), backoff `250ms·2^(n-1)` capped 30s (8-9, 382-383).

**[O] Health is unbounded despite a deadline:** `waitForHealth` computes `deadline` (115) and loops `while (Date.now() <= deadline)` (116), but line 126 is `await fetch(healthCheckUrl)` **with no `AbortSignal`/timeout**. A connected-but-silent endpoint blocks inside `fetch` forever; the outer deadline is never consulted. This is the highest-confidence concrete defect in the leaf (proposal §15.1 flagged it; I confirmed the exact line).

**[O] Lifecycle:** `spawn` with `stdio: ["ignore","pipe","pipe"]`, `windowsHide` (176-184); stdout/stderr `data` listeners attached in `beginChildLifecycle` (147-170); `stopDeferred` promise (150-152). Windows "graceful" stop at 207-209 calls `requestWindowsTermination(pid, true)` → `taskkill /PID … /T /F`, i.e. **force**, the same as `requestForceStop` (214-224). If graceful-then-force semantics are contractual, that is a behavior divergence, not just a refactor risk. **[O]** `appendLog` is called from stream listeners into mutable status (100-103).

### 2.2 `packages/sqlite-memory/src/index.ts` — B3, R23/R24

**[O] Synchronous surface over `node:sqlite` `DatabaseSync`** (line 12). Public API is input-object functions returning `T`/`void` (hundreds; e.g. 2142, 2261, 4738). Effect is absent from the inspected region.

**[O] Exact retry policy:** `SQLITE_BUSY_TIMEOUT_MS=5000` (167), `RETRY_DELAY=100` (168), `MAX_ATTEMPTS=3` (169) → attempts at 0/100/200ms = initial + two retries. `openSqliteDatabase` sets `PRAGMA busy_timeout` (177-181). `withSqliteBusyRetry` (191-213) **opens a fresh `DatabaseSync` per attempt** (194), closes on success/failure, and retries the **whole `operation` closure**. Retry currently uses `Atomics.wait` in `sleepSync` (187-189, 209) — a hard event-loop block.

**Consequences to preserve/test, not "fix" by async return type:**
- A façade that awaits retry sleeps only makes *waits* non-blocking; SQL execution and transaction bodies remain blocking (`DatabaseSync` is sync). R24 forbids claiming otherwise.
- Because the closure is retried wholesale, any provider/network side effect accidentally placed inside `operation` would re-execute. Red test: operation counter + two induced busy errors must prove exactly three opens and zero re-execution of a side-effect probe (or that such a probe is impossible by construction).
- `initializeSqliteMemory` (2042-2115) opens a `DatabaseSync` then sets WAL/PRAGMAs/migrations; **[P]** partial-open cleanup on later failure is a required red test (§15.3). Not confirmed by me.

**[P] Transactions/graph:** observation write-intent/transaction surface around 4738-4898, graph-pointer hydration 5217-5253, maintenance 6497-6522. Not re-read; must be verified before claiming "same-connection transaction" or "primary error preserved".

### 2.3 `packages/protocol-routing/src/index.ts` — B4, R25

**[O] `routeRuntimeRequest` is synchronous** (347-421), returns `RouteRuntimeRequestResult` (140), and calls `projectRuntimeRouteInput` (281) then core `routeRequest` (351). There is no `Effect`/`runSync` in this file (grep found only the 9 export declarations).

**[O] A side effect sits inside the producer:** lines 361-400 build an eligibility histogram and `console.log(...)` **on every call** (389-399). Wrapping this in an `Effect` without moving that write to an injected logger changes structured concurrency/purity claims; a "pure kernel" wrapper cannot contain this log. Treat as a B4 design constraint: extract/parameterize the diagnostics sink before wrapping, or the Effect layer inherits an unowned console write.

**[P]** `packages/core/src/router.ts:1976` is the deterministic scorer (`routeRequest`); empty-pool success with empty chosen endpoint, tie order, role/task/effort and archetype goldens are contractual. Not re-read.

### 2.4 Host queue-runtime — B8 (public worker seam)

**[O] Cancellation is Effect-side only.** `workers.ts:246-247`:
```ts
const attempt = Effect.tryPromise({
  try: () => handler(job, { attempt: info.attempts }),
```
The handler receives **no `AbortSignal`**; `Effect.timeout`/`Fiber.interrupt` (301-302, 337) stops the *Effect*, not the handler's underlying Promise/fetch. The comment at 276-279 states the store has no cancellation signal and the watchdog only polls the row — so cancellation is "observed then fiber-interrupted", not I/O-propagated. Late completion can still try to ack on the next lock boundary; that is the exact seam requiring a handler-contract change plus fencing, not a token wrapper.

**[B]** Baseline: selected host queue/stream/observability tests 46 pass at setup (queue tests also referenced in §15.6). No queue replacement, no new SQLite driver: §15.5 says the reviewed effect-mq drivers are not a production SQLite replacement, so `PersistedQueue` deviation is retained.

### 2.5 Host composition / CLI seams — B6, R27

**[O] Shutdown endpoint is fire-and-forget:** `src/index.ts:17364-17372` handles `POST /api/role-model/runtime/shutdown` and calls `void options.shutdown?.();` — the HTTP response is not ordered after shutdown, and rejection is unobserved (unhandled rejection risk). Options type at 3502 (`shutdown?: () => Promise<void>`); implementation at 34276-34282 awaits vendor shutdowns and `supervisor?.shutdown()`.

**[O]** `AbortController` exists at 11580 (request path). **[P]** detached bootstrap at 34286, reprobe timer at 34764, callback notifications at 20297/20443/24173 — the ownership gaps named in §15.1 are plausible but unverified here. Do not cite them as reproduced.

---

## 3. Dependency-ordered backend slices (strict TDD, smallest first)

Each slice starts with a failing maintained test on current source (RED), then production change, then refactor. Characterization-only steps are the one allowed scoped exception (R3): baseline GREEN + byte/export comparison, no behavior rewrite.

| # | Slice / req | Owner surface | Red test seam (must fail now) | Constraints |
|---|---|---|---|---|
| 0 | **B0 contracts**, R19 | supervisor exports, `routeRuntimeRequest`, sqlite input-object functions | Export/signature/behavior characterization test: sync return types; `shutdown(): Promise<void>`; route result bytes for one fixture | No behavior change; separately characterized from conversion; no monolith split |
| 1 | **B1 diagnostics**, R20/R21 | new bounded reporter/DTO at request/job/lifecycle edge; run108 untouched | Nested/cyclic/reused `Error` + interrupt-only Cause: business result unchanged; sink overflow cannot recurse or reject | Compile target Effect 4.0.6 ErrorReporter/Cause APIs; one owner after finalizers, before wire translation; limits approved before enable |
| 2 | **B2 supervisor**, R22 | `process-supervisor/src/index.ts` | Local HTTP server that accepts and never responds → `start()` must time out bounded (currently hangs at 126); stop during startup; repeated stop; force after ignore; Windows grandchild | Add `AbortSignal` to health fetch; scoped child/streams; keep env/cwd/logs/SEA/loopback; preserve `ProcessSupervisor.shutdown(): Promise<void>` |
| 3 | **B3 SQL**, R23/R24 | `sqlite-memory`; named async host callers | Induce `SQLITE_BUSY` twice: exactly 3 opens, 100/200ms waits, 5s timeout; rollback fails + close fails → original SQL error preserved; partial PRAGMA/schema failure closes handle; two fibers serialize on one connection | Sync façade stays sync; no scheduled `runSync` retry; no provider I/O inside retried closure; per-store PRAGMAs; graph hydration parity |
| 4 | **B4 routing**, R25 | `protocol-routing` + actual decode callers | Golden parity: empty pool (success, empty endpoint), tie order, role/task/effort/arm, reason-code bytes; type test that sync export is unchanged until caller migration | Either migrate return type + every caller, or add named Effect producer with tested sync adapter; do not change reason values/order; move the 389 `console.log` behind an injected sink |
| 5 | **B5 transport**, R26 | host provider attempt/stream, `track-b-operations`, benchmark judge I/O | Abort mid-stream: server observes socket close; no paid redispatch after first substantive delta; fragmented SSE/tool pairing/DONE preserved; timeout ≠ generic retry | Thread `tryPromise` signal to `fetch`/readers; scoped listener/reader release; preserve 250/1000/2500/5000ms operations policy; span the I/O, not Promise creation |
| 6 | **B6 composition**, R27 | host factory/CLI bootstrap, sidecar/capture/refresh/benchmark | Shutdown during bootstrap; shutdown endpoint awaits completion (fix `void` at 17372); one finalizer throws → remaining releases still run; early readiness before backend ready | One closed Layer DAG per process; no per-request runtime; provider permits process-owned; stop admission → drain/join → close dependencies; idempotent shutdown |
| 7 | **B8 queue cancel**, B8 (R-ID >R28, not re-read) | `queue-runtime/workers.ts` + handler callers | Handler ignores abort: after cancel, underlying I/O stops and late completion cannot ack/publish; interrupt-only still releases claim without charging attempt | Change handler contract to accept `AbortSignal`; fence stale attempts after lease loss; retain evidence-before-ack, claim/retry IDs, one runtime per plane |

**Ordering rationale:** B0 freezes contracts → B1 supplies typed reporting used by B2/B3/B5 → B2 and B3 are independent leaves (can run in parallel) → B4 is independent and can start after B0 → B5 depends on B1 error vocabulary → B6 composes B1-B5 → B8 cancellation depends on B5's actual-I/O signal pattern. B7/B9 private stores/graph and B10 cross-repo ledger are out of this task's public scope (R28+ not re-read).

---

## 4. Maintained test anchors

- **[B]/[P] Supervisor:** `process-supervisor/test/index.test.ts` (6 baseline) → extend for hung health, partial acquire, ignore-stop/force escalation, repeated stop, Windows tree.
- **[B]/[P] SQL:** `recursive-87-atomic-observation.test.ts`, `recursive-87-maintenance.test.ts`, `run95-migration-parity.test.ts`, `run106-effort-source-migration.test.ts`, `run104-*`, `run105-*` (140 baseline) → exact retry counts/timings, transaction+close fault, graph hydration, backup/restore after drain.
- **[B]** Protocol: `index.test.ts`, `catalog-economics-routing.test.ts`, `observed-data-decay-policy.test.ts` (18 baseline) → golden byte/tie/empty-pool parity.
- **[P]** Stream/cancel: `run101-addendum06-attempt-timeout`, `run101-r5-cancel-drain`, `addendum19-stream-commit-point`, `addendum20-substantive-stream-gate`, `addendum21-terminal-stream-error` → require actual Promise/I/O cancellation, not `Effect.never` or source regex.
- **[P]** Run108 observability/benchmark-judge: two runtime scopes, judge isolation, exporter outage, causal IDs.
- **[B]** Whole-workspace/private/packaged/live lanes were **not** run at baseline; carried as a Phase 1/2 limitation.

---

## 5. Gaps, risks, unknowns for reproduction/QA

**Confirmed source observations (safe to build red tests on):**
1. Supervisor health `fetch` has no signal/timeout (126) — unbounded hang.
2. Windows graceful stop is `/F` force (207-209) — semantic divergence if "graceful" is contractual.
3. Supervisor restart backoff sleep is not interruptible (393) and `restartPromise` is shared mutable state (54, 367-369).
4. SQL busy retry reopens a connection per attempt and retries the entire closure (191-213) — side-effect replay hazard; `Atomics.wait` blocks the loop (187-189).
5. Queue worker `handler` gets no `AbortSignal` (246-247); cancel/timeout is fiber-level only, store cancellation is polled (276-298).
6. Shutdown HTTP endpoint does not await or catch `options.shutdown` (17372).

**Proposal-reported, unverified here (must be reproduced before citation as defects):** detached bootstrap 34286 and reprobe timer 34764 ownership; observation transaction/graph hydration 4738-5253; maintenance 6497-6522; track-b-operations retry ladder 967-1023; operations/private sidecar lifecycle `track-b-runtime:12753-13044`; private capture drain/close (private worktree only, out of this task).

**Unknowns blocking later proof:**
- Effect **4.0.6** (and vendored Foldkit **0.169.0**) API/type compatibility is unproven; repository currently resolves 4.0.1 per §15.1. Every proposed `ErrorReporter`/`Cause`/`HttpClient`/`Stream` call must compile against the pinned target, not assumed signatures.
- Whether `ProcessSupervisor` callers rely on synchronous `start()` state transitions (method set not fully inspected beyond `shutdown`).
- Whether queue-plane fiber/semaphore counts are treated as a global concurrency cap (they are not, per §15.5; topology test with two hosts still required).
- Exact contract for graceful vs forced Windows termination.
- Private B7/B9 behavior is outside this bundle; no claims made.
- E1/E2 remain owner-deferred; no journal/durable-live-inference semantics may be introduced in these slices.

**Bottom line:** the public backend is a mixed estate — a genuinely adopted Effect queue plane plus synchronous/Promise leaves (supervisor, SQL, routing) and an Effect-free host composition. The smallest safe program is B0 freeze → B1 typed diagnostics → parallel B2 (signal/scope) and B3 (sync-facade SQL service) → B4 parity producer → B5 I/O-bound cancellation → B6 scoped composition → B8 handler-signal/fencing, with sync/Promise contracts, per-store PRAGMAs, persisted queue semantics and exact retry policies preserved throughout.

*(Read-only: no writes by this worker. Raw output to be stored by the controller under `evidence/router/` and verified against the actual worktree.)*
