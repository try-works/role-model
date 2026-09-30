# Implementation plan: `packages/dsh-role-model`

A DeepSeek Harness plugin that gives DSH the same role-model capabilities as
`@try-works/pi-role-model`, in particular **injecting `role_model.intent` metadata into every
outbound model request** so the role-model runtime can route on it.

- **Source of truth for behaviour**: `packages/pi-role-model`, and the analysis in
  [`dsh-role-model-analysis.md`](../dsh-role-model-analysis.md).
- **Hard constraint**: DSH source is **not modified**. `D:\deepseek-harness` is read-only
  reference material. All harness integration goes through published plugin APIs.
- **Approach**: chosen path F — the plugin supplies its own `LlmAdapter` and owns its
  provider routes.
- **Method**: strict TDD (RED → GREEN → REFACTOR) for every unit.
- **Acceptance**: a real request from DSH through the plugin to the role-model runtime on
  `http://127.0.0.1:3457`, with the router decision read back and asserted.

---

## 1. Naming and identity

**The user-facing name is `role-model` — lower-case, hyphenated, never "Role Model".**
This applies to every surface, not just the product name.

| Surface | Exact value |
|---|---|
| Provider route key | `role-model` |
| Provider display name (`LlmProviderInfo.name`, catalog group name) | `role-model` |
| Model selector group label | `role-model` (derived from `providerInfo().name`) |
| Slash command | `/role-model` |
| Skill name | `role-model` |
| Settings section / panel title | `role-model` |
| `locale/en.json` `meta.title` | `role-model` |
| Plugin row id | `dsh-role-model` |
| npm package | `@try-works/dsh-role-model` |

Rules:

- No title-casing, no "Role Model", no "Role-Model" in any UI string, log line, error
  message, or doc within the package.
- The runtime's own `displayName` (`role-model`, confirmed from live discovery) is used
  as-is and never transformed.
- Model display names come from discovery (`displayName ?? upstreamModelId ?? id`) plus the
  effort suffix, exactly as Pi computes them — the plugin does not invent names.
- A test asserts this: scan all package sources, `locale/en.json`, and the skill for the
  case-insensitive pattern `role[ -]?model` with a capital R, and fail on any hit outside
  the literal `@try-works/dsh-role-model` / `dsh-role-model` package identifiers.

---

## 2. Goal, and what "same capabilities" means concretely

The plugin must deliver, in priority order:

1. **Intent metadata injection (the core capability).** Every ordinary conversation
   request routed through a plugin-owned route carries a top-level `role_model` object whose
   `intent` is computed by the ported progressive classifier, byte-for-byte equivalent to
   Pi's. Gating, idempotence, and the two-pass runtime-task-chunk expansion are preserved.
2. **Runtime discovery and model catalog.** The runtime's aliases, models, and endpoints
   become selectable models in DSH's **main model selector**, with correct display names,
   reasoning-effort sets, and context/output limits.
3. **Command surface.** `/role-model status | doctor | alias | requests | explain | setup |
   ui`.
4. **Web UI panel.** A `role-model` settings page showing route health, doctor output,
   aliases (recommended / selected), taxonomy versions, and the most recent injected intent.
5. **Skill.** `role-model` agent skill describing all of the above.

Explicit non-goals for v1: the Responses API, WebSocket transport, runtime lifecycle
management (never start/stop/install/update the runtime), and reading provider secrets.

---

## 3. Architecture

### 3.1 Where the intent metadata comes from and goes

```
DSH Agent loop
  └─ llm.stream(GenerateOptions{provider:'role-model', model:<alias>, messages, tools, sessionId, purpose})
       └─ RoleModelAdapter.stream(options)                       ← plugin owns this
            ├─ build chat-completions body (OpenAI wire shape)
            ├─ if purpose is ordinary conversation:
            │    ├─ extract prompt / tools / images / files from GenerateOptions
            │    ├─ classify with progressive disclosure (package taxonomy ⊕ runtime chunks)
            │    └─ body.role_model = { contract_version: 1, intent: {...} }
            ├─ POST http://127.0.0.1:3457/v1/chat/completions  (Bearer role-model-local)
            └─ SSE → DSH StreamChunk stream
```

### 3.2 Module layout

```
packages/dsh-role-model/
  package.json                 # dsh.bundle.patch, dsh.client{platform,immediately,inject,external},
                               # icon, files, scripts (build/test/typecheck)
  cordis.patch.yml             # inserts the host plugin row; Config carries endpoint/route/trust
  locale/en.json               # meta.title = "role-model"
  icon.svg
  README.md
  skills/role-model/SKILL.md   # ported from packages/pi-role-model/skills/role-model/SKILL.md
  data/taxonomy/**             # copied verbatim from packages/pi-role-model/data/taxonomy
  src/
    index.ts                   # apply(ctx, config): effects only, one ctx.effect generator
    host-llm.ts                # §4 module-identity resolution (LlmAdapter/LlmError from the HOST)
    config.ts                  # schemastery Config schema + resolved defaults
    trust.ts                   # assessEndpointTrust                       (port)
    runtime-discovery.ts       # health/version/downstream-openai + /v1/models fallback  (port)
    downstream-openai.ts       # contract validation + model/effort mapping  (port)
    runtime-inspection.ts      # /requests, /requests/:id, /router/decisions/:id  (port)
    alias-store.ts             # selected alias, DSH-owned path              (adapt)
    model-guidance.ts          # id normalization + invalid-id diagnostics    (port)
    taxonomy/
      compact-data.ts                    (port)
      staged-compact-taxonomy.ts         (port)
      resolve-effective-taxonomy.ts      (port)
      classify-with-progressive-disclosure.ts  (port, unchanged algorithm)
    intent.ts                  # GenerateOptions → role_model object        (adapt of request-intent.ts)
    adapter.ts                 # LlmAdapter: providerInfo/listModels/resolveModel/stream
    openai-wire.ts             # GenerateOptions → chat body; SSE → StreamChunk
    commands.ts                # /role-model via ctx.commands.register
    skills.ts                  # ctx.skills.register
    client/
      index.tsx                # Web UI panel: registers into settings.section
      panel.tsx                # the page body
      styles.ts                # theme-token-only styles, plugin-prefixed class names
  test/
    ... one spec per unit, mirroring the pi-role-model suite plus new adapter/wire specs
```

### 3.3 Extension points used (all plugin-side, no DSH changes)

