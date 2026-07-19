Run: `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/`
Phase: `02 TO-BE plan`
Status: `LOCKED`
LockedAt: `2026-06-20T12:05:13Z`
LockHash: `f03445bacdceebd0287ede351e4a64382a0c211d0d762d0e9b851195509e3af3`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/00-requirements.md`
- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/00-worktree.md`
- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/01-as-is.md`
- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/addenda/00-worktree.upstream-gap.00-requirements.addendum-01.md`
- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/addenda/01-as-is.upstream-gap.00-worktree.addendum-01.md`
- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/addenda/01-as-is.upstream-gap.00-worktree.addendum-02.md`
- `/package.json`
- `/.github/workflows/ci.yml`
- `/.github/workflows/build-binaries.yml`
- `/docs/operations/01-router-runtime-hardening-playbook.md`
- `/docs/operations/02-ci-and-release-flow.md`
- `/role-model-router/apps/runtime-host-bridge/package.json`
- `/role-model-router/apps/runtime-host-bridge/scripts/start-for-qa.ts`
- `/role-model-router/apps/runtime-host-bridge/src/validate-host.ts`
- `/role-model-router/apps/runtime-host-bridge/src/validate-ui.ts`
- `/role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
- `/role-model-router/apps/runtime-host-bridge/src/validate-packaging.ts`
- `/role-model-router/apps/runtime-ui/package.json`
- `/role-model-router/apps/runtime-ui/vite.config.ts`
- `/.recursive/run/43-benchmark-routing-display/04-test-summary.md`
- `/.recursive/run/49-runtime-telemetry-analytics-charts/04-test-summary.md`
- `/.recursive/run/49-runtime-telemetry-analytics-charts/05-manual-qa.md`
- `/.recursive/run/50-openai-codex-subscription/02-to-be-plan.md`
- `/.recursive/run/50-openai-codex-subscription/04-test-summary.md`
- `/.recursive/run/50-openai-codex-subscription/05-manual-qa.md`
Outputs:
- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/02-to-be-plan.md`
Scope note: Defines the implementation plan for a durable runtime testing architecture with canonical test tiers, named regression entrypoints, reusable integration and rebuilt-runtime browser harnesses, packaged-runtime verification rules, and immediate regression backfill for the current highest-risk runtime flows.

## TODO

- [x] Resolve Phase 1 known unknowns into explicit Phase 2 decisions
- [x] Map `R1` through `R10` to concrete implementation surfaces and verification paths
- [x] Define the implementation sub-phases, command matrix, and TDD strategy
- [x] Define the browser E2E, packaged-runtime, and CI-tier plan
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Planned Outcome

Run `51` will:

1. Define one repo-owned runtime testing contract that names the unit, integration, validator, browser E2E, rebuilt-runtime, and packaged-runtime tiers.
2. Preserve the existing validator and package-test surface while removing orphaned runtime-host and runtime-ui tests from the default command path.
3. Add named root runtime entrypoints for critical regression, validator coverage, browser E2E, and full runtime regression.
4. Extract a reusable seeded runtime harness from the current validator and QA launcher code so new integration tests stop re-creating setup logic ad hoc.
5. Split `runtime:validate-observability` into a distinct observability-focused validator instead of keeping it as a silent alias of `runtime:validate-host`.
6. Add a canonical Playwright-based rebuilt-runtime browser harness that runs against the real runtime HTTP boundary with stable selectors and failure artifacts.
7. Backfill an initial named critical regression floor for benchmark creation and readback, routing config or alias behavior, telemetry or observe readback, and provider readiness truthfulness.
8. Publish a durable changed-path regression matrix and contributor workflow guide under repo docs, then wire the new runtime regression floor into CI while keeping packaged-runtime verification separate from the default PR-safe path.

All work executes from worktree `D:\DEV\role-model\.worktrees\51` on branch `recursive/51-runtime-testing-architecture-and-regression-matrix`.

## Phase 1 Decisions (resolved)

