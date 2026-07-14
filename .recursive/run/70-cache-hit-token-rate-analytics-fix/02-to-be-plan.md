Run: `/.recursive/run/70-cache-hit-token-rate-analytics-fix/`
Phase: `02 TO-BE Plan`
Status: `LOCKED`
LockedAt: `2026-07-14T13:45:08Z`
LockHash: `78472b22fb66068b8ac3ccaf118d00e876ac9a8e00bb783d4c176405ca747f88`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/00-requirements.md` (LOCKED)
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/00-worktree.md` (LOCKED)
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/01-as-is.md` (LOCKED)
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/01.5-root-cause.md` (LOCKED)
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/addenda/02-to-be-plan.upstream-gap.00-requirements.addendum-01.md` (DRAFT)
Outputs:
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/02-to-be-plan.md`
Scope note: Defines the narrow implementation plan for repairing the backend cache-hit token-rate denominator and adding dual-axis presentation to the existing mixed-unit cache-efficiency charts, while preserving the OpenAI-family normalization contract, adjacent request-rate semantics, and current Overview and Observe route ownership.

## TODO

- [x] Map `R1` through `R5` to concrete implementation, verification, and QA surfaces
- [x] Keep the planned backend and shared-chart changes as narrow as the locked root cause plus approved addendum allow
- [x] Define strict RED-first test slices before any production edits
- [x] Define the rebuilt-runtime verification path against the existing Overview and Observe analytics surfaces
- [x] Audit the plan against the locked requirements, AS-IS baseline, root-cause findings, and current-phase addendum

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `unavailable`
Subagent Capability Probe: the current session still exposes no dedicated recursive delegated-subagent execution path for this worktree, and the worktree-local recursive router discovery remains only partially available.
Delegation Decision Basis: the defect, planned file scope, and verification surfaces are directly inspectable from locked run artifacts plus current code, so Phase 2 planning proceeds as a local audited artifact.
Audit Inputs Provided:
- locked requirements, worktree, AS-IS, and root-cause artifacts plus the current-phase upstream-gap addendum
- current host-bridge analytics implementation and owning regression
- current provider-openai, provider-litellm, bridge-owned Codex usage helpers, and the shared runtime-ui route-definition, chart-model, and chart-renderer surfaces consumed by Overview and Observe

## Effective Inputs Re-read

- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/00-requirements.md`
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/00-worktree.md`
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/01-as-is.md`
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/01.5-root-cause.md`
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/addenda/02-to-be-plan.upstream-gap.00-requirements.addendum-01.md`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `/role-model-router/packages/provider-openai/src/index.ts`
- `/role-model-router/packages/provider-openai/test/index.test.ts`
- `/role-model-router/packages/provider-litellm/src/index.ts`
- `/role-model-router/apps/runtime-ui/app/lib/telemetry-route-models.ts`
- `/role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.ts`
- `/role-model-router/apps/runtime-ui/app/lib/telemetry-route-models.test.ts`
- `/role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.test.ts`
- `/role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx`
- `/role-model-router/apps/runtime-ui/app/components/telemetry-charts.test.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/requests.tsx`
- `/role-model-router/apps/runtime-ui/package.json`
- `/role-model-router/apps/runtime-ui/vite.config.ts`

## Planned Changes by File

### `/role-model-router/apps/runtime-host-bridge/src/index.ts`

- Change the `cacheHitTokenRate` denominator from `sum(inputTokens + cacheReadTokens)` to `sum(inputTokens)` over `cacheReadTokensSupported` rows only.
- Preserve the current `null` behavior for zero denominators and fully unsupported slices.
- Leave `cacheBackedRequestRate` unchanged.
- Avoid widening the fix into provider-specific analytics branches unless the RED phase disproves the locked root-cause findings.

### `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`

- Turn the current analytics regression RED by changing the seeded supported-row expectation from `0.117647` to `0.133333`.
- Keep the existing mixed supported and unsupported slice proof so partial-support semantics remain covered.
- Add one deterministic non-regression assertion proving `cacheBackedRequestRate` did not change while `cacheHitTokenRate` did.
- If the narrow denominator edit forces helper-level test extraction for readability, keep that refactor inside the same owning file unless a later addendum approves wider movement.

### `/role-model-router/apps/runtime-ui/app/lib/telemetry-route-models.ts`

- Add narrow axis metadata only for the existing mixed-unit cache-efficiency charts on Overview and Observe.
- Keep chart titles, descriptions, metric keys, and analytics queries stable so the route surfaces remain the same cards with more truthful presentation.

### `/role-model-router/apps/runtime-ui/app/lib/telemetry-route-models.test.ts`

- Add RED assertions proving the Overview `Cache Efficiency` and Observe `Cache Efficiency Trend` definitions opt into dual-axis behavior while neighboring same-unit charts remain unchanged.

### `/role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.ts`

- Extend the shared time-series model so mixed-unit metric series can carry optional axis ownership without perturbing the existing breakdown, color, or state semantics.
- Keep the single-axis default for charts that do not request extra axis metadata.

### `/role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.test.ts`

- Add RED coverage proving `cacheHitTokens` and `cacheHitTokenRate` resolve onto separate axes for the cache-efficiency charts while homogeneous charts stay on the default axis.

### `/role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx`

- Render dual Y axes when a line-chart model spans both left and right axes.
- Preserve existing single-axis behavior, legends, titles, and partial/unsupported chart-state handling for all other charts.
- Do not widen the change to area or bar charts unless RED evidence proves the shared abstraction must be broader.

### `/role-model-router/apps/runtime-ui/app/components/telemetry-charts.test.tsx`

- Add RED coverage using a mocked `recharts` seam so the node-based chart tests can inspect Y-axis count and line-to-axis assignment even though raw SSR markup only exposes the `ResponsiveContainer` shell.

### Verification-only surfaces with no Phase 2 route-local product edit planned

#### `/role-model-router/packages/provider-openai/src/index.ts`

- No product edit is planned.
- Treat the existing total-plus-subset cache-normalization contract as a regression boundary that must stay green for nested OpenAI cache detail fields and top-level Kimi `usage.cached_tokens`.

#### `/role-model-router/packages/provider-openai/test/index.test.ts`

- No test edit is planned unless the RED or GREEN phase proves the existing regression floor is insufficient.
- Reuse this suite as the direct regression control for nested OpenAI-compatible and Kimi-shaped usage normalization.

#### `/role-model-router/packages/provider-litellm/src/index.ts`

- No product edit is planned.
- Treat the existing LiteLLM cache-read normalization path as a regression boundary rather than a planned implementation surface.

#### `/role-model-router/apps/runtime-ui/app/lib/telemetry-route-models.ts`, `/role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`, `/role-model-router/apps/runtime-ui/app/routes/requests.tsx`

- No route-local page edit is planned in `dashboard.tsx` or `requests.tsx`.
- Reuse the existing Overview and Observe Requests analytics surfaces as rebuilt-runtime proof targets for Phase 5 after the shared chart stack is repaired.

## Requirement Mapping

- `R1` | Coverage: `direct` | Source Quote: `Repair the backend analytics definition of `cacheHitTokenRate` so it reflects cached prompt tokens as a subset of total input tokens rather than as additional tokens added on top of total input.` | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: `/role-model-router/apps/runtime-host-bridge/test/index.test.ts` | QA Surface: `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/apps/runtime-ui/app/routes/requests.tsx`, `/.recursive/run/70-cache-hit-token-rate-analytics-fix/05-manual-qa.md`
- `R2` | Coverage: `indirect` | Source Quote: `The analytics fix must work correctly for all in-scope execution paths that currently feed the metric, including LiteLLM, Codex Subscription, Kimi OAuth, and direct OpenAI-compatible execution.` | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: `/role-model-router/packages/provider-openai/test/index.test.ts`, `/role-model-router/packages/provider-litellm/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts` | QA Surface: `/.recursive/run/70-cache-hit-token-rate-analytics-fix/04-test-summary.md`, `/.recursive/run/70-cache-hit-token-rate-analytics-fix/05-manual-qa.md` | Rationale: the locked Phase 1 and 1.5 findings show the upstream normalization contract is already correct, so this requirement is satisfied by keeping the production edit constrained to analytics and by rerunning the existing cross-path regression controls
- `R3` | Coverage: `direct` | Source Quote: `This bugfix must not alter neighboring cache metrics or blur the line between supported-zero and unsupported cache surfaces.` | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`, `/role-model-router/apps/runtime-ui/app/lib/telemetry-route-models.ts`, `/role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.ts`, `/role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx` | Verification Surface: `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`, `/role-model-router/apps/runtime-ui/app/lib/telemetry-route-models.test.ts`, `/role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.test.ts`, `/role-model-router/apps/runtime-ui/app/components/telemetry-charts.test.tsx` | QA Surface: `/role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`, `/role-model-router/apps/runtime-ui/app/routes/requests.tsx`, `/.recursive/run/70-cache-hit-token-rate-analytics-fix/05-manual-qa.md` | Rationale: the approved Phase 2 addendum shows that the shared single-axis chart visually blurs absolute token volume and rate semantics even when support-state semantics remain correct, so this requirement now includes narrow shared-chart separation without changing labels or support classification
- `R4` | Coverage: `direct` | Source Quote: `The run must use strict TDD in Phase 3 and add focused regression coverage that proves the analytics fix and guards all affected execution paths.` | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`, `/role-model-router/apps/runtime-ui/app/lib/telemetry-route-models.test.ts`, `/role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.test.ts`, `/role-model-router/apps/runtime-ui/app/components/telemetry-charts.test.tsx`, `/.recursive/run/70-cache-hit-token-rate-analytics-fix/03-implementation-summary.md` | Verification Surface: `/.recursive/run/70-cache-hit-token-rate-analytics-fix/evidence/logs/red/`, `/.recursive/run/70-cache-hit-token-rate-analytics-fix/evidence/logs/green/`, `/.recursive/run/70-cache-hit-token-rate-analytics-fix/04-test-summary.md` | QA Surface: `/.recursive/run/70-cache-hit-token-rate-analytics-fix/03-implementation-summary.md`, `/.recursive/run/70-cache-hit-token-rate-analytics-fix/04-test-summary.md`
- `R5` | Coverage: `direct` | Source Quote: `Phase 5 verification must prove on the rebuilt runtime that the repaired backend metric flows through the existing analytics surfaces that consume it.` | Implementation Surface: `/role-model-router/apps/runtime-ui/app/lib/telemetry-route-models.ts`, `/role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.ts`, `/role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx`, `/.recursive/run/70-cache-hit-token-rate-analytics-fix/05-manual-qa.md` | Verification Surface: `/role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`, `/role-model-router/apps/runtime-ui/app/routes/requests.tsx`, `/.recursive/run/70-cache-hit-token-rate-analytics-fix/05-manual-qa.md` | QA Surface: `/role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`, `/role-model-router/apps/runtime-ui/app/routes/requests.tsx`, `/.recursive/run/70-cache-hit-token-rate-analytics-fix/05-manual-qa.md` | Rationale: the approved Phase 2 addendum requires operator-visible proof on both shared cache-efficiency cards because both surfaces consume the same mixed-unit chart and both would remain misleading without the dual-axis correction

## Implementation Steps

1. Write the first failing host-bridge analytics assertion so the seeded supported row expects `cacheHitTokenRate: 0.133333` instead of `0.117647`.
2. Add or expand a failing host-bridge assertion proving `cacheBackedRequestRate` remains unchanged for the same telemetry slice.
3. Confirm the RED phase still preserves the existing mixed-support assertion, so unsupported rows remain excluded from the denominator without being coerced to supported-zero.
4. Write a failing runtime-ui definition or model assertion proving the Overview and Observe cache-efficiency charts opt into mixed-unit dual-axis behavior while same-unit charts remain unchanged.
5. Write a failing runtime-ui chart assertion using a mocked `recharts` seam proving the shared line renderer emits separate left and right Y axes for the cache-efficiency charts while homogeneous line charts stay single-axis.
6. Make the minimal production edit in `/role-model-router/apps/runtime-host-bridge/src/index.ts` to use `sum(inputTokens)` as the denominator over supported rows.
7. Make the minimal shared runtime-ui edits needed to carry dual-axis metadata from the cache-efficiency chart definitions through the time-series model into the line-chart renderer.
8. Rerun the focused host-bridge and runtime-ui regressions until they turn GREEN.
9. Rerun the provider-openai and LiteLLM regression controls to confirm the unchanged total-plus-subset normalization contract still holds across direct OpenAI-compatible, Kimi-shaped, Codex bridge-owned, and LiteLLM-backed paths.
10. If Phase 3 RED evidence exposes an unexpected upstream normalization mismatch or a need for route-local chart work, stop widening the fix silently and record a current-phase addendum before editing provider logic or route pages.
11. After automated verification is stable, rebuild the runtime and capture Phase 5 backend-query proof plus Overview and Observe operator-surface proof.

## Testing Strategy

TDD Mode: `strict`

### RED tests

- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - the seeded telemetry analytics case expects `cacheHitTokenRate: 0.133333` for `inputTokens = 120` and `cacheReadTokens = 16`
  - the mixed supported and unsupported slice still reports partial support with `supportedRowCount: 1` and `unsupportedRowCount: 1`
  - one deterministic assertion proves `cacheBackedRequestRate` remains unchanged
- `/role-model-router/apps/runtime-ui/app/lib/telemetry-route-models.test.ts`
  - the Overview `Cache Efficiency` and Observe `Cache Efficiency Trend` definitions opt into dual-axis mixed-unit presentation
  - neighboring same-unit charts remain definition-stable and single-axis by default
- `/role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.test.ts`
  - the mixed-unit cache chart model carries separate axis ownership for `cacheHitTokens` and `cacheHitTokenRate`
  - same-unit charts continue to default to a single axis
- `/role-model-router/apps/runtime-ui/app/components/telemetry-charts.test.tsx`
  - a mocked `recharts` seam proves the shared line renderer emits two Y axes and binds the rate series to the secondary axis for cache-efficiency charts
  - a same-unit control proves the renderer still emits one axis for standard line charts

### GREEN verification floor

- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts -t "aggregates generic telemetry analytics from persisted request-time routing and cost facts"`
- `corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/lib/telemetry-route-models.test.ts app/lib/telemetry-analytics.test.ts app/components/telemetry-charts.test.tsx`
- `corepack pnpm --filter @role-model-router/provider-openai test`
- `corepack pnpm --filter @role-model-router/provider-litellm test`
- if the host-bridge production edit grows beyond the single metric branch, escalate the GREEN floor to `corepack pnpm --filter @role-model-router/runtime-host-bridge test`
- if the runtime-ui change escapes the shared cache-chart stack, escalate the GREEN floor to `corepack pnpm --filter @role-model-router/runtime-ui test`

