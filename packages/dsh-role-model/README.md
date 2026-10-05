# @try-works/dsh-role-model

A DeepSeek Harness bundle that connects this harness to an **externally running**
[role-model](../../README.md) runtime.

Its purpose is the same as [`@try-works/pi-role-model`](../pi-role-model)'s for Pi: the
runtime owns routing, and this plugin gives it what it needs to route well. Specifically,
every ordinary conversation request on this route carries **`role_model.intent` metadata** —
the role and task the plugin classified from the request, plus preferred capabilities,
required and output modalities, tool classes, confidence, evidence, alternatives and the
taxonomy version — so the runtime routes on what the work *needs* rather than on prompt text
alone.

The plugin never starts, stops, installs or updates the runtime, and never reads, prints,
copies or stores a credential. The bearer token it sends is the runtime's published local
placeholder.

## Requirements

- DeepSeek Harness `0.2.0-rc.2` or a compatible runtime.
- A role-model runtime reachable over HTTP (default `http://127.0.0.1:3456`).
- Node 22+ to build the bundle from a checkout.

## Install

```bash
pnpm run build          # produces lib/index.js, which the harness loads
```

Then install the bundle into a profile with the plugin manager, passing the absolute package
directory:

```
plugin_manager { action: "install_bundle", target: "/abs/path/to/packages/dsh-role-model" }
```

Re-installing an already-installed bundle must use the **package name**, not the directory:
the manager identifies an installed bundle by name, and a directory target fails with
`ambiguous-install`.

Installing writes the profile's `dsh.profile.bundles` entry and its patch row, so configure
it in that profile's `cordis.patch.yml`:

```yaml
- id: dsh-role-model
  name: "@try-works/dsh-role-model"
  config:
    endpoint: http://127.0.0.1:3456
    allowRemote: false
    requestTimeoutMs: 2500
    providerRoute: role-model
    selectedAlias: null
    hostLlmModule: null
```

| Field | Meaning |
|---|---|
| `endpoint` | Runtime URL, without a trailing slash and without `/v1`. |
| `allowRemote` | Permits a non-loopback endpoint. Off by default; a remote endpoint is refused **before** any request is made. |
| `requestTimeoutMs` | Timeout for runtime metadata calls (health, discovery, taxonomy, inspection). |
| `providerRoute` | The route this plugin owns. Leave it as `role-model`. |
| `selectedAlias` | The alias `/role-model alias use` records. |
| `hostLlmModule` | Explicit path to the harness's `@deepseek-ai/dsh-llm` entry. See below. |

### `hostLlmModule`

The plugin must use the **harness's own** `LlmAdapter` and `LlmError` classes. The harness
normalizes an adapter failure with `error instanceof HarnessError`, so a second class
identity — which an installed bundle gets from its own `node_modules` — would collapse every
failure to the unroutable code `UNKNOWN`, silently stopping `llm-retry` from retrying
transient failures.

The plugin resolves the harness in this order: `hostLlmModule`, then `DSH_HARNESS_ROOT`,
then a walk up from the host process's working directory. That last step works when the host
runs from a source checkout. A **profile-launched** host whose working directory is
`$DSH_HOME/profiles/<name>` is not inside the checkout, so set `hostLlmModule` explicitly:

```yaml
    hostLlmModule: /path/to/deepseek-harness/packages/llm/llm/lib/index.js
```

If no host module can be found the plugin declines to register the route and says so, rather
than risk the class-identity failure.

## Commands

Run these from the harness UI:

| Command | What it does |
|---|---|
| `/role-model status` | Route health, discovery state, model count, selected and recommended alias. |
| `/role-model doctor` | Every discovery check, including models whose metadata had to be sized conservatively. |
| `/role-model setup` | Re-registers the route from a fresh discovery. |
| `/role-model ui` | Prints the runtime's own URL. |
| `/role-model alias list` | Every alias the runtime advertises. |
| `/role-model alias recommended` | The runtime's own recommendation. |
| `/role-model alias use <alias>` | Records the alias to prefer. Does **not** change the active model — the model selector owns that. |
| `/role-model alias current` | What is recorded. |
| `/role-model alias refresh` | Re-registers from a fresh discovery. |
| `/role-model requests [limit]` | Recent runtime requests. |
| `/role-model explain <id\|latest>` | One request with its router decision: chosen endpoint and model, strategy, selection reason codes, observation path. |

## Model selector

The runtime's **aliases, models and endpoints** all appear in the harness's main model
selector, grouped under `role-model`, with the recommended alias first. Each entry declares
its context window, output cap and reasoning-effort set from the runtime's own discovery, so
the selector offers only efforts the endpoint accepts; anything else is refused before the
request is sent.

Prefer an alias when you want the runtime to route intelligently. Pick a concrete model or
endpoint when you want to pin a specific destination.

## How it works

A role-model route cannot be served by the harness's existing OpenAI-compatible adapter,
because that adapter does not forward pi-ai's `onPayload` hook and the harness's
`agent/request` waterfall carries no free-form body field. So this plugin owns its route
through its own `LlmAdapter`, which is what lets it attach `role_model` at the top level of
the request body.

```
Agent loop
  └─ llm.stream({ provider: 'role-model', model: <alias>, messages, tools, ... })
       └─ RoleModelAdapter.stream                  ← this plugin
            ├─ build the chat-completions body
            ├─ classify the request and attach role_model.intent
            ├─ POST <endpoint>/v1/chat/completions
            └─ translate the SSE stream into harness chunks
```

Classification is progressive: candidate groups are chosen first, roles are scored next, and
a role's task detail is loaded only for the likely role — so a classification reads only the
manifest, the shared files and **one** role's task chunk. The bundled taxonomy (6 groups,
28 roles, 280 tasks) is used when the runtime's own taxonomy is unreachable or incompatible.

Auxiliary calls — compaction and session titles — are never annotated. A request that already
carries `role_model.intent` is left exactly as it is, and a prompt with no user text produces
no metadata.

## Boundaries

Benchmarks, routing decisions, endpoint eligibility, fallback and telemetry belong to
role-model, not to this plugin. This plugin surfaces runtime-owned request diagnostics and
reason codes; it does not score models or aggregate production telemetry.

## Development

```bash
pnpm run typecheck                 # tsc --noEmit
pnpm run test                      # 352 unit tests
pnpm run build                     # writes lib/index.js

# Diagnostics, run with the runtime up:
pnpm run check:live-discovery      # the discovery contract and the catalog mapping
pnpm run check:live-stream         # a real request and a real SSE stream
pnpm run check:live-adapter        # the adapter through the model-selector sequence
pnpm run check:host-failure-codes  # failure codes survive the host's normalization
pnpm run check:classifier-parity   # vs the Pi classifier, byte for byte
pnpm run check:intent-parity       # vs the Pi injector, byte for byte
```

The two parity checks compare this package's output against
[`packages/pi-role-model`](../pi-role-model) over a corpus of prompts and contexts. They are
the strongest guarantee that the port introduced no behavioural drift, and they run from a
source checkout:

```bash
git clone https://github.com/try-works/role-model
cd role-model/packages/dsh-role-model
pnpm install --ignore-workspace
pnpm run check:classifier-parity    # 256 (prompt, context) pairs → byte-identical
pnpm run check:intent-parity        # 130 (prompt, files, image) combinations → byte-identical
```

`test/model-catalog.spec.ts` is an integration spec: it skips when the runtime is not
reachable, and prints a warning rather than passing silently.

## License

`BUSL-1.1` with the repository's Additional Use Grant. See the root [LICENSE](../../LICENSE).
