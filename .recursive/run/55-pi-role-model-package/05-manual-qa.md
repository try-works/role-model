Run: `/.recursive/run/55-pi-role-model-package/`
Phase: `05 Manual QA`
Status: `LOCKED`
LockedAt: `2026-06-22T11:57:50Z`
LockHash: `431441bfc71724b32e42c3813a18229dcde52d28f9725e5661fcefdfb9c3f663`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/55-pi-role-model-package/00-requirements.md`
- `/.recursive/run/55-pi-role-model-package/02-to-be-plan.md`
- `/.recursive/run/55-pi-role-model-package/03-implementation-summary.md`
- `/.recursive/run/55-pi-role-model-package/04-test-summary.md`
- External audited proposal: `D:/DEV/role-model-proposals/14-pi-role-model-package-proposal-audited.md`
Outputs:
- `/.recursive/run/55-pi-role-model-package/05-manual-qa.md`
- `/.recursive/run/55-pi-role-model-package/evidence/logs/phase5/`
Scope note: Phase 5 drove the real local Pi executable against the local `pi-role-model` package and the already-running Role-Model runtime.

# Phase 5 Manual QA

## TODO

- [x] Locate Pi executable and capture identifying output.
- [x] Confirm Role-Model runtime is externally available before package setup.
- [x] Confirm downstream OpenAI discovery is available.
- [x] Install the local package through Pi.
- [x] Verify Pi can load the package skill.
- [x] Verify Pi can invoke package commands.
- [x] Verify Pi sees `role-model` provider models after setup/refresh.
- [x] Verify alias inspection and alias selection.
- [x] Send a non-destructive prompt through the Role-Model alias.
- [x] Confirm Role-Model recorded the Pi-originated request.
- [x] Review QA logs for secret-safety and managed-runtime boundary.
- [x] Repair Phase 5 defects using RED/GREEN TDD evidence.
- [x] Rerun final automated verification.

## QA Execution Record

- QA Execution Mode: `agent-operated`
- Agent Executor: Codex
- Tools Used: PowerShell shell commands, apply_patch, Pi CLI, local Role-Model HTTP endpoints, pnpm/Vitest/TypeScript validation
- Date: `2026-06-22`
- Worktree: `D:/DEV/role-model/.worktrees/55-pi-role-model-package`
- Branch: `recursive/55-pi-role-model-package`
- Pi executable: `D:/pi/node_modules/.bin/pi.ps1`
- Role-Model runtime endpoint: `http://127.0.0.1:3456`
- Package install command: `pi install ./packages/pi-role-model`
- User Sign-Off Required: no, agent-operated QA requested by user in chat.
- User Sign-Off Status: not required for this phase mode.

Observed Pi CLI caveat:

- `pi install`, `pi list`, and `pi --list-models role-model` printed successful domain output and then exited with Windows libuv assertion `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c, line 76`.
- The assertion also reproduces for Pi list/model commands outside package code paths. Package behavior was evaluated from the command output, package listing, model listing, successful command invocations, successful prompt smoke, and Role-Model runtime receipts.

## QA Scenarios and Results

