# S487 — R33 ledger schema v2 + fail-closed checker

Status: pending
TDD Mode: strict
Private basis b8733789; public 3299ad00; paired00-worktree authority unchanged.

Gap (S486 trace): ledger evidence/other/s344-b10-ledger.json has 15 surface entries, 34 pending operations across 4 groups, 3 unenumerated notYet groups; checker scripts/track-b/ledger-check.mjs:26-90 does not require per-operation dispositions and does not reject non-empty pending/notYet; run115-b10-ledger-check.test.mjs certifies the incomplete ledger as passing. Missing R33 field groups: repo/owner/lease/fence/B/M/task/R IDs/RED/GREEN/refactor/CI/source/build/rollback; 17/34 operations have no caller.

Repair (PRIVATE ledger + checker + tests ONLY; no product code): schema v2 with per-operation rows carrying the full R33 field set; enumerate the 3 notYet groups as operations with honest dispositions; retire pending/notYetEnumerated; checker fails closed on missing required fields, undispositioned operations, and non-empty pending groups; keep surface entries as rollups. Ledger values must be factual against current source - do not fabricate dispositions; mark truly-unconverted operations with explicit not-converted dispositions and cite the missing contract.

Strict RED first: run115-b10-ledger-check must FAIL today (incomplete ledger currently passes) with a concrete message listing missing fields/undispositioned operations. Then implement; all ledger/checker tests green + node --check + anti_slop_lint abs effect:true nonempty on changed files. No commit; freeze hashes; independent review by a different member; no whole R33/B10 completion claim.
