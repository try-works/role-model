Run: `/.recursive/run/05-router-runtime-catalog-foundation/`
Phase: `02 TO-BE PLAN`
Status: `LOCKED`
LockedAt: `2026-05-05T02:25:55Z`
LockHash: `598235ed211c2211d503e0f2c0765b639e1c15506ff300dcbbb1b416f2ac7dcf`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/05-router-runtime-catalog-foundation/00-requirements.md`
- `/.recursive/run/05-router-runtime-catalog-foundation/00-worktree.md`
- `/.recursive/run/05-router-runtime-catalog-foundation/01-as-is.md`
- `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
Outputs:
- `/.recursive/run/05-router-runtime-catalog-foundation/02-to-be-plan.md`
Scope note: This ExecPlan-grade artifact translates the locked Phase 1 findings for `05-router-runtime-catalog-foundation` into a narrow implementation plan. The run will add a role-model-owned normalized catalog package, a pinned snapshot-plus-overrides ingestion path, a vendor-version ledger bootstrap, and a local catalog export/validation path. It must not widen into provider-account, endpoint-instantiation, routing, adapter-execution, host-integration, or broader UI work.

## TODO

- [x] Re-read the locked Phase 0 and Phase 1 artifacts plus the run-05 roadmap slice
- [x] Choose the concrete package and artifact surfaces for catalog foundation work
- [x] Define implementation steps that preserve run-05 scope discipline
- [x] Define verification commands and evidence expectations
- [x] Define manual QA scope and idempotence notes
- [x] Complete the audited-phase sections and gates

## Planned Changes by File

- `/.recursive/run/05-router-runtime-catalog-foundation/02-to-be-plan.md`: define the concrete write surface, sub-phases, validation path, and scope boundaries for run 05.
- `/role-model-router/packages/catalog/package.json`: add the new runtime-owned catalog package to the existing workspace package layout.
- `/role-model-router/packages/catalog/tsconfig.json`: follow the repo TypeScript package convention for source and test separation.
- `/role-model-router/packages/catalog/src/index.ts`: implement snapshot validation, normalization, enrichment, override application, and vendor-ledger derivation for the initial pinned catalog input.
- `/role-model-router/packages/catalog/src/cli.ts`: add a local export path that reads the pinned snapshot plus local overrides and writes stable catalog artifacts under `runtime-output/router-catalog/`.
- `/role-model-router/packages/catalog/test/index.test.ts`: add focused tests that prove normalization preserves upstream semantics, applies role-model-owned enrichment, and emits vendor-ledger data.
- `/testdata/catalog/models-dev-snapshot.json`: add the pinned upstream-like snapshot fixture that acts as the initial catalog input for this run.
- `/testdata/catalog/models-dev-local-overrides.json`: add role-model-owned local override data for provider-kind/auth-family/runtime-only corrections.
- `/runtime-output/router-catalog/normalized-catalog.json`: commit the generated stable normalized-catalog artifact produced from the pinned snapshot and local overrides.
- `/runtime-output/router-catalog/vendor-version-ledger.json`: commit the generated initial vendor-version ledger artifact for the pinned catalog source.
- `/package.json`: add one narrow root script for the local catalog export path so Phase 4 can exercise ingestion/normalization directly.

## Implementation Steps

1. Add a new runtime-owned package at `role-model-router/packages/catalog` rather than extending `router-devtools` ad hoc, because run 05 needs a reusable catalog foundation for later runs rather than only another endpoint-export helper.
2. Define a validated pinned snapshot input under `testdata/catalog/models-dev-snapshot.json` with explicit upstream provenance fields (vendor, commit or tag, snapshot metadata) plus representative provider/model records that preserve:
   - provider and model metadata,
   - adapter-family hints,
   - base-endpoint or request-shape hints where present,
   - `extends` provenance,
   - `experimental.modes`,
   - capability and version-related fields needed by later routing and observability runs.
3. Define role-model-owned local overrides under `testdata/catalog/models-dev-local-overrides.json` so enrichment remains separate from the upstream snapshot. Use those overrides to layer on:
   - provider-kind mapping,
   - auth-family mapping,
   - runtime-only control-plane hints,
   - explicit local override markers when upstream metadata is incomplete or corrected.
