Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `02 TO-BE Plan`
Addendum: `16`
Status: `LOCKED`
LockedAt: `2026-07-09T14:03:32Z`
LockHash: `b51cb4e10fd784498a156f59ed6a0e864483f8d765310e0af4326fc087374c80`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/00-requirements.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/02-to-be-plan.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/01.5-root-cause.provider-agnostic-routing-preferences.addendum-16.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.codex-subscription-native-streaming-parity.addendum-14.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/05-manual-qa.codex-subscription-native-streaming-parity.addendum-14.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/STATE.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/docs/architecture/09-runtime-routing-strategy-interactions.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/alias-capability-routing.test.ts`
- `/role-model-router/packages/core/src/router.ts`
- `/role-model-router/packages/core/test/routing-intent.test.ts`
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.provider-agnostic-routing-preferences.addendum-16.md`
Scope note: This plan supersedes the provider-specific Codex Subscription first-attempt routing pin while preserving native Codex Subscription execution after endpoint selection. It does not modify upstream Pi or Craft. It does not remove provider-specific adapter code needed to execute a selected provider. It removes provider-specific routing preference and policy narrowing.

# Addendum 16 Plan: Provider-Agnostic Routing Preferences

## TODO

- [x] Convert the corrected routing requirement into explicit implementation rules.
- [x] Define strict TDD slices that fail against current Codex-specific pinning.
- [x] Define the exact production code to remove or reshape.
- [x] Define live rebuilt-runtime verification with real Pi CLI and real Craft client requests.
- [x] Define telemetry and decision assertions that prove DeepSeek is not excluded by provider preference.
- [x] Define late-phase memory and decision cleanup for the superseded pinning rule.

## Corrected Requirement

Routing must not contain provider-specific preference rules such as "pin Codex Subscription first for tool-bearing or non-text turns."

Routing must be driven by:

- explicit user/operator policy
- exact model request semantics
- alias membership
- execution mode
- endpoint health and cooldown state
- endpoint and model metadata
- request modality and capability requirements
- role and task bindings
- benchmark performance
- measured latency, throughput, reliability, quality, and cost
- advisory controller or routing-model guidance

Provider-specific code is allowed only after endpoint selection, where the runtime must execute the selected endpoint through the correct provider or adapter path.

## Target Architecture

### Eligibility

Hard eligibility filters are allowed only when backed by provider-agnostic facts:

- exact model id maps to configured endpoint IDs
- alias maps to configured model IDs and routable endpoints
- request modality requires endpoint-declared support, such as image or file input
- request capability requires endpoint-declared support, such as function tools, structured output, or reasoning controls
- request surface requires a transport-specific contract, such as hosted Responses web search
- role/task binding permits the endpoint
- endpoint status, credentials, quota, cooldown, or operator policy permits the endpoint

Ordinary chat-completions function tools are not enough to pin Codex or any other provider family when multiple endpoints declare compatible tool calling.

### Scoring

Scoring must consider all eligible candidates.

Scoring inputs include:

- benchmark quality, with existing benchmark precedence rules
- measured quality
- measured latency
- measured reliability and throughput
- cost
- cache and continuity affinity
- advisory `routingModelRank`
- strategy, difficulty, role, and task context

Advisory preferences can affect score, but they must not rewrite `allowEndpoints`.

### Provider Execution

After routing selects an endpoint, provider-specific execution remains required:

- OpenAI Codex Subscription endpoints execute through the native Codex Responses adapter.
- DeepSeek endpoints execute through their configured OpenAI-compatible or LiteLLM-backed path.
- LiteLLM remains a vendor or execution path, not the provider.
- ai-sdk-openai remains an execution path or adapter, not the provider.

Adapter selection should use endpoint metadata such as provider id, account/variant metadata, adapter family, vendor id, and declared execution surface. It must not influence the pre-selection candidate pool except through explicit capability metadata.

## Implementation Plan

### SP62-U1 Remove Codex-specific initial routing pin

Change target:

- `/role-model-router/apps/runtime-host-bridge/src/index.ts`

