Run: `/.recursive/run/55-pi-role-model-package/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-06-22T11:14:37Z`
LockHash: `d051c79eb72058c7c0513e5ac7420f2a43b03171cebc1048889d2d4fcfeb7e8d`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/RECURSIVE.md`
- `/.codex/AGENTS.md`
- `/.agent/PLANS.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/00-requirements.md`
- `/.recursive/run/54-alias-capability-discovery-contract/00-requirements.md`
- `/docs/architecture/12-downstream-alias-capability-discovery.md`
- `/packages/protocol-types/src/generated.ts`
- `/role-model-router/apps/runtime-host-bridge/src/downstream-openai-discovery.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/launcher/main.go`
- External audited proposal: `D:/DEV/role-model-proposals/14-pi-role-model-package-proposal-audited.md`
- Audited Pi source checkout: `C:/Users/erikb/AppData/Local/Temp/pi-official-audit`
- User guidance in chat on 2026-06-22:
  - create a Pi package named `pi-role-model`
  - package should live at `packages/pi-role-model`
  - the package should use `/role-model ...` command family and `role-model` provider/skill identity
  - proposal must be corrected against actual Role-Model and Pi repos
  - first implementation should use existing Role-Model downstream discovery and avoid future-only managed runtime/sync contracts
  - this requirements artifact must cover all recursive phases and keep the audited proposal as a verification input
  - Phase 4 and Phase 5 must use the proposal to prove the full in-scope package scope was implemented or explicitly deferred
  - implementation must use TDD, have verifiable implementation evidence, include tests, and Phase 5 must drive Pi to install and set up the package
  - the proposal and implementation requirements must include a root `README.md` section titled `Installation for Pi`
Outputs:
- `/.recursive/run/55-pi-role-model-package/00-requirements.md`
Scope note: This run implements the first production-ready `pi-role-model` Pi package slice: package scaffold, role-model skill, `/role-model` command dispatcher, external runtime discovery, Role-Model downstream OpenAI discovery parsing, provider alias registration, status/doctor diagnostics, and safety tests. Managed runtime install/start, credential sync, provider import, and paid benchmark operations remain out of scope.

## TODO

- [x] Re-read recursive-mode control-plane inputs for a new run
- [x] Read relevant runtime routing/provider capability memory
- [x] Read the audited `pi-role-model` proposal
- [x] Identify relevant prior recursive runs and current Role-Model runtime contracts
- [x] Convert the audited proposal into repo-owned requirement IDs
- [x] Scope the run to the first implementable external-runtime package slice
- [x] Record out-of-scope boundaries, constraints, assumptions, and verification expectations
- [x] Add proposal traceability and phase-specific verification obligations
- [x] Make real Pi install/setup verification mandatory in Phase 5
- [x] Add root README `Installation for Pi` documentation requirement
- [x] Obtain user approval before locking Phase 00

## Source Requirement Inventory

| Source | Contribution to this run |
| --- | --- |
| `/.recursive/STATE.md` | current truth for Role-Model runtime routes, downstream OpenAI discovery, Pi-compatible compact model metadata, and validation surfaces |
| `/.recursive/DECISIONS.md` | prior run history for downstream alias discovery, Pi discovery verification, runtime testing, and provider-capability boundaries |
| `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md` | durable truth for `/api/role-model/downstream/openai`, `/v1/models`, alias discovery semantics, Pi-compatible metadata, and verification expectations |
| run `51-runtime-testing-architecture-and-regression-matrix` | current validation taxonomy, root command expectations, and runtime verification discipline |
| run `54-alias-capability-discovery-contract` | rich downstream OpenAI discovery contract, Pi mapping fields, placeholder auth, and all-alias discovery proof |
| audited proposal `D:/DEV/role-model-proposals/14-pi-role-model-package-proposal-audited.md` | product/package scope, command shape, phase breakdown, package layout, and security rules |
| Pi source audit | confirmed Pi package manifests, extension factories, command parsing, `pi.registerProvider`, `streamSimple`, and provider auth storage surfaces |
| Role-Model source audit | confirmed existing `/healthz`, `/api/version`, `/v1/models`, `/api/role-model/downstream/openai`, router decision routes, benchmark routes, placeholder auth, and current launcher browser-opening behavior |

## Problem Summary

Role-Model already exposes a downstream OpenAI-compatible discovery contract that Pi can use to configure model aliases without hard-coded limits. Pi also supports packages that bundle extensions and skills. The missing piece is a repo-owned Pi integration package that turns those two facts into a usable installable surface.

The package should be named `pi-role-model` and live under `packages/pi-role-model`. It should not be a Role-Model runtime binary, a router reimplementation, or a credential migrator. Its first release should connect Pi to an already-running Role-Model runtime, register Role-Model aliases under a Pi provider named `role-model`, expose useful `/role-model ...` commands, and ship a `role-model` skill that explains safe usage.

The audited proposal identified several hard corrections that this run must preserve:

- Phase 1 must not require `ROLE_MODEL_DATA_TOKEN` while Role-Model discovery says bearer auth is not enforced and provides `placeholderToken: "role-model-local"`.
- Phase 1 should use `/api/role-model/downstream/openai` as the primary metadata source instead of waiting for a future Pi-specific manifest.
- The current launcher opens a browser and must not be used for managed runtime mode.
- Pi commands must be registered as one `role-model` command with subcommands parsed from the argument string.
- A plain OpenAI-compatible provider is enough for v1 routing; custom `streamSimple` belongs behind a richer metadata-correlation need.

The audited proposal remains an authoritative scope and verification input for the whole recursive run. Phase 2 must convert the proposal into an implementation traceability matrix. Phase 4 must verify tests and changed files against that matrix. Phase 5 must verify the user-facing outcome by driving Pi itself: install the local package, run setup, confirm aliases/models are visible in Pi, and confirm Role-Model is usable from Pi without manual model-file edits.

## Fixed Decisions

1. The package name is `pi-role-model`.
2. The package directory is `packages/pi-role-model`.
3. The Pi command family is `/role-model ...`, implemented as one registered command named `role-model`.
4. The Pi provider id is `role-model`.
5. The Pi skill id/path is `role-model`.
6. The first release targets external runtime mode only.
7. The first release must use Role-Model's existing downstream OpenAI discovery contract as the primary source of alias metadata.
8. The first release must not start, stop, install, update, or own the Role-Model runtime process.
9. The first release must not call the current `role-model-router/apps/launcher/main.go` launcher path because that path opens a browser.
10. The first release must not read or transfer Pi provider secrets.
11. The package may inspect non-secret Pi model/provider metadata, but raw `ctx.modelRegistry.authStorage` access is forbidden in implementation code.
12. The package must use `authentication.placeholderToken` when Role-Model discovery says auth is not required and Pi needs an API key value for provider registration.
13. The package must register Role-Model aliases as Pi models from Role-Model metadata, using `piMapping.contextWindow` and `piMapping.maxTokens` when present.
14. Managed runtime, provider/credential sync, sync plan/apply/status, and benchmark command operations are later runs.
15. The audited proposal is the source of truth for proposal-phase coverage. This run must either implement, verify, or explicitly defer every proposal item with evidence.
16. Phase 5 real-Pi verification is mandatory. If Pi cannot be driven in the environment, Phase 5 must be marked blocked rather than passed with substitute evidence.

## Requirements

### `R1` Create a valid `pi-role-model` Pi package scaffold

Description:
The repository must gain a package under `packages/pi-role-model` that Pi can install locally and that follows the audited package naming, manifest, and workspace conventions.

Acceptance criteria:
- `packages/pi-role-model/package.json` exists with `name: "pi-role-model"`, `type: "module"`, `keywords` including `pi-package`, and a `pi` manifest that loads the extension and skill
- the package contains `extensions/role-model.ts`
- the package contains `skills/role-model/SKILL.md`
- the package contains implementation modules under `src/` for command parsing, config, runtime discovery, downstream discovery parsing, provider registration, status/doctor output, and safety helpers
- the package contains package-local tests under `test/`
- package-local README or docs explain local development install with `pi install ./packages/pi-role-model`
- the package uses peer dependencies for Pi core packages only when they are imported
- `"private": true` is acceptable for this local/internal first slice, but README or package notes must state that it must be removed before npm publication
- the package can be added to the existing pnpm workspace without changing unrelated package boundaries

### `R2` Implement one `/role-model` command dispatcher with safe first-release subcommands

Description:
The extension must register exactly one Pi command named `role-model` and parse subcommands from the command argument string.

Acceptance criteria:
- command registration uses `pi.registerCommand("role-model", ...)`
- subcommand parsing supports at least `help`, `setup`, `status`, `doctor`, `ui`, `alias list`, `alias recommended`, `alias use <id>`, and `alias refresh`
- unknown subcommands return a deterministic help/error response rather than throwing
- command parser tests cover nested-looking commands such as `/role-model alias list` and `/role-model alias use hybrid.hybrid`
- `/role-model help` summarizes first-release commands and identifies later commands as unavailable rather than silently accepting them
- `/role-model ui` prints or opens the configured Role-Model UI URL only after explicit invocation; no browser is opened during package load, setup discovery, or provider registration
- command handling never starts the Role-Model runtime in this run

### `R3` Discover only an explicitly configured or default external Role-Model runtime

Description:
The package must discover and validate an already-running Role-Model runtime without starting processes, reading secrets, or making unbounded network calls.

Acceptance criteria:
- discovery order supports explicit package config, environment variables, default local runtime `http://127.0.0.1:3456`, and cached last-known-good metadata where implemented
- discovery queries `GET /healthz`, `GET /api/version`, `GET /api/role-model/downstream/openai`, and `GET /v1/models` as fallback or compact model-list source
- all runtime HTTP calls have bounded timeouts
- remote runtime URLs are disabled by default
- remote runtime URLs require explicit user-level configuration and cannot be enabled by project-local settings alone
- discovery does not start a child process
- discovery does not invoke the Role-Model launcher
- discovery does not open a browser
- discovery does not resolve or read Pi provider API keys
- missing runtime, incompatible runtime, missing downstream discovery, malformed discovery, and fallback-only `/v1/models` cases produce actionable diagnostics

