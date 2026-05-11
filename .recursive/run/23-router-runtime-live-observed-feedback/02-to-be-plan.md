Run: `/.recursive/run/23-router-runtime-live-observed-feedback/`
Phase: `02 TO-BE Plan`
Status: `LOCKED`
LockedAt: `2026-05-11T10:38:11Z`
LockHash: `ee091f7f8e1f45c299f1c17fefce7deee9dbf3dcee5cad3666691ecdc4f669ca`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/23-router-runtime-live-observed-feedback/00-requirements.md`
- `/.recursive/run/23-router-runtime-live-observed-feedback/00-worktree.md`
- `/.recursive/run/23-router-runtime-live-observed-feedback/01-as-is.md`
- `/.recursive/RECURSIVE.md`
Outputs:
- `/.recursive/run/23-router-runtime-live-observed-feedback/02-to-be-plan.md`
Scope note: Defines the implementation plan for replacing fixture-fed routing reads with runtime-owned observed feedback while preserving exact-model compatibility.

## TODO

- [x] Plan the RED tests that will prove the current live-feedback gap
- [x] Plan the bridge and persistence changes needed to read runtime-owned observed profiles during routing
- [x] Plan the end-to-end local-plus-remote validation and inspection proof
- [x] Complete the audited Phase 2 sections and gates

## Planned Changes by File

- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - add failing tests proving that route reads use persisted runtime-owned observed profiles and surface route-source diagnostics
  - add failing local-plus-remote end-to-end assertions over the observation and endpoint-profile inspection APIs
- `/role-model-router/packages/sqlite-memory/src/index.ts`
  - add a helper that reads the latest observed profiles for a set of endpoint ids from runtime state
  - keep the helper SQLite-first and compatible with existing snapshot storage
- `/role-model-router/packages/sqlite-memory/test/index.test.ts`
  - add focused coverage for the new latest-profile map helper and deterministic empty-profile fallback
- `/role-model-router/packages/runtime-observability/src/index.ts`
  - extend `RuntimeRoutingDiagnostics` so request observations can report observed-profile source, measured-at time, and staleness/read mode
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - replace the startup fixture-only route source with a runtime-owned observed-profile read path
  - preserve exact-model behavior while reading fresh profiles from SQLite on each request
  - expose route-source diagnostics and return them through request-observation inspection
- `/role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
  - extend the runtime-level local-plus-remote validator to prove that requests write observed data and later reads come from runtime-owned state

## Implementation Steps

1. Write RED tests first in `runtime-host-bridge` and `sqlite-memory` that fail against the current fixture-fed routing read path.
2. Add a SQLite helper to load the latest observed profiles for the active registry endpoint set.
3. Extend runtime-observability routing diagnostics with observed-profile metadata:
   - source (`runtime-state` or `none`)
   - measured-at timestamp when a profile exists
   - read mode / staleness contract (`per-request`)
4. Rewire the bridge so each request loads observed profiles from runtime state instead of the startup fixture map.
5. Preserve exact-model routing and response semantics while making request observations expose the new observed-profile diagnostics.
6. Extend `runtime:validate-vendors` to exercise at least one local and one remote request, then assert that endpoint-profile inspection and request observations reflect runtime-owned observed data.
7. Re-run focused tests and runtime validators, then complete Phase 3 and Phase 4 receipts.

## Testing Strategy

- TDD Mode: `strict`
- RED plan:
  - add a bridge test that persists a new profile through a first request and proves a later route observation reports `runtime-state` instead of the startup fixture source
  - add a SQLite-memory test for the new latest-profile-by-endpoint read helper
  - extend vendor-validation tests so local and remote paths both fail before the live-feedback read path is rewired
- GREEN plan:
  - implement the helper and bridge wiring only after the RED tests fail
