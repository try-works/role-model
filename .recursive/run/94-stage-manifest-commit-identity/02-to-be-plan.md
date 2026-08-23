Run: `/.recursive/run/94-stage-manifest-commit-identity/`
Phase: `02 TO-BE Plan`
Status: `LOCKED`
LockedAt: `2026-08-23T08:51:16Z`
LockHash: `8ef1a072a9d6b5f42d24fdf983a0239fc39c4e0bf7dae50cd52edc7f94623605`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/94-stage-manifest-commit-identity/00-requirements.md`
- `/.recursive/run/94-stage-manifest-commit-identity/01-as-is.md`
- `/.recursive/run/94-stage-manifest-commit-identity/01.5-root-cause.md`
Outputs:
- `/.recursive/run/94-stage-manifest-commit-identity/02-to-be-plan.md`
TDD Mode: `strict`
Scope note: Maps every release-provenance requirement to a strict-TDD implementation and verification path.

## TODO

- [x] Map every requirement to code, test, and release QA.
- [x] Define RED/GREEN sequence before production changes.
- [x] Check the plan for lossless coverage.

## Plan

1. Add a shallow-branch regression in `runtime-version.test.ts`; RED proves the old fallback emits synthetic metadata. Change the fallback to use CI commit/date, then GREEN.
2. Add a Stage manifest regression; RED proves missing commit is accepted. Require a 40-hex commit in `validateRun88PackagedStageIdentity`, update canonical fixtures, then GREEN.
3. Add static workflow regressions; RED proves producer and consumer checks are absent. Require `manifest.commit === GITHUB_SHA` for Stage/production packages and `stage.commit === stageSha` before production consumes the artifact, then GREEN.
4. Run focused Run 88 unit/integration/regression layers and the complete release-workflow contract suite.
5. After merge, require a freshly built Stage RC whose manifest commit matches its tag SHA before human UAT; never reuse the rejected candidate.

## Planned Changes by File

- `role-model-router/apps/runtime-host-bridge/src/runtime-version.ts`: preserve CI identity in the shallow fallback and validate Stage commit format.
- `role-model-router/apps/runtime-host-bridge/test/{runtime-version.test.ts,run88-public-runtime-probes.ts,run88-stage-release.unit.test.ts}`: cover fallback, invalid commit, and canonical fixtures.
- `.github/workflows/build-binaries.yml`: enforce current SHA at packaging and accepted SHA on production consumption.
- `scripts/build-binaries-workflow.test.mjs`: statically guard both workflow conditions.

## Implementation Steps

1. Run failing fallback test before changing source.
2. Run failing manifest validator test before changing validator.
3. Run failing workflow static tests before changing YAML.
4. Apply smallest source/workflow changes and update legitimate fixtures.
5. Run focused and full contract suites.

## Implementation Sub-phases

- A: source fallback RED→GREEN.
- B: runtime identity validator RED→GREEN.
- C: Stage/production workflow gate RED→GREEN.
- D: coupled Run 88 and release-workflow verification.

## Testing Strategy

- Unit: isolated shallow CI fallback and invalid manifest checks.
- Integration/regression: existing Run 88 package/runtime focused layers.
- Contract: `pnpm run test:release-workflows`.
- Static safety: workflow source assertions ensure conditions cannot silently disappear.

## Manual QA Scenarios

1. After merge, download the fresh Stage RC archive and inspect `manifest.json`; `commit` equals the full candidate tag SHA.
2. Run the release-candidate acceptance workflow; it must create a receipt only for that exact archive.
3. Perform human UAT of that new artifact before any main promotion.

## Playwright Plan (if applicable)

Not applicable: this repair changes package provenance only; UI browser behavior is not modified.

## Idempotence and Recovery

- Re-running a Stage build produces the revision supplied by the CI environment.
- A mismatch fails before publication/promotion and can be corrected only by a new source revision and fresh artifact.
- The rejected RC remains immutable audit evidence.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/93-variant-admission-model-pool-integrity/06-decisions-update.md` for the mandatory Stage/Track B boundary.

## Earlier Phase Reconciliation

The plan implements every Phase 1/1.5 boundary without widening into user runtime, cloud, or Track B behavior.

