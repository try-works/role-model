Run: `/.recursive/run/56-pi-role-model-gap-closure/`
Phase: `00 Requirements`
Status: `DRAFT`
LockedAt:
LockHash:
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/RECURSIVE.md`
- `/.codex/AGENTS.md`
- `/.agent/PLANS.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/.recursive/run/55-pi-role-model-package/00-requirements.md`
- `/.recursive/run/55-pi-role-model-package/01-as-is.md`
- `/.recursive/run/55-pi-role-model-package/02-to-be-plan.md`
- `/.recursive/run/55-pi-role-model-package/03-implementation-summary.md`
- `/.recursive/run/55-pi-role-model-package/04-test-summary.md`
- `/.recursive/run/55-pi-role-model-package/05-manual-qa.md`
- External audited proposal: `D:/DEV/role-model-proposals/14-pi-role-model-package-proposal-audited.md`
- External gap-closure addendum: `D:/DEV/role-model-proposals/15-pi-role-model-package-gap-closure-addendum.md`
Outputs:
- `/.recursive/run/56-pi-role-model-gap-closure/00-requirements.md`
Scope note: This run closes the proposal-completeness gaps found after run `55-pi-role-model-package`. It must keep the package named `pi-role-model`, keep the runtime externally owned, and make the implementation verifiably match the audited proposal plus the gap-closure addendum.

## TODO

- [x] Re-read recursive-mode workflow and bridge docs
- [x] Re-read current state, decisions, and relevant runtime/provider capability memory
- [x] Re-read run 55 requirement and closeout artifacts
- [x] Re-read the audited proposal and gap-closure addendum
- [x] Convert the addendum into repo-owned requirement IDs
- [x] Make strict TDD mandatory for implementation
- [x] Make Phase 4 verify both the original proposal and the addendum
- [x] Make Phase 5 agent-operated Pi-driven QA mandatory on this local device
- [x] Require implementation iteration until Phase 5 reality matches the requirement or records a true Pi API limitation

## Source Requirement Inventory

| Source | Contribution to this run |
| --- | --- |
| `D:/DEV/role-model-proposals/15-pi-role-model-package-gap-closure-addendum.md` | authoritative gap list, TDD coverage, implementation plan, Phase 4 traceability, and Phase 5 Pi-driven QA checklist |
| `D:/DEV/role-model-proposals/14-pi-role-model-package-proposal-audited.md` | original package intent, safety boundaries, command surface, README/skill expectations, and full proposal scope to verify |
| run `55-pi-role-model-package` | current baseline implementation and evidence for the initial `pi-role-model` package |
| `/.recursive/STATE.md` | current main-branch truth after run 55 merge |
| `/.recursive/DECISIONS.md` | prior run history and known run 55 caveats |
| `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md` | durable truth for Role-Model downstream discovery, compact `/v1/models`, Pi renderer fields, and Pi command behavior |

## Problem Summary

Run 55 added the first repo-owned `pi-role-model` Pi package. A follow-up audit found that the baseline is useful but not yet proposal-complete. The remaining gaps are concentrated in runtime discovery completeness, fail-closed authentication, endpoint trust, model metadata fallback/degraded diagnostics, alias selection semantics, status/doctor richness, skill guidance, package metadata, and missing negative/fallback tests.

This run must close those gaps without changing the integration boundary. The package still connects Pi to an externally running Role-Model runtime; it must not start or manage the runtime, copy secrets, run hidden benchmarks, or reimplement Role-Model routing inside Pi.

The implementation must be reality-driven. Phase 5 must install the local package into the actual Pi executable on this device, configure it against a real local Role-Model runtime, run the command surface, send prompt traffic through Role-Model, and iterate on implementation defects until the required behavior passes or a true Pi API limitation is documented with evidence.

## Fixed Decisions

1. The package remains `packages/pi-role-model` with package name `pi-role-model`.
2. The Pi provider id remains `role-model`.
3. The Pi command remains one registered command named `role-model` with subcommands parsed from the argument string.
4. The Pi skill remains `skills/role-model/SKILL.md`.
5. The runtime remains externally installed and externally launched.
6. The package must not start, stop, install, update, or own the Role-Model runtime process.
7. The package must not call the Role-Model launcher path if that path opens a browser or manages process lifecycle.
8. The package must not read, print, copy, sync, or persist Pi provider secrets.
9. Placeholder bearer auth is allowed only when Role-Model discovery says auth is not required.
10. Required Role-Model auth must fail closed unless an explicit supported Pi package config path for a token is discovered and documented from actual Pi code.
11. Remote endpoints are blocked by default unless an explicit trusted `allowRemote`-style setting is supported and enabled.
12. If Pi exposes no API for active model selection from packages, `/role-model alias use` must clearly report that limitation and the run must record the code evidence.
13. Phase 3 must use strict TDD unless a specific non-code documentation-only slice is explicitly marked pragmatic in the Phase 3 artifact.
14. Phase 5 QA execution mode must be `agent-operated` and must drive Pi on this local device.
15. The `role-model` skill may point users and Pi agents to the Role-Model repository README for explicit instructions to install or launch the Role-Model router runtime when the user asks for that help. That guidance must be framed as user-directed external runtime setup, not as package setup side effects.

## Requirements

### `R1` Reconfirm actual Pi and Role-Model contracts before implementation

Description:
Phase 1 must establish the real current contracts before any production code changes.

Acceptance criteria:
- Phase 1 records the Pi APIs available for provider registration, active/default model selection, package config, command output, and model metadata
- Phase 1 records whether Pi packages can change the active model directly
- Phase 1 records the current Role-Model response shapes for `/healthz`, `/api/version`, `/api/role-model/downstream/openai`, and `/v1/models`
- Phase 1 records whether auth-required Role-Model discovery has a supported Pi token-source path
- Phase 1 includes a traceability table mapping every addendum gap to planned files and tests
- if a required API does not exist, Phase 1 records the limitation and the closest verifiable behavior required later in the run

### `R2` Implement complete runtime discovery diagnostics

Description:
The package must discover Role-Model with enough detail to support provider registration, status, doctor, and fallback diagnostics.

Acceptance criteria:
- normal discovery checks `/healthz`, `/api/version`, and `/api/role-model/downstream/openai`
- `/v1/models` is used as a compact fallback only when the rich downstream route is unavailable in an allowed way and exposes enough metadata for conservative provider registration
- discovery distinguishes success, unavailable runtime, timeout, malformed discovery, incompatible contract, blocked remote endpoint, required auth without token source, and fallback discovery
- incompatible discovery does not silently register a provider
- status and doctor can report the precise discovery state without reinterpreting raw exceptions ad hoc
- tests include normal discovery, timeout/unavailable discovery, malformed discovery, incompatible discovery, and fallback discovery

### `R3` Enforce endpoint trust and configuration rules

Description:
Endpoint configuration must be explicit, local-first, and safe by default.

Acceptance criteria:
- default endpoint remains `http://127.0.0.1:3456`
- supported Pi package config and documented environment override behavior are confirmed from actual Pi code before use
- non-localhost endpoints are rejected by default before provider registration
- remote endpoints are allowed only through an explicit trusted setting such as `allowRemote`
- blocked remote endpoints produce clear `/role-model status` and `/role-model doctor` output
- tests cover default endpoint normalization, explicit endpoint configuration, blocked remote endpoint, and trusted remote endpoint

