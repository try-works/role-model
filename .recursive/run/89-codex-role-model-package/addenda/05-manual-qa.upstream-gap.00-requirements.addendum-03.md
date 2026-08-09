Run: `/.recursive/run/89-codex-role-model-package/`
Phase: `05 Manual QA`
Addendum: `05-manual-qa.upstream-gap.00-requirements.addendum-03`
Status: `LOCKED`
LockedAt: `2026-08-07T09:46:35Z`
LockHash: `5f813625d5a5d4b46c3aa5abe5e7f8bdfdab9cf86a3b5f98fe6ada7105eb9731`
Workflow version: `recursive-mode-audit-v2`
QA Execution Mode: `hybrid`
Inputs:
- `/.recursive/run/89-codex-role-model-package/00-requirements.md` (LOCKED) — `R5`, `R10`, `R11`, Fixed Decisions #8/#20/#25, `OOS7`, `OOS11`, `OOS15`, `OOS16`
- `/.recursive/run/89-codex-role-model-package/addenda/05-manual-qa.upstream-gap.00-requirements.addendum-01.md` (DRAFT)
- `/.recursive/run/89-codex-role-model-package/addenda/05-manual-qa.upstream-gap.00-requirements.addendum-02.md` (DRAFT)
- User direction (2026-08-05): Approach C as a **Codex-adapter-only bidirectional tool bridge**; **strict TDD**; **live role-model runtime + live Codex** verification; **must not change the role-model router code**; **must not impact pi or other consumer apps**; bridge MUST be **vendor-neutral** for **any endpoint/model role-model can route**; requests MUST still **travel through the main role-model router**; **telemetry / inspection / explain / request receipts MUST continue as usual**; implementation MUST include **adapter logs + correlation tracing** sufficient to test and debug the bridge end-to-end
- Live evidence (2026-08-05): Desktop `no_eligible_target` for `baseline.remote-only` despite healthy DeepSeek flash/pro targets (proof target, not sole supported vendor); plain text Responses OK; Desktop `tools[]` mix included `function:*` + `web_search` + `namespace` + `tool_search` + `custom` (`apply_patch`); dump at `$CODEX_HOME/role-model/last-forwarded-request.json`
- Repo architecture: `docs/architecture/14-routed-execution-semantics-and-receipts.md` (portable tool mapping across providers)
Outputs:
- `/.recursive/run/89-codex-role-model-package/addenda/05-manual-qa.upstream-gap.00-requirements.addendum-03.md`
Scope note: Authorizes a **Codex-adapter-only** bidirectional tool bridge inside `packages/codex-role-model` that normalizes Codex tool wire shapes, then **forwards every role-model hop through the existing main runtime router** so alias routing, eligibility, provider execution, and **telemetry/inspection** work for **any** role-model-supported endpoint/model (not DeepSeek-only). **Forbidden:** bypassing the runtime; editing `role-model-router` for this requirement; changing pi/other consumers.

## TODO

- [x] Record Desktop `no_eligible_target` root cause vs hosted Codex tool shapes
- [x] Ground requirements in DeepSeek Codex integration, duolahypercho/codex-router, and openai/codex
- [x] Authorize **adapter-only** bidirectional tool bridge (`R12`); router **code** unchanged; traffic still via main router; vendor-neutral; telemetry as usual; **logs/tracing for debug**; pi/other consumers unaffected
- [x] Implement under **strict TDD** (RED → GREEN evidence paths) in `packages/codex-role-model` only
- [x] Prove offline: flatten + restore against Desktop tool-dump fixture (adapter unit/integration)
- [x] Prove live: Codex → adapter → **main runtime router** → any eligible role-model target with real tool and (when configured) MCP path
- [x] Prove telemetry/explain/request inspection still populated as for ordinary role-model hops (accepted via main-router hop + Phase 5 explain/requests evidence; residual deep G2/G3 MCP polish optional follow-up)
- [x] Prove adapter bridge logs + correlation id join to runtime telemetry for the same turn
- [x] Confirm router source diff empty for this work; pi package/tests untouched
- [x] Fold evidence into Phase 5 receipt / human sign-off (operator sign-off 2026-08-07)
- [x] Live Desktop/CLI MCP/function tool call end-to-end (G2/G3) beyond eligibility replay — waived as optional follow-up at Phase 5 sign-off; eligibility + web_search/protocol path verified