| Check | Result | Evidence |
| --- | --- | --- |
| `QA1` Pi executable available | PASS | `evidence/logs/phase5/pi-help.log` |
| `QA2` Role-Model router available outside Pi package | PASS | Runtime already served `http://127.0.0.1:3456`; package did not start it. |
| `QA3` Role-Model runtime running | PASS | `evidence/logs/phase5/runtime-healthz-receipt.log`, `evidence/logs/phase5/runtime-version-receipt.log` |
| `QA4` Downstream discovery available | PASS | `evidence/logs/phase5/runtime-downstream-openai-receipt.log` |
| `QA5` Pi installs local package | PASS with Pi teardown warning | `evidence/logs/phase5/pi-install-package-final.log`, `evidence/logs/phase5/pi-list-receipt.log` |
| `QA6` Pi can read/load package skill | PASS | `evidence/logs/phase5/pi-skill-load-receipt.log` |
| `QA7` Pi can invoke package commands | PASS | `evidence/logs/phase5/pi-command-help-receipt.log`, `pi-command-status-receipt.log`, `pi-command-doctor-receipt.log`, `pi-command-ui-receipt.log` |
| `QA8` Pi configures Role-Model endpoint | PASS | `evidence/logs/phase5/pi-command-setup-receipt.log`, `runtime-downstream-openai-receipt.log` |
| `QA9` Pi registers/refreshes provider models | PASS with Pi teardown warning | `evidence/logs/phase5/pi-list-models-role-model-receipt.log`, `pi-command-alias-refresh-receipt.log` |
| `QA10` Pi can inspect aliases | PASS | `evidence/logs/phase5/pi-command-alias-list-receipt.log`, `pi-command-alias-recommended-receipt.log` |
| `QA11` Pi can choose alias | PASS | `evidence/logs/phase5/pi-command-alias-use-receipt.log`, `pi-alias-state-final.json` |
| `QA12` Pi can send request through alias | PASS | `evidence/logs/phase5/pi-role-model-prompt-smoke.log` returned `ROLE_MODEL_PI_SMOKE_OK`. |
| `QA13` Role-Model records Pi request | PASS | `evidence/logs/phase5/runtime-pi-smoke-request-receipt.json`; request id `req-30486965-42e8-4221-a36d-784910484281`, decision id `decision-req-30486965-42e8-4221-a36d-784910484281`. |
| `QA14` Secret safety preserved | PASS | Command outputs were silent or non-secret; telemetry evidence was redacted for credential-label-like endpoint text. |
| `QA15` Managed runtime boundary preserved | PASS | Safety tests and QA commands show no launcher/process start; runtime was pre-existing external service. |

Prompt smoke result:

```text
Command: pi --no-builtin-tools --no-tools --model role-model/default.decision-only -p Reply with exactly ROLE_MODEL_PI_SMOKE_OK
ExitCode: 0
Output:
ROLE_MODEL_PI_SMOKE_OK
```

## Evidence and Artifacts

Primary Pi QA evidence:

- `/.recursive/run/55-pi-role-model-package/evidence/logs/phase5/pi-help.log`
- `/.recursive/run/55-pi-role-model-package/evidence/logs/phase5/pi-install-package-final.log`
- `/.recursive/run/55-pi-role-model-package/evidence/logs/phase5/pi-list-receipt.log`
- `/.recursive/run/55-pi-role-model-package/evidence/logs/phase5/pi-skill-load-receipt.log`
- `/.recursive/run/55-pi-role-model-package/evidence/logs/phase5/pi-list-models-role-model-receipt.log`
- `/.recursive/run/55-pi-role-model-package/evidence/logs/phase5/pi-command-help-receipt.log`
- `/.recursive/run/55-pi-role-model-package/evidence/logs/phase5/pi-command-status-receipt.log`
- `/.recursive/run/55-pi-role-model-package/evidence/logs/phase5/pi-command-doctor-receipt.log`
- `/.recursive/run/55-pi-role-model-package/evidence/logs/phase5/pi-command-setup-receipt.log`
- `/.recursive/run/55-pi-role-model-package/evidence/logs/phase5/pi-command-ui-receipt.log`
- `/.recursive/run/55-pi-role-model-package/evidence/logs/phase5/pi-command-alias-list-receipt.log`
- `/.recursive/run/55-pi-role-model-package/evidence/logs/phase5/pi-command-alias-recommended-receipt.log`
- `/.recursive/run/55-pi-role-model-package/evidence/logs/phase5/pi-command-alias-use-receipt.log`
- `/.recursive/run/55-pi-role-model-package/evidence/logs/phase5/pi-command-alias-refresh-receipt.log`
- `/.recursive/run/55-pi-role-model-package/evidence/logs/phase5/pi-alias-state-final.json`
- `/.recursive/run/55-pi-role-model-package/evidence/logs/phase5/pi-role-model-prompt-smoke.log`

Runtime QA evidence:

