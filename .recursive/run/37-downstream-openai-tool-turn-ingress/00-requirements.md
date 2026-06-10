Run: `/.recursive/run/37-downstream-openai-tool-turn-ingress/`
Phase: `00 Requirements`
Status: `DRAFT`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/00-requirements.md` (related downstream/telemetry context)
- Live downstream ingress probe against packaged runtime `:3456` (2026-06-08)
- `role-model-router/scripts/probe-downstream-ingress.py`
- Pi agent failure report: web search on `mixed.local-remote` returns `400 Cannot read properties of null (reading 'length')`
Outputs:
- `/.recursive/run/37-downstream-openai-tool-turn-ingress/00-requirements.md`
Scope note: Remediate OpenAI-compatible downstream ingress so agent clients (e.g. Pi) can complete multi-turn tool loops against `mixed.local-remote` and other aliases without bridge-level 400 crashes. Work is grounded in the executed 33-case ingress probe, not conversational speculation.

## TODO

- [x] Consolidate probe findings into stable requirement identifiers
- [x] Map each BRIDGE_CRASH probe case to at least one `R#`
- [x] Define observable acceptance criteria per requirement
- [x] Record probe evidence path and fixed implementation guidance
- [x] Record out-of-scope boundaries and constraints
- [x] Make strict TDD and packaged-runtime validation explicit
- [x] Define runtime configuration parity procedure for post-rebuild validation
- [ ] User approval of this requirements artifact
- [ ] Complete Coverage Gate checklist
- [ ] Complete Approval Gate checklist

## Source Requirement Inventory

| Source | Contribution |
| --- | --- |
| Pi agent live failure (2026-06-08) | Web search on `mixed.local-remote` fails after first tool turn with `400 "Cannot read properties of null (reading 'length')"` |
| Ingress probe `B1` | Confirmed bridge crash on assistant `content: null` + `tool_calls` + tool result |
| Ingress probe `B2` | Confirmed bridge crash when assistant `content` omitted (`undefined.length`) |
| Ingress probe `B4`, `B5` | Confirmed bridge crash on tool messages with null/missing `content` |
| Ingress probe `B6`, `B7`, `D1`, `D4`, `G3` | Same crash class across multi-round, system-null, named tool, and streaming follow-ups |
| Ingress probe `B3`, `C3` | Bridge passes with `content: ""` but provider returns `tool_call_id is not found` — tool-turn fields not forwarded |
| Ingress probe `A2`, `B8` | First-turn tools work; failure is specific to tool-turn history shapes |
| Ingress probe `E3`–`E5` | `/v1/responses` rejects non-string message content with HTTP 500 |
| `estimateContextTokens()` (`runtime-host-bridge/src/index.ts`) | `message.content.length` on null/undefined |
| `toOpenAIInput()` (`provider-openai/src/index.ts`) | Forwards only `role` + `content`; drops `tool_calls`, `tool_call_id`, `name` |
| `RuntimeExecutionMessage` (`adapter-execution/src/index.ts`) | Types `content: string` only |
| Connect downstream UI (`:3456`) | Documents OpenAI-compatible contract for external consumers including Pi |

## Probe Baseline Summary (2026-06-08)

Target: `http://127.0.0.1:3456`, model `mixed.local-remote`, bearer `role-model-local`.

| Class | Count | IDs |
| --- | ---: | --- |
| PASS | 11 | A1–A5, B8, C1, D3, E1, E2, F5 |
| BRIDGE_CRASH (P0) | 9 | B1, B2, B4, B5, B6, B7, D1, D4, G3 |
| PROVIDER_ERROR (bridge OK) | 6 | B3, C2, C3, C4, D2, F3 |
| BRIDGE_VALIDATION | 3 | F1, F2, F4 |
| RESPONSES_PATH | 3 | E3, E4, E5 |
| ROUTING_ERROR | 1 | F6 |

Evidence:
- Probe RED baseline: `evidence/logs/probe-downstream-ingress-baseline-2026-06-08.log`
- Runtime config parity baseline: `evidence/logs/runtime-config-baseline-pre-rebuild.json`

## Fixed Guidance

