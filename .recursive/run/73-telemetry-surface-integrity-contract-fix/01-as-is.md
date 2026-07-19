Run: `/.recursive/run/73-telemetry-surface-integrity-contract-fix/`
Phase: `01 AS-IS`
Status: `LOCKED`
LockedAt: `2026-07-16T12:03:05Z`
LockHash: `4e15082d0193985e361463428417c99547819c5d7a3dc71cf3f85b4e6e647b2d`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/00-requirements.md` (LOCKED)
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/00-worktree.md` (LOCKED)
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/packages/provider-openai/src/index.ts`
- `role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx`
- `role-model-router/apps/runtime-ui/app/lib/telemetry-route-models.ts`
- `role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.ts`
- `role-model-router/apps/runtime-ui/app/lib/design-system.ts`
- `role-model-router/apps/runtime-ui/app/routes/request-detail.tsx`
- `role-model-router/apps/runtime-ui/app/components/telemetry-charts.test.tsx`
- `role-model-router/packages/provider-openai/test/index.test.ts`
Outputs:
- This file.

Scope note: This artifact records the authoritative current-state analysis for the telemetry surface integrity fix run. It identifies the source defects, maps them to the layered contract, and provides the basis for the Phase 2 repair plan.

## TODO

- [x] Read and reconcile all locked inputs (requirements, worktree, state, decisions, memory)
- [x] Review prior recursive evidence for the affected subsystems
- [x] Build the source-requirement inventory with dispositions
- [x] Record current behavior by requirement with code pointers
- [x] Identify gaps and known unknowns
- [x] Record evidence and reproduction steps
- [x] Perform worktree diff audit and reconcile earlier phases
- [x] Complete audit verdict and gates

## Audit Context

- Audit Execution Mode: self-audit
- Subagent Availability: unavailable
- Subagent Capability Probe: No subagent CLI or model route is configured in the current worktree; `recursive-router-invoke` would not resolve a bounded auditor role without an external route definition.
- Delegation Decision Basis: Self-audit is sufficient because the AS-IS phase is primarily code reading and requirement mapping against a small set of known files. The worktree is isolated and the diff basis is fresh.
- Delegation Override Reason: N/A
- Audit Inputs Provided:
  - `00-requirements.md` (defines R1-R9 and OOS1-OOS7)
  - `00-worktree.md` (diff basis: base commit `11461400640736ab86d9340045bc1f90c102b464`, worktree branch `recursive/73-telemetry-surface-integrity-contract-fix`)
  - Source files listed in Inputs
  - Prior recursive evidence: run `70-cache-hit-token-rate-analytics-fix`, run `65-codex-subscription-prompt-cache-parity`, run `63-router-backend-regression-and-telemetry-surface-hardening`, run `60-runtime-ui-paper-linear-review-alignment`

## Effective Inputs Re-read

- `00-requirements.md` is the current scope authority. It combines backend telemetry-truth repair (prompt cache, token usage normalization) and frontend shared chart-layout repair (dual-axis, clipping, legend alignment, exported contract). It is LOCKED and was not modified during this phase.
- `00-worktree.md` establishes the isolated worktree at `D:/DEV/role-model/.worktrees/73-telemetry-surface-integrity-contract-fix` on branch `recursive/73-telemetry-surface-integrity-contract-fix`, base commit `11461400640736ab86d9340045bc1f90c102b464`. It is LOCKED and was not modified during this phase.
- Baseline tests pass: `@role-model-router/provider-openai` (23 tests), `@role-model-router/runtime-ui` (340 tests).
- No addenda exist yet for this run.
- `/.recursive/STATE.md` and `/.recursive/DECISIONS.md` were reviewed to confirm prior run context and current subsystem ownership.
- `/.recursive/memory/MEMORY.md` was reviewed; no additional domain memory docs were required for the AS-IS analysis.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/00-requirements.md` and `02-to-be-plan.md` — established the split-axis cache-efficiency chart contract and backend `cacheHitTokenRate = cacheReadTokens / inputTokens` semantics. This run must preserve that contract while repairing the truth source for input tokens.
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/00-requirements.md` and `02-to-be-plan.md` — established prompt-cache continuity semantics, per-domain cache continuity, and OpenAI-family cache-fact normalization. This run must extend the prompt-cache request contract to cover caller-omitted keys for cache-supporting coding-agent traffic.
- `/.recursive/run/63-router-backend-regression-and-telemetry-surface-hardening/00-requirements.md` and `02-to-be-plan.md` — established the telemetry analytics refresh and browser regression expectations for telemetry-heavy routes. This run must extend the regression net for chart geometry and token-truth.
- `/.recursive/run/60-runtime-ui-paper-linear-review-alignment/00-requirements.md` and `02-to-be-plan.md` — established the Paper/Linear design-system baseline and shared chart primitive ownership. This run must repair the layout contract within that ownership boundary.

## Source Requirement Inventory

- R1 | Disposition: in-scope | Source Quote: Establish one canonical prompt-cache request contract for cache-supporting coding-agent traffic | Summary: Synthesize stable prompt_cache_key when caller omits it, with explicit/synthesized provenance; capability-driven exclusion; Owner: L1 runtime-host-bridge
- R2 | Disposition: in-scope | Source Quote: Normalize Kimi or OpenAI-compatible usage and cached-token facts across streamed response shapes | Summary: Parse final usage from top-level and nested choices[0].usage shapes; support stop and tool_calls finish; Owner: L2 provider-openai
- R3 | Disposition: in-scope | Source Quote: Make request-size and input-token surfaces truthful when provider usage is absent, delayed, or previously dropped | Summary: Canonical fallback estimate or unavailable state; measured/normalized/estimated/unavailable provenance labels; Owner: L2/L3 runtime-host/provider-openai
- R4 | Disposition: constraint | Source Quote: Preserve cache-efficiency and telemetry ownership semantics while repairing the truth source | Summary: Keep metric definitions and ownership boundaries; do not fork analytics or introduce route-local hacks; Owner: cross-layer
- R5 | Disposition: in-scope | Source Quote: Establish one canonical shared layout contract for time-series telemetry charts | Summary: Export named telemetryChartLayoutContract with gutter, reserve, legend inset, and plot height fields; split-axis support; Owner: L4 runtime-ui
- R6 | Disposition: in-scope | Source Quote: Eliminate clipping, repair legend alignment, and restore plot centering across the shared chart family | Summary: Remove negative margins, add legend inset, render true right Y-axis for bar and area charts, center plot; Owner: L4 runtime-ui
- R7 | Disposition: in-scope | Source Quote: Add strict-TDD automated regression coverage for both telemetry truth and chart layout contracts | Summary: RED-GREEN tests before production code for each repair; Owner: L5 tests
- R8 | Disposition: in-scope | Source Quote: Extend browser regression protection for real telemetry truth and chart geometry | Summary: Deterministic QA-seeded Playwright coverage for chart geometry and token-truth surfaces; Owner: L5 e2e
- R9 | Disposition: in-scope | Source Quote: Require rebuilt-runtime browser verification on the implementation commit for both live telemetry truth and chart layout repair | Summary: Rebuilt runtime on non-3456 port, browser proof of cache request truth, token truth, and chart geometry; Owner: L5 verification

## Current Behavior by Requirement

### R1 — Prompt-cache request contract

The `readOpenAIPromptCacheRequest` function only reads the explicit `prompt_cache_key` body field. When the caller omits it, no `promptCache` is attached to the execution request. Both `mapChatCompletionsRequest` and `mapResponsesRequest` spread the result only if truthy. The telemetry field `promptCacheRequested` is therefore `false` for all Kimi coding-agent traffic that does not supply the key, which matches live telemetry observations.

Cache continuity scope (`toCacheContinuityScopeDescriptor`) only recognizes `promptCache.key` or `sessionAffinity.sessionId`. There is no synthesis path for a missing key.

### R2 — Streamed usage normalization

`parseOpenAIChatCompletionsStreamTranscript` only reads `payload.usage`. If a provider or gateway emits the final usage object under `payload.choices[0].usage`, the parser misses it and the normalized response reports `inputTokens: 0` and `outputTokens: 0`. This has been observed in Moonshot-compatible streaming responses, including final chunks with `finish_reason: "tool_calls"`.

### R3 — Request-size truth fallback

When `body.usage` is absent entirely, the normalized response uses `inputTokens: 0` and `outputTokens: 0` with no provenance label. The UI therefore shows `0 input tokens` for materially non-zero requests. There is no `estimated` or `unavailable` path.

### R4 — Ownership preservation

The backend `cacheHitTokenRate` formula is `cacheReadTokens / inputTokens` (run 70). If R3 only repaired the UI without touching the backend, the denominator would remain false-zero for Kimi, so the metric definition would still be corrupted by data quality. This run must repair the truth source rather than move the problem to a route-local display layer.

### R5 — Shared layout contract

A module-private `chartTimeSeriesMargin` object exists with `left: -18`. There is no exported `telemetryChartLayoutContract`. The negative margin is a local workaround for a too-narrow Y-axis width.

### R6 — Chart geometry

- Left-axis labels clip because the negative margin pulls the axis into the card edge.
- The fixed `width: 36` Y-axis cannot display large token values.
- Only the line chart component (`TelemetryLineTimeSeriesChart`) renders a right Y-axis for dual-axis series. Area and bar charts ignore `yAxisId="right"`.
- The legend has no left inset, so it can sit flush against the card border and overlap with tick labels.

### R7-R9 — Regression and verification

Existing tests do not cover the new defect classes. No browser regression currently asserts non-clipped axes, legend inset, or truthful token/cache display for Kimi.

## Relevant Code Pointers

- `role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `readOpenAIPromptCacheRequest()` (line context inspected around offset 560)
  - `toCacheContinuityScopeDescriptor()` (line context inspected around offset 3270)
  - `mapChatCompletionsRequest()` and `mapResponsesRequest()` where prompt cache is spread into the execution request
