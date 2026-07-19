Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `00 Requirements`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/RECURSIVE.md`
- `/.codex/AGENTS.md`
- `/.agent/PLANS.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/.recursive/memory/domains/pi-role-model-package.md`
- `docs/architecture/13-litellm-pi-role-model-integration-proposal.md`
- `docs/architecture/11-runtime-ui-telemetry-graph-matrix.md`
- `/.recursive/run/50-openai-codex-subscription/00-requirements.md`
- `/.recursive/run/50-openai-codex-subscription/03-implementation-summary.md`
- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/00-requirements.md`
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/00-requirements.md`
- `/.recursive/run/52-codex-subscription-benchmark-tool-path/03-implementation-summary.md`
- `/.recursive/run/55-pi-role-model-package/03-implementation-summary.md`
- `/.recursive/run/56-pi-role-model-gap-closure/03-implementation-summary.md`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/openai-codex-subscription-matrix.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/craft-ask-difficulty.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/alias-capability-routing.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/downstream-openai-discovery.test.ts`
- `role-model-router/packages/adapter-execution/src/index.ts`
- `role-model-router/packages/provider-openai/src/index.ts`
- `role-model-router/packages/provider-litellm/src/index.ts`
- `role-model-router/packages/vendor-litellm/src/index.ts`
- `role-model-router/packages/runtime-observability/src/index.ts`
- `role-model-router/packages/sqlite-memory/src/index.ts`
- `packages/pi-role-model/src/runtime-discovery.ts`
- `packages/pi-role-model/src/runtime-inspection.ts`
- Pi upstream `packages/ai/src/types.ts` from `https://github.com/earendil-works/pi/tree/main/packages/ai`
- Pi upstream `packages/ai/src/api/openai-codex-responses.ts` from `https://github.com/earendil-works/pi/tree/main/packages/ai`
- Pi upstream `packages/ai/src/api/openai-responses-shared.ts` from `https://github.com/earendil-works/pi/tree/main/packages/ai`
- LiteLLM upstream docs and source:
  - `https://docs.litellm.ai/docs/routing`
  - `https://docs.litellm.ai/docs/proxy/reliability`
  - `https://docs.litellm.ai/docs/proxy/config_settings`
  - `https://github.com/BerriAI/litellm/blob/main/litellm/router.py`
- user guidance in chat on `2026-07-07`:
  - the new run must be grounded in actual `role-model`, Pi, and LiteLLM code rather than assumptions
  - Pi behavior for provider integrations, especially Codex Subscription semantics, should be treated as the authoritative behavioral reference where applicable
  - `role-model` must not patch Pi or Craft; it must correctly accept and translate their routed requests
  - tool-bearing, multimodal, timeout, quota, fallback, and continuation behavior must work end to end for the `difficulty.remote-only` alias
  - regressions must be caught by a durable, high-volume request suite and richer tracing
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/00-requirements.md`
Scope note: This run hardens the routed execution contract and provider-family implementations so `role-model` can accept Pi and Craft agent requests without lossy translation, preserve capability-sensitive behavior across LiteLLM-backed and Codex-Subscription-backed execution, bound request growth, and verify the result with durable high-volume end-to-end regression coverage.
Status: `LOCKED`
LockedAt: `2026-07-07T17:54:39Z`
LockHash: `035b70365214ea07fb09ba102b792cea113c071c9415b084c383202ccee31b0a`

## TODO

- [x] Pick a stable run id for the integration-hardening slice
- [x] Record the proposal doc as the repo-owned primary design input
- [x] Record Pi as the authoritative behavioral reference for provider-semantic coverage where applicable
- [x] Capture the execution-family split between LiteLLM-managed providers and native Codex Subscription execution
- [x] Convert the current integration gaps into concrete `R#` requirements
- [x] Capture request-growth, fallback, tool, reasoning, and continuation requirements
- [x] Capture the requirement for durable Pi and Craft end-to-end regression coverage
- [x] Capture rebuilt-runtime verification and CI expectations
- [x] Bound the run away from Pi/Craft upstream patches and unrelated UI work

## Run Metadata

- Priority: `P0`
- Run type: `backend integration and routed execution hardening`
- Primary subsystems:
  - `role-model-router/apps/runtime-host-bridge/**`
  - `role-model-router/packages/adapter-execution/**`
  - `role-model-router/packages/provider-openai/**`
  - `role-model-router/packages/provider-litellm/**`
  - `role-model-router/packages/vendor-litellm/**`
  - `role-model-router/packages/catalog/**`
- Secondary subsystems:
  - `packages/pi-role-model/**`
  - `role-model-router/apps/runtime-ui/**`
  - `role-model-router/packages/core/**`
  - `role-model-router/packages/protocol-routing/**`
- User-visible outcome:
  - requests routed through `difficulty.remote-only` work correctly from Pi and Craft across the configured DeepSeek or LiteLLM-backed path and the configured Codex Subscription path, including tool use, non-text capability routing, continuation, retry, fallback, and subscription execution
- Main risk theme:
  - repairing Codex Subscription or Pi/Craft ingress behavior in an ad hoc way could regress generic LiteLLM-backed providers, DeepSeek execution, or routed tool semantics

