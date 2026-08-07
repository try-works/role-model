# @try-works/codex-role-model

Codex Desktop/CLI/IDE adapter for an already-running **role-model** runtime.

This package does **not** install or own the role-model runtime process.

## Quick start (other machines)

```bash
# 1) Start your role-model runtime (must already be listening, e.g. :3456 or :3458)
# 2) Install + wire Codex (user-level ~/.codex/config.toml)
npx --yes @try-works/codex-role-model@latest setup
npx --yes @try-works/codex-role-model@latest start
# 3) Fully quit and reopen Codex, then pick a role-model model id
```

Optional env before setup/start:

```bash
export ROLE_MODEL_ENDPOINT=http://127.0.0.1:3456   # or :3458 for channel-dev
export ROLE_MODEL_CODEX_ADAPTER_PORT=3460
```

## Codex plugin (skills marketplace)

Codex marketplace roots are **repo-shaped**: they must contain
`.agents/plugins/marketplace.json` (not a bare `marketplace.json` folder).

Public catalog (`.agents/plugins/marketplace.json`) installs the plugin from npm
`@try-works/codex-role-model`. The plugin is the **skill / install surface**; the
Responses adapter is still the CLI (`setup` / `start`).

### Other machines (recommended)

Once this catalog is on a published git ref (e.g. `dev`):

```bash
codex plugin marketplace add try-works/role-model --ref dev
codex plugin add role-model@role-model
npx --yes @try-works/codex-role-model@latest setup
npx --yes @try-works/codex-role-model@latest start
```

Without waiting on git, make a tiny personal marketplace root:

```bash
mkdir -p ~/role-model-marketplace/.agents/plugins
cp packages/codex-role-model/marketplace.npm.json \
  ~/role-model-marketplace/.agents/plugins/marketplace.json
codex plugin marketplace add ~/role-model-marketplace
codex plugin add role-model@role-model
```

### This monorepo

```bash
# From the repo root (marketplace.json already lives under .agents/plugins/)
codex plugin marketplace add .
codex plugin add role-model@role-model
```

For unpublished plugin files, temporarily replace
`.agents/plugins/marketplace.json` with
[`.agents/plugins/marketplace.local.json`](../../.agents/plugins/marketplace.local.json)
(`source.local` → `./packages/codex-role-model`), then re-add/upgrade the marketplace.

## What setup does (signed-in / history-preserving)

- Sets root `openai_base_url` to the local adapter (`http://127.0.0.1:3460/v1`)
- Writes a **merged** `model_catalog_json` (native GPT models + role-model aliases/models)
- Does **not** force API login so **ChatGPT session history remains visible**
- Adapter dispatches: role-model ids → role-model runtime; other models → ChatGPT Codex backend

### Monorepo developers

```bash
corepack pnpm --filter @try-works/codex-role-model test
corepack pnpm --filter @try-works/codex-role-model build
node packages/codex-role-model/bin/codex-role-model.js setup
node packages/codex-role-model/bin/codex-role-model.js start
```

## Environment

| Variable | Default | Meaning |
| --- | --- | --- |
| `ROLE_MODEL_ENDPOINT` | `http://127.0.0.1:3456` | Upstream role-model runtime |
| `ROLE_MODEL_ALLOW_REMOTE` | unset/false | Allow non-loopback upstream |
| `ROLE_MODEL_CODEX_ADAPTER_PORT` | `3460` | Local Responses forwarder port |
| `ROLE_MODEL_CODEX_API_KEY` | unused in signed-in mode | Only for optional login-free/API-provider mode |
| `CODEX_NATIVE_BASE_URL` | `https://chatgpt.com/backend-api/codex` | Native GPT upstream when hijacking `openai_base_url` |
| `CODEX_HOME` | `~/.codex` | Codex user home |
| `ROLE_MODEL_CODEX_BRIDGE_LOG` | unset | Set to `1` to emit structured `bridge.*` JSON logs on stderr |
| `ROLE_MODEL_CODEX_DEBUG_REQUEST_PATH` | unset | Write pre/post tool-bridge request dump (JSON) when set |
| `ROLE_MODEL_CODEX_DEBUG_RESPONSE_PATH` | unset | Write post-restore response dump when set |
| `ROLE_MODEL_CODEX_WEB_SEARCH_MODE` | `shim` | `shim` = function → Codex client → ChatGPT alpha/search; `hosted` = pass through `web_search` |
| `ROLE_MODEL_CODEX_SEARCH_MODEL` | `gpt-5.4` | Native ChatGPT model id for `/v1/alpha/search` relay |
| `ROLE_MODEL_CODEX_SEARCH_TIMEOUT_MS` | `200000` | ChatGPT alpha/search relay timeout (ms) |

On each role-model hop the adapter also writes `$CODEX_HOME/role-model/last-bridge-hop.json` (redacted transform summary + `bridgeTraceId`).

## Codex tool bridge

Role-model hops flatten Codex Desktop tool shapes (`namespace`, `tool_search`, `custom`/`apply_patch`) into ordinary `function` tools before calling the **main role-model router**, then restore Codex wire shapes on the way back. Hosted `web_search` defaults to a **function shim**: the adapter fulfills calls via ChatGPT `/alpha/search` (or DuckDuckGo without auth), continues the model turn with search evidence (deduping repeat queries and synthesizing instead of dumping raw SERP), and returns the final answer to Codex. The adapter is protocol-only — it does not coach model behavior or match reply phrasing. Set `ROLE_MODEL_CODEX_WEB_SEARCH_MODE=hosted` only for providers with built-in search. Codex client `/v1/alpha/search` also relays to ChatGPT when Authorization is present. Native GPT hops are unchanged. Pi and other consumers are unaffected.

Compaction is **Codex-managed**, not role-model/router-managed.

This adapter does **not** implement OpenAI Remote Compact v2/v1 or `/v1/responses/compact` (returns 404). Prefer local compaction over ordinary `/v1/responses`.

## Packaging

| Artifact | Role |
| --- | --- |
| npm `@try-works/codex-role-model` | Public CLI + plugin files (`setup` / `start` / `doctor`) |
| Root [`plugin.json`](./plugin.json) | [Agent Plugins 1.0.0](https://agent-plugins.org/) portable contract |
| [`.codex-plugin/plugin.json`](./.codex-plugin/plugin.json) | Codex-native plugin entry |
| [`.agents/plugins/marketplace.json`](../../.agents/plugins/marketplace.json) | Public Codex marketplace (npm plugin source) |
| [`.agents/plugins/marketplace.local.json`](../../.agents/plugins/marketplace.local.json) | Optional local-path catalog for unpublished checkouts |
| [`marketplace.npm.json`](./marketplace.npm.json) | Same npm catalog for a personal marketplace root |

### Publish (maintainers)

```bash
corepack pnpm --filter @try-works/codex-role-model build
# from packages/codex-role-model, with npm auth for @try-works:
npm publish --access public
```

## Safety

Doctor/status/explain never print bearer tokens or credential file contents. Setup refuses to write provider keys into project `.codex/config.toml`. Uninstall removes only the managed block.

Docs: [Codex integration](../../apps/docs-site/content/docs/integrations/codex.mdx)
