Run: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/`
Phase: `01 AS-IS`
Status: `LOCKED`
LockedAt: `2026-10-01T08:32:58Z`
LockHash: `44438f2d4e8ac7b39b0eb5cd1dc9000a5340b5406cbb0ce502dada99c808d512`
Inputs:
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/00-requirements.md` (LOCKED, hash `ff9fe4a6`)
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/00-worktree.md` (LOCKED, public baseline `84d5996c`,
  private baseline `5df90b6d`)
- Analyst drafts: `evidence/other/as-is/replay-catalog.md`, `evidence/other/as-is/learner-conformance.md`
  (Phase 1 wave 1, in flight at draft time)
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/addenda/00-requirements.post-lock-conformance-field-count.addendum-01.md`
  (corrects the `R11` premise after measurement against the pinned baseline)
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/addenda/00-requirements.post-lock-catalog-lineage.addendum-02.md`
  (corrects the `R3` lineage premise)
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/addenda/00-requirements.post-lock-benchmark-value.addendum-03.md`
  (corrects the `R14` "benchmark is never written" clause)
Outputs:
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/01-as-is.md`
Scope note: This document captures current behavior and evidence before changes.

## TODO

- [x] Read and understand requirements from Phase 1
- [x] Read and understand requirements from Phase 0
- [x] Create novice-runnable reproduction steps
- [x] Document current behavior for each requirement (R1, R2, ...)
- [x] Identify and record relevant code pointers
- [x] List known unknowns
- [x] Gather evidence (logs, screenshots, outputs)
- [x] Review relevant prior recursive evidence for the affected area
- [x] Assemble audit context bundle
- [x] Run phase audit
- [x] Repair gaps and re-audit until `Audit: PASS`
- [x] Create traceability mapping
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Reproduction Steps (Novice-Runnable)

1. Start from the Phase 0 worktree (`D:\DEV\role-model\.worktrees\104-replay-eligibility-and-evidence-fidelity`,
   branch `recursive/104-replay-eligibility-and-evidence-fidelity`, baseline `84d5996c`).
2. Reproduce the replay-eligibility defect from durable evidence: `E:\tmp\run103-evidence\stage-monitor-30m.log`
   (44 samples, 106 requests, 10 failures, `no_eligible_target` on image-bearing `replay-req-*`) and the live
   `replay.disposition` plane ending at 5 delayed / 7 failed.
3. Reproduce the traffic-class defect read-only:
   `GET http://127.0.0.1:3457/api/role-model/telemetry/requests?limit=500` -> every record reports
   `requestClass = "live_request"`, including `replay-req-*` and `bench-*`.
4. Reproduce the private conformance defect: in the private worktree,
   `node --test tests/track-b/run99-policy-consumers.test.mjs` -> exactly two published
   activation-policy fields with no consumer (`perArmOutputEvidence`, `perArmOutputExclusionBound`), per
   `addenda/00-requirements.post-lock-conformance-field-count.addendum-01.md`.
