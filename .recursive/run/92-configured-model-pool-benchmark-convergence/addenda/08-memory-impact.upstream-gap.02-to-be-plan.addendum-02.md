Run: `/.recursive/run/92-configured-model-pool-benchmark-convergence/`
Phase: `08 Memory Impact upstream-gap remediation plan`
Status: `LOCKED`
LockedAt: `2026-08-21T14:29:16Z`
LockHash: `aad726a351ea52650632d36acf72b653a2162512191b5a863d15f4266a6ca57b`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/92-configured-model-pool-benchmark-convergence/08-memory-impact.md` (LOCKED)
- `/.recursive/run/92-configured-model-pool-benchmark-convergence/addenda/08-memory-impact.upstream-gap.00-requirements.addendum-01.md` (LOCKED)
- `/.recursive/run/92-configured-model-pool-benchmark-convergence/addenda/08-memory-impact.upstream-gap.02-to-be-plan.addendum-01.md` (LOCKED)
- `/.recursive/run/92-configured-model-pool-benchmark-convergence/addenda/08-memory-impact.upstream-gap.00-requirements.addendum-02.md` (DRAFT at authoring)
Outputs:
- `/.recursive/run/92-configured-model-pool-benchmark-convergence/addenda/08-memory-impact.upstream-gap.02-to-be-plan.addendum-02.md`
Scope note: This companion plan extends RP1–RP6 with the independent-audit repair work required for safe benchmark evidence ownership and canonical current reads.

## TODO

- [x] Add concrete TDD slices for A6–A8.
- [x] Ensure all benchmark consumers use one current filtered read model.
- [x] Add these checks to rebuilt-runtime acceptance and delivery audit.

## Remediation Plan Extension

### RP7 — Terminal-outcome-safe aggregation

**Owns:** `benchmark-runner.ts`, `profile-aggregator/src/index.ts`, `sqlite-memory/src/index.ts`, and benchmark/profile tests.

**RED:** a failed/cancelled sample with `judge_score: 0` changes a valid endpoint profile. **GREEN:** gate aggregation/current reads on completed terminal evidence only while retaining failures as diagnostics. Add sibling and later-valid-result regressions.

### RP8 — One membership-filtered benchmark authority

**Owns:** `benchmark-summary.ts`, `src/index.ts`, benchmark capability/profile consumers, and host integration tests.

**RED:** a stale/membership-mismatched run absent from the portfolio becomes visible through endpoint capability/summary fallback. **GREEN:** make all such reads derive from the same membership-filtered current projection. Test removed endpoint, reconnect, and restart.

### RP9 — Freeze start identity and clear safely

**Owns:** `benchmark-runner.ts`, `benchmark-artifacts.ts`, `sqlite-memory/src/index.ts`, `src/index.ts`, plus failure/recovery tests.

**RED:** mutate membership after benchmark start and show completion uses the new revision; **GREEN:** freeze selected identities/revision at start and stale/refuse completion on drift. **RED:** simulate artifact deletion failure after clear; **GREEN:** ensure canonical reads remain cleared and the failure is diagnosable/recoverable. Test restart readback.

### RP10 — Expanded rebuilt-runtime acceptance

Extend RP5 with deterministic negative evidence: a failed/cancelled benchmark cannot change the valid profile, and a membership-drifted run cannot publish current profile. Use a non-local controller fixture for the destructive-eject scenario.

### RP11 — Final delivery audit

The final audit must map R3–R8 and A1–A8 to changed files, behavior tests, rebuilt-runtime evidence, and green dev CI. Any `N/A` mandatory scenario, current-state recomputation, or unsupported stale fallback is a release blocker.

## Audit Context

Audit Execution Mode: subagent
Subagent Availability: available
Subagent Capability Probe: independent audit identified the A6–A8 gaps and controller verified the cited source paths.
Delegation Decision Basis: plan extension is controller-owned after independent audit input.
Audit Inputs Provided:
- requirements addenda 01/02
- original plan and independent audit source references

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `d59f07b91e7b23c25e7297860a0f9c967b342b7a`
- Comparison reference: `origin/dev` merge `60f346e2`
- Normalized baseline: `d59f07b91e7b23c25e7297860a0f9c967b342b7a`
- Normalized comparison: `60f346e2`
- Normalized diff command: `git diff --name-only d59f07b91e7b23c25e7297860a0f9c967b342b7a 60f346e2 -- role-model-router`
- Planned or claimed changed files: RP7–RP9 owning code/tests plus RP10/RP11 evidence.
- Actual changed files reviewed: original Run 92 benchmark surfaces only; no repair changes exist yet.
- Unexplained drift: none.

## Subagent Contribution Verification

- Reviewed Action Records: collaboration result `/root/run92_independent_audit`.
- Main-Agent Verification Performed: independently checked source references and incorporated each accepted issue.
- Acceptance Decision: accepted as a plan extension.
- Refresh Handling: the new repair review bundle must include addenda 01 and 02.
- Repair Performed After Verification: none.

## Requirement Completion Status

- `A6` | Status: planned | Implementation Surface: RP7 | Verification Surface: failed/cancelled regression | QA Surface: RP10
- `A7` | Status: planned | Implementation Surface: RP8 | Verification Surface: stale-summary regression | QA Surface: RP10
- `A8` | Status: planned | Implementation Surface: RP9 | Verification Surface: start-drift/clear/restart tests | QA Surface: RP10

## Coverage Gate

- [x] A6–A8 have file-concrete TDD slices.
- [x] RP10 and RP11 carry their runtime/delivery effects forward.

Audit: PASS
Coverage: PASS

## Approval Gate

- [x] Plan remains compatible with the first remediation addendum.
- [x] Stage RC remains blocked until the expanded plan passes.

Approval: PASS
