Run: `/.recursive/run/89-codex-role-model-package/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-08-04T11:49:08Z`
LockHash: `46620023d0f52aa8284af1d7ebd61d3627a5f2bafe7cf04a901aa2ab33dcf869`
Workflow version: `recursive-mode-audit-v2`
User approval: `2026-08-04` (authorized creating the run folder, writing requirements, locking Phase 0, and implementing the run)
Inputs:
- User request (2026-08-04): create recursive-mode run + comprehensive `00-requirements.md` for a Codex Desktop/CLI/IDE adapter package; run id **89** (private `role-model-internal` max run is 88; public max was 86); harden for specificity, verifiability, extensibility, consistency; **require strict TDD**; **require Phase 5 against a real role-model runtime and a real local Codex client** so Codex→role-model routing is proven and iterated until it works
- Plan: Codex role-model integration (DeepSeek-style custom provider + local Responses forwarder + Codex-owned compaction)
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/pi-role-model-package.md` (if present)
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md` (if present)
- `/.recursive/run/55-pi-role-model-package/00-requirements.md`
- `/.recursive/run/56-pi-role-model-gap-closure/00-requirements.md`
- `/.recursive/run/75-pi-role-model-cli-ux-and-model-id-hardening/00-requirements.md`
- `packages/pi-role-model/**` (behavioral parity source for discovery, intent, inspection, trust)
- `packages/opencode-role-model/**` (host-adapter sketch only; not behavioral authority)
- `apps/docs-site/content/docs/integrations/pi.mdx` (docs pattern)
- DeepSeek Codex integration docs; openai/codex provider + catalog + compact surfaces; FAS-45 ([Linear](https://linear.app/fasadfronts/issue/FAS-45/codex-compaction))
Outputs:
- `/.recursive/run/89-codex-role-model-package/00-requirements.md`
Scope note: Ship a DeepSeek-style Codex Desktop/CLI/IDE adapter package (`packages/codex-role-model`) that points Codex at a local role-model Responses forwarder, injects `role_model.intent` with Pi-parity classification behavior, and leaves compaction ownership with Codex. Implementation uses **strict TDD**. Phase 5 must prove **real Codex local client → adapter → real role-model runtime** routing and iterate until that path works. This document is the sole Phase 0 requirements authority for run 89 until locked.

## TODO

- [x] Ground the draft in recursive control-plane docs and prior Pi/OpenCode consumer runs
- [x] Confirm next shared run id against private repo max (`88` → next `89`)
- [x] Fast-forward public `dev` to `origin/dev` and run `recursive-init`
- [x] Define stable `R#` / `OOS#` with observable acceptance criteria
- [x] Capture fixed decisions and resolve plan ambiguities into explicit v1 choices
- [x] Expand requirements for specificity, verifiability, extensibility, and consistency
- [x] Require strict TDD (Iron Law) for package-owned implementation
- [x] Require Phase 5 real-runtime + real Codex local-client routing proof with iteration
- [x] User authorized creating the run folder and writing this requirements draft
- [x] User approved locking Phase 0 and implementing the run (`2026-08-04`)
- [x] Complete Coverage Gate checklist for lock
- [x] Complete Approval Gate checklist for lock
- [x] Lock Phase 0 requirements

Note: `00-worktree.md` isolation is a separate Phase 0 artifact and is completed next.

## Run Metadata

- Priority: `P1`
- Run type: `integration feature`
- Primary subsystems:
  - `packages/codex-role-model/**`
  - `apps/docs-site/content/docs/integrations/codex.mdx`
- Secondary subsystems:
  - `packages/pi-role-model/**` (reuse/adapt discovery, intent, taxonomy, inspection, model guidance)
  - `role-model-router/apps/runtime-host-bridge/**` (Responses + discovery + inspection contracts only; no compact ownership)
- Branch baseline: `origin/dev` (short-lived `recursive/89-codex-role-model-package` worktree from `dev`; PR back to `dev`)
- Package identity: `@try-works/codex-role-model` at `packages/codex-role-model`
- CLI binary name: `codex-role-model`
- Provider id: `role-model` (lowercase; custom Codex `model_providers` key)
- User-visible outcome:
  - After `codex-role-model setup` + `start` + Codex restart, a user can select a role-model alias in a **real local Codex client**, complete at least one live turn against a **real local role-model runtime** through the adapter, prove that role-model **routing actually ran** (request + router decision / `explain` evidence), iterate on any routing defects until that path works, and read truthful docs that Codex owns compaction for this provider.

## Relevant Prior Runs

| Run | Why it matters |
| --- | --- |
| `55-pi-role-model-package` | First consumer package: discovery, provider registration, status/doctor, skill, safety tests |
| `56-pi-role-model-gap-closure` | Gap closure / trust and discovery hardening patterns |
| `62-litellm-pi-craft-codex-execution-hardening` | Codex execution edges; do not revive LiteLLM as the Codex path |
| `68-codex-subscription-tool-call-parity` | Codex tool-call / Responses parity context |
| `75-pi-role-model-cli-ux-and-model-id-hardening` | Canonical model-id guidance, deterministic diagnostics, secret-safety |

## Source Requirement Inventory

| Source | Contribution |
| --- | --- |
| User + plan (2026-08-04) | Codex adapter package, DeepSeek-style config/catalog, local forwarder, Codex-owned compaction, run id 89, strict TDD, Phase 5 real runtime + real Codex routing proof with iteration |
| openai/codex audit | User-level-only provider keys; `wire_api = "responses"`; full `ModelsResponse` catalog; hooks cannot rewrite provider bodies; custom providers → local compaction |
| DeepSeek Codex cookbook | Surgical user `config.toml` setup, auth method fields, catalog shape, Desktop/CLI/IDE shared config UX |
| FAS-45 + Codex compact paths | Remote Compact v2/v1 vs local summarization; adapter must not implement encrypted capsules |
| `packages/pi-role-model` | Authoritative consumer behavior for discovery, trust, intent, alias ops, requests/explain, secret-safety |
| `packages/opencode-role-model` | Host-adapter sketch only; intent stub is **not** parity target |
| `apps/docs-site/.../pi.mdx` | Docs-site integration page pattern |

## Glossary

| Term | Meaning in this run |
| --- | --- |
| User Codex home | `$CODEX_HOME` if set, else `~/.codex` |
| User config | `$CODEX_HOME/config.toml` (user-level only) |
| Project config | `<repo>/.codex/config.toml` — **must not** receive provider keys from this package |
| Adapter | Loopback HTTP Responses forwarder owned by this package (default port 3460) |
| Upstream runtime | role-model runtime OpenAI/Responses surface (default `http://127.0.0.1:3456`) |
| Managed block | Marked region in user config owned by setup/uninstall |
| Catalog | `$CODEX_HOME/role-model/models.json` as Codex `ModelsResponse` |
| Supported ship path | Codex → adapter `:3460/v1` → runtime `:3456` with intent inject |
| Optional spike | Non-shipping Phase 1 experiment (e.g. temporary direct `:3456`) that must not remain as the documented or setup-written path |

## Problem Summary

Codex has no first-class role-model consumer package. Pi and OpenCode paths exist; Codex needs a DeepSeek-like custom provider + catalog + setup flow, plus a local Responses forwarder for `role_model.intent` because Codex hooks cannot rewrite provider HTTP bodies. Compaction for custom providers is Codex-local over ordinary `/v1/responses`; the adapter must not pretend to own OpenAI Remote Compact v2/v1.

## Fixed Decisions

1. Package lives in public `role-model` as `packages/codex-role-model` (`@try-works/codex-role-model`); not in `role-model-internal`.
2. Product naming is always lowercase **role-model** (provider id, docs, skill id).
3. Integration writes only user-level Codex config for `model`, `model_provider`, `model_providers`, `model_catalog_json`, `preferred_auth_method`, and `forced_login_method`. Setup **refuses** to write those keys into project `.codex/config.toml`.
4. v1 uses DeepSeek-style custom provider + catalog; **no** root `openai_base_url` hijack (also avoids Codex attempting Remote Compact v2 against a backend that cannot mint encrypted capsules).
5. Provider block requires `wire_api = "responses"` and `supports_websockets = false`. Never advertise chat-completions to Codex.
6. Adapter default listen address is `http://127.0.0.1:3460`. Port overrides via `ROLE_MODEL_CODEX_ADAPTER_PORT` (positive integer). Upstream via `ROLE_MODEL_ENDPOINT` (default `http://127.0.0.1:3456`).
7. Setup-written `base_url` is always the adapter URL with `/v1` suffix, e.g. `http://127.0.0.1:3460/v1` (never raw `:3456` on the supported ship path).
8. Intent injection happens only in the adapter on `POST /v1/responses` (including streaming). It applies to ordinary turns **and** Codex local-compaction summarization turns that use the same endpoint. Rules: inject when absent and model is a discovered role-model alias; preserve/idempotent when `role_model.intent` already present; never invent encrypted Compaction capsules.
9. Compaction is **Codex-managed**. For provider `role-model`, Codex uses **local** compaction (normal `/v1/responses` summarization). v1 must **not** implement OpenAI Remote Compact v2, Remote Compact v1, or a required `POST /v1/responses/compact` adapter endpoint.
10. Auth routing fields: `preferred_auth_method = "apikey"` and `forced_login_method = "api"`. Credential key is **`env_key = "ROLE_MODEL_CODEX_API_KEY"`** (not `experimental_bearer_token`). Default placeholder value for local unauthenticated runtimes is `role-model-local` (parity with pi discovery placeholder). If rich discovery reports `authentication.required === true` without a supported token source, fail closed.
11. Remote upstream endpoints fail closed unless `ROLE_MODEL_ALLOW_REMOTE` is truthy (`1`/`true`/`yes`), parity with pi-role-model. Optional future Codex-project-trust callback may tighten remote further; default CLI does not auto-trust remotes.
12. Setup must backup → validate TOML/JSON → surgical edit → preserve unrelated MCP/trust/settings; restore/uninstall from backup. Never quit/restart Codex from install scripts. Never print secrets.
13. Behavioral parity target for discovery/intent/inspection/model-id guidance is **`packages/pi-role-model`**. `opencode-role-model` is not the parity target. Extracting a shared consumer-core package is **optional follow-up** (`OOS10`); v1 may adapt/copy or workspace-import pi modules.
14. Phase 3 declares and obeys `TDD Mode: strict` for all package-owned production logic. **Iron Law:** no production code without a failing test first. Every code-bearing slice records distinct RED then GREEN evidence paths. `TDD Mode: pragmatic` is not allowed for this run unless an addendum records an explicit exception with compensating evidence (default: no exceptions).
15. Phase 5 declares `QA Execution Mode: hybrid` and **must** exercise: (a) a **real running role-model runtime** on a local channel (default proof target `http://127.0.0.1:3456` / channel appropriate to the worktree), and (b) a **real local Codex client** (Codex CLI required at minimum; Desktop and/or IDE additionally preferred when available). Mocked HTTP stubs alone are **insufficient** for Phase 5 ship. Routing must be observed end-to-end and iterated until it works (`R11`).
16. Package ships with `"private": true`. Flipping `private: false` / public npm publish is **out of scope** for this run (`OOS5`) until doctor-green criteria in Fixed Decision #17 are met in a later run.
17. **Doctor-green criteria** (definition only; publish remains OOS): `codex-role-model doctor` exits 0 with: upstream discovery success (or classified fail-closed remote), adapter listening when `start` is expected, non-empty catalog file present, managed config block present and parseable, and zero secret-material leaks in stdout/stderr samples under test.
18. Catalog authority for CI: a **repo-owned golden `ModelsResponse` fixture** under the package (cloned from a known-good Codex/DeepSeek-shaped template). Offline tests must not require a live `codex debug models` invocation. Dev may refresh the fixture from `codex debug models` when available; fixture commits are reviewed.
19. `model_catalog_json` is written as `~/.codex/role-model/models.json` when using default home; if `$CODEX_HOME` is set to a non-default path, setup writes an absolute path under that home. Setup must document which form was written.
20. Streaming: adapter is an SSE/body **passthrough** after request-side intent inject — forward status, content-type, and response body without rewriting compaction ciphertext or inventing compact endpoints.
21. MCP tools for status/doctor are **out of scope for v1** (`OOS11`). Skill + plugin manifest are in scope.
22. Optional Phase 1 spike of Codex → raw `:3456` (no intent) is allowed only as AS-IS/spike evidence and must not be left as setup default or docs “supported path.”
23. Run numbering for this public run is **89** so it does not collide with private runs `87` / `88`.
24. Provider id `role-model` must be verified in Phase 1 against Codex reserved provider ids; if reserved, Phase 1 records the collision and Phase 2 selects a non-colliding id via addendum before implementation proceeds.
25. Phase 5 is an **iterate-until-routing-works** gate: if the real Codex client cannot complete a routed role-model turn (config rejected, no models, adapter miss, missing intent, `no_eligible_target`, wrong alias, silent failure, etc.), the run must record the defect, return to package fixes under strict TDD, and re-run the live proof. Shipping without a successful live routing proof is forbidden.

## Resolved Ambiguities (plan → v1)

| ID | Ambiguity | Resolution |
| --- | --- | --- |
| A1 | Run id 87 vs 89 | **89-codex-role-model-package** |
| A2 | `/v1/responses/compact` required? | **Not required / not implemented in v1** |
| A3 | `env_key` vs `experimental_bearer_token` | **`env_key = "ROLE_MODEL_CODEX_API_KEY"`** |
| A4 | Direct `:3456` vs adapter `:3460` | Spike optional; **ship path = adapter** |
| A5 | Catalog template source | **Golden fixture in package**; optional live refresh |
| A6 | Adapter port fixed? | Default 3460; **`ROLE_MODEL_CODEX_ADAPTER_PORT`** override |
| A7 | Tilde vs absolute catalog path | Tilde for default home; absolute under custom `$CODEX_HOME` |
| A8 | Allow-remote env name | **`ROLE_MODEL_ALLOW_REMOTE`** (pi parity) |
| A9 | Intent on compaction turns | **Same inject rules as normal turns** |
| A10 | Doctor-green meaning | Fixed Decision #17; publish still OOS |
| A11 | MCP in v1? | **OOS11** — skill/plugin only |
| A12 | Provider id reserved? | Phase 1 verification + addendum if collision |
| A13 | Streaming contract | **Passthrough** after request inject |
| A14 | Manual proof without forwarder | Optional spike only; **R5 + R11 mandatory for ship** |
| A15 | Phase 5 mocks vs live stack | **Real runtime + real Codex local client required**; iterate until routing works |
| A16 | TDD mode | **`TDD Mode: strict` only** (Iron Law); pragmatic needs addendum |

## Requirements

### `R1` Package scaffold and workspace identity

Description:
Create `packages/codex-role-model` as a workspace package `@try-works/codex-role-model` with TypeScript build/test scripts, a `codex-role-model` bin entry, README, and `"private": true`.

Acceptance criteria:
- Package is wired into the monorepo workspace and `pnpm` filter build/test succeed for the package.
- `package.json` name is `@try-works/codex-role-model`; bin exposes `codex-role-model`.
- `"private": true` is set; no publish workflow is enabled by this run.
- README names the product **role-model**, documents env vars from Fixed Decisions, and points to docs-site page path.
- Root or package README includes an **Installation for Codex** section analogous to Pi’s install guidance pattern.

### `R2` Runtime discovery, trust, and auth fail-closed

Description:
Implement discovery against upstream runtime with pi-parity endpoint order and fail-closed remote/auth behavior.

Acceptance criteria:
- Discovery probes, in order: trust assessment → `GET /healthz` → `GET /api/version` (best-effort) → `GET /api/role-model/downstream/openai` → on **404 only**, `GET /v1/models` compact fallback.
- Non-loopback upstream hosts fail with a classified `blocked-remote` (or equivalent) unless `ROLE_MODEL_ALLOW_REMOTE` is truthy.
- Loopback hosts allowed: `localhost`, `127.0.0.1`, `::1`, `[::1]` (parity with pi).
- If rich discovery reports `authentication.required === true` without a supported local token source, discovery fails closed with an actionable `auth-required` diagnostic (no secret printing).
- Compact fallback marks models degraded and does not invent richer metadata than the fallback contract provides.
- Unit tests cover loopback allow, remote block, allow-remote override, auth-required fail-closed, rich success, and 404 fallback.

### `R3` Surgical user Codex config + backup/restore

Description:
`setup` / `uninstall` manage a marked block in **user-level** Codex config only, with backup/validate/preserve semantics.

Acceptance criteria:
- Writes only under user Codex home `config.toml`. Attempting to target project `.codex/config.toml` for provider keys is refused with a non-zero exit and actionable message.
- Managed region is delimited by `# BEGIN role-model-provider-managed` / `# END role-model-provider-managed` (exact markers).
- Setup writes (at minimum) these keys consistently with Fixed Decisions:
  - root: `model`, `model_provider = "role-model"`, `preferred_auth_method = "apikey"`, `forced_login_method = "api"`, `model_catalog_json`
  - `[model_providers.role-model]`: `name`, `base_url` (adapter `/v1`), `wire_api = "responses"`, `supports_websockets = false`, `env_key = "ROLE_MODEL_CODEX_API_KEY"`
- Does **not** write `openai_base_url` or WebSocket-enabling flags.
- Before write: validate resulting TOML parse; on validation failure, leave original config unchanged.
- Backup copies prior user config (and catalog if present) under `$CODEX_HOME/backup-role-model/<timestamp>/` (or equivalent documented path).
- `uninstall` / restore restores from the latest backup and removes the managed block without deleting unrelated MCP/trust/settings outside the managed region.
- Unit tests cover: marked-block roundtrip, project-config refuse, invalid-TOML abort, unrelated-key preservation, uninstall restore.

### `R4` Full `ModelsResponse` catalog generation

Description:
Generate `$CODEX_HOME/role-model/models.json` from discovered aliases using a golden `ModelsResponse` / `ModelInfo` template.

Acceptance criteria:
- Catalog is a non-empty Codex `ModelsResponse` JSON (not a bare alias string list).
- Each discovered alias becomes a `ModelInfo` with at least: `slug`, `display_name`, `shell_type`, `visibility`, `truncation_policy`, reasoning-level fields required by the golden fixture schema, `context_window`, `model_messages`, and `prefer_websockets: false` (or fixture-equivalent keys).
- `slug` values are role-model alias ids suitable for Codex `model` (provider-relative form such as `baseline.remote-only`, not foreign ids like `gpt-4o`).
- `refresh-catalog` regenerates the file from current discovery; setup also writes/updates it.
- Offline unit tests validate catalog JSON against the golden fixture schema without requiring a live Codex binary.
- Docs state that Codex may require process restart after catalog refresh.

### `R5` Local Responses forwarder with intent inject + streaming passthrough

Description:
`start` / `stop` manage a loopback HTTP adapter that proxies Responses traffic to the upstream runtime after injecting `role_model.intent`.

Acceptance criteria:
- Default listen: `127.0.0.1:3460` (or `ROLE_MODEL_CODEX_ADAPTER_PORT`); binds loopback only.
- Implements `POST /v1/responses` including streaming requests.
- Does **not** implement `POST /v1/responses/compact` in v1 (404 or explicit not-supported response is acceptable; must not claim remote compact support).
- On each eligible `/v1/responses` request (including Codex local-compaction summarization turns): classify/merge `role_model.intent` using **pi-parity** classifier behavior (not the opencode stub). Inject when absent for discovered aliases with usable user text; preserve when already present; skip cleanly when model is not a role-model alias.
- After inject, proxy to `{ROLE_MODEL_ENDPOINT}/v1/responses` with streaming passthrough (status, headers needed for SSE, body).
- `start` refuses to start if upstream trust/discovery would be fail-closed for the configured endpoint (or doctor surfaces that before start — Phase 2 picks one deterministic order and tests lock it).
- PID/lock file under a documented path under `$CODEX_HOME/role-model/` (or package state dir) so `stop` is idempotent.
- Unit tests prove: inject-when-absent, preserve-when-present, non-alias skip, streaming passthrough smoke, compact-endpoint not advertised/required.
- Setup-written `base_url` points at the adapter `/v1`, never raw upstream, on the supported path.

### `R6` Compaction policy documentation and non-implementation

Description:
Document FAS-45 / Codex compaction routing for custom providers and keep adapter/runtime free of remote-compact ownership in v1.

Acceptance criteria:
- Package README and docs-site page include a compaction section stating:
  - Compaction is **Codex-managed**, not role-model/router-managed.
  - For `role-model`, Codex uses **local** compaction via ordinary `/v1/responses` summarization.
  - Remote Compact v2 (`compaction_trigger` → encrypted `Compaction{encrypted_content}`) is OpenAI/Azure-only and **out of scope**.
  - Remote Compact v1 (`POST …/responses/compact`) is **not** required or implemented by this adapter in v1.
  - Adapter still applies intent-inject rules on local compaction summarization turns.
- No production code path invents router auto-compact policy or encrypted Compaction capsules.
- Phase 5 QA notes expected local-compaction behavior and explicitly checks that success does **not** depend on `/v1/responses/compact`.

### `R7` Ops CLI command matrix

Description:
Expose a standalone CLI with a command matrix that mirrors pi-role-model ops semantics without claiming Pi slash-command UX.

Acceptance criteria:
- Commands exist and are documented:
  - `help`
  - `setup`
  - `uninstall` (restore)
  - `status`
  - `doctor`
  - `start` / `stop`
  - `refresh-catalog`
  - `alias list` | `alias recommended` | `alias use <alias>` | `alias current`
  - `requests [limit]` (default 10)
  - `explain <request-id|latest>`
- `status` / `doctor` report, at minimum: upstream endpoint, trust/local-vs-remote, discovery state, version if available, alias counts, selected/recommended alias, adapter listen URL/port and up/down, catalog path and non-empty bit, managed-block present bit — without secrets.
- `alias use` persists selection under `$CODEX_HOME/role-model/state.json` (or documented equivalent) and updates user config `model` when safe.
- `requests` / `explain` use runtime inspection APIs: `GET /api/role-model/requests`, `GET /api/role-model/requests/{id}`, `GET /api/role-model/router/decisions/{id}` (pi-parity).
- Invalid alias / foreign model id errors use deterministic, actionable text (reuse/adapt pi `model-guidance` semantics).
- Failures return non-zero exit codes with remediation text; never print bearer tokens, env secret values, or credential file contents.
- Automated tests cover command routing and key failure classifications offline.

### `R8` Skill and Codex plugin packaging

Description:
Ship onboarding skill + plugin manifest for Codex skill/plugin install paths (not a second config authority).

Acceptance criteria:
- `skills/role-model/SKILL.md` and `agents/openai.yaml` exist and instruct setup/doctor/start/refresh without asking users to paste secrets in chat.
- `.codex-plugin/plugin.json` exists and validates against Codex plugin conventions used by this repo’s researched loader defaults (`skills/`, optional hooks unused for intent).
- Skill states that provider config lives in **user-level** Codex config and that hooks do **not** inject `role_model.intent`.
- Skill states compaction ownership per `R6`.
- No skill text claims project `.codex/config.toml` can set `model_providers`.

### `R9` Docs-site Codex integration page

Description:
Add `apps/docs-site/content/docs/integrations/codex.mdx` following the Pi integration docs pattern.

Acceptance criteria:
- Page covers: install, env vars, setup/start/doctor, Desktop/CLI/IDE **shared** user config, Custom picker UX expectation, ChatGPT-vs-API session-group split, restart-after-catalog-refresh guidance, compaction ownership (`R6`), no project-config provider writes, secret-safety.
- Branding is lowercase **role-model** throughout.
- Linked/discoverable from the docs integrations index if one exists for Pi.
- Does not document LiteLLM, `openai_base_url` hijack, or `/v1/responses/compact` as required.

### `R10` Strict TDD and secret-safety contract

Description:
All package-owned production behavior is implemented under recursive-mode strict TDD. Offline automated tests remain the default CI gate; secret-safety is mandatory.

Acceptance criteria:
- Phase 3 artifact declares `TDD Mode: strict`.
- Iron Law holds: for each code-bearing slice, a failing test is written and observed RED before production code that makes it GREEN; both evidence paths are cited in `03-implementation-summary.md`.
- No “tests after the fact” for package-owned logic unless an approved addendum explicitly grants a pragmatic exception with compensating evidence (default: none).
- Automated safety tests fail if doctor/status/explain helpers would print raw token values, `ROLE_MODEL_CODEX_API_KEY` values, or credential file contents.
- Default unit/integration tests are offline-safe (local fixtures/mocks); no mandatory network to public hosts.
- Docs and CLI help never instruct users to paste API keys into chat with the agent.
- TDD slices at minimum cover: discovery/trust, config marked-block manager, catalog generation, intent inject/idempotence, forwarder routing/passthrough, CLI command matrix, secret-safety.

### `R11` Phase 5 real-runtime + real Codex routing proof (iterate until green)

Description:
Prove that Codex actually routes through the adapter into a live role-model runtime, with hybrid QA and an explicit iteration loop for routing defects.

Acceptance criteria:
- `05-manual-qa.md` declares `QA Execution Mode: hybrid`.
- **Real runtime:** evidence uses a live local role-model process (not a mock server as the ship gate). Record channel/port, `/healthz` and discovery snippets (secrets redacted), and runtime request id(s).
- **Real Codex local client:** evidence uses an installed local Codex CLI at minimum (Desktop and/or IDE additionally when available). Record Codex version/build and that user-level config was the active surface.
- Supported path exercised: `setup` → `start` → Codex restart/reopen as needed → select role-model alias → at least one live prompt/turn → adapter receives `POST /v1/responses` → upstream runtime receives the proxied turn.
- **Routing proof (all required):**
  - Codex turn completes without falling back to a non-role-model provider for that turn.
  - Adapter logs or capture show the request hit `:3460` (or configured adapter port), not only raw `:3456`.
  - `codex-role-model explain <id|latest>` (and/or runtime request + router decision APIs) show role-model handled the request: model/alias, strategy/selection reasons as available, and injected `role_model.intent` when inject rules apply.
  - A deliberate second turn or alias case may be used to show routing is repeatable, not a one-off flake.
- **Iteration loop (required when first attempt fails):**
  - Record the failure mode (config, catalog, adapter, intent, runtime eligibility, client UX, etc.) under run evidence.
  - Fix under `TDD Mode: strict` (new/updated failing test → GREEN).
  - Re-run the live Codex + runtime proof.
  - Phase 5 does not PASS until at least one full successful live routing proof exists after the final fix iteration.
- Human sign-off confirms: alias selectable after restart; unrelated Codex settings preserved; routing proof matches agent evidence.
- Compaction check (when feasible on a long thread): local compaction succeeds without calling `/v1/responses/compact`; evidence notes path.
- Optional direct-`:3456` spike evidence, if taken, is labeled spike-only and cannot substitute for the adapter ship-path proof.
- Mock-only or curl-only demonstrations without a real Codex client **do not** satisfy this requirement.

## Failure Modes (required diagnostics)

| Mode | User-visible expectation |
| --- | --- |
| Remote upstream without allow-remote | Classified blocked-remote; remediation mentions `ROLE_MODEL_ALLOW_REMOTE` |
| Upstream down / timeout | Classified unavailable/timeout with endpoint (no secrets) |
| Auth required without token source | Classified auth-required; fail closed |
| Project config write attempted | Refused; tell user to use user-level config |
| Adapter port in use | `start` fails with port conflict remediation / override env |
| Catalog empty / missing | `doctor` fails; `refresh-catalog` / `setup` remediation |
| Managed block missing/corrupt | `doctor` fails; `setup` remediation |
| Foreign model id under role-model | Deterministic invalid-model guidance (pi-parity) |
| Compact endpoint requested | Not supported in v1; does not crash adapter; docs clarify Codex local path |

## Out of Scope

- `OOS1`: LiteLLM / multi-provider OAuth forwarders as the Codex integration path
- `OOS2`: Root `openai_base_url` hijack / native GPT catalog merge
- `OOS3`: Implementing OpenAI Remote Compact v2 ciphertext, Remote Compact v1, or a required `/v1/responses/compact` adapter endpoint
- `OOS4`: Package home in `role-model-internal`
- `OOS5`: Flipping `"private": false` / public npm marketplace publish (even after doctor-green definition is met)
- `OOS6`: Quitting/restarting Codex from install scripts
- `OOS7`: Changing runtime routing algorithms beyond consuming existing Responses + discovery + inspection APIs
- `OOS8`: Claiming Codex hooks can inject `role_model.intent`
- `OOS9`: WebSocket transport in the adapter (`supports_websockets` stays `false`)
- `OOS10`: Extracting a shared `packages/role-model-consumer-core` (optional follow-up; v1 may still reuse pi sources in-tree)
- `OOS11`: Shipping MCP tools for status/doctor/alias in v1
- `OOS12`: Patching upstream Codex/Desktop to add PreProviderRequest hooks
- `OOS13`: Making foreign ids such as `gpt-4o` valid canonical ids under provider `role-model`
- `OOS14`: Managed install/start of the role-model runtime itself (runtime remains external/already-running for Phase 5; the run still **requires** that a real runtime be available and used for proof)
- `OOS15`: Treating mocked HTTP stubs or curl-only adapter hits as a substitute for Phase 5 real Codex client proof
- `OOS16`: Declaring Phase 5 PASS without a successful live Codex→adapter→runtime routing proof after any needed iteration

## Constraints

- Start from `origin/dev`; PR targets `dev`; never push directly to `dev`/`stage`/`main`.
- Reuse/adapt pi-role-model discovery, intent, taxonomy, inspection, and model-guidance behavior; do not treat opencode stubs as parity.
- Never print bearer tokens, env secret values, or credential file contents in doctor/status/explain/logs.
- Keep automated unit/integration tests deterministic and offline-safe by default.
- Use **strict TDD** for all package-owned production code (Iron Law; Fixed Decision #14 / `R10`).
- Phase 5 must use a **real role-model runtime** and a **real local Codex client**; iterate until routing works (`R11` / Fixed Decision #25).
- Preserve fail-closed auth and blocked-remote trust boundaries from earlier consumer integration runs.
- Do not treat later control-plane or memory churn as retroactive invalidation of earlier locked phases once those exist.
- Adapter binds loopback only in v1.
- Docs, skill, CLI, and config markers must stay consistent with Fixed Decisions (single source of truth for ports, env names, and compaction ownership).

## Assumptions

- Codex continues to ignore project-local provider keys in favor of user-level config.
- Codex custom providers continue to use local compaction (not OpenAI remote Compact v2).
- A local HTTP Responses forwarder remains an acceptable integration seam.
- Desktop, CLI, and IDE share the same user Codex home for provider config.
- Upstream runtime continues to expose `/healthz`, `/api/version`, `/api/role-model/downstream/openai` (or `/v1/models` fallback), `/v1/responses`, and inspection routes used by pi.
- Placeholder local auth (`role-model-local`) remains acceptable when discovery says auth is not required.

## Extensibility and Future-Proofing

Post-v1 changes must land via addenda or a new run without silently contradicting Fixed Decisions:

| Extension | Rule |
| --- | --- |
| New CLI subcommand | Add to `R7` matrix via addendum; keep help/docs/skill in sync |
| Shared consumer-core extraction | New run; must preserve discovery/intent/trust contracts tested here |
| `openai_base_url` / native picker merge | Explicit new run; must re-evaluate Remote Compact v2 risk |
| Remote Compact support | Only if Codex + runtime gain a real encrypted/local-compatible contract; never fake capsules |
| MCP tools | New run promoting `OOS11`; skill remains non-authoritative for secrets |
| Adapter non-loopback bind | Forbidden unless trust model redesigned |
| Additional wire protocols | Must not reintroduce `wire_api = "chat"` for Codex |
| Catalog schema drift | Update golden fixture + contract tests in the same change set |
| Live routing defect found in Phase 5 | Record evidence → strict-TDD fix → re-run real Codex + runtime proof; do not waive `R11` |
| Phase 5 proof harness additions | May add scripts under package/tests or run evidence/, but must still drive real Codex + real runtime |

## Verification Floor

Phase 2 records exact commands; Phase 4 executes automated package verification; Phase 5 hybrid QA depends on **real runtime + real Codex** evidence and may loop back into Phase 3 fixes under strict TDD.

Minimum expected verification:

- Package unit tests written test-first (discovery, config manager, catalog schema, intent inject, forwarder, CLI routing, secret-safety)
- Package build (`tsc` / package build script)
- Offline doctor/status fixtures for success and each major failure mode in the Failure Modes table
- Evidence that setup does not write project config provider keys
- Evidence that managed-block backup/restore preserves unrelated settings
- RED/GREEN logs for each code-bearing implementation slice (`TDD Mode: strict`)
- Phase 5 live stack:
  - real role-model runtime health/discovery (redacted)
  - real Codex CLI (and Desktop/IDE if available) turn through adapter
  - routing proof via adapter hit + `explain` / request + router decision
  - iteration log if first attempts failed
  - human sign-off
- Phase 5 compaction note for local path (no compact endpoint dependency) when feasible

## Phase Receipt Expectations

- `00-worktree.md` — isolated worktree from `origin/dev`, executable diff basis, clean baseline notes
- `01-as-is.md` — current Codex config surfaces, absence of package, pi parity inventory, reserved-provider-id check
- `02-to-be-plan.md` — file-level plan mapping each `R#` to **failing tests first** + commands; records exact package test/build commands and Phase 5 live-stack procedure
- `03-implementation-summary.md` — strict TDD RED/GREEN per slice; Requirement Completion Status for every in-scope `R#`
- `03.5-code-review.md` — delegated or self-audit review against review bundle
- `04-test-summary.md` — automated evidence paths
- `05-manual-qa.md` — `QA Execution Mode: hybrid`; real runtime + real Codex routing proof; iteration log; human sign-off
- `06`–`08` — decisions/state/memory receipts pointing at control-plane finals

## Late-Phase Requirements

- Phase 6 updates `/.recursive/DECISIONS.md` with: package home, user-level-config-only rule, adapter port/env contract, intent-forwarder seam, Codex-owned compaction policy, auth `env_key` choice, doctor-green definition, strict-TDD + live Codex routing proof expectations.
- Phase 7 updates `/.recursive/STATE.md` to reflect the shipped Codex integration surface, supported setup/doctor/start path, and that live Codex→role-model routing was proven.
- Phase 8 reviews durable memory for consumer integrations and records Codex-specific skill/fit learnings under `/.recursive/memory/skills/` when warranted (including Phase 5 routing iteration lessons).

## Required Evidence

- Package build/test logs for `packages/codex-role-model`
- RED and GREEN logs for each code-bearing implementation slice (strict TDD / Iron Law)
- Unit proof of intent inject/idempotence and streaming passthrough on `/v1/responses`
- Doctor/status output samples with secrets redacted
- Setup backup/restore proof that unrelated Codex settings survive
- Proof setup refuses project-config provider writes
- Docs/skill diffs for compaction ownership and no project-config provider writes
- Phase 5: real runtime identity (channel/port/health) + real Codex client version
- Phase 5: Codex → adapter → runtime turn evidence (adapter receive + runtime request id)
- Phase 5: routing proof via `explain` and/or request + router decision (intent + alias/strategy as available)
- Phase 5: iteration log if routing failed initially, including which TDD fixes landed before final green proof
- Phase 5: human sign-off
- Compaction local-path note (no `/v1/responses/compact` dependency) when feasible

## Coverage Gate

- [x] `R1` package scaffold, bin, private gate, Installation for Codex
- [x] `R2` discovery order, trust, auth fail-closed, tests
- [x] `R3` surgical user config, markers, backup/restore, project-config refuse
- [x] `R4` full ModelsResponse catalog + golden fixture + refresh
- [x] `R5` adapter forwarder, intent pi-parity, streaming passthrough, no compact endpoint
- [x] `R6` compaction ownership docs + non-implementation
- [x] `R7` full CLI matrix including uninstall/refresh/alias/requests/explain
- [x] `R8` skill + plugin packaging (no hook-intent claims)
- [x] `R9` docs-site `integrations/codex.mdx`
- [x] `R10` strict TDD Iron Law + secret-safety + offline contract
- [x] `R11` Phase 5 real runtime + real Codex local client routing proof with iterate-until-green
- [x] Failure Modes table covers blocked-remote, auth, project-config, port, catalog, foreign-id, compact
- [x] Extensibility section defines addendum/new-run rules including Phase 5 iteration
- [x] Resolved Ambiguities A1–A16 are explicit
- [x] Out of scope `OOS1`–`OOS16` bound LiteLLM, openai_base_url, remote compact, internal packaging, publish, Codex quit, routing algorithm changes, hook intent, WebSockets, shared-core extraction, MCP, upstream Codex patches, foreign ids, managed runtime ownership, mock-only Phase 5, shipping without live routing proof

Coverage: PASS

## Approval Gate

- [x] Scope is limited to a public Codex consumer adapter with Codex-owned compaction
- [x] Fixed decisions resolve researched Codex/DeepSeek/FAS-45 constraints without internal contradictions
- [x] Acceptance criteria are observable, testable, and suitable for later audited phases
- [x] Env names, ports, auth keys, and compaction ownership are consistent across R3/R5/R6/R7/R9
- [x] Strict TDD and Phase 5 real-runtime + real-Codex routing iteration are mandatory ship gates
- [x] User has explicitly approved locking this Phase 0 requirements artifact (`2026-08-04`: lock and implement)

Approval: PASS

## Audit

- Subagent Capability Probe: Task/explore subagents available in this harness; Phase 0 requirements authoring and consistency pass performed as controller self-audit after prior research subagent inventories.
- Delegation Decision Basis: self-audit — requirements draft already incorporated research inventories; locking is a gate completion step, not a fresh delegated review of product code.
- Audit Execution Mode: self-audit
- Requirement Completion Status: Phase 0 defines R1–R11 as in-scope; dispositions remain pending until later phases (requirements lock does not claim implemented/verified).

Audit: PASS
