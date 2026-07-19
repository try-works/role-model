Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `02 TO-BE Plan`
Status: `LOCKED`
LockedAt: `2026-07-07T17:54:39Z`
LockHash: `bc5a0c3e8b093a1d893de1983a9b2c202922e2d5634bd7b860b84fb2e9303912`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/00-requirements.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/00-worktree.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/01-as-is.upstream-gap.00-worktree.addendum-01.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/01-as-is.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/01.5-root-cause.md`
- `/docs/architecture/13-litellm-pi-role-model-integration-proposal.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/request-capability-inference.ts`
- `/role-model-router/apps/runtime-host-bridge/src/model-capability-resolver.ts`
- `/role-model-router/apps/runtime-host-bridge/src/downstream-openai-discovery.ts`
- `/role-model-router/packages/adapter-execution/src/index.ts`
- `/role-model-router/packages/provider-openai/src/index.ts`
- `/role-model-router/packages/provider-litellm/src/index.ts`
- `/role-model-router/packages/vendor-litellm/src/index.ts`
- `/role-model-router/packages/runtime-observability/src/index.ts`
- `/role-model-router/packages/sqlite-memory/src/index.ts`
- `/packages/pi-role-model/src/runtime-discovery.ts`
- `/packages/pi-role-model/src/runtime-inspection.ts`
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/02-to-be-plan.md`
Scope note: This artifact defines the strict-TDD implementation path for preserving Pi/Craft request semantics through the shared execution contract, hardening provider-family shaping and continuation safety, extending the existing telemetry/request-detail surfaces, and proving the result against a rebuilt runtime in Phase 5.

## TODO

- [x] Re-read the locked requirements, AS-IS, root-cause, and effective Phase 0 addendum inputs
- [x] Distinguish already-landed routing/discovery helpers from the still-missing propagation work
- [x] Define the target contract and ownership boundaries for shared execution semantics
- [x] Define strict RED/GREEN slices for contract propagation, provider shaping, continuation safety, telemetry, and corpus verification
- [x] Define Phase 4 automated verification and Phase 5 rebuilt-runtime verification
- [x] Map every requirement to planned code, tests, verification, or documentation
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Root Cause Reference

Root causes identified in `01.5-root-cause.md`:

- `RC1`: shared execution contract under-specification
- `RC2`: provider-family request shaping is downstream of the wrong contract
- `RC3`: Codex Subscription compatibility is hardcoded instead of metadata-owned
- `RC4`: continuation and tool replay lack a durable idempotency/receipt model
- `RC5`: existing telemetry surfaces have insufficient semantic field coverage
- `RC6`: current regression anchors are narrow and non-corpus

Phase 3 must fix those causes directly. The run is not a new capability-inference or alias-discovery run.

## Already Landed Primitives

The following seams already exist in the baseline and must be reused rather than rewritten:

- capability inference:
  - `/role-model-router/apps/runtime-host-bridge/src/request-capability-inference.ts`
- model capability resolution:
  - `/role-model-router/apps/runtime-host-bridge/src/model-capability-resolver.ts`
- downstream discovery contract:
  - `/role-model-router/apps/runtime-host-bridge/src/downstream-openai-discovery.ts`
- targeted routing anchors:
  - `/role-model-router/apps/runtime-host-bridge/test/craft-ask-difficulty.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/alias-capability-routing.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/downstream-openai-discovery.test.ts`

The missing work is propagation, continuation, observability, and corpus-scale verification around those primitives.

## Target Architecture

### Shared Execution Semantics Contract

Extend the shared routed-execution contract in `/role-model-router/packages/adapter-execution/src/index.ts` with additive fields instead of Pi-specific branches:

- `reasoning`:
  - `effort`
  - provider-neutral raw control payload when needed
- `sessionAffinity`:
  - `sessionId`
  - `clientRequestId`
  - `promptCacheKey`
- `transportPreference`:
  - `auto`
  - `sse`
  - `websocket`