| Unknown | Decision |
| --- | --- |
| Canonical browser harness | Standardize on `Playwright` as the checked-in browser E2E harness. Reuse the seeded runtime launcher pattern from `start-for-qa.ts`, run Chromium-only by default, capture screenshot plus trace on failure, and keep the existing Edge/CDP manual proof pattern as the fallback for manual QA rather than the primary automated harness. |
| Orphaned runtime-host and runtime-ui tests | Move both package `test` scripts to config-driven discovery so checked-in `*.test.ts` and `*.test.tsx` files are included automatically. If a currently orphaned test needs a heavier harness, rehome it into a named higher-tier entrypoint rather than leaving it unreferenced. |
| `runtime:validate-observability` ambiguity | Create a distinct `validate-observability.ts` entrypoint that reuses shared startup helpers but asserts observability-specific routes and evidence separately from the host smoke path. |
| CI tiering strategy | Keep the default PR-safe floor deterministic and offline-safe, but add a named runtime critical-regression command to `ci.yml`. Keep rebuilt-runtime browser proof and packaged-runtime verification outside the default PR floor, with the changed-path matrix documenting when they become mandatory. |
| Durable docs placement | Put the testing taxonomy under `docs/architecture/10-runtime-testing-architecture.md` and the changed-path matrix plus contributor workflow under `docs/operations/04-runtime-testing-matrix.md`, then cross-link from the existing operations docs. |

## Requirement Mapping

- `R1` | Coverage: `direct` | Implementation Surface: `docs/architecture/10-runtime-testing-architecture.md`, `docs/operations/04-runtime-testing-matrix.md`, `docs/operations/01-router-runtime-hardening-playbook.md` | Verification Surface: docs review plus command-matrix execution in Phase 4 | QA Surface: repo docs under `docs/architecture/` and `docs/operations/`
- `R2` | Coverage: `direct` | Implementation Surface: `docs/operations/04-runtime-testing-matrix.md`, `/package.json`, `/.github/workflows/ci.yml`, `/.github/workflows/build-binaries.yml` | Verification Surface: changed-path table review plus command execution receipts for representative surfaces | QA Surface: contributor workflow readback from docs plus runtime validation receipts
- `R3` | Coverage: `direct` | Implementation Surface: `/package.json`, `role-model-router/apps/runtime-host-bridge/package.json`, `role-model-router/apps/runtime-host-bridge/vitest.config.ts`, `role-model-router/apps/runtime-ui/package.json`, `role-model-router/apps/runtime-ui/vite.config.ts`, `role-model-router/apps/runtime-host-bridge/src/validate-observability.ts` | Verification Surface: package test runs, root runtime command runs, validator receipts | QA Surface: root command matrix used from the repo root without package-memory lookup
- `R4` | Coverage: `direct` | Implementation Surface: `role-model-router/apps/runtime-host-bridge/scripts/start-for-qa.ts`, shared runtime harness helpers under `role-model-router/apps/runtime-host-bridge/test/` or `src/testing/`, `role-model-router/apps/runtime-host-bridge/src/validate-ui.ts`, `role-model-router/apps/runtime-host-bridge/src/validate-packaging.ts` | Verification Surface: harness-focused host tests plus reused validator passes | QA Surface: seeded runtime launcher reused by browser and validator flows
- `R5` | Coverage: `direct` | Implementation Surface: `role-model-router/apps/runtime-ui/package.json`, `role-model-router/apps/runtime-ui/playwright.config.ts`, `role-model-router/apps/runtime-ui/e2e/*.spec.ts`, seeded runtime launcher helpers, stable-selector updates in the runtime UI routes/components they exercise | Verification Surface: Playwright receipts plus rebuilt-runtime browser artifacts | QA Surface: rebuilt runtime at the runtime UI shell and one seeded operator workflow
- `R6` | Coverage: `direct` | Implementation Surface: `/package.json`, `/.github/workflows/build-binaries.yml`, `role-model-router/apps/runtime-host-bridge/src/validate-packaging.ts`, `docs/operations/04-runtime-testing-matrix.md` | Verification Surface: packaged-runtime validation command receipts and build-binaries workflow alignment | QA Surface: packaged runtime launch plus UI/API reachability proof
- `R7` | Coverage: `direct` | Implementation Surface: new or extended host and UI regression tests under `role-model-router/apps/runtime-host-bridge/test/` and `role-model-router/apps/runtime-ui/app/lib/`, plus the named root runtime regression entrypoint | Verification Surface: focused RED/GREEN suites, `runtime:test-critical`, `runtime:validate-ui`, Playwright runtime E2E | QA Surface: rebuilt runtime critical workflow proof
- `R8` | Coverage: `direct` | Implementation Surface: Phase 3 evidence capture, `docs/operations/04-runtime-testing-matrix.md`, and any helper docs referenced by the command matrix | Verification Surface: explicit RED and GREEN receipts in Phase 3 plus documented pragmatic exceptions for script/YAML-only wiring | QA Surface: Phase 3 implementation summary and evidence folders
- `R9` | Coverage: `direct` | Implementation Surface: `docs/operations/04-runtime-testing-matrix.md`, `docs/operations/02-ci-and-release-flow.md`, `/.github/workflows/ci.yml`, `/.github/workflows/build-binaries.yml` | Verification Surface: docs review plus successful execution of the named CI-safe runtime tier | QA Surface: contributor instructions and workflow docs
- `R10` | Coverage: `direct` | Implementation Surface: `/package.json`, both runtime app package manifests, the validator entrypoints, the shared harness extraction, and the new docs/matrix | Verification Surface: existing validator commands remain green after refactor, package tests stay reachable, and the new matrix cites when to use each building block | QA Surface: root runtime command matrix and preserved validator behavior

