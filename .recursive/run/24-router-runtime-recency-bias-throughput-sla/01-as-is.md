Run: `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/`
Phase: `01 AS-IS`
Status: `LOCKED`
LockedAt: `2026-05-11T11:18:17Z`
LockHash: `91174171fd2b95fcb3843abdc1d8f66715a4538e536cbf4ae995e5ba475182c2`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/00-requirements.md`
- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/00-worktree.md`
- `/docs/architecture/07-router-runtime-routing-strategy-lock.md`
- `/role-model-router/packages/core/src/router.ts`
- `/role-model-router/packages/protocol-routing/src/index.ts`
- `/role-model-router/packages/runtime-observability/src/index.ts`
- `/role-model-router/packages/sqlite-memory/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`
Outputs:
- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/01-as-is.md`
Scope note: Documents the adaptive-observed-data gap before run 24 adds recency-biased effective metrics and throughput-SLA behavior.

## TODO

- [x] Re-read the locked run requirements and worktree basis
- [x] Re-read the scoring, routing, persistence, diagnostics, and runtime-config surfaces that own adaptive observed data
- [x] Document current behavior against every in-scope requirement
- [x] Complete the audited Phase 1 sections and gates

## Reproduction Steps (Novice-Runnable)

1. Open `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/00-requirements.md` and read `R1` through `R6`.
2. Search `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts` for `observedData`.
3. Search `/role-model-router/packages/protocol-routing/src/index.ts` for `observedProfilesByEndpointId`.
4. Search `/role-model-router/packages/core/src/router.ts` for `getEffectiveLatency`, `getQualityMetric`, `getLatencyMetric`, and `getThroughputMetric`.
5. Search `/role-model-router/apps/runtime-host-bridge/src/index.ts` for `readObservedProfilesForRouting` and `observedProfileDiagnostic`.
6. Search `/role-model-router/packages/sqlite-memory/src/index.ts` for `readLatestObservedProfilesByEndpointIds`, `readObservedPerformanceSamples`, and export helpers.
7. Run `corepack pnpm --filter @role-model-router/runtime-host-bridge test` and `corepack pnpm run runtime:validate-vendors` from the run-24 worktree to confirm the run-23 baseline is currently green.

## Current Behavior by Requirement

### `R1`

- The current unified runtime config only models routing strategy, llama-swap settings, and LiteLLM settings; there is no `observedData` config surface.
- No repo-owned runtime config contract currently exposes recency halflives, aggregation thresholds, or throughput-SLA penalty parameters.
- Because no config surface exists, adaptive observed-data behavior cannot be operator-controlled or validated through config parsing.

### `R2`

- `protocol-routing` forwards raw `observedProfilesByEndpointId` records directly into the core router as `candidate.observed`.
- The core router currently uses raw observed values directly:
  - `judge_score` for quality
  - `latency_ms_p50` and `latency_ms_p95` for latency
  - `tokens_per_sec` for throughput
  - `cost_per_1k_tokens_est` for cost
  - `failure_rate` for reliability
- No decay or freshness weighting is applied; only the raw latest profile values are used.

### `R3`

- SQLite runtime state currently stores observations, recent samples, and latest profile snapshots, but no persisted throughput-penalty or breach-window state exists.
- The router has no concept of an active penalty window, penalty factor, or exclusion state tied to under-threshold throughput.
- There is therefore no bounded penalty lifecycle that can become active, expire, and recover without a restart.

### `R4`

- The bridge already hot-reads latest observed profiles per request through `readObservedProfilesForRouting()`, but it passes only raw latest profiles into the route scorer.
- Current route diagnostics expose the observed-profile source and measured-at time, but they do not explain effective metric values, recency decay, or penalty effects.
- Exact-model routing is currently green, but adaptive scoring has not yet been integrated into live route selection.

### `R5`

- The run-23 baseline already applies the same raw observed-profile read path to both local and remote endpoints through the shared registry and bridge route input.
- That parity is implicit, not configurable: there is no endpoint-family-aware override surface for adaptive observed-data behavior because the behavior does not exist yet.
- The current code does not explicitly document or test that any future adaptive penalties must apply uniformly to local and remote endpoints.

### `R6`

- Current tests prove runtime-owned observed-profile reads and local-plus-remote readback, but no current RED test proves recency decay or throughput-penalty behavior.
- No current end-to-end validator demonstrates two endpoints with different freshness or throughput states producing different live routing outcomes.
- The baseline validation floor is strong enough to extend, but it currently proves only raw runtime-state consumption rather than adaptive routing behavior.

## Relevant Code Pointers

- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/packages/protocol-routing/src/index.ts`
- `/role-model-router/packages/core/src/router.ts`
- `/role-model-router/packages/runtime-observability/src/index.ts`
- `/role-model-router/packages/sqlite-memory/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`