4. Implement the catalog package core in `src/index.ts` with:
   - snapshot shape validation,
   - deterministic normalization into a stable internal catalog format,
   - explicit preservation of upstream provenance and mode semantics,
   - local override application without mutating upstream source records,
   - vendor-version ledger derivation from the pinned snapshot metadata.
5. Implement `src/cli.ts` so `catalog:export` writes two stable artifacts under `runtime-output/router-catalog/`:
   - `normalized-catalog.json`
   - `vendor-version-ledger.json`
   The export path should fail loudly on validation or normalization errors so the run can satisfy the roadmap's log-repair rule.
6. Add tests first in `role-model-router/packages/catalog/test/index.test.ts` before production code changes, then implement to make them pass. The tests should prove:
   - upstream semantics are preserved (`extends`, adapter hints, `experimental.modes`),
   - provider-kind/auth-family enrichment is role-model-owned and applied predictably,
   - local overrides are visible in the normalized output,
   - the vendor-version ledger captures the pinned upstream version/commit,
   - runtime-only values such as credentials or concrete endpoints do not appear in catalog records.
7. Add a narrow root script in `/package.json` for the local export path and use it during Phase 4 alongside the existing baseline command chain. Record any inherited `build`/`test` failure accurately as shared schema-tools baseline state unless the catalog work introduces a new regression.

## Testing Strategy

- New behavior tests:
  - `corepack pnpm --filter @role-model-router/catalog test`
- Direct catalog validation path:
  - `corepack pnpm run catalog:export`
- Regression checks:
  - `corepack pnpm run schemas:validate`
  - `corepack pnpm run build`
  - `corepack pnpm run test`
  - `corepack pnpm run smoke`
- Guardrail checks:
  - `python D:\DEV\role-model\.worktrees\05-router-runtime-catalog-foundation\.agents\skills\recursive-mode\scripts\lint-recursive-run.py --repo-root D:\DEV\role-model\.worktrees\05-router-runtime-catalog-foundation --run-id 05-router-runtime-catalog-foundation`
  - `git diff --name-only a328c6eeac497853cc7cef25670b1609a49637b7`

## Playwright Plan (if applicable)

- Not applicable for this run.
- Rationale: run 05 adds catalog ingestion, normalization, and local artifact export only; it introduces no browser UI surface.

## Manual QA Scenarios

1. **Pinned snapshot provenance check**
   - Steps:
     - inspect `testdata/catalog/models-dev-snapshot.json`
     - inspect `runtime-output/router-catalog/vendor-version-ledger.json`
   - Expected:
     - the generated ledger records the same pinned vendor and commit or tag carried by the snapshot metadata
     - provenance stays role-model-owned and reproducible

2. **Normalization and enrichment sanity check**
   - Steps:
     - inspect `runtime-output/router-catalog/normalized-catalog.json`
     - compare selected providers and models against the pinned snapshot plus local overrides
   - Expected:
     - normalized records preserve upstream metadata (`extends`, adapter hints, modes) while showing role-model-owned provider-kind/auth-family enrichment and override markers

3. **Scope-boundary sanity check**
   - Steps:
     - inspect `role-model-router/packages/catalog/src/index.ts`
     - confirm no credential storage, provider-account records, concrete endpoints, or routing decisions are added to the catalog package
   - Expected:
     - the new package remains a catalog input layer only

4. **Local export path sanity check**
   - Steps:
     - run `corepack pnpm run catalog:export`
     - review the command output and generated artifact files under `runtime-output/router-catalog/`
   - Expected:
     - the export path is deterministic
     - validation failures surface as explicit errors instead of silent fallback behavior

## Idempotence and Recovery