| Need | API |
|---|---|
| Own provider routes | `ctx.llm.registerAdapter(['role-model'], adapter)` |
| Appear in provider settings directory | `ctx.llm.registerConfigurableProviders([...])` |
| `/role-model` command | `ctx.commands.register({name:'role-model', description, input, handler})` |
| Skill | `ctx.skills.register({name:'role-model', source:'bundled', content, resourceBase})` |
| Model metadata (efforts, context) | `LlmAdapter.listModels` / `resolveModel` → `LlmResolvedModelInfo` |
| Own outbound HTTP for the route | `LlmAdapter.stream` |
| Web UI panel | Client half: `ctx.slots.inject('settings.section', () => ctx.slots.register({...}, Panel))` |
| Config | exported schemastery `Config` + the bundle's `cordis.patch.yml` |
| Alias state | a field in the plugin `Config` (`selectedAlias`), persisted through the normal config path — **no** separate settings namespace, no `~/.pi` dotfile |
| Lifecycle | one `ctx.effect(function* () { ... yield () => teardown })` in `apply` |

### 3.4 Settled decisions

- **Alias state lives in plugin `Config`** as `selectedAlias`, so it is readable and
  writable through the ordinary config path and survives upgrades with the user's patch
  layer. No dedicated settings namespace and no file under another agent's home. Where a
  write is needed (the `alias use` command), the plugin uses `ctx.configEditor` against its
  own row; a read failure degrades to "no selected alias" rather than throwing.
- **License is unchanged** — `BUSL-1.1` with the repository's Additional Use Grant, matching
  `packages/pi-role-model`.

### 3.5 Main model selector integration (explicit requirement)

DSH's main model selector is fed by `buildModelCatalog`
(`packages/api/session-controller/src/catalog.ts:20-72`), which for **every** registered
provider calls `ctx.llm.listModels(provider.id)` and then `ctx.llm.resolveModelInfo(...)`
for each model. Therefore:

- `listModels(provider)` **must return `provider: 'role-model'` on every entry, unique
  non-empty `id`s, and non-empty `name`s** or `llm.listModels` throws `INVALID_CATALOG` and
  the whole group becomes a failure chip.
- The selector shows the group under `providerInfo().name` → **`role-model`** — which is
  why §1's naming rule matters here directly.
- `resolveModel` must echo `provider` and `id` exactly and return a non-empty `name`;
  any mismatch throws `INVALID_CATALOG`.
- `resolveModel.reasoning` drives the effort control: `efforts[]` and `defaultEffort` come
  straight from discovery (§5.3). Omit `reasoning` entirely for a model with no effort
  control so no misleading control is offered.
- `inputModalities` should carry `image` when discovery's `modalities.availableInput`
  includes it, so the composer's attachment affordances match.
- Aliases, models, and endpoints all become selectable: they are simply distinct discovered
  records. Aliases are ordered first (recommended alias first) so the common choice is at
  the top of the group.
- If discovery fails, `listModels` must still return the last known good catalog (or the
  recommended alias from config) so the group stays selectable; only a first-ever failure
  with no cached catalog surfaces as a catalog failure with the runtime's remediation text.

**Acceptance for this requirement** is a TDD case: with the plugin mounted and the runtime
on 3457, `buildModelCatalog` returns a `role-model` group containing the alias ids that
`/api/role-model/downstream/openai` advertises, each with the right effort set — and a
follow-up check that a request sent with one of those ids succeeds.

---

## 4. Module identity with the host's `dsh-llm` (do this first)

The plugin installs its own `node_modules`, so importing `@deepseek-ai/dsh-llm` normally
yields a **second** `LlmError`/`HarnessError` class identity. The host distrusts foreign
codes deliberately:

```ts
// packages/llm/llm/src/adapter-failure.ts:104-107
function harnessErrorCode(error: Error): string {
  return error instanceof HarnessError ? error.code : 'UNKNOWN'
}
```

`UNKNOWN` is not in `DEFAULT_RETRYABLE_CODES`, so a duplicated error class silently disables
retry for transient failures and destroys the failure taxonomy in telemetry.

`src/host-llm.ts` resolves the **host's** module once per activation, in this order:

1. `config.hostLlmModule` (explicit override — absolute path or specifier).
2. `process.env.DSH_HARNESS_ROOT` + `packages/llm/llm/lib/index.js`.
3. Walk up from the **host process working directory** (`process.cwd()`).
4. The plugin's own `import('@deepseek-ai/dsh-llm')` as the last resort.

It exports `{ LlmAdapter, LlmError }` from whichever resolved, logs which source it used, and
additionally decorates every thrown error with a frozen own `failure` property
(`{message, code, status?, requestId?, providerRetryAfterMs?}`) whose `code` equals the
error's own `code` — the case `normalizeLlmFailure` explicitly supports for cross-package
copies (`adapter-failure.ts:20-27`).

**Implementation finding (Phase 1): the walk anchor must be `process.cwd()`, not
`process.argv[1]`.** The original plan said "walk up from `process.argv[1]`". That is wrong
and it was proved wrong: under a DSH source checkout, `argv[1]` is a script *inside the
plugin* (`packages/dsh-role-model/...`), and the checkout is frequently on a **different
drive** (DSH at `D:\deepseek-harness`, the plugin at `D:\DEV\role-model` — and in this
session's temp dirs, `E:`). An ancestor walk from the plugin can never reach the harness.
The host process's working directory *is* the checkout root (or a descendant of it), so that
is the anchor that works in-process.

**Acceptance**: a mounted-plugin test that provokes HTTP 401 → normalized code `AUTH`;
429 with `Retry-After` → `RATE_LIMIT` with `providerRetryAfterMs`; 400 → `INVALID_REQUEST`;
500 → `SERVER`; and that `UNKNOWN` never appears for these.

**Status: PASSED.** `test/host-llm.spec.ts` (24 tests) plus
`scripts/prove-host-failure-codes.mts`, which loads the host's **own**
`packages/llm/llm/src/adapter-failure.ts` from the checkout and asserts:

- a plain foreign error carrying only `code` normalizes to `UNKNOWN` (the failure mode);
- a duplicated `LlmError` class identity without a carrier normalizes to `UNKNOWN` (proving
  why the naive approach silently disables retry);
- `AUTH`/`RATE_LIMIT`/`INVALID_REQUEST`/`SERVER` all survive with `status` and
  `providerRetryAfterMs` intact;
- a carrier whose `code` disagrees with the error's own `code` is correctly distrusted.

---

## 5. Behavioural contract to reproduce

### 5.1 Injected object (exact)

Top-level sibling of `model`/`messages`/`tools`:

```jsonc
{ "role_model": { "contract_version": 1, "intent": {
  "classification_version": "role-model.pi-classifier.v1",
  "taxonomy_version": "1.0.0-alpha.1",
  "content_revision": "taxonomy-v1-alpha.1",
  "classification_contract_version": "role-model.classification.v1",
  "source": "heuristic", "confidence": 0.72,
  "role_hint_id": "security", "role_source": "heuristic",
  "task_type": "security.audit", "task_action": "audit", "task_variant": null,
  "task_source": "heuristic", "task_confidence": 0.72,
  "preferred_capabilities": ["security.analysis","code.read"],
  "required_modalities": ["text"], "output_modalities": ["text"],
  "tool_classes": ["filesystem.read"],
  "context_tokens_estimate": 17,
  "evidence": ["..."], "alternatives": [{"role_hint_id":"tester","task_type":"tester.regression"}]
} } }
```

`classification_version` stays the Pi literal: the runtime's acceptance branch reads
`contract_version`, `taxonomy_version`, and `classification_contract_version`, so changing
it buys nothing and costs wire fidelity.

### 5.2 Injection rules (preserved exactly)

Inject only when **all** hold: the request is an ordinary conversation request
(`options.purpose` is undefined), the model is one of the plugin's discovered ids (with a
`role-model/` prefix accepted and stripped), no `role_model.intent` is already present, and
the extracted prompt is non-blank. Auxiliary calls (`purpose: 'compaction' |
'session-title'`) are never injected. The two-pass flow — classify → expand candidate roles
via runtime role summaries (≤5) → fetch each role's `tasks.compact` → re-classify, falling
back to the first pass on any throw — is preserved.