## Known Unknowns

- Whether recency decay should operate directly on the latest profile fields, on exported sample windows, or on a hybrid derived state built from both.
- Whether throughput-SLA penalty state should live as dedicated SQLite tables/rows or be derivable from existing observations plus explicit config.
- Whether the adaptive diagnostics should surface effective metric values inside request-observation routing diagnostics, endpoint inspection reads, or both.

## Evidence

- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/00-requirements.md`
- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/00-worktree.md`
- `/docs/architecture/07-router-runtime-routing-strategy-lock.md`
- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/packages/protocol-routing/src/index.ts`
- `/role-model-router/packages/core/src/router.ts`
- `/role-model-router/packages/runtime-observability/src/index.ts`
- `/role-model-router/packages/sqlite-memory/src/index.ts`
- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/logs/green/phase0-runtime-host-bridge-test.log`
- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/logs/green/phase0-runtime-validate-vendors.log`

## Prior Recursive Evidence Reviewed

- `/.recursive/run/23-router-runtime-live-observed-feedback/03-implementation-summary.md`
- `/.recursive/run/23-router-runtime-live-observed-feedback/04-test-summary.md`
- `/.recursive/run/23-router-runtime-live-observed-feedback/05-manual-qa.md`
- `/.recursive/run/23-router-runtime-live-observed-feedback/06-decisions-update.md`
- `/.recursive/run/23-router-runtime-live-observed-feedback/07-state-update.md`
- `/.recursive/run/23-router-runtime-live-observed-feedback/08-memory-impact.md`

## Audit Context

- Audit Execution Mode: `self-audit`
- Subagent Availability: `available`
- Subagent Capability Probe: `task`, `code-review`, and recursive-mode subskills remain available in the current session.`
- Delegation Decision Basis: `Phase 1 required direct reconciliation across router scoring, bridge route input, SQLite state, diagnostics, and runtime config.`
- Delegation Override Reason: `The analysis surface is compact but tightly coupled, so controller-owned review was faster and less error-prone than delegating fragmented code reading.`
- Audit Inputs Provided:
  - `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/00-requirements.md`
  - `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/00-worktree.md`
  - `/docs/architecture/07-router-runtime-routing-strategy-lock.md`
  - `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `/role-model-router/packages/protocol-routing/src/index.ts`
  - `/role-model-router/packages/core/src/router.ts`
  - `/role-model-router/packages/runtime-observability/src/index.ts`
  - `/role-model-router/packages/sqlite-memory/src/index.ts`

## Effective Inputs Re-read

- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/00-requirements.md`
- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/00-worktree.md`
- `/docs/architecture/07-router-runtime-routing-strategy-lock.md`
- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/packages/protocol-routing/src/index.ts`
- `/role-model-router/packages/core/src/router.ts`
- `/role-model-router/packages/runtime-observability/src/index.ts`
- `/role-model-router/packages/sqlite-memory/src/index.ts`

## Earlier Phase Reconciliation

- `00-worktree.md`: analysis is being performed from the isolated run-24 worktree and against the recorded baseline commit `b22533f44c20b2cbe2b5239bd07978ea59f9ad47`.
- `00-requirements.md`: the locked scope is adaptive observed-data behavior only, not alias routing, difficulty segmentation, or controller-guided routing.

## Subagent Contribution Verification

- Reviewed Action Records: `none`
- Main-Agent Verification Performed:
  - re-read the current bridge route-input construction and diagnostics flow directly
  - cross-checked the core router scoring path against SQLite state and runtime config ownership
