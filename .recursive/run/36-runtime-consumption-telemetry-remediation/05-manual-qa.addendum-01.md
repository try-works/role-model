Run: `/.recursive/run/36-runtime-consumption-telemetry-remediation/`
Phase: `05 Manual QA`
Addendum: `01`
Status: `LOCKED`
LockedAt: `2026-06-08T15:49:16Z`
LockHash: `05349f78ddf6e888c0e735e5f0310a93dc7d89a749309062e557d1d9365e0260`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/05-manual-qa.md` (LOCKED)
- Packaged worktree build including run 36 bridge/provider changes
Outputs:
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/05-manual-qa.addendum-01.md`
Scope note: Supersedes deferred R1/R2/R4 scenarios from the locked Phase 5 receipt with packaged-runtime proof on operator-configured local and remote endpoints.

## TODO

- [x] Build and package worktree runtime (`runtime:package-sea`)
- [x] Launch packaged `Role-Model.bat` on `:3456`
- [x] Confirm local peer (`:1234`) and remote Moonshot accounts/endpoints
- [x] Execute R1–R6 HTTP scenarios against packaged binary
- [x] Record evidence paths and reconcile locked Phase 5 results

## Reconciliation with locked `05-manual-qa.md`

The locked Phase 5 artifact used `start-for-qa.ts` (fixture `decision_only` without live remote execution). This addendum records **packaged-runtime** validation with operator-persisted accounts/peers and live upstream models.

## Packaged Build

| Field | Value |
| --- | --- |
| Command | `corepack pnpm run runtime:package-sea` (worktree root) |
| Release dir | `role-model-router/dist/release/win32-x64/` |
| Launcher | `Role-Model.bat` → `role-model-launcher.exe` → `role-model-runtime.exe` |
| SHA256 | `ae440027bca9b68789ec47e6c66fe46a938aebf0c88427b3b8b2abc3157055cf` |
| Build log | `evidence/logs/phase5-package-sea.log` |
| Server log | `evidence/logs/packaged-runtime-server.log` |

**Build fix during packaging:** `measuredVendorMetadata` now includes required `vendorId: "direct-http"` for TypeScript `ProviderResponseCapture` compatibility.

## Endpoint Setup (operator state)

Persisted runtime state under `%LOCALAPPDATA%\Role Model Runtime` already contained:

- Local peer: `http://127.0.0.1:1234` (LM Studio / OpenAI-compatible) with `lfm2.5-1.2b-instruct` available
- Moonshot OAuth accounts: `moonshot.personal.kimi-code`, `moonshot.personal.moonshot-oauth` (healthy)

Activation performed via API for this QA session:

```http
POST /api/role-model/endpoints
{"providerAccountId":"local-openai-compatible.personal.54fc2746-6472-42b0-901b-f2b178f5c0d0","modelId":"lfm2.5-1.2b-instruct","region":"local","endpointKind":"local-peer","servingSource":"local-peer"}

POST /api/role-model/endpoints
{"providerAccountId":"moonshot.personal.kimi-code","modelId":"moonshot/kimi-k2.6"}
```

Resulting active endpoints:

- `local-openai-compatible.personal.54fc2746-6472-42b0-901b-f2b178f5c0d0.local.lfm2.5-1.2b-instruct`
- `moonshot.personal.kimi-code.global.kimi-k2.6`

## QA Execution Record

- QA Execution Mode: `agent-operated`
- Preview URL: `http://127.0.0.1:3456` (from `packaged-runtime-server.log`)
- QA log: `evidence/logs/phase5-packaged-runtime-qa.log`

## Scenarios and Results (packaged runtime)

| # | Scenario | R# | Result | Observed |
| --- | --- | --- | --- | --- |
| 1 | `POST /v1/chat/completions` `lfm2.5-1.2b-instruct` without catalog error | R1 | **PASS** | HTTP 200; `choices[0].message.content` = `ok-local` |
| 2 | `POST /v1/chat/completions` `moonshot/kimi-k2.6` non-empty assistant text | R2 | **PASS** | HTTP 200; non-empty `content` (reasoning-style body surfaced in `content`) |
| 3 | `GET /logs/stream` JSON 503; `GET /logs` telemetry lines | R3 | **PASS** | Stream returns JSON error; `/logs` shows ISO telemetry lines |
| 4 | Telemetry `latencyMs` measured (≠ 120) | R4 | **PASS** | Local `384ms`, remote `2665ms`; summary `averageLatencyMs: 588` |
| 5 | `x-role-model-request-id` recorded in ledger | R5 | **PASS** | `req-qa-r1-36`, `req-qa-r2-36` in `/api/role-model/telemetry/requests` |
| 6 | Failed chat emits failure telemetry | R6 | **PASS** | (prior session + packaged failure curl) `execution_failed` rows |

## Evidence

- `/.recursive/run/36-runtime-consumption-telemetry-remediation/evidence/logs/phase5-package-sea.log`
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/evidence/logs/packaged-runtime-server.log`
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/evidence/logs/phase5-packaged-runtime-qa.log`

## Requirement Completion Status (addendum reconciliation)

| ID | Disposition | Verification Evidence |
| --- | --- | --- |
| R1 | verified | Packaged curl local model 200 |
| R2 | verified | Packaged curl kimi-k2.6 non-empty content |
| R3 | verified | Packaged `/logs/stream` + `/logs` |
| R4 | verified | Telemetry rows with 384ms / 2665ms |
| R5 | verified | Request ids in telemetry ledger |
| R6 | verified | Failure rows (fixture + packaged) |

## Coverage Gate

- [x] All previously deferred live scenarios executed on packaged worktree binary
- [x] Endpoint setup documented

Coverage: PASS

## Approval Gate

- [x] Packaged build includes run 36 code changes
- [x] Live local + remote consumption validated

Approval: PASS

## Audit Context

- Audit Execution Mode: self-audit
- Subagent Capability Probe: available
- Delegation Decision Basis: operator-requested packaged-runtime QA; executed directly
- Delegation Override Reason: n/a

Audit: PASS
