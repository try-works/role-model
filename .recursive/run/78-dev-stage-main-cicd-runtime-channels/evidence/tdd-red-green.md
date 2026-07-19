# Run 78 TDD evidence

## RED

- Workflow contracts: `node --test` failed because CI still had one broad mutable-install job, docs could deploy arbitrary refs, and binary builds had no development/stage channel contract.
- Runtime profiles: focused Vitest failed because `runtime-channel.ts` did not exist and runtime version responses lacked channel metadata.
- State migration: focused Vitest failed because `runtime-state-migration.ts` did not exist.

All RED failures occurred before their corresponding production edits and failed for the expected missing behavior.

## GREEN

- `node --test scripts/ci-workflow.test.mjs scripts/build-binaries-workflow.test.mjs apps/docs-site/scripts/docs-site-deploy-workflow.test.mjs`: 6 passed.
- Focused channel/version/state/package/host tests: passed after implementation.
- Full repository test rerun: passed, including runtime-host-bridge 63 files and 570 tests.
- Go launcher tests, packaging builds, lint, schemas, build, runtime-critical, Rust, and smoke: passed.

## Refactor verification

- One typed TypeScript profile table owns names, ports, state roots, and scope IDs.
- Go reads the adjacent manifest and validates the same fixed profile identities.
- Workflow contract tests own stable job names, promotion rules, and docs/release constraints.
