Run: `/.recursive/run/92-configured-model-pool-benchmark-convergence/`
Phase: `08 Memory Impact upstream-gap addendum`
Status: `LOCKED`
LockedAt: `2026-08-21T14:29:15Z`
LockHash: `45ec788dd39d8e7af674ba09fef68c597ef0393976f856ce71a26925b83120a6`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/92-configured-model-pool-benchmark-convergence/08-memory-impact.md` (LOCKED)
- `/.recursive/run/92-configured-model-pool-benchmark-convergence/addenda/08-memory-impact.upstream-gap.00-requirements.addendum-01.md` (LOCKED)
- `/.recursive/run/92-configured-model-pool-benchmark-convergence/addenda/08-memory-impact.upstream-gap.02-to-be-plan.addendum-01.md` (LOCKED)
- `role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts`
- `role-model-router/apps/runtime-host-bridge/src/benchmark-summary.ts`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/packages/profile-aggregator/src/index.ts`
- `role-model-router/packages/sqlite-memory/src/index.ts`
Outputs:
- `/.recursive/run/92-configured-model-pool-benchmark-convergence/addenda/08-memory-impact.upstream-gap.00-requirements.addendum-02.md`
- `/.recursive/run/92-configured-model-pool-benchmark-convergence/addenda/08-memory-impact.upstream-gap.02-to-be-plan.addendum-02.md`
Scope note: This second post-closeout addendum incorporates independent-audit findings that materially expand the Run 92 repair scope. It supplements, rather than replaces, addendum 01.

## TODO

- [x] Record all additional independent-audit blockers.
- [x] Add correctness requirements for terminal benchmark outcome filtering, start-time identity binding, and summary consistency.
- [x] Extend the stage-RC gate.

## Addendum Content

### Additional audit findings

1. Failed benchmark execution records retain `judge_score: 0`; aggregation accepts numeric scores while separately counting failures; the latest-profile read excludes only `completion_state: stale`. A failed/cancelled run can therefore lower or overwrite valid benchmark quality.
2. The canonical portfolio applies membership filtering, but a benchmark-capability fallback reads an unfiltered summary. Historical mismatched membership can reappear as current capability.
3. Benchmark samples and manifests call membership-revision derivation during execution/completion rather than freezing it at benchmark start. Membership churn during a run can make an old execution appear current.
4. Benchmark-artifact clearing is not atomically coordinated with artifact deletion. A post-SQLite artifact deletion failure can leave visible historical runs after profile data was cleared.
5. The prior Phase 5 local-controller path takes `Unload` before final-controller eject. The required runtime scenario must use a non-local controller-backed endpoint and cannot rely on that local branch.

### Effective additional requirements

#### `A6` Terminal-outcome-safe benchmark evidence

- Only successfully completed benchmark samples/runs may contribute to current benchmark profiles, capability, quality, route scores, or decision provenance.
- Failed and cancelled execution records may remain observable diagnostics, but must have no scoring influence and cannot overwrite a previously valid profile.

#### `A7` Single membership-filtered canonical benchmark read

- Portfolio, summary, endpoint capability, candidate profile, and all consumer fallbacks must use the same membership-filtered current read model.
- No fallback may reintroduce a stale/removed/unconfigured benchmark run.

#### `A8` Benchmark-start identity fence and clear consistency

- Selected endpoint identities and membership revision are captured once at benchmark start and remain immutable for every sample, manifest, result, and completion decision from that run.
- Membership drift before completion makes the completion stale/non-current; it cannot publish as current.
- Clearing benchmark data must leave an explicit recoverable diagnostic if associated artifact removal fails, and canonical current reads must not surface cleared evidence.

## Traceability

- R3/R4 → A6, A7, A8
- R6 → A6, A7, A8
- R7 → strict RED/GREEN for every A6–A8 fix
- R8 → rebuilt-runtime execution must include a failed/cancelled negative and membership-drift observation where deterministic harness support permits

## Audit Context

Audit Execution Mode: subagent
Subagent Availability: available
Subagent Capability Probe: bounded independent audit completed against `origin/dev` merge `60f346e2` and reported concrete source/test gaps.
Delegation Decision Basis: independent source review was used to challenge the controller audit before implementation.
Audit Inputs Provided:
- locked Run 92 requirements and Phase 5 receipt
- normalized diff `d59f07b9..60f346e2`
- benchmark runner, summary, host bridge, profile aggregator, sqlite memory, and affected tests

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `d59f07b91e7b23c25e7297860a0f9c967b342b7a`
- Comparison reference: `origin/dev` merge `60f346e2`
- Normalized baseline: `d59f07b91e7b23c25e7297860a0f9c967b342b7a`
- Normalized comparison: `60f346e2`
- Normalized diff command: `git diff --name-only d59f07b91e7b23c25e7297860a0f9c967b342b7a 60f346e2 -- role-model-router`
- Planned or claimed changed files: original Run 92 diff plus A6–A8 repair surfaces in the paired plan addendum.
- Actual changed files reviewed: benchmark runner/summary/host bridge/profile aggregation/sqlite current-read paths and Phase 5 receipt.
- Unexplained drift: none; this is a requirements correction.

## Subagent Contribution Verification

- Reviewed Action Records: collaboration result `/root/run92_independent_audit`.
- Main-Agent Verification Performed: checked the cited outcome filtering, summary fallback, dynamic revision, and clear ordering source paths against the merged worktree.
- Acceptance Decision: accepted; findings are incorporated as A6–A8.
- Refresh Handling: the repair reviewer must verify all A1–A8 against the new diff.
- Repair Performed After Verification: none; product code remains untouched.

## Requirement Completion Status

- `A6` | Status: blocked | Rationale: failed/cancelled benchmark evidence can influence profile aggregation | Blocking Evidence: `benchmark-runner.ts`, `profile-aggregator/src/index.ts`, `sqlite-memory/src/index.ts` | Addendum: this file
- `A7` | Status: blocked | Rationale: unfiltered summary fallback can bypass current membership | Blocking Evidence: `benchmark-summary.ts`, `src/index.ts` | Addendum: this file
- `A8` | Status: blocked | Rationale: membership revision is dynamic during execution and clear is cross-store non-atomic | Blocking Evidence: `benchmark-runner.ts`, `src/index.ts` | Addendum: this file

## Coverage Gate

- [x] Every independent finding has a mapped requirement.
- [x] Existing A1–A5 remain applicable.
- [x] R3/R4/R6/R7/R8 effects are explicit.

Audit: PASS
Coverage: PASS

## Approval Gate

- [x] Findings were locally corroborated.
- [x] The paired plan addendum extends the repair work.
- [x] Stage RC remains blocked.

Approval: PASS