- Re-running `corepack pnpm run catalog:export` is safe and should deterministically rewrite the same stable artifacts from the same pinned inputs.
- Re-running the catalog package tests is safe and should remain green once normalization and ledger behavior are implemented.
- If the diff grows into provider-account, endpoint-registry, routing, execution, or host-integration surfaces, stop and trim the widening before closing Phase 3.
- If the pinned snapshot shape changes during implementation, update the validator and fixtures together instead of weakening validation.
- If the inherited schema-tools/Biome failure still appears in root `build` or `test`, record it accurately as unchanged baseline state unless the catalog package introduced a distinct new failure.

## Implementation Sub-phases

### SP1. Catalog core and pinned inputs

Scope and purpose:
Create the role-model-owned catalog package core and the pinned input fixtures it consumes.

Requirement mapping: `R1`, `R2`, `R3`

Implementation checklist:
- [ ] Add `role-model-router/packages/catalog/` with workspace package metadata and TypeScript config
- [ ] Add `testdata/catalog/models-dev-snapshot.json`
- [ ] Add `testdata/catalog/models-dev-local-overrides.json`
- [ ] Add tests that describe the desired normalized catalog and ledger behavior before implementing production code
- [ ] Implement deterministic snapshot validation, normalization, enrichment, override application, and ledger derivation in `src/index.ts`

Tests for this sub-phase:
- `corepack pnpm --filter @role-model-router/catalog test`

Sub-phase acceptance:
- The repo can load the pinned snapshot plus local overrides and produce an in-memory normalized catalog plus vendor-ledger object with stable semantics.

### SP2. Local export path and stable artifacts

Scope and purpose:
Make the catalog foundation runnable and inspectable through a local export path that writes stable artifacts for later runs.

Requirement mapping: `R1`, `R3`, `R4`

Implementation checklist:
- [ ] Add `src/cli.ts` for artifact export
- [ ] Add `/package.json` script `catalog:export`
- [ ] Generate and commit `runtime-output/router-catalog/normalized-catalog.json`
- [ ] Generate and commit `runtime-output/router-catalog/vendor-version-ledger.json`
- [ ] Keep the diff limited to catalog package, fixtures, export artifacts, and recursive artifacts

Tests for this sub-phase:
- `corepack pnpm run catalog:export`
- `git diff --name-only a328c6eeac497853cc7cef25670b1609a49637b7`