## Hard Boundary (normative)

| Surface | In scope for `R12`? |
| --- | --- |
| `packages/codex-role-model/**` (adapter forwarder, tool-bridge module, catalog soft knobs, tests) | **YES** |
| `role-model-router/**` source (eligibility, tool plan, Responses mapping, SSE renderer, telemetry emitters) | **NO edits** — do not modify for this addendum |
| Live use of the running main router (`/v1/responses`, routing, telemetry, explain/inspection) | **YES — required hop**; adapter MUST NOT bypass or replace it |
| `packages/pi-role-model/**` and other consumer packages | **NO** — must not change |

**Request path (normative):**

```text
Codex Desktop/CLI
  → codex-role-model adapter (intent inject + Codex tool-bridge)
  → role-model main runtime router (/v1/responses)   ← always
  → any eligible endpoint/model the router selects
  → adapter (tool-bridge restore + SSE client-compat)
  → Codex
```

**Isolation guarantee:** Pi and other apps talk to the runtime directly (or via their own packages). They never pass through `codex-role-model`. Adapter-local rewrite cannot affect them when router **source** is left unchanged.

**Telemetry guarantee:** Because every role-model hop still enters the main router, existing runtime telemetry, routing decisions, request inspection, cost/endpoint receipts, and `explain` surfaces MUST continue to collect **as usual**. The adapter MUST NOT short-circuit to a provider, strip `role_model.intent`, or omit headers/fields the runtime needs for normal observability.

## Reference Grounding (normative sources)

These sources define **what** Codex emits, **who** owns tools, and **how** third-party **adapters/proxies** stay compatible. This addendum implements the portable subset **inside the Codex adapter only** (same placement class as codex-router’s local proxy / LiteLLM edge and codex-ollama-proxy — not a shared runtime default).

### 1) DeepSeek ↔ Codex integration

| Source | What we take as ground truth |
| --- | --- |
| DeepSeek Agent Integrations → Codex (API docs / cookbook pattern) | Codex talks **Responses** (`wire_api = "responses"`). Custom providers need a full **`model_catalog_json`**. Catalog fields (`tool_mode`, `web_search_tool_type`, `apply_patch_tool_type`, `shell_type`, `truncation_policy.mode`) shape what Desktop attaches. |
| DeepSeek V4 catalogs + our `roleModelCatalogOverrides` | Soft knobs (`tool_mode: null`, `web_search_tool_type: "text"`, freeform `apply_patch`, DeepSeek-valid truncation) reduce bad attachment but do not replace a protocol bridge when Desktop still sends hosted/`namespace` tools. |
| DeepSeek Responses proxy patterns (community) | Bridges adapt `apply_patch` freeform → callable function and round-trip tool-call history **at the proxy**, without requiring every upstream to speak Codex namespace wrappers. |

**Implication:** Catalog Approach A stays complementary in the Codex package. Bidirectional bridge Approach C is mandatory in the **adapter** when Codex still emits non-function wire types.

### 2) duolahypercho/codex-router

| Source | What we take as ground truth |
| --- | --- |
| https://github.com/duolahypercho/codex-router — `README.md`, `docs/HOW-IT-WORKS.md` | **Host (Codex) owns** commands, permissions, MCP, skills, plugins, conversation state. The local router/proxy owns **inference hop + protocol translation** for Codex traffic. |
| LiteLLM `drop_params: true` / Responses→chat | Unsupported OpenAI-hosted shapes are handled on the **Codex integration edge**, not by teaching every app consumer the same rewrite. |
| Transport | Zstd/gzip/deflate/br decode at the Codex-facing proxy (already mirrored in our adapter). |

**Implication for placement:** Treat `codex-role-model` like a Codex-facing edge that **translates then hands off** to the shared role-model router (routing + telemetry remain centralized). Do not bypass the main router; do not vendor-lock the bridge to DeepSeek.

### 3) openai/codex (upstream wire + namespace policy)

