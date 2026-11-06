# S309 — B3/R24 maintenance drain/fence Lead acceptance

- Reviewer: s9 (deepseek-flash) FINAL PASS after two HOLD rounds — evidence/other/s308-b3-maintenance-review.md sha256 `544146DF93068F7F43B7BDBD9F3D7DBBD3BB361FE47568BC9FD98429DC186DBA`.
- Frozen bytes verified by Lead: service.ts `7B771085F7C0A0BDD3C77CB2703AC38AFEFF6BBBFA0FA76C6D680C3DCC8CC221` (26542 B), test `F90C70227E4A8C19A8D15A38B32DF5EE44711CEC0ED76012B5F5C2291278B105` (9923 B).
- Lead suite: `corepack pnpm --filter @effect/sql-sqlite-node exec vitest run` → 5 files, 48 passed (48).
- Lead lint: new test clean; service.ts retains the same 5 pre-existing findings as HEAD (33/34, 225, 249, 310 — line-shifted only).
- Closed semantics: synchronous maintenance-slot reservation before any await; typed MAINTENANCE_BUSY / MAINTENANCE_DRAIN_TIMEOUT / MAINTENANCE_INVALID_BUDGET / MAINTENANCE_PRAGMA_UNVERIFIED; bounded drain never force-closes; refused drains write NOTHING to the live connection (drained guard); normal reset/restore re-apply + verify per-store PRAGMAs (busy_timeout, journal_mode, foreign_keys, synchronous, cache/temp/locking/auto_vacuum/wal_autocheckpoint); backup = VACUUM INTO; DatabaseSync stays blocking; lock probe measured (106 ms / 7 ticks at 100 ms bound).
- R24 disposition: maintenance drain/fence + PRAGMA preservation now proven for the SQL package. Async observation/graph hydration remains the B6-serialized Lead integration (characterized by s9b: evidence/other/s307-r23-async-observation-gap.md, 24 callers, 21 sync-at-call-time, named follow-on gated on Backend extraction).