### `R4` Parse Role-Model downstream OpenAI discovery and register provider models

Description:
The package must use Role-Model's existing downstream OpenAI discovery contract to register a Pi provider named `role-model`.

Acceptance criteria:
- the package validates `contractVersion: "role-model.downstream.openai.v1"` or another explicitly supported compatible version
- provider registration uses `pi.registerProvider("role-model", ...)`
- the registered provider uses Role-Model's discovered base URL and OpenAI-compatible chat/completions API type supported by Pi
- provider model ids come from Role-Model discovery model records
- provider model `contextWindow` uses `model.piMapping.contextWindow` first, then conservative safe limits, then explicit fallback only when metadata is missing
- provider model `maxTokens` uses `model.piMapping.maxTokens` first, then conservative safe limits, then explicit fallback only when metadata is missing
- provider model input/modalities are derived from Role-Model metadata, preserving text and image support where exposed
- provider model reasoning and capability flags are mapped conservatively from Role-Model metadata
- provider model cost defaults are zeroed or marked unknown rather than inventing provider pricing in Pi
- provider registration is idempotent across setup/refresh calls
- incomplete model records are reported as degraded diagnostics instead of silently overclaiming support

### `R5` Handle Role-Model gateway authentication according to discovery

Description:
The package must not require a data token in the current local Role-Model runtime case where discovery says inbound bearer validation is not enforced.