## Relevant Prior Runs

| Run | Why it matters here |
| --- | --- |
| `50-openai-codex-subscription` | introduced the `OpenAI` plus `Codex Subscription` operator model and the auth-boundary decisions that this run must preserve while making execution actually work |
| `51-runtime-testing-architecture-and-regression-matrix` | established the repo expectation that risky runtime behavior needs durable regression coverage rather than one-off manual checks |
| `52-codex-subscription-benchmark-tool-path` | repaired an earlier Codex Subscription tool-registry defect and demonstrates that request-scoped tool handling is part of the durable Codex execution boundary |
| `55-pi-role-model-package` | created the Pi package and the external-runtime contract that this run must continue to honor without moving runtime ownership into Pi |
| `56-pi-role-model-gap-closure` | completed Pi discovery, trust, auth-fail-closed, and alias semantics, making Pi a first-class downstream integration whose request semantics must be preserved |

## Source Requirement Inventory

| Source | Contribution to this run |
| --- | --- |
| `docs/architecture/13-litellm-pi-role-model-integration-proposal.md` | repo-owned proposal for the correct architectural split between LiteLLM, native Codex Subscription handling, and the richer `role-model` execution contract |
| `docs/architecture/11-runtime-ui-telemetry-graph-matrix.md` | canonical telemetry analytics and request-ledger data flow that this run must extend instead of bypassing with a parallel trace system |
| `/.recursive/STATE.md` | current truth about tool-choice preservation, fallback cooldowns, Codex Subscription routing, advisory bootstrap behavior, and runtime readiness |
| `/.recursive/DECISIONS.md` | current durable record of the recent Codex Subscription, Pi, fallback, and routing fixes and the still-open seams around execution behavior |
| `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md` | durable truths about alias routing, capability claims, Codex Subscription semantics, tool-choice preservation, fallback cooldowns, and validation norms |
| `/.recursive/memory/domains/pi-role-model-package.md` | durable truths about how Pi injects metadata, what Pi owns, and what the runtime must preserve |
| prior runs `50`, `52`, `53`, `55`, `56` | concrete implementation and validation history for the exact integration, telemetry, and verification surfaces this run will touch |
| Role Model execution source files | current routed execution contract, provider adapters, LiteLLM vendor config, Codex-native path, request-regression harness, and telemetry persistence implementation that this run must inspect before planning |
| Current runtime-host regression anchors | the real checked-in validation floor for remote-only execution, Codex Subscription behavior, downstream alias capability routing, and Craft ask-mode/image ingress semantics |
| `packages/pi-role-model/src/runtime-discovery.ts` and `packages/pi-role-model/src/runtime-inspection.ts` | current Pi-side compatibility contract for downstream discovery and structured request/decision inspection surfaces |
| Pi `packages/ai` source files | authoritative downstream/provider behavior for stream options, reasoning or thinking, tool-call identity, Codex Responses transport, continuation, cache affinity, and payload inspection hooks |
| LiteLLM docs and `router.py` source | authoritative upstream behavior for router settings, retries, fallback groups, cooldowns, context-window pre-checks, and provider translation capabilities |
| user guidance on `2026-07-07` | fixed constraints: no Pi/Craft patching, Pi semantics authoritative where relevant, durable tracing, durable end-to-end coverage, and no shallow one-off fixes |

## Mandatory Codebase Grounding

Phase 1 must cite line-level evidence from the concrete code paths listed in `Inputs` before Phase 1.5 or Phase 2 can pass. At minimum, Phase 1 must inspect and summarize:

- Role Model's current `RuntimeExecutionRequest`, provider request builders, native Codex Subscription execution path, LiteLLM config renderer, runtime telemetry snapshot, observation bundle, SQLite telemetry schema or migration code, and the structured inspection routes consumed by Pi: `GET /api/role-model/requests`, `GET /api/role-model/requests/:id`, and `GET /api/role-model/router/decisions/:requestId`
- the current checked-in runtime-host regression anchors for this surface area, including `validate-vendors`, `openai-codex-subscription-matrix`, `craft-ask-difficulty`, `alias-capability-routing`, and `downstream-openai-discovery`
- Craft's current downstream ingress semantics as exercised by checked-in repo fixtures for ask-mode preambles, declared tool schemas, active tool turns, and inline image payloads
- Pi's `runtime-discovery.ts` and `runtime-inspection.ts` package files alongside Pi's provider-layer sources, so request inspection and downstream discovery compatibility are grounded in actual package code rather than inferred from docs
- Pi's `StreamOptions`, `SimpleStreamOptions`, model compatibility metadata, thinking or reasoning content types, tool-call identity handling, OpenAI Responses conversion, Codex Responses request body construction, transport fallback, cached WebSocket continuation, and prompt-cache/session-affinity handling
- LiteLLM's documented and source-backed router settings for retries, fallbacks, cooldowns, context-window pre-checks, routing groups, and model/deployment selection

