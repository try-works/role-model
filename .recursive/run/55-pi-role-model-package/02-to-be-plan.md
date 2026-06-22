Run: `/.recursive/run/55-pi-role-model-package/`
Phase: `02 TO-BE Plan`
Status: `LOCKED`
LockedAt: `2026-06-22T11:26:45Z`
LockHash: `f500bfa161fd57a7eed3b2ebd7e9e2764ca2676c8d6a0ba12026e4f2ea9dac39`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/55-pi-role-model-package/00-requirements.md`
- `/.recursive/run/55-pi-role-model-package/00-worktree.md`
- `/.recursive/run/55-pi-role-model-package/01-as-is.md`
- External audited proposal: `D:/DEV/role-model-proposals/14-pi-role-model-package-proposal-audited.md`
- `/README.md`
- `/pnpm-workspace.yaml`
- `/packages/protocol-types/src/generated.ts`
- `/role-model-router/apps/runtime-host-bridge/src/downstream-openai-discovery.ts`
- Audited Pi source checkout: `C:/Users/erikb/AppData/Local/Temp/pi-official-audit`
Outputs:
- `/.recursive/run/55-pi-role-model-package/02-to-be-plan.md`
Scope note: This plan defines the strict-TDD implementation path for the first production `pi-role-model` package slice and its Phase 4/5 proposal reconciliation.

# Phase 2 TO-BE Plan: `pi-role-model`

## TODO

- [x] Re-read locked requirements, worktree, AS-IS artifact, and external proposal.
- [x] Define package files and behavior boundaries.
- [x] Define strict RED/GREEN/REFACTOR test slices.
- [x] Define Phase 4 verification commands and proposal reconciliation.
- [x] Define Phase 5 real Pi install/setup QA checks.
- [x] Map every requirement to planned work.
- [x] Self-audit plan before locking.

## Planned Changes by File

- `/packages/pi-role-model/package.json`: new package named `pi-role-model` with Pi package metadata, extension path, skill path, and package-local scripts.
- `/packages/pi-role-model/tsconfig.json`: no-emit TypeScript config scoped to source, extension entrypoint, and tests.
- `/packages/pi-role-model/src/types.ts`: local downstream discovery and minimal Pi extension API types used by this package.
- `/packages/pi-role-model/src/config.ts`: environment/default endpoint config for an externally running Role-Model runtime.
- `/packages/pi-role-model/src/runtime-discovery.ts`: bounded fetch helpers for `/healthz`, `/api/version`, `/api/role-model/downstream/openai`, and `/v1/models`.
- `/packages/pi-role-model/src/downstream-openai.ts`: discovery validation and conservative model mapping using `piMapping`.
- `/packages/pi-role-model/src/provider-registration.ts`: `role-model` provider registration from discovery metadata, using discovery `baseUrl` plus `/v1` and placeholder auth.
- `/packages/pi-role-model/src/commands.ts`: pure `/role-model` subcommand dispatcher for `help`, `status`, `doctor`, `setup`, `alias list`, `alias choose`, and `alias current`.
- `/packages/pi-role-model/src/extension.ts`: Pi extension factory that performs bounded discovery/registers provider, registers the single `role-model` command, and avoids long-lived resources.
- `/packages/pi-role-model/extensions/role-model.ts`: Pi package extension entrypoint exporting the factory.
- `/packages/pi-role-model/skills/role-model/SKILL.md`: skill instructions explaining when and how Pi should use Role-Model.
- `/packages/pi-role-model/test/*.test.ts`: strict TDD unit/integration tests with fake runtime and safety scans.
- `/README.md`: add `## Installation for Pi` with Role-Model runtime prerequisites, `pi install ./packages/pi-role-model`, setup/status/doctor/alias usage, endpoint configuration, and local-package distribution caveat.

## Implementation Steps

1. Create tests first for package manifest, command parser behavior, downstream discovery parsing, provider registration mapping, fake runtime setup/status/doctor/alias flows, skill packaging, README section, and safety guardrails.
2. Capture RED evidence under `/.recursive/run/55-pi-role-model-package/evidence/logs/red/`.
3. Add package scaffold and minimal source files to satisfy manifest, TypeScript, and package discovery tests.
4. Implement discovery validation against fake runtime payloads compatible with current `DownstreamOpenAIDiscovery`.
5. Implement provider registration mapping that preserves Role-Model as routing authority and uses placeholder auth only.
6. Implement `/role-model` dispatcher as one Pi command with subcommands parsed from args.
7. Implement setup/status/doctor/alias workflows as testable pure functions plus Pi output adapter.
8. Implement extension factory with bounded startup discovery and graceful status/doctor failures when runtime is unavailable.
9. Add packaged skill and README `Installation for Pi` section.
10. Capture GREEN evidence under `/.recursive/run/55-pi-role-model-package/evidence/logs/green/`.
11. Refactor only if tests stay green, then capture final verification in Phase 4.

## Testing Strategy

TDD Mode for Phase 3: `strict`

Required RED/GREEN test slices:

- Manifest/package slice: test `package.json` name `pi-role-model`, `pi.extensions`, `pi.skills`, and no unsupported managed-runtime metadata.
- Command slice: test `/role-model` internal parsing for `help`, `status`, `doctor`, `setup`, `alias list`, `alias choose`, invalid subcommands, and no nested Pi slash commands.
- Discovery slice: test fake runtime health/version/downstream discovery success and unavailable/invalid-contract failures.
- Provider slice: test provider id `role-model`, `baseUrl` ending in `/v1`, `api: openai-completions`, placeholder token usage, and model mapping from `piMapping`.
- Workflow slice: test setup/status/doctor/alias outputs are deterministic, redact secrets, list recommended aliases, and persist selected alias only through the package config adapter.
- Skill/docs slice: test `skills/role-model/SKILL.md` exists and README contains `## Installation for Pi` plus install/setup/status/doctor/alias commands.
- Safety slice: scan package source for forbidden coupling including `authStorage`, launcher imports, `child_process`, process spawning, runtime install/start logic, `ROLE_MODEL_DATA_TOKEN`, and benchmark purchase/paid operations.

Planned commands:

```powershell
corepack pnpm --filter pi-role-model test
corepack pnpm --filter pi-role-model run build
corepack pnpm run schemas:validate
corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/downstream-openai-discovery.test.ts
```

## Playwright Plan (if applicable)

Not applicable. This run adds a Pi package, command workflows, tests, and README documentation; it does not add browser UI.

## Manual QA Scenarios

Phase 5 QA Execution Mode: `agent-operated`

Phase 5 must explicitly verify or block on these checks:

- QA1: `pi` executable is available and version/help can be read.
- QA2: Role-Model router/runtime is installed or available outside the package; package does not install/start it.
- QA3: Role-Model runtime responds on configured endpoint with `/healthz` and `/api/version`.
- QA4: `/api/role-model/downstream/openai` returns the expected discovery contract and at least one model/alias.
- QA5: Pi installs the local package with `pi install ./packages/pi-role-model`.
- QA6: Pi can read/load the packaged `role-model` skill.
- QA7: Pi can invoke `/role-model help`, `/role-model status`, and `/role-model doctor`.
- QA8: Pi can configure the Role-Model endpoint without manual model-file edits.
- QA9: Pi lists registered provider/models under `role-model`.
- QA10: Pi lists aliases and identifies the recommended alias.
- QA11: Pi can choose an alias through the package workflow.
- QA12: Pi can send a non-destructive request through the selected alias when local downstream credentials/models are available; if impossible, record explicit user acceptance.
- QA13: Role-Model exposes a receipt/decision for the Pi-originated request when QA12 runs.
- QA14: No secrets are printed or copied during setup/status/doctor/alias flows.
- QA15: Package does not start launcher/runtime or create managed runtime processes.

## Idempotence and Recovery

- Re-running package tests must not require an external runtime; fake runtime tests own their listeners and clean them up.
- Re-running `/role-model setup` against the same endpoint should produce the same provider mapping and selected alias state.
- Runtime unavailable cases should return actionable status/doctor output, not throw unhandled exceptions.
- Pi install QA should use local package installation and record cleanup commands if user settings are modified.
- README instructions must keep package installation separate from Role-Model router installation.

## Implementation Sub-phases

- Phase 3A RED: add failing package manifest, command, discovery, provider, workflow, docs, and safety tests.
- Phase 3B GREEN scaffold: add package, extension entrypoint, skill, and minimal source to satisfy manifest/docs/safety tests.
- Phase 3C GREEN behavior: implement fake runtime discovery, provider mapping, and command workflows.
- Phase 3D REFACTOR: remove duplication, keep pure functions testable, rerun package tests.
- Phase 3E final Phase 3 evidence: run package test/build and record RED/GREEN commands.
- Phase 4 verification: run package tests/build, baseline schema validation, runtime downstream discovery tests, safety scans, and reconcile implementation against proposal Sections 1-19.
- Phase 5 QA: drive real Pi install/setup and record QA1-QA15 evidence.

## Audit Context

- Audit Execution Mode: `self-audit`
- Subagent Availability: `unavailable`
- Subagent Capability Probe: no delegated subagent tool was active in the current tool surface during this phase.
- Delegation Decision Basis: self-audit is sufficient for planning because no production code changed and every planned action maps to locked requirements.
- Delegation Override Reason: not applicable.
- Audit Inputs Provided: locked requirements, locked AS-IS, external proposal, Role-Model discovery source, Pi package docs/source audit, and workspace state.

## Effective Inputs Re-read

- `/.recursive/run/55-pi-role-model-package/00-requirements.md`
- `/.recursive/run/55-pi-role-model-package/00-worktree.md`
- `/.recursive/run/55-pi-role-model-package/01-as-is.md`
- `D:/DEV/role-model-proposals/14-pi-role-model-package-proposal-audited.md`
- `/README.md`
- `/pnpm-workspace.yaml`
- `/packages/protocol-types/src/generated.ts`
- `/role-model-router/apps/runtime-host-bridge/src/downstream-openai-discovery.ts`
- `C:/Users/erikb/AppData/Local/Temp/pi-official-audit/packages/coding-agent/docs/packages.md`
- `C:/Users/erikb/AppData/Local/Temp/pi-official-audit/packages/coding-agent/docs/extensions.md`

## Earlier Phase Reconciliation

- `00-requirements.md` requires package name `pi-role-model`, package path `packages/pi-role-model`, strict TDD, proposal reconciliation, README `Installation for Pi`, and real Pi QA; all are explicitly included above.
- `00-worktree.md` requires work to remain in `.worktrees/55-pi-role-model-package`; this plan only names files in that worktree.
- `01-as-is.md` identified current package/docs/discovery gaps; each gap has a planned test and implementation step.

## Subagent Contribution Verification

- No delegated contribution was used in Phase 2.
- Self-audit verified all R1-R15 requirements appear in implementation steps, testing strategy, manual QA, and traceability.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/55-pi-role-model-package/00-requirements.md`
- `/.recursive/run/55-pi-role-model-package/00-worktree.md`
- `/.recursive/run/55-pi-role-model-package/01-as-is.md`
- `/.recursive/run/54-alias-capability-discovery-contract/02-to-be-plan.md` for current Phase 2 artifact structure.

## Worktree Diff Audit

- Baseline type: `commit`
- Baseline reference: `21af81ba379cd0f97f4ffcc63090b8e9cef243b6`
- Comparison reference: `working-tree`
- Normalized baseline: `21af81ba379cd0f97f4ffcc63090b8e9cef243b6`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 21af81ba379cd0f97f4ffcc63090b8e9cef243b6`
- Phase-owned changed files are limited to recursive artifacts until Phase 3 begins.

## Gaps Found

- None for the Phase 2 plan artifact.

## Repair Work Performed

- None.

## Requirement Completion Status

- R1 | Status: deferred | Rationale: Package scaffold is planned for Phase 3. | Deferred By: `/.recursive/run/55-pi-role-model-package/02-to-be-plan.md`. | Audit Note: planned files include `/packages/pi-role-model/package.json`.
- R2 | Status: deferred | Rationale: Single command dispatcher is planned for Phase 3. | Deferred By: `/.recursive/run/55-pi-role-model-package/02-to-be-plan.md`. | Audit Note: command tests cover internal subcommands.
- R3 | Status: deferred | Rationale: External runtime discovery is planned for Phase 3 and Phase 5. | Deferred By: `/.recursive/run/55-pi-role-model-package/02-to-be-plan.md`. | Audit Note: launcher/process ownership remains out of scope.
- R4 | Status: deferred | Rationale: Discovery parsing/provider registration is planned for Phase 3. | Deferred By: `/.recursive/run/55-pi-role-model-package/02-to-be-plan.md`. | Audit Note: provider tests cover discovery mapping.
- R5 | Status: deferred | Rationale: Placeholder auth behavior is planned for Phase 3. | Deferred By: `/.recursive/run/55-pi-role-model-package/02-to-be-plan.md`. | Audit Note: no `ROLE_MODEL_DATA_TOKEN`.
- R6 | Status: deferred | Rationale: Setup/status/doctor/alias workflows are planned for Phase 3. | Deferred By: `/.recursive/run/55-pi-role-model-package/02-to-be-plan.md`. | Audit Note: workflow tests cover all subcommands.
- R7 | Status: deferred | Rationale: Packaged skill is planned for Phase 3. | Deferred By: `/.recursive/run/55-pi-role-model-package/02-to-be-plan.md`. | Audit Note: skill/docs tests cover package loading path.
- R8 | Status: deferred | Rationale: Safety guardrail implementation and scans are planned for Phase 3/4. | Deferred By: `/.recursive/run/55-pi-role-model-package/02-to-be-plan.md`. | Audit Note: safety test names forbidden coupling.
- R9 | Status: deferred | Rationale: Role-Model routing authority is preserved through provider mapping in Phase 3. | Deferred By: `/.recursive/run/55-pi-role-model-package/02-to-be-plan.md`. | Audit Note: no routing reimplementation planned.
- R10 | Status: deferred | Rationale: Fake runtime and unit tests are planned for Phase 3. | Deferred By: `/.recursive/run/55-pi-role-model-package/02-to-be-plan.md`. | Audit Note: testing strategy lists required slices.
- R11 | Status: deferred | Rationale: Verification commands and proposal reconciliation are planned for Phase 4. | Deferred By: `/.recursive/run/55-pi-role-model-package/02-to-be-plan.md`. | Audit Note: Phase 4 verification is explicit.
- R12 | Status: deferred | Rationale: README `Installation for Pi` is planned for Phase 3. | Deferred By: `/.recursive/run/55-pi-role-model-package/02-to-be-plan.md`. | Audit Note: planned README content is explicit.
- R13 | Status: deferred | Rationale: Proposal traceability is planned for Phase 2-5 and final reconciliation in Phase 4/5. | Deferred By: `/.recursive/run/55-pi-role-model-package/02-to-be-plan.md`. | Audit Note: proposal path is an input.
- R14 | Status: deferred | Rationale: RED/GREEN evidence is planned for Phase 3. | Deferred By: `/.recursive/run/55-pi-role-model-package/02-to-be-plan.md`. | Audit Note: strict TDD mode is declared.
- R15 | Status: deferred | Rationale: Real Pi install/setup QA is planned for Phase 5. | Deferred By: `/.recursive/run/55-pi-role-model-package/02-to-be-plan.md`. | Audit Note: QA1-QA15 are enumerated.

## Audit Verdict

Audit: PASS

## Traceability

- `R1`: planned package scaffold under `/packages/pi-role-model`.
- `R2`: planned single `/role-model` command dispatcher.
- `R3`: planned external runtime discovery only.
- `R4`: planned downstream OpenAI discovery parsing and provider registration.
- `R5`: planned placeholder auth only, no token invention.
- `R6`: planned setup/status/doctor/alias workflows.
- `R7`: planned `role-model` packaged skill.
- `R8`: planned safety guardrail tests and no launcher/process/auth coupling.
- `R9`: planned provider mapping preserves Role-Model routing authority.
- `R10`: planned unit, fake-runtime, docs, and safety tests.
- `R11`: planned Phase 4 verification and proposal reconciliation.
- `R12`: planned root README `Installation for Pi`.
- `R13`: proposal remains explicit input and Phase 4/5 verification reference.
- `R14`: strict TDD RED/GREEN evidence required before production code acceptance.
- `R15`: Phase 5 QA1-QA15 real Pi install/setup checks required.

## Coverage Gate

- Scope coverage: PASS. All R1-R15 requirements map to planned files, tests, or QA checks.
- Test coverage plan: PASS. Strict TDD slices cover manifest, commands, discovery, provider mapping, workflows, docs, and safety.
- Proposal coverage: PASS. Phase 4/5 explicitly reconcile against the external proposal.
- QA coverage: PASS. Phase 5 QA1-QA15 are explicitly enumerated.

Coverage: PASS

## Approval Gate

- User-approved objective: implement this recursive run in the worktree.
- Plan approval status: PASS.
- Next phase: Phase 3 implementation must start with failing tests and use `recursive-tdd`.

Approval: PASS

## Audit Gate

- Plan is based on locked Phase 0/1 artifacts and the external proposal.
- No production code changed in Phase 2.
- Every requirement is represented in traceability and requirement completion status.

Audit: PASS
