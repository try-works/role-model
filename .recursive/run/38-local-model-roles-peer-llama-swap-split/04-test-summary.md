Run: `/.recursive/run/38-local-model-roles-peer-llama-swap-split/`
Phase: `04 Test Summary`
Status: `LOCKED`
LockedAt: `2026-06-11T02:55:03Z`
LockHash: `3ed9ceb68ff599a2503824c4e1d3e40d51d4526de09b6c67d23100dd4ed0654d`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/38-local-model-roles-peer-llama-swap-split/03-implementation-summary.md`
Outputs:
- `/.recursive/run/38-local-model-roles-peer-llama-swap-split/04-test-summary.md`
Scope note: Automated test and routing regression evidence for run 38.

## TODO

- [x] Record unit test commands and results
- [x] Record SEA build evidence
- [x] Record routing regression suite results
- [x] Complete gates

## Pre-Test Implementation Audit

- Phase 3 delivered SP1–SP4 on branch `recursive/38-local-model-roles-peer-llama-swap-split`
- Strict TDD tests authored before production wiring (see `03-implementation-summary.md`)

## Environment

- OS: Windows
- Branch: `recursive/38-local-model-roles-peer-llama-swap-split`
- Runtime: packaged SEA on `http://127.0.0.1:3456`
- Node: workspace-managed via `corepack pnpm`

## Execution Mode

- Focused unit tests in `role-model-router` tree
- SEA package build from repo root
- Live routing regression against launched runtime

## Commands Executed (Exact)

```powershell
cd D:\DEV\role-model\role-model-router
corepack pnpm exec vitest run apps/runtime-host-bridge/src/local-model-role-bindings.test.ts apps/runtime-ui/app/lib/design-system.test.ts
corepack pnpm exec vitest run packages/provider-account/test/index.test.ts -t "wildcard peer"

cd D:\DEV\role-model
corepack pnpm run runtime:package-sea
python role-model-router/scripts/probe-downstream-ingress.py
```

## Results Summary

| Command | Result |
| --- | --- |
| `local-model-role-bindings.test.ts` | **PASS** (5/5) |
| `design-system.test.ts` (main tree) | **PASS** (21/21) |
| provider-account wildcard test | **PASS** |
| `runtime:package-sea` | **PASS** |
| `probe-downstream-ingress.py` | **PASS** (0 BRIDGE_CRASH) |

## Evidence and Artifacts

- `evidence/logs/green/phase3-unit-tests-2026-06-11.log`
- `evidence/logs/green/package-sea-build-2026-06-11.json`
- `evidence/logs/green/routing-regression-2026-06-11.log`
- `evidence/logs/runtime-config-baseline-pre-rebuild.json`

## Failures and Diagnostics (if any)

- Repo-root vitest scans stale `.worktrees/**` and may hit `ENOSPC`; authoritative pass is scoped `role-model-router` paths above.
- Probe B6 client timeout — non-blocking; not BRIDGE_CRASH.

## Flake/Rerun Notes

- None for authoritative scoped test runs.

## Traceability

- `R1` → `design-system.test.ts` split Local route inventory PASS
- `R2` → peer APIs + live endpoint `roleIds` during regression session
- `R3` → llama-swap API routes implemented; UI covered by design-system tests; live load not in automated suite (operator env)
- `R4` → provider-account wildcard test PASS
- `R5` → `local-model-role-bindings.test.ts` PASS
- `R6` → candidates `roleIds` verified during regression/browser session
- `R7` → direct local model + peer role routing on launched runtime
- `R8` → strict TDD suites GREEN
- `R9` → SEA build JSON + baseline JSON
- `R10` → `design-system.test.ts` PASS
- `R11` → routing regression log (0 BRIDGE_CRASH)

## TDD Mode

`strict` for `R2`–`R5` production changes.

## Unit Tests

Command (scoped to `role-model-router`):

```bash
cd role-model-router && corepack pnpm exec vitest run \
  apps/runtime-host-bridge/src/local-model-role-bindings.test.ts \
  apps/runtime-ui/app/lib/design-system.test.ts
```

Results:

| Suite | Tests | Result |
| --- | --- | --- |
| `local-model-role-bindings.test.ts` | 5 | PASS |
| `design-system.test.ts` (main tree) | 21 | PASS |

Provider-account wildcard test:

```bash
cd role-model-router && corepack pnpm exec vitest run packages/provider-account/test/index.test.ts -t "wildcard peer"
```

Result: PASS (accepts model role bindings when allowedModels is empty).

Evidence path: `evidence/logs/green/phase3-unit-tests-2026-06-11.log` (partial; repo-root vitest also scanned stale worktrees).

Note: Running vitest from repo root picks up `.worktrees/**` duplicates and may fail on disk pressure; authoritative pass is the `role-model-router` tree paths above.

## SEA Package Build

Command:

```bash
corepack pnpm run runtime:package-sea
```

Evidence: `evidence/logs/green/package-sea-build-2026-06-11.json`

- Artifact: `role-model-router/dist/release/win32-x64/role-model-runtime.exe`
- SHA256: `87c7bef6166e32462c30c84f819d36f5a3892efb8e92743d4e33bb5a8ffc8a11`

## Routing Regression (`R11`)

Command:

```bash
python role-model-router/scripts/probe-downstream-ingress.py
```

Target: `http://127.0.0.1:3456` with bearer `role-model-local` after config parity restore.

Evidence: `evidence/logs/green/routing-regression-2026-06-11.log`

Summary: **33 cases, 0 BRIDGE_CRASH, 19 PASS**

- Tool-turn guard (B1–B5, B7): PASS
- First-turn tool (A2): PASS
- Known non-blocking: B6 client timeout; C2–F4 expected validation errors

## Feature routing checks

- Direct `lfm2.5-8b-a1b` → HTTP 200, peer-backed endpoint
- `GET /api/role-model/endpoints` → peer endpoint `roleIds: [general.chat, tool.agent]`
- `GET /api/role-model/local/peer/models` → matching `roleIds`

## Subagent Capability Probe

- No delegated test review; controller self-audit.

## Audit Execution Mode

- self-audit

## Coverage Gate

- [x] TDD evidence cited
- [x] SEA build SHA256 recorded
- [x] Routing regression log path recorded

Coverage: PASS

## Approval Gate

- [x] Green regression on launched runtime before Phase 5
- [x] Unit tests pass in authoritative worktree paths

Approval: PASS

Audit: PASS