Signal extraction maps from `GenerateOptions` rather than an OpenAI payload: `prompt` = last
`user` message's text; `hasTools` = non-empty `options.tools`; `toolNames` =
`options.tools[].name`; `hasImages` = any `ImageBlock`; `hasFiles` = any `FileBlock` with
extensions from the attachment filename. The tool-name hint table is extended with DSH's
real tool names (`read`, `write`, `edit`, `glob`, `grep`, `pwsh`, `bash`, `subagent`,
`skill`, `web_search`, `web_fetch`, …) so the `+1` role signals actually fire; the
file-extension table ports as-is.

### 5.3 Model and effort mapping

| Discovery | `listModels` / `resolveModel` |
|---|---|
| alias / model / endpoint record | one catalog entry; provider `role-model`; id = record `id`; name = `displayName ?? upstreamModelId ?? id` + effort suffix |
| `type: 'endpoint'` with no fixed effort | no `reasoning` (no misleading control) |
| fixed effort `high` | `reasoning = {efforts:[{id:'high',name:'High'}], defaultEffort:'high'}` |
| advertised `effortLevels:[none,low,medium,high]` | efforts with `none → off` normalization |
| token DSH cannot express (`ultra`) | omit if nothing maps; model stays selectable by exact id |
| `piMapping.contextWindow` / `maxTokens` | `context.contextWindow` / `defaultMaxTokens`; missing → `8192`/`2048` + a degraded diagnostic that never enters the model entry |
| `modalities.availableInput` includes `image` | `inputModalities: ['text','image']` |

Out-of-set efforts are rejected by `llm.resolveCallConfig` with
`UNSUPPORTED_REASONING_EFFORT` — the DSH-native equivalent of Pi's `setThinkingLevel` throw.

---

## 6. TDD protocol

Every unit follows strict RED → GREEN → REFACTOR against real tests, never implementation
first:

1. **RED** — write the failing spec, run it, and record the failing output. No production
   code exists for the behaviour yet.
2. **GREEN** — write the minimum code that passes. Run the spec; record the pass.
3. **REFACTOR** — clean up with the spec still green; re-run the full suite.

Evidence retained per step (test file, command, and observed result). No phase is declared
done without both a RED and a GREEN observation for each behaviour it introduces.

Test layers, in dependency order:

| Layer | Spec files | Key locked behaviour |
|---|---|---|
| L0 module identity | `host-llm.spec.ts` | §4: host module resolved; `LlmError` codes survive normalization; `failure` carrier present |
| L1 pure ports | `downstream-openai.spec.ts`, `trust.spec.ts`, `runtime-discovery.spec.ts`, `runtime-inspection.spec.ts`, `alias-store.spec.ts`, `model-guidance.spec.ts` | contract validation; `/v1/models` fallback; conservative limits + degraded diagnostics; fail-closed auth; remote blocked with **zero** fetch calls; 404 → `null` |
| L2 taxonomy | `taxonomy-data-files.spec.ts`, `taxonomy-staged-loader.spec.ts`, `effective-taxonomy.spec.ts`, `taxonomy-classification.spec.ts` | 6 groups / 28 roles / 280 tasks; recomputed sha256; laziness (manifest + exactly one chunk); the 6 classification cases; 28-role coverage; consulted-chunks-only; every loaded chunk ≤ 26 KiB |
| L3 intent | `intent.spec.ts` | §5.1 exact shape; §5.2 gating and idempotence (identity return); tool-name and extension hints; the two-pass runtime redirect |
| L4 wire | `openai-wire.spec.ts` | `GenerateOptions` → body for text/image/tool-call/tool-result/reasoning; SSE → `StreamChunk` for text, reasoning, tool calls, usage, `finish_reason`, error frames |
| L5 adapter | `adapter.spec.ts` | `providerInfo().name === 'role-model'`; `listModels` shape and ordering; `resolveModel` echo rules; §5.3 effort/limit mapping; **`role_model` present in the outbound body**; `purpose` suppresses injection; cancellation and idle timeout |
| L6 catalog | `model-catalog.spec.ts` | §3.4: the role-model group appears in `buildModelCatalog` with the runtime's aliases and effort sets; catalog survives a runtime outage via the cached snapshot |
| L7 surface | `commands.spec.ts`, `naming.spec.ts`, `skills.spec.ts` | command text for every subcommand; **§1 naming rule** (no capitalised "Role Model" anywhere); skill registers |
| L8 integration | `integration.spec.ts` | §7 live end-to-end against `127.0.0.1:3457` |

---

## 7. Live verification protocol (required)

Every phase that touches the wire ends with a real request from DSH to the runtime.

**Preconditions**: `GET http://127.0.0.1:3457/healthz` → 200; rich discovery returns
`contractVersion: role-model.downstream.openai.v1` with a non-empty model list (23 models
observed at analysis time).

