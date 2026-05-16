Run: `/.recursive/run/32-models-dev-metadata-coverage/`
Phase: `02 TO-BE PLAN`
Status: `LOCKED`
LockedAt: `2026-05-15T22:18:37Z`
LockHash: `105b4909b94810b9c05254b0c88b81b14793a282369c82b988d80466cb58c0bc`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/32-models-dev-metadata-coverage/00-requirements.md`
- `/.recursive/run/32-models-dev-metadata-coverage/00-worktree.md`
- `/.recursive/run/32-models-dev-metadata-coverage/01-as-is.md`
Outputs:
- `/.recursive/run/32-models-dev-metadata-coverage/02-to-be-plan.md`
Scope note: This plan translates the Phase 1 findings into a narrow implementation sequence that refreshes live `models.dev` metadata, regenerates shipped catalog artifacts, merges that metadata with LiteLLM runtime coverage, and proves the result through strict TDD plus end-to-end validation.

## TODO

- [x] Re-read the locked Phase 0 and Phase 1 artifacts
- [x] Choose the concrete refresh, export, merge, and validation surfaces
- [x] Define implementation steps that preserve the `models.dev` vs LiteLLM ownership split
- [x] Make strict TDD and end-to-end evidence explicit
- [x] Complete the audited-phase sections and gates

## Planned Changes by File

- `/.recursive/run/32-models-dev-metadata-coverage/02-to-be-plan.md`: define the implementation sequence, TDD obligations, and validation path
- `/role-model-router/packages/catalog/src/index.ts`: extend provider/model snapshot and normalized types to carry the needed provider metadata, normalize live-refreshed data, and support identifier-aware merge helpers
- `/role-model-router/packages/catalog/src/cli.ts`: keep artifact export, but redirect or augment it so the generated files can be written to the tracked package data path
- `/role-model-router/packages/catalog/src/refresh.ts` or equivalent new module: fetch live `models.dev` data plus provenance and rewrite pinned snapshot artifacts deterministically
- `/role-model-router/packages/catalog/test/index.test.ts`: add RED/GREEN coverage for refresh transformation, richer provider metadata, tracked-artifact regeneration, and merge helpers
- `/testdata/catalog/models-dev-snapshot.json`: replace the tiny hand-curated sample with the refreshed pinned dataset format expected by the new pipeline
- `/testdata/catalog/models-dev-local-overrides.json`: preserve runtime-owned overrides for auth/control-plane semantics and any required identifier mapping
- `/role-model-router/packages/catalog/data/normalized-catalog.json`
- `/role-model-router/packages/catalog/data/vendor-version-ledger.json`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`: consume the regenerated catalog while preserving LiteLLM model/provider fallback coverage
- `/role-model-router/apps/runtime-host-bridge/src/package-sea.ts`: continue packaging the tracked generated catalog assets and validate the updated asset expectations if needed
- `/role-model-router/packages/provider-account/src/index.ts`
- `/role-model-router/packages/endpoint-registry/src/index.ts`
- `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `/role-model-router/apps/runtime-ui/app/routes/providers.tsx`
- `/package.json`: add an explicit refresh command and any narrow regeneration helper scripts needed by this run

## Implementation Steps

1. Add a repo-owned refresh path that fetches the live `models.dev` API plus upstream provenance, transforms that data into the repo’s pinned snapshot shape, and rewrites `testdata/catalog/models-dev-snapshot.json`.
2. Extend the catalog snapshot and normalized provider types so provider metadata can include the fields this run needs from `models.dev`, especially provider docs metadata in addition to name, env vars, npm compatibility, and base API endpoint.
3. Make catalog export regenerate the tracked package data artifacts under `role-model-router/packages/catalog/data/` so runtime-host and SEA packaging consume the same up-to-date generated catalog.
4. Add explicit merge helpers that keep `models.dev` as the default provider/model metadata source while preserving LiteLLM-only provider/model coverage and any identifier mapping needed to avoid dropping models.
5. Replace or sharply reduce handwritten provider defaults in `litellm-catalog.ts` so only auth/control-plane deltas remain there, while provider display metadata defaults move to the normalized catalog.
6. Update runtime and UI consumers so provider-account validation, endpoint-registry declarations, provider onboarding surfaces, and any exposed model metadata all read from the regenerated normalized catalog or merged derivatives of it.
7. Validate the full path through strict RED/GREEN cycles, focused package tests, runtime-host regressions, and at least one end-to-end runtime proof that exercises the regenerated catalog in a live or packaged path.

## Testing Strategy

- TDD RED/GREEN slices:
  - refresh transformation and provenance capture
  - normalized provider metadata enrichment
  - tracked artifact regeneration
  - LiteLLM coverage fallback / identifier mapping
  - runtime/UI consumer wiring regressions
- Focused commands expected during implementation:
  - `corepack pnpm --filter @role-model-router/catalog test`
  - targeted `@role-model-router/runtime-host-bridge` tests for merged catalog behavior
  - targeted `@role-model-router/runtime-ui` tests if UI/provider display logic changes
- Broader verification commands after green:
  - `corepack pnpm run catalog:export`
  - explicit new refresh command
  - `corepack pnpm run runtime:validate-host`
  - packaged-asset or packaging validation if the tracked catalog asset path changes

## End-to-End Verification Expectations

- The run must prove that a regenerated tracked catalog is loaded by runtime-host and not merely written to `runtime-output`.
- The run must prove at least one API-key provider path still works after the metadata merge.
- If final changed files touch Moonshot OAuth execution or provider onboarding logic, the run must also prove that path end to end.
- If packaged assets are touched, verification must include the packaged runtime asset path rather than assuming dev-runtime parity.

## Manual QA Scenarios

1. **Refresh and regenerate**
   - run the explicit `models.dev` refresh command
   - regenerate the tracked normalized catalog and vendor ledger
   - inspect the changed snapshot and generated artifacts
2. **Provider metadata sanity**
   - inspect a representative provider such as Fireworks or Together in the generated snapshot/catalog
   - confirm env vars, API base metadata, and docs metadata flow through the normalized catalog
3. **Runtime consumer sanity**
   - open or query the runtime provider surface and confirm the visible provider metadata comes from the regenerated catalog
4. **End-to-end runtime sanity**
   - exercise at least one representative provider request path after regeneration and confirm no execution coverage was lost

## Playwright Plan (if applicable)

- Not the primary validation path for the first Phase 3 slice.
- If Phase 3 changes land in runtime UI surfaces that lack sufficient package-level regression coverage, add a focused browser-backed check for provider metadata display and onboarding-state correctness before Phase 4 closes.
- If the final diff remains limited to catalog generation plus runtime-host consumption, Playwright evidence may remain unnecessary.

## Reproduction Steps (Novice-Runnable)

1. From the selected worktree root, read `/.recursive/run/32-models-dev-metadata-coverage/01-as-is.md`.
2. Run `corepack pnpm run catalog:export` to confirm the current export path is available and still reproduces the Phase 1 baseline.
3. Open `role-model-router\packages\catalog\data\normalized-catalog.json` and confirm the tracked shipped artifact remains placeholder-grade before Phase 3 starts.
4. Open `role-model-router\packages\catalog\src\cli.ts` and `role-model-router\apps\runtime-host-bridge\src\index.ts` to confirm the planned refresh/export/runtime-consumption surfaces named in this artifact are the real code paths.
5. Read the `## Planned Changes by File`, `## Implementation Steps`, and `## Implementation Sub-phases` sections in this artifact and use them as the execution map for strict TDD in Phase 3.