Sub-phase acceptance:
- The run has a deterministic local export path and stable output artifacts that later provider-account and endpoint-registry runs can consume.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/05-router-runtime-catalog-foundation/01-as-is.md`
- `/.recursive/run/05-router-runtime-catalog-foundation/00-worktree.md`
- `/.recursive/run/04-router-runtime-architecture-lock/03-implementation-summary.md`
- `/.recursive/run/04-router-runtime-architecture-lock/04-test-summary.md`
- `/.recursive/run/03-protocol-baseline-hardening/03-implementation-summary.md`
- `/.recursive/run/03-protocol-baseline-hardening/07-state-update.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/skills/SKILLS.md`
- `/.recursive/memory/skills/patterns/delegated-verification-and-refresh.md`

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `available`
Subagent Capability Probe: `task`, `code-review`, and custom recursive-mode skills remain available in this session.
Delegation Decision Basis: `Phase 2 is an ExecPlan synthesis artifact that must stay tightly aligned to the locked Phase 1 findings, the roadmap run-05 slice, the current worktree diff basis, and the controller's intended write surface before strict TDD starts.`
Delegation Override Reason: `A delegated planning pass would add overhead without improving fidelity because the controller already holds the locked Phase 1 inventory, the roadmap slice, the package-layout evidence, and the exact intended no-widening implementation boundary for Phase 3.`
Audit Inputs Provided:
- `/.recursive/run/05-router-runtime-catalog-foundation/00-requirements.md`
- `/.recursive/run/05-router-runtime-catalog-foundation/00-worktree.md`
- `/.recursive/run/05-router-runtime-catalog-foundation/01-as-is.md`
- `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
- Changed files:
  - `/.recursive/run/05-router-runtime-catalog-foundation/02-to-be-plan.md`
- Targeted code references:
  - `/package.json`
  - `/pnpm-workspace.yaml`
  - `/role-model-router/packages/provider-cli/package.json`
  - `/role-model-router/apps/router-devtools/package.json`
  - `/role-model-router/apps/router-devtools/test/index.test.ts`

## Effective Inputs Re-read

- `/.recursive/run/05-router-runtime-catalog-foundation/00-requirements.md`
- `/.recursive/run/05-router-runtime-catalog-foundation/00-worktree.md`
- `/.recursive/run/05-router-runtime-catalog-foundation/01-as-is.md`
- `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`

## Earlier Phase Reconciliation

- `/.recursive/run/05-router-runtime-catalog-foundation/01-as-is.md`:
  - the current repo baseline has endpoint-export and provider-stub metadata, but no reusable normalized catalog foundation, override layer, or vendor ledger
- `/.recursive/run/05-router-runtime-catalog-foundation/00-worktree.md`:
  - the selected in-repo worktree and inherited baseline validation caveat remain the execution context for later phases
- `/.recursive/run/05-router-runtime-catalog-foundation/00-requirements.md`:
  - Phase 3 must add a normalized catalog foundation plus vendor-version bootstrap without widening into accounts, endpoints, or routing implementation

## Subagent Contribution Verification

- Reviewed Action Records: `none`
- Main-Agent Verification Performed:
  - `/.recursive/run/05-router-runtime-catalog-foundation/00-requirements.md`
  - `/.recursive/run/05-router-runtime-catalog-foundation/00-worktree.md`
  - `/.recursive/run/05-router-runtime-catalog-foundation/01-as-is.md`
  - `/.recursive/run/05-router-runtime-catalog-foundation/02-to-be-plan.md`
  - `/package.json`
  - `/pnpm-workspace.yaml`
  - `/role-model-router/packages/provider-cli/package.json`
  - `/role-model-router/apps/router-devtools/package.json`
  - `/role-model-router/apps/router-devtools/test/index.test.ts`
- Acceptance Decision: `not applicable`
- Refresh Handling: `not applicable`
- Repair Performed After Verification:
  - `/.recursive/run/05-router-runtime-catalog-foundation/02-to-be-plan.md`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `a328c6eeac497853cc7cef25670b1609a49637b7`
- Comparison reference: `working-tree`
- Normalized baseline: `a328c6eeac497853cc7cef25670b1609a49637b7`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only a328c6eeac497853cc7cef25670b1609a49637b7`
- Diff basis used: `git diff --name-only a328c6eeac497853cc7cef25670b1609a49637b7`
- Supplemental scope command: `git status --short --untracked-files=all`
- Base branch: `main`
- Worktree branch: `recursive/05-router-runtime-catalog-foundation`
- Planned or claimed changed files:
  - `.recursive/run/05-router-runtime-catalog-foundation/02-to-be-plan.md`
  - `package.json`
  - `role-model-router/packages/catalog/package.json`
  - `role-model-router/packages/catalog/tsconfig.json`
  - `role-model-router/packages/catalog/src/index.ts`
  - `role-model-router/packages/catalog/src/cli.ts`
  - `role-model-router/packages/catalog/test/index.test.ts`
  - `testdata/catalog/models-dev-snapshot.json`
  - `testdata/catalog/models-dev-local-overrides.json`
  - `runtime-output/router-catalog/normalized-catalog.json`
  - `runtime-output/router-catalog/vendor-version-ledger.json`
- Actual changed files reviewed:
  - `.recursive/run/05-router-runtime-catalog-foundation/00-requirements.md`
  - `.recursive/run/05-router-runtime-catalog-foundation/00-worktree.md`
  - `.recursive/run/05-router-runtime-catalog-foundation/01-as-is.md`
  - `.recursive/run/05-router-runtime-catalog-foundation/02-to-be-plan.md`
  - `.recursive/run/05-router-runtime-catalog-foundation/subagents/run05-phase1-as-is-audit.md`
- Unexplained drift:
  - none; the current working diff is still limited to run-05 recursive artifacts before product implementation begins

## Gaps Found

- none; the implementation plan is concrete enough to start strict TDD without widening the run.

## Repair Work Performed

