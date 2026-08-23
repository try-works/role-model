Run: `/.recursive/run/94-stage-manifest-commit-identity/`
Phase: `01 AS-IS`
Status: `LOCKED`
LockedAt: `2026-08-23T08:48:58Z`
LockHash: `31dc998fc9eafb376ef9c3b7766cf7cf3852aa298d6cf657e54899b153607335`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/94-stage-manifest-commit-identity/00-requirements.md`
- `/.recursive/run/94-stage-manifest-commit-identity/00-worktree.md`
- `/.github/workflows/build-binaries.yml`
- `role-model-router/apps/runtime-host-bridge/src/runtime-version.ts`
Outputs:
- `/.recursive/run/94-stage-manifest-commit-identity/01-as-is.md`
Scope note: Documents the failed candidate's actual provenance path without altering product behavior.

## TODO

- [x] Trace the accepted-candidate failure to the package manifest producer.
- [x] Trace existing Stage and production verification boundaries.
- [x] Reconcile the actual diff basis before planning.

## Current Behavior

- The rejected `stage-rc-23f91a1f7cd8` package had `manifest.commit: "runtime-derived"`; acceptance correctly compared it to its exact candidate SHA and failed.
- `resolveRuntimeVersionInfo` handled tagged builds and Git-readable checkouts, but its final shallow/non-tag fallback ignored `GITHUB_SHA`.
- `build-binaries.yml` checked manifest channel and artifact fields but did not require the Stage/production manifest commit to equal the build SHA.
- Production extracted an accepted Stage artifact and checked channel, source tree, Track B identity, and release identity, but did not compare manifest commit to the accepted Stage SHA.
- Runtime Stage identity validation accepted a manifest with no commit field.

## Current Behavior by Requirement

### R1

The final fallback ignored CI metadata, so a shallow Stage build persisted a synthetic identity.

### R2

The acceptance workflow had the exact comparison, but package creation, runtime startup, and production candidate consumption lacked equivalent checks.

### R3

No run-local strict TDD receipts existed before this repair.

## Reproduction Steps (Novice-Runnable)

1. Run the Stage packaging workflow from a shallow `stage` checkout with `GITHUB_SHA` set and no tag/Git description.
2. Inspect the produced `manifest.json`; before this repair its `commit` could be `runtime-derived`.
3. Dispatch the release-candidate acceptance workflow for that artifact; it rejects the mismatch instead of allowing main promotion.

## Relevant Code Pointers

- `role-model-router/apps/runtime-host-bridge/src/runtime-version.ts` — manifest version fallback.
- `role-model-router/apps/runtime-host-bridge/src/package-sea.ts` — package manifest writer.
- `.github/workflows/build-binaries.yml` — Stage producer and production consumer.

## Evidence

- The failed acceptance run for `stage-rc-23f91a1f7cd8` reported `Stage manifest identity mismatch` after reading `commit: runtime-derived`.
- `evidence/logs/runtime-version-ci-sha-red.log` reproduces the missing CI SHA in a direct unit test.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/93-variant-admission-model-pool-integrity/06-decisions-update.md` confirms Stage RC and Track B provenance remain mandatory; this repair changes neither Track B nor the 13-extension contract.

## Known Unknowns

- The fresh repaired Stage artifact does not yet exist; human UAT must be repeated after the repaired workflow publishes it.

## Earlier Phase Reconciliation

Locked Phase 0 requirements and worktree records were re-read. The observed failure is within R1-R3 and does not add product scope.

## Effective Inputs Re-read

- `00-requirements.md`
- `00-worktree.md`
- `runtime-version.ts`
- `build-binaries.yml`

## Traceability

- R1 → fallback and runtime validator.
- R2 → workflow producer and consumer gates.
- R3 → strict TDD and local contract evidence.

## Gaps Found

None unresolved for this analysis artifact: the identified defects are completely mapped to the locked Phase 2 plan.

## Repair Work Performed

None; implementation is reserved for Phase 3.

## Source Requirement Inventory

- R1 | Disposition: in-scope | Source Quote: "A shallow `stage` build with `GITHUB_SHA` produces that exact SHA as `manifest.commit`." | Summary: Preserve CI commit provenance and refuse absent runtime commit identities.
- R2 | Disposition: in-scope | Source Quote: "Production candidate consumption fails when the downloaded Stage manifest commit differs from the accepted Stage workflow SHA." | Summary: Validate exact commit at producer and consumer trust boundaries.
- R3 | Disposition: in-scope | Source Quote: "Each production guard has a concrete RED receipt followed by a GREEN receipt." | Summary: Strict TDD and reproducible local contract verification.

## Audit Context

- Audit Execution Mode: `self-audit`
- Subagent Availability: `available`
- Subagent Capability Probe: Concurrent agents are assigned to unrelated historical runs and no fresh delegated review context bundle exists for this small source/workflow repair.
- Delegation Decision Basis: First-hand inspection of the rejected workflow output and exact producer/consumer code is the authoritative AS-IS evidence.
- Delegation Override Reason: Creating a new delegated review would delay a release-blocking, three-file root-cause repair without improving the source-of-truth audit.
- Audit Inputs Provided: locked Phase 0 artifacts, release workflow, runtime-version source, observed rejection, and `git diff --name-only 8607f5f8c149bfb8a99d3bc0e67a504076c90467`.

## Subagent Contribution Verification

- Reviewed Action Records: none.
- Main-Agent Verification Performed: inspected `runtime-version.ts` fallback and both `build-binaries.yml` identity paths.
- Acceptance Decision: accepted first-hand AS-IS evidence.
- Refresh Handling: source files re-read before planning.
- Repair Performed After Verification: none in this analysis phase.

## Worktree Diff Audit

- Baseline type: `remote ref`
- Baseline reference: `8607f5f8c149bfb8a99d3bc0e67a504076c90467`
- Comparison reference: `working-tree`
- Normalized baseline: `8607f5f8c149bfb8a99d3bc0e67a504076c90467`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 8607f5f8c149bfb8a99d3bc0e67a504076c90467`
- Reviewed changed paths: `.github/workflows/build-binaries.yml`, `runtime-version.ts`, and their tests; run-local artifacts are documentation evidence.

## Requirement Completion Status

- R1 | Status: deferred | Rationale: analysis establishes the defect; strict implementation is planned next. | Deferred By: `/.recursive/run/94-stage-manifest-commit-identity/00-requirements.md`.
- R2 | Status: deferred | Rationale: workflow repair is planned next. | Deferred By: `/.recursive/run/94-stage-manifest-commit-identity/00-requirements.md`.
- R3 | Status: deferred | Rationale: test receipts are generated only after implementation. | Deferred By: `/.recursive/run/94-stage-manifest-commit-identity/00-requirements.md`.

## Audit Verdict

Audit: PASS

## Coverage Gate

Coverage: PASS

## Approval Gate

Approval: PASS
