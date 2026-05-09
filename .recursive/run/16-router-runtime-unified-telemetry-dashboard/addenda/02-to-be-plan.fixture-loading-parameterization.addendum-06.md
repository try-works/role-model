# Addendum 06: Fixture Loading Parameterization

## Goal
Ensure the runtime UI starts with a clean state (no hardcoded providers, accounts, or endpoints) while keeping all tests and validation commands working by loading original fixtures from a dedicated backup directory.

## Changes

### 1. Dual Fixture Strategy
- **Main fixtures** (`testdata/router-runtime/`): Cleared to empty state for clean runtime UI
- **Test fixtures** (`testdata/router-runtime/fixtures/`): Original fixture data preserved for tests and validation

### 2. `fixtureRoot` Parameter
- Added `fixtureRoot?: string` to `CreateRuntimeBridgeBackendOptions`
- Default is `testdata/router-runtime/fixtures` (for tests/validation)
- Runtime entry points explicitly pass `testdata/router-runtime` (empty fixtures)

### 3. Updated Entry Points
- `src/cli.ts`: Accepts `--fixture-root` argument; defaults to empty fixtures
- `src/validate-ui.ts`, `src/validate-vendors.ts`, `src/validate-tools.ts`: Pass empty fixtures path
- `scripts/start-for-qa.ts`: Pass empty fixtures path

### 4. Go Bridge Process
- Added `ROLE_MODEL_BRIDGE_FIXTURE_ROOT` env var support
- `buildRoleModelBridgeCommand` passes `--fixture-root` when set
- `validate-host.ts` sets this env var for host validation

### 5. Test Updates
- All tests using `createRuntimeBridgeBackend` pass `fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures")`
- Smoke test passes `fixtureRoot` to `runRuntimeAdapterValidation`
- Conformance test passes `fixtureRoot` to `runRuntimeRoutingValidation`

### 6. Model Synthesis
- `protocol-routing/src/cli.ts`: Synthesizes fixture-referenced models before building endpoint registry
- Prevents `MODEL_NOT_FOUND` errors when catalog is empty but fixtures reference models

## Validation
- ✅ `runtime:validate-ui` — 108 providers, moonshot upsert/activation works
- ✅ `runtime:validate-host` — full stack test passes
- ✅ `runtime:validate-vendors` — vendor tests pass
- ✅ `schemas:validate` — 19 schemas, 28 fixtures validated
- ✅ `smoke` — end-to-end routing and execution passes
- ✅ All 19 runtime-host-bridge tests pass
- ✅ All 6 provider-account tests pass
- ✅ All 5 adapter-execution tests pass
- ✅ All 4 protocol-routing tests pass
- ✅ All 2 runtime-observability tests pass
- ✅ All 2 conformance tests pass

## Commit
`532f336` on `main`
