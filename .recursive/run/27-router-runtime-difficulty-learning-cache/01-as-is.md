Run: `/.recursive/run/27-router-runtime-difficulty-learning-cache/`
Phase: `01 AS-IS`
Status: `LOCKED`
LockedAt: `2026-05-11T13:59:53Z`
LockHash: `ab83de23e9c63c45715eb97c881afc3cb8895516634b39a772b4492a3f5a40e0`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/27-router-runtime-difficulty-learning-cache/00-requirements.md`
- `/.recursive/run/27-router-runtime-difficulty-learning-cache/00-worktree.md`
- `/docs/architecture/07-router-runtime-routing-strategy-lock.md`
- `/.recursive/run/26-router-runtime-difficulty-guided-routing/03-implementation-summary.md`
- `/.recursive/STATE.md`
- `/.recursive/memory/domains/role-model-baseline.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `/role-model-router/packages/runtime-observability/src/index.ts`
- `/role-model-router/packages/sqlite-memory/src/index.ts`
- `/role-model-router/packages/profile-aggregator/src/index.ts`
- `/role-model-router/packages/protocol-routing/src/index.ts`
Outputs:
- `/.recursive/run/27-router-runtime-difficulty-learning-cache/01-as-is.md`
Scope note: Documents the current gap between the locked run-26 difficulty-routing baseline and the run-27 requirement for conversation-level cache reuse, per-difficulty learned profiles, observed override behavior, and advisory `maxDifficulty` recommendations.

## TODO

- [x] Re-read the locked run-27 requirements and worktree basis
- [x] Re-read the run-26 implementation baseline plus current state and memory notes
- [x] Inspect the live bridge, SQLite, observability, profile, and protocol-routing surfaces that currently own difficulty and observed-data behavior
- [x] Document current behavior against every in-scope requirement
- [x] Complete the audited Phase 1 sections and gates

## Reproduction Steps (Novice-Runnable)

1. Open `/.recursive/run/27-router-runtime-difficulty-learning-cache/00-requirements.md` and read `R1` through `R6`.
2. Open `/.recursive/run/26-router-runtime-difficulty-guided-routing/03-implementation-summary.md` and read the run-26 baseline summary of difficulty routing, diagnostics, and validator proof.
3. Open `/role-model-router/apps/runtime-host-bridge/src/index.ts` and inspect `resolveDifficultyClassification()`, `maybeApplyDifficultyRouting()`, `buildEndpointMaxDifficultyByEndpointId()`, `mapChatCompletionsRequest()`, `mapResponsesRequest()`, `readObservedProfilesForRouting()`, and the persisted observation path.
4. Open `/role-model-router/packages/sqlite-memory/src/index.ts` and inspect the `runtime_observations`, `observed_performance_samples`, and `observed_profile_snapshots` schema plus `persistRuntimeObservationBundle()`, `readObservedPerformanceSamples()`, and `readLatestObservedProfilesByEndpointIds()`.
5. Open `/role-model-router/packages/runtime-observability/src/index.ts` and inspect `RuntimeRoutingDiagnostics`, `RuntimeObservationBundleInput`, and `createRuntimeObservationBundle()`.
6. Open `/role-model-router/packages/profile-aggregator/src/index.ts` and inspect `ObservedPerformanceSample` plus `aggregateObservedPerformanceSamples()`.
7. Open `/role-model-router/packages/protocol-routing/src/index.ts` and inspect `ProjectRuntimeRouteInputInput` plus `projectRuntimeRouteInput()`.
8. Run `corepack pnpm run schemas:validate`, `corepack pnpm --filter @role-model-router/protocol-routing test`, `corepack pnpm --filter @role-model-router/runtime-host-bridge test`, and `corepack pnpm run runtime:validate-vendors` from the run-27 worktree to confirm the committed run-26 baseline is currently green.

## Current Behavior by Requirement

### `R1`

