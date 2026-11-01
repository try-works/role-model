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

## Host suite

`test:ci` ran 464 files, 2619 tests: **2615 passed, 4 skipped, 3 failed suites**. The three failures are pre-existing and unrelated to this slice:

- test/index.test.ts — oxc parse of `readonly Array<...>` in the generated 16k-line test.
- test/run101-r3-packaged-queue-policy.test.ts — Vitest 4 removed the `it(name, fn, options)` signature.
- test/s324-readiness.test.ts — duplicate `type Captured` declaration.

No failure touches the DAG or CLI paths; all CLI/DAG suites pass.
