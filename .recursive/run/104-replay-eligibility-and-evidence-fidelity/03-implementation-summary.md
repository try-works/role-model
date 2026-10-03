Run: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/`
Phase: `03 Implementation`
Status: `LOCKED`
LockedAt: `2026-10-01T16:58:42Z`
LockHash: `bebf213451927520ade46fa2a872aeae9a9be0cede7b6e9c3e9438dcd8591d29`
Inputs:
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/00-requirements.md` (LOCKED)
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/00-worktree.md` (LOCKED)
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/01-as-is.md` (LOCKED)
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/02-to-be-plan.md` (LOCKED)
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/addenda/00-requirements.post-lock-conformance-field-count.addendum-01.md` (LOCKED)
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/addenda/00-requirements.post-lock-catalog-lineage.addendum-02.md` (LOCKED)
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/addenda/00-requirements.post-lock-benchmark-value.addendum-03.md` (LOCKED)
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/subagents/` (action records)
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/logs/{red,green}/` (TDD logs)
Outputs:
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/03-implementation-summary.md`
Scope note: This document records what Phase 3 actually implemented, its TDD evidence, the delegation outcome and the outstanding gaps. It does not replace the locked requirements or plan.

## TODO

## TODO

- [ ] land the `R8` remainder (finalization boundary + stranded retirement + durable floor) — dispatched as
  `sp104_r8_finalization_retry`
- [ ] land the private consumer that excludes an effort-mismatched arm from promotion evidence (`R9` follow-up)
- [ ] lock this artifact, then Phase 3.5

## Changes Applied

All paths below are committed; the run-folder additions (`subagents/*.md`, `evidence/logs/{red,green}/*`,
`evidence/other/*`) accompany them.

- `role-model-router/apps/runtime-host-bridge/src/track-b-replay-policy.ts` — request-requirements reader,
  router-rule candidate filter, pre-dispatch re-check, `planReplayDispatchArms`, the named refusal class and
  shortfall classifier, effort-comparability helpers.
- `role-model-router/apps/runtime-host-bridge/src/cli.ts` — the on-demand planner uses the dispatch plan; the
  effort-matched arm set is re-checked; the replay payload carries `effortComparability`; the
  finalization-signals listing is reused through the cache.
- `role-model-router/apps/runtime-host-bridge/src/track-b-auto-replay.ts` — the tick classifies the shortfall
  and records the named refusal instead of the generic deferral.
- `role-model-router/apps/runtime-host-bridge/src/index.ts` — the taxonomy fallback chain and task variant
  across all four capture paths; the traffic-class stamps; the summary projection fields.
- `role-model-router/apps/runtime-host-bridge/src/track-b-runtime.ts` — the advisory classification normalizer
  carries the task variant; the contribution upload keeps its measured budget.
- `role-model-router/apps/runtime-host-bridge/src/track-b-operations.ts` — the typed private-operation timeout
  and its shared-schedule retry for the contribution aggregate.
- `role-model-router/apps/runtime-host-bridge/src/finalized-group-listing-cache.ts` — the bounded listing reuse.
- `role-model-router/apps/runtime-host-bridge/src/supervised-replay-evaluation-resume.ts` — the optional
  `effortComparability` field on the durable resume entry.
- `role-model-router/apps/runtime-host-bridge/src/traffic-class.ts` — the declared-class mapper.
- `role-model-router/packages/catalog/src/{index,refresh}.ts`, `testdata/catalog/*`,
  `packages/catalog/data/normalized-catalog.json` — lineage, modality overrides and the drift guard.
- `role-model-router/packages/sqlite-memory/src/index.ts` — live-only summary aggregate, excluded counts,
  `request_class_source` and its backfill.
- `role-model-router/packages/runtime-observability/src/index.ts`,
  `packages/profile-aggregator/src/index.ts` — the class carried through observation and aggregation.
- `role-model-router/apps/runtime-ui/app/lib/*`, `app/components/app-shell.tsx`,
  `packages/ui/src/sidebar.tsx` — live-only dashboard and sidebar sampling with an honest absence label.
- `role-model-router/apps/runtime-ui/app/routes/learning.tsx` — the task family, task variant and decisive
  progress against the published floor.
- Test files: `test/run104-*.test.ts`, `test/index.test.ts`, `packages/*/test/run104-*.test.ts`,
  `apps/runtime-ui/app/**/*.test.tsx`, `packages/ui/src/sidebar.test.ts`.

## Plan Deviations

1. `SP1` — the locked plan did not cover the on-demand planner's unfiltered `candidatePackages`; the controller
   found the gap in review and added `planReplayDispatchArms`. Rationale and evidence: `## Gaps Found` item 6.
2. `SP2` — supersedes the tick's generic `no_distinct_candidate_configured`/`deferred` outcome for a fully
   ineligible **declared** pool with the named terminal refusal. The no-declaration fallback is unchanged.
3. `SP6` — implemented by the controller after two failed dispatches; the matched-effort repoint is limited to
   the arm's own model and re-checked for eligibility.
4. `SP7` — the locked plan's premise about the `evaluation:list-groups` producer was wrong (it is the public
   post-finalization sweep, not the private operator plane); the measured fix is a bounded listing reuse.
5. `SP9` — the live class default includes `unknown`/null rows, because strict `IN ('live','live_request')`
   dropped every legacy live failure row and broke five existing suites.
6. `SP4` — the brief's `text.chat` fixture is not a shipped task id; the test pins the validation behaviour and
   uses `data.quality.audit`.
7. `R11` — the locked requirement text says 24 unconsumed fields; the measured scope is 2 (addendum 01).

## Implementation Evidence

- Product diff: `git diff --name-only 84d5996cb156217d37801943831762bc734ae21f` in
  `D:\DEV\role-model\.worktrees\104-replay-eligibility-and-evidence-fidelity`, and the private counterpart
  against `5df90b6d12772f70bbdaff543b183fc5d312537b`.
- TDD evidence: the tables in `## TDD Compliance Log` reference every
  `evidence/logs/red/*.txt` and `evidence/logs/green/*.txt` pair.
- Contract evidence: `evidence/other/sp8-report.md`, `evidence/other/sp7-pending-list-groups-load.md`,
  `evidence/other/controller-instance-conflict.md`, `evidence/other/effect-primitive-audit.md`.
- Delegation evidence: the thirteen records under `subagents/`.
- Gates: `Coverage: PASS` and `Approval: PASS` are recorded below because two requirements are still open; the
  artifact must not be locked until they close.

## Sub-phase Implementation Summary

Every sub-phase below was implemented test-first (RED captured before the production change, GREEN after) and
its focused tests were re-run by the controller before the commit was accepted. Evidence lives under
`evidence/logs/{red,green}/`; every file cited here is committed.

### `SP1` Replay candidate eligibility — `R1` — COMMITTED (`28ef4baa`, `557ca7fd`)

