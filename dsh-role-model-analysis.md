# `pi-role-model` → `dsh-role-model`: capability analysis and port design

Status: **analysis only** (no code written). Basis: read-only inspection of
`packages/pi-role-model` in this repository and of the DeepSeek Harness checkout at
`D:\deepseek-harness` plus this session's live Host inspection
(`cordis_inspect_query`) and the running role-model runtime on `127.0.0.1:3457`.

---

## 1. Summary

`@try-works/pi-role-model` is a Pi extension that does five things:

1. **Injects `role_model.intent` metadata into outbound OpenAI chat-completions bodies** —
   this is the core capability and the hard part of any port.
2. Discovers a running role-model runtime and registers it as a **provider with a live
   model catalog** (aliases, endpoints, models), including per-model reasoning-effort
   identity and context/output limits.
3. Ships a **bundled compact taxonomy** (6 groups / 28 roles / 280 task types) plus a
   **progressive classifier** that produces the injected intent, with a runtime-preferred
   taxonomy and a package fallback.
4. Registers a `/role-model` **command surface** (setup, status, doctor, alias, requests,
   explain).
5. Ships an agent-usable **skill** (`skills/role-model/SKILL.md`).

Capabilities 2–5 port cleanly onto DSH services and events that already exist and were
confirmed in this session. **Capability 1 is an actual gap in DSH, but a much smaller one
than it first appears.** Two findings decide the whole design:

**Finding A — `role_model` cannot be injected through any *existing* DSH extension point.**
DSH's `agent/request` waterfall returns `LlmCallConfig` (`{provider, model,
reasoningEffort, temperature, maxTokens, stop}`) with no free-form passthrough. The
`llm/stream` waterfall receives the harness-neutral `GenerateOptions`, which also has no
extra-body field, and in any case runs *before* adapter serialization. DSH's only existing
"arbitrary top-level request body field" registry —
`ctx.deepseekLlmApiExtensions.register(field, provider)` — is consumed exclusively by the
official DeepSeek Messages adapter and is described as "for official DeepSeek requests".

**Finding B — `@earendil-works/pi-ai@0.87` (which DSH's `llm-pi-ai` adapter drives) already
has the exact hook Pi uses.** `ProviderRequestOptions.onPayload` is a per-request
`(payload, model) => payload | undefined | Promise<...>` transformer called on the fully
built request body immediately before dispatch
(`pi-ai/dist/api/openai-completions.js:187-191`), and `StreamOptions.samplingParams` merges
arbitrary keys into the body last (`simple-options.js:11-16`, `openai-completions.js:744-747`).

The only reason this is not already usable is that **DSH's `PiAiAdapter` does not forward
either option**: `packages/llm/llm-pi-ai/src/adapter.ts:380-389` calls
`snapshot.models.streamSimple(model, context, {...profileOptions(profile, reasoning,
apiKey), temperature, maxTokens, sessionId, signal, headers})` — no `onPayload`, no
`samplingParams` — and `PiAiProviderProfile` offers no profile field for them.

So the port is **either** (i) a tiny, surgical DSH-side change that exposes a per-request
payload transformer, which then lets a thin plugin do the injection, **or** (ii) a plugin
that owns its own provider HTTP transport. Section 5 analyses both; the recommendation is
now (i) with (ii) as the fallback. Everything else maps cleanly onto services and events
that already exist and are documented in this session's inspection.

---

## 2. What the Pi plugin is (exact capability inventory)

### 2.1 Intent metadata injection — the capability to preserve exactly

Injected as a **top-level sibling of `model` / `messages` / `tools`** on the
chat-completions body: `{ ...payload, role_model: … }`.

```jsonc
{
  "role_model": {
    "contract_version": 1,
    "intent": {
      "classification_version": "role-model.pi-classifier.v1",
      "taxonomy_version": "1.0.0-alpha.1",
      "content_revision": "taxonomy-v1-alpha.1",
      "classification_contract_version": "role-model.classification.v1",
      "source": "heuristic",
      "confidence": 0.72,             // 0.25 | 0.38 | 0.5 | 0.6 | >=0.72
      "role_hint_id": "security",
      "role_source": "heuristic",
      "task_type": "security.audit",
      "task_action": "audit",
      "task_variant": null,
      "task_source": "heuristic",
      "task_confidence": 0.72,        // always === confidence
      "preferred_capabilities": ["security.analysis", "code.read"],
      "required_modalities": ["text"],
      "output_modalities": ["text"],
      "tool_classes": ["filesystem.read"],
      "context_tokens_estimate": 17,  // max(1, ceil(prompt.length / 4))
      "evidence": ["Group-first classification: …", "Selected security (score 11, margin 7) …", "…"],
      "alternatives": [ { "role_hint_id": "tester", "task_type": "tester.regression" } ]
    }
  }
}
```

The runtime validates this shape: `role_model.contract_version === 1` plus
`intent.taxonomy_version` / `intent.classification_contract_version` is the branch the
runtime accepts (`role-model-router/apps/runtime-host-bridge/src/index.ts:9566-9660`).
Per `docs/protocol/taxonomy-v1.md:40-74`, these fields are **advisory** — unknown or stale
values are degraded, never rejected. Only the trusted internal admin shape
(`role: {id, hard: true}`) is a hard requirement.

**Algorithm** (`classify-with-progressive-disclosure.ts`), in order:

1. `words(text)` = lowercase → strip non-`[a-z0-9.]` → split on whitespace/dots → keep
   length ≥ 3. Dots split, so `code.read` contributes `code` and `read`.
2. **Group scoring** over 6 groups: ordered regex signals (6 patterns), then literal
   keyword hit-counts (`groupKeywordSets`, ~256 keywords total), then context boosts
   (`hasTools→engineering`, `hasImages→product_design`, `hasFiles→engineering,
   knowledge_research`). Union preserves that order, dedupes, filters to known groups,
   `.slice(0,3)`. Empty → first three on-disk groups.
3. **Role scoring** only for roles whose primary/secondary group is a candidate:
   `+2` per matched positive signal, `−3` per matched negative signal, `+1` per prompt-word
   overlap in `classification.summary` and in `role.description`, `+4` if the prompt
   contains the role id, `+3` for the label, `+1..2` context boosts, `+1` max for tool-name
   hints (15 known tool names) and `+1` max for file-extension hints (17 extensions).
   Stable sort desc → ties keep role-summaries file order.
4. **Task scoring** per role: `+1` per word occurrence across
   `id + label + description + useWhen + doNotUseWhen + capabilities + toolClasses +
   variants` (occurrences counted, so duplicates across fields count twice), plus five
   keyword/id bonuses (`+5`, `+4`×4).
5. **Confidence** from the role score margin: `≥4 → 0.6`, `≥2 → 0.5`, else `0.38`;
   no candidate roles → `0.25`. If the *first* matching regex rule names the same role as
   the scored winner, the task type is overridden and confidence is raised to
   `max(confidence, 0.72)`.
6. Fields: `preferred_capabilities` = rule capabilities ∪ task required ∪ task preferred
   (deduped); `tool_classes` = task's, else the rule's; `evidence` = 3–4 literal lines;
   `alternatives` = next 3 scored roles.

The regex rule table never selects a role (group-first scoring always decides), so the
`else if (match)` / `else` branches in the entry function are dead code.

**Gating and idempotence** — the injector returns the *original object by identity* when:
the payload is not an object, the payload model is not a known role-model model id
(normalized by stripping a `role-model/` prefix), `payload.role_model.intent` already
exists, or the extracted prompt is blank. A caller-supplied intent always wins.

**Two-pass request-time flow** (this is what makes runtime taxonomy useful):
first pass with the cached effective taxonomy → if the first pass produced candidate role
ids, fetch runtime role summaries, expand candidates to ≤5 roles, `Promise.all` fetch each
role's `tasks.compact`, rebuild the taxonomy with those chunks, and re-classify. Any throw
falls back to the first pass.

### 2.2 Runtime discovery and provider registration

| Step | HTTP call |
|---|---|
| health | `GET {endpoint}/healthz` |
| version | `GET {endpoint}/api/version` (failure tolerated) |
| rich discovery | `GET {endpoint}/api/role-model/downstream/openai` |
| compact fallback (only after a 404 on rich discovery) | `GET {endpoint}/v1/models` |

The rich contract is `role-model.downstream.openai.v1` (`kind: openai-compatible`,
`providerId: role-model-runtime`, bearer auth with `required !== true`, a non-empty
`placeholderToken`, and a non-empty `models[]` where each record has
`object: "model"`, `owned_by: "role-model"`, a `type`, and a `piMapping` object).
Verified live against the running runtime: `baseUrl = http://127.0.0.1:3457`,
`displayName = role-model`, `authentication.required = false`,
`placeholderToken = role-model-local`, **23 models**.

