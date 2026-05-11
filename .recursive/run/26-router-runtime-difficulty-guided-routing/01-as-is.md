Run: `/.recursive/run/26-router-runtime-difficulty-guided-routing/`
Phase: `01 AS-IS`
Status: `LOCKED`
LockedAt: `2026-05-11T12:36:55Z`
LockHash: `3a257d767b6b743bf86dccdf866b7e9d83de647ceb99f19c9cd68ea4705cf91e`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/26-router-runtime-difficulty-guided-routing/00-requirements.md`
- `/.recursive/run/26-router-runtime-difficulty-guided-routing/00-worktree.md`
- `/docs/architecture/07-router-runtime-routing-strategy-lock.md`
- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/packages/core/src/types.ts`
- `/role-model-router/packages/core/src/router.ts`
- `/role-model-router/packages/runtime-observability/src/index.ts`
Outputs:
- `/.recursive/run/26-router-runtime-difficulty-guided-routing/01-as-is.md`
Scope note: Documents the current difficulty-routing gap before run 26 adds the explicit rubric contract, classifier-driven difficulty mode, strategy mapping, and `maxDifficulty` gating.

## TODO

- [x] Re-read the locked run requirements and worktree basis
- [x] Re-read the routing-strategy lock plus the current runtime config, request mapping, routing, and diagnostics surfaces
- [x] Document current behavior against every in-scope requirement
- [x] Complete the audited Phase 1 sections and gates

## Reproduction Steps (Novice-Runnable)

1. Open `/.recursive/run/26-router-runtime-difficulty-guided-routing/00-requirements.md` and read `R1` through `R6`.
2. Open `/docs/architecture/07-router-runtime-routing-strategy-lock.md` and read the sections `Frozen routing-mode vocabulary`, `Frozen configuration contract`, and `Frozen difficulty rubric`.
3. Open `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts` and inspect the current `UnifiedRuntimeConfig` and `UnifiedRuntimeModelAliasConfig` types.
4. Open `/role-model-router/apps/runtime-host-bridge/src/index.ts` and inspect `resolveRequestedModelPool()`, `mapChatCompletionsRequest()`, and `mapResponsesRequest()`.
5. Open `/role-model-router/packages/core/src/types.ts` and inspect `RoutingRequest` plus `RouteRequestInput`.
6. Open `/role-model-router/packages/core/src/router.ts` and inspect `toPolicyStrategy()` plus `buildBasePolicySnapshot()`.
7. Open `/role-model-router/packages/runtime-observability/src/index.ts` and inspect `RuntimeRoutingDiagnostics`.
8. Run `corepack pnpm run schemas:validate`, `corepack pnpm --filter @role-model-router/protocol-routing test`, `corepack pnpm --filter @role-model-router/runtime-host-bridge test`, and `corepack pnpm run runtime:validate-vendors` from the run-26 worktree to confirm the run-25 baseline is currently green.

## Current Behavior by Requirement

### `R1`

- The strategy lock already defines a repo-owned `easy` / `medium` / `hard` rubric with explicit signal families, but no runtime code contract currently models that rubric.
- `UnifiedRuntimeConfig` currently includes `routingStrategy`, `observedData`, and `modelAliases`, but no `difficultyClassifier`, rubric version, difficulty policy block, or reusable rubric-signal contract exists.
- The current alias config only stores `aliasId` plus `modelIds`; it does not carry a per-alias `mode`, `maxDifficulty`, or other difficulty-specific options.

### `R2`

- The locked routing vocabulary includes alias mode `difficulty`, but the live runtime has no mode field on aliases and no classifier execution path.
- `resolveRequestedModelPool()` only expands an alias to a flat endpoint pool; it does not classify the request or attach a difficulty bucket before routing.
- `mapChatCompletionsRequest()` and `mapResponsesRequest()` always build a routing request with `strategy: "balanced"` and `preferLocal: false`, so no difficulty-driven strategy switch exists today.

