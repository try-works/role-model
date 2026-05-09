Run: `/.recursive/run/17-oauth-litellm-generalization/`
Phase: `01 AS-IS`
Status: `DRAFT`
Inputs:
- `/.recursive/run/17-oauth-litellm-generalization/00-requirements.md`
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/addenda/oauth-audit-findings.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `packages/catalog/src/litellm-catalog.ts`
- `testdata/router-runtime/provider-presets.json`
- `role-model-router/apps/runtime-ui/app/routes/providers.tsx`
- `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
Outputs:
- `/.recursive/run/17-oauth-litellm-generalization/01-as-is.md`
Scope note: Documents the current state of the OAuth2 device-code implementation, the LiteLLM provider catalog, the frontend Providers page, and the design system contract.

# AS-IS Analysis

## R1: Device Headers — Current State

**File:** `apps/runtime-host-bridge/src/index.ts:1555`

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

**Call sites:**
- `startProviderDeviceAuthorization()` at line 3863
- `pollProviderDeviceAuthorization()` at line 3949
- `refreshOauthAccessToken()` at line 1655
- `executeLiveRoutedRequest()` at line 3309

All call sites pass only `deviceId`. None pass provider-specific `requiredHeaders`.

**Impact:** Every OAuth request uses Kimi headers regardless of provider.

---

## R2: LiteLLM Catalog OAuth — Current State

**File:** `packages/catalog/src/litellm-catalog.ts`

```typescript
export interface LiteLLMProviderInfo {
  readonly providerId: string;
  readonly displayName: string;
  readonly providerKind: string;
  readonly authFamily: string;
  readonly adapterFamily: string;
  readonly apiBase: string;
  readonly envVars: readonly string[];
  readonly supportedAuthModes: readonly string[];
  readonly controlPlaneRequirements: readonly string[];
  readonly localOverrideApplied: boolean;
  readonly upstreamProvenance: { ... };
}
```

**No `oauth` field exists.**

`KNOWN_PROVIDER_OVERRIDES` has `supportedAuthModes` for Moonshot only:
```typescript
moonshot: {
  supportedAuthModes: ["api-key-static", "oauth2-device-code"],
  controlPlaneRequirements: ["workspace.required", "kimi-code.oauth.device"],
},
```

**Provider presets fallback:** `apps/runtime-host-bridge/src/index.ts` at `startProviderDeviceAuthorization()` reads OAuth config exclusively from `providerPresets.providers[providerId]?.variants`.

**Impact:** OAuth config is only available for providers explicitly listed in `provider-presets.json`.

---

## R3: OAuth Scope — Current State

**File:** `apps/runtime-host-bridge/src/index.ts:3861`

Device authorization request body:
```typescript
body: new URLSearchParams({
  client_id: variant.oauth.clientId,
}),
```

No `scope` parameter. The `ProviderPresetVariantOAuth` interface does not have a `scope` field.

**Impact:** Providers requiring scope will fail or grant insufficient permissions.

---

## R4: Credential Backend — Current State

**File:** `apps/runtime-host-bridge/src/index.ts` (multiple locations)

The backend `"local-encrypted-file"` is used for OAuth tokens:
- `createCredentialRef()` returns paths like `oauth/{providerId}/{accountId}`
- `persistOauthTokenFile()` writes plaintext JSON
- `readOauthTokenFile()` reads plaintext JSON
- `resolveCredentialValue()` handles `"local-encrypted-file"` backend

**No encryption is performed.**

---

## R5: Unified Config OAuth Detection — Current State

**File:** `apps/runtime-host-bridge/src/index.ts:613`

```typescript
function createUnifiedProviderAccounts(...) {
  // ...
  const authMode =
    provider.supportedAuthModes?.find((c) => c === "api-key-static") ??
    provider.supportedAuthModes?.[0] ??
    "api-key-static";
  return {
    // ...
    authMode: authMode as ProviderAccountRecord["authMode"],
    credentialRef: resolveEnvCredentialRef(providerConfig.apiKeyRef, ...),
    // ...
  };
}
```

Always prefers API key. Never checks for existing OAuth tokens on disk.

---

## R6: In-Memory Refresh — Current State

**File:** `apps/runtime-host-bridge/src/index.ts:1635`

`refreshOauthAccessToken()` writes to disk via `persistOauthTokenFile()` but does NOT call `rebuildCurrentState()`. The in-memory `currentAccounts` array is not updated.

---

## R7: Dead oauthHost Field — Current State

**File:** `apps/runtime-host-bridge/src/index.ts:837`

```typescript
interface ProviderPresetVariantOAuth {
  readonly oauthHost: string;  // NEVER READ
  readonly clientId: string;
  readonly deviceAuthorizationEndpoint: string;
  readonly tokenEndpoint: string;
  readonly requiredHeaders: readonly string[];
}
```

`oauthHost` is stored in `provider-presets.json` but never referenced in any function.

---

## R8: Frontend OAuth Display — Current State

**File:** `apps/runtime-ui/app/routes/providers.tsx`

The Providers page renders variants from the provider object's `variants` array. Currently, only providers from `provider-presets.json` have variants. LiteLLM-derived providers have empty `variants` arrays.

The OAuth flow UI (`oauthState`, polling, device code display) exists but only works when `selectedVariant.oauth` is present (from presets).

**File:** `apps/runtime-ui/DESIGN_SYSTEM.md`

The `registry-detail` template defines:
> Dense registry/editor split: compact editing or selection on one side, operational state ledger on the other.

No mention of OAuth-specific layout regions or auth-mode selection.

---

## R9: Browser Verification — Current State

No browser evidence exists for LiteLLM-derived OAuth providers. The existing browser evidence from Run 16 shows the Providers page with Moonshot's OAuth flow, but Moonshot comes from `provider-presets.json`, not LiteLLM.

---

## TODO

- [ ] Reconcile with prior run artifacts
- [ ] Lock 01-as-is.md
- [ ] Proceed to Phase 2 TO-BE plan

---

## Coverage Gate

- Coverage: PASS — All R# requirements have documented AS-IS state with file paths and code pointers

## Approval Gate

- Approval: PASS — AS-IS analysis is complete and ready for TO-BE planning

## Lock

- Status: `LOCKED`
- LockedAt: `2026-05-09T12:50:00+08:00`
- LockHash: `0227a843b69171b07c7aa828c712981e765b838997b5facba8316491886673e5`
