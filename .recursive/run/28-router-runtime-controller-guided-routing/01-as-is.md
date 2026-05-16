Run: `/.recursive/run/28-router-runtime-controller-guided-routing/`
Phase: `01 AS-IS`
Status: `LOCKED`
LockedAt: `2026-05-11T15:24:43Z`
LockHash: `43352b9e39d41b05ee8bea9fa60af5b0ff0450ff843ae2d307dbadababbf248c`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/28-router-runtime-controller-guided-routing/00-requirements.md`
- `/.recursive/run/28-router-runtime-controller-guided-routing/00-worktree.md`
- `/docs/architecture/07-router-runtime-routing-strategy-lock.md`
- `/.recursive/run/25-router-runtime-model-alias-pool/03-implementation-summary.md`
- `/.recursive/run/27-router-runtime-difficulty-learning-cache/03-implementation-summary.md`
- `/.recursive/STATE.md`
- `/.recursive/memory/domains/role-model-baseline.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `/role-model-router/packages/protocol-routing/src/index.ts`
- `/role-model-router/packages/runtime-observability/src/index.ts`
- `/role-model-router/packages/sqlite-memory/src/index.ts`
- `/testdata/router-runtime/routing-model-guidance.json`
Outputs:
- `/.recursive/run/28-router-runtime-controller-guided-routing/01-as-is.md`
Scope note: Documents the current gap between the locked run-27 baseline and the run-28 requirement for request-time controller inference, validated routing directives, live routing integration, persistence, diagnostics, and local-plus-remote verification.

## TODO

- [x] Re-read the locked run-28 requirements and worktree basis
- [x] Re-read the repo-owned routing-strategy lock plus the most relevant prior implementation baselines
- [x] Inspect the live bridge, config, protocol-routing, observability, SQLite, and fixture seams that currently own alias, difficulty, and controller-like behavior
- [x] Document current behavior against every in-scope requirement
- [x] Complete the audited Phase 1 sections and gates

## Reproduction Steps (Novice-Runnable)

1. Open `/.recursive/run/28-router-runtime-controller-guided-routing/00-requirements.md` and read `R1` through `R6`.
2. Open `/docs/architecture/07-router-runtime-routing-strategy-lock.md` and read the frozen `intelligent` mode plus the locked `controller` config contract.
3. Open `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts` and confirm that the runtime config currently defines `modelAliases`, `difficultyClassifier`, and `observedData`, but no `controller` block.
4. Open `/role-model-router/apps/runtime-host-bridge/src/index.ts` and inspect `resolveRequestedModelPool()`, `maybeApplyDifficultyRouting()`, `mapChatCompletionsRequest()`, and `mapResponsesRequest()`.
5. In the same bridge file, inspect the persisted controller-assignment surface: `BridgeControllerAssignment`, `toControllerAssignmentFromEndpoint()`, `readControllerAssignment()`, `updateControllerAssignment()`, and the `/api/role-model/controller` HTTP routes.
6. Open `/role-model-router/packages/protocol-routing/src/index.ts` and inspect `RoutingModelSelection`, `projectRuntimeRouteInput()`, and `routeRuntimeRequest()`.
7. Open `/role-model-router/packages/runtime-observability/src/index.ts` and inspect `RuntimeRoutingDiagnostics`, especially `routingModel`, `aliasResolution`, and `difficultyRouting`.
8. Open `/role-model-router/packages/sqlite-memory/src/index.ts` and inspect the `runtime_controller_assignments` table plus `readRuntimeControllerAssignment()` and `upsertRuntimeControllerAssignment()`.
9. Open `/testdata/router-runtime/routing-model-guidance.json` and compare it with the bridge startup path that loads one fixed `RoutingModelSelection` fixture.
10. Run `corepack pnpm run schemas:validate`, `corepack pnpm --filter @role-model-router/protocol-routing test`, `corepack pnpm --filter @role-model-router/runtime-host-bridge test`, and `corepack pnpm run runtime:validate-vendors` from the run-28 worktree to confirm the committed run-27 baseline is currently green.