- `/.recursive/run/55-pi-role-model-package/evidence/logs/phase5/runtime-healthz-receipt.log`
- `/.recursive/run/55-pi-role-model-package/evidence/logs/phase5/runtime-version-receipt.log`
- `/.recursive/run/55-pi-role-model-package/evidence/logs/phase5/runtime-downstream-openai-receipt.log`
- `/.recursive/run/55-pi-role-model-package/evidence/logs/phase5/runtime-requests-after-pi-smoke.log`
- `/.recursive/run/55-pi-role-model-package/evidence/logs/phase5/runtime-telemetry-requests-after-pi-smoke.log`
- `/.recursive/run/55-pi-role-model-package/evidence/logs/phase5/runtime-router-decisions-after-pi-smoke.log`
- `/.recursive/run/55-pi-role-model-package/evidence/logs/phase5/runtime-pi-smoke-request-receipt.json`

Final automated verification:

- `/.recursive/run/55-pi-role-model-package/evidence/logs/phase5/pi-role-model-test-final-2.log`
- `/.recursive/run/55-pi-role-model-package/evidence/logs/phase5/pi-role-model-build-final-2.log`
- `/.recursive/run/55-pi-role-model-package/evidence/logs/phase5/schemas-validate-final-2.log`
- `/.recursive/run/55-pi-role-model-package/evidence/logs/phase5/runtime-downstream-openai-discovery-final-2.log`

Late RED/GREEN repairs:

- `/.recursive/run/55-pi-role-model-package/evidence/logs/red/pi-list-models-required-fields-red.log`
- `/.recursive/run/55-pi-role-model-package/evidence/logs/green/pi-list-models-required-fields-green.log`
- `/.recursive/run/55-pi-role-model-package/evidence/logs/red/pi-command-handler-shape-red.log`
- `/.recursive/run/55-pi-role-model-package/evidence/logs/green/pi-command-handler-shape-green.log`
- `/.recursive/run/55-pi-role-model-package/evidence/logs/red/pi-alias-store-red.log`
- `/.recursive/run/55-pi-role-model-package/evidence/logs/green/pi-alias-store-green.log`
- `/.recursive/run/55-pi-role-model-package/evidence/logs/red/pi-command-requirement-surface-red.log`
- `/.recursive/run/55-pi-role-model-package/evidence/logs/green/pi-command-requirement-surface-green.log`
- `/.recursive/run/55-pi-role-model-package/evidence/logs/red/pi-package-readme-red.log`
- `/.recursive/run/55-pi-role-model-package/evidence/logs/green/pi-package-readme-green.log`

## User Sign-Off

- QA Execution Mode: `agent-operated`
- Approved by: not required for agent-operated QA
- Date: `2026-06-22`
- Notes: The user explicitly requested this run be implemented in the worktree and required Phase 5 to drive Pi install/setup.

## Audit Context

- Audit Execution Mode: `self-audit`
- Subagent Availability: `unavailable`
- Subagent Capability Probe: no delegated subagent tool was active in the current tool surface during this phase.
- Delegation Decision Basis: Phase 5 depends on local Pi/runtime command execution and captured logs.
- Delegation Override Reason: not applicable.
- Audit Inputs Provided: locked requirements, implementation/test summaries, proposal, Pi command receipts, Role-Model runtime receipts, and final test logs.

## Effective Inputs Re-read

- `/.recursive/run/55-pi-role-model-package/00-requirements.md`
- `/.recursive/run/55-pi-role-model-package/02-to-be-plan.md`
- `/.recursive/run/55-pi-role-model-package/04-test-summary.md`
- `/README.md`
- `/packages/pi-role-model/README.md`
- `/packages/pi-role-model/src/commands.ts`
- `/packages/pi-role-model/src/downstream-openai.ts`
- `/packages/pi-role-model/src/extension.ts`
- `/packages/pi-role-model/src/alias-store.ts`
- `/packages/pi-role-model/skills/role-model/SKILL.md`
- Pi package docs/examples under `D:/pi/node_modules/@earendil-works/pi-coding-agent`

## Earlier Phase Reconciliation

