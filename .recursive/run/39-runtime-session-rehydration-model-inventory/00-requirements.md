Run: `/.recursive/run/39-runtime-session-rehydration-model-inventory/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-06-11T04:41:27Z`
LockHash: `31b01c0aac0f7be7fe4bc8d000a400c2cc74e295771c2305f56f8011b359cfcc`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md` (includes run 38 closeout deltas @ `723c069`)
- `/.recursive/DECISIONS.md`
- **Run 38 product baseline (authoritative, merged to `main` @ `723c069`):**
  - `/.recursive/run/38-local-model-roles-peer-llama-swap-split/00-requirements.md` (`R1`–`R11`, locked)
  - `/.recursive/run/38-local-model-roles-peer-llama-swap-split/addenda/00-requirements.llama-swap-setup-scaffold-and-ui-hints.addendum-01.md` (`R12`–`R16`, locked)
  - `/.recursive/run/38-local-model-roles-peer-llama-swap-split/03-implementation-summary.md` (locked)
  - `/.recursive/run/38-local-model-roles-peer-llama-swap-split/03-implementation-summary.addendum-01.md` (locked)
  - `/.recursive/run/38-local-model-roles-peer-llama-swap-split/07-state-update.md` (locked)
  - `/.recursive/run/38-local-model-roles-peer-llama-swap-split/evidence/logs/runtime-config-baseline-pre-rebuild.json`
- Prior related runs: `06`, `17`, `25`–`30`
- Code baseline (post-run-38 `main`): `role-model-router/apps/runtime-host-bridge/src/index.ts`, `local-model-role-bindings.ts`, `unified-runtime-config.ts`; `role-model-router/apps/runtime-ui/app/lib/device-authorization.ts`, `llama-swap-setup.ts`
Outputs:
- `/.recursive/run/39-runtime-session-rehydration-model-inventory/00-requirements.md`
Scope note: Run 39 starts from the **post-run-38 product state** and closes session-continuity gaps: OAuth/endpoint rehydration, startup health checks, peer/llama-swap reload, and inventory-driven alias pools. It does **not** re-deliver run 38 local role UI/API split.

## TODO

- [x] Declare run 38 product baseline as implementation starting point
- [x] Document post-run-38 gaps motivating run 39
- [x] Define stable `R#` identifiers with observable acceptance
- [x] Record verification discipline and operator regression baseline
- [x] Record out-of-scope boundaries and constraints
- [x] User approval of this requirements artifact (start run 39 2026-06-08)
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Prerequisite — run 38 product baseline

Run 39 implementation **must branch from post-run-38 `main`**, which includes the merged run 38 product commit.

| Field | Value |
| --- | --- |
| Baseline commit | `a319a45` (post-run-38 `main` + run 39 requirements seed) |
| Prior init commit | `c269a6d` (pre-run-38) |
| Run 38 branch | `recursive/38-local-model-roles-peer-llama-swap-split` (merged) |
| Run 38 locked phases | `00-worktree`, `01-as-is`, `02-to-be-plan`, `03-implementation-summary`, `06-decisions-update`, `07-state-update` |
| Addendum `01` | `R12`–`R16` llama-swap scaffold + UI hints (locked; `05-manual-qa.addendum-01.md`) |

### What exists after run 38 (starting truths)

**Local operator surfaces (run 38 `R1`, `R10`)**

- `/app/local/choose` chooser; `/app/local/peer-models` and `/app/local/llama-swap/models` split pages; llama-swap satellites under `/app/local/llama-swap/*`; legacy redirects preserved.
- `LocalModelRolePicker` on peer and llama-swap model pages.

**Split local APIs (run 38 `R2`, `R3`)**

- `GET/POST /api/role-model/local/peer/models` and `.../peer/models/:modelId/load|roles`
- `GET/POST /api/role-model/local/llama-swap/models` and `.../llama-swap/models/:modelId/load|roles|unload`
- Legacy combined `loadLocalModel` deprecated for UI; may remain for scripts.

**Role persistence and routing (run 38 `R4`–`R7`)**

- Peer roles on provider-account `modelRoleBindings`; survive `syncLocalPeerState` merge.
- Llama-swap roles on `model-overrides.json` `roleIds[]`.
- `local-model-role-bindings.ts` feeds `buildRuntimeRoleBindings` / `getEndpointRoleIds` for peer-backed **and** `llama-swap.local.*` registry endpoints.
- Wildcard peer accounts accept bindings when `allowedModels` is empty.

**Llama-swap onboarding UX (run 38 addendum `R12`–`R16`)**