### `R3`

- Core routing already supports the canonical strategy families `balanced`, `latency`, `quality`, and `cost`, but no code maps request difficulty to one of those profiles.
- `toPolicyStrategy()` and `buildBasePolicySnapshot()` derive policy solely from the inbound routing request fields; there is no request-level difficulty assignment or strategy override source.
- Because the bridge always sends `strategy: "balanced"`, easy/medium/hard requests currently score candidates identically aside from the existing observed-data and policy inputs.

### `R4`

- The strategy lock requires `maxDifficulty` eligibility gating, but neither runtime config nor routing types currently carry a difficulty ceiling for aliases, endpoints, or model sources.
- `RoutingRequest` and `RouteRequestInput` have no difficulty bucket, score, or endpoint difficulty-limit field, so the router cannot exclude candidates based on task hardness today.
- Existing eligibility remains focused on capabilities, modalities, budgets, provider filters, and adaptive observed-data effects; no local-or-remote candidate is excluded for being too weak for a `hard` request.

### `R5`

- Runtime observations currently expose alias-resolution metadata, observed-profile inputs, effective metrics, throughput-penalty state, and routing-model guidance.
- No persisted diagnostic field records an assigned difficulty bucket, the rubric signals used to derive it, a classifier fallback path, or a `maxDifficulty` eligibility decision.
- Operators can see which alias pool was used and which endpoint won, but cannot inspect how the runtime would interpret the request as `easy`, `medium`, or `hard` because that layer does not exist yet.

### `R6`

- The current baseline test floor proves alias routing, adaptive observed-data behavior, and local-plus-remote vendor execution, but no RED test proves difficulty rubric modeling, classifier fallback behavior, strategy switching, or `maxDifficulty` gating.
- The current runtime validators do not exercise representative easy/medium/hard requests or show different route outcomes based on tool burden, history dependence, or decomposition complexity.
- End-to-end proof for local-plus-remote routing exists today only at the alias-pool level, not at the difficulty-guided strategy level required by run 26.

## Relevant Code Pointers

- `/docs/architecture/07-router-runtime-routing-strategy-lock.md`
- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/packages/core/src/types.ts`
- `/role-model-router/packages/core/src/router.ts`
- `/role-model-router/packages/runtime-observability/src/index.ts`

## Known Unknowns

- Whether the classifier should execute through the normal routed inference plane with a dedicated classifier alias or through a smaller bridge-owned helper path while still satisfying the runtime-owned config contract.
- Whether `maxDifficulty` should live on alias members, synthesized runtime endpoints, or both, as long as local and remote sources are gated uniformly.
- Whether rubric signals should be persisted as a compact normalized summary or as a richer per-signal structure in request observations.

## Evidence

- `/.recursive/run/26-router-runtime-difficulty-guided-routing/00-requirements.md`
- `/.recursive/run/26-router-runtime-difficulty-guided-routing/00-worktree.md`
- `/docs/architecture/07-router-runtime-routing-strategy-lock.md`
- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/packages/core/src/types.ts`
- `/role-model-router/packages/core/src/router.ts`
- `/role-model-router/packages/runtime-observability/src/index.ts`
- `/.recursive/run/26-router-runtime-difficulty-guided-routing/evidence/logs/green/phase0-schemas-validate.log`
- `/.recursive/run/26-router-runtime-difficulty-guided-routing/evidence/logs/green/phase0-protocol-routing-test.log`
- `/.recursive/run/26-router-runtime-difficulty-guided-routing/evidence/logs/green/phase0-runtime-host-bridge-test.log`
- `/.recursive/run/26-router-runtime-difficulty-guided-routing/evidence/logs/green/phase0-runtime-validate-vendors.log`

## Prior Recursive Evidence Reviewed

