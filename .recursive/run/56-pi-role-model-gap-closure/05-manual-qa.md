Run: `/.recursive/run/56-pi-role-model-gap-closure/`
Phase: `05 Manual QA`
Status: `LOCKED`
LockedAt: `2026-06-22T14:05:52Z`
LockHash: `0859d1a6dc26aec1594caab354369a5cd8d6313a3dc9126d8f92a4aa89c69bc4`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/56-pi-role-model-gap-closure/00-requirements.md`
- `/.recursive/run/56-pi-role-model-gap-closure/01-as-is.md`
- `/.recursive/run/56-pi-role-model-gap-closure/02-to-be-plan.md`
- `/.recursive/run/56-pi-role-model-gap-closure/03-implementation-summary.md`
- `/.recursive/run/56-pi-role-model-gap-closure/04-test-summary.md`
Outputs:
- `/.recursive/run/56-pi-role-model-gap-closure/05-manual-qa.md`
QA Execution Mode: `agent-operated`
Audit Result: `PASS_WITH_PI_CLI_CAVEAT`

## TODO

- [x] Connect to externally running Role-Model runtime
- [x] Probe `/healthz`, `/api/version`, `/api/role-model/downstream/openai`, and `/v1/models`
- [x] Install the local worktree `pi-role-model` package into real Pi
- [x] Verify Pi can list the installed package
- [x] Verify Pi loads the run 56 extension command and skill
- [x] Verify provider registration and command surface through Pi RPC
- [x] Verify alias selection changes Pi active model
- [x] Verify explicit and selected-alias prompt traffic through Role-Model
- [x] Verify blocked remote endpoint failure
- [x] Verify auth-required runtime failure with a fake local runtime
- [x] Verify package remove leaves external runtime untouched, then reinstall run 56 package
- [x] Re-run package build and tests after the Phase 5 fix

## Environment

| Item | Evidence | Result |
| --- | --- | --- |
| Pi executable | `evidence/logs/phase5/environment-and-runtime.log` | PASS: `D:\pi\node_modules\.bin\pi.ps1` |
| Role-Model endpoint | `evidence/logs/phase5/environment-and-runtime.log` | PASS: `http://127.0.0.1:3456` |
| `/healthz` | `evidence/logs/phase5/environment-and-runtime.log` | PASS: reachable; runtime status was `degraded` because local vendors were inactive, but remote-only routing was usable |
| `/api/version` | `evidence/logs/phase5/environment-and-runtime.log` | PASS: version `1.0` |
| `/api/role-model/downstream/openai` | `evidence/logs/phase5/environment-and-runtime.log` | PASS |
| `/v1/models` | `evidence/logs/phase5/environment-and-runtime.log` | PASS |

## Pi Package Checks

| Check | Evidence | Result |
| --- | --- | --- |
| Install local package | `evidence/logs/phase5/pi-install-and-list.log`, `evidence/logs/phase5/pi-remove-runtime-untouched-reinstall.log` | PASS: package installed from the run 56 worktree |
| List installed package | `evidence/logs/phase5/pi-install-and-list.log`, `evidence/logs/phase5/pi-remove-runtime-untouched-reinstall.log` | PASS_WITH_PI_CLI_CAVEAT: `pi list` shows the package, then exits with a Windows libuv assertion |
| Remove stale run 55 package | `evidence/logs/phase5/pi-remove-stale-run55.log` | PASS: clean QA state contained only run 56 package afterward |
| Load extension command | `evidence/logs/phase5/pi-rpc-single-status.log` | PASS: command `role-model` loaded from `56-pi-role-model-gap-closure` |
| Load skill | `evidence/logs/phase5/pi-rpc-single-status.log` | PASS: `skill:role-model` loaded from `56-pi-role-model-gap-closure` |
| Register provider | `evidence/logs/phase5/pi-rpc-command-checklist.log` | PASS: `/role-model setup` configured provider at `http://127.0.0.1:3456` |
| List provider models | `evidence/logs/phase5/pi-list-models-after-compat.log` | PASS_WITH_PI_CLI_CAVEAT: Role-Model models printed; command then exited with the same libuv assertion |

## Command Surface Checks

All command checks were driven through Pi RPC because `pi -p "/role-model status"` treats slash-command text as a model prompt instead of executing extension commands.

