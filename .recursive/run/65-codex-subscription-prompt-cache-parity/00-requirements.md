Run: `/.recursive/run/65-codex-subscription-prompt-cache-parity/`
Phase: `00 Requirements`
Status: `DRAFT`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/.recursive/run/49-runtime-telemetry-analytics-charts/00-requirements.md`
- `/.recursive/run/50-openai-codex-subscription/00-requirements.md`
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/00-requirements.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/00-requirements.md`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.ts`
- `role-model-router/apps/runtime-ui/app/lib/telemetry-chart-config.ts`
- `role-model-router/apps/runtime-ui/app/lib/telemetry-route-models.ts`
- `role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.test.ts`
- `role-model-router/apps/runtime-ui/app/lib/telemetry-route-models.test.ts`
- `role-model-router/packages/provider-openai/src/index.ts`
- `role-model-router/packages/provider-openai/test/index.test.ts`
- `role-model-router/packages/provider-litellm/src/index.ts`
- `role-model-router/packages/provider-litellm/test/index.test.ts`
- Representative downstream-client evidence from Pi upstream GitHub current on `2026-07-11`:
  - `https://github.com/earendil-works/pi/blob/main/packages/ai/src/providers/openai-codex-responses.ts`
  - `https://github.com/earendil-works/pi/blob/main/packages/ai/src/providers/openai-responses.ts`
  - `https://github.com/earendil-works/pi/blob/main/packages/ai/src/providers/openai-responses-shared.ts`
  - `https://github.com/earendil-works/pi/blob/main/packages/ai/src/providers/openai-prompt-cache.ts`
  - `https://github.com/earendil-works/pi/blob/main/packages/ai/src/types.ts`
- Official OpenAI prompt caching docs current on `2026-07-11`:
  - `https://developers.openai.com/api/docs/guides/prompt-caching`
- Official LiteLLM docs current on `2026-07-11`:
  - `https://docs.litellm.ai/docs/tutorials/claude_code_prompt_cache_routing`
  - `https://docs.litellm.ai/docs/response_api`
  - `https://docs.litellm.ai/docs/proxy/config_settings`
  - `https://docs.litellm.ai/docs/proxy/caching`
- Official Kimi docs current on `2026-07-11`:
  - `https://platform.kimi.ai/docs/api/chat`
  - `https://www.kimi.com/code/docs/en/kimi-code/whats-new.html`
- User guidance in chat on `2026-07-11`:
  - Pi shows `0%` cache when repeated requests route to GPT-5.4 through the Codex Subscription path
  - direct DeepSeek cache reporting already shows approximately `99.8%` cached
  - the failing path is the Codex Subscription adapter, not the LiteLLM adapter
  - requested outcome is Codex Subscription cache support inside role-model