## Idempotence and Recovery

- Re-running the refresh command is safe; it should deterministically rewrite pinned snapshot artifacts from the latest upstream response and provenance source.
- Re-running catalog export is safe; it should deterministically rewrite the tracked generated artifacts from the pinned snapshot plus overrides.
- If upstream refresh reveals identifier mismatch or missing coverage, preserve runtime availability via the LiteLLM fallback/merge path instead of weakening the catalog or silently dropping models.
- If the diff widens into unrelated UI redesign or execution-engine replacement, stop and trim scope back to the run requirements before Phase 3 continues.

## Implementation Sub-phases

### SP1. Refresh and richer snapshot metadata

Requirement mapping: `R1`, `R2`, `R3`

Implementation checklist:
- [ ] Add RED tests for live-refresh transformation and richer provider metadata fields
- [ ] Implement the explicit refresh command and upstream provenance capture
- [ ] Extend snapshot and normalized provider metadata types to include the required provider defaults
- [ ] Rewrite the pinned snapshot artifact format around the refreshed data

Tests for this sub-phase:
- `corepack pnpm --filter @role-model-router/catalog test`

Sub-phase acceptance:
- The repo can refresh live `models.dev` data into pinned snapshot artifacts with verifiable provenance and richer provider metadata.

### SP2. Tracked artifact regeneration and runtime consumption