### `R4` Fail closed for required runtime auth and protect secrets

Description:
The package must not create a working provider registration from an auth-required Role-Model runtime unless an explicit supported token source exists.

Acceptance criteria:
- placeholder bearer auth is accepted only when discovery says auth is not required
- discovery with `authentication.required === true` fails closed when no supported token source is configured
- if a supported token source exists, the implementation uses only that documented source and never reads Pi auth storage directly
- no command output, logs, package state, tests, or snapshots include raw credential values
- tests cover placeholder auth allowed, required auth blocked, required auth allowed only when supported explicit token source exists, and secret redaction/no-output invariants

### `R5` Map provider metadata conservatively and report degraded records

Description:
Role-Model model and alias records must be converted into Pi provider metadata without overclaiming capabilities.

Acceptance criteria:
- mapping uses `piMapping.contextWindow` and `piMapping.maxTokens` first
- mapping falls back to Role-Model safe limits when `piMapping` fields are absent
- mapping falls back to explicit conservative package constants only when both `piMapping` and safe limits are absent
- richer reasoning capability shapes are mapped when Role-Model exposes them
- incomplete or fallback-derived records are marked as degraded in package diagnostics without injecting unsupported fields into Pi's provider schema
- provider model records retain Pi-required renderer fields such as `input` and zeroed `cost`
- tests cover full metadata, safe-limit fallback, conservative fallback, degraded diagnostics, reasoning capability variants, image/text input mapping, and Pi renderer field preservation

