Run: `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/`
Phase: `01 AS-IS`
Status: `LOCKED`
LockedAt: `2026-06-20T12:00:40Z`
LockHash: `b202a786d9937b10cb0927acae39c632b16a5f2669e551c4374c3e8fe3e2b902`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/00-requirements.md`
- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/00-worktree.md`
- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/addenda/00-worktree.upstream-gap.00-requirements.addendum-01.md`
- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/addenda/01-as-is.upstream-gap.00-worktree.addendum-01.md`
- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/addenda/01-as-is.upstream-gap.00-worktree.addendum-02.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/skills/SKILLS.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/.recursive/memory/episodes/run-43-benchmark-routing-display.md`
- `/.recursive/memory/skills/patterns/browser-proof-with-edge-cdp.md`
- `/package.json`
- `/.github/workflows/ci.yml`
- `/.github/workflows/build-binaries.yml`
- `/docs/operations/02-ci-and-release-flow.md`
- `/role-model-router/apps/runtime-host-bridge/package.json`
- `/role-model-router/apps/runtime-host-bridge/src/validate-host.ts`
- `/role-model-router/apps/runtime-host-bridge/src/validate-ui.ts`
- `/role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
- `/role-model-router/apps/runtime-host-bridge/src/validate-packaging.ts`
- `/role-model-router/apps/runtime-host-bridge/scripts/start-for-qa.ts`
- `/role-model-router/apps/runtime-ui/package.json`
- Diff basis: `git diff --name-only fa4dca31b4df9b788987652e1646e85ceeab82d0`
- Changed files reviewed:
  - `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/01-as-is.md`
  - `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/addenda/01-as-is.upstream-gap.00-worktree.addendum-01.md`
  - `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/addenda/01-as-is.upstream-gap.00-worktree.addendum-02.md`
  - `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/subagents/run51-phase1-test-inventory.md`