5. Reproduce the learner-gate readback gap on a quiet runtime (deferred: the `:3457` learning endpoints timed out
   under the operator's benchmark load during preparation - see `R10`).

## Current Behavior by Requirement

- `R1`: `selectReplayCandidates` (`track-b-replay-policy.ts:296`) filters without consulting modalities or
  capabilities; both call sites (`cli.ts:7772`, `track-b-auto-replay.ts:979`) can therefore plan an image-bearing
  capture against a text-only endpoint, and the router later rejects it as `MODALITY_UNSUPPORTED`
  (`packages/core/src/router.ts:1436`).
- `R2`: a replay that no endpoint can serve is dispatched and fails as a provider/router error; the refusal
  vocabulary has no named class for "no eligible arm" beyond the existing codes, and `replay.disposition`
  accumulates delayed/failed rows (5/7 at the end of the run-103 monitor window).
- `R3`: `deepseek/deepseek-v4-flash` is a deprecated alias served by `deepseek/deepseek-v4.1-flash`
  (upstream `models.dev@67dcd8c9`), which declares `input = ["text","image"]`; the pinned local supplement still
  declares flash as text-only, so image-bearing requests cannot select it.
- `R4`: nothing fails a test when an alias's modalities disagree with its declared base model, and the local
  overrides path cannot express `modalities`.
- `R5`: `attachment = true` upstream is not a PDF claim; the router's PDF eligibility follows the `pdf` modality,
  and no DeepSeek entry declares `pdf`.
- `R6`: `buildRequestClassification` (`runtime-host-bridge/src/index.ts:8148`) records the role and taxonomy
  version but has no task-family fallback, so captures read back with `taxonomyTaskType` present in telemetry but
  `taskTypeId: null` in the learning rows.
- `R7`: the profile-learner computes `floors` (`minDecisiveComparisons`, `minHoldoutComparisons`,
  `minDistinctCaptures`) and `holdoutPassed` (`extensions/profile-learner/index.mjs:797-826`), but the operator
  learning readback drops the floor (`learnerEvidence.floor` reads null) and the Learning surface shows no
  progress against it.
- `R8`: comparisons can remain unfinalized, so `learner.promote` fails with
  `candidate_not_validatable: no finalized comparison was available to validate`, and the `replay.disposition`
  plane parks work without a terminal reason.
- `R9`: `judgeOrderPolicy` is already carried in the comparability key (`track-b-runtime.ts:8771-8773`,
  `cli.ts:2356-2362`) and validated by the private evaluator (`evaluation-core/index.mjs:1684-1691`); the open
  question is whether the live luna-vs-sol arms are effort-matched and whether the comparability dimensions reach
  the validation receipt's family evidence.
- `R10`: the private sidecar degrades under load - `contribution upload degraded ... timed out after 5000ms`
  lines in the live-appending `stage-3457.err.log`: 120 when the requirement was drafted, 337 when Phase 1
  measured it, 78% of them from live `req-*` traffic (264), then 43 `replay-req-*`, 24 `bench-*`, 6
  `replay-judge-*`. The learning endpoints also timed out during preparation.
- `R11`: at the pinned private baseline `5df90b6d`, the run-99 conformance check (item 33) fails on exactly **two** published
  activation-policy fields with no runtime consumer - `perArmOutputEvidence` and `perArmOutputExclusionBound`;
  the `KNOWN_UNWIRED` ratchet is empty and shrink-only, so only wire-or-remove is valid. The 24-field figure in
  the locked requirement came from the stale controller checkout `06c61411` (an ancestor of the pinned baseline)
  and is corrected by `00-requirements.post-lock-conformance-field-count.addendum-01.md`.
- `R12`: no TDD log exists yet for this run (Phase 3 obligation).
- `R13`: not yet run (Phase 5 obligation); the run-103 artefacts it mirrors are
  `runtime:package-sea` + live pi CLI + the 30-minute monitor (`E:\tmp\run103-evidence\monitor-stage-30.ps1`).
- `R14`: `request_class` exists on telemetry and observations, but every producer stamps `live_request`
  (`runtime-observability/src/index.ts:712`, `runtime-host-bridge/src/index.ts:20140`, `:27574`), the vocabulary
  is `benchmark | live_request | unknown`, the unfiltered summary path has no class predicate
  (`sqlite-memory/src/index.ts:5945` -> `:5963` -> `:6070`), `filterTelemetryRequestRecords` has no class filter,
  and `buildDashboardLatestRequestRows` falls back to all rows when no non-benchmark row exists.
- `R15`: no primitive map exists yet; the landed queue planes are `PersistedQueue`-based
  (`queue-runtime/{queues,evaluation,learner,store}.ts` import `effect/unstable/persistence`), the bridge has no
  `effect-mq` import, and the vendored pins are `effect@4.0.0-rc.117` / `effect-mq` with the dependency-closure
  build required before bridge lanes.

## Relevant Code Pointers

## Source Requirement Inventory

Task `T1.1`. One entry per requirement, with the source finding, a normalized summary and the AS-IS disposition.

- R1 | Source Quote: Replay candidate eligibility mirrors the router | Summary: replay arms must pass the router's capability/modality rules; AS-IS in `T1.2a`/`T1.2b` (no modality input exists in `selectReplayCandidates`) | Disposition: in-scope
- R2 | Source Quote: Named replay refusal semantics | Summary: name the refusal class and stop dispatching unservable replays; AS-IS in `T1.2a` (dispatch error, not a replay code) and the queue-stall section (26/26 deferred) | Disposition: in-scope
- R3 | Source Quote: Model lineage and modality metadata for the DeepSeek flash line | Summary: the catalog must describe the model that actually serves the id; premise corrected by addendum-02 | Disposition: in-scope
- R4 | Source Quote: Catalog drift guard for alias and base modalities | Summary: fail a test when an alias disagrees with its base; AS-IS in `T1.2c` (overrides cannot set modalities) | Disposition: in-scope
- R5 | Source Quote: PDF and attachment modality policy | Summary: PDF eligibility follows the `pdf` modality exactly; AS-IS in `T1.2b` | Disposition: in-scope
- R6 | Source Quote: Taxonomy fidelity into captures, observations and learning rows | Summary: carry the task family through all capture paths; AS-IS in `T1.2d` (no fallback; the observation bundle has no `classification` object) | Disposition: in-scope
- R7 | Source Quote: Promotion-gate visibility | Summary: show the counts and the policy floor; AS-IS in `T1.2e` (producer computes floors, the readback projects none) | Disposition: in-scope
- R8 | Source Quote: Learner validation unblock | Summary: finalize comparisons so candidates can be validated; AS-IS in `T1.2e` and the queue-stall section (evaluation/learner starved since 02:19) | Disposition: in-scope
- R9 | Source Quote: Arm comparability: effort match and judge-order evidence | Summary: do not confound capability with effort variants; AS-IS in `T1.2e` (`judgeOrderPolicy` already in the key; effort matching open) | Disposition: in-scope
- R10 | Source Quote: Sidecar robustness under replay load | Summary: background work must not starve readbacks or drop uploads; AS-IS in `T1.2f` and the queue-stall section | Disposition: in-scope
- R11 | Source Quote: Private conformance unblocker | Summary: every published activation-policy field needs a consumer; premise corrected to two fields by addendum-01; AS-IS in `T1.2i` | Disposition: in-scope
- R12 | Source Quote: Strict TDD for every behaviour change | Summary: RED/GREEN evidence per cycle; Phase 3 obligation | Disposition: quality-gate
- R13 | Source Quote: Phase 5 live verification of the rebuilt runtime | Summary: packaged rebuild plus live pi-CLI verification and a monitored window; Phase 5 obligation | Disposition: quality-gate
- R14 | Source Quote: Traffic classes and aggregate hygiene | Summary: type the traffic classes and keep them out of live aggregates; AS-IS in `T1.2g`; premise corrected by addendum-03 | Disposition: in-scope
- R15 | Source Quote: Effect-first implementation with a run-specific primitive map | Summary: use the vendored Effect runtime with a mechanical primitive map; AS-IS in `T1.2h` | Disposition: in-scope

- `role-model-router/apps/runtime-host-bridge/src/track-b-replay-policy.ts` - replay admission and candidate
  selection (`selectReplayCandidates`, the refusal-code list).
- `role-model-router/apps/runtime-host-bridge/src/cli.ts`, `track-b-auto-replay.ts` - the two replay planning call
  sites.
- `role-model-router/packages/core/src/router.ts` - `supportsCapabilityRequirement` and the
  `MODALITY_UNSUPPORTED` comparison (single source of truth to import).
- `role-model-router/packages/catalog/src/*`, `testdata/catalog/*` - catalog export, supplement and overrides path.
- `role-model-router/apps/runtime-host-bridge/src/index.ts` - classification, telemetry summary/analytics builders,
  hardcoded `requestClass` writers.
- `role-model-router/packages/sqlite-memory/src/index.ts` - `request_class` columns and backfill,
  `telemetryWindowWhere`, `readRuntimeTelemetryAggregateFromDatabase`, observed-data queries.
- `role-model-router/packages/runtime-observability/src/index.ts` - observation sample builder.
- `role-model-router/apps/runtime-ui/app/lib/view-models.ts`, `sidebar-footer.ts` - Observe/Overview aggregation and
  latest-request sampling.
- Private: `scripts/track-b/runtime-operations-server.mjs`, `extensions/profile-learner/index.mjs`,
  `extensions/evaluation-core/index.mjs`, `tests/track-b/run99-policy-consumers.test.mjs`.

## Detailed AS-IS by Task (T1.1-T1.2i)

Wave 1 analyst drafts are the primary evidence:
`evidence/other/as-is/replay-catalog.md` (T1.2a-c) and `evidence/other/as-is/learner-conformance.md` (T1.2d/e/i).
Wave 2 covers T1.2f-h.

### `T1.2a` Replay selection path (wave 1)

- `selectReplayCandidates` lives at `track-b-replay-policy.ts:296-356` and filters only on configured ids,
  dedupe, `excludedEndpointIds`, `sourceEndpointId` and `healthyEndpointIds`, then orders by
  `sha256(rotationKey + id)` and truncates to a cap of 3 (`:240`). Neither the function nor its input types
  (`:121-155`) carry modality, capability, attachment or content input.
- Call sites: `cli.ts:7772` (on-demand) and `track-b-auto-replay.ts:979` (durable tick).
- `REPLAY_REFUSAL_CODES` (`:12-117`) is a closed 25-code list; `decideReplayAdmission` (`:161-238`) produces the
  first twelve, including `benchmark_source_not_replayable` (`:186`) and `synthetic_probe_not_replayable`
  (`:198`); the tick adds `judge_candidate_overlap` (`track-b-auto-replay.ts:968-978`).
- `no_eligible_target` is **not** a replay refusal code. It is the router/bridge dispatch error
  (`runtime-host-bridge/src/index.ts:9008-9009`, `:26590`) classified in `contribution-outcome.ts:37`, which is
  why the run-103 monitor failures surfaced as provider-side dispatch failures rather than replay refusals.

### `T1.2b` Router eligibility rules (wave 1)

- `supportsCapabilityRequirement` is exported at `packages/core/src/router.ts:549` and consumed at `:1130`,
  `:1420-1426`, `:1470-1478`.
- The modality rule is at `:1434-1440`: every required modality must be present in
  `candidate.declared.modalities`, otherwise `MODALITY_UNSUPPORTED`.
- The exclusion-reason vocabulary is the closed `toCandidateExclusion` map at `:1240-1273`, which already
  contains both `MODALITY_UNSUPPORTED` and `CAPABILITY_MISSING`; the replay path can import both instead of
  restating them.
- `R5` evidence (controller-verified 2026-10-01): the router has no `pdf`-specific branch - PDF eligibility is
  the same generic modality rule (`router.ts:1439` requires every required modality, `pdf` included, to be in
  `candidate.declared.modalities`). In `packages/catalog/data/normalized-catalog.json`, **zero** models carry an
  `attachment` field (it does not reach the local catalog), 1 436 models declare the `pdf` modality, and **none
  of them is a `deepseek/*` first-party entry** (seven proxied third-party DeepSeek-model ids under
  `google-vertex/*` and `nano-gpt/*` do declare `pdf`) - `deepseek/deepseek-flash` (`["image","text"]`),
  `deepseek/deepseek-v4-flash` (`["text"]`) and `deepseek/deepseek-v4-pro` (`["text"]`) are all pdf-free.

### `T1.2c` Catalog and registry modality path (wave 1)

- The export path is `testdata/catalog/{snapshot,supplement,overrides,prices}` -> `refresh.ts:309`/`:425`
  (modality union) -> `packages/catalog/src/index.ts:545-572` (normalize/build; alias-base inheritance already at
  `:476`) -> `packages/catalog/data/normalized-catalog.json` + `vendor-version-ledger.json` -> endpoint registry ->
  `router.ts:1436`.
- Local values: `deepseek/deepseek-v4-flash` = `["text"]` (`localOverrideApplied`),
  `deepseek/deepseek-flash` = `["image","text"]` (the id the runtime actually calls),
  `deepseek/deepseek-v4-pro` = `["text"]`. No `deepseek/deepseek-v4.1-flash` entry exists locally, and the pinned
  upstream commit is older than the `67dcd8c9` cited in the requirement.
- The overrides path cannot express modalities: `ModelOverride` is `{ capabilities?, localNotes? }`
  (`index.ts:93-96`), and the build takes capabilities from the override while modalities come from the resolved
  model (`:557` vs `:559`).
- Commands: `catalog:export` = `corepack pnpm --filter @role-model-router/catalog exec tsx src/cli.ts`;
  `catalog:refresh` = `... exec tsx src/refresh.ts` (root `package.json:26-27`).

### `T1.2d` Capture classification path (wave 1)

- `buildRequestClassification` (`runtime-host-bridge/src/index.ts:8148`) accepts an optional declared
  `taskTypeId` and performs no fallback: the value survives only when it is a known taxonomy id
  (`:8169-8177`), and the builder returns `null` only when task, role, version and tool classes are all absent
  (`:8172`).
- Controller-verified capture paths (the analyst draft listed three; there are four distinct paths):
  `:26519` routed-answer capture and `:27510` failed-request capture pass
  `taskTypeId: plan.routingRequest.taskType ?? null` with the role's three-step fallback
  (`requestedRoleId` -> `plan.taxonomyIdentity?.roleId` -> intent role); `:28329` is the **observation bundle**,
  which carries only the bare spread `...(plan.routingRequest.taskType ? { taskTypeId: ... } : {})` plus
  `taxonomyVersion` and **no `classification` object**; `:28368`/`:28376` is the supervised-replay
  `routeCapturePayload`, which carries both the bare spread and a `classification: buildRequestClassification({...})`.
- The resolved identity the task ignores is real: `buildBridgeTaxonomyIdentity` (`:10318`) falls back to
  `"text.chat"` for the task (`:10333-10334`) and to `task?.primaryRole ?? "writer"` for the role
  (`:10341-10347`).
- Consequence: when `routingRequest.taskType` is absent, the record is kept (role/version populate it) and
  telemetry shows `taxonomyTaskType` (`:23767`) while the learning rows carry `taskTypeId: null`.

### `T1.2e` Learner and validation path (wave 1)

- Private `extensions/profile-learner/index.mjs`: default floors `minDecisiveComparisons: 3`,
  `minHoldoutComparisons: 1`, `minDistinctCaptures: 3` (`:29-31`); `floors` assembled at `:726`; the gate fails
  on `insufficient_decisive_evidence` / `missing_holdout` / `insufficient_distinct_captures` (`:797-799`);
  `holdoutPassed` attached at `:813`; the yield report returns `floors` at `:826`; the receipt gate at `:673`
  throws when `holdoutPassed` is absent.
- Private `scripts/track-b/runtime-operations-server.mjs`: `withReceiptReadings` (`:1993-2012`) is the only
  place a receipt reaches a learning row, and it projects exactly `verdict`, `validationRef`, `qualityDelta`,
  `claim`, `counts` (comparisons/decisive/holdout) and `countsState`. No floor field is projected anywhere in
  the file, which is why a consumer reads null.
- Finalization boundary: private `extensions/evaluation-core/index.mjs` inserts the group with
  `status: "finalized"` (`:3759`), guards idempotency/conflict (`:3775-3777`), inserts inside
  `BEGIN IMMEDIATE`/`COMMIT` (`:3782`) and completes covered parent jobs (`:3789-3793`); a job with no finalized
  group is named `evaluation_job_stranded_without_finalized_comparison` (`:723`).
- `candidate_not_validatable` is produced on the **public** side: `cli.ts:1842-1851` constructs it and `:7442`
  throws it; the private side parks the same work as a stranded job.

### `T1.2i` Private conformance path (wave 1)

- `node --test tests/track-b/run99-policy-consumers.test.mjs` at the pinned baseline fails on exactly two
  fields: `perArmOutputEvidence` and `perArmOutputExclusionBound`.
- Both fields are documented run-100 behaviours (`docs/route-learning/shadow-to-active.md:144-145`) and covered
  by `tests/track-b/run100-policy-bounds.test.mjs:22-38`, but no consumer in `extensions`, `shared`, `scripts`,
  `cloud` or the public `role-model-router/apps` tree reads them; `runtime-ui` rendering explicitly does not
  count (`tests/.../run99-policy-consumers.test.mjs:40`).
- Ratchet: `KNOWN_UNWIRED = new Set([])` (`:33`), the assertion is `deepEqual(unwired, [])` (`:110-118`), and
  fields are counted across the consumer roots above, so only wire-or-remove satisfies it.

### `T1.2f`-`T1.2h` Sidecar budget, traffic-class path and Effect wiring (wave 2)

Wave 2 draft: `evidence/other/as-is/sidecar-traffic-effect.md`.

### `T1.2f` Sidecar budget path (wave 2)

- The degradation line is emitted only at `track-b-runtime.ts:11844-11846`, wrapping
  `recordContribution({...})` (`:11822-11834`) inside `runTrackBPostObservationWithContribution`
  (`:11780`); production wiring is `cli.ts:7542-7547`.
- The budget constant is `DEFAULT_CONTRIBUTION_AGGREGATE_TIMEOUT_MS = 5_000`
  (`track-b-operations.ts:877`), applied via `Math.min(operationsTimeoutMs, 5_000)` (`:1487-1490`) to
  the `POST /contribution/aggregate` invoke (`:2745-2753`); the fetch uses
  `AbortSignal.timeout(timeoutMs)` (`:997`) and converts a timeout into
  `TrackBPrivateOperationError 504 ... timed out after ${timeoutMs}ms` (`:1004-1008`). Timeouts are
  deliberately not retried (`:990-991`), so it is one 5 s window per invoke, host-side.
- The private extension-host per-invoke budget defaults to 60 s
  (`shared/runtime/extension-host-tuning.mjs:21`) - an order of magnitude above the host cap - and the
  finalized-store sweep is bounded and resumable (`extensions/evaluation-core/index.mjs:3238-3331`,
  `retroFinalizeComparisons`: 32 per call, 500 holdouts, 8 jobs per holdout).
- **Time-varying evidence (controller-verified):** the stage error log is live-appending. It held 120
  degradation lines when the requirement was drafted and **337** when the wave-2 draft measured it, all
  `TrackBPrivateOperationError ... timed out after 5000ms`. By id family: 264 `req-*` (live), 43
  `replay-req-*`, 24 `bench-*`, 6 `replay-judge-*`. Live traffic dominates the degradation, so a fix
  scoped to the replay lane alone would leave the majority of the observed failures in place.

### `T1.2g` Traffic-class path (wave 2)

- Columns and backfill: `runtime_observations.request_class` added by the metadata column set
  (`sqlite-memory/src/index.ts:1460-1470`); `runtime_telemetry_records.request_class` at `:422` and
  `:1531`; backfill A derives it from
  `$.observedPerformance.sample.source_type` (`:1471-1490`); backfill B copies it from the observation
  by request id (`:1630-1644`).
- Today's vocabulary is exactly three values (`:1004`, `:4891`, `:2846`):
  `"benchmark" | "live_request" | "unknown" | null`. There is no `live`, `replay`, `evaluation` or
  `probe` value.
- Hardcoded stamps (complete): `index.ts:20140` (failure telemetry) and `:27574` (success telemetry),
  both `live_request`. The joins default to `"unknown"` (`index.ts:24645`, `:24736`;
  `sqlite-memory/src/index.ts:3377`).
- **The benchmark stamp stops before the telemetry record.** `benchmark-runner.ts:91` already declares
  `executionTrafficClass?: "live" | "benchmark" | "health" | "synthetic"` and sets `"benchmark"` at
  `:100` for its dispatch, and its sample carries `source_type: "benchmark"` (`:1486`) into
  `observed_performance_samples` (`sqlite-memory/src/index.ts:4430-4445`) and the observation row
  (`:4726-4730`). Nothing in the telemetry write path reads `executionTrafficClass`; the same
  request's `runtime_telemetry_records` row is the literal `live_request`. The two tables can
  therefore disagree about the same request's class.
- Observed-data queries already filter live-only: `sqlite-memory/src/index.ts:5404-5410` (taxonomy
  success profile) and `:5501-5509` (latency/token sample). The summary path
  (`telemetryWindowWhere` `:5945-5961` -> `readRuntimeTelemetryAggregateFromDatabase` `:5963-5988` ->
  `readRuntimeTelemetrySummary` `:6070`) filters only `source_type` (`"local" | "remote"`), never
  `request_class`, so counts, success/failure, tokens, costs, cache counts and latency sums all mix
  classes.
- Operator surfaces that mix classes: the summary panel (`runtime-ui/app/lib/view-models.ts:992-998`)
  and the sidebar latest-request cache-hit rate (`sidebar-footer.ts:164-179`, no class predicate).
  `view-models.ts:1243` is the only class-aware surface (`rows.filter(row => row.requestClass !==
  "benchmark")`) and it falls back to all rows when no live row exists (`:1244`).
- `filterTelemetryRequestRecords` (`index.ts:24390+`) has no class dimension: its filters are
  `sourceTypes`, `endpointIds`, `modelIds`, `reasoningEfforts`, `effortSources`, `providerIds`, and the
  taxonomy/provider/difficulty families - `requestClass` is carried (`:24645`, `:24736`) but never
  filtered.

### `T1.2h` Effect wiring and primitives (wave 2)

- Wrapper packages: `role-model-router/packages/effect` (`effect`, re-exporting
  `vendor/effect` `effect@4.0.0-rc.117`), `packages/effect-mq` (`effect-mq` v0.7.0,
  `peerDependencies: effect: workspace:*`), and `packages/sql-sqlite-node`
  (`@effect/sql-sqlite-node`, same peer dependency).
- Bridge files importing `effect`: `queue-runtime/{index,evaluation,learner,queues,store,workers}.ts`,
  `scoring-strategy.ts`, `track-b-auto-replay-runtime.ts`, `unified-runtime-config.ts`. The queue planes
  use `PersistedQueue` (`queues.ts:54`, `learner.ts:60/:69`, `evaluation.ts:73`, `store.ts:114/:143/:211`)
  with one `ManagedRuntime` per plane (`index.ts:156`, `:276`, `:389`).
- **No source file imports `effect-mq`** - verified across the repo (only AGENTS/docs/vendor/package.json
  mention it), even though the bridge declares it as a dependency.
- `runtime:package-sea` and `runtime:validate-packaging` exist at the root (`package.json:30-31`); the
  root gate builds `@role-model-router/runtime-host-bridge...` (package plus workspace dependencies), and
  the bridge's own test scripts prefix with `--filter effect build`. The exact clean-checkout failure of a
  bare bridge build was not reproduced in the box.
- Dependency boundary: the bridge declares `effect`, `effect-mq` and `@effect/sql-sqlite-node`;
  `@role-model-router/core`, `sqlite-memory` and `runtime-observability` declare none of them.

### Queue stall: replay, evaluation and learner (operator report, live 3457 data)

The operator reported (screenshot, 2026-10-01 ~15:5x local): Replay 162 in window / last 1m, Evaluation 12 /
last 5h, Learner 18 / last 5h, 48 of 300 dispatches used, counterfactuals 0/100, derived dispatches 0%, and four
recent replay events all `Deferred` with HTTP 409s. The controller queried the stage state stores read-only
(copies under `%TEMP%\rm104-queues`, stage root
`%LOCALAPPDATA%\role-model-runtime-stage\standalone-runtime-stage`); the queues operator endpoint itself timed
out after 60 s during the probe - itself `R10` evidence.

**`track-b/replay-disposition.sqlite` -> `replay_dispositions`:** 26 rows, **26/26 `outcome = deferred`** - not
one terminal outcome. Latest rows:

| time (UTC) | outcome | refusal_code | detail |
| --- | --- | --- | --- |
| 07:44:18 | deferred | `replay_failed` | `replay endpoint HTTP 409: {"error":"private Track B operation failed with 408"}` |
| 07:31:43 | deferred | `replay_failed` | `durable replay state is queued` |
| 07:16:55 | deferred | `replay_branch_append_unavailable` | `replay endpoint HTTP 409: {"error":"durable replay branch append has no host dispatch receipt"}` |
| 07:02:47 | deferred | `replay_failed` | `durable replay state is queued` |
| 06:25:35 | deferred | `replay_failed` | `durable replay state is queued` |
| 06:06:19 | deferred | `replay_failed` | `... replay provider resource budget is exhausted` |
| 04:43:27 | deferred | `replay_failed` | `... current replay job lease is required for dispatch` |
| 02:18:29 | deferred | `replay_failed` | `durable replay state is awaiting_evaluation` |

Note the contradiction: rows whose refusal code is `replay_failed` still carry `outcome = deferred`, so the
disposition plane never retires them terminally.

**`track-b/queues/queues.sqlite` -> `effect_queue`:** the replay plane is busy; the evaluation and learner planes
are **empty, not blocked**:

| queue | state | rows | attempts | last activity |
| --- | --- | --- | --- | --- |
| `replay.dispatch` | completed | 162 | 170 | 07:48:15 |
| `replay.dispatch` | pending | 1 | 1 | 07:49:23 |
| `evaluation.score` | completed | 12 | 12 | **02:19:48** |
| `learner.derive` | completed | 18 | 18 | **02:19:49** |
| `learner.promote` | completed | 11 | 11 | **02:19:50** |
| `learner.promote` | failed | 1 | 3 | 02:01:07 |

One `replay.dispatch` row carries `TimeoutError: Operation timed out after '10m'` after 2 attempts.

**Worker-output stores (`durable_extension_outputs`, `created_at`):**

- `replay-core`: active - `replay:expire-stale-jobs` (227, last 07:44:18), `replay:plan-graph` (149, last
  07:43:00), `replay:create-job` (11, last 07:29:46), `replay:claim-job` (7, last 07:24:53).
- `profile-learner`: **no real output since `profile:estimate-finalized-evaluation` at 02:19:49** (342 min
  before the probe); since then only `health:probe` (379 rows).
- `evaluation-core`: alive and polling - `evaluation:list-groups` every ~30 s (285 calls, **293,159-byte
  responses**, last 07:55:32) and `evaluation:get-job` (7, last 07:48:51) - but no scoring work since 02:19.

**Capture path:** `capture-queue.sqlite` holds one pending capture (1.7 MB payload, `enqueued_at` 07:55:21,
attempts 0) and one degradation receipt `capture_persist_failed` / `dropped_rich_payload` at 01:50:13.

Implication (`R2`, `R8`, `R10`): the stall is at the **replay -> evaluation handoff**. Replay dispatch keeps
completing queue items, but every replay job ends `deferred` (queued state, missing host dispatch receipt,
stale lease, exhausted provider budget, or a private-side 408), so no replay ever becomes evaluation-ready; the
evaluation and learner queues are starved rather than wedged, and their workers are alive but idle for ~5.7 h.
The 293 KB `evaluation:list-groups` poll every 30 s plus the 120-337 contribution-upload degradations are
probable contributors to the sidecar saturation in `R10`.

**Code-level path (subagent `as104_queue_stall` draft `queue-stall.md`, controller-verified citations):**

- The operator panel is fed by `GET /api/role-model/operator/learning/activity` (`learning.tsx:797-798` ->
  `learning-api.ts:218-229` -> `LearningLivePanelView` in `learning-live-panel.tsx:126`), not by
  `/operator/queues`; **both operator endpoints hung (>90 s) while `/telemetry/requests` answered in 28 ms**,
  so the panel's numbers are unreachable live and the operator's screenshot is the last good read.
- `"Deferred"` is not a decision: the private classifier marks any detail matching
  `/already leased|state is queued|is queued|job is queued|awaiting evaluation|concurrency budget is exhausted/i`
  as `inFlight` (`shared/capture/replay-disposition.mjs:46`), which keeps the disposition non-terminal.
- The private replay owner's terminal list is
  `complete | cancelled | cancelling | awaiting_evaluation | failed | timed_out`
  (`runtime-operations-server.mjs:3539`), but the evaluation handoff only runs when the seam is a function:
  `if (finalJob?.state === "awaiting_evaluation" && typeof handoffEvaluation === "function")`
  (`:3763-3764`, comment: "Evaluation handoff remains optional"). Run 103 already recorded that this private
  `handoffEvaluation` seam is inert, so a replay parked in `awaiting_evaluation` is terminal to the private
  owner and in-flight to the public classifier - and nothing ever enqueues the evaluation plane.
- The two 409 texts come from real code: `durable replay branch append has no host dispatch receipt` is thrown
  at `cli.ts:8322` and classified at `track-b-auto-replay.ts:755` (documented at `:358`); the wrapper
  `private Track B operation failed with ${status}` is `track-b-operations.ts:1029`.
- Unverified in the child's box (and still open): the literal producer of the private **408** status, and the
  production producer of the `durable replay state is queued` string (only test/incident references were found).

## Known Unknowns

- The full `replay.disposition` producer enum: `deferred` and `replay_failed` are confirmed in the private
  server (`runtime-operations-server.mjs:3152`, `:3498`, `:3515`, `:7199`), while
  `replay_job_not_ready_for_evaluation` is a **public bridge** code (`track-b-auto-replay.ts:376`, `:730`,
  `:773`; `track-b-replay-policy.ts:101`). The complete writer set is still open.
- Which catalog entry the runtime's `deepseek-flash` model actually resolves from, given that the local catalog has
  `deepseek/deepseek-flash` = `["image","text"]`, `deepseek/deepseek-v4-flash` = `["text"]`, and **no**
  `deepseek/deepseek-v4.1-flash` entry, and the pinned upstream commit is older than the `67dcd8c9` cited in
  `R3` (Phase 2 must reconcile the requirement with this).
- The upstream modality/pricing refresh scope for the DeepSeek flash entry beyond modalities.
- The full set of `perArmOutputEvidence` / `perArmOutputExclusionBound` consumers outside the conformance scan roots
  (the test scans `extensions`, `shared`, `scripts`, `cloud`, and the public `role-model-router/apps` tree).
- The registry-hydration hop (normalized catalog -> endpoint registry -> `candidate.declared.modalities`) was not
  read line by line (analyst draft `replay-catalog` unverified #2).
- The exact write site of `vendor-version-ledger.json` was inferred rather than read (`replay-catalog` #3).
- Whether `deepseek-v4-flash` is reachable through `difficulty.remote-only` in the live config was not re-read
  (`replay-catalog` #5).
- It was not proven that no later re-stamp of `executionTrafficClass` occurs inside `routeRuntimeRequest`
  (`sidecar-traffic-effect` #3).
- The per-model ranking and percentile surfaces were not read line by line; only the summary panel, the sidebar
  latest-request rate and `view-models.ts:1243` were verified (`sidecar-traffic-effect` #4).
- The private operations server's own HTTP request budget (the side that serves `/contribution/aggregate`) was
  not read (`sidecar-traffic-effect` #5).

## Evidence

- `E:\tmp\run103-evidence\stage-monitor-30m.log` - 44 samples, 106 requests, 10 failures, `no_eligible_target`
  dominant, `replay.disposition w=0 a=0 d=5 f=7`.
- `E:\tmp\run103-evidence\stage-3457.err.log` (live-appending; measured 120 lines at requirements time and 337 at
  Phase 1 time, all `TrackBPrivateOperationError ... timed out after 5000ms`; 264 live `req-*`, 43
  `replay-req-*`, 24 `bench-*`, 6 `replay-judge-*`); zero `replay.disposition` lines.
- Live readback (window timestamp: 2026-10-01 ~07:05Z, stage rc `stage-rc-14fce6cffcd1` on `:3457`): the 135
  most recent telemetry records all read `live_request` (47 replay/benchmark by id heuristic; mixed cache-hit
  51.9% vs 68.2% live-only). The endpoint is live and growing - at Phase 1 audit time (07:49Z) it returned 384
  records, still 100% `live_request`; the percentages above refer to the frozen 135-row window, not to "now".
- `node --test tests/track-b/run99-policy-consumers.test.mjs` (private worktree at the pinned baseline) -
  exactly two unconsumed fields: `perArmOutputEvidence`, `perArmOutputExclusionBound`; controller-reproduced and
  recorded in `addenda/00-requirements.post-lock-conformance-field-count.addendum-01.md`.
- Upstream `models.dev@67dcd8c9`: `models/deepseek/deepseek-v4.1-flash.toml` (`["text","image"]`),
  `providers/deepseek/models/deepseek-v4-flash.toml` (deprecated alias).

## Audit Context

Subagent Capability Probe: `spawn_agent` accepted five children; wave 1 delivered two drafts inside the box, wave 2 delivered, the queue-stall child delivered PARTIAL, and both audits delivered
Subagent Availability: available
Audit Execution Mode: subagent
Delegation Decision Basis: the operator instructed the run to use parallel subagents under controller verification; six read-only children were dispatched under the Codex protocol (brief-first, checkpointed deliverable, 15-minute box, concurrency <= 2 deep) and every result was controller-verified against the worktree or the live stores before acceptance
Audit Inputs Provided:
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/00-requirements.md` (LOCKED)
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/00-worktree.md` (LOCKED)
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/addenda/00-requirements.post-lock-conformance-field-count.addendum-01.md`
- `evidence/other/as-is/replay-catalog.md`, `evidence/other/as-is/learner-conformance.md`,
  `evidence/other/as-is/sidecar-traffic-effect.md`, `evidence/other/as-is/queue-stall.md`,
  `evidence/other/as-is/audit-as-is.md`, `evidence/other/as-is/audit-as-is-r2.md`
- `evidence/other/prior-evidence/prior-runs.md`
- Changed files: run-folder artifacts only (no product file touched)
- Targeted code references: the Relevant Code Pointers list above

## Effective Inputs Re-read

- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/00-requirements.md`
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/00-worktree.md`
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/addenda/00-requirements.post-lock-conformance-field-count.addendum-01.md`
- `evidence/other/as-is/replay-catalog.md`
- `evidence/other/as-is/learner-conformance.md`

## Prior Recursive Evidence Reviewed

Consolidated notes: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/other/prior-evidence/prior-runs.md`
(copied from the private memory plane and the prior run folders during Phase 1; the prior run folders themselves
live in their own worktrees).

- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/other/prior-evidence/prior-runs.md` (run 97 section; source `memory/domains/direct-track-b.md`)
  - Docs read: run folder summary + `memory/domains/direct-track-b.md` (run 97 section).
  - Reused insight: replay dispatch is idempotent by a durable dispatch key; durable background jobs must be
    terminal under failure (bounded expiration sweep); replay output is never a replay source.
  - Superseded or contradicted: nothing contradicted; run 104 adds the eligibility dimension run 97 did not cover.
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/other/prior-evidence/prior-runs.md` (run 98 section)
  - Docs read: `memory/domains/direct-track-b.md` (run 98 section).
  - Reused insight: versioned activation policy plus the promotion interval gate; public compatibility vocabulary
    must not expose an effective activation surface.
- Superseded or contradicted: the run-99 ratchet now enforces that every published policy field has a
  consumer - which the controller checkout's unpulled local `dev` (`06c61411`) violates with 24 fields; the
  run's pinned baseline (`5df90b6d`) violates it with two (see addendum-01).
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/other/prior-evidence/prior-runs.md` (run 100 section)
  - Docs read: `memory/domains/direct-track-b.md` (run 100 section) and `00-requirements.md` reference.
  - Reused insight: every consumer needs a named producer and the producer belongs where the evidence is fresh;
    a deprecation refusal is not an offered capability.
  - Superseded or contradicted: nothing; the learner-yield gap this run fixes is the same family.
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/other/prior-evidence/prior-runs.md` (run 101 section) + landed code in `queue-runtime/*`
  - Docs read: run 101 requirements/worktree references + the landed code in `queue-runtime/*`.
  - Reused insight: one `ManagedRuntime` per plane; `PersistedQueue` with a SQL store; retry schedule idiom
    `Schedule.min([exponential, spaced])`; the dependency-closure build is required before bridge lanes.
  - Superseded or contradicted: the run name says "effect-mq" but the landed planes are `PersistedQueue`-based and
    the router has no `effect-mq` import - recorded as the R15 correction.
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/other/prior-evidence/prior-runs.md` (run 103 section)
  - Docs read: `00-requirements.md`, `05-manual-qa.md`, `06-decisions-update.md`, the memory audit findings.
  - Reused insight: routing posture/scoring vocabulary, canonical-only writes, decision receipts and the latency
    policy (off by default, 10 000 ms / 5..30); the stage monitor script to reuse in Phase 5.
  - Superseded or contradicted: run 103's learning/memory updates landed only partially (the memory audit found the
    plane stale), which is why this run reads the run artifacts directly.

## Earlier Phase Reconciliation

- `00-requirements.md`:
  - Requirement coverage status: R1-R15 defined; Phase 1 tasks T1.1, T1.2a-i, T1.3 assigned; analyst drafts for
    T1.2a-c and T1.2d/e/i in flight at draft time.
  - Unknowns carried forward: the Known Unknowns list above.

## Subagent Contribution Verification

Reviewed Action Records: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/subagents/as104_replay_catalog.md`, `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/subagents/as104_learner_conformance.md`, `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/subagents/as104_sidecar_traffic_effect.md`, `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/subagents/as104_queue_stall.md`, `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/subagents/audit104_as_is.md`, `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/subagents/audit104_as_is_r2.md`

Main-Agent Verification Performed: reconciled every action record's claimed file impact against the run diff and the worktree; created deliverables `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/other/as-is/replay-catalog.md`, `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/other/as-is/learner-conformance.md`, `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/other/as-is/sidecar-traffic-effect.md`, `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/other/as-is/queue-stall.md`, `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/other/as-is/audit-as-is.md`, `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/other/as-is/audit-as-is-r2.md`; reviewed code read-only and untouched in the diff: `role-model-router/apps/runtime-host-bridge/src/track-b-replay-policy.ts`, `role-model-router/apps/runtime-host-bridge/src/cli.ts`, `role-model-router/apps/runtime-host-bridge/src/track-b-auto-replay.ts`, `role-model-router/packages/core/src/router.ts`, `role-model-router/packages/catalog/src/index.ts`, `role-model-router/packages/catalog/src/refresh.ts`, `role-model-router/apps/runtime-host-bridge/src/index.ts`, `role-model-router/apps/runtime-host-bridge/src/track-b-runtime.ts`, `role-model-router/apps/runtime-host-bridge/src/track-b-operations.ts`, `role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts`, `role-model-router/packages/sqlite-memory/src/index.ts`, `role-model-router/apps/runtime-ui/app/lib/view-models.ts`, `role-model-router/apps/runtime-ui/app/lib/sidebar-footer.ts`, `role-model-router/apps/runtime-ui/app/lib/learning-api.ts`, `role-model-router/apps/runtime-ui/app/components/learning-live-panel.tsx`, `role-model-router/apps/runtime-ui/app/routes/learning.tsx`; relevant-but-untouched `role-model-router/packages/endpoint-registry/src/index.ts`, `role-model-router/packages/catalog/data/normalized-catalog.json`; reviewed phase artifacts `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/01-as-is.md` and `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/00-requirements.md`; the controller re-derived the load-bearing claims (26/26 deferred dispositions, the 02:19 starvation, the two-field conformance failure, the four capture paths, the DeepSeek catalog rows) against those files and the frozen stage stores before accepting each contribution.

Acceptance Decision: accepted

Refresh Handling: the first audit's repairs materially changed the phase artifact, so the bundle was refreshed via `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/other/as-is/audit-as-is-r2.md`

Repair Performed After Verification: applied the repairs recorded in `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/other/as-is/audit-as-is-r2.md`

## Verification Handoff

- Inspect first: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/other/as-is/queue-stall.md` and `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/other/as-is/audit-as-is-r2.md`
- Reviewed artifact: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/01-as-is.md`
- Diff basis command: `git diff --name-only 84d5996cb156217d37801943831762bc734ae21f`
- Effective requirement addenda: `addenda/00-requirements.post-lock-*.addendum-0{1,2,3}.md`

## Worktree Diff Audit

- Diff basis used: `git diff --name-only 84d5996cb156217d37801943831762bc734ae21f`
- Base branch: `origin/dev` (public), `origin/dev` (private `5df90b6d`)
- Worktree branch: `recursive/104-replay-eligibility-and-evidence-fidelity`
- Base commit: `84d5996cb156217d37801943831762bc734ae21f`
- Baseline type: `remote ref`
- Baseline reference: `84d5996cb156217d37801943831762bc734ae21f`
- Comparison reference: `working-tree`
- Normalized baseline: `84d5996cb156217d37801943831762bc734ae21f`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 84d5996cb156217d37801943831762bc734ae21f`
- Planned or claimed changed files:
  - `none yet` (Phase 1 is read-only apart from this run folder)
- Actual changed files reviewed:
  - `.recursive/run/104-replay-eligibility-and-evidence-fidelity/` (Phase 0 locks + this draft + evidence)
- Unexplained drift:
  - none

## Gaps Found

- `R11`'s premise (24 fields) was measured from the stale controller checkout; at the pinned baseline the set is
  exactly two fields. Corrected by
  `addenda/00-requirements.post-lock-conformance-field-count.addendum-01.md`.
- `R3`'s premise needs Phase 2 reconciliation: the local catalog already ships an image-capable
  `deepseek/deepseek-flash` entry while `deepseek-v4-flash` is text-only, and no `deepseek-v4.1-flash` entry
  exists locally at the pinned upstream commit. The "correct the flash modalities" fix may be a provenance/alias
  correction rather than a modality flip.
- Wave 1's `T1.2e` evidence shows `candidate_not_validatable` is produced on the public CLI side, not by the
  private evaluator, so `R8`'s fix locus (and the RED test) must target the public promotion path plus the private
  stranded-job class.
- `R6`'s "all capture sites carry the same classification shape" is broader than the analyst draft reported:
  the observation-bundle path (`index.ts:28329`) carries a bare `taskTypeId` spread and no `classification`
  object, while the route-capture payload (`:28368`/`:28376`) carries both. Phase 2 must scope the fix across all
  four paths.
- `R10`'s "replay load" framing is incomplete: at Phase 1 time 78% of the sidecar degradations came from live
  traffic. The fix must not be scoped to the replay lane; the requirement's acceptance criterion (zero
  degradations under the run's load) already covers this, but the plan should target the shared
  contribution-upload path.
- `R14` has a design input the requirement did not know about: `benchmark-runner.ts:91/:100` already carries
  `executionTrafficClass: "live" | "benchmark" | "health" | "synthetic"` on the execution plane, and nothing in
  the telemetry write path reads it, so `runtime_observations`/samples can say `benchmark` while
  `runtime_telemetry_records` says `live_request` for the same request. Phase 2 must decide whether the new
  vocabulary aligns with this existing enum or replaces it (and must fix the two-table disagreement).
- The live queue data (2026-10-01, stage `:3457`) shows the stall sits at the **replay -> evaluation handoff**:
  `replay_dispositions` is 26/26 `deferred` with no terminal outcome, and the `evaluation.score` /
  `learner.derive` queues are empty with their last completions at 02:19 UTC while their workers keep probing.
  `R8`'s learner-finalization fix is downstream of this handoff, so Phase 2 must sequence (or combine) the
  handoff repair with the finalization fix.

- Unresolved in-scope gaps: none - every item above is either corrected by a locked requirement addendum
  (`01`, `02`, `03`) or explicitly recorded as a Phase 2 planning input with its evidence in this artifact.

## Repair Work Performed

- Audit `audit-as-is.md` returned FAIL with seven repairs; all seven are applied:
  1. both stale "24 fields" lines (repro step 4, `## Evidence`) replaced with the two-field result plus the
     addendum-01 citation;
  2. `## Source Requirement Inventory` (T1.1) added with all twelve findings and their dispositions;
  3. `replay_job_not_ready_for_evaluation` reattributed to the public bridge
     (`track-b-auto-replay.ts:376/:730/:773`, `track-b-replay-policy.ts:101`), with the private
     `:3152/:3498/:3515/:7199` citations kept for `deferred`/`replay_failed` only;
  4. the six dropped draft-level unverified items added to `## Known Unknowns`;
  5. `R5` given real evidence (generic modality rule at `router.ts:1439`; zero `attachment` fields in the
     normalized catalog; 1 436 `pdf` models, none DeepSeek);
  6. addenda 02 (`R3`) and 03 (`R14`) written and locked, and addendum 01 locked;
  7. the three drifted anchors corrected (`:8169-8177`, `:2846`; the `:3377` reference is a
     `sqlite-memory` insert default and matches) and the live-readback window given an explicit timestamp.
- New evidence from the operator's queue-stall report was folded in as its own section
  (`queue-stall.md` + controller store queries) and added to `## Gaps Found`.

## Audit Verdict

Audit: PASS

Summary: independent audit `audit-as-is.md` returned FAIL with seven documentation repairs; every repair was
applied and controller-verified. The focused re-audit (`evidence/other/as-is/audit-as-is-r2.md`) returned
**PASS** with five non-blocking precision notes, all applied (source-inventory count, `deepseek/*` first-party
scoping, the `dev`-ref clarification, the `R5` traceability pointer, and the addenda lock convention).

## Requirement Completion Status

Status vocabulary note: this phase performs analysis only, so each requirement is recorded as out-of-scope for
Phase 1 with an explicit phase-scoped decision; none of them is excluded from the run.

- R1 | Status: out-of-scope | Rationale: Phase 1 records AS-IS evidence only and implements nothing | Scope Decision: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/00-requirements.md`
- R2 | Status: out-of-scope | Rationale: Phase 1 records AS-IS evidence only and implements nothing | Scope Decision: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/00-requirements.md` (premise sharpened by the queue-stall evidence, no amendment)
- R3 | Status: out-of-scope | Rationale: Phase 1 records AS-IS evidence only and implements nothing | Scope Decision: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/addenda/00-requirements.post-lock-catalog-lineage.addendum-02.md`
- R4 | Status: out-of-scope | Rationale: Phase 1 records AS-IS evidence only and implements nothing | Scope Decision: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/00-requirements.md` (carried by addendum-02)
- R5 | Status: out-of-scope | Rationale: Phase 1 records AS-IS evidence only and implements nothing | Scope Decision: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/00-requirements.md`
- R6 | Status: out-of-scope | Rationale: Phase 1 records AS-IS evidence only and implements nothing | Scope Decision: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/00-requirements.md` (fourth capture path recorded in Gaps Found)
- R7 | Status: out-of-scope | Rationale: Phase 1 records AS-IS evidence only and implements nothing | Scope Decision: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/00-requirements.md`
- R8 | Status: out-of-scope | Rationale: Phase 1 records AS-IS evidence only and implements nothing | Scope Decision: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/00-requirements.md` (stall locus sharpened by the queue-stall evidence)
- R9 | Status: out-of-scope | Rationale: Phase 1 records AS-IS evidence only and implements nothing | Scope Decision: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/00-requirements.md`
- R10 | Status: out-of-scope | Rationale: Phase 1 records AS-IS evidence only and implements nothing | Scope Decision: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/00-requirements.md` (live-dominance finding recorded in Gaps Found)
- R11 | Status: out-of-scope | Rationale: Phase 1 records AS-IS evidence only and implements nothing | Scope Decision: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/addenda/00-requirements.post-lock-conformance-field-count.addendum-01.md`
- R12 | Status: out-of-scope | Rationale: Phase 1 performs no TDD cycle | Scope Decision: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/00-requirements.md`
- R13 | Status: out-of-scope | Rationale: Phase 1 performs no packaged rebuild or live QA | Scope Decision: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/00-requirements.md`
- R14 | Status: out-of-scope | Rationale: Phase 1 records AS-IS evidence only and implements nothing | Scope Decision: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/addenda/00-requirements.post-lock-benchmark-value.addendum-03.md`
- R15 | Status: out-of-scope | Rationale: Phase 1 records AS-IS evidence only and implements nothing | Scope Decision: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/00-requirements.md`

## Traceability

| Requirement | AS-IS evidence |
| --- | --- |
| `R1` | replay-catalog draft (T1.2a/T1.2b), monitor log |
| `R2` | replay-catalog draft (T1.2a), disposition counts, queue-stall section (26/26 deferred) |
| `R3` | replay-catalog draft (T1.2c), upstream models.dev files |
| `R4` | replay-catalog draft (T1.2c) |
| `R5` | `T1.2b` (this document: modality rule + catalog facts); the replay-catalog draft has no pdf analysis |
| `R6` | learner-conformance draft (T1.2d) |
| `R7` | learner-conformance draft (T1.2e) |
| `R8` | learner-conformance draft (T1.2e), queue-stall section (evaluation/learner starved since 02:19) |
| `R9` | replay-catalog draft + learner-conformance draft |
| `R10` | sidecar/traffic draft (T1.2f), queue-stall section (queues readback timed out at 60 s; 293 KB poll every 30 s) |
| `R11` | learner-conformance draft (T1.2i), run-99 conformance output |
| `R12` | Phase 3 obligation (no AS-IS artifact) |
| `R13` | run-103 monitor script + Phase 5 obligation |
| `R14` | sidecar/traffic draft (T1.2g, wave 2) + live readback |
| `R15` | sidecar/traffic draft (T1.2h, wave 2) + queue-runtime imports |

## Coverage Gate

- [x] Every `R#` has current-behavior evidence or a recorded AS-IS gap
- [x] Reproduction steps are novice-runnable
- [x] Prior recursive evidence is recorded with reused/superseded notes
- [x] Audit bundle assembled and audited (first pass FAIL, all seven repairs applied, re-audit PASS)

Coverage: PASS

## Approval Gate

- [x] Phase 1 audit is PASS and gaps are repaired

Approval: PASS

Approval basis: the independent first-pass audit returned FAIL with seven documentation repairs; all seven were
applied and controller-verified, the re-audit (`evidence/other/as-is/audit-as-is-r2.md`) returned PASS with five
non-blocking precision notes, and those notes were applied before lock. Three post-lock requirement addenda
(`R11`, `R3`, `R14`) are locked and recorded as effective inputs.