If upstream Pi or LiteLLM source is read from a checkout or remote URL, Phase 1 must record the commit SHA, tag, or retrieval date. If the current upstream source differs from the local `.tmp/pi-ref` snapshot, the current upstream source wins unless Phase 1 records a concrete reason to pin the older snapshot.

## Authoritative Reference Contract

1. The repo-owned primary architecture input for this run is:
   - `docs/architecture/13-litellm-pi-role-model-integration-proposal.md`
2. Pi is the authoritative behavioral reference for provider-facing request semantics that `role-model` must preserve for downstream agents, including:
   - reasoning or thinking controls
   - tool-call and continuation semantics
   - session or replay-sensitive behavior
   - Codex Subscription transport distinctions
3. LiteLLM upstream docs and code are the authoritative reference for what LiteLLM can already own well:
   - provider translation
   - retry and fallback primitives
   - routing groups and router settings
   - prompt-caching and reasoning normalization where supported upstream
4. `role-model` remains the authoritative owner of:
   - request capability inference
   - alias selection and endpoint eligibility
   - the routed execution contract between downstream clients and provider adapters
   - provider-family boundaries
   - session or replay state needed to keep routed requests valid across turns and fallbacks
5. Codex Subscription execution remains a dedicated native runtime path and must not be flattened into the generic LiteLLM execution family solely for convenience.
6. Existing runtime tracing destinations are split into two canonical surface families and this run must preserve that split:
   - telemetry ledger and analytics:
     - `packages/runtime-observability/**`
     - `runtime_telemetry_records`
     - `GET /api/role-model/telemetry/requests`
     - `POST /api/role-model/telemetry/query`
   - structured request detail and Pi inspection compatibility:
     - `runtime_observations`
     - `GET /api/role-model/requests`
     - `GET /api/role-model/requests/:id`
     - `GET /api/role-model/router/decisions/:requestId`
     - router-decision/request-detail payload compatibility fields such as `observeRequestPath`
     - canonical request-detail UI routes such as `/app/observe/requests` and `/app/observe/requests/:requestId`
7. Precedence for conflicts is:
   - this run artifact and later approved addenda
   - provider-family-native contract constraints
   - downstream-visible semantics expected by Pi and Craft
   - implementation convenience
8. If Pi behavior and a provider-native contract appear to conflict, the runtime must preserve the downstream-visible behavior as far as possible without violating the provider-native contract, and the exact compromise must be recorded explicitly in Phase 1.5 and Phase 2.
9. Structured inspection compatibility consumed by `packages/pi-role-model/src/runtime-inspection.ts` is part of this run's contract. Changes to request/decision inspection routes must remain backward compatible or Phase 2 must record and justify the coordinated Pi package change explicitly.
10. Test harnesses, validators, discovery surfaces, capability resolvers, provider-list exposure, hosted-tool/web-search capability checks, and exact-family probes must not define Codex Subscription behavior by a fixed model id or scattered hardcoded subscription model constants. They must derive those facts from runtime endpoint capability metadata, provider-family metadata, the same alias or endpoint registry surfaces used by production routing, and at most one explicitly owned compatibility layer when Phase 2 records why metadata alone is insufficient.

## Contract-First Delivery Rule

Implementation for this run must follow this order:

1. requirements contract
2. AS-IS analysis of current Pi ingress, Craft ingress, generic adapter execution, LiteLLM adapter shaping, native Codex Subscription execution, and request-size growth behavior
3. mandatory `01.5-root-cause.md` documentation for each distinct failure family discovered during Phase 1
4. failing automated tests for the next smallest production slice
5. production fixes in the narrowest owning layer
6. focused regression suites per owning layer
7. high-volume end-to-end request verification through Pi and Craft
8. rebuilt-runtime live verification and CI confirmation

No production slice may be "fixed" only at the Pi-specific or Craft-specific edge when the root cause belongs in the shared routed execution contract or provider adapter layer.

## Fixed Decisions

1. Pi and Craft are downstream clients, not the place to patch runtime execution defects for this run.
2. Codex Subscription stays a native runtime execution family rather than being collapsed into the generic LiteLLM provider path.
3. LiteLLM should own broad provider translation and router capabilities where upstream already supports them well; `role-model` should not reimplement that generic coverage without cause.
4. `role-model` must own the richer semantic execution contract needed to preserve routed agent behavior across providers and turns.
5. Tool-bearing, image-bearing, file-bearing, and reasoning-sensitive requests must influence endpoint eligibility before routing rather than failing late after selection.
6. Timeout, quota, provider-auth, and transport failures are routing-relevant execution events and must not be treated as UI-only incidents.
7. Fixes must protect DeepSeek or other LiteLLM-backed execution from regressions while improving Codex Subscription behavior.
8. Final verification is invalid without live Pi and Craft request traffic against a rebuilt runtime plus passing local and GitHub CI.
9. This debugging-heavy run requires a non-skipped `01.5-root-cause.md`.
10. Traceability for this run must extend the canonical telemetry and request-ledger system, not create a parallel ad hoc trace store.

## Assumptions

