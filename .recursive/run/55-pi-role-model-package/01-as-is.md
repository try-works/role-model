Run: `/.recursive/run/55-pi-role-model-package/`
Phase: `01 AS-IS`
Status: `LOCKED`
LockedAt: `2026-06-22T11:24:33Z`
LockHash: `6af81f99a48ba5c6d4c4af18b62b9cfaa0c622b8db5304893a2047ce3d81527d`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/55-pi-role-model-package/00-requirements.md`
- `/.recursive/run/55-pi-role-model-package/00-worktree.md`
- External audited proposal: `D:/DEV/role-model-proposals/14-pi-role-model-package-proposal-audited.md`
- `/pnpm-workspace.yaml`
- `/README.md`
- `/packages/protocol-types/src/generated.ts`
- `/role-model-router/apps/runtime-host-bridge/src/downstream-openai-discovery.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/launcher/main.go`
- Audited Pi source checkout: `C:/Users/erikb/AppData/Local/Temp/pi-official-audit`
Outputs:
- `/.recursive/run/55-pi-role-model-package/01-as-is.md`
Scope note: This artifact records the pre-change Role-Model and Pi package surfaces that Run 55 must use to implement the first `pi-role-model` package slice.

# Phase 1 AS-IS: `pi-role-model` package

## TODO

- [x] Re-read the locked requirement and proposal reference.
- [x] Inspect current workspace/package layout.
- [x] Inspect current Role-Model downstream OpenAI discovery contract and runtime endpoints.
- [x] Inspect current README installation surface.
- [x] Inspect Pi package, extension, command, provider registration, and safety constraints from the audited Pi clone.
- [x] Identify implementation gaps for every locked requirement.
- [x] Self-audit this AS-IS artifact before locking.

## Reproduction Steps (Novice-Runnable)

From the locked worktree:

```powershell
cd D:\DEV\role-model\.worktrees\55-pi-role-model-package
git status --short
Get-ChildItem packages -Directory | Select-Object -ExpandProperty Name
Get-Content pnpm-workspace.yaml
Select-String -Path README.md -Pattern 'Installation for Pi|Pi|install|Role-Model' -CaseSensitive:$false
Select-String -Path packages/protocol-types/src/generated.ts -Pattern 'export interface DownstreamOpenAIModelRecord|piMapping|export interface DownstreamOpenAIDiscovery|placeholderToken|recommendedModel' -Context 0,6
Select-String -Path role-model-router/apps/runtime-host-bridge/src/downstream-openai-discovery.ts -Pattern 'placeholderToken|chatCompletions|responses|health|models|recommendedModel' -Context 0,3
Select-String -Path role-model-router/apps/runtime-host-bridge/src/index.ts -Pattern 'url.pathname === "/healthz"|url.pathname === "/v1/models"|url.pathname === "/api/version"|url.pathname === "/api/role-model/downstream/openai"|url.pathname === "/api/role-model/router/decisions"|/api/role-model/benchmark'
Select-String -Path C:\Users\erikb\AppData\Local\Temp\pi-official-audit\packages\coding-agent\docs\packages.md -Pattern 'pi install|pi.extensions|pi.skills|skills/|extensions/' -Context 0,3
Select-String -Path C:\Users\erikb\AppData\Local\Temp\pi-official-audit\packages\coding-agent\docs\extensions.md -Pattern 'async function|registerProvider|session_start|long-lived|startup' -Context 0,3
```

## Current Behavior by Requirement

R1 Package scaffold under `packages/pi-role-model`:

- Current repo has `packages/conformance`, `packages/packaging`, `packages/protocol-types`, `packages/schema-tools`, and `packages/store-contract`.
- `pnpm-workspace.yaml` already includes `packages/*`, so a new package at `packages/pi-role-model` will be included without workspace file edits.
- Gap: no `pi-role-model` package exists yet.

R2 Single `/role-model` command dispatcher:

- Pi parses one slash command token and a raw argument string. The audited Pi source shows `commandName = text.slice(1, spaceIndex)` and `args = text.slice(spaceIndex + 1)`, so nested slash commands such as `/role-model setup` must be implemented as one registered `role-model` command with an internal subcommand parser.
- Gap: no Pi command exists in this repo.

R3 External runtime discovery only:

- Role-Model runtime exposes local HTTP endpoints; the package can discover an already-running runtime through `http://127.0.0.1:3456` by default.
- Role-Model launcher starts the runtime and opens a browser through platform commands (`msedge`, `open`, `xdg-open`).
- Gap: package must not start the launcher, spawn processes, or manage long-lived runtime resources.

R4 Downstream OpenAI discovery parsing/provider registration:

- `packages/protocol-types/src/generated.ts` defines `DownstreamOpenAIDiscovery` with `contractVersion`, `kind`, `providerId`, `baseUrl`, `endpoints`, `authentication`, `models`, `setup.recommendedModel`, and `freshness`.
- `DownstreamOpenAIModelRecord` includes `id`, alias/model `type`, `routingMode`, target/canonical/provider ids, conservative limit fields, modality/capability metadata, and `piMapping.contextWindow` / `piMapping.maxTokens`.
- `role-model-router/apps/runtime-host-bridge/src/downstream-openai-discovery.ts` builds endpoint URLs for `/healthz`, `/v1/models`, `/v1/chat/completions`, and `/v1/responses`.
- Runtime routes exist for `/healthz`, `/v1/models`, `/api/version`, `/api/role-model/downstream/openai`, `/api/role-model/router/decisions`, and benchmark endpoints.
- Gap: no Pi adapter consumes this contract yet.

R5 Placeholder auth/no `ROLE_MODEL_DATA_TOKEN`:

- Discovery authentication is currently bearer with `required: false`, header `Authorization`, and placeholder token `role-model-local`.
- Discovery note states inbound bearer validation is not enforced yet and downstream clients may use the placeholder where a token field is required.
- Gap: implementation must use the discovery placeholder and avoid inventing secret configuration.

R6 Setup/status/doctor/alias workflows:

- Runtime endpoints support health, version, downstream discovery, compact model list, and router decision inspection. These are sufficient for setup/status/doctor and alias listing.
- Gap: no Pi-facing workflow exists yet.

R7 `role-model` Pi skill:

- Pi package docs say conventional `skills/` recursively finds `SKILL.md` folders and top-level `.md` files as skills.
- Gap: no skill exists yet.

R8 Safety guardrails:

- Pi docs explicitly warn not to start background resources such as processes, sockets, file watchers, or timers from extension factories.
- Pi extension event payloads expose only limited provider request/response information; this package should not depend on raw auth storage or hidden request internals.
- Gap: tests must guard against launcher/process/auth-storage coupling.

R9 Preserve Role-Model as routing authority:

- Role-Model runtime already owns routing decisions and exposes decision receipt endpoints.
- Pi should register Role-Model as an OpenAI-compatible provider/alias catalog, not reimplement routing or capability adjudication.
- Gap: package must map models conservatively without duplicating Role-Model router logic.

R10 Tests/fake runtime coverage:

- Repo uses `vitest` in existing packages/apps. Baseline downstream discovery tests already pass in runtime-host-bridge.
- Gap: new package needs focused unit tests plus fake runtime integration tests.

R11 Verification commands/Phase 4/5 proposal reconciliation:

- Baseline `corepack pnpm install --frozen-lockfile`, schema validation, and runtime discovery tests passed in Phase 0.
- Gap: package-specific and workspace verification commands do not exist until implementation.

R12 Root README `Installation for Pi` section:

- Root README has general Role-Model install/build sections, but no `Installation for Pi` section.
- Gap: README must document installing Role-Model router first, starting it externally, installing `pi-role-model` into Pi, running setup/status/doctor/alias flows, and the local-package distribution caveat.

R13 Proposal traceability:

- Proposal source lives outside the repo at `D:/DEV/role-model-proposals/14-pi-role-model-package-proposal-audited.md`.
- Gap: Phase 2-5 artifacts must reference this proposal and reconcile all sections, especially Phase 4/5 scope.

R14 Strict TDD RED/GREEN evidence:

- No implementation exists yet.
- Gap: Phase 3 must add tests first, capture failing evidence, implement, then capture passing evidence.

R15 Phase 5 real Pi install/setup QA:

- Pi docs support `pi install ./relative/path/to/package`, package manifest `pi.extensions` / `pi.skills`, and conventional `extensions/` / `skills/`.
- Gap: Phase 5 must drive an actual Pi install/setup path if `pi` is available, including package install, skill load, command execution, endpoint configuration, provider/model listing, alias choice, and non-destructive request/receipt checks where possible.

## Relevant Code Pointers

- `pnpm-workspace.yaml`: includes `packages/*`, so `packages/pi-role-model` is auto-discovered.
- `README.md`: contains Role-Model install/build/run sections but no `Installation for Pi` section.
- `packages/protocol-types/src/generated.ts:104`: `DownstreamOpenAIModelRecord`.
- `packages/protocol-types/src/generated.ts:148`: `piMapping.contextWindow` and `piMapping.maxTokens`.
- `packages/protocol-types/src/generated.ts:160`: `DownstreamOpenAIDiscovery`.
- `packages/protocol-types/src/generated.ts:176`: discovery `placeholderToken`.
- `packages/protocol-types/src/generated.ts:184`: discovery `setup.recommendedModel`.
- `role-model-router/apps/runtime-host-bridge/src/downstream-openai-discovery.ts:469`: `/healthz`, `/v1/models`, `/v1/chat/completions`, `/v1/responses` discovery endpoints.
- `role-model-router/apps/runtime-host-bridge/src/index.ts:9407`: `/healthz`.
- `role-model-router/apps/runtime-host-bridge/src/index.ts:9440`: `/v1/models`.
- `role-model-router/apps/runtime-host-bridge/src/index.ts:9748`: `/api/version`.
- `role-model-router/apps/runtime-host-bridge/src/index.ts:9810`: `/api/role-model/downstream/openai`.
- `role-model-router/apps/runtime-host-bridge/src/index.ts:10157`: `/api/role-model/router/decisions`.
- `role-model-router/apps/launcher/main.go:92`: launcher waits for `http://127.0.0.1:3456/healthz`.
- `role-model-router/apps/launcher/main.go:111`: launcher opens a browser.
- `C:/Users/erikb/AppData/Local/Temp/pi-official-audit/packages/coding-agent/docs/packages.md:23`: `pi install` supports npm, git, absolute, and relative local package sources.
- `C:/Users/erikb/AppData/Local/Temp/pi-official-audit/packages/coding-agent/docs/packages.md:161`: conventional `extensions/` and `skills/` package paths.
- `C:/Users/erikb/AppData/Local/Temp/pi-official-audit/packages/coding-agent/docs/packages.md:168`: third-party deps belong in `dependencies`; bundled Pi packages, if imported, belong in `peerDependencies` with `*`.
- `C:/Users/erikb/AppData/Local/Temp/pi-official-audit/packages/coding-agent/docs/extensions.md:180`: async extension factory is awaited before startup.
- `C:/Users/erikb/AppData/Local/Temp/pi-official-audit/packages/coding-agent/docs/extensions.md:184`: async factory is intended for one-time startup discovery such as fetching available models.
- `C:/Users/erikb/AppData/Local/Temp/pi-official-audit/packages/coding-agent/docs/extensions.md:219`: no long-lived resources from extension factories.
- `C:/Users/erikb/AppData/Local/Temp/pi-official-audit/packages/coding-agent/docs/extensions.md:1613`: `pi.registerProvider(name, config)`.
- `C:/Users/erikb/AppData/Local/Temp/pi-official-audit/packages/coding-agent/docs/extensions.md:1619`: model discovery should prefer async factory so models are available to startup and `pi --list-models`.

## Known Unknowns

- Exact current `pi` executable availability on this machine must be checked in Phase 5, not assumed.
- The exact installed Pi CLI surface for non-interactive command invocation may differ from the docs; Phase 5 should record commands actually used and block only if core QA checks cannot be driven.
- A fully non-destructive model request through the selected alias may require local downstream credentials/models configured in Role-Model. If not available, Phase 5 may pass QA12 only with explicit user acceptance as required by R15.

## Evidence

- Phase 0 dependency install passed: `corepack pnpm install --frozen-lockfile`.
- Phase 0 schema validation passed: `corepack pnpm run schemas:validate`.
- Phase 0 runtime downstream discovery baseline passed: `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/downstream-openai-discovery.test.ts`.
- Phase 1 focused reads confirmed package workspace layout, missing Pi package, downstream discovery contract, runtime endpoints, root README gap, and Pi package/extension semantics.

## Prior Recursive Evidence Reviewed

- `.recursive/run/55-pi-role-model-package/00-requirements.md`: locked requirement.
- `.recursive/run/55-pi-role-model-package/00-worktree.md`: locked worktree/baseline artifact.
- Recent AS-IS artifact headings from earlier runs were reviewed to keep this phase compatible with the recursive lock/audit format.

## Audit Context

- Audit Execution Mode: `self-audit`
- Subagent Availability: `unavailable`
- Subagent Capability Probe: no delegated subagent tool was active in the current tool surface during this phase.
- Delegation Decision Basis: self-audit is sufficient for Phase 1 because no code has been changed and all claims are tied to local files and command evidence.
- Delegation Override Reason: not applicable.
- Audit Inputs Provided: locked requirement, external proposal path, current worktree files, Role-Model runtime source, generated protocol types, root README, and audited Pi clone documentation/source.

## Effective Inputs Re-read

- `.recursive/run/55-pi-role-model-package/00-requirements.md`
- `.recursive/run/55-pi-role-model-package/00-worktree.md`
- `D:/DEV/role-model-proposals/14-pi-role-model-package-proposal-audited.md`
- `pnpm-workspace.yaml`
- `README.md`
- `packages/protocol-types/src/generated.ts`
- `role-model-router/apps/runtime-host-bridge/src/downstream-openai-discovery.ts`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/launcher/main.go`
- `C:/Users/erikb/AppData/Local/Temp/pi-official-audit/packages/coding-agent/docs/packages.md`
- `C:/Users/erikb/AppData/Local/Temp/pi-official-audit/packages/coding-agent/docs/extensions.md`
- `C:/Users/erikb/AppData/Local/Temp/pi-official-audit/packages/coding-agent/src/core/agent-session.ts`
- `C:/Users/erikb/AppData/Local/Temp/pi-official-audit/packages/coding-agent/src/core/extensions/types.ts`

## Earlier Phase Reconciliation

- Phase 0 required all implementation work to occur in `.worktrees/55-pi-role-model-package` on branch `recursive/55-pi-role-model-package`; this AS-IS artifact was created there.
- Phase 0 established baseline install/schema/runtime-discovery tests; Phase 1 does not invalidate those baseline results.
- The only implementation-independent gap from Phase 0 is the generated Python bytecode timestamp after running recursive scripts; it must be cleaned before final closeout.

## Subagent Contribution Verification

- No delegated contribution was used in Phase 1.
- Self-audit verification was performed by cross-checking each requirement against at least one local code/doc pointer where possible.
- Claims that depend on installed Pi behavior rather than docs are deferred to Phase 5 QA.

## Worktree Diff Audit

- Baseline type: `commit`
- Baseline reference: `21af81ba379cd0f97f4ffcc63090b8e9cef243b6`
- Comparison reference: `working-tree`
- Normalized baseline: `21af81ba379cd0f97f4ffcc63090b8e9cef243b6`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 21af81ba379cd0f97f4ffcc63090b8e9cef243b6`
- `git status --short` showed:
  - `M .agents/skills/recursive-mode/scripts/__pycache__/lint-recursive-run.cpython-314.pyc`
  - `?? .recursive/run/55-pi-role-model-package/`
- No production implementation files have been changed in Phase 1.
- The pycache file is generated by recursive script execution and is unrelated to the intended product diff; it will be restored/cleaned before final closeout.

## Gaps Found

- None for the Phase 1 AS-IS audit artifact.
- Product implementation gaps are intentionally recorded under `Current Behavior by Requirement` and `Requirement Completion Status` for Phase 2 planning.

## Repair Work Performed

- None. Phase 1 is observational only.

## Requirement Completion Status

- R1 | Status: deferred | Rationale: AS-IS confirms workspace supports `packages/pi-role-model`; implementation belongs to Phase 3. | Deferred By: `/.recursive/run/55-pi-role-model-package/01-as-is.md`. | Audit Note: covered by package/workspace findings.
- R2 | Status: deferred | Rationale: AS-IS confirms Pi slash command parsing requires one `role-model` dispatcher; implementation belongs to Phase 3. | Deferred By: `/.recursive/run/55-pi-role-model-package/01-as-is.md`. | Audit Note: covered by Pi command parser findings.
- R3 | Status: deferred | Rationale: AS-IS confirms external runtime discovery is feasible and launcher/process ownership is out of scope; implementation belongs to Phase 3. | Deferred By: `/.recursive/run/55-pi-role-model-package/01-as-is.md`. | Audit Note: covered by external runtime/launcher findings.
- R4 | Status: deferred | Rationale: AS-IS confirms downstream OpenAI discovery contract and runtime endpoints exist; implementation belongs to Phase 3. | Deferred By: `/.recursive/run/55-pi-role-model-package/01-as-is.md`. | Audit Note: covered by discovery/provider findings.
- R5 | Status: deferred | Rationale: AS-IS confirms discovery provides `role-model-local` placeholder auth and no new token is needed; implementation belongs to Phase 3. | Deferred By: `/.recursive/run/55-pi-role-model-package/01-as-is.md`. | Audit Note: covered by placeholder auth findings.
- R6 | Status: deferred | Rationale: AS-IS confirms endpoint primitives can support setup/status/doctor/alias workflows; implementation belongs to Phase 3. | Deferred By: `/.recursive/run/55-pi-role-model-package/01-as-is.md`. | Audit Note: covered by workflow endpoint findings.
- R7 | Status: deferred | Rationale: AS-IS confirms Pi package skill loading supports a packaged `role-model` skill; implementation belongs to Phase 3. | Deferred By: `/.recursive/run/55-pi-role-model-package/01-as-is.md`. | Audit Note: covered by Pi package/skill findings.
- R8 | Status: deferred | Rationale: AS-IS confirms safety constraints against launcher/process/auth-storage coupling; implementation and tests belong to Phase 3. | Deferred By: `/.recursive/run/55-pi-role-model-package/01-as-is.md`. | Audit Note: covered by safety findings.
- R9 | Status: deferred | Rationale: AS-IS confirms Role-Model runtime owns routing; provider registration implementation belongs to Phase 3. | Deferred By: `/.recursive/run/55-pi-role-model-package/01-as-is.md`. | Audit Note: covered by routing authority findings.
- R10 | Status: deferred | Rationale: AS-IS confirms package and fake-runtime tests are absent; implementation tests belong to Phase 3. | Deferred By: `/.recursive/run/55-pi-role-model-package/01-as-is.md`. | Audit Note: covered by testing gap findings.
- R11 | Status: deferred | Rationale: AS-IS confirms verification commands need to be added and run after implementation; completion belongs to Phase 4. | Deferred By: `/.recursive/run/55-pi-role-model-package/01-as-is.md`. | Audit Note: covered by verification findings.
- R12 | Status: deferred | Rationale: AS-IS confirms root README lacks `Installation for Pi`; implementation belongs to Phase 3. | Deferred By: `/.recursive/run/55-pi-role-model-package/01-as-is.md`. | Audit Note: covered by README findings.
- R13 | Status: deferred | Rationale: AS-IS confirms proposal traceability input path is available; reconciliation belongs to Phase 2-5. | Deferred By: `/.recursive/run/55-pi-role-model-package/01-as-is.md`. | Audit Note: covered by proposal traceability findings.
- R14 | Status: deferred | Rationale: AS-IS confirms strict RED/GREEN evidence is a Phase 3 obligation. | Deferred By: `/.recursive/run/55-pi-role-model-package/01-as-is.md`. | Audit Note: covered by TDD evidence findings.
- R15 | Status: deferred | Rationale: AS-IS confirms real Pi install/setup QA is a Phase 5 obligation. | Deferred By: `/.recursive/run/55-pi-role-model-package/01-as-is.md`. | Audit Note: covered by Phase 5 QA findings.

## Audit Verdict

Audit: PASS

## Traceability

- Package/workspace findings -> `R1`
- Pi command parser findings -> `R2`
- External runtime/launcher findings -> `R3`, `R8`, `R15`
- Downstream discovery and runtime endpoint findings -> `R4`, `R5`, `R6`, `R9`, `R10`
- Pi package/skill/provider findings -> `R2`, `R4`, `R7`, `R10`, `R15`
- README installation gap -> `R12`
- Proposal and recursive verification findings -> `R11`, `R13`, `R14`, `R15`
- `R1`: workspace package gap.
- `R2`: command dispatcher gap.
- `R3`: external runtime discovery constraint.
- `R4`: downstream discovery/provider mapping gap.
- `R5`: placeholder auth/no secret constraint.
- `R6`: setup/status/doctor/alias workflow gap.
- `R7`: packaged skill gap.
- `R8`: safety guardrail gap.
- `R9`: routing authority constraint.
- `R10`: tests/fake runtime gap.
- `R11`: verification/proposal reconciliation gap.
- `R12`: README `Installation for Pi` gap.
- `R13`: proposal traceability requirement.
- `R14`: TDD RED/GREEN evidence requirement.
- `R15`: Phase 5 real Pi QA requirement.

## Coverage Gate

- Scope coverage: PASS. Every locked requirement has an AS-IS finding.
- Source coverage: PASS. Findings are grounded in local repo files, Pi audit clone files, or the external proposal.
- Test coverage: PASS for Phase 1. No product code changed; baseline tests remain the relevant evidence.
- Deferred coverage: Phase 3 implementation tests, Phase 4 full verification, and Phase 5 real Pi QA remain required.

Coverage: PASS

## Approval Gate

- User-approved run objective: implement the recursive run in the worktree.
- Phase 1 approval status: PASS.
- Next phase: Phase 2 plan must produce a TDD implementation plan covering package scaffold, command dispatcher, discovery/provider mapping, skill, README, proposal reconciliation, verification commands, and Phase 5 QA checks.

Approval: PASS

## Audit Gate

- AS-IS findings are grounded in local files and audited Pi clone evidence.
- Every requirement from the locked requirements artifact is represented in current behavior, completion status, and traceability.
- No implementation code was changed in Phase 1.

Audit: PASS