- `/.recursive/run/25-router-runtime-model-alias-pool/03-implementation-summary.md`
- `/.recursive/run/25-router-runtime-model-alias-pool/04-test-summary.md`
- `/.recursive/run/25-router-runtime-model-alias-pool/05-manual-qa.md`
- `/.recursive/run/25-router-runtime-model-alias-pool/06-decisions-update.md`
- `/.recursive/run/25-router-runtime-model-alias-pool/07-state-update.md`
- `/.recursive/run/25-router-runtime-model-alias-pool/08-memory-impact.md`

## Audit Context

- Audit Execution Mode: `self-audit`
- Subagent Availability: `available`
- Subagent Capability Probe: `task`, `code-review`, and recursive-mode subskills remain available in the current session.
- Delegation Decision Basis: `Phase 1 required direct reconciliation across the strategy lock, unified runtime config, alias request mapping, core routing inputs, and persisted diagnostics.`
- Delegation Override Reason: `The analysis surface is compact but tightly coupled, so controller-owned review was faster and less error-prone than delegating fragmented code reading.`
- Audit Inputs Provided:
  - `/.recursive/run/26-router-runtime-difficulty-guided-routing/00-requirements.md`
  - `/.recursive/run/26-router-runtime-difficulty-guided-routing/00-worktree.md`
  - `/docs/architecture/07-router-runtime-routing-strategy-lock.md`
  - `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `/role-model-router/packages/core/src/types.ts`
  - `/role-model-router/packages/core/src/router.ts`
  - `/role-model-router/packages/runtime-observability/src/index.ts`

## Effective Inputs Re-read

- `/.recursive/run/26-router-runtime-difficulty-guided-routing/00-requirements.md`
- `/.recursive/run/26-router-runtime-difficulty-guided-routing/00-worktree.md`
- `/docs/architecture/07-router-runtime-routing-strategy-lock.md`
- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/packages/core/src/types.ts`
- `/role-model-router/packages/core/src/router.ts`
- `/role-model-router/packages/runtime-observability/src/index.ts`

## Earlier Phase Reconciliation

- `00-worktree.md`: analysis is being performed from the isolated run-26 worktree and against the recorded baseline commit `38bc82abb2b0cbbc52ce21f85b55dcb1472b5b54`.
- `00-requirements.md`: the locked scope is explicit difficulty-rubric use, classifier-driven difficulty mode, strategy switching, `maxDifficulty` gating, and persisted difficulty diagnostics.

## Subagent Contribution Verification

- Reviewed Action Records: `none`
- Main-Agent Verification Performed:
  - re-read the current alias expansion and routing-request construction flow directly
  - cross-checked the core routing inputs and observation model against the difficulty-routing requirements
- Acceptance Decision: `not applicable`
- Refresh Handling: `not applicable`
- Repair Performed After Verification:
  - `/.recursive/run/26-router-runtime-difficulty-guided-routing/01-as-is.md`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `38bc82abb2b0cbbc52ce21f85b55dcb1472b5b54`