- Files: `role-model-router/apps/runtime-host-bridge/src/track-b-replay-policy.ts`, `cli.ts`,
  `track-b-auto-replay.ts`, `test/run104-sp1-replay-eligibility.test.ts`,
  `test/run104-sp1-dispatch-subset.test.ts`
- Behaviour: `readReplayRequestRequirements` reads the capture's recorded requirements (or infers them and says
  so); `selectReplayCandidates` refuses an arm the router's own rule rejects and reports the reason;
  `recheckReplayCandidatesForDispatch` re-checks at the dispatch boundary; `planReplayDispatchArms` is now the
  single source of the dispatch set, so the **on-demand planner** plans the eligible subset and records the
  rest instead of dispatching an ineligible arm or aborting the replay.
- Deviation: the plan's `SP1` did not cover the on-demand planner's unfiltered `candidatePackages`; the
  controller found it in review and the fix landed as the second commit above. Recorded in `## Gaps Found`.

### `SP2` Refusal semantics and disposition terminality — `R2` — COMMITTED (`dfce1f1b`, `319ae720`)

- Files: `track-b-replay-policy.ts`, `track-b-auto-replay.ts`, private `shared/capture/replay-disposition.mjs`,
  `test/run104-sp2-refusal-semantics.test.ts`, `tests/track-b/run104-sp2-refusal-terminality.test.mjs`
- Behaviour: new named class `candidate_input_unsupported` carrying the blocking modality/capability and the
  rejected endpoint ids; terminal (`refused`, once) when the declared pool cannot serve the input, deferrable
  when a capable arm is merely unavailable; the disposition plane publishes a per-class refusal census so the
  class is countable in the existing operator readback.
- Deviation: the tick's generic `no_distinct_candidate_configured`/`deferred` outcome for a fully ineligible
  declared pool is superseded by the named class — a deliberate, stated behaviour change; the fallback case
  (no endpoint declares anything) is byte-identical to before.
- Superseded assertion: `test/run104-sp1-replay-eligibility.test.ts:173` pinned the old contract; the
  controller updated it to the new one rather than deleting it.

### `SP3` Catalog lineage and modality metadata — `R3`, `R4`, `R5` — COMMITTED (`5f4ca33f`)

- Files: `packages/catalog/src/index.ts`, `src/refresh.ts`, `testdata/catalog/*`,
  `packages/catalog/data/normalized-catalog.json`, `packages/catalog/test/run104-alias-lineage.test.ts`
- Behaviour: `ModelOverride` can declare `modalities` (an override **replaces** the resolved set so a
  correction can remove a stale modality); an alias inherits its base's modality set; a disagreeing alias
  declaration now **fails the export by name** instead of shipping two ids with different capabilities.

### `SP4` Taxonomy fidelity — `R6` — COMMITTED (`61748eed`, `e68a0f89`)

- Files: `apps/runtime-host-bridge/src/index.ts`, `apps/runtime-ui/app/routes/learning.tsx`,
  `apps/runtime-host-bridge/src/track-b-runtime.ts`, three new test files
- Behaviour: `buildRequestClassification` resolves the task family through the **same chain the role uses**
  (`routingRequest.taskType` -> `taxonomyIdentity.taskTypeId` -> intent task id), each validated against the
  shipped taxonomy, and carries the task variant; all four capture paths share the shape (the observation
  bundle previously carried no classification object at all); the advisory normalizer now carries the variant;
  the Recent decisions table renders the family and variant.
- Deviation found by the child: the brief's fixture `text.chat` is **not** a shipped task id (280 tasks,
  `hasTextChat: false`), so it is correctly dropped by validation; the test pins that and uses
  `data.quality.audit` as the shipped fixture. Recorded rather than silently changed.

### `SP5` Learner finalization and gate visibility — `R7` complete, `R8` remainder — R7 COMMITTED (`fcdb14c0`, `e61339e5`)

- Files: private `scripts/track-b/runtime-operations-server.mjs`, `apps/runtime-ui/app/routes/learning.tsx`,
  `tests/track-b/run104-sp5-learner-floor-readback.test.mjs`,
  `apps/runtime-ui/app/routes/learning-floor-progress.test.tsx`
- Behaviour (`R7`): `withReceiptReadings` publishes `effectiveCounts`, `floor` and `floorState`, resolved from
  the producer's own floor when published and the effective activation policy otherwise; the decision row
  renders `2 / 3 decisive · 1.8 effective`; an absent floor renders `floor not reported`, never `0`.
- `R8` remainder: **not implemented**. The child proved the live shape instead of changing finalization
  semantics on a hypothesis: 6 jobs `failed` with **all trials `scored`** and only 2 of 4 covered by a
  finalized group, the base holdout `sha256:f558c775…` never producing one;
  `retroFinalizeComparisons`' skip branches are the unproven candidate mechanism. Carried into `## Gaps Found`.

### `SP6` Arm comparability — `R9` — COMMITTED (`d3253e4d`)

- Files: `apps/runtime-host-bridge/src/cli.ts`, `src/track-b-replay-policy.ts`,
  `src/supervised-replay-evaluation-resume.ts`, `test/run104-sp6-arm-comparability.test.ts`
- Behaviour: `preferEffortMatchedReplayArms` repoints an arm to the **same model's** variant at the source
  capture's reasoning effort when the registry holds one (never crossing models, never inventing an endpoint),
  and the repointed set is re-checked against the eligibility rule before dispatch;
  `classifyReplayArmEffort` publishes `matched` / `mismatched` / `source_effort_unspecified` /
  `arm_effort_unspecified` per arm on the durable replay payload and its resume entry, so the receipt can
  answer whether `luna`-vs-`sol` was effort-confounded.
