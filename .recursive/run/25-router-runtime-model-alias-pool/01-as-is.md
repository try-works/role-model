Run: `/.recursive/run/25-router-runtime-model-alias-pool/`
Phase: `01 AS-IS`
Status: `LOCKED`
LockedAt: `2026-05-11T11:53:04Z`
LockHash: `8557b829439850c6d937e59ee0bb5c783c318fbc936efd5ced2509266edbf48b`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/25-router-runtime-model-alias-pool/00-requirements.md`
- `/.recursive/run/25-router-runtime-model-alias-pool/00-worktree.md`
- `/docs/architecture/07-router-runtime-routing-strategy-lock.md`
- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/packages/protocol-routing/src/index.ts`
- `/role-model-router/packages/core/src/router.ts`
- `/role-model-router/packages/runtime-observability/src/index.ts`
Outputs:
- `/.recursive/run/25-router-runtime-model-alias-pool/01-as-is.md`
Scope note: Documents the alias-routing gap before run 25 adds model-pool aliases, downstream masquerade exposure, and alias-aware diagnostics.

## TODO

- [x] Re-read the locked run requirements and worktree basis
- [x] Re-read the runtime config, downstream discovery, request mapping, routing, and diagnostics surfaces that would own alias routing
- [x] Document current behavior against every in-scope requirement
- [x] Complete the audited Phase 1 sections and gates

## Reproduction Steps (Novice-Runnable)

1. Open `/.recursive/run/25-router-runtime-model-alias-pool/00-requirements.md` and read `R1` through `R6`.
2. Search `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts` for `observedData` and `routingStrategy`.
3. Search `/role-model-router/apps/runtime-host-bridge/src/index.ts` for `createModelListResponse`, `mapChatCompletionsRequest`, and `mapResponsesRequest`.
4. Search `/role-model-router/apps/runtime-host-bridge/src/index.ts` for `endpoint.identity.model_id === body.model`.
5. Search `/role-model-router/packages/protocol-routing/src/index.ts` for `allowEndpoints` and `routingModel`.
6. Search `/role-model-router/packages/runtime-observability/src/index.ts` for `RuntimeRoutingDiagnostics`.
7. Run `corepack pnpm --filter @role-model-router/protocol-routing test`, `corepack pnpm --filter @role-model-router/runtime-host-bridge test`, and `corepack pnpm run runtime:validate-vendors` from the run-25 worktree to confirm the run-24 baseline is currently green.

## Current Behavior by Requirement

### `R1`

- The current unified runtime config exposes `routingStrategy`, `observedData`, llama-swap settings, and LiteLLM settings, but no `modelAliases` or equivalent alias-pool contract exists.
- No repo-owned config surface currently maps one client-facing alias to multiple real model ids.
- Because no alias config exists, there is no config-time validation for duplicate aliases, empty pools, or references to multiple real model ids.

### `R2`

- `/v1/models` is currently built by grouping registry endpoints by their real `model_id`.
- `createModelListResponse()` returns one entry per real model id with sorted `endpoint_ids`; it does not synthesize masquerade alias entries.
- `createDownstreamOpenAIProviderConfig()` reuses that same real-model list, so downstream discovery and recommended-model guidance remain real-model-only today.

### `R3`

- `mapChatCompletionsRequest()` and `mapResponsesRequest()` both resolve candidates with `registry.endpoints.filter((endpoint) => endpoint.identity.model_id === body.model)`.
- The request model must therefore match a real registry `model_id`; alias expansion does not exist.
- If no endpoint has that exact model id, the bridge throws `No registry endpoints are available for requested model ...` instead of handling an alias pool or partially available alias membership.

### `R4`

- Exact-model routing is the only supported model-selection path today.
- Once `allowEndpoints` is built from real `model_id` matches, existing capability, modality, tool-calling, and context-window gates continue to work through the normal runtime eligibility filters.
- The response path already returns the real chosen model and endpoint, but that is only because no alias layer exists between the request model and the chosen endpoint.

### `R5`

- Persisted routing diagnostics currently expose observed-profile metadata, adaptive effective metrics, throughput-penalty state, and `routingModel` controller guidance.
- No diagnostic surface identifies that a request used an alias, what real model ids were in the alias pool, or which alias members were unavailable.
- Operators can inspect the chosen real endpoint after routing, but not any alias-expansion context because none is recorded.

### `R6`

- Current tests prove exact-model routing, adaptive observed-data behavior, and local-plus-remote runtime execution, but no current RED test proves alias config parsing, alias discovery, alias pool expansion, or alias-aware diagnostics.
- No end-to-end validator currently proves that one client-facing alias can route across both local and remote pool members in the live runtime.
- The baseline validation floor is strong enough to extend, but it currently proves only real-model discovery and exact-model request mapping.

