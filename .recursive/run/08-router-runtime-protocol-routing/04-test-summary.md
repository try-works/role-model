Run: `/.recursive/run/08-router-runtime-protocol-routing/`
Phase: `04 Test Summary`
Status: `LOCKED`
LockedAt: `2026-05-05T04:49:34Z`
LockHash: `99aacbd61618f13093d5a2ef44aaaec9ed31e195cdb9e9c89b375b36b16c79c7`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/08-router-runtime-protocol-routing/00-requirements.md`
- `/.recursive/run/08-router-runtime-protocol-routing/00-worktree.md`
- `/.recursive/run/08-router-runtime-protocol-routing/02-to-be-plan.md`
- `/.recursive/run/08-router-runtime-protocol-routing/03-implementation-summary.md`
Outputs:
- `/.recursive/run/08-router-runtime-protocol-routing/04-test-summary.md`
Scope note: This artifact records the post-implementation validation run for `08-router-runtime-protocol-routing`. The run validates the new protocol-routing package, the affected core build, the new runtime-routing conformance file, and the local routing validation path directly, then compares the broader repo command chain against the inherited schema-tools/Biome baseline and the older unrelated conformance-build typing debt.

## TODO

- [x] Re-read the locked Phase 2 plan and Phase 3 implementation summary
- [x] Audit implementation scope before running validation
- [x] Determine execution mode
- [x] Execute the selected validation chain and capture durable logs
- [x] Document failures and diagnostics
- [x] Verify the post-validation worktree scope
- [x] Complete the audit sections and gates

## Pre-Test Implementation Audit

- Requirement alignment (`00-requirements.md`): `R1`-`R4` were implemented on the planned protocol-routing, narrow router-core, fixture, conformance, and local validation-command surfaces.
- Plan alignment (`02-to-be-plan.md`): `SP1`, `SP2`, and `SP3` were completed on the planned file and package boundaries.
- Mismatches found:
  - [x] None
  - [ ] Yes

## Environment

- OS: `Windows_NT`
- Runtime versions: `Node v24.11.0`; the broader comparison chain remains `schemas:validate`, `build`, `test`, and `smoke`
- Test framework versions: `Vitest 3.2.4`; no browser harness applies to this run
- Base URL / server mode: not applicable; validation is CLI-driven from the selected worktree

## Execution Mode

- **Mode:** Sequential
- **Subagent Usage:**
  - Validation commands: Main agent
  - Result interpretation: Main agent
- **Parallel execution time:** not measured; sequential validation kept the run-08 evidence files and the broader baseline comparison synchronized

## Commands Executed (Exact)

- `corepack pnpm --filter @role-model-router/protocol-routing test`
- `corepack pnpm --filter @role-model-router/protocol-routing build`
- `corepack pnpm --filter @role-model-router/core build`
- `corepack pnpm --filter @role-model/conformance exec vitest run src/runtime-routing-conformance.test.ts`
- `corepack pnpm --filter @role-model/conformance build`
- `corepack pnpm run runtime:validate-routing`
- `corepack pnpm run schemas:validate`
- `corepack pnpm run build`
- `corepack pnpm run test`
- `corepack pnpm run smoke`

## Results Summary

- Total: `10` commands in the recorded Phase 4 chain
- Passed: `7`
- Failed: `3`
- Skipped: `0`

## Evidence and Artifacts

Store and reference artifacts under:
- `/.recursive/run/08-router-runtime-protocol-routing/evidence/`
  - `evidence/logs/verify/protocol-routing-test.final.log`
  - `evidence/logs/verify/protocol-routing-build.final.log`
  - `evidence/logs/verify/core-build.final.log`
  - `evidence/logs/verify/runtime-routing-conformance.final.log`
  - `evidence/logs/verify/conformance-build.final.log`
  - `evidence/logs/verify/runtime-validate-routing.final.log`
  - `evidence/logs/verify/schemas-validate.final.log`
  - `evidence/logs/verify/build.final.log`
  - `evidence/logs/verify/test.final.log`
  - `evidence/logs/verify/smoke.final.log`

## Failures and Diagnostics (if any)

- `corepack pnpm --filter @role-model-router/protocol-routing test`: PASS; the new package test file passed all `3` tests. Evidence: `/.recursive/run/08-router-runtime-protocol-routing/evidence/logs/verify/protocol-routing-test.final.log`
- `corepack pnpm --filter @role-model-router/protocol-routing build`: PASS after the final typed `selection_reasons` repair. Evidence: `/.recursive/run/08-router-runtime-protocol-routing/evidence/logs/verify/protocol-routing-build.final.log`
- `corepack pnpm --filter @role-model-router/core build`: PASS after the same typed `selection_reasons` repair. Evidence: `/.recursive/run/08-router-runtime-protocol-routing/evidence/logs/verify/core-build.final.log`
- `corepack pnpm --filter @role-model/conformance exec vitest run src/runtime-routing-conformance.test.ts`: PASS; the new run-08 conformance file passed both tests. Evidence: `/.recursive/run/08-router-runtime-protocol-routing/evidence/logs/verify/runtime-routing-conformance.final.log`
- `corepack pnpm --filter @role-model/conformance build`: FAIL, but the remaining failures are confined to the older `src/router-conformance.test.ts` typing debt (`endpoint_kind`, tuple-typed `capabilities` / `modalities`, and missing observed-profile required fields). The final log no longer shows the earlier run-08-specific `selection_reasons`, `runtime-routing-conformance`, or `MetricEntry` failures. Evidence: `/.recursive/run/08-router-runtime-protocol-routing/evidence/logs/verify/conformance-build.final.log`
- `corepack pnpm run runtime:validate-routing`: PASS and returned deterministic JSON with `registrySize = 3`, `chosen_endpoint_id = "cli.local.coder"`, explicit retrieval-receipt and context-envelope summaries, and runtime routing-model diagnostics. Evidence: `/.recursive/run/08-router-runtime-protocol-routing/evidence/logs/verify/runtime-validate-routing.final.log`
- `corepack pnpm run schemas:validate`: PASS and validated `19` schema files plus `28` fixture files. Evidence: `/.recursive/run/08-router-runtime-protocol-routing/evidence/logs/verify/schemas-validate.final.log`
- `corepack pnpm run build`: FAIL in `packages/schema-tools` during `types:generate`. The failure still occurs before the wider workspace build completes, after Biome reports `Formatted 0 files ... No fixes applied` and `No files were processed in the specified paths`, matching the locked Phase 0 baseline signature. Evidence: `/.recursive/run/08-router-runtime-protocol-routing/evidence/logs/verify/build.final.log`
- `corepack pnpm run test`: FAIL in `packages/schema-tools test/generate-protocol-types.test.ts` with the same inherited Biome/generated-types formatting path and the same `No files were processed in the specified paths` / `Biome formatting failed for generated protocol types with exit code 1.` signature. Evidence: `/.recursive/run/08-router-runtime-protocol-routing/evidence/logs/verify/test.final.log`
- `corepack pnpm run smoke`: PASS and still emitted the expected gateway-smoke JSON summary. Evidence: `/.recursive/run/08-router-runtime-protocol-routing/evidence/logs/verify/smoke.final.log`

## Flake/Rerun Notes

- Rerun commands:
  - reran `corepack pnpm --filter @role-model-router/core build`
  - reran `corepack pnpm --filter @role-model-router/protocol-routing build`
  - reran `corepack pnpm --filter @role-model/conformance build`
- Outcome:
  - the final targeted build reruns passed for `core` and `protocol-routing` after the typed `selection_reasons` repair.
  - the final conformance-build rerun still fails, but only on the older `src/router-conformance.test.ts` typing debt after restoring `MetricEntry`.
- Deterministic or flaky: deterministic; the run-08-owned package and targeted conformance checks stayed green, while the remaining failures reproduced the same older non-run-08 patterns.

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `available`
Subagent Capability Probe: `Phase 4 validation remained controller-owned so the exact command chain, evidence logs, and post-validation scope stayed synchronized with the receipt.`
Delegation Decision Basis: `The important validation question was whether the new routing projection, signal scoring, and local validation path stayed green while the broader repo still reproduced only inherited failures.`
Delegation Override Reason: `A delegated validation runner would not improve quality here because the evidence is the exact command output, durable logs, and current worktree state.`
Audit Inputs Provided:
- `/.recursive/run/08-router-runtime-protocol-routing/00-requirements.md`
- `/.recursive/run/08-router-runtime-protocol-routing/00-worktree.md`
- `/.recursive/run/08-router-runtime-protocol-routing/02-to-be-plan.md`
- `/.recursive/run/08-router-runtime-protocol-routing/03-implementation-summary.md`
- Changed files:
  - `/package.json`
  - `/packages/conformance/package.json`
  - `/packages/conformance/src/runtime-routing-conformance.test.ts`
  - `/packages/protocol-types/src/generated.ts`
  - `/pnpm-lock.yaml`
  - `/role-model-router/packages/core/src/router.ts`
  - `/role-model-router/packages/core/src/types.ts`
  - `/role-model-router/packages/protocol-routing/package.json`
  - `/role-model-router/packages/protocol-routing/src/cli.ts`
  - `/role-model-router/packages/protocol-routing/src/index.ts`
  - `/role-model-router/packages/protocol-routing/test/index.test.ts`
  - `/role-model-router/packages/protocol-routing/tsconfig.json`
  - `/testdata/router-runtime/routing-model-guidance.json`
  - `/testdata/router-runtime/routing-observed-profiles.json`
  - `/testdata/router-runtime/routing-request.json`
  - `/testdata/router-runtime/routing-role-task.json`

## Effective Inputs Re-read

- `/.recursive/run/08-router-runtime-protocol-routing/00-requirements.md`
- `/.recursive/run/08-router-runtime-protocol-routing/02-to-be-plan.md`
- `/.recursive/run/08-router-runtime-protocol-routing/03-implementation-summary.md`

## Earlier Phase Reconciliation

- Requirements vs implementation: Phase 3 stayed inside the protocol-routing, narrow core, fixture, conformance, and validation-command scope.
- Plan vs implementation: planned `SP1`, `SP2`, and `SP3` matched the shipped code and validation surfaces; the final targeted build fixes and `MetricEntry` restore were repair work inside those same boundaries, not scope growth.
- Baseline vs validation: the selected worktree now shows stronger run-specific validation (`protocol-routing` test/build, `core` build, `runtime-routing-conformance`, and `runtime:validate-routing` all PASS) while the broader root chain still reproduces the earlier `schemas:validate` PASS / `build` FAIL / `test` FAIL / `smoke` PASS pattern and `@role-model/conformance build` remains blocked by older unrelated typing debt.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/08-router-runtime-protocol-routing/03-implementation-summary.md`
- `/.recursive/run/08-router-runtime-protocol-routing/00-worktree.md`

