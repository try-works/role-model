Run: `/.recursive/run/63-router-backend-regression-and-telemetry-surface-hardening/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-07-11T08:50:23Z`
LockHash: `f52537f1b712097b958ac053fa11a20de95708081ba1f962b8ceb0992135796b`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- User-approved recursive spec draft for router backend regression and telemetry surface hardening
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `docs/architecture/10-runtime-testing-architecture.md`
- `docs/operations/04-runtime-testing-matrix.md`
Outputs:
- `/.recursive/run/63-router-backend-regression-and-telemetry-surface-hardening/00-requirements.md`
Scope note: This run strengthens router-backend regression protection first, while also hardening telemetry/dashboard graph behavior and preserving broad runtime verification rather than narrowing only to router tests.

## TODO

- [x] Confirm this run should prioritize router-backend regression safety over new feature work.
- [x] Confirm this run should include telemetry/dashboard graph hardening in addition to router-backend work.
- [x] Confirm the verification floor includes unit, integration, validator, browser E2E, and rebuilt-runtime QA where applicable.
- [x] Confirm a named root router regression command should be part of the run.
- [x] Defer detailed router, telemetry, and artifact-layer code rereads to Phase 1 AS-IS analysis.
- [x] Complete Coverage Gate checklist.
- [x] Complete Approval Gate checklist.

## Requirements

### `R1` Add a first-class router backend regression command

Description:
Create a deterministic, repo-owned router-backend regression lane centered on routing correctness and regression safety. The run must introduce an explicit root command named `runtime:test-router` rather than leaving router-critical coverage implied across unrelated package scripts. `runtime:test-router` becomes the canonical router-focused regression lane for router-affecting backend changes and must evolve when new router-owned backend surfaces are introduced.

Acceptance criteria:
- A root-level command named `runtime:test-router` exists in the workspace scripts.
- `runtime:test-router` is CI-safe and offline-safe by default.
- `runtime:test-router` runs a router-focused regression subset that covers:
  - routing core logic,
  - host-bridge routing behavior,
  - persistence-backed routing facts,
  - and the minimum observability facts required to explain routing outcomes.
- The minimum routing/observability facts protected by this lane include, at minimum, request id, routing decision id, selected endpoint/model/provider facts, and failure or fallback receipts where those surfaces exist.
- The command is documented in the canonical runtime testing docs with its intended tier and scope.
- Existing commands such as `test`, `runtime:test-critical`, `runtime:test-browser`, and affected validators remain runnable and preserve their documented scope after the change.

### `R2` Harden router backend unit and integration coverage around routing contracts

Description:
Strengthen regression protection for routing correctness at the backend level rather than relying mainly on browser flows or a single omnibus test file.

Acceptance criteria:
- Routing coverage explicitly exercises alias resolution, request override or endpoint override precedence, capability-based candidate filtering, deterministic selection behavior, and no-candidate behavior.
- Backend integration coverage explicitly exercises the operator-visible routing HTTP contract, including summary, config, candidates, and decision surfaces where they are part of shipped runtime behavior.
- Routing persistence and restart behavior are covered, including preservation or reconstruction of routing facts needed for postmortem inspection.
- Selected-endpoint failure behavior is covered, including classification plus retry, reroute, or cooldown semantics where applicable.
- Where existing conformance suites are part of the router-owned backend contract, they are included in the strengthened regression strategy rather than bypassed.
- New or reorganized tests are focused enough that future router regressions can be localized to a specific behavior area without depending only on a giant catch-all suite.

### `R3` Add direct trace and usage artifact package tests

Description:
Close the filesystem-backed artifact-layer coverage gap for `@role-model-router/trace` and `@role-model-router/usage` so routing and execution receipts remain trustworthy.

Acceptance criteria:
- `@role-model-router/trace` has automated tests for write/read round-trip behavior and negative linkage cases.
- `@role-model-router/usage` has automated tests for append/read round-trip behavior, summarization, and negative linkage cases.
- Both packages expose package-level `test` scripts and participate in the normal workspace test floor.
- Negative tests prove failure behavior for invalid linkage rather than only happy-path persistence.
- The new coverage is deterministic and temp-directory based.

### `R4` Harden telemetry analytics and dashboard graph behavior under partial and stale refresh failures

Description:
Fix or guard the highest-risk telemetry analytics behavior so dashboard and Observe graph surfaces do not silently reuse stale data without operator signal or diagnostic evidence.