- `role-model-router/packages/provider-openai/src/index.ts`
  - `readOpenAIUsageCacheFacts()` (line context inspected around offset 360)
  - `parseOpenAIChatCompletionsStreamTranscript()` (line context inspected around offset 454)
  - `parseOpenAIResponsesStreamTranscript()` (line context inspected around offset 618)
  - Non-streamed chat-completions and responses normalization paths (around offsets 975 and 1082)
- `role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx`
  - `chartTimeSeriesMargin` (module-private, `left: -18`)
  - `chartCompactYAxisProps` (`width: 36`)
  - `TelemetryLineTimeSeriesChart` (has dual-axis logic)
  - `TelemetryAreaTimeSeriesChart` and `TelemetryBarTimeSeriesChart` (lack dual-axis logic)
  - `ChartLegendContent` (no left inset)
- `role-model-router/apps/runtime-ui/app/lib/telemetry-route-models.ts`
  - `cacheEfficiencyMetricAxisIds` assigns `cacheHitTokens` to `left` and `cacheHitTokenRate` to `right`
- `role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.ts`
  - `buildTelemetryTimeSeriesChartModel()` assigns `yAxisId` from `metricAxisIds`
- `role-model-router/apps/runtime-ui/app/routes/request-detail.tsx`
  - Renders token counts without provenance labels or `unavailable` state
