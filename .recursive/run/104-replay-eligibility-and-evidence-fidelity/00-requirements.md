Run: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-10-01T06:59:53Z`
LockHash: `3b6c8dc91bacdf8edf3f6a0f5140681de38d3e4852e11ea8d72f30a5ca641f03`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- Baseline (2026-10-01, fetched): public `origin/dev`
  `84d5996cb156217d37801943831762bc734ae21f` ("run 103 closeout: merged, promoted to stage, stage candidate
  published (#295)"), private `origin/dev` `5df90b6d12772f70bbdaff543b183fc5d312537b` ("route-learning: align the
  latency-selection bounds and default with the shipped read side (#121)"). Both worktrees branch
  `recursive/104-replay-eligibility-and-evidence-fidelity`; the private tree is
  `D:\DEV\role-model-internal\.worktrees\104-replay-eligibility-and-evidence-fidelity`
- Operator decision (2026-10-01, this thread): create run 104 from the post-103 findings; keep the scope to
  replay/evaluation/learning correctness, evidence fidelity, and traffic-class typing for operator aggregates
- Operator instruction (2026-10-01, this thread): the implementation must be Effect-first per `/AGENTS.md` and
  `/.recursive/RECURSIVE.md` (vendored `effect@4.0.0-rc.117` and `effect-mq`), the requirement must name the
  primitives and how they are used, and the run must be executed with parallel subagents under controller
  verification, strict TDD, and rebuilt-runtime verification with live pi-CLI requests
- Draft audit (2026-10-01): four independent audits were run against the draft before approval; two delivered
  (`E:\tmp\audit104\consistency.md`, `E:\tmp\audit104\delegation.md`) and two stalled after 50+ minutes and were
  interrupted, then completed by the controller (`E:\tmp\audit104\effect-primitives.md`,
  `E:\tmp\audit104\verifiability.md`). Every finding was re-verified by the controller before it was applied; the
  applied corrections are recorded in the sections below (Effect timeout semantics, dependency boundary, R7/R9
  re-scope, R11's 24-field ratchet, corrected monitor numbers, traceability ids, bundle/action-record/wave
  contracts, and the verifiability hardening).
- Second-pass audit (2026-10-01, post-lock reopen): three time-boxed auditors were dispatched; all three exceeded
  the box without producing findings and were interrupted, so the controller completed the pass itself. Applied
  corrections: (a) the string vocabularies use `Match.value`/`Match.when`/`Match.exhaustive` for exhaustiveness
  instead of `Data.taggedEnum`/`$match`, which only applies to payload-carrying tagged unions; (b) the timeout
  primitive is `Effect.timeoutOrElse` (or `Effect.timeout` + `Effect.catchTag("TimeoutError", ...)`), with
  `timeoutOption` reserved for legitimate absence; (c) the run-101 queue planes are `PersistedQueue`-based and the
  router contains no `effect-mq` import, so R15, the primitive map, the SP5 commitment and the composition rule now
  say so and treat any `effect-mq` use as reason-required; (d) the per-sub-phase `code-reviewer` bundle source is
  defined; (e) the primitive-map manifest's granularity and changed-file derivation are pinned.
- Live evidence from the run-103 follow-up session:
  - `E:\tmp\run103-evidence\stage-monitor-30m.log` (44 samples: 106 requests, 10 failures; `no_eligible_target`
    dominates the failure lines, on image-bearing `replay-req-*` aimed at text-only `deepseek-v4-pro`, and the
    `replay.disposition` plane ends the window at 5 delayed / 7 failed)
  - `E:\tmp\run103-evidence\stage-3457.err.log` (120 x `contribution upload degraded … timed out after 5000ms`,
    `learner.promote … candidate_not_validatable`; the disposition failure names are enumerated in AS-IS because
    the error log itself carries no `replay.disposition` lines)
  - `E:\tmp\run103-evidence\models.dev.api.json` + upstream `models.dev@67dcd8c9`
    (`models/deepseek/deepseek-v4.1-flash.toml`, `providers/deepseek/models/deepseek-v4-flash.toml`)
  - run-103 pi verification receipts: `.recursive/run/103-agent-strategy-and-scoring-strategy/evidence/pi-verify/`
  - Live traffic-class readback on `:3457` (2026-10-01, stage rc `stage-rc-14fce6cffcd1`): the 135 most recent
    telemetry records all read `requestClass = "live_request"`, including `replay-req-*` and `bench-*` rows; 47 of
    the 135 were replay/benchmark traffic, the mixed cache-hit rate was 51.9% against 68.2% live-only by id
    heuristic, and the latency percentiles move with the sample - T1.2g re-measures the baseline on a frozen
    window rather than trusting a moving live read
- Prior recursive evidence: `/.recursive/run/103-agent-strategy-and-scoring-strategy/` (routing posture, posture
  aliases, capability narrowing, decision receipts), `/.recursive/run/101-effect-mq-queue-rebuild/` (queue
  planes, learner.promote), `/.recursive/run/100-*` (replay lifecycle, benchmark exclusion),
  `/.recursive/run/97-*`/`/.recursive/run/98-*` (replay admission and judge policy)
- `/AGENTS.md`, `/.recursive/RECURSIVE.md`, `/.recursive/STATE.md`, `/.recursive/DECISIONS.md`,
  `/.recursive/memory/MEMORY.md`
Outputs:
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/00-requirements.md`
Scope note: This document defines the stable requirement set for making the replay/evaluation/learning pipeline
respect the model metadata it routes with: replay arms must be capability- and modality-eligible, the catalog
must describe the model that actually serves an alias, captures must carry the taxonomy they were classified
against, the learner must be able to convert decisions into validated packs, and request traffic must be typed by
class so operator-facing metrics describe live traffic only. The implementation is Effect-first on the vendored
runtime, executed in parallel subagent waves under controller verification, and proven with strict TDD plus live
pi-CLI verification of the rebuilt runtime.

## TODO

- [x] Confirm the findings and the scope with the operator
- [x] Map every finding to a requirement identifier
- [x] Define requirement identifiers (R1..R15)
- [x] Write observable acceptance criteria for each requirement
- [x] Record verification method per requirement (tests, evidence, live QA)
- [x] Document out-of-scope items (OOS1..OOS6)
- [x] List constraints and assumptions
- [x] Break the requirements into phases, tasks and subtasks with stable identifiers
- [x] Define the delegation plan (which tasks go to subagents) and the controller verification protocol
- [x] Complete the Coverage Gate checklist
- [x] Complete the Approval Gate checklist

## Findings coverage map

Every finding from the run-103 follow-up maps to at least one requirement; no finding is left to the Phase 2 plan
alone.