- The run-26 baseline already classifies difficulty for both chat-completions and responses requests, but it still does so per request rather than through a conversation-level cache.
- `resolveDifficultyClassification()` is invoked on every routed chat-completions or responses execution before planning, and `maybeApplyDifficultyRouting()` consumes the result immediately; no cache-related symbol, cache-key type, TTL metadata, or invalidation path exists in the bridge.
- SQLite continuity state already stores `sessions`, `conversations`, `conversation_turns`, `retrieval_receipts`, and `runtime_observations`, but no current table or persisted record stores a cached difficulty classification or explicit invalidation metadata.
- The current baseline therefore has conversation context and observation storage, but not reusable conversation-scoped difficulty state.

### `R2`

- Request observations now persist `routingDiagnostics.difficultyRouting`, so each routed request records the assigned difficulty and rubric-signal summary.
- The learned-performance layer remains endpoint-wide: `ObservedPerformanceSample` has no difficulty field, `observed_performance_samples` stores one sample stream per endpoint, and `observed_profile_snapshots` stores one latest profile per endpoint.
- `createRuntimeObservationBundle()` aggregates `priorSamples` only by endpoint id and endpoint version, and `readObservedProfilesForRouting()` reads only the latest endpoint-wide profile map via `readLatestObservedProfilesByEndpointIds()`.
- The bridge inspection API mirrors that same shape: `readEndpointProfile(endpointId)` returns one `latestProfile` plus one `recentSamples` stream, with no difficulty-bucket selector or segmented summary.

### `R3`

- Difficulty gating exists today only as a configured ceiling derived from runtime config: `buildEndpointMaxDifficultyByEndpointId()` builds a static map from `llamaSwap.models[*].maxDifficulty` and `liteLLM.providers[*].modelMappings[*].maxDifficulty`.
- `filterEndpointsByDifficulty()` applies that static map to the candidate allow-list, but no observed-history threshold, sustained-underperformance rule, or learned override source exists.
- `projectRuntimeRouteInput()` and `routeRuntimeRequest()` still receive one observed profile per endpoint plus throughput penalty state; they do not receive a difficulty bucket, bucket-specific history, or override explanation input.
- The current runtime can adapt route scoring from endpoint-wide observed metrics, but it cannot learn that an endpoint is only underperforming for `hard` requests and then override the configured difficulty ceiling on that basis.

### `R4`

- No current bridge API, SQLite record, or observability type exposes an advisory `maxDifficulty` recommendation.
- The operator-facing inspection surfaces currently expose recent request observations and endpoint-wide profiles, but nothing derives or returns a recommended difficulty ceiling for an endpoint.
- The current runtime therefore preserves user configuration by default, but only because it has no recommendation mechanism yet rather than because it has an explicit advisory model.

### `R5`

- Run 26 already established a shared request-level rubric family: `routingDiagnostics.difficultyRouting` stores `difficulty`, `strategy`, `fallbackApplied`, optional fallback reason, excluded endpoints, and rubric-signal summaries.
- That rubric reuse stops at the request-observation layer. The observed sample, aggregated profile, protocol-routing input, and inspection surfaces do not carry a difficulty bucket or rubric-derived learning slice forward.
- No current judge-, evaluator-, or controller-facing read model exists for difficulty learning beyond the raw request observation record, so later evaluation cannot yet consume the same rubric through a dedicated learned-state surface.

### `R6`

- The run-26 baseline already has focused tests and runtime validation for single-request difficulty assignment, strategy selection, fallback handling, and local-plus-remote `maxDifficulty` gating.
- The current suite does not cover conversation-level cache reuse, deterministic cache invalidation, per-difficulty sample aggregation, observed override thresholds, advisory recommendation generation, or routing changes caused by repeated-request learning over time.
- The live validator proof currently shows easy-path openness and hard-path local-endpoint exclusion, but it does not demonstrate that repeated mixed local-plus-remote traffic changes a later difficulty-routing outcome.