- Chose a dedicated `role-model-router/packages/catalog` package boundary so the run adds a reusable catalog foundation rather than another app-local helper.
- Chose pinned snapshot and local override fixtures plus committed `runtime-output/router-catalog/` artifacts so provenance, enrichment, and vendor tracking remain role-model-owned and reproducible.

## Requirement Completion Status

- R1 | Status: blocked | Rationale: the package boundary, pinned inputs, and stable export artifacts are now planned precisely, but the normalized catalog package and its outputs do not exist yet. | Blocking Evidence: `/.recursive/run/05-router-runtime-catalog-foundation/02-to-be-plan.md` | Audit Note: Phase 3 will add `role-model-router/packages/catalog`, pinned input fixtures, and stable normalized catalog output without widening into endpoint instantiation.
- R2 | Status: blocked | Rationale: the plan defines role-model-owned provider-kind/auth-family enrichment and local overrides, but those enrichment and override paths are not implemented yet. | Blocking Evidence: `/.recursive/run/05-router-runtime-catalog-foundation/02-to-be-plan.md` | Audit Note: Phase 3 will keep enrichment separate from the upstream snapshot and explicitly avoid credentials or concrete endpoint state.
- R3 | Status: blocked | Rationale: the plan defines a vendor-version bootstrap path, but no generated or committed vendor-ledger artifact exists yet. | Blocking Evidence: `/.recursive/run/05-router-runtime-catalog-foundation/02-to-be-plan.md` | Audit Note: Phase 3 will derive and commit `runtime-output/router-catalog/vendor-version-ledger.json` from pinned snapshot provenance.
- R4 | Status: blocked | Rationale: the plan defines a deterministic local export path and verification chain, but the run has not yet implemented or exercised that path. | Blocking Evidence: `/.recursive/run/05-router-runtime-catalog-foundation/00-worktree.md`, `/.recursive/run/05-router-runtime-catalog-foundation/02-to-be-plan.md` | Audit Note: Phase 4 will run `catalog:export` plus the existing validation floor and record any unchanged inherited `build`/`test` failures separately from catalog regressions.

## Audit Verdict

- Audit summary: the plan is concrete enough to implement a reusable catalog foundation package, pinned snapshot-plus-override ingestion, and a vendor-ledger export path while keeping run 05 out of later account, endpoint, and routing work.
- Follow-up required before lock: none
Audit: PASS

## Traceability

- `R1` -> normalized catalog package scope is planned in `## Planned Changes by File`, `## Implementation Steps`, `## Implementation Sub-phases`, and `## Requirement Completion Status`.
- `R2` -> enrichment and local-override behavior is planned in `## Implementation Steps`, `## Manual QA Scenarios`, and `## Requirement Completion Status`.
- `R3` -> vendor-version ledger bootstrap is planned in `## Planned Changes by File`, `## Implementation Steps`, `## Manual QA Scenarios`, and `## Requirement Completion Status`.
- `R4` -> local export-path validation and inherited-baseline handling are planned in `## Testing Strategy`, `## Manual QA Scenarios`, `## Idempotence and Recovery`, and `## Requirement Completion Status`.

## Coverage Gate

- Effective inputs reviewed:
  - `/.recursive/run/05-router-runtime-catalog-foundation/00-requirements.md`
  - `/.recursive/run/05-router-runtime-catalog-foundation/00-worktree.md`
  - `/.recursive/run/05-router-runtime-catalog-foundation/01-as-is.md`
  - `C:\Users\erikb\OneDrive\##### DEV\role-model\requirements\role-model-router-runtime-roadmap.md`
- Requirement coverage check:
  - `R1`-`R4`: covered in `## Planned Changes by File`, `## Implementation Steps`, `## Testing Strategy`, `## Manual QA Scenarios`, `## Implementation Sub-phases`, and `## Requirement Completion Status`
- Out-of-scope confirmation:
  - `OOS1`-`OOS3`: preserved; the plan adds catalog ingestion, normalization, enrichment, ledger, and export only

Coverage: PASS

## Approval Gate

- [x] The implementation plan is specific enough to drive strict TDD in Phase 3
- [x] Scope boundaries are still narrow enough to avoid widening into account, endpoint, or routing implementation

Approval: PASS