### Evidence capture

- store RED logs under `/.recursive/run/70-cache-hit-token-rate-analytics-fix/evidence/logs/red/`
- store GREEN logs under `/.recursive/run/70-cache-hit-token-rate-analytics-fix/evidence/logs/green/`
- record the exact host-bridge test name, runtime-ui targeted test command, provider-openai suite command, and provider-litellm suite command in `03-implementation-summary.md`

## Playwright Plan (if applicable)

Optional only. Browser automation is not the primary acceptance gate, but it may be used in Phase 5 to capture rebuilt-runtime evidence from both Overview and Observe if manual navigation is noisy. Mocked or static chart renders do not satisfy the rebuilt-runtime verification requirement.

## Manual QA Scenarios

QA Execution Mode: `agent-operated`

Planned scenarios:

1. Rebuild and start the runtime from the run-70 implementation commit using the exact startup command recorded in `05-manual-qa.md`.
2. Query the existing telemetry analytics endpoint for a bounded slice that includes one supported cached-token row and confirm `cacheHitTokenRate = 0.133333` while request-level cache support remains unchanged.
3. Capture the Overview `Cache Efficiency` card via `/role-model-router/apps/runtime-ui/app/routes/dashboard.tsx` and confirm it renders separate token and rate axes for `cacheHitTokens` and `cacheHitTokenRate`.
4. Capture the Observe Requests `Cache Efficiency Trend` card via `/role-model-router/apps/runtime-ui/app/routes/requests.tsx` and confirm it renders the same dual-axis split for the same metric pair.
5. Confirm both operator surfaces show the corrected token-hit-rate math instead of the prior halved value and that the rate series is no longer visually flattened against the token-volume scale.
6. Capture one supported-zero control proving a truthful `0` remains visible without being reclassified as unsupported.
7. Record the exact endpoint, time window, route URLs, request IDs or telemetry slice identifiers, and evidence paths used for the backend-query proof plus both operator-surface proofs.