## Planned Changes by File

- `/package.json`: add named runtime testing entrypoints such as `runtime:test-critical`, `runtime:test-validators`, `runtime:test-browser`, and `runtime:test-full`; keep `runtime:validate-packaging` as the packaging-specific path.
- `/.github/workflows/ci.yml`: run the CI-safe runtime critical-regression tier in addition to the existing broad workspace floor.
- `/.github/workflows/build-binaries.yml`: wire the packaged-runtime verification contract into the packaging workflow or document the exact gated point where it is executed.
- `/docs/architecture/10-runtime-testing-architecture.md`: define the testing taxonomy, tier semantics, runtime-cost expectations, and evidence contract.
- `/docs/operations/04-runtime-testing-matrix.md`: define the changed-path regression matrix, local/PR-safe/heavy verification tiers, and extension rules for new subsystems.
- `/docs/operations/01-router-runtime-hardening-playbook.md`: align the current runtime validation playbook with the new named runtime tiers.
- `/docs/operations/02-ci-and-release-flow.md`: cross-link the runtime-specific testing matrix and document which runtime tiers belong in CI vs rebuilt-runtime or packaged-runtime proof.
- `role-model-router/apps/runtime-host-bridge/package.json`: switch to config-driven test discovery and add any named focused regression scripts needed by root entrypoints.
- `role-model-router/apps/runtime-host-bridge/vitest.config.ts`: own host-bridge include/exclude patterns so new tests are not orphaned.
- `role-model-router/apps/runtime-host-bridge/src/validate-observability.ts`: create a distinct observability validator entrypoint.
- `role-model-router/apps/runtime-host-bridge/src/validate-host.ts`: extract reusable startup/assertion helpers shared with the new observability validator where helpful.
- `role-model-router/apps/runtime-host-bridge/src/validate-ui.ts`: move seeded runtime setup and HTTP-driving logic onto the shared harness.
- `role-model-router/apps/runtime-host-bridge/src/validate-packaging.ts`: reuse the shared harness where possible for packaged-runtime proof.
- `role-model-router/apps/runtime-host-bridge/scripts/start-for-qa.ts`: expose or consume stable seeded-launcher helpers instead of keeping QA-only setup logic private to one script.
- `role-model-router/apps/runtime-host-bridge/test/` and `src/*.test.ts`: add or extend the critical regression and harness tests for benchmark, routing config or alias persistence, telemetry or observe readback, and readiness truthfulness.
- `role-model-router/apps/runtime-ui/package.json`: add a browser E2E script and simplify package test discovery if needed.
- `role-model-router/apps/runtime-ui/vite.config.ts`: add runtime-ui test include patterns so all checked-in runtime-ui tests remain reachable.
- `role-model-router/apps/runtime-ui/playwright.config.ts`: define the canonical rebuilt-runtime browser harness.
- `role-model-router/apps/runtime-ui/e2e/*.spec.ts`: implement the seeded rebuilt-runtime runtime shell and operator-flow browser tests.
- `role-model-router/apps/runtime-ui/app/routes/*.tsx` and related components used by the browser harness: add stable selectors or stronger accessibility labels for the critical paths under test.

