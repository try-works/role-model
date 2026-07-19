Run: `/.recursive/run/56-pi-role-model-gap-closure/`
Phase: `01 AS-IS`
Status: `LOCKED`
LockedAt: `2026-06-22T13:34:18Z`
LockHash: `4575ec721835814b5ac70808a84b9110c6f2b94218582701e74b070b791bfe89`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/56-pi-role-model-gap-closure/00-requirements.md`
- `/.recursive/run/56-pi-role-model-gap-closure/00-worktree.md`
- External proposal: `D:/DEV/role-model-proposals/14-pi-role-model-package-proposal-audited.md`
- External addendum: `D:/DEV/role-model-proposals/15-pi-role-model-package-gap-closure-addendum.md`
- Pi source checkout: `C:/Users/erikb/AppData/Local/Temp/pi-official-audit`
- Current worktree package baseline: `packages/pi-role-model`
Outputs:
- `/.recursive/run/56-pi-role-model-gap-closure/01-as-is.md`
Audit Execution Mode: `self-audit`
Subagent Availability: `not used`
Subagent Capability Probe: `Phase 1 required local cross-repo source inventory and no delegated subagent was loaded in the active toolset; controller performed direct source verification.`
Audit Scope: `Pi extension/package APIs, Role-Model runtime contracts, run 55 package baseline, and addendum gap traceability.`
Audit Result: `PASS`

## TODO

- [x] Re-read the locked run 56 requirement and addendum
- [x] Reconfirm Pi provider registration API
- [x] Reconfirm Pi command and command-output API
- [x] Reconfirm Pi active/default model selection API
- [x] Reconfirm Pi package configuration surfaces
- [x] Reconfirm Role-Model `/healthz`, `/api/version`, `/api/role-model/downstream/openai`, and `/v1/models`
- [x] Audit current `packages/pi-role-model` baseline against the addendum gaps
- [x] Map every addendum gap to planned implementation files and tests

## Pi API Findings

| Need | Actual Pi source evidence | Phase 3 implication |
| --- | --- | --- |
| Package distribution | Pi packages use `package.json` `pi` manifests, conventional `extensions/` and `skills/`, local path installs, `pi list`, and the `pi-package` keyword. Evidence: `packages/coding-agent/docs/packages.md:5`, `:23-32`, `:113`, `:126-138`. | Keep the package manifest and add the missing `pi-package` keyword/static checks. |
| Provider registration | `ExtensionAPI.registerProvider(name, config)` exists and accepts `ProviderConfig`; model configs include id/name/input/cost/contextWindow/maxTokens. Evidence: `packages/coding-agent/src/core/extensions/types.ts:1285-1337`, `:1362-1379`; `packages/coding-agent/docs/custom-provider.md:627-704`. | Register/update provider id `role-model` directly from discovery. |
| Command registration | `ExtensionAPI.registerCommand(name, options)` exists as a single slash-command registration. Evidence: `packages/coding-agent/src/core/extensions/types.ts:1186-1187`; docs `packages/coding-agent/docs/extensions.md:1443-1478`. | Keep one `role-model` command and parse subcommands in package code. |
| Command output | Command handlers receive `ctx.ui.notify`; `notify` supports info/warning/error. Evidence: `packages/coding-agent/src/core/extensions/types.ts:135`, `:519`; docs `packages/coding-agent/docs/extensions.md:900`, `:2202`. | Commands should return machine-verifiable text for tests and notify that text in Pi. |
| Active/default model selection | `ExtensionAPI.setModel(model: Model<any>): Promise<boolean>` exists. It returns false when auth is not configured, and `AgentSession.setModel` persists default provider/model through `settingsManager.setDefaultModelAndProvider(model.provider, model.id)`. Evidence: `packages/coding-agent/src/core/extensions/types.ts:1272-1273`; `packages/coding-agent/src/core/agent-session.ts:1453-1468`, `:2255-2259`. | Use `pi.setModel` when the extension can construct a Pi-compatible model object for the selected Role-Model alias; tests must cover success and failure. |
| Current model lookup | `ctx.getModel()` exists on command/event context actions, not top-level `pi`. Evidence: `packages/coding-agent/src/core/extensions/types.ts:1538-1541`; `packages/coding-agent/src/core/agent-session.ts:2264-2266`. | Commands can report active model only if the command context exposes it through our local type. |
| Project trust | `ctx.isProjectTrusted()` exists and Pi ignores project resources until trusted. Evidence: `packages/coding-agent/docs/extensions.md:920-924`; `packages/coding-agent/src/core/settings-manager.ts:440-445`; `packages/coding-agent/src/modes/interactive/interactive-mode.ts:3281-3292`. | Remote endpoints require explicit `allowRemote` plus trusted command context when available. |
| Package configuration | Pi settings expose `packages?: PackageSource[]` with source/resource filters, not arbitrary per-package config. Evidence: `packages/coding-agent/src/core/settings-manager.ts:70-78`, `:80-115`; docs `packages/coding-agent/docs/packages.md:191-217`. `registerFlag/getFlag` is CLI flag support, not persistent package config. | Implement endpoint/trust config through extension options for tests and documented environment variables. Do not claim Pi-native package config exists. |
| Token source | No Pi extension API exposes direct provider credential lookup or auth storage. Provider `apiKey` can be literal/env/command string. Evidence: `packages/coding-agent/src/core/extensions/types.ts:1368-1377`; docs `packages/coding-agent/docs/extensions.md:1673`. | Required runtime auth must fail closed by default. Do not read Pi auth files. |

## Role-Model Runtime Contract Findings

| Endpoint | Actual Role-Model source evidence | Package usage |
| --- | --- | --- |
| `/healthz` | Runtime host bridge returns JSON health status, defaulting to `status: "healthy"`, `executionMode: "decision_only"`, `vendors`, and `inactiveVendors`. Evidence: `role-model-router/apps/runtime-host-bridge/src/index.ts:9407-9419`. | Fetch health and preserve status for `status`/`doctor`. |
| `/api/version` | Runtime host bridge handles `GET /api/version` when `readVersionInfo` is configured, otherwise 404. Evidence: `role-model-router/apps/runtime-host-bridge/src/index.ts:9748-9754`. | Fetch version opportunistically and report missing as diagnostic. |
| `/api/role-model/downstream/openai` | Route returns `createDownstreamOpenAIDiscovery(...)` with catalog data or a bridge-compatible fallback. Evidence: `role-model-router/apps/runtime-host-bridge/src/index.ts:9810-9825`, `:5460-5505`; implementation `role-model-router/apps/runtime-host-bridge/src/downstream-openai-discovery.ts:462-490`. | Primary source for provider registration and alias metadata. |
| `/v1/models` | Runtime host bridge handles compact model listing. With catalog data it includes compact role-model metadata; without catalog it may return only id/object/owned_by/endpoint_ids. Evidence: `role-model-router/apps/runtime-host-bridge/src/index.ts:9440-9455`, `:4792-4852`, `:4855-4883`. | Use as fallback only; mark minimal records degraded. |
| Rich auth contract | Current schema has `authentication.required` as boolean `const: false`; implementation returns placeholder token with `required: false`. Evidence: `protocol/schemas/downstream-openai-discovery.schema.json:39-49`; `role-model-router/apps/runtime-host-bridge/src/downstream-openai-discovery.ts:474-480`. | Current runtime is no-auth-required. Package must still fail closed if a future/invalid payload reports `required: true`. |
| Rich model metadata | Rich records require `limits`, `modalities`, `capabilities`, `declared`, `routable`, `piMapping`, and `sources`; implementation sets `piMapping` from safe limits. Evidence: `protocol/schemas/downstream-openai-discovery.schema.json:116-240`; `role-model-router/apps/runtime-host-bridge/src/downstream-openai-discovery.ts:292-295`. | Prefer `piMapping`, then safe limits, then explicit conservative constants, and report degraded records. |

## Current Package Baseline

- Manifest has name `pi-role-model`, `pi.extensions`, and `pi.skills`, but no `keywords` yet. Evidence: `packages/pi-role-model/package.json`.
- Extension loads discovery at startup, registers provider on success, and always registers `/role-model`. Evidence: `packages/pi-role-model/src/extension.ts`.
- Runtime discovery fetches `/api/version` and `/api/role-model/downstream/openai`, but not `/healthz` or `/v1/models`. Evidence: `packages/pi-role-model/src/runtime-discovery.ts`.
- Discovery validation requires the rich downstream contract and a placeholder token, but does not fail closed on `authentication.required === true` and does not preserve typed diagnostic states. Evidence: `packages/pi-role-model/src/downstream-openai.ts`.
- Provider mapping uses `piMapping` only and emits `undefined` when limits are missing, without fallback/degraded diagnostics. Evidence: `packages/pi-role-model/src/downstream-openai.ts`.
- Commands cover setup/status/doctor/ui/alias list/recommended/use/choose/refresh/current, but outputs are shallow. Alias selection persists only package-local state; it does not call Pi `setModel`. Evidence: `packages/pi-role-model/src/commands.ts`.
- Docs include an `Installation for Pi` root README section and safety note, but the skill does not point to the Role-Model README for user-directed external runtime install help. Evidence: `README.md:120-147`, `packages/pi-role-model/skills/role-model/SKILL.md`.
- Static safety tests already forbid launcher/process/auth-storage coupling. Evidence: `packages/pi-role-model/test/docs-and-safety.test.ts`.

## Confirmed Gaps

1. Discovery lacks `/healthz`, `/v1/models` fallback, and typed unavailable/timeout/incompatible/blocked/auth states.
2. Endpoint configuration lacks env override, remote allowlist, and trust diagnostics.
3. Auth-required runtime payloads are not blocked explicitly.
4. Provider mapping lacks safe-limit fallback, conservative fallback, degraded diagnostics, and rich reasoning mapping.
5. Alias selection does not set Pi active/default model through confirmed `pi.setModel`.
6. Status/doctor/alias diagnostics do not report provider state, trust/auth/fallback/degraded states, selected alias readiness, or active-model outcome.
7. Skill and README need final behavior, security, endpoint configuration, remote trust, and user-directed runtime install guidance.
8. Package metadata lacks the proposed `pi-package` keyword.
9. Negative/fallback tests from the addendum are missing.

## Traceability Plan

| Addendum gap | Requirement IDs | Planned files | Planned tests |
| --- | --- | --- | --- |
| Runtime discovery completeness | `R2`, `R8` | `src/runtime-discovery.ts`, `src/types.ts`, maybe `src/status.ts` | `test/runtime-discovery.test.ts`, `test/commands.test.ts` |
| Required-auth fail closed | `R4`, `R10` | `src/downstream-openai.ts`, `src/runtime-discovery.ts`, `src/types.ts` | `test/downstream-openai.test.ts`, `test/runtime-discovery.test.ts`, `test/docs-and-safety.test.ts` |
| Remote runtime/trust guard | `R3`, `R8`, `R10` | `src/config.ts`, `src/runtime-discovery.ts`, `src/commands.ts`, `src/extension.ts` | `test/config.test.ts`, `test/runtime-discovery.test.ts`, `test/commands.test.ts` |
| Provider fallback/degraded metadata | `R5`, `R8` | `src/downstream-openai.ts`, `src/types.ts`, command diagnostics | `test/downstream-openai.test.ts`, `test/commands.test.ts` |
| Idempotent provider state | `R6` | `src/provider-registration.ts`, `src/extension.ts`, `src/commands.ts` | `test/extension.test.ts`, `test/commands.test.ts` |
| Active alias semantics | `R7`, `R8` | `src/types.ts`, `src/commands.ts`, `src/extension.ts` | `test/commands.test.ts`, `test/extension.test.ts` |
| Rich status/doctor/alias diagnostics | `R8` | `src/commands.ts`, maybe `src/status.ts` | `test/commands.test.ts`, `test/runtime-discovery.test.ts` |
| Skill, README, package metadata | `R9` | `README.md`, package README, skill, package manifest | `test/docs-and-safety.test.ts`, `test/package-manifest.test.ts` |
| Hard safety boundaries | `R10` | all package source/docs | `test/docs-and-safety.test.ts`, Phase 4 diff audit |
| TDD and Pi-driven reality | `R11`, `R12`, `R13`, `R14` | recursive artifacts and QA receipts | Phase 3 RED/GREEN logs, Phase 4 traceability, Phase 5 transcripts |

## Phase 2 Planning Constraints

- Code implementation must start with failing tests. Production files remain untouched after this phase.
- Do not add a Role-Model launcher/process manager or runtime installer to the package.
- Do not read Pi credential storage. If auth-required discovery is encountered, fail closed unless an explicit documented token source is implemented from actual Pi-supported surfaces.
- Do not claim Pi supports arbitrary package-local settings. Use explicit extension options for tests and documented environment variables for operator overrides.
- When using `pi.setModel`, model construction must match Pi's `Model` shape closely enough to pass actual Pi Phase 5 checks; tests should cover successful and failed `setModel` returns.

## Self-Audit

Coverage:
- `R1` Pi APIs: covered provider registration, command registration/output, active model selection, package config, project trust, and auth token source.
- `R1` Role-Model APIs: covered `/healthz`, `/api/version`, `/api/role-model/downstream/openai`, `/v1/models`, rich schema, compact fallback, and auth shape.
- Addendum traceability: every listed addendum gap maps to planned files and tests.

Risks carried into Phase 2:
- Pi `setModel` accepts a full `Model<any>` object. The extension API does not expose a top-level model registry lookup, so implementation may need to construct the model object from provider config. Phase 5 must validate this against real Pi.
- No first-class package config API was found; env/options based configuration must be documented honestly and tested as package behavior, not as a Pi-native settings feature.

Approval: `PASS`