## Idempotence and Recovery

- The focused RED and GREEN test commands are deterministic and safe to rerun after each edit.
- The rebuilt-runtime telemetry query should use a bounded fresh verification window so historical pre-fix rows do not contaminate Phase 5 evidence.
- If Phase 3 reveals that the fix cannot remain inside the planned host-bridge math plus the shared cache-chart stack, create a current-phase addendum before widening implementation scope to provider logic or route-local pages.
- If a later phase reopens Phase 2, relock from Phase 2 forward so Phase 3+ receipts chain from the repaired plan.

## Implementation Sub-phases

1. RED: host-bridge analytics expectation update and request-rate non-regression assertion
2. GREEN: minimal host-bridge denominator repair
3. RED: shared cache-chart axis metadata, model, and renderer tests
4. GREEN: narrow dual-axis implementation in the shared runtime-ui chart stack
5. GREEN verification: provider-openai, LiteLLM, and targeted runtime-ui regression-control reruns
6. REFACTOR: local readability cleanup only if it does not widen behavior or file scope
7. Phase 5 prep: rebuilt-runtime telemetry query plus Overview and Observe evidence capture

## Plan Drift Check

- No provider-openai or LiteLLM production edit is planned unless Phase 3 disproves the locked root-cause findings
- No Codex-only analytics fork is planned
- No route-local workaround, duplicate cache chart, new dashboard, or telemetry API replacement is planned
- No broader UI redesign is planned beyond shared dual-axis separation on the existing cache-efficiency charts
- No historical telemetry backfill is planned
- No upstream token-contract rewrite is planned