| Source | What we take as ground truth |
| --- | --- |
| openai/codex#23186, #26234, #32318 | MCP/plugins use Responses `type: "namespace"`. Third-party endpoints often reject/ignore wrappers → MCP unusable unless flattened. |
| openai/codex PR #29602 (`namespace_tools`) | Flatten to canonical function names and resolve flat calls back to namespaced identity — a **Codex↔provider compatibility** concern. |
| openai/codex#20574 | `tool_search` must restore to the native call item Codex expects, not a bare generic function payload that fatals. |
| https://github.com/bharat2808/codex-ollama-proxy | **Local proxy** bidirectional recipe (flatten, reverse-map, `tool_search` shim, `apply_patch`) — confirms adapter/proxy placement, not shared backend mutation. |

**Implication:** Implement flatten + reverse-map in `codex-role-model`, aligned with canonical `mcp__<server>__<tool>` naming where applicable.

### 4) In-repo architecture

| Source | What we take as ground truth |
| --- | --- |
| `docs/architecture/14-routed-execution-semantics-and-receipts.md` | Portable tool-call ordering/ids; do not fake OpenAI opaque chain state on DeepSeek. |
| Locked `OOS7` | Changing runtime routing algorithms remains out of scope — this addendum **does not** supersede `OOS7`. |
| `R11` / Fixed Decision #25 | Live Codex→adapter→runtime proof still required. |

## Gap

Locked requirements assume adapter intent inject + streaming passthrough and forbid router algorithm changes (`OOS7`). They do not specify Codex Desktop proprietary tool wire compatibility.

Measured failure: Desktop tool mixes trigger runtime `no_eligible_target` before DeepSeek execution. Fixing that **inside the shared router** would risk pi/other consumers. Fixing it **in the Codex adapter** (normalize tools before upstream; restore shapes on the way back) keeps the router and other apps unchanged.

## Quality Bar

| Attribute | Enforcement |
| --- | --- |
| **Comprehensive** | Request + response/SSE, eligibility via pre-upstream normalize, catalog complement, ownership, failure modes, verification, extensibility, non-goals, **hard adapter-only boundary** |
| **Specific** | Exact package paths, transform matrix, naming scheme, evidence paths, acceptance predicates |
| **Verifiable** | Adapter TDD + offline fixture + live Codex/runtime; **router git diff must be empty** for `R12` implementation |
| **Extensible** | Versioned bridge module + handler registry inside the Codex package |
| **Future-proof** | Aligns with openai/codex flatten; Codex remains agent host; other consumers get their own packages/bridges later without inheriting this code path |

## Amendment (authoritative)

### A. New requirement `R12` — Codex adapter bidirectional tool bridge

**Title:** Codex Responses tool bridge (adapter-only)

**Description:**  
`packages/codex-role-model` MUST translate Codex tool wire shapes to ordinary function/shim tools on role-model-bound hops, then **MUST forward the transformed request to the main role-model runtime router** (`ROLE_MODEL_ENDPOINT` `/v1/responses`) so the router performs alias routing, eligibility, provider selection, execution, and **telemetry as today** for **any** endpoint/model role-model supports. The adapter MUST restore Codex-compatible call shapes on the return path. **Router source MUST NOT be modified** for this requirement. **Pi and other consumer apps MUST NOT be impacted.** The bridge MUST NOT be DeepSeek-specific.

#### A.1 Placement and hop path (normative)

| Component | Duty |
| --- | --- |
| `packages/codex-role-model` forwarder | Role-model hops: intent inject → **tool-bridge request transform** → **HTTP proxy to main runtime** → **tool-bridge restore** + SSE client-compat. Native ChatGPT hops unchanged (no bridge). |
| `packages/codex-role-model` `CodexToolBridge` module | Vendor-neutral flatten/shim + reverse map + SSE/JSON restore; versioned handler registry |
| Main role-model runtime (unchanged source) | **Required hop.** Alias/strategy routing, capability eligibility on post-bridge tools, provider execution to **any** configured local/remote endpoint, existing telemetry/inspection/explain/receipts |
| Pi / other consumers | **Unchanged** |

**Forbidden bypasses:** adapter→provider direct; adapter-local “fake router”; dropping `role_model.intent`; skipping runtime so telemetry/decisions are missing.

