Run: `/.recursive/run/27-router-runtime-difficulty-learning-cache/`
Phase: `02 TO-BE Plan`
Status: `LOCKED`
LockedAt: `2026-05-11T14:03:42Z`
LockHash: `8032b253d57f9886a9f1508651c3a8aeba8fc6bf6ebc2087d1f1bcc168f57a66`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/27-router-runtime-difficulty-learning-cache/00-requirements.md`
- `/.recursive/run/27-router-runtime-difficulty-learning-cache/00-worktree.md`
- `/.recursive/run/27-router-runtime-difficulty-learning-cache/01-as-is.md`
- `/docs/architecture/07-router-runtime-routing-strategy-lock.md`
- `/.recursive/RECURSIVE.md`
Outputs:
- `/.recursive/run/27-router-runtime-difficulty-learning-cache/02-to-be-plan.md`
Scope note: Defines the implementation plan for conversation-level difficulty caching, segmented per-difficulty learned profiles, observed override behavior, and advisory recommendation readback on top of the locked run-26 difficulty-routing baseline.

## TODO

- [x] Plan the RED tests that prove the cache and learning gap
- [x] Plan the config, SQLite, observability, bridge, and validator changes needed for stateful difficulty learning
- [x] Plan the repeated-request local-plus-remote verification path
- [x] Complete the audited Phase 2 sections and gates

## Planned Changes by File

- `/role-model-router/apps/runtime-host-bridge/test/unified-runtime-config.test.ts`
  - add RED coverage for cache TTL, cache invalidation thresholds, observed override thresholds, and advisory recommendation config owned by the runtime
- `/role-model-router/packages/sqlite-memory/test/index.test.ts`
  - add RED coverage for persisted conversation-level difficulty cache rows, segmented per-difficulty samples or profile state, and recommendation readback helpers
- `/role-model-router/packages/runtime-observability/test/index.test.ts`
  - add RED coverage proving request observations and persisted samples carry the assigned difficulty plus learned-routing diagnostics without regressing the run-26 bundle shape
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - add RED bridge tests for cache hit and miss behavior, deterministic invalidation, segmented profile selection, observed override explanation, and advisory recommendation readback across both chat-completions and responses
- `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`
  - add RED repeated-request validation assertions that mixed local-plus-remote traffic changes later difficulty routing outcomes over time
- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
  - extend the runtime-owned observed-data contract with difficulty-learning config for cache reuse, invalidation, override thresholds, and recommendation derivation
- `/role-model-router/packages/sqlite-memory/src/index.ts`
  - add additive SQLite persistence and read helpers for conversation-scoped difficulty cache state, per-difficulty observed learning state, and operator-facing recommendation readback
- `/role-model-router/packages/runtime-observability/src/index.ts`
  - extend routing diagnostics and observed sample construction so difficulty-tagged learning state and override or recommendation explanations are durable
- `/role-model-router/packages/profile-aggregator/src/index.ts`
  - extend sample typing and helper behavior so segmented easy or medium or hard histories remain explicit while preserving the existing endpoint-wide aggregation baseline
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - add cache lookup and invalidation before classifier execution
  - read and write segmented learned state
  - apply observed override behavior on top of configured `maxDifficulty`
  - derive advisory recommendations and expose readback through runtime inspection or diagnostic surfaces
- `/role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
  - extend the runtime validator to drive repeated requests, inspect cache reuse, and prove observed-data-driven routing change across local and remote endpoints

## Implementation Steps

1. Write RED tests first for config parsing, SQLite persistence, runtime-observability bundle shape, bridge cache semantics, learned override behavior, and repeated-request runtime proof.
2. Extend the runtime-owned config contract so the bridge can make deterministic decisions for:
   - cache TTL or staleness budget
   - cache invalidation thresholds based on signal changes such as context growth, tool-count increase, or history growth
   - minimum-sample thresholds before observed override is allowed
   - explicit failure, quality, and throughput thresholds that can lower the effective `maxDifficulty`
   - advisory recommendation thresholds and readback enablement
3. Add additive SQLite persistence rather than replacing the run-26 endpoint-wide tables:
   - a conversation-level difficulty-cache surface keyed by conversation or equivalent continuity id
   - segmented per-difficulty learning state that can store or derive easy, medium, and hard request histories for an endpoint
   - helper reads for cache lookup, bucketed profile retrieval, and latest recommendation readback
4. Extend runtime-observability and the observed sample type so every live-request sample can carry the assigned difficulty bucket and enough learned-routing explanation to support later evaluation without introducing a second hidden rubric.
5. Rework bridge execution flow so each request:
   - resolves a deterministic conversation cache key
   - reuses cached classification when TTL and invalidation rules allow it
   - falls back to fresh classification when the cache is missing, expired, or invalidated
   - reads the current bucketed observed profile for each candidate endpoint
   - applies configuration-first `maxDifficulty` gating and then bucket-aware observed override behavior once sufficient evidence exists
   - persists the resulting difficulty-tagged sample, cache outcome, override explanation, and any advisory recommendation