## Subagent Contribution Verification

- Reviewed Action Records: `none`
- Main-Agent Verification Performed:
  - `/.recursive/run/08-router-runtime-protocol-routing/evidence/logs/verify/protocol-routing-test.final.log`
  - `/.recursive/run/08-router-runtime-protocol-routing/evidence/logs/verify/protocol-routing-build.final.log`
  - `/.recursive/run/08-router-runtime-protocol-routing/evidence/logs/verify/core-build.final.log`
  - `/.recursive/run/08-router-runtime-protocol-routing/evidence/logs/verify/runtime-routing-conformance.final.log`
  - `/.recursive/run/08-router-runtime-protocol-routing/evidence/logs/verify/conformance-build.final.log`
  - `/.recursive/run/08-router-runtime-protocol-routing/evidence/logs/verify/runtime-validate-routing.final.log`
  - `/.recursive/run/08-router-runtime-protocol-routing/evidence/logs/verify/schemas-validate.final.log`
  - `/.recursive/run/08-router-runtime-protocol-routing/evidence/logs/verify/build.final.log`
  - `/.recursive/run/08-router-runtime-protocol-routing/evidence/logs/verify/test.final.log`
  - `/.recursive/run/08-router-runtime-protocol-routing/evidence/logs/verify/smoke.final.log`
  - `/.recursive/run/08-router-runtime-protocol-routing/04-test-summary.md`
