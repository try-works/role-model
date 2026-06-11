Run: `/.recursive/run/39-runtime-session-rehydration-model-inventory/`
Phase: `00 Requirements`
Status: `APPROVED`
Addendum: `02`
Inputs:
- `/.recursive/run/39-runtime-session-rehydration-model-inventory/00-requirements.md` (`R1`–`R9`, gaps G1–G8)
- `/.recursive/run/39-runtime-session-rehydration-model-inventory/addenda/00-requirements.routing-diagnostics-remediation.addendum-01.md` (`R10`–`R11`)
- Operator report (2026-06-11): local peer + OAuth not surviving restart; Craft `hello` still `medium` → remote Kimi
- `role-model-router/apps/runtime-host-bridge/src/index.ts` (startup init, `clearRuntimeEndpoints`, `hydrateOauthProviderAccounts`, `summarizeDifficultySignals`)
- `role-model-router/apps/runtime-ui/app/lib/view-models.ts` (provider readiness counts)
- Operator machine state audit: `scripts/operator-audit-persistence.ts` (2026-06-11)
Outputs:
- `/.recursive/run/39-runtime-session-rehydration-model-inventory/addenda/00-requirements.session-persistence-and-r11-gap.addendum-02.md`
- `/.recursive/run/39-runtime-session-rehydration-model-inventory/evidence/logs/operator-persistence-r11-gap-audit-2026-06-11.log`
Scope note: Audits why packaged-runtime restart drops local peer registration and presents OAuth as needing re-entry, and why `R11` does not fix Craft `hello` classification in production. Proposes requirement deltas `R12`–`R15`. Does not implement fixes in this addendum.

## TODO

- [x] Audit local peer persistence across restart
- [x] Audit OAuth credential persistence vs UI re-auth prompt
- [x] Reconcile operator `operator-intent.json` on disk with code on `main`
- [x] Trace live `req-runtime-host-bridge` classification (`medium`, `codeOrSchemaBurden: true`)
- [x] Define requirement deltas `R12`–`R15`
- [x] User approval of this addendum (closeout 2026-06-11)
- [x] Implement `R12`–`R15` (R12–R14 via run 39 SP1–SP2; R15 last-user-turn burden + `test/craft-ask-difficulty.test.ts`)

## Operator Report (2026-06-11)

1. **Restart persistence:** After `role-model-launcher.exe` restart, local peer model (`lfm2.5-8b-a1b`) is gone until manually re-registered; remote Kimi may appear in UI but OAuth must be completed again.
2. **Craft routing:** New Craft chat with user text `hello` on `mixed.local-remote` still returns routing diagnostics: `difficulty: medium`, `codeOrSchemaBurden: true`, selected endpoint `moonshot/kimi-k2.6`.

## Audit — Session persistence (why restart loses operator setup)

### A1 — Local peer model

| Layer | Expected | Observed on operator machine | Root cause |
| --- | --- | --- | --- |
| Peer URL | Survive restart | **Yes** — `%LOCALAPPDATA%\Role Model Runtime\peers.json` contains peer `54fc2746-6472-42b0-901b-f2b178f5c0d0` @ `http://127.0.0.1:1234` | `readStoredPeers()` + `syncLocalPeerState()` run on startup and recreate provider accounts |
| Peer model roles | Survive restart | **Partial** — `modelRoleBindings` on peer provider account persist in SQLite `provider_accounts` | Account rows survive restart |
| Routable local endpoint | Survive restart | **No** — `runtime_endpoints` empty immediately after bridge init until manual `POST .../local/peer/models/:id/load` or `POST /api/role-model/endpoints` | **`clearRuntimeEndpoints(databasePath)` runs on every `createRuntimeBridgeBackend` init** (`index.ts` ~6354), deleting all activated endpoint rows before rehydration |
| Operator intent manifest | Drive auto-reload | **Orphan** — `%LOCALAPPDATA%\Role Model Runtime\standalone-runtime\operator-intent.json` exists with `peerLoads[]` and `remoteActivations[]`, but **no `operator-intent` reader exists in `main` branch** (`grep` over `role-model-router/` returns zero matches) | Run 39 SP1 (`operator-intent.ts`, bootstrap reader) was implemented in run 39 worktree artifacts and locked in run docs, but **is not present in the operator’s packaged-runtime source tree on `main`** |