Provider config derived from discovery: `baseUrl` = discovery `baseUrl` + `/v1`;
`apiKey` = the placeholder token (never a real credential); `api` = `openai-completions`;
one model entry per discovered record carrying `endpointId`, `variantEffort`, `input`,
`cost`, `contextWindow`, `maxTokens`, `reasoning`, `thinkingLevelMap`, `upstreamModelId`,
`compat`.

Notable fail-closed behaviours:

- `authentication.required === true` → hard error, no fallback.
- Remote (non-loopback) endpoints are **blocked before any network call** unless
  `allowRemote`; with `allowRemote` an untrusted project is still refused.
- Missing `piMapping.contextWindow`/`maxTokens` → conservative `8192` / `2048` **plus** a
  `degraded` diagnostic that never leaks into the model config.
- A model whose only effort token Pi cannot express (e.g. `ultra`) yields **no** thinking
  map — the endpoint stays selectable by exact id but advertises no misleading control.
- The package never starts, stops, installs, updates, or owns the runtime process; it never
  reads or copies provider secrets; `child_process`/`spawn`/`exec` are banned in `src/` by
  a shipped test.

### 2.3 Bundled taxonomy data

`data/taxonomy/` (~230 KB): `compact-manifest.json` (versions, entry files, sha256
`contentHashes`, 28 `roleTaskChunkFiles`/`roleTaskChunkHashes`),
`compact-groups.json` (6), `compact-role-summaries.json` (28, **with**
`classification.summary` + positive/negative signals + `typicalTaskIds`),
`compact-role-task-index.json` (`{id,label}` only, ≤26 KiB), `groups/<id>.json` mirrors,
`roles/<id>/tasks.compact.json` (10 tasks each, 6.3–6.5 KB each, 174 KB total), and
`compact-classification-guide.json`.

Loading is **staged and lazy**: manifest is memoized; `loadRoleTaskChunk(roleId)` reads only
the manifest plus that one role's file. Runtime-sourced taxonomy is deliberately lossy —
`parseRoleSummaries` keeps only `{id,label,primaryGroupId,secondaryGroupIds}` and drops
`description` and `classification`, which is precisely why the request path re-classifies
with runtime task chunks.

### 2.4 Command surface

`/role-model help | setup | ui | status | doctor | requests [limit] | explain <id|latest> |
alias list|recommended|use|choose|refresh|current`. Every non-`help` command runs discovery
first and short-circuits to a diagnostic block on failure. The placeholder token is never
echoed.

### 2.5 Skill

`skills/role-model/SKILL.md` (4.6 KB) — the agent-facing usage documentation for the above.

---

## 3. What DSH provides (verified extension-point inventory)

All names below were confirmed in this session via `cordis_inspect_query` (`Service`,
`Event`) and by reading the DSH source; the live harness is the authority.

### 3.1 Plugin, bundle, and packaging model

- A **bundle** is a package whose `package.json` declares
  `dsh.bundle.patch` → a YAML patch that inserts Loader rows. `plugin_manager`
  `install_bundle` installs and selects it; the profile record lives in
  `dsh.profile.bundles` in the profile's `package.json`.
- A **Host plugin** exports `apply(ctx, config)`, optional `export const inject = [...]`,
  and optional `export const Config` (schemastery). Every registration belongs inside
  `ctx.effect`/`ctx.on` with its disposer returned. A **default-export class** service form
  also exists.
- Display metadata comes from `locale/en.json` (`meta.title`/`meta.description`) plus a
  top-level `icon` path; the manifest may ship its own `client` half
  (`dsh.client.platform` / `inject` / `external`).
- Installed third-party bundles in this profile provide a worked template:
  `@try-works/dsh-browser-agent` (`D:\DEV\dsh-browser-agent`) — `src/index.ts` `apply()`
  → `ctx.effect(function* () { … yield () => teardown })`, `export const inject = ['tools',
  'skills']`, `export { Config }`, `src/skills.ts` registering `ctx.skills.register({...,
  resourceBase: {kind:'directory', path}})`.

### 3.2 The LLM seam — the critical area