- Comparison reference: `working-tree`
- Normalized baseline: `38bc82abb2b0cbbc52ce21f85b55dcb1472b5b54`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 38bc82abb2b0cbbc52ce21f85b55dcb1472b5b54`
- Base branch: `recursive/25-router-runtime-model-alias-pool`
- Worktree branch: `recursive/26-router-runtime-difficulty-guided-routing`
- Actual changed files reviewed:
  - `/.recursive/run/26-router-runtime-difficulty-guided-routing/00-worktree.md`
  - `/.recursive/run/26-router-runtime-difficulty-guided-routing/01-as-is.md`
  - `/.recursive/run/26-router-runtime-difficulty-guided-routing/evidence/logs/green/phase0-install-full.log`
  - `/.recursive/run/26-router-runtime-difficulty-guided-routing/evidence/logs/green/phase0-schemas-validate.log`
  - `/.recursive/run/26-router-runtime-difficulty-guided-routing/evidence/logs/green/phase0-protocol-routing-test.log`
  - `/.recursive/run/26-router-runtime-difficulty-guided-routing/evidence/logs/green/phase0-runtime-host-bridge-test.log`
  - `/.recursive/run/26-router-runtime-difficulty-guided-routing/evidence/logs/green/phase0-runtime-validate-vendors.log`
  - `/.recursive/run/26-router-runtime-difficulty-guided-routing/evidence/logs/green/phase0-post-baseline-status.log`
  - `/.recursive/run/26-router-runtime-difficulty-guided-routing/evidence/logs/green/phase0-lock.log`
- Unexplained drift:
  - none

## Gaps Found

- none; the findings above are the intended Phase 1 gap inventory that Phase 2 will plan to close

## Repair Work Performed

- none in Phase 1; the current gaps are planned implementation work for Phase 2 and Phase 3

## Requirement Completion Status

- R1 | Status: blocked | Rationale: no runtime-owned difficulty rubric contract or reusable rubric-signal type currently exists. | Blocking Evidence: `/docs/architecture/07-router-runtime-routing-strategy-lock.md`, `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`, `/.recursive/run/26-router-runtime-difficulty-guided-routing/01-as-is.md`
- R2 | Status: blocked | Rationale: aliases currently have no `mode` field and the bridge has no classifier execution or difficulty assignment path. | Blocking Evidence: `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`, `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- R3 | Status: blocked | Rationale: bridge request mapping always emits `strategy: "balanced"` and core routing has no difficulty-to-strategy mapping input. | Blocking Evidence: `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/packages/core/src/types.ts`, `/role-model-router/packages/core/src/router.ts`
- R4 | Status: blocked | Rationale: no current config or routing type carries `maxDifficulty`, so local and remote endpoints cannot be gated by task hardness. | Blocking Evidence: `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`, `/role-model-router/packages/core/src/types.ts`
- R5 | Status: blocked | Rationale: persisted diagnostics expose alias resolution and adaptive metrics, but no difficulty bucket, rubric signals, or difficulty-gating metadata. | Blocking Evidence: `/role-model-router/packages/runtime-observability/src/index.ts`
- R6 | Status: blocked | Rationale: current tests and runtime validators prove alias routing only; they do not prove rubric modeling, classifier fallback behavior, difficulty-based strategy changes, or easy/medium/hard local-plus-remote route divergence. | Blocking Evidence: `/.recursive/run/26-router-runtime-difficulty-guided-routing/evidence/logs/green/phase0-runtime-host-bridge-test.log`, `/.recursive/run/26-router-runtime-difficulty-guided-routing/evidence/logs/green/phase0-runtime-validate-vendors.log`

## Audit Verdict

- Audit summary: the current runtime has the alias-pool baseline needed for run 26, but no difficulty rubric contract, classifier mode, strategy switching, `maxDifficulty` gating, or difficulty-aware diagnostics yet exist.
Audit: PASS

## Traceability

- `R1` -> missing difficulty rubric ownership is documented under `## Current Behavior by Requirement`
- `R2` -> missing alias mode and classifier path are documented under `## Current Behavior by Requirement`
- `R3` -> missing difficulty-to-strategy mapping is documented under `## Current Behavior by Requirement`
- `R4` -> missing `maxDifficulty` gating inputs are documented under `## Current Behavior by Requirement`
- `R5` -> missing difficulty observation fields are documented under `## Current Behavior by Requirement`
- `R6` -> missing RED and end-to-end difficulty proof is documented under `## Current Behavior by Requirement`

## Coverage Gate

- [x] Every in-scope requirement has a concrete current-state analysis
- [x] Relevant strategy-lock, config, routing, diagnostics, and baseline validation surfaces were re-read
- [x] The remaining gap is specific enough to drive a concrete Phase 2 plan

Coverage: PASS

## Approval Gate

- [x] The Phase 1 analysis is specific enough for TO-BE planning
- [x] No unresolved ambiguity remains about the difficulty-routing gap

Approval: PASS
