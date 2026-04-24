Run: `/.recursive/run/02-audit-remediation/`
Phase: `02 TO-BE PLAN`
Status: `LOCKED`
LockedAt: `2026-04-24T01:10:05Z`
LockHash: `a72e11fbcf01c8a436929cdf3189751d07d4b02efbbf41ee090669cdcc9ac522`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/02-audit-remediation/00-requirements.md`
- `/.recursive/run/02-audit-remediation/00-worktree.md`
- `/.recursive/run/02-audit-remediation/01-as-is.md`
- `/.recursive/run/02-audit-remediation/01.5-root-cause.md`
Outputs:
- `/.recursive/run/02-audit-remediation/02-to-be-plan.md`
Scope note: This ExecPlan-grade artifact translates the locked Phase 1 and Phase 1.5 findings for `02-audit-remediation` into a narrow remediation plan covering only canonical schema identity and the failing root script command path.

## TODO

- [x] Re-read the locked Phase 0 and analysis artifacts
- [x] Define the exact product and receipt change surface
- [x] Define the strict-TDD plan for the two defect clusters
- [x] Specify concrete verification commands and evidence logs
- [x] Define manual QA scope and idempotence notes
- [x] Complete the audited-phase sections and gates

## Planned Changes by File

- `protocol/schemas/*.schema.json`: add stable top-level `$id` values to every canonical schema source file, matching the committed filename contract already assumed by the repository.
- `packages/schema-tools/src/validate-schemas.ts`: stop injecting `$id`, validate that every source schema declares a string `$id`, and enforce the repo contract that the `$id` matches the canonical file name.
- `packages/conformance/src/schema-test-helpers.ts`: stop injecting `$id` during test-time Ajv setup and fail fast if a schema source omits or misstates its canonical id.
- `packages/schema-tools/test/validate-schemas.test.ts`: add a strict-TDD regression proving `loadSchemas()` exposes only source-declared `$id` values and rejects missing or mismatched ids.
- `package.json`: replace nested bare `pnpm` script bodies with PATH-independent invocations so the canonical root `schemas:validate`, `types:generate`, `build`, `test`, `smoke`, and `ci:check` chains resolve consistently.
- `/.recursive/run/02-audit-remediation/evidence/logs/red/*` and `evidence/logs/green/*`: capture strict red and green evidence for the schema-source and root-command-path slices.

## Implementation Steps

1. Write the first failing schema-source regression in `packages/schema-tools/test/validate-schemas.test.ts` and capture red evidence showing that the current loader masks missing `$id`.
2. Add stable `$id` values to all 19 canonical schema files and remove `$id` injection from the production loader and conformance helper, replacing it with explicit validation.
3. Re-run the schema-tools test slice and schema validation to capture green evidence for `R1` and `R2`.
4. Reuse the already-failing command-path conformance tests as the red evidence for `R3`-`R5`; do not weaken or rewrite those expectations.
5. Update the root script bodies in `package.json` to use a PATH-independent nested package-manager invocation.
6. Re-run the affected conformance slice to capture green evidence for the wrapper-path repair.
7. Run the final narrow validation chain for this run: root `schemas:validate`, root `test`, and root `smoke` as needed to prove the repaired command path without widening into unrelated work.

## Testing Strategy

- New behavior tests:
  - `packages/schema-tools/test/validate-schemas.test.ts` should prove the schema loader no longer invents `$id` values and instead validates source-declared identity
- Regression tests:
  - `packages/conformance/src/protocol-fixture-conformance.test.ts`
  - `packages/conformance/src/gateway-smoke-observability.test.ts`
  - `packages/schema-tools/test/generate-protocol-types.test.ts`
- Guardrail tests:
  - `corepack pnpm run schemas:validate`
  - `corepack pnpm run test`
  - `corepack pnpm run smoke`
- Commands:
  - RED schema slice: `corepack pnpm --filter @role-model/schema-tools exec vitest run test/validate-schemas.test.ts`
  - GREEN schema slice: same command after the fix
  - RED wrapper-path slice: `node .\node_modules\vitest\vitest.mjs run packages/conformance/src/protocol-fixture-conformance.test.ts packages/conformance/src/gateway-smoke-observability.test.ts`
  - GREEN wrapper-path slice: same command after the fix
  - Final validation: `corepack pnpm run schemas:validate`, `corepack pnpm run test`, `corepack pnpm run smoke`

## Playwright Plan (if applicable)

- Not applicable for this run.
- Rationale: the scope is schema/tooling/command-path repair with no browser UI surface.

## Manual QA Scenarios

1. **Canonical schema source identity**
   - Steps:
     - open several files under `protocol/schemas/`
     - confirm each one now declares a top-level `$id` matching its filename
     - run `corepack pnpm run schemas:validate`
   - Expected:
     - schema source files self-identify without loader mutation
     - the root validation command completes successfully

2. **Root wrapper-path sanity check**
   - Steps:
     - run `corepack pnpm run schemas:validate`
     - run `corepack pnpm run smoke`
   - Expected:
     - neither command fails with `'pnpm' is not recognized`
     - smoke artifacts are regenerated normally under `runtime-output/gateway-smoke/`

## Idempotence and Recovery

- Re-running the schema-tools test slice is safe because it only reads schema sources and generated outputs.
- Re-running the conformance slice is safe because the smoke test already clears `runtime-output/gateway-smoke/` before execution.
- If the root script fix works for `schemas:validate` but not `smoke`, repair only the remaining affected script path; do not widen into unrelated package scripts without evidence.
- If schema `$id` validation fails after source edits, repair the source files or the validation contract first; do not reintroduce runtime injection to get green output.

## Implementation Sub-phases

### SP1. Canonical schema identity source repair

Scope and purpose:
Make the committed JSON Schema sources self-identifying and stop runtime masking of missing `$id`.

Requirement mapping: `R1`, `R2`

Implementation checklist:
- [ ] Add a failing schema-tools regression for source-declared `$id`
- [ ] Add `$id` to all canonical schema files
- [ ] Remove `$id` injection from `validate-schemas.ts`
- [ ] Remove `$id` injection from `schema-test-helpers.ts`

Tests for this sub-phase:
- `corepack pnpm --filter @role-model/schema-tools exec vitest run test/validate-schemas.test.ts`
- `corepack pnpm run schemas:validate`

Sub-phase acceptance:
- A missing or mismatched schema `$id` fails directly from source without helper mutation.

### SP2. Root wrapper command-path repair

Scope and purpose:
Restore the canonical `corepack pnpm run ...` root-script path so conformance tests reach real behavior instead of failing on nested package-manager dispatch.

Requirement mapping: `R3`, `R4`, `R5`

Implementation checklist:
- [ ] Preserve the existing failing conformance tests as red evidence
- [ ] Update root `package.json` script bodies to a PATH-independent nested invocation
- [ ] Re-run the affected conformance slice and the final narrow validation chain

Tests for this sub-phase:
- `node .\node_modules\vitest\vitest.mjs run packages/conformance/src/protocol-fixture-conformance.test.ts packages/conformance/src/gateway-smoke-observability.test.ts`
- `corepack pnpm run test`
- `corepack pnpm run smoke`

Sub-phase acceptance:
- The root `schemas:validate` and `smoke` commands succeed from the same wrapper path used by the conformance tests.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/02-audit-remediation/00-requirements.md`
- `/.recursive/run/02-audit-remediation/00-worktree.md`
- `/.recursive/run/02-audit-remediation/01-as-is.md`
- `/.recursive/run/02-audit-remediation/01.5-root-cause.md`
- `/.recursive/run/02-audit-remediation/evidence/logs/red/command-path-red.log`
- `/.recursive/run/02-audit-remediation/evidence/logs/red/schema-id-red.log`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/skills/SKILLS.md`

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `unavailable`
Subagent Capability Probe: `delegation remains unavailable for this run because no explicit user authorization for subagents was provided in the session.`
Delegation Decision Basis: `Phase 2 is a controller-owned remediation plan that must stay tightly aligned to the locked root-cause analysis and exact expected change surface.`
Audit Inputs Provided:
- `/.recursive/run/02-audit-remediation/00-requirements.md`
- `/.recursive/run/02-audit-remediation/00-worktree.md`
- `/.recursive/run/02-audit-remediation/01-as-is.md`
- `/.recursive/run/02-audit-remediation/01.5-root-cause.md`
- Changed files:
  - `/.recursive/run/02-audit-remediation/02-to-be-plan.md`
- Targeted code references:
  - `/package.json`
  - `/protocol/schemas/*.schema.json`
  - `/packages/schema-tools/src/validate-schemas.ts`
  - `/packages/schema-tools/test/validate-schemas.test.ts`
  - `/packages/schema-tools/test/generate-protocol-types.test.ts`
  - `/packages/conformance/src/schema-test-helpers.ts`
  - `/packages/conformance/src/protocol-fixture-conformance.test.ts`
  - `/packages/conformance/src/gateway-smoke-observability.test.ts`

## Effective Inputs Re-read

- `/.recursive/run/02-audit-remediation/00-requirements.md`
- `/.recursive/run/02-audit-remediation/00-worktree.md`
- `/.recursive/run/02-audit-remediation/01-as-is.md`
- `/.recursive/run/02-audit-remediation/01.5-root-cause.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/skills/SKILLS.md`

## Earlier Phase Reconciliation

- `/.recursive/run/02-audit-remediation/01-as-is.md`:
  - each in-scope requirement is still blocked by the exact same two defect clusters recorded in Phase 1
- `/.recursive/run/02-audit-remediation/01.5-root-cause.md`:
  - the plan now directly targets the confirmed causes, not a broader guesswork remediation

## Subagent Contribution Verification

- Reviewed Action Records: `none`
- Main-Agent Verification Performed:
  - `/.recursive/run/02-audit-remediation/00-requirements.md`
  - `/.recursive/run/02-audit-remediation/00-worktree.md`
  - `/.recursive/run/02-audit-remediation/01-as-is.md`
  - `/.recursive/run/02-audit-remediation/01.5-root-cause.md`
  - `/.recursive/run/02-audit-remediation/02-to-be-plan.md`
  - `/package.json`
  - `/protocol/schemas/*.schema.json`
  - `/packages/schema-tools/src/validate-schemas.ts`
  - `/packages/conformance/src/schema-test-helpers.ts`
  - `/packages/conformance/src/protocol-fixture-conformance.test.ts`
  - `/packages/conformance/src/gateway-smoke-observability.test.ts`
- Acceptance Decision: `accepted`
- Refresh Handling: `not applicable`
- Repair Performed After Verification:
  - `/.recursive/run/02-audit-remediation/02-to-be-plan.md`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `50d03fd386a44957068105ce4673a5dc66a8de12`
- Comparison reference: `working-tree`
- Normalized baseline: `50d03fd386a44957068105ce4673a5dc66a8de12`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 50d03fd386a44957068105ce4673a5dc66a8de12`
- Diff basis used: `git diff --name-only 50d03fd386a44957068105ce4673a5dc66a8de12`
- Supplemental scope command: `git status --short --untracked-files=all`
- Base branch: `main`
- Worktree branch: `recursive/02-audit-remediation`
- Planned or claimed changed files:
  - `package.json`
  - `protocol/schemas/*.schema.json`
  - `packages/schema-tools/src/validate-schemas.ts`
  - `packages/schema-tools/test/validate-schemas.test.ts`
  - `packages/conformance/src/schema-test-helpers.ts`
  - `/.recursive/run/02-audit-remediation/evidence/logs/red/*`
  - `/.recursive/run/02-audit-remediation/evidence/logs/green/*`
  - `/.recursive/run/02-audit-remediation/03-implementation-summary.md`
  - `/.recursive/run/02-audit-remediation/04-test-summary.md`
- Actual changed files reviewed:
  - `.recursive/run/02-audit-remediation/00-requirements.md`
  - `.recursive/run/02-audit-remediation/00-worktree.md`
  - `.recursive/run/02-audit-remediation/01-as-is.md`
  - `.recursive/run/02-audit-remediation/01.5-root-cause.md`
  - `.recursive/run/02-audit-remediation/02-to-be-plan.md`
  - `.recursive/run/02-audit-remediation/audit-findings-2026-04-24.md`
  - `.recursive/run/02-audit-remediation/evidence/logs/red/command-path-red.log`
  - `.recursive/run/02-audit-remediation/evidence/logs/red/schema-id-red.log`
- Unexplained drift:
  - none

## Gaps Found

- none; the plan is concrete enough for a narrow Phase 3 implementation.

## Repair Work Performed

- tightened the expected write surface so only the schema files, schema loader/helper, schema-tools test, root scripts, and recursive evidence are in scope
- defined separate sub-phases for schema identity and wrapper-path repair so later diff audits can reconcile the work cleanly

## Requirement Completion Status

- R1 | Status: blocked | Rationale: source-level schema identity repair is planned in `SP1` but not yet implemented. | Blocking Evidence: `/.recursive/run/02-audit-remediation/02-to-be-plan.md` | Audit Note: planned across `## Planned Changes by File`, `## Implementation Steps`, and `SP1`.
- R2 | Status: blocked | Rationale: tooling and conformance unmasking is planned in `SP1` but not yet implemented. | Blocking Evidence: `/.recursive/run/02-audit-remediation/02-to-be-plan.md` | Audit Note: the plan repairs both masking layers together.
- R3 | Status: blocked | Rationale: root schema-validation script repair is planned in `SP2` but not yet implemented. | Blocking Evidence: `/.recursive/run/02-audit-remediation/02-to-be-plan.md` | Audit Note: the failing conformance test remains the red baseline.
- R4 | Status: blocked | Rationale: root smoke script repair is planned in `SP2` but not yet implemented. | Blocking Evidence: `/.recursive/run/02-audit-remediation/02-to-be-plan.md` | Audit Note: direct package execution remains unchanged by design.
- R5 | Status: blocked | Rationale: the conformance slice is planned to return green after `SP1` and `SP2`, but that work has not been executed yet. | Blocking Evidence: `/.recursive/run/02-audit-remediation/02-to-be-plan.md` | Audit Note: final proof will live in Phase 4.

## Audit Verdict

- Audit summary: the plan is concrete, narrow, and directly tied to the confirmed root causes for `R1`-`R5`.
- Follow-up required before lock: none
Audit: PASS

## Traceability

- `R1`, `R2` -> planned schema-source and loader/helper repairs are captured in `## Planned Changes by File`, `## Implementation Steps`, and `SP1`. | Evidence: `/.recursive/run/02-audit-remediation/02-to-be-plan.md`
- `R3`, `R4`, `R5` -> planned root-script repair and conformance verification are captured in `## Planned Changes by File`, `## Testing Strategy`, and `SP2`. | Evidence: `/.recursive/run/02-audit-remediation/02-to-be-plan.md`

## Coverage Gate

- Effective inputs reviewed:
  - `/.recursive/run/02-audit-remediation/00-requirements.md`
  - `/.recursive/run/02-audit-remediation/00-worktree.md`
  - `/.recursive/run/02-audit-remediation/01-as-is.md`
  - `/.recursive/run/02-audit-remediation/01.5-root-cause.md`
- Requirement coverage check:
  - `R1`-`R5`: covered in `## Planned Changes by File`, `## Implementation Steps`, `## Testing Strategy`, `## Implementation Sub-phases`, and `## Traceability`
- Out-of-scope confirmation:
  - `OOS1`-`OOS4`: preserved; the plan does not widen into unrelated schema semantics, router logic, or runtime families

Coverage: PASS

## Approval Gate

- Objective readiness checks:
  - every in-scope requirement has a concrete change surface
  - strict-TDD red and green commands are defined
  - the expected product and evidence drift is concrete enough for later audits
  - no required Phase 2 section is missing
- Remaining blockers:
  - none

Approval: PASS
