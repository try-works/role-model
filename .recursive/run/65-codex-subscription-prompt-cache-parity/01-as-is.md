Run: `/.recursive/run/65-codex-subscription-prompt-cache-parity/`
Phase: `01 AS-IS`
Status: `LOCKED`
LockedAt: `2026-07-11T23:58:20Z`
LockHash: `a666c99ac517c33a3c39381bb73f3ab70c1bec57da4a3afe937772dcfcff4590`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/00-requirements.md` (LOCKED)
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/00-worktree.md` (LOCKED)
- `/.recursive/RECURSIVE.md`
- `/.codex/AGENTS.md`
- `/.agent/PLANS.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/.recursive/run/49-runtime-telemetry-analytics-charts/00-requirements.md`
- `/.recursive/run/50-openai-codex-subscription/00-requirements.md`
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/00-requirements.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/00-requirements.md`
- `/role-model-router/packages/provider-openai/src/index.ts`
- `/role-model-router/packages/provider-openai/test/index.test.ts`
- `/role-model-router/packages/provider-litellm/src/index.ts`
- `/role-model-router/packages/provider-litellm/test/index.test.ts`
- `/role-model-router/packages/protocol-routing/src/index.ts`
- `/role-model-router/packages/runtime-observability/src/index.ts`
- `/role-model-router/packages/sqlite-memory/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `/role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.ts`
- `/role-model-router/apps/runtime-ui/app/lib/telemetry-chart-config.ts`
- `/role-model-router/apps/runtime-ui/app/lib/telemetry-route-models.ts`
- `/role-model-router/apps/runtime-ui/app/lib/view-models.ts`
Outputs:
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/01-as-is.md`
Scope note: Records the current Codex Subscription prompt-cache, continuity, telemetry, and downstream-cache-display baseline before run 65 repairs parity with the already-working LiteLLM-backed path.

## TODO

- [x] Re-read the locked Phase 0 artifacts and recursive bridge docs
- [x] Inventory the current provider-openai cache capability and normalization baseline
- [x] Inventory the native Codex transcript and synthetic downstream response baseline
- [x] Inventory current continuity-affinity and telemetry-support handling
- [x] Reconcile the current baseline against `R1` through `R8`
- [x] Audit the artifact for recursive-mode readiness

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `available`
Subagent Capability Probe: `tool_search` exposed the `multi_agent_v1` tool family, including `spawn_agent`, `wait_agent`, `send_input`, and `close_agent`, in this repository session.
Delegation Decision Basis: Phase 1 is direct worktree inspection against locked run inputs and current code. The current tool policy forbids spawning sub-agents unless the user explicitly asks for delegation or parallel agent work.
Delegation Override Reason: sub-agent tooling is available, but the user did not authorize delegation in this thread.
Audit Inputs Provided:
- locked run-65 requirements and worktree artifacts
- current provider, bridge, routing, telemetry, persistence, and runtime-UI cache surfaces
- prior recursive runs 49, 50, 53, and 62

## Effective Inputs Re-read

- `/.recursive/run/65-codex-subscription-prompt-cache-parity/00-requirements.md`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/00-worktree.md`
- `/role-model-router/packages/provider-openai/src/index.ts`
- `/role-model-router/packages/provider-litellm/src/index.ts`
- `/role-model-router/packages/protocol-routing/src/index.ts`
- `/role-model-router/packages/runtime-observability/src/index.ts`
- `/role-model-router/packages/sqlite-memory/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-ui/app/lib/view-models.ts`

## Reproduction Steps (Novice-Runnable)

1. Open the worktree at `D:\DEV\role-model\.worktrees\65-codex-subscription-prompt-cache-parity`.
2. Read `/role-model-router/packages/provider-openai/src/index.ts` lines `22-42`.
   - Confirm `getOpenAICapabilities()` currently reports `promptCaching.supported: false`, `mode: "unsupported"`, `cacheReadTokens: false`, and `cacheWriteTokens: false`.
3. Read `/role-model-router/packages/provider-openai/src/index.ts` lines `848-883` and `947-982`.
   - Confirm both normalization branches hardcode `promptCache.used: false`, `readTokens: 0`, `writeTokens: 0`, `usage.cacheReadTokens: 0`, and `usage.cacheWriteTokens: 0`, then only append vendor metadata afterward.
