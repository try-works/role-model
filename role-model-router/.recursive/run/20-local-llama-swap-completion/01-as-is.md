Run: `/.recursive/run/20-local-llama-swap-completion/`
Phase: `01 AS-IS`
Status: `LOCKED`
Inputs:
- `/.recursive/run/20-local-llama-swap-completion/00-requirements.md`
- `/.recursive/run/19-local-llama-swap-proxy/addenda/audit-runs-18-19.md`
- `/.recursive/run/18-local-llama-swap-runtime/03-implementation-summary.md`
- `/.recursive/run/19-local-llama-swap-proxy/03-implementation-summary.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
Outputs:
- `/.recursive/run/20-local-llama-swap-completion/01-as-is.md`
Scope note: Analyze the current state of the codebase to identify what needs to change for Run 20.

---

# Run 20: Local llama-swap Completion — AS-IS Analysis

## Current State Summary

Run 18 created the "Local" sidebar section with Models, Swap History, and Policy pages. Run 19 wired the `listLocalModels`, `loadLocalModel`, and `unloadLocalModel` backend methods to actual llama-swap proxy calls. However, significant gaps remain:

### Active Stubs

Three backend methods in `runtime-host-bridge/src/index.ts` (~L4555) still return empty defaults:

```typescript
async readLocalPolicy(): Promise<Record<string, unknown>> {
  return {};  // STUB: no file I/O
},
async updateLocalPolicy(body): Promise<Record<string, unknown>> {
  return body;  // STUB: no persistence
},
async listSwapHistory(): Promise<SwapEvent[]> {
  return [];  // STUB: no SQLite table
},
```

**Impact:** Policy page shows empty form. Swap history page shows empty state. Users cannot configure local policy or view swap history.

### Dead Code

`getLogs?` was added to `VendorRuntime` in `vendor-abstraction/src/index.ts` (~L351) and implemented in `vendor-llama-swap/src/index.ts`, but no consumer exists. No bridge endpoint, no UI feature, no test calls it.

### Missing Features (Previously OOS)

| Feature | Status | Where It Would Live |
|---|---|---|
| Real-time log streaming UI | Not implemented | `Local > Logs` route |
| Matrix solver UI | Not implemented | `Local > Matrix` route |
| Peer passthrough | Not implemented | `Local > Peers` route |
| Model-level overrides | Not implemented | Per-model controls on `Local > Models` |

### DESIGN_SYSTEM.md State

Current `DESIGN_SYSTEM.md` documents:
- `Local > Models` (live, `registry-detail` template)
- `Local > Swap` (live, `ledger-inspector` template)
- `Local > Policy` (live, `registry-detail` template)

Missing documentation for:
- `Local > Logs` (needs `dual-console` template)
- `Local > Matrix` (needs `matrix-grid` template)
- `Local > Peers` (needs `registry-detail` template)
- Model-level overrides UI pattern

## Relevant Code Pointers

### Backend
- `role-model-router/apps/runtime-host-bridge/src/index.ts` — Stub methods at ~L4525
- `role-model-router/packages/vendor-llama-swap/src/index.ts` — `getLogs` implementation
- `role-model-router/packages/vendor-abstraction/src/index.ts` — `getLogs?` in interface
- `role-model-router/packages/sqlite-memory/src/index.ts` — SQLite schema (no `llama_swap_events` table)

### Frontend
- `role-model-router/apps/runtime-ui/app/routes/local-models.tsx` — Models page
- `role-model-router/apps/runtime-ui/app/routes/local-swap.tsx` — Swap history page
- `role-model-router/apps/runtime-ui/app/routes/local-policy.tsx` — Policy page
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts` — API client methods
- `role-model-router/apps/runtime-ui/app/lib/design-system.ts` — Navigation sections
- `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md` — Design system spec

### CLI
- `role-model-router/apps/runtime-host-bridge/src/cli.ts` — Already wires local handlers (fixed in `cc777e7`)

## Known Unknowns

1. Whether llama-swap `/running` endpoint will ever expose load timestamps (affects `loadedAt` documentation strategy).
2. Whether model-level overrides should be stored in the same `local-policy.json` or a separate file.
3. Whether peer passthrough requires backend proxy changes or just UI/configuration.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/18-local-llama-swap-runtime/03-implementation-summary.md` — SP1–SP6 details
- `/.recursive/run/19-local-llama-swap-proxy/03-implementation-summary.md` — SP1–SP3 details
- `/.recursive/run/19-local-llama-swap-proxy/addenda/audit-runs-18-19.md` — Gap analysis

---

## Coverage Gate

- All stub methods identified with file paths and line numbers.
- All dead code identified.
- All missing features from prior OOS list identified.
- DESIGN_SYSTEM.md gaps identified.
- Relevant code pointers provided.

**Coverage: PASS**

## Approval Gate

- AS-IS analysis is complete and ready for planning.

**Approval: PASS**

LockedAt: 2026-05-10T08:07:00+08:00
LockHash: `run20-as-is-locked`
