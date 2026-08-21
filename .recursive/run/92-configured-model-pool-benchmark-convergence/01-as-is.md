Run: `/.recursive/run/92-configured-model-pool-benchmark-convergence/`
Phase: `01 AS-IS`
Status: `LOCKED`
LockedAt: `2026-08-21T09:41:40Z`
LockHash: `a0b8b776252946b46a2efbe3c41cfd1c1e9e1e09c6335c9178084d67935a1d40`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/92-configured-model-pool-benchmark-convergence/00-requirements.md`
- `/.recursive/run/92-configured-model-pool-benchmark-convergence/00-worktree.md`
- `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/00-requirements.md`
- `/.recursive/run/69-benchmark-scoring-integrity/00-requirements.md`
- `/.recursive/memory/domains/role-model-router.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `role-model-router/apps/runtime-host-bridge/src/{index.ts,configured-model-membership.ts,benchmark-runner.ts,benchmark-summary.ts,benchmark-artifacts.ts}`
- `role-model-router/packages/sqlite-memory/src/index.ts`
- `role-model-router/packages/endpoint-registry/src/effort-instance-identity.ts`
- `role-model-router/packages/profile-aggregator/src/benchmark-routing-quality.ts`
- `role-model-router/apps/runtime-ui/app/{lib/{runtime-api,view-models,candidate-space,format-score,effort-identity}.ts,routes/{control-models,control-benchmark,dashboard,router-candidates}.tsx}`
- `/.recursive/run/92-configured-model-pool-benchmark-convergence/evidence/phase1/sqlite-memory-as-is-report.md`
- `/.recursive/run/92-configured-model-pool-benchmark-convergence/evidence/phase1/ui-consumers-as-is-report.md`
Outputs:
- `/.recursive/run/92-configured-model-pool-benchmark-convergence/01-as-is.md`
Scope note: Maps the configured-pool → benchmark → profile → routing → UI authority chain against R1–R8 and records every divergence hotspot, fixture/fallback path, and final-controller eject defect. No product code is modified in this phase.

## TODO

- [x] Re-read requirements, worktree, predecessor runs, and memory
- [x] Map configured-membership authority
- [x] Map endpoint-variant identity
- [x] Map benchmark selection/persistence/history
- [x] Map profile/candidate derivation and invalidation
- [x] Map routing profile usage
- [x] Map all UI/API consumers
- [x] Inventory fixture/mock/preview/fallback paths
- [x] Map final-controller eject behavior
- [x] Map restart/rebuild/reconnect/clear-benchmark behavior
- [x] Produce Source Requirement Inventory
- [x] Produce Traceability
- [x] Complete audit sections (self-audit + delegated evidence)
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Reproduction Steps (Novice-Runnable)

These reproduce the stage-RC observations that motivated Run 92 on a freshly built runtime. They are
the same behaviors the AS-IS analysis maps to code below.

1. **Fixture-like / stale benchmark rows**: configure two endpoint variants (a base endpoint and a
   sibling reasoning-effort variant), run a benchmark for only one variant, then open
   Benchmark → Run history and Overview → Model pool. Observed: the unbenchmarked variant can appear
   with a synthesized default (see R2/R6), or the overview retains pre-benchmark candidate values.
2. **Mismatched models across pages**: configure an endpoint with a reasoning-effort variant, then
   compare Overview → Model pool, Models inventory, Benchmark selection, Router Candidates, and
   Controller/Strategy. Observed: model cards can appear once as a merged `modelId` card and again as
   `endpointId` effort-instance cards (dual identity), so the same configured variant is not rendered
   consistently.
3. **Benchmark not updating overview pool**: run and complete a benchmark, then immediately re-open
   Overview → Model pool without restarting. Observed: the candidate-space scatter can still show the
   pre-benchmark synthesized values (quality 55%, cost 58%, speed 0%) because those are hardcoded
   fallbacks, not derived from the completed profile.
4. **Ambiguous final-controller eject**: on Models inventory, select the only configured
   controller-backed endpoint. Observed: the Eject button is disabled with the tooltip
   "Assign another primary controller before removing this model." There is no way to express a
   deliberate final-controller eject from the UI, so a protected controller, a failed request, and a
   durable empty-pool result are indistinguishable.