4. Read `/role-model-router/apps/runtime-host-bridge/src/index.ts` lines `510-524`, `7944-7958`, and `7781-7791`.
   - Confirm Responses ingress reads and maps `prompt_cache_key`, but Chat Completions does not.
5. Read `/role-model-router/apps/runtime-host-bridge/src/index.ts` lines `9566-10086` and `11451-11526`.
   - Confirm native Codex transcript normalization and downstream synthetic response builders preserve only total input/output tokens and drop cache-detail fields.
6. Read `/role-model-router/packages/protocol-routing/src/index.ts` lines `150-152`.
   - Confirm `cacheAffinity` is only a context-window fit heuristic, not a per-domain cache continuity ledger.
7. Read `/role-model-router/packages/sqlite-memory/src/index.ts` lines `2667-2673` and `/role-model-router/apps/runtime-ui/app/lib/view-models.ts` lines `682-689`.
   - Confirm persisted support flags derive from adapter capabilities, and the UI returns `Caching unavailable` when `promptCacheSupported` is false.
8. Run the current focused baseline suites from `00-worktree.md`.
   - Confirm the pre-fix baseline is green even though the Codex path still serializes false-zero or unsupported cache facts.

## Current Behavior by Requirement

| Requirement | Current behavior |
| --- | --- |
| `R1` | Native Codex Subscription execution preserves request totals but not cache detail. `CodexResponsesNormalizedTranscript` and the synthetic OpenAI-compatible response builders do not carry `cached_tokens`, `cache_write_tokens`, or supported-zero cache facts. |
| `R2` | Downstream OpenAI-compatible Responses and Chat Completions bodies for the native Codex path expose only total token counts. The standard OpenAI cache-detail subfields that downstream parsers expect are absent. |
| `R3` | `provider-openai` still advertises prompt caching unsupported and normalizes cache usage to zero even when upstream-compatible fields or vendor metadata could carry truth-based cache facts. |
| `R4` | Responses ingress forwards `prompt_cache_key`, but Chat Completions ingress does not. Routed continuity currently has `continuityAffinity` plus a generic `cacheAffinity` size check, but no persisted per-domain cache ledger or restore/create status. |
| `R5` | Telemetry persistence and analytics already have cache fields, but Codex Subscription rows can still be marked unsupported because support derives from the current false capability matrix. Runtime UI cache posture can therefore show `Caching unavailable` instead of truthful supported-zero or hit states. |
| `R6` | LiteLLM-backed normalization already reads `cached_tokens` and forwards `prompt_cache_key`. That path is the working regression baseline. Non-Codex OpenAI-family logic remains exposed to shared provider-openai behavior, so a shallow Codex-only patch would risk drift. |
| `R7` | Existing tests cover only fragments of the cache path: some Responses `prompt_cache_key` propagation, some LiteLLM cached-token normalization, and some analytics partial-support semantics. There is no complete RED-first matrix covering the run-65 contract. |
| `R8` | No current phase artifact or test evidence proves the rebuilt runtime fixes the user-visible Pi runtime CLI `0%` cache symptom or cross-checks the displayed percentage against canonical runtime cache facts. |

## Source Requirement Inventory

