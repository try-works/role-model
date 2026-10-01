RECEIPT TOKEN: r104-as-queue-stall-3N7B

# Phase 1 AS-IS - stuck replay / evaluation / learner queues

Analyst: subagent `as104_queue_stall` (read-only + this file). Baselines: public `84d5996c` /
private `5df90b6d`; live stage `:3457` `stage-rc-14fce6cffcd1` (idle per operator report).
Status: PARTIAL (the 15-minute box expired mid-investigation; checks 5-8 are incomplete - see
`## Unverified`). The finding that dominated the box: the operator queue/learning readback
endpoints do not answer at all, while the same process serves telemetry in 28 ms.

## Live queue snapshot (raw keys)

Probe (read-only, 2026-10-01 ~16:00-16:04 local, stage `:3457`, PID 39284 listening on 127.0.0.1:3457):

| Endpoint | Result |
| --- | --- |
| `GET /api/role-model/operator/queues` | **no response**: `curl -m 25` -> `STATUS:000 TIME:25.07`; retried `curl -m 90` -> `STATUS:000 TIME:90.01` |
| `GET /api/role-model/operator/learning/activity?windowMinutes=60&limit=24` (the exact UI readback) | **no response**: `curl -m 20` -> `STATUS:000 TIME:20.01` |
| `GET /api/role-model/telemetry/requests?limit=1` (control) | `STATUS:200 TIME:0.028` |

- The control request proves the process is alive and serving other routes; only the operator
  queue/learning readback path hangs. The operator's screenshot numbers (Replay 162, Evaluation 12,
  Learner 18, 48/300 dispatches) could **not** be re-read from the runtime during the box.
- The probes used `GET` with no operator token; a 401 would have returned immediately, so the hang
  is not an auth fast-fail.
- Claim -> evidence (curl status lines above) -> implication for `R2`/`R8`/`R10`: the operator
  readback plane itself is part of the stall; a fix that only changes queue state stays invisible
  while `/operator/learning/activity` cannot answer.

## UI readback mapping

- Route: `role-model-router/apps/runtime-ui/app/routes/learning.tsx:797-798` calls
  `fetchLearningActivity(fetch, token || undefined, { windowMinutes: 60, limit: 24 })`; the payload
  is normalized at `:813` (`normalizeLearningActivity`) and rendered at `:907-910` by
  `LearningLivePanelView`.
- Fetch: `app/lib/learning-api.ts:218-229` -> `GET /api/role-model/operator/learning/activity` with
  `operatorQuery(query)` + `operatorHeaders(token)` inside `withRuntimeStartupRetry`.
- Render: `app/components/learning-live-panel.tsx:126` `LearningLivePanelView` (title at `:184`,
  "Live replay & evaluation"); the four stage rows come from `LearningActivityView.stages`
  (`app/lib/learning-visuals.ts:47+`, `stage: "capture" | "replay" | "evaluation" | "learner"`) with
  per-stage counts and ages; the gauge is `budget.dispatches {used, limit, percent}`
  (`learning-visuals.ts:31`, normalized at `:236-243`); recent events carry
  `kind: "replay" | "evaluation" | "learner"` (`:264`); the `Deferred` copy is mapped by
  `describeReplayDisposition` (`app/lib/replay-disposition-copy.ts`, imported at
  `learning-live-panel.tsx:10`).
- So the panel is fed by the **activity** payload, not by `/operator/queues`; both are currently
  unresponsive (table above). Claim -> evidence (file:line above) -> implication for `R2`/`R8`: the
  observable the operator judges the queues by is this single endpoint.

## Replay deferral path

- `replay endpoint HTTP 409: {"error":"private Track B operation failed with 408"}` - the public
  wrapper formats every non-2xx private response as `private Track B operation failed with
  ${response.status}` at `role-model-router/apps/runtime-host-bridge/src/track-b-operations.ts:1029`;
  the `408` is the **private** operation's own timeout status, a different class from the 5 s
  contribution cap measured in `sidecar-traffic-effect.md` (which produced
  `504 ... timed out after 5000ms`). A literal `408` producer was not located in the private server
  inside the box (see Unverified).