- Acceptance Decision: `controller-owned validation receipt confirmed current and internally consistent`
- Refresh Handling: `not applicable`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `5130db0d28a6135289c0d6b1e4e836bc2c8e6bfd`
- Comparison reference: `working-tree`
- Normalized baseline: `5130db0d28a6135289c0d6b1e4e836bc2c8e6bfd`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 5130db0d28a6135289c0d6b1e4e836bc2c8e6bfd`
- Diff basis used: `git diff --name-only 5130db0d28a6135289c0d6b1e4e836bc2c8e6bfd`
- Supplemental scope command: `git status --short --untracked-files=all`
- Base branch: `main`
- Worktree branch: `recursive/08-router-runtime-protocol-routing`
- Actual changed files reviewed:
  - `/package.json`
  - `/packages/conformance/package.json`
  - `/packages/conformance/src/runtime-routing-conformance.test.ts`
  - `/packages/protocol-types/src/generated.ts`
  - `/pnpm-lock.yaml`
  - `/role-model-router/packages/core/src/router.ts`
  - `/role-model-router/packages/core/src/types.ts`
  - `/role-model-router/packages/protocol-routing/package.json`
  - `/role-model-router/packages/protocol-routing/src/cli.ts`
  - `/role-model-router/packages/protocol-routing/src/index.ts`
  - `/role-model-router/packages/protocol-routing/test/index.test.ts`
  - `/role-model-router/packages/protocol-routing/tsconfig.json`
  - `/testdata/router-runtime/routing-model-guidance.json`
  - `/testdata/router-runtime/routing-observed-profiles.json`
  - `/testdata/router-runtime/routing-request.json`
  - `/testdata/router-runtime/routing-role-task.json`

## Gaps Found

- none

## Repair Work Performed

- refreshed the targeted build logs after fixing the router-core typed `selection_reasons` issue.
- restored `MetricEntry` in `/packages/protocol-types/src/generated.ts` and refreshed the conformance-build log so the final failure set reflects only the older unrelated typing debt.

## Requirement Completion Status

- R1 | Status: verified | Changed Files: `/role-model-router/packages/protocol-routing/package.json`, `/role-model-router/packages/protocol-routing/tsconfig.json`, `/role-model-router/packages/protocol-routing/src/index.ts`, `/testdata/router-runtime/routing-request.json`, `/testdata/router-runtime/routing-observed-profiles.json`, `/testdata/router-runtime/routing-role-task.json`, `/pnpm-lock.yaml` | Implementation Evidence: `/.recursive/run/08-router-runtime-protocol-routing/03-implementation-summary.md`, `/role-model-router/packages/protocol-routing/src/index.ts` | Verification Evidence: `/.recursive/run/08-router-runtime-protocol-routing/evidence/logs/verify/protocol-routing-test.final.log`, `/.recursive/run/08-router-runtime-protocol-routing/evidence/logs/verify/protocol-routing-build.final.log` | Audit Note: the runtime projection layer is now directly validated and build-clean.
- R2 | Status: verified | Changed Files: `/role-model-router/packages/protocol-routing/src/index.ts`, `/testdata/router-runtime/routing-model-guidance.json` | Implementation Evidence: `/.recursive/run/08-router-runtime-protocol-routing/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/08-router-runtime-protocol-routing/evidence/logs/verify/runtime-routing-conformance.final.log`, `/.recursive/run/08-router-runtime-protocol-routing/evidence/logs/verify/runtime-validate-routing.final.log` | Audit Note: routing-model guidance remains explicit and subordinate to policy and eligibility during validation.
- R3 | Status: verified | Changed Files: `/packages/conformance/package.json`, `/packages/conformance/src/runtime-routing-conformance.test.ts`, `/packages/protocol-types/src/generated.ts`, `/role-model-router/packages/core/src/router.ts`, `/role-model-router/packages/core/src/types.ts` | Implementation Evidence: `/.recursive/run/08-router-runtime-protocol-routing/03-implementation-summary.md` | Verification Evidence: `/.recursive/run/08-router-runtime-protocol-routing/evidence/logs/verify/core-build.final.log`, `/.recursive/run/08-router-runtime-protocol-routing/evidence/logs/verify/runtime-routing-conformance.final.log`, `/.recursive/run/08-router-runtime-protocol-routing/evidence/logs/verify/conformance-build.final.log` | Audit Note: the new signal-aware path is green, while the remaining conformance-build failures are isolated to older non-run-08 test debt.
- R4 | Status: verified | Changed Files: `/package.json`, `/role-model-router/packages/protocol-routing/src/cli.ts`, `/role-model-router/packages/protocol-routing/test/index.test.ts` | Implementation Evidence: `/.recursive/run/08-router-runtime-protocol-routing/03-implementation-summary.md`, `/role-model-router/packages/protocol-routing/src/cli.ts` | Verification Evidence: `/.recursive/run/08-router-runtime-protocol-routing/evidence/logs/verify/runtime-validate-routing.final.log`, `/.recursive/run/08-router-runtime-protocol-routing/evidence/logs/verify/build.final.log`, `/.recursive/run/08-router-runtime-protocol-routing/evidence/logs/verify/test.final.log` | Audit Note: the mandatory local validation path is green and the broader inherited failures stay explicitly separated.

## Audit Verdict

- Audit summary: the new run-08-owned validation surfaces are green, the final conformance-build log now isolates only older unrelated typing debt, and the broader root failures still match the inherited schema-tools baseline.
- Follow-up required before lock: none
Audit: PASS

## Traceability

- `R1` -> verified through `protocol-routing` test/build and the final local routing-validation output.
- `R2` -> verified through runtime-routing conformance and the routing-model diagnostics emitted by `runtime:validate-routing`.
- `R3` -> verified through `core` build, runtime-routing conformance, and the isolated conformance-build diagnostics.
- `R4` -> verified through `runtime:validate-routing` plus the explicit broader baseline comparison.

## Coverage Gate

- Effective inputs reviewed:
  - `/.recursive/run/08-router-runtime-protocol-routing/00-requirements.md`
  - `/.recursive/run/08-router-runtime-protocol-routing/02-to-be-plan.md`
  - `/.recursive/run/08-router-runtime-protocol-routing/03-implementation-summary.md`
- Requirement coverage check:
  - `R1`-`R4`: covered in `## Failures and Diagnostics (if any)` and `## Requirement Completion Status`
- Out-of-scope confirmation:
  - no adapter execution, host integration, or protocol-schema redesign was added while validating run 08

Coverage: PASS

## Approval Gate

- [x] The selected validation chain matches the locked Phase 2 plan
- [x] Remaining failures are documented precisely and separated from run-08-owned surfaces
- [x] Validation evidence is durable and current

Approval: PASS