| Finding (evidence) | Covered by |
| --- | --- |
| Replay arms chosen without capability/modality checks; 9/110 failures `no_eligible_target` on image -> `deepseek-v4-pro` | R1, R2 |
| `deepseek/deepseek-v4-flash` is a deprecated alias served by `deepseek/deepseek-v4.1-flash` (text+image) while our catalog still says text-only | R3, R4, R5 |
| Captures record role + taxonomy version but no task (`buildRequestClassification` has no `taxonomyIdentity` fallback) | R6 |
| Validation receipts read `insufficient_evidence` while the readback drops the producer's policy floor (`learnerEvidence.floor` is null) and the Learning surface shows no progress | R7 |
| `learner.promote` fails `candidate_not_validatable`; the `replay.disposition` plane ends the 30-minute window at 5 delayed / 7 failed with no terminal reason | R8 |
| Comparisons pit `luna@default` against `sol@medium`; `judgeOrderPolicy` is already in the comparability key (run-99), so the open question is effort matching and whether the comparability dimensions reach the validation receipt's family evidence | R9 |
| Sidecar saturated: 51 contribution-upload degradations in 30 min, operator readbacks starved during sweeps | R10 |
| Private `ci/circleci: track-b-conformance` fails on 24 published activation-policy fields with no runtime consumer on pristine `dev` | R11 |
| Strict TDD and live rebuilt-runtime verification with pi CLI | R12, R13 |
| Replay/evaluation/benchmark/probe traffic is stamped `live_request` (the type's `benchmark` value is never written) and is therefore counted in the operator-facing aggregates (cache hit rate, counts, latency, cost) and admitted to the observed-data plane that is supposed to read live traffic only | R14 |
| Operator instruction: the implementation must be Effect-first with named primitives, and the run must use parallel subagents under controller verification | R15 |

## Requirements

### `R1` Replay candidate eligibility mirrors the router

Description: A replay arm may only be planned against an endpoint that could serve the capture's request. Replay
candidate selection must apply the same capability and modality rules the router applies at dispatch, so a
text-only endpoint is never planned for an image-bearing capture.

Acceptance criteria:
- Replay candidate selection excludes an endpoint whose declared modalities or capabilities cannot satisfy the
  capture's request requirements, using the router's own rules (`supportsCapabilityRequirement` and the
  `MODALITY_UNSUPPORTED` comparison) rather than a parallel implementation.
- Request requirements come from the capture's recorded decision (modalities, capabilities) and fall back to
  message/attachment inference for captures predating the field, with the inference recorded as such.
- Both selection sites are covered: the live capture planner and the durable auto-replay tick.
- When at least one eligible arm exists, the replay is planned against it; the ineligible arms are recorded with
  their reasons (endpoint id + `MODALITY_UNSUPPORTED`/`CAPABILITY_MISSING`) rather than silently dropped.
- A pre-dispatch guard re-checks the arm against the same rules so a configuration change between planning and
  dispatch cannot produce a provider-bound 400; the arm fails cheaply with the reason recorded.
- Capability requirements are satisfied via the single exported router rule; no duplicated capability table.

Verification: unit tests for the filter (image + `[text-only, image-capable]` arms, all-text-only pool, tool and
capability requirements), an integration test through the auto-replay tick proving no dispatch for an ineligible
arm, and a live capture/served replay check on the rebuilt runtime.

### `R2` Named replay refusal semantics

Description: A replay that cannot be served by any eligible arm is refused by name, terminally when the pool can
never serve it and deferrably when a capable endpoint exists but is unavailable, instead of being dispatched and
failing as a provider error.

Acceptance criteria:
- The replay refusal vocabulary gains a named class (e.g. `candidate_input_unsupported`) carrying the blocking
  modality or capability and the endpoint ids that were rejected.
- A capture whose modality no configured endpoint can serve is refused terminally once (like
  `benchmark_source_not_replayable`); when a capable endpoint exists but is unhealthy/excluded, the capture stays
  deferrable so it is retried when the pool changes.
- The refusal is countable in the existing operator readback - `GET /api/role-model/operator/queues`, the
  `replay.disposition` plane - without a new UI page, and the count appears there while the class is active.
- `replay.disposition` no longer accumulates failures for this class; the queue's failed/delayed counts reflect
  only genuinely actionable work.
- No behaviour change for text-only captures: their candidate sets, refusal classes and dispatch outcomes are
  byte-identical to today.

Verification: refusal-code unit tests, a tick integration test asserting one terminal refusal and zero dispatch,
and a monitored live window showing the class countable and `no_eligible_target` at zero for replays.

### `R3` Model lineage and modality metadata for the DeepSeek flash line

Description: The catalog must describe the model that actually serves the configured id. `deepseek-v4-flash` is a
deprecated alias served by `deepseek/deepseek-v4.1-flash`; the runtime probes and calls the provider model
`deepseek-flash`, so the endpoint must be declared image-capable.

Acceptance criteria:
- The catalog models the lineage: a `deepseek/deepseek-v4.1-flash` base entry (input `["text","image"]`, text
  output, no `pdf`) and `deepseek/deepseek-v4-flash` as a deprecated alias that inherits the base modalities
  (or declares them explicitly), with pricing/limits/provenance refreshed from the cited upstream commit.
- `deepseek/deepseek-v4-pro` remains `["text"]`; no DeepSeek entry declares `pdf`.
- The catalog export path remains the only writer of `normalized-catalog.json`; corrections live in the
  snapshot/supplement/overrides inputs and are exportable (`pnpm` catalog export + ledger regenerated).
- The vendor ledger records the upstream commit actually read for this correction.
- After rebuild + restart, an image-bearing request through `difficulty.remote-only` selects the DeepSeek flash
  endpoint - proven by the decision receipt's selected endpoint and the telemetry record both naming
  `deepseek-flash`, not merely by the request succeeding - and the alias metadata that reports conditional input
  modalities lists it.

Verification: a catalog export test asserting the modalities of both DeepSeek entries, a registry test asserting
the endpoint's declared modalities, and a live runtime check with an image request through pi CLI.

### `R4` Catalog drift guard for alias and base modalities

Description: This class of defect (a stale or renamed alias silently carrying the wrong modalities) must fail a
test instead of surfacing as replay noise.

Acceptance criteria:
- A test fails when an alias entry's modalities are incompatible with its declared base model, or when a
  configured model's modalities disagree with the pinned upstream entry.
- The local overrides path can express `modalities` (in addition to `capabilities`), so future corrections do not
  require the supplement path.
- The rule is documented next to the export code and referenced from the operations guide for model metadata.

Verification: RED/GREEN unit tests for the guard (an intentionally stale alias must fail), plus an export test
proving overrides can set modalities.

### `R5` PDF and attachment modality policy

Description: `attachment = true` in the upstream catalog is not a PDF-modality claim. The runtime's behavior must
match the declared modality set, and the policy must be explicit.

Acceptance criteria:
- A model whose upstream entry declares `attachment = true` but no `pdf` input modality is not eligible for a PDF
  request (unchanged behaviour, now covered by a test).
- The policy is documented: PDF eligibility follows the `pdf` modality exactly; `attachment` is not consulted for
  routing.
- No DeepSeek entry gains `pdf` in this run.

Verification: a router/registry test for a PDF-bearing request against an attachment-only model, plus a
documentation reference check.

### `R6` Taxonomy fidelity into captures, observations and learning rows

Description: A capture must record the taxonomy the request was classified against, including the task family, so
learning evidence and the operator surface can scope by task instead of showing `not reported`.

Acceptance criteria:
- `buildRequestClassification` records the task family using the same fallback chain the role uses
  (`routingRequest.taskType` -> `taxonomyIdentity.taskTypeId` -> intent task id), with the value validated
  against the shipped taxonomy exactly as today.
- The task variant travels with the classification when the runtime resolved one.
- All capture sites (routed, failed-route, executed) carry the same classification shape.
- Replay arms keep the source capture's classification and never re-classify the counterfactual.
- A newly captured request reads back with a non-null `taxonomyTaskType` equal to the value the classification
  computed for that request (asserted against a known fixture, e.g. `data.quality.audit`), and the Recent decisions
  table renders it; a null or mismatched value is a FAIL.

Verification: unit tests for the fallback chain and validation, a capture/observation integration test, and a live
readback check showing a task family for a freshly captured request.

### `R7` Promotion-gate visibility

Description: The operator must see why evidence is insufficient in numbers, not just the word `insufficient`.
The validation receipt producer already computes the decisive/holdout/distinct-capture floors
(`extensions/profile-learner/index.mjs` builds `floors`, `holdoutPassed` and per-family counts); the gap is that
the operator readback does not publish the floor (`learnerEvidence.floor` reads `null` today) and the Learning
surface renders no progress. AS-IS records exactly which counts are already published before any change.

Acceptance criteria:
- The learning readback exposes, per validation receipt, the decisive/holdout comparison counts, the effective
  counts after decay, and the policy floor they are measured against, including the producer's
  `minDecisiveComparisons` / `minHoldoutComparisons` / `minDistinctCaptures` values that are currently dropped
  from the projection.
- The Learning surface renders that progress (e.g. "1 / 200 decisive comparisons") next to the verdict, using the
  published values only.
- Absence stays honest: a receipt without counts or without a floor says so instead of rendering a zero. A null
  floor in the readback for a receipt whose producer computed one is a FAIL, not an acceptable "unknown".

Verification: readback unit tests, a UI test for the progress rendering, and a live check on the designated
channel.

### `R8` Learner validation unblock

Description: Comparisons must finalize so candidates can obtain validation receipts; the learner must not stall
with `candidate_not_validatable` or leave work parked in the `replay.disposition` plane indefinitely. The exact
disposition codes present in the stage state are enumerated in AS-IS (the error log does not carry them; the
monitor window ends at 5 delayed / 7 failed).

Acceptance criteria:
- The root cause of `candidate_not_validatable: no finalized comparison was available to validate` is identified
  with a reproduction, and the fix makes the comparison reach a finalized state for the affected candidate
  classes.
- `replay.disposition` entries that are delayed or failed without a terminal reason either finalize or are
  refused/retired by name; the count of stuck entries drains under the run's live window, measured with the same
  queue readback the monitor uses.
- `learner.promote` produces no terminal `candidate_not_validatable` failures during the live verification window.
- At least one comparison reaches `status = 'finalized'` in the durable comparison store during the window; an
  empty-finalization window is a FAIL, not a "no data" pass.
- The promotion gate remains unchanged statistically: promotions still require the policy floor; this
  requirement fixes the path to a receipt, not the threshold.

Verification: a RED/GREEN reproduction at the finalization boundary, a queue integration test, and a monitored
live window with the learner and disposition counts recorded.

### `R9` Arm comparability: effort match and judge-order evidence

Description: A comparison must not silently confound model capability with reasoning-effort variants. Judge-order
bias is already carried in the comparability key (`track-b-runtime.ts` copies `judgeOrderPolicy` into the
comparability tuple and `evaluation-core` validates it), so the remaining question AS-IS must answer is whether
that value reaches the validation receipt's family evidence and whether the live luna-vs-sol arms are
effort-matched.

Acceptance criteria:
- AS-IS records what already exists for comparability: the `judgeOrderPolicy` comparability field, the
  `source_first` / `dual_order` validation, and where (if anywhere) the value stops before the validation
  receipt's family evidence.
- Where a candidate model offers effort variants, replay arms for the same comparison use matched effort, or the
  mismatch is recorded as a first-class comparability dimension and excluded from promotion evidence.
- Any missing judge-order propagation into the receipt family evidence is added; no second comparability-key
  representation is introduced.
- The live luna-vs-sol comparison is explained in the run evidence: either the arms become effort-matched or the
  confound is recorded explicitly.

Verification: unit tests for arm effort selection, a receipt test proving the comparability dimensions (including
judge order) travel with the validation evidence, and a live comparison receipt showing matched effort or the
recorded dimension.

### `R10` Sidecar robustness under replay load

Description: Background replay/evaluation work must not starve operator readbacks or silently drop contribution
uploads.

Acceptance criteria:
- Under the run's live replay + benchmark load, `contribution upload degraded … timed out after 5000ms` is zero
  (or each occurrence is explained and bounded by a documented policy).
- Operator readbacks (`/api/role-model/operator/queues`, learning policy) answer with p95 latency under 1000 ms
  over the monitored window while the sweeps run; the monitor script records the per-sample latency, the p95, and
  the sample count, and a window with fewer than the script's minimum samples is inconclusive rather than passing.
- The sidecar's per-tick work is bounded so a large already-finalized store cannot consume the whole tick budget.
- Any timeout increase is justified against the observed worst-case private operation.

Verification: before/after measurements on the stage channel under the same load, with the monitor script and raw
logs stored as evidence.

### `R11` Private conformance unblocker

Description: The private `ci/circleci: track-b-conformance` lane must be green on `dev`, because it gates every
future private promotion. `run99 R33` currently fails on 24 published activation-policy fields with no runtime
consumer: judgeOrderAggregation, judgeMeasureAgreement, judgeArmExclusion, maxCounterfactualArms,
perArmOutputEvidence, perArmOutputExclusionBound, replayBudgetEnforcement, cohortLadder, scoreBand,
advisorySourceMaxAgeMs, evidenceMaxAgeDays, revalidationIntervalDays, promotionIntervalLevel, promotionResamples,
promotionBootstrapSeed, promotionAnalysisMethod, promotionSelectionFamilySize, latencySelectionEnabled,
latencySelectionMinStage, latencySelectionWindowHours, latencySelectionMinSamples, latencySelectionMaxDeltaMs,
latencySelectionBucketBounds, latencySelectionMaxCandidates.

Acceptance criteria:
- Each of the 24 unconsumed fields is either wired to a real runtime consumer or removed from the published
  activation-policy surface; the `KNOWN_UNWIRED` ratchet stays empty (`KNOWN_UNWIRED = new Set([])` today, and
  the test fails both on an unconsumed published field and on a stale exception), so a "documented exception"
  entry is not an acceptable outcome.
- Fields that are removed are removed from the published JSON and every reader that still names them; fields that
  are wired have a test proving the consumer reads the value.
- The private suite passes in a fresh worktree (or every remaining failure is enumerated with a recorded
  reproduction and an approved exception, which the R33 ratchet does not permit).

Verification: a fresh private worktree run of `node --test tests/track-b/run99-r33-policy-consumers.test.mjs`
going from the recorded 24-field failure to green, plus the CI result on the paired pull request.

### `R12` Strict TDD for every behaviour change

Description: Every production change in this run is written test-first, with RED evidence before the
implementation and GREEN evidence after it. Phase 3 declares `TDD Mode: strict`, matching the run-103 discipline.

Acceptance criteria:
- Phase 3 records a TDD Compliance Log with one entry per RED-GREEN-REFACTOR cycle: sub-phase, requirement ids,
  test file, exact command, RED evidence path, GREEN evidence path and refactor note. Every sub-phase has its RED
  and GREEN logs under `evidence/logs/{red,green}/`.
- The Iron Law holds: no production code without a failing test first. A subagent that writes production code
  before its test is rejected and its work is redone test-first.
- RED evidence shows the test failing for the intended reason (not an unrelated compile error), and GREEN evidence
  shows the same command passing after the minimal implementation. The controller proves the order independently:
  it re-runs the same command against the pre-change baseline (the parent revision in a scratch worktree or an
  equivalent recorded pre-change state) and confirms it fails there, then against the final state and confirms it
  passes.
- Effect code is tested as effects (run through `Effect.runPromise` / `ManagedRuntime`), with deterministic
  assertions where time, scheduling or concurrency is involved.
- Regression suites (bridge, catalog, UI, private tracks) are re-run and recorded before the phase closes.
- Every requirement's verification includes at least one negative control where the shape allows it (revert the
  production change, or disable the new branch, and confirm the new test fails); a requirement whose verification
  passes with the change reverted is not verified.