- `R1` | Source of current-state analysis: `/role-model-router/apps/runtime-host-bridge/src/index.ts` lines `9566-10086`, `10360-10464`, `11451-11526` | Disposition: in-scope | Source Quote: "native Codex Responses normalization preserves cached-read token counts whenever upstream usage exposes them" | Summary: current native Codex response shaping drops those facts
- `R2` | Source of current-state analysis: `/role-model-router/apps/runtime-host-bridge/src/index.ts` lines `9775-10086`, `/role-model-router/packages/provider-openai/src/index.ts` lines `848-982` | Disposition: in-scope | Source Quote: "Responses replies always use the documented OpenAI cache-read location `usage.input_tokens_details.cached_tokens`, with a non-zero value for a hit and `0` for a supported miss or sub-`1024` request" | Summary: totals survive, cache-detail subfields do not
- `R3` | Source of current-state analysis: `/role-model-router/packages/provider-openai/src/index.ts` lines `22-42`, `848-982` | Disposition: in-scope | Source Quote: "provider-openai capability and normalization truthfulness" | Summary: the provider still reports unsupported and zero
- `R4` | Source of current-state analysis: `/role-model-router/apps/runtime-host-bridge/src/index.ts` lines `510-524`, `7781-7791`, `7944-7958`; `/role-model-router/packages/protocol-routing/src/index.ts` lines `150-152` | Disposition: in-scope | Source Quote: "Responses ingress continues to map `prompt_cache_key` into the shared execution request and the provider request body" | Summary: Responses preserves the key, Chat does not, and routing continuity is only heuristic
- `R5` | Source of current-state analysis: `/role-model-router/packages/runtime-observability/src/index.ts` lines `1044-1053`; `/role-model-router/packages/sqlite-memory/src/index.ts` lines `2667-2673`; `/role-model-router/apps/runtime-host-bridge/src/index.ts` lines `16397-16412`; `/role-model-router/apps/runtime-ui/app/lib/view-models.ts` lines `682-689` | Disposition: in-scope | Source Quote: "Codex Subscription telemetry rows set cache-support flags truthfully when cached-token accounting is available" | Summary: canonical cache fields exist, but current support truth excludes Codex rows
- `R6` | Source of current-state analysis: `/role-model-router/packages/provider-litellm/src/index.ts` lines `26-29`, `110-127`; `/role-model-router/packages/provider-litellm/test/index.test.ts` lines `216`, `471-482` | Disposition: in-scope | Source Quote: "preserve parity with existing LiteLLM and non-Codex OpenAI behavior" | Summary: LiteLLM is already the correct cache-behavior control
- `R7` | Source of current-state analysis: `/role-model-router/packages/provider-openai/test/index.test.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`, `/role-model-router/packages/provider-litellm/test/index.test.ts` | Disposition: in-scope | Source Quote: "every deterministic behavior changed under R1 through R6 must have an explicit automated RED-first case" | Summary: the current suite is incomplete relative to the required matrix
- `R8` | Source of current-state analysis: locked requirements plus current repo evidence | Disposition: in-scope | Source Quote: "final verification against the rebuilt runtime must prove the actual user symptom is repaired in the downstream client that exhibited it" | Summary: there is no current rebuilt-runtime Pi CLI proof

## Relevant Code Pointers

### `provider-openai`

- `/role-model-router/packages/provider-openai/src/index.ts:22-42`
  - `getOpenAICapabilities()` currently hardcodes prompt caching unsupported.
- `/role-model-router/packages/provider-openai/src/index.ts:759-764`
  - Responses request shaping forwards `previous_response_id` and `prompt_cache_key`.
- `/role-model-router/packages/provider-openai/src/index.ts:848-883`
  - Chat Completions normalization hardcodes `used: false` and zero cache token counts.
- `/role-model-router/packages/provider-openai/src/index.ts:947-982`
  - Responses normalization repeats the same zero defaults.

### Native Codex bridge and synthetic downstream responses

- `/role-model-router/apps/runtime-host-bridge/src/index.ts:463-464`
  - Responses body type exposes `previous_response_id` and `prompt_cache_key`.
- `/role-model-router/apps/runtime-host-bridge/src/index.ts:510-524`
  - Responses ingress reads those request fields.
- `/role-model-router/apps/runtime-host-bridge/src/index.ts:7781-7791`
  - Chat Completions execution mapping forwards session affinity and reasoning, but not `prompt_cache_key`.
- `/role-model-router/apps/runtime-host-bridge/src/index.ts:7944-7958`
  - Responses execution mapping forwards prompt cache, continuation, and session affinity.
- `/role-model-router/apps/runtime-host-bridge/src/index.ts:9566-10086`
  - `CodexResponsesNormalizedTranscript`, transcript normalization, SSE shaping, and body shaping preserve token totals but not cache-detail facts.
- `/role-model-router/apps/runtime-host-bridge/src/index.ts:10360-10464`
  - native Codex request construction forwards `prompt_cache_key`, but later synthetic response shaping still drops the cache details.
