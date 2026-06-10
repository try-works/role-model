Run: `/.recursive/run/36-runtime-consumption-telemetry-remediation/`
Phase: `01 AS-IS`
Status: `DRAFT`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/00-requirements.md`
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/00-worktree.md`
- `/.recursive/DECISIONS.md` (run 35 entry)
- `/.recursive/run/35-runtime-ui-connect-declutter/addenda/03-implementation-summary.post-closeout-packaged-runtime.addendum-01.md`
- Live validation on packaged runtime `:3456` (2026-06-08)
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-ui/app/routes/workbench.tsx`
- `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `/role-model-router/packages/provider-openai/src/index.ts`
- `/role-model-router/packages/adapter-execution/src/index.ts`
Outputs:
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/01-as-is.md`
Scope note: AS-IS analysis for consumption, reasoning output, logs, and telemetry gaps after run 35 packaged-runtime remediation.

## TODO

- [x] Map live-validation symptoms to code paths
- [x] Record Studio/workbench working path vs failing API path
- [x] Inventory logs and telemetry surfaces
- [x] List Phase 2 planning inputs
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Effective Inputs Re-read

- `00-requirements.md` (`R1`–`R6`)
- Locked run 35 addendum SP8 (static-root + routing-strategy counts) — delivered; does not fix consumption catalog gap
- `submitWorkbenchChat` sends `x-role-model-endpoint-id` to `/v1/chat/completions` (`runtime-api.ts` ~1002–1015)
- Live HTTP probes: local 400 catalog error; remote 200 with empty `content`; telemetry flat 120ms; `/logs` empty; `/logs/stream` returns SPA HTML

## AS-IS Summary

Packaged runtime at `c8de236` serves Connect UI and routes requests, but operator validation exposed five defects:

1. **Local API consumption regresses** — `POST /v1/chat/completions` for `lfm2.5-1.2b-instruct` returns HTTP 400: model not in normalized catalog, while direct peer `http://127.0.0.1:1234/v1` works and Studio Chat works when endpoint is pinned.
2. **Remote reasoning output invisible** — `moonshot/kimi-k2.6` returns HTTP 200 with empty `choices[0].message.content` but stream deltas carry `reasoning_content`; telemetry records output tokens.
3. **Logs empty in `decision_only`** — `getLocalLogs()` proxies llama-swap `/logs` only when vendor is active; returns `""` when inactive. Observe → Logs fetches `/logs` and shows zero rows.
4. **`/logs/stream` SPA fallthrough** — static `index.html` catch-all serves React shell for `/logs/stream` because no bridge handler precedes static routing.
5. **Telemetry latency placeholder** — `readLatencyMs` defaults to `120` when `vendorMetadata.latencyMs` absent; direct HTTP path does not measure round-trip time.
6. **Request ID header mismatch** — bridge reads `x-request-id` only; Connect docs and operators may use custom ids that never appear in telemetry.

### Studio vs API divergence (root mechanism)

| Surface | Behavior |
| --- | --- |
| Studio `submitWorkbenchChat` | Same `/v1/chat/completions`; adds `x-role-model-endpoint-id`; operator selects model + endpoint |
| Raw curl without endpoint header | Routes via model pool; execution hits `executeLiveRoutedRequest` with `catalog: currentNormalizedCatalog` |
| `rebuildCurrentState` | Applies `withRuntimeEndpointFallbackModels` to **registry** catalog only |
| `mergeRegistrySources` | Merges **all** SQLite runtime endpoints into `cloud` sources |
| `resolveExecutionTarget` | `findCloudSource` first → requires `catalog.models` entry; `findLocalSource` only for `llama-swap` unified config entries |

Peer-backed local endpoints therefore traverse the cloud execution path without a catalog model after restart, even though registry/listModels surfaces synthesize the model for display.

## Reproduction Steps (Novice-Runnable)

