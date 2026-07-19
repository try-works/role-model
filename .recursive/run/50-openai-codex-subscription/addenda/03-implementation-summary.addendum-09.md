Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `03 Implementation Summary`
Status: `DRAFT`
Addendum: `09`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-15.md`
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-15.md`
- `/role-model-router/packages/core/src/router.ts`
- `/role-model-router/packages/core/src/reason-codes.ts`
- `/protocol/schemas/router-decision.schema.json`
- `/packages/protocol-types/src/generated.ts`
- `/role-model-router/packages/runtime-observability/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/packages/conformance/src/router-conformance.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/03-implementation-summary.addendum-09.md`
Scope note: This addendum repairs the routing-diagnostics truthfulness gap exposed by the live `:3462` controller routing audit after Kimi received fresh live samples.

## Implemented

1. updated `/role-model-router/packages/core/src/reason-codes.ts`
   - added `TIE_BREAK_APPLIED` to router selection reason codes
2. updated `/protocol/schemas/router-decision.schema.json`
   - admitted `TIE_BREAK_APPLIED` in the router decision schema
3. updated `/packages/protocol-types/src/generated.ts`
   - regenerated generated router-decision types with the new selection reason
4. updated `/role-model-router/packages/core/src/router.ts`
   - exported `ROUTER_SCORE_TIE_EPSILON`
   - detected when the winning candidate came from the score-tie epsilon comparator
   - now emits `TIE_BREAK_APPLIED` alongside `BEST_TOTAL_SCORE` for those decisions
5. updated `/role-model-router/packages/runtime-observability/src/index.ts`
   - added `routingDiagnostics.selection`
6. updated `/role-model-router/apps/runtime-host-bridge/src/index.ts`
   - added `summarizeSelectionDiagnosticsFromDecision()`
   - persisted a request-detail `selection` block containing:
     - `mode`
     - `scoreTieEpsilon`
     - `scoreDelta`
     - `winnerEndpointId`
     - `winnerTotalScore`
     - `runnerUpEndpointId`
     - `runnerUpTotalScore`
     - `tieBreakOrder`
7. updated focused regressions:
   - `/packages/conformance/src/router-conformance.test.ts`
   - `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
   - `/protocol/fixtures/router-golden/cases/endpoint-id-tie-break.json`

## Test Results

Passed focused regressions:

- `corepack pnpm --filter @role-model/conformance exec vitest run src/router-conformance.test.ts --testNamePattern "tie-break selection reason"`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts --testNamePattern "selection diagnostics when a tie-break chooses"`

Passed broader impacted verification:

- `corepack pnpm run types:generate`
- `corepack pnpm --filter @role-model/conformance exec vitest run src/router-conformance.test.ts src/router-fixture-conformance.test.ts`
- `corepack pnpm --filter @role-model-router/runtime-host-bridge build`

## Live Verification

Runtime target:

- `http://127.0.0.1:3462`

Warmup sequence:

1. `probe50r-direct-flash` -> `deepseek/deepseek-v4-flash`
2. `probe50r-direct-pro` -> `deepseek/deepseek-v4-pro`
3. `probe50r-direct-kimi` -> `moonshot/kimi-k2.7-code`

Post-warm controller alias probe:

1. `probe50s-postwarm-dedupe`
   - selected endpoint: `moonshot.personal.kimi-code.global.kimi-k2.7-code`
   - `selection_reasons` now include `TIE_BREAK_APPLIED`
   - `routingDiagnostics.selection.mode = "tie-break"`
   - `routingDiagnostics.selection.scoreTieEpsilon = 0.01`
   - `routingDiagnostics.selection.scoreDelta = 0.0035970560356258785`
   - `runnerUpEndpointId = deepseek.personal.deepseek-api-key.global.deepseek-v4-pro`

This closes the operator-truthfulness gap from the prior live audit. The route still chooses Kimi when quality wins inside the configured score epsilon, but the request detail now explains that choice explicitly instead of looking contradictory.