| DSH surface | Shape |
|---|---|
| `ctx.llm` (`LlmRuntime`) | adapter registry + streaming model-call API |
| `llm.registerAdapter(providers: string[], adapter: LlmAdapter)` | owns provider routes; `DUPLICATE_ADAPTER` on conflict; returns a disposer + atomic `replace()` |
| `LlmAdapter` (abstract) | `providerInfo`, `providerRetryPolicy`, `imageRequestPricing`, `listModels`, `resolveModel`, `prepareCall`, and the one required `stream(options: GenerateOptions): AsyncIterable<StreamChunk>` |
| `llm.registerConfigurableProviders(entries)` / `listConfigurableProviders()` | directory of route keys a settings surface can offer: `{provider, displayName, settingsNs, settingsPath, declared?, error?}` |
| `llm.registerModelDiscovery(...)` / `discoverModels(...)` | draft-provider interrogation; `LlmDiscoveredModel = {id, name?, contextWindow?, maxTokens?, inputModalities?}` |
| `llm.listModels` / `resolveModelInfo` / `resolveCallConfig` / `prepareCall` / `stream` | the read and dispatch path |
| `llm.resolveCallConfig` | **fails closed** on an unsupported explicit effort (`UNSUPPORTED_REASONING_EFFORT`) — "no clamping or aliasing is performed" |
| event `llm/stream` (**waterfall**) | `(this: LlmRuntime, options: GenerateOptions, next: () => AsyncIterable<StreamChunk>) => AsyncIterable<StreamChunk>` |
| event `llm/adapters-updated` (emit) | provider topology changed |

`LlmResolvedModelInfo` is where per-model capability is declared: `context.contextWindow`,
`defaultMaxTokens`, `reasoning.efforts[{id,name,description?}]`, `reasoning.defaultEffort`,
`systemPromptUpdate`, `toolUpdate`, `inputModalities`.

**`GenerateOptions`** (the assembled request) carries `provider`, `model`,
`reasoningEffort`, `messages` (harness-neutral blocks), `system`, `tools`, `toolHistory`,
`temperature`, `maxTokens`, `stop`, `signal`, `sessionId`, `purpose`. There is **no
free-form body passthrough**.

### 3.3 The one existing body-field injection point

```ts
ctx.deepseekLlmApiExtensions.register(field, { prepare(request) { return { value, accept? } } })
```

`prepare` receives `{ body: Readonly<Record<string, DeepSeekLlmApiJson>>, sessionId?,
purpose?, signal }` and the adapter merges returned fields into the serialized body:
`JSON.stringify({ ...body, ...extensions.fields })`, with collision detection, freezing,
structured cloning, and an `accept()` transaction run only after HTTP 2xx. **This is
functionally identical to Pi's `before_provider_request`** — but it is consulted only by
the official DeepSeek Messages adapter (`packages/llm/llm-deepseek/src/adapter.ts:106`), is
described as "for official DeepSeek requests", and `DeepSeekLlmApiExtensionMap` is an
empty declaration-merge table. The role-model runtime does not speak the DeepSeek Messages
API, and `role_model` sent to `api.deepseek.com` would be meaningless.

### 3.4 Adjacent registries this port also needs

