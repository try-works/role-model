Run: `/.recursive/run/77-catalog-json-size-and-ui-freeze/`
Phase: `05 Manual QA`
Addendum: `04`
Status: `LOCKED`
LockedAt: `2026-07-18T04:03:22Z`
LockHash: `93c71e6219d8615e5aa52512333f06cff2f5587d3a4be4acefa1c2d78540d54e`
Workflow version: `recursive-mode-audit-v2`
QA Execution Mode: `agent-operated`
Inputs:
- user authorization on `2026-07-18` to refresh the Kimi OAuth credential stored on this device
- user request to verify routing to GPT-5.4
- `/.recursive/run/77-catalog-json-size-and-ui-freeze/addenda/05-manual-qa.telemetry-route-and-pi-routing.addendum-03.md`
Outputs:
- this addendum
- `/.recursive/run/77-catalog-json-size-and-ui-freeze/evidence/phase5-addendum-04/`
Scope note: Refresh the actual device-local Kimi OAuth credential through supported runtime lifecycle APIs and verify real Pi routing to Kimi K3 and GPT-5.4 without exposing credential material.

## TODO

- [x] Start the rebuilt runtime against the canonical standalone local state on an isolated listener
- [x] Inspect Kimi and OpenAI account lifecycle metadata without reading token values
- [x] Refresh/reconnect the stored Kimi OAuth credential through the runtime-owned flow
- [x] Complete device authorization if interactive approval is required
- [x] Run real Pi requests to direct Kimi K3 and direct GPT-5.4
- [x] Run a representative alias request and inspect the selected route
- [x] Correlate request ledger, telemetry, router decision, provider, adapter, and model receipts
- [x] Verify runtime health, stop the isolated listener, and preserve the refreshed credential
- [x] Scan evidence for credential leakage, lock the addendum, and verify the run lock chain

## Safety Boundary

- The user explicitly authorized mutation of the device-local Kimi credential.
- Token/access/refresh values must never be printed, copied to run evidence, or included in command output.
- The canonical local state may receive credential lifecycle and telemetry updates; unrelated account/config state must remain unchanged.
- The rebuilt runtime must use a non-default listener so no existing operator runtime is displaced.

## Runtime And Credential Lifecycle

- Rebuilt executable: `/role-model-router/dist/release/win32-x64/role-model-runtime.exe`
- SHA-256: `b4c1592881622abe69e3847e098638f2fdab34ae68d2cd5aee28fde6692c6fb8`
- Isolated listener: `http://127.0.0.1:55726`
- Runtime state: canonical device-local root `C:/Users/erikb/AppData/Local/Role Model Runtime`, scope `standalone-runtime`
- Kimi account: `moonshot.personal.kimi-code`, OAuth device-code mode, local-file credential reference `oauth/moonshot/moonshot.personal.kimi-code`
- OpenAI account: `openai.personal.openai-codex-subscription`, OAuth device-code mode, allowed model `chatgpt/gpt-5.4`

The runtime-owned reconnect endpoint reused authorization request `77bbcc0a-69e2-469b-9319-54b1ac484116`. After user approval, the runtime poll returned `connected`. No token value or credential-file content was read. A full runtime stop/restart then reloaded the Kimi account as `active`, `healthy`, and `stable`, proving the refreshed credential persisted to the intended device-local store.

Evidence: `accounts-before-refresh.json`, `kimi-refresh-start.json`, `oauth-refresh-result.json`, `accounts-after-restart.json`, and `runtime-restart-process.json`.

## Real Pi Routing Matrix

Pi `0.80.2` used the installed Role Model provider with `ROLE_MODEL_ENDPOINT=http://127.0.0.1:55726`.

| Case | Requested model | Result | Authoritative runtime route |
| --- | --- | --- | --- |
| Refreshed Kimi direct | `moonshot/kimi-k3` | PASS; exact marker; exit `0`; `15760 ms` | request `req-bc00342d-db5a-4e1c-b325-b5042e864adb`; Kimi K3 endpoint; `200`; `ai-sdk-openai-compatible` |
| GPT-5.4 direct | `chatgpt/gpt-5.4` | PASS; exact marker; exit `0`; `6977 ms` | request `req-22e4925f-1a81-4b46-9d65-de9a207539b7`; GPT-5.4 endpoint; `200`; `codex-subscription-responses` |
| Baseline alias | `baseline.remote-only` | PASS; exact marker; exit `0`; `7078 ms` | request `req-dae64fae-e340-490c-83d7-79998efd108f`; selected `deepseek/deepseek-v4-pro`; `200` |

