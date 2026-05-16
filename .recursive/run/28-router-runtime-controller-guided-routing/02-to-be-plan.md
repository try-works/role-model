Run: `/.recursive/run/28-router-runtime-controller-guided-routing/`
Phase: `02 TO-BE Plan`
Status: `LOCKED`
LockedAt: `2026-05-11T15:26:50Z`
LockHash: `0e7c3f43f47b564374045cb4f8b9a39d30ef369dd6792b76d28065d2ae1d93cc`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/28-router-runtime-controller-guided-routing/00-requirements.md`
- `/.recursive/run/28-router-runtime-controller-guided-routing/00-worktree.md`
- `/.recursive/run/28-router-runtime-controller-guided-routing/01-as-is.md`
- `/docs/architecture/07-router-runtime-routing-strategy-lock.md`
- `/.recursive/RECURSIVE.md`
Outputs:
- `/.recursive/run/28-router-runtime-controller-guided-routing/02-to-be-plan.md`
Scope note: Defines the implementation plan for request-time controller inference, validated controller routing directives, live routing integration, persistence, diagnostics, and local-plus-remote verification on top of the locked run-27 baseline.

## TODO

- [x] Plan the RED tests that prove the controller-routing gap
- [x] Plan the config, bridge, observability, and validator changes needed for request-time controller guidance
- [x] Plan safe fallback behavior for invalid or timed-out controller output
- [x] Plan the mixed local-plus-remote end-to-end verification path
- [x] Complete the audited Phase 2 sections and gates

## Planned Changes by File

- `/role-model-router/apps/runtime-host-bridge/test/unified-runtime-config.test.ts`
  - add RED coverage for the locked `controller` config block, including endpoint or model selection, timeout, and fallback or validation settings
- `/role-model-router/apps/runtime-host-bridge/test/backend-unified-runtime-config.test.ts`
  - add RED coverage proving runtime config readback preserves the new controller block and that empty-endpoint controller behavior remains explicit rather than silently falling through
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - add RED bridge tests for controller request packing, structured output parsing, validation against known endpoints or models, accepted-directive routing changes, exact-model compatibility, and invalid-output fallback
- `/role-model-router/packages/runtime-observability/test/index.test.ts`
  - add RED coverage proving request observations persist controller-active diagnostics, accepted directives, rejected directives, and final route influence without regressing existing alias or difficulty diagnostics
- `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`
  - add RED validator coverage for one intelligent-mode alias routed across a mixed local-plus-remote pool plus one invalid-controller-output scenario that safely falls back to the existing baseline
- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
  - implement the runtime-owned `controller` config contract from the routing-strategy lock
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - add controller input packing, controller execution, structured output validation, live merge into `RoutingRequest` and `routingModel`, and durable controller diagnostics
- `/role-model-router/packages/runtime-observability/src/index.ts`
  - extend routing diagnostics with explicit controller guidance metadata suitable for persistence and operator readback
- `/role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
  - extend the mixed local-plus-remote runtime validator to prove controller-steered routing and invalid-output fallback

## Implementation Steps

1. Write RED tests first for controller config parsing, bridge controller planning, controller output validation, controller diagnostics persistence, and mixed-pool runtime validation.
2. Extend the runtime-owned config contract with an additive `controller` block that defines:
   - enablement
   - source type or equivalent controller target selection that can support both local and remote endpoints
   - endpoint or model selection
   - timeout or fallback behavior
   - output-validation settings sufficient to bound accepted directives
3. Build a bridge-owned controller request-packaging helper that feeds the controller only the bounded routing context it needs:
   - relevant messages and tools
   - bounded request-shape summaries such as context tokens or tool presence
   - the existing difficulty rubric family where useful for comparable evaluation
   - candidate-pool context derived from the resolved alias or exact-model surface
4. Implement a structured controller output contract that stays additive over the existing router request shape and can express at least:
   - `requestedRoleId`
   - `taskType`
   - `requiredCapabilities`
   - `preferredCapabilities`
   - `strategy`
   - `preferLocal`
   - preferred or denied endpoints when they resolve cleanly against the live registry
5. Validate controller output before it can influence routing:
   - reject unknown endpoint ids, unknown model ids that cannot resolve to current endpoints, or invalid role or task references
   - reject malformed capabilities or strategy values
   - record rejected fields explicitly in diagnostics
   - fail closed to the existing alias or exact-model baseline when validation or execution fails
