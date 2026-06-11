Run: `/.recursive/run/39-runtime-session-rehydration-model-inventory/`
Phase: `01 AS-IS`
Status: `LOCKED`
LockedAt: `2026-06-11T04:44:54Z`
LockHash: `b4d0e049a0a94bb3bcf651692eb58b6ef1ec7c788c447f5dbd29243e4e5ccaed`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/39-runtime-session-rehydration-model-inventory/00-requirements.md`
- `/.recursive/run/39-runtime-session-rehydration-model-inventory/00-worktree.md`
- `/.recursive/run/38-local-model-roles-peer-llama-swap-split/03-implementation-summary.md`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-ui/app/lib/device-authorization.ts`
Outputs:
- `/.recursive/run/39-runtime-session-rehydration-model-inventory/01-as-is.md`
Scope note: Documents post-run-38 session lifecycle, OAuth continuity, and alias inventory behavior before run 39 changes.

## TODO

- [x] Map G1–G8 gaps to current code paths
- [x] Map each in-scope `R#` to current behavior
- [x] Record reproduction steps for restart/session failures
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Reproduction Steps (Novice-Runnable)

1. `cd D:\DEV\role-model\.worktrees\39-runtime-session-rehydration-model-inventory\role-model-router`
2. Open `apps/runtime-host-bridge/src/index.ts` — search `clearRuntimeEndpoints` (line ~2144) and its call in `createRuntimeBridgeBackend` init (~6335)
3. Configure operator runtime: peer load `lfm2.5-8b-a1b`, activate remote `moonshot/kimi-k2.6`, verify `mixed.local-remote` routes on `:3456`
4. Stop runtime; relaunch packaged runtime
5. Observe: OAuth accounts may show healthy but `connectedWithoutEndpoint`; peer model absent from `/v1/models` until manual reload; alias pool may exclude local if YAML `model_ids` drift from live peer id

## Current Behavior by Gap

### G1 — Endpoint wipe on startup (`R1`)

- `clearRuntimeEndpoints()` executes `DELETE FROM runtime_endpoints` on every `createRuntimeBridgeBackend()` init.
- SQLite `upsertRuntimeEndpoint` can persist activations, but they are deleted before `listRuntimeEndpoints` is first read.
- Result: manual Providers UI activations do not survive restart; `connectedWithoutEndpointCount` rises for OAuth-healthy accounts.

### G2 — Peer load not rehydrated (`R6`)

- Peer model registration via `POST .../local/peer/models/:id/load` is session-local registry state.
- `peers.json` persists peer URLs, not last-loaded model + roles for auto-reload.
- No startup hook re-probes peer `/v1/models` or re-invokes peer load.

### G3 — Llama-swap load not rehydrated (`R6`)

- Llama-swap load via split API persists `model-overrides.json` role sidecar but not a durable last-loaded model manifest for bootstrap.
- When `llama_swap` enabled, operator must manually load after each runtime restart.

### G4 — Alias / inventory drift (`R7`)

- `resolveRequestedModelPool()` uses `collectAllowedEndpointIds(registry, alias.modelIds)` with **exact** `model_id` match.
- `model_aliases[].model_ids` in `runtime-config.yaml` are hand-authored; no reconciliation with live peer/activation inventory.
- Stale id (e.g. `lfm2.5-1.2b-instruct` vs live `lfm2.5-8b-a1b`) silently excludes local endpoint from pool.
- Zero-match aliases omit endpoints without `ALIAS_POOL_EMPTY` diagnostic.

### G5 — OAuth path split (`R4`)

- `hydrateOauthProviderAccounts()` promotes accounts when token file exists at account `credentialRef`.
- Unified config (`createUnifiedProviderAccounts`) checks `{providerId}.litellm.json`; manual Providers OAuth writes `{providerAccountId}.json`.
- Tokens persist on disk; re-auth is usually **not** required — missing endpoint rehydration (G1) is the common failure mode.

### G6 — Pending OAuth UI-only (`R4`)

- `listProviderDeviceAuthSessions` survives restart in SQLite.
- Server init does not resume polling pending device-auth sessions.
- UI (`device-authorization.ts`) auto-polls only when Providers page is open.

### G7 — No startup remote health (`R5`)

- Unified endpoints from `createUnifiedCloudSources()` are registered with `healthStatus: "healthy"` statically.
- No post-vendor-start probe updates remote endpoint health before first request.

