Run: `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/`
Phase: `02 TO-BE Plan`
Status: `LOCKED`
LockedAt: `2026-05-11T11:19:55Z`
LockHash: `35bbb8d48b11e1831069239428f009f11ee7476bf845ae8b6da87a19efa0b0c8`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/00-requirements.md`
- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/00-worktree.md`
- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/01-as-is.md`
- `/.recursive/RECURSIVE.md`
Outputs:
- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/02-to-be-plan.md`
Scope note: Defines the implementation plan for adaptive observed-data routing with recency-biased effective metrics and throughput-SLA penalties.

## TODO

- [x] Plan the RED tests that prove the adaptive-scoring gap
- [x] Plan the config, persistence, routing, diagnostics, and validation changes needed for recency and throughput-SLA behavior
- [x] Plan the end-to-end local-plus-remote verification path
- [x] Complete the audited Phase 2 sections and gates

## Planned Changes by File

- `/role-model-router/apps/runtime-host-bridge/test/unified-runtime-config.test.ts`
  - add RED coverage for `observedData` config parsing, defaults, validation errors, and round-trip rendering
- `/role-model-router/packages/sqlite-memory/test/index.test.ts`
  - add RED coverage for throughput-penalty persistence, penalty expiration, and deterministic recovery of active penalty state
- `/role-model-router/packages/protocol-routing/test/index.test.ts`
  - add RED routing tests proving fresher or higher-throughput candidates win once adaptive effective metrics are enabled
  - add RED coverage showing penalty-factor `0` excludes a penalized endpoint and non-zero penalties discount its score instead
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - add RED bridge tests proving request-observation diagnostics include effective metric and penalty details from live routing
- `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`
  - add RED local-plus-remote validation assertions that stale or under-threshold endpoints are penalized in live runtime behavior
- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
  - add the repo-owned `observedData` config contract, normalization, defaults, validation, and rendering support
- `/role-model-router/packages/sqlite-memory/src/index.ts`
  - add runtime-owned persistence and read helpers for throughput-SLA penalty state
  - keep the state keyed by endpoint and bounded by explicit activation and expiry timestamps
- `/role-model-router/packages/runtime-observability/src/index.ts`
  - extend routing diagnostics so request observations can report effective observed metrics, freshness inputs, and throughput-penalty state
- `/role-model-router/packages/core/src/router.ts`
  - replace raw observed-profile scoring with config-driven effective metrics
  - apply throughput-SLA eligibility or score discounting during candidate evaluation
- `/role-model-router/packages/protocol-routing/src/index.ts`
  - pass adaptive observed-data config and effective-observation metadata into route scoring and runtime diagnostics
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - build adaptive routing input from unified runtime config plus runtime state
  - evaluate and update penalty state during live routing while preserving exact-model request compatibility
  - emit diagnostic details through runtime observation bundles and inspection APIs
- `/role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
  - extend the runtime validator to exercise at least one local and one remote path with distinct freshness or throughput states and assert adaptive outcomes

## Implementation Steps

1. Write RED tests first in unified-runtime-config, sqlite-memory, protocol-routing, and runtime-host-bridge that fail against the current raw-profile routing path.
2. Add the `observedData` config contract with defaults for enablement, metric halflives, aggregation thresholds, throughput threshold, penalty timeout, and penalty factor.
3. Add SQLite persistence helpers for throughput-SLA penalty state so penalty activation and expiry are explicit runtime-owned facts.
4. Extend router inputs and diagnostics to carry adaptive observed-data config plus effective-metric and penalty details.
5. Rework candidate scoring so quality, latency, throughput, reliability, and cost use effective values derived from recency-biased observed data rather than raw latest profile values alone.
6. Apply throughput-SLA penalties during route evaluation:
   - penalty factor `0` makes an endpoint ineligible while the penalty window is active
   - non-zero penalty factors discount the endpoint's throughput contribution without exempting it from routing
7. Wire the bridge so live routing reads adaptive config and penalty state per request, preserves exact-model behavior, and persists any penalty transitions needed for future requests.
8. Extend `runtime:validate-vendors` and bridge tests to prove adaptive behavior across at least one local endpoint path and one remote endpoint path.
9. Re-run focused tests and runtime validators, then complete Phase 3 and Phase 4 receipts.

## Testing Strategy

- TDD Mode: `strict`
- RED plan:
  - add unified-runtime-config tests that fail until `observedData` exists with defaults and validation
  - add sqlite-memory tests that fail until throughput-penalty state can be persisted and read back deterministically
  - add protocol-routing tests that fail until effective freshness and penalty state change routing outcomes
  - add runtime-host-bridge tests that fail until request-observation diagnostics surface adaptive metrics and penalty state
  - extend vendor-validation tests so local and remote paths fail until adaptive behavior is exercised end to end
- GREEN plan:
  - implement config, persistence, routing, and diagnostics only after the RED tests fail
- Focused validation command set:
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge test`
  - `corepack pnpm --filter @role-model-router/sqlite-memory test`
  - `corepack pnpm --filter @role-model-router/protocol-routing test`
  - `corepack pnpm run runtime:validate-vendors`
  - `corepack pnpm run runtime:validate-host`