- `/role-model-router/apps/runtime-host-bridge/src/index.ts:11451-11526`
  - generic bridge-owned Chat/Responses JSON response builders expose totals only.

### Routing continuity and telemetry support

- `/role-model-router/packages/protocol-routing/src/index.ts:150-152`
  - `continuityAffinity` is last-handoff endpoint equality and `cacheAffinity` is only a context-window fit check.
- `/role-model-router/packages/runtime-observability/src/index.ts:1044-1053`
  - execution telemetry persists adapter-declared prompt-cache support plus normalized cache read/write counts.
- `/role-model-router/packages/sqlite-memory/src/index.ts:2667-2673`
  - persisted telemetry rows derive support flags directly from the execution telemetry support booleans.
- `/role-model-router/apps/runtime-host-bridge/src/index.ts:16397-16412`
  - cache-hit-token-rate analytics exclude unsupported rows.
- `/role-model-router/apps/runtime-ui/app/lib/view-models.ts:682-689`
  - `summarizeCachePosture()` returns `Caching unavailable` when `promptCacheSupported` is false.

### Working regression baseline

- `/role-model-router/packages/provider-litellm/src/index.ts:26-29`
  - reads `usage.prompt_tokens_details.cached_tokens`.
- `/role-model-router/packages/provider-litellm/src/index.ts:110-127`
  - normalizes cache usage into canonical prompt-cache and usage fields.
- `/role-model-router/packages/provider-litellm/test/index.test.ts:471-482`
  - existing tests already prove cached-token normalization on the LiteLLM path.

## Known Unknowns

- Whether the native Codex runtime currently exposes cache-write facts for GPT-5.4 in the exact transcript event shape needed by the bridge. This is a Phase 3 implementation detail, not a Phase 2 blocker, because the downstream contract must preserve them when present and stay truthful when absent.
- Whether the current Kimi coding OAuth path reaches this repository through the generic `provider-openai` normalization path or a narrower adapter seam in all cases. This affects the exact regression tests, not the requirement to preserve top-level `usage.cached_tokens`.
- The exact formula Pi uses to display cache percentage in the CLI. This is a Phase 5 verification detail; the run requirement already fixes the acceptance surface by demanding a live CLI cross-check against canonical runtime facts.

## Evidence

- `provider-openai` capability matrix still marks prompt caching unsupported.
- `provider-openai` normalization still emits supported-false plus zero cache tokens by default.
- Chat Completions ingress does not currently map `prompt_cache_key`.
- Native Codex transcript and downstream OpenAI-compatible synthetic responses currently lose cache-detail facts.
- Routing continuity currently lacks any per-domain cache ledger.
- Telemetry, persistence, analytics, and UI already own cache surfaces, so the fix should feed those paths rather than inventing a side channel.

## Traceability

- `R1`: native Codex transcript and response shaping baseline recorded
- `R2`: downstream OpenAI-compatible cache-detail omission recorded
- `R3`: provider-openai capability and normalization false-zero baseline recorded
- `R4`: request-hint asymmetry and continuity-ledger gap recorded
- `R5`: telemetry, persistence, analytics, and runtime-UI support-truth baseline recorded
- `R6`: LiteLLM working baseline and generic OpenAI-family regression boundary recorded
- `R7`: current test-coverage gap recorded
- `R8`: absence of rebuilt-runtime Pi CLI proof recorded

## Gaps Found

1. **Provider support truth is wrong.** `provider-openai` still claims prompt caching unsupported and zeroes cache counts even when the upstream or vendor metadata could provide truth-based facts.
2. **Native Codex cache facts are dropped.** The bridge-owned normalized transcript and synthetic downstream response builders preserve totals only.
3. **Ingress parity is incomplete.** Responses carries `prompt_cache_key`; Chat Completions does not.
4. **Continuity state is too weak.** Routing only has endpoint-continuity and token-fit heuristics, not a per-domain cache-affinity ledger with restore/create state.
5. **Canonical telemetry already exists but is starved by false capability truth.** This makes cache analytics and cache posture disagree with the actual warmed-runtime scenario.
6. **The automated and rebuilt-runtime proof floor is incomplete.** The current tests are not enough to keep this user-visible `0%` regression from returning.

None of these gaps are unexpected. They are the deliberate targets of run 65.