## Current Behavior by Requirement

### `R1` One canonical configured-pool projection — FAIL

There is no single backend-owned "configured pool" read model. The UI composes its pool from up to
four independent fetches, and the backend derives candidate facts from the registry without a
membership-revision-stamped projection.

- `fetchRuntimeModels` (`apps/runtime-ui/app/lib/runtime-api.ts:1639-1647`) reads
  `GET /api/role-model/models` and **silently falls back to `GET /v1/models`** on error. `/v1/models`
  is the OpenAI-shaped catalog (`createModelListResponse`, host bridge `src/index.ts:14468-14485`),
  not the configured membership projection, so a failed membership read can populate the pool from a
  non-membership source with no provenance signal.
- `buildConfiguredModelCards` (`apps/runtime-ui/app/lib/view-models.ts:1926-2142`) emits **two
  identity representations** for the same underlying endpoint variant: a merged model card keyed by
  `modelId` (lines 2115-2131) and effort-instance cards keyed by `identityKey = endpointId`
  (lines 2055-2058). Consumers must key `identityKey ?? modelId`
  (`routes/control-models.tsx:488-490`) or the two representations diverge.
- The candidate projection (`src/index.ts:21318-21391`) iterates `currentRegistry.endpoints`
  (endpoint-variant-exact) but stamps `operationalProfile`/`latestProfile` from live-only snapshots
  and only attaches `benchmarkCapability` as a separate field; there is no single "membership +
  latest-valid-benchmark-profile" revision the pages can consume monotonically.
- Model records (`createRuntimeModelRecords`, `src/index.ts:7672-7761`) group endpoints by
  `endpoint.identity.model_id` and expose `endpoint_ids` — the variant identity is preserved in the
  endpoint ids, but the model record itself is base-family-keyed, which is where model-card vs
  endpoint-card divergence originates.

### `R2` No fixture/mock/preview fallback — FAIL

Three production paths fabricate data:

1. `fetchRuntimeModels` `/v1/models` fallback (`runtime-api.ts:1643-1647`) — catalog becomes the pool
   silently (also a R1 issue).
2. Candidate-space synthesis (`apps/runtime-ui/app/lib/candidate-space.ts`): `scoreQuality` returns
   `0.55` when no evidence (line 102); `scoreSpeed` returns `0` when no latency (line 120);
   `scoreCost` returns `0.88` (local) / `0.58` (remote) when no pricing (lines 163/165); `clamp01`
   coerces non-finite to `0` (lines 60-65). These become the dashboard "Model pool" C/Q/S scatter
   with no honest "no data" affordance.
3. `buildTelemetryStatusLabel`/latency/token rollups in `view-models.ts` render missing latency as
   `0 ms` (line 1040), missing tokens as `0 tokens` (line 1147), missing status as `0 ok` (968-970),
   and `resolveRoutingBenchmarkQuality` coerces a missing overall to `0` via
   `(meanJudgeScores(benchmarkSamples) ?? 0)`
   (`packages/profile-aggregator/src/benchmark-routing-quality.ts:157-160`).

Test fixtures remain correctly isolated in `*.test.ts(x)` modules (allowed by R2), but the production
UI/backends above are not truthful.

### `R3` Endpoint-variant-exact benchmark selection/persistence — PARTIAL/FAIL

- Identity is correct at the source: `createEndpointInstanceIdentity`
  (`packages/endpoint-registry/src/effort-instance-identity.ts:71-90`) encodes the effort variant into
  `endpointId` (`{base}-{encodeURIComponent(effort)}`), and samples are written under `endpoint_id`
  (`benchmark-runner.ts:1436-1490`).
- `runRoutingCapabilityBenchmark` selects targets by `endpointId` from
  `deps.listConfiguredEndpoints()` filtered to healthy (`benchmark-runner.ts:1625-1640`) and derives
  `endpointVersion` as `{runtime_version}:{variant_id ?? "default"}` (`src/index.ts:26844-26852`).
