Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `02 TO-BE Plan`
Addendum: `21`
Status: `DRAFT`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/02-to-be-plan.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/01.5-root-cause.windows-packaged-launch-regression.addendum-21.md`
- `role-model-router/apps/launcher/main.go`
- `role-model-router/apps/launcher/main_test.go`
- `role-model-router/apps/runtime-host-bridge/src/package-sea.ts`
- `role-model-router/apps/runtime-host-bridge/test/executable.test.ts`
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.windows-packaged-launch-regression.addendum-21.md`
Scope note: This addendum defines the strict-TDD remediation for the Windows packaged runtime startup regression introduced in the run-62 launcher path and amplified by later local wrapper experiments.

# Addendum 21 Plan: Windows Packaged Launcher Regression

## TODO

- [x] Define the minimum Windows-specific remediation boundary.
- [x] Define RED tests before launcher/package edits.
- [x] Define rebuilt-runtime verification criteria.
- [x] Keep the fix scoped away from unrelated runtime UI work.

## Required Behavior

R21.1 The packaged Windows launcher must not depend on a PowerShell sidecar wrapper to open the frontend.

R21.2 The packaged Windows launcher path must not force a dedicated Chromium temp profile for normal startup.

R21.3 The packaged Windows launcher must use a shell-handoff browser launch model so the first real `/app` request is not blocked behind the managed temp-profile startup path.

R21.4 The fix must remove the dirty launcher boot/handoff layer from the packaged path.

R21.5 Verification must use a rebuilt runtime package and capture first-page startup timing from the rebuilt artifact.

R21.6 The Windows handoff command must use the proven fast shell token form (`start <browser-token> --app=...`) rather than `start "" <full-browser-path> --app=... --new-window ...`.

## Implementation Plan

1. Add RED tests in:
   - `role-model-router/apps/launcher/main_test.go`
   - `role-model-router/apps/runtime-host-bridge/test/executable.test.ts`
2. Refactor the Windows launcher path in `role-model-router/apps/launcher/main.go`:
   - remove the dirty boot/handoff server path
   - remove the wrapper-only `ROLE_MODEL_LAUNCHER_SKIP_FRONTEND` behavior
   - replace the dedicated-profile child launch with the run-59-style shell token handoff command path
3. Simplify `role-model-router/apps/runtime-host-bridge/src/package-sea.ts`:
   - generate `Role-Model.bat` that invokes `role-model-launcher.exe` directly
   - stop generating `role-model-launcher.ps1`
4. Rebuild the packaged runtime and verify the packaged release folder contains the new launcher files, not the wrapper sidecar.

## Strict TDD Plan

RED 1: launcher command construction

- add a failing Go test proving Windows frontend launch uses shell handoff
- assert the command contains:
  - `cmd`
  - `/c`
  - `start`
  - `msedge`
  - `--app=http://127.0.0.1:3456/app`
- assert it does not contain:
  - `powershell`
  - `--user-data-dir=`
  - `--new-window`

GREEN 1:

- implement a Windows shell-handoff frontend command helper and switch launcher startup to it

RED 2: packaging wrapper removal

- add a failing packaging test proving the generated batch file:
  - launches `role-model-launcher.exe` directly
  - does not mention `role-model-launcher.ps1`
  - does not mention `powershell`

GREEN 2:

- remove PowerShell wrapper generation from `package-sea.ts`
- keep Windows release packaging otherwise unchanged

## Verification Plan

Automated:

- `go test ./role-model-router/apps/launcher`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/executable.test.ts`

Rebuilt runtime:

1. rebuild the packaged runtime
2. confirm `role-model-router/dist/release/win32-x64/Role-Model.bat` points directly at `role-model-launcher.exe`
3. confirm no `role-model-launcher.ps1` is required by the packaged path
4. launch the rebuilt package
5. time first page load by comparing launcher start to first real `/app` request in the runtime request log
6. confirm the extra launcher boot/handoff screen is gone from the packaged path
7. confirm the remaining packaged startup surface is only the runtime UI hydration fallback, not the removed launcher boot screen

## Out Of Scope

- changing Pi
- changing Craft
- changing provider routing logic
- changing runtime request/telemetry semantics unrelated to startup
- removing the runtime UI hydration fallback unless startup evidence later proves it is itself a separate regression

## Coverage Gate

- [x] Fix boundary is Windows-specific and regression-specific.
- [x] RED/GREEN slices exist before production edits.
- [x] Rebuilt-runtime verification is explicit.
- [x] Unrelated runtime UI/provider work is excluded.

Coverage: PASS

## Approval Gate

- [x] Plan is specific and verifiable.
- [x] Plan is narrow enough to implement safely in the dirty main tree.
- [x] Plan is ready for TDD-backed implementation.

Approval: PASS
