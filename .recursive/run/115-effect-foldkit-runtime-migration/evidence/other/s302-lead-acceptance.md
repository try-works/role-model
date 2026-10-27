# S302 — R19/B0 inventory correction Lead acceptance

- Reviewer: s9 (deepseek-flash) FINAL PASS — evidence/other/s301-r19-correction-review.md sha256 `EEF070EC719C52F58AF1DBD038893E5375A0D4FABF8B11CB31B2DF51C21E27DF`.
- Frozen bytes verified by Lead: test `62EFA2B6B7F19EF33456C0BF298C14DF0D830A59B1204E40E2D3BAE335C53961` (11940 B), json `B451276D2389D8CA7BF8F98A9D1C6BD4C8A0529A538ADE905F9C40AD336A47AF` (23291 B).
- Lead machine-check: 7/7 green.
- Structured guard confirmed: issue-code validator rejects any sqlite-area exclusion, requires >=7 SQL entries with package-path citations and all 7 product-caller lines; reworded-negative test feeds a reworded false exclusion through the SAME path and asserts rejection (RED first, s300-red2.log).
- Disposition truth confirmed: sql-service-make-sync corrected to `pure` with recorded body evidence (synchronous factory, no Effect in its own body); final SQL counts 5 existing-effect / 6 pure.
- Lint note (explicitly retained, not laundered): the test file carries 9 PRE-EXISTING no-runtime-typeof findings at lines 32-108 — the hand-rolled JSON I/O-boundary validator itself (parse-at-boundary checks). s9 verified the same 9 exist in the committed baseline at 84a5c1fd and this slice adds none. Retained as the established boundary pattern; re-verified with an explicit-rule lint run by the Lead.
- Non-blocking note adopted: the guard rejects any excluded area matching /sqlite/i — broader than sql-sqlite-node; a legitimate future exclusion of a different SQLite package would need narrowing. Recorded, not blocking.
- Named follow-on unchanged: body-verify the remaining 16 pre-existing inventory entries per area before R19 moves beyond PARTIAL.