## Known Unknowns Carried Forward

- Whether the narrowest dual-axis ownership seam belongs on route-definition metadata or in the time-series model builder, provided only the cache-efficiency charts opt in and homogeneous charts remain single-axis.
- Whether the existing host-bridge analytics regression block is enough to carry the unchanged `cacheBackedRequestRate` proof inline or whether one adjacent focused assertion will be cleaner in Phase 3.
- Whether the right-side rate axis can remain raw fractional values or should use explicit percent tick formatting once RED evidence and rebuilt-runtime QA confirm readability.
- Whether any existing pre-fix telemetry rows in the QA runtime state will require a more tightly bounded time window during Phase 5.

## Traceability

- `R1`: direct host-bridge math repair planned
- `R2`: cross-path normalization preserved through indirect regression controls rather than widened provider edits
- `R3`: adjacent metric, support-state, and mixed-unit operator distinction preserved through host-bridge and shared-chart work
- `R4`: strict RED-first backend and shared-chart evidence plus command floor planned
- `R5`: rebuilt-runtime backend-query plus Overview and Observe operator-surface proof planned

## Gaps Found

- None. The locked-requirements omission was recorded and compensated via `/.recursive/run/70-cache-hit-token-rate-analytics-fix/addenda/02-to-be-plan.upstream-gap.00-requirements.addendum-01.md`.

## Repair Work Performed

None. This artifact defines the implementation plan only.

## Audit Verdict

Audit: PASS

The plan stays inside the confirmed host-bridge denominator defect plus the approved shared-chart compensation, names concrete RED and GREEN steps, and avoids widening into provider-specific normalization edits, route-local page hacks, or broader UI redesign.

## Earlier Phase Reconciliation

- `01-as-is.md` established that the broken behavior lives in one host-bridge analytics branch and that the upstream normalization contract already matches the intended denominator semantics.
- `01.5-root-cause.md` reduced the defect to one backend math error plus one codified regression expectation.
- Re-read addendum `/.recursive/run/70-cache-hit-token-rate-analytics-fix/addenda/02-to-be-plan.upstream-gap.00-requirements.addendum-01.md`, which records the second operator-visible gap: the shared cache-efficiency charts still combine absolute tokens and fractional rate on one Y axis.
- This plan keeps Phase 3 constrained to host-bridge math plus the narrow shared cache-chart separation needed to preserve truthful Overview and Observe presentation unless new RED evidence proves the scope assumption false.

## Prior Recursive Evidence Reviewed

- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/00-requirements.md`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/00-requirements.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`

## Subagent Contribution Verification

