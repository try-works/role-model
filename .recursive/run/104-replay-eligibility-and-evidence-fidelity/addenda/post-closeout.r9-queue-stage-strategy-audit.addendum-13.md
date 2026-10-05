# Post-closeout addendum 13 — queue stage strategy audit (operator architecture directive)

## Directive
Every stage needs explicit retry / fallback / pause / resume-recover / timeout / cancel; only taxonomy-bearing
requests are replayed and taxonomy is carried into packs; each stage is discrete and independent (one stage's
failure must not fail another); a later stage starts independently once the previous stage makes a job available
(pull-based); and every stage is concurrency-safe.

## Stage inventory (the Track-B pipeline on :3457)
1. Capture delivery — `recordLocalRouteCapture` → `deferred-route-captures` (drain → boundary).
2. Replay eligibility + planning — `startAutoReplayLoop` → `runAutoReplayTick`.
3. Replay dispatch — `replay.dispatch` queue (concurrency 1, attempts 5).
4. Branch append — `recordBranchAppend` (inside the replay executor).
5. Evaluation handoff — `offerEvaluationHandoff` / `offerRecordedEvaluationHandoff` → `evaluation.score`.
6. Evaluation scoring — `evaluation.score` queue (concurrency 4, attempts 4).
7. Comparison finalization — `retroFinalizeEvaluations` sweep.
8. Learner — `learner.derive` (concurrency 2, attempts 3) + `learner.promote` (concurrency 1, attempts 3).

## Strategy matrix (what the effect-mq queue planes already carry)
- retry — `attempts` + `backoffBaseMs`/`backoffCapMs` (policy.ts), bounded retry in the Effect program.
- timeout — `attemptTimeoutMs` (`Effect.timeout`, workers.ts:302) + the executor `AbortController`
  (addendum 12) + `AbortSignal.timeout` on the provider fetch.
- cancel — the cancel watch (`watch` polls `queue_control`/job `cancelled`, workers.ts) + `AbortController`.
- pause — `queue_control.draining` (admin.ts) + `global.killSwitch` (policy.ts).
- resume/recover — `lockExpirationMs` lease expiry + the reconcile sweeps (`resumePendingEvaluations`,
  `reconcileEvaluationJobs`, `retroFinalizeEvaluations`, `recoverHandoffs`).
- concurrency — `concurrency` per plane; the store uses `busy_timeout` for cross-process contention.

## Gaps to close (in order)
1. **Fallback** — the `mode` (legacy/shadow/queue) is the only fallback and it is plane-global, not a per-job
   fallback path. Add an explicit per-stage fallback policy (e.g. shadow-verified execution, or a
   fallback-handler on terminal exhaustion) so a stage never silently drops work.
2. **Taxonomy gate** — replay eligibility does not currently require taxonomy metadata; the fresh captures
   (taskTypeId `researcher.web_research.current`, `replayEvidenceClass: null`) are admitted and then fail the
   replay's operational-profile gate. Only captures carrying taxonomy metadata should be admitted to replay.
3. **Taxonomy → packs** — verify the learner pack records carry the taxonomy dimension from the source capture
   (and add it if they do not).
4. **Stage independence** — make the disposition recorder independent of the dispatch/evaluation outcome so a
   replay/evaluation failure cannot strand the disposition queue (`replay.disposition` failed=48 completed=0).
5. **Pull-based handoff** — confirm each stage claims its own work from the shared store (already the effect-mq
   model) rather than being driven by the previous stage; the evaluation handoff already offers a job that the
   evaluation worker claims independently.

## Verification target
A fresh `researcher.web_research.current` capture with taxonomy metadata replays end-to-end and finalizes a
comparison carrying `effortComparability`, with each stage's timeout/cancel/retry exercised without blocking
its neighbours.
