# S489 — independent review: S487 R33 ledger schema v2 / fail-closed checker

Reviewer: `s9-private-readonly`, actual model **deepseek-flash** (verified via list_agents). Read-only source/test/evidence; no edits, no commit.

## Frozen bytes

- private `scripts/track-b/ledger-check.mjs` `E054D5C1D815E6C24B676FEC319DACB87378C7B4584B2952234FA4A0CFADD64A` (6116 B)
- private `tests/track-b/run115-b10-ledger-check.test.mjs` `03372A58FDA4831C54C109BE297CA11976E9A0426EA752B46DC1E989D8D52E84` (3458 B)
- private `tests/track-b/run115-b10-ledger-schema-v2.test.mjs` `E0E2427DC718B52C786E3FA2B412CEA7673D1250A5FF2DFE5545050B73AAD19F` (3137 B)
- ledger hash `2EFE6125A9166610C60E208358C98703A3CA06FAA46D4AF8CBE6AE3D96C7FC9F` (81886 B) matches the private worktree copy at `.recursive/run/.../evidence/other/s344-b10-ledger.json`; I found no public-worktree copy at the task's stated public path.

## Schema/checker verification — PASS bounded

- Ledger is `role-model.private-operation-ledger.v2`: 15 surface rollups and 37 operation rows; no `pending`/`notYetEnumerated` properties.
- Every operation has the required groups: id/operation/surface/repo/path/export/owner/disposition/runtime/traceability/evidence/release; runtime has service/layer/scope/errorWire/cancel/transaction/lease/fence; traceability B/M/tasks/R; evidence red/green/refactor/ci; release source/build/reviewer/rollback.
- 20 callerless operations are explicitly disclosed with `callerStatus:"unresolved"` rather than fabricated callers.
- All 7 `not-converted` rows carry a `missingContract` rationale; no fabricated disposition was found.
- Checker is fail-closed: rejects non-v2, missing field groups, unknown/undispositioned operations, callerless without callerStatus, not-converted without missingContract, converted without service/open citation, and non-empty reintroduced pending/notYet groups.
- RED: `s487-red.log` 5/5 failed against the old checker/ledger; the legacy v1 incomplete fixture is kept as a negative.
- GREEN: 2 files / **10/10 passed**; `node --check` exit 0. Lint all changed files **0**.

## Important residual (not a whole-R33 pass)

The three `not-yet:*` rows are honest group-level disclosures, not concrete operation enumerations: their path/export are `(unresolved)` and `missingContract` says operation enumeration/per-operation owner/caller evidence was not performed. The 37-operation count is 34 enumerated + 3 group placeholders. Likewise many fields carry `not-recorded` evidence/build/rollback values and 20 callerless rows are unresolved. This is a fail-closed, non-fabricated ledger, but it is **not** an R33/B10 completion: the checker accepts the disclosed gaps by design, and the remaining groups still need enumeration, caller/owner evidence, and real RED/GREEN/CI/reviewer/rollback values in a later slice.

## Bounded verdict: PASS for the v2 fail-closed ledger/checker repair

The ledger now honestly reports its remaining gaps, and the checker rejects the old incomplete shape and the specific missing-disclosure cases. This is not whole R33/B10 completion; no product/runtime behavior was changed.

No source/test/config file was modified; no commit.