Acceptance criteria:
- if discovery reports `authentication.required: false`, provider registration uses `authentication.placeholderToken` when Pi requires an API key value
- the first release does not require users to set `ROLE_MODEL_DATA_TOKEN` for local external runtime onboarding
- if a future runtime reports `authentication.required: true`, the package fails closed unless an explicit configured Role-Model data-token source exists
- the package distinguishes Role-Model gateway auth from Pi upstream provider credentials
- tests cover placeholder-token behavior and required-auth fail-closed behavior
- no setup, status, doctor, or discovery path reads raw Pi provider secrets

### `R6` Provide useful status, setup, doctor, and alias workflows

Description:
The first-release commands must give users enough deterministic feedback to connect Pi to an existing Role-Model runtime and choose an alias.

Acceptance criteria:
- `/role-model setup` discovers the runtime, validates downstream discovery, registers aliases, and reports the recommended alias when available
- `/role-model status` reports configured runtime URL, runtime availability, version if available, discovery contract version, alias count, recommended alias, selected alias if tracked, and warnings
- `/role-model doctor` reports specific remediation steps for missing runtime, stale or incompatible discovery, missing aliases, blocked remote URL, required auth without token, and fallback-only metadata
- `/role-model alias list` lists discovered aliases and key readiness/degraded metadata
- `/role-model alias recommended` reports Role-Model's recommended alias or an actionable no-recommendation diagnostic
- `/role-model alias use <id>` records or applies the selected Role-Model alias according to Pi's supported model-selection/configuration surface
- `/role-model alias refresh` repeats discovery and provider registration idempotently
- command output avoids exposing secrets, credential refs, local auth-cache paths, or raw provider API key values