Outputs:
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/00-requirements.md`
Scope note: This run repairs the prompt-cache accounting and downstream response contract for OpenAI Codex Subscription execution and for routed cache-affinity continuity across OpenAI-compatible execution surfaces so repeated GPT-5.4 requests can surface real cache usage to any downstream OpenAI-compatible application and to role-model telemetry instead of a permanent `0%` cache display while direct LiteLLM-backed providers already report hits correctly. The run does not assume a shared cache across providers; it requires stable cache-affinity hints so each endpoint can preserve and later reuse its own upstream cache when routing returns to it.

## TODO

- [x] Ground the run in current runtime, provider, cache, and telemetry surfaces plus the most relevant prior runs
- [x] Scope the run to Codex Subscription prompt-cache parity plus routed cache-affinity continuity rather than a broad provider or caching redesign
- [x] Convert the observed downstream `0%` cache symptom into backend-owned requirement IDs
- [x] Capture request-hint, response-serialization, telemetry, and dashboard parity requirements
- [x] Record regression boundaries for LiteLLM-backed and non-Codex OpenAI-compatible paths
- [x] Record deterministic automated coverage and end-to-end verification expectations
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Run Metadata

- Priority: `P1`
- Run type: `backend bugfix and telemetry/dashboard contract parity`
- Primary subsystems:
  - `role-model-router/apps/runtime-host-bridge/**`
  - `role-model-router/packages/provider-openai/**`
- Secondary subsystems:
  - `role-model-router/packages/provider-litellm/**`
  - `role-model-router/packages/runtime-observability/**`
  - `role-model-router/packages/sqlite-memory/**`
  - `role-model-router/apps/runtime-ui/**`
- User-visible outcome:
  - repeated GPT-5.4 Codex Subscription requests expose truthful cached-token usage through downstream OpenAI-compatible responses, canonical runtime telemetry, and the existing runtime overview plus Observe analytics graphs, and routed sessions preserve stable cache-affinity hints so downstream applications no longer show `0%` cache when upstream cache hits are actually occurring and previously warmed endpoints can still regain their own cache benefit when routing returns to them
- Main risk theme:
  - a shallow fix could fabricate cache support, silently keep Codex Subscription rows excluded from telemetry analytics, regress the already-correct LiteLLM/DeepSeek cache path, or mutate cache-affinity hints during reroutes so warmed endpoints lose future reuse opportunities

## Relevant Prior Runs

| Run | Why it matters here |
| --- | --- |
| `49-runtime-telemetry-analytics-charts` | established the runtime-owned cache metrics plus the `/app`, `/app/observe/requests`, and `/app/observe/routing` chart/query surfaces that should benefit from truthful Codex cache data rather than a parallel cache dashboard |
| `50-openai-codex-subscription` | introduced the `OpenAI` plus `Codex Subscription` operator model and the truthful auth-boundary constraints this run must preserve |
| `53-runtime-telemetry-analytics-contract-hardening` | locked the backend-owned telemetry analytics contract, including partial-support handling for cache-hit metrics |
| `62-litellm-pi-craft-codex-execution-hardening` | established the native `chatgpt-codex-responses` / `codex-subscription-responses` execution path and the current execution-semantics receipt surfaces that now need cache parity |

## Source Requirement Inventory

| Source | Contribution to this run |
| --- | --- |
| user guidance in chat on `2026-07-11` | defines the exact failure symptom, the working DeepSeek control path, and the requested Codex Subscription outcome |
| official OpenAI prompt caching docs current on `2026-07-11` | authoritative contract for automatic caching eligibility at `1024+` prompt tokens, `cached_tokens` zero semantics below threshold or on misses, `prompt_cache_key`, Responses `usage.input_tokens_details`, Chat Completions `usage.prompt_tokens_details`, and model-family-specific `cache_write_tokens` behavior |
| `/.recursive/STATE.md` | current runtime truth for native Codex Subscription execution, prompt-cache hint preservation, and execution receipt ownership |
| `/.recursive/DECISIONS.md` | durable record of the OpenAI/Codex execution-family boundary and telemetry-analytics ownership expectations |
| `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md` | durable truth for Codex Subscription execution-family identity, downstream request semantics, and telemetry/request-detail contract ownership |
| `role-model-router/apps/runtime-host-bridge/src/index.ts` | actual native Codex transcript normalization, prompt-cache-key forwarding, synthetic OpenAI response shaping, and bridge result shaping seams that currently lose cache facts |
| `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`, `telemetry-analytics.ts`, `telemetry-chart-config.ts`, `telemetry-route-models.ts`, and related tests | existing overview and Observe analytics contracts already include cache-oriented metrics and partial-support chart semantics, so this run must feed and where needed extend those dashboard surfaces rather than inventing a separate cache UI |
| `role-model-router/packages/provider-openai/src/index.ts` | current OpenAI-family capability advertisement and response normalization seams that currently mark prompt caching unsupported and hardcode zero cache tokens |
| `role-model-router/packages/provider-litellm/src/index.ts` | existing working cache-read/cache-write normalization baseline that the repaired Codex path must match in spirit without regressing |
| `role-model-router/apps/runtime-host-bridge/test/index.test.ts` and provider adapter tests | current automated floor for prompt-cache propagation, telemetry analytics cache metrics, and provider normalization behavior |
| Pi upstream `packages/ai/src/providers/openai-codex-responses.ts` | representative downstream client behavior: direct Codex Subscription path sets `prompt_cache_key` from `sessionId`, so role-model should preserve equivalent cache-affinity semantics for session-scoped consumers |
| Pi upstream `packages/ai/src/providers/openai-responses.ts` | representative downstream client behavior: direct OpenAI Responses path sends `prompt_cache_key` and session-scoped headers from `sessionId`, which shows one concrete client expectation when caching is enabled |
| Pi upstream `packages/ai/src/providers/openai-responses-shared.ts` | representative downstream client behavior: one real Responses-family parser reads `usage.input_tokens_details.cached_tokens`, subtracts it from `input_tokens` to derive internal non-cached input, and therefore depends on standard OpenAI totals plus cache-detail subfields |
| Pi upstream `packages/ai/src/types.ts` | representative downstream client behavior: one real internal `Usage` contract explicitly separates `input`, `cacheRead`, and `cacheWrite`, confirming that downstream OpenAI-compatible responses must preserve standard cache-detail fields instead of pre-normalizing them into one number |
| official LiteLLM prompt cache routing docs current on `2026-07-11` | documents `prompt_caching` pre-call checks and same-deployment routing after cache writes, which is the documented continuity baseline for LiteLLM-backed prompt caching |
| official LiteLLM Responses/session-affinity docs current on `2026-07-11` | documents `responses_api_deployment_check`, `session_affinity`, `deployment_affinity`, per-model-group affinity, `x-litellm-session-id` / `x-litellm-trace-id` or equivalent `metadata.session_id`, and the default `deployment_affinity_ttl_seconds = 3600` |
| official LiteLLM proxy caching docs current on `2026-07-11` | documents LiteLLM's own full-response and semantic proxy caches, which are separate from upstream provider prompt caching and must not be conflated with this run's continuity contract |
| official Kimi chat API docs current on `2026-07-11` | documents `prompt_cache_key` for coding agents and Kimi Code Plan plus top-level `usage.cached_tokens` on chat-completions responses, which differs from OpenAI's nested cache-detail shape |
| official Kimi Code docs current on `2026-07-11` | documents that reducing request-side tool payload churn is used to preserve the provider prompt cache, reinforcing that role-model should avoid gratuitously perturbing cacheable prefixes on coding routes |

## Problem Summary

The runtime already forwards `prompt_cache_key` through the OpenAI Responses ingress and the LiteLLM-backed path already reports cached tokens correctly, which is why direct DeepSeek usage can show approximately `99.8%` cached in one known downstream client. The failing path is the native Codex Subscription execution family. Today, the native Codex transcript normalization and bridge-owned synthetic OpenAI response builders only preserve input and output token totals, while `provider-openai` still advertises prompt caching unsupported and normalizes OpenAI-family cache usage to zero. As a result, Codex Subscription requests can succeed with real upstream cache hits while the downstream OpenAI-compatible usage object, request-detail receipts, and telemetry analytics still read as uncached or unsupported.

The OpenAI docs make the symptom boundary more explicit: automatic prompt caching is only eligible for prompts with `1024` or more input tokens, but `cached_tokens` should still appear in the documented usage-detail object for every request, including sub-threshold requests, where the value is expected to be `0`. That means a `0` can be truthful for a short or uncached request, but a permanent `0` caused by dropped serialization is a bug. This run must repair the false-zero path without turning legitimate misses or sub-threshold requests into fake hits.

One current downstream client implementation makes the wire contract more specific. Its Responses-family parser reads `response.usage.input_tokens_details.cached_tokens`, subtracts that value from `input_tokens` to derive internal non-cached input, stores the cached portion separately, and uses a distinct cache-write field in its internal usage model. That means role-model must emit standard OpenAI usage fields on the wire. It must not pre-subtract cached tokens from downstream `input_tokens` or `prompt_tokens`, because downstream applications may already do that conversion client-side.

The bridge already preserves prompt-cache and session-affinity hints into the shared execution contract, and the current routed estate spans multiple OpenAI-compatible execution surfaces: native Codex Subscription on the ChatGPT Codex Responses transport, LiteLLM-backed providers, and Kimi coding OAuth on the current chat-completions-shaped path. The missing explicit requirement is routed continuity. Cache hits are provider-local and endpoint-local rather than router-global, but the bridge should still preserve stable cache-affinity identity when the router moves between endpoints so returning to a previously warmed endpoint can still recover partial or full cache benefit from that endpoint's own upstream cache if the prefix and key still match.

The external provider docs now sharpen that continuity requirement. LiteLLM explicitly documents prompt-cache-aware routing through `prompt_caching`, `responses_api_deployment_check`, `session_affinity`, `deployment_affinity`, and per-model-group affinity, keyed by LiteLLM-specific session continuity inputs such as `metadata.session_id`, `x-litellm-session-id`, or `x-litellm-trace-id`. Kimi's official chat API explicitly documents `prompt_cache_key` for coding agents and returns top-level `usage.cached_tokens` on chat-completions responses. Kimi Code's own docs also call out reducing request-side tool payload churn in order to preserve the provider prompt cache. That means role-model must preserve the cache-affinity identifiers and response normalization shapes that these upstreams actually document, not just a repo-local approximation.

LiteLLM's own proxy cache adds one more boundary: LiteLLM can also return a cached full response or semantic-cache hit before calling any upstream model at all. That is a distinct mechanism from upstream provider prompt caching. This run is about truthful upstream prompt-cache continuity and normalization, not about introducing or emulating LiteLLM's response-cache layer inside role-model.

To make that continuity operational, the runtime needs an explicit cache continuity ledger keyed per upstream cache domain, not a single session-global cache record. Each logical session may accumulate multiple warmed domains, for example one for Codex Subscription, one for a LiteLLM-backed DeepSeek route, and one for a Kimi coding route. When routing moves from `A` to `B`, the runtime should activate `B`'s continuity record without destroying `A`'s. When routing later returns to `A`, the bridge should restore `A`'s provider-specific cache-affinity identity so `A` can realize any remaining partial or full reuse from its own warmed prefix. This continuity ledger is also the correct place to drive advisory warmed-domain routing preference without claiming a synthetic shared cache across providers.

Because telemetry analytics compute cache-hit-rate metrics only across rows that declare cache-read-token support, the current gap is not just cosmetic. Codex Subscription traffic can be excluded from cache slices entirely, which makes downstream cache percentages and role-model operator analytics disagree with the actual upstream cache behavior. The same undercount can also blank or misstate the existing cache-oriented graphs on `/app`, `/app/observe/requests`, and `/app/observe/routing`, because those dashboard surfaces already depend on canonical telemetry metrics such as cache-hit rates and cache-avoided cost.

## Fixed Decisions

1. Codex Subscription remains on the native `chatgpt-codex-responses` / `codex-subscription-responses` execution family. This run must not flatten that path into LiteLLM or the direct OpenAI API-key transport.
2. Cache support must remain truth-based. The runtime may preserve upstream `cached_tokens`, `cache_write_tokens`, and cache-status facts, but it must not infer cache hits from latency, cost, or repeated-request shape alone.
3. The downstream contract that matters is the OpenAI-compatible response surface plus canonical runtime telemetry/request-detail receipts, because that is what downstream applications and operator analytics consume.
4. Existing LiteLLM-backed cache reporting is the regression baseline and must stay intact.
5. This run targets current OpenAI prompt-caching behavior as documented on `2026-07-11`, including `cached_tokens` in Responses `usage.input_tokens_details` and Chat Completions `usage.prompt_tokens_details`. Those documented usage-detail fields must remain present with value `0` for supported misses and sub-threshold requests rather than being omitted.
6. Automatic prompt-caching eligibility starts at `1024` input tokens. Phase 5 cache-hit verification must use a repeated cacheable prefix at or above that threshold, otherwise `cached_tokens: 0` is not evidence of a bug.
7. `cache_write_tokens` must be preserved when the upstream model family provides it, but it must not be invented for GPT-5.4 or other paths where the current OpenAI contract does not truthfully expose it.
8. Current OpenAI docs support `prompt_cache_key` on both Responses and Chat Completions. This run therefore treats key preservation on both ingress surfaces as in scope. Explicit cache breakpoints, `prompt_cache_options`, and retention-authoring features remain out of scope unless needed only as passive compatibility handling.
9. Downstream OpenAI-compatible consumers may expect standard OpenAI usage totals plus cache-detail subfields. Role-model must therefore keep downstream `input_tokens` / `prompt_tokens` as OpenAI-native totals and must not pre-convert them into application-specific non-cached input counts.
10. Prompt cache is not router-global. This run must not claim that cache state or cache hits transfer directly from one provider or endpoint to another.
11. Routed cache continuity still matters. The bridge should preserve stable session-scoped cache identifiers across eligible reroutes so that if execution later returns to a previously warmed endpoint, that endpoint can still reuse its own upstream cache for any matching prefix.
12. Mixed OpenAI-compatible request surfaces are in scope for cache-affinity preservation. On the current runtime baseline that includes Responses-shaped execution for Codex Subscription and chat-completions-shaped execution for current Kimi coding routes.
13. LiteLLM-backed continuity must be compatible with LiteLLM's documented affinity surfaces. Role-model cannot rely only on a repo-local `session-id` if the selected LiteLLM execution surface actually keys affinity on `x-litellm-session-id`, `x-litellm-trace-id`, or `metadata.session_id`.
14. Current Kimi coding routes remain on chat-completions. This run must therefore preserve Kimi's documented `prompt_cache_key` semantics and normalize Kimi's documented top-level `usage.cached_tokens` shape on that path instead of waiting for a future Responses migration.
15. Request-shape stability matters for cache reuse. The bridge should avoid avoidable per-turn tool or prefix churn that would unnecessarily destroy cacheable prefixes on LiteLLM-backed or Kimi-backed coding sessions.
16. LiteLLM proxy response caching and semantic caching are distinct from upstream provider prompt caching. This run must not conflate those mechanisms in requirements, telemetry, or downstream response semantics.
17. The runtime should track cache continuity per upstream cache domain, not as one session-global cache slot. Selecting endpoint `B` must not overwrite endpoint `A`'s resumable continuity state.
18. Warmed-domain continuity may influence routing as an advisory preference when multiple candidates are otherwise viable, but it is not a universal hard pin. Hard continuity is required only when the documented upstream contract demands it, such as `previous_response_id`, encrypted-content affinity, or equivalent provider-local state.
19. Historical telemetry backfill is out of scope. Forward-going truth for new Codex Subscription traffic is the priority.
20. This run should update the existing runtime overview and Observe analytics/dashboard graphs for cache truth where needed. It should not create a second cache-specific dashboard just to surface Codex Subscription parity.

## Requirements

### `R1` Preserve Codex Subscription cache facts in normalized execution results

Description:
The native Codex Subscription execution path must capture cache reads and writes from upstream usage payloads and keep them in the normalized execution result that later layers serialize and persist.

Acceptance criteria:
- native Codex Responses normalization preserves cached-read token counts whenever upstream usage exposes them
- normalization supports the cache-read shapes actually documented by the in-scope upstreams: OpenAI Responses `usage.input_tokens_details.cached_tokens`, OpenAI Chat Completions `usage.prompt_tokens_details.cached_tokens`, and current Kimi Chat Completions `usage.cached_tokens`
- cache-write token counts are preserved whenever the upstream model family exposes them and remain absent or zero truthfully when not exposed
- LiteLLM-originated cache facts from documented usage fields or additive vendor metadata are preserved without being overwritten by zero defaults
- normalized vendor metadata can carry cache status, cache-used, cache-read-token, and cache-write-token facts without requiring downstream reconstruction
- streamed and non-streamed Codex Subscription completions use one consistent cache-fact source instead of divergent ad hoc parsing

### `R2` Serialize cache usage through downstream OpenAI-compatible response bodies

Description:
The runtime-owned `/v1/responses` and `/v1/chat/completions` outputs must surface the same cache facts that the normalized execution result holds so downstream OpenAI-compatible consumers can display real cache behavior.

Acceptance criteria:
- Responses replies always use the documented OpenAI cache-read location `usage.input_tokens_details.cached_tokens`, with a non-zero value for a hit and `0` for a supported miss or sub-`1024` request
- Chat Completions replies always use the documented OpenAI cache-read location `usage.prompt_tokens_details.cached_tokens`, with a non-zero value for a hit and `0` for a supported miss or sub-`1024` request
- downstream `usage.input_tokens` and `usage.prompt_tokens` remain standard OpenAI totals rather than application-specific non-cached input counts, so consumers that derive uncached input from totals minus `cached_tokens` continue to work correctly
- a supported uncached request is represented as `cached_tokens: 0`, not as a missing detail object or an unsupported cache surface
- cache writes are exposed in the matching usage detail object only when the upstream model family truthfully provides them
- streamed and non-streamed response synthesis stays structurally consistent with the non-Codex OpenAI-compatible contract
- absence of upstream cache support does not get rewritten into a fake cache hit or non-zero cached token count

### `R3` Make the OpenAI-family adapter contract truthful about prompt caching

Description:
`provider-openai` must stop advertising prompt caching unsupported or normalizing every OpenAI-compatible response shape to zero cached tokens.

Acceptance criteria:
- `getOpenAICapabilities()` no longer advertises OpenAI-family automatic prompt caching as `unsupported`
- the OpenAI-family capability contract reflects automatic or implicit caching support instead of a hardcoded unsupported mode
- `normalizeOpenAIResponse()` parses cache read and write usage from OpenAI Responses and Chat Completions payloads instead of hardcoding zeros
- `normalizeOpenAIResponse()` also parses Kimi's documented top-level `usage.cached_tokens` on chat-completions-shaped responses rather than assuming only OpenAI's nested cache-detail objects exist
- `normalizeOpenAIResponse()` preserves documented supported-zero semantics by emitting `cached_tokens: 0` for supported misses rather than treating them as unsupported
- prompt-cache `requested`, `used`, `readTokens`, and `writeTokens` reflect actual request and response facts when present
- existing vendor-metadata passthrough for cache status, cache-used, cache-read tokens, and cache-write tokens remains additive rather than being overwritten by zero defaults

### `R4` Preserve cache-affinity identity across documented OpenAI-compatible ingress paths and routed endpoint changes

Description:
When downstream callers provide cache-affinity hints, the runtime must preserve them end to end on the documented OpenAI-compatible request surfaces and must not silently mutate or discard them during reroutes between eligible execution targets.

Acceptance criteria:
- Responses ingress continues to map `prompt_cache_key` into the shared execution request and the provider request body
- Chat Completions ingress accepts and forwards `prompt_cache_key` through the shared execution request and downstream provider request body
- the runtime maintains one continuity record per upstream cache domain rather than one shared session-global cache slot
- each continuity record keys at least the effective provider/vendor path, execution surface, request surface, resolved model or model-group identity, and endpoint/account/deployment identity needed to return to the same upstream cache domain truthfully
- each continuity record preserves the provider-specific cache-affinity state that can be resumed later, including stable `prompt_cache_key`, stable session-affinity identity, `previous_response_id` where that surface uses it, and the latest truthful cache-read or cache-write evidence observed for that domain
- the preserved key is stable enough for session-scoped reuse in downstream applications that derive `prompt_cache_key` from a conversation, session, or tenant identifier
- session-affinity identifiers and prompt-cache keys remain stable across reroutes within one logical session unless the caller explicitly changes them
- rerouting from endpoint `A` to endpoint `B` does not consume, randomize, or overwrite endpoint `A`'s future cache-affinity identity; if routing later returns to endpoint `A`, the request is still eligible for endpoint `A`'s own upstream cache reuse when the key and prefix match
- the runtime does not claim that a cache hit transfers directly from endpoint `A` to endpoint `B`; continuity is per endpoint and per upstream cache domain
- when routing selects endpoint `B`, the bridge restores endpoint `B`'s provider-specific continuity state if one exists for the logical session; when no continuity record exists for `B`, the runtime creates a fresh `B` record without mutating `A`
- LiteLLM-backed routes preserve a LiteLLM-documented affinity signal for cache continuity, either through `metadata.session_id` or proxy-equivalent `x-litellm-session-id` / `x-litellm-trace-id`, instead of relying solely on a role-model-local header that LiteLLM does not document for affinity
- current Kimi coding OAuth / Kimi for Coding routes preserve `prompt_cache_key` on chat-completions requests, and resumed sessions keep that key stable as documented by Kimi for coding agents
- Codex Subscription, LiteLLM-backed providers, and the current Kimi coding OAuth route preserve equivalent cache-affinity hints on the supported OpenAI-compatible surfaces they use today
- this run does not have to introduce active authoring support for `prompt_cache_options`, `prompt_cache_breakpoint`, or `prompt_cache_retention`, but it must not silently claim those advanced features are implemented if they are not
- Codex Subscription execution receives the same prompt-cache key that downstream ingress accepted

### `R5` Keep telemetry and request-detail cache metrics accurate for Codex Subscription traffic

Description:
Cache facts that are now preserved through execution must also appear in the runtime's canonical telemetry, request-detail, and existing dashboard graph/query surfaces so cache-hit analytics stop undercounting Codex Subscription traffic and the overview plus Observe charts display the same truth.

Acceptance criteria:
- Codex Subscription telemetry rows set cache-support flags truthfully when cached-token accounting is available
- cache read and write token counts persist through the existing telemetry and request-detail surfaces instead of living only in ephemeral execution objects
- canonical request-detail and ledger surfaces can identify which upstream cache domain was selected for execution and whether that request restored an existing continuity record or started a fresh domain record
- request-detail and telemetry receipts can distinguish advisory warmed-domain preference from hard continuity constraints such as `previous_response_id` or encrypted-content affinity
- structured telemetry analytics queries expose truthful Codex Subscription cache facts on the existing cache-oriented metrics and derived series the runtime already supports, including cache-hit-rate, cache-hit-token, cache-backed-request, and cache-avoided-cost views where those facts are computable from canonical telemetry
- the existing runtime overview and Observe analytics graphs on `/app`, `/app/observe/requests`, and `/app/observe/routing` include Codex Subscription rows whenever those rows support the relevant cache metrics instead of silently omitting them or collapsing into an unsupported slice
- chart and query state remains consistent with run `53` partial-support semantics: supported-zero requests stay visible as `0`, unsupported metrics remain unsupported or `null` where the contract already uses that state, and empty slices still render as empty rather than being rewritten into fake cache activity
- cache-hit-token-rate analytics include Codex Subscription rows whenever those rows support cache metrics
- request-detail and ledger receipts can distinguish unsupported cache metrics from supported requests that simply had `cached_tokens: 0`

### `R6` Preserve parity with existing LiteLLM and non-Codex OpenAI behavior

Description:
This bugfix must not regress the already-correct LiteLLM cache path or break direct OpenAI-compatible API-key execution while repairing Codex Subscription parity.

Acceptance criteria:
- existing LiteLLM cache normalization and telemetry behavior remain green
- routed sessions that alternate between Codex Subscription, LiteLLM-backed providers, and the current Kimi coding OAuth path retain stable cache-affinity hints for each endpoint rather than degrading into per-turn fresh-cache identities
- LiteLLM-backed routes remain compatible with documented LiteLLM continuity behavior for prompt caching and Responses session affinity, including per-model-group affinity where configured
- current Kimi coding OAuth / Kimi for Coding routes continue to honor Kimi's documented `prompt_cache_key` and `usage.cached_tokens` behavior while remaining on chat-completions
- when multiple viable candidates exist, a previously warmed domain may receive an additive routing preference if the current request is prefix-compatible, but the router still may choose a different candidate for stronger capability, policy, health, or performance reasons
- direct OpenAI-compatible API-key execution continues to normalize usage, tools, and prompt-cache hints correctly
- non-cache-supporting providers and models still report unsupported or zero cache facts truthfully
- the fix does not introduce Codex-specific hardcoded behavior into generic provider-family flows when shared OpenAI-family logic is sufficient

### `R7` Add deterministic RED and GREEN coverage for cache parity

Description:
The run must be test-driven so future changes cannot silently return Codex Subscription cache reporting to `0%`.

Acceptance criteria:
- failing automated tests are added before production changes for the missing Codex and OpenAI cache facts
- provider-openai tests cover Responses and Chat Completions normalization with both cache-hit payloads and documented supported-zero payloads
- provider-openai tests cover Kimi-style chat-completions payloads with top-level `usage.cached_tokens`
- host-bridge tests cover native Codex transcript normalization or synthetic response serialization with cache-hit usage and supported-zero usage
- host-bridge tests cover `prompt_cache_key` propagation on both Responses and Chat Completions ingress
- host-bridge or provider tests cover LiteLLM-compatible affinity propagation using the LiteLLM-documented session continuity surface rather than only repo-local session headers
- host-bridge or adapter tests cover routed continuity where cache-affinity hints survive an `A -> B -> A` endpoint sequence without mutating the logical session key
- host-bridge or routing tests cover per-domain continuity persistence so a logical session can hold distinct resumable cache state for at least two different warmed endpoints at once
- tests prove that downstream OpenAI-compatible `input_tokens` / `prompt_tokens` remain standard totals and are not pre-subtracted before downstream applications consume them
- telemetry analytics tests prove cache-hit-token-rate behavior for supported Codex Subscription rows
- runtime-ui analytics or chart-definition tests prove the overview and Observe graph/query contracts continue to surface cache metrics for supported Codex Subscription rows while preserving supported-zero and unsupported state semantics
- regression coverage keeps the existing LiteLLM cache path green

### `R8` Verify the downstream-visible scenario end to end

Description:
Final verification must prove the actual user symptom is repaired: repeated GPT-5.4 Codex Subscription traffic no longer looks permanently uncached to downstream consumers.

Acceptance criteria:
- verification includes at least one repeated Codex Subscription request pair with a cacheable repeated prefix at or above `1024` input tokens, where the downstream response or canonical receipt shows zero cached tokens on the initial request and non-zero cached tokens on a later cache hit, or records a provider-side reason that a live hit could not be produced
- verification proves the repaired cache facts are visible on the downstream surface consumers use, not only inside internal logs
- verification records whether `prompt_cache_key` was used for the live proof and which request surface carried it
- verification confirms the downstream payload shape stays compatible with Responses-family parsers that expect total input plus cache-detail subfield, not pre-normalized non-cached input
- verification includes one runtime dashboard proof from the existing overview or Observe analytics surfaces showing the same repaired cache facts and state semantics that the canonical request/response receipts report
- verification includes one LiteLLM-backed proof aligned with LiteLLM's documented affinity mechanism and one Kimi-shaped chat-completions proof aligned with Kimi's documented `prompt_cache_key` and `usage.cached_tokens` behavior, or records the exact upstream limitation that blocked live proof
- verification includes either a live or deterministic proof that an `A -> B -> A` routed sequence preserves endpoint `A`'s cache-affinity identity, so returning to `A` can still realize partial or full cache benefit from `A`'s previously warmed upstream cache when the prefix remains eligible, or records the exact provider-side limitation blocking live proof
- verification records whether warmed-domain preference influenced candidate choice and whether the final request restored an existing continuity record or started a fresh one
- verification includes a parity control showing the existing LiteLLM or DeepSeek cache path remains correct
- final evidence names the exact model family and request surface used for verification

## Out of Scope

- `OOS1`: replacing the native Codex Subscription execution family with LiteLLM or the direct OpenAI API-key transport
- `OOS2`: downstream UI or core-application patches outside this repository
- `OOS3`: full GPT-5.6 `prompt_cache_options`, explicit breakpoints, TTL authoring, or older-model `prompt_cache_retention` authoring beyond any passive compatibility fields required for the current bugfix
- `OOS4`: historical telemetry backfill for already-persisted request rows
- `OOS5`: broad provider-wide cache-pricing redesign or cache-cost analytics expansion unrelated to truthful Codex Subscription cache propagation
- `OOS6`: patching downstream applications to compensate for incorrect upstream cache serialization
- `OOS7`: synthesizing one shared cache across different providers or forcing one provider to import another provider's cache state
- `OOS8`: reverse-engineering undocumented provider cache headers or hidden behavior beyond the documented LiteLLM and Kimi cache-affinity surfaces plus passive vendor metadata already observed by the runtime
- `OOS9`: introducing a Role-Model-owned equivalent of LiteLLM full-response caching or semantic caching as part of this prompt-cache continuity run

Future follow-up note:
- a separate future run may evaluate a Role-Model-owned exact proxy response cache for narrowly eligible deterministic requests, but that feature is intentionally not folded into run 65
- semantic cache for the primary coding-agent path remains deferred until exact response caching, cache-source telemetry, and correctness boundaries are proven first

## Constraints

- the implementation must stay consistent with official OpenAI prompt-caching behavior current on `2026-07-11`
- the implementation must preserve `vendorId = chatgpt-codex-responses` and `adapterFamily = codex-subscription-responses` for the native Codex Subscription path
- canonical telemetry and request-detail surfaces remain the only durable proof path; do not introduce a second cache-specific trace store
- existing runtime overview and Observe analytics surfaces should consume the repaired canonical telemetry/query contract rather than introducing a one-off cache dashboard path
- cache hits must not be inferred without upstream field evidence
- routing continuity may preserve stable cache-affinity hints, but cache truth remains endpoint-local and provider-local rather than router-global
- any runtime continuity ledger introduced by this run is a cache-affinity state ledger, not a synthetic cache store; it tracks resumable provider-local identity and evidence, not cached prompt contents
- LiteLLM continuity compatibility must respect LiteLLM's documented session and deployment affinity surfaces; if bridge translation is needed, it must target those documented surfaces explicitly
- LiteLLM proxy full-response caching and semantic caching remain separate mechanisms; this run must not represent a proxy-cache hit as an upstream prompt-cache hit
- supported OpenAI-family misses and sub-threshold requests must serialize `cached_tokens: 0` in the documented usage-detail field rather than omitting that field
- current Kimi coding docs expose `usage.cached_tokens` at the top level of chat-completions usage, so normalization must not assume only OpenAI's nested cache-detail objects exist on every OpenAI-compatible upstream
- final cache-hit QA must use a repeated prompt prefix that meets the current documented `1024`-token eligibility floor
- downstream OpenAI-compatible usage totals must stay OpenAI-native because downstream applications may perform their own cached-token subtraction when converting Responses-family usage into internal usage models
- existing LiteLLM cache reporting is the regression floor and must remain green
- reroutes must preserve stable cache-affinity hints for eligible OpenAI-compatible surfaces instead of generating a fresh logical cache identity per turn
- request shaping should keep the stable prefix as intact as reasonably possible across turns so per-domain continuity records still have a chance to realize partial reuse when a warmed endpoint is revisited
- avoid avoidable per-turn prompt or tool payload churn on routes where the upstream documentation explicitly frames stable prefixes or prompt-cache keys as the path to cache reuse
- if GPT-5.4 or another current model omits `cache_write_tokens`, the runtime must not invent write counts

## Coverage Gate

- Effective inputs reviewed:
  - `/.recursive/STATE.md`
  - `/.recursive/DECISIONS.md`
  - `/.recursive/memory/MEMORY.md`
  - `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
  - prior runs `49`, `50`, `53`, and `62`
  - `role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
  - `role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.ts`
  - `role-model-router/apps/runtime-ui/app/lib/telemetry-chart-config.ts`
  - `role-model-router/apps/runtime-ui/app/lib/telemetry-route-models.ts`
  - `role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.test.ts`
  - `role-model-router/apps/runtime-ui/app/lib/telemetry-route-models.test.ts`
  - `role-model-router/packages/provider-openai/src/index.ts`
  - `role-model-router/packages/provider-openai/test/index.test.ts`
  - `role-model-router/packages/provider-litellm/src/index.ts`
  - `role-model-router/packages/provider-litellm/test/index.test.ts`
  - representative downstream-client evidence from Pi upstream `openai-codex-responses.ts`, `openai-responses.ts`, `openai-responses-shared.ts`, `openai-prompt-cache.ts`, and `types.ts`
  - official OpenAI prompt caching docs current on `2026-07-11`
  - official LiteLLM prompt cache routing, Responses API, proxy config, and proxy caching docs current on `2026-07-11`
  - official Kimi chat API and Kimi Code docs current on `2026-07-11`
- Requirement coverage check:
  - `R1`: covers native Codex cache-fact capture
  - `R2`: covers downstream OpenAI-compatible response serialization
  - `R3`: covers provider-openai capability and normalization truthfulness
  - `R4`: covers prompt-cache request-hint preservation plus routed cache-affinity continuity
  - `R5`: covers telemetry, request-detail, and dashboard graph parity
  - `R6`: covers LiteLLM and non-Codex regression boundaries
  - `R7`: covers deterministic RED and GREEN coverage
  - `R8`: covers end-to-end downstream-visible verification
- Out-of-scope confirmation:
  - `OOS1`: Codex execution-family ownership remains unchanged
  - `OOS2`: downstream applications themselves are not patched in this run
  - `OOS3`: the run does not become a full prompt-cache feature-program for newer GPT families
  - `OOS4`: old telemetry rows are not rewritten
  - `OOS5`: broader pricing work stays deferred
  - `OOS7`: no synthetic cross-provider shared cache is introduced
  - `OOS8`: undocumented provider-private cache behavior is not reverse-engineered into the contract
  - `OOS9`: LiteLLM-style full-response or semantic caching is not added as part of this run

Coverage: PASS

## Approval Gate

- Objective readiness checks:
  - the run is grounded in the current Codex Subscription execution path rather than a historical app-server assumption
  - the exact failure chain from upstream cache usage to downstream-visible `0%` display is captured as concrete requirements
  - request-hint handling, routed cache-affinity continuity, downstream response serialization, telemetry plus dashboard-graph parity, and regression boundaries are explicit
  - verification is tied to the downstream surface consumers actually read rather than internal-only logs
  - the scope is narrow enough to execute as a bugfix run without reopening unrelated provider or downstream application product work
- Remaining blockers:
  - none for Phase 0; the run folder is now materialized and ready for worktree setup

Approval: PASS