Verification: Phase 4 test summary plus the controller's own re-run of the recorded commands and its inspection of
the RED artefacts for order of authorship.

### `R13` Phase 5 live verification of the rebuilt runtime

Description: The rebuilt runtime is verified live, not inferred from unit tests.

Acceptance criteria:
- The packaged runtime is rebuilt (`runtime:package-sea`, paired private distribution), proving the SEA still
  carries the Effect runtime (the run-101/103 gate), and run on the designated live channel with its own state
  root.
- Live `pi` CLI requests (`pi --no-session --provider role-model --model <alias> -p "<prompt>"`) cover: an
  image-bearing request through a posture alias (must be able to select the DeepSeek flash endpoint), a
  text-only request (unchanged), a PDF-bearing request (must not select a model without the `pdf` modality), and
  a `hybrid.remote-only` request.
- A monitored replay/benchmark window (at least 30 minutes, same script as the run-103 follow-up) records:
  replay `no_eligible_target` at zero, the new refusal class countable, learner promotions progressing or
  receipted, sidecar degradation at zero, and headline metrics staying live-only with excluded-count
  reconciliation under live replay + benchmark load.
- The window is run with the pinned monitor script (`E:\tmp\run103-evidence\monitor-stage-30.ps1`, or the run's
  checked-in copy) whose content hash is recorded before and after; the script's raw log is archived under
  `evidence/`, and each metric above is evaluated pass/fail explicitly rather than summarized.
- Transcripts, decision readbacks and monitor logs are stored under `evidence/`; failures are reported honestly
  and never replaced with a fabricated sign-off.

Verification: Phase 5 artifact with transcripts, readbacks, monitor logs and the controller's acceptance notes.

### `R14` Traffic classes and aggregate hygiene