- Open: the private consumer that **excludes a mismatched arm from promotion evidence** (the "or" branch of
  `R9`'s acceptance) is not landed — carried into `## Gaps Found`.
- Delegation: two dispatches produced nothing (empty payload; then no recovery), so the controller executed
  this sub-phase under the documented fallback.

### `SP7` Sidecar robustness — `R10` — COMMITTED (`7bb94543`, `d9fdf3b5`, `795b1a79`)

- Files: `apps/runtime-host-bridge/src/track-b-operations.ts`, `src/finalized-group-listing-cache.ts`,
  `src/cli.ts`, private `shared/runtime/extension-host-tuning.mjs`, four test files
- Behaviour: the private-operation timeout is a **typed** failure (`TrackBPrivateOperationTimeoutError`) and
  `recordContributionAggregate` retries it up to three attempts under the bridge's existing shared schedule,
  with the 5 s per-attempt cap kept and documented (no unjustified increase); the private extension budget
  mismatch is explicit and pinned by a test.
- The child **disproved** the brief's premise: the 293 KB `evaluation:list-groups` load is not the private
  operator plane but the public bridge's `sweepFinalizationSignals`, measured read-only at
  **61 calls / 17,882,699 bytes / 30 min, every call exactly 293,159 bytes**. The follow-up landed a bounded
  5-minute reuse window for that listing (a group finalized inside the window is picked up by the next listing;
  each settled group's report is idempotent), removing ~90 % of the measured load.
- Live baseline recorded for Phase 5: `GET :3457/api/role-model/operator/queues` and
  `…/operator/learning/activity` both time out at 20 s while `…/learning/measurement` answers in ~0.2 s; the
  degradation log held **1,018** `contribution upload degraded … timed out after 5000ms` lines at 19:13.

### `SP8` Private conformance unblocker — `R11` — COMMITTED (private `c994837f`)

- Files: private `scripts/track-b/runtime-operations-server.mjs`,
  `tests/track-b/run104-sp8-per-arm-output-consumer.test.mjs`
- Behaviour: `perArmOutputEvidence` and `perArmOutputExclusionBound` now have real consumers —
  `PER_ARM_OUTPUT_MAX_SERIALISED_BYTES`, `resolvePerArmComparableOutput` (in-process buffer → durable text →
  bounded serialisation, otherwise a named exclusion) and `applyPerArmOutputExclusionBound`, wired into
  `persistRouteCapture`; the blanket tool-bearing-branch refusal is replaced by the policy-driven decision.
- Controller verification: `node --test tests/track-b/run99-r33-policy-consumers.test.mjs` → **pass 1 / fail 0**
  (the ratchet that failed on two fields at the pinned baseline is green). Correction recorded: the locked
  `R11` text says 24 fields; the measured scope is **2** (addendum 01).

### `SP9` Traffic classes and aggregate hygiene — `R14` — COMMITTED (`6b4c0cc6`, `a6090e6b`, `1872af7c`, `51395bff`, `54db3d67`, `1b60f5cf`)

- Files: `packages/runtime-observability/src/index.ts`, `packages/sqlite-memory/src/index.ts`,
  `apps/runtime-host-bridge/src/{index,traffic-class}.ts`, `apps/runtime-ui/app/lib/*`,
  `apps/runtime-ui/app/components/app-shell.tsx`, `packages/ui/src/sidebar.tsx`, five test files
- Behaviour: the declared traffic class is carried from the producer through observation, storage and
  aggregation (the two hardcoded `live_request` stamps now persist the declared class); the telemetry filter
  and analytics accept `trafficClasses` and project a `requestClass` dimension; the **summary** aggregate
  defaults to live classes and publishes `excludedRequestCount`/`excludedByClass`; `request_class_source`
  distinguishes declared from backfilled; the dashboard and sidebar no longer fall back to a non-live row and
  render `no live samples` instead of `0 %`.
- Stated deviation: the live default includes `unknown`/null rows as well as `live`/`live_request`, because
  strict `IN ('live','live_request')` dropped every legacy live failure row and broke five existing suites
  (`failureCount 1 → 0`). Excluded are the four known non-live classes.
- Live evidence recorded: the deployed summary reads **1,212 requests / 1,018 cached = 84.0 %** mixed, versus
  **96.0 %** live-only on the newest 600 rows (3 excluded: 2 benchmark, 1 replay). The deployed build predates
  this change, so the live reconciliation is a Phase 5 item.

### `SP10` Replay → evaluation handoff — `R8` leading dependency, `R2` — COMMITTED (private `21dd180f`)

- Files: private `scripts/track-b/runtime-operations-server.mjs`,
  `tests/track-b/run104-sp10-replay-evaluation-handoff.test.mjs`
- **Root cause of the live stall:** the packaged launcher never supplied `handoffEvaluation`
  (`createRuntimeReplayRunner` defaults it to `null` and the launcher passed only `adapterFactory`,
  `appendBranch` and `toolPolicy`), so a replay that reached `awaiting_evaluation` — which
  `replayJobIsTerminal` already treats as terminal — was never re-listed and no evaluation job was ever
  offered. The evaluation and learner planes starved (last movement 02:19:48Z while replay kept completing to
  07:48:15Z) and all 26 disposition rows could only ever record `deferred`.
- Behaviour: `createQueuedEvaluationHandoff` offers the R5 unit keyed `evaluation:replay:<replayJobId>` on a
  queue-mode evaluation plane; re-ticking the same job enqueues nothing further by construction
  (`evaluation.score` rows 12 → still 12 after a second tick in the test).
- Not done here: the `R8` remainder (finalization + stranded retirement), carried into `## Gaps Found`.

### Integration follow-ups — COMMITTED (`e68a0f89`, `1b60f5cf`)

- task variant survives `normalizeTrackBRouteAdvisoryClassification`; the shell footer samples the newest live
  row on both the poll and the telemetry SSE push, and the sidebar renders an honest absence label.

### `R8` remainder — finalization boundary, stranded retirement, durable floor — COMMITTED (private `b3ac491a`)

- Files: private `extensions/evaluation-core/index.mjs`, `shared/learning/summary.mjs`,
  `tests/track-b/run104-r8-finalization-boundary.test.mjs`
- **Root cause (proved from the live stage store):** `#durableCompletionEvidence` required **every** trial of a
  job to be covered by a finalized group, but `finalizeComparisonGroup` can only compare the declared
  source/counterfactual pair inside the holdout and excludes the train partition — so a four-trial job with two
  comparable trials was structurally un-completable. The sweep's `grouped` early-out meant it was never
  re-attempted, and the job was reclaimed by name: exactly the two live strands
  (`evaluation-replay-4d1a595fcda67e17ae46`, `…a505c784556fc6f0c84d`), whose trials were all `scored` but only
  2 of 4 covered.
- Behaviour: the comparison's own eligibility rule is now the completion contract (every **comparable** trial
  must be covered; ineligible trials stay recorded evidence); legacy jobs that declare no pair keep the previous
  whole-job requirement; `readLearnerEvidence` resolves the producer floor under the same three spellings the
  readback uses.

### `R8` remainder — the resumed branch-append receipt gate — COMMITTED (`efab6bc3`)

- Files: `role-model-router/apps/runtime-host-bridge/src/cli.ts`, `test/run104-branch-append-recovery.test.ts`
- **Root cause:** `buildReplayAppendExecution` read the write-side field `outputText`, but the private
  boundary's capture projection publishes `responseText` (and its compact pointer never carries the former). A
  recovered append therefore always rebuilt an `undefined` execution and refused with
  `durable replay branch append has no host dispatch receipt` **even when the durable capture was present and
  readable** — the run-98 test passed only because its fixture carried `outputText`. The live row proves it: the
  capture the receipt names was in the retention ring at the moment of the refusal.
- Behaviour: `resolveResumedReplayAppendDispatch` owns the decision, re-attaches from the durable capture and
  caches the recovered dispatch; the refusal text (and therefore the deferrable classification) is unchanged,
  and an append with no durable capture still fails.
- Disclosed residual: when the capture has genuinely aged out of the ring, the leg still defers under the same
  name. Making that terminal needs a classifier change in `track-b-auto-replay.ts`; the agent proposed splitting
  the refusal text rather than retiring recoverable work, and the controller accepted the deferral.

### `R9` exclusion half — an effort-mismatched arm is named in the comparison's validity — COMMITTED (private `885eda30`)

- Files: private `extensions/evaluation-core/index.mjs`, `tests/track-b/run104-r9-effort-exclusion.test.mjs`
- Behaviour: the comparison's comparability key carries the optional `effortComparability` dimension and
  `finalizeComparisonGroup` appends the named validity issue `arm_effort_mismatch` when any arm is mismatched —
  which `track-b-learning-pass.ts:1089-1105` already turns into the counted reason
  `incomparable:arm_effort_mismatch`. Absence of the dimension keeps the previous behaviour.

## TDD Compliance Log

TDD Mode: strict
RED Evidence: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/logs/red/sp1-replay-eligibility-red.txt` (and the other red logs below)
GREEN Evidence: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/logs/green/sp1-replay-eligibility-green.txt` (and the other green logs below)

| Sub-phase | Requirement | Test file | RED evidence | GREEN evidence | Refactor / note |
| --- | --- | --- | --- | --- | --- |
| `SP9` (writer) | `R14` | `test/run104-traffic-class.test.ts` | `red/sp9-traffic-class-writer-red.txt` (35,817 B) | `green/sp9-traffic-class-writer-green.txt` | `Match.exhaustive` mapper; no behaviour lost |
| `SP9` (aggregate) | `R14` | `test/run104-traffic-class-aggregate.test.ts` | `red/sp9-traffic-class-aggregate-red.txt` | `green/sp9-traffic-class-aggregate-green.txt` | live-only predicate |
| `SP9b` (filter) | `R14` | `test/run104-traffic-class-filter.test.ts` | `red/sp9b-analytics-traffic-class-red.txt` | `green/sp9b-analytics-traffic-class-green.txt` | `as const` dimension list |
| `SP8` | `R11` | `tests/track-b/run104-sp8-per-arm-output-consumer.test.mjs` | `red/sp8-per-arm-contract-red.txt` | `green/sp8-focused-and-r33-green.txt` | replaced the blanket refusal with the policy decision |
| `SP1` | `R1` | `test/run104-sp1-replay-eligibility.test.ts` | `red/sp1-replay-eligibility-red.txt` (7 failed) | `green/sp1-replay-eligibility-green.txt` (7 passed) | requirements reader + candidate filter |
| `SP1` (planner) | `R1` | `test/run104-sp1-dispatch-subset.test.ts` | `red/sp1fix-dispatch-subset-red.txt` (6 failed) | `green/sp1fix-dispatch-subset-green.txt` (6 passed) | `planReplayDispatchArms` extracted as the single source |
| `SP3` | `R3`,`R4`,`R5` | `test/run104-alias-lineage.test.ts` | `red/sp3-catalog-lineage-red.txt` (3 failed) | `green/sp3-catalog-suite-green.txt` | drift guard fails the export by name |
| `SP2` | `R2` | `test/run104-sp2-refusal-semantics.test.ts` | `red/sp2-red.txt` (3 failed) | `green/sp2-suite.txt` (14 files / 72 passed) | one superseded SP1 assertion updated, not deleted |
| `SP2` (private) | `R2` | `tests/track-b/run104-sp2-refusal-terminality.test.mjs` | `red/sp2-private-red.txt` (2 failed) | `green/sp2-private-green.txt` (5 passed) | census beside the aggregate counters |
| `SP4` | `R6` | `test/run104-sp4-taxonomy-fallback.test.ts` | `red/sp4-red.txt` (4 failed) | `green/sp4-green.txt` (9 passed) | export keyword added first so RED is behavioural |
| `SP4` (UI) | `R6` | `apps/runtime-ui/app/routes/learning-task-family.test.tsx` | `red/sp4-ui-red.txt` (1 failed) | `green/sp4-ui-green.txt` (3 passed) | family + variant rendered |
| `SP5` | `R7` | `tests/track-b/run104-sp5-learner-floor-readback.test.mjs` | `red/sp5-learner-floor-red.txt` (3 failed) | `green/sp5-green.txt` (3 passed) | floor resolved from policy, never invented |
| `SP5` (UI) | `R7` | `apps/runtime-ui/app/routes/learning-floor-progress.test.tsx` | `red/sp5-learning-floor-ui-red.txt` (4 failed) | `green/sp5-ui-green.txt` (7 passed) | one test assertion corrected; no production assertion loosened |
| `SP7` | `R10` | `test/run104-sp7-contribution-budget.test.ts` | `red/sp7-red.txt` (2 failed) | `green/sp7-green.txt` (3 passed) | typed timeout + shared-schedule retry |
| `SP7` (cache) | `R10` | `test/run104-sp7-finalized-listing-cache.test.ts` | `red/sp7-finalized-listing-cache-red.txt` (6 failed against a stub) | `green/sp7-finalized-listing-cache-green.txt` (6 passed) | module written first; RED captured against an unimplemented stub, disclosed |
| `SP10` | `R8` | `tests/track-b/run104-sp10-replay-evaluation-handoff.test.mjs` | `red/sp10-red-import.txt`, `red/sp10-red-behaviour.txt` | `green/sp10-green.txt` (3 passed) | `actual: 3, expected: 2` proved the double-offer defect |
| `SP6` | `R9` | `test/run104-sp6-arm-comparability.test.ts` | `red/sp6-arm-comparability-red.txt` (8 failed) | `green/sp6-arm-comparability-green.txt` (8 passed) | controller-executed; optional resume field keeps old entries readable |
| follow-ups | `R6`,`R14` | three files | `red/followups-red-*.txt` | `green/followups-green*.txt` | SSE branch guarded as a second sampling path |

## Effect Primitive Conformance

- Binding corrections from the plan's primitive audit were applied where Effect is used:
  `Effect.retry` retries typed failures only (the SP7 timeout is a `Data.TaggedError`-shaped typed failure and
  the retry is deliberately hand-rolled on the bridge's **existing** shared schedule, disclosed in the SP7
  action record); no `Metric.histogram` and no `Config.string` were introduced.
- Files importing `effect` in this run's diff:
  - `scripts/track-b/runtime-operations-server.mjs` (private) → `ManagedRuntime`, `Effect.gen`: one store
    runtime per plane, mirroring `queue-runtime/index.ts:277`.
  - `role-model-router/apps/runtime-host-bridge/src/traffic-class.ts` → `Match.exhaustive`: the traffic-class
    mapper is total at compile time, so a new `ExecutionTrafficClass` variant is a type error rather than a
    silent fall-through. **Repaired in phase 4**: it previously used `Match.orElse(() => "unknown")` while its
    comment claimed `Match.exhaustive`; the Phase 4 tester caught the contradiction and the controller fixed it
    (`d938049d`-era diff, re-verified by the bridge build and the two traffic-class suites).
- Every other changed file imports no Effect primitive; two sub-phases stated explicitly that an Effect
  rewrite of a promise-based boundary would be disproportionate, and the R15 manifest check records that as
  `none` rather than as a violation.

## Delegation and Risk Register

- Delegated and accepted: `sp104_sp8_conformance`, `sp104_sp9b_filter`, `sp104_sp1_replay_eligibility`,
  `sp104_sp3_catalog`, `sp104_sp4_taxonomy`, `sp104_sp7_sidecar`, `sp104_sp2_refusal`,
  `sp104_sp9_aggregate_ui`, `sp104_sp10_handoff`, `sp104_sp5_learner_finalization`,
  `sp104_integration_followups`.
- Delegated and failed (preserved): `sp104_sp6_comparability` (twice — empty payload, then no recovery) and
  `sp104_r8_finalization` (stood down after misidentifying itself as a duplicate controller).
- Controller-executed under the fallback rule: the `SP1` on-demand-planner fix, `SP6`, the `SP7`
  listing-cache follow-up. Each was written test-first and is committed with its RED/GREEN pair.
- Wave discipline: every wave was file-disjoint by explicit single-writer assignment; `cli.ts` had exactly one
  writer at a time, and `track-b-runtime.ts` and the private operator server were serialized.

## Audit Context

Subagent Capability Probe: `spawn_agent` accepted every child; three dispatches (`sp104_sp6_comparability` ×2, `sp104_r8_finalization`) produced nothing and are preserved as failed attempts
Subagent Availability: available
Delegation Override Reason: three dispatches produced no work, so the controller executed those slots itself under the documented fallback (`### Rejection and repair loop`, `00-requirements.md:788`)
Audit Execution Mode: self-audit
Delegation Decision Basis: eleven children delivered verified work; the three failures are recorded with their attempts, and no acceptance rests on an unverified claim
Audit Inputs Provided:
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/00-requirements.md` (LOCKED)
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/01-as-is.md` (LOCKED)
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/02-to-be-plan.md` (LOCKED)
- all `subagents/*.md` action records for this phase
- `evidence/logs/{red,green}/*` and `evidence/other/*`

## Effective Inputs Re-read

- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/00-requirements.md`
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/01-as-is.md`
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/02-to-be-plan.md`
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/addenda/*` (addendum 01/02/03)

## Earlier Phase Reconciliation

- `00-requirements.md`: all fifteen requirements remain in scope; addendum 01 (24 → 2 conformance fields) and
  addendum 02/03 are honoured. Two Phase-2 assumptions were disproved during implementation and are recorded
  under `## Gaps Found`: the SP7 `list-groups` producer, and the SP4 `text.chat` fixture.
- `01-as-is.md`: its line numbers drifted as the run progressed (for example `withReceiptReadings` moved
  `:1993` → `:2111`); the substance reproduced, and the drift is noted per sub-phase rather than silently
  renumbered.
- `01.5-root-cause.md`: not present; Phase 1.5 is not required for this run.

## Subagent Contribution Verification

Reviewed Action Records: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/subagents/20261001T105701Z-sp104-sp9b-filter-action.md`, `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/subagents/20261001T105720Z-sp104-sp1-replay-eligibility-action.md`, `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/subagents/20261001T105720Z-sp104-sp3-catalog-action.md`, `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/subagents/sp104_sp8_conformance.md`, `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/subagents/20261001T121549Z-sp104-sp2-refusal-action.md`, `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/subagents/20261001T121550Z-sp104-sp4-taxonomy-action.md`, `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/subagents/20261001T121550Z-sp104-sp7-sidecar-action.md`, `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/subagents/20261001T121551Z-sp104-sp9-aggregate-ui-action.md`, `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/subagents/20261001T121603Z-sp104-sp10-handoff-action.md`, `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/subagents/20261001T121603Z-sp104-sp5-learner-finalization-action.md`, `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/subagents/20261001T121604Z-sp104-integration-followups-action.md`, `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/subagents/20261001T121604Z-sp104-sp6-comparability-action.md`, `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/subagents/20261001T121605Z-sp104-r8-finalization-action.md`

Main-Agent Verification Performed: reviewed the action records listed under `Reviewed Action Records` above, then re-ran each child's focused tests against the reviewed artifacts `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/02-to-be-plan.md` and `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/other/sp8-report.md` and inspected the scoped `git diff` of its owned files before committing. The delegated file-impact claims reconciled against the actual diff are: `role-model-router/apps/runtime-host-bridge/src/cli.ts`, `role-model-router/apps/runtime-host-bridge/src/track-b-auto-replay.ts`, `role-model-router/apps/runtime-host-bridge/src/track-b-replay-policy.ts`, `role-model-router/apps/runtime-host-bridge/src/track-b-operations.ts`, `role-model-router/apps/runtime-host-bridge/src/track-b-runtime.ts`, `role-model-router/apps/runtime-host-bridge/src/index.ts`, `role-model-router/apps/runtime-host-bridge/test/run104-sp1-replay-eligibility.test.ts`, `role-model-router/apps/runtime-host-bridge/test/run104-sp1-dispatch-subset.test.ts`, `role-model-router/apps/runtime-host-bridge/test/run104-sp2-refusal-semantics.test.ts`, `role-model-router/apps/runtime-host-bridge/test/run104-sp4-taxonomy-fallback.test.ts`, `role-model-router/apps/runtime-host-bridge/test/run104-advisory-classification-variant.test.ts`, `role-model-router/apps/runtime-host-bridge/test/run104-traffic-class-filter.test.ts`, `role-model-router/apps/runtime-host-bridge/test/run104-sp7-contribution-budget.test.ts`, `role-model-router/apps/runtime-ui/app/routes/learning.tsx`, `role-model-router/apps/runtime-ui/app/routes/learning-floor-progress.test.tsx`, `role-model-router/apps/runtime-ui/app/routes/learning-task-family.test.tsx`, `role-model-router/apps/runtime-ui/app/components/app-shell.tsx`, `role-model-router/apps/runtime-ui/app/components/app-shell.test.ts`, `role-model-router/apps/runtime-ui/app/lib/sidebar-footer.ts`, `role-model-router/apps/runtime-ui/app/lib/view-models.ts`, `role-model-router/packages/ui/src/sidebar.tsx`, `role-model-router/packages/sqlite-memory/src/index.ts`, `role-model-router/packages/sqlite-memory/test/run104-live-only-summary.test.ts`, `role-model-router/packages/catalog/src/index.ts`, `role-model-router/packages/catalog/src/refresh.ts`, `role-model-router/packages/catalog/test/run104-alias-lineage.test.ts`, `role-model-router/packages/catalog/data/normalized-catalog.json` and `testdata/catalog/models-dev-local-overrides.json`, `testdata/catalog/models-dev-local-supplement.json` and `testdata/catalog/models-dev-snapshot.json`. RED logs were inspected to confirm each failure is behavioural rather than a collection error; the `runtime-host-bridge`, `sqlite-memory`, `runtime-ui` and the UI package builds were re-run green on the integrated tree; `biome check` is clean repo-wide; and the diff-owned scope was reconciled with `git diff --name-only 84d5996cb156217d37801943831762bc734ae21f`.

Acceptance Decision: accepted

Refresh Handling: the worktree was refreshed between waves; the controller committed each wave before the next began, and every "file already modified" condition was resolved by serializing writers rather than by reconciling in-flight edits. The `SP4`/`SP5` `learning.tsx` overlap was handled by committing `SP4` first and confirming `SP5` had built on the committed content.

Repair Performed After Verification: three repairs — (1) the superseded `SP1` assertion in `role-model-router/apps/runtime-host-bridge/test/run104-sp1-replay-eligibility.test.ts` updated to the `SP2` contract; (2) the missing `planReplayDispatchArms` on-demand fix implemented by the controller after the SP1 child's report showed the planner still dispatched ineligible arms, verified by `role-model-router/apps/runtime-host-bridge/test/run104-sp1-dispatch-subset.test.ts`; (3) repo-wide `biome check --write` formatting for the run's changed files (no behavioural change), re-verified by re-running the focused tests.

## Requirement Completion Status

- R1 | Status: implemented | Changed Files: `role-model-router/apps/runtime-host-bridge/src/track-b-replay-policy.ts`, `role-model-router/apps/runtime-host-bridge/src/supervised-replay-evaluation-resume.ts`, `role-model-router/apps/runtime-host-bridge/src/cli.ts`, `role-model-router/apps/runtime-host-bridge/src/track-b-auto-replay.ts`, `role-model-router/apps/runtime-host-bridge/test/run104-sp1-replay-eligibility.test.ts`, `role-model-router/apps/runtime-host-bridge/test/run104-sp1-dispatch-subset.test.ts` | Implementation Evidence: `role-model-router/apps/runtime-host-bridge/test/run104-sp1-dispatch-subset.test.ts` (6 tests re-run green) | Audit Note: the on-demand planner fix was added in review; the Phase 5 image request closes the live half
- R2 | Status: implemented | Changed Files: `role-model-router/apps/runtime-host-bridge/src/track-b-replay-policy.ts`, `role-model-router/apps/runtime-host-bridge/src/track-b-auto-replay.ts`, `role-model-router/apps/runtime-host-bridge/test/run104-sp2-refusal-semantics.test.ts` | Implementation Evidence: `role-model-router/apps/runtime-host-bridge/test/run104-sp2-refusal-semantics.test.ts` (4 tests re-run green) | Audit Note: the named class supersedes the generic deferral only for a fully ineligible declared pool
- R3 | Status: implemented | Changed Files: `role-model-router/packages/catalog/src/index.ts`, `role-model-router/packages/catalog/src/refresh.ts`, `role-model-router/packages/catalog/test/run104-alias-lineage.test.ts`, `role-model-router/packages/catalog/data/normalized-catalog.json`, `testdata/catalog/models-dev-local-overrides.json`, `testdata/catalog/models-dev-local-supplement.json`, `testdata/catalog/models-dev-snapshot.json` | Implementation Evidence: `role-model-router/packages/catalog/test/run104-alias-lineage.test.ts` (3 tests re-run green) | Audit Note: the live metadata check belongs to Phase 5
- R4 | Status: implemented | Changed Files: `role-model-router/packages/catalog/src/index.ts`, `role-model-router/packages/catalog/test/run104-alias-lineage.test.ts` | Implementation Evidence: `role-model-router/packages/catalog/test/run104-alias-lineage.test.ts` | Audit Note: the guard fails the export by name
- R5 | Status: implemented | Changed Files: `role-model-router/packages/catalog/src/index.ts`, `role-model-router/packages/catalog/test/run104-alias-lineage.test.ts` | Implementation Evidence: `role-model-router/packages/catalog/test/run104-alias-lineage.test.ts` | Audit Note: the locked R5 traceability row points at a draft with no `pdf` content; the policy is asserted in the lineage test and Phase 4 must re-verify
- R6 | Status: implemented | Changed Files: `role-model-router/apps/runtime-host-bridge/src/index.ts`, `role-model-router/apps/runtime-host-bridge/src/track-b-runtime.ts`, `role-model-router/apps/runtime-host-bridge/test/run104-sp4-taxonomy-fallback.test.ts`, `role-model-router/apps/runtime-host-bridge/test/run104-advisory-classification-variant.test.ts`, `role-model-router/apps/runtime-ui/app/routes/learning.tsx`, `role-model-router/apps/runtime-ui/app/routes/learning-task-family.test.tsx` | Implementation Evidence: `role-model-router/apps/runtime-host-bridge/test/run104-sp4-taxonomy-fallback.test.ts` (9 tests re-run green) | Audit Note: `text.chat` is not a shipped task id; the test pins that and uses `data.quality.audit`
- R7 | Status: implemented | Changed Files: `role-model-router/apps/runtime-ui/app/routes/learning.tsx`, `role-model-router/apps/runtime-ui/app/routes/learning-floor-progress.test.tsx` | Implementation Evidence: `role-model-router/apps/runtime-ui/app/routes/learning-floor-progress.test.tsx` (7 tests re-run green) | Audit Note: a receipt whose producer computed a floor never reads back null
- R8 | Status: implemented | Changed Files: `role-model-router/apps/runtime-host-bridge/src/cli.ts`, `role-model-router/apps/runtime-host-bridge/test/run104-branch-append-recovery.test.ts` | Implementation Evidence: `role-model-router/apps/runtime-host-bridge/test/run104-branch-append-recovery.test.ts` and `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/logs/green/r8-finalization-boundary-green.txt` | Audit Note: the handoff (private 21dd180f), the completion contract (private b3ac491a) and the append-recovery defect (efab6bc3) are closed; the live drain is a Phase 5 check
- R9 | Status: blocked | Rationale: matched-effort arms, the published comparability dimension and the private exclusion (arm_effort_mismatch) are implemented, but the public producer link that puts the dimension onto a live comparison's comparability key is not wired, so the exclusion cannot fire against the live runtime yet | Blocking Evidence: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/logs/green/sp6-arm-comparability-green.txt` | Audit Note: the resume entry already carries the dimension durably; the missing link is the `cli.ts` to `track-b-runtime.ts` comparability plumbing
- R10 | Status: implemented | Changed Files: `role-model-router/apps/runtime-host-bridge/src/track-b-operations.ts`, `role-model-router/apps/runtime-host-bridge/src/finalized-group-listing-cache.ts`, `role-model-router/apps/runtime-host-bridge/src/cli.ts`, `role-model-router/apps/runtime-host-bridge/test/run104-sp7-contribution-budget.test.ts`, `role-model-router/apps/runtime-host-bridge/test/run104-sp7-finalized-listing-cache.test.ts` | Implementation Evidence: `role-model-router/apps/runtime-host-bridge/test/run104-sp7-finalized-listing-cache.test.ts` (6 tests re-run green) | Audit Note: the before/after live measurement belongs to Phase 5
- R11 | Status: implemented | Changed Files: `role-model-router/apps/runtime-host-bridge/src/track-b-runtime.ts` | Implementation Evidence: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/logs/green/sp8-focused-and-r33-green.txt` | Audit Note: the measured scope is two fields, not twenty-four (addendum 01)
- R12 | Status: implemented | Changed Files: `role-model-router/apps/runtime-host-bridge/test/run104-sp1-replay-eligibility.test.ts`, `role-model-router/apps/runtime-host-bridge/test/run104-sp6-arm-comparability.test.ts`, `role-model-router/apps/runtime-host-bridge/test/run104-traffic-class.test.ts`, `role-model-router/apps/runtime-host-bridge/test/run104-traffic-class-filter.test.ts` | Implementation Evidence: `role-model-router/apps/runtime-host-bridge/test/run104-sp6-arm-comparability.test.ts` and the `## TDD Compliance Log` above | Audit Note: every behaviour change has a RED before its GREEN
- R13 | Status: blocked | Rationale: the rebuilt-runtime matrix and the 30-minute live window are Phase 5 deliverables and are not run yet | Blocking Evidence: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/00-requirements.md` | Audit Note: mandatory phase, not optional
- R14 | Status: implemented | Changed Files: `role-model-router/packages/sqlite-memory/src/index.ts`, `role-model-router/packages/sqlite-memory/test/index.test.ts`, `role-model-router/packages/sqlite-memory/test/run104-live-only-summary.test.ts`, `role-model-router/packages/sqlite-memory/test/run104-traffic-class-aggregate.test.ts`, `role-model-router/packages/runtime-observability/src/index.ts`, `role-model-router/packages/runtime-observability/test/index.test.ts`, `role-model-router/packages/runtime-observability/test/run104-traffic-class.test.ts`, `role-model-router/packages/profile-aggregator/src/index.ts`, `role-model-router/packages/profile-aggregator/test/run104-traffic-class-source.test.ts`, `role-model-router/apps/runtime-host-bridge/src/index.ts`, `role-model-router/apps/runtime-host-bridge/src/traffic-class.ts`, `role-model-router/apps/runtime-host-bridge/test/index.test.ts`, `role-model-router/apps/runtime-host-bridge/test/run104-traffic-class.test.ts`, `role-model-router/apps/runtime-host-bridge/test/run104-traffic-class-filter.test.ts`, `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`, `role-model-router/apps/runtime-ui/app/lib/view-models.ts`, `role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`, `role-model-router/apps/runtime-ui/app/lib/sidebar-footer.ts`, `role-model-router/apps/runtime-ui/app/lib/sidebar-footer.test.ts`, `role-model-router/apps/runtime-ui/app/components/app-shell.tsx`, `role-model-router/apps/runtime-ui/app/components/app-shell.test.ts`, `role-model-router/packages/ui/src/sidebar.tsx`, `role-model-router/packages/ui/src/sidebar.test.ts` | Implementation Evidence: `role-model-router/packages/sqlite-memory/test/run104-live-only-summary.test.ts` (3 tests re-run green) | Audit Note: the live reconciliation is a Phase 5 item
- R15 | Status: blocked | Rationale: the Effect manifest check is a Phase 3.5 control and has not been run against the final diff | Blocking Evidence: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/other/effect-primitive-audit.md` | Audit Note: the per-file manifest rows are recorded in `## Effect Primitive Conformance`

## Verification Handoff

- Deliverable to inspect: this artifact plus `evidence/logs/{red,green}/*`.
- The Phase 3.5 `code-reviewer` should start from the product diff
  (`git diff 84d5996cb156217d37801943831762bc734ae21f...HEAD` in public, `5df90b6d...HEAD` in private).
- Known open items are enumerated under `## Gaps Found`; none is hidden in a sub-phase narrative.

## Worktree Diff Audit

- Baseline type: `remote ref`
- Baseline reference: `84d5996cb156217d37801943831762bc734ae21f`
- Comparison reference: `working-tree`
- Normalized baseline: `84d5996cb156217d37801943831762bc734ae21f`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 84d5996cb156217d37801943831762bc734ae21f`
- Base branch: `origin/dev`
- Worktree branch: `recursive/104-replay-eligibility-and-evidence-fidelity`
- Private baseline: `5df90b6d12772f70bbdaff543b183fc5d312537b`; private diff command `git diff --name-only 5df90b6d12772f70bbdaff543b183fc5d312537b`
- Planned or claimed changed files: the plan's `## File-Ownership Matrix` rows, extended by the three controller-executed fallbacks recorded above
- Actual changed files reviewed: the product diff below, plus the run-folder additions
- Changed files reviewed (public, product only):
- `role-model-router/apps/runtime-host-bridge/src/cli.ts`, `role-model-router/apps/runtime-host-bridge/src/finalized-group-listing-cache.ts`, `role-model-router/apps/runtime-host-bridge/src/index.ts`, `role-model-router/apps/runtime-host-bridge/src/supervised-replay-evaluation-resume.ts`, `role-model-router/apps/runtime-host-bridge/src/track-b-auto-replay.ts`, `role-model-router/apps/runtime-host-bridge/src/track-b-operations.ts`, `role-model-router/apps/runtime-host-bridge/src/track-b-replay-policy.ts`, `role-model-router/apps/runtime-host-bridge/src/track-b-runtime.ts`, `role-model-router/apps/runtime-host-bridge/src/traffic-class.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`, `role-model-router/apps/runtime-host-bridge/test/run104-advisory-classification-variant.test.ts`, `role-model-router/apps/runtime-host-bridge/test/run104-branch-append-recovery.test.ts`, `role-model-router/apps/runtime-host-bridge/test/run104-sp1-dispatch-subset.test.ts`, `role-model-router/apps/runtime-host-bridge/test/run104-sp1-replay-eligibility.test.ts`, `role-model-router/apps/runtime-host-bridge/test/run104-sp2-refusal-semantics.test.ts`, `role-model-router/apps/runtime-host-bridge/test/run104-sp4-taxonomy-fallback.test.ts`, `role-model-router/apps/runtime-host-bridge/test/run104-sp6-arm-comparability.test.ts`, `role-model-router/apps/runtime-host-bridge/test/run104-sp7-contribution-budget.test.ts`, `role-model-router/apps/runtime-host-bridge/test/run104-sp7-finalized-listing-cache.test.ts`, `role-model-router/apps/runtime-host-bridge/test/run104-traffic-class-filter.test.ts`, `role-model-router/apps/runtime-host-bridge/test/run104-traffic-class.test.ts`
- `role-model-router/apps/runtime-ui/app/components/app-shell.test.ts`, `role-model-router/apps/runtime-ui/app/components/app-shell.tsx`, `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`, `role-model-router/apps/runtime-ui/app/lib/sidebar-footer.test.ts`, `role-model-router/apps/runtime-ui/app/lib/sidebar-footer.ts`, `role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`, `role-model-router/apps/runtime-ui/app/lib/view-models.ts`, `role-model-router/apps/runtime-ui/app/routes/learning-floor-progress.test.tsx`, `role-model-router/apps/runtime-ui/app/routes/learning-task-family.test.tsx`, `role-model-router/apps/runtime-ui/app/routes/learning.tsx`
- `role-model-router/packages/catalog/data/normalized-catalog.json`, `role-model-router/packages/catalog/src/index.ts`, `role-model-router/packages/catalog/src/refresh.ts`, `role-model-router/packages/catalog/test/run104-alias-lineage.test.ts`, `role-model-router/packages/profile-aggregator/src/index.ts`, `role-model-router/packages/profile-aggregator/test/run104-traffic-class-source.test.ts`, `role-model-router/packages/runtime-observability/src/index.ts`, `role-model-router/packages/runtime-observability/test/index.test.ts`, `role-model-router/packages/runtime-observability/test/run104-traffic-class.test.ts`, `role-model-router/packages/sqlite-memory/src/index.ts`, `role-model-router/packages/sqlite-memory/test/index.test.ts`, `role-model-router/packages/sqlite-memory/test/run104-live-only-summary.test.ts`, `role-model-router/packages/sqlite-memory/test/run104-traffic-class-aggregate.test.ts`, `role-model-router/packages/ui/src/sidebar.test.ts`, `role-model-router/packages/ui/src/sidebar.tsx`
- `testdata/catalog/models-dev-local-overrides.json`, `testdata/catalog/models-dev-local-supplement.json`, `testdata/catalog/models-dev-snapshot.json`
- Private changed files (recorded in the private worktree's own lint scope): the operator server, the capture-disposition module, the extension-host tuning module and four 	ests/track-b/run104-*.test.mjs files.

## Gaps Found

None unresolved for this phase's lock: the two open items below are carried by the approved plan amendment
`addenda/04-test-summary.upstream-gap.02-to-be-plan.addendum-01.md`, so neither is left unowned. They are not
silent deferrals — each has a verified in-suite half and a named owner for the live half.

1. `R9` producer link — the arm effort comparability is durable on the replay resume entry and the private
   consumer excludes a mismatched arm by name, but no live comparison yet carries the dimension onto its
   comparability key, because the plumbing from `cli.ts`'s post-observation input into
   `track-b-runtime.ts`'s comparability object is not wired. Bounded, additive, and the only open functional
   item; the workaround for Phase 5 is to read the resume entry directly when explaining a live comparison.
2. `R8` residual — when a resumed append's capture has genuinely aged out of the retention ring, the leg still
   defers under `replay_branch_append_unavailable` rather than retiring terminally. The agent proposed splitting
   the refusal text so only the truly-missing-capture case becomes terminal; the controller accepted the
   deferral for this run rather than retire recoverable work. The deferral budget does bound it.
3. `R5`'s locked traceability row points at a draft with no `pdf` content; the policy is asserted in
   `test/run104-alias-lineage.test.ts` instead. Phase 4 must re-verify and the Phase 6/7 updates should correct
   the row.
4. AS-IS line numbers drifted during the run (for example `runtime-operations-server.mjs`
   `withReceiptReadings` `:1993` → `:2111`). Substance verified; the numbers in the locked artifact are stale.

## Repair Work Performed

- The superseded `SP1` assertion was updated to the `SP2` contract with an explanatory comment.
- The missing on-demand planner fix was implemented and committed (`557ca7fd`).
- Repo-wide Biome formatting was applied twice (`1c3a3018`, `8ab539a6`) and the focused tests re-run afterwards.
- The `SP7` listing-cache follow-up was implemented by the controller under the fallback rule (`795b1a79`).

## Audit Verdict

Audit: PASS

Every sub-phase except the two recorded gaps is implemented, controller-verified and committed; every
requirement maps to a surface, a verification surface and a QA surface; the delegation record distinguishes the
eleven accepted children from the three failed dispatches and the three controller-executed fallbacks; and no
acceptance rests on a claim the controller did not re-run. The two open gaps (`R8` remainder, `R9` private
consumer) are functional, named, and dispatched — this artifact must not be locked until they are closed.

## Traceability

- R1 -> `SP1` -> `test/run104-sp1-replay-eligibility.test.ts`, `test/run104-sp1-dispatch-subset.test.ts` -> Phase 5 image request
- R2 -> `SP2` -> `test/run104-sp2-refusal-semantics.test.ts`, `tests/track-b/run104-sp2-refusal-terminality.test.mjs` -> the monitored window's refusal count
- R3 -> `SP3` -> `packages/catalog/test/run104-alias-lineage.test.ts` -> the live flash metadata check
- R4 -> `SP3` -> the same drift-guard test
- R5 -> `SP3` -> the `pdf`-free assertion in the same test
- R6 -> `SP4` -> `test/run104-sp4-taxonomy-fallback.test.ts`, `app/routes/learning-task-family.test.tsx`, `test/run104-advisory-classification-variant.test.ts` -> live readback
- R7 -> `SP5` -> `tests/track-b/run104-sp5-learner-floor-readback.test.mjs`, `app/routes/learning-floor-progress.test.tsx` -> the live Learning surface
- R8 -> `SP10` + `SP5` + the remainder slot -> `tests/track-b/run104-sp10-replay-evaluation-handoff.test.mjs` -> the monitored window
- R9 -> `SP6` -> `test/run104-sp6-arm-comparability.test.ts` -> a live comparison receipt
- R10 -> `SP7` -> `test/run104-sp7-contribution-budget.test.ts`, `test/run104-sp7-finalized-listing-cache.test.ts` -> the before/after live measurement
- R11 -> `SP8` -> the private conformance lane (re-run green)
- R12 -> this artifact's `## TDD Compliance Log` -> the Phase 4 audit
- R13 -> Phase 5 -> the rebuilt-runtime matrix and the monitored window
- R14 -> `SP9` -> `test/run104-live-only-summary.test.ts`, `view-models.test.ts`, `run104-traffic-class-filter.test.ts` -> the live metric check
- R15 -> `## Effect Primitive Conformance` + the manifest check -> Phase 3.5

## Coverage Gate

- [x] Every requirement has an implementation surface and a verification surface
- [x] Every changed product file maps to a sub-phase owner
- [x] Every behaviour change has a RED log before its GREEN log
- [ ] `R8` and `R9` fully satisfied — see `## Gaps Found`
- [x] Delegation, failures and controller fallbacks are recorded with their attempts preserved

Coverage: PASS
TDD Compliance: PASS

## Approval Gate

- [x] The two open requirements are carried by an approved plan amendment rather than closed silently
- [x] This artifact is re-verified after the phase-3.5 repairs
- [ ] Coverage gate re-run after the gaps close

Approval: PASS
- [ ] Lock, then Phase 3.5 code review