Actions:

- Remove `shouldPreferOpenAICodexSubscriptionForTurn()` as a routing preference source.
- Remove `resolveOpenAICodexSubscriptionRoutingModel()`.
- Remove `applyOpenAICodexSubscriptionInitialPin()`.
- Remove `preferredCodexRoutingModel` construction from `mapChatCompletionsRequest()` and `mapResponsesRequest()`.
- Remove `fallbackAllowEndpoints` from `BridgeExecutionPlan` if it is only needed by Codex-first pinning.
- Simplify `routeExecutionRequest()` so retry/reroute uses the original provider-agnostic `plan.routingRequest.allowEndpoints` plus `denyEndpoints`, not a Codex-pin fallback pool.

Expected behavior:

- `difficulty.remote-only` with DeepSeek and GPT both capability-eligible keeps both endpoint IDs in `routingRequest.allowEndpoints`.
- No provider family gets first-attempt priority because of prompt text, tool count, or endpoint id markers.

### SP62-U2 Preserve endpoint metadata capability filtering

Change target:

- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/alias-capability-routing.test.ts`
- `/docs/architecture/09-runtime-routing-strategy-interactions.md` if wording needs alignment

Actions:

- Keep `inferChatCompletionsCapabilityRequirements()` and `inferResponsesCapabilityRequirements()` as hard requirement sources.
- Keep modality and hosted-tool filters where they are based on endpoint metadata and active transport contracts.
- Ensure non-text or hosted-tool requests narrow by capability or transport metadata, not by provider name or hardcoded subscription model preference.

Expected behavior:

- Image/file/hosted-tool requests can narrow to Codex only when only Codex declares compatible metadata on the active transport.
- Ordinary function-tool requests remain broadly routable across compatible endpoints.

### SP62-U3 Keep routing model guidance advisory

Change target:

- `/role-model-router/packages/core/src/router.ts`
- `/role-model-router/packages/core/test/routing-intent.test.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`

Actions:

- Preserve existing core behavior where `routingModelRank` adds a bounded scoring delta.
- Ensure host bridge never transforms advisory `routingModel.preferredEndpointIds` into hard `allowEndpoints` unless the endpoint list came from explicit user/operator policy.
- If controller guidance includes `preferredEndpointIds`, pass it as routing-model preference only.

Expected behavior:

- Preferred endpoint IDs affect scoring and diagnostics.
- Non-preferred endpoints remain eligible and scored when otherwise compatible.

### SP62-U4 Update tests and remove obsolete assertions

Change target:

- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/alias-capability-routing.test.ts`
- `/role-model-router/packages/core/test/routing-intent.test.ts`

Actions:

- Replace the current test asserting Codex pinning with tests asserting provider-agnostic candidate preservation.
- Add source-guard tests that fail while `applyOpenAICodexSubscriptionInitialPin`, `resolveOpenAICodexSubscriptionRoutingModel`, or Codex-specific routing preference helpers remain.
- Add decision-level tests showing DeepSeek and GPT are both eligible and scored for ordinary tool/code alias requests when both endpoints declare required capabilities.
- Add guard tests showing hard capability filters still work when endpoint metadata makes only one endpoint compatible.

Expected behavior:

- Current implementation fails the new tests before production changes.
- Minimal implementation passes by removing provider-specific routing policy, not by adding DeepSeek-specific counter-preferences.

### SP62-U5 Update telemetry, docs, and durable memory

Change targets:

- `/.recursive/DECISIONS.md`
- `/.recursive/STATE.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/docs/architecture/09-runtime-routing-strategy-interactions.md`
- request-detail and validation docs if current wording still implies Codex-first routing

Actions:

- Supersede the old decision that Codex Subscription should be pinned first.
- Record the corrected rule: provider-specific adapter execution is allowed after selection; provider-specific routing preference is not allowed.
- Ensure docs say benchmark/measured performance and endpoint metadata drive routing.
- Ensure request-detail examples explain `POLICY_DENY_ENDPOINT` only for true policy or eligibility filters.