6. Keep protocol-routing as reusable infrastructure where possible by supplying the current difficulty bucket's observed profile map from the bridge rather than widening the core routing contract unless RED proves a missing input.
7. Extend runtime inspection or diagnostic readback so operators can retrieve:
   - the latest difficulty cache result and whether it was reused or reclassified
   - segmented easy, medium, and hard profile summaries or recent samples for an endpoint
   - the current advisory `maxDifficulty` recommendation and the evidence behind it
8. Extend the live validator path to drive repeated requests through a mixed local-plus-remote alias pool and prove that learned hard-path underperformance can alter a later route while easier traffic still uses the existing pool honestly.
9. Re-run focused tests and runtime validators, then complete Phase 3 and Phase 4 receipts without widening into controller-guided or hybrid routing work.

## Testing Strategy

- TDD Mode: `strict`
- RED plan:
  - add unified-runtime-config tests that fail until cache reuse, invalidation, override, and recommendation thresholds parse and render correctly
  - add sqlite-memory tests that fail until conversation-level cache state, segmented learning rows, and recommendation readback persist correctly
  - add runtime-observability tests that fail until difficulty-tagged live-request samples and learned diagnostics remain durable
  - add bridge tests that fail until cached classification reuse, invalidation, bucketed profile reads, override behavior, and recommendation readback work for both request shapes
  - extend runtime vendor-validation tests so repeated local-plus-remote traffic fails until a later route can change based on learned difficulty-specific behavior
- GREEN plan:
  - implement config, persistence, observability, bridge orchestration, and validator changes only after the RED tests fail