## Playwright Plan (if applicable)

- not applicable; verification is API-level and runtime-level rather than browser-driven in this run

## Manual QA Scenarios

1. Start the runtime host bridge from the run-24 worktree with adaptive observed-data config enabled.
2. Drive one local-backed route and one remote-backed route so both endpoints emit runtime observations.
3. Seed or replay freshness and throughput conditions such that one candidate is fresher and one candidate is under the configured throughput threshold.
4. Read `/api/role-model/requests/:id` and any relevant endpoint inspection surface after each request and confirm:
   - effective metric details show the decayed values used for routing
   - penalty state shows activation and expiry when throughput falls below threshold
   - local and remote endpoints are both subject to the same adaptive rules
5. Wait past the configured penalty timeout, re-run the penalized request, and confirm the endpoint returns to normal consideration without restarting the process.

## Idempotence and Recovery

- Parsing or rendering the new `observedData` config is deterministic and side-effect free.
- Reading effective metrics and penalty state from runtime-owned persistence is idempotent for a given request snapshot.
- If RED tests show that penalty state should be derived instead of persisted, narrow the implementation to one consistent ownership model before closing Phase 3.
- If adaptive diagnostics widen beyond the request-observation and validator surfaces planned here, stop and narrow the change before closing Phase 3.

## Implementation Sub-phases

### `SP1` RED tests for config and persistence

- add failing config tests for `observedData`
- add failing sqlite-memory tests for throughput-penalty state persistence and expiry

### `SP2` RED tests for adaptive route behavior

- add failing protocol-routing tests for freshness-sensitive scoring and throughput-penalty routing outcomes
- add failing bridge tests for adaptive routing diagnostics

### `SP3` Adaptive scoring and runtime-state implementation

- implement config parsing and defaults
- implement penalty-state persistence
- implement effective metric derivation and penalty-aware route scoring
- propagate adaptive diagnostics through bridge request observations

### `SP4` Local-plus-remote runtime proof

- extend runtime vendor validation to prove adaptive behavior on both local and remote paths
- capture final validation evidence for penalty activation, expiry, and route-outcome changes

## Prior Recursive Evidence Reviewed

- `/.recursive/run/23-router-runtime-live-observed-feedback/03-implementation-summary.md`
- `/.recursive/run/23-router-runtime-live-observed-feedback/04-test-summary.md`
- `/.recursive/run/23-router-runtime-live-observed-feedback/05-manual-qa.md`

## Audit Context

- Audit Execution Mode: `self-audit`
- Subagent Availability: `available`
- Subagent Capability Probe: `task`, `code-review`, and recursive-mode subskills remain available in the current session.`
- Delegation Decision Basis: `Phase 2 planning needed controller-owned mapping from the locked requirements to the exact config, persistence, routing, diagnostic, and validator changes that will enforce adaptive observed-data behavior.`
- Delegation Override Reason: `The implementation plan is tightly bound to the already-read runtime surfaces, so delegation would add more overhead than value.`
- Audit Inputs Provided:
  - `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/00-requirements.md`
  - `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/00-worktree.md`
  - `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/01-as-is.md`
  - `/.recursive/RECURSIVE.md`

## Effective Inputs Re-read

- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/00-requirements.md`
- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/00-worktree.md`
- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/01-as-is.md`
- `/.recursive/RECURSIVE.md`

## Earlier Phase Reconciliation

- `01-as-is.md`: the plan directly addresses the missing config surface, raw metric scoring, absent throughput-penalty state, and limited diagnostics without widening into alias pools or difficulty routing.
- `00-worktree.md`: the plan stays inside the isolated run-24 branch and the baseline captured from the locked run-23 commit.

## Subagent Contribution Verification

- Reviewed Action Records: `none`
- Main-Agent Verification Performed:
  - mapped each requirement to concrete config, sqlite-memory, protocol-routing, bridge, and validator file changes
  - checked that the planned validation set covers config parsing, focused adaptive scoring, and runtime-level local-plus-remote proof