1. **Pi web-search failure is a bridge ingress bug, not a Pi disconnect.** The handler returns HTTP 400 before provider execution (`inputTokens: 0`, `endpointId: unknown.endpoint`).
2. **First-turn tool requests already work.** Scope is follow-up turns and any message with `content: null`, omitted `content`, or tool-role variants.
3. **Fixing token estimation alone is insufficient.** `B3` proves tool-loop follow-ups also need `tool_calls` / `tool_call_id` passthrough to providers.
4. **Keep the probe script as the regression oracle.** `role-model-router/scripts/probe-downstream-ingress.py` must gate BRIDGE_CRASH cases to zero after remediation.
5. **Unit tests alone are insufficient.** Final acceptance requires a rebuilt packaged runtime on the operator port with the same model/account/alias configuration as the pre-fix baseline, then re-running the ingress probe and Pi-equivalent tool-loop scenarios.

## Verification Discipline

| Layer | When | Gate |
| --- | --- | --- |
| Strict TDD (Phase 3) | Before each production change | Failing test first (RED), then implementation (GREEN), evidence logged |
| Focused package tests (Phase 4) | After implementation | `runtime-host-bridge`, `provider-openai`, `adapter-execution` tests/builds PASS |
| Packaged runtime E2E (Phase 5) | After `runtime:package-sea` rebuild | Probe script + tool-loop curl on live `:3456` with config parity |
| Pi-equivalent flow (Phase 5) | Same rebuilt runtime | `A2` first turn → `B1`/`B3` follow-up without bridge 400 |

`TDD Mode` for Phase 3 implementation: **`strict`** (no production code without a preceding failing test and recorded RED evidence path).

## Requirements

### `R1` Null-safe chat-completions context estimation

Description:
Bridge ingress must estimate context tokens and difficulty signals without throwing when OpenAI-valid messages use `content: null`, omitted `content`, or non-string content parts.

Acceptance criteria:
- `POST /v1/chat/completions` with probe cases `B1`, `B2`, `B4`, `B5`, `B6`, `B7`, `D1`, `D4`, and `G3` no longer returns HTTP 400 with `Cannot read properties of null (reading 'length')` or `undefined (reading 'length')`.
- `estimateContextTokens()` and `summarizeDifficultySignals()` use a shared null-safe text extraction helper for string, null, undefined, and text-part array content.
- Strict TDD: a failing `runtime-host-bridge` test exists **before** the null-safe helper ships (RED log under `evidence/logs/red/`).
- Focused `runtime-host-bridge` unit test covers `mapChatCompletionsRequest` with null assistant `content` + `tool_calls` without throwing (GREEN log under `evidence/logs/green/`).
- Packaged-runtime probe (see `R7`) reports zero `BRIDGE_CRASH` results for the cases above.

### `R2` OpenAI tool-turn message passthrough

Description:
Multi-turn tool conversations must preserve assistant `tool_calls` and tool-role `tool_call_id` / `name` fields from downstream ingress through execution to provider request construction.

Acceptance criteria:
- Probe case `B3` (assistant `content: ""` + `tool_calls` + tool result) returns HTTP 200 or a provider-level error other than `tool_call_id is not found` caused by dropped assistant tool metadata.
- `buildOpenAIRequest()` / `toOpenAIInput()` forwards `tool_calls`, `tool_call_id`, and `name` when present on execution messages.
- `RuntimeExecutionMessage` (and bridge message typing) allow OpenAI-compatible tool-turn fields without losing type safety for normal string content.
- Strict TDD: a failing `provider-openai` test exists **before** `toOpenAIInput()` passthrough ships (RED evidence path recorded).
- Provider-openai unit test asserts forwarded chat-completions body includes tool-turn fields for a representative history (GREEN evidence path recorded).
- Packaged-runtime probe case `B3` classified as `PASS` (preferred) or provider error unrelated to `tool_call_id is not found`.

### `R3` Durable downstream ingress regression suite

Description:
The executed ingress probe must become a repo-owned regression gate for downstream OpenAI compatibility on aliases.