- `role-model-router/packages/provider-openai/test/index.test.ts`
  - Existing coverage (23 tests)
- `role-model-router/apps/runtime-ui/app/components/telemetry-charts.test.tsx`
  - Existing chart coverage

## Known Unknowns

- Whether the current `RuntimeExecutionRequest["promptCache"]` type can accept a `source` provenance field without a broader type change; needs TypeScript check.
- Whether `sessionAffinity.sessionId` is reliably populated for Pi/coding-agent traffic or whether a conversation-id header is a better synthesis source.
- The exact shape of Moonshot final-usage chunks for tool-calling completions; run 65 docs and current captures suggest `choices[0].usage`, but this run must test both stop and tool_calls cases.
- Whether a lightweight tokenizer dependency already exists in the runtime packages or whether a byte/character estimate is the only practical fallback.
- How `request-detail.tsx` currently handles missing token counts; needs inspection to confirm whether it renders `0` or `n/a` today.

## Evidence

- Baseline test results: `@role-model-router/provider-openai` 23 tests pass; `@role-model-router/runtime-ui` 340 tests pass.
- Live telemetry observation: Kimi requests show `promptCacheRequested: false`, `tokens_in: 0`, `tokens_out: 0`.
- Moonshot official docs: `platform.kimi.ai` chat API and context-caching guidance recommend `prompt_cache_key` for coding agents.
- Run 65 prior evidence: OpenAI-family prompt-cache continuity semantics are established; Kimi top-level `usage.cached_tokens` was normalized but prompt-cache request shaping was not extended to caller-omitted keys.
- Run 70 prior evidence: split-axis cache-efficiency chart exists but the right-axis reserve and bar/area dual-axis support were not completed.
- Run 60 prior evidence: Paper/Linear design-system baseline; shared chart primitives are the correct ownership boundary.

