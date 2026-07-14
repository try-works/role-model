Run: `/.recursive/run/70-cache-hit-token-rate-analytics-fix/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-07-14T12:16:38Z`
LockHash: `33d2283e02b4c66b6a94508985e9db2f27f9801b53bf9c5177f0fcd1963cffe9`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/00-requirements.md`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/00-requirements.md`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `role-model-router/packages/provider-openai/src/index.ts`
- `role-model-router/packages/provider-openai/test/index.test.ts`
- `role-model-router/packages/provider-litellm/src/index.ts`
- `role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.ts`
- `role-model-router/apps/runtime-ui/app/lib/telemetry-route-models.ts`
- official OpenAI prompt caching docs current on `2026-07-14`
- user-approved spec guidance in chat on `2026-07-14`
Outputs:
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/00-requirements.md`
Scope note: This run repairs the backend-owned `cacheHitTokenRate` metric so Observe and overview analytics report truthful prompt-cache token hit rate across supported execution paths, without changing provider-reported token totals, without regressing LiteLLM or Kimi OAuth normalization, and without changing the separate request-level `cacheBackedRequestRate` metric.

## TODO

- [x] Ground the run in current telemetry, provider-normalization, and prior-run context
- [x] Convert the validated bug into backend-owned requirement IDs
- [x] Scope the run to analytics semantics, regression coverage, and operator-visible verification
- [x] Record explicit cross-path constraints for LiteLLM, Codex Subscription, Kimi OAuth, and direct OpenAI-compatible execution
- [x] Define deterministic acceptance criteria
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Run Metadata

- Priority: `P1`
- Run type: `backend bugfix`
- Primary subsystems:
  - `role-model-router/apps/runtime-host-bridge/**`
  - `role-model-router/packages/provider-openai/**`
- Secondary subsystems:
  - `role-model-router/packages/provider-litellm/**`
  - `role-model-router/apps/runtime-ui/**`
- User-visible outcome:
  - Observe and overview cache-hit charts show truthful token hit rate instead of the current halved value on supported rows.

## Relevant Prior Runs

- `53-runtime-telemetry-analytics-contract-hardening`
  - owns the telemetry query contract, partial-support semantics, and chart-state expectations
- `65-codex-subscription-prompt-cache-parity`
  - locked the OpenAI-family prompt-cache truth contract across Codex, LiteLLM, and Kimi-shaped paths
- `68-codex-subscription-tool-call-parity`
  - confirms Codex Subscription remains a distinct execution family and should not need a provider-specific analytics fork

## Problem Summary

The validated defect is in the analytics formula, not in the chart renderer. `cacheHitTokenRate` currently divides cached tokens by `inputTokens + cacheReadTokens`, which double-counts cached tokens whenever `inputTokens` already represents the provider's total input tokens. That produces an observed hit rate near half of the true value.

Current normalization contracts already treat `inputTokens` as total provider-reported input tokens and `cacheReadTokens` as a separate subset across the OpenAI-family paths in scope here, including Codex Subscription transcript shaping, direct OpenAI-compatible usage normalization, LiteLLM-backed execution, and Kimi OAuth chat-completions payloads. The fix must therefore correct the analytics metric without redefining upstream token semantics.

## Fixed Decisions

1. `inputTokens` remains the provider-reported total input token count, including cached reads where the provider includes them.
2. `cacheReadTokens` remains a separate subset field and must not be added back into the `cacheHitTokenRate` denominator.
3. `cacheHitTokenRate` is computed only over rows with `cacheReadTokensSupported = true`.
4. `cacheBackedRequestRate` remains a per-request metric and is not changed by this run.
5. The fix must stay shared across OpenAI-family paths where the existing normalization contract is already consistent; do not introduce a Codex-only analytics fork unless Phase 1 proves a real contract mismatch.

## Requirements

### `R1` Correct cache-hit token-rate semantics

Description:
Repair the backend analytics definition of `cacheHitTokenRate` so it reflects cached prompt tokens as a subset of total input tokens rather than as additional tokens added on top of total input.

Acceptance criteria:
- `cacheHitTokenRate` is computed as `sum(cacheReadTokens) / sum(inputTokens)` over supported rows
- the denominator never adds `cacheReadTokens` on top of `inputTokens`
- if no rows in the slice support cache-read tokens, the metric remains unsupported or `null` per the existing contract
- if supported rows exist but the summed denominator is `0`, the metric returns `null`
- the existing mixed-support slice behavior remains partial rather than silently coercing unsupported rows into zero-value support

### `R2` Preserve cross-path token normalization truth

Description:
The analytics fix must work correctly for all in-scope execution paths that currently feed the metric, including LiteLLM, Codex Subscription, Kimi OAuth, and direct OpenAI-compatible execution.

Acceptance criteria:
- Codex Subscription transcript normalization continues to preserve `input_tokens` plus cache-detail fields without redefining `inputTokens`
- direct OpenAI-compatible Responses and Chat Completions normalization continues to treat `input_tokens` or `prompt_tokens` as totals and cached tokens as a separate detail field
- Kimi-shaped chat-completions payloads with top-level `usage.cached_tokens` continue to normalize into total `inputTokens` plus separate `cacheReadTokens`
- LiteLLM-backed execution continues to preserve its current cache-read normalization behavior
- no in-scope path pre-subtracts cached tokens from `inputTokens` as part of this run

### `R3` Preserve adjacent metric and support-state semantics

Description:
This bugfix must not alter neighboring cache metrics or blur the line between supported-zero and unsupported cache surfaces.

Acceptance criteria:
- `cacheBackedRequestRate` remains request-count-based and unchanged
- supported-zero rows remain visible as `0`, not unsupported
- unsupported rows remain unsupported and are not reclassified as supported-zero
- existing runtime-ui chart labels and metric names remain stable unless Phase 1 proves a contract inconsistency that requires a naming correction

### `R4` Add deterministic RED and GREEN coverage

Description:
The run must use strict TDD in Phase 3 and add focused regression coverage that proves the analytics fix and guards all affected execution paths.

Acceptance criteria:
- `03-implementation-summary.md` declares `TDD Mode: strict`
- each changed production behavior under `R1` through `R3` is introduced only after a failing owning automated test exists and is recorded in the Phase 3 TDD evidence
- automated RED-first coverage exists for the analytics formula defect itself
- host-bridge analytics coverage includes a seeded supported-row case where `inputTokens = 120` and `cacheReadTokens = 16`, and the expected rate is `0.133333`
- host-bridge analytics coverage includes mixed supported and unsupported rows and preserves partial-support semantics
- regression controls remain green for:
  - Codex Subscription cache-detail shaping
  - direct OpenAI-compatible nested cache-detail normalization
  - Kimi top-level `usage.cached_tokens` normalization
  - LiteLLM-backed cache-read normalization
- one deterministic test explicitly proves that `cacheBackedRequestRate` did not change

### `R5` Verify operator-visible outcome on rebuilt runtime in Phase 5

Description:
Phase 5 verification must prove on the rebuilt runtime that the repaired backend metric flows through the existing analytics surfaces that consume it.

Acceptance criteria:
- `05-manual-qa.md` declares a verification path that runs against the rebuilt runtime from the implementation commit, not only against unit tests, seeded fixtures, or mocked chart data
- verification includes backend query proof for `cacheHitTokenRate` on the existing telemetry query surface
- verification includes one operator-surface proof on the existing overview or Observe analytics path that consumes the corrected metric
- verification evidence distinguishes corrected token-hit-rate math from unchanged request-hit-rate math
- verification records the rebuilt-runtime startup command, endpoint, and evidence paths used for the Phase 5 proof
- the run does not introduce a new cache-specific dashboard or alternate analytics API

## Out of Scope

- `OOS1`: redefining provider-reported `inputTokens` to mean uncached-only tokens
- `OOS2`: historical telemetry backfill for already-persisted rows
- `OOS3`: UI redesign of Observe or overview chart surfaces
- `OOS4`: provider-specific cache feature work unrelated to this analytics defect
- `OOS5`: changing non-OpenAI-family provider semantics unless Phase 1 finds a direct ownership dependency

## Constraints

- stay consistent with the OpenAI prompt caching contract current on `2026-07-14`
- preserve the existing OpenAI-family normalization boundary established by run `65-codex-subscription-prompt-cache-parity`
- prefer one shared analytics fix over provider-specific special casing
- keep Codex Subscription on `vendorId = chatgpt-codex-responses` and `adapterFamily = codex-subscription-responses`
- use deterministic test fixtures for cross-path proof; live provider traffic is optional and not required to validate this specific math defect
- Phase 3 must use `TDD Mode: strict` rather than `pragmatic`
- Phase 5 final verification must include rebuilt-runtime evidence for the operator-visible analytics outcome; deterministic automated proof alone is not sufficient for closeout

## Coverage Gate

- Requirement coverage check:
  - `R1`: fixes the metric definition
  - `R2`: protects LiteLLM, Codex Subscription, Kimi OAuth, and direct OpenAI-compatible semantics
  - `R3`: protects adjacent metric and support-state behavior
  - `R4`: requires RED/GREEN regression coverage
  - `R5`: requires backend and operator-visible verification
- Out-of-scope confirmation:
  - no historical backfill
  - no UI redesign
  - no upstream token-contract rewrite

Coverage: PASS

## Approval Gate

- Objective readiness checks:
  - the run is narrowly scoped to one validated defect plus its required regression boundaries
  - cross-path correctness expectations are explicit
  - acceptance criteria are observable and testable
  - the requirements do not smuggle in unrelated cache feature work

Approval: PASS