## Relevant Code Pointers

- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/packages/protocol-routing/src/index.ts`
- `/role-model-router/packages/core/src/router.ts`
- `/role-model-router/packages/runtime-observability/src/index.ts`

## Known Unknowns

- Whether alias definitions should live directly under unified runtime config or under a nested routing section while still satisfying the locked strategy vocabulary.
- Whether `/v1/models` should expose both aliases and real model ids together or expose aliases as the primary client-facing entries while preserving real-model operator surfaces elsewhere.
- Whether alias diagnostics should live only on request observations or also on other operator-facing reads such as downstream provider config and runtime summary surfaces.

## Evidence

- `/.recursive/run/25-router-runtime-model-alias-pool/00-requirements.md`
- `/.recursive/run/25-router-runtime-model-alias-pool/00-worktree.md`
- `/docs/architecture/07-router-runtime-routing-strategy-lock.md`
- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/packages/protocol-routing/src/index.ts`
- `/role-model-router/packages/core/src/router.ts`
- `/role-model-router/packages/runtime-observability/src/index.ts`
- `/.recursive/run/25-router-runtime-model-alias-pool/evidence/logs/green/phase0-protocol-routing-test.log`
- `/.recursive/run/25-router-runtime-model-alias-pool/evidence/logs/green/phase0-runtime-host-bridge-test.log`
- `/.recursive/run/25-router-runtime-model-alias-pool/evidence/logs/green/phase0-runtime-validate-vendors.log`

## Prior Recursive Evidence Reviewed

- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/03-implementation-summary.md`
- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/04-test-summary.md`
- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/05-manual-qa.md`
- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/06-decisions-update.md`
- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/07-state-update.md`
- `/.recursive/run/24-router-runtime-recency-bias-throughput-sla/08-memory-impact.md`

## Audit Context

- Audit Execution Mode: `self-audit`
- Subagent Availability: `available`
- Subagent Capability Probe: `task`, `code-review`, and recursive-mode subskills remain available in the current session.
- Delegation Decision Basis: `Phase 1 required direct reconciliation across runtime config, downstream discovery, exact-model request mapping, routing diagnostics, and the adaptive baseline from run 24.`
- Delegation Override Reason: `The analysis surface is compact but tightly coupled, so controller-owned review was faster and less error-prone than delegating fragmented code reading.`
- Audit Inputs Provided:
  - `/.recursive/run/25-router-runtime-model-alias-pool/00-requirements.md`
  - `/.recursive/run/25-router-runtime-model-alias-pool/00-worktree.md`
  - `/docs/architecture/07-router-runtime-routing-strategy-lock.md`
  - `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `/role-model-router/packages/protocol-routing/src/index.ts`
  - `/role-model-router/packages/core/src/router.ts`
  - `/role-model-router/packages/runtime-observability/src/index.ts`

## Effective Inputs Re-read

- `/.recursive/run/25-router-runtime-model-alias-pool/00-requirements.md`
- `/.recursive/run/25-router-runtime-model-alias-pool/00-worktree.md`
- `/docs/architecture/07-router-runtime-routing-strategy-lock.md`
- `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/packages/protocol-routing/src/index.ts`
- `/role-model-router/packages/core/src/router.ts`
- `/role-model-router/packages/runtime-observability/src/index.ts`

## Earlier Phase Reconciliation

- `00-worktree.md`: analysis is being performed from the isolated run-25 worktree and against the recorded baseline commit `fd5efdee275589db7d10bcd6ac7749ec780e4466`.
- `00-requirements.md`: the locked scope is alias-based model-pool routing only, not difficulty classification, controller-guided routing, or hybrid arbitration.

## Subagent Contribution Verification

- Reviewed Action Records: `none`
- Main-Agent Verification Performed:
  - re-read the current bridge model-list and request-mapping flow directly
  - cross-checked the runtime diagnostics shape against the request-model selection path and adaptive run-24 baseline
- Acceptance Decision: `not applicable`
- Refresh Handling: `not applicable`
- Repair Performed After Verification:
  - `/.recursive/run/25-router-runtime-model-alias-pool/01-as-is.md`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `fd5efdee275589db7d10bcd6ac7749ec780e4466`
