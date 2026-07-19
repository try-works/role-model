Run: `/.recursive/run/70-cache-hit-token-rate-analytics-fix/`
Phase: `01 AS-IS`
Status: `LOCKED`
LockedAt: `2026-07-14T12:50:54Z`
LockHash: `086facdbac7a15d1433ff4a7c5db446367af227c0ae952e8ce3cd0c660870528`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/00-requirements.md` (LOCKED)
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/00-worktree.md` (LOCKED)
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/00-requirements.md`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/00-requirements.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/packages/provider-openai/src/index.ts`
- `/role-model-router/packages/provider-openai/test/index.test.ts`
- `/role-model-router/packages/provider-litellm/src/index.ts`
- `/role-model-router/apps/runtime-ui/app/lib/telemetry-route-models.ts`
- `/role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.ts`
Outputs:
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/01-as-is.md`
Scope note: Records the current analytics, normalization, and operator-surface baseline for the cache-hit token-rate defect before fix planning begins.

## TODO

- [x] Re-read the locked Phase 0 artifacts and recursive control-plane inputs
- [x] Re-read the current state, decisions, memory, and the most relevant prior telemetry and cache runs
- [x] Reproduce the current cache-hit token-rate behavior from the owning host-bridge regression and code
- [x] Inventory the current provider and bridge normalization contract across direct OpenAI-compatible, Codex Subscription, LiteLLM, and Kimi-shaped paths
- [x] Inventory the current Observe and overview chart ownership seams
- [x] Reconcile the current baseline against `R1` through `R5`
- [x] Audit the artifact for recursive-mode readiness

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `unavailable`
Subagent Capability Probe: the current session exposes shell, editor, and browser tools but no dedicated recursive delegated-subagent execution path was configured for this worktree; `00-worktree.md` also records the router discovery state as `partial` with `codex` unavailable due to Windows execution access denial.
Delegation Decision Basis: Phase 1 is direct worktree inspection against locked run inputs and current code. With no delegated recursive subagent path configured in this session, the audited phase proceeds as local self-audit.
Audit Inputs Provided:
- locked run-70 requirements and worktree artifacts
- recursive control-plane documents and current routing/provider memory
- current host-bridge analytics implementation and owning regression
- current provider-openai, provider-litellm, and bridge cache-normalization seams
- current runtime-ui telemetry metric labels and chart route models

## Effective Inputs Re-read

- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/00-requirements.md`
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/00-worktree.md`
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/00-requirements.md`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/00-requirements.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/packages/provider-openai/src/index.ts`
- `/role-model-router/packages/provider-openai/test/index.test.ts`
- `/role-model-router/packages/provider-litellm/src/index.ts`
- `/role-model-router/apps/runtime-ui/app/lib/telemetry-route-models.ts`
- `/role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.ts`

## Reproduction Steps (Novice-Runnable)

1. Open the worktree at `D:\DEV\role-model\.worktrees\70-cache-hit-token-rate-analytics-fix`.
2. Run the owning host-bridge regression:
   - `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts -t "aggregates generic telemetry analytics from persisted request-time routing and cost facts"`
3. Read `/role-model-router/apps/runtime-host-bridge/test/index.test.ts:19910-19949`.
   - Confirm the supported telemetry row stores `tokens_in: 120` and `cacheReadTokens: 16`.
4. Read `/role-model-router/apps/runtime-host-bridge/src/index.ts:17321-17342`.
   - Confirm `cacheBackedRequestRate` is request-count based, while `cacheHitTokenRate` currently computes its denominator as `record.inputTokens + record.cacheReadTokens`.
5. Read `/role-model-router/apps/runtime-host-bridge/test/index.test.ts:20492-20529`.
   - Confirm the current assertions expect `cacheHitTokenRate: 0.117647`, which equals `16 / (120 + 16)`.
6. Read the current normalization seams:
   - `/role-model-router/packages/provider-openai/src/index.ts:360-383`
   - `/role-model-router/packages/provider-openai/src/index.ts:1047-1052`
   - `/role-model-router/packages/provider-openai/src/index.ts:1152-1156`
   - `/role-model-router/packages/provider-openai/test/index.test.ts:1117-1138`
   - `/role-model-router/packages/provider-openai/test/index.test.ts:1342-1362`
   - `/role-model-router/packages/provider-litellm/src/index.ts:96-120`
7. Confirm those paths treat `inputTokens` or `prompt_tokens` as totals and `cached_tokens` as a separate subset field.
8. Read the chart ownership seams:
   - `/role-model-router/apps/runtime-ui/app/lib/telemetry-route-models.ts:248-255`
   - `/role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.ts:77-80`
   - Confirm the operator surface simply consumes the backend-owned `cacheHitTokenRate` metric.

## Current Behavior by Requirement

| Requirement | Current behavior |
| --- | --- |
| `R1` | The owning analytics formula is wrong today. `/role-model-router/apps/runtime-host-bridge/src/index.ts:17327-17342` divides `sum(cacheReadTokens)` by `sum(inputTokens + cacheReadTokens)`, so cached tokens are counted once in the numerator and twice in the denominator. The seeded regression at `/role-model-router/apps/runtime-host-bridge/test/index.test.ts:20492-20529` encodes the same wrong result as `0.117647` for `120` input tokens and `16` cached tokens. |
| `R2` | The upstream token-normalization contract is already total-plus-subset across the in-scope execution paths. `provider-openai` reads `cached_tokens` from nested OpenAI usage details or top-level Kimi usage, then keeps `inputTokens` as `prompt_tokens` or `input_tokens` totals. The LiteLLM adapter layers cache-read facts onto the shared normalized usage without subtracting them from total input. The bridge-owned Codex usage helpers also preserve the same total-plus-subset shape. |
| `R3` | The adjacent request-level metric is currently correct. `/role-model-router/apps/runtime-host-bridge/src/index.ts:17321-17325` computes `cacheBackedRequestRate` as cached-request count divided by total requests, which is distinct from the broken token-level denominator. Partial-support handling for `cacheHitTokenRate` is also already present and should be preserved. |
| `R4` | No run-70 Phase 3 evidence exists yet, and the current regression floor partly protects the bug rather than the intended behavior. The host-bridge analytics test currently expects the wrong halved rate, while provider-openai and provider-litellm tests already prove the upstream normalization contract that the analytics layer should honor. |
| `R5` | No rebuilt-runtime verification exists yet for this run. The existing operator surfaces already consume `cacheHitTokenRate` through the shared telemetry metric catalog and the "Cache Efficiency Trend" chart, so a backend fix should flow to Overview or Observe without a UI contract change. |

## Source Requirement Inventory

- `R1` | Sources: `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts` | Disposition: `in-scope` | Source Quote: `Repair the backend analytics definition of `cacheHitTokenRate` so it reflects cached prompt tokens as a subset of total input tokens rather than as additional tokens added on top of total input.` | Summary: the current analytics formula and test both still treat cached tokens as additive in the denominator
- `R2` | Sources: `/role-model-router/packages/provider-openai/src/index.ts`, `/role-model-router/packages/provider-openai/test/index.test.ts`, `/role-model-router/packages/provider-litellm/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/src/index.ts` | Disposition: `in-scope` | Source Quote: `The analytics fix must work correctly for all in-scope execution paths that currently feed the metric, including LiteLLM, Codex Subscription, Kimi OAuth, and direct OpenAI-compatible execution.` | Summary: the current normalization seams already share one total-input plus cached-subset contract across those paths
- `R3` | Sources: `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/apps/runtime-ui/app/lib/telemetry-route-models.ts`, `/role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.ts` | Disposition: `in-scope` | Source Quote: `This bugfix must not alter neighboring cache metrics or blur the line between supported-zero and unsupported cache surfaces.` | Summary: the request-level metric and partial-support semantics already exist separately and must remain untouched
- `R4` | Sources: `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`, `/role-model-router/packages/provider-openai/test/index.test.ts`, `/role-model-router/packages/provider-litellm/src/index.ts` | Disposition: `in-scope` | Source Quote: `The run must use strict TDD in Phase 3 and add focused regression coverage that proves the analytics fix and guards all affected execution paths.` | Summary: the current test floor proves upstream normalization but still encodes the broken analytics expectation
- `R5` | Sources: `/role-model-router/apps/runtime-ui/app/lib/telemetry-route-models.ts`, `/role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.ts`, `/.recursive/run/70-cache-hit-token-rate-analytics-fix/00-worktree.md` | Disposition: `in-scope` | Source Quote: `Phase 5 verification must prove on the rebuilt runtime that the repaired backend metric flows through the existing analytics surfaces that consume it.` | Summary: the rebuilt-runtime obligation is open, but the owning analytics surfaces are already known and do not require a new dashboard

## Relevant Code Pointers

### Analytics metric ownership

- `/role-model-router/apps/runtime-host-bridge/src/index.ts:17321-17325`
  - `cacheBackedRequestRate` is request-count based and currently looks correct.
- `/role-model-router/apps/runtime-host-bridge/src/index.ts:17327-17342`
  - `cacheHitTokenRate` currently adds `record.cacheReadTokens` on top of `record.inputTokens` in the denominator.
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts:20492-20529`
  - the owning regression currently expects the wrong `0.117647` value for the seeded supported row.