## Implementation Steps

1. Create RED coverage or explicit pragmatic-exception receipts for the next smallest testing-architecture slice before changing production code.
2. Add config-driven package-test discovery and the root command matrix so all existing runtime-host and runtime-ui tests are reachable through canonical entrypoints.
3. Extract the shared seeded runtime harness from `start-for-qa.ts` and `validate-ui.ts`, then reuse it in validators and new integration tests.
4. Add the named critical regression floor for benchmark, routing config or alias, telemetry or observe, and readiness truthfulness.
5. Add the Playwright rebuilt-runtime browser harness, stable selectors, and failure-artifact capture.
6. Publish the architecture and operations docs, then align CI and packaged-runtime workflow guidance with the new commands.
7. Close with Phase 4 command receipts and Phase 5 rebuilt-runtime or packaged-runtime QA evidence using the new matrix.

## Testing Strategy

- Phase 3 will use `TDD Mode: pragmatic`.
- Strict RED and GREEN evidence is mandatory for executable code, shared harness logic, validators, Playwright specs, and regression tests.
- `package.json`, workflow YAML, and pure-doc wiring changes may use pragmatic exceptions when no meaningful failing unit test exists, but each exception must record:
  - why the surface is configuration-only,
  - which executable command proves the wiring,
  - which broader validator or lint command covers the change.
- Prefer focused host/UI suites during iteration, then rerun the named root runtime tiers before leaving Phase 3 and again in Phase 4.
- Keep browser E2E and packaged-runtime proof as complements to, not substitutes for, RED/GREEN test evidence.

## Playwright Plan (if applicable)

- Add `@playwright/test` to `role-model-router/apps/runtime-ui` so the browser harness stays close to the operator surface it exercises.
- Create `role-model-router/apps/runtime-ui/playwright.config.ts` with:
  - Chromium-only default,
  - trace on first retry,
  - screenshot on failure,
  - retained video only when failures occur,
  - a launch command that points at the seeded rebuilt runtime rather than a frontend-only dev server.
- Reuse the seeded runtime launcher from `start-for-qa.ts` through a thin wrapper so Playwright can:
  - build the runtime UI,
  - start a real runtime bridge with deterministic fixture data,
  - wait for bootstrap readiness,
  - shut down cleanly.
- The first browser E2E scope will prove:
  1. runtime shell boot on the rebuilt runtime,
  2. Providers or readiness surface truthfulness against seeded runtime state,
  3. one cross-route operator flow that reads real runtime HTTP data rather than mocked frontend-only state.

## Manual QA Scenarios

1. Run the new root runtime critical-regression command from `D:\DEV\role-model\.worktrees\51`.
2. Launch the rebuilt runtime via the seeded QA harness and verify the runtime UI shell loads without a frontend-only dev proxy.
3. Verify the provider/readiness workflow shows truthful seeded status and stable selectors remain visible in the rendered UI.
4. Verify one benchmark, routing, or telemetry surface used by the browser harness also works through manual route inspection.
5. When packaging-affecting files change, run the packaged-runtime verification path and confirm runtime launch, UI reachability, and the key seeded operator surface.

## Traceability

