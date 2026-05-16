# Run: `32-router-runtime-routing-operator-surface`

## Phase: `04 Test Summary`

Status: `COMPLETE`

## Focused validation

### Backend

- `corepack pnpm --filter @role-model-router/runtime-host-bridge test`
  - PASS
- `corepack pnpm --filter @role-model-router/runtime-host-bridge build`
  - PASS

### Frontend

- `corepack pnpm --filter @role-model-router/runtime-ui build`
  - PASS
- `corepack pnpm --filter @role-model-router/runtime-ui test`
  - runner crash after all suites reported green because Vitest workers hit an environment-local OOM during teardown
- `corepack pnpm exec vitest run app/lib/runtime-api.test.ts app/lib/view-models.test.ts app/lib/device-authorization.test.ts app/lib/design-system.test.ts --maxWorkers=1 --minWorkers=1`
  - PASS
  - this re-ran the same runtime-ui suite set in single-worker mode and exited cleanly

## Root baseline verification

- `corepack pnpm run ci:check`
  - FAIL
- Observed signature:
  - failure remains in `lint`
  - `biome check .` still reports inherited formatter drift on untouched baseline files
- Interpretation:
  - this matches the Phase 0 non-green baseline already recorded in `00-worktree.md`
  - run 32 did not introduce a new unrelated root failure signature

## Coverage notes

- Backend coverage includes:
  - Router API contract coverage
  - QA bootstrap helper coverage for fixture-root selection and Router API wiring
- Frontend coverage includes:
  - Router design-system/navigation contract coverage
  - Router runtime API client coverage
- Browser-backed live verification is recorded separately in `05-manual-qa.md`
