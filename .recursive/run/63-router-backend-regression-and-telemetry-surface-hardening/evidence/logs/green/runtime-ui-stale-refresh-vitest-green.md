Timestamp: `2026-07-11T12:26:37.8872353Z`
Command:

```powershell
corepack pnpm --filter @role-model-router/runtime-ui test -- app/lib/stale-refresh-diagnostics.test.ts
```

Observed GREEN result after the repair:

```text
Test Files  28 passed (28)
Tests  311 passed (311)
Duration  8.96s
```

Relevant outcome:

- the expanded stale-refresh helper tests pass
- the full runtime-ui Vitest suite still passes after the route/helper changes