- `llama-swap-setup.ts` scaffold + `LlamaSwapSetupModal` + runtime-config **Insert llama-swap scaffold** when no models declared.
- Scaffold is opt-in; does not auto-inject on runtime start.

**Packaged-runtime proof (run 38 `R9`, `R11`)**

- Operator baseline captured in `runtime-config-baseline-pre-rebuild.json`:
  - Local peer model: `lfm2.5-8b-a1b` with roles `general.chat`, `tool.agent`
  - Remote: `moonshot/kimi-k2.6` on `moonshot.personal.kimi-code`
  - Alias: `mixed.local-remote` visible on `GET /v1/models`
  - Downstream bearer: `role-model-local`
- Routing regression green with **0 `BRIDGE_CRASH`** on `:3456`.
- llama-swap live load proof **deferred** in operator env (`executionMode: decision_only`, no `llama_swap.models`).

### Post-run-38 gaps (motivation for run 39)

Run 38 proved peer role assignment and routing **within a single runtime session** after manual config parity. It did **not** make operator intent durable across restart, nor keep alias pools aligned with live inventory.

| Gap | Observed after run 38 | Impact |
| --- | --- | --- |
| **G1** Endpoint wipe | `clearRuntimeEndpoints()` on every bridge init | OAuth tokens survive; manual remote activations lost → `connectedWithoutEndpoint` until Providers UI revisit |
| **G2** Peer load not rehydrated | Peer model registration is session-local | After restart, `lfm2.5-8b-a1b` absent until operator reloads via Peer models |
| **G3** Llama-swap load not rehydrated | No persisted last-loaded model | Same as G2 for llama-swap path when enabled |
| **G4** Alias / inventory drift | `model_aliases[].model_ids` hand-authored in YAML | Run 38 incident: alias listed `lfm2.5-1.2b-instruct` while peer served `lfm2.5-8b-a1b` → local excluded from `mixed.local-remote` pool (`POLICY_DENY_ENDPOINT`) |
| **G5** OAuth path split | Unified config token path `{providerId}.litellm.json` vs manual `{providerAccountId}.json` | Same provider can look credentialed on one path only |
| **G6** Pending OAuth UI-only | Device-auth poll resumes in browser on Providers page only | Incomplete OAuth mid-restart stalls until UI opened |
| **G7** No startup remote health | Unified static endpoints assumed healthy | First live request may be first failure signal |
| **G8** No session readiness surface | Dashboard/summary lacks bootstrap truth | Operator cannot see rehydration/health without logs |

Run 39 closes G1–G8 **without** undoing run 38 deliverables.

## Problem Summary

Operators configure models once (peer register, llama-swap load, Providers OAuth + activate, unified YAML remote mappings) and expect the packaged runtime on `:3456` to **rehydrate that intent on every session start** with truthful readiness, health, and routable alias pools. Today, tokens and accounts mostly persist, but **activations and loads do not**, and **alias membership can drift** from live inventory.

## Fixed Guidance

1. **Run 39 extends run 38; it does not replace it.** Split local UI, split APIs, and `local-model-role-bindings` remain the operator and router contract for local roles.
2. **OAuth re-entry is not the default failure mode.** Requirements must distinguish missing tokens from missing endpoint rehydration (G1).
3. **Inventory is authoritative for alias pools.** Hand-authored `model_ids` in `runtime-config.yaml` must not be the only membership source (G4).
4. **Restart regression uses run 38 operator baseline.** Proof must show `lfm2.5-8b-a1b` + `moonshot/kimi-k2.6` + `mixed.local-remote` routable **without** repeating full manual setup after a clean runtime restart.
5. **Minimize new parallel config.** Prefer extending existing persistence (`runtime_endpoints`, `peers.json`, `model-overrides.json`, provider accounts, OAuth token files) before introducing new stores; any new manifest must be justified in Phase 2.

## Verification Discipline

| Layer | When | Gate |
| --- | --- | --- |
| Strict TDD (Phase 3) | Before each production change | Failing test first (RED), then implementation (GREEN) |
| Package tests (Phase 4) | After implementation | `runtime-host-bridge`, `sqlite-memory`, `runtime-ui` tests PASS |
| Restart drill (Phase 5) | After `runtime:package-sea` rebuild | Activate/load baseline → shutdown → relaunch → assert rehydration without manual re-activate |
| Routing regression (Phase 5) | Same relaunched session | Run 38 `R11` class cases still PASS + new restart cases PASS |
| Browser QA (Phase 5) | Optional hybrid | Session readiness visible; Providers page not required for post-restart routing |

`TDD Mode` for Phase 3: **`strict`**.