| Pi surface used | DSH equivalent |
|---|---|
| `pi.registerCommand` + `context.ui.notify` | `ctx.commands.register({name, description, input?, handler(invocation)})`; `CommandInvocation = {commandId, agent, rawInput, attachments, signal}`; `CommandResult`; `commands.execute/list`, event `commands/change`, `@Remote` for the Web UI |
| `pi.registerProvider` model list | `llm.registerAdapter` routes + `LlmAdapter.listModels` / `resolveModel` |
| `pi.setModel` / active model | `ctx.agentDefaultModel.currentSelection()` / `saveSelection(next)` |
| thinking-level forcing (`setThinkingLevel` + throw) | `LlmResolvedModelInfo.reasoning` (declare the exact effort set and default) + `resolveCallConfig`'s fail-closed validation. **There is no `model_select` / `thinking_level_select` event.** |
| `refreshModels` + `publish` | model resolution is live per call; `listModels`/`resolveModel` read current config each time; `llm/adapters-updated` announces topology changes |
| bundled skill | `ctx.skills.register({name, description, source, content, resourceBase})` |
| alias store (`~/.pi/agent/role-model.json`) | a DSH-owned store: `Config` (patch-layer tunables), `ctx.settings`, or the storage service — not a dotfile in another agent's home |
| `env` knobs `ROLE_MODEL_ENDPOINT` / `ROLE_MODEL_ALLOW_REMOTE` | plugin `Config` fields (the user's patch layer survives upgrades) |
| `before_provider_request` (payload read + rewrite) | **no equivalent service exists**; the nearest primitives are `ctx.deepseekLlmApiExtensions` (DeepSeek-only) and pi-ai's `onPayload` (supported by the library, **not forwarded by DSH**). See §3.6 |
| — | `ctx.systemPrompt.section()` / `.context()` for prompt-side contributions; `agent/pre-step`, `agent/request`, `system-prompt/assemble`, `tools/*` waterfalls; `ctx.sessionProjections` for per-session derived state |

### 3.6 The payload-transformer primitives that exist but are not wired up

| Primitive | Where | What it does | Reachable from a plugin today? |
|---|---|---|---|
| `ctx.deepseekLlmApiExtensions.register(field, provider)` | `@deepseek-ai/dsh-deepseek-llm-api-extensions` | merges `provider.prepare(request).value` into the serialized body; `accept()` after 2xx | **Yes, but only for the official DeepSeek Messages route** |
| pi-ai `ProviderRequestOptions.onPayload` | `@earendil-works/pi-ai` (`types.d.ts:74-78`) | `(payload, model) => payload \| undefined \| Promise<...>` called on the built body just before dispatch; may return a replacement (`openai-completions.js:187-191`) | **No** — DSH's `PiAiAdapter` never passes it (`adapter.ts:380-389`), and `PiAiProviderProfile` has no field for it |
| pi-ai `StreamOptions.samplingParams` | same (`types.d.ts:118-125`) | `Object.assign(params, samplingParams)` last, so custom keys win (`openai-completions.js:744-747`) | **No** — same reason. Static only, so it cannot carry per-request `role_model` |
| `LlmAdapter.stream(options)` | `@deepseek-ai/dsh-llm` | the adapter owns its own HTTP call | Yes — this is option F in §5 |

`onPayload` is the precise structural analogue of Pi's `before_provider_request`: same
call site (post-serialization, pre-dispatch), same read/write contract, same async
capability. The gap is purely one of DSH plumbing, not of underlying capability.

### 3.5 Runtime facts confirmed live in this session

- The profile is `web` (`$env:DSH_PROFILE`), `$env:DSH_PROFILE_DIR = C:\Users\erikb\.dsh\profiles\web`.
- The `web` profile already routes to role-model through `llm-pi-ai`:
  `role-model-3457` → `http://127.0.0.1:3457/v1` and `role-model-3456` →
  `http://127.0.0.1:3456/v1`, both `api: openai-completions`, with `models:
  [baseline.remote-only, …]`. **These routes carry no intent metadata today.**
- Ports 3457 and 3458 answer `/healthz`; 3456 is not running. 3457's rich discovery works
  and reports 23 models.
- The default model is `deepseek-official / deepseek-flash` at effort `high`, i.e. the
  session's own model is *not* a role-model route.

---

## 4. Capability mapping matrix

| # | pi-role-model capability | DSH mechanism | Status |
|---|---|---|---|
| 1 | **Inject `role_model.intent` into the outbound body** | **none wired up for a non-DeepSeek route**; pi-ai already offers `onPayload` but DSH does not forward it (§3.6) | **Gap — smallest fix is a DSH plumbing change; otherwise a plugin-owned `LlmAdapter`** |
| 2 | Runtime discovery + contract validation (`role-model.downstream.openai.v1`) | plain `fetch` in Host plugin code | Direct port |
| 3 | Compact `/v1/models` fallback + conservative limits | plain `fetch` | Direct port |
| 4 | Remote-endpoint trust gating, fail-closed on required auth | plugin `Config` + own guard | Direct port |
| 5 | Model catalog → harness selectable models | `LlmAdapter.listModels` + `llm.registerConfigurableProviders` | Direct port |
| 6 | Per-model context/output limits | `LlmResolvedModelInfo.context.contextWindow`, `defaultMaxTokens` | Direct port |
| 7 | Per-model reasoning effort identity (`thinkingLevelMap`) | `LlmResolvedModelInfo.reasoning.efforts` + `defaultEffort` | Direct port, **different semantics** (see §6.4) |
| 8 | Forced thinking level with a hard throw | `resolveCallConfig` fail-closed validation | Equivalent, no forcing hook needed |
| 9 | Reject a foreign model id for the role-model provider | adapter `resolveModel` throws `UNKNOWN_MODEL`/`INVALID_CONFIG` | Direct port |
| 10 | Cached/live provider re-registration + refresh | live per-call resolution + `llm/adapters-updated` | Direct port (simpler) |
| 11 | Bundled compact taxonomy + staged lazy loading | package `data/`, `readFileSync` via `import.meta.url` | Direct port (ship the same data) |
| 12 | Runtime-preferred effective taxonomy | plain `fetch` | Direct port |
| 13 | Progressive classifier + two-pass runtime task chunks | pure TS | Direct port, **keep byte-identical output** |
| 14 | `/role-model` command surface | `ctx.commands.register` | Direct port (text/UX adapted) |
| 15 | Agent-facing skill | `ctx.skills.register` + packaged `skills/` | Direct port |
| 16 | Alias/selected-model persistence | `Config` / settings / storage service | Adapted (no `~/.pi` dotfile) |
| 17 | Env-var configuration | plugin `Config` in the bundle patch | Adapted (patch layer replaces env) |
| 18 | Never own the runtime lifecycle / never read secrets | same discipline; enforced by the plugin's own tests | Direct port |

---

## 5. The central design decision: how `role_model` reaches the wire

### Options considered (all re-verified against source)

| Option | Verdict |
|---|---|
| **A.** `ctx.deepseekLlmApiExtensions.register('role_model', …)` | **Rejected.** Only the official DeepSeek Messages adapter consumes it; role-model speaks OpenAI chat-completions/responses from its own runtime. Would also require declaration-merging `DeepSeekLlmApiExtensionMap`, and `role_model` sent to `api.deepseek.com` is meaningless. |
| **B.** Register role-model as an `llm-pi-ai` route and inject at `llm/stream` | **Rejected.** The `llm/stream` waterfall hands you `GenerateOptions` *before* adapter serialization and has no extra-body field; it cannot reach into the adapter's HTTP call. |
| **B′. (recommended) Use `pi-ai`'s existing `onPayload` hook by forwarding it from DSH's `PiAiAdapter`** | **Yes, if a small DSH change is acceptable.** `onPayload` is called on the fully-built body right before dispatch and may return a replacement — functionally identical to Pi's `before_provider_request`, including async support (our injection may await runtime task chunks). The change is roughly 5 lines in `packages/llm/llm-pi-ai` plus one profile type/schema field. |
| **C.** Compose adapter middleware: wrap an existing adapter and patch its request | **Not viable as-is.** `LlmAdapter.stream()` is a black box returning `AsyncIterable<StreamChunk>`; the SSE/fetch layer is internal to `llm-deepseek` and to the pi-ai SDK. |
| **D.** `samplingParams`-style static body fields via profile config | **Rejected for this capability.** Static keys merge into the body last, but `role_model` must be computed **per request** from the prompt, tools, and attachments. (Viable only for constant deployment fields.) |
| **F. (fallback) The plugin supplies its own `LlmAdapter` for its own provider routes** | **Works with zero DSH changes**, at the cost of reimplementing an OpenAI-compatible transport. See §5.2. |
| **G.** Propose the generic hook to DSH upstream (`llm/payload` waterfall, sibling of `llm/stream`) | **Best long-term shape.** Any plugin could then contribute body fields for any provider. Larger scope than this task; see §5.3. |

### 5.1 Recommended: option B′ in detail

**DSH-side change (in the DSH checkout, `packages/llm/llm-pi-ai`).** Two minimal forms:

- *Config-only form:* add an optional profile field (e.g. `samplingParams?:
  Record<string, unknown>` for the static case, and/or a
  `payloadTransformers?: string[]` list of module specifiers) and spread it into
  `profileOptions()`. The plugin then ships a transformer module the profile names. Simple
  to review, but couples plugin wiring into user configuration text.
- *Service form (preferred):* add an `llm/payload` **waterfall** to `dsh-llm`, dispatched by
  the pi-ai adapter (and available to other adapters later) with the serialized body plus
  request identity, e.g.
  `'llm/payload'(this: LlmRuntime, request: { provider, model, sessionId?, purpose?, body: unknown }, next: () => Promise<unknown>): Promise<unknown>`.
  The `PiAiAdapter` forwards it as its `onPayload` implementation. This mirrors DSH's
  existing waterfall style (`agent/request`, `system-prompt/assemble`, `tools/execute`),
  keeps plugin wiring in the plugin, and needs no configuration text at all.

**Plugin-side work then collapses to the valuable part:** discovery, trust gating, the
bundled taxonomy, the classifier, runtime task-chunk expansion, the command surface, and
the skill — plus a small waterfall listener that does exactly what
`injectRoleModelIntentIntoPayloadWithRuntimeTasks` does today, reading `body.model`,
`body.messages`, and `body.tools` from the serialized OpenAI body (the same field names Pi
sees). The plugin keeps all of `llm-pi-ai`'s transport, retry, image/attachment handling,
reasoning-effort declaration, and model catalog for free.

**Why this is the better shape:** it preserves the intent metadata contract byte-for-byte,
reuses the transport DSH already ships and tests, keeps the plugin's diff small and
reviewable, and produces an upstream capability (a payload waterfall) that benefits every
future gateway-style provider rather than being a one-off.

**Cost:** it modifies the harness, so it is a DSH contribution and needs its own tests,
review, and release path rather than being installable from the role-model repo alone.

### 5.2 Fallback: option F (plugin-owned `LlmAdapter`)

Choose this if DSH must not be modified for this deliverable.

- The plugin calls `ctx.llm.registerAdapter(['role-model'], adapter)` and owns
  `POST {baseURL}/chat/completions`.
- It must build the OpenAI chat body from `GenerateOptions` and translate OpenAI SSE into
  DSH `StreamChunk`s (`block-start`, `text-delta`, `reasoning-delta`, `tool-call-delta`,
  `block-end`, `usage`, `finish`). The role-model runtime is OpenAI-compatible SSE-only, so
  the Responses API and WebSocket transports are out of scope for v1.
- It must map DSH's neutral content blocks (text / reasoning / image / file / tool-call and
  tool results) into OpenAI messages and back, resolving images through `ctx.attachments`
  (`readImageRequest`) as data URLs, matching how `llm-deepseek` and `llm-pi-ai` do it.