- Acceptance Decision: `not applicable`
- Refresh Handling: `not applicable`
- Repair Performed After Verification:
  - `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/02-to-be-plan.md`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `b22533f44c20b2cbe2b5239bd07978ea59f9ad47`
- Comparison reference: `working-tree`
- Normalized baseline: `b22533f44c20b2cbe2b5239bd07978ea59f9ad47`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only b22533f44c20b2cbe2b5239bd07978ea59f9ad47`
- Base branch: `recursive/23-router-runtime-live-observed-feedback`
- Worktree branch: `recursive/24-router-runtime-recency-bias-throughput-sla`
- Planned or claimed changed files:
  - `/role-model-router/apps/runtime-host-bridge/test/unified-runtime-config.test.ts`
  - `/role-model-router/packages/sqlite-memory/test/index.test.ts`
  - `/role-model-router/packages/protocol-routing/test/index.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
  - `/role-model-router/packages/sqlite-memory/src/index.ts`
  - `/role-model-router/packages/runtime-observability/src/index.ts`
  - `/role-model-router/packages/core/src/router.ts`
  - `/role-model-router/packages/protocol-routing/src/index.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
  - `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/03-implementation-summary.md`
  - `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/04-test-summary.md`
  - `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/05-manual-qa.md`
  - `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/06-decisions-update.md`
  - `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/07-state-update.md`
  - `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/08-memory-impact.md`
- Actual changed files reviewed:
  - `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/00-worktree.md`
  - `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/01-as-is.md`
  - `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/02-to-be-plan.md`
  - `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/logs/green/phase0-artifact-lint.log`
  - `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/logs/green/phase0-install-full.log`
  - `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/logs/green/phase0-lock.log`
  - `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/logs/green/phase0-post-baseline-status.log`
  - `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/logs/green/phase0-runtime-host-bridge-test.log`
  - `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/logs/green/phase0-runtime-validate-vendors.log`
  - `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/logs/green/phase0-schemas-validate.log`
  - `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/logs/green/phase1-artifact-lint.log`
  - `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/logs/green/phase1-lock.log`
- Unexplained drift:
  - none

## Gaps Found

- none

## Repair Work Performed

- narrowed the implementation surface to adaptive config, penalty state, scoring, diagnostics, and runtime validation required for run 24

## Requirement Completion Status

- R1 | Status: blocked | Rationale: Phase 2 only plans the `observedData` config contract; implementation remains pending Phase 3. | Blocking Evidence: `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/02-to-be-plan.md`
- R2 | Status: blocked | Rationale: Phase 2 only plans recency-biased effective metric computation; implementation remains pending Phase 3. | Blocking Evidence: `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/02-to-be-plan.md`
- R3 | Status: blocked | Rationale: the throughput-SLA penalty lifecycle is planned but not yet implemented in runtime-owned persistence and routing. | Blocking Evidence: `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/02-to-be-plan.md`
- R4 | Status: blocked | Rationale: adaptive route scoring and diagnostics are planned but not yet wired through the live bridge. | Blocking Evidence: `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/02-to-be-plan.md`
- R5 | Status: blocked | Rationale: local-plus-remote parity is planned through shared adaptive routing behavior, but the implementation is still pending. | Blocking Evidence: `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/02-to-be-plan.md`
- R6 | Status: blocked | Rationale: RED tests and end-to-end adaptive runtime proof are planned but not yet executed. | Blocking Evidence: `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/02-to-be-plan.md`

## Audit Verdict

- Audit summary: the planned change surface is requirement-complete, test-first, and narrow enough to add adaptive observed-data routing without widening into later routing-strategy runs.
Audit: PASS

## Traceability

- `R1` -> `SP1`, `SP3`
- `R2` -> `SP2`, `SP3`
- `R3` -> `SP1`, `SP2`, `SP3`, `SP4`
- `R4` -> `SP2`, `SP3`, `SP4`
- `R5` -> `SP2`, `SP3`, `SP4`
- `R6` -> `SP1`, `SP2`, `SP4`

## Coverage Gate

- [x] Every in-scope requirement is covered by concrete files and sub-phases
- [x] RED, GREEN, and end-to-end validation are explicit
- [x] Expected changed files are specific enough for later diff reconciliation

Coverage: PASS

## Approval Gate

- [x] The plan is specific enough for implementation without reopening scope
- [x] No unresolved planning blocker remains

Approval: PASS
