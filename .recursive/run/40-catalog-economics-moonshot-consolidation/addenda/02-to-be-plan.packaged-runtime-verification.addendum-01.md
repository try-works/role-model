Run: `/.recursive/run/40-catalog-economics-moonshot-consolidation/`
Phase: `02 To-Be Plan`
Status: `APPROVED`
Addendum: `01`
Inputs:
- `/.recursive/run/40-catalog-economics-moonshot-consolidation/00-requirements.md` (LOCKED `R0`–`R10`)
- `/.recursive/run/40-catalog-economics-moonshot-consolidation/05-manual-qa.md` (LOCKED — scenario 7 deferred)
- `/.recursive/run/40-catalog-economics-moonshot-consolidation/addenda/01.5-root-cause.catalog-cost-freshness-decay.addendum-01.md`
Outputs:
- `/.recursive/run/40-catalog-economics-moonshot-consolidation/addenda/02-to-be-plan.packaged-runtime-verification.addendum-01.md`
Scope note: Post-closeout plan for packaged `:3456` verification tiers and catalog cost freshness remediation.

## Problem statement

Locked Phase 5 deferred the packaged easy/cost drill (scenario 7). Operator validation after `351bcce` SEA rebuild exposed:

1. **Live routing skew** — catalog economics attached but Kimi still wins cost strategy (freshness decay on catalog metric; see root-cause addendum)
2. **Missing verification harness** — no dedicated bridge validator, operator probe, or QA orchestrator for run 40 acceptance on `:3456`

## Requirement delta

| ID | Requirement | Maps to | Disposition |
| --- | --- | --- | --- |
| V1 | Bridge mock validator proves R1 + easy/cost local-free routing + `catalogEconomics` | R1, R5, R6, R9, R10 | new |
| V2 | Operator probe against live `:3456` reads routing decision + diagnostics | R1, R6, R9, R10 | new |
| V3 | QA drill orchestrates health wait, operator probe, downstream ingress regression | R0, R10 | new |
| V4 | Catalog cost metric must not freshness-decay toward neutral | R6, R7 | new (remediation) |
| V5 | `"catalog"` accepted as routing metric `source` in protocol schema/types | R9 | new (build fix) |

## Implementation slices

### SP9-A — Catalog cost freshness fix (`V4`)

Files:

- `role-model-router/packages/core/src/router.ts` — remove `decayToNeutral` from catalog branch of `getCostMetric()`
- `role-model-router/packages/protocol-routing/test/catalog-economics-routing.test.ts` — stale local / fresh Kimi regression case

### SP9-B — Tier 1 bridge validator (`V1`, `V5`)

Files:

- `role-model-router/apps/runtime-host-bridge/src/validate-catalog-economics.ts` (new)
- `role-model-router/apps/runtime-host-bridge/test/validate-catalog-economics.test.ts` (new)
- `package.json` — `runtime:validate-catalog-economics`
- `protocol/schemas/router-decision.schema.json`, `packages/protocol-types/src/generated.ts` — `"catalog"` source enum

### SP9-C — Tier 3 operator probe (`V2`)

Files:

- `role-model-router/scripts/operator-probe-catalog-economics.py` (new)

Behavior: `GET /healthz`, provider counts (R1), POST easy hello on `mixed.local-remote`, `GET /api/role-model/requests/{id}` for `difficultyStrategy=cost` and `catalogEconomics`.

### SP9-D — Tier 2 QA drill (`V3`)

Files:

- `role-model-router/scripts/run-catalog-economics-qa-drill.py` (new)

Behavior: optional `runtime:package-sea`, wait `/healthz`, run operator probe + `probe-downstream-ingress.py`, log to `evidence/logs/phase5-catalog-economics-qa.log`.

## Verification matrix

| Tier | Command | Pass criteria |
| --- | --- | --- |
| 1 | `pnpm run runtime:validate-catalog-economics` | local peer selected; `moonshotai` hidden; `tokenEconomicsSource=local-free` |
| 1 | `vitest run test/validate-catalog-economics.test.ts` | 1/1 PASS |
| 2 | `python scripts/run-catalog-economics-qa-drill.py --skip-package-sea` | exit 0; 0 `BRIDGE_CRASH` |
| 3 | `python scripts/operator-probe-catalog-economics.py` | exit 0; local model + `local-free` |
| A | `vitest run test/catalog-economics-routing.test.ts` | includes stale-telemetry cost case |
| SEA | `pnpm run runtime:package-sea` from worktree | SHA256 recorded; restart on `:3456` |

## Operator baseline (unchanged from run 39)

- Alias: `mixed.local-remote` → `lfm2.5-8b-a1b` + `moonshot/kimi-k2.6`
- Mode: `difficulty` / easy → cost strategy
- State root: `%LOCALAPPDATA%\Role Model Runtime`
- Launch: quote paths with spaces in `--runtime-state-root`

## Out of scope

- R8 authProfile refactor
- Changing downstream ingress case matrix
- Landing product code on `main` before PR merge

## Coverage Gate

- [x] V1–V5 mapped to files and verification commands
- [x] Reconciles locked Phase 5 deferral without rewriting locked artifacts

## Approval Gate

- [x] Supplements locked `02-to-be-plan.md` and `05-manual-qa.md` only
