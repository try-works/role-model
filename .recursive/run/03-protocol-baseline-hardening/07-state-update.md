Run: `/.recursive/run/03-protocol-baseline-hardening/`
Phase: `07 State Update`
Status: `LOCKED`
LockedAt: `2026-05-05T00:44:59Z`
LockHash: `be2b51472230b856e8d8692111ff86de4c8089d8eb963582fc43b70b52e5ecff`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/03-protocol-baseline-hardening/06-decisions-update.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
Outputs:
- `/.recursive/STATE.md`
- `/.recursive/run/03-protocol-baseline-hardening/07-state-update.md`
Scope note: This document records the exact `STATE.md` changes made after the run-03 M1-M3 hardening work was validated and recorded in the decisions ledger.

## TODO

- [x] Read the Phase 6 decisions receipt
- [x] Update `/.recursive/STATE.md` with the current truths from the validated hardening run
- [x] Record the concrete delta applied to the global state ledger
- [x] Reconcile the ledger text against the implemented system and validation evidence
- [x] Complete the audited-phase sections and gates

## State Changes Applied

- Updated path or section: `/.recursive/STATE.md#current-state`
- Current truth changed: the state summary now records that schema validation covers `19` schemas and `28` fixtures across valid, invalid, minimal, and edge coverage rather than only the thinner earlier fixture corpus.
- Current truth changed: the state summary now records that router decisions now emit `app_id`, stable `org_id`, explicit scored-candidate diagnostics, and role/task/binding-aware exclusion codes.
- Current truth changed: the state summary now records that observed-performance aggregation uses `measurement_window`, `endpoint_version`, benchmark/live-request source counts, and stable trace/usage linkage helpers.
- Current truth changed: the state summary now records that `gateway-smoke` is fixture-driven and self-validating against schemas and linkage helpers.
- Removed or superseded statement: the older bullet claiming a current validated root chain that included `build` without a run-03 validation receipt for `build`.

## Rationale

- Why these state changes were needed: the global state summary must now describe the hardened M1-M3 baseline that is actually true after run `03-protocol-baseline-hardening`.
- Why the interpretation changed: run `03-protocol-baseline-hardening` materially changed the public protocol, router, observability, and smoke-harness surface from the earlier run-01 state description.

## Resulting State Summary