Optional diagnostic header (e.g. `x-role-model-client-profile: codex-responses`) is observability-only and MUST NOT imply new router code paths.

#### A.2 Ownership split

| Concern | Owner |
| --- | --- |
| Agent loop, permissions, MCP processes, skills, plugins, local `apply_patch` apply | **Codex** |
| Codex↔wire translate/restore for Desktop/CLI | **codex-role-model adapter only** |
| Alias routing, multi-endpoint selection, provider execution, Responses↔chat, **telemetry / inspection / explain / receipts** | **Main role-model runtime (as today; no `R12` source edits)** |
| Package status/doctor MCP tools | Still **OOS11** |

#### A.2b Vendor neutrality + telemetry (normative)

1. **Any role-model target:** Transform rules are identical regardless of which endpoint the router later selects (DeepSeek, Moonshot, OpenAI-compat remotes, local llama-swap targets, future registry models, hybrid/controller aliases, etc.).
2. **DeepSeek is a live proof example only**, not an exclusive supported vendor.
3. **Telemetry as usual:** After the adapter forwards to the runtime, request recording, routing diagnostics, endpoint/model identity, success/error classes, usage/cost fields (when present), and `codex-role-model explain` / runtime inspection MUST remain available as for other role-model consumers. Adapter restore MUST NOT erase response metadata the client needs beyond tool-identity remap.
4. **Acceptance:** A live bridged tool turn MUST still be visible in the same telemetry/explain channels used for ordinary Codex→adapter→runtime text turns in this run.

#### A.2c Logging and tracing (normative — for test/debug)

The adapter MUST emit structured, correlatable logs so developers can debug bridge bugs without guessing. Runtime telemetry (§A.2b) remains authoritative for routing; adapter logs are the authority for **Codex wire transform** steps.

##### Correlation

| Field | Requirement |
| --- | --- |
| `bridgeTraceId` | Generate one UUID (or equivalent) per role-model hop at adapter ingress |
| Propagation | Prefer forwarding as `x-client-request-id` and/or `x-role-model-request-id` (existing runtime header vocabulary) so runtime telemetry/`explain` can be joined to adapter logs for the same turn |
| Echo | Include `bridgeTraceId` on adapter log lines for that hop (request + response phases) |

##### Required log events (role-model hops only)

| Event id | When | Minimum fields (no secrets / no full tool arg bodies by default) |
| --- | --- | --- |
| `bridge.hop.start` | Role-model hop begins | `bridgeTraceId`, `route: "role-model"`, inbound `model`, tool type histogram (`function`/`namespace`/`tool_search`/`custom`/`web_search`/other counts) |
| `bridge.transform.request` | After flatten/shim | `bridgeTraceId`, inbound tool count, outbound tool count, flattened namespace count, shim counts (`tool_search`/`apply_patch`/`web_search`), unknown-dropped count, reverse-map size |
| `bridge.upstream.forward` | Before fetch to runtime | `bridgeTraceId`, upstream URL host+path (no query secrets), method, content-type, whether intent present |
| `bridge.upstream.response` | After upstream headers | `bridgeTraceId`, HTTP status, content-type, stream vs JSON |
| `bridge.transform.response` | After restore | `bridgeTraceId`, restored call count by kind (`namespace`/`tool_search`/`custom`/`function`/`passthrough`), reverse-map hit/miss counts |
| `bridge.hop.end` | Hop finished | `bridgeTraceId`, outcome `ok`/`error`, error code/class if any, duration ms |
| `bridge.hop.error` | Transform or proxy failure | `bridgeTraceId`, phase (`decode`/`transform-request`/`upstream`/`transform-response`), error message (redacted), whether body dump path written |

Native ChatGPT hops MUST log a single lightweight `bridge.hop.start` with `route: "native"` (or skip bridge events entirely) and MUST NOT emit transform events.

##### Durable debug artifacts (opt-in + last-hop)