### G8 — No session readiness surface (`R8`)

- `/api/role-model/runtime/summary` exposes credential readiness counts but not bootstrap stage, rehydration outcomes, alias drift, or per-model health probe results.

## Current Behavior by Requirement

| Req | Current state |
| --- | --- |
| `R0` | Run 38 split UI/APIs and `local-model-role-bindings` present; baseline tests 11/11 PASS in worktree |
| `R1` | Endpoints wiped on init — **not met** |
| `R2` | No `operator-intent.json` manifest — **not met** |
| `R3` | No ordered session bootstrap pipeline — **not met** |
| `R4` | OAuth hydrate on disk yes; path split + no server-side pending resume — **partial** |
| `R5` | No startup health probes — **not met** |
| `R6` | No peer/llama-swap auto-reload — **not met** |
| `R7` | Static YAML `model_ids` only — **not met** |
| `R8` | No session readiness UI/API — **not met** |
| `R9` | Existing OAuth restart test only; no restart-rehydration suite — **partial** |

## Relevant Code Pointers

| Area | Path | Notes |
| --- | --- | --- |
| Endpoint wipe | `index.ts` `clearRuntimeEndpoints` ~2144, call ~6335 | G1 root cause |
| OAuth hydrate | `index.ts` `hydrateOauthProviderAccounts` ~4189 | Tokens survive restart |
| Unified OAuth path | `index.ts` `createUnifiedProviderAccounts` ~2070 | `.litellm.json` filename |
| Alias pool | `index.ts` `collectAllowedEndpointIds` ~3280, `resolveRequestedModelPool` ~3293 | Exact model_id match |
| Device auth UI | `device-authorization.ts` | Browser-only poll resume |
| Peer load API | `index.ts` split peer handlers | Session-local activation |
| Readiness summary | `index.ts` `buildCredentialReadinessSummary` ~6438 | No bootstrap metadata |

## Evidence

- Worktree baseline tests: `evidence/logs/worktree-baseline-tests.log` (11/11 PASS)
- Code inspection: `role-model-router/apps/runtime-host-bridge/src/index.ts` (G1, G4, G5, G7)
- Run 38 operator baseline: `/.recursive/run/38-local-model-roles-peer-llama-swap-split/evidence/logs/runtime-config-baseline-pre-rebuild.json`
- Run 38 routing proof: `evidence/logs/green/routing-regression-2026-06-11.log` (0 BRIDGE_CRASH)

## Known Unknowns

1. Whether `operator-intent.json` or extended SQLite columns are the better manifest seam (Phase 2 decides).
2. Whether bootstrap should block `/healthz` ready until peer reload completes or report `degraded` asynchronously.
3. Exact inventory filter vocabulary when `model_ids` omitted from aliases (Phase 2 decides).

## Traceability

- G1 → `R1` — `clearRuntimeEndpoints` at init
- G2/G3 → `R6` — no peer/llama-swap reload hooks
- G4 → `R7` — `collectAllowedEndpointIds` exact match on YAML ids
- G5/G6 → `R4` — OAuth hydrate vs path split vs UI-only poll
- G7 → `R5` — static unified endpoint health
- G8 → `R8` — summary lacks bootstrap metadata
- `R0` → run 38 product present; baseline tests green
- `R2` → no manifest file today
- `R3` → no bootstrap pipeline today
- `R9` → partial existing OAuth restart test only
- `R10` → run 38 design-system/UI split — present; out of scope for run 39 changes (`OOS1`)
- `R11` → run 38 routing regression green pre-restart; must remain green post run 39 (`R9`)
- `R12` → run 38 llama-swap scaffold — present; out of scope (`OOS1`)
- `R16` → run 38 worktree isolation pattern adopted for run 39 Phase 0

## Subagent Capability Probe

- Subagent tools available; Phase 1 performed as controller self-audit.
- Delegation Decision Basis: code pointers verified directly in worktree; full context bundle available.

## Audit Execution Mode

- self-audit

## Coverage Gate

- [x] G1–G8 mapped to code and requirements
- [x] Run 38 baseline behaviors preserved in narrative
- [x] Reproduction steps are novice-runnable

Coverage: PASS

## Approval Gate

- [x] AS-IS is factual against worktree @ `a319a45`
- [x] Ready for Phase 2 TO-BE planning

Approval: PASS

Audit: PASS
