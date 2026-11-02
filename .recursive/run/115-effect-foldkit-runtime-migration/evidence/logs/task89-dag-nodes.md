# task-89 remaining DAG nodes

## What moved

CLI now supplies real per-node acquire factories for:

- **bootstrap** — owns the shared bootstrap state object.
- **drains** — owns the shutdownDrains registry; release clears it after server shutdown.
- **benchmarks** — owns the benchmark gate; release cancels it idempotently on DAG scope close.

They use the existing generic r27 node factory API; the memoized closeR27Dag shutdown path is unchanged. The server node still owns the BridgeServer, and release order remains server -> benchmarks -> drains -> bootstrap.

## Left as records (Effect-first comment in cli.ts)

- **backend** — created inside the branch/sidecar acquire path that startServer owns; moving it before the server would invert the locked acquisition order.
- **refresh** — starts only after extension-runtime readiness, after the server exists.

Both are explicitly recorded in the CLI acquire block rather than silently left imperative.

## Verification

- New CLI/DAG test: run115-s603-cli-dag-nodes.test.ts, 2/2.
- S593 4/4, S598 6/6, S603 2/2 = 12/12.
- host-bridge tsc: 0.
- RED: task89-s603-red.log (CLI static contract failed before factories).
- GREEN: task89-s603-green.log.

## Host suite (corrected: pinned Vitest 3.2.4)

The earlier "3 failed suites" report was a **Vitest-version artifact**: `corepack pnpm exec vitest` resolved Vitest 4.1.11 from D:/deepseek-harness instead of the project-pinned 3.2.4. Those three suites are not real failures.

Full host suite with the pinned runner:

`node node_modules/.pnpm/vitest@3.2.4_.../node_modules/vitest/vitest.mjs run` (cwd runtime-host-bridge)

**461 passed | 3 skipped files; 2843 passed | 5 skipped tests; 0 failed.**

This includes the new run115-s603-cli-dag-nodes.test.ts (2 tests) and all CLI/DAG suites. Evidence: task89-v3-suite.log.
