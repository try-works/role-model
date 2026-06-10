Run: `/.recursive/run/36-runtime-consumption-telemetry-remediation/`
Phase: `00 Requirements`
Status: `DRAFT`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/run/35-runtime-ui-connect-declutter/addenda/03-implementation-summary.post-closeout-packaged-runtime.addendum-01.md`
- Live operator validation on packaged runtime `:3456` (2026-06-08)
- Studio workbench implementation (`submitWorkbenchChat`, `x-role-model-endpoint-id`)
Outputs:
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/00-requirements.md`
Scope note: Remediate packaged-runtime consumption, reasoning-model output, logs, and telemetry truthfulness gaps discovered after run 35. Studio Chat already works for local and remote models; fixes must align `/v1/chat/completions`, Connect downstream consumers, and Observe surfaces with that working path.

## TODO

- [x] Consolidate live-validation findings into stable requirement identifiers
- [x] Define observable acceptance criteria per requirement
- [x] Record Studio/workbench learnings as fixed implementation guidance
- [x] Record out-of-scope boundaries and constraints
- [ ] User approval of this requirements artifact
- [ ] Complete Coverage Gate checklist
- [ ] Complete Approval Gate checklist

## Source Requirement Inventory

| Source | Contribution |
| --- | --- |
| Live validation (2026-06-08) | Local `/v1/chat/completions` 400 catalog error; remote empty `content`; flat 120ms latency; empty `/logs`; `/logs/stream` serves SPA |
| Studio workbench | Posts to same `/v1/chat/completions` with `x-role-model-endpoint-id`; succeeds for local + remote when endpoint pinned |
| `submitWorkbenchChat` (`runtime-api.ts`) | Canonical consumer headers: `x-role-model-endpoint-id`, `x-role-model-routing-mode` |
| `mergeRegistrySources` + `executeLiveRoutedRequest` | Peer-backed runtime endpoints merged into `cloud` sources; execution uses `currentNormalizedCatalog` without runtime endpoint model synthesis |
| `provider-openai` | `normalizeOpenAIResponse` ignores `reasoning_content`; `readLatencyMs` defaults to 120 |
| `getLocalLogs` | Returns empty when `decision_only` and llama-swap vendor inactive |
| Run 35 addendum SP8 | Packaged static-root and routing-strategy counts delivered; consumption/logs/telemetry gaps remain |

## Studio Learnings (Fixed Guidance)

1. **Endpoint pinning is part of the working Studio contract.** `submitWorkbenchChat` sends `x-role-model-endpoint-id` so routing policy narrows to the operator-selected registry endpoint.
2. **Studio and Connect downstream must share the same bridge execution path.** No Studio-only bypass; fixes belong in bridge execution, provider normalization, and logs/telemetry surfaces.
3. **Reasoning models may return `reasoning_content` instead of `content`.** Provider normalization and workbench summarization must surface assistant-visible text from both fields.
4. **Packaged `decision_only` runtimes often have inactive llama-swap vendors.** Logs cannot depend solely on vendor `/logs`; runtime-owned telemetry must provide a fallback history.

## Requirements

### `R1` Peer-backed local consumption parity

Description:
`/v1/chat/completions` must execute peer-backed local registry endpoints without requiring models to be pre-seeded in the static normalized catalog.

Acceptance criteria:
- `POST /v1/chat/completions` with `model: lfm2.5-1.2b-instruct` returns HTTP 200 when the peer-backed local endpoint is active and the peer OpenAI API at the configured base URL is healthy.
- Execution uses the same registry endpoint as Studio when `x-role-model-endpoint-id` is supplied.
- No `not present in the normalized catalog` error for activated peer-backed runtime endpoints after process restart.
- Focused bridge or adapter-execution test covers runtime endpoint model synthesis at execution time.

### `R2` Reasoning-model assistant text mapping

Description:
OpenAI-compatible normalization must map `reasoning_content` (and stream deltas) into assistant-visible `outputText` / `content` when `content` is empty.

Acceptance criteria:
- Non-stream `moonshot/kimi-k2.6` (or fixture equivalent with `reasoning_content` only) returns non-empty assistant text in the `/v1/chat/completions` JSON `choices[0].message.content` (or top-level `outputText` when enriched).
- Stream parser accumulates `reasoning_content` deltas into output text.
- `summarizeWorkbenchResult` displays reasoning output in Studio Result workspace.
- Provider-openai unit test covers reasoning-only response bodies.

### `R3` Logs surface for `decision_only` packaged runtime

Description:
Observe → Logs and `GET /logs` must return useful history when llama-swap is inactive, and log-stream paths must not fall through to the SPA.

Acceptance criteria:
- `GET /logs` returns non-empty structured lines derived from runtime telemetry when vendor logs are unavailable.
- `GET /logs/stream` and `/logs/stream/*` return HTTP 503 JSON (or vendor proxy when llama-swap is active), never the React SPA `index.html`.
- `GET /api/role-model/local/logs` returns the same fallback history as `/logs` when vendor logs are empty.
- Observe → Logs renders parsed rows from the combined log payload.

### `R4` Measured latency telemetry

Description:
Direct HTTP provider execution must record measured round-trip latency instead of defaulting to 120ms when vendor metadata is absent.

Acceptance criteria:
- Successful live requests persist `latencyMs` distinct from the constant 120 when upstream response time is measurably different (test may use mocked fetch timing).
- Telemetry summary `averageLatencyMs` reflects stored per-request values.
- `readLatencyMs` still honors explicit `vendorMetadata.latencyMs` when provided.

### `R5` Request ID header alias

Description:
Bridge ingress must accept `x-role-model-request-id` as an alias for `x-request-id` so Connect downstream examples and external clients can correlate telemetry.

Acceptance criteria:
- `POST /v1/chat/completions` with `x-role-model-request-id: req-alias-test` records `req-alias-test` in the telemetry ledger.
- `x-request-id` retains precedence when both headers are present.
- Connect downstream setup docs or generated contract examples reference the supported header names.

### `R6` Failed request observability (bounded)

Description:
HTTP 4xx routing/execution failures from `/v1/chat/completions` should emit a telemetry ledger row with failure status when execution aborts after a request id is assigned.

Acceptance criteria:
- Catalog-validation failures after routing produce a telemetry row with `failureCount` increment and non-200 `statusCode` when feasible without widening scope into full vendor error taxonomy.
- Observe → Requests shows the failed attempt with error class or status code.

## Out of Scope

- Changing `routingStrategy` semantics or default controller assignment
- QA bridge port isolation (`:3457`) and launcher changes
- Full llama-swap vendor activation in packaged `decision_only` mode
- Broad repo-wide formatter or unrelated provider-family work
- New operator features beyond consumption/logs/telemetry remediation

## Constraints

- Preserve Studio workbench headers and behavior; do not break `x-role-model-endpoint-id` pinning
- Keep `decision_only` as the default packaged execution mode unless config explicitly enables vendors
- Follow existing bridge/provider-openai test patterns; add focused regression tests per requirement
- Minimize diff scope: prefer execution-catalog enrichment and provider normalization over large registry refactors

## Coverage Gate

- [x] Every live-validation issue maps to at least one `R#`
- [x] Studio learnings are recorded as fixed guidance
- [x] Acceptance criteria are observable via HTTP, telemetry, or unit tests
- [ ] User approved the requirements artifact

Coverage: PENDING

## Approval Gate

- [x] Requirements are bounded to consumption, output mapping, logs, and telemetry
- [x] Out-of-scope items prevent run creep into routing-strategy or QA launcher redesign
- [ ] User approved proceeding to Phase 1/2

Approval: PENDING
