Run: `/.recursive/run/50-openai-codex-subscription/`
Phase: `02 To-Be Plan`
Status: `DRAFT`
Addendum: `13`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/01.5-root-cause.addendum-13.md`
- `/role-model-router/apps/runtime-host-bridge/src/controller-routing-contract.ts`
- `/role-model-router/apps/runtime-host-bridge/src/index.ts`
- `/role-model-router/apps/runtime-host-bridge/test/controller-routing-contract.test.ts`
- `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
Outputs:
- `/.recursive/run/50-openai-codex-subscription/addenda/02-to-be-plan.addendum-13.md`
- focused bridge test evidence for controller recovery and hard difficulty classification
- refreshed live routing evidence from `:3461`
Scope note: This addendum closes the remaining controller and hard-difficulty routing gaps so the alias matrix can differentiate harder requests on the live runtime instead of collapsing back to balanced fallback.

## Objective

Make controller routing robust on harder requests and make hard code-change prompts classify strongly enough to trigger quality-oriented routing.

## Implementation Plan

### Phase 1: RED regressions

1. extend `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
   - add a controller regression where the first controller pass returns empty output with `finish_reason = "length"` and a compact retry returns valid JSON
   - add a difficulty regression where a high-risk single-turn code-change prompt must classify as `hard` and use strategy `quality`
2. extend `/role-model-router/apps/runtime-host-bridge/test/controller-routing-contract.test.ts` only if the compact retry prompt contract itself needs explicit bounded-prompt coverage

### Phase 2: controller recovery patch

1. update `/role-model-router/apps/runtime-host-bridge/src/index.ts`
   - add a compact controller retry prompt builder
   - detect empty or invalid first-pass controller output
   - retry once with the compact contract before recording `invalid-controller-output`
2. preserve current sanitized-guidance behavior and compatibility mappings when the first pass already succeeds

### Phase 3: difficulty escalation patch

1. update `/role-model-router/apps/runtime-host-bridge/src/index.ts`
   - strengthen ask-mode hard-signal detection for high-risk code-change prompts
   - keep existing medium cases stable where possible
2. ensure the resulting score or explicit hard-trigger path yields:
   - `difficulty = "hard"`
   - `strategy = "quality"`

### Phase 4: Verification

1. rerun focused suites:
   - `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/controller-routing-contract.test.ts`
   - `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/index.test.ts --testNamePattern "controller|difficulty"`
2. rerun the package bridge suite if the focused changes touch shared paths broadly enough
3. rerun live alias probes on `http://127.0.0.1:3461` with harder requests
4. summarize:
   - controller fallback rate
   - difficulty bucket chosen
   - routing strategy chosen
   - selected endpoint per alias family
