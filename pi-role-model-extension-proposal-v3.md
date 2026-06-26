# Pi x Role-Model: Managed Runtime and Capability-Aware Gateway Integration

## Revised proposal for `pi-role-model-router`

**Version:** 0.3.0  
**Date:** 2026-06-22  
**Status:** Revised implementation proposal  
**Scope:** Pi package, Role-Model onboarding skill, optional managed runtime, credential/model synchronization, benchmark and alias operations, and a versioned routing ingress contract  
**Repository baseline reviewed:** Pi `2417adb46a6ddc7f15bd396a78b0ca9b83ac2d0d`; Role-Model `51fe67a06b6940df172746628802eeb0e58d153c`

---

## 1. Executive summary

The integration must be designed for the likely first-time user, not only for an operator who already runs Role-Model.

Installing `pi-role-model-router` should give Pi two complementary capabilities:

1. a **deterministic extension** that can discover, install, start, configure, operate, and consume the Role-Model runtime; and
2. an **on-demand Pi skill** that teaches the agent what Role-Model is, how its runtime is organized, how providers and endpoints are configured, how aliases work, how benchmarks are run, and how to diagnose common failures.

The extension remains the only component allowed to perform sensitive operations such as installing binaries, starting processes, resolving credentials, mutating provider accounts, or activating endpoints. The skill provides progressive-disclosure documentation and instructs Pi to invoke explicit extension commands. It must never contain credentials or encourage the language model to scrape Pi's auth files.

The expected fresh-install flow is:

```text
pi install .../pi-role-model-router
  -> Pi loads the extension and Role-Model skill
  -> extension detects that no compatible runtime is reachable or installed
  -> Pi offers /role-model setup
  -> user explicitly approves an official Role-Model release installation
  -> extension verifies and installs the platform archive
  -> extension starts the runtime in headless mode, optionally on every Pi launch
  -> extension inventories Pi's configured providers and models without resolving secrets
  -> Role-Model returns a proposed provider/model/endpoint synchronization plan
  -> user chooses which credentials may be linked or copied
  -> extension applies accounts and endpoints through an authenticated local control API
  -> user may run a no-cost smoke check and an optional quick benchmark
  -> extension presents the runtime's actual routing aliases and recommended alias
  -> Pi selects that alias as its Role-Model gateway model
```

For request execution, the architectural rule from version 0.2 remains unchanged: **Role-Model is the single authority for endpoint selection, execution, fallback, telemetry, and learned observations**. Pi sends structured task and role information to one OpenAI-compatible Role-Model gateway. Pi must not ask for a route and then attempt to switch provider transports locally.

This expanded scope requires targeted changes in Role-Model. In particular, production credential synchronization must not ship until Role-Model exposes an authenticated control plane; managed startup needs an explicit headless/lifecycle contract; and installation needs a machine-readable, verified release manifest. The current code provides many of the necessary control APIs, but these security and lifecycle contracts are prerequisites, not optional polish.

---

## 2. Product assumptions and user outcomes

### 2.1 Primary assumption

Most Pi users who install this package do **not** already have Role-Model installed, running, or configured. The package therefore cannot stop at “connect to `localhost:3456`.” It must be a complete onboarding bridge while preserving explicit consent and clear ownership boundaries.

### 2.2 Required first-use outcomes

A new user should be able to complete setup without leaving Pi for routine operations:

- understand what Role-Model does and which parts remain controlled by Pi;
- install or connect to a compatible runtime;
- choose whether Pi manages the process or uses an external service;
- import selected provider/model configuration from Pi;
- choose how each credential is handled;
- create and activate Role-Model endpoints;
- inspect runtime readiness and diagnostics;
- run smoke checks and benchmarks;
- understand and select a routing alias;
- route Pi requests through the selected alias;
- open the Role-Model web UI when desired, without requiring it for normal operation.

### 2.3 Required repeat-use outcomes

After setup, normal startup should be uneventful:

- when `runtime.mode` is managed and `autoStart` is enabled, Pi connects to an existing compatible instance or starts one headlessly;
- the extension waits for an authenticated readiness receipt, not an arbitrary sleep;
- configured aliases are refreshed with a strict timeout and a cached fallback;
- credential drift is reported but never silently repaired by copying new secrets;
- one Pi session shutting down does not kill a shared runtime owned by another process;
- route execution works even when the browser UI is never opened.

---

## 3. Current implementation baseline

This proposal distinguishes capabilities that exist now from contracts that must be added.

### 3.1 Pi capabilities available today

| Current Pi capability | Integration use |
|---|---|
| Pi packages can bundle both extensions and skills. | The package can ship executable integration code and on-demand operational knowledge together. |
| Skills are progressively disclosed: Pi advertises their name and description, then loads `SKILL.md` when relevant or through `/skill:<name>`. | Detailed Role-Model setup and operations documentation need not permanently consume the system prompt. |
| Extensions can register commands, UI status, providers, and lifecycle handlers. | Setup, runtime control, synchronization, aliases, benchmarks, and routing can use supported extension surfaces. |
| Long-lived resources are expected to start from `session_start` or a user action and be cleaned up in `session_shutdown`, rather than from the extension factory. | Managed runtime startup must be lifecycle-aware and idempotent. |
| `ExtensionContext` exposes `modelRegistry`. | The extension can inventory Pi models and resolve selected credentials without reading `auth.json` directly. |
| `ModelRegistry` exposes `getAll()`, `getAvailable()`, `getProviderAuthStatus()`, `getApiKeyForProvider()`, and `getApiKeyAndHeaders()`. | Credential synchronization can have a non-secret planning stage followed by a narrowly scoped, consented secret-resolution stage. |
| Pi auth storage resolves runtime overrides, stored keys, OAuth tokens, environment variables, and custom model configuration. | The extension should use Pi's resolver rather than reimplementing credential lookup. |
| Pi's auth file is written with restrictive permissions and OAuth refresh is lock-protected. | Direct file parsing would bypass important safety and refresh behavior and is prohibited. |
| Extensions and installed packages execute with the user's full permissions. | Binary installation and secret transfer require explicit user confirmation, source verification, and project-trust restrictions. |

### 3.2 Role-Model capabilities available today

| Current Role-Model capability | Integration use |
|---|---|
| Official shell and PowerShell installers download packaged GitHub releases and create a `role-model-router` launcher. | The skill can document official manual installation, while the extension can implement a safer verified managed installer. |
| Packaged runtime builds currently target Linux x64, macOS x64/arm64, and Windows x64. | Setup must check a release manifest instead of assuming every OS/architecture pair is available. |
| The runtime CLI accepts host, port, runtime-state root, scope ID, unified runtime config, and static-root options. | A Pi-owned instance can use an isolated state root and scope. |
| The current CLI opens a browser only when launched without runtime-root arguments. | A proof of concept can suppress browser launch by supplying a runtime-state root, but a stable explicit `--headless` contract is still required. |
| The CLI prints a JSON listening receipt containing host and port. | Managed startup can parse a machine-readable readiness signal rather than scraping human log text. |
| The runtime exposes health, version, provider, model, account, endpoint, role, task, runtime-config, router, telemetry, local-model, and benchmark APIs. | Most onboarding operations already have backend seams that the Pi extension can call. |
| Account APIs can create accounts, start/poll native device authorization, update an API key, and activate an endpoint. | Selected Pi credentials and models can be imported after authentication and consent. |
| API-key repair persists a canonical local credential file atomically and preserves account identity and bindings. | Persistent-copy mode can use the existing repair path after account creation. |
| `/v1/models` exposes both direct model IDs and routing aliases. | Pi should register actual runtime-discovered aliases instead of invented permanent names. |
| `/api/role-model/downstream/openai` exposes downstream setup metadata including a recommended model. | Alias selection should prefer the runtime's recommendation. |
| Benchmark APIs support quick/full modes, endpoint selection, optional judge selection, progress, summaries, preferences, and data clearing. | Pi can provide complete benchmark commands without reimplementing benchmark execution. |

### 3.3 Important current gaps

The following are required before the complete experience is production-ready:

1. **Explicit headless mode.** Browser suppression currently depends on passing unrelated runtime arguments. Add a stable `--headless` or `--no-browser` flag.
2. **Process ownership.** Add parent-process or shared-daemon semantics so the runtime can terminate correctly and avoid duplicate instances.
3. **Authenticated control plane.** Current runtime UI client helpers call configuration and credential mutation endpoints without attaching control-plane authentication. Secret synchronization must remain disabled until authenticated local control is implemented.
4. **Separate data-plane and control-plane credentials.** The downstream OpenAI token must not automatically authorize account mutation, benchmark deletion, or runtime shutdown.
5. **Integration capability manifest.** Pi needs a versioned, machine-readable description of supported lifecycle, synchronization, alias, benchmark, and ingress contracts.
6. **Release manifest and provenance.** Managed install must discover exact supported assets and verify integrity; it must not infer archive names from the local architecture.
7. **Provider synchronization planner.** Role-Model must own mapping from Pi provider/model identities to its catalog, variants, auth modes, and endpoint records.
8. **Generic OpenAI-compatible import.** Pi custom providers that are not in Role-Model's catalog need an explicit additional-provider contract; they cannot be silently treated as a known provider.
9. **Routing metadata ingress.** The namespaced `role_model` request object described later still requires implementation on Role-Model ingress.

### 3.4 Concrete platform-support warning

The current Unix installer recognizes Linux arm64 when constructing an asset name, while the packaged-runtime build target list does not currently include Linux arm64. A managed installer must therefore consume an authoritative release manifest and fail with a clear supported-platform list. It must never synthesize a download URL solely from `process.platform` and `process.arch`.

---

## 4. Goals and non-goals

### 4.1 Primary goals

1. **Self-contained onboarding knowledge** — ship a Pi skill that explains Role-Model concepts and operational workflows.
2. **Fresh-machine setup** — discover, install, verify, start, and configure a compatible runtime through explicit user-controlled commands.
3. **Optional reliable auto-start** — keep a local Role-Model endpoint available when Pi starts without opening a browser.
4. **Safe Pi-to-Role-Model synchronization** — map selected Pi providers, models, credentials, and custom OpenAI-compatible endpoints into Role-Model through a plan/confirm/apply workflow.
5. **Alias and benchmark operations** — let users understand routing aliases, choose the runtime-recommended alias, run benchmarks, and inspect results from Pi.
6. **Canonical intent metadata** — attach Role-Model-compatible task, role, capability, modality, tool, context, and constraint information to Pi requests.
7. **Single routing authority** — keep endpoint eligibility, scoring, execution, fallback, and learned observations inside Role-Model.
8. **Transparent operation** — expose installation state, process ownership, provider readiness, alias choice, benchmark status, selected endpoint, and routing decision IDs.
9. **Safe defaults** — no silent binary installation, no silent secret copying, no hidden classifier traffic, no project-level host or credential redirection.

### 4.2 Secondary goals

- Open the Role-Model web UI on demand.
- Detect and explain configuration drift between Pi and Role-Model.
- Support external, Pi-child, and shared-daemon runtime modes.
- Import model-to-role bindings with user review.
- Preserve a normal Pi model as an explicit gateway-outage fallback.
- Provide detailed route explanation and explicit feedback commands.

### 4.3 Non-goals for the first release