**G2 mapping (run 39):** Peer *configuration* persists; peer *load/activation* does not. Operator must revisit Peer models UI or call load API after every restart.

**Code anchor — endpoint wipe:**

```6350:6354:role-model-router/apps/runtime-host-bridge/src/index.ts
  const initialization = initializeSqliteMemory({
    runtimeStateRoot: options.runtimeStateRoot,
    scopeId: options.scopeId,
  });
  clearRuntimeEndpoints(initialization.databasePath);
```

**Code anchor — load only on manual API:**

```6930:6938:role-model-router/apps/runtime-host-bridge/src/index.ts
    for (const peer of matchingPeers) {
      activateRuntimeEndpoint({
        providerAccountId: createLocalPeerProviderAccountId(peer.id),
        modelId,
        region: "local",
        endpointKind: "local-openai-compatible",
        servingSource: "local-peer",
      });
    }
```

`activateRuntimeEndpoint` upserts `runtime_endpoints`, but the next process start deletes those rows again (G1).

### A2 — Remote OAuth + endpoint activation

| Layer | Expected | Observed on operator machine | Root cause |
| --- | --- | --- | --- |
| OAuth token file | Survive restart | **Yes** — `standalone-runtime/credentials/oauth/moonshot/moonshot.personal.kimi-code.json` present; `access_token` + `refresh_token`; `expires_in: 900` (15 min) | `persistOauthTokenFile()` writes under `{runtimeStateRoot}/{scopeId}/credentials/...` |
| Account hydrate | Mark healthy without UI | **Yes** — SQLite `provider_accounts` for `moonshot.personal.kimi-code`: `status: active`, `health_status: healthy` after restart | `hydrateOauthProviderAccounts()` reads token file and promotes account health (~4207–4246) |
| Remote endpoint | Survive restart | **No** — same G1 wipe; `connectedWithoutEndpointCount` > 0 until manual activate | UI treats `active`+`healthy` account **without** active endpoint as “connected, not ready” (~753–755 `view-models.ts`) |
| Proactive token refresh on startup | Avoid re-auth | **No** — refresh runs only inside `resolveCredentialValue()` on **live execution** (~4528–4545), not during bootstrap | Short-lived access tokens expire between restarts; first request may fail until refresh path runs or operator revisits Providers |
| Pending device-auth resume | Server-side on startup | **No** — `provider_device_auth_sessions` contains historical rows; operator audit shows **1 `pending`** session on `moonshot.personal.moonshot-oauth` | No bootstrap poll of pending sessions in `main` branch; Providers UI poll is browser-driven (G6) |
| Duplicate OAuth accounts | Single canonical path | **Split** — both `moonshot.personal.kimi-code` (used) and `moonshot.personal.moonshot-oauth` (stale token **expired**) coexist; pending session on stale account inflates `pendingDeviceAuthorizationCount` | G5 from run 39 requirements |

**Operator UX conflation:** Tokens often **do** persist. The dominant restart failure is **missing endpoint rehydration (G1)**, which forces a Providers/Endpoints workflow that *feels* like re-auth. True re-auth is only required when the token file is missing, refresh fails, or a pending/expired device-auth session blocks the account.

**Readiness logic (why UI shows incomplete remote):**

```740:755:role-model-router/apps/runtime-ui/app/lib/view-models.ts
    for (const account of providerAccounts) {
      if (readyAccountIds.has(account.providerAccountId)) {
        readyAccountCount += 1;
        continue;
      }
      // ...
      if (account.status === "active" && account.healthStatus === "healthy") {
        connectedWithoutEndpointCount += 1;
      }
    }
```

After restart: OAuth healthy + **zero** endpoints ⇒ `connectedWithoutEndpointCount: 2` in runtime summary (matches operator observation).

### A3 — Run 39 rehydration work vs operator binary

Run 39 locked requirements `R1`–`R9` and documented implementation (`operator-intent.ts`, bootstrap pipeline, `endpoint-rehydration.test.ts`, `restart-rehydration.test.ts`) in worktree branch `recursive/39-runtime-session-rehydration-model-inventory`.