Acceptance criteria:
- Telemetry-heavy routes that reuse prior chart data on background failure explicitly surface stale-data or degraded-refresh state to the operator through a visible UI indicator.
- Those routes emit bounded structured diagnostics when background refresh fails and stale data is reused.
- The structured diagnostics include, at minimum, route identifier, chart identifier or title, a bounded query or filter snapshot, an error summary, and whether stale data was reused.
- Route-level or equivalent tests cover initial success, partial chart failure, background refresh failure with stale-response reuse, and error-state behavior.
- Regression coverage is added for current dashboard and Observe analytics surfaces that are known to be stateful or risk-prone.
- The implementation does not introduce noisy success-path logging or leak sensitive payload data.

### `R5` Add behavior-level regression coverage for canonical telemetry request analytics

Description:
Protect the operator-facing request analytics workflow end to end, not just static rendering.

Acceptance criteria:
- Behavior-level coverage exists for `/app/observe/requests` filter changes, query-param hydration or restoration, and request-list narrowing.
- Coverage verifies at least one inspect or drill-in workflow from the request analytics surface into the corresponding request detail surface.
- Tests use deterministic seeded runtime data and remain CI-safe and offline-safe.
- Existing render-only coverage may remain, but it is no longer the only regression net for this route.
- New telemetry-flow tests avoid brittle selectors and assert user-visible behavior rather than implementation details.

### `R6` Preserve broad runtime verification instead of narrowing only to router tests

Description:
Improve router confidence without skipping other critical verification layers, especially operator-facing analytics and dashboard flows.

Acceptance criteria:
- The implementation plan and final verification floor include:
  - impacted package unit tests,
  - router-focused integration coverage,
  - validator coverage for affected runtime surfaces,
  - and browser E2E whenever operator-facing telemetry or dashboard routes change.
- Rebuilt-runtime QA is included when operator-facing runtime UI behavior changes.
- Packaging verification remains conditional on packaging-affecting file changes, and the run preserves that rule explicitly.
- The run does not replace broad runtime validation with a router-only subset.
- Phase 4 evidence identifies the exact package tests, integration suites, validators, and browser checks used for affected router and telemetry surfaces.
- Phase 5 evidence demonstrates both backend routing confidence and affected operator-surface coverage.

### `R7` Update canonical testing docs and regression matrix to match the real verification strategy

Description:
Make the strengthened verification approach durable so future contributors run the right checks for router, telemetry, and artifact-layer changes.

Acceptance criteria:
- `docs/architecture/10-runtime-testing-architecture.md` is updated if new named verification surfaces or commands are introduced.
- `docs/operations/04-runtime-testing-matrix.md` explicitly covers `trace` and `usage` package changes.
- The matrix explicitly reflects the verification floor for router-backend-affecting changes and telemetry or operator-surface changes.
- The new `runtime:test-router` command is documented with its intended tier and scope.
- The canonical docs make clear that `runtime:test-router` is the default router-focused regression lane for router-affecting backend changes.
- Documentation remains aligned with actual package scripts and runnable commands.

## Out of Scope

- Redesigning routing strategy semantics, benchmark policy, or provider capability policy beyond what is required to make existing behavior testable and regression-safe.
- Introducing live-secret, credential-bearing, or external-network-dependent verification into the default CI floor.
- Reworking SEA packaging or release pipelines unless packaging-affecting files are directly touched by this run.
- Broad visual redesign of runtime UI pages unrelated to telemetry/dashboard correctness or stale-state signaling.
- Adding new provider families or expanding runtime execution scope beyond the existing backend/runtime surfaces.

## Constraints

- Default verification must remain deterministic and offline-safe.
- Production and testing-infrastructure code changes must follow the repository’s recursive-mode TDD discipline.
- New logging must be structured, bounded, and targeted at degradation/failure paths rather than noisy success paths.
- Existing runtime validation commands and current CI-safe floors must remain intact unless this run explicitly and safely evolves them.
- Any new regression lane or test command must be executable from the repo root and documented in canonical testing docs.
- Changes to operator-facing telemetry or dashboard flows must preserve rebuilt-runtime verification expectations from the current testing matrix.
- If new router-owned backend surfaces are introduced while implementing this run, the router regression lane and canonical testing docs must be updated so those surfaces are not left outside the documented regression strategy.

## Coverage Gate

- [x] Requirements cover router-backend regression command creation.
- [x] Requirements cover router unit/integration hardening.
- [x] Requirements cover trace/usage artifact-package testing.
- [x] Requirements cover telemetry/dashboard stale-refresh behavior and diagnostics.
- [x] Requirements cover behavior-level `/app/observe/requests` regression protection.
- [x] Requirements preserve broader runtime verification instead of router-only narrowing.
- [x] Requirements cover canonical testing-doc updates.

Coverage: PASS

## Approval Gate

- [x] Scope is concrete enough for Phase 1 AS-IS analysis.
- [x] Acceptance criteria are observable and testable.
- [x] Out-of-scope and constraint boundaries are explicit.
- [x] User approved creating the run and requirements artifact.

Approval: PASS