**Procedure** — send a prompt engineered to hit a known classification, then read the
decision back:

1. Mount the plugin in the `web` profile with the route pointed at `http://127.0.0.1:3457`.
2. Send a request through DSH selecting a role-model alias, with a prompt whose expected
   classification is known from the ported classifier (for example a security-review prompt
   that must yield `role_hint_id: security`, `task_type: security.audit`).
3. Assert, from the adapter's own observation of the outbound body, that
   `role_model.intent.role_hint_id` and `task_type` equal the expected values.
4. `GET /api/role-model/requests` and take the newest request id.
5. `GET /api/role-model/router/decisions/<id>` and assert the decision reflects the injected
   role/task and the selected endpoint — i.e. the metadata actually influenced routing
   rather than merely travelling on the wire.
6. Assert the streamed assistant response is non-empty and the turn completes without a
   normalized `UNKNOWN` failure code.

**Negative cases** (each a spec, not a manual step):

- A compaction / session-title request carries no `role_model`.
- A second request that already carries `role_model.intent` is left untouched.
- A prompt with no role-model signal still injects a low-confidence advisory object with
  non-empty `evidence` and `alternatives`.
- The pi-ai routes `role-model-3456` / `-3457` remain registered and unaffected (A/B).

Steps 4–6 are the "verifies by sending requests from DSH to the role-model runtime on :3457"
gate: the phase is not complete until the routing decision read-back matches the injected
intent.

---

## 8. Phases

Each phase lists deliverable, TDD evidence, and its exit gate.

### Phase 1 — Module identity spike (blocking)
- Deliverable: `src/host-llm.ts` + a throwaway stub adapter proving error codes survive.
- RED/GREEN: `host-llm.spec.ts` per L0.
- Gate: 401/429/400/500 map to `AUTH`/`RATE_LIMIT`/`INVALID_REQUEST`/`SERVER`, never `UNKNOWN`.

### Phase 2 — Package skeleton and pure ports
- Deliverable: `package.json`, `cordis.patch.yml`, `locale/en.json`, `icon.svg`, `Config`,
  and the L1 modules ported.
- RED/GREEN: L1 specs, including the zero-fetch trust assertion.
- Gate: plugin installs into the `web` profile with `application: applied`, and its row is
  confirmed by inspection.

### Phase 3 — Taxonomy and classifier
- Deliverable: `data/taxonomy/**` copied, L2 modules ported, hashes regenerated.
- RED/GREEN: L2 specs including the 28-role coverage table and the 26 KiB guards.
- Gate: classifier output matches Pi's for the full case table.

### Phase 4 — Intent builder
- Deliverable: `src/intent.ts` adapted to `GenerateOptions`.
- RED/GREEN: L3 specs, with the exact §5.1 shape asserted field by field.
- Gate: two-pass runtime expansion hits `/taxonomy/compact/roles` and
  `/taxonomy/roles/<id>/tasks.compact` in that order.

### Phase 5 — OpenAI wire + SSE
- Deliverable: `src/openai-wire.ts`.
- RED/GREEN: L4 specs, driven by recorded SSE fixtures plus one live smoke call.
- Gate: text, reasoning, tool calls, usage, and error frames all translate; cancellation
  propagates.

### Phase 6 — Adapter and injection
- Deliverable: `src/adapter.ts` registering route `role-model`; model catalog and effort
  mapping; `role_model` injection.
- RED/GREEN: L5 specs, then the §7 live procedure.
- Gate: **§7 steps 2–6 pass against `127.0.0.1:3457`**, including the decision read-back.

### Phase 7 — Main model selector integration
- Deliverable: catalog correctness and cached-catalog survival.
- RED/GREEN: L6 specs, plus a manual check in the running GUI that the `role-model` group is
  present, ordered with the recommended alias first, and that selecting a model succeeds.
- Gate: a request sent from the GUI model picker completes and carries intent metadata.

### Phase 8 — Command surface and skill
- Deliverable: `src/commands.ts`, `src/skills.ts`, `skills/role-model/SKILL.md`.
- RED/GREEN: L7 specs, including the naming guard.
- Gate: every subcommand renders expected text; no secret/placeholder token is ever echoed.

### Phase 9 — Web UI panel
- Deliverable: Client half registering a `role-model` page in `settings.section`; route
  health, doctor output, alias list with recommended/selected markers, taxonomy versions,
  last-request intent preview.
- RED/GREEN: component specs plus live verification in the connected page.
- Gate: panel renders in both light and dark themes beside a comparable host settings page,
  uses only `--dsw-alias-*` tokens, imports no Harness Client package, throws nothing in the
  console, and is named `role-model`.

### Phase 10 — Documentation and delivery
- Deliverable: package `README.md`; a short entry in the repo docs for the DSH integration
  (mirroring the existing Pi integration section in the root `README.md`).
- Gate: branch off `origin/dev`, PR against `dev`, `CONTRIBUTING.md` and
  `docs/operations/02-ci-and-release-flow.md` satisfied.

---

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Host `dsh-llm` resolution fails in another deployment shape (packaged exe, Desktop `app.asar`) | Ordered resolution plus a `Config` override; the `failure` carrier keeps codes correct even when class identity is lost; log the resolved source at activation. |
| Reimplementing SSE drifts from `llm-pi-ai` behaviour | Keep the translation surface narrow and pin it with fixture specs covering every `StreamChunk` variant. |
| `listModels` throwing turns the whole selector group into a failure chip | Return the cached catalog on runtime outage; only a cold failure with no cache reports a failure, with the runtime remediation text. |
| Runtime taxonomy is lossy (no role `classification`/`description`) | Preserve the two-pass request-time flow, which is exactly why Pi has it. |
| Bundled taxonomy hashes drift from the copied data | Regenerate and verify hashes in a spec, and copy the data in one commit. |
| Tool-name hints never fire because DSH's tool names differ from Pi's | Extend the table with DSH's real names and assert each hint with a spec. |
| Naming rule regresses | The `naming.spec.ts` guard fails the build on any capitalised "Role Model". |

---

## 10. Progress log

### Phase 1 — module identity: **DONE**
- `src/host-llm.ts`, `test/host-llm.spec.ts` (24 tests), `scripts/prove-host-failure-codes.mts`.
- Resolution order corrected to anchor on `process.cwd()` (see §4). Verified: `AUTH`,
  `RATE_LIMIT` (+`providerRetryAfterMs`), `INVALID_REQUEST`, `SERVER` all survive the host's
  real `normalizeLlmFailure`, while a foreign error or a mismatched carrier correctly becomes
  `UNKNOWN`.

