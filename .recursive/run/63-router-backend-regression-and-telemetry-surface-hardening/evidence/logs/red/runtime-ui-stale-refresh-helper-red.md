Timestamp: `2026-07-11T12:26:37.8872353Z`
Command:

```powershell
corepack pnpm --filter @role-model-router/runtime-ui test -- app/lib/stale-refresh-diagnostics.test.ts
```

Observed RED failure before the production repair:

```text
FAIL  app/lib/stale-refresh-diagnostics.test.ts > stale-refresh-diagnostics > resolveTelemetryChartRefresh > keeps initial success clean with no stale charts
TypeError: (0 , resolveTelemetryChartRefresh) is not a function
```

Interpretation:

- the new regression tests existed before the helper implementation
- the failure reproduced the missing shared refresh-resolution behavior required to close the stale-banner recovery gap
