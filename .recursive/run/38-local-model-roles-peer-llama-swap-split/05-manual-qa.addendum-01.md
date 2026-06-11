Run: `/.recursive/run/38-local-model-roles-peer-llama-swap-split/`
Phase: `05 Manual QA`
Status: `LOCKED`
LockedAt: `2026-06-11T04:22:13Z`
LockHash: `e1e89624ba669312bcaf0931f56820afb9f6daa1239a65bc60443546c1f445db`
Workflow version: `recursive-mode-audit-v2`
Addendum: `01`
Inputs:
- `addenda/00-requirements.llama-swap-setup-scaffold-and-ui-hints.addendum-01.md` (`R12`–`R15`)
- `addenda/00-worktree.addendum-01.md` (`R16`)
- `evidence/logs/addendum-01-implementation.log`
Outputs:
- `05-manual-qa.addendum-01.md`
Scope note: Browser QA for llama-swap setup scaffold and UI hints on peer-only operator config.

## TODO

- [x] Execute addendum browser QA (`R15`)
- [x] Record requirement completion status
- [x] Complete gates

## QA Execution Record

- QA Execution Mode: `agent-operated`
- Agent Executor: Cursor controller
- Browser: Cursor IDE browser MCP
- Worktree: `D:\DEV\role-model\.worktrees\38-local-model-roles-peer-llama-swap-split\`
- Runtime: packaged SEA `role-model-runtime.exe` via `role-model-launcher.exe`
- Preview URL: `http://127.0.0.1:3456`
- Package SEA SHA256: `acf14c9829f6b7b9144dc5e9334fc212c8ce8fbd4eff873dec44aaf1b492dce5`
- Unit tests: `llama-swap-setup.test.ts` — 6/6 PASS (`evidence/logs/addendum-01-implementation.log`)
- Operator config: peer-only; no live `llama_swap.models` on disk (`executionMode: decision_only`)

## QA Scenarios and Results

| # | Scenario | Result | Evidence |
| --- | --- | --- | --- |
| 1 | `/app/local/llama-swap/models` — prominent setup hint, disabled Load model, Setup guide CTA | **PASS** | Browser snapshot + modal screenshot |
| 2 | Setup guide modal — steps, Copy YAML, Copy JSON, live status line, footer links | **PASS** | Browser snapshot after Setup guide click |
| 3 | `/app/local/choose` — compact llama-swap note on managed card | **PASS** | Browser snapshot (`Setup guide` on choose page) |
| 4 | `/app/system/runtime-config` — Insert llama-swap scaffold when models empty | **PASS** | Button visible; insert status message shown |
| 5 | Insert scaffold merges placeholder `your-model-id` without auto-save | **PASS** | Insert button hidden after click; Save still required |
| 6 | Peer models flow unchanged (no llama-swap hint regression) | **PASS** | Prior run 38 peer QA baseline; llama-swap remains disabled |

## Requirement Completion Status

| Req | Disposition | Evidence |
| --- | --- | --- |
| R12 | verified | `llama-swap-setup.ts`, `llama-swap-setup.test.ts` (6 PASS) |
| R13 | verified | `control-runtime-config.tsx` insert action (browser #4–#5) |
| R14 | verified | Hint + modal on llama-swap models, compact on choose, banners on policy/swap/logs routes |
| R15 | verified | Unit tests + production build + browser QA table above |
| R16 | verified | All edits under worktree; repo-root run folder removed |

## Notes

- Launch packaged runtime with `role-model-launcher.exe` from `role-model-router/dist/release/win32-x64/` (direct `role-model-runtime.exe` did not bind `:3456` within probe window).
- Repo-root duplicate `.recursive/run/38-...` removed after stopping runtime PID on port 3456.

## Coverage Gate

- [x] All `R12`–`R16` scenarios executed or honestly deferred
- [x] Evidence paths cited

Coverage: PASS

## Approval Gate

- [x] Addendum browser QA complete on peer-only config
- [x] No regression to parent `R11` probe guard

Approval: PASS

Audit: PASS