- Focused validation command set:
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge test`
  - `corepack pnpm --filter @role-model-router/sqlite-memory test`
  - `corepack pnpm --filter @role-model-router/runtime-observability test`
  - `corepack pnpm --filter @role-model-router/protocol-routing test`
  - `corepack pnpm run runtime:validate-vendors`
  - `corepack pnpm run runtime:validate-host`
  - `corepack pnpm run schemas:validate`

## Playwright Plan (if applicable)

- not applicable; this run remains API-level and runtime-level rather than browser-driven

## Manual QA Scenarios

1. Start the run-27 runtime against a difficulty-mode alias pool that includes at least one local endpoint and one remote endpoint.
2. Send an initial moderate request on one conversation path and confirm the runtime records a fresh difficulty classification plus a cache-miss or cache-fill outcome.
3. Send a semantically similar follow-up request on the same conversation path and confirm the runtime reuses the cached difficulty when TTL and invalidation rules still allow it.
4. Send a materially harder follow-up on that same conversation path and confirm the runtime invalidates the prior cache entry, reclassifies to a harder bucket, and records the invalidation reason.
5. Drive repeated hard-path requests through a mixed pool where one endpoint performs poorly on the hard bucket and confirm a later hard request excludes or clearly down-ranks that endpoint while easier traffic remains eligible.
6. Read the operator-facing request or endpoint diagnostics and confirm:
   - the assigned difficulty stays consistent with the stored rubric signals
   - segmented bucket state is visible
   - any advisory `maxDifficulty` recommendation is explicitly marked advisory and does not mutate config

## Idempotence and Recovery

- Cache reuse must be deterministic: the same cache state plus the same current signals must produce the same reuse or invalidation outcome.
- If segmented learning state is absent or sample counts are below threshold, configured `maxDifficulty` remains authoritative and the bridge falls back to the run-26 behavior.
- Advisory recommendations must never mutate runtime config automatically; they remain readback-only until a later explicit operator action outside this run.
- The implementation should prefer additive SQLite state so existing endpoint-wide observations and inspection surfaces stay readable while segmented learning is introduced.
- If RED tests show protocol-routing needs wider inputs than the bridge can safely supply, stop and narrow the change to the minimal additive routing input required for this run only.

## Implementation Sub-phases

### `SP1` RED tests for config and persistence ownership

- add failing config tests for cache TTL, invalidation thresholds, observed override thresholds, and recommendation configuration
- add failing sqlite-memory tests for cache persistence, segmented bucket reads, and recommendation readback
- add failing runtime-observability tests for difficulty-tagged learning diagnostics

### `SP2` RED tests for bridge cache and learning behavior

- add failing bridge tests for cache hit and miss, explicit invalidation, bucketed profile selection, and observed override explanation
- add failing repeated-request validator tests for learned route change across local and remote endpoints

### `SP3` Additive storage and observability implementation

- implement the runtime-owned config contract for difficulty learning
- implement additive SQLite persistence and helper reads for cache state, segmented learned state, and recommendation readback
- implement difficulty-tagged sample and diagnostics support in runtime-observability and the aggregator-facing types

### `SP4` Bridge integration for cache, overrides, and recommendations

- implement cache lookup and update around classifier execution
- route using the current difficulty bucket's learned state
- apply observed override behavior above configured `maxDifficulty` only when thresholds are met
- expose segmented profile and recommendation readback through runtime inspection surfaces

### `SP5` Repeated-request local-plus-remote runtime proof

- extend runtime vendor validation to drive repeated mixed-pool traffic that changes later hard-path routing outcomes
- capture final evidence that cache reuse, invalidation, segmented state, override explanation, and advisory recommendations work without regressing exact-model compatibility

## Prior Recursive Evidence Reviewed

- `/.recursive/run/26-router-runtime-difficulty-guided-routing/03-implementation-summary.md`
- `/.recursive/run/26-router-runtime-difficulty-guided-routing/04-test-summary.md`
- `/.recursive/run/26-router-runtime-difficulty-guided-routing/05-manual-qa.md`

## Audit Context

- Audit Execution Mode: `self-audit`
- Subagent Availability: `available`
- Subagent Capability Probe: `task`, `code-review`, and recursive-mode subskills remain available in the current session.
- Delegation Decision Basis: `Phase 2 planning needed controller-owned mapping from the locked requirements and Phase 1 findings to exact test, SQLite, observability, bridge, and validator changes.`
- Delegation Override Reason: `The implementation plan depends on already-read coupled surfaces, so splitting it into delegated fragments would add overhead and increase drift risk.`
- Audit Inputs Provided:
  - `/.recursive/run/27-router-runtime-difficulty-learning-cache/00-requirements.md`
  - `/.recursive/run/27-router-runtime-difficulty-learning-cache/00-worktree.md`
  - `/.recursive/run/27-router-runtime-difficulty-learning-cache/01-as-is.md`
  - `/docs/architecture/07-router-runtime-routing-strategy-lock.md`
  - `/.recursive/RECURSIVE.md`

## Effective Inputs Re-read

- `/.recursive/run/27-router-runtime-difficulty-learning-cache/00-requirements.md`
- `/.recursive/run/27-router-runtime-difficulty-learning-cache/00-worktree.md`
- `/.recursive/run/27-router-runtime-difficulty-learning-cache/01-as-is.md`
- `/docs/architecture/07-router-runtime-routing-strategy-lock.md`
- `/.recursive/RECURSIVE.md`

## Earlier Phase Reconciliation

- `01-as-is.md`: the plan directly addresses the identified lack of conversation cache state, bucketed learned profiles, observed override semantics, and advisory recommendation readback without widening into controller-guided or hybrid routing.
- `00-worktree.md`: the plan stays inside the isolated run-27 worktree and the baseline captured from committed run-26 commit `3d47440b3641de91f099149e38b8a902568d4675`.

## Subagent Contribution Verification

- Reviewed Action Records: `none`
- Main-Agent Verification Performed:
  - mapped each requirement to concrete config, SQLite, observability, bridge, and validator changes
  - checked that the planned validation set covers cache semantics, segmented learning, override behavior, recommendation readback, and repeated-request runtime proof
  - narrowed the plan so protocol-routing can remain reused unless failing tests prove an additional input is required
- Acceptance Decision: `not applicable`
- Refresh Handling: `not applicable`
- Repair Performed After Verification:
  - `/.recursive/run/27-router-runtime-difficulty-learning-cache/02-to-be-plan.md`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `3d47440b3641de91f099149e38b8a902568d4675`
- Comparison reference: `working-tree`
- Normalized baseline: `3d47440b3641de91f099149e38b8a902568d4675`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 3d47440b3641de91f099149e38b8a902568d4675`
- Base branch: `recursive/26-router-runtime-difficulty-guided-routing`
- Worktree branch: `recursive/27-router-runtime-difficulty-learning-cache`
- Planned or claimed changed files:
  - `/role-model-router/apps/runtime-host-bridge/test/unified-runtime-config.test.ts`
  - `/role-model-router/packages/sqlite-memory/test/index.test.ts`
  - `/role-model-router/packages/runtime-observability/test/index.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
  - `/role-model-router/packages/sqlite-memory/src/index.ts`
  - `/role-model-router/packages/runtime-observability/src/index.ts`
  - `/role-model-router/packages/profile-aggregator/src/index.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
  - `/.recursive/run/27-router-runtime-difficulty-learning-cache/03-implementation-summary.md`
  - `/.recursive/run/27-router-runtime-difficulty-learning-cache/04-test-summary.md`
  - `/.recursive/run/27-router-runtime-difficulty-learning-cache/05-manual-qa.md`
  - `/.recursive/run/27-router-runtime-difficulty-learning-cache/06-decisions-update.md`
  - `/.recursive/run/27-router-runtime-difficulty-learning-cache/07-state-update.md`
  - `/.recursive/run/27-router-runtime-difficulty-learning-cache/08-memory-impact.md`