The GPT-5.4 receipt proves the public Pi request entered through `openai.chat.completions` while provider execution correctly used the Codex subscription Responses adapter (`vendorId: chatgpt-codex-responses`). The Kimi receipt proves its refreshed OAuth credential now executes a real streaming request successfully. The alias receipt proves the refactored routing data still resolves a symbolic route to a concrete eligible remote endpoint.

Evidence: `run-pi-cases.ps1`, `pi-case-results.json`, per-case stdout/stderr logs, and `routing-telemetry-receipts.json`.

## Telemetry And UI Compatibility

- Telemetry list returned `200` and contained all three new live requests.
- Every new request resolved through full request detail and router-decision APIs with matching request, decision, selected model, endpoint, provider, adapter, status, tokens, and latency.
- GPT-5.4 recorded `404` measured input tokens, `27` measured output tokens, `2501 ms` provider latency, and status `200`.
- Kimi K3 recorded `488` normalized input tokens, `48` normalized output tokens, `9095 ms` provider latency, and status `200`.
- Alias baseline recorded the requested alias separately from selected DeepSeek model/endpoint, preserving route provenance.
- `/app/observe`, the exact GPT-5.4 request page, `/health`, and the bounded telemetry request list all returned `200` after traffic.
- The detailed request payload and router decision remained explicit drill-ins; the bounded telemetry list remained a separate list contract.

Evidence: `routing-telemetry-receipts.json` and `ui-and-api-checks.json`.

## Persistence, Cleanup, And Credential Hygiene

- Original isolated PID `32100` was stopped and port `55726` closed before restart.
- Restarted PID `43768` reached health `200` against the same canonical state and reloaded Kimi as active/healthy/stable.
- Restarted PID `43768` was then stopped; port `55726` is closed.
- Canonical device-local state was intentionally preserved because it contains the user-authorized refreshed credential.
- Evidence scanning found zero access-token, refresh-token, Bearer, API-key assignment, OAuth user-code, or complete authorization-URL matches.

Evidence: `runtime-restart-process.json` and `credential-leak-scan.json`.

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `unavailable`
Subagent Capability Probe: `not performed; active collaboration policy prohibited delegation unless explicitly requested.`
Delegation Decision Basis: `Credential lifecycle mutation, process ownership, live Pi execution, and secret-hygiene verification remained controller-owned.`
Audit Inputs Provided: rebuilt executable/hash, OAuth lifecycle receipts, Pi outputs, telemetry/decision receipts, UI/API checks, persistence restart, and leak scan.

## Gaps Found And Reconciliation

- No remaining blocker was found. The expired/invalid Kimi credential recorded by Addendum 03 is repaired and superseded by a successful live Kimi receipt.
- The GPT-5.4 request intentionally traverses the OpenAI-compatible Chat Completions ingress exposed to Pi, then the runtime selects the model-specific Codex subscription Responses adapter. This is expected adapter translation, not an accidental Kimi/Chat Completions route.
- No product code changed in this addendum; it verifies the user-authorized credential lifecycle and Run 77 routing/telemetry behavior against the rebuilt artifact.

## Coverage Gate

- [x] Refreshed Kimi OAuth persisted in the canonical local credential store
- [x] Real direct Kimi K3 request passed
- [x] Real direct GPT-5.4 request passed and selected the exact endpoint
- [x] Real alias request passed and retained alias-to-model telemetry provenance
- [x] Request list, full detail, router decision, health, Observe index, and request page remained readable
- [x] Restart readback proved persistence; isolated listener was stopped

Coverage: PASS

## Approval Gate

- [x] User explicitly authorized the local Kimi credential refresh and completed device approval
- [x] Credential values and credential-file contents were neither read nor recorded
- [x] Only the isolated rebuilt listener and intended canonical account lifecycle were mutated
- [x] Live provider costs were limited to three short exact-marker requests requested for QA

Approval: PASS

## Audit Verdict

Audit: PASS
