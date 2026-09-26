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

**Job identity per origin.** Replay work is one job per capture. Evaluation work has two origins - the replay flow
(whose durable id is already `evaluation-replay-<replayJobId>`) and the live-observation path (which creates its own
job id today) - so the queue id is `evaluation:<origin>:<groupId>` with one job per finalized comparison, and the
existing `evaluation-replay-*` ids stay the evidence ids. The projection/consume plane
(`shadow:projection-v2:consume`) and the background-evidence-scheduler, which today *emits* replay intents, are not
additional queues: the scheduler becomes the enqueue producer and the projection consumers run as handlers on
`evaluation.score`'s completion, so no work keeps its own polling loop.

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

### 3.4 Who runs the workers

Two hosts share one state root today: the packaged runtime host (`role-model-stage.exe`) and the Track B sidecar
(`runtime-operations-server.mjs`). The queue must not recreate that ambiguity:

- **One worker set per queue.** Run `replay.dispatch` and `learner.*` workers in the operator host (which owns the
  dispatch executor and the liveness loop today) and the `evaluation.score` worker in the sidecar (whose extension
  workers already execute the trials). The queue store is the only coordination point; neither host reads the other's
  memory.
- **Attributable locks.** Each worker sets a distinct worker id, so the UI can name the owner of an in-flight job and
  a stalled job's last owner.
- **Bounded concurrency across hosts.** The §3.2 concurrency is a per-queue budget; if a queue is later run in both
  hosts, the sum must stay inside it, which the store's claim query already enforces.
- **Host loss is handled by lock expiry**, not by a reclaimer sweep: the surviving host picks the job up when the lock
  expires, which is the property the hand-rolled `#strandedJobState` reclaimer approximated with a 15-minute grace.

### 3.5 Evidence rows are still written by the handlers

The queue owns *scheduling* state. The evidence that the audits and the UI read - `replay-disposition.sqlite`,
`evaluation_jobs`/`evaluation_trials`, comparison readback receipts, `trajectory_signal_reports`, the knowledge store
records and the contract artifacts - is written by the handler as part of doing the work, exactly as today. The rule:

- a handler writes (or updates) its evidence row **before** the job is acked; if the evidence write fails, the
  handler fails and the queue retries, so the queue can never be the only record that something happened;
- deleting the queue store must leave every receipt valid, and the queue rows must be reconstructible from the
  evidence ids (the job ids are derived from them);
- the UI's evidence views (decisions, receipts, profiles, history) keep reading the evidence stores; only the queue
  views read the queue store.

### 3.6 Cancellation and the kill switch

Today `POST /operator/replay/jobs/:id/cancel` and `.../evaluation/jobs/:id/cancel` exist, and evaluation learned to
answer "cannot be cancelled in its current state" (run-100 addendum 36). In the target design:

- cancel is effect-mq job cancellation: the job becomes terminal `cancelled` and the handler is interrupted at the
  next lock boundary;
- the operator kill switch stays a **policy flag checked at enqueue and at claim**, not a queue feature, so engaging
  it mid-flight stops new work while in-flight work still reaches a terminal state;
- the UI keeps its existing cancel endpoints and gains the queue's own state (cancelled vs already terminal) so the
  no-op cancel stream cannot reappear.

## 4. Frontend and operator-API wiring

A rebuilt queue is only real to a user if the operator API and the UI are part of the same change. Most of the
plumbing already exists, and the rebuild must **keep its contract** rather than invent a parallel one.

### 4.1 What already exists (do not rebuild it)