6. Merge accepted controller guidance into live routing using the narrowest existing seams:
   - populate the existing `RoutingRequest` fields that the router core already honors
   - use `routingModel.preferredEndpointIds` only for ordered endpoint preference rather than widening protocol-routing prematurely
   - preserve the current alias-pool and difficulty-learning behavior when controller mode is inactive or falls back
7. Extend runtime-observability so persisted request observations record:
   - whether controller mode was active
   - the normalized accepted directives
   - rejected directives with reasons
   - whether fallback occurred and why
   - whether controller guidance materially changed candidate ordering or eligibility
8. Prefer existing observation persistence over new SQLite schema. Only widen `sqlite-memory` if RED proves the existing `runtime_observations` JSON persistence cannot preserve or read back the new controller diagnostics faithfully.
9. Extend the live vendor validator to run:
   - one valid intelligent-mode alias request that steers a mixed local-plus-remote pool
   - one invalid-controller-output or timeout scenario that proves safe fallback to the existing routing baseline
10. Re-run focused tests and runtime validators, then complete Phase 3 and Phase 4 receipts without widening into request rewriting, per-request mode override, or hybrid arbitration work owned by run 29.

## Testing Strategy

- TDD Mode: `strict`
- RED plan:
  - add unified-runtime-config tests that fail until the `controller` block parses, normalizes, validates, and round-trips correctly
  - add backend runtime-config tests that fail until controller config readback and empty-endpoint controller behavior remain explicit
  - add bridge tests that fail until request-time controller execution can accept valid structured directives, reject invalid directives, and preserve exact-model plus fallback behavior
  - add runtime-observability tests that fail until persisted diagnostics preserve controller activation, accepted directives, rejected directives, and fallback reasons
  - extend vendor-validation tests so intelligent-mode mixed-pool routing and invalid-output fallback both fail until the runtime does them end to end
- GREEN plan:
  - implement config, bridge, observability, and validator changes only after the RED tests fail