- Bundling the Role-Model executable inside the npm or git Pi package.
- Running downloaded code without explicit consent and integrity verification.
- Reading or parsing `~/.pi/agent/auth.json` directly.
- Copying Pi OAuth refresh tokens or subscription credentials into Role-Model.
- Automatically importing every provider or model merely because Pi can see it.
- Automatically deleting Role-Model accounts or endpoints when Pi configuration changes.
- Registering every Role-Model endpoint as a Pi model.
- Switching provider transports by rewriting `payload.model`.
- Injecting routing or runtime-management instructions into the model-visible system prompt.
- Giving the language model unrestricted credential, installation, or process-control tools.
- Maintaining a second Pi-side SQLite database that re-ranks Role-Model decisions.
- Automatically running paid benchmarks.
- Transparently retrying a request after output or tool execution may have begun.

---

## 5. Architecture

### 5.1 Three-plane design

```text
+-------------------------------------------------------------------+
| Pi                                                                |
|                                                                   |
|  Knowledge plane                                                  |
|  +-------------------------------------------------------------+  |
|  | role-model skill                                            |  |
|  | concepts, setup, aliases, benchmarks, troubleshooting       |  |
|  +-------------------------------------------------------------+  |
|                                                                   |
|  Control plane                                                    |
|  +-------------------------------------------------------------+  |
|  | pi-role-model extension                                     |  |
|  | install, start, sync, configure, benchmark, status, UI      |  |
|  +-----------------------------+-------------------------------+  |
|                                | authenticated local control API  |
|  Data plane                    v                                  |
|  +---------------------+   +-----------------------------------+  |
|  | Pi agent loop       |-->| Role-Model OpenAI ingress         |  |
|  | + routing metadata  |   | route, execute, fallback, observe |  |
|  +---------------------+   +-----------------------------------+  |
+-------------------------------------------------------------------+
```

The planes have different trust properties:

- **Knowledge plane:** model-readable documentation; no secrets; no direct mutation.
- **Control plane:** deterministic extension code; explicit commands; authenticated mutations; local process ownership.
- **Data plane:** normal OpenAI-compatible inference requests plus versioned routing metadata.

### 5.2 Authority boundary

| Concern | Authority |
|---|---|
| Pi credential source and resolution | Pi `ModelRegistry` / auth storage |
| Permission to transfer or link a credential | User through Pi command/UI |
| Provider/model identity mapping | Role-Model synchronization planner |
| Persistent Role-Model account and endpoint records | Role-Model control plane |
| Pi gateway model/alias selection | User or trusted Pi global configuration |
| Endpoint eligibility and final route | Role-Model router |
| Provider execution and upstream fallback | Role-Model runtime |
| Benchmark execution and observed profiles | Role-Model runtime |
| Human-readable operational guidance | Bundled Role-Model skill |

### 5.3 Runtime deployment modes

The extension supports three explicit modes:

| Mode | Behavior | Ownership |
|---|---|---|
| `external` | Connect to a runtime started and managed outside Pi. | Extension never starts or stops it. |
| `managed-process` | Connect if present; otherwise start a headless child runtime for this Pi process. | Runtime exits when the owning Pi process exits. |
| `managed-shared` | Connect to or start a user-scoped singleton daemon that survives individual Pi sessions. | Explicit `/role-model stop`; instance lock and ownership receipt required. |

`managed-process` is the recommended first-release default after the user opts into auto-start. `external` remains the safest choice for team or remote deployments. `managed-shared` should not ship until singleton, authentication, and upgrade locking are proven.

### 5.4 Routing responsibility boundary

Pi registers a Role-Model gateway provider. It does not mirror every endpoint. Pi sends requests to an actual alias returned by Role-Model, such as `default.hybrid` or another runtime-recommended alias. Role-Model selects and invokes the real endpoint.

```text
Pi request
  -> selected Role-Model alias
  -> Role-Model validates task/role metadata
  -> Role-Model applies hard policy and inventory
  -> Role-Model chooses endpoint
  -> Role-Model invokes provider or local runtime
  -> Role-Model streams response and routing headers
  -> Pi displays endpoint and decision ID
```

---

## 6. Package knowledge and integration metadata

### 6.1 Package structure

```text
pi-role-model-router/
|- package.json
|- README.md
|- extensions/
|  `- role-model.ts
|- src/
|  |- config.ts
|  |- commands.ts
|  |- setup-wizard.ts
|  |- runtime-discovery.ts
|  |- runtime-installer.ts
|  |- runtime-manager.ts
|  |- release-manifest.ts
|  |- integration-manifest.ts
|  |- credential-inventory.ts
|  |- sync-plan.ts
|  |- sync-apply.ts
|  |- alias-client.ts
|  |- benchmark-client.ts
|  |- routing-contract.ts
|  |- intent.ts
|  |- state.ts
|  |- headers.ts
|  `- ui.ts
|- skills/
|  `- role-model/
|     |- SKILL.md
|     `- references/
|        |- concepts.md
|        |- installation.md
|        |- runtime-lifecycle.md
|        |- providers-credentials.md
|        |- endpoints-models.md
|        |- aliases.md
|        |- benchmarks.md
|        |- routing-contract.md
|        |- troubleshooting.md
|        `- security.md
|- integration/
|  `- bootstrap-manifest.json
`- test/
   |- setup-wizard.test.ts
   |- installer.test.ts
   |- runtime-manager.test.ts
   |- credential-inventory.test.ts
   |- sync-plan.test.ts
   |- alias.test.ts
   |- benchmark.test.ts
   |- routing-contract.test.ts
   `- integration.test.ts
```

Package manifest:

```json
{
  "name": "pi-role-model-router",
  "keywords": ["pi-package"],
  "pi": {
    "extensions": ["./extensions/role-model.ts"],
    "skills": ["./skills/role-model"]
  },
  "peerDependencies": {
    "@earendil-works/pi-coding-agent": "*",
    "@earendil-works/pi-ai": "*"
  }
}
```

### 6.2 Role-Model skill

The skill makes Role-Model operable by the Pi agent without embedding a large manual in every prompt.

Example frontmatter:

```yaml
---
name: role-model
description: Explains Role-Model installation, runtime lifecycle, providers, credentials, endpoints, aliases, benchmarks, routing diagnostics, and troubleshooting. Use when setting up or operating pi-role-model-router.
---
```

The skill should:

- explain the distinction between Pi, the extension, and the Role-Model runtime;
- direct users to `/role-model setup` for first use;
- document all extension commands and expected receipts;
- describe official manual installation as a fallback;
- explain endpoint/account/model/role relationships;
- explain alias modes and execution modes;
- explain benchmark cost and judge implications;
- provide troubleshooting decision trees;
- state that secret-bearing operations require explicit deterministic commands;
- prohibit reading Pi auth files or asking the model to print credentials;
- link to versioned reference files shipped with the package.

The skill is explanatory, not an autonomous installer. When invoked, it should tell Pi to call registered extension commands or ask the user to run them. It must not give the language model a generic shell recipe that bypasses installer verification or control-plane authentication.

### 6.3 Bundled bootstrap manifest

The package needs a small non-secret manifest so an extension can recognize supported runtime families before any runtime is reachable:

```json
{
  "schema_version": 1,
  "integration_id": "pi-role-model",
  "role_model_repository": "try-works/role-model",
  "minimum_runtime_version": "<pinned at release time>",
  "supported_ingress_contracts": [1],
  "supported_control_contracts": [1],
  "default_connection": {
    "host": "127.0.0.1",
    "port": 3456
  },
  "manual_install": {
    "unix_script": "scripts/install.sh",
    "windows_script": "scripts/install.ps1"
  },
  "runtime_manifest_path": "/api/role-model/integrations/pi/manifest"
}
```

This is bootstrap metadata only. It must not hard-code release assets, provider catalogs, aliases, or control API capabilities that can drift independently.

### 6.4 Runtime-provided Pi integration manifest

Role-Model should expose an authenticated, versioned endpoint:

```text
GET /api/role-model/integrations/pi/manifest
```

Example response:

```json
{
  "schema_version": 1,
  "runtime": {
    "version": "...",
    "instance_id": "...",
    "scope_id": "pi",
    "headless": true,
    "ownership_mode": "managed-process"
  },
  "contracts": {
    "routing_ingress": [1],
    "control": [1],
    "provider_sync": [1],
    "release_manifest": [1]
  },
  "authentication": {
    "data_plane": "bearer",
    "control_plane": "bearer",
    "separate_tokens_required": true
  },
  "capabilities": {
    "provider_sync_plan": true,
    "credential_env_link": true,
    "credential_persistent_copy": true,
    "native_device_authorization": true,
    "generic_openai_compatible_import": false,
    "benchmark_quick": true,
    "benchmark_full": true,
    "benchmark_judge": true,
    "shared_daemon": false
  },
  "paths": {
    "health": "/healthz",
    "version": "/api/version",
    "downstream_openai": "/api/role-model/downstream/openai",
    "sync_plan": "/api/role-model/integrations/pi/sync/plan",
    "sync_apply": "/api/role-model/integrations/pi/sync/apply",
    "models": "/v1/models",
    "benchmark_runs": "/api/role-model/benchmark/runs"
  }
}
```

The extension must gate features against this manifest. A missing capability produces a clear “runtime upgrade required” diagnostic rather than guessing.

---

## 7. First-run setup and onboarding

### 7.1 Setup entry points

The package should register:

```text
/role-model setup
/role-model help
/role-model doctor
```

On first `session_start`, if routing is enabled but no compatible runtime is reachable, Pi may show one non-blocking notification:

```text
Role-Model is not configured. Run /role-model setup to install or connect it.
```

It must not install, start a downloader, or resolve credentials merely because the extension was loaded.

### 7.2 Setup state machine

```text
UNCONFIGURED
  -> discover existing connection
  -> discover installed binary
  -> choose external or managed mode
  -> install if required and approved
  -> start/connect and authenticate
  -> verify integration manifest
  -> inventory Pi providers/models without secrets
  -> build synchronization plan
  -> user reviews providers, models, roles, and credential modes
  -> apply approved configuration
  -> activate endpoints
  -> smoke-check runtime
  -> optionally run benchmark
  -> choose recommended alias
  -> optionally activate Role-Model in Pi
READY
```

Every step must be resumable. The extension stores only non-secret wizard progress and identifiers. A failed or cancelled setup must leave Pi's current model usable.

### 7.3 Setup dialogue

The initial wizard should ask, in this order:

1. **Connection choice**
   - connect to an existing runtime;
   - install and manage a runtime for this Pi process;
   - install a shared user runtime when supported.
2. **Installation consent**
   - show repository, license, version, platform asset, download origin, checksum/signature status, and install directory.
3. **Runtime auto-start**
   - disabled;
   - start as Pi-owned process;
   - shared daemon when supported.
4. **Provider synchronization scope**
   - show only providers/models that Role-Model can map;
   - allow per-provider and per-model selection.
5. **Credential handling per provider**
   - skip;
   - ephemeral environment link;
   - explicit persistent copy;
   - authenticate natively in Role-Model.
6. **Model roles and endpoint activation**
   - suggest mappings, but require review before strict role bindings.
7. **Validation**
   - free health and smoke checks;
   - optional quick/full benchmark with estimated request count and cost warning.
8. **Alias selection**
   - show runtime-recommended alias first;
   - explain direct model versus routed alias;
   - optionally make it Pi's active model.

### 7.4 Non-interactive modes