Acceptance criteria:
- `role-model-router/scripts/probe-downstream-ingress.py` remains runnable against a live bridge and prints per-case HTTP status and verdict.
- Probe output is recorded under this run's `evidence/logs/` for RED baseline and post-fix GREEN runs.
- `runtime-host-bridge` and/or `runtime:validate-host` documentation references the probe for Connect/downstream consumer validation.
- Post-remediation **packaged-runtime** summary (see `R7`): 0 `BRIDGE_CRASH`, all Group A baseline controls still `PASS`.

### `R4` Failed ingress telemetry remains inspectable

Description:
Bridge-level chat-completions failures must continue to appear in runtime telemetry with enough context for operator diagnosis.

Acceptance criteria:
- A deliberate pre-fix-class failure (or simulated bridge validation failure) produces a telemetry row with `statusCode: 400`, `errorClass: execution_failed`, and `modelId` matching the requested alias.
- After `R1`/`R2`, successful tool-turn follow-ups produce non-zero `inputTokens` and a real `endpointId` in telemetry.
- Observe → Requests can distinguish bridge ingress failures from provider failures for the probe cases.

### `R5` `/v1/responses` tool-history behavior declared and bounded

Description:
The responses ingress path must either accept OpenAI-valid tool-turn message arrays or fail with an explicit, documented contract boundary.

Acceptance criteria:
- Probe cases `E3`, `E4`, `E5` outcomes are documented in Phase 1/2 artifacts as either: (a) fixed to accept the same message shapes as chat-completions, or (b) explicitly unsupported with stable HTTP status and error message suitable for downstream clients.
- If bounded as unsupported: Connect/downstream docs state that multi-turn tool history must use `/v1/chat/completions`, not `/v1/responses`.
- No HTTP 500 surfacing from uncaught validation throws on the responses path once bounded.

### `R6` Strict TDD delivery with recorded RED/GREEN evidence

Description:
All production changes for `R1`–`R5` must follow strict failing-test-first discipline with auditable evidence paths per touched package.

Acceptance criteria:
- Phase 3 declares `TDD Mode: strict`.
- Every production-code change is preceded by a failing automated test at the strongest reasonable layer before the implementation turns green.
- The run records RED and GREEN evidence logs under `/.recursive/run/37-downstream-openai-tool-turn-ingress/evidence/logs/` for, at minimum:
  - null-safe context estimation (`runtime-host-bridge`)
  - tool-turn message passthrough (`provider-openai`, `adapter-execution` typing if changed)
  - any new probe-script assertions added for regression (`R3`)
- Phase 4 `04-test-summary.md` cites the exact test commands and PASS logs for all touched packages.
- No requirement is marked `verified` on unit tests alone when `R7` packaged-runtime scenarios are in scope for that requirement.

### `R7` Rebuilt packaged runtime validation with configuration parity

Description:
Final acceptance must prove the fix in the same delivery path operators use: rebuilt `Role-Model.bat` / SEA package on port `3456`, configured like the current working runtime, then validated with the ingress probe and Pi-equivalent tool-loop flows.