### `R7` Ship a `role-model` Pi skill with safe operational guidance

Description:
The package must include a Pi skill that teaches users and agents how to operate the integration without encouraging unsafe credential or runtime actions.

Acceptance criteria:
- `skills/role-model/SKILL.md` exists with metadata suitable for Pi skill loading
- the skill explains the package/runtime distinction
- the skill directs first-time setup to `/role-model setup`
- the skill documents first-release `/role-model` commands
- the skill explains Role-Model aliases, direct models, runtime recommendation, and why Role-Model remains the routing authority
- the skill explains that credentials are not copied or synced by the first release
- the skill prohibits reading or printing Pi auth files or raw provider keys
- the skill states that managed runtime start is unavailable until a headless ownership contract exists
- the skill can reference concise files under `skills/role-model/references/` for setup, runtime, aliases, routing, credentials, benchmarks, and troubleshooting

### `R8` Enforce security and lifecycle guardrails in code and tests

Description:
The implementation must make the audited safety boundaries executable, not only documented.

Acceptance criteria:
- no extension factory code starts background processes, opens sockets beyond bounded discovery fetches, opens browsers, or starts timers that require shutdown
- managed runtime commands are not implemented as functional process-control commands in this run
- current Role-Model launcher invocation is absent from implementation code
- raw `ctx.modelRegistry.authStorage` access is absent from package implementation code
- tests or lint-like safety checks fail if forbidden raw auth-storage access, launcher invocation, or managed-process startup is added
- project-local config cannot enable remote runtimes, binary paths, runtime ownership, or credential behavior
- automatic benchmark execution is absent
- Pi-side fallback/replay after Role-Model begins streaming is absent
- package status/doctor output redacts secrets and token-like values

### `R9` Preserve Role-Model as the routing and metadata authority

Description:
The package must not implement a second router or copy Role-Model catalogs into Pi.

Acceptance criteria:
- Pi provider models are Role-Model aliases and exact models exposed by Role-Model discovery
- package code does not implement endpoint selection, fallback, scoring, difficulty routing, controller routing, or benchmark scoring
- package code does not copy provider catalogs from Role-Model into Pi package fixtures except minimal test fixtures needed for discovery parsing
- package code treats Role-Model response headers and router decision APIs as optional diagnostics, not as inputs to Pi-side route selection
- custom `streamSimple` transport is not required for first-release provider registration unless Phase 2 determines Pi-side decision correlation is essential
- if custom transport is implemented in this run, it must still send all requests to Role-Model and must not select final endpoints inside Pi

### `R10` Provide package-local automated tests and integration-style fake runtime coverage