## Repair Work Performed

None. This is a Phase 1 audit artifact. Repairs are deferred to Phase 2 planning and Phase 3 implementation.

## Audit Verdict

Audit: PASS

The current Codex Subscription cache baseline has been systematically inventoried. The gaps align directly with `R1` through `R8`.

## Earlier Phase Reconciliation

- `00-requirements.md` defines the run as a parity repair across native Codex cache facts, downstream wire contract, continuity, telemetry, and Pi-visible verification. The Phase 1 inventory confirms those gaps exist in the current worktree.
- `00-worktree.md` fixed the diff basis at `git diff --name-only 6b3850470de5c37a7d005838aa2fb91afadd214e`. This artifact reuses that basis unchanged.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/49-runtime-telemetry-analytics-charts/00-requirements.md`
- `/.recursive/run/50-openai-codex-subscription/00-requirements.md`
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/00-requirements.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/00-requirements.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`

## Subagent Contribution Verification

- Reviewed Action Records: none
- Main-Agent Verification Performed: direct code inspection in the run-65 worktree
- Acceptance Decision: `not applicable`

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `6b3850470de5c37a7d005838aa2fb91afadd214e`
- Comparison reference: `working-tree`
- Normalized baseline: `6b3850470de5c37a7d005838aa2fb91afadd214e`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 6b3850470de5c37a7d005838aa2fb91afadd214e`
- Diff basis used: `git diff --name-only 6b3850470de5c37a7d005838aa2fb91afadd214e`
- Supplemental scope command: `git status --short --untracked-files=all`
- Base branch: `main`
- Worktree branch: `recursive/65-codex-subscription-prompt-cache-parity`
- Active worktree path: `D:\DEV\role-model\.worktrees\65-codex-subscription-prompt-cache-parity\`
- Planned or claimed changed files:
  - `/.recursive/run/65-codex-subscription-prompt-cache-parity/01-as-is.md`
- Unexplained drift:
  - none

## Requirement Completion Status

- `R1` | Status: deferred | Rationale: implementation pending Phase 3 | Deferred By: `/.recursive/run/65-codex-subscription-prompt-cache-parity/00-requirements.md`
- `R2` | Status: deferred | Rationale: implementation pending Phase 3 | Deferred By: `/.recursive/run/65-codex-subscription-prompt-cache-parity/00-requirements.md`
- `R3` | Status: deferred | Rationale: implementation pending Phase 3 | Deferred By: `/.recursive/run/65-codex-subscription-prompt-cache-parity/00-requirements.md`
- `R4` | Status: deferred | Rationale: implementation pending Phase 3 | Deferred By: `/.recursive/run/65-codex-subscription-prompt-cache-parity/00-requirements.md`
- `R5` | Status: deferred | Rationale: implementation pending Phase 3 | Deferred By: `/.recursive/run/65-codex-subscription-prompt-cache-parity/00-requirements.md`
- `R6` | Status: deferred | Rationale: implementation pending Phase 3 | Deferred By: `/.recursive/run/65-codex-subscription-prompt-cache-parity/00-requirements.md`
- `R7` | Status: deferred | Rationale: TDD matrix execution begins in Phase 3 | Deferred By: `/.recursive/run/65-codex-subscription-prompt-cache-parity/00-requirements.md`
- `R8` | Status: deferred | Rationale: rebuilt-runtime Pi CLI verification is a Phase 5 obligation | Deferred By: `/.recursive/run/65-codex-subscription-prompt-cache-parity/00-requirements.md`

## Audit Gate

- [x] Effective upstream artifacts re-read
- [x] Current baseline grounded in worktree code
- [x] Requirement inventory covers `R1` through `R8`
- [x] No implementation work mixed into Phase 1

Audit: PASS

## Coverage Gate

- [x] provider-openai baseline recorded
- [x] native Codex transcript and downstream response baseline recorded
- [x] continuity and telemetry-support baseline recorded
- [x] gaps mapped back to requirements

Coverage: PASS

## Approval Gate

- [x] Analysis is concrete enough to plan Phase 2
- [x] Confirmed gaps map directly to the locked requirements
- [x] No unresolved ambiguity blocks planning

Approval: PASS