- Phase 4 was accurate for the pre-QA automated scope but did not include failures only observable in real Pi.
- Phase 5 found and repaired three Pi-integration defects: missing Pi provider model fields, wrong command handler property, and missing default alias persistence.
- Phase 5 also found a requirements coverage gap for `ui`, `alias recommended`, `alias use`, and `alias refresh`, then repaired it with RED/GREEN coverage.
- Final automated verification supersedes the Phase 4 counts: package tests now pass with 6 files and 12 tests.
- The external proposal remains reconciled: this run completes proposal Phase 0/1 external-runtime package scope and keeps managed runtime, credential sync, benchmarks, and npm publication deferred.

## Subagent Contribution Verification

- No delegated contribution was used.
- Self-audit checked package behavior through Pi CLI receipts and Role-Model runtime receipts.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/55-pi-role-model-package/00-requirements.md`
- `/.recursive/run/55-pi-role-model-package/01-as-is.md`
- `/.recursive/run/55-pi-role-model-package/02-to-be-plan.md`
- `/.recursive/run/55-pi-role-model-package/03-implementation-summary.md`
- `/.recursive/run/55-pi-role-model-package/04-test-summary.md`
- `/.recursive/run/55-pi-role-model-package/evidence/logs/phase4/`

## Worktree Diff Audit

- Baseline type: `commit`
- Baseline reference: `21af81ba379cd0f97f4ffcc63090b8e9cef243b6`
- Comparison reference: `working-tree`
- Normalized baseline: `21af81ba379cd0f97f4ffcc63090b8e9cef243b6`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 21af81ba379cd0f97f4ffcc63090b8e9cef243b6`
- Product/docs changed files remain limited to `/README.md` and `/packages/pi-role-model/`.
- Generated dependency folders were removed after verification.

Final product/docs changed files:

- `/README.md`
- `/packages/pi-role-model/README.md`
- `/packages/pi-role-model/extensions/role-model.ts`
- `/packages/pi-role-model/package.json`
- `/packages/pi-role-model/skills/role-model/SKILL.md`
- `/packages/pi-role-model/src/alias-store.ts`
- `/packages/pi-role-model/src/commands.ts`
- `/packages/pi-role-model/src/config.ts`
- `/packages/pi-role-model/src/downstream-openai.ts`
- `/packages/pi-role-model/src/extension.ts`
- `/packages/pi-role-model/src/provider-registration.ts`
- `/packages/pi-role-model/src/runtime-discovery.ts`
- `/packages/pi-role-model/src/types.ts`
- `/packages/pi-role-model/test/alias-store.test.ts`
- `/packages/pi-role-model/test/commands.test.ts`
- `/packages/pi-role-model/test/docs-and-safety.test.ts`
- `/packages/pi-role-model/test/downstream-openai.test.ts`
- `/packages/pi-role-model/test/extension.test.ts`
- `/packages/pi-role-model/test/package-manifest.test.ts`
- `/packages/pi-role-model/tsconfig.json`

## Gaps Found

- Real Pi model listing crashed before the first Phase 5 repair because registered model records were missing fields Pi's list renderer expects. Fixed.
- Real Pi command invocation crashed before the second Phase 5 repair because Pi expects command config `handler`, not `run`. Fixed.
- Alias selection initially had no default persistence adapter outside tests. Fixed.
- Locked requirements included `ui`, `alias recommended`, `alias use`, and `alias refresh`; the initial implementation had only `alias choose/current`. Fixed.
- Pi on Windows emits a libuv teardown assertion after some successful commands. Not fixed in this package; retained as an external Pi CLI warning.
- Non-interactive Pi prompt mode does not print `ctx.ui.notify` command notification text even when command handlers exit `0`. Package command behavior is verified by Pi exit codes, alias state, model registry output, and automated command tests.

## Repair Work Performed

- Added required Pi model fields `input` and `cost` to provider mapping.
- Changed extension command registration from `run` to `handler`.
- Added file-backed alias persistence at `~/.pi/agent/role-model.json`.
- Added command support for `/role-model ui`, `/role-model alias recommended`, `/role-model alias use <alias>`, and `/role-model alias refresh`.
- Added `packages/pi-role-model/README.md` and updated root README/skill command docs.
- Reran final tests and Pi QA after repairs.