## Relevant Code Pointers

- `/docs/architecture/07-router-runtime-routing-strategy-lock.md`
- `/.recursive/run/26-router-runtime-difficulty-guided-routing/03-implementation-summary.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `/role-model-router/packages/runtime-observability/src/index.ts`
- `/role-model-router/packages/sqlite-memory/src/index.ts`
- `/role-model-router/packages/profile-aggregator/src/index.ts`
- `/role-model-router/packages/protocol-routing/src/index.ts`

## Known Unknowns

- Whether run 27 should use persisted `conversation_id` directly as the difficulty-cache key for both OpenAI-compatible request shapes or introduce a bridge-owned equivalent cache-key layer.
- Whether observed per-difficulty overrides should stay bridge-owned as an eligibility gate, move into protocol-routing as a scored penalty, or combine both while remaining auditable.
- Whether advisory recommendations should be stored as first-class SQLite state or derived on read from segmented sample and profile history while preserving stable operator APIs.

## Evidence

- `/.recursive/run/27-router-runtime-difficulty-learning-cache/00-requirements.md`
- `/.recursive/run/27-router-runtime-difficulty-learning-cache/00-worktree.md`
- `/docs/architecture/07-router-runtime-routing-strategy-lock.md`
- `/.recursive/run/26-router-runtime-difficulty-guided-routing/03-implementation-summary.md`
- `/.recursive/STATE.md`
- `/.recursive/memory/domains/role-model-baseline.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `/role-model-router/packages/runtime-observability/src/index.ts`
- `/role-model-router/packages/sqlite-memory/src/index.ts`
- `/role-model-router/packages/profile-aggregator/src/index.ts`
- `/role-model-router/packages/protocol-routing/src/index.ts`
- `/.recursive/run/27-router-runtime-difficulty-learning-cache/evidence/logs/green/phase0-schemas-validate.log`
- `/.recursive/run/27-router-runtime-difficulty-learning-cache/evidence/logs/green/phase0-protocol-routing-test.log`
- `/.recursive/run/27-router-runtime-difficulty-learning-cache/evidence/logs/green/phase0-runtime-host-bridge-test.log`
- `/.recursive/run/27-router-runtime-difficulty-learning-cache/evidence/logs/green/phase0-runtime-validate-vendors.log`

## Prior Recursive Evidence Reviewed

- `/.recursive/run/26-router-runtime-difficulty-guided-routing/03-implementation-summary.md`
- `/.recursive/run/26-router-runtime-difficulty-guided-routing/04-test-summary.md`
- `/.recursive/run/26-router-runtime-difficulty-guided-routing/05-manual-qa.md`
- `/.recursive/run/26-router-runtime-difficulty-guided-routing/06-decisions-update.md`
- `/.recursive/run/26-router-runtime-difficulty-guided-routing/07-state-update.md`
- `/.recursive/run/26-router-runtime-difficulty-guided-routing/08-memory-impact.md`

## Audit Context