- `R1` -> `## Planned Outcome`, `## Requirement Mapping`, and `SP51-E`
- `R2` -> `## Phase 1 Decisions`, `## Planned Changes by File`, `## Requirement Mapping`, and `SP51-E`
- `R3` -> `SP51-A`, `/package.json`, runtime app package manifests/configs, and the distinct observability validator plan
- `R4` -> `SP51-B`, shared seeded runtime harness extraction, and validator reuse
- `R5` -> `## Playwright Plan (if applicable)` and `SP51-D`
- `R6` -> `SP51-B`, `SP51-E`, `runtime:validate-packaging`, and the packaged-runtime workflow plan
- `R7` -> `SP51-C`, `SP51-D`, and the named runtime critical-regression command
- `R8` -> `## Testing Strategy`, `SP51-C`, and the Phase 3 pragmatic TDD plan
- `R9` -> `SP51-E`, `docs/operations/02-ci-and-release-flow.md`, and the CI-tiering changes
- `R10` -> `SP51-A`, `SP51-B`, `SP51-C`, and the preserved validator/package-test command matrix

## Idempotence and Recovery

- The shared seeded runtime harness must create isolated temporary runtime-state roots and clean them up on success or failure.
- The root runtime commands must remain deterministic when run repeatedly from a fresh worktree.
- Playwright failure artifacts must be written to a predictable location so Phase 4 and Phase 5 can cite them directly.
- Packaged-runtime verification must use mock or fixture-backed upstreams only, so retries do not depend on live credentials or open internet access.
- If a currently orphaned test proves too slow or integration-heavy for package default discovery, it must be moved into a named higher tier rather than silently dropped.

## Implementation Sub-phases

### `SP51-A` Command matrix and test discovery foundation (`R3`, `R10`)

Goal:
Make existing runtime-host and runtime-ui tests discoverable by default and expose a contributor-facing root command matrix without losing the current validator investment.

RED-first work:
- Add or update lightweight test/config coverage where possible for include patterns and named command wiring.
- Record a pragmatic-exception receipt for pure script/YAML/doc wiring that has no meaningful failing unit test surface.

Production changes:
- add `role-model-router/apps/runtime-host-bridge/vitest.config.ts`
- extend `role-model-router/apps/runtime-ui/vite.config.ts` with explicit `test.include` ownership
- simplify both runtime app `test` scripts to config-driven discovery
- add named root runtime command entrypoints in `/package.json`
- add `role-model-router/apps/runtime-host-bridge/src/validate-observability.ts` and repoint `runtime:validate-observability`

Exit criteria:
- checked-in runtime-host and runtime-ui tests are no longer orphaned from the default package command path
- a contributor can discover the runtime testing tiers from root scripts instead of memorizing package-local commands
- `runtime:validate-observability` is no longer a silent alias

### `SP51-B` Shared seeded runtime integration harness (`R4`, `R6`, `R10`)

Goal:
Turn the current validator and QA launcher logic into a reusable seeded runtime harness for future integration tests, validators, and packaged verification.

RED-first work:
- add or extend host-bridge tests that prove the shared harness can start isolated runtime state, seed deterministic config and provider data, drive HTTP surfaces, and tear down cleanly

Production changes:
- extract reusable seeded-launch helpers from `scripts/start-for-qa.ts`
- extract reusable runtime start/assertion helpers from `src/validate-ui.ts`
- reuse the shared harness from `validate-ui.ts` and `validate-packaging.ts`
- add small fixture helpers for seeded benchmark, routing, telemetry, and readiness scenarios where the current tests need them

Exit criteria:
- new integration tests and validators can consume one seeded runtime harness rather than re-building startup logic
- the packaged-runtime verification path reuses the same deterministic setup rules where possible

### `SP51-C` Initial critical runtime regression floor (`R7`, `R8`, `R10`)

Goal:
Backfill a named critical regression floor that immediately protects the highest-risk runtime workflows.

RED-first work:
- extend or add host-bridge tests for:
  - benchmark run creation and immediate readback
  - routing config or alias persistence/readback
  - telemetry or observe query/readback
  - provider readiness truthfulness