- It must honour the `LlmAdapter` contract: `attributionHeaders()` on every request,
  `options.signal` cancellation, and normalized `LlmError` codes (`AUTH`, `QUOTA`,
  `RATE_LIMIT`, `CONTEXT_WINDOW_EXCEEDED`, `INVALID_REQUEST`, `SERVER`, `TIMEOUT`,
  `ABORTED`, `TRANSPORT`, `EMPTY_RESPONSE`) with `status` / `requestId` /
  `providerRetryAfterMs` populated for `llm-retry`.
- The plugin's existing discovery/auth/trust code ports unchanged, and the trusted
  `placeholderToken` becomes the `Authorization: Bearer` value exactly as Pi uses it.
- **`accept()` is not needed.** Unlike the DeepSeek extension registry (which must defer
  state commits until 2xx), the intent metadata is stateless advisory data computed per
  request, so no post-2xx transaction exists.
- Isolate the body builder as one small function (`buildChatBody(options, model, intent)`)
  so a future `llm/payload` waterfall could replace this whole path without a rewrite.

### Residual risk and mitigations

| Risk | Mitigation |
|---|---|
| Option B′ requires a DSH change, so the plugin alone is not installable into a stock profile | Ship both: the plugin works standalone via option F's adapter, and detects/uses the payload waterfall when present. Or stage it: land the DSH waterfall first, then the thin plugin. |
| Option F reimplements SSE + message translation — the largest new code surface, and a drift risk versus `llm-pi-ai` | Keep it narrow (chat-completions: text/image/tool-calls/usage/reasoning) and pin it with tests mirroring `llm-pi-ai`'s `stream.ts` cases. Port the pi-role-model suite wholesale for the non-transport layers. |
| Model-selection UX (alias switching) differs: DSH selects models in the Client UI plus `agentDefaultModel`, with no `setModel` call from a command handler | Implement `/role-model alias use` as a persisted decision plus `listModels` ordering (recommended alias first) and report honestly that the active model changes in the picker; or write through `agentDefaultModel.saveSelection` for the session default. |
| Reasoning-effort semantics: Pi *forces* a fixed level and throws; DSH *declares an effort set and rejects unsupported values* | Declare only role-model-advertised efforts as `reasoning.efforts`, and map a fixed-effort endpoint's sole effort to `defaultEffort`. `resolveCallConfig` then fails closed on anything else — the same intent, with no forcing hook required. |

### 5.3 The upstream shape worth proposing

Regardless of which option is implemented first, the durable fix is a **provider-neutral
request-body waterfall** in `dsh-llm` (option G), dispatched by every OpenAI-compatible
adapter and forwarded as pi-ai's `onPayload` where applicable. That single addition turns
"my gateway needs an extra body field" from a bespoke adapter into a few lines of plugin
code, which is precisely the capability `pi-role-model` relies on Pi for.

---

## 6. Proposed plugin architecture

### 6.1 Package and bundle

Shared by both paths (option B′ and option F):

```
dsh-role-model/
  package.json            # dsh.bundle.patch + icon + files
  cordis.patch.yml        # insert the host plugin row (Config carries endpoint/trust/timeout)
  locale/en.json          # meta.title / meta.description
  icon.svg
  skills/role-model/SKILL.md
  data/taxonomy/**        # ported verbatim from packages/pi-role-model/data/taxonomy
  src/
    index.ts              # apply(ctx, config): effects only
    config.ts             # Config schema (endpoint, allowRemote, timeoutMs, providerRoute, aliasStore)
    runtime-discovery.ts  # health/version/downstream-openai + /v1/models fallback        (port)
    downstream-openai.ts  # contract validation + provider/model mapping                  (port)
    trust.ts              # assessEndpointTrust                                           (port)
    taxonomy/             # compact-data, staged reader, resolve-effective, classifier    (port)
    intent.ts             # body-level intent: extract context → classify → role_model    (port of request-intent.ts)
    commands.ts           # /role-model subcommands via ctx.commands.register             (adapt)
    skills.ts             # ctx.skills.register for the bundled skill                     (new, small)
```

Plus, **for option B′**:

```
    payload-hook.ts       # the injection listener: reads the serialized body, writes role_model
```

Plus, **for option F** (only if the fallback is taken):

```
    adapter.ts            # LlmAdapter: listModels / resolveModel / stream
    openai-wire.ts        # GenerateOptions → chat body; SSE → StreamChunk
```

### 6.2 Extension points used

**Option B′ (recommended):**

- The DSH-side `llm/payload` waterfall (or an equivalent per-route payload transformer) —
  the plugin's one new listener. It performs the entire capability-1 port: read
  `body.model`, `body.messages`, `body.tools`; apply the same gating
  (known model id → no pre-existing `role_model.intent` → non-blank prompt); run the
  two-pass classifier; return `{...body, role_model}`. Because the waterfall may be async,
  the runtime task-chunk expansion needs no special handling.
- `ctx.llm.registerConfigurableProviders([...])` — so the `role-model` route appears in
  model settings.
