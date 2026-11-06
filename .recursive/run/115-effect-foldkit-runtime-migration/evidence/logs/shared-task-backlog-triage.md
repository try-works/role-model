# Shared-task backlog triage (task-103)

Triage basis: shared board pending list at 2026-11-03, repository evidence at
HEAD 17b06597 (public worktree). Classification is evidence-first: a green
log/test/artifact closes a task; a later run-115 commit/file that owns the
same area supersedes it; only a genuinely missing artifact remains open.
No product code was changed. Task-103 is the triage task itself.

## Summary

- Pending backlog reviewed (excluding task-103): **31**
- COMPLETED: **28**
- SUPERSEDED by run-115: **2** (task-29, task-32)
- GENUINELY OPEN: **1** (task-53)

Task-103 is completed by this triage/commit after the board updates.

## Table

| Task | Subject | Class | Evidence / replacement |
|---|---|---|---|
| task-2 | Review Phase Zero source requirement coverage | COMPLETED | `evidence/review-bundles/phase00-requirements-review-attempt02.md` |
| task-3 | Review paired Phase Zero baseline evidence | COMPLETED | `evidence/review-bundles/phase00-baseline-review-attempt02.md` |
| task-25 | B6/R27: DAG partial-shutdown owner (s321) | COMPLETED | `evidence/logs/s321-green4.log`; DAG shutdown tests |
| task-26 | B6/R27: DAG early-readiness owner (s324) | COMPLETED | `evidence/logs/s324-green5.log`; `test/s324-readiness.test.ts` |
| task-27 | B6/R27: drain shutdown-phase wiring (s327) | COMPLETED | `evidence/logs/s327-green2.log` |
| task-28 | B6/R27: DAG Benchmark owner (s330) | COMPLETED | `evidence/logs/s330-green3.log` |
| task-29 | R23: Backend-owned observation store (s333) | SUPERSEDED | Replaced by `5fc543af` (per-backend storage factory) and `src/composition-dag.ts` `composeBackendStorage` |
| task-30 | R23: observation storage-service extraction (s334) | COMPLETED | `evidence/logs/s334-green4.log`; `bbac7885` |
| task-31 | R23: migrate remaining observation families (s337) | COMPLETED | `evidence/logs/s337-green2.log`; `edf7ea54` |
| task-32 | R23: graph-store Backend factory split (s340) | SUPERSEDED | Replaced by `5fc543af` / `36cdd947` and `composeBackendStorage` |
| task-33 | R23: Backend storage factory split (s341) | COMPLETED | `evidence/logs/s341-green5.log`; `composeBackendStorage` in `composition-dag.ts` |
| task-34 | B1/R20: calibrated module-health edge (s366) | COMPLETED | `evidence/logs/s366-green2.log` |
| task-51 | S478 mark readiness ready in packaged branch | COMPLETED | `evidence/logs/s478-green.log` |
| task-52 | S480 skip Run88 identity on development | COMPLETED | `evidence/logs/s480-green.log` |
| task-53 | S487 R33 ledger v2 fail-closed checker | GENUINELY OPEN | `test/track-b/run115-b10-ledger-check.test.mjs` and `s344-b10-ledger.json` exist, but `scripts/track-b/ledger-check.mjs` and s487 RED/GREEN logs are absent; the ledger is still incomplete per `tasks/s487-r33-ledger-fail-closed.md`. Priority: medium (private ledger only). |
| task-54 | S488 W1a shared HTTP client | COMPLETED | `evidence/logs/s488-green.log`; `src/http/runtime-client.ts` |
| task-55 | S491 W1b real Foldkit listbox | COMPLETED | `evidence/logs/s491-green.log`; `src/ui/listbox.ts` |
| task-56 | S493 enumerate remaining ledger groups | COMPLETED | `evidence/logs/s493-green.log` (10/10); `s344-b10-ledger.json` |
| task-57 | S499 device-auth session display dialog | COMPLETED | `evidence/logs/s499-green.log`; `test/s499-device-auth-dialog.test.ts` |
| task-58 | S502 browser dialog a11y audit | COMPLETED | `evidence/logs/s502-green.log`; `scripts/runtime/dialog-a11y-audit.mjs` |
| task-59 | S503 listbox trigger 24x24 size | COMPLETED | `evidence/logs/s503-green.log`; `s503-audit.log` |
| task-60 | S505 W1c requests-ranking feature module | COMPLETED | `evidence/logs/s505-green.log`; `src/features/requests-ranking` |
| task-61 | S507 W1c learning-ranking feature module | COMPLETED | `evidence/logs/s507-green.log`; `src/features/learning-ranking` |
| task-62 | S509 W1c device-auth feature module | COMPLETED | `evidence/logs/s509-green.log`; `src/features/device-auth` |
| task-63 | S514 Model grouping slice | COMPLETED | `evidence/logs/s514-green.log` |
| task-64 | S516 named RouteViewContext + readback registry | COMPLETED | `evidence/logs/s516-green.log`; `s516-audit.log`; `RouteViewContext` in `view.ts` |
| task-65 | S518 control/feature route modules | COMPLETED | `evidence/logs/s518-green.log`; `s518-audit.log`; `src/features` |
| task-66 | S520 update dispatch partition | COMPLETED | `evidence/logs/s520-green.log`; `s520-audit.log` |
| task-67 | S522 decomposition cleanup slice | COMPLETED | `evidence/logs/s522-green.log`; `s522-audit.log` |
| task-68 | S527 root dashboard parity port | COMPLETED | `evidence/logs/s527-green.log`; `s527-red.log`; `src/features/overview` |
| task-69 | S589/S590 RED tests: LocalPolicy and SessionReadiness | COMPLETED | `test/s589-local-policy-wired.test.ts`, `test/s590-session-readiness.test.ts`, `evidence/logs/s589-s584-green.log` |
| task-103 | Reconcile the stale shared-task backlog | COMPLETED | This file + board status updates |

## Notes

- task-29 and task-32 are the only supersessions: the R23 per-backend storage
  factory (`5fc543af`, later cleanup `36cdd947`) owns the graph and observation
  lifecycle that those slices proposed independently.
- task-53 remains pending because the private fail-closed checker path and its
  RED/GREEN evidence are genuinely absent; the existing test/evidence do not
  prove the checker requirement in the task file.
- No tasks were deleted.