### Provider and bridge normalization contract

- `/role-model-router/packages/provider-openai/src/index.ts:360-383`
  - `readOpenAICacheFacts(...)` treats `cached_tokens` as a separately read detail field.
- `/role-model-router/packages/provider-openai/src/index.ts:1047-1052`
  - chat-completions normalization keeps `inputTokens` as `prompt_tokens` total and stores cached tokens separately.
- `/role-model-router/packages/provider-openai/src/index.ts:1152-1156`
  - Responses normalization keeps `inputTokens` as `input_tokens` total and stores cached tokens separately.
- `/role-model-router/packages/provider-openai/test/index.test.ts:1117-1138`
  - Kimi-shaped nested `prompt_tokens_details.cached_tokens` test expects `inputTokens: 1200` and `cacheReadTokens: 875`.
- `/role-model-router/packages/provider-openai/test/index.test.ts:1342-1362`
  - Kimi-shaped top-level `usage.cached_tokens` test expects the same total-plus-subset contract.
- `/role-model-router/packages/provider-litellm/src/index.ts:96-120`
  - LiteLLM normalizes cached tokens into separate prompt-cache and usage fields on top of the shared OpenAI-family response normalization.
- `/role-model-router/apps/runtime-host-bridge/src/index.ts:10031-10102`
  - bridge-owned Codex usage helpers preserve total input plus cache-detail subfields when synthesizing downstream OpenAI-compatible usage.