### `R6` Make provider registration idempotent and state-aware

Description:
Setup, refresh, and extension load must not produce duplicate or stale provider state.

Acceptance criteria:
- extension load registers the provider when discovery succeeds and keeps `/role-model` commands available when discovery fails
- `/role-model setup` registers or updates the provider from current discovery
- `/role-model alias refresh` refreshes provider metadata without losing the selected alias unless the alias is no longer available
- registration reports provider state to status/doctor when Pi exposes enough state
- repeated setup and refresh calls are idempotent in tests

### `R7` Implement truthful active alias selection behavior

Description:
`/role-model alias use <alias>` must either select the alias as Pi's active Role-Model model or explicitly report why that is not possible.

Acceptance criteria:
- Phase 1 identifies the actual Pi active/default model API, if one exists
- when Pi supports active model selection from packages, `/role-model alias use <alias>` sets the active model to `role-model/<alias>` or the exact Pi-supported equivalent
- when Pi does not support active model selection from packages, the command persists the package selected alias only if useful and outputs an explicit limitation message
- unknown aliases fail with a clear error and do not change state
- selected alias state survives refresh when the alias remains available
- selected alias state is cleared or warned when the alias disappears
- tests cover supported active selection, unsupported active selection, unknown alias, persistence, refresh preservation, and disappeared alias behavior

### `R8` Expand command diagnostics to match the proposal

Description:
The command surface must provide actionable status, doctor, and alias diagnostics.

Acceptance criteria:
- `/role-model status` reports connection state, endpoint, runtime version, alias count, selected alias, provider registration state, auth/trust state, fallback state, and warnings
- `/role-model doctor` checks health, version compatibility, downstream discovery, fallback status, auth requirements, endpoint trust, provider registration, alias availability, degraded metadata, and active-model selection behavior
- `/role-model doctor` includes specific remediation text for each failing check
- `/role-model alias list` shows aliases with recommended, selected, readiness, and degraded indicators
- `/role-model alias recommended` reports whether the runtime recommendation is usable
- `/role-model ui` does not launch or manage the runtime; it may only report the configured/runtime URL unless a safe Pi UI-open API is confirmed and explicitly used
- tests cover healthy output and at least one failing/remediation case per diagnostic category

### `R9` Complete package docs, root README, skill guidance, and metadata

Description:
Docs and package metadata must match the final implementation, not the run 55 partial behavior.

Acceptance criteria:
- root `README.md` `Installation for Pi` section includes endpoint configuration, setup, status, doctor, UI, alias list/recommended/use/refresh, remote trust, auth failure behavior, and safety notes
- package README matches actual install/setup behavior and caveats
- `skills/role-model/SKILL.md` explains Role-Model concepts, package versus runtime responsibilities, aliases versus direct models, routing authority, setup, diagnostics, benchmarks, troubleshooting, and security boundaries
- the skill may link or refer to the Role-Model repo README for user-directed Role-Model router runtime installation and launch instructions
- the skill distinguishes between "install/start the external Role-Model runtime when the user asks" and "configure Pi to use an already-running runtime"
- the skill explicitly says Pi auth files must not be read, printed, copied, or synced by the package
- `package.json` includes proposed Pi package metadata, including `pi-package` keyword if supported by Pi conventions
- tests or static checks verify the README, skill, and manifest requirements

### `R10` Preserve hard safety boundaries

Description:
Gap closure must not widen the package into deferred or unsafe behavior.

Acceptance criteria:
- no managed runtime launcher/start/stop/install/update code is added
- no hidden model calls or benchmark commands are added
- no credential sync/import/export behavior is added
- no direct access to Pi auth storage is added
- no project-local config redirects global runtime, binary, or credential behavior
- tests or static checks verify forbidden strings/API use where practical
- Phase 4 explicitly audits the diff for these boundaries

### `R11` Use strict TDD for implementation

Description:
Production code changes must be test-driven.

Acceptance criteria:
- Phase 3 declares `TDD Mode: strict` for code slices
- every production code behavior in `R2` through `R10` has RED evidence before the implementation change that makes it pass
- GREEN evidence is captured after each meaningful slice
- refactors happen only after the relevant tests are green
- no production behavior is accepted only because it was manually tried in Phase 5
- Phase 4 verifies the RED/GREEN chain and fails if implementation lacks corresponding tests
- any non-code doc-only slice that cannot use strict TDD must be explicitly marked as a pragmatic exception with static verification evidence