Pi JSON, print, and RPC modes cannot depend on an interactive setup prompt.

Behavior:

- if already configured, normal connection/managed start may proceed according to global settings;
- if install or secret consent is required, return a structured setup-required diagnostic;
- do not assume `defaultProjectTrust: always` authorizes binary installation or credential copying;
- SDK embedding applications may call deterministic setup APIs with their own consent UI.

---

## 8. Runtime discovery, installation, and upgrade

### 8.1 Discovery order

The extension should search in this order:

1. explicitly configured external URL;
2. configured managed-instance receipt and token files;
3. current managed-install pointer under Pi's agent directory;
4. explicit `binaryPath` in global extension configuration;
5. `role-model-router` on `PATH`;
6. official platform install locations used by current Role-Model installers;
7. no runtime found.

A reachable process must be verified through `/api/version` and the Pi integration manifest. Listening on the expected port is not sufficient.

### 8.2 Managed installation location

A Pi-managed runtime should live outside the package checkout:

```text
~/.pi/agent/role-model/
|- runtime/
|  |- current.json
|  `- <version>/<target>/...
|- runtime-state/
|- instances/
|- logs/
|- cache/
`- secrets/
```

On Windows, the same logical hierarchy should use Pi's resolved agent directory rather than hard-coded Unix paths.

### 8.3 Safe managed installer

The extension must not execute `curl | sh` or `irm | iex` on the user's behalf. Those remain documented manual alternatives in the skill.

Managed installation must:

1. fetch a machine-readable release manifest from the official release;
2. match an explicitly listed OS/architecture asset;
3. show the resolved version and license before download;
4. download to a temporary directory;
5. verify SHA-256;
6. verify a release signature or Sigstore/provenance attestation when available;
7. reject archive path traversal, symlink escape, device files, and unexpected executable layout;
8. extract into a versioned staging directory;
9. run a non-mutating `--version` or manifest verification command;
10. atomically rename into the final version directory;
11. atomically update `current.json`;
12. retain the previous known-good version for rollback.

Example release manifest:

```json
{
  "schema_version": 1,
  "version": "v...",
  "assets": [
    {
      "target": "linux-x64",
      "name": "role-model-router-linux-x64.tar.gz",
      "sha256": "...",
      "size": 123456,
      "entrypoint": "role-model-runtime"
    }
  ],
  "provenance": {
    "type": "sigstore-bundle",
    "url": "..."
  }
}
```

### 8.4 Upgrade policy

Supported policies:

```text
manual   never check unless /role-model upgrade is run
notify   check periodically and notify; default
prompt   offer upgrade during setup/doctor when incompatible
```

Silent automatic upgrades are out of scope initially. Runtime and extension compatibility must be checked before switching `current.json`. A running instance is never replaced in place.

### 8.5 Manual installation fallback

The bundled skill should document current official mechanisms:

- macOS/Linux release installer script;
- Windows PowerShell installer;
- manual GitHub release archive installation;
- source build for developers using the currently required Node and pnpm versions.

The extension should be able to adopt a manually installed runtime without moving or rewriting it.

---

## 9. Headless runtime lifecycle

### 9.1 Required stable CLI contract

Role-Model should add explicit production flags:

```text
--headless
--host <loopback-host>
--port <port-or-0>
--runtime-state-root <path>
--scope-id <id>
--ownership-mode child|shared|external
--parent-pid <pid>                 # child mode
--instance-receipt <path>
--ready-file <path>
--data-token-file <path>
--control-token-file <path>
--log-format json
```

The proof of concept may use the current behavior in which specifying `--runtime-state-root` suppresses browser launch, but the extension must not treat that incidental behavior as the permanent protocol.

### 9.2 Managed startup sequence

```text
1. acquire per-scope startup lock
2. inspect existing instance receipt
3. verify PID, executable identity, version, scope, and authenticated health
4. connect if compatible
5. otherwise remove only stale receipts, never kill an unknown process
6. reserve or request a port
7. generate separate data/control bearer tokens
8. write token files with user-only permissions
9. spawn runtime with inherited minimal environment
10. capture stdout/stderr to bounded logs
11. parse JSON listening receipt or ready file
12. call authenticated /healthz, /api/version, and Pi manifest
13. atomically publish instance receipt
14. release startup lock
```

The extension should use an abortable startup timeout. Failure must include the runtime log path and preserve Pi's previous model.

### 9.3 Instance receipt

```json
{
  "schema_version": 1,
  "instance_id": "uuid",
  "pid": 12345,
  "owner_pid": 12000,
  "ownership_mode": "managed-process",
  "host": "127.0.0.1",
  "port": 3456,
  "scope_id": "pi",
  "runtime_version": "...",
  "executable_path": "...",
  "started_at_ms": 0,
  "data_token_file": "...",
  "control_token_file": "..."
}
```

The receipt contains secret-file paths, never token values.

### 9.4 Multiple Pi instances

`managed-process` has two acceptable implementations:

- one child per Pi process using distinct state scopes and dynamic ports; or
- a ref-counted user singleton with an external supervisor.

The first is simpler and should be the initial implementation. It avoids one Pi process killing another's runtime, at the cost of extra memory. `managed-shared` should be introduced only with a real daemon ownership protocol.

### 9.5 Shutdown and reload

- `/reload`, `/new`, `/resume`, and `/fork` must not restart a healthy Pi-owned runtime.
- `session_shutdown` for a normal Pi process exit initiates graceful termination only when the instance is owned by that Pi process.
- Role-Model should independently watch `--parent-pid` so a crashed Pi process does not orphan a child indefinitely.
- send `SIGTERM` or the platform-equivalent control request; wait for shutdown; use force termination only after a timeout and only for a verified owned PID.
- an external or shared runtime is never stopped automatically by Pi.

### 9.6 Runtime commands

```text
/role-model start
/role-model stop
/role-model restart
/role-model status
/role-model logs [--follow]
/role-model ui
/role-model doctor
/role-model install
/role-model upgrade
```

`/role-model ui` opens the browser deliberately. Headless auto-start never does.

---

## 10. Pi credential, provider, model, and endpoint synchronization

### 10.1 Security gate

Credential synchronization is **blocked** until the runtime proves all of the following through its integration manifest:

- authenticated control-plane requests;
- separation between inference and control credentials;
- loopback or explicitly approved secure remote transport;
- redaction and no-capture guarantees on credential endpoints;
- a compatible atomic sync contract.

Without those capabilities, the extension may show a non-secret synchronization plan and direct the user to Role-Model's native UI, but it may not transmit secrets.

### 10.2 Four-stage synchronization

```text
INVENTORY -> PLAN -> CONFIRM -> APPLY
```

#### Inventory: Pi-owned and non-secret

Use `ctx.modelRegistry` to collect:

- provider ID and display name;
- available model IDs and model metadata;
- API family and base URL where exposed by the model record;
- input modalities, reasoning support, context window, and max output;
- provider auth status and source label;
- whether the selected model uses OAuth;
- custom provider compatibility flags;
- optional user-selected role suggestions.

Do not call `getApiKeyForProvider()` during inventory. Do not include credential values, auth headers, command output, or OAuth records.

#### Plan: Role-Model-owned mapping

Send inventory to:

```text
POST /api/role-model/integrations/pi/sync/plan
```

Example request:

```json
{
  "schema_version": 1,
  "client_instance_id": "...",
  "providers": [
    {
      "pi_provider_id": "anthropic",
      "display_name": "Anthropic",
      "auth_status": {
        "configured": true,
        "source": "stored"
      },
      "models": [
        {
          "pi_model_id": "claude-...",
          "api": "anthropic-messages",
          "base_url": "https://...",
          "input": ["text", "image"],
          "context_window": 200000,
          "max_tokens": 16384
        }
      ]
    }
  ]
}
```

Role-Model returns:

- recognized provider and variant;
- canonical Role-Model model IDs;
- supported auth modes;
- proposed account ID;
- endpoint IDs that would be created;
- default and available model roles;
- unsupported models and reasons;
- custom-provider import requirements;
- conflicts with existing accounts or endpoints;
- whether env-link, persistent copy, or native OAuth is supported.

The extension must not independently guess LiteLLM model names or Role-Model provider variants.

#### Confirm: user-owned authorization

The user reviews the plan per provider and model. Confirmation must distinguish:

- provider/model configuration import;
- credential linking or copying;
- endpoint activation;
- role binding;
- replacement or merge with an existing Role-Model account.

A single broad “sync everything” confirmation is insufficient when secrets or existing state are involved.

#### Apply: authenticated and atomic

Apply through:

```text
POST /api/role-model/integrations/pi/sync/apply
```

The request references a short-lived plan ID and contains only approved selections plus credential grants. Role-Model must validate the plan has not expired or drifted, apply account and endpoint mutations transactionally where possible, and return a complete receipt.

### 10.3 Credential handling modes

#### `skip`

Import provider/model metadata only when useful, but do not create an execution-ready account. Default for unsupported or ambiguous credentials.

#### `ephemeral-env`

Recommended for a Pi-owned local runtime and static API keys.

- after confirmation, resolve the selected provider key through `modelRegistry.getApiKeyForProvider()` or `getApiKeyAndHeaders()`;
- place it in a generated, runtime-scoped environment variable passed only to the owned child process;
- configure Role-Model's account with `credentialRef.backend: "env"` and the generated variable name;
- do not persist the secret in Role-Model state;
- if the runtime is already running, synchronization returns `restart_required`; the extension restarts only its verified owned child with the approved minimal environment before endpoint activation;
- every later owned-runtime start relinks the selected key.

This mode works only when Pi owns the runtime process. It is unavailable for external or shared instances because a process environment cannot be retroactively changed and Pi must not restart a process it does not own.

#### `persistent-copy`

Opt-in only.

- resolve the key only after provider-specific confirmation;
- send it once over the authenticated loopback control API;
- Role-Model writes it using its atomic local credential storage and restrictive permissions;
- return only credential identity and lifecycle state;
- never echo or log the key;
- after copying, Pi and Role-Model hold independent credential copies and may drift.

#### `role-model-native`

Required for OAuth/subscription credentials in the first release.

- invoke Role-Model's own device authorization or provider-specific login flow;
- show the verification URL/code through Pi UI where possible;
- poll the existing Role-Model device-auth API;
- do not copy Pi OAuth access tokens, refresh tokens, expiry fields, or provider-internal metadata.

Pi OAuth tokens may be short-lived, provider-specific, or bound to Pi's own client identity. Treating them as general API keys is unsafe and unsupported.

### 10.4 Pi credential sources

Pi's resolver may return credentials originating from:

- CLI runtime override;
- stored API key;
- stored and refreshed OAuth credential;
- environment variable;
- command-backed or literal custom provider configuration.

The setup UI must show the **source category** before resolution and apply policy:

| Pi source | Default synchronization behavior |
|---|---|
| Stored static API key | Offer ephemeral link; offer persistent copy with confirmation. |
| Environment variable | Prefer an env-reference link when the same variable can be inherited; avoid materializing the value when possible. |
| Command-backed config | Do not persist command output by default; offer runtime-scoped resolution only. |
| Runtime `--api-key` override | Never persist automatically; optional session-only link. |
| OAuth | Role-Model-native authentication only in v1. |
| Custom literal key in `models.json` | Warn that the source is already plaintext; still require consent. |