Requirement mapping: `R2`, `R3`, `R5`

Implementation checklist:
- [ ] Add RED tests that fail while tracked `packages/catalog/data/*` artifacts remain stale or empty
- [ ] Implement tracked artifact regeneration into `role-model-router/packages/catalog/data/`
- [ ] Update runtime-host and packaging consumers to use the regenerated tracked assets as the authoritative metadata source
- [ ] Reduce provider default ownership in `litellm-catalog.ts` to auth/control-plane deltas only where feasible

Tests for this sub-phase:
- `corepack pnpm --filter @role-model-router/catalog test`
- targeted runtime-host tests
- `corepack pnpm run catalog:export`

Sub-phase acceptance:
- The app loads a non-empty regenerated tracked catalog and the packaged asset path stays aligned with runtime behavior.

### SP3. LiteLLM coverage fallback and end-to-end proof

Requirement mapping: `R4`, `R5`, `R6`

Implementation checklist:
- [ ] Add RED tests for LiteLLM-only fallback coverage and identifier mapping
- [ ] Implement merged catalog/runtime behavior that preserves every exposed provider/model/endpoint
- [ ] Update UI/runtime consumer surfaces that expose provider/model metadata
- [ ] Capture end-to-end evidence for representative runtime flows after metadata integration

Tests for this sub-phase:
- targeted catalog/runtime-host/runtime-ui tests
- `corepack pnpm run runtime:validate-host`
- packaged/live end-to-end proof as required by the final changed paths