Description: Replay, evaluation, benchmark and synthetic-probe traffic must be *typed* as such and must not be
counted with operator traffic in the Observe and Overview metadata. Today every request is stamped
`live_request` (the type's `benchmark` value is never written and `replay` is not in the vocabulary at all), so a
replay request - which is semantically cache-less - is counted in the cache-hit-rate denominator and drags the
measured rate down, and benchmark runs distort the counts, latency percentiles and cost the operator reads.

Acceptance criteria:
- The closed traffic-class vocabulary is `live | replay | evaluation | benchmark | probe | unknown`, replacing the
  current `benchmark | live_request | unknown` set. It is persisted in the request/decision schema
  (`runtime_telemetry_records.request_class` and `runtime_observations.request_class` already exist) rather than
  being a UI-only filter.
- Producers type their own traffic at ingress: the replay dispatcher marks `replay`, the evaluation runner
  `evaluation`, the benchmark runner `benchmark`, and the synthetic probes `probe`. The class travels with the
  request (header or request option) and is persisted by the record writer; it is not guessed from an id prefix
  when the producer knows the class.
- No unconditional `live_request` stamp survives at any path: today the success observation builder hardcodes
  `source_type: "live_request"` (`packages/runtime-observability/src/index.ts:712`) and two failure writers
  hardcode `requestClass: "live_request"` (`runtime-host-bridge/src/index.ts:20140`, `:27574`), while the benchmark
  runner already declares its own sample `benchmark` (`benchmark-runner.ts:1486`) and that declaration never
  reaches the telemetry record. The class is resolved once per request from its declared origin and threaded to
  every record that request produces; the type's dead `benchmark` value is no longer dead.
- Legacy rows keep their historical value but distinguish derivation from declaration: the existing
  `observedPerformance.sample.source_type` backfill is extended with the id/conversation/producer heuristic
  (`replay-req-*`, `bench-*`, and friends), and the inference is recorded as such (e.g. a persisted
  `request_class_source = declared | inferred` field or an equivalent dimension) instead of being silently
  rewritten as if it had been declared.
- Operator-facing aggregates default to `live` only: request counts, success/failure counts, cache hit rate and
  cache-hit token rate, latency percentiles, token/cost totals, and per-model rankings on Observe and Overview.
  Because the unfiltered summary path reads a SQL aggregate with no class predicate
  (`telemetryWindowWhere` -> `readRuntimeTelemetryAggregateFromDatabase`), the default must be applied at the
  aggregate/storage boundary, not only by filtering rows in the UI.
- The exclusion is visible, not hidden: each surface states how many requests of which class were excluded and
  offers a filter to include them.
- The "latest request" sample never takes a non-live request: the sidebar footer and every "last request"
  indicator read the latest `live` request, and when no live request exists they say so instead of falling back to
  a replay/benchmark row (today `buildDashboardLatestRequestRows` falls back to all rows when it finds no
  non-benchmark row).
- The telemetry readback/query and analytics filters gain a `trafficClass` dimension (today
  `filterTelemetryRequestRecords` has no class filter) so an operator can deliberately view replay/benchmark-only
  views.
- The observed-data plane, which already restricts its live-task telemetry and endpoint latency buckets to
  `request_class = 'live_request'`, is covered by tests proving replay/benchmark/probe traffic cannot contribute
  samples, latency or success data to routing metrics. This is a correctness fix, not only a display fix.
- Decision receipts and observations keep the class, so replay/evaluation evidence remains analyzable per class;
  the learning surfaces keep their own scoping and do not start mixing classes.

Verification: unit tests for class derivation and for each producer's marker; an arithmetic aggregate test proving
a replay request cannot change the live cache-hit rate, counts, latency or cost (the test must compute the
live-only rate independently and assert equality to the basis point, not merely assert that a filter is present);
a storage test proving the observed-data queries admit no non-live sample; readback/query filter tests; UI tests
for the default exclusion and the visible excluded-count; and a live check during the Phase 5 monitored window
(replay and benchmark traffic running while the headline metrics stay live-only and the excluded counts reconcile
against the raw classes). Baseline for the live check: on 2026-10-01, over the newest 135 records on `:3457`, the
mixed cache-hit rate was 51.9% against 68.2% live-only by id heuristic, with 47 of the 135 records being
replay/benchmark traffic; T1.2g re-measures this on a frozen window before implementation.

### `R15` Effect-first implementation with a run-specific primitive map

Description: Every new or modified piece of effectful code in this run is implemented on the vendored Effect v4
workspace package (`role-model-router/packages/effect`, `effect@4.0.0-rc.117`), and `effect-mq` where a genuine
worker/job-framework need exists, following the repository's Effect-first rule (`/AGENTS.md` section
"Effect-first implementation rule" and
`/.recursive/RECURSIVE.md` section "Effect-first implementation rule (map)"). This requirement names the primitives
this run uses and what each one owns, so the plan, the implementation and the review can check compliance
mechanically.

Acceptance criteria:
- Modules import `effect` / `effect-mq` by bare specifier; no relative `vendor/**` imports and no new third-party
  dependency. The vendored pins are confirmed with `node scripts/vendor-upstream.mjs --name effect --verify` and
  `--name effect-mq --verify`, and the output is recorded.
- Before any Effect code is written, `.agents/skills/effect-ts/SKILL.md` is read and the relevant vendored guidance
  (`vendor/effect/packages/effect/SCHEMA.md`, `CONFIG.md`) is applied; the read is recorded in the phase artifact.
- The primitive map below is followed. Where Effect is the obvious shape and it is not used, the reason is recorded
  per the `/AGENTS.md` rule (code comment, addendum, or pull-request body).
- Contracts and vocabularies are schema-first: the traffic-class vocabulary, the traffic-class query filter and the
  refusal vocabulary are `Schema.Literals` / `Schema.Struct` decoded at the boundary with
  `Schema.decodeUnknownEffect` (or `Schema.decodeUnknownSync` at a synchronous boundary), not string unions
  duplicated per consumer.
- Exhaustive branching over the string vocabularies (traffic class, refusal code) uses `Match.value` /
  `Match.when` / `Match.exhaustive`, so adding a variant fails at compile time instead of falling through a
  default. `Data.taggedEnum` + `$match` is used only where a value carries a payload and is modelled as a tagged
  union (for example the refusal error objects); it is not applied to the persisted string vocabulary.
- New error channels are `Data.TaggedError` variants (refusal, timeout, validation), so failures stay typed and
  countable.
- Scheduling, retries and backoff use `Schedule` / `Effect.retry` with the landed idiom
  (`Effect.retry({ times, schedule: Schedule.min([Schedule.exponential(base), Schedule.spaced(cap)]) })`, as in
  `queue-runtime`). Time budgets use `Effect.timeoutOrElse({ duration, orElse })` (or `Effect.timeout` followed by
  `Effect.catchTag("TimeoutError", ...)`) with an explicit `Duration`; the rc.117 timeout is a typed
  `TimeoutError` with `_tag = "TimeoutError"`, and the handler raises the run's named `Data.TaggedError` so the
  timeout is countable. `Effect.timeoutOption` is used only where a missing result is legitimately not a failure,
  and that choice is recorded.
- Concurrency and shared state use `Ref` / `SynchronizedRef` / `Semaphore`. The landed queue planes are
  `PersistedQueue`-based (`queue-runtime/{queues,evaluation,learner,store}.ts` import
  `PersistedQueue` from `effect/unstable/persistence`; the router has no `effect-mq` import today), so this run
  extends those planes. `effect-mq` (`Job`, `Worker`, `JobStore`, `JobSchedules`, `Flow`, `Metrics`) remains
  available per the repository map for a genuine worker/job-framework need and any use records the reason. No new
  hand-rolled queue, worker or retry loop.
- Observability uses `Metric` (counters/gauges for excluded classes, refusals and degradations) and
  `Effect.logInfo` / `Effect.annotateLogs` for provenance.
- Composition keeps one long-lived runtime per plane (`ManagedRuntime`); `ManagedRuntime.runPromise` is allowed at
  the boundary that enqueues work onto a long-lived plane (as `queue-runtime/index.ts` already does), but not on
  the per-request routing/telemetry path - no `Effect.runPromise`, layer construction, or `getUnsafe` per request
  there - and traffic-class resolution and the replay eligibility filter are pure functions over immutable
  snapshots.
- The dependency-closure build is run before the bridge test lanes, and the rebuilt SEA is proven to still carry
  the Effect runtime (see `R13`).
- Effect is introduced only where the dependency already exists (`runtime-host-bridge`, the `queue-runtime` planes
  and workspace packages that declare `effect`/`effect-mq`). `packages/core`, `packages/sqlite-memory` and
  `packages/runtime-observability` stay Effect-free unless the plan explicitly adds the dependency and proves the
  SEA/dependency-closure constraint; the replay eligibility rule stays a pure function in the bridge while
  `packages/core` keeps exporting the router rule it consumes.
- This requirement does not mandate rewriting existing Effect-free modules (`sqlite-memory`,
  `runtime-observability`, the bridge request handlers) as a standalone refactor; it applies to the code this run
  adds or changes where the shape is effectful.

Primitive map (verified against the vendored source, `effect@4.0.0-rc.117`):

| Concern in this run | Primitive | Vendored source | How it is used |
| --- | --- | --- | --- |
| Traffic-class and refusal vocabularies; query-filter contract | `Schema.Literals`, `Schema.Struct`, `Schema.decodeUnknownEffect` / `Schema.decodeUnknownSync` | `packages/effect/src/Schema.ts` | One closed vocabulary decoded at ingest and at the operator API boundary; no duplicated string unions |
| Exhaustive branching over the string vocabularies | `Match.value`, `Match.when`, `Match.exhaustive` | `packages/effect/src/Match.ts` | Total matching over the decoded class/refusal strings; a new variant is a compile error instead of a silent default |
| Payload-carrying tagged unions (refusal errors, tick outcomes) | `Data.taggedEnum` + `$match` | `packages/effect/src/Data.ts` | Exhaustive matching where the value is a tagged object, not a persisted string |
| Typed refusal/timeout/validation failures | `Data.TaggedError`, `Cause.TimeoutError` | `packages/effect/src/Data.ts`, `src/Cause.ts` | Named error tags for `candidate_input_unsupported`; `Effect.timeout`'s `Cause.TimeoutError` is mapped to a named tagged error, never swallowed |
| Replay tick state and the single-tick critical section | `SynchronizedRef`, `Semaphore` | `SynchronizedRef.ts`, `Semaphore.ts` | Eligibility results and refusal counters published atomically; one auto-replay tick at a time |
| Replay/evaluation/learner queues and workers | `PersistedQueue` (`effect/unstable/persistence`); `effect-mq` (`Job`, `Worker`, `JobStore`, `JobSchedules`, `Flow`, `Metrics`) only if a worker-framework need arises | `packages/effect/src/unstable/persistence/PersistedQueue.ts`, `vendor/effect-mq/packages/effect-mq/src` | Extend the landed run-101 `PersistedQueue` planes for replay dispatch, evaluation and learner finalization; any effect-mq use records its reason |
| Contribution-upload budget, retry and backoff | `Effect.timeoutOrElse` (or `Effect.timeout` + `Effect.catchTag("TimeoutError", ...)`), `Duration`, `Effect.retry`, `Schedule.exponential` / `Schedule.spaced` / `Schedule.min` | `Effect.ts`, `Duration.ts`, `Schedule.ts` | Bounded uploads whose timeout becomes a named tagged error, with the same bounded retry schedule shape the queue planes already use |
| Live config and immutable request snapshot | `Ref`, `SynchronizedRef`, `Context.Service`, `Layer` | `Ref.ts`, `SynchronizedRef.ts`, `Context.ts`, `Layer.ts` | Services resolved once at the composition root; the request path reads a snapshot |
| Provenance metrics and structured logs | `Metric` (`counter`, `gauge`, `histogram`), `Effect.logInfo`, `Effect.annotateLogs` | `Metric.ts`, `Effect.ts` | Counters for excluded traffic classes, refusals and degradations; histograms for latency; decision/receipt ids in logs |
| Environment and policy narrowing | `Config`, `ConfigProvider` (`nested("role_model")`, `constantCase`) | `Config.ts`, `ConfigProvider.ts` | Thresholds and gates (aggregate default class, sidecar budget) resolved from the environment |
| Long-lived runtime | `ManagedRuntime` (`runPromise` only at enqueue boundaries) | `ManagedRuntime.ts` | One runtime per plane in the composition root; never constructed or run per request |
| Bounded sweeps (only if a sweep is introduced) | `Stream` (`runCollect`, `runForEach`) | `Stream.ts` | Cursor-based bounded processing instead of unbounded arrays |