`QA Execution Mode` for Phase 5: **`agent-operated`** for restart drill and routing regression; **hybrid** optional for session-readiness UI clarity.

### Operator regression baseline (post-run-38 parity + restart)

Final verification restores and then **survives restart** with:

| Asset | Baseline |
| --- | --- |
| Local peer model | `lfm2.5-8b-a1b` registered with roles `general.chat`, `tool.agent` |
| Remote model | `moonshot/kimi-k2.6` on `moonshot.personal.kimi-code` (OAuth token on disk) |
| Routing alias | `mixed.local-remote` resolves to **both** local and remote endpoints from live inventory |
| Downstream auth | Bearer `role-model-local` |
| Proof URL | `http://127.0.0.1:3456` |

Restart drill (minimum):

1. Establish baseline on running runtime (peer load + remote activate + alias routable) — same class as run 38 `R9`.
2. Stop runtime process cleanly.
3. Relaunch packaged runtime (`role-model-launcher.exe` from SEA dist per run 38 QA notes).
4. **Without** opening Providers UI or re-running manual load/activate steps, assert:
   - `GET /v1/models` lists `lfm2.5-8b-a1b`, `moonshot/kimi-k2.6`, `mixed.local-remote`
   - `POST /v1/chat/completions` with `model: mixed.local-remote` returns HTTP 200 and can select local endpoint when policy favors local
   - `connectedWithoutEndpointCount === 0` for previously-ready accounts (API summary)
5. Save evidence to `evidence/logs/green/restart-rehydration-<date>.log`.

## Requirements

### `R0` Baseline inheritance from run 38

Description:
Run 39 must treat the run 38 worktree product state as the implementation and UX baseline. No run 38 behavior locked in `03-implementation-summary.md` may regress unless an addendum explicitly supersedes it.

Acceptance criteria:
- Phase 0 worktree branches from `main` @ `a319a45` (post-run-38), cited in `00-worktree.md`.
- Split local routes, split APIs, `local-model-role-bindings.ts`, peer sync merge, wildcard validation, and llama-swap scaffold UX (`R12`–`R16`) remain functional after run 39 changes.
- Run 38 `R11` regression suite still passes on pre-restart session before restart drill.
- Phase 1 AS-IS cites run 38 locked artifacts and post-run-38 gaps G1–G8 from this document.

### `R1` Replace endpoint wipe with operator-intent rehydration

Description:
Stop deleting persisted manual remote activations on every bridge startup (G1).

Acceptance criteria:
- `clearRuntimeEndpoints()` is removed or limited to explicit operator reset — not default init.
- On backend init, SQLite `runtime_endpoints` rows reload and merge via `mergeRegistrySources()` without Providers UI interaction.
- Bridge test: activate remote endpoint → shutdown backend → recreate backend → same `endpointId` routable without `POST /api/role-model/endpoints` repeat.
- `connectedWithoutEndpointCount` is zero for accounts that had active endpoints before shutdown when credentials remain valid.
- Remote `modelRoleBindings` from run 38 Providers flow remain attached to rehydrated endpoints.

### `R2` Durable operator-intent manifest for activations and loads

Description:
Persist reconstructible operator intent for remote activations and local loads beyond a single SQLite table row (G1, G2, G3).

Acceptance criteria:
- Scope-local manifest (path decided in Phase 2; e.g. `{runtimeStateRoot}/{scopeId}/operator-intent.json`) records at minimum:
  - Per manual remote account: activated `modelId`, `region`, `modelRoleBindings`, last `endpointId`
  - Per peer: last registered `modelId`, `roleIds`, `autoReload` (default true when previously loaded)
  - Per llama-swap: last loaded `modelId`, `roleIds`, `autoReload` when `llama_swap` enabled
- Manifest updates on successful peer load (`POST .../local/peer/models/:id/load`), llama-swap load, and remote `activate`.
- Startup rehydration reads manifest **and** SQLite; conflict rules documented in Phase 2.
- Schema versioned and validated; corrupt manifest fails closed with operator-visible diagnostics.

### `R3` Server-side session bootstrap pipeline

Description:
Ordered server-side bootstrap after SQLite init (G1, G2, G3, G6, G7, G8).

Acceptance criteria:
- Bootstrap stages (minimum): (1) credential hydrate, (2) endpoint rehydrate (`R1`), (3) peer rehydrate, (4) vendor start (llama-swap, LiteLLM when configured), (5) remote health probes (`R5`).
- Structured diagnostics persisted and exposed on `/api/role-model/runtime/summary` and/or dedicated bootstrap read API.
- `/healthz` reports bootstrap phase, per-stage status, aggregate readiness (`ready` | `degraded` | `blocked`).
- Partial failure isolation: one bad remote model does not block unrelated models from `ready`.
- Bootstrap runs without browser/UI; Providers page not required.

