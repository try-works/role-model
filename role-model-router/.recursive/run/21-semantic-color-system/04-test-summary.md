# Run 21: Test Summary

## Bridge Tests

**Test command**: `corepack pnpm --filter @role-model-router/runtime-host-bridge test`

| Test File | Tests | Status |
|-----------|-------|--------|
| test/index.test.ts | 19 | ✅ Passed |
| test/backend-unified-runtime-config.test.ts | 4 | ✅ Passed |
| test/executable.test.ts | 0 | ✅ Passed |
| test/runtime-assets.test.ts | 0 | ✅ Passed |
| test/unified-runtime-config.test.ts | 0 | ✅ Passed |
| test/validate-operations.test.ts | 1 | ✅ Passed |
| test/validate-tools.test.ts | 1 | ✅ Passed |
| test/validate-ui.test.ts | 1 | ✅ Passed |
| test/validate-vendors.test.ts | 2 | ✅ Passed |
| test/local-policy.test.ts | 13 | ✅ Passed |

**Total**: 53/53 passing

### New Tests Added

**local-policy.test.ts**:
- `readModelOverrides returns empty object when file does not exist`
- `updateModelOverrides writes to file`
- `readModelOverrides reads persisted file`
- `readPeers returns empty array when file does not exist`
- `updatePeers writes to file`
- `readPeers reads persisted file`
- `checkPeerHealth returns false for unreachable url`

## UI Tests

**Test command**: `corepack pnpm --filter @role-model-router/runtime-ui test`

| Test File | Tests | Status |
|-----------|-------|--------|
| app/lib/runtime-api.test.ts | 27 | ✅ Passed |
| app/lib/view-models.test.ts | 14 | ✅ Passed |
| app/lib/device-authorization.test.ts | 9 | ✅ Passed |
| app/lib/design-system.test.ts | 11 | ✅ Passed |

**Total**: 61/61 passing

## Schema Validation

**Command**: `corepack pnpm schemas:validate`

- 19 schema files validated ✅
- 28 fixture files validated ✅