Expected behavior:

- Durable memory no longer instructs future runs to reintroduce Codex-first pinning.

## Strict TDD Plan

TDD Mode: strict

### RED 1: host bridge keeps mixed alias pool for ordinary tool/code turns

Test file:

- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`

Test intent:

- A `difficulty.remote-only` chat-completions request with a function tool and code-oriented prompt should keep both DeepSeek and GPT endpoint IDs in `routingRequest.allowEndpoints` when both declare `text.chat` and `tools.function_calling`.

Expected RED failure before implementation:

- Current result is GPT-only `allowEndpoints`.
- Current result contains `fallbackAllowEndpoints`.

Expected GREEN behavior:

- `routingRequest.allowEndpoints` contains both endpoint IDs.
- `fallbackAllowEndpoints` is absent.
- No Codex-specific `routingModel` is synthesized by the host bridge.

Command:

```powershell
corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts -t "keeps ordinary tool code aliases provider agnostic"
```

### RED 2: no source-level Codex routing pin remains

Test file:

- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`

Test intent:

- Source guard fails if routing-layer code still contains Codex-specific pinning helpers.

Forbidden patterns:

- `applyOpenAICodexSubscriptionInitialPin`
- `resolveOpenAICodexSubscriptionRoutingModel`
- `shouldPreferOpenAICodexSubscriptionForTurn`
- `preferredCodexRoutingModel`
- `fallbackAllowEndpoints` if it is no longer used for a generic retry/reroute mechanism

Expected RED failure before implementation:

- Current source contains those helpers.

Command:

```powershell
corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts -t "does not contain provider-specific routing pin helpers"
```

### RED 3: decision-level route keeps both endpoints eligible

Test file:

- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`

Test intent:

- A mapped `difficulty.remote-only` request routed through `routeRuntimeRequest()` should produce eligibility entries where both DeepSeek and GPT remain eligible for ordinary tool/code requests.

Expected RED failure before implementation:

- DeepSeek is excluded with `POLICY_DENY_ENDPOINT`.

Expected GREEN behavior:

- DeepSeek and GPT are both eligible.
- Scored candidates include both endpoint IDs.
- The winner is determined by benchmark or measured scoring, not hard provider preference.

Command:

```powershell
corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts -t "scores all compatible endpoints for ordinary tool code aliases"
```

### GREEN guard 4: capability metadata can still narrow hard requirements

Test file:

- `/role-model-router/apps/runtime-host-bridge/test/alias-capability-routing.test.ts`

Test intent:

- Non-text, structured-output, reasoning-control, and hosted-tool cases still narrow by declared metadata.

Expected behavior:

- DeepSeek is excluded only when declared endpoint metadata cannot satisfy the request.
- Exclusion diagnostics name the real missing capability or modality.
- No test expectation relies on provider name alone.

Command:

```powershell
corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/alias-capability-routing.test.ts
```

### GREEN guard 5: core router advisory preference remains bounded

Test file:

- `/role-model-router/packages/core/test/routing-intent.test.ts`

Test intent:

- A preferred endpoint receives only the existing bounded routing-model score delta.
- A non-preferred endpoint with stronger benchmark or measured performance can still win.

Expected behavior:

- `ROUTING_MODEL_PREFERENCE_APPLIED` appears only as a selection reason for an actually preferred winner.
- Non-preferred candidates are not excluded.

Command:

```powershell
corepack pnpm --filter @role-model-router/core exec vitest run test/routing-intent.test.ts
```

## Verification Plan

### Automated verification

Run targeted tests:

```powershell
corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts -t "provider agnostic|routing pin|ordinary tool code aliases|compatible endpoints"
corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/alias-capability-routing.test.ts
corepack pnpm --filter @role-model-router/core exec vitest run test/routing-intent.test.ts
```

Run package and local CI checks:

```powershell
corepack pnpm --filter @role-model-router/runtime-host-bridge build
corepack pnpm --filter @role-model-router/runtime-host-bridge test
corepack pnpm run runtime:test-critical
corepack pnpm run ci:check
```

If `ci:check` is too broad for local timeout, record the failure mode and run the repo-owned closest equivalent command set, then do not claim full local CI.

### Rebuilt runtime verification

Rebuild the packaged runtime from this worktree:

```powershell
corepack pnpm --filter @role-model-router/runtime-host-bridge build
corepack pnpm run runtime:package
```

Launch the rebuilt runtime on `127.0.0.1:3456`.

Before launch:

- Record all role-model-runtime processes.
- Stop old runtime processes not matching the current worktree binary.
- Verify there is exactly one runtime process serving `:3456`.

After launch:

- Record `/healthz`.
- Record `/api/version` or the equivalent runtime version endpoint.
- Record executable path and binary hash.

### Live Pi CLI verification

Use the real Pi CLI and the repo-owned `pi-role-model` path. Do not use curl-only or handcrafted request scripts as substitutes.

Use canonical aliases and exact model IDs:

- `difficulty.remote-only`
- `baseline.remote-only`
- `chatgpt/gpt-5.4`
- `deepseek/deepseek-v4-pro`

Required Pi scenarios:

- Pi simple alias request expected to remain eligible for both endpoints and route according to scoring.
- Pi hard/tool/code alias request expected to keep DeepSeek eligible and scored even if GPT wins on benchmark or measured quality.
- Pi exact GPT request expected to execute through native Codex Responses adapter.
- Pi exact DeepSeek request expected to execute through the DeepSeek provider path.
- Pi alias request after any induced fallback/cooldown expected to reroute through generic cooldown/deny logic, not a Codex-specific fallback pool.

Required Pi evidence:

- Pi CLI stdout/stderr logs.
- Runtime request IDs.
- Request detail JSON.
- Router decision JSON.
- Telemetry rows.
- Eligibility summary showing no DeepSeek `POLICY_DENY_ENDPOINT` when DeepSeek satisfies request metadata.

### Live Craft verification

Use the real Craft runtime/client path. Do not mix Pi and Craft in the same session.

Use canonical aliases and exact model IDs:

- `difficulty.remote-only`
- `baseline.remote-only`
- `chatgpt/gpt-5.4`
- `deepseek/deepseek-v4-pro`

Required Craft scenarios:

- Craft simple alias request.
- Craft hard/tool/code alias request.
- Craft exact GPT request.
- Craft exact DeepSeek request.

Required Craft evidence:

- Craft request logs.
- Runtime request IDs.
- Request detail JSON.
- Router decision JSON.
- Telemetry rows.
- Eligibility summary showing provider-agnostic candidate treatment.

### Live pass criteria

- Alias resolution for `difficulty.remote-only` includes both configured endpoint families when both are routable.
- Capability eligibility includes both endpoints for ordinary function-tool requests when both declare support.
- DeepSeek is not excluded by `POLICY_DENY_ENDPOINT` unless a real policy, cooldown, modality, role, task, exact-model, or capability constraint applies.
- If GPT wins, decision evidence cites benchmark, measured quality, latency, cost, or strategy scoring rather than hard provider preference.
- If DeepSeek wins, telemetry records provider `deepseek` and does not classify LiteLLM as the provider.
- Exact GPT still uses provider `openai`, vendor or execution surface `chatgpt-codex-responses`, and adapter `codex-subscription-responses`.
- Exact DeepSeek still uses provider `deepseek` and the configured OpenAI-compatible or LiteLLM-backed execution path.
- Streaming remains supported after routing and does not become an eligibility criterion.

## Out of Scope

- No upstream Pi code changes.
- No upstream Craft code changes.
- No new aliases invented for verification.
- No DeepSeek-specific counter-preference.
- No Codex-specific routing preference under another name.
- No removal of the native Codex Responses adapter.
- No fake benchmark or measured-performance data to force a desired route.

## Requirement Completion Status

- R0 | Status: planned | Changed Files: expected host bridge routing-plan code, host bridge tests, core advisory-routing tests if needed, and docs/memory updates. | Scope Decision: provider-specific execution families remain, provider-specific routing preference is removed. | Addendum: addendum-16.
- R1 | Status: planned | Changed Files: expected host bridge request mapping only where it currently converts provider-specific heuristics into policy. | Scope Decision: shared contract carries semantics, not provider preference. | Addendum: addendum-16.
- R2 | Status: planned | Changed Files: no upstream Pi or Craft changes. | Verification Evidence: real Pi CLI and real Craft runtime requests after rebuild. | Addendum: addendum-16.
- R3 | Status: planned | Changed Files: no LiteLLM provider preference changes unless tests reveal vendor/provider metadata needs correction. | Scope Decision: LiteLLM remains vendor/execution path, not provider. | Addendum: addendum-16.
- R4 | Status: planned | Changed Files: no Codex adapter removal; only pre-selection Codex routing pin removal. | Scope Decision: Codex execution is selected by endpoint result, not routing privilege. | Addendum: addendum-16.
- R8 | Status: planned | Changed Files: request detail or telemetry code only if current receipts cannot show provider-agnostic eligibility and scoring. | Verification Evidence: router decisions and request detail JSON from rebuilt runtime. | Addendum: addendum-16.
- R10 | Status: planned | Verification Evidence: rebuilt runtime on `127.0.0.1:3456`, process-isolation proof, real Pi CLI logs, real Craft logs, telemetry rows, and router decisions. | Addendum: addendum-16.
- R11 | Status: planned | Verification Evidence: local CI or explicitly documented closest equivalent if local CI exceeds runtime constraints. | Addendum: addendum-16.
- R12 | Status: planned | Changed Files: `/.recursive/DECISIONS.md`, `/.recursive/STATE.md`, and `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md` in late phases. | Scope Decision: supersede old provider-specific pinning memory. | Addendum: addendum-16.

## Coverage Gate

- [x] Plan removes provider-specific routing preference and hard allow-list rewriting.
- [x] Plan preserves metadata-based hard eligibility filters.
- [x] Plan preserves native Codex execution after endpoint selection.
- [x] Plan includes strict RED tests that fail against current behavior.
- [x] Plan includes safeguards for core advisory routing.
- [x] Plan includes rebuilt-runtime verification.
- [x] Plan includes real Pi CLI verification.
- [x] Plan includes real Craft verification.
- [x] Plan includes process isolation on `:3456`.
- [x] Plan includes late-phase durable memory and decision cleanup.

Coverage: PASS

## Approval Gate

- [x] Plan is specific and verifiable.
- [x] Plan is provider-agnostic and does not replace one hardcoded preference with another.
- [x] Plan is TDD-backed and requires RED evidence before production changes.
- [x] Plan preserves downstream compatibility for Pi and Craft without modifying their upstream code.
- [x] Plan is ready for implementation.

Approval: PASS

Audit Execution Mode: self-audit
Subagent Availability: available through `multi_agent_v1` after tool discovery, but not authorized for this request
Subagent Capability Probe: `tool_search` exposed `multi_agent_v1`, whose policy says not to spawn subagents unless the user explicitly asks for delegation or parallel agent work
Delegation Decision Basis: the addendum is a planning artifact requested by the user; direct source evidence and live-runtime decisions were sufficient for the plan
Delegation Override Reason: spawning would violate the discovered multi-agent tool policy because the user did not request subagents
Audit Inputs Provided: addendum 16 root cause, locked run-62 requirements and plan, addenda 14 and 15, source refs listed in Inputs, current live decision evidence, and git-history evidence for commit `3d053368`

## Subagent Contribution Verification

- Reviewed Action Records: none.
- Main-Agent Verification Performed: checked plan against root-cause addendum, source paths, existing tests, architecture docs, live decision facts, and durable memory conflicts.
- Acceptance Decision: self-audit accepted.
- Refresh Handling: no delegated context to refresh.
- Repair Performed After Verification: plan explicitly added late-phase memory/decision cleanup and live Pi/Craft verification gates.

Audit: PASS