Verification: an import/lint check proving no relative `vendor/**` imports and no new dependency; the recorded
pin-verification output; a mechanical conformance check - the plan carries a checked-in primitive-map manifest
with one row per changed file that imports `effect` or `effect-mq` (file path to primitive to concern), the
changed-file list is derived from the diff basis rather than from the manifest itself, and a controller-run script
fails when a changed file imports `effect`/`effect-mq` but is absent from the manifest, when a relative
`vendor/**` import appears, or when `package.json`/lockfiles change; executed sketches (like the run-103
design-doc section 12 audit) for any primitive used for the first time in this repo, with the results recorded;
and the Phase 4 test audit confirming that Effect code is exercised through `Effect.runPromise` /
`ManagedRuntime`.

## Out of Scope

- `OOS1`: Per-alias usage tracking and the Agent strategy page's copy/usage-snippet affordances (requests,
  success rate, p50/p95, last used). That needs a requested-alias telemetry dimension and filter plus product UI
  work; it is its own run.
- `OOS2`: Accepting the stage release candidate (`accept-release-candidate`) and any stage/dev state-pruning
  tooling. Those are operational tasks, not product requirements.
- `OOS3`: Changing the learner's statistical method (paired cluster bootstrap, interval level, selection family
  size) or the promotion thresholds.
- `OOS4`: Live provider probing of image/PDF support; this run trusts declared catalog metadata and corrects it
  from the pinned upstream source.
- `OOS5`: Any routing-posture, scoring-strategy or Agent/Workloads page redesign; run 103 owns those surfaces.
- `OOS6`: Migrating existing Effect-free modules (`sqlite-memory`, `runtime-observability`, the bridge request
  handlers) to Effect as a standalone refactor. Effect applies to the code this run adds or changes where the shape
  is effectful (`R15`).

## Constraints

- Paired run: public `role-model` plus private `role-model-internal`; private feature worktrees live under
  `role-model-internal/.worktrees/`. Never touch `main` or `stage`; PRs target `dev`.
- `normalized-catalog.json` and the vendor ledger are generated artifacts: corrections go into the snapshot,
  supplement or overrides inputs and are produced by the catalog export; hand edits are forbidden.
- A catalog correction must cite the upstream `models.dev` commit and file path it was read from.
- The router's capability/modality rules are the single source of truth; the replay path must import them rather
  than restate them.
- Strict TDD for every production behaviour change; one logical change per pull request.
- Effect-first is mandatory for new or modified effectful code: vendored `effect@4.0.0-rc.117` and `effect-mq` via
  the workspace packages, bare `effect` specifiers, no relative `vendor/**` imports, no new third-party
  dependency, and a recorded reason for any place where Effect is the obvious shape but is not used (`R15`).
- Node `>=24 <25`, pnpm `>=10`, `corepack pnpm`; the vendored Effect wrapper must be built before bridge test
  lanes (the dependency-closure build recorded in run 103's worktree note).
- The packaged runtime must be rebuilt for live verification; the live channel is announced before use and the
  operator's testing surfaces are not disturbed without notice.
- Refusals, degradations and failures are recorded with their raw evidence; no fabricated sign-off.

## Assumptions

- `models.dev` is the authoritative upstream for model modalities, pricing and limits, and its `deepseek-v4-flash`
  alias really is served by `deepseek-v4.1-flash` (stated in the provider file and exercised by the runtime's
  health probe).
- Captures written after run 103 carry a decision receipt with the request's required capabilities and modalities;
  older captures are handled by inference with the inference recorded.
- The stage state currently contains fewer than the promotion floor's decisive comparisons (the live receipts show
  `insufficient_evidence` with one decisive comparison), so R7/R8 are about path and visibility, not about
  promoting a pack during this run.

## Delivery phases, tasks and subtasks

Every task carries Scope, Inputs, Outputs and Verification so it can be handed to a subagent without re-deriving
context. Task ids are stable and are used by the Phase 2 plan, the Phase 3 sub-phases and the delegation records.

### Phase 1 - AS-IS (`analyst`-delegable)

| Task | Scope | Inputs | Outputs | Verification |
| --- | --- | --- | --- | --- |
| `T1.1` Finding inventory | Index every finding from this requirement's coverage map with a source quote and a disposition | this artifact, the run-103 follow-up evidence | `01-as-is.md` `## Source Requirement Inventory` | Every finding appears exactly once and names a requirement id |
| `T1.2a` Replay selection path | Record `selectReplayCandidates`, both call sites, the admission gate and the refusal vocabulary with file:line anchors | `track-b-replay-policy.ts`, `cli.ts`, `track-b-auto-replay.ts` | `01-as-is.md` subsection | Each claim cites a file and line and reproduces against the diff basis |
| `T1.2b` Router eligibility rules | Record the exact capability and modality rules the router applies, including the reason vocabulary | `packages/core/src/router.ts`, `packages/endpoint-registry` | `01-as-is.md` subsection | The rules are quoted from source, not paraphrased |
| `T1.2c` Catalog and registry modality path | Record how models.dev entries reach the endpoint registry and the router, including the snapshot/supplement/overrides inputs | `packages/catalog/src/*`, `testdata/catalog/*`, `vendor-version-ledger.json` | `01-as-is.md` subsection | The `deepseek-v4-flash` stale value is demonstrated end to end |
| `T1.2d` Capture classification path | Record how the capture classification is built and why the task is absent | `index.ts` (`buildRequestClassification` and call sites) | `01-as-is.md` subsection | The missing fallback is shown with the role's fallback chain for contrast |
| `T1.2e` Learner/validation path | Record the finalization boundary, the validation receipt shape and the promotion gate | private `runtime-operations-server.mjs`, `evaluation-core`, learning readbacks | `01-as-is.md` subsection | The `candidate_not_validatable` reproduction path is named |
| `T1.2f` Sidecar budget path | Record the private-op budget, tick budget and where uploads degrade | private sidecar/extension sources, `stage-3457.err.log` | `01-as-is.md` subsection | The 5 s budget and the tick budget are quoted from source |
| `T1.2g` Traffic-class path | Record where requests are typed today (the `request_class` columns, the hardcoded `live_request` stamps, the `source_type` backfill) and every aggregate/query that sums across classes (summary SQL, cache hit rate, counts, latency, cost, rankings, observed-data queries) | `runtime-host-bridge/src/index.ts` (`requestClass`, summary and analytics builders), `packages/sqlite-memory/src/index.ts` (`request_class`, `telemetryWindowWhere`, observed-data queries), `runtime-ui` view-models and Observe/Overview routes | `01-as-is.md` subsection | Each aggregate that mixes classes is listed with a file and line; the live mis-typing is demonstrated with the `:3457` readback |
| `T1.2h` Effect wiring and primitives | Record the landed Effect workspace wrapper (`packages/effect`, `packages/effect-mq`, `effect@4.0.0-rc.117`), what already runs on Effect (queue-runtime planes, auto-replay runtime, config), the SEA packaging gate and the dependency-closure build | `packages/effect`, `packages/effect-mq`, `queue-runtime/*`, `track-b-auto-replay-runtime.ts`, `00-worktree.md`, `AGENTS.md`, `.recursive/RECURSIVE.md` | `01-as-is.md` subsection | Every claim cites a file; the wrapper build and SEA gate are both recorded |
| `T1.2i` Private conformance path | Record the 24 unconsumed activation-policy fields, the `KNOWN_UNWIRED = new Set([])` ratchet semantics, and which fields are safely removable versus which need a consumer | private `tests/track-b/run99-r33-policy-consumers.test.mjs`, `shared/route-learning/activation-policy.mjs`, `shared/route-learning-activation-policy.json` | `01-as-is.md` subsection | The failing run is reproduced and the 24 fields are listed with a wire-or-remove disposition each |
| `T1.3` Prior evidence and memory | Re-read runs 97/98/100/101/103 plus replay/learning memory docs and record what binds | prior run folders, memory shards | `01-as-is.md` `## Prior Recursive Evidence Reviewed` | Each cited artifact contributes a named constraint or decision |

