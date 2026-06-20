Run: `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-06-20T07:37:27Z`
LockHash: `d952d950cfa5f8c96103f2dabe1ff5000e51bf9bd10d593c5b4b1f1cba3a24f0`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/.recursive/memory/skills/SKILLS.md`
- `/.agents/skills/e2e-testing-patterns/SKILL.md`
- `/package.json`
- `/.github/workflows/ci.yml`
- `/docs/architecture/09-runtime-routing-strategy-interactions.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/`
- `/role-model-router/apps/runtime-ui/app/components/`
- `/role-model-router/apps/runtime-ui/app/lib/`
- `/.recursive/run/30-router-runtime-strategy-convergence-e2e/00-requirements.md`
- `/.recursive/run/43-benchmark-routing-display/00-requirements.md`
- `/.recursive/run/50-openai-codex-subscription/00-requirements.md`
- User guidance in chat on 2026-06-20:
  - create a thorough and specific proposal for adding regression, integration, unit, and end-to-end tests so future runs do not break existing functionality
  - use recursive-mode and recursive-spec for the proposal
Outputs:
- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/00-requirements.md`
Scope note: This run establishes the repo-owned testing architecture for the role-model runtime surfaces, including a canonical test taxonomy, command and CI tiers, reusable integration and browser E2E harnesses, packaged-runtime verification rules, and an initial regression matrix for the highest-risk runtime workflows.

## TODO

- [x] Define a stable run id for the testing-architecture work
- [x] Capture the current repo testing baseline and relevant prior runs
- [x] Define the canonical test taxonomy and ownership model
- [x] Define the command matrix and CI tiering expectations
- [x] Define the reusable integration and browser E2E harness expectations
- [x] Define the required initial regression coverage areas
- [x] Define TDD and rebuilt-runtime verification obligations
- [x] Record out-of-scope boundaries and constraints
- [x] Lock the approved requirements for Phase 0 and Phase 1 handoff

## Source Requirement Inventory

| Source | Contribution to this run |
| --- | --- |
| `/.recursive/STATE.md` | current runtime truth, existing validators, runtime-ui/runtime-host test surfaces, and prior run closeout state |
| `/.recursive/DECISIONS.md` | prior implementation intent for routing, benchmark, UI, and validation patterns |
| runtime routing domain memory | current durable truth for routing, provider capabilities, rebuilt-runtime verification, and truthful operator readiness |
| `e2e-testing-patterns` skill | current guidance for testing pyramid, stable selectors, deterministic browser automation, and artifact capture |
| `/package.json` and existing package tests | current root validation commands and gaps in repo-level test taxonomy |
| `.github/workflows/ci.yml` | current CI phase split and current validation entrypoints |
| runs `30`, `43`, and `50` requirements | existing repo-native precedent for TDD, verification floors, rebuilt-runtime QA, and end-to-end operator proof |
| chat guidance on 2026-06-20 | fixed outcome: durable testing strategy for future runs, authored via recursive-mode and recursive-spec |

## Problem Summary

The repository already has strong focused tests and runtime validators, but they are not yet organized into one durable testing architecture that future runs can apply consistently. The current state mixes package-local Vitest suites, runtime validators, packaged-runtime rebuild checks, and manual browser proof patterns without a canonical test taxonomy, changed-scope regression matrix, or single contributor-facing contract that explains what to add, which commands to run, and which verification layers are mandatory before closeout.

This run closes that gap by defining and implementing the testing system the repo should use going forward: a path-aware testing pyramid, explicit regression entrypoints, reusable integration and browser E2E harnesses, packaged-runtime verification expectations, and documentation that tells future runs how to preserve existing behavior instead of rediscovering the right validation stack ad hoc.

## Contract-First Delivery Rule

Implementation for this run must follow this order:

1. requirements contract
2. AS-IS inventory of current tests, validators, browser proof patterns, and CI surfaces
3. failing automated tests for new test-infrastructure behavior or missing coverage guarantees
4. test command and CI-tier implementation
5. integration and browser E2E harness implementation
6. initial critical regression backfill
7. contributor and architecture documentation
8. rebuilt-runtime and packaged-runtime browser verification

This run may not ship as docs-only guidance. The testing architecture must produce executable commands, reusable harnesses, and concrete regression coverage that future runs can actually use.

## Fixed Decisions