- `ctx.commands.register({name: 'role-model', …})` — one definition, subcommand dispatch
  inside the handler, `CommandResult` text carrying the same `status`/`doctor` fields.
- `ctx.skills.register({name: 'role-model', source: 'bundled', content, resourceBase})`.
- Everything wrapped in one `ctx.effect(function* () { … yield () => teardown })`, mirroring
  `dsh-browser-agent`.
- No Client half in v1: the command surface and the model picker already live in the Web UI.

**Option F (fallback):** all of the above, minus the payload waterfall, plus
`ctx.llm.registerAdapter(['role-model'], adapter)`.

### 6.3 Intent injection, precisely

Inside the adapter's `stream(options)`, after the chat body is built and before
`JSON.stringify`:

```
if (options.provider is ours) and (options.model ∈ discoveredIds)
  and (no role_model already present)
  and (extracted prompt is non-blank):
      body.role_model = classify({ prompt, context: {hasTools, toolNames, hasImages,
        hasFiles, fileExtensions} }).role_model
```

Context extraction adapts from the OpenAI payload shape to `GenerateOptions`:
`prompt` = last `user` message's text blocks; `hasImages` = any `ImageBlock`;
`hasFiles` = any `FileBlock`, with extensions from the attachment filename; `hasTools` =
`options.tools?.length`; `toolNames` = `options.tools.map(t => t.name)`. The **tool-name
hint table** must be extended with DSH's real tool names (`read`, `write`, `edit`,
`glob`, `grep`, `pwsh`, `bash`, `subagent`, `skill`, `web_search`, `web_fetch`, …) or those
`+1` signals never fire; the taxonomy's `.ts`/`.md`/`.pdf` extension hints port as-is.

Two-pass runtime expansion is preserved verbatim (candidate roles → runtime role summaries
→ per-role `tasks.compact` → re-classify), with the package taxonomy as the fallback.
Caching: the effective taxonomy is fetched once and refreshed at plugin start and on
demand, as in Pi.

### 6.4 Reasoning effort mapping (`thinkingLevelMap` → DSH `reasoning`)

| Discovery shape | DSH `LlmResolvedModelInfo.reasoning` |
|---|---|
| fixed effort `high` (single supported token) | `{efforts: [{id:'high', name:'High'}], defaultEffort: 'high'}` |
| endpoint type with no fixed effort | `reasoning` omitted entirely (no misleading control), exactly like Pi returning `undefined` |
| advertised `effortLevels: [none, low, medium, high]` | efforts mapped through the same `none → off` normalization |
| token Pi/DSH cannot express (e.g. `ultra`) | omitted if no token maps; the model stays selectable by exact id |

Any effort outside the declared set is then rejected by `resolveCallConfig` with
`UNSUPPORTED_REASONING_EFFORT` — the DSH-native expression of Pi's
`"Pi could not apply required thinking level …"` throw.

### 6.5 Configuration surface (replacing env vars and the `~/.pi` alias file)

```yaml
- insert:
    - id: dsh-role-model
      name: '@try-works/dsh-role-model'
      config:
        endpoint: http://127.0.0.1:3456   # 3457/3458 for stage/dev channels
        allowRemote: false
        providerRoute: role-model
        requestTimeoutMs: 2500
        aliasStorePath: null              # defaults to a DSH-owned location
```

`ROLE_MODEL_ENDPOINT` / `ROLE_MODEL_ALLOW_REMOTE` remain honored as optional fallbacks for
parity, but the patch layer is authoritative and upgrade-safe.

### 6.6 Testing plan (mirroring the Pi suite)

| Port target | New adapter tests |
|---|---|
| contract validation, `/v1/models` fallback, conservative limits, degraded diagnostics, fail-closed auth | **body contains `role_model` with the exact expected shape** (the single most important test) |
| trust gating (loopback / remote-blocked / remote-untrusted) with zero network calls asserted | idempotence: an existing `role_model.intent` is untouched |
| classifier snapshots: 6 groups, 28 roles, 280 tasks, per-role ≥10 tasks, `coder.review` fields, 6 `test.each` classification cases, 28-role coverage table, consulted-chunks-only, ambiguous-prompt group-first fallback | request translation: text, image, tool-call, tool-result, reasoning blocks |
| staged loader laziness (manifest + exactly one role chunk) | SSE → `StreamChunk` for text, reasoning, tool calls, usage, `finish_reason`, error frames |
| data-file integrity: recomputed sha256, per-group/role mirrors, index ≤26 KiB, every chunk ≤26 KiB | cancellation, idle timeout, `LlmError` code mapping, `attributionHeaders()` present |
| command text: help/status/doctor/alias/requests/explain, no placeholder-token leakage | `listModels`/`resolveModel` effort sets and limits from live discovery |
| safety: no `child_process`/`spawn`/`exec`, no auth-file reads, no runtime lifecycle management | — |

---

## 7. Divergences from the Pi plugin (deliberate)

Superseded in part by §10 (decisions taken). Kept for the record.

1. **No `setModel` from a command.** DSH model selection is a Client concern plus
   `agentDefaultModel`. `/role-model alias use` records the choice and reports the exact
   next action rather than pretending to switch the live model.
2. **No `model_select` / `thinking_level_select` hook.** Effort correctness is enforced by
   declaring the effort set and letting `resolveCallConfig` reject the rest.
3. **No environment-variable-first configuration.** Plugin `Config` replaces
   `ROLE_MODEL_ENDPOINT` / `ROLE_MODEL_ALLOW_REMOTE`; env remains a fallback only.
4. **No `~/.pi/agent/role-model.json`.** The selected-alias record lives in a DSH-owned
   location so it follows DSH profiles, not Pi's home.
5. **Different error/normalization vocabulary.** Pi pipeline errors become `LlmError`
   codes so `llm-retry` and the token meter work unchanged.
6. **`classification_version` stays `role-model.pi-classifier.v1`?** Recommend keeping the
   literal for wire fidelity to the runtime's documented example, or introducing
   `role-model.dsh-classifier.v1` **only** if the runtime's acceptance does not key on it.
   The runtime branch shown in §2.1 reads `contract_version`, `taxonomy_version`, and
   `classification_contract_version`, not `classification_version` — so a DSH-specific
   value is safe, but changing it buys nothing and costs a divergence. **Keep the Pi
   literal.**
7. **Bundled data is copied, not referenced.** `packages/pi-role-model/data/taxonomy` is
   shipped in the Pi package; the DSH plugin must ship its own copy (and regenerate hashes)
   or read it from an installed `@try-works/pi-role-model`. Copying is safer and keeps the
   DSH plugin independently installable.