### 10.5 Provider account and endpoint mapping

For a recognized provider, the resulting Role-Model account follows the runtime's existing account contract, including:

- `providerAccountId`;
- `providerId` and `providerKind`;
- `credentialRef` and `authMode`;
- region policy;
- base URL override;
- allowed and denied models;
- optional model-to-role bindings;
- budget/quota references;
- lifecycle status.

After an execution-ready account is created, selected endpoints are activated with the provider account, model ID, and region. The synchronization receipt must list every account and endpoint created, updated, skipped, or rejected.

### 10.6 Custom Pi providers and local OpenAI-compatible endpoints

Pi can define custom models with supported APIs and arbitrary base URLs. Role-Model currently validates accounts against its normalized provider catalog. Therefore:

1. recognized catalog providers use normal account synchronization;
2. a custom provider that exactly matches a known Role-Model provider may map to that provider after user review;
3. an unknown OpenAI-compatible base URL requires a new Role-Model `additional provider` or generic endpoint-import contract;
4. unsupported API families remain in Pi and are reported as not importable;
5. the extension must never mislabel an unknown provider as OpenAI, Anthropic, or LiteLLM merely to pass validation.

Generic import metadata should include API family, base URL, model IDs, capabilities, modalities, context, tool compatibility, TLS posture, and credential mode. Role-Model remains responsible for validating the endpoint before activation.

### 10.7 Model roles

Role binding is policy-bearing. Automatic role assignment must be conservative:

- preserve explicit user-selected roles;
- offer suggestions based on Pi model/API metadata and Role-Model catalog data;
- do not assign a strict role merely because a model name contains `code`;
- validate every role ID against the current runtime role policy;
- allow no role bindings, leaving the endpoint eligible through normal capability/task rules where supported.

### 10.8 Drift and resynchronization

```text
/role-model sync status
/role-model sync plan
/role-model sync apply
```

Status compares non-secret identities and fingerprints:

- Pi provider/model added or removed;
- auth source changed;
- Role-Model account missing, disabled, or unhealthy;
- endpoint/model bindings differ;
- base URL or model metadata changed;
- persistent copies may be stale.

Synchronization is one-way and additive by default. Removal, credential revocation, and endpoint deletion require separate explicit actions. A project-local configuration may never trigger global credential synchronization.

---

## 11. Alias discovery and selection

### 11.1 Use actual runtime aliases

The extension must not permanently invent aliases such as `role-model/auto`. The current Role-Model runtime exposes concrete routing aliases through `/v1/models`, including examples such as:

```text
default.hybrid
baseline.hybrid
controller.hybrid
difficulty.hybrid
hybrid.hybrid

default.remote-only
baseline.decision-only
```

It may also expose direct model IDs such as:

```text
moonshot/kimi-k2.7-code
deepseek/deepseek-v4-pro
chatgpt/gpt-5.4
```

The available list depends on runtime configuration and endpoint readiness. Pi should discover it at runtime.

### 11.2 Alias dimensions

Current Role-Model configuration separates two concepts:

- routing/alias mode, currently including `basic`, `difficulty`, `intelligent`, and `hybrid`;
- execution mode, currently including `decision_only`, `hybrid`, `local_only`, and `remote_only`.

Current alias IDs often encode both through a prefix and suffix. The extension should not rely only on string parsing. Role-Model should return structured metadata for each alias:

```json
{
  "id": "default.hybrid",
  "object": "model",
  "owned_by": "role-model",
  "kind": "routing-alias",
  "routing_mode": "basic",
  "execution_mode": "hybrid",
  "endpoint_ids": ["..."],
  "ready_endpoint_count": 3,
  "supports_tools": true,
  "input_modalities": ["text", "image"],
  "context_window": 200000,
  "max_output_tokens": 16384,
  "recommended": true,
  "description": "..."
}
```

Direct models should be marked `kind: "direct-model"` so users understand that choosing one bypasses routed alias selection.

### 11.3 Recommended alias

The extension should query:

```text
GET /api/role-model/downstream/openai
GET /v1/models
```

The downstream setup response's `recommendedModel` is authoritative when it refers to a currently ready model or alias. If no recommendation is available, the setup wizard may suggest a suitable alias based on structured metadata but must label that choice as a Pi suggestion.

### 11.4 Dynamic Pi provider registration

The extension registers one Pi provider named `role-model` and uses runtime-discovered aliases as its models.

Rules:

- register cached non-secret alias metadata immediately when available;
- refresh aliases after authenticated runtime readiness;
- retain the currently selected alias if it still exists and remains compatible;
- do not expose unhealthy or empty aliases as recommended;
- do not remove the active model during an in-flight agent run;
- update the provider after the agent becomes idle or on the next session boundary;
- preserve direct Role-Model models only when the user enables `showDirectModels`.

### 11.5 Alias commands

```text
/role-model alias list
/role-model alias use <alias-id>
/role-model alias explain <alias-id>
/role-model alias recommended
/role-model alias refresh
```

`alias list` should show:

- routed alias versus direct model;
- routing and execution modes;
- number of ready endpoints;
- locality restrictions;
- tool/image compatibility;
- benchmark coverage where available;
- whether the alias is the runtime recommendation;
- why an alias is unavailable.

Creating or editing aliases is a separate, advanced control operation:

```text
/role-model alias create
/role-model alias edit <alias-id>
```

It must use Role-Model's validated runtime-config API and show the complete model pool and mode before applying changes.

---

## 12. Benchmark integration

### 12.1 Existing runtime capabilities

The current runtime already exposes APIs for:

- reading the benchmark suite;
- starting quick or full benchmark runs;
- selecting endpoint IDs and case IDs;
- selecting or disabling a judge endpoint;
- polling active and historical run progress;
- reading summaries and per-mode summaries;
- setting benchmark judge preferences;
- clearing per-endpoint or all benchmark data.

The Pi extension should be a control client for these APIs. It must not implement a second benchmark engine.

### 12.2 Commands

```text
/role-model benchmark suite
/role-model benchmark quick [endpoint-id...]
/role-model benchmark full [endpoint-id...]
/role-model benchmark status [run-id]
/role-model benchmark results [run-id]
/role-model benchmark history
/role-model benchmark judge [endpoint-id|none]
/role-model benchmark clear endpoint <endpoint-id>
/role-model benchmark clear all
```

### 12.3 Setup-time validation levels

The setup wizard distinguishes:

1. **Health check** — no model request; verify authenticated runtime health and inventory.
2. **Ingress smoke check** — one minimal execution request against the chosen alias or endpoint; show expected cost before running when cost metadata exists.
3. **Quick benchmark** — multiple requests over quick-marked cases; always opt-in.
4. **Full benchmark** — potentially substantial time and cost; never suggested as a default first-run action.

No paid model request may be launched merely because installation or credential synchronization completed.

### 12.4 Cost and consent

Before starting a benchmark, Pi should show:

- mode and selected case count;
- subject endpoints and models;
- judge endpoint and whether judge requests are enabled;
- estimated minimum request count;
- estimated cost range when catalog pricing is available;
- that providers may bill failed or retried calls;
- artifact/output location.

The user must confirm the concrete run. A project file cannot pre-authorize paid benchmark execution.

### 12.5 Progress and results

Pi should display bounded progress using the runtime's existing fields:

```text
run phase · endpoint i/n · case j/m · execute/judge/compare · elapsed
```

Results should summarize:

- overall and difficulty-bucket scores;
- latency and parse success;
- judge availability and grading method;
- failed/capped cases;
- source type and model ID;
- benchmark age and suite version.

Detailed artifacts remain in Role-Model's runtime state. Pi may link to or summarize them.

### 12.6 Relationship to routing and aliases

Benchmark results are evidence, not a hidden alias rewrite instruction.

- Role-Model may incorporate benchmark-derived observed profiles according to its configured policy.
- Pi may show which endpoints performed best for the user's workload.
- Modifying alias pools, role bindings, controller selection, or difficulty thresholds requires a separate explicit action.
- Benchmark results from a different suite version or old endpoint configuration must be marked stale.

---

## 13. Versioned routing data-plane contract

### 13.1 Why the gateway contract remains necessary

Runtime installation and provider synchronization make Role-Model available, but they do not tell the router what the current Pi task requires. Pi should attach canonical, versioned intent metadata to each request sent through a Role-Model alias.

Pi must not call a route lookup endpoint and then attempt to invoke the selected provider itself. By `before_provider_request`, Pi has already selected its provider adapter, base URL, and credentials. The request is therefore sent to the Role-Model gateway, which selects and invokes the final endpoint.

### 13.2 Request body extension

Role-Model should accept a namespaced object on both `/v1/chat/completions` and `/v1/responses`:

```json
{
  "model": "default.hybrid",
  "messages": [
    { "role": "user", "content": "Review this patch for correctness" }
  ],
  "stream": true,
  "tools": [],
  "role_model": {
    "contract_version": 1,
    "client": {
      "app_id": "pi",
      "app_version": "0.79.9",
      "extension_version": "0.3.0",
      "session_id": "pi-session-id",
      "agent_run_id": "rm-run-uuid",
      "turn_index": 0,
      "provider_request_id": "rm-request-uuid"
    },
    "intent": {
      "task_type": "code.edit",
      "task_source": "rule",
      "task_confidence": 0.93,
      "requested_role_id": null,
      "role_hint_id": "coder.review",
      "role_source": "rule",
      "required_capabilities": ["code.edit"],
      "preferred_capabilities": ["reasoning.multi_step"],
      "required_modalities": ["text"],
      "needs_tools": false,
      "context_tokens_estimate": 42000
    },
    "policy": {
      "strategy": "balanced",
      "prefer_local": false,
      "budget_mode": "advisory",
      "budget_limit_usd": 0.1,
      "deny_remote": false
    }
  }
}
```

For `/v1/responses`, `role_model` is a sibling of `model`, `input`, and `tools`.

### 13.3 Explicit role versus inferred role

- `requested_role_id` is a hard, user-explicit request. It is set by `/role <id>`, trusted embedding input, or an explicitly approved trusted project policy.
- `role_hint_id` is advisory. It must become a soft routing preference, not the existing hard requested-role filter.
- Role-Model should add a bounded `preferredRoleId` signal or equivalent ingress-only preference covered by conformance tests.
- Automatic Pi rules should not set a hard role unless the user explicitly enables strict automatic roles.

A weak inference must not make an otherwise valid request unroutable.

### 13.4 Task source and confidence

Allowed sources:

```text
user       explicit command or SDK input
project    trusted project policy
rule       deterministic local inference
router     Pi omitted a decision; Role-Model should resolve/default
```

Confidence is diagnostic and must never weaken hard policy.

### 13.5 Capabilities and modalities

Pi places only real requirements in `required_capabilities`:

- serialized tools imply `tools.function_calling`;
- image input implies the corresponding input modality/capability;
- a strict response schema implies `json.schema_adherence`;
- repository modification may require `code.edit`.

Desirable properties such as multi-step reasoning or prompt-cache support belong in `preferred_capabilities`.

### 13.6 Context estimate

`context_tokens_estimate` is optional. Role-Model must derive or conservatively estimate `contextTokens` when it is absent. Pi should use `ctx.getContextUsage()` when available rather than tokenizing the entire prompt in the extension.

### 13.7 Existing requested-role header

Role-Model already supports:

```text
X-Role-Model-Requested-Role-Id
```