### `R12` Verify proposal and addendum coverage in Phase 4

Description:
Phase 4 must prove the implementation closes the original proposal scope and this addendum's gaps.

Acceptance criteria:
- Phase 4 re-reads both `14-pi-role-model-package-proposal-audited.md` and `15-pi-role-model-package-gap-closure-addendum.md`
- Phase 4 creates or updates a traceability artifact mapping proposal sections, addendum gaps, requirement IDs, implementation files, tests, and Phase 5 checks
- build passes for `packages/pi-role-model`
- unit tests pass for `packages/pi-role-model`
- relevant root or workspace validation commands are run or explicitly scoped with rationale
- all addendum-required tests are present and meaningful
- every original proposal acceptance item is implemented, verified, or explicitly deferred by proposal scope with evidence
- Phase 4 audits that package docs and skill guidance match actual command behavior

### `R13` Drive local Pi in Phase 5 until implementation reality passes

Description:
Phase 5 must be agent-operated QA on this local device using the actual Pi executable and a real Role-Model runtime. It must not pass based only on unit tests or mocked package APIs.

Acceptance criteria:
- `05-manual-qa.md` declares `QA Execution Mode: agent-operated`
- Phase 5 starts or connects to an externally running Role-Model runtime without using package-managed runtime code
- Phase 5 records endpoint checks for `/healthz`, `/api/version`, `/api/role-model/downstream/openai`, and `/v1/models`
- Phase 5 installs the local `pi-role-model` package into Pi through Pi's real package installation flow
- Phase 5 verifies Pi can list the installed package
- Phase 5 verifies Pi can read and load the `role-model` skill
- Phase 5 verifies Pi can register the `role-model` provider from Role-Model discovery
- Phase 5 runs `/role-model setup`, `/role-model status`, `/role-model doctor`, `/role-model ui`, `/role-model alias list`, `/role-model alias recommended`, `/role-model alias use <alias>`, and `/role-model alias refresh`
- Phase 5 verifies Pi can list Role-Model provider models through Pi's normal model listing command
- Phase 5 sends a prompt through an explicit `role-model/<alias>` model and records the expected Role-Model downstream request receipt
- if active model selection is supported, Phase 5 sends a prompt using the selected alias without passing `--model`
- if active model selection is not supported, Phase 5 records the command output and code evidence proving the limitation is truthfully reported
- Phase 5 verifies a blocked remote endpoint fails clearly until trust is enabled
- Phase 5 verifies `authentication.required === true` fails closed unless an explicit supported token source is configured
- Phase 5 verifies command output and captured logs contain no raw credential values
- Phase 5 verifies uninstalling or disabling the package leaves Role-Model runtime files and credentials untouched, if Pi exposes a safe uninstall/disable flow
- Phase 5 records exact command transcripts, evidence paths, runtime request receipts, redacted endpoint snippets, and any Windows-specific Pi process/libuv behavior
- Phase 5 must iterate by returning to implementation and tests when real Pi behavior exposes a defect; it may pass only after all required checks pass or a true Pi API limitation is documented and accepted by the requirement

### `R14` Update state, decisions, and memory after successful QA

Description:
Late recursive phases must make the closed gap durable in the repo control plane and memory plane.

Acceptance criteria:
- Phase 6 updates `/.recursive/DECISIONS.md` with what changed, why, how it was verified, and any accepted Pi API limitations
- Phase 7 updates `/.recursive/STATE.md` to reflect the final `pi-role-model` package behavior
- Phase 8 reviews `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md` because the run touches `/packages/pi-role-model/**`
- Phase 8 captures run-local skill usage and promotes durable skill/workflow lessons only when they generalize beyond this run

## Phase-Specific Requirements

### Phase 0 Worktree

- Create an isolated worktree for run `56-pi-role-model-gap-closure`.
- Use `origin/main` at or after run 55 commit `7f9facb36d2f6d7b298de6298ec4a861a017288a` as the baseline.
- Record normalized diff basis in `00-worktree.md`.
- Confirm the worktree has the run 55 package baseline before implementation.
- Confirm baseline package tests/build status before changes.

### Phase 1 AS-IS