Description:
The run must add focused tests that make the package safe to evolve.

Acceptance criteria:
- command parser tests cover all first-release subcommands and invalid commands
- runtime discovery tests cover healthy runtime, missing runtime, malformed discovery, fallback-only `/v1/models`, required-auth fail-closed, and remote-runtime guard behavior
- downstream discovery parsing tests cover at least one alias with `piMapping`, one model with incomplete metadata, and placeholder auth
- provider registration tests prove model id, context window, max token, input modality, reasoning, and cost mapping
- status/doctor tests prove actionable warnings without leaking secrets
- safety tests prove forbidden operations are absent or rejected
- tests use fake HTTP/runtime clients where possible and do not require a live Role-Model runtime or internet access by default
- if Pi extension runner smoke coverage is practical, add a local automated smoke proving the package extension and skill load; otherwise document the test-harness gap and keep the mandatory real-Pi proof in Phase 5

### `R11` Define verification commands and manual smoke expectations

Description:
The run must leave behind an executable validation path for future package work.

Acceptance criteria:
- package-local test command is documented
- root or workspace validation command needed for the new package is documented or added
- Phase 2 plan must select verification commands based on the run 51 testing matrix
- Phase 4 must run package-local tests and relevant workspace validation
- Phase 4 must verify every implemented requirement against tests, changed files, and the audited proposal traceability matrix
- Phase 4 must not mark this run verified from package-local tests alone if proposal-required Pi setup behavior has not been exercised in Phase 5
- Phase 5 must include a real Pi smoke that runs `pi install ./packages/pi-role-model` or the equivalent local package install command from this repository path
- Phase 5 must drive Pi setup through the package command surface, including `/role-model setup` or the nearest supported noninteractive Pi command path for invoking the command
- Phase 5 must verify that Pi sees the `role-model` provider or package-provided model aliases after setup
- Phase 5 must verify that Pi can select or use the runtime-recommended Role-Model alias without manual model-file edits
- Phase 5 must capture concrete command output or screenshots/logs proving Pi install, setup, alias discovery, and provider/model availability
- if local Pi cannot be driven in the environment, Phase 5 must be marked blocked with the missing executable/tooling evidence; deterministic substitutes may be recorded but cannot satisfy Approval: PASS
- verification must include a fake runtime and, where practical, an updated local Role-Model runtime query against `/api/role-model/downstream/openai`

### `R12` Prepare root README installation guidance and local distribution without prematurely publishing

Description:
The package should be locally installable and publication-ready in shape, and the repository root README must give Pi users a concise installation path without requiring npm publication in this run.

Acceptance criteria:
- repository root `README.md` includes a dedicated section titled `Installation for Pi`
- the root README section explains that `pi-role-model` lets Pi use an already-running Role-Model runtime as an OpenAI-compatible provider
- the root README section shows local source-checkout installation with `pi install ./packages/pi-role-model`
- the root README section shows the first setup/status commands users should run in Pi, including `/role-model setup` and `/role-model status`
- the root README section explains how users can verify Role-Model aliases are visible in Pi
- the root README section explicitly states that the first release does not install/start the Role-Model runtime and does not copy provider credentials
- README documents local development install with `pi install ./packages/pi-role-model`
- README documents the monorepo git-install caveat from the proposal
- README states that npm publication requires removing `"private": true`
- README preserves the package display name and command family as `pi-role-model` and `/role-model` even if npm scope changes later
- no release automation or npm publishing workflow is added in this run unless separately approved

### `R13` Maintain audited proposal traceability across all recursive phases

Description:
The audited proposal must remain a live verification input, not a background document. Every recursive phase must reconcile its work with the proposal's package scope, delivery phases, in-scope items, out-of-scope items, security rules, and distribution expectations.