| layer | today | evidence |
| --- | --- | --- |
| operator job readbacks | `GET /operator/replay/jobs`, `/operator/replay/jobs/:id`, `/:id/results`, `POST /:id/cancel`, `POST /operator/replay/jobs`, `POST /operator/replay/expire-stale`; `GET /operator/evaluation/jobs`, `/:id`, `/:id/trials`, `/:id/scorers`, `/:id/comparisons`, `/:id/groups`, `POST /:id/cancel`, `POST /:id/retry` | `scripts/track-b/runtime-operations-server.mjs` |
| UI client + tests | the same paths are already wrapped in `app/lib/runtime-api.ts` and covered by `app/lib/run96-operator-controls.test.ts` | `role-model-router/apps/runtime-ui` |
| pipeline widget | `GET /operator/learning/activity` already answers `pipeline: [{ stage: capture\|replay\|evaluation\|learner, pending, wedged, recent, active, lastEventAtMs }]` | `learning.tsx`, `learning-api.ts` |
| refresh conventions | the extensions route polls replay every 15 s, the logs route every 3 s, the app shell polls the runtime summary | `routes/extensions.tsx`, `routes/local-logs.tsx`, `components/app-shell.tsx` |
| device trust | `app/lib/device-authorization.ts` resolves device-owner sessions | same app |
| editable parameters | Learning -> Configuration already renders policy `fields[]` with bounds and writes them back | `learning.tsx`, `lib/learning-policy-resolution.ts` |

So the frontend work is: **feed these from the queue store and add what is missing** - not build a new app.

### 4.2 Read model: queue state to operator API

Additions to the operator surface, with every existing path kept working:

- `GET /operator/queues` - one row per queue: `{ name, concurrency, waiting, active, delayed, failed,
  completedRecent, stalled, oldestWaitingMs, p50Ms, p95Ms, lastError }`.
- `GET /operator/queues/:name/jobs?state=&limit=&cursor=` - paged job records (id, name, state, `attemptsMade`/
  `attemptsMax`, priority, `stalledCount`, createdAt, scheduledAt, metadata).
- `GET /operator/queues/:name/jobs/:id` - one job plus its attempt history (per-attempt outcome and named failure)
  and the evidence refs its handler wrote.
- `POST /operator/queues/:name/jobs/:id/retry`, `.../cancel`, `POST /operator/queues/:name/drain` - admin actions;
  drain stops claiming and lets in-flight work finish.

These are readbacks over the same SQLite queue store the workers use. The existing `/operator/replay/*` and
`/operator/evaluation/*` responses are re-expressed on top of them, so today's pages keep working unchanged while
their data becomes queue truth.

### 4.3 UI: where it goes

1. **Learning -> Overview** (existing page): the pipeline widget's `replay` / `evaluation` / `learner` rows are fed
   from `GET /operator/queues` (pending -> waiting + delayed, wedged -> stalled, active -> active, last event -> last
   completion). No layout change; the numbers become live queue truth instead of store-derived approximations.
2. **Learning -> Configuration** (existing page): a **Queues** card with the section 3.2 parameters per queue -
   concurrency, attempts, backoff base/cap, lock refresh/expiration, retention - each with bounds, a reset to
   default, and apply-to-running-worker semantics, persisted in the config file below.
3. **New route `/app/observe/queues`** (sidebar under Observe, beside Requests and Routing): a queue table (depth,
   active, delayed, failed, stalled, p50/p95) and a drill-in job table with state filters, a detail drawer showing
   attempt history with named failure reasons, and the admin actions from 4.2. This is the page that turns "18 evals
   stuck in flight" and "everything is failing or deferred" into a state a user can act on.

### 4.4 Config file and canonical doc

- One config file (`role-model-router/config/queues.json`, with the private worker defaults mirroring it) holds the
  section 3.2 table; it is schema-validated, and the UI writes it through the operator API with the bounds enforced
  server-side. This follows the existing pattern of `shared/route-learning-activation-policy.json` plus its
  canonical doc.
- This document is the canonical reference for the parameters and their semantics; the UI links to it from the
  Queues card.
- Defaults are the section 3.2 values, and every change is auditable (who, when, old -> new).

### 4.5 Freshness and load

