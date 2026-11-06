# S37 contract strength landed; diagnostics INCONCLUSIVE

- Fixture manifest bound to host captures (URL, status, capturedAt, sha256, artifact identity); the contract test asserts each file hash.
- Row-level expectations per route, non-empty dashboard (`requestCount=1`) and activity (`items`) fixtures, and an invalid-body case (`endpoints [{}]` -> error state).
- **Parser-revert REDs**: dashboard, observeActivity, runtime and sessionReadiness each turn the contract RED when reverted, then restore - the suite can finally fail for the bugs it was written to catch.
- Diagnostics body remains **INCONCLUSIVE**: the host answers `state:"disabled"`, `records:[]`; the writer is deferred to R20 and no test-only switch exists. Recorded with the exact capture and what would produce it.

## Aliases, confirmed in the browser

- `/local/models` -> Local choose (the only honest alias).
- `/local/matrix` and `/router/config` -> NotFound; their legacy targets are unported, so the wrong-target aliases were removed rather than shipped.
- `/requests/:id` and `/router/decisions/:id` exist and surface the host 404 honestly; their success state is unproven until a real id can be captured.