- Focused validation command set:
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge test`
  - `corepack pnpm --filter @role-model-router/runtime-observability test`
  - `corepack pnpm --filter @role-model-router/protocol-routing test`
  - `corepack pnpm run runtime:validate-vendors`
  - `corepack pnpm run runtime:validate-host`
  - `corepack pnpm run schemas:validate`

## Playwright Plan (if applicable)

- not applicable; this run remains runtime-level and API-level rather than browser-driven

## Manual QA Scenarios

1. Start the run-28 runtime with one alias configured in `intelligent` mode and a mixed local-plus-remote candidate pool.
2. Configure the controller to a live local or remote endpoint and send a coding or tool-heavy request that should produce an explicit controller preference for coding-capable endpoints.
3. Confirm the request observation records controller-active diagnostics, the accepted directives, and the final chosen endpoint.
4. Send a second request whose content should prefer a different endpoint class and confirm controller guidance changes the live route without breaking exact-model compatibility.
5. Trigger an invalid-controller-output or timeout path and confirm the runtime:
   - records the rejection or fallback reason
   - reuses the existing alias or exact-model baseline instead of failing open
   - still returns a normal routed response from the mixed pool
6. Read request-detail diagnostics and confirm operators can distinguish controller-active, controller-fallback, and controller-inactive requests.

## Idempotence and Recovery

- Controller execution must be bounded by explicit timeout and validation rules; failures must degrade to the existing baseline rather than inventing partial guidance.
- Exact-model requests remain valid and additive. If controller mode is not applicable, the bridge must preserve the current exact-model and alias behavior.
- Accepted directives must be normalized deterministically so the same controller output produces the same routing request and diagnostics.
- The implementation should prefer existing router-core semantics and observation persistence rather than introducing new core or SQLite surfaces unless RED proves they are required.
- The legacy global controller-assignment API may remain as an operator surface, but it must not masquerade as request-time controller inference for intelligent-mode routing.

## Implementation Sub-phases

### `SP1` RED tests for config and controller contract ownership

- add failing config tests for the `controller` block and its validation rules
- add failing backend runtime-config tests for controller readback and empty-endpoint controller behavior
- add failing bridge tests for controller request packing and structured output parsing

### `SP2` RED tests for validation, routing merge, and diagnostics

- add failing bridge tests for accepted directives, rejected directives, exact-model preservation, and invalid-output fallback
- add failing runtime-observability tests for durable controller diagnostics
- add failing vendor-validation tests for intelligent-mode mixed-pool routing and invalid-output fallback

### `SP3` Additive config and bridge execution implementation

- implement the runtime-owned controller config contract
- implement controller request packing and controller execution on top of existing runtime execution plumbing
- implement normalized controller output parsing and validation against the live registry plus role or task catalog

### `SP4` Live routing integration and durable diagnostics

- merge accepted controller directives into `RoutingRequest` and `routingModel` using the narrowest existing router seams
- persist controller-active, controller-fallback, accepted-directive, and rejected-directive diagnostics through runtime observations
- preserve legacy controller-assignment surfaces without treating them as request-time inference

### `SP5` Mixed local-plus-remote runtime proof

- extend the runtime vendor validator to prove controller-steered routing across local and remote candidates
- prove invalid-output fallback and exact-model compatibility in the same end-to-end surface
- capture final evidence that intelligent mode works without widening into request rewriting or hybrid arbitration

## Prior Recursive Evidence Reviewed

- `/.recursive/run/25-router-runtime-model-alias-pool/03-implementation-summary.md`
- `/.recursive/run/27-router-runtime-difficulty-learning-cache/03-implementation-summary.md`
- `/.recursive/run/27-router-runtime-difficulty-learning-cache/04-test-summary.md`

## Audit Context

- Audit Execution Mode: `self-audit`
- Subagent Availability: `available`
- Subagent Capability Probe: `task`, `code-review`, and recursive-mode subskills remain available in the current session.
- Delegation Decision Basis: `Phase 2 planning needed one coherent mapping from the locked requirements and Phase 1 findings to exact config, bridge, observability, and validator changes while minimizing unnecessary widening into core or SQLite.`
- Delegation Override Reason: `The plan depends on already-read coupled surfaces, so splitting it into delegated fragments would add overhead and increase drift risk.`
- Audit Inputs Provided:
  - `/.recursive/run/28-router-runtime-controller-guided-routing/00-requirements.md`
  - `/.recursive/run/28-router-runtime-controller-guided-routing/00-worktree.md`
  - `/.recursive/run/28-router-runtime-controller-guided-routing/01-as-is.md`
  - `/docs/architecture/07-router-runtime-routing-strategy-lock.md`
  - `/.recursive/RECURSIVE.md`

## Effective Inputs Re-read

- `/.recursive/run/28-router-runtime-controller-guided-routing/00-requirements.md`
- `/.recursive/run/28-router-runtime-controller-guided-routing/00-worktree.md`
- `/.recursive/run/28-router-runtime-controller-guided-routing/01-as-is.md`
- `/docs/architecture/07-router-runtime-routing-strategy-lock.md`
- `/.recursive/RECURSIVE.md`

## Earlier Phase Reconciliation

- `01-as-is.md`: the plan directly addresses the identified lack of controller config parsing, request-time inference, structured validation, controller-specific persistence, and operator-visible controller diagnostics without widening into request rewriting or hybrid arbitration.
- `00-worktree.md`: the plan stays inside the isolated run-28 worktree and the baseline captured from committed run-27 commit `2353d39ce8dc1b9ea06a56222b49ea200b41f82a`.

## Subagent Contribution Verification

- Reviewed Action Records: `none`
- Main-Agent Verification Performed:
  - mapped each requirement to concrete config, bridge, observability, and validator changes
  - checked that the planned validation set covers valid-controller steering, invalid-output fallback, persistence, and mixed local-plus-remote proof
  - narrowed the plan so router-core and SQLite widening remain conditional on RED evidence
- Acceptance Decision: `not applicable`
- Refresh Handling: `not applicable`
- Repair Performed After Verification:
  - `/.recursive/run/28-router-runtime-controller-guided-routing/02-to-be-plan.md`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `2353d39ce8dc1b9ea06a56222b49ea200b41f82a`
- Comparison reference: `working-tree`
- Normalized baseline: `2353d39ce8dc1b9ea06a56222b49ea200b41f82a`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 2353d39ce8dc1b9ea06a56222b49ea200b41f82a`
- Base branch: `recursive/27-router-runtime-difficulty-learning-cache`
- Worktree branch: `recursive/28-router-runtime-controller-guided-routing`
- Planned or claimed changed files:
  - `/role-model-router/apps/runtime-host-bridge/test/unified-runtime-config.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/backend-unified-runtime-config.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - `/role-model-router/packages/runtime-observability/test/index.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `/role-model-router/packages/runtime-observability/src/index.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts`
  - `/.recursive/run/28-router-runtime-controller-guided-routing/03-implementation-summary.md`
  - `/.recursive/run/28-router-runtime-controller-guided-routing/04-test-summary.md`
  - `/.recursive/run/28-router-runtime-controller-guided-routing/05-manual-qa.md`
  - `/.recursive/run/28-router-runtime-controller-guided-routing/06-decisions-update.md`
  - `/.recursive/run/28-router-runtime-controller-guided-routing/07-state-update.md`
  - `/.recursive/run/28-router-runtime-controller-guided-routing/08-memory-impact.md`
