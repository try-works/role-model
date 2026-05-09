# Run 17 Addendum — OAuth LiteLLM Generalization (Implementation)

**Run:** `17-oauth-litellm-generalization`
**Addendum:** `03-implementation`
**Based on commit:** `3be99ea`
**Merged to main:** `8e4bde2`

---

## What Was Implemented

### R1 — Generalize Device Headers for OAuth Requests

**File:** `role-model-router/apps/runtime-host-bridge/src/index.ts`

Changed `createDeviceHeaders()` signature:
```typescript
function createDeviceHeaders(
  deviceId: string,
  requiredHeaders?: readonly string[]
): Record<string, string>
```

- Detects Kimi requests via `requiredHeaders?.includes("X-Msh-Platform")`
- Returns `User-Agent: KimiCLI/1.41.0` for Kimi
- Returns `User-Agent: Role-Model-Runtime/1.0` for all other providers
- All other headers (`X-Msh-*`) only included when provider requires them

**Call sites updated:**
- `startProviderDeviceAuthorization()` — passes `variant.oauth.requiredHeaders`
- `pollProviderDeviceAuthorization()` — passes `variant.oauth.requiredHeaders`
- `refreshOauthAccessToken()` — passes `variant.oauth.requiredHeaders`
- `executeLiveRoutedRequest()` — looks up OAuth variant from `providerPresets`, passes `requiredHeaders`

### R2 — Add OAuth Metadata to LiteLLM Provider Catalog

**File:** `role-model-router/packages/catalog/src/litellm-catalog.ts`

Added optional `oauth` field to `LiteLLMProviderInfo`:
```typescript
readonly oauth?: {
  readonly oauthHost: string;
  readonly clientId: string;
  readonly deviceAuthorizationEndpoint: string;
  readonly tokenEndpoint: string;
  readonly requiredHeaders: readonly string[];
  readonly scope?: string;
};
```

Added Moonshot OAuth config to `KNOWN_PROVIDER_OVERRIDES`:
```typescript
moonshot: {
  supportedAuthModes: ["api-key-static", "oauth2-device-code"],
  controlPlaneRequirements: ["workspace.required", "kimi-code.oauth.device"],
  oauth: {
    oauthHost: "api.moonshot.ai",
    clientId: "pk-...",
    deviceAuthorizationEndpoint: "https://api.moonshot.ai/v1/oauth/device/code",
    tokenEndpoint: "https://api.moonshot.ai/v1/oauth/token",
    requiredHeaders: ["X-Msh-Platform", "X-Msh-Version", "X-Msh-Device-Name", "X-Msh-Device-Model", "X-Msh-Os-Version", "X-Msh-Device-Id"],
  },
},
```

**Bridge fallback:** `startProviderDeviceAuthorization()` now falls back to `liteLLMProviders.find()` when provider is not in `currentNormalizedCatalog.providers`.

### R3 — Add OAuth `scope` Support

**File:** `role-model-router/apps/runtime-host-bridge/src/index.ts`

- Added `scope?: string` to `ProviderPresetVariantOAuth`
- Added `scope?: string` to `LiteLLMProviderInfo.oauth`
- Device authorization request includes `scope` when non-empty:
```typescript
const body = new URLSearchParams({ client_id: variant.oauth.clientId });
if (variant.oauth.scope) {
  body.append("scope", variant.oauth.scope);
}
```

### R4 — Fix "local-encrypted-file" Credential Backend Naming

**File:** `role-model-router/apps/runtime-host-bridge/src/index.ts`

- Renamed `"local-encrypted-file"` → `"local-file"` throughout
- `resolveCredentialValue()` handles both names for backward compatibility
- `persistOauthTokenFile()` and `readOauthTokenFile()` unchanged (they use the path, not the backend name)

### R5 — Support OAuth in Unified Runtime Config Accounts

**File:** `role-model-router/apps/runtime-host-bridge/src/index.ts`

`createUnifiedProviderAccounts()` now:
- Checks for existing OAuth token file before defaulting to API key
- Uses `authMode: "oauth2-device-code"` when token exists
- Points `credentialRef` to OAuth token path when OAuth is detected

### R6 — Refresh Token Updates In-Memory State

**File:** `role-model-router/apps/runtime-host-bridge/src/index.ts`

`refreshOauthAccessToken()` now calls `rebuildCurrentState()` after persisting the refreshed token.

### R7 — Remove or Use Dead `oauthHost` Field

**Decision:** Kept `oauthHost` field but made it functional.

`oauthHost` is now used in `startProviderDeviceAuthorization()` for constructing the device authorization URL when the endpoint is not fully specified.

### R8 — Frontend OAuth Provider Display Update

**File:** `role-model-router/apps/runtime-ui/app/routes/providers.tsx`

- OAuth variants from `providerPresets` are rendered in the variant selector
- Auth mode label (`oauth2-device-code`) shown on variant option
- Device authorization flow UI works for OAuth-capable providers

**File:** `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`

- Updated component rules for OAuth variant badge
- Updated auth-mode indicator on provider card

### R9 — Browser Verification

**Evidence:** See `evidence/` folder for browser screenshots.

- UI build passes: `corepack pnpm --filter @role-model-router/runtime-ui build` ✓
- Bridge server on port 3456 ✓
- UI dev server on port 5173 ✓
- Providers page renders OAuth variants for Moonshot ✓
- Device authorization flow UI renders ✓

---

## Post-Merge Fixes

After merging Run 17 to `main`, several fixes were applied:

1. **Kimi OAuth chat regression** (`cc7d163`) — Restored `User-Agent: KimiCLI/1.41.0` by detecting Kimi via `requiredHeaders`
2. **UI error handling** (`e74c273`) — Chat errors shown in result panel, not full-page error
3. **Test fixes** (`89d3b41`) — Updated expectations for auto-generated variants
4. **CORS support** (`8e451e9`) — External app integration (PI)
5. **Always show llama-swap** (`3fd76ea`) — Provider list always includes local vendor
6. **Dual base URL** (`8351bd6`) — Downstream page shows both `/v1` and bare URLs

---

## Test Results

All validation commands pass:
- `schemas:validate` ✓
- `runtime:validate-ui` ✓
- `runtime:validate-host` ✓
- `runtime:validate-vendors` ✓
- `smoke` ✓

All test suites pass:
- runtime-host-bridge: 40/40 ✓
- provider-account: 6/6 ✓
- adapter-execution: 5/5 ✓
- catalog: 4/4 ✓

---

## Lock

- Status: `LOCKED`
- LockedAt: `2026-05-09T18:40:00+08:00`
- LockHash: `TBD`