## Current Behavior by Requirement

### `R1`

- The runtime config already reserves the alias routing-mode vocabulary `basic | difficulty | intelligent | hybrid`, so the `intelligent` label exists at the type level.
- The live config parser does **not** yet implement the locked `controller` block from the routing-strategy handoff. `UnifiedRuntimeConfig` contains `observedData`, `difficultyClassifier`, and `modelAliases`, but no controller endpoint/model selection, timeout, validation, or fallback contract.
- The bridge has no request-time controller prompt builder, no controller-model execution path, and no controller-specific request feature packaging. `mapChatCompletionsRequest()` and `mapResponsesRequest()` still derive route inputs directly from the inbound request plus alias and difficulty helpers.
- The only current controller-like surface is a persisted **global** controller assignment (`scope: "global"`) that points to one endpoint/model pair and is exposed through `/api/role-model/controller`.

### `R2`

- The protocol-routing layer can already accept a `routingModel` hint as `RoutingModelSelection`, but that structure is narrow: one `endpointId` plus ordered `preferredEndpointIds`.
- `projectRuntimeRouteInput()` turns that hint into `routingModelRank` scoring signals and records ignored preferred endpoints, but it does not accept validated role/task/capability directives, exclusion rules, or strategy overrides from a controller.
- The bridge request mappers still hardcode the runtime request shape to `taskType: "text.chat"`, `requiredCapabilities: ["text.chat"]`, empty `preferredCapabilities`, `preferLocal: false`, and strategy driven only by difficulty routing or the balanced baseline.
- There is no machine-validated per-request controller output contract today. No parser validates preferred endpoint ids, preferred model ids, role ids, task types, or capability directives from controller output because no such output exists.

### `R3`

- Controller influence on live routing is currently static and startup-scoped rather than request-scoped. The backend loads one fixed `routing-model-guidance.json` fixture into `routingModel` during bridge initialization.
- That fixed `routingModel` is then passed into `routeRuntimeRequest()` for every request, regardless of request content, tools, history, alias mode, or local-versus-remote pool makeup.
- Alias requests already expand into mixed local-plus-remote candidate pools, and difficulty-mode aliases can change strategy plus eligibility inside those pools, but alias mode `intelligent` is not implemented anywhere in the bridge mapping path.
- Exact-model requests still work because the bridge simply resolves the requested model to matching endpoints, but there is no defined bypass-or-constraint policy for a request-time controller because request-time controller routing does not exist yet.

### `R4`

- SQLite persistence currently stores only the global controller assignment in `runtime_controller_assignments`; it does not store per-request controller recommendations, accepted directives, rejected directives, or controller reasoning summaries.
- Runtime observations can persist `routingDiagnostics.routingModel`, but that field only reflects the generic preferred-endpoint hint that reached protocol-routing. It is not controller-specific and cannot distinguish fixture guidance from future request-time controller output.
- The current observation model can correlate final route outcomes with alias resolution, difficulty routing, observed profiles, and throughput penalties, but not with a request-time controller recommendation lifecycle.
- Persistence already works across both local and remote executions for general routing observations, so the storage foundation exists, but the controller-specific per-request data model is still missing.

### `R5`

- Operator surfaces currently expose `GET /api/role-model/controller` and `PATCH /api/role-model/controller`, which only read or update the global persisted controller assignment.
- Request diagnostics currently expose `aliasResolution`, `difficultyRouting`, `observedProfile`, `effectiveMetrics`, `throughputPenalty`, and generic `routingModel` metadata.
- No current diagnostic surface shows whether controller mode was active for a request, which directives were accepted or rejected, which validation rule failed, or whether the controller materially changed eligibility versus ordering.
- The runtime UI and bridge control plane therefore have a controller-management surface, but not the request-level controller observability that Strategy B requires.

### `R6`