**Operator packaged runtime on `main` (2026-06-11):**

| Run 39 deliverable | Present on `main`? |
| --- | --- |
| `operator-intent.ts` | **No** |
| Bootstrap session pipeline (`R3`) | **No** |
| Remove/limit `clearRuntimeEndpoints` on init (`R1`) | **No** — still unconditional |
| Startup OAuth refresh (`R4`) | **No** |
| Peer auto-reload from manifest (`R6`) | **No** |
| `operator-intent.json` on disk | **Yes** (written during run 39 testing) — **unread orphan** |

**Conclusion:** Operator pain matches **G1–G3** from run 39 AS-IS. Fixes exist in run 39 artifacts but are **not merged** into the tree used to build `role-model-runtime.exe` on the operator workstation.

## Audit — Craft `hello` still `medium` (why `R11` is insufficient)

### B1 — Operator diagnostic signature

Reported bundle (abridged):

| Field | Value |
| --- | --- |
| `difficulty` | `medium` |
| `strategy` | `balanced` |
| `rubricSignals.contextTokens` | `99` |
| `rubricSignals.historyTurnCount` | `2` |
| `rubricSignals.toolCount` | `0` |
| `rubricSignals.codeOrSchemaBurden` | `true` |
| `cacheInvalidationReasons` | `expired`, `code-or-schema-change` |
| `observedProfile.measuredAtMs` | `1781179230030` (matches earlier `probe-asst-user` observation timestamp) |

Live SQLite observation `req-runtime-host-bridge` @ `1781180231031` shows the **same rubric signature** (`99` tokens, `historyTurnCount: 2`, `codeOrSchemaBurden: true`, `medium`) on the post-`R11` v2 binary.

### B2 — `R11` v2 behavior (implemented 2026-06-11)

`R11` v2 changed ask-mode burden source from “all messages except system” to **all `user` role messages**:

```385:405:role-model-router/apps/runtime-host-bridge/src/index.ts
  const askModeBurdenSource =
    input.toolCount === 0
      ? combineDifficultyMessageText(input.messages, { roles: ["user"] })
      : combined;
  // ...
    codeOrSchemaBurden: /\b(code|diff|patch|refactor|schema|contract|validation|test)\b/i.test(
      askModeBurdenSource,
    ),
```

**Proven working for assistant/system preamble + short user message:**

| Probe | `contextTokens` | `codeOrSchemaBurden` | `difficulty` |
| --- | ---: | --- | --- |
| `assistant` schema preamble + `user: hello` | 26 | `false` | `easy` |
| `system` schema preamble + `user: hello` | 26 | `false` | `easy` |
| Craft live `req-runtime-host-bridge` | **99** | **`true`** | **`medium`** |

The **99-token / burden-true** signature does **not** match `assistant+user` with R11 v2. It **does** match Craft sending **schema boilerplate inside the `user` role** (or multiple `user` turns where the first contains `schema`/`contract`/`validation`).

**Replay (offline rubric):**

| Payload shape | `contextTokens` (approx) | `codeOrSchemaBurden` | `difficulty` |
| --- | ---: | --- | --- |
| `user` Craft preamble + `user: hello` | ~50–100 | **true** | **medium** |
| `assistant` preamble + `user: hello` | ~22–26 | false | easy |
| `developer` preamble + `user: hello` | ~22–26 | false | easy |

**Root cause:** `R11` excludes `system`/`assistant`/`developer` roles but **joins every `user` message** for burden. Craft Agents (pi/craft) appears to place its system-style contract in a **`user` role turn** before the operator’s short message, so `codeOrSchemaBurden` remains `true` and score reaches `medium` (`historyTurnCount: 2` → +1, burden → +2).

### B3 — Cache and conversation coupling

- Difficulty cache key is `envelope.conversationId` (`conversation-main` for downstream OpenAI ingress), **not** per Craft session or per consumer request id.
- Cache TTL 15 min (`cacheTtlMs: 900000`); invalidation on `code-or-schema-change` and `expired` forces recompute but **still uses incoming `messages`**.
- Operator audit (later request) shows cache polluted to `hard` (`toolCount: 33`, `contextTokens: 8922`) on the same `conversation-main` key — cross-request bleed for all consumers sharing ingress.