- extend or add runtime-ui tests for:
  - readiness and provider view-model truthfulness
  - telemetry surface readback or rendering contracts that match the seeded backend expectations

Production changes:
- implement any missing shared helpers or small product/test seams needed to make those flows deterministic
- add the named `runtime:test-critical` root entrypoint
- keep the critical floor attributable by listing the exact focused suites and validators it runs

Exit criteria:
- one named runtime critical-regression command exists and is green
- the command proves the required benchmark, routing, telemetry, and readiness slices
- the new floor cites RED and GREEN evidence in Phase 3

### `SP51-D` Rebuilt-runtime browser E2E harness (`R5`, `R7`)

Goal:
Automate one real runtime browser path against the rebuilt runtime using stable selectors and failure artifacts.

RED-first work:
- add a failing Playwright spec for runtime shell boot plus one seeded operator workflow over real runtime HTTP data
- add failing selector/accessibility assertions where stable hooks are missing today

Production changes:
- add Playwright config and runtime E2E specs under `role-model-router/apps/runtime-ui/`
- add the seeded runtime launcher wrapper needed by Playwright
- add stable selectors or stronger accessibility hooks in the exercised runtime UI surfaces
- add the root `runtime:test-browser` entrypoint

Exit criteria:
- browser automation runs against the rebuilt runtime instead of a frontend-only preview
- failure artifacts are captured automatically
- one real operator workflow crosses the runtime HTTP boundary and becomes regression-protected

### `SP51-E` Docs, regression matrix, CI tiering, and packaged-runtime contract (`R1`, `R2`, `R6`, `R9`, `R10`)

Goal:
Publish the durable testing contract and align CI/workflow behavior with it without widening the run into unrelated product work.

RED-first work:
- no direct unit-test surface is expected for the pure-doc portions; use pragmatic exceptions with compensating command evidence
- for workflow/script wiring, prove the new command paths by executing the affected runtime tiers in Phase 4

Production changes:
- add `docs/architecture/10-runtime-testing-architecture.md`
- add `docs/operations/04-runtime-testing-matrix.md`
- update `docs/operations/01-router-runtime-hardening-playbook.md`
- update `docs/operations/02-ci-and-release-flow.md`
- update `/.github/workflows/ci.yml` to run the CI-safe runtime regression floor
- update `/.github/workflows/build-binaries.yml` or the packaged-runtime command contract so the packaging path is explicit and reusable

Exit criteria:
- future runs can determine their minimum validation floor from repo docs plus root commands
- CI-safe runtime regression is explicit
- rebuilt-runtime and packaged-runtime obligations are documented separately from the default PR-safe tier

## Audit Context

- Audit Execution Mode: self-audit
- Subagent Availability: available
- Subagent Capability Probe: `worker` subagent available via Task tool in this session.
- Delegation Decision Basis: Phase 2 could benefit from delegated plan review, but the most recent delegated audit attempt in this resumed session timed out after 900 seconds, so controller self-audit was used to keep the plan deterministic.
- Delegation Override Reason: prior worker review timed out; the controller completed the planning audit directly after re-reading the effective inputs and current repo surfaces.
- Audit Inputs Provided: `00-requirements.md`, `00-worktree.md`, `01-as-is.md`, the effective addenda, the current command/workflow/docs surfaces, and the Phase 0 diff basis recorded in `00-worktree.md`.

## Effective Inputs Re-read