- The current `difficulty.remote-only` alias remains the main live verification target unless Phase 1 proves a narrower alias is required for deterministic debugging.
- Pi and Craft already send enough information for correct routing and execution when the runtime preserves their payload semantics instead of dropping or mis-shaping them.
- Some provider families will continue to need different continuation or replay handling even when they share OpenAI-compatible surface syntax.
- Payload growth for Codex Subscription is fixable through root-cause analysis and contract or replay shaping; it should not be accepted as an unavoidable property of the integration.

## Constraints

- Do not patch Pi upstream or Craft upstream as part of this run.
- Do not widen the run into unrelated runtime UI redesign or general provider onboarding work.
- Do not replace the native Codex Subscription execution family with a shallow OpenAI-compatible wrapper.
- Do not solve provider-specific semantics only in logging or diagnostics; the routed execution path itself must be corrected.
- All production changes must follow strict TDD with explicit RED and GREEN evidence.
- The run must produce durable end-to-end request suites and tracing so the same failure families are catchable in future runs.
- Do not record raw auth tokens, refresh tokens, secret headers, or full sensitive file bodies in telemetry or debugging traces.
- Do not introduce a second tracing database, log silo, or UI-only inspection path when the existing canonical telemetry, observation, and request-detail system can carry the needed facts.
- Do not hardcode a fixed subscription model version or scattered curated matrix rows as the Codex Subscription contract for routing, capability claims, provider exposure, or regression classification; if a temporary compatibility allowlist remains, it must have one explicit owning source and a Phase 2 rationale.
- Do not leave regression fixtures, request validators, discovery tests, or local smoke harnesses with hardcoded Codex Subscription model constants when they are asserting subscription-family behavior. Exact endpoint probes may be allowed only when the test name and fixture explicitly state that they are testing an operator-configured exact endpoint rather than the subscription contract.

## Requirements

### `R0` Preserve explicit execution families and their ownership boundaries

Description:
The runtime must keep a clear boundary between LiteLLM-managed remote execution, native Codex Subscription execution, and any remaining provider-native paths so that provider-sensitive semantics are handled in the correct layer.

Acceptance criteria:
- Phase 1 identifies the current execution families and the owning files for each
- Phase 2 records which semantics are shared through the generic execution contract versus which remain family-specific
- production changes do not collapse the native Codex Subscription path into the generic LiteLLM path
- production changes do not introduce Pi-only or Craft-only execution logic where the owning layer should be shared runtime code

### `R1` Expand the routed execution contract so ingress semantics are not lost

Description:
The generic routed execution contract must carry the semantic information needed for Pi, Craft, LiteLLM-managed providers, and native Codex Subscription execution without dropping capability-sensitive fields before adapter execution begins.

Acceptance criteria:
- the execution contract can represent at minimum:
  - reasoning or thinking intent
  - tool-choice intent
  - session or cache affinity
  - provider replay or continuation state
  - transport preference where relevant
  - multimodal content or tool-result content needed for valid continuation
  - idempotency and duplicate-side-effect protection context for retry, reroute, and continuation decisions
- Phase 1 documents which currently observed ingress semantics are being discarded today
- Phase 3 adds regression coverage that fails before the contract is expanded
- the contract changes are implemented in the shared runtime layer rather than in downstream-client-specific hacks

### `R2` Preserve Pi and Craft ingress semantics through runtime-host translation

Description:
The runtime host bridge must preserve the relevant semantics present in Pi and Craft payloads when it translates them into the shared execution contract.

Acceptance criteria:
- Phase 1 inventories the current Pi and Craft payload shapes used for:
  - plain chat
  - tool-bearing requests
  - image or file-bearing requests
  - continuation after tool output
  - reasoning-sensitive requests
- translation tests prove those payloads preserve the required execution semantics instead of degrading to text-only or tool-lossy requests
- tool-choice handling remains valid across initial tool-bearing turns and continuation turns
- translation logic remains shared runtime behavior and does not require changes in Pi or Craft to make the runtime function correctly

### `R3` Upgrade the LiteLLM execution path to use LiteLLM for the things it already does well

Description:
The LiteLLM-backed execution family must stop behaving like a thin OpenAI-shaped wrapper when upstream LiteLLM already provides richer routing, retry, fallback, reasoning, caching, or response-shaping support.

Acceptance criteria:
- Phase 1 documents the current LiteLLM underuse in:
  - request shaping
  - `/responses` or chat mode selection
  - tool-choice forwarding
  - reasoning or thinking forwarding
  - cache-affinity use
  - generated router settings
- Phase 1 compares the current `provider-litellm` and `vendor-litellm` implementation against upstream LiteLLM support for:
  - `router_settings`
  - `num_retries`
  - `fallbacks`
  - `allowed_fails`
  - `cooldown_time`
  - retry policies by failure class
  - context-window pre-call checks
  - model groups or deployment groups
  - provider translation for tool choice, reasoning, cache, and response shaping
- Phase 2 identifies which capabilities should be delegated to LiteLLM versus retained in `role-model`
- Phase 2 records a concrete `renderLiteLLMConfig` target shape for any LiteLLM router settings this run adopts, and records explicit non-adoption reasons for any upstream LiteLLM capability left unused
- provider-litellm and vendor-litellm regression tests fail before the fix and pass after it
- changes improve shared LiteLLM-backed execution without regressing DeepSeek or other currently working remote providers

