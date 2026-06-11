Run: `/.recursive/run/40-catalog-economics-moonshot-consolidation/`
Phase: `02 TO-BE Plan`
Status: `LOCKED`
LockedAt: `2026-06-11T14:12:39Z`
LockHash: `f9f7ca50b20e6a9621e84eb67204a9adfe30679114d4015f7e581f03f0bdc67b`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/40-catalog-economics-moonshot-consolidation/00-requirements.md`
- `/.recursive/run/40-catalog-economics-moonshot-consolidation/01-as-is.md`
- `/.recursive/run/40-catalog-economics-moonshot-consolidation/00-worktree.md`
Outputs:
- `/.recursive/run/40-catalog-economics-moonshot-consolidation/02-to-be-plan.md`
Scope note: Planned product changes for catalog-only routing economics, Kimi canonical pricing, Moonshot picker hygiene, and routing diagnostics.

## TODO

- [x] Resolve Phase 1 known unknowns
- [x] Plan SP1–SP7 mapped to `R0`–`R10`
- [x] Plan file-level changes and strict TDD strategy
- [x] Plan verification strategy
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Phase 1 Decisions (resolved)

| Unknown | Decision |
| --- | --- |
| Estimate formula | `estimatedRequestUsd = (contextTokens/1e6)*inputPer1M + (maxOutputTokens/1e6)*outputPer1M`; `cost_per_1k_tokens_est = (estimatedRequestUsd / (contextTokens+maxOutputTokens)) * 1000` |
| Unknown pricing | Cost metric stays neutral (0.5) with `source: unknown`; no telemetry fallback |
| Canonical map scope | `moonshot/kimi-k2.6` → `moonshotai/kimi-k2.6` in `CANONICAL_MODEL_ID_ALIASES` |
| `cost_per_1k_tokens_est` | Catalog-derived pre-route estimate; strip telemetry cost before routing |

## Implementation Sub-phases

### SP1 — Catalog economics module (`R3`, `R4`)

- Add `packages/catalog/src/token-economics.ts`
- RED: `test/token-economics.test.ts` — Kimi map, local-free, estimate ordering
- Export from `packages/catalog/src/index.ts`

### SP2 — Protocol-routing integration (`R5`, `R6`, `R7`)

- Require `catalog` on `ProjectRuntimeRouteInputInput`
- Attach `catalogCostEstimate`; strip telemetry `cost_per_1k`; return `catalogEconomicsByEndpointId`
- RED: `test/catalog-economics-routing.test.ts`

### SP3 — Router-core scoring (`R6`, `R7`)

- `getCostMetric()` prefers `routingSignals.catalogCostEstimate` with source `"catalog"`
- Budget gate uses `estimatedRequestUsd`

### SP4 — Bridge provider surfaces (`R1`, `R2`, `R9`)

- Hide `moonshotai` from `listProviders()`; dedupe Moonshot variants
- Pass catalog into `routeRuntimeRequest`; emit `catalogEconomics` diagnostics
- RED: `test/catalog-economics-providers.test.ts`

### SP5 — CLI wiring (`R5`)

- Pass `catalog` in protocol-routing and adapter-execution CLIs

### SP6 — OAuth authProfile (`R8`) — bounded

- Defer deep `authProfile` refactor; deliver variant dedupe only

### SP7 — Validation floor (`R0`, `R10`)

- Strict TDD RED/GREEN logs under `evidence/logs/`
- `runtime:validate-routing`; Phase 5 packaged `:3456` drill

## Worktree scope (planned)

| File | Change |
| --- | --- |
| `packages/catalog/src/token-economics.ts` | New |
| `packages/catalog/test/token-economics.test.ts` | New |
| `packages/protocol-routing/src/index.ts` | Catalog attachment |
| `packages/protocol-routing/test/catalog-economics-routing.test.ts` | New |
| `packages/core/src/router.ts` | Catalog cost metric |
| `packages/core/src/types.ts` | `CatalogCostEstimateSignals` |
| `packages/runtime-observability/src/index.ts` | `catalogEconomics` |
| `apps/runtime-host-bridge/src/index.ts` | Filter, dedupe, route input |
| `apps/runtime-host-bridge/test/catalog-economics-providers.test.ts` | New |
| `packages/*/src/cli.ts` | Pass catalog |

## Worktree Diff Audit

- Baseline: `42dffbb`
- Comparison: working-tree on `recursive/40-catalog-economics-moonshot-consolidation`
- Normalized diff command: `git diff --name-only 42dffbb`
- Expected paths match Worktree scope table

## Verification Strategy

- Strict TDD RED before GREEN for SP1–SP4
- Tier A: catalog + protocol-routing tests
- Tier B: `runtime:validate-routing`, bridge provider test
- Tier C (Phase 5): `:3456` easy/cost prefers local when pool-eligible

## Planned Changes by File

See Worktree scope table in SP sections.

## Implementation Steps

1. SP1 catalog economics + RED/GREEN tests
2. SP2 protocol-routing catalog attachment
3. SP3 router-core catalog cost metric
4. SP4 bridge filter/dedupe + diagnostics
5. SP5 CLI catalog wiring
6. SP6 bounded R8 variant hygiene
7. SP7 validation floor + Phase 5 QA

## Testing Strategy

- Strict TDD with RED/GREEN logs under `evidence/logs/`
- Unit: catalog, protocol-routing; integration: `runtime:validate-routing`

## Playwright Plan (if applicable)

Not applicable — no Playwright surfaces in run 40 scope.

## Manual QA Scenarios

1. Providers UI shows one Moonshot entry (no `moonshotai`)
2. Easy/cost alias prefers local peer over Kimi on `:3456`
3. Request detail shows `catalogEconomics` in routing diagnostics

## Idempotence and Recovery

- Catalog economics are pure functions of catalog snapshot + request shape
- Provider filter/dedupe idempotent on each `listProviders()` call

## Traceability

- SP1 → `R3`, `R4`; SP2 → `R5`, `R6`, `R7`; SP3 → `R6`, `R7`
- SP4 → `R1`, `R2`, `R9`; SP5 → `R5`; SP6 → `R8` partial; SP7 → `R0`, `R10`

## Subagent Capability Probe

- self-audit against locked Phase 1 and requirements

## Audit Execution Mode

- self-audit

## Coverage Gate

- [x] All in-scope `R#` mapped to sub-phases
- [x] Phase 1 unknowns resolved
- [x] Worktree diff audit lists expected paths
- [x] Strict TDD declared

Coverage: PASS

## Approval Gate

- [x] Plan bounded; R8 partial explicit
- [x] Ready for Phase 3 strict TDD

Approval: PASS