- Actual changed files reviewed:
  - `/.agents/skills/recursive-mode/scripts/__pycache__/lint-recursive-run.cpython-314.pyc`
  - `/.recursive/run/27-router-runtime-difficulty-learning-cache/00-requirements.md`
  - `/.recursive/run/27-router-runtime-difficulty-learning-cache/00-worktree.md`
  - `/.recursive/run/27-router-runtime-difficulty-learning-cache/01-as-is.md`
  - `/.recursive/run/27-router-runtime-difficulty-learning-cache/02-to-be-plan.md`
  - `/.recursive/run/27-router-runtime-difficulty-learning-cache/evidence/logs/green/phase0-install-full.log`
  - `/.recursive/run/27-router-runtime-difficulty-learning-cache/evidence/logs/green/phase0-schemas-validate.log`
  - `/.recursive/run/27-router-runtime-difficulty-learning-cache/evidence/logs/green/phase0-protocol-routing-test.log`
  - `/.recursive/run/27-router-runtime-difficulty-learning-cache/evidence/logs/green/phase0-runtime-host-bridge-test.log`
  - `/.recursive/run/27-router-runtime-difficulty-learning-cache/evidence/logs/green/phase0-runtime-validate-vendors.log`
  - `/.recursive/run/27-router-runtime-difficulty-learning-cache/evidence/logs/green/phase0-post-baseline-status.log`
- Unexplained drift:
  - none; the tracked `__pycache__` file reflects local recursive-mode Python execution, and the run-27 requirement, worktree, and evidence files are the intended run-owned diff

## Gaps Found

- none

## Repair Work Performed

- narrowed the implementation surface so run 27 adds cache and learning behavior on top of run 26 without prematurely widening into controller-guided routing, request rewriting, or UI convergence work

## Requirement Completion Status

- R1 | Status: blocked | Rationale: Phase 2 only plans conversation-level cache ownership and invalidation; implementation remains pending Phase 3. | Blocking Evidence: `/.recursive/run/27-router-runtime-difficulty-learning-cache/02-to-be-plan.md`
- R2 | Status: blocked | Rationale: Phase 2 only plans segmented per-difficulty persistence and inspection; implementation remains pending Phase 3. | Blocking Evidence: `/.recursive/run/27-router-runtime-difficulty-learning-cache/02-to-be-plan.md`
- R3 | Status: blocked | Rationale: observed override thresholds and behavior are planned but not yet implemented. | Blocking Evidence: `/.recursive/run/27-router-runtime-difficulty-learning-cache/02-to-be-plan.md`
- R4 | Status: blocked | Rationale: advisory recommendation derivation and readback are planned but not yet implemented. | Blocking Evidence: `/.recursive/run/27-router-runtime-difficulty-learning-cache/02-to-be-plan.md`
- R5 | Status: blocked | Rationale: shared rubric reuse across learned-state surfaces is planned but not yet implemented. | Blocking Evidence: `/.recursive/run/27-router-runtime-difficulty-learning-cache/02-to-be-plan.md`
- R6 | Status: blocked | Rationale: RED tests and repeated-request end-to-end runtime proof are planned but not yet executed. | Blocking Evidence: `/.recursive/run/27-router-runtime-difficulty-learning-cache/02-to-be-plan.md`

## Audit Verdict

- Audit summary: the planned change surface is requirement-complete, TDD-first, and narrow enough to add stateful difficulty learning on top of the run-26 baseline without prematurely widening into later controller or hybrid runs.
Audit: PASS

## Traceability

- `R1` -> `SP1`, `SP2`, `SP4`, `SP5`
- `R2` -> `SP1`, `SP3`, `SP4`, `SP5`
- `R3` -> `SP1`, `SP2`, `SP4`, `SP5`
- `R4` -> `SP1`, `SP3`, `SP4`, `SP5`
- `R5` -> `SP1`, `SP3`, `SP4`
- `R6` -> `SP1`, `SP2`, `SP5`

## Coverage Gate

- [x] Every in-scope requirement is covered by concrete files and sub-phases
- [x] RED, GREEN, and repeated-request local-plus-remote validation are explicit
- [x] Expected changed files are specific enough for later diff reconciliation

Coverage: PASS

## Approval Gate

- [x] The Phase 2 plan is specific enough for implementation
- [x] The planned surface stays within run-27 scope and preserves later controller, hybrid, and UI work for later runs

Approval: PASS