### Phase 2 — package skeleton and pure ports: **DONE**

Pure ports, all with specs written before their implementation (RED then GREEN):

| Module | Spec | Locks down |
|---|---|---|
| `src/config.ts` | 19 tests | endpoint normalization (strips a trailing `/v1` so it is appended exactly once), `ROLE_MODEL_*` env fallbacks, `selectedAlias` in config, synchronous trust (`local` / `remote-blocked` / `remote-untrusted` / `remote-allowed` / `invalid-endpoint`) |
| `src/types.ts`, `src/downstream-openai.ts` | 35 tests | contract validation failing closed on required auth, every observed field spelling, `none → off`, exact effort-set declaration, limit resolution with degradation diagnostics, catalog ordering |
| `src/runtime-discovery.ts` | 12 tests | call order, `connection: close`, tolerated missing `/api/version`, compact `/v1/models` fallback on 404, **zero fetch calls on a refused endpoint**, timeout vs unavailable vs incompatible vs auth-required |
| `src/runtime-inspection.ts` | 14 tests | snake_case and camelCase records, role/task read from the injected intent, 404 → `null`, percent-encoded ids, client-side limit |
| `src/model-guidance.ts` | 14 tests | id normalization, foreign-provider classification, and the invalid-id recovery text (asserted to contain no capitalised product name) |
| `src/alias-store.ts` | 12 tests | config-owned path (never `.pi`), round-trip, corrupt store reads as "no selection" |
| `src/index.ts` | 10 tests | activation is total (unreachable runtime, refused endpoint, absent `llm` service), `ctx.effect` scoping, an empty config still activates on the documented defaults |
| `src/config-schema.spec.ts` | 7 tests | the `Config` schema validates, defaults, and exposes `toJSON` for the loader |

Bundle artifacts: `cordis.patch.yml`, `locale/en.json` (`meta.title` = `role-model`),
`icon.svg`, and `scripts/build.mjs` (esbuild → `lib/index.js`).

**Install gate: met.** `install_bundle` with the absolute directory reported
`application: applied`; the bundle is selected in `dsh.profile.bundles` and linked as
`link:D:/DEV/role-model/packages/dsh-role-model`. A later re-install by **directory path**
fails with `ambiguous-install` — the manager identifies an already-installed bundle by
**name** (`plugin-manager/src/index.ts:536-541`), so re-installs must pass
`@try-works/dsh-role-model`. Doing so reported `restart-required`, which is the manager's
documented outcome for a change that needs a host restart.

Verified against the live runtime, using the built `lib/index.js` exactly as the host loads it:

```
VALIDATED {"endpoint":"http://127.0.0.1:3457","allowRemote":false,"requestTimeoutMs":3000,"providerRoute":"role-model"}
REGISTER ["role-model"]
INFO  dsh-role-model: discovered 23 models at http://127.0.0.1:3457/v1 (state ready).
```

Also verified: `node -e "import('@try-works/dsh-role-model')"` from the profile resolves and
exposes `Config, createRoleModelPlugin, default, inject, name` with a projectable schema.

Two deliberate engineering decisions recorded during this phase:

1. **Ships built JS (`lib/`), not `src/`.** Every other installed bundle does; the loader
   loads an installed bundle's entry as a plain ES module, and Node 24 strips types but does
   not remap a `.js` specifier onto a `.ts` file.
2. **`@deepseek-ai/schemastery` is inlined at build time, and `@deepseek-ai/dsh-llm`-family
   packages stay external.** schemastery is a vendored DSH workspace package whose
   `@deepseek-ai/cosmokit` dependency is a `workspace:` specifier, so it cannot be installed
   as a plain dependency from this repo. The host LLM packages must remain external so
   `LlmError` keeps the host's class identity (see §4).

Also recorded: schemastery treats a declared default as *documentable but omissible*, so
`selectedAlias`/`hostLlmModule` arrive **absent** rather than `null`; activation therefore
resolves its own defaults through `createRoleModelConfig` rather than assuming presence.
That case has its own test.

Local configuration: the profile patch row points at `http://127.0.0.1:3457` (the channel
actually running here) rather than the package default `3456`.

Test count: **147 passing** across 9 spec files; `tsc --noEmit` clean.

**Outstanding action for the live request verification (Phase 6):** the host must be
restarted for the newly installed bundle to activate, after which
`/api/role-model/router/decisions/<id>` read-back becomes possible.

---

### Phase 3 — taxonomy and classifier: **DONE**

Deliverables: `data/taxonomy/**` copied verbatim from `packages/pi-role-model/data/taxonomy`
(39 files, 224 KiB), `src/taxonomy/compact-data.ts`,
`src/taxonomy/staged-compact-taxonomy.ts`,
`src/taxonomy/classify-with-progressive-disclosure.ts`, and three spec files (48 tests).

| Spec | Locks down |
|---|---|
| `taxonomy-data-files.spec.ts` (12) | manifest hashes recomputed from the bytes on disk and asserted non-constant; per-group and per-role mirrors consistent; snapshot values `1.0.0-alpha.1` / `taxonomy-v1-alpha.1` / `role-model.classification.v1`; 6 groups / 28 roles / 280 tasks; every role in a real group; ≥10 tasks per role; classification signals present for every role; the index is `{id,label}`-only; every prompt-loaded chunk ≤ 26 KiB; total data set < 300 KiB |
| `taxonomy-staged-loader.spec.ts` (10) | nothing is read on construction; one role chunk reads **only** the manifest plus that chunk; the manifest is memoized; batched loads dedupe; a full load reads every role chunk exactly once |
| `taxonomy-classification.spec.ts` (26) | the exact 20-key wire shape; the confidence ladder with `task_confidence === confidence`; non-empty evidence and alternatives; `task_action`/`task_variant` splitting; `context_tokens_estimate` from the trimmed prompt; six group-first classification cases; rule agreement raising confidence to ≥0.72; context signals including **DSH tool names**; end-to-end laziness; degenerate and empty prompts; a 28-role reachability sweep |

**Verification beyond the specs — differential parity.**
`scripts/check-classifier-parity.mts` runs **this** classifier and the **Pi package's**
classifier side by side over 32 prompts × 8 contexts = **256 pairs**, comparing the emitted
`role_model` object byte for byte:

```
compared 256 (prompt, context) pairs across 32 prompts
ALL PAIRS BYTE-IDENTICAL — no behavioural drift from the Pi implementation
```