- Comparison reference: `working-tree`
- Normalized baseline: `fd5efdee275589db7d10bcd6ac7749ec780e4466`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only fd5efdee275589db7d10bcd6ac7749ec780e4466`
- Base branch: `recursive/24-router-runtime-recency-bias-throughput-sla`
- Worktree branch: `recursive/25-router-runtime-model-alias-pool`
- Actual changed files reviewed:
  - `/.recursive/run/25-router-runtime-model-alias-pool/00-requirements.md`
  - `/.recursive/run/25-router-runtime-model-alias-pool/00-worktree.md`
  - `/.recursive/run/25-router-runtime-model-alias-pool/01-as-is.md`
  - `/.recursive/run/25-router-runtime-model-alias-pool/evidence/logs/green/requirements-artifact-lint.log`
  - `/.recursive/run/25-router-runtime-model-alias-pool/evidence/logs/green/requirements-lock.log`
  - `/.recursive/run/25-router-runtime-model-alias-pool/evidence/logs/green/phase0-install-full.log`
  - `/.recursive/run/25-router-runtime-model-alias-pool/evidence/logs/green/phase0-schemas-validate.log`
  - `/.recursive/run/25-router-runtime-model-alias-pool/evidence/logs/green/phase0-protocol-routing-test.log`
  - `/.recursive/run/25-router-runtime-model-alias-pool/evidence/logs/green/phase0-runtime-host-bridge-test.log`
  - `/.recursive/run/25-router-runtime-model-alias-pool/evidence/logs/green/phase0-runtime-validate-vendors.log`
  - `/.recursive/run/25-router-runtime-model-alias-pool/evidence/logs/green/phase0-post-baseline-status.log`
  - `/.recursive/run/25-router-runtime-model-alias-pool/evidence/logs/green/phase0-artifact-lint.log`
  - `/.recursive/run/25-router-runtime-model-alias-pool/evidence/logs/green/phase0-lock.log`
- Unexplained drift:
  - none

## Gaps Found

- none; the findings above are the intended Phase 1 gap inventory that Phase 2 will plan to close

## Repair Work Performed

- none in Phase 1; the current gaps are planned implementation work for Phase 2 and Phase 3

## Requirement Completion Status

- R1 | Status: blocked | Rationale: no repo-owned alias config surface currently exists. | Blocking Evidence: `/role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`, `/.recursive/run/25-router-runtime-model-alias-pool/01-as-is.md`
- R2 | Status: blocked | Rationale: `/v1/models` and downstream OpenAI provider config currently expose only real model ids grouped from the registry. | Blocking Evidence: `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- R3 | Status: blocked | Rationale: request mapping currently filters registry endpoints by exact `model_id === body.model` and has no alias-pool expansion path. | Blocking Evidence: `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/packages/protocol-routing/src/index.ts`
- R4 | Status: blocked | Rationale: exact-model compatibility exists only because exact-model routing is the only supported behavior today. | Blocking Evidence: `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/packages/core/src/router.ts`
- R5 | Status: blocked | Rationale: diagnostics expose `routingModel` controller guidance, but no alias usage or alias-pool composition metadata. | Blocking Evidence: `/role-model-router/packages/runtime-observability/src/index.ts`
- R6 | Status: blocked | Rationale: no failing test or end-to-end validator currently proves alias discovery, alias-pool routing, or exact-model compatibility after alias support. | Blocking Evidence: `/.recursive/run/25-router-runtime-model-alias-pool/evidence/logs/green/phase0-runtime-host-bridge-test.log`, `/.recursive/run/25-router-runtime-model-alias-pool/evidence/logs/green/phase0-runtime-validate-vendors.log`

## Audit Verdict

- Audit summary: the current runtime only supports real-model discovery and exact-model request mapping, so run 25 remains necessary and well-scoped to add alias-based model-pool routing on top of the adaptive run-24 baseline.
Audit: PASS

## Traceability

- `R1` -> missing alias config is documented under `## Current Behavior by Requirement`
- `R2` -> real-model-only `/v1/models` and downstream discovery are documented under `## Current Behavior by Requirement`
- `R3` -> exact-model-only candidate expansion is documented under `## Current Behavior by Requirement`
- `R4` -> current exact-model compatibility path is documented under `## Current Behavior by Requirement`
- `R5` -> missing alias diagnostics are documented under `## Current Behavior by Requirement`
- `R6` -> missing RED and end-to-end alias proof is documented under `## Current Behavior by Requirement`

## Coverage Gate

- [x] Every in-scope requirement has a concrete current-state analysis
- [x] Relevant config, discovery, routing, diagnostics, and baseline validation surfaces were re-read
- [x] The remaining gap is specific enough to drive a concrete Phase 2 plan

Coverage: PASS

## Approval Gate

- [x] The Phase 1 analysis is specific enough for TO-BE planning
- [x] No unresolved ambiguity remains about the alias-routing gap

Approval: PASS
