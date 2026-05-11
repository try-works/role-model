Run: `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/`
Phase: `01 AS-IS`
Status: `LOCKED`
LockedAt: `2026-05-11T16:28:22Z`
LockHash: `a574b75b4f7970c654a9ee2458647b063e7500c8f166666a2ffd96a072ad6702`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/00-requirements.md`
- `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/00-worktree.md`
- `/docs/architecture/07-router-runtime-routing-strategy-lock.md`
- `/.recursive/run/28-router-runtime-controller-guided-routing/03-implementation-summary.md`
- `/.recursive/run/28-router-runtime-controller-guided-routing/04-test-summary.md`
- `/.recursive/STATE.md`
- `/.recursive/memory/domains/role-model-baseline.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `/role-model-router/packages/protocol-routing/src/index.ts`
- `/role-model-router/packages/runtime-observability/src/index.ts`
- `/role-model-router/packages/adapter-execution/src/index.ts`
- `/role-model-router/packages/provider-openai/src/index.ts`
- `/role-model-router/packages/provider-anthropic/src/index.ts`
Outputs:
- `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/01-as-is.md`
Scope note: Documents the current gap between the committed run-28 controller-guided baseline and the run-29 requirement for explicit request rewriting, hybrid arbitration, per-request routing-mode overrides, additive compatibility guarantees, diagnostics, and TDD-backed end-to-end proof.

## TODO

- [x] Re-read the locked run-29 requirements and worktree basis
- [x] Re-read the repo-owned routing-strategy lock plus the most relevant prior implementation baselines
- [x] Inspect the live bridge, adapter, provider, protocol-routing, and observability seams that currently own alias, difficulty, controller, and downstream request shaping behavior
- [x] Document current behavior against every in-scope requirement
- [x] Complete the audited Phase 1 sections and gates

## Reproduction Steps (Novice-Runnable)

1. Open `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/00-requirements.md` and read `R1` through `R6`.
2. Open `/docs/architecture/07-router-runtime-routing-strategy-lock.md` and re-read the frozen `difficulty`, `intelligent`, and `hybrid` routing-mode expectations plus the later-run handoff for rewrite and override work.
3. Open `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts` and confirm that alias routing modes still allow `basic | difficulty | intelligent | hybrid`, while the implemented config surfaces today are `model_aliases`, `difficulty_classifier`, `controller`, and `observed_data`.
4. Open `/role-model-router/apps/runtime-host-bridge/src/index.ts` and inspect `resolveRequestedModelPool()`, `maybeApplyDifficultyRouting()`, `maybeApplyControllerRouting()`, `mapChatCompletionsRequest()`, and `mapResponsesRequest()`.
5. In the same bridge file, inspect the request execution path around `routeRuntimeRequest(...)` and `executeLiveRoutedRequest(...)` to confirm that the selected route feeds a concrete downstream target before provider execution.
6. Open `/role-model-router/packages/protocol-routing/src/index.ts` and inspect `RoutingModelSelection`, `projectRuntimeRouteInput()`, and `routeRuntimeRequest()`.
7. Open `/role-model-router/packages/runtime-observability/src/index.ts` and inspect `RuntimeRoutingDiagnostics`, especially `aliasResolution`, `difficultyRouting`, `controllerRouting`, and `routingModel`.
8. Open `/role-model-router/packages/adapter-execution/src/index.ts` and inspect `ResolvedExecutionTarget` plus `ProviderRequestCapture`.
9. Open `/role-model-router/packages/provider-openai/src/index.ts` and `/role-model-router/packages/provider-anthropic/src/index.ts` and confirm that provider request bodies already use `input.target.modelId` and provider-family-specific request shaping.
10. Run `corepack pnpm run schemas:validate`, `corepack pnpm --filter @role-model-router/protocol-routing test`, `corepack pnpm --filter @role-model-router/runtime-host-bridge test`, and `corepack pnpm run runtime:validate-vendors` from the run-29 worktree to confirm the committed run-28 baseline is currently green.

## Current Behavior by Requirement

### `R1`

- The runtime already performs **implicit** post-route concrete-model translation through the adapter layer. Provider request bodies are built from `input.target.modelId` in both the OpenAI and Anthropic adapters, so the downstream provider sees the selected concrete model id rather than the original alias.
- The bridge execution plan also already strips the public `model` field out of `executionRequest`; `mapChatCompletionsRequest()` and `mapResponsesRequest()` keep only normalized messages, tools, stream, token, and temperature fields while routing determines the concrete target separately.
- What is still missing is an explicit bridge-owned **rewrite contract** that records when alias or mode intent was rewritten after route choice, how the chosen provider-family request shape differed from the client-facing request, and when rewrite is intentionally skipped because the exact-model request already matches the chosen endpoint.
- There is also no diagnostic surface today that distinguishes pre-route alias expansion from post-route downstream rewriting, so the current behavior satisfies the execution plumbing but not the explicit, observable run-29 rewrite requirement.