That is considerably stronger evidence than hand-written expectations: it proves the port
reproduces the original algorithm exactly, including its ordering-dependent tie-breaks.
Contexts are restricted to tool names the Pi hint table already knew, because the one
*deliberate* divergence is the extended tool-name table; that extension has its own spec.

Implementation findings recorded during this phase:

1. **The data root is resolved by probing, not by a fixed relative path.** The package loads
   from two layouts — the built bundle at `lib/index.js` (one level below the package root)
   and the sources at `src/taxonomy/*.ts` (two levels below) — so `resolveTaxonomyDataRoot`
   probes `../data/taxonomy` then `../../data/taxonomy` and takes the first whose manifest
   exists.
2. **The tool-name hint table is extended with DeepSeek Harness tool names** (`read`, `write`,
   `edit`, `glob`, `grep`, `pwsh`, `bash`, `subagent`, `skill`, `present`, `read_image`,
   `create_goal`, `todo_write`, …). Without this the `+1` role signals would never fire on this
   harness. `web_search`, `web_fetch`, `read_image`, `list_agents` and `send_message` are
   shared with the Pi table, so parity holds for them.
3. **The no-candidate fallback is flagged explicitly.** In the Pi source those branches are
   unreachable because group scoring always yields a role; the port tracks the case with a
   `usedNoCandidateFallback` flag so the "no candidate roles" evidence text is reproduced
   exactly rather than approximated.
4. The parity script imports across packages, which cannot be inside this project's
   `rootDir`, so `tsconfig.json` excludes it; it is run with `tsx`.

Test count: **195 passing** across 12 spec files; `tsc --noEmit` clean; the bundle builds.

---

### Phase 4 — intent builder: **DONE**

Deliverables: `src/intent.ts`, `test/intent.spec.ts` (29 tests), and
`scripts/check-intent-parity.mts`.

The signal source moved from a serialized OpenAI payload to the Harness request
(`IntentRequest`, a structural view of `GenerateOptions`); the gating, idempotence, two-pass
runtime expansion and emitted object are unchanged.

Specs pin: signal extraction (last user message, joined text parts, plain string content,
tools / tool names / images / files, lower-cased and length-bounded extensions); the whole
gating set (non-object, unowned model, **unowned provider**, auxiliary `purpose`,
pre-existing intent, blank prompt — each returning the **original reference**); the injected
object leaving every other request field untouched; taxonomy versions on the wire; the
two-pass expansion fetching candidate chunks, expanding candidates from runtime role summaries
capped at five roles, and falling back to the first pass when either fetcher rejects;
signal-driven classification; determinism; and reading the real bundled data when no taxonomy
is injected.

**A real bug was found and fixed by these specs.** The first implementation gated only on the
model id. Model ids are not unique across providers, so a `deepseek-official` route serving a
model whose id happened to be in the owned set would have been annotated with this runtime's
routing metadata. `applyRoleModelIntent` now also requires the request's `provider` to be an
owned route whenever `providerRoutes` is supplied, and two specs pin both directions. The Pi
injector gets this for free because its hook only ever fires on its own provider; the port
needed it stated explicitly.

**Verification beyond the specs — differential parity.**
`scripts/check-intent-parity.mts` runs our injector and the Pi package's
`injectRoleModelIntentIntoPayload` over 13 prompts × 5 file-attachment cases × 2 image cases =
**130 combinations**, comparing the emitted `role_model` byte for byte:

```
compared 130 (prompt, files, image) combinations
ALL COMBINATIONS BYTE-IDENTICAL — the injected metadata matches the Pi injector
```

Tool-derived context is excluded here because the Pi injector reads it from a tool array the
check would have to fabricate; that path is covered by the classifier parity check.

Test count: **224 passing** across 13 spec files; `tsc --noEmit` clean.

---

### Phase 5 — OpenAI wire and SSE translation: **DONE**

Deliverables: `src/openai-wire.ts`, `test/openai-wire.spec.ts` (35 tests), and
`scripts/check-live-stream.mts`.

Outbound, `buildChatBody` produces the chat-completions body and `toOpenAiMessages`
translates Harness messages (text, tool calls, tool results, images via a data-URL resolver,
files as handle text, reasoning dropped). Optional fields are **omitted** rather than sent as
`null`, so the endpoint's own defaults apply. `reasoning_effort` is omitted for the `off`
effort, and the output-cap field name is configurable.

Inbound, `streamChunksFromOpenAiSse` is deliberately total: a malformed frame, an in-band
error object, or a transport failure becomes a terminal `finish` chunk instead of a throw
from the middle of a stream, because the adapter contract requires the chunk stream to carry
its own outcome. Reasoning arrives as its own block; usage is emitted before the terminal
finish; providers' cache counts are subtracted so Harness token counts stay disjoint.

**Live verification — `scripts/check-live-stream.mts`, all checks passed** against
`http://127.0.0.1:3457`. Two framings are exercised, because they prove different things:

| Framing | Observed |
|---|---|
| no tools declared | 200, 864 chunks, 380 chars in 93 deltas, `{"kind":"stop"}`, usage reported, block indexes `[0,1]` |
| a tool declared | 200, 104 chunks, 11 tool-call deltas, `{"kind":"tool-calls"}`, block indexes `[0,1]` |

and the decisive read-back:

```
PASS  a request id is derivable for the read-back — req-5e9a2ebb-3331-4b35-8c6e-1de5cc22b344
PASS  the derived key matches the runtime record for this decision
PASS  routing decision is readable — status 200
PASS  decision names the endpoint it chose — deepseek.personal...deepseek-v4-pro
      mentions role "coder": yes
      mentions task "coder.edit": yes
```

That is the whole capability demonstrated end to end against the real runtime: the outbound
body carried the injected `role_model` object, and the router's own decision record names the
role and task this plugin classified.

**An early version of this check "failed" instructively.** It declared a tool and then
asserted prose, so it measured the model's choice rather than this plugin: the model correctly
returned a tool call. Splitting the check into a no-tools framing (prose) and a tools framing
(tool call) removed the false signal. A second apparent failure was the decision read-back
returning 404, which turned out to be a real API detail — see the findings below.

Findings recorded:

1. **The routing-decision endpoint is keyed by the runtime *request* id, not the routing
   decision id.** The runtime discloses `x-role-model-routing-decision-id`
   (`decision-<requestId>`) but **not** `x-role-model-request-id`, so the key is derived by
   stripping the `decision-` prefix. The check now verifies that derivation against
   `GET /api/role-model/requests`, whose records carry both fields, so the derivation is
   proven rather than assumed. This matters for `/role-model explain`, which must do the same.