### Phase 2 - TO-BE plan (`planner`-delegable audit)

| Task | Scope | Inputs | Outputs | Verification |
| --- | --- | --- | --- | --- |
| `T2.1` Requirement mapping | Map `R1`-`R15` to sub-phases with `## Plan Drift Check` and plan-stage `## Requirement Completion Status` | `01-as-is.md`, this artifact | `02-to-be-plan.md` | No requirement unmapped; no sub-phase without a requirement id |
| `T2.2` Sub-phase definition | Define `SP1`-`SP9` with file ownership, disjointness, ordering, RED tests, evidence paths and rollback; publish a file-ownership matrix that proves every parallel wave is disjoint | this artifact | `02-to-be-plan.md` | Write scopes are disjoint within every wave; each sub-phase lists its RED tests first |
| `T2.3` Verification and QA plan | Fix the exact suites, the live pi-CLI matrix, the 30-minute monitor window and the evidence layout | this artifact (`R12`, `R13`) | `02-to-be-plan.md` | Every acceptance criterion has a named command or observed artefact |
| `T2.4` Delegation and risk register | Confirm the delegation plan, the router policy state and mitigations | `.recursive/config/recursive-router*.json`, this artifact | `02-to-be-plan.md` | Each delegated task names its role, bundle path and controller verification step |
| `T2.5` Effect primitive verification | Execute a sketch for every `R15` primitive that this run uses for the first time in this repo (schema vocabulary + matcher, tagged errors, timeout/retry schedule, semaphore critical section, metric, config narrowing) against the vendored source and record the results | this artifact (`R15`), `vendor/effect`, `vendor/effect-mq` | `02-to-be-plan.md` `## Effect Primitive Audit` | Each row names the sketch, the command, the observed result and any correction to this requirement |

### Phase 3 - Implementation sub-phases (parallel implementer subagents for disjoint waves; controller owns acceptance)

| Sub-phase | Requirement coverage | Scope | RED evidence | GREEN evidence |
| --- | --- | --- | --- | --- |
| `SP1` Replay eligibility filter | `R1` | Request requirements reader, candidate filter, both call sites, pre-dispatch guard | `evidence/logs/red/sp1-*.log` | `evidence/logs/green/sp1-*.log` |
| `SP2` Refusal semantics and readback | `R2` | New refusal class, terminal/deferrable rules, queue readback | `evidence/logs/red/sp2-*.log` | `evidence/logs/green/sp2-*.log` |
| `SP3` Catalog lineage and modality metadata | `R3`, `R4`, `R5` | DeepSeek base/alias entries, override modalities support, drift guard, export + ledger | `evidence/logs/red/sp3-*.log` | `evidence/logs/green/sp3-*.log` |
| `SP4` Taxonomy fidelity | `R6` | Classification fallback + variant at all capture sites, learning readback and UI column | `evidence/logs/red/sp4-*.log` | `evidence/logs/green/sp4-*.log` |
| `SP5` Learner finalization and gate visibility | `R7`, `R8` | Finalization fix, receipt counts in the readback, progress rendering | `evidence/logs/red/sp5-*.log` | `evidence/logs/green/sp5-*.log` |
| `SP6` Arm comparability | `R9` | Effort-matched arms, `judgeOrderPolicy` in the comparability key and receipt | `evidence/logs/red/sp6-*.log` | `evidence/logs/green/sp6-*.log` |
| `SP7` Sidecar robustness | `R10` | Budget/decoupling, bounded tick work, measured under load | `evidence/logs/red/sp7-*.log` | `evidence/logs/green/sp7-*.log` |
| `SP8` Private conformance unblocker | `R11` | Wire or re-scope the unwired fields, paired private PR | `evidence/logs/red/sp8-*.log` | `evidence/logs/green/sp8-*.log` |
| `SP9` Traffic classes and aggregate hygiene | `R14` | Class vocabulary + producer markers, class-aware summary SQL and readback/query filters, live-only aggregates with visible exclusions on Observe/Overview, latest-live sampling, observed-data-plane tests | `evidence/logs/red/sp9-*.log` | `evidence/logs/green/sp9-*.log` |

`T3.1` - TDD compliance log: one entry per cycle (test file, command, RED path, GREEN path, refactor note).
`T3.2` - Implementation is executed in parallel waves of implementer subagents, one sub-phase per agent, each with
an explicitly disjoint file-ownership list and its own RED test to write first. The controller owns wave
definition, acceptance and every repair, and no file is written by two agents in the same wave.
`T3.3` - Per-sub-phase self-audit against the requirement ids, the `R15` primitive map and the TDD order before the
next wave starts.

Wave rules (from `recursive-subagent`): a wave may start only after the previous wave's acceptance is recorded;
only sub-phases with disjoint write scopes and no blocking dependency chain share a wave; overlapping sub-phases
are serialized; each implementer receives a bundle (phase, sub-phase, requirement ids, owned files, RED test to
write first, commands, evidence paths, output shape) and may not touch files outside its ownership.

Suggested initial waves (Phase 2 confirms the final matrix):

| Wave | Sub-phases | Why they can run together |
| --- | --- | --- |
| `W0` bootstrap | `T2.5` primitive audit, harness and evidence scaffolding | Read-only sketches against the vendored tree; no production writes |
| `W1` | `SP3` (catalog), `SP4` (taxonomy), `SP8` (private conformance) | Catalog inputs, classification/learning readback and the private conformance lane touch disjoint file families |
| `W2` | `SP1` -> `SP2` (serialized: same replay selection/refusal files), then `SP5` and `SP7` serialized after them | `SP2` and `SP5` both write the private `scripts/track-b/runtime-operations-server.mjs` (refusal-class vocabulary at :3247/:3260 vs the `/operator/learning*` readback at :6725); `SP5` and `SP7` both write `extensions/evaluation-core/index.mjs` (finalized comparison groups at :1164/:1221-1245 vs the bounded sweep at :3235); `SP1`/`SP2` and `SP7` both touch the `track-b-runtime.ts` upload/dispatch path. This wave is sequential until the frozen matrix proves a function-level partition |
| `W3` | `SP6` (arm comparability), `SP9` (traffic classes and aggregates) - serialized unless the matrix partitions them | `SP6` writes the comparability tuple and judge order (`cli.ts`, `track-b-runtime.ts`, private `shared/capture/classification.mjs`), and `SP9` writes traffic-class producers on the same dispatch/capture path; Phase 2 must partition by function or serialize |
| `W4` | Phase 3.5 review, Phase 4 audits | Read-only review and test audits across the frozen diff |

`SP4` (W1) and `SP9` (W3) also both touch `runtime-host-bridge/src/index.ts` and the `runtime-ui` tree; the wave
sequencing already serializes them, and the matrix must record that as a cross-wave ordering constraint rather
than an in-wave risk. Same-file concurrent writes are never allowed in any wave.

Primitive commitments per sub-phase (indicative; Phase 2 finalises them against `R15`):

| Sub-phase | Effect shape |
| --- | --- |
| `SP1`, `SP2` | Pure eligibility/refusal functions over immutable snapshots; `Data.TaggedError` for the refusal class; `Semaphore` around the auto-replay tick that consumes them |
| `SP3` | Data and catalog-export work with no effectful shape; the deviation reason is recorded per `R15` if any new async path appears |
| `SP4` | Pure classification fallback; the capture/readback call sites keep the existing bridge contract |
| `SP5` | Extends the run-101 `PersistedQueue` learner plane (`queue-runtime/learner.ts`, `effect/unstable/persistence`); `Effect.retry` + `Schedule` for the queue's retry policy; `Metric` for receipt counts |
| `SP6` | Pure comparability key and arm selection; receipt fields stay schema-validated |
| `SP7` | `Effect.timeout` with an explicit `Duration` for the sidecar budget, mapping its `Cause.TimeoutError` to a named `Data.TaggedError`; the queue planes' `Effect.retry` + `Schedule.exponential`/`spaced` idiom for uploads; `Metric` for degradations |
| `SP8` | Private conformance wiring; no new runtime shape |
| `SP9` | `Schema.Literals` for the class vocabulary and query filter, `Data.taggedEnum` + `$match` for class branching, `Metric` for excluded-class counts; the summary path stays pure SQL |

### Phase 3.5 - Code review (`code-reviewer`-delegable)

`T3.5.1` Generate the canonical review bundle covering the diff basis, changed files, plan and requirement ids.
`T3.5.2` Delegate the review with the bundle path. `T3.5.3` Controller verifies each finding against the actual
worktree before accepting, repairs in Phase 3 and re-reviews when scope changes.