---

## 8. Open questions for the user

1. **Which path: the small DSH change (option B′) or the self-contained adapter (option F)?**
   This is the decision that shapes everything else. B′ is a few lines in
   `packages/llm/llm-pi-ai` (plus optionally a `llm/payload` waterfall in `dsh-llm`) and
   keeps the plugin thin and correct by reusing DSH's tested transport. F needs no DSH
   change but reimplements an OpenAI-compatible SSE transport inside the plugin.
2. **Where should the plugin live?** Options: a new package in this repo
   (`packages/dsh-role-model`, mirroring `packages/pi-role-model`, published as
   `@try-works/dsh-role-model`), or a standalone repo beside `dsh-browser-agent`
   (`D:\DEV\dsh-role-model`). The repo's own `BUSL-1.1` and PR workflow (branch off
   `origin/dev`, PR into `dev`) apply if it lands here.
3. **Internal-code access.** Both paths need `@deepseek-ai/dsh-llm` and
   `@deepseek-ai/cordis` as peer dependencies, exactly as `dsh-browser-agent` declares
   them; B′ additionally touches the DSH checkout. Confirm that is acceptable.
4. **Route naming.** The profile currently has `role-model-3456` / `role-model-3457` routes
   through `llm-pi-ai` that do **not** inject intent. Should the new plugin (a) take over
   those route keys so intent injection automatically applies, or (b) register a distinct
   route such as `role-model` and leave the pi-ai routes as-is for A/B comparison?
5. **Channels.** Should the plugin default to `3456` (production, currently not running
   here), or to the stage/dev channel that is running (`3457`/`3458`)?
6. **Client half.** Is a Web-UI panel wanted in v1 (model/alias list, intent preview for
   the last request, doctor output), or is the `/role-model` command surface sufficient
   initially?
7. **Scope of the DSH-side contribution.** If B′ is chosen, should the change be the
   minimal `onPayload`/`samplingParams` plumbing in `llm-pi-ai`, or the fuller
   provider-neutral `llm/payload` waterfall in `dsh-llm` (option G) that also benefits
   other adapters?

---

## 9. Recommendation

**Preferred: option B′.** Land a small DSH-side change that lets a plugin transform the
serialized provider request body — minimally by forwarding pi-ai's existing `onPayload` (and
`samplingParams`) from `packages/llm/llm-pi-ai/src/adapter.ts`, ideally by adding a
provider-neutral `llm/payload` waterfall to `dsh-llm` so the capability is not pi-ai-specific.
Then `@try-works/dsh-role-model` is thin and high-value: port the discovery, trust, taxonomy,
classifier, command, and skill layers from `packages/pi-role-model` essentially verbatim
(they are pure TypeScript with no Pi dependency), and add one injection listener that reads
`body.model` / `body.messages` / `body.tools` and writes `role_model`. The intent metadata
contract — the `role_model` object, its gating, its idempotence, and the classifier's exact
outputs — is preserved byte-for-byte, which is the capability the user asked to keep, and
DSH's existing transport, retry, image, and model-catalog machinery is reused rather than
reimplemented.

**Fallback: option F.** If DSH must not be modified for this deliverable, the same plugin
plus a plugin-owned `LlmAdapter` (body builder + SSE translator) delivers the identical
observable behaviour at the cost of a larger, drift-prone transport implementation. If this
path is taken, still isolate the body builder so the eventual `llm/payload` waterfall can
replace it without a rewrite.

Either way the plugin is a host bundle installable with `plugin_manager` `install_bundle`,
configurable entirely from `cordis.patch.yml`, and independently testable against the
running runtime on `127.0.0.1:3457`.

---

## 10. Decisions taken (path F)

User decisions: **DSH must not be modified, so path F is the only option**; the package
lives at **`packages/dsh-role-model`**; the plugin **registers its own routes**; and there
**must be a Web UI panel**.

### 10.1 Can the divergences be closed under path F?

Yes — path F closes the two that mattered, and the rest were never blockers. One new
non-obvious requirement fell out of the analysis (§10.3).

| # | Divergence from §7 | Under path F | How it is closed |
|---|---|---|---|
| 1 | No `setModel` from a command | **Closable** | The plugin owns its adapter, so it owns `listModels`/`resolveModel`. The Web UI panel (required anyway) presents the alias list and provides the selection UI, including recommended/selected markers, and can write the session default through `ctx.agentDefaultModel.saveSelection`. The `/role-model alias use` command keeps the Pi text but reports honestly, and no longer has to pretend to drive a picker it does not own. |
| 2 | No `model_select` / `thinking_level_select` hook; thinking level could not be *forced* | **Closable, and actually unnecessary** | Pi forced a level through `setThinkingLevel` because Pi's own model list could offer levels the endpoint refuses. Because the plugin now derives the model list from the runtime and declares the effort set itself, the offered set is exact by construction — a fixed-effort endpoint declares exactly one effort as `defaultEffort`. `resolveCallConfig` then rejects anything outside the set with `UNSUPPORTED_REASONING_EFFORT`, which is the same fail-closed outcome as Pi's throw. Owning the adapter is *stronger* than a select-hook. |
| 3 | Env-var-first configuration | **Adapted** | Plugin `Config` (patch layer) is authoritative and upgrade-safe; `ROLE_MODEL_ENDPOINT` / `ROLE_MODEL_ALLOW_REMOTE` stay as optional fallbacks for parity. |
| 4 | `~/.pi/agent/role-model.json` | **Adapted** | The selected-alias record moves to a DSH-owned location (plugin `Config` path under `$DSH_HOME`, mirroring how `dsh-browser-agent` defaults its vault dir). Pi's home is never read or written. |
| 5 | Different error vocabulary | **Must be handled carefully — see §10.3** | The adapter throws the host's `LlmError` so `AUTH` / `RATE_LIMIT` / `QUOTA` / `CONTEXT_WINDOW_EXCEEDED` / `SERVER` survive `normalizeLlmFailure` and reach `llm-retry`. |
| 6 | `classification_version` literal | **No divergence** | Keep `role-model.pi-classifier.v1`: the runtime's acceptance branch reads `contract_version`, `taxonomy_version`, and `classification_contract_version`, so changing it buys nothing and costs wire-fidelity. |
| 7 | Bundled data copied | **Confirmed** | The plugin ships its own `data/taxonomy/**` copy with regenerated sha256 hashes; it never reads an installed `@try-works/pi-role-model`. |

Net: the faithful-injection requirement, the model/effort surface, and the command surface
are all fully achievable. Nothing about path F forces a visible capability regression.

