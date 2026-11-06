# S299 — mutation slice + B0/R19 inventory Lead acceptance

## Mutation slice (S297/S298)

- Reviewer: s9 (deepseek-flash) FINAL PASS on corrected final bytes — evidence/other/s298-r14-mutation-review.md sha256 `1418E3A34A7CCDF000EBDEA4712D5766C33AA14E9739D8E0D0096329341D2D74`.
- Frozen bytes: runner `99A57A6B4F245A9F19AE493B305E95760ACA031D45D12E272A7DF9C3C151CB21` (29070 B), test `792AC15974E02F0AC33FE4D9BE6282CE5A3566A0853B0D58847EE9B3FC7C9531` (18048 B), dispatcher `C682467D…` byte-unchanged (--selfcheck branch untouched).
- Lead verification: anti_slop_lint clean (both files); unit suite 27/27 under E: TMP; s297-real2.log exit 0 PASSED (baseline `560ec387…` run0==run1, mutant `fe8ea8fe…`, detected true, noFalseMutation true, ignoredCount 2, one-class `.flex{display:flex→block}` in shipped React CSS, detection sha-only).
- §6.4 status: mutation check now runs at the shipped-artifact level (task-authorized option a). Named follow-on for the full source-level check is recorded in the evidence doc (source class change → rebuild React → confirm emitted → capture/recompare). §6.5 scenario matrix and §6.4 source-level check remain named later slices.

## B0/R19 inventory (s9b read-only analysis, Lead-verified)

- Docs: s298-b0-r19-public-inventory.md sha256 `0aadd5dae68e75466aa4c49d1e587da4329841e5349dbaba97ad3d70b943b5fe`; s298-b0-r19-private-inventory.md sha256 `9737dd1d85249f847d37fcf6b8c89bb3c96a966cccee1768026928373895ad8d`.
- Counts: public 137 operations enumerated (134 with product caller, 3 not-read); private 110 methods (90 callers, 20 not-read). Public build script scripts/track-b/build-runtime-distribution.mjs absent from the PUBLIC tree (it lives in the private repo) — recorded, not inferred.
- SQL exclusion verdict: **FALSE**. The s4-contracts-inventory.json claim ("Effect SQLite service has no product caller in the public host today (its callers are package tests only)") is refuted. Lead re-verified the 7 actual product imports directly: cli.ts:11, index.ts:19, queue-runtime/admin.ts:19, queue-runtime/store.ts:18, route-challenge-evidence.ts:2, route-ladder-census.ts:3, track-b-runtime.ts:30 (all `@effect/sql-sqlite-node`).
- Named follow-on author slice: replace the false s4 exclusion, body-verify dispositions (not signature-only), and bind the private ledger before R19 can move beyond PARTIAL.