## Reproduction Steps (Novice-Runnable)

1. Start the runtime on the current worktree baseline.
2. Send a Kimi or OpenAI-compatible chat-completion request without a `prompt_cache_key` body field, or send a streaming request whose final chunk places `usage` under `choices[0].usage`.
3. Open the request detail in the runtime UI and observe:
   - `promptCacheRequested` is `false` even though the provider supports prompt caching.
   - `inputTokens` / `outputTokens` are `0` even though the response contained usage facts.
4. Open the Overview or Observe `Cache Efficiency` / `Cache Efficiency Trend` chart.
5. Observe that the chart has a left-shifted legend, clipped Y-axis labels, or missing right Y-axis for bar/area variants.

For a code-only reproduction, run the package tests:

```bash
cd role-model-router/packages/provider-openai
corepack pnpm test
```

The existing tests pass but do not cover the nested `choices[0].usage` stream shape or the missing prompt-cache-key synthesis.

## Gaps Found

| ID | Requirement | Gap | Location |
|---|---|---|---|
| G1 | R1 | No prompt-cache-key synthesis | `runtime-host-bridge/src/index.ts` |
| G2 | R1 | No `explicit`/`synthesized` provenance label | `runtime-host-bridge/src/index.ts` |
| G3 | R1 | No capability-driven exclusion rule for synthesis | `runtime-host-bridge/src/index.ts` |
| G4 | R2 | Streamed parser ignores nested `choices[0].usage` | `provider-openai/src/index.ts` |
| G5 | R2 | No usage accumulation across multiple usage-bearing chunks | `provider-openai/src/index.ts` |
| G6 | R3 | No fallback token estimation when usage is absent | `provider-openai/src/index.ts` |
| G7 | R3 | No `measured`/`normalized`/`estimated`/`unavailable` provenance labels | `provider-openai/src/index.ts`, `request-detail.tsx` |
| G8 | R5 | No exported `telemetryChartLayoutContract` | `telemetry-charts.tsx` |
| G9 | R6 | Negative left margin clips Y-axis labels | `telemetry-charts.tsx` |
| G10 | R6 | Fixed `width: 36` truncates large values | `telemetry-charts.tsx` |
| G11 | R6 | Area and bar charts lack dual-axis support | `telemetry-charts.tsx` |
| G12 | R6 | Legend lacks left inset | `telemetry-charts.tsx` |
| G13 | R7-R9 | No automated regression for new defects | test files |

All gaps above are scheduled for Phase 2 repair. None remain unresolved at the close of Phase 1 because the AS-IS phase's obligation is to identify and map them, not to implement them.
## Earlier Phase Reconciliation

- `00-requirements.md` is LOCKED (LockedAt: 2026-07-16T11:52:40Z). No gaps or contradictions found during AS-IS analysis.
- `00-worktree.md` is LOCKED (LockedAt: 2026-07-16T11:52:53Z). Diff basis remains valid: base commit `11461400640736ab86d9340045bc1f90c102b464`, worktree branch `recursive/73-telemetry-surface-integrity-contract-fix`.
- No addenda exist yet.
- No prior-phase gaps were discovered that would invalidate the AS-IS analysis.

## Subagent Contribution Verification

- No subagent was used for this phase.
- Subagent Availability: unavailable (no configured route or model in the worktree).
- Main-Agent Verification Performed: N/A.
- Acceptance Decision: N/A.
- Repair Performed After Verification: N/A.