### `R4` Preserve native Codex Subscription semantics as a first-class execution family

Description:
The native Codex Subscription path must support the same behavioral surface that downstream agents expect from a functioning routed execution target, including tool use, non-text capability routing, reasoning-sensitive turns, and continuation safety.

Acceptance criteria:
- capability-sensitive requests that need Codex-compatible image, file, or tool behavior can be routed to eligible configured Codex Subscription endpoints before incompatible fallbacks are considered
- Codex Subscription eligibility is determined by endpoint capability metadata and provider-family constraints, not by hardcoded model-version checks
- Codex Subscription tests and request-regression fixtures derive eligible subscription targets from runtime capability metadata or explicit test fixture endpoint metadata rather than hardcoded subscription model constants
- provider-list exposure and capability claims such as hosted web search or function-tool support for Codex Subscription are derived from runtime endpoint/provider-family metadata or one explicitly owned compatibility layer justified in Phase 2, not from scattered hardcoded model checks across multiple layers
- native Codex execution preserves tool registry, tool-call continuity, and provider-sensitive continuation state across turns
- subscription execution no longer fails because the runtime flattened the request into a lossy generic form
- regression tests specifically cover the earlier tool-choice, request-scoped tool registry, and continuation failure families for the native Codex path
- any compromise between Pi-visible behavior and Codex-native contract limitations is explicitly recorded in Phase 1.5 and validated in Phase 4 instead of being hidden as implicit drift

### `R5` Bound and fix request-size growth through root-cause repair

Description:
The run must root-cause why Codex Subscription payloads grow so large and repair the owning replay or continuation logic rather than accepting pathological payload growth as normal.

Acceptance criteria:
- Phase 1 measures payload growth at each relevant hop:
  - ingress payload
  - translated execution payload
  - provider-family payload
  - continuation or retry payload
- payload measurement distinguishes:
  - canonical uncompressed JSON bytes for semantic growth comparison
  - actual transport bytes where the provider path uses compression or a non-HTTP frame
  - logical input item count where a provider-native continuation protocol uses previous-response or delta semantics
- Phase 1 identifies the concrete cause or causes of pathological growth
- Phase 2 records the chosen repair strategy and why it is correct
- tests fail before the repair and prove the bounded payload behavior after the repair
- for a same-attempt retry with no new user, assistant, or tool-result content, the serialized provider-family request payload may grow by no more than `5%` or `8 KiB`, whichever is smaller
- for a continuation that appends exactly one new assistant/tool-result unit, the serialized provider-family request payload may grow by no more than the serialized size of the newly appended unit plus `10%` or `16 KiB`, whichever is smaller
- for provider-native delta continuation, Phase 4 must prove both the full canonical body and the actual sent delta or previous-response body remain bounded and must record the relationship between full context, delta input, previous response id, and wire bytes
- if a provider-native protocol requires additional replay scaffolding beyond those bounds, Phase 1.5 and Phase 2 must document it explicitly and Phase 4 must prove the exception is both necessary and bounded
- Phase 2 records the measurement formula per execution family and continuation mode, including replay-append, previous-response or delta, and compressed-wire variants, so the bounds remain comparable and mechanically verifiable across families
- post-fix tracing records payload-size metrics at the relevant execution hops through the canonical telemetry or observation system so future regressions are observable in request detail and analytics-adjacent inspection

### `R6` Make retry, reroute, and cooldown behavior durable for timeout and quota failures

Description:
Execution failure handling must implement the intended behavior for quick retry, reroute, and temporary routing qualification when timeout, quota, provider-auth, or other fallback-eligible failures occur.

Acceptance criteria:
- same-endpoint quick retry behavior exists for retryable failure classes and is validated by tests
- if the quick retry fails, routing can reroute to another eligible endpoint family when policy allows
- quota-exhausted behavior can fall back across eligible subscription-backed and API-backed endpoints instead of hard-failing when another compatible endpoint exists
- cooldown qualification windows remain explicit, escalating, and test-covered
- invalid-request failures remain terminal and do not get incorrectly masked as retryable or fallback-eligible
- retry or reroute logic explicitly distinguishes:
  - failure before any tool execution became observable
  - failure after a tool call was requested but before a tool receipt was persisted
  - failure after a tool receipt or equivalent side-effect evidence was persisted
- if prior observable tool side effects exist, the retry or reroute path must not duplicate them unless the provider explicitly issues a new tool-call identity and the runtime records that decision
- Phase 2 defines the idempotency identifier model used by retry and reroute logic, including the fields that make a tool call unique across provider families, continuation attempts, and downstream client dialects
- tool side-effect receipts must record at minimum a stable request id, routed attempt id, provider tool-call id when present, normalized tool-call id, tool name, argument hash or redacted summary, execution status, and whether the receipt blocks automatic replay
- Phase 2 maps idempotency and side-effect receipt fields onto the existing `runtime-observability` tooling/executions structures and SQLite persistence path, or records the smallest additive extension required; a parallel receipt store is forbidden
- tests cover provider families that supply provider-native call/item ids and provider families that require runtime-generated normalized ids

