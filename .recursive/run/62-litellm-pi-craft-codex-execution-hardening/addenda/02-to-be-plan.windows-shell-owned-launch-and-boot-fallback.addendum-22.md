Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `02 TO-BE Plan`
Addendum: `22`
Status: `DRAFT`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/02-to-be-plan.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/01.5-root-cause.windows-shell-owned-launch-and-boot-fallback.addendum-22.md`
- `role-model-router/packages/sqlite-memory/src/index.ts`
- `role-model-router/packages/sqlite-memory/test/index.test.ts`
- `role-model-router/apps/launcher/main.go`
- `role-model-router/apps/launcher/main_test.go`
- `role-model-router/apps/runtime-ui/app/root.tsx`
- `role-model-router/apps/runtime-ui/app/root.test.tsx`
- `role-model-router/apps/runtime-ui/app/routes/index.tsx`
- `role-model-router/apps/runtime-ui/app/routes/index.test.tsx`
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.windows-shell-owned-launch-and-boot-fallback.addendum-22.md`
Scope note: This plan supersedes the stale addendum 21 and initial addendum 22 plan where they conflict. The root fix is startup-backfill idempotency plus fast UI liveness gating, not a consumer-specific workaround.

# Addendum 22 Plan: Fast Packaged Startup and Boot-Screen Removal

## TODO

- [x] Define SQLite startup-backfill remediation.
- [x] Define launcher readiness behavior.
- [x] Define runtime UI boot-screen removal.
- [x] Define RED/GREEN test slices.
- [x] Define rebuilt packaged-runtime verification against the live large DB.

## Required Behavior

R22.1 `initializeSqliteMemory()` must not reparse large `runtime_observations.observation_json` payloads on every process startup.

R22.2 Historical observation and telemetry JSON backfills must be durable, receipt-gated migrations. Optional destination columns may remain null without causing future startup backfills.

R22.3 New observation and telemetry writes must continue to populate metadata columns directly so query paths do not regress to JSON parsing.

R22.4 The packaged Windows launcher must open the runtime UI after server liveness/static availability, not after full backend `/healthz` readiness.

R22.5 Windows frontend handoff must preserve the run-59-compatible `cmd /c start <browser-token> --app=...` launch boundary and must not force a dedicated browser profile or `--new-window`.

R22.6 `role-model-router/apps/runtime-ui/app/root.tsx` must not export or render the custom `HydrateFallback` boot card.

R22.7 `role-model-router/apps/runtime-ui/app/routes/index.tsx` must immediately redirect to `/app` using `<Navigate to="/app" replace />`.

R22.8 Rebuilt package verification must time first usable `/app` load from `dist/release/win32-x64/Role-Model.bat` against the operator's existing large runtime DB.

## Implementation Plan

1. Add RED sqlite-memory tests:
   - create a legacy-style DB row with large/minimal `observation_json`, null optional taxonomy metadata, and a telemetry row with nullable execution/taxonomy fields
   - run `initializeSqliteMemory()` once and assert a migration receipt is recorded for observation metadata backfill
   - manually reset nullable optional fields to null while keeping the receipt
   - run `initializeSqliteMemory()` again and assert the fields remain untouched, proving the backfill did not rerun based only on null optional columns
   - assert existing direct-write metadata paths still populate `client_request_id`, `request_class`, `taxonomy_role_id`, and `taxonomy_task_type`
2. Implement sqlite-memory GREEN:
   - introduce explicit migration IDs for observation-metadata backfill and telemetry-metadata backfill
   - add a small helper that checks/inserts `migration_receipts`
   - run the expensive JSON `UPDATE` blocks only when the matching receipt is absent
   - keep schema creation and column additions unconditional/idempotent
3. Add/adjust RED launcher tests:
   - `waitForServerReady()` must call `/health` or equivalent liveness/static-ready endpoint, not `/healthz`
   - Windows browser command remains `cmd /c start <browser-token> --app=...`
   - no PowerShell, no temp profile, no `--new-window`
4. Implement launcher GREEN:
   - change readiness polling to a lightweight liveness endpoint
   - keep graceful backend shutdown and existing non-Windows behavior
5. Add/keep RED runtime UI tests:
   - root source must not contain `export function HydrateFallback`
   - root source must not contain `Runtime boot`, `Opening role-model runtime`, or `Loading runtime shell`
   - index route must import `Navigate`, return `<Navigate to="/app" replace />`, and avoid `useEffect` plus `HydrateFallback`