- **Gaps**: (a) the benchmark run request records `endpointIds` but no membership revision, so a
  run started just before an eject can complete against a now-removed endpoint; (b) result persistence
  is filesystem `result.json` + `manifest.json` (`benchmark-summary.ts:656-696`) while the profile
  is derived from sqlite samples (`readLatestBenchmarkProfilesByEndpointIds`), two different stores
  that can diverge; (c) `readLatestBenchmarkProfilesByEndpointIds` re-aggregates ALL retained
  `source_type='benchmark'` samples with **no completion-state, suite/version, or freshness filter**
  (`packages/sqlite-memory/src/index.ts:4799-4842`) — a failed/stale sample can leak into the
  "latest" profile; (d) `readCurrentBenchmarkPortfolio` dedupes latest-per-endpoint by scan order
  (`benchmark-summary.ts:590-645`) but has no explicit membership reconciliation.

### `R4` Propagation through every derived consumer — FAIL

- Completion writes a sample and a filesystem `result.json`, but there is **no cache
  invalidation/revision receipt** broadcast to derived consumers. The candidate read path
  (`src/index.ts:21213-21269`) re-reads sqlite on each `listRouterCandidateData()` call, so a
  completed benchmark DOES appear on the next API read — but the UI candidate-space layer
  (`candidate-space.ts`) substitutes hardcoded fallbacks before consulting `benchmarkCapability`,
  so the Overview scatter does not visibly converge to the completed profile.