Acceptance criteria:
- Phase 1 AS-IS must inspect the audited proposal and current repo/Pi/Role-Model code to identify what already exists, what is missing, and what must remain deferred
- Phase 2 TO-BE plan must include a proposal traceability matrix that maps proposal sections and proposal delivery phases to requirements `R1` through `R15`, planned files, planned tests, and explicit deferrals
- Phase 2 must distinguish proposal Phase 0/Phase 1 work that is implemented in this run from proposal Phase 2-Phase 5 work that remains disabled or deferred
- Phase 3 implementation summary must update the traceability matrix with changed files and TDD evidence for each implemented proposal item
- Phase 4 test summary must use the proposal traceability matrix to prove the full in-scope proposal scope is covered by tests or verified implementation evidence
- Phase 4 must verify that the root README contains the proposal-required `Installation for Pi` section and that its commands match the implemented package behavior
- Phase 4 must explicitly list every proposal item that remains out of scope or deferred and cite the requirement or out-of-scope ID that authorizes that deferral
- Phase 5 manual QA must use the proposal traceability matrix as its user-facing acceptance checklist and must verify the real Pi install/setup path
- Phase 6 decisions update must record whether this run completed only proposal Phase 0/1 or also any later proposal item
- Phase 7 state update must describe the actual shipped package capability, not the larger future proposal
- Phase 8 memory impact must decide whether Pi package integration deserves new durable memory or an update to an existing domain shard

### `R14` Use strict TDD with verifiable implementation evidence

Description:
All code-bearing package work must be implemented through TDD and leave concrete evidence that the tests failed before production code and passed after implementation.

Acceptance criteria:
- Phase 2 must define TDD sub-phases for package scaffold validation, command parser, runtime discovery, downstream discovery parsing, provider registration, auth handling, status/doctor output, skill/package loading, and safety guardrails
- Phase 3 must declare `TDD Mode: strict`
- Phase 3 must capture RED evidence paths for failing tests before production code changes for each code-bearing sub-phase
- Phase 3 must capture GREEN evidence paths for the same tests passing after implementation
- Phase 3 must not claim implementation complete for a requirement unless it cites changed files and matching RED/GREEN evidence
- Phase 4 must independently verify the RED/GREEN evidence, rerun the relevant tests, and map passing tests back to requirements and proposal traceability rows
- non-code documentation-only changes may use a pragmatic exception only if Phase 3 records why no RED test is meaningful and Phase 4 verifies the rendered/documented output another way
- implementation evidence must include concrete changed file paths, command outputs, and test evidence paths, not prose-only claims

### `R15` Prove end-to-end setup by driving Pi in Phase 5

Description:
The final acceptance path must prove the integration in Pi itself, not only through fake clients or package-local tests.

Acceptance criteria:
- Phase 5 must locate the Pi executable or supported local Pi invocation path and record its version or identifying output
- Phase 5 must use the explicit QA checklist below and record PASS/FAIL evidence for every item
- Phase 5 must not pass if the package only works through direct Node tests and cannot be installed and set up by Pi

Required Phase 5 QA checklist:

| Check | Required evidence |
| --- | --- |
| `QA1` Pi executable available | command path plus version or identifying output |
| `QA2` Role-Model router installed or otherwise available outside the Pi package | install command/log or existing installation path/version; this may be a manual/test setup step, but must not be performed automatically by the Pi package |
| `QA3` Role-Model router runtime running | successful `GET /healthz` plus `/api/version` or equivalent status output |
| `QA4` Role-Model downstream discovery available | captured `GET /api/role-model/downstream/openai` response summary with contract version, base URL, recommended model, auth placeholder/required state, and alias count |
| `QA5` Pi installs the local package | `pi install ./packages/pi-role-model` or equivalent local package install command succeeds from this repository path |
| `QA6` Pi can read/load the package skill | Pi skill listing, skill invocation, or equivalent proof shows `role-model` skill is available after install |
| `QA7` Pi can invoke package commands | `/role-model help`, `/role-model status`, and `/role-model doctor` or equivalent command path return package-owned output |
| `QA8` Pi configures the Role-Model endpoint | setup command/config evidence shows Pi is pointed at the intended Role-Model base URL without manual model-file edits |
| `QA9` Pi setup registers or refreshes provider models | Pi provider/model listing shows provider id `role-model` and Role-Model aliases from discovery |
| `QA10` Pi can inspect aliases | `/role-model alias list` and `/role-model alias recommended` or equivalent output show aliases and the runtime-recommended alias |
| `QA11` Pi can choose the alias | `/role-model alias use <recommended-alias>` or the supported Pi model-selection command succeeds without editing Pi config by hand |
| `QA12` Pi can send a request through the alias | a non-destructive Pi prompt/request uses the selected Role-Model alias when the environment supports local prompt execution |
| `QA13` Role-Model records the Pi-originated request | telemetry, logs, router decision, request detail, or response headers prove the request reached Role-Model |
| `QA14` Secret safety preserved | QA transcript/log review confirms no provider API key, OAuth token, credential ref, or auth-cache path was printed or copied |
| `QA15` Managed runtime boundary preserved | evidence shows the Pi package did not invoke the browser-opening Role-Model launcher or start a managed runtime process |