### `R2`

- The config and alias vocabulary already reserve `hybrid` at the type level, but the live bridge has no dedicated hybrid arbitration stage.
- The current execution flow is strictly sequenced as alias expansion -> optional difficulty routing -> optional controller routing -> `routeRuntimeRequest(...)`.
- `maybeApplyDifficultyRouting()` and `maybeApplyControllerRouting()` operate as separate transforms, but there is no explicit precedence policy that combines controller guidance, difficulty assignment, observed-data scoring, and baseline eligibility under one named `hybrid` mode.
- Runtime diagnostics expose alias, difficulty, controller, and routing-model signals separately, but they do not record which signal dominated a hybrid decision because no hybrid decision surface exists yet.

### `R3`

- The bridge request mappers currently accept only the parsed request body plus internal routing contexts; they do not inspect request headers or request metadata for a per-request routing-mode override.
- There is no documented or implemented header, metadata field, or query parameter that can force `baseline`, `difficulty`, `controller`, or `hybrid` behavior on a single request.
- Because no override seam exists, invalid override handling, override-specific diagnostics, and same-pool different-outcome verification are also absent.
- The current runtime therefore always derives the decision path from the requested model and configured alias mode rather than from any per-request override input.

### `R4`

- Exact-model compatibility is currently preserved: exact-model requests bypass alias-resolution diagnostics, controller mode remains inactive unless the selected path explicitly enables it, and provider adapters already send the chosen concrete `target.modelId` downstream.
- Alias routing without an override also still works because `resolveRequestedModelPool()` plus difficulty and controller transforms keep the alias path additive instead of rewriting the public request contract in place.
- What is not yet encoded is the explicit run-29 rule for when rewrite is required versus intentionally skipped, especially once hybrid mode and per-request overrides can alter the chosen route path.
- The local-versus-remote parity foundation is already present in alias, difficulty, and controller routing, but there is no hybrid or override-specific compatibility proof yet.

### `R5`

- `RuntimeRoutingDiagnostics` already persists `aliasResolution`, `difficultyRouting`, `controllerRouting`, and generic `routingModel` metadata.
- Those diagnostics are strong enough to inspect the current controller-guided baseline, but they do not include a selected routing mode, an override source, rewrite-applied metadata, or a before-versus-after view of alias expansion versus post-route downstream request shaping.
- Provider request capture does preserve the final downstream body sent to the provider, so the raw ingredients for rewrite observability exist, but the bridge does not currently surface them as an operator-readable rewrite explanation.
- There is therefore no current diagnostic surface that can explain a future hybrid arbitration outcome or show whether a request was explicitly rewritten for downstream family compatibility.

### `R6`

- The current baseline already has focused and end-to-end proof for alias routing, difficulty-guided routing, difficulty learning, controller-guided routing, and mixed local-plus-remote vendor execution.
- The current test suite does **not** include failing-test-first coverage for explicit rewrite ownership, hybrid arbitration precedence, or per-request override parsing.
- The green Phase 0 baseline for run 29 proves the inherited run-28 baseline only; it does not prove hybrid routing, rewrite diagnostics, or override-driven route divergence because those features are not present yet.
- The current vendor validator can prove controller-guided mixed-pool routing, but it has no same-pool matrix that exercises baseline, difficulty, controller, and hybrid mode selection for the same request set.

## Relevant Code Pointers