- Focused validation command set:
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge test`
  - `corepack pnpm --filter @role-model-router/sqlite-memory test`
  - `corepack pnpm run runtime:validate-vendors`
  - `corepack pnpm run runtime:validate-host`

## Playwright Plan (if applicable)

- not applicable; verification is API-level and runtime-level rather than browser-driven in this run

## Manual QA Scenarios

1. Start the runtime host bridge from the run-23 worktree.
2. Execute one remote-backed exact-model request and one local-backed exact-model request.
3. Read `/api/role-model/requests/:id` and `/api/role-model/endpoints/:endpointId/profile` after each request and confirm:
   - observed profile diagnostics report `runtime-state`
   - the measured-at timestamp updates after new requests
   - recent samples accumulate without restarting the process
4. Re-run a request without restarting and confirm the route inspection still reports the runtime-owned observed profile source.

## Idempotence and Recovery

- Reading latest observed profiles from SQLite is idempotent and side-effect free.
- If RED tests reveal that the validator relied on startup fixture profiles, recover by keeping fixtures as test bootstrap data only and routing exclusively from persisted state afterward.
- If schema or observation payload changes widen beyond the planned surfaces, stop and narrow the change before closing Phase 3.

## Implementation Sub-phases

### `SP1` RED tests for the feedback-loop gap

- add failing runtime-host-bridge tests for runtime-owned route reads and observed-profile diagnostics
- add failing SQLite-memory tests for batch latest-profile reads

### `SP2` Runtime-owned observed-profile read path

- add the SQLite helper
- rewire the bridge route-input construction to use runtime-owned observed profiles on each request
- keep exact-model compatibility intact

### `SP3` Diagnostics and end-to-end verification

- expose source and freshness details through runtime-observation routing diagnostics
- extend runtime vendor validation for local-plus-remote proof
- capture final validation evidence for request-write then route-read behavior

## Prior Recursive Evidence Reviewed

- `/.recursive/run/11-router-runtime-observability-feedback/03-implementation-summary.md`
- `/.recursive/run/15-unified-vendor-execution/04-test-summary.md`
- `/.recursive/run/22-router-runtime-routing-strategy-lock/03-implementation-summary.md`

## Audit Context

- Audit Execution Mode: `self-audit`
- Subagent Availability: `available`
- Subagent Capability Probe: `task`, `code-review`, and recursive-mode subskills remain available in the current session.`
- Delegation Decision Basis: `Phase 2 planning needed controller-owned mapping from the locked requirements to the exact RED tests, code surfaces, and runtime validators that will enforce the feedback-loop contract.`
- Delegation Override Reason: `The implementation plan is tightly bound to the already-read bridge and SQLite surfaces, so delegation would add more overhead than value.`
- Audit Inputs Provided:
  - `/.recursive/run/23-router-runtime-live-observed-feedback/00-requirements.md`
  - `/.recursive/run/23-router-runtime-live-observed-feedback/00-worktree.md`
  - `/.recursive/run/23-router-runtime-live-observed-feedback/01-as-is.md`
  - `/.recursive/RECURSIVE.md`

## Effective Inputs Re-read

- `/.recursive/run/23-router-runtime-live-observed-feedback/00-requirements.md`
- `/.recursive/run/23-router-runtime-live-observed-feedback/00-worktree.md`
- `/.recursive/run/23-router-runtime-live-observed-feedback/01-as-is.md`
- `/.recursive/RECURSIVE.md`

## Earlier Phase Reconciliation

- `01-as-is.md`: the plan directly addresses the startup fixture-read gap, the missing route-source diagnostics, and the missing local-plus-remote end-to-end proof without widening into alias or recency work.
- `00-worktree.md`: the plan stays inside the isolated run-23 branch and the baseline captured from the locked run-22 commit.

## Subagent Contribution Verification

- Reviewed Action Records: `none`
- Main-Agent Verification Performed:
  - mapped each requirement to concrete test, bridge, SQLite, and validator file changes
  - checked that the planned validation set covers both focused package tests and runtime-level end-to-end proof
- Acceptance Decision: `not applicable`
- Refresh Handling: `not applicable`
- Repair Performed After Verification:
  - `/.recursive/run/23-router-runtime-live-observed-feedback/02-to-be-plan.md`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `2defc8318411514b343da07ebd46fca4dbc6719b`