- Re-read `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/00-requirements.md`.
- Re-read `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/00-worktree.md`.
- Re-read `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/01-as-is.md`.
- Re-read `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/addenda/00-worktree.upstream-gap.00-requirements.addendum-01.md`.
- Re-read `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/addenda/01-as-is.upstream-gap.00-worktree.addendum-01.md`.
- Re-read `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/addenda/01-as-is.upstream-gap.00-worktree.addendum-02.md`.
- Re-read `/package.json`, `/.github/workflows/ci.yml`, `/.github/workflows/build-binaries.yml`, and the current runtime validation docs/scripts listed in Inputs.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/43-benchmark-routing-display/04-test-summary.md`
- `/.recursive/run/49-runtime-telemetry-analytics-charts/04-test-summary.md`
- `/.recursive/run/49-runtime-telemetry-analytics-charts/05-manual-qa.md`
- `/.recursive/run/50-openai-codex-subscription/02-to-be-plan.md`
- `/.recursive/run/50-openai-codex-subscription/04-test-summary.md`
- `/.recursive/run/50-openai-codex-subscription/05-manual-qa.md`

## Earlier Phase Reconciliation

- `00-requirements.md`: this plan preserves the fixed requirement that the run ship executable commands, reusable harnesses, regression backfill, durable docs, rebuilt-runtime proof, and packaged-runtime rules instead of docs-only guidance.
- `01-as-is.md`: the plan directly resolves the observed gaps around implicit taxonomy, missing changed-path matrix, orphaned package tests, missing checked-in browser harness, packaged-runtime CI separation, and validator discoverability.
- `00-worktree` and `01-as-is` addenda: the README hero, acknowledgements, screenshot, and in-repo worktree corrections remain preserved upstream inputs, but they do not widen the implementation scope of this testing-architecture plan beyond noting their continued existence.

## Subagent Contribution Verification

- Reviewed Action Records:
  - `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/subagents/run51-phase1-test-inventory.md`
- Main-Agent Verification Performed:
  - re-read the locked requirements and AS-IS inventory
  - re-checked the current root/package scripts, workflow files, and existing runtime validation docs
  - confirmed that the Phase 2 decisions directly answer the Phase 1 known unknowns
  - confirmed that each of `R1` through `R10` maps to concrete file surfaces plus executable verification
- Acceptance Decision: self-audit accepted after controller verification
- Refresh Handling: not applicable
- Repair Performed After Verification:
  - resolved the browser-harness, test-discovery, observability-validator, CI-tiering, and docs-placement decisions into concrete Phase 3 sub-phases

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `fa4dca31b4df9b788987652e1646e85ceeab82d0`
- Comparison reference: `working-tree`
- Normalized baseline: `fa4dca31b4df9b788987652e1646e85ceeab82d0`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only fa4dca31b4df9b788987652e1646e85ceeab82d0`
- Expected planning-owned changed path: `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/02-to-be-plan.md`

## Gaps Found

- none; Phase 1 unknowns have been resolved into explicit implementation choices and bounded sub-phases

## Repair Work Performed

- translated the Phase 1 inventory into a concrete file touch set, command matrix strategy, browser-harness choice, validator-harness extraction plan, and CI/docs rollout plan

## Requirement Completion Status