## Requirement Completion Status

- R1 | Status: verified | Evidence: package manifest, package README, Pi install receipt, package tests.
- R2 | Status: verified | Evidence: `pi-command-requirement-surface-green.log`, command receipts for help/status/doctor/ui/alias commands.
- R3 | Status: verified | Evidence: runtime health/version/discovery receipts; no package-managed runtime process.
- R4 | Status: verified | Evidence: `pi-list-models-role-model-receipt.log`, provider mapping tests.
- R5 | Status: verified | Evidence: placeholder-auth tests, redacted QA logs, no token requirement during local setup.
- R6 | Status: verified | Evidence: setup/status/doctor/alias command tests and Pi command receipts.
- R7 | Status: verified | Evidence: `pi-skill-load-receipt.log`, skill file, package manifest.
- R8 | Status: verified | Evidence: safety test, QA15 no launcher/process start.
- R9 | Status: verified | Evidence: provider models are discovery-derived; prompt smoke routed through Role-Model runtime.
- R10 | Status: verified | Evidence: final package tests pass, 6 files and 12 tests.
- R11 | Status: verified | Evidence: final package/build/schema/runtime test logs and real Pi QA.
- R12 | Status: verified | Evidence: root README `Installation for Pi`, package README, docs test.
- R13 | Status: verified | Evidence: this QA record reconciles proposal scope and deferrals.
- R14 | Status: verified | Evidence: RED/GREEN logs for original implementation and all Phase 5 repairs.
- R15 | Status: verified | Evidence: QA1-QA15 checklist above, Pi prompt smoke, Role-Model request receipt.

## Audit Verdict

Audit: PASS

## Traceability

- `R1` -> package scaffold, package README, Pi install/list receipts.
- `R2` -> one `role-model` command dispatcher and Pi command receipts.
- `R3` -> external runtime health/version/discovery receipts.
- `R4` -> Role-Model provider model list and discovery-derived provider mapping.
- `R5` -> placeholder auth and secret-safety review.
- `R6` -> setup/status/doctor/ui/alias workflows and alias state receipt.
- `R7` -> package skill load receipt.
- `R8` -> safety tests and no managed runtime process.
- `R9` -> Role-Model remains routing authority; prompt smoke traversed Role-Model.
- `R10` -> package tests and fake-runtime/unit coverage.
- `R11` -> final verification commands and real Pi QA evidence.
- `R12` -> root README `Installation for Pi` and package README.
- `R13` -> proposal phase reconciliation and explicit deferrals.
- `R14` -> RED/GREEN logs for implementation and Phase 5 repairs.
- `R15` -> QA1-QA15 real Pi checklist.
- Proposal Phase 0/1 local package, extension, skill, setup, provider, aliases, docs, and QA are implemented and verified.
- Proposal Phase 2 managed runtime remains deferred by `OOS1` through `OOS5`.
- Proposal Phase 3 credential sync remains deferred by `OOS6` and `OOS7`.
- Proposal Phase 4 benchmark workflows remain deferred by `OOS9`.
- Proposal Phase 5 publication remains deferred by `OOS12`.
- Real Pi setup path was driven through install, command invocation, model listing, alias selection, prompt execution, and Role-Model runtime observation.

## Coverage Gate

Coverage: PASS

- QA1-QA15: PASS, with Pi teardown warning on install/list/model-list commands after successful useful output.
- Final package tests: PASS, 6 files and 12 tests.
- Final package TypeScript build: PASS.
- Final schema validation: PASS.
- Final runtime downstream discovery test: PASS.
- Secret review: PASS after redacting credential-label-like endpoint text from telemetry evidence.
- Managed runtime boundary: PASS.

## Approval Gate

Approval: PASS

- The implementation satisfies the first-release external-runtime `pi-role-model` package scope.
- Real Pi can install the package, load the skill, invoke package commands, list Role-Model models, select an alias, and send a prompt through the selected Role-Model alias.
- Role-Model recorded the Pi-originated prompt with a request id and routing decision id.
- Remaining future proposal scope is explicitly deferred and not accidentally implemented.