- Acceptance Decision: `not applicable`
- Refresh Handling: `not applicable`
- Repair Performed After Verification:
  - `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/01-as-is.md`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `b22533f44c20b2cbe2b5239bd07978ea59f9ad47`
- Comparison reference: `working-tree`
- Normalized baseline: `b22533f44c20b2cbe2b5239bd07978ea59f9ad47`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only b22533f44c20b2cbe2b5239bd07978ea59f9ad47`
- Base branch: `recursive/23-router-runtime-live-observed-feedback`
- Worktree branch: `recursive/24-router-runtime-recency-bias-throughput-sla`
- Actual changed files reviewed:
  - `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/00-worktree.md`
  - `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/01-as-is.md`
  - `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/logs/green/phase0-artifact-lint.log`
  - `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/logs/green/phase0-install-full.log`
  - `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/logs/green/phase0-lock.log`
  - `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/logs/green/phase0-post-baseline-status.log`
  - `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/logs/green/phase0-runtime-host-bridge-test.log`
  - `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/logs/green/phase0-runtime-validate-vendors.log`
  - `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/logs/green/phase0-schemas-validate.log`
- Unexplained drift:
  - none

## Gaps Found

- none; the findings above are the intended Phase 1 gap inventory that Phase 2 will plan to close

## Repair Work Performed

- none in Phase 1; the current gaps are planned implementation work for Phase 2 and Phase 3

## Requirement Completion Status

- R1 | Status: blocked | Rationale: no repo-owned `observedData` runtime config surface currently exists. | Blocking Evidence: `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`, `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/01-as-is.md`
- R2 | Status: blocked | Rationale: route scoring currently consumes raw observed profile values rather than recency-biased effective metrics. | Blocking Evidence: `/role-model-router/packages/protocol-routing/src/index.ts`, `/role-model-router/packages/core/src/router.ts`
- R3 | Status: blocked | Rationale: SQLite runtime state has no persisted throughput-penalty lifecycle or breach-window state. | Blocking Evidence: `/role-model-router/packages/sqlite-memory/src/index.ts`, `/role-model-router/packages/core/src/router.ts`
- R4 | Status: blocked | Rationale: live routing hot-reads raw observed profiles but does not yet integrate recency decay or SLA penalties into route scoring diagnostics. | Blocking Evidence: `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/packages/runtime-observability/src/index.ts`
- R5 | Status: blocked | Rationale: local-plus-remote parity exists for raw profile reads, but no adaptive scoring contract yet applies uniformly to both endpoint classes. | Blocking Evidence: `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`
- R6 | Status: blocked | Rationale: no failing test or end-to-end validator currently proves recency-biased or throughput-penalized routing outcomes. | Blocking Evidence: `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`, `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/evidence/logs/green/phase0-runtime-validate-vendors.log`

## Audit Verdict

- Audit summary: the current runtime already hot-reads raw observed profiles, but it lacks adaptive observed-data config, decay logic, throughput-penalty state, and diagnostics, so run 24 remains necessary and well-scoped.
Audit: PASS

## Traceability

- `R1` -> missing observed-data config is documented under `## Current Behavior by Requirement`
- `R2` -> raw observed-value route scoring is documented under `## Current Behavior by Requirement`
- `R3` -> absent throughput-penalty state is documented under `## Current Behavior by Requirement`
- `R4` -> missing adaptive scoring integration and diagnostics is documented under `## Current Behavior by Requirement`
- `R5` -> current local-plus-remote parity limit is documented under `## Current Behavior by Requirement`
- `R6` -> missing RED and end-to-end adaptive proof is documented under `## Current Behavior by Requirement`

## Coverage Gate

- [x] Every in-scope requirement has a concrete current-state analysis
- [x] Relevant scoring, routing, diagnostics, config, and baseline validation surfaces were re-read
- [x] The remaining gap is specific enough to drive a concrete Phase 2 plan

Coverage: PASS

## Approval Gate

- [x] The Phase 1 analysis is specific enough for TO-BE planning
- [x] No unresolved ambiguity remains about the adaptive observed-data gap

Approval: PASS