- Re-read this requirement, the original proposal, and the gap-closure addendum.
- Reconfirm Pi API reality from actual Pi source or installed Pi package code available on this device.
- Reconfirm Role-Model runtime endpoint contracts from current repo code and, where practical, live endpoint probes.
- Produce the required API/contract notes for `R1`.

### Phase 2 TO-BE Plan

- Produce an ExecPlan-grade implementation plan.
- Include a TDD matrix from each requirement to failing tests.
- Include a Phase 5 QA script/checklist that drives Pi on this local device.
- Include safety boundary checks and exact evidence paths.

### Phase 3 Implementation

- Use strict TDD for code changes.
- Capture RED and GREEN logs under the run evidence folder.
- Keep edits scoped to `packages/pi-role-model`, docs/README surfaces, and only any Role-Model/Pi compatibility surfaces proven necessary by Phase 1.
- Do not broaden into runtime management, credentials migration, benchmark execution, or Pi upstream changes unless Phase 1 proves a tiny compatibility shim is required and the plan explicitly scopes it.

### Phase 4 Test Summary

- Verify unit/build/static checks.
- Verify TDD compliance.
- Verify proposal and addendum traceability.
- Verify safety boundaries and docs/skill consistency.
- Do not advance to Phase 5 until all automated checks needed for this run are green or explicitly scoped with evidence.

### Phase 5 Manual QA

- Must be `QA Execution Mode: agent-operated`.
- Must use real Pi on this local device.
- Must use a real externally running Role-Model runtime.
- Must execute all `R13` checks.
- Must iterate on implementation defects discovered by Pi until the checks pass.
- Must not treat mocked APIs, package unit tests, or static inspection as substitutes for Pi-driven reality checks.

### Phases 6-8

- Update decisions, state, and memory only after Phase 5 passes.
- Keep late-phase receipts concise and evidence-grounded.

## Out Of Scope

- Publishing `pi-role-model` to npm.
- Creating a managed Role-Model runtime installer or launcher inside the Pi package.
- Starting, stopping, upgrading, or supervising Role-Model from Pi.
- Automatic runtime installation or launch as a side effect of `pi-role-model` package install, setup, discovery, status, doctor, alias selection, or provider registration.
- Copying credentials between Pi and Role-Model.
- Reading Pi auth files or raw auth storage.
- Running hidden model calls or automatic benchmarks as setup side effects.
- Reimplementing Role-Model routing in Pi.
- Changing Pi upstream behavior unless Phase 1 proves a narrow compatibility requirement and the user approves widening scope.

Allowed guidance:
- The `role-model` skill may refer to the Role-Model repository README for explicit, user-requested instructions to install or launch the external Role-Model router runtime.
- A Pi agent may help the user follow those external runtime instructions only when the user asks for runtime installation or launch help. That work remains outside the `pi-role-model` package lifecycle and must not be hidden inside package setup commands.

## Required Evidence

- Phase 1 contract notes for Pi APIs and Role-Model routes.
- RED/GREEN logs for every implementation slice.
- Package build and test logs.
- Static safety scan output for forbidden behavior.
- Proposal/addendum traceability artifact.
- Pi install/list/skill/setup/status/doctor/ui/alias/model-list/prompt transcripts.
- Role-Model health/version/discovery snippets with secrets redacted.
- Role-Model downstream request receipt for the Pi prompt smoke.
- Remote endpoint block/trust evidence.
- Required-auth fail-closed evidence.
- No-secret-output evidence.

## Coverage Gate

Coverage: PASS

This requirement covers every gap from `15-pi-role-model-package-gap-closure-addendum.md`: discovery (`R2`), config/trust (`R3`), auth (`R4`), provider mapping (`R5`), registration (`R6`), alias selection (`R7`), command diagnostics (`R8`), docs/skill/metadata (`R9`), safety (`R10`), TDD (`R11`), Phase 4 proposal/addendum verification (`R12`), local Pi-driven Phase 5 QA (`R13`), and late control-plane/memory updates (`R14`). It also preserves run 55's original proposal boundaries and requires any true Pi API limitation to be documented with evidence rather than hidden.

## Approval Gate

Approval: PASS

The requirement is ready to be used as the source artifact for the next recursive run. It has stable requirement IDs, explicit acceptance criteria, strict TDD obligations, local-device Pi QA obligations, proposal/addendum traceability, and safety boundaries.
