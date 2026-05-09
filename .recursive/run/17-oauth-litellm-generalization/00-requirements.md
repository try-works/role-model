Run: `/.recursive/run/17-oauth-litellm-generalization/`
Phase: `00 Requirements`
Status: `DRAFT`
Inputs:
- `/.recursive/run/16-router-runtime-unified-telemetry-dashboard/addenda/oauth-audit-findings.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
Outputs:
- `/.recursive/run/17-oauth-litellm-generalization/00-requirements.md`
Scope note: Defines the requirement to generalize the OAuth2 device-code implementation so it works with any LiteLLM provider that supports OAuth, not just Moonshot/Kimi.

# OAuth LiteLLM Generalization

## Background

The current OAuth2 device-code flow is tightly coupled to Moonshot/Kimi. The `createDeviceHeaders()` function hardcodes Kimi-specific headers (`KimiCLI/1.41.0`, `X-Msh-*`). The OAuth metadata (clientId, tokenEndpoint, deviceAuthorizationEndpoint) lives only in `provider-presets.json` which contains a single provider (Moonshot). The `LiteLLMProviderInfo` interface has `supportedAuthModes` but no OAuth endpoint configuration.

With 108 LiteLLM-derived providers in the catalog, any provider that supports OAuth2 device code cannot be onboarded without hand-coding in `provider-presets.json`.

## Requirements

### R1 — Generalize Device Headers for OAuth Requests
The `createDeviceHeaders()` function must use the provider-specific `requiredHeaders` from `ProviderPresetVariantOAuth` instead of hardcoding Kimi-specific headers.

**Acceptance criteria:**
- A new provider with OAuth can be added without modifying `createDeviceHeaders()`
- Kimi/Moonshot continues to work with its existing headers
- The `User-Agent` defaults to `Role-Model-Runtime/1.0` unless overridden by provider config

### R2 — Add OAuth Metadata to LiteLLM Provider Catalog
The `LiteLLMProviderInfo` interface must include OAuth endpoint metadata so that LiteLLM-derived providers can expose OAuth without requiring `provider-presets.json` entries.

**Acceptance criteria:**
- `LiteLLMProviderInfo` has an optional `oauth` field with: `oauthHost`, `clientId`, `deviceAuthorizationEndpoint`, `tokenEndpoint`, `requiredHeaders`, `scope`
- `KNOWN_PROVIDER_OVERRIDES` can populate this field for known OAuth providers
- The bridge `startProviderDeviceAuthorization()` reads OAuth config from `LiteLLMProviderInfo` as fallback when `provider-presets.json` has no entry

### R3 — Add OAuth `scope` Support
The OAuth device authorization request must include a `scope` parameter when the provider configuration defines one.

**Acceptance criteria:**
- `ProviderPresetVariantOAuth` and the new `LiteLLMProviderInfo.oauth` both include an optional `scope` field
- The device authorization request body includes `scope` when it is non-empty
- Moonshot/Kimi continues to work (scope may be omitted for backward compatibility)

### R4 — Fix "local-encrypted-file" Credential Backend Naming
The credential backend named `"local-encrypted-file"` writes plaintext JSON. It must be renamed to `"local-file"` to accurately reflect its behavior.

**Acceptance criteria:**
- All references to `"local-encrypted-file"` are renamed to `"local-file"`
- Existing persisted credentials continue to be readable (backward compatibility)
- Tests and validation pass after rename

### R5 — Support OAuth in Unified Runtime Config Accounts
When `createUnifiedProviderAccounts()` creates accounts from unified runtime config, it must check for existing OAuth tokens before defaulting to API key auth mode.

**Acceptance criteria:**
- If an OAuth token file exists for a provider, the unified config account uses `authMode: "oauth2-device-code"`
- If no OAuth token exists, the current behavior (prefer API key) is preserved
- The credentialRef points to the OAuth token path when OAuth is detected

### R6 — Refresh Token Updates In-Memory State
After `refreshOauthAccessToken()` writes a refreshed token to disk, the in-memory `currentAccounts` must be updated so subsequent requests in the same process use the new token without re-reading from disk.

**Acceptance criteria:**
- `refreshOauthAccessToken()` triggers `rebuildCurrentState()` or equivalent update
- The refreshed token is used for the next request in the same process without disk read
- Tests verify this behavior

### R7 — Remove or Use Dead `oauthHost` Field
The `oauthHost` field in `ProviderPresetVariantOAuth` is stored but never referenced. It must either be used (e.g., for provider discovery URL construction) or removed.

**Acceptance criteria:**
- `oauthHost` is either referenced in OAuth flow logic or removed from the interface
- If removed, all JSON fixtures are updated
- No TypeScript compilation errors

### R8 — Frontend OAuth Provider Display Update
The Providers page (`/app/control/providers`) must display OAuth variants from LiteLLM-derived providers, not just from `provider-presets.json`. When a LiteLLM provider has OAuth metadata (R2), the UI must render the OAuth variant alongside the API-key variant.

**Acceptance criteria:**
- The Providers page reads OAuth config from `LiteLLMProviderInfo` (not just presets)
- OAuth variants display the correct auth mode label (`oauth2-device-code`)
- The device authorization flow UI works for LiteLLM-derived OAuth providers
- **Card layouts**: If the provider card component changes (e.g., new OAuth badge, variant selector, auth mode indicator), `DESIGN_SYSTEM.md` component rules are updated first
- **Page layouts**: If the Providers page layout changes (e.g., new OAuth panel, split between API-key and OAuth setup, device-auth status region), the `registry-detail` template definition in `DESIGN_SYSTEM.md` is updated first
- Use `[skill:ui-design-system]` for both card-level and page-level design guidance

### R9 — Browser Verification
All frontend changes must be verified in a live browser. The OAuth flow must be manually QA-tested by navigating the Providers page, selecting an OAuth-capable provider, and verifying the device authorization UI renders.

**Acceptance criteria:**
- Browser screenshot or evidence of the Providers page with OAuth variants
- Browser screenshot or evidence of the device authorization flow UI
- The UI build (`corepack pnpm --filter @role-model-router/runtime-ui build`) completes without errors
- The UI dev server starts and serves the Providers page at `http://127.0.0.1:5173/app/control/providers`