### Phase 4 - Tests and validation (`tester`-delegable audit)

`T4.1` Pre-test implementation audit (requirements vs actual changed files). `T4.2` Run the affected suites and
builds and capture logs (public bridge/catalog/UI, private tracks), including the import/lint check and the
`R15` primitive-map review. `T4.3` Delegate a test-adequacy audit for `R1`-`R15`. `T4.4` Controller re-runs the
accepted commands and records the results.

### Phase 5 - Manual QA: rebuilt runtime + live pi CLI + monitored window (`tester`-delegable execution, controller acceptance)

`T5.1` Rebuild the packaged runtime (paired private distribution + `runtime:package-sea`), prove the SEA still
carries the Effect runtime, and record the artifact digest. `T5.2` Start it on the designated live channel with its
own state root. `T5.3` Install/point the pi package at that channel. `T5.4` Execute the live matrix with
`pi --no-session --provider role-model --model <alias> -p "<prompt>"`: image-bearing through a posture alias,
text-only control, PDF-bearing control, `hybrid.remote-only`. `T5.5` Run the 30-minute monitored replay/benchmark
window and record the metrics named in `R13`, including the live-only headline metrics and excluded-count
reconciliation. `T5.6` For every request inspect the decision, the telemetry record and the new
refusal/validation receipts. `T5.7` Capture transcripts, readbacks and monitor logs under `evidence/` and report
failures honestly. `T5.8` Phase 5 parallel interface: the controller performs `T5.1`-`T5.3` alone and hands both
testers a started runtime, its digest, the channel, the state root, the pi binary version and the pi config path;
testers only read that configuration and never install, reconfigure, restart or stop anything. Either the matrix
completes before the 30-minute window starts, or the two run concurrently and the monitor records its own
start/end timestamps and the matrix's request count as part of the live class; the choice is recorded in the
Phase 5 header before either tester starts. Evidence is separated by prefix (`t5-matrix-*`, `t5-monitor-*`) and
every transcript states its window, the runtime digest and whether the other tester was active. Nothing may
restart the runtime or swap the package during the window; either tester stops and reports, without repairing,
when it observes a live defect. Learner assertions in the window are only meaningful if the `SP5` wave was
accepted; a null result is a FAIL, not a "no data" pass. The controller accepts both only after inspecting each
transcript and readback itself.

### Phases 6-8 - Closeout

`T6.1` Decisions update. `T7.1` State update. `T8.1` Memory impact. `T8.2` (`memory-auditor`-delegable) verify
touched paths, status transitions and router notes against the final validated state.

## Delegation plan

The router policy state must be re-read from `/.recursive/config/recursive-router.json` and
`recursive-router-discovered.json` in the run worktree before any dispatch, and recorded in Phase 2. In-session
subagents are the primary delegation mechanism for this run (operator instruction, 2026-10-01): analyst, planner,
implementer, code-reviewer, tester and memory-auditor roles are used in parallel where the write scopes are
disjoint. External-CLI routing is used only when the run-start policy declares an active configured route for a
role; otherwise the same work is executed by in-session subagents. The controller keeps acceptance authority and
remains responsible for every wave, every repair and every gate. A run-start policy that disables the external
implementer route disables external-CLI dispatch only; it does not disable in-session implementer subagents, which
are the operator-selected mechanism for this run.

Re-read cadence and evidence: immediately before every dispatch - and before deciding no dispatch is needed - the
controller re-reads both policy files in the run worktree and records the resolution in that phase's artifact or
action record with `Routing Config Path`, `Routing Discovery Path`, and either (`Routed CLI`, `Routed Model`) when
the role resolves to `external-cli`, or an explicit "no routed dispatch: route resolved to
`local-only`/`fallback-local`/`blocked`" line. If the discovery inventory is absent or stale in a fresh worktree,
it is refreshed from the controller repo before resolution. Routed invocations use `recursive-router-resolve` /
`recursive-router-invoke`; their output, transcripts and metadata are captured under
`/.recursive/run/<run-id>/evidence/router/` with the prompt bundle under
`/.recursive/run/<run-id>/router-prompts/`.

| Task | Delegated? | Role | Why | Required artefacts | Controller verification |
| --- | --- | --- | --- | --- | --- |
| `T1.1`-`T1.3` | Yes - one analyst per finding group (`T1.1` inventory, `T1.2a`-`T1.2c` replay/catalog, `T1.2d`-`T1.2e` classification/learner, `T1.2f`-`T1.2h` sidecar/traffic/Effect, `T1.2i` private conformance, `T1.3` prior evidence), running in parallel, plus one independent audit pass | `analyst` | Parallel AS-IS passes over disjoint file groups cover the same diff basis faster; the separate audit pass catches drift the authors miss | `subagents/analyst-t1-*.md` (one per group) + `evidence/review-bundles/01-as-is.md` | Re-read every cited file; confirm each claim reproduces against the diff basis; reject any claim without a file:line |
| `T2.1`-`T2.5` | Yes - planner drafts the plan and the file-ownership matrix; a second planner audits traceability | `planner` | Requirement-to-plan coverage and wave disjointness are the failure modes this run guards against | `subagents/planner-t2.md` + `subagents/planner-t2-audit.md` | Every `R#` mapped; every wave's ownership matrix checked against the actual files; spot-check mappings against the plan text |
| `SP1`-`SP9` implementation writes | Yes - one implementer subagent per sub-phase, grouped into waves with disjoint file ownership; serialized where scopes overlap | `implementer` | Parallel implementers are the requested speed-up; the wave rules plus controller acceptance keep correctness with the controller | `subagents/implementer-spN.md` + RED/GREEN logs + changed-file list | Controller re-reads the diff, re-runs the RED and GREEN commands, checks TDD order and the `R15` primitive map, and rejects any edit outside the owned file list |
| `SP1`-`SP9` bounded checks | Yes - one code-reviewer per sub-phase, running in parallel with the next wave | `code-reviewer` | Cheap bounded verification of one sub-phase diff while the controller continues | `subagents/code-reviewer-spN.md` | Controller re-runs the named commands and re-reads the diff before accepting |
| `T3.5.1`-`T3.5.3` Phase 3.5 review | Yes | `code-reviewer` | High-risk change; a full bundle review is the canonical path | `evidence/review-bundles/03-5-code-review.md` + `subagents/code-reviewer-t3.5.md` | Findings verified against actual files; repairs recorded; re-review after material change |
| `T4.2`-`T4.3` suite runs and test-adequacy audit | Yes - suite execution and the adequacy audit run as parallel testers | `tester` | Tests are the evidence base for `R12` | `subagents/tester-t4-suite.md`, `subagents/tester-t4-audit.md` | Controller re-runs the accepted commands and compares logs |
| `T5.4`/`T5.5` live matrix + monitored window | Yes - two testers in parallel once the runtime is up (matrix and monitor), under controller supervision | `tester` | Long-running and mechanical; parallel testers cover the matrix and the 30-minute window at once | `subagents/tester-t5-matrix.md`, `subagents/tester-t5-monitor.md` + `evidence/logs/t5-*.log` + transcripts | Controller inspects each transcript and readback; no acceptance on a subagent's summary alone |
| `T8.2` memory audit | Yes | `memory-auditor` | Memory/status drift is systematically missed by authors | `subagents/memory-auditor-t8.md` | Controller compares touched paths and statuses with the final diff |

### Context bundle contract

Every delegated dispatch, in-session or routed, carries all eleven `recursive-subagent` bundle items:

1. phase name and artifact path;
2. the current phase draft (path plus hash when the draft is large);
3. the exact upstream artifact paths to re-read;
4. the relevant addendum paths (`/.recursive/run/<run-id>/addenda/...`), or an explicit "no addenda apply";
5. the relevant prior recursive evidence and memory refs (`/.recursive/memory/**`, prior run folders);
6. the diff basis recorded in `00-worktree.md`;
7. the changed file list;
8. the targeted code files or file groups;
9. the relevant control-plane docs (`AGENTS.md`, `/.recursive/RECURSIVE.md`, the governing skill, the operations
   guide for the touched surface);
10. the exact audit questions or checklist for that task type;
11. the required output shape, including findings and a final `Audit: PASS` or `Audit: FAIL` verdict.

Bundle sources by task type: `T1` = this artifact + the run-103 follow-up evidence; `T2` = `01-as-is.md` + this
artifact; `SP1`-`SP9` = the accepted plan matrix for that wave + the sub-phase's requirement ids; `T3.5` = the
review bundle generated by `recursive-review-bundle`; `T4` = the implementation summary + the TDD log; `T5` = the
test summary + the Phase 5 runtime digest; `T8` = the state update + the final diff basis. The per-sub-phase
`code-reviewer` bundle is the implementer's action record plus the sub-phase's RED/GREEN logs, the sub-phase diff
against the frozen ownership matrix, and the `R15` manifest rows for the changed files.