- `/docs/architecture/07-router-runtime-routing-strategy-lock.md`
- `/.recursive/run/28-router-runtime-controller-guided-routing/03-implementation-summary.md`
- `/.recursive/run/28-router-runtime-controller-guided-routing/04-test-summary.md`
- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/packages/protocol-routing/src/index.ts`
- `/role-model-router/packages/runtime-observability/src/index.ts`
- `/role-model-router/packages/adapter-execution/src/index.ts`
- `/role-model-router/packages/provider-openai/src/index.ts`
- `/role-model-router/packages/provider-anthropic/src/index.ts`

## Known Unknowns

- Whether run 29 should model rewrite as a bridge-owned execution-plan step before adapters run, or as additive structured metadata emitted by adapters while leaving the execution contract otherwise unchanged.
- Whether hybrid arbitration should produce one combined planning artifact before `routeRuntimeRequest(...)`, or layer controller and difficulty adjustments incrementally while emitting an explicit arbitration receipt.
- Whether per-request mode overrides should be accepted through headers only, request-body metadata only, or both, while preserving the public OpenAI-compatible contract.

## Traceability

- `R1` -> current code already routes provider execution through concrete `target.modelId`, but no explicit bridge-owned rewrite contract or rewrite receipt exists yet.
- `R2` -> current code exposes `hybrid` only in vocabulary, while live routing still applies difficulty and controller transforms without a named arbitration policy.
- `R3` -> current bridge request mappers expose no request-header or metadata override seam.
- `R4` -> current exact-model and additive alias compatibility already hold, but rewrite-only-when-needed and hybrid or override compatibility rules are not yet encoded.
- `R5` -> current diagnostics expose alias, difficulty, controller, and routing-model metadata separately, but no routing-mode override or rewrite-applied receipt.
- `R6` -> current green validation proves the inherited run-28 baseline only, not rewrite or hybrid or override behavior.

## Evidence

- `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/00-requirements.md`
- `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/00-worktree.md`
- `/docs/architecture/07-router-runtime-routing-strategy-lock.md`
- `/.recursive/run/28-router-runtime-controller-guided-routing/03-implementation-summary.md`
- `/.recursive/run/28-router-runtime-controller-guided-routing/04-test-summary.md`
- `/.recursive/STATE.md`
- `/.recursive/memory/domains/role-model-baseline.md`
- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/packages/protocol-routing/src/index.ts`
- `/role-model-router/packages/runtime-observability/src/index.ts`
- `/role-model-router/packages/adapter-execution/src/index.ts`
- `/role-model-router/packages/provider-openai/src/index.ts`
- `/role-model-router/packages/provider-anthropic/src/index.ts`
- `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/evidence/logs/green/phase0-schemas-validate.log`
- `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/evidence/logs/green/phase0-protocol-routing-test.log`
- `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/evidence/logs/green/phase0-runtime-host-bridge-test.log`
- `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/evidence/logs/green/phase0-runtime-validate-vendors.log`

## Prior Recursive Evidence Reviewed

- `/.recursive/run/28-router-runtime-controller-guided-routing/03-implementation-summary.md`
- `/.recursive/run/28-router-runtime-controller-guided-routing/04-test-summary.md`
- `/.recursive/run/28-router-runtime-controller-guided-routing/05-manual-qa.md`

## Audit Context

- Audit Execution Mode: `self-audit`
- Subagent Availability: `available`
- Subagent Capability Probe: `task`, `code-review`, and recursive-mode subskills remain available in the current session.`
- Delegation Decision Basis: `Phase 1 required one coherent analysis across bridge planning, adapter execution, provider request shaping, protocol-routing ranking seams, diagnostics, and the current controller-guided baseline.`
- Delegation Override Reason: `The rewrite and hybrid gaps are tightly coupled across the same execution path, so controller-owned reconciliation was faster and less error-prone than splitting the reads across delegated threads.`
- Audit Inputs Provided:
  - `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/00-requirements.md`
  - `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/00-worktree.md`
  - `/docs/architecture/07-router-runtime-routing-strategy-lock.md`
  - `/.recursive/run/28-router-runtime-controller-guided-routing/03-implementation-summary.md`
  - `/.recursive/run/28-router-runtime-controller-guided-routing/04-test-summary.md`
  - `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `/role-model-router/packages/protocol-routing/src/index.ts`
  - `/role-model-router/packages/runtime-observability/src/index.ts`
  - `/role-model-router/packages/adapter-execution/src/index.ts`
  - `/role-model-router/packages/provider-openai/src/index.ts`
  - `/role-model-router/packages/provider-anthropic/src/index.ts`

## Effective Inputs Re-read