### `R7` Protect tool-call semantics across routing, continuation, and fallback

Description:
Tool-capable requests must preserve valid tool behavior from ingress through provider execution and continuation, including cases where a routed request retries, reroutes, or switches provider families.

Acceptance criteria:
- request translation tests cover multiple tool-call shapes from Pi and Craft
- request translation tests cover Pi-style provider call/item identity, Craft-style request-scoped tool schemas, OpenAI-compatible `tool_calls`, Responses-style function-call items, and downstream tool results
- adapter and provider tests cover:
  - initial forced tool choice
  - continuation after tool output
  - reroute after tool-bearing failure
  - requests with no tool use that must not be overclassified as tool-bearing
- the runtime does not implement a Pi-only tool-call dialect; it normalizes multiple downstream shapes into the shared contract
- regression coverage includes the tool-choice failure and the post-routing timeout behavior explicitly called out by the user
- idempotency-tagged test cases prove that retry or reroute paths do not duplicate tool side effects or replay stale tool outputs incorrectly
- request-detail and telemetry evidence for idempotency-tagged cases must show the normalized tool-call id, provider tool-call id when present, side-effect state, and replay or non-replay decision

### `R8` Add end-to-end tracing that makes routed execution failures diagnosable

Description:
The runtime must emit enough tracing and request receipts to diagnose ingress translation, routing, payload growth, retry, reroute, provider execution, and continuation failures without relying on guesswork.

Acceptance criteria:
- the tracing implementation extends the existing canonical runtime telemetry and observation system rather than creating a parallel trace-only pipeline
- each routed request has correlation across:
  - ingress parse
  - capability inference
  - candidate eligibility
  - selected endpoint
  - retry or reroute decisions
  - provider-family request shaping
  - tool continuation or replay decisions
- the minimum telemetry or observation contract records these semantic facts, with exact field names chosen according to existing repo conventions:
  - `sourceClient`
  - `executionFamily`
  - `providerFamily`
  - `adapterFamily`
  - `selectedEndpointId`
  - `selectedModelId`
  - `ingressPayloadBytes`
  - `translatedPayloadBytes`
  - `providerPayloadBytes`
  - `retryCount`
  - `rerouteCount`
  - `failureClass`
  - `cooldownDecision`
  - `idempotencyDecision`
  - `toolSideEffectState`
  - `toolCallCount`
  - `capabilityRequirements`
- Phase 2 maps every minimum telemetry fact to its canonical destination:
   - structured `runtime_telemetry_records` column where the fact is useful for filtering, ranking, charting, or request-ledger summaries
   - `runtime_observations` bundle where the fact is request-detail or debugging context
   - request-detail rendering where operators need to diagnose the failure family
   - telemetry analytics metric or dimension only where aggregate analysis is meaningful
- Phase 2 explicitly separates:
  - telemetry-ledger and analytics compatibility facts surfaced through `runtime_telemetry_records`, `GET /api/role-model/telemetry/requests`, and `POST /api/role-model/telemetry/query`
  - structured request-detail and Pi inspection compatibility facts surfaced through `runtime_observations`, `GET /api/role-model/requests`, `GET /api/role-model/requests/:id`, `GET /api/role-model/router/decisions/:requestId`, `observeRequestPath`, and the canonical Observe request-detail routes
- Phase 2 explicitly classifies each new fact as one of:
   - persisted indexed or filterable `runtime_telemetry_records` column
   - persisted non-indexed `runtime_telemetry_records` JSON or dimensions field
   - observation-bundle-only request-detail context
   - derived UI/API field
- any SQLite schema change must include migration coverage for existing databases, default values for old rows, and tests proving request-ledger reads, request-detail reads, and telemetry-query reads remain backward compatible
- if a fact is intentionally observation-only and not queryable, Phase 2 must state why aggregate filtering or charting is not required for that fact
- payload-size metrics, retry count, reroute count, execution family, failure classification, and idempotency-decision facts are recorded for the execution hops relevant to this run
- those facts are visible through the existing request ledger or request-detail or observation surfaces, and analytics-adjacent inspection can reach them without scraping raw logs
- tracing is usable for both automated test harnesses and live rebuilt-runtime debugging
- the tracing additions do not require modifying Pi or Craft to become useful
- request-detail surface changes remain backward compatible with `packages/pi-role-model/src/runtime-inspection.ts` or the coordinated package change is implemented and cited in the same run
- idempotency and tool-side-effect facts extend the existing observation-bundle and tooling structures rather than creating a second persisted receipt system
- telemetry and observation traces redact or omit:
  - access tokens
  - refresh tokens
  - secret headers
  - full sensitive file bodies
  - full prompt or tool payloads where a compact preview, hash, size, or structured summary is sufficient
- any schema additions required for this run are added to the existing telemetry or observation contract and verified through the current host-bridge, sqlite-memory, runtime-observability, and runtime-ui telemetry paths
- telemetry tests must prove the new facts are visible in at least one structured API or request-detail surface without scraping raw logs, and must prove sensitive body/token redaction for the new payload and idempotency fields