Precedence:

1. if body and header explicit roles differ, return a structured `400`;
2. if only body is present, use it;
3. if only header is present, preserve current behavior;
4. if neither is present, use the advisory role or normal Role-Model resolution.

### 13.8 Validation behavior

- unsupported contract version -> structured `400`;
- unknown explicit role or task -> structured `400` with discovery information;
- unknown advisory role -> ignore with diagnostic;
- unknown advisory task -> use a safe registered fallback with diagnostic;
- incompatible explicit role/task -> reject rather than bypass policy;
- client policy may narrow but never relax operator hard denies, provider restrictions, privacy policy, or enforced budgets;
- the `role_model` object must be removed before constructing the selected upstream provider request.

### 13.9 Response headers

Return at least:

```text
x-role-model-endpoint-id
x-role-model-adapter-family
x-role-model-routing-decision-id
x-role-model-provider-request-id
```

`x-role-model-provider-request-id` echoes Pi's ID for correlation.

Optional compact metadata:

```text
x-role-model-task-type
x-role-model-role-id
x-role-model-routing-mode
x-role-model-fallback-count
x-role-model-contract-version
```

Detailed policy and candidate reasoning remain in Role-Model telemetry.

### 13.10 Decision detail and feedback

The extension should use the current router/request detail APIs when their contract is sufficient, or a versioned integration endpoint when additional redaction/stability is required. Explicit feedback is attached to a routing-decision ID and sent to Role-Model. Pi must not maintain a competing learned reranker.

---

## 14. Pi extension runtime design

### 14.1 Extension factory and lifecycle

The extension factory should perform only local, bounded initialization:

- parse global configuration;
- register commands and UI renderers;
- load cached non-secret alias metadata;
- register a cached Role-Model provider when possible;
- register lifecycle handlers.

It must not download binaries, start processes, wait on network discovery, or resolve credentials from the factory. Pi awaits async extension factories, so unbounded work there would delay every invocation, including invocations that never start a session.

At `session_start`:

1. load trusted project policy if permitted;
2. connect to or start the runtime according to global mode;
3. verify runtime and integration manifests;
4. refresh aliases with a hard timeout;
5. update status/readiness;
6. never begin first-run installation or secret synchronization without user action.

At `session_shutdown`:

- abort outstanding HTTP requests;
- clear run-correlation state;
- flush non-secret receipts;
- stop only a verified Pi-owned child runtime when the whole Pi process is exiting;
- leave external/shared runtimes running.

### 14.2 Gateway provider registration

After a runtime is authenticated and alias metadata is available:

```typescript
pi.registerProvider("role-model", {
  name: "Role-Model Router",
  baseUrl: `${connection.url}/v1`,
  apiKey: connection.dataPlaneToken,
  api: "openai-completions",
  authHeader: true,
  models: aliases.map(toPiModelConfig),
});
```

The data-plane token is loaded into extension memory from a user-only token file or approved external secret reference. It is not stored in `role-model.json`.

`toPiModelConfig()` should use structured alias metadata where available. Conservative fallback values are allowed only for cached aliases and must be refreshed before recommending them.

The extension should not replace the user's current model merely because the runtime became ready. Activation happens through:

- completion of `/role-model setup` with explicit approval;
- `/role-model alias use <id>`;
- `/route on`;
- a global `routing.activateOnStart` setting previously approved by the user.

The prior non-Role-Model Pi model is remembered as a manual gateway fallback.

### 14.3 Configuration

Use a dedicated configuration file:

```text
~/.pi/agent/role-model.json
.pi/role-model.json
```

Global configuration may manage installation, runtime, credentials, and routing. Trusted project configuration may only narrow routing policy or suggest task/role defaults unless global policy explicitly permits more.

Example global configuration:

```json
{
  "version": 2,
  "enabled": true,
  "connection": {
    "url": "http://127.0.0.1:3456",
    "dataTokenFile": "~/.pi/agent/role-model/secrets/data-token",
    "controlTokenFile": "~/.pi/agent/role-model/secrets/control-token",
    "allowRemote": false
  },
  "runtime": {
    "mode": "managed-process",
    "autoStart": true,
    "autoInstall": "prompt",
    "binaryPath": null,
    "versionConstraint": ">=<minimum pinned by extension release>",
    "stateRoot": "~/.pi/agent/role-model/runtime-state",
    "scopeId": "pi",
    "host": "127.0.0.1",
    "port": 3456,
    "startupTimeoutMs": 15000,
    "shutdownTimeoutMs": 10000,
    "upgradePolicy": "notify",
    "logPath": "~/.pi/agent/role-model/logs/runtime.log"
  },
  "sync": {
    "enabled": true,
    "mode": "prompt",
    "defaultCredentialMode": "ephemeral-env",
    "providers": {}
  },
  "routing": {
    "defaultAlias": null,
    "activateOnStart": false,
    "showDirectModels": false,
    "strategy": "balanced",
    "preferLocal": false,
    "budgetMode": "advisory",
    "budgetLimitUsd": 0.1,
    "automaticIntent": true
  },
  "tui": {
    "showRoutingStatus": true,
    "showRuntimeStatus": true
  }
}
```

No token, provider API key, OAuth token, or copied credential appears in this file.

Project configuration may set fields such as:

```json
{
  "version": 2,
  "routing": {
    "preferredAlias": "default.hybrid",
    "preferLocal": true,
    "denyRemote": true,
    "roleHint": "coder.review"
  }
}
```

It may not replace the runtime executable, download source, host, port, token files, synchronization mode, or credential policy.

### 14.4 State model

```typescript
interface RuntimeState {
  connection: "disconnected" | "starting" | "ready" | "degraded" | "failed";
  ownership: "external" | "managed-process" | "managed-shared" | null;
  instance?: RuntimeInstanceReceipt;
  manifest?: PiIntegrationManifest;
  aliases: RoleModelAlias[];
  selectedAlias?: string;
  syncSummary?: SyncSummary;
}

interface AgentRunState {
  sessionId: string;
  agentRunId: string;
  turnIndex: number;
  intent: RoutingIntent;
  pendingRequests: Map<string, PendingProviderRequest>;
  latestDecision?: RouteDecisionSummary;
}
```

Do not key routing state by the current session leaf. Pi sessions are trees and the leaf changes during messages, tools, compaction, and navigation.

### 14.5 Deterministic intent derivation

Priority:

1. explicit `/role`, `/route-task`, and `/route-strategy` overrides;
2. trusted project routing policy;
3. structured Pi state;
4. conservative local rules;
5. Role-Model defaults.

Use:

- attached images;
- active tools and final serialized tools;
- `systemPromptOptions.selectedTools`;
- context usage;
- edit/write tool availability;
- strict schema requirements;
- explicit review/patch/general requests.

Do not make a second remote classifier call in the first release. Do not claim keyword rules are accurate without replay evaluation.

Baseline examples:

| Workload | Task | Role treatment | Capabilities |
|---|---|---|---|
| Modify repository files | `code.edit` | advisory `coder.patch` unless explicit | require `code.edit`; require tools when serialized |
| Review code or patch | registered review-compatible task | advisory `coder.review` unless explicit | prefer reasoning; require schema only when strict |
| General explanation | `text.chat` | advisory `general.chat` | text; tools only when present |
| Tool orchestration | `tools.function_calling` | advisory `tool.agent` | require tool calling |
| Strict JSON output | `json.schema_adherence` | router-selected or explicit role | require schema adherence |

Every explicit ID must be validated against the runtime's current role/task catalog.

### 14.6 Event handling

#### `before_agent_start`

Create agent-run intent and IDs. Do not modify the system prompt.

```typescript
pi.on("before_agent_start", (event, ctx) => {
  const state = createAgentRunState({
    sessionId: ctx.sessionManager.getSessionId(),
    prompt: event.prompt,
    images: event.images,
    selectedTools: event.systemPromptOptions.selectedTools,
    contextUsage: ctx.getContextUsage(),
    explicitOverrides: currentOverrides,
    trustedProjectPolicy: loadTrustedProjectPolicy(ctx),
  });
  runState.set(state.sessionId, state);
});
```

#### `before_provider_request`

Only mutate requests already targeting the Role-Model provider:

```typescript
pi.on("before_provider_request", (event, ctx) => {
  if (!isRoleModelGateway(ctx.model) || !isRecord(event.payload)) return;

  const state = requireCurrentRunState(ctx);
  const providerRequestId = crypto.randomUUID();
  const metadata = buildRoleModelMetadata({
    state,
    providerRequestId,
    payload: event.payload,
    config,
  });

  state.pendingRequests.set(providerRequestId, {
    providerRequestId,
    startedAtMs: Date.now(),
  });

  return { ...event.payload, role_model: metadata };
});
```

No `_routingDecision` field and no local endpoint substitution are added.

#### `after_provider_response`

Use only status and headers, which are what Pi currently exposes:

```typescript
pi.on("after_provider_response", (event, ctx) => {
  if (!isRoleModelGateway(ctx.model)) return;
  const summary = parseRoleModelHeaders(event.headers);
  correlateResponse(summary);
  if (summary.endpointId) {
    ctx.ui.setStatus("role-model-route", `routed: ${summary.endpointId}`);
  }
});
```

#### `message_end` and `turn_end`

Use Pi's normalized assistant usage, stop reason, response model, error, and tool results after stream consumption. This supports Pi UX and correlation; Role-Model remains the telemetry authority.

### 14.7 Command families

The extension should use one discoverable namespace:

```text
/role-model setup|help|doctor
/role-model install|upgrade
/role-model start|stop|restart|status|logs|ui
/role-model sync plan|apply|status
/role-model credentials status|import
/role-model providers|models|endpoints
/role-model endpoint activate
/role-model alias list|use|explain|recommended|refresh
/role-model benchmark ...
```

Routing shortcuts remain available:

```text
/route on|off|status|explain
/route-strategy balanced|cost|quality|latency|local
/route-task auto|<task-id>
/role auto|<role-id>
/route-feedback good|bad [reason]
```

Commands that mutate installation, credentials, accounts, endpoints, aliases, benchmark data, or process state must be user-invoked. They should not be registered as unrestricted LLM-callable tools.

### 14.8 TUI status

Use separate compact status keys:

```text
role-model-runtime: ready · managed-process · vX
role-model-route: default.hybrid -> kimi... · balanced
role-model-sync: 3 providers · 5 endpoints · 1 drift
role-model-benchmark: run ... · 12/40
```

Detailed output belongs in commands/widgets, not the permanent footer.

### 14.9 Gateway failure behavior

#### Runtime unavailable before activation

- keep the current Pi model;
- show setup/doctor guidance;
- attempt managed start only when configured;
- never block indefinitely.

#### Runtime crashes while idle

- mark provider degraded;
- optionally restart an owned child according to a bounded restart policy;
- do not restart-loop indefinitely;
- preserve logs and instance receipts.

#### Runtime/gateway fails during request

- Role-Model owns upstream endpoint fallback;
- Pi surfaces gateway errors;
- v1 does not automatically replay after any output or tool call may have occurred;
- `/route off` restores the remembered Pi model for the next request.

A future custom `streamSimple` wrapper may retry only before the first response event and only when duplicate execution can be ruled out.

---

## 15. Required Role-Model work

The current runtime provides many useful APIs, but the full integration requires the following explicit contracts.

### 15.1 Headless and process ownership