| Command | Evidence | Result |
| --- | --- | --- |
| `/role-model setup` | `evidence/logs/phase5/pi-rpc-command-checklist.log` | PASS |
| `/role-model status` | `evidence/logs/phase5/pi-rpc-command-checklist.log` | PASS: endpoint, version, alias count, selected alias, provider state, auth, trust, fallback, warnings |
| `/role-model doctor` | `evidence/logs/phase5/pi-rpc-command-checklist.log` | PASS: healthy-runtime checks passed, 19 models reported |
| `/role-model ui` | `evidence/logs/phase5/pi-rpc-command-checklist.log` | PASS: reported runtime URL only; did not launch or manage runtime |
| `/role-model alias list` | `evidence/logs/phase5/pi-rpc-command-checklist.log` | PASS: aliases show ready/recommended/selected indicators |
| `/role-model alias recommended` | `evidence/logs/phase5/pi-rpc-command-checklist.log` | PASS |
| `/role-model alias use baseline.decision-only` | `evidence/logs/phase5/pi-rpc-command-checklist.log` | PASS: selected alias and active model `role-model/baseline.decision-only` |
| `/role-model alias refresh` | `evidence/logs/phase5/pi-rpc-command-checklist.log` | PASS |
| `/role-model alias current` | `evidence/logs/phase5/pi-rpc-command-checklist.log` | PASS: selected alias remained `baseline.decision-only` |

## Prompt Reality Checks

Phase 5 initially found a real compatibility defect:

- `evidence/logs/phase5/pi-explicit-role-model-prompt.log` failed with Role-Model rejecting Pi's `developer` message role.
- The run returned to Phase 3 with a RED test in `evidence/logs/phase3/red/phase5-developer-role-compat-red.log`.
- The fix set `compat.supportsDeveloperRole: false` on Role-Model provider models and selected alias model objects.
- GREEN evidence is in `evidence/logs/phase3/green/phase5-developer-role-compat-green.log`.
- Build/test reruns after the fix are in `evidence/logs/phase3/final/build-after-phase5-compat.log` and `evidence/logs/phase3/final/test-after-phase5-compat.log`.

| Prompt | Evidence | Result |
| --- | --- | --- |
| Explicit `--model role-model/baseline.decision-only` | `evidence/logs/phase5/pi-explicit-role-model-prompt-after-compat.log` | PASS: response text `ROLE_MODEL_OK`, exit 0 |
| Selected alias without `--model` | `evidence/logs/phase5/pi-selected-alias-prompt.log` | PASS: Pi used `provider=role-model`, `model=baseline.decision-only`, response text `ROLE_MODEL_SELECTED_OK`, exit 0 |

## Safety And Negative Checks

| Check | Evidence | Result |
| --- | --- | --- |
| Block remote endpoint by default | `evidence/logs/phase5/pi-remote-endpoint-blocked.log` | PASS: `state: blocked-remote`; no trusted allow flag set |
| Required auth fails closed | `evidence/logs/phase5/pi-auth-required-fake-runtime.log` | PASS: fake local runtime with `authentication.required: true` reported `state: auth-required` |
| No raw credential values in command outputs | `evidence/logs/phase5/secret-grep-command-logs.log` | PASS_WITH_NOTE: only matches were the literal placeholder inside the fake-runtime test script preamble, not package UI command output |
| Package remove leaves runtime untouched | `evidence/logs/phase5/pi-remove-runtime-untouched-reinstall.log` | PASS: `/healthz` responded before and after `pi remove`; package was reinstalled after the check |
| Runtime lifecycle boundary | command logs and package safety tests | PASS: package never started, stopped, installed, updated, or launched Role-Model |

## Final Automated Checks

| Check | Evidence | Result |
| --- | --- | --- |
| Package build after Phase 5 fix | `evidence/logs/phase5/final-package-build.log` | PASS: `EXIT_CODE=0` |
| Package tests after Phase 5 fix | `evidence/logs/phase5/final-package-test.log` | PASS: 8 files / 30 tests, `EXIT_CODE=0` |

## Pi CLI Caveat

Several Pi commands completed their observable work and then exited with:

`Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c, line 76`

Observed on:

- `pi install` during the first install transcript;
- `pi list`;
- `pi --help`;
- `pi --list-models role-model`;
- `pi remove`.

This appears to be a Windows Pi CLI process-exit/libuv issue outside `packages/pi-role-model`: the package state changed correctly, command output was printed, RPC command execution worked, prompts completed with exit 0, and the external Role-Model runtime remained reachable. The caveat is recorded rather than hidden.

## Acceptance

Phase 5 satisfies `R13`: real local Pi installed and loaded the worktree package, loaded the skill, registered the provider from a real external Role-Model runtime, executed the required command surface, listed Role-Model models, completed explicit and selected-alias prompts through Role-Model, verified remote endpoint blocking, verified auth-required fail-closed behavior, verified no credential output in package UI logs, and iterated on a real Pi defect with TDD before passing.

Approval: `PASS_WITH_PI_CLI_CAVEAT`