- Audit Execution Mode: `self-audit`
- Subagent Availability: `available`
- Subagent Capability Probe: `task`, `code-review`, and recursive-mode subskills remain available in the current session.
- Delegation Decision Basis: `Phase 1 required direct reconciliation across bridge difficulty execution, SQLite persistence, endpoint-profile aggregation, protocol-routing inputs, and operator inspection surfaces.`
- Delegation Override Reason: `The gap spans a compact but tightly coupled slice, so controller-owned review was faster and less error-prone than splitting the analysis across multiple delegated reads.`
- Audit Inputs Provided:
  - `/.recursive/run/27-router-runtime-difficulty-learning-cache/00-requirements.md`
  - `/.recursive/run/27-router-runtime-difficulty-learning-cache/00-worktree.md`
  - `/docs/architecture/07-router-runtime-routing-strategy-lock.md`
  - `/.recursive/run/26-router-runtime-difficulty-guided-routing/03-implementation-summary.md`
  - `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
  - `/role-model-router/packages/runtime-observability/src/index.ts`
  - `/role-model-router/packages/sqlite-memory/src/index.ts`
  - `/role-model-router/packages/profile-aggregator/src/index.ts`
  - `/role-model-router/packages/protocol-routing/src/index.ts`

## Effective Inputs Re-read

- `/.recursive/run/27-router-runtime-difficulty-learning-cache/00-requirements.md`
- `/.recursive/run/27-router-runtime-difficulty-learning-cache/00-worktree.md`
- `/docs/architecture/07-router-runtime-routing-strategy-lock.md`
- `/.recursive/run/26-router-runtime-difficulty-guided-routing/03-implementation-summary.md`
- `/.recursive/STATE.md`
- `/.recursive/memory/domains/role-model-baseline.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `/role-model-router/packages/runtime-observability/src/index.ts`
- `/role-model-router/packages/sqlite-memory/src/index.ts`
- `/role-model-router/packages/profile-aggregator/src/index.ts`
- `/role-model-router/packages/protocol-routing/src/index.ts`

## Earlier Phase Reconciliation

- `00-worktree.md`: analysis is being performed from the isolated run-27 worktree and against the recorded run-26 baseline commit `3d47440b3641de91f099149e38b8a902568d4675`.
- `00-requirements.md`: the locked scope is conversation-level difficulty caching, segmented learned profiles, observed override semantics, advisory recommendations, rubric reuse, and TDD-backed repeated-request validation across local and remote endpoints.

## Subagent Contribution Verification

- Reviewed Action Records: `none`
- Main-Agent Verification Performed:
  - re-read the run-26 implementation artifact to anchor the current baseline honestly
  - traced the live bridge callsites that classify difficulty, read observed profiles, persist observations, and expose inspection surfaces
  - cross-checked SQLite schema and profile aggregation to verify that learned state is still endpoint-wide rather than difficulty-bucketed
- Acceptance Decision: `not applicable`
- Refresh Handling: `not applicable`
- Repair Performed After Verification:
  - `/.recursive/run/27-router-runtime-difficulty-learning-cache/01-as-is.md`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `3d47440b3641de91f099149e38b8a902568d4675`
