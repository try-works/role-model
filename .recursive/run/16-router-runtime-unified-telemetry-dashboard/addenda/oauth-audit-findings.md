# OAuth Implementation Audit — LiteLLM Providers

## Executive Summary

The OAuth2 device-code flow is **implemented but tightly coupled to Moonshot/Kimi**. With the move to a LiteLLM-derived provider catalog (108 providers), the OAuth system needs generalization. The current implementation works for the one provider it was built for (Moonshot `kimi-code`), but will fail for any other LiteLLM provider that supports OAuth.

---

## Critical Issues

### 1. Hardcoded Kimi-Specific Device Headers
**Location:** `createDeviceHeaders()` in `apps/runtime-host-bridge/src/index.ts:1555`

```typescript
function createDeviceHeaders(deviceId: string): Record<string, string> {
  return {
    "User-Agent": "KimiCLI/1.41.0",
    "X-Msh-Platform": "kimi_cli",
    "X-Msh-Version": "1.41.0",
    "X-Msh-Device-Name": os.hostname(),
    "X-Msh-Device-Model": `${os.platform()} ${os.release()} ${os.arch()}`.trim(),
    "X-Msh-Os-Version": os.release(),
    "X-Msh-Device-Id": deviceId,
  };
}
```

**Problem:** These headers are Moonshot/Kimi-specific (`X-Msh-*`, `KimiCLI`). If any other LiteLLM provider (e.g., Anthropic, Google, Azure) supports OAuth2 device code, these headers will be incorrect or rejected.

**Impact:** HIGH — Any OAuth provider other than Moonshot will fail device authorization.

**Fix:** The `ProviderPresetVariantOAuth` interface already has `requiredHeaders: string[]`. Use it:
```typescript
function createDeviceHeaders(deviceId: string, requiredHeaders?: readonly string[]): Record<string, string> {
  const headers: Record<string, string> = {
    "User-Agent": "Role-Model-Runtime/1.0",
  };
  if (requiredHeaders?.includes("X-Msh-Device-Id")) {
    headers["X-Msh-Device-Id"] = deviceId;
    // ... other Kimi-specific headers
  }
  // Generic headers for other providers
  return headers;
}
```

---

### 2. OAuth Config Lives Only in Provider Presets (Not LiteLLM Catalog)
**Location:** `testdata/router-runtime/provider-presets.json` vs `packages/catalog/src/litellm-catalog.ts`

**Problem:** The OAuth configuration (clientId, deviceAuthorizationEndpoint, tokenEndpoint) is stored in `provider-presets.json`, which only has **1 provider** (Moonshot). The `LiteLLMProviderInfo` interface from `litellm-catalog.ts` has `supportedAuthModes` but **no OAuth endpoint metadata**.

This means:
- If LiteLLM discovers a provider that supports OAuth, there's no way to configure it
- OAuth is not a first-class property of the provider catalog
- The 108 LiteLLM providers all have `supportedAuthModes: []` (empty) except Moonshot

**Impact:** HIGH — OAuth cannot be used with any provider not explicitly hand-coded in `provider-presets.json`.

**Fix:** Add OAuth metadata to `LiteLLMProviderInfo` and populate it from `KNOWN_PROVIDER_OVERRIDES`:
```typescript
export interface LiteLLMProviderInfo {
  // ... existing fields
  oauth?: {
    oauthHost: string;
    clientId: string;
    deviceAuthorizationEndpoint: string;
    tokenEndpoint: string;
    requiredHeaders: string[];
  };
}
```

---

### 3. "local-encrypted-file" Backend Is Not Encrypted
**Location:** `persistOauthTokenFile()` in `apps/runtime-host-bridge/src/index.ts:1567`

```typescript
async function persistOauthTokenFile(...): Promise<void> {
  const filePath = resolveCredentialFilePath(...);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
}
```

**Problem:** The credential backend is named `"local-encrypted-file"` but the file is written as **plaintext JSON**. The access token and refresh token are stored unencrypted on disk.

**Impact:** MEDIUM — Security concern. Tokens are exposed in plaintext.

**Fix:** Either:
- Rename backend to `"local-file"` (honest about no encryption)
- Or implement actual encryption using Node.js `crypto` module with a user-provided or derived key

---

### 4. Missing OAuth2 `scope` Parameter
**Location:** `startProviderDeviceAuthorization()` in `apps/runtime-host-bridge/src/index.ts:3861`