- The queue store polls at 1 s (the SQL store default), so the drill-in page is at most ~2 s stale; the Overview
  pipeline widget keeps its existing 15 s cadence rather than adding load.
- The jobs list is cursor-paged, never a full scan; the detail drawer reads one job plus its attempts.
- Queue readbacks must never sit in the routing path: they read the queue store on the operator host, exactly as
  `/operator/replay/jobs` does today.

### 4.6 Acceptance for the frontend (part of Phase 5)

- Every page and component verified **in the browser** against the running rebuilt runtime while real DSH/pi traffic
  flows: the Overview pipeline rows move as work is enqueued, claimed and completed; the queue page shows a job
  moving waiting -> active -> completed; a failing handler shows its named reason and the retry attempt; cancel and
  drain behave as described; the Configuration card round-trips a parameter and the worker picks it up.
- The existing pages are regression-verified in the same pass (`/app/learning`, `/app/observe/requests`,
  `/app/observe/routing`, `/app/system/storage-retention`), because they read the same stores.
- No queue page may require a manually pasted operator token on the device-owner path; device authorization is the
  default, matching the rule the Learning UI already implements.

## 5. What has to be built before any of this touches the runtime

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

## 6. Migration plan

| phase | change | acceptance | rollback |
| --- | --- | --- | --- |
| 0 | consumable vendored trees + SQLite store + conformance/smoke tests. No runtime behaviour change. | packaged runtime still builds and serves; `jobStoreConformance` green if a driver was written | revert the branch |
| 1 | **shadow** one plane (start with `learner.derive`): enqueue real work, log what the queue *would* do, keep the sweep authoritative | for 24 h: identical set of groups selected, no duplicate candidates, no new refusal classes | delete the shadow worker config; sweeps unchanged |
| 2 | cut over `replay.dispatch`, then `evaluation.score`, then the learner queues, each behind a policy flag for one release | per plane: the measured class it targets goes to zero (replay: deferral/lease/idempotency refusals; evaluation: no job in `scoring` past lock expiration; learner: backlog drains without burn) | flip the flag; the old sweep still reads the same evidence stores |
| 3 | delete the hand-rolled lease/reclaim/deferral paths and their refusal vocabulary; keep receipts | no code path can produce the removed classes; the UI reads job history for state | restore from the previous release |

The release coupling is the established one: the host lives in the public repo, the extensions in the private repo,
so a cutover lands as a paired change with a paired rebuild, a stage candidate and live verification on `:3457`.

## 7. Risks and open decisions

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

## 8. Audit notes (2026-09-26)

This plan was audited against the runtime's real operator API, the UI source, and the vendored libraries before any
implementation. Eight gaps were found in the first draft; each is closed above:

| # | gap in the first draft | now covered by |
| --- | --- | --- |
| 1 | no frontend plan at all | section 4 |
| 2 | ignored that `/operator/replay/jobs*` and `/operator/evaluation/jobs*` (with their UI client and tests) already exist | 4.1, 4.2 - keep the contract |
| 3 | no statement of which host runs the workers, though two hosts share one state root | 3.4 |
| 4 | no rule for who writes the evidence rows the audits and the UI read | 3.5 |
| 5 | cancellation and kill-switch semantics absent | 3.6 |
| 6 | the queue list omitted the projection/consume plane, the scheduler that emits replay intents, and terminalization/reconcile | 3.1 note, 3.3 |
| 7 | no config file or parameter surface, despite the run-98 requirement that parameters live in config with a canonical doc | 4.4 |
| 8 | no freshness/load budget and no browser acceptance criteria for the UI | 4.5, 4.6 |

Two audit observations that do not change the plan but should be recorded: the learner backlog's "attempted" set is
per process, so the first cutover will show a one-time drop in derived-per-tick as the queue takes over; and
effect-mq's job history is bounded by `KeepPolicy`, so the audit trail must keep living in the evidence stores
(3.5) rather than relying on queue history.