### `R9` Build durable high-volume Pi and Craft regression suites

Description:
The run must produce replayable end-to-end verification that exercises the routed runtime with a large request corpus from both Pi and Craft, rather than relying on a handful of ad hoc prompts.

Acceptance criteria:
- the run defines a canonical request corpus with at least `100` end-to-end cases executed through Pi and at least `100` end-to-end cases executed through Craft
- the run extends real repo-owned harness anchors such as `role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts`, `role-model-router/apps/runtime-host-bridge/test/openai-codex-subscription-matrix.test.ts`, `role-model-router/apps/runtime-host-bridge/test/craft-ask-difficulty.test.ts`, `role-model-router/apps/runtime-host-bridge/test/alias-capability-routing.test.ts`, or records a Phase 2 justification for creating a new canonical harness
- the Pi corpus is executed against the target alias and exact-endpoint or exact-family paths relevant to this run
- the Craft corpus is executed against the same target alias and exact-endpoint or exact-family paths where transport allows; any covered subset must be explicitly justified by transport differences
- Phase 1 maps Craft corpus categories to the checked-in Craft fixture families for ask-mode preambles, declared-tool requests, active tool turns, and inline-image routing, and records any still-uncovered ingress shapes that require new fixtures
- the corpus includes at minimum:
  - plain text chat
  - tool-bearing requests
  - non-tool requests that mention tools
  - image or file-sensitive requests
  - continuation after tool output
  - long-context requests
  - timeout and quota simulation or live equivalents where feasible
  - fallback-eligible failures
- the suite records routing decisions, selected execution family, selected endpoint, completion status, and failure class for each case
- each case result is written to a stable machine-readable artifact with at minimum:
  - case id
  - client kind
  - request path
  - expected execution family
  - actual execution family
  - allowed endpoint set or routing constraint
  - selected endpoint id
  - selected model id
  - provider family
  - adapter family
  - status code or stream terminal status
  - failure class
  - retry count
  - reroute count
  - ingress payload bytes
  - translated payload bytes
  - provider canonical payload bytes
  - provider wire payload bytes when measurable
  - tool-call count
  - tool-execution count
  - idempotency decision
  - request id and routing decision id
- the corpus covers both the Codex Subscription execution family and the DeepSeek or LiteLLM-backed execution family for each downstream client unless Phase 1.5 proves a family is unavailable in the test environment and records the replacement proof
- every corpus case declares:
  - expected execution family
  - allowed endpoint set or routing constraint
  - expected outcome class
  - whether the case is deterministic or live-provider-dependent
- the deterministic subset is committed in the repo and wired into a named local CI command used by this run
- the live-provider subset is committed or generated from committed fixtures and has a named opt-in command with explicit environment prerequisites
- the deterministic CI command must fail on unknown route, unknown execution family, missing telemetry/request-detail receipt, silent timeout, duplicate side-effect receipt, or hardcoded Codex Subscription model selection
- deterministic corpus cases must pass at `100%` for:
  - expected execution-family selection
  - expected outcome class
  - no duplicate side effects in idempotency-tagged cases
- live-provider-dependent success cases must pass at `>=95%` for each client and execution-family slice, not only in aggregate, and any remaining failures must have the expected failure class or an explicitly documented external-provider incident
- live-provider-dependent induced-failure cases must achieve `100%` correct failure classification and expected retry or reroute behavior
- the suite is not allowed to pass with unexplained failures, silent hangs, or unknown routing results

### `R10` Verify live rebuilt-runtime behavior end to end

Description:
The final validation for this run must use a rebuilt runtime and real downstream traffic rather than stopping at unit tests or isolated package-level mocks.

Acceptance criteria:
- the runtime is rebuilt before final end-to-end verification
- live Pi requests and live Craft requests are executed against the rebuilt runtime
- verification proves that `difficulty.remote-only` can route and execute compatible traffic to both the DeepSeek or LiteLLM-backed family and the configured Codex Subscription family where expected
- verification proves the Codex Subscription exact target is selected by configured endpoint capability metadata rather than a hardcoded subscription model constant
- verification includes at least one successful tool-bearing request, one successful non-text-sensitive routing decision, and one successful fallback or retry scenario
- final Phase 4 and Phase 5 artifacts capture the live verification evidence paths
- final verification includes request-detail or telemetry-ledger evidence for the representative live cases, not only console output or raw logs

### `R11` Keep CI and non-targeted provider behavior green

Description:
This run is not complete if it fixes the target integration issues by silently regressing unrelated providers, validators, or CI behavior.

Acceptance criteria:
- focused impacted suites pass locally before widened verification
- required local CI for the touched surfaces passes
- GitHub CI passes for the merged change set
- the final artifact explicitly calls out any intentionally deferred gaps; unknown breakage is not acceptable

### `R12` Update durable repo knowledge after the implementation lands

Description:
Because this run changes durable execution semantics, late-phase artifacts must update the repo-owned decision, state, and memory planes with the new truths and any changed ownership boundaries.

