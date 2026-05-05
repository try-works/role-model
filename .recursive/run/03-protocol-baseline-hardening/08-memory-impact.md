Run: `/.recursive/run/03-protocol-baseline-hardening/`
Phase: `08 Memory Impact`
Status: `LOCKED`
LockedAt: `2026-05-05T00:44:59Z`
LockHash: `25875d1532a888ac80ac5d5d5a5ee0516528ff034fb6c705aa5a24045f2d9d86`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/03-protocol-baseline-hardening/00-worktree.md`
- `/.recursive/run/03-protocol-baseline-hardening/01-as-is.md`
- `/.recursive/run/03-protocol-baseline-hardening/02-to-be-plan.md`
- `/.recursive/run/03-protocol-baseline-hardening/03-implementation-summary.md`
- `/.recursive/run/03-protocol-baseline-hardening/04-test-summary.md`
- `/.recursive/run/03-protocol-baseline-hardening/05-manual-qa.md`
- `/.recursive/run/03-protocol-baseline-hardening/06-decisions-update.md`
- `/.recursive/run/03-protocol-baseline-hardening/07-state-update.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/STATE.md`
- `/.recursive/memory/domains/role-model-baseline.md`
Outputs:
- `/.recursive/run/03-protocol-baseline-hardening/08-memory-impact.md`
- `/.recursive/memory/domains/role-model-baseline.md`
Scope note: This document records the memory freshness review for the run-03 baseline hardening and the durable domain truth refreshed from this run.

## TODO

- [x] Read the diff basis from `00-worktree.md`
- [x] Compute the final changed-path scope
- [x] Exclude run-artifact churn unless explicitly relevant
- [x] Match changed paths to memory owners and watchers
- [x] Identify uncovered changed paths
- [x] Review affected memory docs against the final code, `STATE.md`, and `DECISIONS.md`
- [x] Update the owned memory docs as needed
- [x] Review skill-memory promotion candidates
- [x] Record final memory statuses
- [x] Complete the audited-phase sections and gates

## Diff Basis

- Base commit / anchor: `bab679911e0e9688f483dc7b9989dc6bf5fdb223`
- Head commit / comparison target: `working-tree`
- Exclusions applied: run-artifact churn under `/.recursive/run/**` was treated as control-plane evidence rather than product-memory ownership.

## Changed Paths Review

- Changed path scope: protocol docs, canonical schemas, fixtures, schema tooling, conformance, generated protocol types, router packages, smoke app, global ledgers, and the refreshed baseline domain shard.
  - Owning doc(s): `/.recursive/memory/domains/role-model-baseline.md`
  - Watching doc(s): `/.recursive/STATE.md`, `/.recursive/DECISIONS.md`
  - Review result: the baseline domain shard required a refresh to record the hardened schema fixture corpus, explainable router output, `measurement_window`/`endpoint_version` observability semantics, and the self-validating smoke harness.

## Affected Memory Docs

- `/.recursive/memory/domains/role-model-baseline.md`
  - Prior status: `CURRENT`
  - Final status: `CURRENT`
  - Change summary: refreshed the domain shard so it now records the 28-fixture validation manifest, the router's explainable scored-candidate surface, the `measurement_window` plus `endpoint_version` observed-profile contract, the trace/usage helper surface, and the fixture-driven smoke harness.
  - Final doc path to review: `/.recursive/memory/domains/role-model-baseline.md`

## Run-Local Skill Usage Capture

- Skill Usage Relevance: `relevant`
- Available Skills: `recursive-mode`, `recursive-worktree`, `recursive-tdd`, `recursive-debugging`, `recursive-review-bundle`, `recursive-subagent`
- Skills Sought: recursive orchestration and strict red/green implementation discipline
- Skills Attempted: `recursive-mode`, `recursive-tdd`
- Skills Used: `recursive-mode`, `recursive-tdd`
- Worked Well: the run stayed coherent because the locked Phase 2 plan plus strict RED/GREEN evidence kept schema, router, and observability work synchronized.
- Issues Encountered: none that generalized into reusable skill-memory guidance.
- Future Guidance: reuse the same controller-owned strict-TDD pattern for protocol-baseline runs that span schemas, generated types, conformance, and a smoke harness.
- Promotion Candidates: none

## Skill Memory Promotion Review

- Durable Skill Lessons Promoted: none
- Generalized Guidance Updated: none
- Run-Local Observations Left Unpromoted: this run mostly changed durable repository/domain truth rather than generic recursive skill behavior.
- Promotion Decision Rationale: the useful lasting lesson belongs in the product-domain memory shard, not in generalized skill-memory guidance.

## Uncovered Paths

- Changed path without owner:
  - Action: none remaining after refreshing the baseline domain shard
  - Follow-up note: control-plane files such as `/.recursive/run/**`, `/.recursive/STATE.md`, and `/.recursive/DECISIONS.md` remain intentionally outside product-domain ownership even when they trigger watcher updates

## Router and Parent Refresh

- `/.recursive/memory/MEMORY.md` changes: none
- `/.recursive/memory/skills/SKILLS.md` changes: none
- Parent doc updates: none required beyond the refreshed baseline domain shard

## Final Status Summary

- Restored to `CURRENT`: `/.recursive/memory/domains/role-model-baseline.md`
- Left as `SUSPECT`: none
- Marked `STALE`: none
- Deprecated / archived: none

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `unavailable`
Subagent Capability Probe: `delegation remained unavailable for this run because no explicit user authorization for subagents was provided in the session.`
Delegation Decision Basis: `memory maintenance depended on the controller-owned final diff, state ledger, and decisions ledger, so controller-owned closeout was the correct path.`
Audit Inputs Provided:
- `/.recursive/run/03-protocol-baseline-hardening/00-worktree.md`
- final validated run artifacts
- `/.recursive/DECISIONS.md`
- `/.recursive/STATE.md`
- affected memory docs
- Changed files:
  - `/.recursive/memory/domains/role-model-baseline.md`
  - `/.recursive/DECISIONS.md`
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

- `/.recursive/run/03-protocol-baseline-hardening/00-worktree.md`
- `/.recursive/run/03-protocol-baseline-hardening/03-implementation-summary.md`
- `/.recursive/run/03-protocol-baseline-hardening/04-test-summary.md`
- `/.recursive/run/03-protocol-baseline-hardening/06-decisions-update.md`
- `/.recursive/run/03-protocol-baseline-hardening/07-state-update.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/STATE.md`
- `/.recursive/memory/domains/role-model-baseline.md`

## Prior Recursive Evidence Reviewed

- `/.recursive/run/03-protocol-baseline-hardening/07-state-update.md`
- `/.recursive/memory/domains/role-model-baseline.md`

## Earlier Phase Reconciliation

- Final diff vs memory ownership: covered by the refreshed baseline domain shard
- State update vs memory truth: consistent
- Decisions update vs memory truth: consistent

## Subagent Contribution Verification

- Reviewed Action Records: `none`
- Main-Agent Verification Performed:
  - `/.recursive/run/03-protocol-baseline-hardening/08-memory-impact.md`
  - `/.recursive/run/03-protocol-baseline-hardening/07-state-update.md`
  - `/.recursive/STATE.md`
  - `/.recursive/DECISIONS.md`
  - `/.recursive/memory/domains/role-model-baseline.md`
- Acceptance Decision: `accepted`
- Refresh Handling: `not applicable`
- Repair Performed After Verification:
  - `/.recursive/run/03-protocol-baseline-hardening/08-memory-impact.md`
  - `/.recursive/memory/domains/role-model-baseline.md`

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
  - `.recursive/DECISIONS.md`
  - `.recursive/STATE.md`
  - `.recursive/memory/domains/role-model-baseline.md`
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
- Unexplained drift:
  - none

## Gaps Found

- none

## Repair Work Performed

- refreshed the baseline domain shard so memory now captures the hardened fixture corpus, explainable router output, stable observability linkage helpers, and the fixture-driven smoke harness

## Requirement Completion Status

- R1 | Status: verified | Changed Files: `/.recursive/memory/domains/role-model-baseline.md` | Implementation Evidence: `/.recursive/memory/domains/role-model-baseline.md` | Verification Evidence: `/.recursive/run/03-protocol-baseline-hardening/07-state-update.md`, `/.recursive/run/03-protocol-baseline-hardening/04-test-summary.md`
- R2 | Status: verified | Changed Files: `/.recursive/memory/domains/role-model-baseline.md` | Implementation Evidence: `/.recursive/memory/domains/role-model-baseline.md` | Verification Evidence: `/.recursive/run/03-protocol-baseline-hardening/07-state-update.md`, `/.recursive/run/03-protocol-baseline-hardening/04-test-summary.md`
- R3 | Status: verified | Changed Files: `/.recursive/memory/domains/role-model-baseline.md` | Implementation Evidence: `/.recursive/memory/domains/role-model-baseline.md` | Verification Evidence: `/.recursive/run/03-protocol-baseline-hardening/07-state-update.md`, `/.recursive/run/03-protocol-baseline-hardening/04-test-summary.md`
- R4 | Status: verified | Changed Files: `/.recursive/memory/domains/role-model-baseline.md` | Implementation Evidence: `/.recursive/memory/domains/role-model-baseline.md` | Verification Evidence: `/.recursive/run/03-protocol-baseline-hardening/07-state-update.md`, `/.recursive/run/03-protocol-baseline-hardening/04-test-summary.md`
- R5 | Status: verified | Changed Files: `/.recursive/memory/domains/role-model-baseline.md` | Implementation Evidence: `/.recursive/memory/domains/role-model-baseline.md` | Verification Evidence: `/.recursive/run/03-protocol-baseline-hardening/07-state-update.md`, `/.recursive/run/03-protocol-baseline-hardening/04-test-summary.md`

## Audit Verdict

- Memory freshness outcome: PASS
- Ownership coverage: PASS
- Remaining blockers: none

Audit: PASS

## Traceability

- `R1` -> the baseline domain shard now records the hardened schema and fixture validation baseline. | Evidence: `/.recursive/memory/domains/role-model-baseline.md`, `/.recursive/run/03-protocol-baseline-hardening/07-state-update.md`
- `R2` -> the baseline domain shard now records the explainable router output and binding-aware routing model. | Evidence: `/.recursive/memory/domains/role-model-baseline.md`, `/.recursive/run/03-protocol-baseline-hardening/07-state-update.md`
- `R3` -> the baseline domain shard now records fixture-driven routing conformance as durable repo truth. | Evidence: `/.recursive/memory/domains/role-model-baseline.md`, `/.recursive/run/03-protocol-baseline-hardening/07-state-update.md`
- `R4` -> the baseline domain shard now records `measurement_window` plus `endpoint_version` profile semantics and the trace/usage helper surface. | Evidence: `/.recursive/memory/domains/role-model-baseline.md`, `/.recursive/run/03-protocol-baseline-hardening/07-state-update.md`
- `R5` -> the baseline domain shard now records the fixture-driven self-validating smoke harness. | Evidence: `/.recursive/memory/domains/role-model-baseline.md`, `/.recursive/run/03-protocol-baseline-hardening/07-state-update.md`

## Coverage Gate

- [x] The final changed-path scope was reviewed against memory ownership
- [x] The affected domain shard was refreshed against the final state and decisions ledgers
- [x] Skill-memory promotion was considered and an explicit no-promotion decision was recorded
- [x] No uncovered owned paths remain

Coverage: PASS

## Approval Gate

- Objective readiness checks:
  - the changed product surface is covered by an up-to-date domain shard
  - the refreshed memory matches the final validated implementation
  - no required Phase 8 section is missing
- Remaining blockers:
  - none

Approval: PASS