### Action records and routed evidence

The controller writes the action record for every delegated invocation under
`/.recursive/run/<run-id>/subagents/<role>-<task-id>[-attempt-NN].md`. Each record carries the parts
`RECURSIVE.md` requires: metadata (`Subagent ID`, `Run ID`, `Phase`, `Purpose`, `Execution Mode`, `Timestamp`);
inputs provided (`Current Artifact`, `Upstream Artifacts`, `Addenda`, `Review Bundle`, `Diff Basis`, `Code Refs`,
`Memory Refs`, `Audit / Task Questions`); claimed actions taken; claimed file impact (`Created`, `Modified`,
`Reviewed`, `Relevant but Untouched`); claimed artifact impact (`Read`, `Updated`, `Evidence Used`); claimed
findings; and the verification handoff. Subagents return those fields in their final message and do not write
files into `subagents/` themselves, because the run linter treats every Markdown file in that directory as a
canonical action record. A content-free `none everywhere` record is never accepted for materially contributing
work. When external routing is used, the assistant output, stdout/stderr and invoke metadata are captured under
`/.recursive/run/<run-id>/evidence/router/` with the initial prompt bundle under
`/.recursive/run/<run-id>/router-prompts/`, cited as `Prompt Bundle Path` in the action record.

### Ownership matrix and wave governance

`T2.2` publishes the file-ownership matrix in `02-to-be-plan.md`; it freezes when `02-to-be-plan.md` locks, and no
wave may start before the frozen matrix shows every pair of sub-phases in that wave as disjoint. The wave table
above is a suggestion only. If a repair or a discovery changes a sub-phase's file set after the freeze, the
controller records a plan-amendment addendum
(`/.recursive/run/<run-id>/addenda/03-implementation-summary.upstream-gap.02-to-be-plan.addendum-NN.md`) that
names the new files, states the impact on the affected `R#`, re-verifies that wave's disjointness, and is treated
as part of the effective plan. Editing a file that belongs to an already-accepted wave requires that addendum and
invalidates that wave's acceptance and its review bundle until the review is repeated.

### Implementer write-safety rules

An implementer subagent may write only the files in its frozen ownership list plus its own RED/GREEN logs under
`/.recursive/run/<run-id>/evidence/logs/`. It may not edit any phase artifact, `00-worktree.md`, `STATE.md`,
`DECISIONS.md`, the memory plane, or any locked document. It may not create commits; push; switch, create or
rebase branches; reset history; install or remove dependencies; edit `package.json` or lockfiles; or start, stop
or restart any runtime, vendor or dev server. If an owned file is already modified, or the work needs a file it
does not own, the implementer stops and reports the blocker instead of editing around it. Its final message lists
every file it created or modified by path, plus any file it read that the bundle did not name. The controller
treats the claimed file list as a claim and re-derives the real list from the working tree.

### Rejection and repair loop

A delegated result is not accepted when the subagent returns `Audit: FAIL` or no verdict, when its action record
cannot be populated without guessing, when it edited a file outside its ownership, when controller verification
contradicts any claim, or when routed work returns `success: false` or a nonzero exit code. In every case the
controller preserves the attempt under `/.recursive/run/<run-id>/evidence/retries/<role>-<task>-attempt-NN.md`
with the diagnostic evidence; re-dispatches the same role with a concrete fix list and a new attempt number when
the defect is inside that subagent's bounded ownership; repairs in its own phase and re-dispatches when it is not
(a read-only auditor cannot repair product code); records the acceptance decision, the failed attempt and the
fallback reason under `## Subagent Contribution Verification` in the phase artifact; and only then may the
phase's `Audit: PASS`, `Coverage: PASS` and `Approval: PASS` be recorded.

Rules this plan keeps: one active phase at a time; parallel work only inside the active phase and only within a
wave whose frozen ownership matrix is disjoint; a sub-phase sharing a file with another sub-phase is serialized;
every dispatch carries the eleven-item bundle or an explicit "not delegated" note; and no subagent may touch
`main`/`stage` or any document outside its write scope.

## Controller verification of delegated work

No delegated result is accepted on its own word. For every delegated task the controller:

1. confirms the dispatch carried the complete eleven-item bundle and that the phase was the single active phase;
2. confirms the action record names the upstream artifacts, addenda, memory refs, control-plane docs and review
   bundle the subagent was given, then spot-checks at least one claimed read against the actual artifact;
3. confirms the action record's `Current Artifact` still matches the artifact hash the subagent reviewed; if the
   artifact changed materially after the review, the record and the bundle are refreshed before the result is
   relied on for lockable evidence;
4. verifies the claim against the actual worktree: re-reads the named files, re-runs the named RED and GREEN
   commands, inspects the RED artefact to confirm the test failed before the implementation existed, diffs the
   claimed scope against the recorded diff basis, checks that every edited file is inside the wave's ownership
   matrix, and reconciles the claims against the relevant locked recursive artifacts as well as the working tree
   (beyond the skill checklist);
5. for implementation waves, checks the `R15` primitive map against the changed Effect code (bare `effect`
   imports, no relative `vendor/**` imports, the mapped primitive owns the concern it was assigned, no per-request
   `Effect.runPromise`), and rejects an unmapped or hand-rolled substitute (beyond the skill checklist);
6. requires audit and review outputs to carry requirement/plan alignment comments, not only a verdict;
7. rejects any output that lacks a verdict, cites no changed files, ignores addenda, cannot become a durable
   action record, or whose record is `none everywhere` for materially contributing work;
8. records the wave's acceptance before the next wave starts, and re-runs the affected suites once all waves in a
   batch are accepted (beyond the skill checklist);
9. repairs in-scope gaps itself, refreshes the bundle and the action record when repairs change reviewed scope,
   and re-dispatches the same role before accepting;
10. records `Reviewed Action Records`, `Main-Agent Verification Performed`, `Acceptance Decision`,
    `Refresh Handling` and `Repair Performed After Verification` in the phase artifact, and refuses to record
    `Audit: PASS`, `Coverage: PASS` or `Approval: PASS` while any delegated result from that phase is unresolved.

## Requirement-to-task traceability

| Requirement | Phase 1 task | Sub-phase | Delegated verification |
| --- | --- | --- | --- |
| `R1` | `T1.2a`, `T1.2b` | `SP1` | `code-reviewer-sp1` + Phase 3.5 |
| `R2` | `T1.2a` | `SP2` | `code-reviewer-sp2` |
| `R3` | `T1.2c` | `SP3` | `code-reviewer-sp3` + live check |
| `R4` | `T1.2c` | `SP3` | Phase 3.5 |
| `R5` | `T1.2b`, `T1.2c` | `SP3` | `code-reviewer-sp3` |
| `R6` | `T1.2d` | `SP4` | `code-reviewer-sp4` + live check |
| `R7` | `T1.2e` | `SP5` | `code-reviewer-sp5` |
| `R8` | `T1.2e` | `SP5` | Phase 3.5 + live window |
| `R9` | `T1.2a`, `T1.2e` | `SP6` | `code-reviewer-sp6` |
| `R10` | `T1.2f` | `SP7` | live measurement |
| `R11` | `T1.2i` | `SP8` | private CI |
| `R12` | process requirement; `T1.3` records the prior TDD evidence | Phase 3 TDD log | `tester-t4-audit` |
| `R13` | `T1.2a`-`T1.2h` | Phase 5 | `tester-t5-matrix` + `tester-t5-monitor` + controller acceptance |
| `R14` | `T1.2g` | `SP9` | `code-reviewer-sp9` + live metric check in Phase 5 |
| `R15` | `T1.2h` | All `SP1`-`SP9` (cross-cutting) + `T2.5` audit | `code-reviewer-perWave` primitive-map check + `tester-t4-audit` |

## Coverage Gate

- [x] Every finding maps to at least one requirement
- [x] Every requirement has observable acceptance criteria and a stated verification method
- [x] TDD discipline and Phase 5 live verification are explicit requirements (`R12`, `R13`)
- [x] Effect-first implementation is an explicit requirement with a named primitive map and deviation rule (`R15`)
- [x] Extensibility is explicit (the drift guard and lineage modelling in `R3`/`R4`)
- [x] Every requirement is broken into phases, tasks and sub-phases with stable ids and handoff fields
- [x] The delegation plan names the parallel subagent waves, file ownership and the controller verification protocol
- [x] Out-of-scope items, constraints and assumptions are recorded

Coverage: PASS

## Approval Gate

- [x] Operator approves this requirement set before the run is created and Phase 1 begins

Approval: PASS

Approval basis: the operator reviewed the run-103 follow-up findings, instructed this run to be created with the
scope above, required Effect-first implementation with named primitives, strict TDD, rebuilt-runtime verification
with live pi-CLI requests, and parallel subagents under controller verification, and approved the audited draft in
this thread. The four audit reports were verified before their findings were applied; the requirement set was not
widened beyond the approved scope.