- `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/00-requirements.md`
- `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/00-worktree.md`
- `/docs/architecture/07-router-runtime-routing-strategy-lock.md`
- `/.recursive/run/28-router-runtime-controller-guided-routing/03-implementation-summary.md`
- `/.recursive/run/28-router-runtime-controller-guided-routing/04-test-summary.md`
- `/.recursive/STATE.md`
- `/.recursive/memory/domains/role-model-baseline.md`
- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/packages/protocol-routing/src/index.ts`
- `/role-model-router/packages/runtime-observability/src/index.ts`
- `/role-model-router/packages/adapter-execution/src/index.ts`
- `/role-model-router/packages/provider-openai/src/index.ts`
- `/role-model-router/packages/provider-anthropic/src/index.ts`

## Earlier Phase Reconciliation

- `00-worktree.md`: analysis is being performed from the isolated run-29 worktree and against the recorded run-28 baseline commit `5f7beaa56dc856fe564ee4b34b3a9a2dbbbdfee3`.
- `00-requirements.md`: the locked scope is explicit request rewriting, hybrid arbitration, per-request routing-mode overrides, additive compatibility guarantees, diagnostics, and TDD-backed local-plus-remote end-to-end proof.

## Subagent Contribution Verification

- Reviewed Action Records: `none`
- Main-Agent Verification Performed:
  - confirmed that provider adapters already use concrete `target.modelId` values, so part of the rewrite execution plumbing already exists implicitly
  - traced the bridge request planners and verified they still expose no per-request routing-mode override seam and no dedicated hybrid arbitration stage
  - traced current diagnostics and confirmed they expose alias, difficulty, controller, and routing-model metadata separately without rewrite-applied or override-applied receipts
- Acceptance Decision: `not applicable`
- Refresh Handling: `not applicable`
- Repair Performed After Verification:
  - `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/01-as-is.md`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `5f7beaa56dc856fe564ee4b34b3a9a2dbbbdfee3`
- Comparison reference: `working-tree`
- Normalized baseline: `5f7beaa56dc856fe564ee4b34b3a9a2dbbbdfee3`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 5f7beaa56dc856fe564ee4b34b3a9a2dbbbdfee3`
- Base branch: `recursive/28-router-runtime-controller-guided-routing`
- Worktree branch: `recursive/29-router-runtime-request-rewriter-hybrid-mode`
- Actual changed files reviewed:
  - `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/00-worktree.md`
  - `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/01-as-is.md`
  - `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/evidence/logs/green/phase0-init.log`
  - `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/evidence/logs/green/phase0-install-full.log`
  - `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/evidence/logs/green/phase0-schemas-validate.log`
  - `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/evidence/logs/green/phase0-protocol-routing-test.log`
  - `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/evidence/logs/green/phase0-runtime-host-bridge-test.log`
  - `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/evidence/logs/green/phase0-runtime-validate-vendors.log`
  - `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/evidence/logs/green/phase0-post-baseline-status.log`
- Unexplained drift:
  - none

## Gaps Found

- none; the findings above are the intended Phase 1 current-state inventory that Phase 2 will plan to close.

## Repair Work Performed

- none in Phase 1; explicit rewrite ownership, hybrid arbitration, per-request override parsing, and new diagnostics remain planned implementation work for later run-29 phases.

## Requirement Completion Status

- R1 | Status: blocked | Rationale: provider adapters already send the routed concrete `target.modelId` downstream and apply provider-family request shaping, but the bridge still lacks an explicit rewrite contract, rewrite receipts, and rewrite-versus-no-rewrite policy. | Blocking Evidence: `/role-model-router/packages/provider-openai/src/index.ts`, `/role-model-router/packages/provider-anthropic/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- R2 | Status: blocked | Rationale: alias mode vocabulary includes `hybrid`, but the live bridge only applies difficulty routing and controller routing sequentially and has no explicit hybrid arbitration policy or dominant-signal diagnostics. | Blocking Evidence: `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`, `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/packages/runtime-observability/src/index.ts`
- R3 | Status: blocked | Rationale: the bridge request mappers parse only request bodies and internal contexts, so there is no per-request routing-mode override header or metadata seam today. | Blocking Evidence: `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- R4 | Status: blocked | Rationale: exact-model compatibility and additive alias behavior already hold in the controller-guided baseline, but the runtime has not yet encoded rewrite-only-when-needed policy or hybrid or override compatibility guarantees. | Blocking Evidence: `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/packages/adapter-execution/src/index.ts`
- R5 | Status: blocked | Rationale: current diagnostics expose alias, difficulty, controller, and generic routing-model metadata, but not selected routing mode, override provenance, or rewrite-applied receipts. | Blocking Evidence: `/role-model-router/packages/runtime-observability/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- R6 | Status: blocked | Rationale: the current green suite proves the inherited run-28 baseline only and contains no RED/GREEN or end-to-end coverage for explicit rewrite ownership, hybrid arbitration precedence, or per-request override-driven route divergence. | Blocking Evidence: `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/evidence/logs/green/phase0-runtime-host-bridge-test.log`, `/.recursive/run/29-router-runtime-request-rewriter-hybrid-mode/evidence/logs/green/phase0-runtime-validate-vendors.log`

## Audit Verdict

- Audit summary: the committed run-28 baseline already contains implicit adapter-level concrete-model translation and durable controller-guided routing, but explicit rewrite ownership, hybrid arbitration, per-request mode overrides, and their diagnostics or validation remain absent and are the real run-29 gap.
Audit: PASS

## Coverage Gate

- [x] Every in-scope requirement has a current-state finding
- [x] The current analysis is grounded in live code and locked prior-run evidence
- [x] No unexplained Phase 1 drift remains

Coverage: PASS

## Approval Gate

- [x] The AS-IS analysis is specific enough to drive Phase 2 planning
- [x] No unresolved Phase 1 blocker remains

Approval: PASS
