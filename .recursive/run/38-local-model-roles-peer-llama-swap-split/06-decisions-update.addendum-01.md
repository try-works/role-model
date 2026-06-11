Run: `/.recursive/run/38-local-model-roles-peer-llama-swap-split/`
Phase: `06 Decisions Update`
Status: `LOCKED`
LockedAt: `2026-06-11T04:22:13Z`
LockHash: `49c8a26dbffe36c921e3038d5252052fef30e915d711864b429bb794ffdb3e9c`
Workflow version: `recursive-mode-audit-v2`
Addendum: `01`
Inputs:
- `03-implementation-summary.addendum-01.md`
- `05-manual-qa.addendum-01.md`
Outputs:
- `06-decisions-update.addendum-01.md`
- `/.recursive/DECISIONS.md` (receipt delta)
Scope note: Addendum delta for global decisions ledger.

## TODO

- [x] Record addendum decision delta
- [x] Complete gates

## Decision summary (append to Run 38 entry)

**Addendum 01 — llama-swap setup scaffold and UI hints**

- **What changed:** Canonical llama-swap config scaffold (`llama-swap-setup.ts`), runtime-config **Insert llama-swap scaffold**, setup hints + modal on llama-swap Local surfaces when not operational.
- **Why:** Run 38 QA skipped llama-swap live load because operator config had no `llama_swap.models`; peer-only operators lacked onboarding guidance.
- **How:** Worktree-isolated addendum (`R16`); unit tests + SEA rebuild + browser QA on peer-only config.
- **What was not done:** Auto-inject scaffold on runtime start; GGUF download; llama-swap live load proof (still requires operator enablement).
- **Follow-ups:** Run 39 session rehydration for peer/remote activations across restart.

## Coverage Gate

- [x] Delta is concise and references addendum artifacts

Coverage: PASS

## Approval Gate

- [x] Ready to merge into `/.recursive/DECISIONS.md`

Approval: PASS

Audit: PASS