- The current baseline already has focused and end-to-end proof for alias pools, difficulty-guided routing, difficulty-learning cache behavior, and mixed local-plus-remote vendor routing.
- The current test suite does **not** include failing-test-first coverage for controller request packing, controller output validation, invalid-controller fallback, or request-time steering of mixed local-plus-remote pools.
- The green Phase 0 validation chain for run 28 proves the inherited run-27 baseline only; it does not prove request-time controller inference because no such feature is present.
- The current end-to-end vendor validator uses alias and difficulty flows, not an `intelligent` mode flow backed by a controller model call or structured controller output.

## Relevant Code Pointers

- `/docs/architecture/07-router-runtime-routing-strategy-lock.md`
- `/.recursive/run/25-router-runtime-model-alias-pool/03-implementation-summary.md`
- `/.recursive/run/27-router-runtime-difficulty-learning-cache/03-implementation-summary.md`
- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/packages/protocol-routing/src/index.ts`
- `/role-model-router/packages/runtime-observability/src/index.ts`
- `/role-model-router/packages/sqlite-memory/src/index.ts`
- `/testdata/router-runtime/routing-model-guidance.json`

## Known Unknowns

- Whether the run-28 controller output should map first into a richer bridge-owned planning type and only then into `RoutingRequest`, or whether `RoutingRequest` itself should gain additive controller-facing fields.
- Whether controller-preferred model ids should be normalized to endpoint ids in the bridge before protocol-routing, or whether protocol-routing should learn additive model-id preference semantics.
- Whether request-time controller steering should reuse `routingDiagnostics.routingModel` as the durable storage shape or add a controller-specific sibling diagnostic that preserves accepted and rejected directives explicitly.

## Evidence

- `/.recursive/run/28-router-runtime-controller-guided-routing/00-requirements.md`
- `/.recursive/run/28-router-runtime-controller-guided-routing/00-worktree.md`
- `/docs/architecture/07-router-runtime-routing-strategy-lock.md`
- `/.recursive/run/25-router-runtime-model-alias-pool/03-implementation-summary.md`
- `/.recursive/run/27-router-runtime-difficulty-learning-cache/03-implementation-summary.md`
- `/.recursive/STATE.md`
- `/.recursive/memory/domains/role-model-baseline.md`
- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/packages/protocol-routing/src/index.ts`
- `/role-model-router/packages/runtime-observability/src/index.ts`
- `/role-model-router/packages/sqlite-memory/src/index.ts`
- `/testdata/router-runtime/routing-model-guidance.json`
- `/.recursive/run/28-router-runtime-controller-guided-routing/evidence/logs/green/phase0-schemas-validate.log`
- `/.recursive/run/28-router-runtime-controller-guided-routing/evidence/logs/green/phase0-protocol-routing-test.log`
- `/.recursive/run/28-router-runtime-controller-guided-routing/evidence/logs/green/phase0-runtime-host-bridge-test.log`
- `/.recursive/run/28-router-runtime-controller-guided-routing/evidence/logs/green/phase0-runtime-validate-vendors.log`

## Prior Recursive Evidence Reviewed

- `/.recursive/run/25-router-runtime-model-alias-pool/03-implementation-summary.md`
- `/.recursive/run/27-router-runtime-difficulty-learning-cache/03-implementation-summary.md`
- `/.recursive/run/27-router-runtime-difficulty-learning-cache/04-test-summary.md`

## Audit Context