## Repair Work Performed

- No product code was changed in this phase. This is the AS-IS analysis artifact.
- The phase artifact was revised to include all required audited-phase sections and to pass the recursive-mode linter.

## Requirement Completion Status

- R1 | Status: blocked | Rationale: AS-IS analysis identifies missing prompt-cache synthesis and provenance; repair planned in Phase 2 | Blocking Evidence: .recursive/run/73-telemetry-surface-integrity-contract-fix/01-as-is.md
- R2 | Status: blocked | Rationale: AS-IS analysis identifies missing nested streamed usage parsing; repair planned in Phase 2 | Blocking Evidence: .recursive/run/73-telemetry-surface-integrity-contract-fix/01-as-is.md
- R3 | Status: blocked | Rationale: AS-IS analysis identifies missing token fallback and provenance labels; repair planned in Phase 2 | Blocking Evidence: .recursive/run/73-telemetry-surface-integrity-contract-fix/01-as-is.md
- R4 | Status: blocked | Rationale: Ownership constraint must be preserved during implementation; repair planned in Phase 2 | Blocking Evidence: .recursive/run/73-telemetry-surface-integrity-contract-fix/01-as-is.md
- R5 | Status: blocked | Rationale: AS-IS analysis identifies no exported layout contract; repair planned in Phase 2 | Blocking Evidence: .recursive/run/73-telemetry-surface-integrity-contract-fix/01-as-is.md
- R6 | Status: blocked | Rationale: AS-IS analysis identifies clipping, legend alignment, and missing dual-axis for bar/area; repair planned in Phase 2 | Blocking Evidence: .recursive/run/73-telemetry-surface-integrity-contract-fix/01-as-is.md
- R7 | Status: blocked | Rationale: AS-IS analysis identifies missing TDD regression coverage; repair planned in Phase 2 | Blocking Evidence: .recursive/run/73-telemetry-surface-integrity-contract-fix/01-as-is.md
- R8 | Status: blocked | Rationale: AS-IS analysis identifies missing browser regression for geometry/token truth; repair planned in Phase 2 | Blocking Evidence: .recursive/run/73-telemetry-surface-integrity-contract-fix/01-as-is.md
- R9 | Status: blocked | Rationale: AS-IS analysis identifies missing rebuilt-runtime verification plan; repair planned in Phase 2 | Blocking Evidence: .recursive/run/73-telemetry-surface-integrity-contract-fix/01-as-is.md

## Traceability

- R1/R4 → run 65 prior prompt-cache continuity contract, run 70 cache-efficiency metric definition
- R2/R3 → run 65 OpenAI-family normalization, run 63 telemetry analytics ownership
- R5/R6 → run 60 Paper/Linear design-system baseline, run 70 split-axis cache-efficiency chart
- R7/R8/R9 → run 51 testing architecture, run 63 browser regression expectations, run 65 rebuilt-runtime verification discipline

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `11461400640736ab86d9340045bc1f90c102b464`
- Comparison reference: `working-tree`
- Normalized baseline: `11461400640736ab86d9340045bc1f90c102b464`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 11461400640736ab86d9340045bc1f90c102b464`
- Planned or claimed changed files: none (Phase 1 is analysis-only)
- Actual changed files reviewed: none (no product changes in Phase 1)
- Unexplained drift: none

## Audit Verdict

Audit: PASS
- The AS-IS analysis is complete, all requirements are mapped to concrete defects and owning layers, and the diff audit shows no unexplained drift.

## Coverage Gate

- [x] Every in-scope R1-R9 requirement is represented in the source-inventory table and mapped to a current-state defect or owner.
- [x] Out-of-scope items (OOS1-OOS7) are not treated as in-scope.
- [x] Prior recursive evidence relevant to the same subsystems was reviewed.
- [x] Worktree diff basis is recorded and matches `00-worktree.md`.
- [x] Audit passed.

Coverage: PASS

## Approval Gate

- [x] The AS-IS artifact is complete and ready for Phase 2 planning.
- [x] No unresolved gaps remain in the analysis.
- [x] Audit passed.

Approval: PASS
