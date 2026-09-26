# Rebuilding The Replay, Evaluation And Learner Queues On Effect PersistedQueue And effect-mq

This document answers a concrete question: given the vendored Effect v4 tree (`vendor/effect`, tag
`effect@4.0.0-rc.117`) and the vendored effect-mq tree (`vendor/effect-mq`, tag `v0.7.0`), how would the runtime's
replay, evaluation and learner queues be rebuilt on `PersistedQueue` and `effect-mq` - and what has to be true
before that is a safe change to the packaged runtime.

It is a design, not an implementation. Every claim about today's behaviour cites the file it was read from; every
claim about the libraries cites the vendored source.

## 1. What the queues are today

The runtime does not have one queue abstraction. It has three hand-rolled ones, each a SQLite store plus a bounded
liveness sweep in the host, plus a ledger that bounds dispatches.

### 1.1 Replay plane

| concern | today | evidence |
| --- | --- | --- |
| job state | `queued` -> `leased` -> (`queued` on a retryable failure, else `failed`) | `extensions/replay-core/index.mjs` (`job.state = "leased"`, `failure.retryable ? "queued" : "failed"`) |
| retries | per-dispatch attempt records plus a **deferral budget**; when the budget is spent the capture terminates as `replay_failed` | `extensions/replay-core/index.mjs` (`#recordDispatchAttempt`, "captures end as `replay_failed` after the deferral budget") |
| scheduling | a host liveness tick selects captures, reserves budget in the ledger, then executes | `role-model-router/apps/runtime-host-bridge/src/track-b-auto-replay.ts`, `.../track-b-replay-ledger.ts`, `.../track-b-replay-policy.ts` |
| disposition record | `replay-disposition.sqlite` (outcome, refusal code, deferral counters) | stage state root |
| live classes seen | `replay_capture_idempotency_conflict`, `replay_boundary_unavailable`, `lease-required`, `unknown durable state`, `missing durable job ID`, `deferral budget exhausted`, `budget_exhausted`, `capture_missing`, `replay_window_elapsed` | run-100 addenda 16-36, 44 |

The pain is structural, not incidental: identity is re-derived per call site (the `capture_missing` class), the
deferral budget is the only retry policy, and "a released job is never re-entered" was measured as a live defect
(`extensions/evaluation-core/index.mjs` comment at `#strandedJobState`).

### 1.2 Evaluation plane

| concern | today | evidence |
| --- | --- | --- |
| job state | `TERMINAL_EVALUATION_JOB_STATUSES = {cancelled, completed, failed}` plus non-terminal `queued/leased/scoring/retry_wait` | `extensions/evaluation-core/index.mjs` |
| trial state | `queued`, `leased`, `retry_scoring`, `retry_wait`, `scored`, `failed`, `cancelled`; **claimable** = `{queued, leased}` | same file (`DRIVEN_CLAIMABLE_TRIAL_STATUSES`, `AWAITING_SCORING_RETRY_TRIAL_STATUSES`) |
| leases | `lease_id` + `lease_owner` + `lease_expires_at_ms`, renewed by SQL; every capability call opens its own connection | same file (`evaluation:claim-job`, `renew-job-lease`) |
| stall recovery | a stranded marker plus a **15-minute grace** (`STRANDED_EVALUATION_JOB_GRACE_MS = 15 * 60_000`), then reclaim/cancel | same file (`#strandedJobState`, `#reclaimStrandedJob`) |
| contention | the store opened with `journal_mode=DELETE; synchronous=FULL` and no `busy_timeout` until addendum 35 added `busy_timeout=5000` | run-100 addendum 35 |
| live classes seen | jobs in `scoring` with no lease (watched through the 15-minute reclaim in addendum 49), `evaluation job cannot be cancelled in its current state` no-op streams, `database is locked` | run-100 addenda 35, 36, 49 |

### 1.3 Learner plane

The learner has no queue at all: it is a **backlog walked by a liveness loop**.

| concern | today | evidence |
| --- | --- | --- |
| work selection | `deriveLearnerCandidatesFromDurableEvidence` walks finalized comparison groups paged `group_id ASC`, bounded per tick | `role-model-router/apps/runtime-host-bridge/src/track-b-learner-derivation.ts`, caller `cli.ts` (`limit: 24`, `attemptedGroupIds`) |
| progress | per-process `attemptedGroupIds` set; a skip is consumed exactly like a derivation | `cli.ts` (`learnerDerivationAttempts`), run-100 addendum 40 |
| other sweeps in the same tick | `retroFinalizeEvaluations`, `sweepFinalizationSignals`, `learnFromUnconsumedCandidates`, `reconcileEvaluationJobs`, terminalization | `role-model-router/apps/runtime-host-bridge/src/track-b-auto-replay-runtime.ts` |
| measured effect | backlog 496 -> 0 by *burning* attempts; 347 derived + 153 named retention skips = the 500-group census; the evidence producer had to be added separately (post-finalization signals) | run-100 addenda 37-40, 45 |