- add explicit `--headless`/`--no-browser`;
- add ownership mode and parent-PID monitoring;
- provide atomic ready/instance receipts;
- expose graceful authenticated shutdown for owned instances or guarantee signal handling;
- define dynamic-port behavior;
- define log format and startup error receipts;
- test stale PID, port collision, and multiple-instance behavior.

### 15.2 Release manifest and provenance

- publish a machine-readable list of supported assets per release;
- include archive hash, size, entrypoint, minimum OS requirements, and integration contract versions;
- sign the manifest or publish verifiable provenance;
- make unsupported platforms explicit;
- preserve official manual installers independently of the Pi-managed path.

### 15.3 Authenticated control plane

Before accepting Pi credentials:

- require a dedicated control bearer token or local authenticated IPC;
- use a separate data-plane token for OpenAI ingress;
- bind local managed instances to loopback by default;
- restrict CORS origins and protect state-changing browser requests against CSRF;
- redact `Authorization`, provider keys, OAuth data, generated env values, and credential request bodies;
- disable activity/request-body capture for credential and token endpoints;
- apply permission checks to account, endpoint, runtime-config, benchmark-delete, shutdown, and synchronization operations;
- expose auth requirements in the integration manifest.

### 15.4 Pi integration manifest

Implement the versioned manifest described in Section 6, including runtime version, contract versions, feature flags, paths, auth modes, and lifecycle ownership.

### 15.5 Synchronization plan and apply APIs

Implement:

```text
POST /api/role-model/integrations/pi/sync/plan
POST /api/role-model/integrations/pi/sync/apply
GET  /api/role-model/integrations/pi/sync/status
```

Requirements:

- Role-Model maps Pi identities to its own provider catalog and variants;
- plan response contains no secrets;
- plans are short-lived, content-addressed, and bound to runtime instance and client;
- apply requires authenticated control access and the plan ID;
- account/endpoint changes return an atomic receipt and diagnostics;
- existing manual accounts remain authoritative unless the user explicitly chooses replacement;
- synchronization does not delete accounts/endpoints by default;
- secret-bearing request bodies are never persisted in captures.

### 15.6 Credential grant support

Support distinct grants:

- env-reference grant for a managed child runtime;
- one-time API-key import using atomic local storage;
- native device authorization;
- no OAuth-token import from Pi in v1.

Credential lifecycle state must be visible without exposing values.

### 15.7 Generic OpenAI-compatible provider import

Add a validated additional-provider contract for custom Pi endpoints when desired. It must not bypass provider-account validation or catalog policy. At minimum validate:

- API family;
- base URL and TLS policy;
- model IDs;
- request-shape compatibility;
- modalities, tools, context, and output limits;
- auth mode;
- health probe;
- provider kind and endpoint identity.

### 15.8 Alias metadata and recommendation

Extend `/v1/models` or the downstream OpenAI setup response with structured alias metadata:

- alias/direct kind;
- routing mode;
- execution mode;
- endpoint pool and ready count;
- modalities/tool support;
- context/output limits;
- description;
- recommendation and unavailability reason.

The extension should not have to reverse-engineer alias names.

### 15.9 Routing metadata ingress

For chat-completions and Responses:

1. parse and remove `role_model`;
2. validate contract version;
3. merge the existing explicit-role header;
4. derive missing tool/modality/context facts;
5. distinguish explicit and advisory role/task signals;
6. construct the internal `RoutingRequest`;
7. ensure client policy can only narrow operator policy;
8. emit diagnostics and stable routing headers.

A proposed `preferredRoleId` or equivalent soft role signal requires schema, core, fixture, conformance, telemetry, and documentation coverage.

### 15.10 Feedback and decision detail

- expose a stable redacted request/decision detail contract for Pi;
- accept explicit feedback tied to decision and agent-run IDs;
- preserve one routing/learning authority;
- ensure feedback cannot override hard policy or immediately poison routing with one sample.

---

## 16. Security and privacy

### 16.1 Security principles

1. No installation without explicit user consent.
2. No secret resolution during discovery or planning.
3. No secret transfer without provider-specific confirmation.
4. No credential synchronization over an unauthenticated control API.
5. No project-level authority over global binaries or credentials.
6. No model-callable secret/process mutation tools.
7. No routing metadata in the model-visible prompt.
8. No hidden classifier request.
9. No automatic paid benchmark.
10. No killing a process that cannot be proven to be owned by the extension.

### 16.2 Supply-chain security

- managed downloads come only from the configured official repository allowed by global policy;
- release metadata is verified before asset selection;
- hashes and signatures/provenance are verified;
- archive extraction is hardened;
- installs are immutable and versioned;
- current-version switches are atomic;
- upgrades are not silent;
- the package does not bundle or modify the Role-Model executable.

### 16.3 Control/data-plane separation

Use separate credentials:

- **data token:** permits inference through approved OpenAI-compatible ingress;
- **control token:** permits configured administrative operations.

A stolen data token must not permit credential import, account deletion, benchmark clearing, runtime-config mutation, or shutdown. Token files use user-only permissions and are referenced by path, not copied into normal configuration.

### 16.4 Secret minimization

- use Pi's public credential resolver;
- resolve only selected providers after confirmation;
- prefer environment references to raw key material when possible;
- keep raw strings in scope for the minimum time;
- never print, render, persist, hash for display, or include keys in errors;
- redact headers and bodies in HTTP diagnostics;
- disable debug captures on credential paths;
- avoid passing secrets on command-line arguments, which may be visible in process listings;
- acknowledge that JavaScript strings cannot be reliably zeroed, so architectural minimization matters more than cosmetic memory wiping.

### 16.5 OAuth and subscription credentials

Pi-managed OAuth data must remain Pi-managed in v1. Role-Model should run its own supported device flow. The extension may coordinate UI and polling but does not export Pi refresh tokens or impersonate Pi's OAuth client.

### 16.6 Remote runtimes

Remote control is disabled by default.

To enable it globally, require:

- HTTPS with certificate validation;
- explicit host allowlist;
- separate control credential from the data token;
- an authenticated integration manifest;
- explicit permission for credential import;
- preferably no raw credential import at all—use secret references or provider-native auth at the remote runtime.

Project configuration cannot enable remote control.

### 16.7 Project trust

Only trusted projects may supply `.pi/role-model.json`. Even then, project policy may narrow routing but cannot change:

- runtime binary or download source;
- runtime host/port;
- token file paths;
- remote-runtime permission;
- credential synchronization policy;
- install or upgrade policy;
- benchmark consent;
- global hard budget/privacy constraints.

### 16.8 Skill safety

The bundled skill is model-visible operational documentation. It must:

- never contain credential values or secret file contents;
- never tell the model to read Pi auth storage;
- never make installation or credential changes through generic shell commands when extension commands exist;
- clearly separate informational actions from mutating actions;
- direct the user to review receipts and confirmations.

### 16.9 Capture and telemetry

Role-Model may record routing and execution telemetry according to its capture policy, but onboarding must not broaden prompt or credential capture. Pi correlation IDs may be stored. Credential bodies, bearer tokens, env values, and installer auth must never be captured.

---

## 17. Verification strategy

### 17.1 Package and skill tests

1. Package manifest loads both extension and skill.
2. Skill frontmatter and paths validate under Pi's skill discovery rules.
3. Skill descriptions trigger relevant discovery without permanently loading all references.
4. Skill instructions use extension commands for sensitive mutations.
5. Package has no bundled runtime binary or private Role-Model workspace dependency.

### 17.2 Installer tests

1. Supported OS/architecture selected from release manifest.
2. Unsupported platform reports exact supported targets.
3. Linux arm64 mismatch is caught without constructing a nonexistent URL.
4. Checksum mismatch.
5. Signature/provenance mismatch.
6. Truncated archive.
7. Path traversal and symlink escape.
8. Unexpected entrypoint.
9. Atomic install and current-pointer update.
10. Rollback after failed verification.
11. Concurrent installer lock.
12. Existing manual install adoption.

### 17.3 Runtime lifecycle tests

1. External connection succeeds without spawning.
2. Headless managed startup never opens a browser.
3. JSON readiness receipt parsed correctly.
4. Startup timeout includes log path.
5. Dynamic and fixed port behavior.
6. Port collision with unrelated process.
7. Stale PID/receipt cleanup without killing unknown process.
8. Two Pi processes do not kill each other's runtimes.
9. `/reload`, `/new`, `/resume`, and `/fork` do not restart healthy runtime.
10. Parent PID exit terminates owned child.
11. Graceful and forced shutdown paths.
12. Crash restart is bounded and observable.
13. Upgrade does not replace a running binary in place.

### 17.4 Credential inventory and synchronization tests

1. Inventory contains no credential value.
2. Inventory does not invoke command-backed secrets.
3. Plan correctly maps known provider/model identities.
4. Unsupported custom providers return diagnostics.
5. User can select providers and models independently.
6. No key is resolved before confirmation.
7. Environment link passes the correct variable only to owned process.
8. Persistent copy uses authenticated control request and leaves no logs/captures.
9. API apply failure rolls back account/endpoint mutations.
10. Existing manual account merge preserves manual authority.
11. OAuth is rejected for Pi-token copy and redirected to native authorization.
12. Runtime override and command-backed credentials remain session-only by default.
13. Remote runtime credential import is blocked by default.
14. Drift status does not expose secret values.
15. Resync never silently deletes or revokes.

### 17.5 Alias tests

1. Actual `/v1/models` aliases register in Pi.
2. Direct models are hidden by default.
3. Recommended model is preferred only when ready.
4. Alias disappearance does not break an in-flight run.
5. Cached alias metadata is marked stale.
6. Structured mode/execution metadata is displayed correctly.
7. User can distinguish routed alias from direct model.
8. Alias config mutations require confirmation and validate non-empty model pools.

### 17.6 Benchmark tests

1. Suite read.
2. Quick and full run request construction.
3. Endpoint/case selection.
4. Judge preference and no-judge mode.
5. Paid-run confirmation.
6. Progress polling and active-run recovery after Pi restart.
7. Result and history rendering.
8. Clear operations require explicit destructive confirmation.
9. Stale suite/config results are identified.
10. Benchmark does not silently rewrite aliases or roles.

### 17.7 Routing contract tests

1. Valid metadata on chat-completions and Responses.
2. Streaming/non-streaming.
3. Existing role header, matching body/header, and conflict rejection.
4. Explicit versus advisory task/role semantics.
5. Unsupported contract version.
6. Client attempts to relax hard policy.
7. Metadata stripped before upstream serialization.
8. Correlation ID echoed on direct and fallback execution.
9. Multi-turn and parallel tool calls.
10. No prompt mutation.
11. No local reranking.

### 17.8 Fresh-machine end-to-end tests

Test each supported platform in a clean environment:

```text
install Pi package
-> skill visible
-> no Role-Model present
-> setup detects absence
-> managed install
-> headless startup
-> provider inventory
-> credential-mode consent
-> endpoint activation
-> smoke check
-> optional quick benchmark
-> alias recommendation
-> Pi route through alias
-> tool loop
-> route explanation
-> Pi exit and owned-runtime cleanup
```

Also test:

- user declines install;
- user connects an external runtime;
- runtime too old;
- control auth missing;
- provider sync partially unsupported;
- no execution-ready endpoint;
- runtime upgrade and rollback.