## Effective Inputs Re-read

- `00-requirements.md`
- `01-as-is.md`
- `01.5-root-cause.md`
- `runtime-version.ts`
- `build-binaries.yml`

## Traceability

- R1: source fallback and validator.
- R2: Stage producer/production consumer workflow conditions.
- R3: strict RED/GREEN and focused/full contract suites.

## Gaps Found

None unresolved for planning; all requirements have a concrete source, test, and post-merge QA path.

## Repair Work Performed

None; implementation is Phase 3 work.

## Requirement Mapping

- R1 | Coverage: direct | Source Quote: "A shallow `stage` build with `GITHUB_SHA` produces that exact SHA as `manifest.commit`." | Implementation Surface: `runtime-version.ts` | Verification Surface: `runtime-version.test.ts`, `run88-public-runtime-probes.ts` | QA Surface: new Stage archive manifest inspection | Rationale: fixes the source of synthetic commit metadata.
- R2 | Coverage: direct | Source Quote: "Production candidate consumption fails when the downloaded Stage manifest commit differs from the accepted Stage workflow SHA." | Implementation Surface: `.github/workflows/build-binaries.yml` | Verification Surface: `build-binaries-workflow.test.mjs` | QA Surface: release workflow acceptance before main promotion | Rationale: enforces both producer and consumer identity.
- R3 | Coverage: direct | Source Quote: "Each production guard has a concrete RED receipt followed by a GREEN receipt." | Implementation Surface: `role-model-router/apps/runtime-host-bridge/test/runtime-version.test.ts`, `scripts/build-binaries-workflow.test.mjs` | Verification Surface: `scripts/run88-run-focused-tests.mjs`, `package.json` | QA Surface: fresh RC manifest exact-SHA inspection | Rationale: preserves strict, reproducible proof.

## Plan Drift Check

No drift. The plan maps each requirement to a distinct source or workflow boundary and preserves the existing acceptance gate. No obligations are merged.

## Requirement Completion Status

- R1 | Status: planned | Implementation Surface: `role-model-router/apps/runtime-host-bridge/src/runtime-version.ts` | Verification Surface: `role-model-router/apps/runtime-host-bridge/test/runtime-version.test.ts` | QA Surface: fresh Stage manifest inspection.
- R2 | Status: planned | Implementation Surface: `.github/workflows/build-binaries.yml` | Verification Surface: `scripts/build-binaries-workflow.test.mjs` | QA Surface: release acceptance workflow.
- R3 | Status: planned | Implementation Surface: `role-model-router/apps/runtime-host-bridge/test/runtime-version.test.ts` | Verification Surface: `scripts/run88-run-focused-tests.mjs`, `package.json` | QA Surface: new exact candidate UAT.

## Audit Context

- Audit Execution Mode: `self-audit`
- Subagent Availability: `available`
- Subagent Capability Probe: active agents are not assigned a full run-94 review bundle and developer policy forbids creating new agents without user request.
- Delegation Decision Basis: this small repair has direct test ownership and strict TDD evidence.
- Delegation Override Reason: no permitted new delegation for this run.
- Audit Inputs Provided: locked Phase 0, Phase 1, Phase 1.5, normalized diff basis, and identified files.

## Subagent Contribution Verification

- Reviewed Action Records: none.
- Main-Agent Verification Performed: plan reconciled with all producer, runtime, and consumer boundaries.
- Acceptance Decision: plan accepted.
- Refresh Handling: Phase 3 must re-read locked plan before changes.
- Repair Performed After Verification: no plan repair required.

## Worktree Diff Audit

- Baseline type: `remote ref`
- Baseline reference: `8607f5f8c149bfb8a99d3bc0e67a504076c90467`
- Comparison reference: `working-tree`
- Normalized baseline: `8607f5f8c149bfb8a99d3bc0e67a504076c90467`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 8607f5f8c149bfb8a99d3bc0e67a504076c90467`
- Planned diff-owned paths: runtime fallback/validator, related tests, and binary workflow/static test.

## Audit Verdict

Audit: PASS

## Coverage Gate

Coverage: PASS

## Approval Gate

Approval: PASS