- Actual changed files reviewed:
  - `/.recursive/run/28-router-runtime-controller-guided-routing/00-worktree.md`
  - `/.recursive/run/28-router-runtime-controller-guided-routing/01-as-is.md`
  - `/.recursive/run/28-router-runtime-controller-guided-routing/02-to-be-plan.md`
  - `/.recursive/run/28-router-runtime-controller-guided-routing/evidence/logs/green/phase0-install-full.log`
  - `/.recursive/run/28-router-runtime-controller-guided-routing/evidence/logs/green/phase0-schemas-validate.log`
  - `/.recursive/run/28-router-runtime-controller-guided-routing/evidence/logs/green/phase0-protocol-routing-test.log`
  - `/.recursive/run/28-router-runtime-controller-guided-routing/evidence/logs/green/phase0-runtime-host-bridge-test.log`
  - `/.recursive/run/28-router-runtime-controller-guided-routing/evidence/logs/green/phase0-runtime-validate-vendors.log`
  - `/.recursive/run/28-router-runtime-controller-guided-routing/evidence/logs/green/phase0-post-baseline-status.log`
- Unexplained drift:
  - none

## Gaps Found

- none

## Repair Work Performed

- narrowed the implementation surface so run 28 adds request-time controller guidance on top of the run-27 alias and difficulty baseline without prematurely widening into request rewriting, hybrid arbitration, or unnecessary router-core or SQLite redesign

## Requirement Completion Status

- R1 | Status: blocked | Rationale: Phase 2 only plans the additive controller config and request-time controller input contract; implementation remains pending Phase 3. | Blocking Evidence: `/.recursive/run/28-router-runtime-controller-guided-routing/02-to-be-plan.md`
- R2 | Status: blocked | Rationale: Phase 2 only plans the structured controller output and validation contract; implementation remains pending Phase 3. | Blocking Evidence: `/.recursive/run/28-router-runtime-controller-guided-routing/02-to-be-plan.md`
- R3 | Status: blocked | Rationale: controller guidance merging into live routing is planned but not yet implemented. | Blocking Evidence: `/.recursive/run/28-router-runtime-controller-guided-routing/02-to-be-plan.md`
- R4 | Status: blocked | Rationale: controller recommendation persistence through request observations is planned but not yet implemented. | Blocking Evidence: `/.recursive/run/28-router-runtime-controller-guided-routing/02-to-be-plan.md`
- R5 | Status: blocked | Rationale: controller-specific diagnostics and operator readback are planned but not yet implemented. | Blocking Evidence: `/.recursive/run/28-router-runtime-controller-guided-routing/02-to-be-plan.md`
- R6 | Status: blocked | Rationale: RED tests and mixed local-plus-remote intelligent-mode proof are planned but not yet executed. | Blocking Evidence: `/.recursive/run/28-router-runtime-controller-guided-routing/02-to-be-plan.md`

## Audit Verdict

- Audit summary: the planned change surface is requirement-complete, TDD-first, and narrow enough to add request-time controller-guided routing on top of the run-27 baseline without prematurely widening into request rewriting or hybrid mode.
Audit: PASS

## Traceability

- `R1` -> `SP1`, `SP3`
- `R2` -> `SP1`, `SP2`, `SP3`
- `R3` -> `SP2`, `SP4`, `SP5`
- `R4` -> `SP2`, `SP4`, `SP5`
- `R5` -> `SP2`, `SP4`, `SP5`
- `R6` -> `SP1`, `SP2`, `SP5`

## Coverage Gate

- [x] Every in-scope requirement has a concrete implementation and validation plan
- [x] The plan identifies the exact RED test surfaces, production seams, and fallback boundaries
- [x] The plan is specific enough to execute strict Phase 3 TDD without reopening run scope

Coverage: PASS

## Approval Gate

- [x] The Phase 2 plan is specific enough for implementation
- [x] The plan stays within run-28 scope and defers request rewriting and hybrid arbitration to run 29

Approval: PASS
