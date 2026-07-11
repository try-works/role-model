Run: `/.recursive/run/63-router-backend-regression-and-telemetry-surface-hardening/`
Phase: `02 TO-BE Plan`
Status: `LOCKED`
LockedAt: `2026-07-11T09:46:40Z`
LockHash: `e624d530118f2662899737ab979e7c4b50a27af49ad79f7ea9418ed6dda5fcc7`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/63-router-backend-regression-and-telemetry-surface-hardening/00-requirements.md`
- `/.recursive/run/63-router-backend-regression-and-telemetry-surface-hardening/00-worktree.md`
- `/.recursive/run/63-router-backend-regression-and-telemetry-surface-hardening/01-as-is.md`
- `/.recursive/RECURSIVE.md`
- `/.codex/AGENTS.md`
- `/.agent/PLANS.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/.recursive/memory/domains/role-model-baseline.md`
- `/.recursive/memory/skills/SKILLS.md`
- `/.recursive/memory/skills/patterns/browser-proof-with-edge-cdp.md`
- `/.recursive/memory/skills/patterns/delegated-verification-and-refresh.md`
Outputs:
- `/.recursive/run/63-router-backend-regression-and-telemetry-surface-hardening/02-to-be-plan.md`
Scope note: This artifact defines the implementation and verification plan for introducing a canonical router-focused regression lane, direct trace/usage package tests, and stronger telemetry/dashboard regression protection without weakening the existing runtime verification floor.

## TODO

- [x] Re-read effective upfront artifacts from disk
- [x] Map `R1` through `R7` to concrete implementation workstreams
- [x] Define the command, package-test, telemetry, browser, and docs changes required by the run
- [x] Define the verification floor needed to satisfy the run without weakening broad runtime validation
- [x] Record plan drift check against the approved requirements and AS-IS baseline
- [x] Audit the plan for recursive-mode readiness

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `unavailable`
Subagent Capability Probe: worktree-local routed delegation remains blocked because `/.recursive/config/recursive-router-discovered.json` is still absent in this worktree and no external delegated subagent tool has been validated for this run.
Delegation Decision Basis: Phase 2 planning is repo-local and can be completed directly from the locked requirements, locked worktree baseline, and locked Phase 1 AS-IS inventory. The missing worktree-local router discovery inventory still blocks routed delegation.
Audit Inputs Provided:
- locked run-63 requirements and worktree artifacts
- locked run-63 AS-IS artifact
- current root script surface from `/package.json`
- current runtime testing docs from `/docs/architecture/10-runtime-testing-architecture.md` and `/docs/operations/04-runtime-testing-matrix.md`
- current runtime-host, runtime-ui, trace, and usage package manifests and source files already inventoried in Phase 1

## Effective Inputs Re-read

- `/.recursive/run/63-router-backend-regression-and-telemetry-surface-hardening/00-requirements.md`
- `/.recursive/run/63-router-backend-regression-and-telemetry-surface-hardening/00-worktree.md`
- `/.recursive/run/63-router-backend-regression-and-telemetry-surface-hardening/01-as-is.md`
- `/.recursive/RECURSIVE.md`
- `/.codex/AGENTS.md`
- `/.agent/PLANS.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/.recursive/memory/domains/role-model-baseline.md`
- `/.recursive/memory/skills/SKILLS.md`
- `/.recursive/memory/skills/patterns/browser-proof-with-edge-cdp.md`
- `/.recursive/memory/skills/patterns/delegated-verification-and-refresh.md`

## Planned Changes by File

### `/package.json` (root scripts)
- Add new root script `runtime:test-router` that assembles the canonical router-focused regression lane
- Keep existing scripts (`runtime:test-critical`, `runtime:test-browser`, `runtime:test-validators`, `runtime:test-full`) intact
- Ensure `runtime:test-router` is composed only from deterministic local package tests and validators

### `/role-model-router/apps/runtime-host-bridge/package.json`
- Possibly add a `test:router` entrypoint or adjust existing focused command to include router-critical subsets
- Ensure router-critical test files are identifiable and runnable as a discrete lane

### `/role-model-router/apps/runtime-host-bridge/test/**` (selected)
- Curate existing tests covering alias resolution, override precedence, capability filtering, deterministic selection, no-candidate behavior, routing HTTP contract, restart/persistence, and selected-endpoint failure
- Add new focused tests where gaps exist without expanding omnibus suites

### `/role-model-router/packages/trace/package.json`
- Add `test` script (`vitest run`)
- Add dependency on `vitest` if not already present

### `/role-model-router/packages/trace/test/index.test.ts` (new)
- Write/read round-trip test
- Missing parent span test
- Missing trace/span reference test
- Request-id mismatch test
- Routing-decision mismatch test

### `/role-model-router/packages/usage/package.json`
- Add `test` script (`vitest run`)
- Add dependency on `vitest` if not already present

### `/role-model-router/packages/usage/test/index.test.ts` (new)
- Append/read round-trip test
- Summarization test
- Request-id mismatch test
- Routing-decision mismatch test

### `/role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`
- Add visible stale/degraded refresh indicator
- Emit bounded structured diagnostics on background refresh failure with stale reuse

### `/role-model-router/apps/runtime-ui/app/routes/requests.tsx`
- Add visible stale/degraded refresh indicator
- Emit bounded structured diagnostics on background refresh failure with stale reuse

### `/role-model-router/apps/runtime-ui/app/routes/observe-routing.tsx`
- Add visible stale/degraded refresh indicator
- Emit bounded structured diagnostics on background refresh failure with stale reuse

### `/role-model-router/apps/runtime-ui/e2e/` (selected)
- Add behavior-level coverage for `/app/observe/requests`: filter changes, query-param hydration/restoration, narrowing, inspect/drill-in to request detail

### `/docs/architecture/10-runtime-testing-architecture.md`
- Document `runtime:test-router` command, its tier, and intended use

### `/docs/operations/04-runtime-testing-matrix.md`
- Add matrix entries for `role-model-router/packages/trace/**` and `role-model-router/packages/usage/**`
- Add `runtime:test-router` to the command inventory

## Requirement Mapping

- `R1` | Coverage: direct | Source Quote: "Create a deterministic, repo-owned router-backend regression lane centered on routing correctness and regression safety" | Implementation Surface: `/package.json` new root script `runtime:test-router` composed from package tests and validators | Verification Surface: `runtime:test-router` CI execution, Phase 4 test-summary | QA Surface: Phase 5 rebuilt-runtime QA for affected routes
- `R2` | Coverage: direct | Source Quote: "Strengthen regression protection for routing correctness at the backend level rather than relying mainly on browser flows or a single omnibus test file" | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/test/**` curated router-critical tests, possibly new focused test files | Verification Surface: `runtime:test-router` and package-level `test` | QA Surface: Phase 5 rebuilt-runtime QA
- `R3` | Coverage: direct | Source Quote: "Close the filesystem-backed artifact-layer coverage gap for @role-model-router/trace and @role-model-router/usage" | Implementation Surface: `/role-model-router/packages/trace/package.json`, `/role-model-router/packages/usage/package.json` with new test scripts; new package-local test files colocated under each package tree | Verification Surface: `corepack pnpm --filter @role-model-router/trace test`, `corepack pnpm --filter @role-model-router/usage test` | QA Surface: workspace-level `test` confirms new test participation
- `R4` | Coverage: direct | Source Quote: "Fix or guard the highest-risk telemetry analytics behavior so dashboard and Observe graph surfaces do not silently reuse stale data without operator signal or diagnostic evidence" | Implementation Surface: `/role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`, `/requests.tsx`, `/observe-routing.tsx`, shared route test files | Verification Surface: targeted route-level tests for stale-refresh states | QA Surface: Phase 5 rebuilt-runtime QA with partial failure simulation
- `R5` | Coverage: direct | Source Quote: "Protect the operator-facing request analytics workflow end to end, not just static rendering" | Implementation Surface: `/role-model-router/apps/runtime-ui/e2e/` dedicated or expanded spec | Verification Surface: `runtime:test-browser` Playwright suite | QA Surface: Phase 5 rebuilt-runtime QA with seeded runtime data
- `R6` | Coverage: direct | Source Quote: "Improve router confidence without skipping other critical verification layers, especially operator-facing analytics and dashboard flows" | Implementation Surface: `/package.json` preserving existing scripts, `/docs/architecture/10-runtime-testing-architecture.md` documenting preserved floor, `/docs/operations/04-runtime-testing-matrix.md` reflecting unchanged broad lanes | Verification Surface: all existing `runtime:test-*` and `runtime:validate-*` commands remain intact | QA Surface: Phase 5 rebuilt-runtime QA
- `R7` | Coverage: direct | Source Quote: "Make the strengthened verification approach durable so future contributors run the right checks for router, telemetry, and artifact-layer changes" | Implementation Surface: `/docs/architecture/10-runtime-testing-architecture.md`, `/docs/operations/04-runtime-testing-matrix.md` | Verification Surface: Phase 4 verification that docs match implementation | QA Surface: not applicable (docs change only)

## Implementation Steps

### Step 1 — Workstream C: Trace and usage package tests (TDD)
Write failing tests first (RED), then implement test scripts (GREEN), then verify workspace test participation.

### Step 2 — Workstream B: Router-backend test curation
Identify existing router-critical tests, add new focused tests for gaps (TDD), wire into `runtime:test-router` composition.

### Step 3 — Workstream A: Root command assembly
Add `runtime:test-router` to `/package.json` composing the curated lane from Steps 1-2 plus relevant validators.

### Step 4 — Workstream D: Telemetry stale-refresh hardening
TDD: write failing tests for stale-refresh indicator and diagnostics (RED), implement production changes (GREEN).

### Step 5 — Workstream E: /app/observe/requests behavior-level coverage
TDD: write failing behavior test (RED), verify it passes against current implementation or make minimal route changes (GREEN).

### Step 6 — Workstream F: Documentation updates
Update testing architecture doc and regression matrix to match new command surface and path coverage.

## Testing Strategy

### Unit tests
- New `trace` and `usage` package-local Vitest suites (Step 1)
- Router-critical tests reviewed/curated (Step 2)
- Stale-refresh route-level tests (Step 4)

### Integration tests
- `runtime:test-router` composite lane validates end-to-end router backend behavior
- Existing `runtime:validate-*` commands retain scope

### Browser E2E
- Expanded `/app/observe/requests` Playwright spec (Step 5)
- Existing `runtime:test-browser` suite remains intact

### Verification floor
- `corepack pnpm run schemas:validate`
- `corepack pnpm run runtime:test-router` (new)
- `corepack pnpm --filter @role-model-router/runtime-ui test`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge test`
- `corepack pnpm --filter @role-model-router/trace test` (new)
- `corepack pnpm --filter @role-model-router/usage test` (new)
- Selected `runtime:validate-*` commands for affected surfaces
- `corepack pnpm run runtime:test-browser` for E2E changes
- Rebuilt-runtime QA in Phase 5 for operator-facing UI changes

## Playwright Plan (if applicable)

Workstream E requires expanded Playwright coverage for `/app/observe/requests`:
- New spec or expanded `shared-surface-regression.spec.ts`
- Tests use deterministic seeded runtime data from the rebuilt-runtime QA harness
- Assertions target user-visible behavior: filter changes reflected in query params, request list narrowing, drill-in navigation
- Avoid brittle DOM selectors; prefer role-based and text-based locators per Playwright best practices

## Manual QA Scenarios

1. **Router regression lane**: Run `runtime:test-router` on a clean checkout and verify all tests pass. Confirm command is listed in root scripts and documented.
2. **Stale-refresh indicator**: Start dashboard or Observe route with seeded data. Simulate backend analytics failure during background refresh. Verify a visible stale-data indicator appears and structured diagnostics are logged.
3. **Observe requests workflow**: Open `/app/observe/requests`, change source filter, verify query-param updates. Click a request row to drill into request detail. Change time range and verify narrowing.
4. **Trace/usage test participation**: Run `corepack pnpm test` at the workspace level and confirm trace and usage package tests execute successfully.

## Idempotence and Recovery

- **Idempotence**: `runtime:test-router` is a deterministic test command with no side effects. Running it multiple times produces the same pass/fail result on the same codebase.
- **Recovery**: If `runtime:test-router` fails, the root cause is isolated to a specific router-affecting code change. All other verification lanes (`runtime:test-critical`, `runtime:test-browser`, `runtime:test-validators`) remain independently runnable.
- **TDD safety net**: Each implementation step starts with a failing test. If the test passes before expected, the implementation step is re-evaluated. If a production change breaks existing tests, the change is reverted before proceeding.

## Implementation Sub-phases

### Sub-phase 1: Trace and usage package tests (Step 1)
- RED: Write failing tests for trace and usage
- GREEN: Add test scripts and verify tests pass
- REFACTOR: Ensure deterministic, temp-dir based, offline-safe

### Sub-phase 2: Router-backend curation (Steps 2-3)
- RED: Identify gaps; write failing tests for any new scenarios
- GREEN: Wire curated lane into `runtime:test-router`
- REFACTOR: Ensure lane is stable, focused, and documented

### Sub-phase 3: Telemetry hardening (Step 4)
- RED: Write failing tests for stale-refresh indicator and diagnostics
- GREEN: Implement UI changes and structured diagnostics
- REFACTOR: Ensure no noisy success-path logs

### Sub-phase 4: Observe requests behavior coverage (Step 5)
- RED: Write failing behavior test
- GREEN: Verify against current implementation; adjust if needed
- REFACTOR: Ensure selectors are user-visible and stable

### Sub-phase 5: Documentation (Step 6)
- Update docs to match new command surface and path coverage

## Plan Drift Check

- The plan stays within the approved run scope:
  - no routing-strategy redesign
  - no benchmark-policy redesign
  - no provider-family expansion
  - no packaging-pipeline redesign unless packaging-affecting files become necessary
- The plan preserves the existing broad runtime verification floor instead of replacing it with a router-only path.
- The plan does not assume live-secret or external-network-dependent CI verification.
- The plan keeps `runtime:test-router` as a deterministic wrapper over repo-owned existing and newly added coverage rather than inventing a new external harness.
- No new Phase 2 scope has been introduced beyond the approved requirements.

## Known Unknowns Carried Forward

- exact composition of `runtime:test-router`: resolved during Step 2-3 inspection of existing router test inventory
- final UI shape for stale/degraded refresh indicator: resolved during Step 4 TDD implementation
- whether `/app/observe/requests` behavior coverage is best satisfied by Playwright only or by a layered browser + route-level approach: resolved during Step 5
- exact package-local test location convention for `trace` and `usage`: `test/index.test.ts` colocated with `src/`

## Traceability

Each requirement maps to one or more implementation steps and verification surfaces:

- `R1`: Implemented in Step 3 (root command assembly), verified by `runtime:test-router` execution, documented in Step 6
- `R2`: Implemented in Step 2 (router-backend curation), verified by `runtime:test-router` and host-bridge `test`, QA in Phase 5
- `R3`: Implemented in Step 1 (trace/usage tests), verified by package-level `test` scripts, workspace `test` participation
- `R4`: Implemented in Step 4 (stale-refresh hardening), verified by route-level tests and rebuilt-runtime QA in Phase 5
- `R5`: Implemented in Step 5 (observe requests behavior coverage), verified by `runtime:test-browser` Playwright and Phase 5 QA
- `R6`: Preserved throughout — all existing verification commands remain intact and documented in Step 6
- `R7`: Implemented in Step 6 (docs/matrix updates), verified by Phase 4 alignment check

## Gaps Found

No new gaps were discovered during Phase 2 planning beyond those already identified in the locked Phase 1 AS-IS artifact. All planned workstreams map directly to the five confirmed gaps from `01-as-is.md`:

1. No `runtime:test-router` root command → addressed by Step 3
2. No package-local tests for `trace` and `usage` → addressed by Step 1
3. No visible stale-data indicator on telemetry routes → addressed by Step 4
4. No behavior-level `/app/observe/requests` coverage → addressed by Step 5
5. Testing docs and matrix do not cover router lane or trace/usage paths → addressed by Step 6

None of the gaps listed here are unexpected — the Phase 2 plan was deliberately constructed to close each one.

## Repair Work Performed

This is a Phase 2 planning artifact. No repairs were performed — only requirement-to-implementation mapping and implementation planning. Repairs are deferred to Phase 3 implementation.

## Audit Verdict

Audit: PASS

The Phase 2 plan maps all seven requirements to concrete, ordered implementation steps with explicit file targets, verification surfaces, TDD discipline, and QA expectations. The plan preserves the broad runtime verification floor documented in Phase 1 while adding the canonical router-focused regression lane. No scope creep was introduced.

## Earlier Phase Reconciliation

- `00-requirements.md` requires a router-first regression strategy that preserves the broader runtime verification floor. This plan keeps the router lane additive and does not replace the existing runtime validation baseline.
- `00-worktree.md` established a valid isolated feature-branch worktree and documented that routed delegation is blocked until worktree-local router discovery is refreshed or copied. This Phase 2 plan therefore assumes local planning and local verification composition only.
- `01-as-is.md` confirmed the broad runtime floor already exists, but that router regression, `trace`/`usage` ownership, and `/app/observe/requests` behavior coverage are currently incomplete. The planned workstreams map directly to those confirmed gaps.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/01-as-is.md`
- `/.recursive/run/59-observe-taxonomy-analytics-completion/01-as-is.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/.recursive/memory/domains/role-model-baseline.md`
- `/.recursive/memory/skills/patterns/browser-proof-with-edge-cdp.md`
- `/.recursive/memory/skills/patterns/delegated-verification-and-refresh.md`

## Subagent Contribution Verification

- Reviewed Action Records: none
- Main-Agent Verification Performed:
  - verified no delegated action records were created for this phase
  - planned directly from locked requirements, locked worktree baseline, and the locked AS-IS inventory in the run-63 worktree
  - did not rely on any routed/delegated implementation or audit output
- Acceptance Decision: `not applicable`
- Refresh Handling: `not applicable`
- Repair Performed After Verification: none

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `fdd1c7cb052a109e4f79ada257b54b54ff7ae17e`
- Comparison reference: `working-tree`
- Normalized baseline: `fdd1c7cb052a109e4f79ada257b54b54ff7ae17e`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only fdd1c7cb052a109e4f79ada257b54b54ff7ae17e`
- Diff basis used: `git diff --name-only fdd1c7cb052a109e4f79ada257b54b54ff7ae17e`
- Supplemental scope command: `git status --short --untracked-files=all`
- Base branch: `main`
- Worktree branch: `recursive/63-router-backend-regression-and-telemetry-surface-hardening`
- Planned or claimed changed files:
  - `/.recursive/run/63-router-backend-regression-and-telemetry-surface-hardening/02-to-be-plan.md`
- Actual changed files reviewed:
  - none in tracked product code for this planning phase
- Untracked run-owned files reviewed:
  - `/.recursive/run/63-router-backend-regression-and-telemetry-surface-hardening/00-requirements.md`
  - `/.recursive/run/63-router-backend-regression-and-telemetry-surface-hardening/00-worktree.md`
  - `/.recursive/run/63-router-backend-regression-and-telemetry-surface-hardening/01-as-is.md`
  - `/.recursive/run/63-router-backend-regression-and-telemetry-surface-hardening/02-to-be-plan.md`
- Unexplained drift:
  - none for this phase; the plan is based on the clean product-code baseline plus run-owned recursive artifacts only

## Requirement Completion Status

- `R1` | Status: planned | Implementation Surface: `/package.json` new `runtime:test-router` root script, `/docs/architecture/10-runtime-testing-architecture.md`, `/docs/operations/04-runtime-testing-matrix.md` | Verification Surface: `runtime:test-router` execution, Phase 4 test-summary | QA Surface: Phase 5 rebuilt-runtime QA
- `R2` | Status: planned | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/test/**` curated router-critical tests | Verification Surface: `runtime:test-router`, host-bridge `test` | QA Surface: Phase 5 rebuilt-runtime QA
- `R3` | Status: planned | Implementation Surface: `/role-model-router/packages/trace/package.json`, `/role-model-router/packages/usage/package.json` | Verification Surface: package-level `test`, workspace `test` | QA Surface: workspace test participation
- `R4` | Status: planned | Implementation Surface: `/role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`, `/requests.tsx`, `/observe-routing.tsx`, shared test files | Verification Surface: route-level tests for stale-refresh states | QA Surface: Phase 5 rebuilt-runtime QA
- `R5` | Status: planned | Implementation Surface: `/role-model-router/apps/runtime-ui/e2e/` expanded spec | Verification Surface: `runtime:test-browser` Playwright | QA Surface: Phase 5 rebuilt-runtime QA
- `R6` | Status: planned | Implementation Surface: `/package.json`, `/docs/architecture/10-runtime-testing-architecture.md`, `/docs/operations/04-runtime-testing-matrix.md` | Verification Surface: all existing `runtime:test-*` and `runtime:validate-*` intact | QA Surface: Phase 5 rebuilt-runtime QA
- `R7` | Status: planned | Implementation Surface: `/docs/architecture/10-runtime-testing-architecture.md`, `/docs/operations/04-runtime-testing-matrix.md` | Verification Surface: Phase 4 alignment check | QA Surface: not applicable

## Audit Gate

- [x] Effective upstream artifacts were re-read from disk
- [x] `## Requirement Mapping` covers all in-scope requirements `R1` through `R7`
- [x] `## Plan Drift Check` confirms the plan does not expand beyond approved scope
- [x] `## Requirement Completion Status` records all in-scope requirements `R1` through `R7`
- [x] No implementation work or later-phase verification evidence was falsely claimed in this planning artifact

Audit: PASS

## Coverage Gate

- [x] The plan defines how `runtime:test-router` will be introduced and documented
- [x] The plan defines how router-backend coverage will be curated and strengthened
- [x] The plan defines how `trace` and `usage` package tests will be added
- [x] The plan defines how stale-refresh telemetry behavior will be surfaced and tested
- [x] The plan defines how `/app/observe/requests` behavior-level coverage will be added
- [x] The plan preserves the broader runtime verification floor
- [x] The plan defines the required testing-doc and regression-matrix updates

Coverage: PASS

## Approval Gate

- [x] The plan is specific enough to guide TDD implementation without introducing new scope
- [x] The plan maps directly back to the approved requirements and current AS-IS baseline
- [x] No unresolved planning ambiguity blocks Phase 3 implementation

Approval: PASS
