# Review Bundle: 01 AS-IS analyst dispatch

Phase: `01 AS-IS`
Role: `analyst`
Artifact path: `/.recursive/run/103-agent-strategy-and-scoring-strategy/01-as-is.md`
Produced evidence: `/.recursive/run/103-agent-strategy-and-scoring-strategy/evidence/other/analyst_t1.md`
Action record: `/.recursive/run/103-agent-strategy-and-scoring-strategy/subagents/20260930T031524Z-analyst-t1-action.md`
Audit execution expectation: return findings plus `Audit: PASS` or `Audit: FAIL`

## Upstream artifacts provided

- `/.recursive/run/103-agent-strategy-and-scoring-strategy/00-requirements.md`
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/00-worktree.md`
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/inputs/16-agent-strategy-and-scoring-strategy.md`
- `/.recursive/RECURSIVE.md`

## Diff basis

- Baseline type: `remote ref`
- Baseline reference: `ca5c2126ca566086cfbe8f83cfdf339aba0879ff`
- Comparison reference: `working-tree`
- Normalized diff command: `git diff --name-only ca5c2126ca566086cfbe8f83cfdf339aba0879ff`

## Changed files in scope

- Run artifacts only (`01-as-is.md`, `evidence/other/analyst_t1.md`,
  `subagents/20260930T031524Z-analyst-t1-action.md`); no product file.

## Targeted code references

- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
- `role-model-router/apps/runtime-host-bridge/src/controller-routing-contract.ts`
- `role-model-router/apps/runtime-host-bridge/src/routing-latency-selection.ts`
- `role-model-router/apps/runtime-host-bridge/src/routing-latency-policy.ts`
- `role-model-router/packages/core/src/router.ts`
- `role-model-router/packages/sqlite-memory/src/index.ts`
- `role-model-router/packages/effect/{package.json,build.mjs}`
- `role-model-router/apps/runtime-ui/app/lib/routing-mode.ts`
- `role-model-router/apps/runtime-ui/app/routes/control-routing-strategy.tsx`
- `role-model-router/apps/runtime-ui/app/routes/router.tsx`

## Audit questions

- Does the saved scoring strategy reach the scorer today, and where is that disproved or confirmed?
- Which obligations of the design document are satisfied, partially satisfied or missing for `R1`-`R12`?
- Which prior recursive runs bind this change, and what do they constrain?
- Are the design document's own code anchors still valid against this baseline?

## Required output shape

- `## Source Requirement Inventory`, `## Current behaviour by surface`, `## Gaps vs requirements`,
  `## Prior recursive evidence`, `## Commands run`, `## Verdict`.
- Every claim anchored to a `file:line` or a command actually executed.

## Controller verification (after delivery)

- Anchor sweep of all 28 `file:line` anchors: `28 / 28` resolve with sufficient length.
- Symbol spot-check: `toDifficultyStrategy`:1966, `maybeApplyDifficultyRouting`:2065,
  `maybeApplyControllerRouting`:2232, `normalizeConfiguredRoutingMode`:5597, `selectedStrategy`:27158,
  `STRATEGY_WEIGHTS`:183, `toPolicyStrategy`:374, `getRedistributedWeights`:1193.
- Drift finding accepted: the design document's anchors are stale against this baseline.
