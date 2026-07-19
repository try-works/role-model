Command: `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/remove-account-model.test.ts`

Result: RED (exit 1). The owning test expected the structured `alreadyAbsent` receipt after an eject seeded with matching endpoint and remote activation intent; the current backend returned only `{ success, removedAccount }`.

Observed failing test: `removeProviderAccountModel > removes the selected model and stale endpoint rows while preserving sibling models`.

Second RED command: `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/restart-rehydration.test.ts -t "sanitizes stale activation"`.

Result: RED (exit 1). Restart expanded the SQLite account from authoritative `moonshot/kimi-k3` back to `kimi-k2.7-code` because stale endpoint/activation evidence was unioned into membership.