- Audit Execution Mode: `self-audit`
- Subagent Availability: `available`
- Subagent Capability Probe: `task`, `code-review`, and recursive-mode subskills remain available in the current session.
- Delegation Decision Basis: `Phase 1 required one coherent analysis across config, bridge planning, protocol-routing ranking seams, persistence, diagnostics, and the current routing-model fixture baseline.`
- Delegation Override Reason: `The controller gap is tightly coupled and code-local, so controller-owned reconciliation was faster and less error-prone than splitting the reads across delegated threads.`
- Audit Inputs Provided:
  - `/.recursive/run/28-router-runtime-controller-guided-routing/00-requirements.md`
  - `/.recursive/run/28-router-runtime-controller-guided-routing/00-worktree.md`
  - `/docs/architecture/07-router-runtime-routing-strategy-lock.md`
  - `/.recursive/run/25-router-runtime-model-alias-pool/03-implementation-summary.md`
  - `/.recursive/run/27-router-runtime-difficulty-learning-cache/03-implementation-summary.md`
  - `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `/role-model-router/packages/protocol-routing/src/index.ts`
  - `/role-model-router/packages/runtime-observability/src/index.ts`
  - `/role-model-router/packages/sqlite-memory/src/index.ts`
  - `/testdata/router-runtime/routing-model-guidance.json`

## Effective Inputs Re-read

- `/.recursive/run/28-router-runtime-controller-guided-routing/00-requirements.md`
- `/.recursive/run/28-router-runtime-controller-guided-routing/00-worktree.md`
- `/docs/architecture/07-router-runtime-routing-strategy-lock.md`
- `/.recursive/run/25-router-runtime-model-alias-pool/03-implementation-summary.md`
- `/.recursive/run/27-router-runtime-difficulty-learning-cache/03-implementation-summary.md`
- `/.recursive/STATE.md`
- `/.recursive/memory/domains/role-model-baseline.md`
- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/packages/protocol-routing/src/index.ts`
- `/role-model-router/packages/runtime-observability/src/index.ts`
- `/role-model-router/packages/sqlite-memory/src/index.ts`
- `/testdata/router-runtime/routing-model-guidance.json`

## Earlier Phase Reconciliation

- `00-worktree.md`: analysis is being performed from the isolated run-28 worktree and against the recorded run-27 baseline commit `2353d39ce8dc1b9ea06a56222b49ea200b41f82a`.
- `00-requirements.md`: the locked scope is request-time controller inference, structured and validated routing directives, live routing integration, durable per-request controller observability, and TDD-backed local-plus-remote end-to-end proof.

## Subagent Contribution Verification

- Reviewed Action Records: `none`
- Main-Agent Verification Performed:
  - confirmed the live config contract still lacks any parsed `controller` block
  - traced the request planners and verified they still emit static `text.chat` routing requests with no controller inference stage
  - traced the generic `routingModel` fixture input and the persisted global controller-assignment API to separate current behavior from the requested Strategy B behavior
- Acceptance Decision: `not applicable`
- Refresh Handling: `not applicable`
- Repair Performed After Verification:
  - `/.recursive/run/28-router-runtime-controller-guided-routing/01-as-is.md`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `2353d39ce8dc1b9ea06a56222b49ea200b41f82a`