### `R4` OAuth continuity and credential-path unification

Description:
OAuth must survive restarts without re-entry; unify fragmented credential paths (G5, G6).

Acceptance criteria:
- Extends existing `hydrateOauthProviderAccounts()`: token file at account `credentialRef` → `active`/`healthy` without UI.
- Unified-config (`createUnifiedProviderAccounts`) and manual Providers accounts for the same logical provider resolve OAuth through **one canonical path** or documented alias layer (no duplicate files required).
- Pending device-auth sessions with `status === "pending"` and unexpired `expiresAtMs` resume **server-side** during bootstrap (`R3` stage 1).
- Env-backed accounts stay `credentials-missing` when unset; bootstrap surfaces them.
- Proactive refresh: OAuth accounts with refresh token and expiry within configurable skew (default 5 minutes) attempt refresh during bootstrap; outcome recorded.
- Extends run 17 R5/R6 behavior; does not regress manual Kimi OAuth flow proven in run 38 baseline.

### `R5` Startup health checks for configured remote models

Description:
Health-check every remote model the operator has added on session start (G7).

Acceptance criteria:
- After LiteLLM/unified remote plane is reachable, bootstrap probes each remote endpoint (unified `createUnifiedCloudSources()` entries **and** rehydrated manual activations).
- Lightweight probe (models list or minimal completion) via injected fetcher in tests; no live provider in CI.
- Updates endpoint `healthStatus` and diagnostics with reason codes: `auth`, `timeout`, `model-not-found`, `vendor-down`.
- Probes read-only for operator YAML/JSON config.
- `decision_only` mode may skip execution probes with explicit `skipped` bootstrap status.

### `R6` Peer and llama-swap session rehydration

Description:
Re-load local models declared by run 38 split APIs after restart (G2, G3).

Acceptance criteria:
- Peer: for each `peers.json` entry with persisted loaded `modelId` and `autoReload !== false`, bootstrap re-probes peer `/v1/models` and calls peer load path (same semantics as `POST .../local/peer/models/:modelId/load` including `roleIds` from manifest/account).
- Llama-swap: when `llama_swap` operational per `readLlamaSwapConfigStatus`, bootstrap invokes load for persisted model id(s) after vendor health.
- Rehydration preserves run 38 role bindings (`modelRoleBindings`, `model-overrides.json` `roleIds`) — no clobber via `syncLocalPeerState`.
- Failed reload → `degraded` per source; routing excludes unavailable locals deterministically.
- Restart drill proves `lfm2.5-8b-a1b` peer endpoint returns without manual Peer models UI interaction.

### `R7` Canonical routable inventory and alias auto-reconciliation

Description:
Alias pools must reflect live inventory, fixing G4 without manual `model_ids` maintenance.

Acceptance criteria:
- Bridge maintains **routable inventory** on each `rebuildCurrentState()` from: merged registry endpoints, active peer loads, active llama-swap loads, unified cloud sources (health-aware when `R5` ran).
- Default alias resolution derives pool membership from inventory filters (source type local/remote, `maxDifficulty`, role bindings) — explicit `model_ids` optional hints only.
- Legacy aliases with explicit `model_ids`: bootstrap emits **drift warnings** when ids ∉ inventory (suggest live ids e.g. `lfm2.5-8b-a1b`).
- Zero-match alias pools emit `ALIAS_POOL_EMPTY` (or equivalent) in routing diagnostics and runtime summary — never silent omission.
- Config save validation rejects alias definitions that cannot resolve to inventory under current operator intent.
- Restart drill: `mixed.local-remote` includes local peer endpoint when `lfm2.5-8b-a1b` rehydrated — no `POLICY_DENY_ENDPOINT` solely due to stale template id.

### `R8` Session readiness operator surfaces

Description:
Expose bootstrap and inventory state without log scraping (G8).

Acceptance criteria:
- Runtime UI dashboard or `Control > Session readiness` shows: bootstrap stage, OAuth pending/expired, credentials-missing, rehydrated endpoint counts, remote health results, peer/llama-swap reload status, alias drift warnings.
- Extends existing readiness metrics (`readyAccountCount`, `connectedWithoutEndpointCount`) to post-bootstrap truth.
- Run 38 split local pages unchanged in scope; may add non-blocking readiness banners only if Phase 2 documents copy.
- Agent-operated QA asserts readiness via HTTP APIs without browser OAuth polling.

### `R9` Validation floor and restart regression guards

