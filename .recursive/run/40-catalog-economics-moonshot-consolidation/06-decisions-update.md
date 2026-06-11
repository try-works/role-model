Run: `/.recursive/run/40-catalog-economics-moonshot-consolidation/`
Phase: `06 Decisions Update`
Status: `LOCKED`
LockedAt: `2026-06-11T14:18:37Z`
LockHash: `961f3b12384953aca194a442ebd7b164fb53e4e06a881a6f3ae731dfd9451fcc`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/40-catalog-economics-moonshot-consolidation/05-manual-qa.md`
Outputs:
- `/.recursive/run/40-catalog-economics-moonshot-consolidation/06-decisions-update.md`
- `/.recursive/DECISIONS.md` (receipt — apply on lock)
Scope note: Delta receipt for run 40 catalog economics and Moonshot consolidation.

## TODO

- [x] Summarize what changed and why
- [x] Record partial R8/R10 dispositions
- [x] Complete gates

## Decisions Changes Applied

- Add `### Run \`40-catalog-economics-moonshot-consolidation\`` to `/.recursive/DECISIONS.md`

## Rationale

- Dual Moonshot providers and neutral 0.5 cost ties blocked cost strategy (G1–G5)
- Catalog-only economics required per user clarification on `cost_per_1k_tokens_est`

## Resulting Decision Entry

- `/.recursive/DECISIONS.md#run-40-catalog-economics-moonshot-consolidation`

## Decision summary (for `DECISIONS.md`)

**Run `40-catalog-economics-moonshot-consolidation`**

- **What changed:** `TokenEconomics`, catalog-derived routing estimates, Moonshot picker hygiene, routing diagnostics `catalogEconomics`
- **Why:** Cost strategy could not distinguish local from paid Kimi; duplicate Moonshot providers confused operators
- **How:** Strict TDD Phase 0→3 after locked requirements; RED/GREEN evidence on disk
- **What was not done:** R8 authProfile refactor; packaged `:3456` drill
- **Follow-ups:** SEA rebuild; optional R8 addendum

## Traceability

- `R0` → decision cites run 39 baseline preservation
- `R1` → hide `moonshotai` from operator list
- `R2` → variant dedupe
- `R3`, `R4` → canonical map + `TokenEconomics`
- `R5` → catalog on route paths
- `R6` → cost strategy ranking
- `R7` → telemetry exclusion
- `R8` → partial disposition
- `R9` → diagnostics surface
- `R10` → automated floor; packaged drill deferred

## Subagent Capability Probe

- self-audit

## Audit Execution Mode

- self-audit

## Coverage Gate

- [x] Decision delta concise and actionable

Coverage: PASS

## Approval Gate

- [x] Ready to append to `DECISIONS.md`

Approval: PASS
