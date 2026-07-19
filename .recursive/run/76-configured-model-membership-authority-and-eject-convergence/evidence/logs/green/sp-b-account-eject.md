Commands:

- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/remove-account-model.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/restart-rehydration.test.ts -t "sanitizes stale activation"`

Result: GREEN. Exact activation intent and remote endpoint residue are pruned; repeated eject succeeds idempotently; restart preserves only configured account membership; local synthesized endpoints remain unaffected.