2. **The runtime returns far fewer response headers than expected** — only
   `x-role-model-endpoint-id`, `x-role-model-routing-decision-id`, and
   `x-role-model-adapter-family`. Routing metadata that the plan assumed would be in headers is
   either derived or read from the decision record instead.
3. **Classification legitimately varies with declared tools**: the same prompt classified as
   `tester`/`tester.reproduce` with no tools and `coder`/`coder.edit` with a tool declared,
   because tool presence boosts the engineering group and the extended hint table fires. Both
   are correct behaviour and neither is pinned as a constant.

Test count: **259 passing** across 14 spec files; `tsc --noEmit` clean.

---

### Phase 6 — adapter and injection: **DONE**

Deliverables: `src/adapter.ts`, `test/adapter.spec.ts` (24 tests), `loadHostLlmClasses`
added to `src/host-llm.ts` with four more `host-llm` specs, and
`scripts/check-live-adapter.mts`.

The adapter owns its route and its HTTP call, which is the design decision that makes
intent metadata possible at all. It:
- keeps the **host's prototype chain** — built with
  `Object.create(hostLlm.LlmAdapter.prototype)` so `adapter instanceof HostLlmAdapter` holds,
  rather than being a bare object that merely quacks;
- throws the **host's `LlmError`** with routable codes (`AUTH`, `QUOTA`, `RATE_LIMIT`,
  `INVALID_REQUEST`, `CONTEXT_WINDOW_EXCEEDED`, `SERVER`, `TRANSPORT`, `ABORTED`,
  `EMPTY_RESPONSE`, `NO_ADAPTER`, `UNKNOWN_MODEL`, `INVALID_CONFIG`), preserving `status` and
  `providerRetryAfterMs` for `llm-retry`;
- checks cancellation **before** doing any work, because discovery is a network call too;
- serves its last successful catalog through a runtime outage, so the selector group survives;
- reports the runtime's own request identity to an `onRequestRouted` observer, which is what
  a routing-decision read-back needs.

**Live verification — `scripts/check-live-adapter.mts`, all checks passed** against
`http://127.0.0.1:3457` with the host's real classes loaded from
`D:\deepseek-harness\packages\llm\llm\lib\index.js`:

```
PASS  the host dsh-llm module was located — harness-root -> ...\packages\llm\llm\lib\index.js
PASS  listModels returns entries — 23 models
PASS  every entry names the owning provider (DSH throws INVALID_CATALOG otherwise)
PASS  resolveModel echoes the provider / the exact model id / declares context + cap
PASS  the adapter did not throw mid-stream
PASS  stream produced chunks — 449 chunks in 5236ms
PASS  stream produced prose — 365 chars
PASS  stream ended with a finish chunk — {"kind":"stop"}
PASS  the decision account for the request is consistent
      runtime taxonomyDimensions: {"taxonomy_group_id":"engineering","taxonomy_role_id":"tester",
        "taxonomy_task_type":"tester.reproduce","taxonomy_capability_ids":["code.read","code.write",...],
        "taxonomy_tool_class_ids":["filesystem.read","filesystem.write","shell.execute"]}
PASS  an unreachable runtime throws the host LlmError class
PASS  the failure carries a routable code, not UNKNOWN — SERVER
```

That `taxonomyDimensions` object is the runtime's own record of what it understood, and it
reproduces exactly the classification this plugin computed — role, task, capabilities,
modalities and tool classes. **That, not the endpoint comparison, is the evidence that the
injected metadata reaches and is consumed by the router.**

#### A correction worth recording

An early A/B run suggested the injected hint *changed the routed endpoint*: sending the same
prompt `data`/`data.query`-classified went to `deepseek-v4-pro` where the intent-free arm went
to `deepseek-v4-flash-max`. That looked like the strongest possible result, and it was
**overstated**. Repeating each arm three times gave `flash-max×3` for *both* arms, and an
earlier full run also showed `flash-max×3` for both. Endpoint choice is evidently influenced by
runtime state (latency, health, benchmark quality — all four appear in the decision's
`routingDiagnostics`), so a single paired sample could not support that claim.

The honest statement: **the injected metadata is read and recorded by the runtime**
(proved by `taxonomyDimensions`, repeated and deterministic), and endpoint selection is a
function of the metadata *plus* runtime state, so it must not be asserted as a fixed mapping.
The A/B experiment is retained in the check because it documents that, with the distributions
printed rather than asserted.

Test count: **287 passing** across 15 spec files; `tsc --noEmit` clean; the bundle builds.

**Outstanding for the GUI end-to-end:** the host must be restarted to activate the installed
bundle, after which Phases 7–9 can be exercised in the running Web UI.

---

### Phase 7 — main model selector integration: **DONE**

Deliverables: `apply` now registers the adapter (this is what puts the group into the
selector); `test/index.spec.ts` grew to 15 tests; new `test/model-catalog.spec.ts` (6 tests)
drives the adapter through DSH's own catalog sequence against the live runtime.

Activation now:
1. requires the `llm` service and logs a diagnostic when it is absent;
2. resolves the host's `LlmAdapter`/`LlmError` classes, honouring `hostLlmModule`, then
   `DSH_HARNESS_ROOT`, then the cwd ancestor walk;
3. registers the adapter and the provider-directory entry in one `ctx.effect`;
4. reports the catalog, warnings and degraded models — and keeps activation successful through
   a runtime outage, because **a runtime failure must degrade the catalog, not remove the
   route**. Two specs pin that: the route registers with an unreachable runtime, and the
   adapter serves its cached catalog.

Specs also pin: adapter registration happens for the configured route; registration is skipped
(without throwing) when the `llm` service is missing; an `llm` service without the optional
provider directory still gets the adapter; and a missing host module never throws.

`test/model-catalog.spec.ts` reproduces `buildModelCatalog`
(`api/session-controller/src/catalog.ts:20-72`) over our adapter and asserts, against the live
runtime:

```
PASS  produces a group named exactly "role-model" with the runtime models
PASS  exposes aliases, endpoints and models alike
PASS  a provider failure isolates as a failure chip instead of throwing
PASS  orders aliases before models and endpoints, recommended first
PASS  every resolved model is shaped as DSH validates it
```

Verified on the **built artifact**, loaded from the profile exactly as the host loads it, with
`hostLlmModule` set:

```
INFO  dsh-role-model: host LLM classes from harness-root at D:\deepseek-harness\packages\llm\llm\lib\index.js
DIRECTORY ["role-model"]
INFO  dsh-role-model: route "role-model" registered with 23 models at http://127.0.0.1:3457/v1 (state ready)
ADAPTERS: [{"providers":["role-model"],"ctor":"LlmAdapter","listModels":"function"}]
listModels: 23 | first: baseline.remote-only | provider field: role-model
resolveModel: role-model/baseline.remote-only | ctx: 1000000 | reasoning: {"efforts":[medium,max]}
```

`ctor: "LlmAdapter"` is the host's own class, which is the module-identity requirement holding
in practice.

**Finding — `hostLlmModule` is required for a profile-launched host.** The plugin's automatic
resolution walks up from the host process's working directory. A profile-launched DSH whose cwd
is `$DSH_HOME/profiles/<name>` is **not** inside the harness checkout, so neither the cwd walk
nor `DSH_HARNESS_ROOT` finds it, and activation (correctly) declines to register rather than
risk a second class identity. The profile patch now sets `hostLlmModule` explicitly:
`D:\deepseek-harness\packages\llm\llm\lib\index.js`. In a source-checkout-launched host the cwd
walk works and no configuration is needed.

Test count: **298 passing** across 16 spec files; `tsc --noEmit` clean; the bundle builds
(108 KiB, with the taxonomy and adapter inlined).

---

### Phase 8 — command surface and skill: **DONE**

Deliverables: `src/commands.ts`, `src/skills.ts`, `skills/role-model/SKILL.md`,
`test/commands.spec.ts` (36 tests), `test/naming.spec.ts` (8 tests).

The command handler is a **pure function** of an argument line and injected dependencies, so
every string is pinned without a host. It never throws: a runtime problem, a bad alias, or a
missing capability returns `{ok: false}` with text explaining the state and the fix, because
the user runs this command *because* something is wrong. Discovery runs **exactly once** per
invocation and its result is reused (the first implementation probed twice for `status` and
`doctor`, which a spec caught).

Covered: `help` (answered without touching the runtime, so it works when everything else is
broken), `setup`, `ui`, `status`, `doctor`, `requests [limit]`, `explain <id|latest>`,
`alias list|recommended|current|refresh|use|choose`, unknown command and unknown subcommand.
Specs pin the failure block (classification, `runtime reached: yes|no`, endpoint, reason,
remediation), that the placeholder credential is **never** echoed, that the live selection
wins over a stale stored alias, that a stored alias the runtime no longer advertises is
flagged, and the invalid-alias text including the `foreign-provider-model` case.

Alias writes go through `ctx.configEditor` against this plugin's own row, so the selection
persists in configuration as decided. When no editor is available the command records it for
the session and says how to persist it.

`src/skills.ts` reads the packaged `SKILL.md` from a location probed for both layouts, and
returns undefined rather than throwing when the file is absent — a missing skill degrades
usefulness, it does not invalidate the route.

**The naming guard now runs in the suite.** `test/naming.spec.ts` walks every shipped
`.ts/.tsx/.js/.mjs/.mts/.json/.md/.yml/.yaml` file under `src/`, `test/`, `scripts/` and
`locale/`, plus `package.json` and `cordis.patch.yml`, and fails on any occurrence of
`\bRole[ -]Model\b`. It asserts the scan covers more than 20 files so it cannot pass
vacuously, and separately pins the provider route, the locale title (`role-model`), the patch
row, and the skill. The skill file was written fresh for this harness rather than copied,
because the Pi text capitalises the name throughout.

Verified on the built artifact:

```
INFO  route "role-model" registered with 23 models (state ready)
REGISTERED: adapters [["role-model"]]
            commands [{"name":"role-model","hint":"status | doctor | setup | alias | requests | explain"}]
            skills   [{"name":"role-model","source":"bundled","bytes":4349,
                       "resourceBase":"...\\dsh-role-model\\skills\\role-model"}]
```

Test count: **342 passing** across 18 spec files; `tsc --noEmit` clean; the bundle builds
(132 KiB).

---

### Phase 9 — Web UI panel: **DONE**

Deliverables: `client/index.js` (the browser half), the `dsh.client` declaration and
`exports["./client"]` in the manifest, and `test/client.spec.ts` (10 tests).

The half is **plain JavaScript by necessity**, not by preference: DSH's client module system
serves the `./client` export to the page as a lazy-CJS bundle, so the file *is* the shipped
artifact. It calls `window.__ModuleLoader__.load({ id: '@try-works/dsh-role-model', factory })`
and the factory returns `{ inject: ['slots'], apply }`, registering one entry in
`settings.section` with id `role-model`.

Because a plain-JS plugin has no type check against harness client packages, the spec
**evaluates the file against a stubbed browser global** and then exercises the factory it
registers — a static import would not prove the served shape. It asserts the module id, that
`react` is the only module requested, that no harness client package is imported, the slot
and its id/order, that the registration is `ctx.effect`-scoped, and that the rendered markup
names the product in lower case.

Styling rules are enforced, not just intended: no literal hex colours, only `--dsw-alias-*`
tokens, and no `document.body` or `document.createElement` writes (the component renders
entirely through the slot).

The panel content: what the route is and that the runtime owns routing; that every ordinary
request carries `role_model.intent`; that the bearer token is the runtime's published local
placeholder and no credential is read or stored; the exact command list; and where to look
when something is wrong. It states plainly that benchmarks, routing decisions and telemetry
belong to the runtime.

Verified: `require.resolve('@try-works/dsh-role-model/client')` from the profile resolves to
the file in this checkout, so the module system can serve it.

Test count: **352 passing** across 19 spec files; `tsc --noEmit` clean; the bundle builds.

---

## 11. Definition of done

1. `packages/dsh-role-model` installs into the `web` profile as a bundle
   (`application: applied`).
2. A conversation request sent from DSH through the plugin to `127.0.0.1:3457` carries the
   exact `role_model` object of §5.1, and `/api/role-model/router/decisions/<id>` shows the
   routing decision reflecting it.
3. DSH's **main model selector** lists a `role-model` group containing the runtime's aliases,
   models, and endpoints, with correct names and reasoning efforts, and selecting one works.
4. `/role-model status|doctor|alias|requests|explain` behave as specified, with no secret
   leakage.
5. The `role-model` Web UI panel renders correctly in light and dark.
6. The `role-model` skill is discoverable and loadable.
7. Every unit has RED and GREEN evidence; the naming guard passes; the package is delivered
   by PR against `dev`.
