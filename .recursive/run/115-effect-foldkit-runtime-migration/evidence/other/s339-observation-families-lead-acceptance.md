# S339 — R23 remaining families Lead acceptance

- Reviewer: s9 (deepseek-flash) FINAL PASS after one HOLD round — evidence/other/s338-observation-families-review.md sha256 `B56D49F8F29432602BF349AC34310D31D4B293AAEEE7379DA3366DBE0C08D570`.
- Committed bytes verified by Lead: composition-dag.ts `C6FF534373CC8DB0DCD946C9466E136E8FD41EBFD1A8A9082A39A41C48C17612` (71866 B), index.ts `0064D1BC3D7F61AD6A8716F100C0420309874310C07063085FDDE03EB07D5DB6` (1369371 B), s337 test `3F043FD418739F0AE3B326FF48A231F9D22D5DC25A7106E14EEF25257B93ECF3` (2600 B), s334 test `00A72B143BB07BD454F1DF1854EFD662661844848CAA1961AC84F91A6D1FAC22` (6111 B).
- Lead verification: the two storage suites green; author/reviewer report 29/29 affected, tsc 0.
- What landed: readHydrated(key, read) — miss reads sync ONCE then enqueues hydration under the same key; all six read families (telemetry summary/sources, observed-profiles, per-endpoint buckets, live scores) now populate the cache with collision-free keys (live scores keyed endpoint+window+minSamples); persist families write-then-hydrate. Graph-store remains a characterized STOP (next Backend factory split).
- R23 remaining-families follow-on is closed; the only R23 residual is the graph-store family (named Backend factory split).