- `listRouterDecisionData` (`src/index.ts:21392-21416`) does not carry a profile/benchmark revision;
  a routing decision identifies `selectedEndpointId`/`selectedModelId` but not which profile/benchmark
  revision informed the selection (R4 acceptance "routing decision identifies the profile/benchmark
  revision used" is unmet).
- Eject/reconnect/clear/restart: `clearBenchmarkData` (`src/index.ts:26895-26906`) runs sqlite clear +
  filesystem artifact clear **in two non-atomic steps**, and the sqlite clear itself is not
  transactional (`packages/sqlite-memory/src/index.ts:4073-4109`), so a crash mid-clear can leave
  ghost profiles.

### `R5` Explicit durable last-controller eject — FAIL

- `resolveConfiguredModelFooterAction` marks the eject action `disabled` when `isController`
  (`routes/control-models.tsx:349-370`), and the footer button renders the tooltip
  "Assign another primary controller before removing this model." (lines 1303-1307). The active
  controller-backed endpoint **cannot be ejected** from Models inventory until re-assigned — there is
  no destructive-confirmation path for the final controller.
- The backend `removeProviderAccountModel` DOES handle last-controller clear via
  `auto-reassign-or-clear` policy (`src/index.ts:25163-25237`), and `test/remove-account-model.test.ts`
  covers "clears the controller when eject removes the last surviving controller-backed
  manual-account model" (baseline PASS). So the backend semantic exists but the UI does not expose an
  explicit confirmation for it, and the frontend guard blocks it entirely.
- `unload-local` executes immediately without confirmation (`routes/control-models.tsx:1325-1327`).

### `R6` Score/freshness/reconciliation semantics — FAIL

- Internal routing scores are normalized 0.00–1.00 and `formatScore`/`formatScoreWithCoverage`
  render 0–100% correctly (`lib/format-score.ts:1-18`). Missing scores render `"n/a"` there — GOOD.
- **Defects**: candidate-space fallbacks (0.55/0/0.88/0.58, R2); `?? 0` overall in
  `resolveRoutingBenchmarkQuality` (`benchmark-routing-quality.ts:160`); `control-benchmark.tsx:232`
  (`benchmark_samples ?? 0`) and per-bucket `score ?? 0`/`cases ?? 0` (`control-benchmark.tsx:258-267`);
  missing latency as `0 ms` (`view-models.ts:1040`).
- Legacy reconciliation exists for effort-variant endpoint rows
  (`repairPersistedProviderAccountsFromRuntimeState`, `src/index.ts:16752-16875`) but does not
  reconcile legacy benchmark sample/version attribution against the canonical identity.

### `R7` Strict TDD + owning regressions — NOT YET (implementation gate)

- Existing owning suites exist and pass at baseline (25 host-bridge + 13 runtime-ui tests, see
  `00-worktree.md`), but there is no Run-92-specific RED/GREEN evidence yet. Phase 3 will add it.

### `R8` Rebuilt-runtime + browser/API verification — NOT YET (completion gate)

- Deferred to Phase 5. The stage RC is comparison evidence only and will not be mutated.

## Source Requirement Inventory

- R1 | Disposition: in-scope | Source Quote: "The runtime must expose one backend-owned, endpoint-variant-aware projection for configured model membership and its current derived facts. Every page and routing consumer in scope must obtain membership from that projection or a documented derivative of it." | Summary: One canonical pool projection; every consumer reads it or a documented derivative.
- R2 | Disposition: in-scope | Source Quote: "Production state must be truthful. Test fixtures remain allowed only in test modules or explicitly test-only factories, never as runtime or UI fallbacks." | Summary: Remove production fixture/mock/synthetic fallbacks; honest empty/loading/stale states.
- R3 | Disposition: in-scope | Source Quote: "Starting a benchmark must select only canonical configured endpoint variants, and each result must be persisted and attributed to the exact endpoint variant that executed it." | Summary: Endpoint-variant-exact selection/persistence/history; refuse unconfigured/stale/duplicate.
- R4 | Disposition: in-scope | Source Quote: "After a valid benchmark completes, the endpoint-bound profile must be visible through the canonical pool and relevant downstream products without manual restart or stale synthetic values." | Summary: Propagate completion to all derived consumers exactly once; revision/receipt; no ghost profile.
- R5 | Disposition: in-scope | Source Quote: "The model-pool control must make an intentional final-controller eject safe and understandable while preserving existing configured-membership authority." | Summary: Explicit destructive confirmation; clear controller; durable empty-pool + recovery; idempotent.
- R6 | Disposition: in-scope | Source Quote: "The run must make score ownership and display coherent over new benchmarks, histories, partial telemetry, and upgrades." | Summary: 0.00–1.00 internal vs 0–100% user; missing ≠ 0; latest-valid selection; legacy reconciliation.
- R7 | Disposition: in-scope | Source Quote: "The repair must leave durable tests for the authority chain, not only screenshots or isolated happy paths." | Summary: Strict RED/GREEN TDD; owning unit+integration regressions; repository test architecture.
- R8 | Disposition: in-scope | Source Quote: "The run cannot close on source-level tests alone. It must prove the rebuilt runtime and UI use the repaired authority path." | Summary: Rebuilt-runtime browser/API verification on isolated state; hash-bound receipts.

## Relevant Code Pointers

Backend authority chain (`role-model-router/apps/runtime-host-bridge/src/`):

- `configured-model-membership.ts` — configured membership key/blocking-reference machinery
- `index.ts:25128-25555` — `removeProviderAccountModel` (eject authority, controller clear)
- `index.ts:21318-21391` — `listRouterCandidateData` (candidate/projection)
- `index.ts:21213-21269` — `readCandidateProfileDataByEndpointId`
- `index.ts:7672-7761` — `createRuntimeModelRecords`
- `index.ts:14468-14485` — `/v1/models` handler (`createModelListResponse`)
- `index.ts:16752-16875` — `repairPersistedProviderAccountsFromRuntimeState`
- `index.ts:26895-26906` — `clearBenchmarkData`
- `benchmark-runner.ts:1436-1490` — `toObservedSample` (endpoint-variant attribution)
- `benchmark-runner.ts:1625-1640` — benchmark target selection
- `benchmark-summary.ts:400-454` — latest-completed-run selection
- `benchmark-summary.ts:590-645` — `readCurrentBenchmarkPortfolio`
- `benchmark-summary.ts:718-848` — `buildBenchmarkCapabilityForEndpoint`

Persistence (`role-model-router/packages/sqlite-memory/src/index.ts`):

- `:503-515` — `runtime_endpoints` schema (endpoint_id PK, reasoning_effort column)
- `:4799-4842` — `readLatestBenchmarkProfilesByEndpointIds` (no completion/freshness filter)
- `:4941-5003` — `readLatestObservedProfile(s)`
- `:4033-4109` — clear benchmark data (non-transactional)
- `:535-541` — `runtime_controller_assignments`
- `:2174-2220` — controller assignment read/write/delete

Identity (`role-model-router/packages/endpoint-registry/src/effort-instance-identity.ts`):

- `:71-90` — `createEndpointInstanceIdentity` (variant encoded in endpointId)
- `:97-118` — `readLegacyEndpointReasoningEffort`

Profile (`role-model-router/packages/profile-aggregator/src/benchmark-routing-quality.ts`):

- `:88-169` — `resolveRoutingBenchmarkQuality` (`?? 0` at line 160)
- `:171-322` — `applyRoutingBenchmarkQualityToProfile` (synthetic latency/confidence defaults at 302-306)

UI (`role-model-router/apps/runtime-ui/app/`):

- `lib/runtime-api.ts:1639-1647` — `fetchRuntimeModels` `/v1/models` fallback
- `lib/view-models.ts:1926-2142` — `buildConfiguredModelCards` (dual identity)
- `lib/view-models.ts:1040,1147,968-970` — missing-latency/token/status as 0
- `lib/candidate-space.ts:78-170` — synthetic Q/C/S fallbacks
- `lib/format-score.ts:1-18` — correct n/a handling (contrast)
- `lib/effort-identity.ts:66-83` — suffix-heuristic endpoint effort ownership
- `routes/control-models.tsx:349-370,1303-1327` — eject guard + confirmation
- `routes/control-benchmark.tsx:196-278` — benchmark join by endpointId; `?? 0` at 232, 258-267
- `routes/dashboard.tsx:223` — `buildCandidateSpacePoints` (overview pool scatter)
- `routes/router-candidates.tsx` / `router-decisions.tsx` / `control-controller.tsx` — endpointId-keyed consumers

## Known Unknowns

- Whether `readLatestBenchmarkProfilesByEndpointIds` should filter by `source_type` completion state
  is a design decision to lock in Phase 2; current behavior aggregates all retained benchmark samples.
- The exact shape of the "membership revision" to add to the benchmark request/result and routing
  decision is a Phase 2 design choice (monotonic counter vs content hash of membership projection).
- Whether `/v1/models` should remain a fallback for OpenAI-compat clients (separate from the
  `/api/role-model/models` configured-pool contract) or be removed from the UI's `fetchRuntimeModels`
  is a Phase 2 decision; the defect is that the UI uses it as a silent pool source.

## Evidence

- Delegated persistence report: `evidence/phase1/sqlite-memory-as-is-report.md` (verified against
  `packages/sqlite-memory/src/index.ts`).
- Delegated UI report: `evidence/phase1/ui-consumers-as-is-report.md` (verified against
  `apps/runtime-ui/app/**`).
- First-hand file reads: `configured-model-membership.ts`, `benchmark-runner.ts`,
  `benchmark-summary.ts`, `benchmark-artifacts.ts`, `effort-instance-identity.ts`,
  `benchmark-routing-quality.ts`, `runtime-api.ts`, `view-models.ts`, `candidate-space.ts`,
  `format-score.ts`, `control-models.tsx`, `control-benchmark.tsx`, and the host-bridge `index.ts`
  authority chain (all line cites above).
- Phase 0 baseline test/build evidence is recorded in `00-worktree.md` (host-bridge 25 tests,
  runtime-ui 13 tests, both PASS).

## Traceability

- R1 → mapped in "R1 One canonical configured-pool projection"; code: `fetchRuntimeModels`,
  `buildConfiguredModelCards`, `listRouterCandidateData`, `createRuntimeModelRecords`.
- R2 → mapped in "R2 No fixture/mock/preview fallback"; code: candidate-space fallbacks,
  `/v1/models` fallback, `view-models.ts` zero-coercions.
- R3 → mapped in "R3 Endpoint-variant-exact benchmark"; code: `createEndpointInstanceIdentity`,
  `runRoutingCapabilityBenchmark`, `readLatestBenchmarkProfilesByEndpointIds`, portfolio scan.
- R4 → mapped in "R4 Propagation"; code: `listRouterCandidateData`, `clearBenchmarkData`,
  routing-decision projection (no revision).
- R5 → mapped in "R5 Explicit durable last-controller eject"; code: control-models eject guard,
  `removeProviderAccountModel` auto-reassign-or-clear.
- R6 → mapped in "R6 Score/freshness/reconciliation"; code: `format-score.ts`,
  `resolveRoutingBenchmarkQuality` `?? 0`, `candidate-space.ts` fallbacks, legacy repair.
- R7 → implementation gate; existing baseline suites green, Run-92 RED/GREEN deferred to Phase 3.
- R8 → completion gate; deferred to Phase 5 (stage RC untouched).

## Audit Context

- Worktree: `D:\DEV\role-model\.worktrees\92-configured-model-pool-benchmark-convergence`
- Branch: `recursive/92-configured-model-pool-benchmark-convergence`
- Baseline commit: `d59f07b91e7b23c25e7297860a0f9c967b342b7a` (from locked `00-worktree.md`)
- Phase purpose: establish the real configured-pool → benchmark → profile → routing → UI starting point.
- Audit Execution Mode: `self-audit`
- Subagent Availability: `available`
- Subagent Capability Probe: three read-only subsystem subagents dispatched (persistence, UI, backend); persistence and UI reports completed and were verified against live files; the backend 28k-line `index.ts` exceeded a single subagent's practical read window and was completed by controller first-hand reads.
- Delegation Decision Basis: parallelize independent subsystem reading; controller independently verified every fact cited in this artifact by direct file reads.
- Delegation Override Reason: self-audit chosen because the AS-IS artifact requires exact source-line citations across the host-bridge authority chain, which the controller verified directly; delegated reports are supplementary evidence, not the sole basis.
- Audit Inputs Provided:
  - locked `00-requirements.md` + `00-worktree.md`
  - live sources listed in the Inputs header
  - delegated reports under `evidence/phase1/` (verified)

## Effective Inputs Re-read

- Locked `00-requirements.md` (R1–R8, Fixed Decisions 1–8, Required Evidence) — re-read.
- Locked `00-worktree.md` (diff basis `d59f07b9`, baseline test/build PASS) — re-read.
- Run 76 requirements (configured-membership authority + eject convergence contract) — re-read; treated as the established authority contract this run extends.
- Run 69 requirements (benchmark scoring integrity) — re-read; benchmark-layer ownership context.
- Memory domain `role-model-router.md` + `STATE.md`/`DECISIONS.md` — re-read for authority-chain and promotion-boundary context.

## Earlier Phase Reconciliation

- Phase 0 locked `00-worktree.md` at commit `cb78bf26` (LockHash `ca77a34c…`); diff basis is
  `d59f07b91e7b23c25e7297860a0f9c967b342b7a` → `working-tree`. This phase reuses the same basis and
  reports no product diff (analysis only).
- Requirements Fixed Decision 1 (endpoint variant is the unit) matches the source finding that
  `createEndpointInstanceIdentity` already encodes effort into `endpointId`; the remaining work is
  downstream projection/consumer convergence, not a new identity scheme.

## Subagent Contribution Verification

- Persistence subagent report (`evidence/phase1/sqlite-memory-as-is-report.md`) matches direct reads
  of `sqlite-memory/src/index.ts` (endpoint_id PK at :504, no-freshness-filter at :4814-4839,
  non-transactional clear at :4033-4109). Accepted.
- UI subagent report (`evidence/phase1/ui-consumers-as-is-report.md`) matches direct reads of
  runtime-ui (candidate-space fallbacks 102/120/163/165, eject guard control-models.tsx:368/1303-1307,
  /v1/models fallback runtime-api.ts:1643-1647). Accepted.
- Backend authority subagent was interrupted; its partial work was replaced by controller first-hand
  reads (all backend citations in this artifact are from direct file reads).

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `d59f07b91e7b23c25e7297860a0f9c967b342b7a`
- Comparison reference: `working-tree`
- Normalized baseline: `d59f07b91e7b23c25e7297860a0f9c967b342b7a`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only d59f07b91e7b23c25e7297860a0f9c967b342b7a`
- Changed files reviewed: no product changes at AS-IS time; only run control-plane artifacts
  (`00-worktree.md`, lock receipt, evidence) are new. Analysis is non-mutating with respect to product code.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/00-requirements.md` — the authority contract this run extends.
- `/.recursive/run/69-benchmark-scoring-integrity/00-requirements.md` — benchmark scoring ownership context.
- `/.recursive/memory/domains/role-model-router.md` — accumulated membership/benchmark/profile memory.
- `/.recursive/STATE.md` and `/.recursive/DECISIONS.md` — promotion-boundary and current-state truths.

## Gaps Found

- none (no audit-evidence gaps in this artifact). The product defects are catalogued under
  "Current Behavior by Requirement" and are inputs to Phase 1.5/Phase 2, not unresolved audit gaps in
  this Phase 1 artifact.

## Repair Work Performed

- None (analysis phase). The mapped defects are inputs to Phase 1.5 (root cause) and Phase 2 (plan).

## Requirement Completion Status

- R1 | Status: deferred | Rationale: AS-IS is analysis-only; no code changed in this phase. R1 remains in-scope and is scheduled for strict-TDD implementation in Phase 3. | Deferred By: `/.recursive/run/92-configured-model-pool-benchmark-convergence/00-requirements.md`
- R2 | Status: deferred | Rationale: AS-IS is analysis-only; no code changed in this phase. R2 remains in-scope and is scheduled for strict-TDD implementation in Phase 3. | Deferred By: `/.recursive/run/92-configured-model-pool-benchmark-convergence/00-requirements.md`
- R3 | Status: deferred | Rationale: AS-IS is analysis-only; no code changed in this phase. R3 remains in-scope and is scheduled for strict-TDD implementation in Phase 3. | Deferred By: `/.recursive/run/92-configured-model-pool-benchmark-convergence/00-requirements.md`
- R4 | Status: deferred | Rationale: AS-IS is analysis-only; no code changed in this phase. R4 remains in-scope and is scheduled for strict-TDD implementation in Phase 3. | Deferred By: `/.recursive/run/92-configured-model-pool-benchmark-convergence/00-requirements.md`
- R5 | Status: deferred | Rationale: AS-IS is analysis-only; no code changed in this phase. R5 remains in-scope and is scheduled for strict-TDD implementation in Phase 3. | Deferred By: `/.recursive/run/92-configured-model-pool-benchmark-convergence/00-requirements.md`
- R6 | Status: deferred | Rationale: AS-IS is analysis-only; no code changed in this phase. R6 remains in-scope and is scheduled for strict-TDD implementation in Phase 3. | Deferred By: `/.recursive/run/92-configured-model-pool-benchmark-convergence/00-requirements.md`
- R7 | Status: deferred | Rationale: R7 is the strict-TDD implementation gate; it is inherently satisfied by Phase 3, which has not started in the AS-IS phase. | Deferred By: `/.recursive/run/92-configured-model-pool-benchmark-convergence/00-requirements.md`
- R8 | Status: deferred | Rationale: R8 is the rebuilt-runtime QA completion gate; it is inherently satisfied by Phase 5, which has not started in the AS-IS phase. | Deferred By: `/.recursive/run/92-configured-model-pool-benchmark-convergence/00-requirements.md`

## Audit Verdict

Audit: PASS

## Coverage Gate

- [x] Reproduction steps are novice-runnable
- [x] Current behavior is tied to every in-scope R1–R8
- [x] Relevant code pointers use full paths and function/module names
- [x] Known unknowns are explicit
- [x] Evidence snippets are recorded (delegated reports under evidence/phase1/)
- [x] Source Requirement Inventory covers all R# with exact source quotes
- [x] Traceability maps every R# to evidence
- [x] Audit sections are complete and grounded in upstream artifacts + diff basis

Coverage: PASS

## Approval Gate

- [x] AS-IS is consistent with live code and the locked diff basis
- [x] No unresolved setup or analysis ambiguity blocks Phase 1.5/Phase 2
- [x] Predecessor Run 76 authority contract is preserved and extended, not replaced

Approval: PASS