Sub-phase acceptance:
- The metadata layer moves to `models.dev` without dropping LiteLLM execution coverage, and the run has end-to-end proof rather than only unit-level greens.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/32-models-dev-metadata-coverage/01-as-is.md`
- `/.recursive/run/32-models-dev-metadata-coverage/00-worktree.md`
- `/.recursive/run/05-router-runtime-catalog-foundation/00-requirements.md`
- `/.recursive/run/14-router-runtime-ui-foundation/00-requirements.md`
- `/.recursive/run/17-oauth-litellm-generalization/00-requirements.md`
- `/.recursive/memory/MEMORY.md`

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `available`
Subagent Capability Probe: `task`, `code-review`, and recursive-mode skills remain available in this session.
Delegation Decision Basis: `Phase 2 required a tightly coupled implementation plan over the freshly documented Phase 1 code paths, the corrected worktree-local run artifacts, and the exact TDD/e2e obligations from run 32.`
Delegation Override Reason: `The controller needed to keep planning tightly aligned to the discovered shipped-artifact bug, the live worktree state, and the exact file/package boundaries before starting strict TDD.`
Audit Inputs Provided:
- `/.recursive/run/32-models-dev-metadata-coverage/00-requirements.md`
- `/.recursive/run/32-models-dev-metadata-coverage/00-worktree.md`
- `/.recursive/run/32-models-dev-metadata-coverage/01-as-is.md`
- Changed files:
  - `/.recursive/run/32-models-dev-metadata-coverage/02-to-be-plan.md`
- Targeted code references:
  - `/role-model-router/packages/catalog/src/index.ts`
  - `/role-model-router/packages/catalog/src/cli.ts`
  - `/role-model-router/packages/catalog/src/litellm-catalog.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/package-sea.ts`
  - `/role-model-router/packages/provider-account/src/index.ts`
  - `/role-model-router/packages/endpoint-registry/src/index.ts`
  - `/role-model-router/apps/runtime-ui/app/routes/providers.tsx`

## Effective Inputs Re-read

- `/.recursive/run/32-models-dev-metadata-coverage/00-requirements.md`
- `/.recursive/run/32-models-dev-metadata-coverage/00-worktree.md`
- `/.recursive/run/32-models-dev-metadata-coverage/01-as-is.md`

## Earlier Phase Reconciliation

- `/.recursive/run/32-models-dev-metadata-coverage/01-as-is.md`:
  - the shipped catalog asset is empty, the refresh path is fixture-only, LiteLLM fallback already exists, and mixed model ids make identity alignment a required planned behavior
- `/.recursive/run/32-models-dev-metadata-coverage/00-worktree.md`:
  - the run must continue from `D:\DEV\role-model\.worktrees\32-models-dev-metadata-coverage` on branch `recursive/32-models-dev-metadata-coverage`
- `/.recursive/run/32-models-dev-metadata-coverage/00-requirements.md`:
  - implementation must keep `models.dev` as metadata ownership, LiteLLM as execution coverage, and role-model overrides as auth/control-plane deltas only

## Subagent Contribution Verification

- Reviewed Action Records: `none`
- Main-Agent Verification Performed:
  - `/.recursive/run/32-models-dev-metadata-coverage/00-requirements.md`
  - `/.recursive/run/32-models-dev-metadata-coverage/00-worktree.md`
  - `/.recursive/run/32-models-dev-metadata-coverage/01-as-is.md`
  - `/.recursive/run/32-models-dev-metadata-coverage/02-to-be-plan.md`
  - `/role-model-router/packages/catalog/src/index.ts`
  - `/role-model-router/packages/catalog/src/cli.ts`
  - `/role-model-router/packages/catalog/src/litellm-catalog.ts`
- Acceptance Decision: `not applicable`
- Refresh Handling: `not applicable`
- Repair Performed After Verification:
  - `/.recursive/run/32-models-dev-metadata-coverage/02-to-be-plan.md`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `da3411c10faa6ee93fa9f5861a1b10359095b058`
- Comparison reference: `working-tree`
- Normalized baseline: `da3411c10faa6ee93fa9f5861a1b10359095b058`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only da3411c10faa6ee93fa9f5861a1b10359095b058`
- Diff basis used: `git diff --name-only da3411c10faa6ee93fa9f5861a1b10359095b058`
- Supplemental scope command: `git status --short --untracked-files=all`
- Base branch: `main`
- Worktree branch: `recursive/32-models-dev-metadata-coverage`
- Planned or claimed changed files:
  - `.recursive/run/32-models-dev-metadata-coverage/02-to-be-plan.md`
  - `package.json`
  - `role-model-router/packages/catalog/src/index.ts`
  - `role-model-router/packages/catalog/src/cli.ts`
  - `role-model-router/packages/catalog/src/refresh.ts`
  - `role-model-router/packages/catalog/test/index.test.ts`
  - `testdata/catalog/models-dev-snapshot.json`
  - `testdata/catalog/models-dev-local-overrides.json`
  - `role-model-router/packages/catalog/data/normalized-catalog.json`
  - `role-model-router/packages/catalog/data/vendor-version-ledger.json`
  - `role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `role-model-router/apps/runtime-host-bridge/src/package-sea.ts`
  - `role-model-router/packages/provider-account/src/index.ts`
  - `role-model-router/packages/endpoint-registry/src/index.ts`
  - `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
  - `role-model-router/apps/runtime-ui/app/routes/providers.tsx`