Description:
Repo validators prove session continuity on top of run 38 regression floor.

Acceptance criteria:
- New bridge tests: OAuth hydrate + endpoint rehydrate + mocked remote health + alias inventory reconciliation (extends `rehydrates connected OAuth accounts from stored token files on backend restart`).
- `runtime:validate-host` or `runtime:validate-vendors` adds restart-rehydration scenario.
- Run 38 `R11` cases remain PASS after run 39 (no functionality lost).
- `probe-downstream-ingress.py` still reports **0 `BRIDGE_CRASH`** post-restart.
- Phase 3 strict RED/GREEN evidence logged under `evidence/logs/`.

## Out of Scope

- `OOS1`: Re-splitting or redesigning run 38 Local UI (`R1`, `R10`) or llama-swap scaffold/modal (`R12`–`R16`)
- `OOS2`: Changing llama-swap vendor swap algorithm, TTL, or process supervision
- `OOS3`: Difficulty/controller/hybrid routing algorithms (runs 26–30) except inventory inputs they consume
- `OOS4`: Encrypting OAuth token files at rest
- `OOS5`: Multi-host synced runtime state
- `OOS6`: Automatic peer discovery beyond `peers.json`
- `OOS7`: Merging peer and llama-swap into one backend implementation
- `OOS8`: Committing operator secrets into evidence logs

## Constraints

- Branch from run 38 worktree product state (`R0`)
- Minimize diff: extend `runtime_endpoints`, `peers.json`, `model-overrides.json`, provider accounts, OAuth files before new stores
- Preserve run 38 product naming (**role-model** only in operator copy)
- Packaged-runtime validation on `:3456` mandatory for `verified` on `R6`, `R7`, `R9`
- Restart drill mandatory before run closeout (not unit tests alone)
- Do not break run 38 peer wildcard validation or remote Providers onboarding

## Assumptions

- Run 38 worktree changes merge or run 39 worktree forks from the same HEAD before Phase 3
- Same-host `runtimeStateRoot` and `scopeId` across restarts (SQLite contract from run 06)
- Operators may use peer only, llama-swap only, unified YAML remote, manual Providers, or hybrid — run 39 supports all without forcing one path
- Operator env may remain peer-only (`decision_only`, no `llama_swap.models`); llama-swap rehydration requirements apply when llama-swap becomes operational

## Open Unknowns (resolve in Phase 1 AS-IS)

1. Exact manifest path and schema vs extending SQLite only (`R2`).
2. Default alias policy when `model_ids` omitted: inventory filter vocabulary (roles, source type, difficulty ceiling).
3. Whether server-side OAuth poll runs synchronously before `/healthz` ready or in background with `degraded` until complete.
4. ~~Whether run 38 merges to `main` before run 39 Phase 0~~ **Resolved:** run 38 merged to `main` @ `723c069` (2026-06-08 closeout).

## Dependencies

| Prior run | Relationship |
| --- | --- |
| **38** | **Implementation baseline** — split local UI/APIs, role bindings, operator proof models |
| 06 | SQLite `provider_accounts`, `runtime_endpoints` |
| 17 | OAuth generalization, unified-config OAuth detection |
| 25–30 | Alias pools, difficulty, controller — consumers of `R7` inventory |
| 37 | Tool-turn ingress — must remain green in `R9` restart regression |

## Coverage Gate

- [x] Run 38 product baseline explicitly declared as starting point (`R0`, Prerequisite section)
- [x] Post-run-38 gaps G1–G8 mapped to `R1`–`R8`
- [x] OAuth persistence vs endpoint rehydration distinguished
- [x] Remote startup health and peer/llama-swap reload required
- [x] Alias/inventory drift (run 38 incident) addressed in `R7`
- [x] Run 38 deliverables protected in Out of Scope and `R0`
- [x] Restart drill baseline uses run 38 operator parity
- [x] Verification discipline and strict TDD declared
- [x] User approved the requirements artifact

Coverage: PASS

## Approval Gate

- [x] Requirements bounded to session continuity and inventory; run 38 not re-implemented
- [x] Acceptance criteria observable via API, bootstrap diagnostics, restart drill, routing evidence
- [x] Implementation must branch from run 38 worktree baseline
- [x] User confirms run id `39-runtime-session-rehydration-model-inventory`
- [x] User confirms default alias policy: inventory-driven with optional `model_ids` hints (`R7`)
- [x] User confirms server-side pending-OAuth resume on bootstrap (`R4`)
- [x] User approved proceeding to Phase 0/1 (2026-06-08)

Coverage: PASS

Approval: PASS

Audit: PASS
