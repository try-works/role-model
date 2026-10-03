# R15 bridge primary failure repair

TDD Mode: strict
Evidence kind: terminal-observed; RED/GREEN output was not persisted to a dedicated logfile. This document records observations, not a reconstructed log.

## Root cause

Both recordPreExecutionFailure and persistRoutedProviderFailure synchronously called persistRuntimeTelemetryFailure without isolation. A secondary throw rejected the awaited telemetry operation before the original execution error could be rethrown.

## RED

Before production edits, real createRuntimeBridgeBackend execution used a fake Codex provider adapter and injected persistence function. Initial test expectation for HTTP 422 classification was corrected to the observed existing execution_failed classification; production classification was not changed.

Working directory: D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation

Exact command:
```powershell
corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/run105-r15-primary-failure.test.ts
```

Verified terminal-observed RED at 15:57:24: exit 1, 3 failed / 1 passed. Injected graph and SQLite persistence failure tests asserted original status 422, received undefined. Pre-execution test asserted original status 400, received undefined. Successful persistence control passed. No production code had been edited at this point.

## GREEN

Same command terminal-observed at 15:58:58: exit 0, all 4 tests passed. Helper returns true only when persistence returns, catches secondary throws, and emits a fixed sanitized diagnostic without rendering the error object or provider payload. Routed markRuntimeTelemetryPersisted and update emission are conditional on that success receipt. Original execution catch/rethrow remains unchanged.

Final adjacent regression command, terminal-observed at 16:04:30:
```powershell
corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/run105-r15-primary-failure.test.ts test/index.test.ts -t "run105 R15 primary failure isolation|does not place Codex subscription endpoints on cooldown for invalid_request failures"
```
Result: exit 0, 5 passed / 215 excluded by name filter, 2 test files passed. Scoped git diff --check passed.

## Integration gap and unrelated check

The storage faults are injected at the shared persistence function seam, not real graph filesystem or SQLite I/O failures. Success receipt test injects a successful persistence function rather than asserting a physical row write. Real backend routing, execution, outer error handling and duplicate-persistence behavior are exercised. No live development runtime :3458 verification or full test suite was performed by this worker.

TypeScript command corepack pnpm --filter @role-model-router/runtime-host-bridge exec tsc -p tsconfig.json --noEmit failed outside owned regions at index.ts(26515,30): roleId absent on advisory union. Parent was notified; advisory owner handles it.

Owned source changes: new failure-telemetry-persistence.ts, new run105-r15-primary-failure.test.ts, literal unique edits to index.ts import and two failure persistence regions only. No SQLite edits, commits, stash or reset.