### 17.9 Provider, tool, cache, and cost matrix

For every Role-Model execution family used by Pi, verify:

- tools and tool results;
- image input where supported;
- streaming text/reasoning/tool deltas;
- prompt-cache request and usage signals;
- cost provenance;
- upstream fallback;
- selected endpoint/adapter headers;
- no double execution;
- Pi and Role-Model telemetry correlation.

---

## 18. Delivery plan

### Phase 0 — Security, lifecycle, and integration contracts

**Role-Model:**

- authenticated control plane with separate data/control tokens;
- explicit headless and parent-process ownership flags;
- integration capability manifest;
- signed/checksummed release manifest;
- request/capture redaction for credentials;
- fixtures for control and lifecycle contracts.

**Pi package:**

- local bootstrap manifest and matching types;
- no credential synchronization yet;
- installer/lifecycle contract tests against fakes.

**Exit criterion:** Pi can verify a compatible authenticated runtime and prove that inference credentials cannot mutate control state.

### Phase 1 — Package skill and external-runtime onboarding

- ship the Role-Model skill and references;
- add `/role-model setup|help|doctor|status|ui`;
- connect to an already-running runtime;
- read version, integration manifest, runtime snapshot, downstream config, aliases, and readiness;
- register runtime-discovered aliases;
- no managed install or secret import yet.

**Exit criterion:** a user with an existing Role-Model runtime can configure Pi entirely from Pi and select the runtime-recommended alias.

### Phase 2 — Verified managed installation and child runtime

- implement release-manifest asset selection;
- verify checksums/signatures and hardened extraction;
- implement versioned installs and rollback;
- start in explicit headless `managed-process` mode;
- add locks, receipts, parent PID, logs, and bounded shutdown;
- implement `autoStart` after prior approval.

**Exit criterion:** a clean supported machine can install and start a Role-Model child without opening a browser, and the child exits when Pi exits.

### Phase 3 — Provider/model/credential/endpoint synchronization

- implement non-secret Pi inventory;
- add Role-Model sync plan/apply/status APIs;
- support recognized providers and model mappings;
- support ephemeral static-key env links for owned runtime;
- support explicit persistent API-key copy;
- coordinate Role-Model-native device authorization;
- activate endpoints and optional reviewed role bindings;
- add drift reporting.

**Exit criterion:** selected Pi static-key providers and models become execution-ready Role-Model endpoints without reading auth files directly or exposing secrets in logs/captures.

### Phase 4 — Routing metadata and complete tool-loop integration

- implement `role_model` body contract on both OpenAI ingress paths;
- add task/role discovery and advisory role support;
- attach Pi metadata per provider request;
- return stable routing headers;
- correlate Pi usage and Role-Model decision IDs;
- complete streaming multi-turn tool-loop tests.

**Exit criterion:** an explicit or inferred coding role from Pi affects a real Role-Model decision and both systems report the same endpoint and decision ID.

### Phase 5 — Alias and benchmark operations

- enrich alias metadata and recommendation;
- add alias list/use/explain/config commands;
- add benchmark suite/run/progress/result/history/preferences commands;
- add setup smoke and optional quick benchmark;
- show cost and destructive-operation confirmations.

**Exit criterion:** a user can evaluate configured endpoints and choose a suitable routed alias without leaving Pi.

### Phase 6 — Feedback, shared runtime, and optional failover

- add explicit route feedback;
- add stable feedback API and evaluation exports;
- implement shared-daemon mode only after ownership/auth testing;
- evaluate optional pre-first-event gateway failover through a custom Pi stream wrapper.

**Exit criterion:** feedback is traceable and reversible, shared ownership cannot terminate another client's runtime, and failure injection proves no duplicate tool execution.

The complete feature spans both repositories and substantial security, installer, lifecycle, synchronization, and integration tests. It should not be estimated as a small 500–800 line extension.

---

## 19. Success criteria

### 19.1 Fresh-install success

- A supported clean machine can go from Pi package installation to a ready Role-Model alias through `/role-model setup`.
- The user is shown the runtime source, license, version, target, integrity status, and installation location before installation.
- No browser opens during headless setup or automatic startup.
- Declining installation leaves Pi fully usable with its existing model.
- Unsupported platforms receive precise manual alternatives rather than a failed guessed download.

### 19.2 Runtime correctness

- Every managed start either connects to a verified compatible instance or creates one with a unique receipt.
- Startup is bounded by the configured timeout.
- Pi never kills an unverified process.
- A Pi-owned child exits after its parent exits.
- Multiple Pi instances do not interfere with each other.
- Runtime upgrades are atomic and retain a known-good rollback version.
- Runtime state and logs are discoverable through `/role-model status` and `/role-model logs`.

### 19.3 Synchronization security and correctness

- Non-secret planning resolves zero credential values.
- Every transferred key has provider-specific user approval.
- Credential values appear in no config, receipt, log, capture, error, or TUI output.
- OAuth credentials are not copied from Pi in v1.
- Applied accounts/endpoints match the confirmed plan.
- Partial apply failure does not leave an ambiguous execution-ready state.
- Pi and Role-Model can report drift without exposing secrets.
- Project configuration cannot trigger global credential import.

### 19.4 Alias and benchmark correctness

- Pi displays actual runtime aliases and direct models distinctly.
- The selected default comes from the runtime recommendation or is labelled as a Pi suggestion.
- Empty or unhealthy aliases are not recommended.
- Paid benchmarks never begin without concrete confirmation.
- Benchmark progress survives Pi UI refresh or restart.
- Results include suite version and staleness information.
- Benchmark output does not silently mutate aliases or strict role bindings.

### 19.5 Routing contract correctness

- Every routed Pi provider request has unique session, run, turn, and provider-request correlation fields.
- Role-Model echoes the provider-request ID.
- Successful routed responses expose a selected endpoint and decision ID.
- Pi and Role-Model telemetry agree on endpoint, request, and decision.
- Explicit roles retain hard semantics; inferred roles remain advisory.
- No routing metadata appears in the model-visible prompt.
- No Pi-side local reranking changes the router's chosen endpoint.
- Multi-turn tool loops preserve one agent-run identity and distinct request IDs.

### 19.6 Product evaluation

Claims about savings or quality require replay and benchmark evidence. Report at least:

- setup completion and abandonment rates;
- runtime auto-start reliability and startup latency;
- provider/model synchronization success by provider family;
- manual fixes required after synchronization;
- endpoint readiness rate;
- alias selection and override frequency;
- accepted-patch or task-completion rate;
- explicit route feedback;
- route regret against evaluated alternatives;
- p50/p95 first-token and completion latency;
- total effective cost including benchmark, failure, and fallback calls;
- no-eligible-endpoint and gateway-outage rates.

Lack of user override is not treated as proof of satisfaction.

---

## 20. Risks and mitigations

| Risk | Mitigation |
|---|---|
| User assumes the Pi package includes Role-Model | First-run skill and setup status explicitly distinguish package, runtime, and provider endpoints. |
| Unsupported release asset | Select only assets listed in a signed/checksummed release manifest; show supported targets. |
| Installer supply-chain compromise | Verify origin, hash, provenance/signature, archive layout, and executable identity; use atomic versioned installs. |
| Runtime opens unwanted browser | Require explicit headless flag; use `/role-model ui` for deliberate browser opening. |
| Duplicate/orphan runtime processes | Use ownership modes, locks, receipts, parent PID monitoring, and verified PID checks. |
| Pi startup becomes slow | Do no network work in the extension factory; use bounded connect/start in `session_start`; cache non-secret metadata. |
| Control API exposes credentials | Block sync until separate authenticated control plane, redaction, no-capture, and loopback/TLS requirements are proven. |
| Data token grants admin access | Separate data and control tokens with distinct permission checks. |
| Extension leaks Pi secrets | Use `ModelRegistry`; plan before resolution; per-provider confirmation; never log or persist raw values. |
| OAuth token copied incorrectly | Prohibit Pi OAuth token export in v1; use Role-Model-native login. |
| Environment-linked key unavailable after restart | Relink on owned runtime startup and report dependency on Pi; do not present it as persistent storage. |
| Persistent copies drift | Clearly mark independent copies and report sync age/source; require explicit update. |
| Custom provider mis-mapped | Role-Model owns mapping; unsupported/custom endpoints require explicit generic-provider contract and validation. |
| Sync overwrites manual Role-Model config | Plan shows conflicts; manual accounts remain authoritative; apply is additive by default. |
| Project redirects runtime or secrets | Trusted project config may narrow routing only; global config controls binary, host, tokens, and sync. |
| Alias names drift | Discover aliases and structured metadata; use runtime recommendation; cache with staleness marker. |
| Benchmark creates unexpected cost | Show case/request/judge estimates and require confirmation; no auto-run. |
| Benchmark poisons routing from weak data | Role-Model applies sample thresholds/policy; Pi never directly rewrites aliases based on one run. |
| Incorrect inferred task | Keep deterministic rules conservative, roles advisory, IDs validated, and manual overrides visible. |
| Gateway unavailable | Preserve prior Pi model; bounded managed restart; explicit `/route off`; no unsafe replay. |
| Upstream fallback duplicates tools | Keep endpoint fallback inside Role-Model; prohibit Pi replay after output/tool emission. |
| Contract drift | Version routing, control, sync, release, and manifest schemas; pin fixtures in both repositories. |
| License incompatibility | Keep runtime separately installed; display current licence during managed install; review commercial distribution separately. |

---

## 21. Dependencies, distribution, and licensing

### 21.1 Pi package dependencies

Prefer Pi peer packages and Node built-ins:

```json
{
  "peerDependencies": {
    "@earendil-works/pi-coding-agent": "*",
    "@earendil-works/pi-ai": "*"
  }
}
```

A small runtime schema validator and an audited archive reader may be justified for installation safety. They must be pinned, reviewed, and kept separate from Role-Model's private monorepo packages. `better-sqlite3` is not required; Role-Model already owns persistent routing and benchmark state.

### 21.2 Distribution boundary

The Pi package contains:

- TypeScript extension code;
- skill documentation and references;
- non-secret bootstrap metadata;
- tests.

It does not contain the Role-Model binary. Managed installation downloads an official Role-Model release only after consent. Manual/external installation remains fully supported.

### 21.3 Runtime prerequisites

Packaged standalone releases should be preferred for normal users. Source builds currently have their own Node, pnpm, and build-tool requirements and belong in developer documentation, not the default wizard.

### 21.4 Licensing

Pi's coding-agent package is MIT licensed. Role-Model's current root license is BUSL-1.1 with a project-specific additional-use grant. The setup wizard and managed installer should display a concise licence notice and link/reference the installed release's licence text.

Internal use is described as allowed under the current grant, while paid third-party embedding, bundling, or managed-service use may require a commercial license. The extension's ability to download a separate runtime does not eliminate the need to review the applicable Role-Model licence for the intended deployment.

---

## 22. Future directions

After the initial contracts are proven:

- shared user daemon with robust multi-client ownership;
- OS service integration as an explicit separate install mode;
- keychain-backed Role-Model credential references;
- remote secret-manager references rather than raw imports;
- richer custom OpenAI-compatible endpoint detection;
- local semantic task classification;
- benchmark profiles tailored to Pi coding workflows;
- routing-aware but model-invisible compaction metadata;
- organization policy and shared alias templates;
- migration/export of non-secret sync plans;
- safe pre-first-event gateway failover;
- UI overlays for candidate and benchmark comparison;
- SDK setup APIs for applications embedding Pi.

