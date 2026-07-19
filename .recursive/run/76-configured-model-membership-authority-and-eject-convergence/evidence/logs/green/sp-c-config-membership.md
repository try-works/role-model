Commands:

- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/configured-model-membership.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/backend-unified-runtime-config.test.ts -t "ejects config-owned|preserves synthesized|uses YAML membership"`

Result: GREEN. Exact YAML mapping removal is idempotent, sibling-preserving, removes empty providers, survives restart, and reserved `*.litellm` collisions use YAML membership while preserving manual credential metadata.
