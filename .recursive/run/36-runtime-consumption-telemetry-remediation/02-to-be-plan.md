Run: `/.recursive/run/36-runtime-consumption-telemetry-remediation/`
Phase: `02 TO-BE Plan`
Status: `DRAFT`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/00-requirements.md`
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/00-worktree.md`
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/01-as-is.md`
Outputs:
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/02-to-be-plan.md`
Scope note: ExecPlan for bridge execution catalog, reasoning output, logs, latency, and request-id remediation.

## TODO

- [x] Map each `R#` to implementation sub-phases and file-level edits
- [x] Declare TDD mode and verification strategy
- [x] Record expected product paths for diff audit
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Planned Outcome

Run 36 aligns raw `/v1/chat/completions` consumption, Connect downstream clients, and Observe surfaces with the Studio workbench path:

1. Execution uses registry-enriched catalog (runtime endpoint model synthesis at request time).
2. Reasoning models surface assistant text in normalized responses and Studio summaries.
3. Logs work in `decision_only` via telemetry fallback; log-stream paths never serve SPA.
4. Direct HTTP execution records measured latency.
5. `x-role-model-request-id` aliases `x-request-id`.
6. Bounded failure rows appear in telemetry for execution errors.

Work executes from `D:\DEV\role-model\.worktrees\36-runtime-consumption-telemetry-remediation` on branch `recursive/36-runtime-consumption-telemetry-remediation`.

## Requirement Mapping

| R# | Sub-phase | Primary deliverable |
| --- | --- | --- |
| R1 | SP1 | `getCurrentExecutionCatalog()` + use in `executeLiveRoutedRequest` |
| R2 | SP2 | `reasoning_content` in provider-openai normalize + stream; workbench summary |
| R3 | SP3 | Telemetry log fallback; `/logs/stream` handler before static; Observe unchanged API |
| R4 | SP4 | Measured `vendorMetadata.latencyMs` on direct HTTP |
| R5 | SP5 | `readBridgeRequestId()` header alias |
| R6 | SP6 | `recordChatCompletionFailure` on execution error |

## TDD Mode

**TDD Mode: strict** for SP1, SP2, SP4, SP5 (RED test → GREEN fix).  
**TDD Mode: pragmatic** for SP3, SP6 (integration-heavy; compensating evidence via bridge tests + manual curl).

## Implementation Sub-phases

### SP1 — Execution catalog enrichment (`R1`)

**Files:**

- `role-model-router/apps/runtime-host-bridge/src/index.ts`
  - Add `getCurrentExecutionCatalog()` wrapping `withRuntimeEndpointFallbackModels(currentNormalizedCatalog, currentAccounts, runtimeEndpoints)`
  - Pass enriched catalog to `executeLiveRoutedRequest` in `executeBridgePlan`
- `role-model-router/packages/adapter-execution/test/index.test.ts` or bridge test
  - RED: `resolveExecutionTarget` / live execution with runtime endpoint model absent from static catalog

**Verification:** bridge/adapter test PASS; manual curl local model 200 after worktree rebuild.

### SP2 — Reasoning content mapping (`R2`)

**Files:**

- `role-model-router/packages/provider-openai/src/index.ts`
  - `readAssistantText(message)` combining `content` + `reasoning_content`
  - Stream parser: accumulate `reasoning_content` deltas
- `role-model-router/packages/provider-openai/test/index.test.ts`
  - RED: reasoning-only non-stream body → non-empty `outputText`
- `role-model-router/apps/runtime-ui/app/lib/view-models.ts`
  - `summarizeWorkbenchResult` reads `reasoning_content` from choices
- `role-model-router/apps/runtime-ui/app/lib/view-models.test.ts` (if needed)

**Verification:** provider-openai tests PASS; remote curl returns visible `content`.

### SP3 — Logs remediation (`R3`)

**Files:**

- `role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `formatRuntimeTelemetryLogs(records)` helper
  - `getLocalLogs`: vendor logs first, else telemetry-formatted lines
  - `readLogs` path unchanged (cli already uses `getLocalLogs`)
  - Before static handler: `GET /logs/stream*` → proxy to llama-swap when active, else 503 JSON
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - `/logs/stream` does not return `index.html` when static root set

**Verification:** `GET /logs` non-empty after requests when vendor inactive; `/logs/stream` returns JSON 503 or SSE.

### SP4 — Measured latency (`R4`)

**Files:**

- `role-model-router/apps/runtime-host-bridge/src/index.ts`
  - Wrap `performRequest` with `startedAt = Date.now()`; attach `vendorMetadata: { latencyMs }` on all direct HTTP returns
- `role-model-router/packages/provider-openai/test/index.test.ts`
  - Assert `readLatencyMs` uses metadata when present (existing path)

**Verification:** telemetry row `latencyMs` ≠ 120 in mocked timed fetch test or live probe.

### SP5 — Request ID alias (`R5`)

**Files:**

- `role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `readBridgeRequestId(request)` — `x-request-id` ?? `x-role-model-request-id` ?? default
  - Use in `/v1/chat/completions` and `/v1/responses`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - RED: header alias recorded in execution path

### SP6 — Failure telemetry (`R6`)

**Files:**

- `role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `recordChatCompletionFailure({ requestId, model, endpointId?, message, statusCode })` inserting minimal telemetry via existing sqlite path or lightweight helper
  - Call from `executeChatCompletions` catch before rethrow

**Verification:** failed catalog request (pre-fix) or simulated failure appears in `listTelemetryRequests`.

## Expected Product Paths (Diff Audit)

- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `role-model-router/packages/provider-openai/src/index.ts`
- `role-model-router/packages/provider-openai/test/index.test.ts`
- `role-model-router/apps/runtime-ui/app/lib/view-models.ts`
- `role-model-router/apps/runtime-ui/app/lib/view-models.test.ts` (optional)

## Worktree Diff Audit

- Baseline: `c8de236887095627ffc759bafe88e5254ed07d99`
- Command: `git diff --name-only c8de236887095627ffc759bafe88e5254ed07d99`
- Phase 2 owns planned scope above; Phase 3 reconciles actual drift.

## Requirement Completion Status (planning)

| ID | Status | Planned SP |
| --- | --- | --- |
| R1 | planned | SP1 |
| R2 | planned | SP2 |
| R3 | planned | SP3 |
| R4 | planned | SP4 |
| R5 | planned | SP5 |
| R6 | planned | SP6 |

## Coverage Gate

- [x] Every `R#` maps to a sub-phase and file list
- [x] TDD mode declared
- [x] Expected diff paths recorded

Coverage: PASS

## Approval Gate

- [x] Plan preserves Studio headers and `decision_only` default
- [x] Scope stays within requirements out-of-scope boundaries

Approval: PASS

## Audit Context

- Audit Execution Mode: self-audit
- Subagent Capability Probe: available
- Delegation Decision Basis: plan derived from locked AS-IS and live validation; no delegation needed
- Delegation Override Reason: n/a

Audit: PASS
