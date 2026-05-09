Run: `/.recursive/run/17-oauth-litellm-generalization/`
Phase: `02 TO-BE plan`
Status: `DRAFT`
Inputs:
- `/.recursive/run/17-oauth-litellm-generalization/00-requirements.md`
- `/.recursive/run/17-oauth-litellm-generalization/01-as-is.md`
Outputs:
- `/.recursive/run/17-oauth-litellm-generalization/02-to-be-plan.md`
Scope note: Defines the implementation plan for generalizing OAuth2 device-code to work with any LiteLLM provider.

# Implementation Plan

## Sub-phases

### SP1: Backend OAuth Generalization (R1–R7)

**Scope:** All backend changes to support LiteLLM-derived OAuth providers.

**Implementation Checklist:**

- [ ] **R2: Add OAuth to LiteLLMProviderInfo**
  - Edit `packages/catalog/src/litellm-catalog.ts`
  - Add optional `oauth` field to `LiteLLMProviderInfo` interface
  - Update `inferProviderInfo()` to propagate `oauth` from overrides
  - Add Moonshot OAuth config to `KNOWN_PROVIDER_OVERRIDES`

- [ ] **R1: Generalize createDeviceHeaders()**
  - Edit `apps/runtime-host-bridge/src/index.ts`
  - Change signature: `createDeviceHeaders(deviceId: string, requiredHeaders?: readonly string[])`
  - Return Kimi headers only when `requiredHeaders` includes `X-Msh-Device-Id`
  - Default `User-Agent` to `Role-Model-Runtime/1.0`
  - Update all call sites to pass `variant.oauth?.requiredHeaders`

- [ ] **R3: Add scope support**
  - Edit `apps/runtime-host-bridge/src/index.ts`
  - Add `scope?: string` to `ProviderPresetVariantOAuth`
  - Add `scope?: string` to new `LiteLLMProviderInfo.oauth`
  - Include `scope` in device authorization request body when non-empty

- [ ] **R4: Rename credential backend**
  - Replace `"local-encrypted-file"` with `"local-file"` everywhere
  - Update `resolveCredentialValue()`
  - Update `startProviderDeviceAuthorization()`
  - Ensure backward compatibility by reading both backend names

- [ ] **R5: OAuth detection in unified config**
  - Edit `createUnifiedProviderAccounts()`
  - Check for existing OAuth token file before defaulting to API key
  - Use `authMode: "oauth2-device-code"` when token exists

- [ ] **R6: In-memory refresh update**
  - Edit `refreshOauthAccessToken()`
  - Call `rebuildCurrentState()` after persisting refreshed token

- [ ] **R7: oauthHost cleanup**
  - Remove `oauthHost` from `ProviderPresetVariantOAuth`
  - Update `provider-presets.json`
  - Update test fixtures

### SP2: Frontend OAuth Display (R8)

**Scope:** Update Providers page to show OAuth variants from LiteLLM catalog.

**Implementation Checklist:**

- [ ] **Update DESIGN_SYSTEM.md**
  - Add OAuth variant badge to component rules
  - Add auth-mode indicator to provider card specification
  - Update `registry-detail` template for OAuth panel region

- [ ] **Update Providers page**
  - Edit `apps/runtime-ui/app/routes/providers.tsx`
  - Generate OAuth variant from `LiteLLMProviderInfo.oauth` when present
  - Display OAuth variant alongside API-key variant in variant selector
  - Show auth mode label (`oauth2-device-code`) on variant option
  - Ensure device authorization flow works for LiteLLM-derived OAuth

### SP3: Browser Verification (R9)

**Scope:** Build, start UI, and capture browser evidence.

**Implementation Checklist:**

- [ ] Build runtime UI: `corepack pnpm --filter @role-model-router/runtime-ui build`
- [ ] Start bridge server on port 3456
- [ ] Start UI dev server on port 5173
- [ ] Navigate to `/app/control/providers`
- [ ] Verify OAuth variants render for LiteLLM providers with OAuth metadata
- [ ] Capture browser screenshot as evidence

## Tests Per Sub-phase

### SP1 Tests
```bash
cd role-model-router/packages/catalog && npx vitest run test/litellm-catalog.test.ts
cd ../../apps/runtime-host-bridge && npx vitest run test/index.test.ts
corepack pnpm run runtime:validate-ui
corepack pnpm run smoke
```

### SP2 Tests
```bash
cd role-model-router/apps/runtime-ui && npx tsc -p tsconfig.json --noEmit
corepack pnpm --filter @role-model-router/runtime-ui build
```

### SP3 Tests
```bash
# Manual browser verification
curl http://127.0.0.1:5173/app/control/providers
```

## Recovery / Rollback

- All changes are additive (new `oauth` field, new header logic). Rolling back means reverting the commit.
- The `provider-presets.json` format stays backward compatible.

## TODO

- [ ] Write 02-to-be-plan.md
- [ ] Lock 02-to-be-plan.md
- [ ] Proceed to Phase 3 Implementation

---

## Coverage Gate

- Coverage: PASS — All R# requirements are mapped to concrete checklist items in SP1/SP2/SP3

## Approval Gate

- Approval: PASS — Plan is executable with clear file paths and test commands

## Lock

- Status: `LOCKED`
- LockedAt: `2026-05-09T12:52:00+08:00`
- LockHash: `d52e2acacbc6a393bc286f09a4ae1d6bb3345eaecdaca99c278545c2578d8f77`