Acceptance criteria:
- Phase 6 updates `/.recursive/DECISIONS.md` with the final architectural and behavior changes
- Phase 7 updates `/.recursive/STATE.md` so the current runtime truth matches the shipped implementation
- Phase 8 reviews the affected memory shards and either updates them or records why no durable change is needed
- if the run changes the durable understanding of Pi, Craft, LiteLLM, Codex Subscription, or routed tool semantics, the corresponding memory impact is explicit rather than implicit

### `R13` Make root-cause analysis a hard gate for this debugging run

Description:
This run is a debugging and hardening effort. It must not proceed from AS-IS analysis to TO-BE planning until root causes have been documented, audited, and locked.

Acceptance criteria:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/01.5-root-cause.md` exists before Phase 2 is created
- Phase 1.5 lists every distinct failure family discovered in Phase 1, including request growth, tool semantics, retry or reroute behavior, telemetry gaps, and provider-family request shaping
- Phase 1.5 records confirmed root causes, rejected hypotheses, evidence commands, and unknowns that remain explicitly deferred
- Phase 2 lists `01.5-root-cause.md` as an input and maps each planned fix back to a confirmed root cause or an explicitly scoped unknown
- Phase 2 must not be accepted if recursive status still reports Phase 1.5 as skipped, missing, draft, or unlocked

## Out of Scope

- patching Pi upstream or Craft upstream to compensate for runtime defects
- unrelated runtime UI restyling or navigation redesign
- new benchmark methodology unrelated to routed execution behavior
- replacing the native Codex Subscription path with a generic LiteLLM-only architecture
- broad provider-catalog cleanup beyond what is required to correctly shape and route the execution families in scope

## Requirement Corrections Summary

- replaced the nonexistent `role-model-router/apps/runtime-host-bridge/src/validate-request-regression.ts` reference with the real current regression anchors under `role-model-router/apps/runtime-host-bridge/test/**`
- split the tracing contract between telemetry-ledger/analytics surfaces and structured request-detail/Pi inspection surfaces instead of treating them as one undifferentiated API family
- made backward compatibility for `packages/pi-role-model/src/runtime-inspection.ts` an explicit requirement instead of an implicit assumption
- replaced the vague "Observe routes" wording with explicit `observeRequestPath` and canonical Observe request-detail route expectations
- grounded Craft ingress preservation in the existing checked-in Craft fixture families rather than prose-only assumptions
- broadened the anti-hardcoding rule so Codex Subscription routing, provider exposure, and capability claims cannot rely on scattered fixed model checks
- required idempotency and side-effect receipts to extend the existing runtime observability and SQLite structures rather than introducing a parallel receipt store
- clarified that payload-growth bounds must be defined per execution family and continuation mode so compressed and delta-style transports remain verifiable without weakening the requirement

## Lock Readiness Notes

- The user explicitly approved moving from audit/planning into implementation on `2026-07-07` by instructing the agent to implement the run and to verify the result with the rebuilt runtime in Phase 5.
- The requirements now reference the real current runtime-host, Pi, and LiteLLM evidence surfaces that later phases must use.
- The run boundary, verification burden, and no-upstream-patching constraint are explicit enough to start Phase 0 and Phase 1 from this artifact.

## Coverage Gate

Coverage: PASS

- `R0` fixes the ownership boundary so later phases cannot hide the work inside the wrong execution family
- `R1`-`R2` cover the shared execution contract and ingress translation defects that currently drop semantics before routing
- `R3`-`R4` cover the two critical execution families: LiteLLM-managed remote execution and native Codex Subscription execution
- `R5` covers the request-growth root-cause work explicitly required by the user, including transport-specific payload measurement
- `R6`-`R7` cover retry, reroute, cooldown, and tool-semantics preservation across failure and continuation paths
- `R8`-`R10` cover the tracing surface split, telemetry migration/query contract, 100-case-plus regression harness anchored to current repo tests, and rebuilt-runtime live verification burden the user requested
- `R11`-`R13` cover CI safety, durable state or decision or memory updates, and the mandatory root-cause hard gate
- the source inventory and mandatory codebase-grounding section require Phase 1 to cite Role Model, Pi, and LiteLLM code rather than relying only on architecture prose
- the out-of-scope section explicitly prevents shallow Pi/Craft patches or unrelated widening

## Approval Gate

Approval: PASS

- the primary architecture source is fixed to the repo-owned LiteLLM or Pi or Role-Model proposal
- Pi is explicitly treated as the authoritative behavioral reference where applicable, without turning the run into a Pi patch run
- Codex Subscription remains a native execution family, matching the proposal and the durable runtime-memory boundary
- Codex Subscription requirements are capability-derived and explicitly reject hardcoded subscription model constants in routing, provider exposure, capability claims, and regression harnesses
- the requirement is concrete about the known failure families: tool semantics, non-text routing, request growth, retry or reroute, quota or timeout handling, tracing, and regression volume
- the requirement now includes verifiable telemetry migration, payload-size artifact, request-corpus artifact, and idempotency receipt expectations
- the verification burden is explicit enough for the later audited phases, including the rebuilt-runtime Phase 5 proof the user requested
