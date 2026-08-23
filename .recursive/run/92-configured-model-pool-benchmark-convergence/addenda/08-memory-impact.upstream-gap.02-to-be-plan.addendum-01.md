Run: `/.recursive/run/92-configured-model-pool-benchmark-convergence/`
Phase: `08 Memory Impact upstream-gap remediation plan`
Status: `LOCKED`
LockedAt: `2026-08-21T14:25:49Z`
LockHash: `ddeca69a2256eeeb8a233344b6e23dd8b9f01b2aa7f50819293be50593d17bfc`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/92-configured-model-pool-benchmark-convergence/08-memory-impact.md` (LOCKED)
- `/.recursive/run/92-configured-model-pool-benchmark-convergence/addenda/08-memory-impact.upstream-gap.00-requirements.addendum-01.md` (DRAFT at authoring)
- `/.recursive/run/92-configured-model-pool-benchmark-convergence/02-to-be-plan.md` (LOCKED)
- `/.recursive/run/92-configured-model-pool-benchmark-convergence/05-manual-qa.md` (LOCKED)
Outputs:
- `/.recursive/run/92-configured-model-pool-benchmark-convergence/addenda/08-memory-impact.upstream-gap.02-to-be-plan.addendum-01.md`
Scope note: This is the file-concrete, strict-TDD remediation plan for the effective requirements addendum. It does not authorize implementation in the closed Run 92 worktree or stage promotion before fresh repair evidence exists.

## TODO

- [x] Convert each effective acceptance condition into an owning repair slice.
- [x] Define behavioral RED-GREEN-REFACTOR evidence for every repair slice.
- [x] Define the hash-bound rebuilt-runtime/browser/API delivery gate.

## Remediation Plan

### RP1 — Canonical endpoint benchmark-profile revision

**Owns:** `benchmark-artifacts.ts`, `benchmark-runner.ts`, `benchmark-summary.ts`, `sqlite-memory/src/index.ts`, and focused host/sqlite integration tests.

Create/persist a profile revision distinct from membership revision, bound to exact endpoint variant, suite/version, membership revision, completion state, result/profile receipt, and completion ordering. Project it from the canonical configured-pool and benchmark portfolio read models.

**Strict TDD:** RED benchmark completion twice under unchanged membership but different valid results; assert only that endpoint’s revision changes. GREEN minimal persistence/projection. RED negative cases for failed/cancelled/stale/mismatched/sibling results; GREEN refusal. REFACTOR canonical revision serialization/order.

### RP2 — Immutable routing-decision provenance

**Owns:** host decision creation/persistence in `src/index.ts` and routing/telemetry integration tests.

Persist membership/profile revision when a decision is made. Decision reads must project stored values only; no current-endpoint recomputation and no membership-to-profile alias.

**Strict TDD:** RED decision after benchmark A, benchmark B with unchanged membership, then prove first readback remains A and later decision is B. RED membership change after a decision, then prove historic decision is unchanged. GREEN persist/projection repair after each RED.

### RP3 — Deterministic legacy reconciliation

**Owns:** `sqlite-memory/src/index.ts`, `sqlite-memory/test/index.test.ts`, and benchmark diagnostics/summary projection.

Quarantine or ignore no-revision/ambiguous legacy samples before profile aggregation, with an honest reason/count. Retain legacy samples only if a documented exact compatibility predicate proves them valid.

**Strict TDD:** RED ambiguous no-revision sample contributes to current profile; GREEN quarantine/diagnostic. RED exact-compatible legacy sample behavior; GREEN retain only if supported, otherwise reject explicitly. Re-run stale/mismatched/clear/restart coverage.

### RP4 — Canonical-consumer convergence

**Owns:** canonical pool API, runtime API/view models, Overview, Models, Benchmark, Router Candidates, Controller/Strategy, and Decisions surfaces.

**Strict TDD:** RED endpoint revision appears on one scoped consumer but not another; GREEN one canonical projection. RED/GREEN clear/eject/reconnect/restart ghost-profile cases. No production fixture/mock fallback may be introduced.

### RP5 — Mandatory rebuilt-runtime browser/API QA

Build the final executable/bundle in a fresh isolated repair worktree. Use a supervised deterministic non-local controller-backed upstream and production host APIs—not source helpers—to execute:

1. configure variants and run benchmark;
2. verify exact selected IDs/result/profile revision on Overview, Models, Benchmark, Candidates, Controller/Strategy, Decisions;
3. route a request and inspect the persisted decision’s exact revisions;
4. browser-confirm final-controller eject, verify empty/no-eligible state, restart, and verify no ghosts.

Record executable/bundle SHA-256, commit, command, port, isolated root, configuration digest, benchmark/result/request/decision IDs, screenshots, and restart receipt. A mandatory scenario cannot be `N/A`.

### RP6 — Re-audit and delivery

Run targeted and full relevant suites/build/package verification, audit original R3–R8 plus A1–A5 against the repair diff, update Phase 3–8 remediation receipts/addenda, and require green CI on the corrective dev merge. Only then open a reviewed `dev → stage` promotion PR and mint a new immutable stage RC. No existing stage RC overwrite and no main promotion.

## Verification Matrix

- Unit: revision canonicalization, profile/decision serialization, legacy reconciliation.
- Integration: benchmark completion → canonical profile → later route → immutable decision readback.
- Regression: sibling variants, membership churn, failed/cancelled/stale results, clear/eject/reconnect/restart, ambiguous legacy sample.
- Browser/API: every original Run 92 surface, destructive eject confirmation/recovery, no fixtures.
- Rebuilt runtime: hash-bound execution and isolated-state restart.
- Delivery: corrective dev CI and reviewed stage-promotion PR.

## Audit Context

Audit Execution Mode: self-audit
Subagent Availability: available
Subagent Capability Probe: stage-readiness audit independently corroborated the Phase 5 and provenance gaps.
Delegation Decision Basis: a repair implementation/review agent must be assigned in the new repair worktree; this document only fixes the closed run’s plan gap.
Delegation Override Reason: no delegated plan output is accepted as canonical.
Audit Inputs Provided:
- locked original plan/QA
- requirements upstream-gap addendum
- current decision/profile evidence

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `d59f07b91e7b23c25e7297860a0f9c967b342b7a`
- Comparison reference: `origin/dev` merge `60f346e2`
- Normalized baseline: `d59f07b91e7b23c25e7297860a0f9c967b342b7a`
- Normalized comparison: `60f346e2`
- Normalized diff command: `git diff --name-only d59f07b91e7b23c25e7297860a0f9c967b342b7a 60f346e2 -- role-model-router`
- Planned or claimed changed files: RP1–RP4 product/test paths; RP5–RP6 evidence/control-plane paths.
- Actual changed files reviewed: original Run 92 diff only; no repair product diff exists.
- Unexplained drift: none.

## Subagent Contribution Verification

- Reviewed Action Records: none.
- Main-Agent Verification Performed: reconciled requirements addendum against the original plan and the observed source/QA gaps.
- Acceptance Decision: accepted as the remediation plan only.
- Refresh Handling: rebuild the review bundle/action records from the repair worktree before implementation.
- Repair Performed After Verification: none.

## Requirement Completion Status

- `A1` | Status: planned | Implementation Surface: RP1/RP2 | Verification Surface: behavioral host/sqlite/routing tests | QA Surface: RP5
- `A2` | Status: planned | Implementation Surface: RP3 | Verification Surface: legacy reconciliation regressions | QA Surface: RP5
- `A3` | Status: planned | Implementation Surface: RP5 runtime harness/evidence | Verification Surface: browser/API/restart binder | QA Surface: RP5
- `A4` | Status: planned | Implementation Surface: RP1–RP4 test owners | Verification Surface: durable RED/GREEN and full suite logs | QA Surface: RP5
- `A5` | Status: planned | Implementation Surface: RP6 delivery receipts | Verification Surface: final audit and green dev CI | QA Surface: delivery gate

## Coverage Gate

- [x] A1–A5 map to file-concrete repair and verification work.
- [x] Every behavior change has a RED-GREEN-REFACTOR requirement.
- [x] All missing benchmark, decision, eject, restart, and delivery gates are included.

Audit: PASS
Coverage: PASS

## Approval Gate

- [x] Plan preserves locked history.
- [x] Plan is ready for a fresh repair worktree.
- [x] Stage promotion remains explicitly blocked.

Approval: PASS