- `/.recursive/run/43-benchmark-routing-display/04-test-summary.md`
- `/.recursive/run/49-runtime-telemetry-analytics-charts/04-test-summary.md`
- `/.recursive/run/49-runtime-telemetry-analytics-charts/05-manual-qa.md`
- `/.recursive/run/50-openai-codex-subscription/04-test-summary.md`
- `/.recursive/run/50-openai-codex-subscription/05-manual-qa.md`
Outputs:
- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/01-as-is.md`
Scope note: This artifact records the current repository-owned testing baseline for runtime-host, runtime-ui, validators, CI, packaging, and browser proof before run 51 introduces a canonical testing architecture and regression matrix.

## TODO

- [x] Re-read the locked Phase 0 artifacts and the effective addendum inputs
- [x] Inventory the current root command surface and CI tiers
- [x] Inventory the current runtime-host, runtime-ui, validator, and packaging test layers
- [x] Inventory the current browser-proof and rebuilt-runtime QA patterns
- [x] Map the observed baseline back to `R1` through `R10`
- [x] Prepare the repo for Phase 2 planning

## Source Requirement Inventory

| Requirement | Source of current-state analysis |
| --- | --- |
| `R1` | `/package.json`, `/.github/workflows/ci.yml`, `/docs/operations/02-ci-and-release-flow.md`, `/.recursive/STATE.md`, and prior Phase 4 or 5 receipts in runs `43`, `49`, and `50` |
| `R2` | `/package.json`, `/.github/workflows/ci.yml`, `/.github/workflows/build-binaries.yml`, `/.recursive/STATE.md`, and prior rebuilt-runtime/browser receipts in runs `43`, `49`, and `50` |
| `R3` | `/package.json`, `role-model-router/apps/runtime-host-bridge/package.json`, `role-model-router/apps/runtime-ui/package.json`, and the checked-in host/UI test file inventory |
| `R4` | `role-model-router/apps/runtime-host-bridge/src/validate-ui.ts`, `src/validate-host.ts`, `src/validate-vendors.ts`, `src/validate-packaging.ts`, and `scripts/start-for-qa.ts` |
| `R5` | `scripts/start-for-qa.ts`, `/.recursive/memory/skills/patterns/browser-proof-with-edge-cdp.md`, and runs `49` and `50` Phase 5 receipts |
| `R6` | `/.github/workflows/build-binaries.yml`, `/package.json`, and `role-model-router/apps/runtime-host-bridge/src/validate-packaging.ts` |
| `R7` | `role-model-router/apps/runtime-host-bridge/test/*.test.ts`, `role-model-router/apps/runtime-host-bridge/src/*.test.ts`, `role-model-router/apps/runtime-ui/app/lib/*.test.ts`, `role-model-router/apps/runtime-ui/app/components/*.test.tsx`, and `/.recursive/STATE.md` |
| `R8` | runs `49` and `50` Phase 4/5 receipts plus the current lack of repo-owned contributor guidance for that discipline |
| `R9` | `/.github/workflows/ci.yml`, `/.github/workflows/build-binaries.yml`, and `/docs/operations/02-ci-and-release-flow.md` |
| `R10` | `/package.json`, package-local `test` scripts, current validator entrypoints, and `/.recursive/STATE.md` |

- `R1` through `R10` were re-read from `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/00-requirements.md`.

## Reproduction Steps (Novice-Runnable)

1. Open the isolated worktree at `D:\DEV\role-model\.worktrees\51`.
2. Read `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/00-requirements.md` and `00-worktree.md`.
3. Inspect the current repo-wide command surface:
   - `/package.json`
   - `/.github/workflows/ci.yml`
   - `/.github/workflows/build-binaries.yml`
   - `/docs/operations/02-ci-and-release-flow.md`
4. Inspect the current runtime validator and QA harness sources:
   - `/role-model-router/apps/runtime-host-bridge/src/validate-host.ts`
   - `/role-model-router/apps/runtime-host-bridge/src/validate-ui.ts`
   - `/role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
   - `/role-model-router/apps/runtime-host-bridge/src/validate-packaging.ts`
   - `/role-model-router/apps/runtime-host-bridge/scripts/start-for-qa.ts`
5. Compare the package-local test scripts to the checked-in test files:
   - `/role-model-router/apps/runtime-host-bridge/package.json`
   - `/role-model-router/apps/runtime-ui/package.json`
   - the checked-in `*.test.ts` and `*.test.tsx` files under those app folders
6. Inspect the prior rebuilt-runtime and browser-proof receipts:
   - `/.recursive/run/43-benchmark-routing-display/04-test-summary.md`
   - `/.recursive/run/49-runtime-telemetry-analytics-charts/04-test-summary.md`
   - `/.recursive/run/49-runtime-telemetry-analytics-charts/05-manual-qa.md`
   - `/.recursive/run/50-openai-codex-subscription/04-test-summary.md`
   - `/.recursive/run/50-openai-codex-subscription/05-manual-qa.md`
7. Confirm the current focused baseline recorded in Phase 0:
   - `corepack pnpm --filter @role-model-router/runtime-ui test`
   - `corepack pnpm run runtime:validate-ui`

## Executive Readback

The repository already has meaningful testing building blocks. It has package-level Vitest coverage across runtime-host, runtime-ui, routing, catalog, SQLite memory, and observability. It also has repo-owned live validators for host, UI, vendors, tools, operations, routing, adapters, state, and packaged runtime behavior. Recursive receipts from runs `43`, `49`, and `50` further show strong rebuilt-runtime and browser-proof discipline.

The gap is organization, not total absence. There is no single repo-owned testing taxonomy, no changed-path regression matrix, no canonical browser E2E suite checked into the repo, and no contributor-facing contract that explains which commands are required for which surfaces. Current CI also omits meaningful runtime validators, and some already-checked-in tests are not included in the default package `test` scripts.

## `R1` Canonical repository testing taxonomy

Current state:
- The root repo exposes a broad validation surface through `/package.json`, but the taxonomy is implicit.
- `ci.yml` defines the fast merge gate as:
  1. install
  2. `pnpm run lint`
  3. `pnpm run schemas:validate`
  4. `pnpm run build`
  5. `pnpm run test`
  6. `pnpm run test:rust`
  7. `pnpm run smoke`
- `docs/operations/02-ci-and-release-flow.md` documents the workflows, but it does not define a runtime-specific testing pyramid or ownership model.
- `/.recursive/STATE.md` records the validator surface and previous runtime validation chains, but that durable truth is control-plane state, not contributor-facing testing architecture.

Impact:
- The repository has layers in practice, but no single testing taxonomy currently describes unit, integration, validator, browser, packaged-runtime, and manual rebuilt-runtime verification as one stable contract.

## `R2` Path-aware regression matrix for future runs

Current state:
- No repo-owned changed-path regression matrix exists today.
- Validation expectations are spread across:
  - root scripts in `/package.json`
  - GitHub workflows
  - prior recursive run receipts
  - durable state notes in `/.recursive/STATE.md`
- Rebuilt-runtime and browser verification expectations are visible in runs `49` and `50`, but they are encoded as run-specific receipts instead of a stable lookup table future runs can reuse.

Impact:
- Future runs still need ad hoc judgment to decide whether a change requires package tests, runtime validators, rebuilt-runtime verification, or packaged-runtime verification.

## `R3` Canonical test command entrypoints

Current state:
- Root command entrypoints already exist for lint, schemas, build, workspace tests, rust tests, smoke, packaging, and a wide set of runtime validators.
- Runtime-host and runtime-ui each expose package-local `test` scripts.
- The current host and UI package `test` scripts do not include every checked-in test file.

Concrete observed omissions from the default package script paths:
- runtime-host tests present on disk but omitted from `role-model-router/apps/runtime-host-bridge/package.json`:
  - `test/runtime-routing-model.test.ts`
  - `test/provider-overlap-metadata.test.ts`
  - `test/openai-codex-subscription-matrix.test.ts`
  - `test/litellm-catalog.test.ts`
  - `test/credential-ref-env.test.ts`
  - `test/catalog-economics-providers.test.ts`
  - `test/craft-ask-difficulty.test.ts`
- runtime-ui tests present on disk but omitted from `role-model-router/apps/runtime-ui/package.json`:
  - `app/lib/build-sync.test.ts`
  - `app/lib/llama-swap-setup.test.ts`
  - `app/lib/format-score.test.ts`
  - `app/lib/theme.test.ts`
  - `app/lib/telemetry-chart-config.test.ts`

Additional command-surface ambiguity:
- `runtime:validate-observability` currently points to the same implementation as `runtime:validate-host`, so the repo does not yet expose a clearly distinct observability validator entrypoint.

Impact:
- The repo has many useful commands, but the contributor-facing command matrix is incomplete and some existing coverage is effectively orphaned from the default package test path.

## `R4` Reusable integration harnesses for runtime surfaces

Current state:
- The repo already contains strong reusable harness pieces:
  - `src/validate-ui.ts` starts a real bridge backend, drives config/account/endpoint mutations, and proves routed telemetry readback.
  - `src/validate-host.ts` spawns the vendored host, exercises `/v1/models` and `/v1/chat/completions`, and checks structured request/profile/OTEL surfaces.
  - `src/validate-vendors.ts` contains reusable local/remote/hybrid vendor validation planning and mock vendor scripts.
  - `src/validate-packaging.ts` builds and launches the SEA package against a mock OpenAI-compatible upstream.
  - `scripts/start-for-qa.ts` boots a seeded QA bridge with fixture-backed runtime state and operator routes.
- Host test fixtures and restart fixtures already exist under `role-model-router/apps/runtime-host-bridge/test/fixtures/**`.

Impact:
- Reusable harnesses exist, but they are scattered across validator scripts, test helpers, and recursive evidence. There is not yet one contributor-facing integration harness layer that future runs can extend consistently.

## `R5` Canonical browser E2E harness on rebuilt runtime

Current state:
- The repo has a documented browser-proof pattern in `/.recursive/memory/skills/patterns/browser-proof-with-edge-cdp.md`.
- Runs `49` and `50` used rebuilt-runtime browser verification, route sweeps, snapshots, and screenshots as real acceptance evidence.
- `scripts/start-for-qa.ts` provides a strong seeded launcher for browser-oriented proof.
- No repo-owned Playwright or Cypress configuration is currently checked in.
- Run `49` explicitly notes that local Playwright CLI was unavailable in the workspace and browser proof remained operator-facing.

Impact:
- Browser proof is real and practiced, but it is not yet a canonical checked-in automated E2E suite.

## `R6` Packaged-runtime verification contract

Current state:
- Root scripts expose:
  - `runtime:package-sea`
  - `runtime:validate-packaging`
- `build-binaries.yml` builds UI assets, packages the SEA runtime, verifies packaged files, and scans for forbidden QA fixtures/markers.
- `validate-packaging.ts` launches a packaged runtime against a mock upstream and exercises packaged runtime APIs.
- `build-binaries.yml` does not currently run `runtime:validate-packaging`.

Impact:
- The repo already has a meaningful packaged-runtime validation implementation, but that deeper packaged execution proof is not part of the default CI workflow.

## `R7` Initial critical regression suite for current runtime risks

Current state:
- Existing automated coverage already touches several high-risk runtime workflows:
  - benchmark creation/readback and benchmark artifacts
  - routing config and alias behavior
  - provider/account readiness and restart rehydration
  - request observations, telemetry, and vendor validation
  - packaged executable checks
- The current runtime-ui package suite covers API contracts, view models, telemetry analytics, chart rendering, design-system behavior, and device-authorization components.
- The Phase 0 baseline confirmed both `runtime-ui` package tests and `runtime:validate-ui` are green in the isolated worktree.

Gap:
- These high-risk slices are not assembled into one named critical-path regression suite.
- The repo still lacks an automated rebuilt-runtime browser flow that crosses the real runtime HTTP boundary.

## `R8` TDD and evidence discipline for testing-infrastructure changes

Current state:
- The repo’s recursive receipts, especially runs `49` and `50`, show strong RED/GREEN evidence discipline and explicit rebuilt-runtime/browser verification.
- That discipline is recorded in recursive artifacts rather than in a repo-owned testing-architecture guide contributors can cite directly.
- There is no current stable doc that tells future contributors how to apply strict TDD to test-infrastructure changes themselves.

Impact:
- The project already behaves as if TDD and evidence matter for risky runtime work, but the durable contributor-facing contract is still missing.

## `R9` CI tiering and contributor workflow guidance

Current state:
- `docs/operations/02-ci-and-release-flow.md` explains workflow ownership and canonical local verification.
- The current docs recommend:
  - `corepack pnpm install`
  - `corepack pnpm run ci:check`
  - `corepack pnpm run docs:build`
  - `corepack pnpm run runtime:package-sea`
- CI is currently tiered only at a coarse workflow level:
  - `ci.yml` for fast merge gate
  - `build-binaries.yml` for packaging and releases
- The docs do not map changed runtime surfaces to the specific validator/browser/packaged-runtime floors they require.

Impact:
- There is workflow documentation, but not a runtime-specific local-vs-PR-vs-rebuilt-vs-packaged testing matrix.

## `R10` Preserve existing validator and package-test investment

Current state:
- Existing validators are valuable and already used by the project:
  - `runtime:validate-host`
  - `runtime:validate-ui`
  - `runtime:validate-vendors`
  - `runtime:validate-operations`
  - `runtime:validate-tools`
  - `runtime:validate-routing`
  - `runtime:validate-state`
  - `runtime:validate-adapter`
  - `runtime:validate-packaging`
- Existing package tests across runtime-host, runtime-ui, routing, persistence, observability, providers, and catalog are also meaningful and should be preserved.
- The current problem is not lack of testing assets. It is discoverability, tiering, and command-path completeness.

Impact:
- Run 51 should build on the current validator and package-test investment, not replace it.

## Current Behavior by Requirement

- `R1`: partially satisfied by practice, blocked as a repo-owned taxonomy. The layers exist, but the taxonomy is implicit and fragmented.
- `R2`: blocked. No stable changed-path regression matrix exists today.
- `R3`: partially satisfied. Canonical command entrypoints exist, but some checked-in tests are omitted from default package scripts and one validator alias is ambiguous.
- `R4`: partially satisfied. Strong reusable validator/harness code exists, but it is not yet consolidated into a single contributor-facing integration-harness contract.
- `R5`: blocked as a canonical checked-in suite. Browser proof exists through run receipts and QA launch scripts, but no repo-owned Playwright/Cypress harness is committed.
- `R6`: partially satisfied. Packaged-runtime validation exists, but deeper packaged verification is not part of default CI tiers.
- `R7`: partially satisfied. High-risk workflows already have meaningful coverage, but they are not assembled into one named critical regression floor.
- `R8`: blocked as durable repo guidance. Recursive receipts demonstrate TDD/evidence discipline, but the repo lacks a stable testing-architecture contract that encodes it.
- `R9`: partially satisfied. Workflow ownership docs exist, but runtime-specific tiering and changed-scope guidance do not.
- `R10`: partially satisfied as a baseline asset, blocked as a coherent architecture contract. The repo already contains valuable validators and package suites that should be preserved and reorganized rather than discarded.

## Relevant Code Pointers

- `/package.json`
- `/.github/workflows/ci.yml`
- `/.github/workflows/build-binaries.yml`
- `/docs/operations/02-ci-and-release-flow.md`
- `/role-model-router/apps/runtime-host-bridge/package.json`
- `/role-model-router/apps/runtime-host-bridge/src/validate-host.ts`
- `/role-model-router/apps/runtime-host-bridge/src/validate-ui.ts`
- `/role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
- `/role-model-router/apps/runtime-host-bridge/src/validate-packaging.ts`
- `/role-model-router/apps/runtime-host-bridge/scripts/start-for-qa.ts`
- `/role-model-router/apps/runtime-ui/package.json`
- `/.recursive/memory/skills/patterns/browser-proof-with-edge-cdp.md`
- `/.recursive/run/43-benchmark-routing-display/04-test-summary.md`
- `/.recursive/run/49-runtime-telemetry-analytics-charts/04-test-summary.md`
- `/.recursive/run/49-runtime-telemetry-analytics-charts/05-manual-qa.md`
- `/.recursive/run/50-openai-codex-subscription/04-test-summary.md`
- `/.recursive/run/50-openai-codex-subscription/05-manual-qa.md`

## Evidence

- Phase 0 baseline in `00-worktree.md` already confirms:
  - `corepack pnpm --filter @role-model-router/runtime-ui test` PASS
  - `corepack pnpm run runtime:validate-ui` PASS
- `ci.yml` currently runs only lint, schema validation, build, workspace tests, rust tests, and smoke.
- `build-binaries.yml` currently packages artifacts and checks packaging hygiene, but does not run `runtime:validate-packaging`.
- `role-model-router/apps/runtime-host-bridge/package.json` and `role-model-router/apps/runtime-ui/package.json` both define explicit `vitest run ...` file lists rather than glob-driven discovery.
- The checked-in test-file inventory under runtime-host and runtime-ui is larger than the current package-script file lists.
- Run `49` Phase 4 and Phase 5 receipts show that rebuilt-runtime browser route sweeps and hybrid QA are real acceptance patterns today.
- Run `50` receipts show rebuilt-runtime snapshots, validator cleanup, and hybrid QA for provider/operator flows.

## Known Unknowns

- Whether the final run-51 browser E2E harness should be Playwright-native, route-sweep-first, or a hybrid wrapper around the existing QA launcher plus browser-use/CDP proof.
- Whether the final repo-owned command matrix should automatically absorb all currently orphaned test files into package scripts, or route them through a new higher-level regression entrypoint.
- Whether `runtime:validate-observability` should remain an alias of `runtime:validate-host` or become a distinct validator during this run.
- Which runtime validators should join `ci.yml` directly versus remain in heavier manual-dispatch or packaged-runtime tiers.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/43-benchmark-routing-display/04-test-summary.md`
- `/.recursive/run/49-runtime-telemetry-analytics-charts/04-test-summary.md`
- `/.recursive/run/49-runtime-telemetry-analytics-charts/05-manual-qa.md`
- `/.recursive/run/50-openai-codex-subscription/04-test-summary.md`
- `/.recursive/run/50-openai-codex-subscription/05-manual-qa.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/skills/SKILLS.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/.recursive/memory/episodes/run-43-benchmark-routing-display.md`
- `/.recursive/memory/skills/patterns/browser-proof-with-edge-cdp.md`

## Audit Context

Audit Execution Mode: `subagent`
Subagent Availability: `available`
Subagent Capability Probe: `worker subagent available via Task tool; delegated inventory summary captured in a durable run-local action record.`
Delegation Decision Basis: `Phase 1 benefits from delegated read-only inventory of the current command/test surface, but final acceptance still requires controller verification against the actual files listed in Inputs.`
Audit Inputs Provided:
- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/00-requirements.md`
- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/00-worktree.md`
- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/addenda/00-worktree.upstream-gap.00-requirements.addendum-01.md`
- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/addenda/01-as-is.upstream-gap.00-worktree.addendum-01.md`
- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/addenda/01-as-is.upstream-gap.00-worktree.addendum-02.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/skills/SKILLS.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/.recursive/memory/episodes/run-43-benchmark-routing-display.md`
- `/.recursive/memory/skills/patterns/browser-proof-with-edge-cdp.md`
- `/package.json`
- `/.github/workflows/ci.yml`
- `/.github/workflows/build-binaries.yml`
- `/docs/operations/02-ci-and-release-flow.md`
- `/role-model-router/apps/runtime-host-bridge/package.json`
- `/role-model-router/apps/runtime-host-bridge/src/validate-host.ts`
- `/role-model-router/apps/runtime-host-bridge/src/validate-ui.ts`
- `/role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
- `/role-model-router/apps/runtime-host-bridge/src/validate-packaging.ts`
- `/role-model-router/apps/runtime-host-bridge/scripts/start-for-qa.ts`
- `/role-model-router/apps/runtime-ui/package.json`

## Effective Inputs Re-read

- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/00-requirements.md`
- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/00-worktree.md`
- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/addenda/00-worktree.upstream-gap.00-requirements.addendum-01.md`
- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/addenda/01-as-is.upstream-gap.00-worktree.addendum-01.md`
- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/addenda/01-as-is.upstream-gap.00-worktree.addendum-02.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/skills/SKILLS.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/.recursive/memory/episodes/run-43-benchmark-routing-display.md`
- `/.recursive/memory/skills/patterns/browser-proof-with-edge-cdp.md`
- `/package.json`
- `/.github/workflows/ci.yml`
- `/.github/workflows/build-binaries.yml`
- `/docs/operations/02-ci-and-release-flow.md`
- `/role-model-router/apps/runtime-host-bridge/package.json`
- `/role-model-router/apps/runtime-host-bridge/src/validate-host.ts`
- `/role-model-router/apps/runtime-host-bridge/src/validate-ui.ts`
- `/role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
- `/role-model-router/apps/runtime-host-bridge/src/validate-packaging.ts`
- `/role-model-router/apps/runtime-host-bridge/scripts/start-for-qa.ts`
- `/role-model-router/apps/runtime-ui/package.json`
- `/.recursive/run/43-benchmark-routing-display/04-test-summary.md`
- `/.recursive/run/49-runtime-telemetry-analytics-charts/04-test-summary.md`
- `/.recursive/run/49-runtime-telemetry-analytics-charts/05-manual-qa.md`
- `/.recursive/run/50-openai-codex-subscription/04-test-summary.md`
- `/.recursive/run/50-openai-codex-subscription/05-manual-qa.md`

## Earlier Phase Reconciliation

- `00-requirements.md`:
  - carried-forward claim: run `51` must define a durable testing taxonomy, command matrix, integration/browser harness expectations, packaged-runtime verification contract, initial regression coverage, and contributor guidance.
  - current reconciliation: the repo already contains meaningful building blocks for each of those surfaces, but they remain fragmented across scripts, validator sources, workflows, and recursive receipts.
- `00-worktree.md`:
  - carried-forward claim: the isolated worktree baseline is green for `runtime-ui` package tests and `runtime:validate-ui`.
  - current reconciliation: those green baselines confirm the existing UI package suite and one live validator can serve as concrete anchors for the future testing architecture.
- `00-worktree` addendum:
  - carried-forward claim: README update guidance is preserved for later phases if `/README.md` is touched.
  - current reconciliation: Phase 1 stays focused on testing architecture; the README guidance does not widen the AS-IS analysis beyond documenting that it exists as a preserved downstream input.
- `01-as-is` upstream-gap addendum:
  - carried-forward claim: the future README plan should also add the provided runtime overview screenshot near the top of the document.
  - current reconciliation: Phase 1 preserves the screenshot requirement as downstream README guidance without widening the testing-architecture analysis itself.
- `01-as-is` upstream-gap addendum 02:
  - carried-forward claim: the active run `51` worktree must live inside the `role-model` folder rather than at the earlier external fallback path.
  - current reconciliation: active Phase 1 execution now uses `D:\DEV\role-model\.worktrees\51`, and later phases should treat that in-repo path as authoritative.

## Subagent Contribution Verification

- Reviewed Action Records:
  - `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/subagents/run51-phase1-test-inventory.md`
- Main-Agent Verification Performed:
  - re-read `/package.json`, both GitHub workflow files, `/docs/operations/02-ci-and-release-flow.md`, the validator sources, `start-for-qa.ts`, prior run receipts, and the checked-in app test inventory directly
  - verified the specific omitted-test-file claims against the checked-in test files and package-local `vitest run ...` script lists
- Acceptance Decision: `accepted after controller verification, repair, and re-audit of the Phase 1 artifact state`
- Refresh Handling: `not needed yet`
- Repair Performed After Verification:
  - recorded the controller-verified package-script omission list and CI/validator split in this Phase 1 artifact

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `fa4dca31b4df9b788987652e1646e85ceeab82d0`
- Comparison reference: `working-tree`
- Normalized baseline: `fa4dca31b4df9b788987652e1646e85ceeab82d0`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only fa4dca31b4df9b788987652e1646e85ceeab82d0`
- Diff basis used: `git diff --name-only fa4dca31b4df9b788987652e1646e85ceeab82d0`
- Supplemental scope command: `git status --short --untracked-files=all`
- Base branch: `main`
- Worktree branch: `recursive/51-runtime-testing-architecture-and-regression-matrix`
- Planned or claimed changed files:
  - `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/01-as-is.md`
  - `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/addenda/01-as-is.upstream-gap.00-worktree.addendum-01.md`
  - `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/addenda/01-as-is.upstream-gap.00-worktree.addendum-02.md`
  - `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/subagents/run51-phase1-test-inventory.md`
- Actual changed files reviewed:
  - none in the tracked diff; `git diff --name-only fa4dca31b4df9b788987652e1646e85ceeab82d0` is empty after restoring incidental tooling drift
- Untracked run-owned files reviewed:
  - `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/01-as-is.md`
  - `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/addenda/01-as-is.upstream-gap.00-worktree.addendum-01.md`
  - `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/addenda/01-as-is.upstream-gap.00-worktree.addendum-02.md`
  - `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/subagents/run51-phase1-test-inventory.md`
- Unexplained drift:
  - none; incidental `.pyc` drift from recursive tooling was restored before re-audit, and the remaining worktree residue is limited to intentional run-51 recursive artifacts

## Gaps Found

- No single repo-owned testing taxonomy currently explains the runtime testing pyramid.
- No stable changed-path regression matrix maps subsystems to required validators, rebuilt-runtime proof, or packaged-runtime proof.
- Existing host/UI package test scripts omit some checked-in tests from their default command path.
- The repo has no checked-in Playwright/Cypress runtime browser suite.
- Packaged-runtime validation exists but is not wired into the default CI workflow.

## Repair Work Performed

- moved the active run `51` worktree from `D:\wt\rm51` to `D:\DEV\role-model\.worktrees\51` to satisfy the new in-repo worktree requirement while preserving locked Phase 0 history through an upstream-gap addendum

## Requirement Completion Status

- `R1` | Status: blocked | Rationale: the repo has multiple testing layers but no single repo-owned taxonomy or ownership contract yet. | Blocking Evidence: `/package.json`, `/.github/workflows/ci.yml`, `/docs/operations/02-ci-and-release-flow.md` | Audit Note: the current testing pyramid is implicit rather than documented.
- `R2` | Status: blocked | Rationale: no changed-path regression matrix currently maps runtime surfaces to required validation floors. | Blocking Evidence: `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/01-as-is.md`, `/.recursive/run/49-runtime-telemetry-analytics-charts/05-manual-qa.md`, `/.recursive/run/50-openai-codex-subscription/05-manual-qa.md` | Audit Note: rebuilt-runtime/browser obligations are currently encoded in run receipts, not a stable matrix.
- `R3` | Status: blocked | Rationale: canonical commands exist, but some checked-in tests are omitted from default package scripts and one validator alias is ambiguous. | Blocking Evidence: `/role-model-router/apps/runtime-host-bridge/package.json`, `/role-model-router/apps/runtime-ui/package.json`, `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/01-as-is.md` | Audit Note: Phase 1 verified concrete omitted test files in both app packages.
- `R4` | Status: blocked | Rationale: reusable validator and QA harness pieces exist, but they are not yet consolidated into one contributor-facing integration harness contract. | Blocking Evidence: `/role-model-router/apps/runtime-host-bridge/src/validate-ui.ts`, `/role-model-router/apps/runtime-host-bridge/src/validate-host.ts`, `/role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`, `/role-model-router/apps/runtime-host-bridge/scripts/start-for-qa.ts` | Audit Note: the current harness landscape is strong but fragmented.
- `R5` | Status: blocked | Rationale: rebuilt-runtime browser proof exists as practice, but no checked-in canonical browser E2E suite is committed today. | Blocking Evidence: `/.recursive/memory/skills/patterns/browser-proof-with-edge-cdp.md`, `/.recursive/run/49-runtime-telemetry-analytics-charts/05-manual-qa.md` | Audit Note: Phase 1 confirmed the repo currently depends on run receipts and browser-proof patterns rather than a committed E2E harness.
- `R6` | Status: blocked | Rationale: packaged-runtime validation exists, but the deeper packaged execution validator is not part of the default CI workflow. | Blocking Evidence: `/.github/workflows/build-binaries.yml`, `/package.json`, `/role-model-router/apps/runtime-host-bridge/src/validate-packaging.ts` | Audit Note: the package build workflow currently verifies artifacts and hygiene, not full packaged-runtime behavior.
- `R7` | Status: blocked | Rationale: several high-risk runtime flows already have coverage, but there is no named critical regression suite or automated rebuilt-runtime browser workflow. | Blocking Evidence: `/role-model-router/apps/runtime-host-bridge/package.json`, `/role-model-router/apps/runtime-ui/package.json`, `/.recursive/STATE.md` | Audit Note: Phase 1 found useful existing coverage but no single regression floor.
- `R8` | Status: blocked | Rationale: TDD and evidence discipline are demonstrated in recursive receipts but not yet encoded in a stable repo-owned testing architecture contract. | Blocking Evidence: `/.recursive/run/49-runtime-telemetry-analytics-charts/04-test-summary.md`, `/.recursive/run/50-openai-codex-subscription/04-test-summary.md` | Audit Note: the behavioral norm exists, but it is not yet contributor-facing guidance.
- `R9` | Status: blocked | Rationale: workflow ownership docs exist, but runtime-specific local, PR-safe, rebuilt-runtime, and packaged-runtime tiering rules do not. | Blocking Evidence: `/docs/operations/02-ci-and-release-flow.md`, `/.github/workflows/ci.yml`, `/.github/workflows/build-binaries.yml` | Audit Note: current docs stop at workflow-level guidance.
- `R10` | Status: blocked | Rationale: the repo already has valuable validators and package tests, but their relationship is not understandable from one place and some are outside default command paths. | Blocking Evidence: `/package.json`, `/role-model-router/apps/runtime-host-bridge/package.json`, `/role-model-router/apps/runtime-ui/package.json`, `/.recursive/STATE.md` | Audit Note: preservation is feasible, but the current architecture for doing so is still missing.

## Audit Verdict

Audit: PASS

## Traceability

- `R1` -> `## Executive Readback`, `## R1`, `## Current Behavior by Requirement`, and `## Requirement Completion Status`
- `R2` -> `## R2`, `## Evidence`, `## Gaps Found`, and `## Requirement Completion Status`
- `R3` -> `## R3`, `## Evidence`, and `## Requirement Completion Status`
- `R4` -> `## R4`, `## Relevant Code Pointers`, and `## Requirement Completion Status`
- `R5` -> `## R5`, `## Prior Recursive Evidence Reviewed`, and `## Requirement Completion Status`
- `R6` -> `## R6`, `## Evidence`, and `## Requirement Completion Status`
- `R7` -> `## R7`, `## Evidence`, and `## Requirement Completion Status`
- `R8` -> `## R8`, prior recursive receipts, and `## Requirement Completion Status`
- `R9` -> `## R9`, workflow/docs inputs, and `## Requirement Completion Status`
- `R10` -> `## R10`, `## Current Behavior by Requirement`, and `## Requirement Completion Status`

## Coverage Gate

- Effective inputs reviewed:
  - `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/00-requirements.md`
  - `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/00-worktree.md`
  - `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/addenda/00-worktree.upstream-gap.00-requirements.addendum-01.md`
  - `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/addenda/01-as-is.upstream-gap.00-worktree.addendum-01.md`
  - `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/addenda/01-as-is.upstream-gap.00-worktree.addendum-02.md`
  - `/.recursive/STATE.md`
  - `/.recursive/DECISIONS.md`
  - `/.recursive/memory/MEMORY.md`
  - `/.recursive/memory/skills/SKILLS.md`
  - `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
  - `/.recursive/memory/episodes/run-43-benchmark-routing-display.md`
  - `/.recursive/memory/skills/patterns/browser-proof-with-edge-cdp.md`
  - `/package.json`
  - `/.github/workflows/ci.yml`
  - `/.github/workflows/build-binaries.yml`
  - `/docs/operations/02-ci-and-release-flow.md`
  - `/role-model-router/apps/runtime-host-bridge/package.json`
  - `/role-model-router/apps/runtime-host-bridge/src/validate-host.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/validate-ui.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/validate-packaging.ts`
  - `/role-model-router/apps/runtime-host-bridge/scripts/start-for-qa.ts`
  - `/role-model-router/apps/runtime-ui/package.json`
  - prior run `43`, `49`, and `50` receipts listed above
- Requirement coverage check:
  - `R1` through `R10` are each addressed in dedicated sections plus `## Current Behavior by Requirement` and `## Requirement Completion Status`
- Out-of-scope confirmation:
  - no unrelated runtime-product changes, README rewrites, or packaging-pipeline redesign were introduced in this read-only Phase 1 analysis

Coverage: PASS

## Approval Gate

- Objective readiness checks:
  - the current testing baseline is tied back to the locked `R1` through `R10` contract
  - the main command, validator, packaging, and browser-proof surfaces are identified
  - the major architectural gaps are explicit enough to drive Phase 2 planning
  - the checked-in default package test script omissions are explicitly captured for planning
- Remaining blockers:
  - none

Approval: PASS