Acceptance criteria:
- **Pre-rebuild baseline capture** (before stopping the current runtime):
  - Record `GET /v1/models` model ids and endpoint ids.
  - Record active provider accounts, local peer endpoints, and `mixed.local-remote` alias membership sufficient to reproduce the Pi setup.
  - Save capture under `evidence/logs/runtime-config-baseline-pre-rebuild.json` (API exports and/or `%LOCALAPPDATA%\Role Model Runtime\state\` excerpts).
- **Rebuild** from the run worktree after Phase 3/4 code is green:
  - `corepack pnpm install` (if needed)
  - `corepack pnpm run runtime:package-sea` in `role-model-router`
  - Record package output path and SHA256 of `Role-Model.bat` or `role-model-runtime.exe` in Phase 4/5 artifacts.
- **Config parity** on the rebuilt runtime:
  - Reapply the same operator configuration as the baseline: local model(s) (e.g. `lfm2.5-8b-a1b` or equivalent peer-backed endpoint), remote `moonshot/kimi-k2.6` account, and `mixed.local-remote` alias pool.
  - `GET /v1/models` on rebuilt `:3456` lists the same alias and model ids as the baseline capture (allowing endpoint-id churn only when peer registration uuid differs, but alias + model ids must match).
  - Downstream contract unchanged: base URL `http://127.0.0.1:3456`, bearer `role-model-local` (or documented operator token).
- **Post-rebuild validation** on the running packaged runtime:
  - Run `python role-model-router/scripts/probe-downstream-ingress.py` against `:3456`; save output to `evidence/logs/probe-downstream-ingress-green-<date>.log`.
  - Probe result: **0 `BRIDGE_CRASH`**, Group A (`A1`–`A5`) **PASS**, `B3` **PASS** (or acceptable non-passthrough provider error), `G3` **PASS** or documented streaming follow-up in addendum.
  - Pi-equivalent sequence on rebuilt runtime: `A2` (first-turn tools) → `B1` (tool-result follow-up) returns HTTP 200 with assistant content or valid `tool_calls`, not bridge `400`.
  - Telemetry check: successful `B1`/`B3` follow-ups show non-zero `inputTokens` and real `endpointId` in `GET /api/role-model/telemetry/requests`.
- Evidence paths for rebuild + validation are cited in `04-test-summary.md` and `05-manual-qa.md` (agent-operated or hybrid per Phase 5 declaration).

## Out of Scope

- Pi agent or other downstream client code changes
- Provider image/multimodal support (`C2` unsupported image URL)
- `developer` role tokenization failures (`D2`)
- Empty-message provider rejections (`C4`, `F3`) unless directly caused by bridge corruption
- Routing strategy, alias pool, or difficulty/controller policy changes
- MCP/runtime-owned tool execution (downstream clients supply their own tool results)
- Changing operator port, auth token, or alias names away from the current `3456` / `role-model-local` / `mixed.local-remote` baseline unless captured in an addendum

## Constraints

- Preserve working first-turn tool behavior (`A2`, `B8`, `A4`) and plain chat (`A1`, `A3`, `A5`)
- Minimize diff scope: bridge ingress, `adapter-execution` message typing, `provider-openai` request builder
- **Strict TDD is mandatory** (`R6`); Phase 3 must not ship production fixes without preceding failing tests and RED/GREEN evidence
- **Packaged-runtime validation is mandatory** (`R7`); worktree-only or unit-test-only proof is insufficient for final `verified` disposition on `R1`–`R3`
- Rebuild via `runtime:package-sea`; validate on `Role-Model.bat` (or equivalent SEA output) at `:3456` after config parity restore
- Do not weaken `parseChatCompletionsBody` validation for required `model` and `messages` (`F1`, `F2`)
- Keep `mixed.local-remote` as primary acceptance alias; spot-check direct `moonshot/kimi-k2.6` where routing parity matters
- Local peer and Moonshot credentials remain operator-supplied; the run must not commit secrets into evidence (redact tokens in config captures)

## Open Unknowns (resolve in Phase 1 AS-IS)

1. Whether any alias routes tool-turn follow-ups to local endpoints that reject tool history differently from Kimi (probe used remote-routed alias outcomes).
2. Whether streaming tool-turn follow-ups need additional SSE-specific handling beyond non-stream fixes (`G3`).

## Coverage Gate

- [x] Every `BRIDGE_CRASH` probe case maps to `R1` and/or `R2`
- [x] `B3`/`C3` provider passthrough gap maps to `R2`
- [x] `E3`–`E5` map to `R5`
- [x] Probe evidence path recorded
- [x] Acceptance criteria are observable via HTTP, telemetry, probe script, or unit tests
- [x] Strict TDD (`R6`) and packaged-runtime config-parity validation (`R7`) are explicit
- [ ] User approved the requirements artifact

Coverage: PENDING

## Approval Gate

- [x] Requirements are bounded to downstream OpenAI ingress and tool-turn compatibility
- [x] Out-of-scope items prevent run creep into routing policy or client changes
- [x] Regression probe is part of the delivery contract (`R3`)
- [x] Strict TDD with RED/GREEN evidence is mandatory (`R6`)
- [x] Rebuilt packaged runtime with config parity and probe re-run is mandatory (`R7`)
- [ ] User approved proceeding to Phase 1/2

Approval: PENDING