6. Implement runtime UI GREEN:
   - delete `HydrateFallback`
   - restore immediate index navigation
   - retain the inline local theme bootstrap and no remote font dependency
7. Rebuild:
   - runtime UI production build
   - packaged SEA release
8. Verify rebuilt packaged runtime:
   - ensure no old boot strings remain in `dist/release/win32-x64`
   - launch `Role-Model.bat`
   - measure first `/app` response time and `initializeSqliteMemory()` timing after the migration receipt exists
   - stop the runtime after verification

## Strict TDD Plan

### RED 1: SQLite backfill must be one-time

Command:

```powershell
corepack pnpm --filter @role-model-router/sqlite-memory exec vitest run test/index.test.ts -t "does not repeat observation metadata JSON backfills after migration receipt"
```

Expected RED:

- test fails because `initializeSqliteMemory()` currently reruns JSON backfill whenever optional metadata columns remain null

### GREEN 1: receipt-gated startup backfills

- add migration receipt helpers and backfill IDs
- gate expensive JSON updates behind receipt absence
- rerun focused sqlite-memory tests and confirm PASS

### RED 2: launcher readiness uses liveness, not full backend readiness

Command:

```powershell
go test ./apps/launcher
```

Expected RED:

- test fails while `waitForServerReady()` polls `/healthz`

### GREEN 2: liveness readiness plus shell handoff

- switch `waitForServerReady()` to `/health`
- preserve `cmd /c start <browser-token> --app=...`
- rerun launcher tests and confirm PASS

### RED/GREEN 3: runtime UI boot screen removed

Command:

```powershell
corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/root.test.tsx app/routes/index.test.tsx
```

Expected RED if boot fallback exists:

- tests fail on `HydrateFallback` or boot strings

GREEN:

- root/index tests pass with no boot fallback and immediate navigation

## Verification Plan

Automated focused tests:

- `corepack pnpm --filter @role-model-router/sqlite-memory exec vitest run test/index.test.ts -t "does not repeat observation metadata JSON backfills after migration receipt"`
- `go test ./apps/launcher`
- `corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/root.test.tsx app/routes/index.test.tsx`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/cli-startup-readiness.test.ts test/executable.test.ts`

Build and package:

- `corepack pnpm --filter @role-model-router/runtime-ui run build`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge run package-sea`

Package content checks:

- search `dist/release/win32-x64` for removed strings:
  - `Runtime boot`
  - `Opening role-model runtime`
  - `Loading runtime shell`
  - `role-model-launcher.ps1`

Live rebuilt-runtime timing:

- ensure no old runtime process owns `127.0.0.1:3456`
- launch `D:\DEV\role-model\role-model-router\dist\release\win32-x64\Role-Model.bat`
- record launch timestamp
- poll `http://127.0.0.1:3456/app` until HTTP `200`
- record elapsed time
- run a post-receipt `initializeSqliteMemory()` timing probe against `%LOCALAPPDATA%\Role Model Runtime`
- stop the runtime after verification

## Out Of Scope

- Pi provider code changes
- Craft provider code changes
- routing/provider semantics unrelated to startup
- deleting the operator's historical runtime telemetry DB
- changing the OpenAI/Codex execution transport

## Requirement Completion Status

- `R22.1` | `planned` | Make SQLite startup backfills receipt-gated and non-repeating.
- `R22.2` | `planned` | Treat null optional metadata as valid after migration receipt.
- `R22.3` | `planned` | Preserve direct metadata writes.
- `R22.4` | `planned` | Open UI after liveness/static readiness instead of `/healthz`.
- `R22.5` | `planned` | Preserve run-59 Windows shell browser handoff.
- `R22.6` | `planned` | Remove runtime UI boot fallback.
- `R22.7` | `planned` | Restore immediate index redirect.
- `R22.8` | `planned` | Verify rebuilt package against live large DB.

## Coverage Gate

- [x] SQLite startup remediation is specific and testable.
- [x] Launcher readiness remediation is specific and testable.
- [x] Boot-screen removal is specific and testable.
- [x] TDD RED/GREEN commands are defined.
- [x] Rebuilt package timing proof is required.

Coverage: PASS

## Approval Gate

- [x] Plan targets the confirmed root cause rather than another guessed browser workaround.
- [x] Plan avoids Pi/Craft-specific changes.
- [x] Plan is ready for strict-TDD implementation.

Approval: PASS