- Reviewed Action Records: none
- Main-Agent Verification Performed: direct reconciliation of `/.recursive/run/70-cache-hit-token-rate-analytics-fix/00-requirements.md`, `/.recursive/run/70-cache-hit-token-rate-analytics-fix/01-as-is.md`, `/.recursive/run/70-cache-hit-token-rate-analytics-fix/01.5-root-cause.md`, `/.recursive/run/70-cache-hit-token-rate-analytics-fix/addenda/02-to-be-plan.upstream-gap.00-requirements.addendum-01.md`, `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`, `/role-model-router/packages/provider-openai/test/index.test.ts`, `/role-model-router/packages/provider-litellm/src/index.ts`, `/role-model-router/apps/runtime-ui/app/lib/telemetry-route-models.ts`, `/role-model-router/apps/runtime-ui/app/lib/telemetry-route-models.test.ts`, `/role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.ts`, `/role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.test.ts`, `/role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx`, `/role-model-router/apps/runtime-ui/app/components/telemetry-charts.test.tsx`, `/role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`, and `/role-model-router/apps/runtime-ui/app/routes/requests.tsx`
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
- Base branch: `main`
- Worktree branch: `recursive/70-cache-hit-token-rate-analytics-fix`
- Active worktree path: `D:\DEV\role-model\.worktrees\70-cache-hit-token-rate-analytics-fix\`
- Planned or claimed changed files:
  - `/.recursive/run/70-cache-hit-token-rate-analytics-fix/addenda/02-to-be-plan.upstream-gap.00-requirements.addendum-01.md`
  - `/.recursive/run/70-cache-hit-token-rate-analytics-fix/02-to-be-plan.md`
- Unexplained drift:
  - none

## Requirement Completion Status

- `R1` | Status: `planned` | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: `/role-model-router/apps/runtime-host-bridge/test/index.test.ts` | QA Surface: `/role-model-router/apps/runtime-ui/app/routes/requests.tsx`, `/.recursive/run/70-cache-hit-token-rate-analytics-fix/05-manual-qa.md`
- `R2` | Status: `planned-indirectly` | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Surface: `/role-model-router/packages/provider-openai/test/index.test.ts`, `/role-model-router/packages/provider-litellm/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts` | QA Surface: `/.recursive/run/70-cache-hit-token-rate-analytics-fix/04-test-summary.md`, `/.recursive/run/70-cache-hit-token-rate-analytics-fix/05-manual-qa.md` | Rationale: the upstream normalization seams already satisfy the total-plus-subset contract, so the planned work preserves this requirement by keeping the production edit constrained to analytics and by rerunning the current cross-path regression controls
- `R3` | Status: `planned` | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`, `/role-model-router/apps/runtime-ui/app/lib/telemetry-route-models.ts`, `/role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.ts`, `/role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx` | Verification Surface: `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`, `/role-model-router/apps/runtime-ui/app/lib/telemetry-route-models.test.ts`, `/role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.test.ts`, `/role-model-router/apps/runtime-ui/app/components/telemetry-charts.test.tsx` | QA Surface: `/role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`, `/role-model-router/apps/runtime-ui/app/routes/requests.tsx`, `/.recursive/run/70-cache-hit-token-rate-analytics-fix/05-manual-qa.md`
- `R4` | Status: `planned` | Implementation Surface: `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`, `/role-model-router/apps/runtime-ui/app/lib/telemetry-route-models.test.ts`, `/role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.test.ts`, `/role-model-router/apps/runtime-ui/app/components/telemetry-charts.test.tsx`, `/.recursive/run/70-cache-hit-token-rate-analytics-fix/03-implementation-summary.md` | Verification Surface: `/.recursive/run/70-cache-hit-token-rate-analytics-fix/evidence/logs/red/`, `/.recursive/run/70-cache-hit-token-rate-analytics-fix/evidence/logs/green/`, `/.recursive/run/70-cache-hit-token-rate-analytics-fix/04-test-summary.md` | QA Surface: `/.recursive/run/70-cache-hit-token-rate-analytics-fix/03-implementation-summary.md`, `/.recursive/run/70-cache-hit-token-rate-analytics-fix/04-test-summary.md`
- `R5` | Status: `planned` | Implementation Surface: `/role-model-router/apps/runtime-ui/app/lib/telemetry-route-models.ts`, `/role-model-router/apps/runtime-ui/app/lib/telemetry-analytics.ts`, `/role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx`, `/.recursive/run/70-cache-hit-token-rate-analytics-fix/05-manual-qa.md` | Verification Surface: `/role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`, `/role-model-router/apps/runtime-ui/app/routes/requests.tsx`, `/.recursive/run/70-cache-hit-token-rate-analytics-fix/05-manual-qa.md` | QA Surface: `/role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`, `/role-model-router/apps/runtime-ui/app/routes/requests.tsx`, `/.recursive/run/70-cache-hit-token-rate-analytics-fix/05-manual-qa.md`

## Coverage Gate

- [x] `R1` through `R5` are mapped to concrete implementation, verification, and QA surfaces
- [x] Strict RED-first backend and shared-chart coverage is defined before any production edit
- [x] The rebuilt-runtime proof path uses the existing Overview and Observe analytics surfaces rather than a new dashboard

Coverage: PASS

## Approval Gate

- [x] The plan is specific enough to begin Phase 3 strict TDD
- [x] The plan stays inside the locked backend bugfix scope plus the approved shared-chart addendum
- [x] The artifact is ready for lock and Phase 3 handoff

Approval: PASS
