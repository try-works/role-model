Run: `/.recursive/run/77-catalog-json-size-and-ui-freeze/`
Phase: `02 TO-BE Plan`
Status: `LOCKED`
LockedAt: `2026-07-18T01:11:36Z`
LockHash: `2632bd93c39edc786cc813f4d09624d3d48fd09134b4d3bae833f75ba30cf906`
Addendum: `02`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/77-catalog-json-size-and-ui-freeze/00-requirements.md` (LOCKED)
- `/.recursive/run/77-catalog-json-size-and-ui-freeze/01-as-is.md` (LOCKED)
- `/.recursive/run/77-catalog-json-size-and-ui-freeze/01.5-root-cause.md` (LOCKED)
- `/.recursive/run/77-catalog-json-size-and-ui-freeze/02-to-be-plan.md` (DRAFT)
- `/.recursive/run/77-catalog-json-size-and-ui-freeze/addenda/02-to-be-plan.upstream-gap.00-requirements.addendum-01.md` (DRAFT)
- `/.recursive/run/77-catalog-json-size-and-ui-freeze/evidence/requirements-investigation.md`
- `/.recursive/run/77-catalog-json-size-and-ui-freeze/evidence/phase2-takeover-audit.md`
- user direction on `2026-07-18` that Phase 5 must verify the rebuilt runtime by running it
Outputs:
- This addendum
Scope note: Record the locked Phase-1.5 RED-evidence gap and the failed prior Phase-2 audit, define the legal recovery path, and make rebuilt-runtime execution an explicit non-optional Phase-5 gate.

## TODO

- [x] Record the missing pre-Phase-2 RED evidence
- [x] Record the invalid prior Phase-2 audit claims
- [x] Define compensation without editing locked history
- [x] Make rebuilt-runtime Phase-5 execution mandatory
- [x] Define traceability impact
- [x] Complete Coverage and Approval gates

## Gap Statement

Locked R1 requires failing automated regressions for the confirmed critical-path and query-plan defects before Phase 2. Locked `01.5-root-cause.md` instead records R1 as blocked and defers those regressions to Phase 3. The first Phase-2 draft then proposes multiple invalid RED tests that assert current broken behavior and would pass on the baseline.

The same draft claims `Audit: PASS`, `Coverage: PASS`, and `Approval: PASS` even though recursive lint fails and the effective stream-failure addendum is absent. No product or test implementation exists in the worktree, so the legal recovery point remains Phase 2.

## Discovery Evidence

- `recursive-status.py` identifies `02-to-be-plan.md` as the next legal phase.
- `lint-recursive-run.py` reports five Phase-2 failures.
- The normalized product/test diff against `7094a252b7cab222f5ff12d1753e77cef83d6a22` is empty.
- `03-implementation-summary.md`, RED evidence, and GREEN evidence do not exist.
- `evidence/phase2-takeover-audit.md` records the complete mechanical and technical audit findings.
- Baseline owning suites pass, proving later RED tests must fail because they express the repaired contract, not because the baseline is already generally broken.

## Compensation Plan

### `B1` — Repair and lock Phase 2 before any implementation

- Rewrite the Phase-2 plan to consume both addenda and the restored investigation evidence.
- Map every base requirement `R1-R10` and addendum requirement `A1-A5` to concrete implementation, verification, and QA paths.
- Replace broken-behavior assertions with desired-behavior regressions.
- Define ordered sub-phases with checklists, exact commands, acceptance gates, and recovery notes.
- Keep Phase 2 planning-only; do not create product/test diffs while repairing the plan.

### `B2` — Recover strict TDD at the first legal Phase-3 boundary

- The first action in each Phase-3 sub-phase is a desired-behavior regression.
- Run it before production edits and capture the expected failure under `evidence/logs/red/`.
- If it passes immediately, reject or strengthen the test; do not proceed to production code.
- Capture the subsequent pass separately under `evidence/logs/green/`.
- Record the locked R1 timing violation in Phase 3's TDD compliance log; do not misrepresent it as pre-Phase-2 evidence.

### `B3` — Mandatory rebuilt-runtime Phase-5 execution

Phase 5 may not pass from unit/integration tests alone. The agent must:

1. build the runtime and UI from this worktree;
2. stage from a clean release directory;
3. start the rebuilt runtime on an isolated port and disposable runtime-state root;
4. wait for runtime readiness using the canonical readiness endpoint;
5. run Save bindings, all safe disposable Eject cases, Models-to-benchmark navigation, rich-history/candidate delay controls, and committed-stream failure recovery;
6. verify `/healthz`, one unrelated lightweight API, and a real UI route remain responsive during and after each scenario;
7. capture timings, request counts, transferred bytes, query plans, browser evidence, and runtime logs under the run evidence tree;
8. verify the rebuilt/staged assets contain no obsolete bundle that imports the retired full-snapshot or rich-history route fanout;
9. stop the rebuilt runtime cleanly and record the process/port/state-root cleanup result.

If configured Kimi OAuth is available in the isolated state, Phase 5 must run the live Kimi K3 success path. If it is unavailable, deterministic Kimi streaming coverage remains mandatory and Phase 5 must record the exact live blocker without inventing a live pass.

## Impact

### Current phase

- The prior Phase-2 audit verdict is invalid and must be replaced after repair.
- `02-to-be-plan.md` must list this addendum under `Inputs`, `Effective Inputs Re-read`, and `Earlier Phase Reconciliation`.
- The plan must cite `evidence/phase2-takeover-audit.md` and the restored requirements investigation.

### Later phases

- Phase 3 must explicitly disclose that the earlier R1 timing criterion was missed and show strict RED-before-production recovery for every sub-phase.
- Phase 3.5 is required because the effective scope spans SQLite, UI, streaming response ownership, telemetry, catalog wire format, and packaging.
- Phase 4 must reject any implementation slice without distinct RED and GREEN evidence.
- Phase 5 must run the rebuilt runtime as defined in B3; it cannot be satisfied by source-server or fixture-only proof.

## Traceability Impact

- `R1` -> `B1`, `B2`; preserve the root-cause chain and recover strict TDD truthfully
- `R2-R9` -> `B1`, `B2`; replace invalid RED plans with desired-behavior tests and ordered gates
- `R10` -> `B3`; mandatory rebuilt-runtime and clean staging proof
- `A1-A4` -> `B2`, `B3`; deterministic stream failure tests plus rebuilt-runtime recovery
- `A5` -> `B2`; retain `/proc/1513/fd/63` as a pre-execution negative control only

## Earlier Phase Reconciliation

- Locked requirements and root-cause findings remain authoritative for the SQLite/UI freeze.
- The missing timing of R1 regression creation cannot be retroactively repaired. This addendum records the violation and defines the earliest legal compensation.
- Addendum 01 remains authoritative for the separate post-commit stream failure.
- No locked artifact is modified by this recovery.

## Coverage Gate

- [x] Missing RED evidence and invalid audit claims are explicit
- [x] The legal recovery point is established mechanically
- [x] Strict TDD compensation is concrete and auditable
- [x] Rebuilt-runtime Phase-5 execution is mandatory and reproducible
- [x] Base and addendum requirement impacts are mapped

Coverage: PASS

## Approval Gate

- [x] Recovery preserves locked history
- [x] No implementation is authorized before Phase 2 locks
- [x] Phase 5 cannot pass without running the rebuilt runtime
- [x] The addendum is ready for Phase-2 effective-input reconciliation

Approval: PASS