Remaining operator decisions: Effect version alignment (7.2), which tier per plane (7.6), and whether the first
cutover is the learner or the replay queue (6, phase order).

## 9. References

## 10. As built (2026-09-26, run 101)

This section records what the design above actually became. It is written after the implementation, and it is the
*effective* reference for anyone working on the queues from here: where a choice below differs from a section above,
this section wins and the difference is stated.

### 10.1 How the vendored trees are consumed (§2, §5.1)

The trees are published as **workspace packages carrying the upstream names**, not as `@role-model-router/vendor-*`
wrappers:

| package | repository | source |
| --- | --- | --- |
| `effect` | both (`role-model-router/packages/effect`, `shared/effect`) | `vendor/effect` |
| `effect-mq` | both (`role-model-router/packages/effect-mq`, `shared/effect-mq`) | `vendor/effect-mq` |
| `@effect/sql-sqlite-node` | both (`role-model-router/packages/sql-sqlite-node`, `shared/sql-sqlite-node`) | `vendor/effect/packages/sql/sqlite-node` |

The reason is effect-mq: it imports `effect` **by name**, so publishing the vendored Effect under that name is what
makes the single-runtime-instance property hold by construction rather than by aliasing. Each package builds
`dist/*.js` with esbuild (`splitting: true`, so one shared core chunk) and emits declarations with
`tsc --noCheck --emitDeclarationOnly`, rewriting the emitted `.ts` specifiers to `.js` because the vendored sources
import each other with explicit extensions. The build writes **only** into `dist/` (gitignored): an earlier version
generated type shims into `src/`, which made a built worktree dirty and broke the paired distribution's
clean-worktree guard in CI.

### 10.2 The store (§3.2, §5.4)

One SQLite database per state root: `<stateRoot>/track-b/queues/queues.sqlite`, opened by the vendored
`PersistedQueue.layerStoreSql` over `SqliteClient.layer` (WAL by default, `busyTimeout` 5 s), composed as the queue
**factory** layer `PersistedQueue.layer`. The library owns the schema (`effect_queue`); the module owns only the path
and the lock parameters, and it creates the directory when it is missing. The store is registered in
`shared/retention/index.mjs` as class `queue_store` (owner `queue-runtime`, `retentionPolicy:
rebuildable_scheduler_state`, `rollbackStrategy: delete_store_rebuild_from_evidence`), and `storage-audit.mjs`
inventories it so the storage-retention surface reports its real footprint.

### 10.3 Parameters, API and UI (§3.2, §4)

`shared/queues/queue-policy.mjs` + `shared/queue-policy.json` hold the catalogue (four queues, eight parameters each,
type/unit/bounds/default/description, global kill switch). The effective document lives at
`<stateRoot>/queues/queue-policy.json`: the state-root document wins, the shipped document is the fallback, and
neither being present is a named error. `GET/POST /operator/queues/config` reads and writes it with server-side
bounds and a receipt per change; the host reads the same document read-only through
`apps/runtime-host-bridge/src/queue-runtime/policy.ts`.

The frontend is three surfaces: **Observe -> Queues** (`/app/observe/queues`) with the queue table (mode, depth,
stalls, oldest waiting, p50/p95, last error) and a job drill-in (attempts, lock owner, named failure, payload);
the **Learning Configuration** Queues card, rendered from the operator catalogue so bounds and defaults cannot
drift; and the **Overview** pipeline rows, which read queue truth once a plane leaves `legacy` and keep the
store-derived numbers as the fallback.

### 10.4 The four queues, their hosts and the chain (§3.1, §3.4, §3.6)