- Actual changed files reviewed:
  - `.recursive/run/32-models-dev-metadata-coverage/00-requirements.md`
  - `.recursive/run/32-models-dev-metadata-coverage/00-worktree.md`
  - `.recursive/run/32-models-dev-metadata-coverage/01-as-is.md`
  - `.recursive/run/32-models-dev-metadata-coverage/02-to-be-plan.md`
- Unexplained drift:
  - none; product implementation has not started yet

## Gaps Found

- none; this artifact fully defines the Phase 2 plan for `R1`-`R6` without unresolved planning gaps

## Repair Work Performed

- Turned the Phase 1 findings into a narrow three-sub-phase plan anchored on refresh, tracked artifact regeneration, and LiteLLM-safe metadata consumption.
- Made the TDD and end-to-end proof obligations explicit before any production edits begin.

## Requirement Completion Status

- R1 | Status: out-of-scope | Rationale: planning-only phase; implementation and verification land later in Phase 3+. | Scope Decision: `.recursive/run/32-models-dev-metadata-coverage/02-to-be-plan.md` | Audit Note: Phase 2 defined the refresh implementation path only.
- R2 | Status: out-of-scope | Rationale: planning-only phase; implementation and verification land later in Phase 3+. | Scope Decision: `.recursive/run/32-models-dev-metadata-coverage/02-to-be-plan.md` | Audit Note: Phase 2 defined tracked artifact regeneration only.
- R3 | Status: out-of-scope | Rationale: planning-only phase; implementation and verification land later in Phase 3+. | Scope Decision: `.recursive/run/32-models-dev-metadata-coverage/02-to-be-plan.md` | Audit Note: Phase 2 defined metadata-ownership and control-plane preservation only.
- R4 | Status: out-of-scope | Rationale: planning-only phase; implementation and verification land later in Phase 3+. | Scope Decision: `.recursive/run/32-models-dev-metadata-coverage/02-to-be-plan.md` | Audit Note: Phase 2 defined the LiteLLM coverage fallback strategy only.
- R5 | Status: out-of-scope | Rationale: planning-only phase; implementation and verification land later in Phase 3+. | Scope Decision: `.recursive/run/32-models-dev-metadata-coverage/02-to-be-plan.md` | Audit Note: Phase 2 defined runtime/UI consumer rewiring and QA expectations only.
- R6 | Status: out-of-scope | Rationale: planning-only phase; implementation and verification land later in Phase 3+. | Scope Decision: `.recursive/run/32-models-dev-metadata-coverage/02-to-be-plan.md` | Audit Note: Phase 2 defined strict-TDD and end-to-end obligations only.

## Audit Verdict

- Audit summary: the plan is concrete, bounded, and directly derived from the documented Phase 1 gaps.
- Follow-up required before lock: none
Audit: PASS

## Traceability

- `R1` -> `SP1` refresh path
- `R2` -> `SP1` and `SP2` tracked artifact regeneration
- `R3` -> `SP1` and `SP2` provider metadata ownership changes
- `R4` -> `SP3` LiteLLM coverage fallback and identifier mapping
- `R5` -> `SP2` and `SP3` runtime/UI consumer wiring
- `R6` -> all sub-phases via strict TDD and final end-to-end proof

## Coverage Gate

- [x] Every requirement maps to a concrete planned file surface or sub-phase
- [x] The plan preserves the run boundary between `models.dev`, LiteLLM, and role-model overrides
- [x] Strict TDD and end-to-end verification are explicit

Coverage: PASS

## Approval Gate

- [x] The plan is specific enough to begin Phase 3 with RED-first implementation
- [x] The plan is narrow enough to avoid widening into execution-engine replacement or unrelated UI redesign
- [x] No unresolved ambiguity remains about tracked artifact regeneration or LiteLLM coverage preservation

Approval: PASS
