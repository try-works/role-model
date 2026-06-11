Run: `/.recursive/run/40-catalog-economics-moonshot-consolidation/`
Phase: `01 AS-IS`
Status: `LOCKED`
LockedAt: `2026-06-11T14:12:39Z`
LockHash: `389bfeaf359ccb7adff4c834945bfa8b9aac3fe43bd19bd8948862f4b8384af3`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/40-catalog-economics-moonshot-consolidation/00-requirements.md`
- `/.recursive/run/40-catalog-economics-moonshot-consolidation/00-worktree.md`
- Baseline commit `42dffbb` (post-run-39 `main`)
Outputs:
- `/.recursive/run/40-catalog-economics-moonshot-consolidation/01-as-is.md`
Scope note: Documents routing economics, Moonshot provider surfaces, and catalog pricing behavior at run-40 baseline before any Phase 3 changes.

## TODO

- [x] Map G1–G6 gaps to current code paths at `42dffbb`
- [x] Map each in-scope `R#` to current behavior
- [x] Record reproduction for cost-strategy mis-rank
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Reproduction Steps (Novice-Runnable)

1. `cd D:\DEV\role-model\.worktrees\40-catalog-economics-moonshot-consolidation`
2. Confirm HEAD is `42dffbb` (post-reset baseline)
3. Open `role-model-router/packages/core/src/router.ts` — `getCostMetric()` reads `candidate.observed.cost_per_1k_tokens_est` only; missing → neutral `0.5`
4. Open `role-model-router/packages/catalog/data/normalized-catalog.json` — `moonshot/kimi-k2.6` has `pricing: null`; `moonshotai/kimi-k2.6` has `inputPer1M`/`outputPer1M`
5. Open `role-model-router/apps/runtime-host-bridge/src/index.ts` — `listProviders()` includes `moonshotai`; `resolveProviderVariants()` concatenates presets + generated + legacy without dedupe
6. Route easy/cost with local peer + Kimi when observed profiles omit catalog estimates — both candidates cost metric `0.5` (default)

## Current Behavior by Gap

### G1 — Dual Moonshot providers (`R1`)

- `listProviders()` iterates all `currentNormalizedCatalog.providers` without filtering metadata-only ids.
- `moonshot` and `moonshotai` both appear as connectable providers named "Moonshot AI".

### G2 — Moonshot variant explosion (`R2`)

- `resolveProviderVariants()` returns preset + generated + legacy variants without dedupe.

### G3 — Operator model pricing null (`R3`)

- Live Kimi uses `moonshot/kimi-k2.6`; catalog row has `pricing: null`.
- Pricing on `moonshotai/kimi-k2.6` is not mapped for routing.

### G4 — Missing catalog-derived estimate (`R4`, `R5`, `R6`)

- No `TokenEconomics` module; protocol-routing passes observed profiles unchanged.

### G5 — Cost strategy mis-ranks easy work (`R6`)

- Missing `cost_per_1k_tokens_est` → neutral `0.5` tie for local and remote.

### G6 — Endpoint/vendor cost mistaken for rates (`R7`)

- `getCostMetric()` uses observed `cost_per_1k_tokens_est` with source `"measured"` when present.

## Current Behavior by Requirement

| Req | Current state @ `42dffbb` |
| --- | --- |
| `R0` | Run 39 baseline merged — **met** |
| `R1` | `moonshotai` in Providers API — **not met** |
| `R2` | Duplicate Moonshot variants — **not met** |
| `R3` | No canonical Kimi map — **not met** |
| `R4` | No `TokenEconomics` — **not met** |
| `R5` | No catalog on candidates — **not met** |
| `R6` | Neutral cost tie — **not met** |
| `R7` | Telemetry can feed cost metric — **not met** |
| `R8` | OAuth functional; not profile-shaped — **partial** |
| `R9` | No catalogEconomics diagnostics — **not met** |
| `R10` | No run-40 validation — **not met** |

## Relevant Code Pointers

| Area | Path | Notes |
| --- | --- | --- |
| Cost metric | `packages/core/src/router.ts` | observed per-1k only |
| Route projection | `packages/protocol-routing/src/index.ts` | no catalog attachment |
| Catalog pricing | `packages/catalog/data/normalized-catalog.json` | Kimi operator null |
| Provider list | `apps/runtime-host-bridge/src/index.ts` | includes `moonshotai` |

## Evidence

- Baseline commit: `42dffbb`
- Requirements gaps G1–G6: `00-requirements.md`
- Baseline tests: catalog 9 passed, protocol-routing 7 passed, `runtime:validate-routing` exit 0

## Known Unknowns

1. Exact estimate formula (input+max_output weighting) — resolve in Phase 2
2. Unknown-pricing fallback on cost strategy — resolve in Phase 2
3. Canonical map scope beyond Kimi — resolve in Phase 2
4. `cost_per_1k_tokens_est` semantics — resolved in requirements (catalog-derived estimate)

## Traceability

- G1 → `R1`; G2 → `R2`; G3 → `R3`; G4 → `R4`–`R6`; G5 → `R5`; G6 → `R7`
- `R0` → run 39 baseline; `R8` partial; `R9`/`R10` not started

## Subagent Capability Probe

- self-audit against `42dffbb` and locked requirements

## Audit Execution Mode

- self-audit

## Coverage Gate

- [x] G1–G6 mapped to code and requirements
- [x] Reproduction steps novice-runnable
- [x] Known unknowns listed for Phase 2

Coverage: PASS

## Approval Gate

- [x] AS-IS factual against baseline @ `42dffbb`
- [x] Ready for Phase 2 TO-BE planning

Approval: PASS