- Comparison reference: `working-tree`
- Normalized baseline: `2353d39ce8dc1b9ea06a56222b49ea200b41f82a`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 2353d39ce8dc1b9ea06a56222b49ea200b41f82a`
- Base branch: `recursive/27-router-runtime-difficulty-learning-cache`
- Worktree branch: `recursive/28-router-runtime-controller-guided-routing`
- Actual changed files reviewed:
  - `/.recursive/run/28-router-runtime-controller-guided-routing/00-worktree.md`
  - `/.recursive/run/28-router-runtime-controller-guided-routing/01-as-is.md`
  - `/.recursive/run/28-router-runtime-controller-guided-routing/evidence/logs/green/phase0-install-full.log`
  - `/.recursive/run/28-router-runtime-controller-guided-routing/evidence/logs/green/phase0-schemas-validate.log`
  - `/.recursive/run/28-router-runtime-controller-guided-routing/evidence/logs/green/phase0-protocol-routing-test.log`
  - `/.recursive/run/28-router-runtime-controller-guided-routing/evidence/logs/green/phase0-runtime-host-bridge-test.log`
  - `/.recursive/run/28-router-runtime-controller-guided-routing/evidence/logs/green/phase0-runtime-validate-vendors.log`
  - `/.recursive/run/28-router-runtime-controller-guided-routing/evidence/logs/green/phase0-post-baseline-status.log`
- Unexplained drift:
  - none

## Gaps Found

- none; the findings above are the intended Phase 1 current-state inventory that Phase 2 will plan to close.

## Repair Work Performed

- none in Phase 1; request-time controller inference, validation, persistence, and diagnostics remain planned implementation work for later run-28 phases.

## Requirement Completion Status

- R1 | Status: blocked | Rationale: alias mode vocabulary includes `intelligent`, but the runtime config has no parsed `controller` block and the bridge has no request-time controller execution or input-building path. | Blocking Evidence: `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`, `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- R2 | Status: blocked | Rationale: protocol-routing only accepts a narrow `routingModel` preference hint, while bridge request planning still hardcodes `taskType`, capabilities, and strategy without any validated controller output contract. | Blocking Evidence: `/role-model-router/packages/protocol-routing/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- R3 | Status: blocked | Rationale: the only current routing-model influence is a startup-loaded fixture plus a global controller assignment API, not request-scoped controller inference that steers live mixed local-plus-remote alias pools. | Blocking Evidence: `/testdata/router-runtime/routing-model-guidance.json`, `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/packages/sqlite-memory/src/index.ts`
- R4 | Status: blocked | Rationale: SQLite stores only a global controller assignment and runtime observations store only generic `routingModel` metadata, so there is no durable per-request controller recommendation or outcome correlation yet. | Blocking Evidence: `/role-model-router/packages/sqlite-memory/src/index.ts`, `/role-model-router/packages/runtime-observability/src/index.ts`
- R5 | Status: blocked | Rationale: operator surfaces can read and update one global controller assignment, but request diagnostics do not show controller activation, accepted directives, rejected directives, or validation failures. | Blocking Evidence: `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/packages/runtime-observability/src/index.ts`
- R6 | Status: blocked | Rationale: the current green suite proves alias, difficulty, and learned-difficulty behavior only; it contains no RED/GREEN or end-to-end coverage for controller prompt packing, structured output validation, invalid-output fallback, or intelligent-mode routing. | Blocking Evidence: `/.recursive/run/28-router-runtime-controller-guided-routing/evidence/logs/green/phase0-runtime-host-bridge-test.log`, `/.recursive/run/28-router-runtime-controller-guided-routing/evidence/logs/green/phase0-runtime-validate-vendors.log`

## Audit Verdict

- Audit summary: the run-27 baseline already has additive alias routing, difficulty-guided routing, segmented learned difficulty state, and a generic routing-model seam, but Strategy B remains unimplemented because controller config parsing, request-time controller inference, structured output validation, per-request controller persistence, and controller-specific diagnostics do not yet exist.
Audit: PASS

## Traceability

- `R1` -> missing controller config and request-time controller execution ownership is documented under `## Current Behavior by Requirement`
- `R2` -> missing validated controller output semantics is documented under `## Current Behavior by Requirement`
- `R3` -> missing live request-time controller integration is documented under `## Current Behavior by Requirement`
- `R4` -> missing per-request controller persistence is documented under `## Current Behavior by Requirement`
- `R5` -> missing operator-visible controller diagnostics is documented under `## Current Behavior by Requirement`
- `R6` -> missing controller TDD and mixed local-plus-remote end-to-end proof is documented under `## Current Behavior by Requirement`

## Coverage Gate

- [x] Every in-scope requirement has a concrete current-state analysis
- [x] The live config, bridge, protocol-routing, observability, SQLite, and fixture seams were re-read directly
- [x] The resulting gap inventory is specific enough to drive a concrete Phase 2 plan

Coverage: PASS

## Approval Gate

- [x] The Phase 1 analysis is specific enough for TO-BE planning
- [x] No unresolved ambiguity remains about what run 28 still needs to add beyond the run-27 baseline

Approval: PASS