These should not weaken the single-authority routing model or the explicit secret/install consent model.

---

## 23. Conclusion

`pi-role-model-router` should be more than a payload interceptor. For the typical user, it is the installer, operator bridge, configuration client, and gateway integration for a runtime they have never used before.

The complete design has four essential properties:

1. **Pi can learn and explain Role-Model.** A bundled skill provides progressively disclosed concepts, workflows, and troubleshooting information.
2. **Pi can make Role-Model available.** The extension can explicitly install a verified official release and start it in a real headless, owned process mode.
3. **Pi can configure Role-Model safely.** It inventories Pi providers without secrets, obtains a Role-Model-authored mapping plan, asks for provider-specific consent, and then links or copies only approved static credentials through an authenticated control plane. OAuth remains Role-Model-native.
4. **Role-Model remains the routing authority.** Pi sends canonical task and role metadata to an actual runtime alias; Role-Model applies policy, selects and executes endpoints, runs benchmarks, owns fallback and observations, and returns correlated routing metadata.

The first complete proof should start from a clean machine with no Role-Model installation and end with a full Pi tool loop routed through a benchmarked, runtime-recommended alias. It is successful only when installation, process ownership, credential handling, endpoint configuration, alias selection, and routing telemetry are all verifiable and secure—not merely when a request reaches `localhost`.

---

## Appendix A — Proposed command reference

### Setup and help

| Command | Purpose |
|---|---|
| `/role-model setup` | Run or resume first-use setup. |
| `/role-model help` | Show command summary and load the Role-Model skill. |
| `/role-model doctor` | Diagnose binary, process, auth, readiness, providers, endpoints, aliases, and contract compatibility. |

### Runtime and installation

| Command | Purpose |
|---|---|
| `/role-model install` | Install an approved official runtime release. |
| `/role-model upgrade` | Check, verify, install, and optionally switch to a newer compatible release. |
| `/role-model start` | Start a configured managed runtime. |
| `/role-model stop` | Stop only a verified owned/shared runtime according to ownership policy. |
| `/role-model restart` | Restart a verified managed runtime. |
| `/role-model status` | Show runtime version, ownership, URL, readiness, contracts, and active alias. |
| `/role-model logs` | Show or follow bounded runtime logs. |
| `/role-model ui` | Deliberately open the Role-Model web UI. |

### Providers, credentials, and endpoints

| Command | Purpose |
|---|---|
| `/role-model sync plan` | Build a non-secret Pi-to-Role-Model mapping plan. |
| `/role-model sync apply` | Review and apply an approved plan. |
| `/role-model sync status` | Show drift and synchronization receipts. |
| `/role-model credentials status` | Show credential lifecycle/status without values. |
| `/role-model credentials import` | Start an explicit provider-specific credential flow. |
| `/role-model providers` | List provider catalog and configured accounts. |
| `/role-model models` | List canonical and Pi-mapped models. |
| `/role-model endpoints` | List endpoint readiness and role bindings. |
| `/role-model endpoint activate` | Activate a selected account/model endpoint. |

### Aliases

| Command | Purpose |
|---|---|
| `/role-model alias list` | List routed aliases and optional direct models. |
| `/role-model alias recommended` | Show the runtime recommendation and rationale. |
| `/role-model alias use <id>` | Select the alias as Pi's Role-Model model. |
| `/role-model alias explain <id>` | Explain modes, endpoint pool, readiness, and benchmark coverage. |
| `/role-model alias refresh` | Refresh alias metadata. |

### Benchmarks

| Command | Purpose |
|---|---|
| `/role-model benchmark suite` | Inspect suite and cases. |
| `/role-model benchmark quick` | Start a confirmed quick run. |
| `/role-model benchmark full` | Start a confirmed full run. |
| `/role-model benchmark status` | Show active or selected run progress. |
| `/role-model benchmark results` | Summarize grades and artifacts. |
| `/role-model benchmark history` | List prior runs. |
| `/role-model benchmark judge` | Read or set judge preference. |
| `/role-model benchmark clear ...` | Explicitly clear selected benchmark data. |

### Routing

| Command | Purpose |
|---|---|
| `/route on` | Select the configured Role-Model alias. |
| `/route off` | Restore the remembered direct Pi model. |
| `/route status` | Show current task, role, alias, endpoint, and decision. |
| `/route explain` | Fetch latest Role-Model decision details. |
| `/route-strategy <value>` | Set request strategy within global policy. |
| `/route-task auto\|<id>` | Set or clear explicit task override. |
| `/role auto\|<id>` | Set or clear explicit role request. |
| `/route-feedback good\|bad [reason]` | Submit explicit feedback. |

---

## Appendix B — Proposed configuration schema

```typescript
interface PiRoleModelConfigV2 {
  version: 2;
  enabled: boolean;
  connection: {
    url: string;
    dataTokenFile?: string;
    controlTokenFile?: string;
    allowRemote: boolean;
    allowedRemoteHosts?: string[];
  };
  runtime: {
    mode: "external" | "managed-process" | "managed-shared";
    autoStart: boolean;
    autoInstall: "never" | "prompt";
    binaryPath?: string | null;
    versionConstraint: string;
    stateRoot: string;
    scopeId: string;
    host: string;
    port: number;
    startupTimeoutMs: number;
    shutdownTimeoutMs: number;
    upgradePolicy: "manual" | "notify" | "prompt";
    logPath: string;
  };
  sync: {
    enabled: boolean;
    mode: "disabled" | "prompt" | "manual";
    defaultCredentialMode: "skip" | "ephemeral-env" | "persistent-copy" | "role-model-native";
    providers: Record<
      string,
      {
        enabled?: boolean;
        models?: string[];
        credentialMode?: "skip" | "ephemeral-env" | "persistent-copy" | "role-model-native";
        roleIdsByModel?: Record<string, string[]>;
      }
    >;
  };
  routing: {
    defaultAlias?: string | null;
    activateOnStart: boolean;
    showDirectModels: boolean;
    strategy: "balanced" | "cost" | "quality" | "latency";
    preferLocal: boolean;
    budgetMode: "strict" | "advisory" | "disabled";
    budgetLimitUsd?: number;
    automaticIntent: boolean;
  };
  tui: {
    showRoutingStatus: boolean;
    showRuntimeStatus: boolean;
  };
}
```

Secret values are deliberately absent.

---

## Appendix C — Example synchronization receipt

```json
{
  "schema_version": 1,
  "plan_id": "plan-...",
  "applied_at_ms": 0,
  "runtime_instance_id": "...",
  "results": [
    {
      "pi_provider_id": "anthropic",
      "role_model_provider_id": "anthropic",
      "provider_account_id": "anthropic.personal.pi-import",
      "credential_mode": "ephemeral-env",
      "credential_status": "linked",
      "models": [
        {
          "pi_model_id": "...",
          "role_model_model_id": "anthropic/...",
          "endpoint_id": "anthropic.personal.pi-import.global....",
          "endpoint_status": "active",
          "role_ids": ["coder.patch", "coder.review"]
        }
      ],
      "diagnostics": []
    }
  ],
  "skipped": [],
  "warnings": []
}
```

No secret or secret fingerprint is included.

---

## Appendix D — Canonical baseline task and role examples

The extension must discover the active runtime taxonomy. Current baseline examples include:

### Tasks

| Task ID | Meaning |
|---|---|
| `text.chat` | General prose answer or conversation. |
| `code.edit` | Repository-scoped change expecting a patch or diff. |
| `tools.function_calling` | Structured tool invocation and orchestration. |
| `json.schema_adherence` | Output conforming to a required JSON or policy shape. |
| `embeddings.text` | Text embedding generation. |
| `text.classification` | Classification against a known taxonomy. |
| `text.language_detection` | Language identification. |

### Roles

| Role ID | Meaning |
|---|---|
| `general.chat` | General conversational assistant. |
| `coder.patch` | Code-editing and patch-production role. |
| `coder.review` | Review, critique, and structured policy-checking role. |
| `tool.agent` | Tool orchestration role. |
| `embedder` | Embedding-generation role. |
| `classifier` | Deterministic labeling role. |
| `language.detector` | Language-detection role. |

These are examples, not a frozen universal taxonomy.

---

## Appendix E — Source-grounding references

The design was checked against the following repository files at the commits named in the document header.

### Pi

- Package installation and mixed extension/skill resources:  
  `packages/coding-agent/docs/packages.md`
- Skill discovery, progressive disclosure, frontmatter, and commands:  
  `packages/coding-agent/docs/skills.md`
- Extension lifecycle, events, async factory behavior, and resource cleanup:  
  `packages/coding-agent/docs/extensions.md`
- Extension API, context, provider registration, and event types:  
  `packages/coding-agent/src/core/extensions/types.ts`
- Agent/provider wiring and payload/response hooks:  
  `packages/coding-agent/src/core/sdk.ts`
- Model inventory and credential resolution APIs:  
  `packages/coding-agent/src/core/model-registry.ts`
- Auth storage, resolution order, OAuth refresh, locking, and permissions:  
  `packages/coding-agent/src/core/auth-storage.ts`
- Session IDs and read-only session manager API:  
  `packages/coding-agent/src/core/session-manager.ts`
- OpenAI request construction and payload-hook timing:  
  `packages/ai/src/providers/openai-completions.ts`
- Project trust and extension security:  
  `packages/coding-agent/docs/security.md`

### Role-Model

- Root runtime build and validation scripts:  
  `package.json`
- Official Unix and Windows installers:  
  `scripts/install.sh`, `scripts/install.ps1`
- Packaged runtime target list and SEA packaging:  
  `role-model-router/apps/runtime-host-bridge/src/package-sea.ts`
- Runtime CLI, arguments, browser behavior, listening receipt, and backend control surfaces:  
  `role-model-router/apps/runtime-host-bridge/src/cli.ts`
- Runtime HTTP control client paths and types:  
  `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- Provider/account setup payloads, native auth, key repair, model roles, and endpoint activation:  
  `role-model-router/apps/runtime-ui/app/routes/providers.tsx`
- Account credential/auth model and validation:  
  `role-model-router/packages/provider-account/src/index.ts`
- Atomic API-key repair and lifecycle persistence summary:  
  `.recursive/run/47-runtime-persistence-rehydration-lifecycle/03-implementation-summary.md`
- Unified runtime aliases, execution modes, providers, and process configuration:  
  `role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- Live alias/model inventory example:  
  `.recursive/run/50-openai-codex-subscription/evidence/logs/green/addendum-25-live-3462-alias-matrix.green.log`
- Core routing request shape:  
  `role-model-router/packages/core/src/types.ts`
- Runtime routing projection:  
  `role-model-router/packages/protocol-routing/src/index.ts`
- Adapter execution and provider ownership:  
  `role-model-router/packages/adapter-execution/src/index.ts`
- Downstream OpenAI ingress probes:  
  `role-model-router/scripts/probe-downstream-ingress.py`
- Current roles and tasks:  
  `docs/protocol/roles.md`, `docs/protocol/tasks.md`
- Repository license and additional-use grant:  
  `LICENSE`, `README.md`

Before implementation, both repositories must be re-audited at the exact development commits. Routing, control, synchronization, release, and lifecycle fixtures should be pinned in CI on both sides.