### Operator surface ownership

- `/role-model-router/apps/runtime-ui/app/lib/telemetry-route-models.ts:248-255`
  - the "Cache Efficiency Trend" chart requests `cacheHitTokens` and `cacheHitTokenRate`.
- `/role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.ts:77-80`
  - the frontend metric catalog labels `cacheBackedRequestRate` and `cacheHitTokenRate` but does not redefine their math.

## Known Unknowns

- Whether any non-OpenAI-family provider currently contributes `cacheHitTokenRate` rows through a different total-token contract. The locked requirements scope this run to the OpenAI-family paths unless Phase 3 uncovers a direct shared ownership dependency.
- Whether rebuilt-runtime Phase 5 proof will need freshly seeded cacheable requests or can rely on already-persisted telemetry rows in the QA runtime state. That affects verification setup only, not the backend bug classification.
- Whether old persisted rows generated before the fix could confuse manual QA if a verification slice is too broad. Historical backfill is out of scope, so Phase 5 will likely need a fresh bounded query window.

## Evidence

- The seeded host-bridge analytics fixture stores `tokens_in: 120` and `cacheReadTokens: 16`, but the current assertion expects `16 / 136 = 0.117647` rather than `16 / 120 = 0.133333`.
- The current implementation line `/role-model-router/apps/runtime-host-bridge/src/index.ts:17337` explicitly adds `record.cacheReadTokens` to `record.inputTokens` inside the denominator.
- Provider-openai and bridge-owned Codex usage helpers consistently preserve total input plus cached-token detail fields instead of pre-subtracting cached tokens from totals.
- The runtime UI chart model and metric-label catalog simply consume the backend-owned metric, so the defect is analytical rather than presentational.

## Traceability

- `R1`: current broken denominator and wrong seeded expectation recorded
- `R2`: cross-path total-plus-subset normalization baseline recorded
- `R3`: adjacent request-level metric and partial-support semantics baseline recorded
- `R4`: current regression-floor gap and strict-TDD obligation recorded
- `R5`: rebuilt-runtime verification gap and existing operator-surface ownership recorded

## Gaps Found

