Command: `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/configured-model-membership.test.ts`

Result: RED (exit 1). Both owning tests failed because the exact config-owned membership mutation did not exist.

Integration RED command: `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/backend-unified-runtime-config.test.ts -t "ejects config-owned"`.

Result: RED (exit 1). The backend mutated only the SQLite projection, leaving YAML authority and generated endpoints intact; rebuild rejected the inconsistent state and restart would have reintroduced the model.

Contract RED: the extended configured-membership suite failed to load because the planned provider-account-plus-model reference contract module did not exist.