- Comparison reference: `working-tree`
- Normalized baseline: `2defc8318411514b343da07ebd46fca4dbc6719b`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 2defc8318411514b343da07ebd46fca4dbc6719b`
- Base branch: `recursive/22-router-runtime-routing-strategy-lock`
- Worktree branch: `recursive/23-router-runtime-live-observed-feedback`
- Planned or claimed changed files:
  - `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - `/role-model-router/packages/sqlite-memory/src/index.ts`
  - `/role-model-router/packages/sqlite-memory/test/index.test.ts`
  - `/role-model-router/packages/runtime-observability/src/index.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
  - `/.recursive/run/23-router-runtime-live-observed-feedback/03-implementation-summary.md`
  - `/.recursive/run/23-router-runtime-live-observed-feedback/04-test-summary.md`
  - `/.recursive/run/23-router-runtime-live-observed-feedback/05-manual-qa.md`
  - `/.recursive/run/23-router-runtime-live-observed-feedback/06-decisions-update.md`
  - `/.recursive/run/23-router-runtime-live-observed-feedback/07-state-update.md`
  - `/.recursive/run/23-router-runtime-live-observed-feedback/08-memory-impact.md`
- Actual changed files reviewed:
  - `/.recursive/run/23-router-runtime-live-observed-feedback/00-worktree.md`
  - `/.recursive/run/23-router-runtime-live-observed-feedback/01-as-is.md`
  - `/.recursive/run/23-router-runtime-live-observed-feedback/02-to-be-plan.md`
  - `/.recursive/run/23-router-runtime-live-observed-feedback/evidence/logs/green/phase0-install-full.log`
  - `/.recursive/run/23-router-runtime-live-observed-feedback/evidence/logs/green/phase0-schemas-validate.log`
  - `/.recursive/run/23-router-runtime-live-observed-feedback/evidence/logs/green/phase0-runtime-host-bridge-test.log`
  - `/.recursive/run/23-router-runtime-live-observed-feedback/evidence/logs/green/phase0-runtime-validate-vendors.log`
- Unexplained drift:
  - none

## Gaps Found

- none

## Repair Work Performed

- narrowed the implementation surface to the runtime-owned observed-data read loop, diagnostics, and validation path required for run 23

## Requirement Completion Status

- R1 | Status: blocked | Rationale: Phase 2 only plans the runtime-owned routing read path; implementation remains pending Phase 3. | Blocking Evidence: `/.recursive/run/23-router-runtime-live-observed-feedback/02-to-be-plan.md`
- R2 | Status: blocked | Rationale: Phase 2 only plans the bridge-to-SQLite wiring and verification path; implementation remains pending Phase 3. | Blocking Evidence: `/.recursive/run/23-router-runtime-live-observed-feedback/02-to-be-plan.md`
- R3 | Status: blocked | Rationale: the bounded-staleness read contract is planned but not yet implemented. | Blocking Evidence: `/.recursive/run/23-router-runtime-live-observed-feedback/02-to-be-plan.md`
- R4 | Status: blocked | Rationale: exact-model compatibility preservation is planned but not yet re-verified after code changes. | Blocking Evidence: `/.recursive/run/23-router-runtime-live-observed-feedback/02-to-be-plan.md`
- R5 | Status: blocked | Rationale: route-source diagnostics are planned but not yet exposed through runtime observations. | Blocking Evidence: `/.recursive/run/23-router-runtime-live-observed-feedback/02-to-be-plan.md`
- R6 | Status: blocked | Rationale: RED tests and local-plus-remote end-to-end proof are planned but not yet executed. | Blocking Evidence: `/.recursive/run/23-router-runtime-live-observed-feedback/02-to-be-plan.md`

## Audit Verdict

- Audit summary: the planned change surface is requirement-complete, test-first, and narrow enough to implement the live-feedback loop without widening into later routing-strategy runs.
Audit: PASS

## Traceability

- `R1` -> `SP1`, `SP2`
- `R2` -> `SP1`, `SP2`, `SP3`
- `R3` -> `SP2`, `SP3`
- `R4` -> `SP2`, `SP3`
- `R5` -> `SP2`, `SP3`
- `R6` -> `SP1`, `SP3`

## Coverage Gate

- [x] Every in-scope requirement is covered by concrete files and sub-phases
- [x] RED, GREEN, and end-to-end validation are explicit
- [x] Expected changed files are specific enough for later diff reconciliation

Coverage: PASS

## Approval Gate

- [x] The plan is specific enough for implementation without reopening scope
- [x] No unresolved planning blocker remains

Approval: PASS
