# Run 16 Addendum 07 — Local Inference Server Providers

**Run:** `16-router-runtime-unified-telemetry-dashboard`
**Addendum:** `07`
**Commit:** `7a536b9`
**Parent addenda:** `04` (LiteLLM-only catalog), `05` (Local Model Config UI)

---

## Problem

The bridge exposed a single synthetic provider called `llama-swap` with `providerKind: "provider-openai"`. This is architecturally incorrect because:

1. **llama-swap is a vendor/middleware**, not a provider — it manages child processes for actual inference servers
2. **Users want to see the actual inference engine** they'll be using (llama.cpp, vLLM, etc.)
3. **The provider catalog should be honest** about what software serves the models

The llama-swap project supports these local inference servers:
- [llama.cpp](https://github.com/ggerganov/llama.cpp) — best supported, `llama-server` binary
- [vLLM](https://github.com/vllm-project/vllm) — recommended to run via Docker/Podman
- [TabbyAPI](https://github.com/theroyallab/tabby-api) — recommended to run via Docker/Podman
- [stable-diffusion.cpp](https://github.com/leejet/stable-diffusion.cpp) — SDAPI endpoints for image generation

## Decision

Replace the single synthetic `llama-swap` provider with four synthetic providers, one per inference server. The llama-swap runtime config mechanism remains unchanged underneath — it still manages the local model configuration. The change is purely in how the provider catalog presents local execution options.

## Changes

### Bridge: `apps/runtime-host-bridge/src/index.ts`

**Removed:**
```typescript
{
  providerId: "llama-swap",
  displayName: "Local (llama-swap)",
  providerKind: "provider-openai",
  // ...
}
```

**Added:** Four providers with `providerKind: "local-engine"`:

| Provider ID | Display Name | Description |
|-------------|-------------|-------------|
| `llamacpp` | llama.cpp | Local inference via llama.cpp (llama-server). Best supported by llama-swap. |
| `vllm` | vLLM | Local inference via vLLM. Recommended to run via Docker/Podman. |
| `tabbyapi` | TabbyAPI | Local inference via TabbyAPI. Recommended to run via Docker/Podman. |
| `stable-diffusion-cpp` | stable-diffusion.cpp | Local image generation via stable-diffusion.cpp. SDAPI endpoints supported. |

All four share:
- `authFamily: "none"` — local inference requires no authentication
- `adapterFamily: "ai-sdk-openai-compatible"` — all speak OpenAI-compatible HTTP
- `apiBase: "http://localhost:8080"` — default llama-swap proxy port
- `modelIds: localModelIds` — same model list from llama-swap runtime config
- Single variant `local-default` with `authMode: "api-key-static"`

### UI: `apps/runtime-ui/app/routes/providers.tsx`

Updated the provider page logic from:
```typescript
selectedProvider?.providerId === "llama-swap"
```
to:
```typescript
selectedProvider?.providerKind === "local-engine"
```

This ensures the local model CRUD form appears for ANY local inference server, not just one hardcoded provider ID.

## Validation

- `runtime:validate-ui` ✓ — Provider count increased from 108 → 112 (108 remote + 4 local)
- `runtime:validate-host` ✓
- `smoke` ✓
- Bridge tests ✓

## API Evidence

```bash
curl http://127.0.0.1:3456/api/role-model/providers | grep '"providerId"'
```

Returns all four local inference servers alongside the 108 LiteLLM-derived remote providers.

## Design System Impact

No changes to `DESIGN_SYSTEM.md` were required. The existing `registry-detail` template already supports `local-engine` providers through the `providerKind` discriminator. The local model CRUD form (Addendum 05) works unchanged because it keys off `providerKind === "local-engine"`.

## Out of Scope

- **OOS1 — Actual llama-swap process management**: The Go bridge process (`vendor/llama-swap/`) still manages starting/stopping llama-swap. This addendum only changes how local execution is presented in the catalog.
- **OOS2 — Per-server default ports**: All four providers default to `localhost:8080` because llama-swap proxies all traffic through its own port. Future work could allow per-server port overrides.
- **OOS3 — Server-specific capabilities**: llama.cpp and vLLM are both marked as `text.chat` + `tools.function_calling` via the same mechanism. Future work could add capability differences.

## Lock

- Status: `LOCKED`
- LockedAt: `2026-05-09T18:45:00+08:00`
- LockHash: `TBD`