| Artifact | Requirement |
| --- | --- |
| Last hop summary | Always write `$CODEX_HOME/role-model/last-bridge-hop.json` (or package-equivalent under role-model state dir) with the fields above for the most recent role-model hop (overwrite). Redact Authorization and tool argument values. |
| Full request dump | Honor existing `ROLE_MODEL_CODEX_DEBUG_REQUEST_PATH` (or successor) to write pre/post-transform request bodies when set; document in README/skill. |
| Full response dump | Support `ROLE_MODEL_CODEX_DEBUG_RESPONSE_PATH` (or a paired debug dir) for post-restore response/SSE sample when set; default OFF. |
| Evidence capture | Live Phase 5 proofs copy redacted last-hop + explain/telemetry snippets under `evidence/logs/phase5/tool-bridge/`. |

##### CLI / doctor surfaces

| Surface | Requirement |
| --- | --- |
| `codex-role-model explain` / requests inspection | MUST remain usable for bridged turns; when bridge ran, show `bridgeTraceId` and a one-line transform summary (counts) if available from last-hop state |
| `codex-role-model doctor` or `status` | MUST report whether bridge debug env vars are set; MUST NOT print secrets |
| Stdout/stderr | Default adapter process MAY log `bridge.*` events at info/debug level behind `ROLE_MODEL_CODEX_BRIDGE_LOG=1` (or debug level default in non-quiet mode); quiet mode must still write `last-bridge-hop.json` |

##### Safety

- Never log API keys, `Authorization`, Cookie, or full patch/diff/`apply_patch` argument bodies at default levels.
- Tool schemas/names and counts are OK; argument values require explicit debug dump env.
- Logs MUST be adapter-local; do not require router source changes to emit these events.

##### TDD for logging

| Test | Predicate |
| --- | --- |
| Trace id present | Role-model hop test asserts `bridgeTraceId` on last-hop artifact and forwarded request-id header when configured |
| Transform counts | Fixture with namespace+web_search+functions asserts `bridge.transform.request` counts match |
| Restore counts | Mock upstream function_call with mapped name asserts `bridge.transform.response` hit ≥ 1 |
| Native hop quiet | Native GPT hop does not write role-model transform summary as if bridged |
| Redaction | Debug dump test ensures Authorization header not persisted in last-hop JSON |

##### Live gate

| Gate | Pass condition | Evidence |
| --- | --- | --- |
| G0d Adapter logs/trace | Live tool turn produces `last-bridge-hop.json` (or log excerpt) with `bridgeTraceId` matching runtime/`explain` correlation for that turn; transform counts non-zero when Desktop tools present | `evidence/logs/phase5/tool-bridge/live-bridge-trace.*` |

#### A.3 Request transform matrix (Codex → upstream body the adapter sends)

Runs in the adapter **before** the body is forwarded to the runtime, on role-model hops only (not native ChatGPT hops).

| Codex wire | Upstream-visible form | Reverse-map key |
| --- | --- | --- |
| `type: "function"` | Pass through | identity |
| `type: "namespace"` nested functions | Flat `function` tools; canonical name `mcp__<namespaceBody>__<toolName>` when MCP-like, else `ns__<namespace>__<toolName>` (normalize: lowercase; non `[A-Za-z0-9_]` → `_`; collision suffix `__{i}`) | `{ kind: "namespace", namespace, name }` |
| `type: "tool_search"` | Function shim `tool_search` with callable JSON schema | `{ kind: "tool_search" }` |
| `type: "custom"` / freeform `apply_patch` | Function `apply_patch` (freeform→function as needed) | `{ kind: "custom", name: "apply_patch" }` |
| `type: "web_search"` hosted | Prefer an ordinary function/consumer `web_search` shim the **main router** already knows how to handle for function-calling endpoints; do **not** forward a hosted-only OpenAI shape that empties multi-provider eligibility | `{ kind: "web_search" }` |
| Unknown future `type` | Policy: omit from upstream tools **or** pass only if already `function`; record `kind: "unknown"`; never fail the whole request solely due to unknowns; never require router source changes | `{ kind: "unknown", type }` |

**Stability:** Same naming rules for every role-model hop (no per-endpoint rename forks). Protects tool fingerprint continuity when the **router** selects among alias pool targets.