If `QA12` cannot run because Pi lacks a non-destructive prompt mode in the local environment, Phase 5 must record the concrete blocker and still complete `QA1` through `QA11`, `QA14`, and `QA15`; Approval may pass only if the user explicitly accepts that prompt execution was environmentally blocked after package install/setup and alias selection were proven. If `QA1` through `QA11` cannot run, Phase 5 must remain blocked.

## Out of Scope

- `OOS1`: managed Role-Model binary download
- `OOS2`: managed runtime upgrade
- `OOS3`: starting, stopping, restarting, or owning a Role-Model runtime process
- `OOS4`: invoking the current browser-opening Role-Model launcher
- `OOS5`: headless runtime process ownership
- `OOS6`: credential import, credential copy, credential sync, or OAuth token transfer
- `OOS7`: Pi-to-Role-Model provider sync plan/apply/status APIs
- `OOS8`: adding a new Role-Model Pi-specific integration manifest endpoint
- `OOS9`: paid benchmark execution or benchmark command implementation
- `OOS10`: route feedback learning
- `OOS11`: implementing Pi itself or changing the upstream Pi repository
- `OOS12`: publishing the package to npm
- `OOS13`: adding Role-Model routing logic inside Pi

## Constraints

- Use the existing repo workspace shape; `packages/pi-role-model` is the package path.
- Preserve the audited package name `pi-role-model`.
- Preserve `/role-model ...` as one command family implemented through one registered Pi command.
- Treat `/api/role-model/downstream/openai` as the primary first-release metadata source.
- Treat `/v1/models` as fallback or compact compatibility metadata, not as the only source when rich discovery is available.
- Do not require `ROLE_MODEL_DATA_TOKEN` for the current unauthenticated local gateway contract.
- Do not read raw Pi provider secrets during setup, discovery, status, doctor, or tests.
- Do not start the current Role-Model launcher from Pi because it opens a browser.
- Use TDD for code-bearing changes in Phase 3 unless a specific pragmatic exception is approved in the Phase 3 artifact.
- Keep automated tests deterministic and offline-safe by default.
- Keep command output secret-safe and actionable.

## Assumptions

- The Pi APIs audited from `C:/Users/erikb/AppData/Local/Temp/pi-official-audit` remain representative for the target Pi version.
- Pi can load local package paths with `package.json` `pi.extensions` and `pi.skills`.
- Pi can load TypeScript extensions through its documented extension loading path.
- Pi provider registration accepts an OpenAI-compatible base URL and model list generated by an async extension factory.
- Role-Model discovery at `/api/role-model/downstream/openai` remains available and compatible with `role-model.downstream.openai.v1`.
- Role-Model local gateway auth remains not enforced for the current first-release local external runtime scenario.
- The package can use fake HTTP servers for most tests and does not need a live Role-Model runtime for default CI.
- A local Pi executable or supported local Pi invocation path is available or can be made available before Phase 5. If not, Phase 5 is blocked and the run cannot close as verified.

## Phase 2 Planning Obligations

The TO-BE plan must include:

- a strict TDD breakdown for command parsing, runtime discovery, downstream discovery parsing, provider registration, status/doctor output, skill loading, and safety guardrails
- exact package files to create or modify
- exact package-local and workspace commands to run
- a mandatory Pi install/setup QA strategy that records how Phase 5 will drive Pi for `QA1` through `QA15`, what commands will be run, what evidence will be captured, and what constitutes failure
- a Role-Model router QA setup strategy that distinguishes tester-installed/test-started runtime availability from forbidden package-managed runtime install/start behavior
- an endpoint configuration strategy proving how Pi will point at the intended Role-Model base URL without manual model-file edits
- an alias-selection strategy proving how Pi will choose the runtime-recommended alias after setup
- a fake Role-Model runtime fixture strategy
- a decision on whether first release uses plain `pi.registerProvider` only or needs custom `streamSimple`
- explicit non-goals for managed runtime and credential sync
- a verification matrix tied to run 51's testing architecture
- a proposal traceability matrix that maps the audited proposal sections and proposal delivery phases to requirements, planned implementation files, planned tests, Phase 4 verification, and Phase 5 Pi QA checks
- a root README update plan identifying the exact placement and content of the `Installation for Pi` section

## All-Phase Recursive Verification Obligations

Every recursive phase must treat the audited proposal as an effective input:

- Phase 1 must compare the proposal to the current repo and Pi capabilities and identify current/future contract gaps.
- Phase 2 must plan the full in-scope package implementation and explicitly defer future proposal phases that are outside this run.
- Phase 3 must implement with strict TDD and record changed files plus RED/GREEN evidence for each in-scope requirement.
- Phase 4 must rerun tests, verify changed files, and check the proposal traceability matrix before marking requirements verified.
- Phase 4 must verify the root README `Installation for Pi` section against the implemented commands and package path.
- Phase 5 must perform real Pi install/setup QA and use the proposal traceability matrix as the acceptance checklist.
- Phase 6 must record which proposal phases/items this run completed or deferred.
- Phase 7 must update state to reflect only the verified package capability.
- Phase 8 must update or create durable memory if the run changes reusable Pi/downstream integration knowledge.

## Coverage Gate

Coverage: PASS

- `R1` covers the package scaffold and workspace/package manifest shape.
- `R2` covers Pi's single-command parsing model and first-release command family.
- `R3` covers bounded external runtime discovery without side effects.
- `R4` covers downstream discovery parsing and provider registration.
- `R5` covers placeholder auth and data-token fail-closed behavior.
- `R6` covers setup/status/doctor/alias user workflows.
- `R7` covers the Pi skill.
- `R8` covers security and lifecycle guardrails.
- `R9` preserves Role-Model as the routing authority.
- `R10` covers automated package tests and fake runtime coverage.
- `R11` covers verification command and smoke expectations.
- `R12` covers the root README `Installation for Pi` section, local distribution shape, and publication caveats.
- `R13` covers proposal traceability across all recursive phases and ensures Phase 4/5 use the proposal as verification input.
- `R14` covers strict TDD, RED/GREEN evidence, and verifiable implementation evidence.
- `R15` covers mandatory Phase 5 real-Pi install/setup verification.
- Out-of-scope items prevent the run from widening into managed runtime, credential sync, benchmarks, Pi upstream changes, npm publishing, or router reimplementation.
- User approval to implement this run was provided in chat on 2026-06-22, so the Phase 00 requirement can be locked.

## Approval Gate

Approval: PASS

- This DRAFT is grounded in the audited proposal, current Role-Model runtime contracts, current Pi package/extension APIs, prior downstream discovery work, and the runtime/provider capability memory shard.
- It is intentionally scoped to the first implementable external-runtime package slice.
- It now requires proposal traceability in every recursive phase, strict TDD with RED/GREEN evidence, Phase 4 test/proposal reconciliation, and mandatory Phase 5 Pi install/setup verification.
- Explicit user approval to implement this run was provided in chat on 2026-06-22.