### 1.4 The failure classes a real queue would remove

Each of these was measured live during run 100 and maps to a queue primitive:

| class | root cause today | queue primitive that removes it |
| --- | --- | --- |
| `replay_capture_idempotency_conflict` | identity re-derived per call site; no single enqueue identity | one job id per logical unit (`JobId` / `offer(..., { id })`) |
| `deferral budget exhausted` / `budget_exhausted` | the only retry policy is a hand-rolled deferral counter | `attempts` + `backoff` (effect-mq) or `maxAttempts` + `retrySchedule` (PersistedQueue) |
| `lease-required`, `unknown durable state`, `missing durable job ID` | refusals from a partially-applied state machine | claim/lock/ack with a store that owns the transition |
| jobs stuck in `scoring`, cancel no-ops | terminality inferred by readers from externalized records | job `state` + history owned by the store (`JobRecord`, `AttemptRecord`) |
| learner backlog burn | "attempted" is a process-local set, not durable progress | the job is the unit of progress; a skipped job stays claimable |

## 2. The two building blocks, as vendored

### 2.1 Effect `PersistedQueue` (`vendor/effect/packages/effect/src/unstable/persistence/PersistedQueue.ts`)

- `PersistedQueue.make({ name, schema, maxAttempts?, retrySchedule? })` returns a queue service; `offer(job, { id })`
  enqueues with a **stable id** (the blog's dedupe lever), `take(handler)` claims one job, runs the handler, and
  acknowledges on success.
- Claims are a **renewable lock**: the store refreshes while the handler runs and releases/expires on failure, so a
  crashed worker's job is claimable again. Redis store defaults are 30 s refresh / 90 s expiration and are
  configurable; the SQL store takes `lockRefreshInterval` / `lockExpiration` too.
- A failed handler schedules a retry from the *persisted attempt count* (default `min(exponential 1s, spaced 5m)`),
  so delays are reproducible across processes and restarts; after `maxAttempts` the job is terminal `failed`.
- Stores: `layerStoreMemory` (tests), `makeStoreRedis`/`layerStoreRedis`, and **`makeStoreSql`/`layerStoreSql`**
  which requires only `SqlClient.SqlClient | Scope` and creates its own `effect_queue` table
  (`tableName`, `pollInterval`, `lockRefreshInterval`, `lockExpiration`). `PersistedQueueStore` is a public service,
  so a custom store is expected, not a hack.
- What it does **not** give: priorities, cron/repeatable schedules, parent-child flows, cancellation/admin, job
  history retention. That is what effect-mq adds.

### 2.2 effect-mq (`vendor/effect-mq/packages/effect-mq/src`)

- `Job.make(name, { payload, queue, store, metadata, defaults: { attempts, backoff } })` defines a job **once**;
  producers call `Job.enqueue(payload, options)` and runners provide `Job.toLayer(handler)`.
- `Worker.layer` runs registered handlers against a `JobStore`: taker fibers per queue bounded by queue concurrency,
  each running claim -> decode -> handler -> ack(`complete`|`retry`|`fail`), plus maintenance fibers for lock renewal,
  **stalled job recovery**, and schedule sweeping; on scope close in-flight handlers are interrupted and their jobs
  released **without consuming an attempt**.
- `Worker.CurrentJob` exposes `{ jobId, attempt }` to a handler and everything it calls.
- `JobStore` is a full queue contract: `JobId`, `QueueName`, `ScheduleKey`, `JobState`, `BackoffPolicy`
  (`fixed|exponential`), `KeepPolicy`/`HistoryTtl` (retention by state), `AttemptRecord.outcome`
  (`completed|retried|failed|stalled|cancelled|fanned-out`), `JobRecord` with `priority`, `attemptsMax/Made`,
  `stalledCount`, `metadata`.
- Beyond the core: `JobSchedules` (repeatable/cron), `Flow` (parent-child, two-phase handler, results returned
  through an **outbox relay**, typed results, failure policy, nesting), `Metrics`, and a `testing.jobStoreConformance`
  suite plus `TestJobStore`.
- Drivers shipped: `MemoryJobStore`, `drizzle-postgres` (schema included), `redis` (with Lua scripts). There is no
  SQLite driver, but `docs/storage/writing-a-driver.md` documents the contract and the conformance suite validates a
  new one.

### 2.3 Storage for a local-first, packaged runtime

The runtime is a single packaged executable (SEA) serving `:3457` with SQLite state under one state root, and the
same root is opened by **two hosts** (operator host + Track B sidecar). Postgres or Redis would add a server
dependency and contradict the local-first/portable posture. Both libraries therefore have to run on SQLite:

- Lighter option: `PersistedQueue.layerStoreSql()` over Effect's vendored `@effect/sql-sqlite-node`
  (`vendor/effect/packages/sql/sqlite-node/src/SqliteClient.ts`). No new driver to write.
- Fuller option: a SQLite `JobStore` driver for effect-mq, validated with `jobStoreConformance`. Needed only for the
  features the queues actually want (priorities, schedules, flows, history).

## 3. Target design

### 3.1 Four queues and one flow

| queue | replaces | payload (schema-first) | job id (dedupe) |
| --- | --- | --- | --- |
| `replay.dispatch` | `runAutoReplayTick` + `replay-core` job store | `{ captureRef, sourceEndpointId, arms[], policySetDigest }` | `captureRef` |
| `evaluation.score` | `evaluation-core` job/trial machine + `evaluation-runner-local` | `{ replayJobId, groupId, caseIds[], scorerSetVersion }` | existing `evaluation-replay-<replayJobId>` |
| `learner.derive` | learner derivation sweep | `{ groupId }` | `groupId` |
| `learner.promote` | knowledge-worker consume/validate + learning pass | `{ candidateId, groupId }` | `candidateId` |

The pipeline becomes an effect-mq **flow**: `replay.dispatch` completes -> enqueues `evaluation.score` ->
`evaluation.score` finalizes -> enqueues `learner.derive` -> `learner.derive` produces a candidate -> enqueues
`learner.promote`. Results travel through the flow outbox, which is exactly the
"nothing re-enters a released job" gap the hand-rolled sweeps kept falling into.

### 3.2 Per-queue configuration

Starting values, chosen to match the bounds the runtime already enforces (changeable in one place per queue):

| queue | concurrency | attempts | backoff | lock refresh / expiration | notes |
| --- | --- | --- | --- | --- | --- |
| `replay.dispatch` | 1 | 5 | exponential 1 s -> cap 5 m | 30 s / 5 m | replaces the deferral budget; the arm plan is one endpoint per branch, so concurrency 1 keeps the ledger comparable |
| `evaluation.score` | 4 | 4 | exponential 2 s -> cap 1 m | 30 s / **15 m** | 15 m expiration keeps today's `STRANDED_EVALUATION_JOB_GRACE_MS` semantics while stalled recovery takes over the reclaimer |
| `learner.derive` | 2 | 3 | exponential 2 s -> cap 1 m | 30 s / 5 m | idempotent by `groupId`; the bounded per-tick derivation is replaced by queue concurrency |
| `learner.promote` | 1 | 3 | exponential 5 s -> cap 5 m | 30 s / 5 m | promotion must stay serialized per package |

Invariants kept from today, in the queue rather than beside it:

1. **Budget at enqueue time.** The daily counterfactual/dispatch ceiling stays a channel-scoped policy resolved where
   the job is *offered*; the queue never knows about budgets, so a refused budget is a decision not to enqueue.
2. **Benchmark exclusion at enqueue time.** Nothing enters `replay.dispatch` unless the capture passed the existing
   exclusion, so the queue cannot become a second place where that rule must hold.
3. **Routing independence.** No routing path reads or writes these queues; the advisory plane keeps its own
   activation gate.
4. **Evidence stays in the evidence stores.** `replay-disposition.sqlite`, `evaluation_jobs`/`evaluation_trials`,
   `trajectory_signal_reports`, the knowledge store and the contract artifacts remain the audit trail. The queue
   store is a scheduler whose rows are disposable: deleting it must not invalidate a single receipt.

### 3.3 What each plane stops doing

| today | after |
| --- | --- |
| hand-rolled lease/heartbeat/reclaim in `evaluation-core` | worker lock renewal + stalled recovery (`Worker` maintenance fibers) |
| deferral counters and `deferral budget exhausted` | `attempts` + `backoff`, with a terminal `failed` carrying its error |
| per-process `attemptedGroupIds` | durable job rows; a skip leaves the job claimable |
| liveness sweeps as the only scheduler | enqueue at the moment the upstream stage completes (flow outbox) |
| reader-side terminality inference (`cancel` no-ops) | `JobRecord.state` + `AttemptRecord` history |

## 4. What has to be built before any of this touches the runtime

1. **Make the vendored trees consumable.** They are source-only, not workspace packages; the runtime is bundled with
   esbuild into a SEA exe. Decide between (a) a workspace package that re-exports the vendored `effect` and
   `effect-mq` sources, or (b) path-mapped bundling. Prove it by bundling the runtime with the new imports and
   running the packaged exe against `:3457` state.
2. **Align the Effect version.** effect-mq's catalog pins `effect@4.0.0-rc.111`; the vendored tree is
   `4.0.0-rc.117`. Either move effect-mq's pin or vendor the version it expects - a digest-recorded, reviewed change.
3. **SQLite store.** Start with `PersistedQueue.layerStoreSql()` + `@effect/sql-sqlite-node`; if the queues need
   effect-mq's richer contract (priorities, schedules, flows, history), write the SQLite `JobStore` driver and pass
   `jobStoreConformance`.
4. **Contention.** Any queue store on the shared state root must open with `busy_timeout` (the fix already applied to
   `evaluation-core` and `trajectory-signals`) and should use WAL, because the operator host and the sidecar both
   touch the root.

## 5. Migration plan

| phase | change | acceptance | rollback |
| --- | --- | --- | --- |
| 0 | consumable vendored trees + SQLite store + conformance/smoke tests. No runtime behaviour change. | packaged runtime still builds and serves; `jobStoreConformance` green if a driver was written | revert the branch |
| 1 | **shadow** one plane (start with `learner.derive`): enqueue real work, log what the queue *would* do, keep the sweep authoritative | for 24 h: identical set of groups selected, no duplicate candidates, no new refusal classes | delete the shadow worker config; sweeps unchanged |
| 2 | cut over `replay.dispatch`, then `evaluation.score`, then the learner queues, each behind a policy flag for one release | per plane: the measured class it targets goes to zero (replay: deferral/lease/idempotency refusals; evaluation: no job in `scoring` past lock expiration; learner: backlog drains without burn) | flip the flag; the old sweep still reads the same evidence stores |
| 3 | delete the hand-rolled lease/reclaim/deferral paths and their refusal vocabulary; keep receipts | no code path can produce the removed classes; the UI reads job history for state | restore from the previous release |

The release coupling is the established one: the host lives in the public repo, the extensions in the private repo,
so a cutover lands as a paired change with a paired rebuild, a stage candidate and live verification on `:3457`.

## 6. Risks and open decisions

1. **Bundling risk.** Effect v4 + effect-mq inside a SEA exe is the largest unknown; it must be proven in phase 0
   before any queue code is written.
2. **Version alignment** (rc.111 vs rc.117) - operator decision, recorded as a pin move.
3. **Two hosts, one store.** Lock semantics must hold across processes; the conformance suite must be run against the
   real state-root layout (two openers), not just in-memory.
4. **Observability.** The Learning/Observe pages read purpose-built tables today. Either project the queue's job
   state into the existing readbacks, or keep the receipts as the UI source and the queue as the scheduler.
5. **Retention.** `KeepPolicy`/`HistoryTtl` replace unbounded growth, but the audit receipts are separate and must
   stay unbounded-by-policy (they are the evidence).
6. **Which tier per plane.** Recommendation: Effect `PersistedQueue` for `replay.dispatch` and `evaluation.score`
   (locks + retries + dedupe are the whole requirement), effect-mq for the learner plane where schedules, priorities
   and the flow outbox pay for the driver work - and where its `Metrics`/history answer the cancellation and
   admin-readback gaps this runtime has been patching by hand.

## 7. References

- Vendored Effect: `vendor/effect/PROVENANCE.md`, `vendor/effect/packages/effect/src/unstable/persistence/PersistedQueue.ts`,
  `vendor/effect/packages/sql/sqlite-node/src/SqliteClient.ts`.
- Vendored effect-mq: `vendor/effect-mq/PROVENANCE.md`, `packages/effect-mq/src/{Job,Worker,JobStore,Flow,JobSchedules}.ts`,
  `docs/guide/{defining-jobs,workers,flows,retries-and-timeouts,deduplication,retention,testing}.md`,
  `docs/storage/{stores,writing-a-driver,postgres,redis}.md`.
- Upstream article: <https://effect.website/blog/module-of-the-week/persisted-queue>.
- Run-100 evidence for today's behaviour: `.recursive/run/100-replay-evidence-completeness-and-learner-yield/addenda/`
  (06, 16-36, 37-40, 44-49).