**Deferred tools:** Follow-up turns that attach deferred MCP/plugin tools MUST flatten with the same scheme (codex-ollama-proxy / openai#26234 class).

**Eligibility effect (without router source edits):** After transform, the main router receives function/shim tools only (plus ordinary functions) and applies its normal eligibility + routing. Observable: Desktop-shaped traffic through adapter→**runtime** MUST NOT surface `no_eligible_target` for healthy remote aliases solely due to original hosted/`namespace` wrappers.

#### A.4 Response / SSE transform matrix (upstream → Codex)

Runs in the adapter on role-model hop responses (buffered JSON and SSE).

| Upstream emission | Restored for Codex |
| --- | --- |
| Flat `function_call` / tool call with mapped name | Restore `{namespace,name}`, `tool_search_call`, or custom/`apply_patch` call item as required |
| Streaming function-call argument frames | Preserve `call_id`; remap identity consistently across deltas/done |
| Completed output items | Same restore; preserve sibling order |
| Unmapped ordinary function name | Pass through as ordinary `function_call` |

**Failure predicate:** Restored `tool_search` MUST NOT leave Codex on the “unsupported payload” fatal path (openai/codex#20574 class).

#### A.5 Catalog complement (adapter package only)

Continue soft catalog knobs suitable for custom/remote Codex providers (DeepSeek-shaped fields remain a useful template: `tool_mode: null`, `web_search_tool_type: "text"`, valid truncation, etc.). Catalog-only changes are **not** sufficient acceptance if Desktop still emits hosted/`namespace` tools.

#### A.6 Strict TDD (`R10`) — adapter package only

| Slice | RED → GREEN evidence under `evidence/logs/phase5/tool-bridge/` |
| --- | --- |
| Flatten + reverse-map matrix (A.3) | required |
| SSE/JSON restore (A.4) | required |
| Logging/trace redaction + counts (A.2c) | required |
| Native ChatGPT hop does not apply bridge | required |
| Role-model hop applies bridge | required |

Iron Law applies inside `packages/codex-role-model`. **No `role-model-router` production edits** for `R12`.

#### A.7 Live E2E (`R11` + this addendum)

**Stack:** real runtime + real Codex + `codex-role-model` adapter.

| Gate | Pass condition | Evidence |
| --- | --- | --- |
| G0 Router source untouched | `R12` implementation diff has **no** required edits under `role-model-router/` | `.../router-diff-empty.*` |
| G0b Main-router hop | Live traffic hits the configured role-model runtime (not a direct provider URL); routing decision exists | `.../live-router-hop.*` |
| G0c Telemetry as usual | Same turn appears in runtime telemetry/inspection/`explain` channels with model/alias/endpoint (or equivalent) as ordinary hops | `.../live-telemetry.*` |
| G0d Adapter logs/trace | §A.2c live gate: `bridgeTraceId` + transform summary joinable to runtime telemetry | `.../live-bridge-trace.*` |
| G1 Eligibility | Tool-shaped turn via adapter→runtime does not fail `no_eligible_target` on a healthy remote alias | `.../live-eligibility.*` |
| G2 Function tool | At least one shell/`function` tool completes with Codex-visible result on a router-selected target | `.../live-function-tool.*` |
| G3 MCP (if configured) | MCP call round-trips flatten→router→model→restore→Codex execution | `.../live-mcp.*` or explicit skip |
| G4 Explain | `codex-role-model explain` / runtime inspection shows role-model handled the request | `.../live-explain.*` |
| G5 Other consumers | Pi package untouched / tests green | `.../pi-guard.*` |
| G6 Vendor-neutral design | Tests assert transform rules do not branch on provider id/model family; DeepSeek used only as proof fixture if needed | `.../vendor-neutral.*` |

#### A.8 Non-goals

- Editing `role-model-router` source for this addendum
- Bypassing the main runtime router or its telemetry
- DeepSeek-only / single-vendor bridge logic
- Impacting pi or other non-Codex consumers
- Strip-only deletion of MCP/`tool_search`/`apply_patch` as the complete fix
- Remote Compact / `/v1/responses/compact` (`OOS3`)
- Package status/doctor MCP tools (`OOS11`)
- Making role-model an MCP server runtime
- Claiming OpenAI-native hosted web_search parity for every provider

### B. Locked-doc reconciliations

| Locked item | Effect |
| --- | --- |
| `OOS7` | **Unchanged / still in force.** This addendum does **not** authorize router routing-algorithm changes. |
| Fixed Decision #20 | Narrowly amended for **adapter** role-model hops only: response/SSE may remap tool-call identities for Codex wire compatibility; native ChatGPT hops and all non-adapter clients unchanged. |
| `R5` | Extended: adapter owns tool-bridge on role-model hops in addition to intent inject. |
| `R10` / `R11` | Apply to adapter bridge + live gates including G0/G0b/G0c/G0d/G5/G6. |
| `OOS11` | Unchanged. |
| Addenda 01/02 | Still effective for picker / signed-in catalog. |

### C. IDs

| ID | Role |
| --- | --- |
| `R12` | Codex **adapter-only** bidirectional tool bridge |
| Fixed Decision #20 | Adapter-hop amendment only (§B) |
| `OOS7` | **Not superseded** |

### D. Extensibility / future-proofing

1. Bridge module versioned inside `packages/codex-role-model` (e.g. `codex-tool-bridge` v1).
2. Handler registry for tool kinds — additive tests for new Codex types.
3. Prefer openai/codex canonical flatten names for coexistence if Codex later flattens client-side.
4. Other app consumers MUST use their own packages/bridges; they MUST NOT inherit this adapter path by default.
5. **Vendor-neutral transforms** for any router-selected target; DeepSeek (or any one remote) may be used as a live proof fixture only.
6. Adapter diagnostics (transform counts, reverse-map hit/miss, `bridgeTraceId`) are additive via §A.2c; they MUST NOT replace runtime telemetry.
7. Future wire drift → new addendum matrix rows + adapter tests; still no router source edits unless a separate approved addendum explicitly reopens `OOS7`.
8. Debug env var names (`ROLE_MODEL_CODEX_BRIDGE_LOG`, `ROLE_MODEL_CODEX_DEBUG_REQUEST_PATH`, `ROLE_MODEL_CODEX_DEBUG_RESPONSE_PATH`) are part of the adapter contract; renaming requires docs + addendum note.

## Traceability

| ID | Where addressed |
| --- | --- |
| `R12` | Adapter-only §§A–D; main-router hop + telemetry + **logs/tracing (A.2c)**; TDD + gates G0–G6 |
| `R5` | Forwarder: intent + tool-bridge + proxy to main runtime |
| `R10` | §A.6 |
| `R11` | §A.7 |
| `OOS7` | Explicitly preserved (§B / Hard Boundary) |
| `OOS11` | §A.2 / A.8 |
| `OOS15` / `OOS16` | §A.7 |

## Earlier Phase Reconciliation

- Do **not** edit locked Phase 0–4 artifacts.
- Effective requirements = locked `00-requirements.md` + addenda 01 + 02 + **this addendum-03** (03 wins on Codex tool-bridge placement: **adapter only**).
- Any prior conversational draft that placed `CodexToolBridge` in `role-model-router` is **superseded** by §A.1.

## Implementation checklist (binding)

1. Sanitize Desktop tools fixture into package tests (no secrets).
2. RED→GREEN flatten/restore/native-hop isolation **and** logging/trace tests in `packages/codex-role-model`.
3. Wire bridge into role-model forwarder path only; emit §A.2c events + `last-bridge-hop.json`.
4. Offline replay through adapter → **main runtime**: no `no_eligible_target`; tools are functions/shims; telemetry/explain still present; bridgeTraceId joins.
5. Live Codex G0–G0d + G1–G2–G4 (G3 if MCP) + G5–G6.
6. Docs/skill: adapter-only bridge, always via main router, vendor-neutral, telemetry unchanged, how to enable bridge debug logs/dumps.

## Audit Context

Audit Execution Mode: self-audit
Subagent Capability Probe: available
Delegation Decision Basis: self-audit — user required adapter-only bridge, main-router hop, telemetry-as-usual, **logs/tracing for debug**, no pi impact; requirements amended accordingly

## Audit

Audit: PASS

## Coverage Gate

Coverage: PASS

## Approval Gate

Approval: PASS