### 10.2 Because the plugin owns the adapter, it registers its own routes

The plugin registers **new** route keys (e.g. `role-model` for the local runtime, with the
channel as configuration) and leaves the existing `role-model-3456` / `role-model-3457`
`llm-pi-ai` routes untouched, so the user can A/B a routed request with and without intent
metadata. `llm.registerAdapter` throws `DUPLICATE_ADAPTER` on a collision, so the route key
is validated as free at activation, and a clear diagnostic is required if it is not.

### 10.3 New hard requirement: module identity with the host's `dsh-llm`

This was not in the first analysis and it constrains the whole implementation.

The plugin imports `@deepseek-ai/dsh-llm` (for `LlmAdapter`, `LlmError`, `GenerateOptions`,
`StreamChunk`). A profile-installed bundle installs its **own** `node_modules`, and
`dsh-browser-agent` is proof of the pattern: its nested `@deepseek-ai/dsh-llm` and `cordis`
are pnpm junctions to its own copies. So the plugin gets a *second* class identity for
`LlmError`/`HarnessError`.

That would silently break failure classification:

```ts
// packages/llm/llm/src/adapter-failure.ts:104-107
/** Trust only Harness-owned codes; third-party SDK codes are not our taxonomy. */
function harnessErrorCode(error: Error): string {
  return error instanceof HarnessError ? error.code : 'UNKNOWN'
}
```

A duplicated `LlmError` fails that `instanceof`, so every auth/rate-limit/quota/context
failure the adapter reports would normalize to `{ code: 'UNKNOWN' }` — which is **not** in
`DEFAULT_RETRYABLE_CODES`, so `llm-retry` would stop retrying transient failures and
telemetry would lose the failure taxonomy.

Two mitigations, both required:

1. **Resolve the host's module, not the plugin's.** The host here runs from the source
   checkout (`pnpm dsh web --no-open` from `D:\deepseek-harness`), so the exact instance to
   reuse is `D:\deepseek-harness\packages\llm\llm\lib\index.js`. The plugin should obtain
   `LlmAdapter` / `LlmError` by resolving `@deepseek-ai/dsh-llm` **relative to the host**
   (a documented resolution order plus a `Config` override, cached once per activation),
   and only fall back to its own import when that fails. Cordis' `Context` augmentation for
   the `llm` service must still come from the plugin's own copy of the types — only the
   *runtime classes* need to be the host's.
2. **Belt and braces: the `failure` carrier already exists for exactly this case.**
   `normalizeLlmFailure` anticipates cross-package copies:

   ```ts
   // adapter-failure.ts:20-27
   // Cross-package copies preserve own data but not class identity. Trust the
   // carried facts only when both own properties agree after validation.
   const carried = ownFailureSnapshot(error)
   if (carried !== undefined && carried.code === ownErrorCode(error)) return carried
   ```

   So an error carrying an own `failure` object (`{message, code, status?, requestId?,
   providerRetryAfterMs?}`) whose `code` equals its own `code` is accepted even without
   class identity. Building errors through the host's `LlmError` gives this for free
   (`LlmError` sets `readonly failure`); if the host module cannot be resolved, the fallback
   is to attach an equivalent frozen `failure` own-property and match `code`.

This must be verified empirically before the adapter is considered done: a deliberate HTTP
401 (and a deliberate 429 with a `Retry-After`) must surface as `AUTH` / `RATE_LIMIT` with
the right `status` in the terminal failure, not `UNKNOWN`. That test is the acceptance gate
for §10.3.

### 10.4 Resulting package shape

Per the decision, the package is `packages/dsh-role-model/` in this repo, mirroring
`packages/pi-role-model/`, published as `@try-works/dsh-role-model`, with both halves:

```
packages/dsh-role-model/
  package.json          # dsh.bundle.patch, dsh.client{platform,immediately,inject,external}, icon, files
  cordis.patch.yml      # host plugin row carrying Config
  locale/en.json        # meta.title / meta.description
  icon.svg
  skills/role-model/SKILL.md
  data/taxonomy/**      # copied from packages/pi-role-model/data/taxonomy
  src/
    index.ts            # apply(ctx, config) — effects only
    host-llm.ts         # §10.3 module-identity resolution (LlmAdapter/LlmError from the host)
    config.ts           # Config schema
    runtime-discovery.ts  downstream-openai.ts  trust.ts   # ported
    taxonomy/**         # ported (compact-data, staged reader, resolve-effective, classifier)
    intent.ts           # §2.1 classification → role_model
    adapter.ts          # LlmAdapter: listModels / resolveModel / stream, injecting role_model
    openai-wire.ts      # GenerateOptions → chat body; SSE → StreamChunk
    commands.ts         # /role-model via ctx.commands.register
    skills.ts           # ctx.skills.register
    client/
      index.tsx         # Web UI panel (see §10.5)
  test/
```

The Web UI panel mounts where DSH actually allocates space (verified against the live slot
tree), rather than shadowing shipped UI:

| Slot | Kind | Use |
|---|---|---|
| `settings.section` | list (root) | **Primary.** A "Role Model" settings page: status, doctor output, sections/aliases with recommended + selected markers, effective taxonomy versions, last-request intent preview, and the route/endpoint/trust configuration summary. |
| `settings.models.provider-card` | keyed by `settingsNs` | Per-provider-card extension, so the role-model provider card itself carries its route health, discovered-model count, and degraded-model diagnostics. |
| `settings.plugins.tab` | list | Optional: a page inside the Plugins section, if the runtime view reads better there. |

The Client half is plain JS/TSX emitted as a `__ModuleLoader__` factory (no Cordis package
import), depends on **theme tokens only** (`--dsw-alias-*`), takes React from the browser
module table, and must not import Harness Client packages such as
`dsh-client-ui-primitives`. Visible text goes through the Client locale service.

### 10.5 Revised build order

1. **Spike §10.3 first** — a throwaway plugin that resolves the host's `dsh-llm`, registers
   a stub adapter on a test route, and proves `LlmError` codes survive
   `normalizeLlmFailure`. Everything else depends on this answer.
2. Port the pure layers (discovery, trust, taxonomy, classifier, data) with the Pi tests —
   no DSH dependency, so they can be trusted early.
3. Implement the adapter + `role_model` injection; verify against the live runtime on
   `127.0.0.1:3457` by asserting the injected body and reading the routing decision back
   from `/api/role-model/router/decisions/<requestId>`.
4. Add the command surface, the skill, and the Web UI panel.
5. Install as a bundle in the `web` profile and verify the panel renders correctly in both
   light and dark themes beside a comparable host settings page.