```typescript
body: new URLSearchParams({
  client_id: variant.oauth.clientId,
}),
```

**Problem:** The device authorization request doesn't include a `scope` parameter. Many OAuth2 providers require this to know what permissions to grant.

**Impact:** MEDIUM — Some providers may reject the request or grant minimal scopes.

**Fix:** Add `scope` to `ProviderPresetVariantOAuth` and include it in the request body.

---

### 5. `createUnifiedProviderAccounts` Always Prefers API Key
**Location:** `createUnifiedProviderAccounts()` in `apps/runtime-host-bridge/src/index.ts:613`

```typescript
const authMode =
  provider.supportedAuthModes?.find((candidate) => candidate === "api-key-static") ??
  provider.supportedAuthModes?.[0] ??
  "api-key-static";
```

**Problem:** When creating unified runtime config accounts, it always prefers `api-key-static`. If a provider supports OAuth and the user has an OAuth token, the unified config account will still use API key mode.

**Impact:** LOW — Unified config is optional; manual account setup works around this.

**Fix:** Check if an OAuth token exists for the provider before defaulting to API key.

---

### 6. `refreshOauthAccessToken` Doesn't Update In-Memory State
**Location:** `refreshOauthAccessToken()` in `apps/runtime-host-bridge/src/index.ts:1635`

**Problem:** After refreshing a token, the function writes the new token to disk but does **not** update `currentAccounts` or call `rebuildCurrentState()`. The next request within the same process might still use stale in-memory data.

**Impact:** LOW — The next request will re-read from disk via `readOauthTokenFile`, so it's eventually consistent.

**Fix:** Trigger `rebuildCurrentState()` after token refresh, or ensure `resolveCredentialValue` always reads from disk.

---

### 7. `oauthHost` Field Is Unused
**Location:** `ProviderPresetVariantOAuth` interface in `apps/runtime-host-bridge/src/index.ts:837`

**Problem:** The `oauthHost` field is stored in the preset but never referenced in the OAuth flow logic. The actual URLs come from `deviceAuthorizationEndpoint` and `tokenEndpoint`.

**Impact:** LOW — Dead field. Could be used for validation or display.

**Fix:** Either use it (e.g., for provider discovery) or remove it to reduce confusion.

---

### 8. No OAuth Support for Anthropic (Known OAuth Provider)
**Location:** `KNOWN_PROVIDER_OVERRIDES` in `packages/catalog/src/litellm-catalog.ts`

**Problem:** Anthropic supports OAuth2 for their API, but the override only lists:
```typescript
anthropic: {
  displayName: "Anthropic",
  providerKind: "provider-anthropic",
  adapterFamily: "ai-sdk-anthropic",
  apiBase: "https://api.anthropic.com/v1",
  envVars: ["ANTHROPIC_API_KEY"],
},
```

There's no `supportedAuthModes: ["oauth2-device-code"]` or OAuth endpoint config.

**Impact:** LOW — Anthropic OAuth is not commonly used (API keys are standard), but it's a gap.

---

## Recommendations (Priority Order)

1. **P0 — Generalize `createDeviceHeaders`**: Use `requiredHeaders` from `ProviderPresetVariantOAuth` instead of hardcoded Kimi headers.

2. **P0 — Add OAuth Metadata to LiteLLM Catalog**: Extend `LiteLLMProviderInfo` with OAuth fields so any LiteLLM-derived provider can support OAuth without hand-coding in `provider-presets.json`.

3. **P1 — Add `scope` Support**: Include OAuth2 `scope` in device authorization requests.

4. **P1 — Fix "local-encrypted-file" Naming**: Either implement encryption or rename to `"local-file"`.

5. **P2 — Support OAuth in Unified Config**: `createUnifiedProviderAccounts` should check for existing OAuth tokens before defaulting to API key.

6. **P2 — Remove or Use `oauthHost`**: Clean up the dead field.

---

## Files Involved

| File | Role |
|------|------|
| `apps/runtime-host-bridge/src/index.ts` | OAuth flow implementation |
| `packages/catalog/src/litellm-catalog.ts` | LiteLLM provider metadata (missing OAuth) |
| `testdata/router-runtime/provider-presets.json` | OAuth config for Moonshot only |
| `packages/provider-account/src/index.ts` | Auth mode enum definitions |