| queue | job id | worker host | notes |
| --- | --- | --- | --- |
| `replay.dispatch` | `captureRef` | operator host | offered after admission and the ledger reservation, so a refused capture is never enqueued |
| `evaluation.score` | `evaluation:<origin>:<key>` | operator host (**not** the sidecar - see 10.5) | key is the comparison's `groupId` for the observation origin and the `replayJobId` for the replay origin |
| `learner.derive` | `learner.derive:<groupId>` | operator host | a named skip is a failed attempt, so the group stays claimable |
| `learner.promote` | `learner.promote:<candidateId>` | operator host | serialized by the queue's concurrency; fed by the derivation's `onDerivedCandidate` callback |

The chain is completion-driven: the auto-replay tick offers admitted captures; the replay worker claims one and drives
it through `dispatchCapture` (the loop's own body, restricted to that capture, with the queue disabled so a job cannot
re-enqueue itself); the handoff offers `evaluation.score`; the evaluation worker claims it and drives the resume pass
**scoped to that handoff** (`scopeResumeStoreToReplayJob`); a finalized comparison offers `learner.derive`; and a
derivation that persisted a candidate offers `learner.promote`.

Once a plane's mode is `queue`, the loop steps aside: `resumePendingEvaluations`, `reconcileEvaluationJobs` and
`retroFinalizeEvaluations` retire for the evaluation plane, and `learnFromUnconsumedCandidates` and
`deriveLearnerCandidates` retire for the learner plane. `sweepFinalizationSignals` keeps running in every mode
because it is an evidence producer, not scheduling. The modes are read per tick, so a rollback restores the sweeps
with no restart.

### 10.5 Deviations from the design, and why

1. **The evaluation worker runs in the operator host, not the sidecar** (§3.4). The capability calls it drives
   (materialize-trials, scoring, resume) live in the host's operations surface; placing the worker in the sidecar
   would add a cross-process RPC purely to move scheduling. Both hosts share the one store, so relocating it later is
   a wiring change.
2. **The learner plane uses `PersistedQueue`, not the effect-mq tier** (§7.6). effect-mq ships Postgres and Redis
   `JobStore` drivers and no SQLite one, and this runtime must keep its store on its own state root. The learner's
   contract - durable progress, claimable skips, serialized promotion - is delivered; moving the plane to effect-mq
   needs the SQLite driver work, tracked as an addendum candidate.
3. **The observation-origin producer is not wired.** The shadow pipeline creates and completes its evaluation job
   inline (`requestKind: "routing_shadow_durable"`), and scheduling that path through the queue is a pipeline
   refactor rather than a wiring change. Recorded as an explicit deferral, not silently omitted.

### 10.6 Two measured behaviours worth knowing before changing a worker

- `PersistedQueue.take` **returns the handler's failure** once the store has recorded the retry (`visible_at` moves,
  `attempts` increments); the retry is picked up by the *next* claim. The vendor only auto-loops for dead letters, so
  the claim loop is the runtime's responsibility - a worker that calls `take` once retries zero times.
- The SQL store writes `visible_at` with **whole-second resolution** (`Math.ceil`), so no retry lands sooner than 1 s
  regardless of `backoffBaseMs`. The policy's 100 ms floor is honest at the store level but effectively 1 s at the
  retry level.

- Vendored Effect: `vendor/effect/PROVENANCE.md`, `vendor/effect/packages/effect/src/unstable/persistence/PersistedQueue.ts`,
  `vendor/effect/packages/sql/sqlite-node/src/SqliteClient.ts`.
- Vendored effect-mq: `vendor/effect-mq/PROVENANCE.md`, `packages/effect-mq/src/{Job,Worker,JobStore,Flow,JobSchedules}.ts`,
  `docs/guide/{defining-jobs,workers,flows,retries-and-timeouts,deduplication,retention,testing}.md`,
  `docs/storage/{stores,writing-a-driver,postgres,redis}.md`.
- Upstream article: <https://effect.website/blog/module-of-the-week/persisted-queue>.
- Run-100 evidence for today's behaviour: `.recursive/run/100-replay-evidence-completeness-and-learner-yield/addenda/`
  (06, 16-36, 37-40, 44-49).