## Out of Scope

- **OOS1 — Adding OAuth for Anthropic**: Anthropic OAuth support is deferred. The infrastructure will support it, but no override entry is required in this run.
- **OOS2 — Actual Encryption for Credential Files**: True encryption of OAuth token files is deferred. The rename to `"local-file"` is honest about current behavior.
- **OOS3 — OAuth2 Client Credentials Flow**: Only device-code flow is in scope. Other OAuth flows (client credentials, user grant) are out of scope.

## Constraints

- All existing tests must continue to pass
- The `provider-presets.json` format must remain backward compatible
- The `LiteLLMProviderInfo` interface changes must not break existing consumers
- The Go bridge process (`rolemodel_bridge_process.go`) must not require changes

## Traceability

| Requirement | Planned Phase 2 Section | Validation |
|-------------|------------------------|------------|
| R1 | Device header generalization | Unit test + validate-ui |
| R2 | LiteLLM catalog OAuth extension | Unit test + catalog build |
| R3 | Scope parameter support | Unit test + validate-ui |
| R4 | Backend rename | Schema validation + all tests |
| R5 | Unified config OAuth detection | Unit test + smoke test |
| R6 | In-memory refresh update | Unit test |
| R7 | oauthHost cleanup | Schema validation + all tests |
| R8 | Frontend OAuth provider display | UI build + browser screenshot |
| R9 | Browser verification | Manual QA with browser evidence |

## TODO

- [x] Write 00-worktree.md
- [x] Lock 00-requirements.md
- [ ] Proceed to Phase 1 AS-IS

---

## Coverage Gate

- Coverage: PASS — All requirements from the OAuth audit findings are mapped to R# or OOS#

## Approval Gate

- Approval: PASS — Requirements are concrete enough for Phase 1 AS-IS analysis

## Lock

- Status: `LOCKED`
- LockedAt: `2026-05-09T12:47:00+08:00`
- LockHash: `d608b22f81e0a7e85ac8623a25952dcce680929cdd1a3d2e726e1793b40c1316`