None beyond the in-scope cache-hit token-rate defect and regression or verification gaps already captured in the locked requirements.

## Repair Work Performed

None. This is a Phase 1 current-state artifact only.

## Audit Verdict

Audit: PASS

The current analytics baseline, upstream normalization contract, owning regression seam, and operator-surface ownership are concrete enough to drive root-cause analysis without speculative implementation.

## Earlier Phase Reconciliation

- `00-requirements.md` scoped run 70 to one backend-owned analytics defect plus cross-path regression boundaries. This artifact confirms the defect is present in the current worktree and that the shared OpenAI-family normalization contract already supports the planned narrow fix.
- `00-worktree.md` fixed the diff basis at `git diff --name-only 5a9de7102feff929893a5e496d109143c2fca212`. This artifact reuses that basis unchanged.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/00-requirements.md`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/00-requirements.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`

## Subagent Contribution Verification

- Reviewed Action Records: none
- Main-Agent Verification Performed: direct inspection of `/.recursive/run/70-cache-hit-token-rate-analytics-fix/00-requirements.md`, `/.recursive/run/70-cache-hit-token-rate-analytics-fix/00-worktree.md`, `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`, `/role-model-router/packages/provider-openai/src/index.ts`, `/role-model-router/packages/provider-openai/test/index.test.ts`, `/role-model-router/packages/provider-litellm/src/index.ts`, `/role-model-router/apps/runtime-ui/app/lib/telemetry-route-models.ts`, and `/role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.ts`
- Acceptance Decision: `not applicable`
- Refresh Handling: no delegated artifacts to refresh
- Repair Performed After Verification: none

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `5a9de7102feff929893a5e496d109143c2fca212`
- Comparison reference: `working-tree`
- Normalized baseline: `5a9de7102feff929893a5e496d109143c2fca212`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 5a9de7102feff929893a5e496d109143c2fca212`
- Diff basis used: `git diff --name-only 5a9de7102feff929893a5e496d109143c2fca212`
- Supplemental scope command: `git status --short --untracked-files=all`
- Base branch: `main`
- Worktree branch: `recursive/70-cache-hit-token-rate-analytics-fix`
- Active worktree path: `D:\DEV\role-model\.worktrees\70-cache-hit-token-rate-analytics-fix\`
- Planned or claimed changed files:
  - `/.recursive/run/70-cache-hit-token-rate-analytics-fix/01-as-is.md`
- Unexplained drift:
  - none

## Requirement Completion Status

- `R1` | Status: `deferred` | Rationale: Phase 1 confirms the current broken denominator and incorrect seeded regression expectation, but implementation is still pending | Deferred By: `/.recursive/run/70-cache-hit-token-rate-analytics-fix/00-requirements.md`
- `R2` | Status: `deferred` | Rationale: Phase 1 confirms the shared total-plus-subset normalization baseline across LiteLLM, Codex Subscription, Kimi OAuth, and direct OpenAI-compatible execution, but no production fix has landed yet | Deferred By: `/.recursive/run/70-cache-hit-token-rate-analytics-fix/00-requirements.md`
- `R3` | Status: `deferred` | Rationale: adjacent request-level metric and support-state behavior are inventoried but not yet re-verified after code changes | Deferred By: `/.recursive/run/70-cache-hit-token-rate-analytics-fix/00-requirements.md`
- `R4` | Status: `deferred` | Rationale: strict TDD and corrected regression coverage are Phase 3 obligations | Deferred By: `/.recursive/run/70-cache-hit-token-rate-analytics-fix/00-requirements.md`
- `R5` | Status: `deferred` | Rationale: rebuilt-runtime backend and operator-surface proof is a later-phase verification obligation | Deferred By: `/.recursive/run/70-cache-hit-token-rate-analytics-fix/00-requirements.md`

## Coverage Gate

- [x] Locked Phase 0 inputs and recursive control-plane documents were re-read
- [x] The owning analytics implementation, test, provider-normalization seams, and UI ownership seams were inventoried
- [x] The current baseline was mapped directly back to `R1` through `R5`

Coverage: PASS

## Approval Gate

- [x] The current-state baseline is concrete enough for root-cause analysis
- [x] The defect is isolated to the backend analytics contract rather than the UI renderer
- [x] No unresolved ambiguity blocks Phase 1.5

Approval: PASS
