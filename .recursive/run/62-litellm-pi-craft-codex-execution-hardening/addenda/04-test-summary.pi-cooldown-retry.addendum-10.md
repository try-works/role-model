Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `04 Test Summary`
Addendum: `10`
Status: `LOCKED`
LockedAt: `2026-07-09T00:00:36Z`
LockHash: `5daa1c450d0469de74e894971971e12e8335457808563775332582a2c0fda7ad`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/03-implementation-summary.pi-cooldown-retry.addendum-10.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/logs/addendum-10/red/`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/logs/addendum-10/green/`
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/04-test-summary.pi-cooldown-retry.addendum-10.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/logs/addendum-10/green/`
Scope note: This test summary records automated TDD and regression verification for the addendum-10 cooldown-status repair.

# Addendum 10 Test Summary

## TODO

- [x] Preserve RED and GREEN logs.
- [x] Run formatting after the test edit.
- [x] Run the full impacted runtime-host bridge index suite.
- [x] Run the repo-owned runtime critical suite.
- [x] Record command-level evidence with exit status.
- [x] Run full local CI for commit readiness.

## Automated Tests

| Command | Result | Evidence |
| --- | --- | --- |
| `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts -t "preserves the original Codex timeout"` | RED then GREEN | `evidence/logs/addendum-10/red/cooldown-no-eligible-http-status.red.log`, `evidence/logs/addendum-10/green/cooldown-no-eligible-http-status.green.log` |
| `corepack pnpm exec biome format --write role-model-router/apps/runtime-host-bridge/test/index.test.ts` | PASS | formatting applied before post-format GREEN |
| `corepack pnpm exec biome check role-model-router/apps/runtime-host-bridge/test/index.test.ts` | PASS | `evidence/logs/addendum-10/green/biome-check.green.log` |
| `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts` | PASS, `191` tests | `evidence/logs/addendum-10/green/runtime-host-bridge-index.green.log` |
| `corepack pnpm run runtime:test-critical` | PASS | `evidence/logs/addendum-10/green/runtime-test-critical.green.log` |
| `corepack pnpm run runtime:test-critical` rerun with explicit exit capture | PASS, exit `0` | `evidence/logs/addendum-10/green/runtime-test-critical.rerun.log`, `runtime-test-critical.rerun.summary.json` |
| `corepack pnpm run ci:check` | PASS, exit `0` | `evidence/logs/addendum-10/green/ci-check.log`, `ci-check.summary.json` |

## Runtime Critical Rerun Result

The explicit rerun summary records:

- command: `corepack pnpm run runtime:test-critical`
- exit code: `0`
- completed at: `2026-07-09T07:47:22.3132928+08:00`
- log: `evidence/logs/addendum-10/green/runtime-test-critical.rerun.log`

The suite includes:

- `runtime-host-bridge test:critical`: PASS
- `runtime-ui test:critical`: PASS
- `runtime:validate-ui`: PASS
- `runtime:validate-observability`: PASS

## Full Local CI Gate

The full local CI summary records:

- command: `corepack pnpm run ci:check`
- exit code: `0`
- completed at: `2026-07-09T07:59:43.2621379+08:00`
- log: `evidence/logs/addendum-10/green/ci-check.log`

The CI pass includes lint, schema validation, build, monorepo tests, `runtime:test-critical`, Rust tests, and smoke.

## Requirement Mapping

- `R6`: automated regression verifies cooldown denial returns non-retryable HTTP `400`.
- `R8`: telemetry and request-detail assertions verify diagnostic evidence remains present.

## Coverage Gate

- [x] RED failure proves the regression would have caught the bug.
- [x] GREEN tests prove the shared runtime change.
- [x] Critical runtime suite passed after the fix.
- [x] Full local CI passed after live verification and cleanup.

Coverage: PASS

## Approval Gate

- [x] Test evidence is durable under the run folder.
- [x] Automated coverage matches the implementation scope.
- [x] Commit-readiness CI passed locally.

Approval: PASS