- `durable replay branch append has no host dispatch receipt` - thrown by the public bridge at
  `runtime-host-bridge/src/cli.ts:8322` (guard/comment at `:8294-8321`); classified by
  `track-b-auto-replay.ts:755` (regex `/durable replay branch append has no host dispatch receipt/i`),
  with the family documented at `track-b-auto-replay.ts:358`.
- `durable replay state is queued` - matched as **deferred** by the shared classifier regex
  `shared/capture/replay-disposition.mjs:46` (`/already leased|state is queued|is queued|job is
  queued|awaiting evaluation|concurrency budget is exhausted/i`). No production producer string was
  found in the pinned private tree: it appears only in private tests
  (`tests/track-b/run99-r22-replay-deferral-budget.test.mjs:110,120` - the producer's own receipt
  that caused a capture refusal; `tests/track-b/run98-r02-replay-intent-reclaim.test.mjs:18` quotes
  it from a live incident). Producer still unverified.
- Deferred vs terminal: a row stays non-terminal while its text matches that regex; the private
  server's terminal state list is `complete | cancelled | cancelling | awaiting_evaluation |
  failed | timed_out` (`scripts/track-b/runtime-operations-server.mjs:3539`). Claim -> evidence
  (file:line above) -> implication for `R2`: "Deferred" is the absence of a terminal
  classification, not a decision; the run's `R2` refusal vocabulary is the right locus.

## Evaluation and learner stall

- Operator report: Evaluation 12 / Learner 18, both "last 5h ago". The live plane readback was
  unavailable, so the stall could not be classified (empty queue vs stale lease vs dead worker vs
  blocked dependency) inside the box. PARTIAL.
- Strongest structural candidate found while tracing: the supervised replay owner completes a job
  into `awaiting_evaluation` and hands off **only if** `typeof handoffEvaluation === "function"`
  (`runtime-operations-server.mjs:3763-3764`; terminal list `:3539`). Run 103 already established
  that this private `handoffEvaluation` seam is **inert** (INBOX row `r101_eval_handoff_seam`:
  "the inert private `handoffEvaluation` seam"), which parks completed replays in
  `awaiting_evaluation` and leaves the evaluation plane without work - a "last 5h ago" signature
  for evaluation and learner. Not re-verified in this box.
- Related private evidence (from wave-1 `learner-conformance.md`): stranded jobs are named
  `evaluation_job_stranded_without_finalized_comparison`
  (`extensions/evaluation-core/index.mjs:723`); finalization boundary `:3759` / insert `:3782`.

## Counterfactuals and derived dispatches

- Not investigated inside the box (box expired). `counterfactuals 0/100` and
  `derived dispatches 0 (0%)` are displayed from the same activity payload
  (`LearningActivityView.budget`, `learning-visuals.ts:31`, `:236-243`); the counter producers were
  not located. PARTIAL.

## Worker health signals

- Runtime process alive: `Get-NetTCPConnection -LocalPort 3457 -State Listen` -> PID 39284, and
  telemetry answered in 28 ms at the same moment both operator endpoints hung (>20 s, >90 s).
- Stage logs under `E:\tmp\run103-evidence\` were **not** read inside the box; no
  worker restart/crash/backoff lines are quoted here. PARTIAL.
- The one event class the operator report supplies: repeated `Deferred` events carrying
  `private Track B operation failed with 408` and the two `durable ...` receipts above.

## Unverified

- The literal producer of the private **408** status (not found as a string in
  `scripts/track-b/runtime-operations-server.mjs`).
- The production producer of `durable replay state is queued` (only test/incident references found).
- Whether the hang of `/api/role-model/operator/queues` and
  `/api/role-model/operator/learning/activity` is a blocked SQLite/queue read, an exhausted
  thread pool, or something else - only the symptom was measured (telemetry route stayed fast).
- The four-way classification of the evaluation/learner stall (empty vs stale lease vs dead worker
  vs blocked dependency) - requires reading the stage state root
  (`%LOCALAPPDATA%\role-model-runtime-stage`) and the stage logs, which the box did not reach.
- Producers of the `counterfactuals` / `derived dispatches` counters.
- Whether the operator UI was itself showing an error/stale state at report time (screenshot numbers
  could not be reproduced against the live endpoint).

Receipt token: r104-as-queue-stall-3N7B