- Link or section updated: `/.recursive/STATE.md#current-state`
- Current behavior delta: the repo now has a schema-tool-validated M1 fixture corpus, explainable router decisions, stable observability linkage helpers, and a self-validating smoke harness.
- Operational notes delta: the validated root command chain for the current baseline is `schemas:validate`, `test`, and `smoke`.
- Current limitations delta: unsupported-engine warnings under `Node v24` and the repo-wide CRLF/Biome drift remain unchanged and out of scope.

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `unavailable`
Subagent Capability Probe: `delegation remained unavailable for this run because no explicit user authorization for subagents was provided in the session.`
Delegation Decision Basis: `the state-ledger delta is compact and tightly coupled to the validated Phase 4, Phase 5, and Phase 6 receipts, so controller-owned closeout was the correct path.`
Audit Inputs Provided:
- `/.recursive/run/03-protocol-baseline-hardening/06-decisions-update.md`
- `/.recursive/run/03-protocol-baseline-hardening/05-manual-qa.md`
- `/.recursive/run/03-protocol-baseline-hardening/04-test-summary.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- Changed files:
  - `/.recursive/STATE.md`
  - `/docs/protocol/benchmarks.md`
  - `/docs/protocol/profiles.md`
  - `/docs/protocol/reason-codes.md`
  - `/docs/protocol/role-task-capability-mapping.md`
  - `/docs/protocol/roles.md`
  - `/docs/protocol/tasks.md`
  - `/docs/protocol/traces.md`
  - `/docs/protocol/usage.md`
  - `/packages/conformance/package.json`
  - `/packages/conformance/src/gateway-smoke-observability.test.ts`
  - `/packages/conformance/src/profile-aggregation-deterministic.test.ts`
  - `/packages/conformance/src/protocol-fixture-conformance.test.ts`
  - `/packages/conformance/src/protocol-schema-conformance.test.ts`
  - `/packages/conformance/src/router-conformance.test.ts`
  - `/packages/conformance/src/router-fixture-conformance.test.ts`
  - `/packages/conformance/src/router-role-task-eligibility.test.ts`
  - `/packages/schema-tools/src/index.ts`
  - `/packages/schema-tools/src/validate-schemas.ts`
  - `/packages/schema-tools/test/validate-schemas.test.ts`
  - `/packages/protocol-types/src/generated.ts`
  - `/protocol/fixtures/**`
  - `/protocol/schemas/router-decision.schema.json`
  - `/protocol/schemas/observed-performance-profile.schema.json`
  - `/protocol/schemas/role-binding.schema.json`
  - `/role-model-router/**`

## Effective Inputs Re-read

- `/.recursive/run/03-protocol-baseline-hardening/06-decisions-update.md`
- `/.recursive/run/03-protocol-baseline-hardening/05-manual-qa.md`
- `/.recursive/run/03-protocol-baseline-hardening/04-test-summary.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`

## Prior Recursive Evidence Reviewed

- `/.recursive/run/03-protocol-baseline-hardening/06-decisions-update.md`
- `/.recursive/DECISIONS.md`

## Earlier Phase Reconciliation

- Decisions receipt reflected: yes
- Current product truths reflected: yes
- Known caveats reflected: yes

## Subagent Contribution Verification

- Reviewed Action Records: `none`
- Main-Agent Verification Performed:
  - `/.recursive/run/03-protocol-baseline-hardening/07-state-update.md`
  - `/.recursive/run/03-protocol-baseline-hardening/06-decisions-update.md`
  - `/.recursive/STATE.md`
  - `/.recursive/DECISIONS.md`
- Acceptance Decision: `accepted`
- Refresh Handling: `not applicable`
- Repair Performed After Verification:
  - `/.recursive/run/03-protocol-baseline-hardening/07-state-update.md`
  - `/.recursive/STATE.md`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `bab679911e0e9688f483dc7b9989dc6bf5fdb223`
- Comparison reference: `working-tree`
- Normalized baseline: `bab679911e0e9688f483dc7b9989dc6bf5fdb223`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only bab679911e0e9688f483dc7b9989dc6bf5fdb223`
- Diff basis used: `git diff --ignore-cr-at-eol --name-only`
- Supplemental scope command: `git status --short --untracked-files=all`
- Base branch: `main`
- Worktree branch: `recursive/03-protocol-baseline-hardening`
- Actual changed files reviewed:
  - `.recursive/STATE.md`
  - `docs/protocol/benchmarks.md`
  - `docs/protocol/profiles.md`
  - `docs/protocol/reason-codes.md`
  - `docs/protocol/role-task-capability-mapping.md`
  - `docs/protocol/roles.md`
  - `docs/protocol/tasks.md`
  - `docs/protocol/traces.md`
  - `docs/protocol/usage.md`
  - `packages/conformance/package.json`
  - `packages/conformance/src/gateway-smoke-observability.test.ts`
  - `packages/conformance/src/observability-linkage.test.ts`
  - `packages/conformance/src/profile-aggregation-deterministic.test.ts`
  - `packages/conformance/src/protocol-fixture-conformance.test.ts`
  - `packages/conformance/src/protocol-schema-conformance.test.ts`
  - `packages/conformance/src/router-conformance.test.ts`
  - `packages/conformance/src/router-fixture-conformance.test.ts`
  - `packages/conformance/src/router-role-task-eligibility.test.ts`
  - `packages/protocol-types/src/generated.ts`
  - `packages/schema-tools/src/index.ts`
  - `packages/schema-tools/src/validate-schemas.ts`
  - `packages/schema-tools/test/validate-schemas.test.ts`
  - `pnpm-lock.yaml`
  - `protocol/fixtures/example-router-decision.json`
  - `protocol/fixtures/profile-golden/observed-performance-basic.json`
  - `protocol/fixtures/profile-golden/observed-performance-edge-error-rates.json`
  - `protocol/fixtures/profile-golden/observed-performance-invalid-missing-endpoint-version.json`
  - `protocol/fixtures/profile-golden/observed-performance-minimal.json`
  - `protocol/fixtures/role-task-golden/role-binding-invalid-status.json`
  - `protocol/fixtures/role-task-golden/role-binding-minimal.json`
  - `protocol/fixtures/role-task-golden/role-definition-minimal.json`
  - `protocol/fixtures/role-task-golden/task-definition-edge.json`
  - `protocol/fixtures/router-golden/cases/advisory-vs-hard-budget.json`
  - `protocol/fixtures/router-golden/cases/binding-capability-restriction.json`
  - `protocol/fixtures/router-golden/cases/binding-task-restriction.json`
  - `protocol/fixtures/router-golden/cases/cost-strategy-prefers-cheaper.json`
  - `protocol/fixtures/router-golden/cases/inactive-role-binding.json`
  - `protocol/fixtures/router-golden/cases/latency-strategy-prefers-faster.json`
  - `protocol/fixtures/router-golden/cases/local-preference.json`
  - `protocol/fixtures/router-golden/cases/measured-profile-partial-coverage.json`
  - `protocol/fixtures/router-golden/cases/measured-profile-prefers-observed.json`
  - `protocol/fixtures/router-golden/cases/preferred-capability-selection.json`
  - `protocol/fixtures/router-golden/cases/quality-strategy-prefers-better-judged.json`
  - `protocol/fixtures/router-golden/cases/remote-preference.json`
  - `protocol/fixtures/router-golden/cases/role-forbids-capability.json`
  - `protocol/fixtures/router-golden/cases/role-task-unsupported.json`
  - `protocol/fixtures/router-golden/cases/task-not-allowed-for-role.json`
  - `protocol/fixtures/router-golden/router-decision-basic.json`
  - `protocol/fixtures/router-golden/router-decision-edge-empty-selection.json`
  - `protocol/fixtures/router-golden/router-decision-invalid-missing-app-id.json`
  - `protocol/fixtures/router-golden/router-decision-minimal.json`
  - `protocol/fixtures/trace-golden/trace-event-edge-no-span.json`
  - `protocol/fixtures/trace-golden/trace-event-invalid-missing-request-id.json`
  - `protocol/fixtures/trace-golden/trace-span-minimal.json`
  - `protocol/fixtures/usage-golden/usage-event-edge-benchmark.json`
  - `protocol/fixtures/usage-golden/usage-event-invalid-missing-routing-decision.json`
  - `protocol/fixtures/usage-golden/usage-event-minimal.json`
  - `protocol/schemas/observed-performance-profile.schema.json`
  - `protocol/schemas/role-binding.schema.json`
  - `protocol/schemas/router-decision.schema.json`
  - `role-model-router/apps/gateway-smoke/src/index.ts`
  - `role-model-router/packages/core/package.json`
  - `role-model-router/packages/core/src/reason-codes.ts`
  - `role-model-router/packages/core/src/router.ts`
  - `role-model-router/packages/core/src/types.ts`
  - `role-model-router/packages/profile-aggregator/package.json`
  - `role-model-router/packages/profile-aggregator/src/index.ts`
  - `role-model-router/packages/trace/package.json`
  - `role-model-router/packages/trace/src/index.ts`
  - `role-model-router/packages/usage/package.json`
  - `role-model-router/packages/usage/src/index.ts`
- Excluded future-phase control-plane drift:
  - `.recursive/memory/domains/role-model-baseline.md`
- Unexplained drift:
  - none

## Gaps Found

- none

## Repair Work Performed

- rewrote the global current-state bullets so they explicitly capture the hardened fixture corpus, router decision surface, observability linkage helpers, and smoke-harness behavior

## Requirement Completion Status

- R1 | Status: verified | Changed Files: `/.recursive/STATE.md` | Implementation Evidence: `/.recursive/STATE.md` | Verification Evidence: `/.recursive/run/03-protocol-baseline-hardening/04-test-summary.md`, `/.recursive/run/03-protocol-baseline-hardening/05-manual-qa.md`
- R2 | Status: verified | Changed Files: `/.recursive/STATE.md` | Implementation Evidence: `/.recursive/STATE.md` | Verification Evidence: `/.recursive/run/03-protocol-baseline-hardening/04-test-summary.md`, `/.recursive/run/03-protocol-baseline-hardening/05-manual-qa.md`
- R3 | Status: verified | Changed Files: `/.recursive/STATE.md` | Implementation Evidence: `/.recursive/STATE.md` | Verification Evidence: `/.recursive/run/03-protocol-baseline-hardening/04-test-summary.md`, `/.recursive/run/03-protocol-baseline-hardening/05-manual-qa.md`
- R4 | Status: verified | Changed Files: `/.recursive/STATE.md` | Implementation Evidence: `/.recursive/STATE.md` | Verification Evidence: `/.recursive/run/03-protocol-baseline-hardening/04-test-summary.md`, `/.recursive/run/03-protocol-baseline-hardening/05-manual-qa.md`
- R5 | Status: verified | Changed Files: `/.recursive/STATE.md` | Implementation Evidence: `/.recursive/STATE.md` | Verification Evidence: `/.recursive/run/03-protocol-baseline-hardening/04-test-summary.md`, `/.recursive/run/03-protocol-baseline-hardening/05-manual-qa.md`

## Audit Verdict

- State ledger outcome: PASS
- Current-truth alignment: PASS
- Remaining blockers: none

Audit: PASS

## Traceability

- `R1` -> the global state now records the hardened schema and fixture validation baseline. | Evidence: `/.recursive/STATE.md`, `/.recursive/run/03-protocol-baseline-hardening/04-test-summary.md`
- `R2` -> the global state now records the explainable router-decision contract and role/task/binding-aware routing behavior. | Evidence: `/.recursive/STATE.md`, `/.recursive/run/03-protocol-baseline-hardening/04-test-summary.md`
- `R3` -> the global state now records fixture-driven routing conformance as a current repo truth. | Evidence: `/.recursive/STATE.md`, `/.recursive/run/03-protocol-baseline-hardening/04-test-summary.md`
- `R4` -> the global state now records stable observability linkage helpers and `measurement_window`/`endpoint_version` profile semantics. | Evidence: `/.recursive/STATE.md`, `/.recursive/run/03-protocol-baseline-hardening/04-test-summary.md`
- `R5` -> the global state now records the fixture-driven, self-validating smoke harness. | Evidence: `/.recursive/STATE.md`, `/.recursive/run/03-protocol-baseline-hardening/05-manual-qa.md`

## Coverage Gate

- [x] The decisions receipt was reread before updating the state ledger
- [x] The current behavior, limitations, and operational notes deltas are recorded
- [x] The receipt is reconciled against the final implementation and validation evidence
- [x] No known state drift remains

Coverage: PASS

## Approval Gate

- Objective readiness checks:
  - the run-03 truths are now discoverable in the global state ledger
  - the updated state matches the validated implementation and late-phase receipts
  - no required Phase 7 section is missing
- Remaining blockers:
  - none

Approval: PASS