- Comparison reference: `working-tree`
- Normalized baseline: `3d47440b3641de91f099149e38b8a902568d4675`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 3d47440b3641de91f099149e38b8a902568d4675`
- Base branch: `recursive/26-router-runtime-difficulty-guided-routing`
- Worktree branch: `recursive/27-router-runtime-difficulty-learning-cache`
- Actual changed files reviewed:
  - `/.agents/skills/recursive-mode/scripts/__pycache__/lint-recursive-run.cpython-314.pyc`
  - `/.recursive/run/27-router-runtime-difficulty-learning-cache/00-requirements.md`
  - `/.recursive/run/27-router-runtime-difficulty-learning-cache/00-worktree.md`
  - `/.recursive/run/27-router-runtime-difficulty-learning-cache/01-as-is.md`
  - `/.recursive/run/27-router-runtime-difficulty-learning-cache/evidence/logs/green/phase0-install-full.log`
  - `/.recursive/run/27-router-runtime-difficulty-learning-cache/evidence/logs/green/phase0-schemas-validate.log`
  - `/.recursive/run/27-router-runtime-difficulty-learning-cache/evidence/logs/green/phase0-protocol-routing-test.log`
  - `/.recursive/run/27-router-runtime-difficulty-learning-cache/evidence/logs/green/phase0-runtime-host-bridge-test.log`
  - `/.recursive/run/27-router-runtime-difficulty-learning-cache/evidence/logs/green/phase0-runtime-validate-vendors.log`
  - `/.recursive/run/27-router-runtime-difficulty-learning-cache/evidence/logs/green/phase0-post-baseline-status.log`
- Unexplained drift:
  - none; the tracked `__pycache__` file reflects local recursive-mode Python execution, and the run-27 requirement, worktree, and evidence files are the intended run-owned diff.

## Gaps Found

- none; the findings above are the intended Phase 1 current-state inventory that Phase 2 will plan to close.

## Repair Work Performed

- none in Phase 1; the missing cache, segmented learning, override, and recommendation behavior remains planned implementation work for later run-27 phases.

## Requirement Completion Status

- R1 | Status: blocked | Rationale: difficulty classification still executes per request with no persisted conversation-level cache or invalidation semantics. | Blocking Evidence: `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/packages/sqlite-memory/src/index.ts`
- R2 | Status: blocked | Rationale: samples, profile snapshots, routing reads, and inspection APIs are still endpoint-wide and do not segment history by `easy` / `medium` / `hard`. | Blocking Evidence: `/role-model-router/packages/runtime-observability/src/index.ts`, `/role-model-router/packages/sqlite-memory/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- R3 | Status: blocked | Rationale: `maxDifficulty` gating is still config-derived only and has no observed per-difficulty override path. | Blocking Evidence: `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/packages/protocol-routing/src/index.ts`
- R4 | Status: blocked | Rationale: no advisory recommendation model, storage, or operator readback surface exists yet. | Blocking Evidence: `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/packages/runtime-observability/src/index.ts`, `/role-model-router/packages/sqlite-memory/src/index.ts`
- R5 | Status: blocked | Rationale: request-level rubric signals exist, but learned profiles and downstream inspection layers do not yet reuse that rubric through bucketed state or evaluation-specific read models. | Blocking Evidence: `/role-model-router/packages/runtime-observability/src/index.ts`, `/role-model-router/packages/profile-aggregator/src/index.ts`, `/role-model-router/packages/protocol-routing/src/index.ts`
- R6 | Status: blocked | Rationale: current tests and runtime validators prove one-shot difficulty routing only, not repeated-request learning, cache semantics, or learned route changes over time. | Blocking Evidence: `/.recursive/run/27-router-runtime-difficulty-learning-cache/evidence/logs/green/phase0-runtime-host-bridge-test.log`, `/.recursive/run/27-router-runtime-difficulty-learning-cache/evidence/logs/green/phase0-runtime-validate-vendors.log`

## Audit Verdict

- Audit summary: the run-26 baseline already provides request-level difficulty classification, static `maxDifficulty` gating, and persisted difficulty diagnostics, but all learned-state surfaces remain endpoint-wide and stateless with respect to conversation reuse, per-difficulty aggregation, observed override, and advisory recommendation behavior.
Audit: PASS

## Traceability

- `R1` -> missing conversation-level cache ownership is documented under `## Current Behavior by Requirement`
- `R2` -> missing segmented per-difficulty persistence and inspection is documented under `## Current Behavior by Requirement`
- `R3` -> missing observed override behavior is documented under `## Current Behavior by Requirement`
- `R4` -> missing advisory recommendation surfaces are documented under `## Current Behavior by Requirement`
- `R5` -> missing rubric reuse in learned-state and evaluation-facing surfaces is documented under `## Current Behavior by Requirement`
- `R6` -> missing TDD targets and repeated-request end-to-end proof is documented under `## Current Behavior by Requirement`

## Coverage Gate

- [x] Every in-scope requirement has a concrete current-state analysis
- [x] The bridge, SQLite, observability, profile, protocol-routing, and inspection surfaces were re-read directly
- [x] The resulting gap inventory is specific enough to drive a concrete Phase 2 plan

Coverage: PASS

## Approval Gate

- [x] The Phase 1 analysis is specific enough for TO-BE planning
- [x] No unresolved ambiguity remains about what run 27 still needs to add beyond the run-26 baseline

Approval: PASS