1. This run defines a durable repository testing architecture, not a one-off checklist for a single feature.
2. The repository testing pyramid must remain explicit: many unit tests, fewer integration and validator tests, and only focused critical-path browser E2E tests.
3. Existing runtime validators such as `runtime:validate-host`, `runtime:validate-ui`, `runtime:validate-vendors`, and related targeted commands remain first-class and must be integrated into the regression strategy rather than replaced.
4. Browser E2E automation for operator-facing runtime flows must standardize on one canonical harness, and this run will treat Playwright-style browser automation as the default path.
5. Automated CI coverage must remain deterministic and offline-safe by default; live secrets, real OAuth, and external-provider network dependencies are not allowed in the default CI floor.
6. Rebuilt-runtime verification remains mandatory for operator-facing changes, and packaged-runtime verification remains mandatory whenever the runtime artifact or packaging path is affected.
7. Production changes made in this run must follow TDD with concrete RED and GREEN evidence.
8. Future runs must be able to determine their minimum required verification floor from changed paths and changed surfaces rather than by ad hoc judgment.

## Requirements

### `R1` Canonical repository testing taxonomy

Description:
The repository must define one durable testing taxonomy that explains which test layers exist, what each layer is responsible for, and which kinds of failures each layer is expected to catch.

Acceptance criteria:
- the repo documents a canonical layer model covering at least unit, integration, conformance or validator, browser E2E, and manual rebuilt-runtime verification
- each layer records its primary purpose, acceptable dependencies, expected runtime cost, and artifact or evidence expectations
- the testing taxonomy distinguishes between deterministic local or CI-safe automation and credential-bearing or operator-assisted verification
- the taxonomy is written as a repo-owned contract that future runs can cite directly

### `R2` Path-aware regression matrix for future runs

Description:
The repository must expose a changed-scope regression matrix that maps touched subsystems to the minimum automated and manual verification layers required before closeout.

Acceptance criteria:
- the regression matrix covers at least `runtime-host-bridge`, `runtime-ui`, `core`, `protocol-routing`, `catalog`, `sqlite-memory`, benchmark surfaces, packaging surfaces, and operator documentation
- the matrix defines which commands or suites are mandatory when those paths change
- the matrix explicitly identifies when rebuilt-runtime browser verification is required and when packaged-runtime verification is additionally required
- the matrix is concrete enough that a future run can determine its minimum validation floor without inventing a new rule set

### `R3` Canonical test command entrypoints

Description:
The repository must provide a stable command matrix for running the testing tiers locally and in automation.

Acceptance criteria:
- root or documented canonical entrypoints exist for the major tiers: fast unit coverage, broader integration or validator coverage, browser E2E coverage, regression smoke, and full regression
- the command matrix explains which commands are safe for default local development, which are expected in CI, and which are reserved for rebuilt-runtime or packaged-runtime verification
- command naming and documentation do not require contributors to know package-local scripts by memory
- failure output remains attributable to the tier that failed rather than collapsing into one opaque catch-all command

### `R4` Reusable integration harnesses for runtime surfaces

Description:
The repository must provide reusable integration-test helpers for runtime-host and persistence-backed surfaces so future runs can add real regression tests without rebuilding harness logic each time.

Acceptance criteria:
- reusable helpers exist to start isolated runtime state, seed deterministic fixture data, exercise HTTP surfaces, and tear down cleanly
- the harness supports testing at least routing config or alias behavior, benchmark run start or readback behavior, provider account readiness, and telemetry query surfaces
- integration tests do not depend on live external credentials or open internet access by default
- harness usage is documented well enough that future runs can extend it without reverse-engineering existing tests

### `R5` Canonical browser E2E harness on rebuilt runtime

Description:
The repository must standardize how browser E2E tests are executed against the runtime operator surface.

Acceptance criteria:
- the canonical browser E2E harness launches a rebuilt runtime surface rather than relying only on component tests or a frontend-only preview
- tests use stable selectors and deterministic seeded state instead of brittle DOM structure assumptions
- browser runs capture actionable artifacts on failure, such as screenshots, traces, or structured logs
- the harness can validate at least the runtime shell boot path plus critical operator workflows without requiring manual browser driving for every regression

### `R6` Packaged-runtime verification contract

Description:
The repository must define and partially automate the verification path for packaged runtime artifacts so packaging regressions are caught by a durable contract rather than by ad hoc smoke checks.

Acceptance criteria:
- the testing architecture documents when a packaged runtime rebuild is required and what must be verified afterward
- there is a canonical packaged-runtime verification entrypoint or script sequence that can be reused by future runs
- packaged-runtime verification captures evidence for runtime launch, UI reachability, and key operator surfaces or API health
- the packaged-runtime verification contract stays separate from default CI-safe test tiers when local packaging cost or platform specificity makes full automation inappropriate

### `R7` Initial critical regression suite for current runtime risks

Description:
The run must backfill concrete regression coverage for the current highest-risk runtime workflows so the new architecture immediately protects existing behavior instead of only documenting future intent.