1. Start packaged runtime on `:3456` with one local peer (`lfm2.5-1.2b-instruct`) and one remote (`moonshot/kimi-k2.6`).
2. `curl -s http://127.0.0.1:3456/v1/chat/completions -H "content-type: application/json" -H "Authorization: Bearer role-model-local" -d '{"model":"lfm2.5-1.2b-instruct","messages":[{"role":"user","content":"hello"}],"max_tokens":16}'` → HTTP 400 catalog error.
3. `curl -s http://127.0.0.1:1234/v1/chat/completions ...` (same body) → HTTP 200 with assistant text.
4. Studio → Chat: select LFM model + local endpoint → Run request → succeeds.
5. `curl` remote model non-stream → `content: ""`; stream → `reasoning_content` deltas present.
6. `curl -s http://127.0.0.1:3456/logs` → empty body; `curl -s http://127.0.0.1:3456/logs/stream` → HTML SPA.
7. `GET /api/role-model/telemetry/summary` → `averageLatencyMs: 120` for all requests.

## Current Behavior by Requirement

### `R1` Peer-backed local consumption

- **Observed:** API fails with catalog error; Studio succeeds with endpoint pin; earlier `req-ui-test-lfm` telemetry row exists from session when catalog was warm.
- **Code:** `executeBridgePlan` → `executeLiveRoutedRequest({ catalog: currentNormalizedCatalog, ... })` (`index.ts` ~6898–6904); `withRuntimeEndpointFallbackModels` only in `rebuildCurrentState` (~6001–6005).

### `R2` Reasoning-model text

- **Observed:** Non-stream JSON has empty `content`; stream has `reasoning_content`.
- **Code:** `normalizeOpenAIResponse` reads `message.content` only (`provider-openai/src/index.ts` ~606–614); stream parser accumulates `delta.content` only (~206–208).

### `R3` Logs

- **Observed:** `/logs` empty; Observe → Logs zero rows; `/logs/stream` serves SPA.
- **Code:** `getLocalLogs` requires `currentLlamaSwapVendor?.readStatus()?.baseUrl` (`index.ts` ~8884–8899); static handler at ~5665 catches unmatched GET paths.

### `R4` Latency

- **Observed:** All telemetry rows show `latencyMs: 120`.
- **Code:** `readLatencyMs` → `?? 120` (`provider-openai/src/index.ts` ~83–86); direct `performRequest` returns no `vendorMetadata.latencyMs` (`index.ts` ~7053–7134).

### `R5` Request ID alias

- **Observed:** `x-role-model-request-id` ignored; default `req-runtime-host-bridge` used.
- **Code:** `request.headers["x-request-id"]` only (`index.ts` ~4870, ~4963).

### `R6` Failed request observability

- **Observed:** Catalog 400 responses do not appear in telemetry ledger.
- **Code:** `persistRuntimeObservationBundle` only on successful `executeBridgePlan` completion (~7229–7233); HTTP catch writes JSON error only (~4952–4958).

## Known Unknowns / Phase 2 Inputs

- Whether to classify peer-backed endpoints as `local` registry sources vs enrich execution catalog only (plan chooses catalog enrichment + optional source split).
- Minimal failure telemetry shape without full observation bundle (plan: bounded failure record in `executeChatCompletions` catch).

## Worktree Diff Audit

- Phase 1 owns AS-IS analysis only; no product diff expected at lock time.

## Requirement Completion Status

| ID | Status | Notes |
| --- | --- | --- |
| R1 | documented | AS-IS root cause: execution catalog gap + cloud source merge |
| R2 | documented | reasoning_content not mapped |
| R3 | documented | vendor-only logs + SPA fallthrough |
| R4 | documented | 120ms default |
| R5 | documented | header alias missing |
| R6 | documented | no failure persistence |

## Coverage Gate

- [x] Every `R#` has AS-IS behavior or root-cause notes
- [x] Studio working path vs API failure is explained
- [x] Reproduction steps are novice-runnable

Coverage: PASS

## Approval Gate

- [x] AS-IS is grounded in code refs and live validation
- [x] Phase 2 can map sub-phases without guessing

Approval: PASS

## Audit Context

- Audit Execution Mode: self-audit
- Subagent Capability Probe: available; AS-IS tied to prior live probes and code reads
- Delegation Decision Basis: self-audit with complete context bundle from this session
- Delegation Override Reason: n/a

Audit: PASS