- `continuation`:
  - `previousResponseId`
  - preserved assistant replay items or tool-call identity metadata
  - continuation mode or safety hints for replay
- richer message content parts where required for image/file/provider replay preservation

The contract should stay provider-neutral, but it must be rich enough that host-bridge and provider adapters no longer have to reconstruct dropped semantics later.

### Ingress Mapping And Continuation Ownership

Update `/role-model-router/apps/runtime-host-bridge/src/index.ts` so chat-completions and responses mapping preserve the new contract fields:

- map `tool_choice` on both chat and responses requests
- map `reasoning_effort`, `reasoning`, and `thinking`
- map prompt-cache and session-affinity hints
- map `previous_response_id` and other continuation metadata from responses requests
- retain `clientRequestId` as the common request-correlation source
- replace continuation's current "strip toolChoice and splice messages" behavior with a continuation envelope plus explicit replay-safety decisions

Continuation remains runtime-owned, not Pi-owned.

### Provider-Family Shaping

Update provider-family adapters to consume the richer shared contract:

- `/role-model-router/packages/provider-openai/src/index.ts`
  - forward responses `tool_choice`
  - forward `previous_response_id`
  - forward reasoning controls
  - forward prompt-cache key and session-affinity headers when configured
- `/role-model-router/packages/provider-litellm/src/index.ts`
  - inherit the same contract fields through `buildOpenAIRequest`
  - preserve LiteLLM cache and response metadata on the richer path
- `/role-model-router/packages/vendor-litellm/src/index.ts`
  - extend generated config with the smallest required `router_settings` subset
  - keep request-time `fallbacks`, but stop depending on `model_list` alone

Native Codex Subscription remains a separate execution family. The plan is to align semantics, not flatten the transport.

### Codex Compatibility Ownership

Replace scattered Codex-family checks with one owned compatibility layer:

- keep one explicit compatibility source only where endpoint metadata alone is insufficient
- stop deciding Codex-family behavior by endpoint-id substring plus repeated hardcoded model checks in multiple places
- update the matrix test to verify the owned compatibility layer rather than duplicating ad hoc production rules

This addresses `RC3` without regressing the dedicated Codex transport path.

### Observability, Idempotency, And Persistence

Extend the existing observation/telemetry split instead of creating a new receipt system:

- observation-bundle and request-detail additions:
  - `sourceClient`
  - `executionFamily`
  - `adapterFamily`
  - payload-size metrics
  - retry/reroute counts
  - cooldown decision
  - idempotency decision
  - tool side-effect state
  - normalized tool-call id and provider tool-call id
- telemetry-ledger additions:
  - filterable/indexed fields only where aggregate analysis is useful
  - remaining debug context in observation JSON or derived request-detail fields
- sqlite changes must:
  - migrate existing databases safely
  - default old rows compatibly
  - preserve current request-ledger and Pi inspection reads

Idempotency receipts must extend the existing tooling/execution structures in:

- `/role-model-router/packages/runtime-observability/src/index.ts`
- `/role-model-router/packages/sqlite-memory/src/index.ts`

### Corpus And Rebuilt-Runtime Proof

Add a canonical routed-execution corpus instead of relying on narrow point tests:

- deterministic corpus:
  - committed
  - CI-safe
  - machine-readable per-case results
- live-provider subset:
  - opt-in
  - explicitly environment-gated
- rebuilt-runtime Phase 5 proof:
  - must run against the rebuilt runtime from this worktree
  - must include Pi-path and Craft-shape traffic
  - must capture request-detail or telemetry evidence, not only console logs

## Planned Changes by File

Expected product files:

- update `/role-model-router/packages/adapter-execution/src/index.ts`
- update `/role-model-router/packages/adapter-execution/test/index.test.ts`
- update `/role-model-router/packages/provider-openai/src/index.ts`
- update `/role-model-router/packages/provider-openai/test/index.test.ts`
- update `/role-model-router/packages/provider-litellm/src/index.ts`
- update `/role-model-router/packages/provider-litellm/test/index.test.ts`
- update `/role-model-router/packages/vendor-litellm/src/index.ts`
- update `/role-model-router/packages/vendor-litellm/test/index.test.ts`
- update `/role-model-router/packages/runtime-observability/src/index.ts`
- update `/role-model-router/packages/runtime-observability/test/index.test.ts`
- update `/role-model-router/packages/sqlite-memory/src/index.ts`
- update `/role-model-router/packages/sqlite-memory/test/index.test.ts`
- update `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- update `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- update `/role-model-router/apps/runtime-host-bridge/test/openai-codex-subscription-matrix.test.ts`
- update `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`
- update `/role-model-router/apps/runtime-host-bridge/test/craft-ask-difficulty.test.ts` only if new Craft-shape corpus cases belong there
- update `/packages/pi-role-model/src/runtime-inspection.ts` only if backward-compatible parsing needs additive fields
- add `/docs/architecture/14-routed-execution-semantics-and-receipts.md`

Expected evidence files:

- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/logs/red/*.log`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/logs/green/*.log`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/runtime/*.json`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/corpus/*.json`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/pi/*.json`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/craft/*.json`

## Implementation Steps

1. Write RED tests for shared execution contract propagation and provider-openai responses shaping.
2. Write RED host-bridge tests for responses request mapping, continuation replay safety, and Codex compatibility ownership.
3. Implement the additive shared execution semantics contract and host-bridge mapping updates.
4. Implement provider-openai and provider-litellm request shaping updates plus minimal LiteLLM config extensions.
5. Write RED observability/sqlite tests for idempotency, tool side-effect state, retry/reroute, and payload-size telemetry fields.
6. Implement observation-bundle, sqlite, request-detail, and telemetry-ledger changes without breaking Pi compatibility.
7. Add deterministic Pi/Craft corpus execution and per-case artifact output on top of the current validator surfaces.
8. Update architecture documentation and run automated, rebuilt-runtime, and Phase 5 verification.

## Testing Strategy

- package-level RED/GREEN coverage for adapter-execution, provider-openai, provider-litellm, vendor-litellm, runtime-observability, and sqlite-memory
- host-bridge RED/GREEN coverage for responses mapping, Codex compatibility ownership, continuation safety, and corpus artifact emission
- runtime validator coverage through `runtime:validate-vendors`, `runtime:validate-observability`, and `runtime:test-critical`
- Pi package verification through `@try-works/pi-role-model` tests
- rebuilt-runtime verification in Phase 5 with representative Pi and Craft traffic plus request-detail evidence

## Playwright Plan (if applicable)

No Playwright browser control is required for the main implementation slices in this session.

If rebuilt-runtime verification later exposes a UI-only inspection gap, Phase 5 may use the existing request-detail routes through ordinary HTTP or packaged-runtime browser access, but the primary proof remains API- and receipt-based.

## Strict TDD Plan

TDD Mode for Phase 3: `strict`

No production code may be written before the corresponding failing test has been run and recorded.

### TDD Slice A: Shared Contract And Provider Responses Propagation

RED:

- extend `/role-model-router/packages/provider-openai/test/index.test.ts`
- extend `/role-model-router/packages/adapter-execution/test/index.test.ts`
- assert the shared execution request can preserve:
  - responses `tool_choice`
  - `reasoning_effort` or reasoning controls
  - prompt-cache key or session affinity
  - `previous_response_id`
  - transport preference metadata
- assert the responses builder forwards those fields when present
- run:
  - `corepack pnpm --filter @role-model-router/provider-openai exec vitest run test/index.test.ts`
  - `corepack pnpm --filter @role-model-router/adapter-execution exec vitest run test/index.test.ts`

GREEN:

- implement the additive request-contract fields and provider-openai responses shaping
- keep current chat-completions behavior green

### TDD Slice B: Host-Bridge Mapping And Continuation Safety

RED:

- extend `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- add assertions that:
  - `mapResponsesRequest()` preserves `tool_choice`, reasoning controls, and `previous_response_id`
  - continuation does not blindly discard `toolChoice`
  - continuation records replay-safety or idempotency decisions for tool-bearing turns
- run:
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts`

GREEN:

- update host-bridge mapping and continuation helpers to carry the new contract fields
- keep current Craft ask-mode and alias capability behavior unchanged

### TDD Slice C: Codex Compatibility Ownership

RED:

- extend `/role-model-router/apps/runtime-host-bridge/test/openai-codex-subscription-matrix.test.ts`
- assert Codex-family eligibility flows through one owned compatibility layer rather than repeated endpoint-id substring rules
- keep exact transport-family coverage, but stop treating the fixed model list as scattered production truth
- run:
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/openai-codex-subscription-matrix.test.ts`

GREEN:

- extract or centralize the compatibility layer in host-bridge
- preserve the native Codex execution path and current exposed matrix semantics where still required

### TDD Slice D: LiteLLM Adapter And Vendor Config Semantics

RED:

- extend `/role-model-router/packages/provider-litellm/test/index.test.ts`
- extend `/role-model-router/packages/vendor-litellm/test/index.test.ts`
- assert LiteLLM-backed execution preserves the new contract fields and renders required router settings
- run:
  - `corepack pnpm --filter @role-model-router/provider-litellm exec vitest run test/index.test.ts`
  - `corepack pnpm --filter @role-model-router/vendor-litellm exec vitest run test/index.test.ts`

GREEN:

- implement richer LiteLLM request/config handling with the minimum config surface needed for this run

### TDD Slice E: Observability, Idempotency, And Telemetry Persistence

RED:

- extend `/role-model-router/packages/runtime-observability/test/index.test.ts`
- extend `/role-model-router/packages/sqlite-memory/test/index.test.ts`
- assert the observation bundle and telemetry rows expose:
  - `sourceClient`
  - `executionFamily`
  - `adapterFamily`
  - ingress or translated or provider payload bytes
  - retry/reroute counters
  - cooldown decision
  - idempotency decision
  - tool side-effect state
  - normalized and provider tool-call ids
- assert redaction still holds for the new fields
- run:
  - `corepack pnpm --filter @role-model-router/runtime-observability exec vitest run test/index.test.ts`
  - `corepack pnpm --filter @role-model-router/sqlite-memory exec vitest run test/index.test.ts`

GREEN:

- implement additive observation and sqlite changes
- keep request-ledger, telemetry-query, and Pi inspection compatibility green

### TDD Slice F: Corpus Harness And Per-Case Artifacts

RED:

- extend `/role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`
- extend `/role-model-router/apps/runtime-host-bridge/test/index.test.ts` if helper-level assertions are needed
- assert the deterministic corpus emits stable per-case machine-readable artifacts including:
  - case id
  - client kind
  - expected and actual execution family
  - selected endpoint or model
  - provider family
  - adapter family
  - failure class
  - retry/reroute counts
  - payload bytes
  - tool-call and execution counts
  - idempotency decision
- run:
  - `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/validate-vendors.test.ts`

GREEN:

- implement the deterministic corpus writer on top of the existing validator surfaces
- commit the corpus inputs and result schema used by the run

### TDD Slice G: Documentation

RED:

- if a meaningful docs assertion exists, use it
- otherwise keep strict TDD for code and record the documentation-only gap in Phase 3 while still requiring docs verification in Phase 4

GREEN:

- add `/docs/architecture/14-routed-execution-semantics-and-receipts.md`
- link it from the existing proposal doc where appropriate

## Verification Plan

### Automated Verification

Focused commands:

- `corepack pnpm --filter @role-model-router/adapter-execution exec vitest run test/index.test.ts`
- `corepack pnpm --filter @role-model-router/provider-openai exec vitest run test/index.test.ts`
- `corepack pnpm --filter @role-model-router/provider-litellm exec vitest run test/index.test.ts`
- `corepack pnpm --filter @role-model-router/vendor-litellm exec vitest run test/index.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-observability exec vitest run test/index.test.ts`
- `corepack pnpm --filter @role-model-router/sqlite-memory exec vitest run test/index.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts test/openai-codex-subscription-matrix.test.ts test/craft-ask-difficulty.test.ts test/alias-capability-routing.test.ts test/validate-vendors.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge run build`
- `corepack pnpm --filter @try-works/pi-role-model run test`

Broader runtime validation after focused suites:

- `corepack pnpm run runtime:validate-vendors`
- `corepack pnpm run runtime:validate-observability`
- `corepack pnpm run runtime:test-critical`

### Rebuilt Runtime Verification

Phase 5 must verify against a rebuilt runtime from this worktree, not a stale installed binary.

Required rebuilt-runtime path:

1. rebuild the runtime artifacts from the worktree
2. run packaging validation:
   - `corepack pnpm run runtime:validate-packaging`
3. launch the rebuilt runtime or packaged runtime under a dedicated run-62 state root
4. probe:
   - `GET /healthz`
   - `GET /v1/models`
   - `GET /api/role-model/downstream/openai`
   - representative `POST /v1/chat/completions`
   - representative `POST /v1/responses`
5. capture request-detail or telemetry evidence for the representative cases

### Pi Verification

Required evidence:

- Pi-facing discovery still resolves correctly through `packages/pi-role-model`
- request-detail compatibility remains backward compatible or is updated in the same run
- representative Pi-shape requests show the richer semantics in Role Model's request-detail or telemetry output

### Craft Verification

Required evidence:

- representative Craft-shape requests still preserve:
  - declared tools before first tool use
  - active tool turns
  - inline image routing
- rebuilt-runtime request-detail or telemetry evidence exists for at least one tool-bearing and one non-text-sensitive Craft case

## Manual QA Scenarios

1. Start the rebuilt runtime from the run-62 worktree under a dedicated runtime-state root.
2. Execute a Pi-shape responses request with reasoning or continuation metadata and confirm the rebuilt runtime preserves the semantics into request-detail evidence.
3. Execute a Craft-shape request with declared tools before first tool use and confirm the rebuilt runtime does not collapse it into easy ask-mode.
4. Execute a non-text-sensitive request and confirm capability eligibility excludes incompatible endpoints before scoring.
5. Execute a representative retry or fallback case and confirm request-detail or telemetry evidence exposes the retry/reroute and idempotency decision.

## Idempotence and Recovery

- The run is isolated in `D:\DEV\role-model\.worktrees\62-litellm-pi-craft-codex-execution-hardening\`.
- The deterministic corpus and validator commands are re-runnable without mutating prior locked artifacts.
- Rebuilt-runtime evidence should be written under the run-local `evidence/` tree so the runtime can be restarted against the same case set and state root.
- The planned idempotency model explicitly records whether tool side effects block automatic replay, so recovery behavior is observable instead of implicit.

## Implementation Sub-phases

- Shared execution contract and provider-openai responses propagation
- Host-bridge mapping, continuation safety, and Codex compatibility ownership
- LiteLLM adapter/config semantics
- Observability, sqlite persistence, and request-detail compatibility
- Deterministic Pi/Craft corpus and rebuilt-runtime verification

## Manual QA Plan

QA Execution Mode: `agent-operated`

Phase 5 scenarios:

1. Rebuild and launch the runtime from the run-62 worktree.
2. Execute representative Pi-shape chat and responses requests through the rebuilt runtime.
3. Execute representative Craft-shape chat requests through the rebuilt runtime.
4. Confirm at least one compatible request routes to the LiteLLM-backed family and at least one routes to the Codex Subscription family when expected.
5. Confirm request-detail or telemetry evidence exposes the new execution, payload, and idempotency facts.

Human sign-off is not required unless a later Phase 5 scenario becomes UI-only.

## Out Of Scope In Implementation

- patching Pi upstream or Craft upstream
- replacing the native Codex path with LiteLLM-only execution
- creating a second trace or receipt database
- unrelated runtime UI redesign
- broad catalog cleanup beyond what is needed for execution-family correctness

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `26e6a4119a7338236fa7e97ff81629e80951e105`
- Comparison reference: `working-tree`
- Normalized baseline: `26e6a4119a7338236fa7e97ff81629e80951e105`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 26e6a4119a7338236fa7e97ff81629e80951e105`
- Planned product paths are listed above.
- Current phase-owned changes are recursive artifacts only.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/50-openai-codex-subscription/00-requirements.md`
- `/.recursive/run/50-openai-codex-subscription/03-implementation-summary.md`
- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/00-requirements.md`
- `/.recursive/run/52-codex-subscription-benchmark-tool-path/03-implementation-summary.md`
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/00-requirements.md`
- `/.recursive/run/54-alias-capability-discovery-contract/02-to-be-plan.md`
- `/.recursive/run/55-pi-role-model-package/03-implementation-summary.md`
- `/.recursive/run/56-pi-role-model-gap-closure/03-implementation-summary.md`

## Audit Context

- Audit Execution Mode: `self-audit`
- Subagent Availability: `available`
- Subagent Capability Probe: `tool_search` exposed the `multi_agent_v1` tool family, including `spawn_agent`, on `2026-07-07`.
- Delegation Decision Basis: recursive-mode prefers delegated audits when available, but the active tool contract forbids spawning subagents unless the user explicitly asks for delegation or parallel agent work.
- Delegation Override Reason: user did not explicitly authorize subagents; this Phase 2 audit therefore uses self-audit.
- Audit Inputs Provided:
  - `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/00-requirements.md`
  - `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/00-worktree.md`
  - `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/01-as-is.upstream-gap.00-worktree.addendum-01.md`
  - `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/01-as-is.md`
  - `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/01.5-root-cause.md`
  - `/docs/architecture/13-litellm-pi-role-model-integration-proposal.md`
  - changed files:
    - `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/02-to-be-plan.md`
  - diff basis:
    - `git diff --name-only 26e6a4119a7338236fa7e97ff81629e80951e105`

## Effective Inputs Re-read

- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/00-requirements.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/00-worktree.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/01-as-is.upstream-gap.00-worktree.addendum-01.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/01-as-is.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/01.5-root-cause.md`
- `/docs/architecture/13-litellm-pi-role-model-integration-proposal.md`

## Earlier Phase Reconciliation

- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/01-as-is.md`:
  - claim carried forward: the broad routing/discovery seams exist, but the shared contract, provider shaping, hardcoded Codex behavior, observability semantics, and corpus verification remain incomplete.
  - current reconciliation: the plan targets only those missing seams and reuses the already-landed capability/discovery helpers.
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/01.5-root-cause.md`:
  - claim carried forward: the common failure center is the contract/provider/continuation/telemetry boundary.
  - current reconciliation: each TDD slice maps directly to `RC1` through `RC6` instead of introducing a new architectural search.
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/01-as-is.upstream-gap.00-worktree.addendum-01.md`:
  - claim carried forward: all downstream work runs from the canonical in-repo worktree path.
  - current reconciliation: the plan, verification commands, and Phase 5 runtime proof all assume `D:\DEV\role-model\.worktrees\62-litellm-pi-craft-codex-execution-hardening\`.

## Audit Execution

- Audit Execution Mode: `self-audit`
- Subagent Availability: `available`
- Subagent Capability Probe: `tool_search` exposed the `multi_agent_v1` tool family, including `spawn_agent`, on `2026-07-07`.
- Delegation Decision Basis: recursive-mode prefers delegated audits when available, but the active tool contract forbids spawning subagents unless the user explicitly asks for delegation or parallel agent work.
- Delegation Override Reason: user did not explicitly authorize subagents; this Phase 2 audit therefore uses self-audit.
- Audit Inputs Provided: locked requirements, worktree, addendum, AS-IS, root-cause artifact, proposal doc, current runtime source files, and diff basis.

## Subagent Contribution Verification

- Reviewed Action Records: none.
- Main-Agent Verification Performed: direct review of locked upstream artifacts plus the current adapter, provider, host-bridge, observability, sqlite, and Pi package seams listed in `Inputs`.
- Acceptance Decision: `accepted`
- Refresh Handling: not applicable.
- Repair Performed After Verification: plan scope was narrowed to the missing propagation, continuation, observability, and corpus work already confirmed by Phase 1 and Phase 1.5.

## Requirement Completion Status

- R0 | Status: blocked | Rationale: the plan defines the compatibility-layer hardening, but Phase 3 has not yet implemented or verified it. | Blocking Evidence: /.recursive/run/62-litellm-pi-craft-codex-execution-hardening/02-to-be-plan.md, /role-model-router/apps/runtime-host-bridge/src/index.ts
- R1 | Status: blocked | Rationale: the plan defines the shared execution-contract expansion, but the contract is still thin at the current baseline. | Blocking Evidence: /.recursive/run/62-litellm-pi-craft-codex-execution-hardening/02-to-be-plan.md, /role-model-router/packages/adapter-execution/src/index.ts
- R2 | Status: blocked | Rationale: host-bridge propagation and continuation changes are planned but not yet implemented. | Blocking Evidence: /.recursive/run/62-litellm-pi-craft-codex-execution-hardening/02-to-be-plan.md, /role-model-router/apps/runtime-host-bridge/src/index.ts
- R3 | Status: blocked | Rationale: LiteLLM adapter/config semantics are scoped, but the richer request/config path does not exist yet. | Blocking Evidence: /.recursive/run/62-litellm-pi-craft-codex-execution-hardening/02-to-be-plan.md, /role-model-router/packages/provider-litellm/src/index.ts, /role-model-router/packages/vendor-litellm/src/index.ts
- R4 | Status: blocked | Rationale: native Codex alignment and provider-openai responses shaping remain to be implemented and verified. | Blocking Evidence: /.recursive/run/62-litellm-pi-craft-codex-execution-hardening/02-to-be-plan.md, /role-model-router/packages/provider-openai/src/index.ts
- R5 | Status: blocked | Rationale: payload-size observability is planned, but the canonical telemetry surfaces still lack those facts today. | Blocking Evidence: /.recursive/run/62-litellm-pi-craft-codex-execution-hardening/02-to-be-plan.md, /role-model-router/packages/runtime-observability/src/index.ts, /role-model-router/packages/sqlite-memory/src/index.ts
- R6 | Status: blocked | Rationale: idempotency and tool side-effect receipt modeling is planned, but no implementation or verification exists yet. | Blocking Evidence: /.recursive/run/62-litellm-pi-craft-codex-execution-hardening/02-to-be-plan.md, /role-model-router/packages/runtime-observability/src/index.ts, /role-model-router/packages/sqlite-memory/src/index.ts
- R7 | Status: blocked | Rationale: continuation and tool replay safety are planned, but the current baseline still strips or synthesizes too much state. | Blocking Evidence: /.recursive/run/62-litellm-pi-craft-codex-execution-hardening/02-to-be-plan.md, /role-model-router/apps/runtime-host-bridge/src/index.ts, /role-model-router/packages/provider-openai/src/index.ts
- R8 | Status: blocked | Rationale: the telemetry/request-detail field expansion is planned, but the current baseline remains short of the required fact set. | Blocking Evidence: /.recursive/run/62-litellm-pi-craft-codex-execution-hardening/02-to-be-plan.md, /role-model-router/packages/runtime-observability/src/index.ts, /packages/pi-role-model/src/runtime-inspection.ts
- R9 | Status: blocked | Rationale: the deterministic Pi/Craft corpus and per-case artifact path are planned, but the corpus does not exist yet. | Blocking Evidence: /.recursive/run/62-litellm-pi-craft-codex-execution-hardening/02-to-be-plan.md, /role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts
- R10 | Status: blocked | Rationale: rebuilt-runtime Phase 5 verification is explicitly planned, but it cannot be satisfied until implementation and validation complete. | Blocking Evidence: /.recursive/run/62-litellm-pi-craft-codex-execution-hardening/02-to-be-plan.md
- R11 | Status: blocked | Rationale: focused and broader verification commands are defined, but the run has not yet executed them against changed code. | Blocking Evidence: /.recursive/run/62-litellm-pi-craft-codex-execution-hardening/02-to-be-plan.md
- R12 | Status: blocked | Rationale: late-phase decisions, state, and memory updates remain intentionally pending until the product changes land. | Blocking Evidence: /.recursive/run/62-litellm-pi-craft-codex-execution-hardening/02-to-be-plan.md
- R13 | Status: blocked | Rationale: the root-cause phase is now consumed by this plan, but the run cannot satisfy the requirement until the later phases actually follow the planned root-cause-driven implementation path. | Blocking Evidence: /.recursive/run/62-litellm-pi-craft-codex-execution-hardening/01.5-root-cause.md, /.recursive/run/62-litellm-pi-craft-codex-execution-hardening/02-to-be-plan.md

## Traceability

- `R0`, `R4` -> target architecture provider-family and Codex compatibility ownership plus TDD slices A-C
- `R1`, `R2` -> shared contract and host-bridge mapping plan plus TDD slices A-B
- `R3` -> LiteLLM adapter/config plan plus TDD slice D
- `R5`, `R8` -> observability and telemetry plan plus TDD slice E
- `R6`, `R7` -> continuation, idempotency, and tool-side-effect plan plus TDD slices B-E
- `R9` -> corpus and per-case artifact plan plus TDD slice F
- `R10` -> rebuilt-runtime verification and Phase 5 agent-operated QA
- `R11` -> focused package suites, runtime validators, and runtime critical suite
- `R12` -> explicit late-phase follow-through requirement
- `R13` -> root-cause-driven implementation ordering and phase input chain

## Gaps Found

- none beyond the in-scope gaps already planned in `## Target Architecture`, `## Strict TDD Plan`, `## Verification Plan`, and `## Requirement Completion Status`

## Repair Work Performed

- Reframed the plan around the already-landed capability/discovery primitives instead of re-planning those surfaces.
- Added the missing audited-phase headings required by the recursive-mode toolchain.
- Tightened the requirement dispositions into the stronger `R# | Status: ...` format expected by the linter.

## Audit Verdict

- Audit summary: the plan is now structurally lockable, maps directly to `RC1` through `RC6`, reuses the correct existing helpers, and preserves the user's required rebuilt-runtime Phase 5 proof.
- Follow-up required before lock: none

## Coverage Gate

- [x] Root causes are addressed directly instead of by isolated edge patches
- [x] Existing capability/discovery primitives are reused rather than duplicated
- [x] Every requirement maps to planned code, tests, verification, or later-phase control-plane work
- [x] Strict RED/GREEN evidence is planned for every code-bearing slice
- [x] Rebuilt-runtime Phase 5 verification is explicit
- [x] Pi and Craft verification are both explicit

Coverage: PASS

## Approval Gate

- [x] Plan is implementable in the current runtime-host, adapter, provider, and telemetry architecture
- [x] Plan keeps Codex Subscription as a native execution family
- [x] Plan fixes shared ownership seams rather than Pi/Craft-specific symptoms
- [x] Plan is specific enough to start strict TDD in Phase 3

Approval: PASS

## Audit Gate

- [x] Effective inputs re-read
- [x] Plan reconciled with the Phase 1 inventory and Phase 1.5 root causes
- [x] Plan reconciled with the canonical worktree addendum and recorded diff basis
- [x] Requirement traceability complete

Audit: PASS