Acceptance criteria:
- automated regression coverage exists for benchmark run creation and immediate readback behavior
- automated regression coverage exists for at least one routing config or alias persistence path and one telemetry query or observe path
- automated regression coverage exists for truthful provider or connection readiness surfaces in the runtime host or UI
- automated regression coverage exists for at least one rebuilt-runtime browser workflow that crosses the real runtime HTTP boundary

### `R8` TDD and evidence discipline for testing-infrastructure changes

Description:
This run must encode the repository’s TDD expectations for both product changes and testing-architecture changes so future contributors have one consistent rule.

Acceptance criteria:
- Phase 3 for this run records RED and GREEN evidence for every production or harness change
- the resulting testing architecture documents when strict TDD is required and how pragmatic exceptions must be justified
- no critical testing-infrastructure behavior is added without a failing test or an explicitly documented pragmatic exception
- the contributor guidance explains how RED and GREEN evidence should be captured in future recursive runs

### `R9` CI tiering and contributor workflow guidance

Description:
The repository must explain how local development, pre-merge validation, and heavier regression paths interact so contributors know which work to run at which stage.

Acceptance criteria:
- documentation describes a fast local loop, a PR-safe validation floor, and a heavier rebuilt-runtime or packaged-runtime validation path
- CI documentation clarifies which tiers are expected on every change and which tiers are reserved for manual dispatch, nightly runs, or change-triggered execution
- the guidance explains how to extend the matrix when a new subsystem or verification surface is introduced
- the documentation is placed under durable repo-owned docs rather than hidden only in chat or run artifacts

### `R10` Preserve existing validator and package-test investment

Description:
The new testing architecture must incorporate current package-level tests and runtime validators as durable building blocks rather than forcing a disruptive rewrite.

Acceptance criteria:
- the command matrix and docs explicitly incorporate existing validator entrypoints and focused package tests
- implementation does not remove or orphan current validator paths without replacement
- future-run guidance explains when to add focused package tests versus when to extend integration or browser E2E coverage
- the final architecture makes the relationship between unit tests, validators, browser E2E, and manual rebuilt-runtime verification understandable from one place

## Out of Scope

- `OOS1`: replacing every existing test suite with a new framework in one sweep
- `OOS2`: adding live-provider or real-credential browser automation to default CI
- `OOS3`: building a full cross-browser or cross-platform matrix for every runtime flow in this run
- `OOS4`: retrofitting every historical recursive run artifact to the new testing architecture
- `OOS5`: redesigning product UX or routing behavior outside the work needed to make tests deterministic and verifiable
- `OOS6`: broad packaging or release-pipeline redesign beyond the verification surfaces needed for this testing contract

## Constraints

- the testing architecture must stay consistent with the repo’s recursive-mode TDD discipline and rebuilt-runtime verification expectations
- default automated tiers must remain deterministic and offline-safe; secret-bearing and live-network provider flows must stay outside the default CI floor
- the implementation must preserve existing validator entrypoints and package-local test value where they already provide useful signal
- browser E2E tests must use stable selectors and deterministic setup instead of brittle DOM or timing assumptions
- operator-facing changes must continue to require rebuilt-runtime verification, and packaging-affecting changes must continue to require packaged-runtime verification
- the run must add executable coverage, not just prose

## Assumptions

- the current Vitest-based package test baseline remains the primary unit and integration test runner unless a narrower helper is required for browser automation
- a Playwright-style browser harness can be introduced without conflicting with existing runtime validation scripts
- the highest-value immediate protection is on runtime-host, runtime-ui, routing-config, benchmark, telemetry, and provider-readiness workflows rather than on every historical subsystem at once

## Coverage Gate

Coverage: PASS

- `R1` defines the testing taxonomy the user asked for across regression, integration, unit, and end-to-end layers
- `R2` and `R3` define the concrete regression matrix and canonical command entrypoints future runs need
- `R4` through `R7` cover the reusable integration harnesses, browser E2E path, packaged-runtime verification path, and initial critical regression backfill
- `R8` and `R9` cover TDD discipline, contributor workflow, and CI or local execution guidance
- `R10` protects existing validators and focused tests so the run extends current coverage instead of discarding it
- out-of-scope and constraints explicitly fence off live-secrets CI, full framework rewrites, and broad unrelated product changes

## Approval Gate

Approval: PASS

- the artifact is specific to the current repo rather than a generic testing essay
- the deliverable is implementation-ready: it calls for commands, harnesses, docs, and initial regression coverage, not only guidance
- TDD, rebuilt-runtime verification, and packaged-runtime verification obligations are explicit
- the changed-scope regression-matrix concept gives future runs a concrete path to avoid regressions
- the requirements are concrete enough to drive Phase 0 worktree isolation and Phase 1 AS-IS analysis