### B4 — Remote selection after classification

Even when classification is `easy` (`probe-r11-v2-live`), observed latency scoring still selects `moonshot/kimi-k2.6` over local LFM (~4s vs ~37s p50). Classification fix alone does not guarantee local routing.

## Requirements (Follow-Up)

| ID | Requirement | Acceptance |
| --- | --- | --- |
| **R12** | **Merge run 39 endpoint rehydration into packaged runtime (`main`)** — close G1 | `clearRuntimeEndpoints()` not called unconditionally on init; `runtime_endpoints` rows survive restart **or** are rebuilt from manifest before first request; `test/endpoint-rehydration.test.ts` and `test/restart-rehydration.test.ts` pass on `main`; packaged restart drill: `endpointCount ≥ 2` without manual activate |
| **R13** | **Startup bootstrap reads `operator-intent.json`** — close G2/G3 | On init, after credential hydrate: reload `peerLoads[]` with `autoReload: true` via `loadPeerModel`; reload `remoteActivations[]` via `activateRuntimeEndpoint`; corrupt/missing manifest fails closed with diagnostics on readiness API; manifest updated on successful load/activate (idempotent) |
| **R14** | **OAuth continuity on startup** — close G4–G6 | Bootstrap stage refreshes OAuth tokens within expiry skew (default 5 min) using refresh token; pending device-auth sessions with unexpired `expiresAtMs` resume server-side poll; `connectedWithoutEndpointCount === 0` for accounts in `remoteActivations` after successful rehydrate; document canonical credential path per provider account |
| **R15** | **`R11` revision — last user turn for ask-mode burden** | For `toolCount === 0`, `codeOrSchemaBurden` and `instructionConstraintCount` use **only the last `user` role message** (not all user messages); Craft-like `user` preamble + `user: hello` → `easy`, `codeOrSchemaBurden: false`; regression tests for `user`+`user`, `assistant`+`user`, `developer`+`user`; optional: difficulty cache keyed by consumer session id or hash of last user turn |

### R12–R14 implementation notes

- Prefer **porting run 39 worktree modules** (`operator-intent.ts`, bootstrap pipeline, `remote-health-probe.ts`) rather than re-designing.
- `operator-intent.json` already on operator disk should be consumed on first startup after merge.
- Keep `peers.json` as peer URL source; manifest stores last loaded model + roles only.

### R15 implementation notes

- Replace `combineDifficultyMessageText(messages, { roles: ["user"] })` with helper that selects **last** message where `role === "user"`.
- Add integration test mirroring `req-runtime-host-bridge` rubric signature (99 tokens, burden true today → easy after fix).
- Consider separate addendum for **per-consumer cache partition** if Craft and heavy tool sessions share `conversation-main`.

## Verification (Operator)

| Check | Command / evidence |
| --- | --- |
| Persistence audit | `npx tsx scripts/operator-audit-persistence.ts` |
| Post-restart endpoints | `GET /api/role-model/endpoints` → `[]` before fix; ≥2 after R12–R13 |
| OAuth on disk | `%LOCALAPPDATA%\Role Model Runtime\standalone-runtime\credentials\oauth\moonshot\moonshot.personal.kimi-code.json` |
| Orphan manifest | `%LOCALAPPDATA%\Role Model Runtime\standalone-runtime\operator-intent.json` (exists, unread on `main`) |
| Craft rubric replay | `npx tsx scripts/operator-probe-difficulty.ts` + dual-`user` scenario in R15 tests |
| Live classification | `req-runtime-host-bridge` observation in `runtime_observations` |

## Out of Scope

- Changing `mixed.local-remote` alias mode or global `prefer_local`
- Latency-score tuning to favor local when `strategy: cost`
- Purging stale `moonshot.personal.moonshot-oauth` duplicate account (operator cleanup optional)
- Implementing `R12`–`R15` in this addendum

## Audit

Audit Execution Mode: self-audit
Subagent Capability Probe: subagents available; audit used direct code + operator SQLite/filesystem evidence
Delegation Decision Basis: complete context bundle from `00-requirements.md`, addendum-01, `index.ts`, operator audit script output

Coverage: PASS
Approval: PASS

Audit: PASS