- `R1 | Status: planned | Changed Files: docs/architecture/10-runtime-testing-architecture.md, docs/operations/04-runtime-testing-matrix.md, docs/operations/01-router-runtime-hardening-playbook.md | Verification Evidence: Phase 4 command-matrix receipts plus doc review | Scope Decision: testing taxonomy will be repo-owned and contributor-facing. | Audit Note: the previously implicit testing pyramid is concretely planned as durable docs.`
- `R2 | Status: planned | Changed Files: docs/operations/04-runtime-testing-matrix.md, package.json, .github/workflows/ci.yml, .github/workflows/build-binaries.yml | Verification Evidence: Phase 4 runtime tier execution plus docs review | Scope Decision: the changed-path regression matrix will live in repo docs and reference named root commands. | Audit Note: future runs will no longer need ad hoc validation-floor invention.`
- `R3 | Status: planned | Changed Files: package.json, role-model-router/apps/runtime-host-bridge/package.json, role-model-router/apps/runtime-host-bridge/vitest.config.ts, role-model-router/apps/runtime-ui/package.json, role-model-router/apps/runtime-ui/vite.config.ts, role-model-router/apps/runtime-host-bridge/src/validate-observability.ts | Verification Evidence: package test receipts plus named root runtime command receipts | Scope Decision: existing commands are preserved and reorganized rather than replaced. | Audit Note: orphaned package tests and the validator alias ambiguity are directly addressed.`
- `R4 | Status: planned | Changed Files: role-model-router/apps/runtime-host-bridge/scripts/start-for-qa.ts, shared harness helpers, role-model-router/apps/runtime-host-bridge/src/validate-ui.ts, role-model-router/apps/runtime-host-bridge/src/validate-packaging.ts | Verification Evidence: harness-focused host tests and reused validator passes | Scope Decision: one shared seeded harness becomes the future integration-test baseline. | Audit Note: the current strong but fragmented harness pieces are concretely consolidated.`
- `R5 | Status: planned | Changed Files: role-model-router/apps/runtime-ui/playwright.config.ts, role-model-router/apps/runtime-ui/e2e/*.spec.ts, seeded launcher wrapper, exercised runtime UI route/component selectors | Verification Evidence: Playwright receipts with screenshots/traces on failure | Scope Decision: checked-in Playwright becomes the canonical browser E2E path. | Audit Note: rebuilt-runtime browser proof becomes executable, not only run-receipt practice.`
- `R6 | Status: planned | Changed Files: package.json, .github/workflows/build-binaries.yml, role-model-router/apps/runtime-host-bridge/src/validate-packaging.ts, docs/operations/04-runtime-testing-matrix.md | Verification Evidence: packaged-runtime command receipts and workflow alignment | Scope Decision: packaged-runtime verification remains separate from the default PR-safe floor. | Audit Note: existing packaging validation is preserved and made more discoverable.`
- `R7 | Status: planned | Changed Files: focused host and UI regression tests, package/test scripts, browser E2E specs | Verification Evidence: RED/GREEN receipts for benchmark, routing, telemetry, readiness, plus browser E2E receipts | Scope Decision: the first named critical regression floor protects the currently highest-risk runtime flows. | Audit Note: the run moves from scattered coverage to one explicit runtime regression floor.`
- `R8 | Status: planned | Changed Files: Phase 3 evidence folders, docs/operations/04-runtime-testing-matrix.md, any supporting testing-contract docs | Verification Evidence: explicit RED and GREEN command receipts plus pragmatic-exception notes for config-only changes | Scope Decision: Phase 3 will use pragmatic TDD with strict code-path RED/GREEN proof. | Audit Note: testing-infrastructure changes will follow the same evidence discipline as product changes.`
- `R9 | Status: planned | Changed Files: docs/operations/04-runtime-testing-matrix.md, docs/operations/02-ci-and-release-flow.md, .github/workflows/ci.yml, .github/workflows/build-binaries.yml | Verification Evidence: CI-safe runtime tier execution and docs review | Scope Decision: local, PR-safe, rebuilt-runtime, and packaged-runtime tiers will be explicitly separated. | Audit Note: workflow ownership becomes runtime-specific instead of only repo-wide.`
- `R10 | Status: planned | Changed Files: package.json, both runtime app manifests/configs, validator entrypoints, shared harness helpers, runtime testing docs | Verification Evidence: existing validators remain green and newly discoverable through the matrix | Scope Decision: preserve and reorganize the current testing investment rather than rewriting it away. | Audit Note: the final architecture makes the relationship between tests, validators, browser E2E, and manual proof understandable from one place.`

## Audit Verdict

Audit: PASS

## Coverage Gate

Coverage: PASS

- `SP51-A` maps `R3` and `R10`
- `SP51-B` maps `R4`, `R6`, and `R10`
- `SP51-C` maps `R7`, `R8`, and `R10`
- `SP51-D` maps `R5` and `R7`
- `SP51-E` maps `R1`, `R2`, `R6`, `R9`, and `R10`
- every requirement from `R1` through `R10` has a concrete file surface, executable verification path, and implementation sub-phase
- out-of-scope README guidance remains preserved as input without widening the testing-architecture implementation scope

## Approval Gate

Approval: PASS

- the plan is implementation-ready and tied to the repo's current runtime seams
- the command-matrix, harness, browser, CI, and docs changes are all concrete enough to drive Phase 3
- the TDD and pragmatic-exception strategy is explicit rather than implied
- rebuilt-runtime and packaged-runtime obligations remain separated from the default PR-safe floor
