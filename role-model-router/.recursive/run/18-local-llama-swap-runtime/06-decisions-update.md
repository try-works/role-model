Run: `/.recursive/run/18-local-llama-swap-runtime/`
Phase: `06 Decisions Update`
Status: `LOCKED`
Inputs:
- `/.recursive/run/18-local-llama-swap-runtime/05-manual-qa.md`
- `/.recursive/DECISIONS.md`
Outputs:
- Updated `/.recursive/DECISIONS.md`
- `/.recursive/run/18-local-llama-swap-runtime/06-decisions-update.md`
Scope note: Update the global decisions ledger with Run 18 entry.

---

# Run 18: Decisions Update

## DECISIONS.md Changes

Added new entry for Run `18-local-llama-swap-runtime` under `## Recursive Run Index`.

### Run `18-local-llama-swap-runtime`

- Run folder: `/.recursive/run/18-local-llama-swap-runtime/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
  - `addenda/03-implementation.addendum.md`
  - `addenda/04-audit-report.md`
- What changed:
  - Added new "Local" sidebar section to the runtime UI with Models, Swap History, and Policy pages
  - Added bridge API endpoints for local runtime state (`/api/role-model/local/models`, `/swap`, `/policy`)
  - Implemented full page components with Swiss design system compliance
  - Verified through browser screenshots and API end-to-end testing
- Why:
  - To expose llama-swap's dynamic model-swapping functionality through the role-model runtime UI instead of requiring users to use the vendored llama-swap UI directly
- How:
  - Implemented in 6 ordered sub-phases (SP1–SP6) with build validation after each phase
  - Used pragmatic TDD (build + browser verification per sub-phase)
  - Fixed SPA fallback route ordering issue discovered during SP6
- What was not done:
  - Matrix solver UI (OOS1), peer passthrough (OOS2), model-level overrides (OOS3), real-time log streaming (OOS4)
  - Real llama-swap proxy integration (backend methods are stubs returning empty defaults)
- Known issues / follow-ups:
  - Backend methods are stubs; future run must wire to actual llama-swap runtime calls
  - Swap events are not persisted to SQLite; future run must add `llama_swap_events` table

---

## Coverage Gate

- DECISIONS.md entry matches the run folder artifacts.

**Coverage: PASS**

## Approval Gate

- Ledger updated.

**Approval: PASS**

LockedAt: 2026-05-10T05:40:00+08:00
LockHash: `run18-decisions-update-locked`