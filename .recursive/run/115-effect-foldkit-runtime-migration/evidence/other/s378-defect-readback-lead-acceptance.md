# S378 — B1 real defect readback Lead acceptance

- Reviewer: s9 (deepseek-flash) FINAL PASS after one HOLD round — evidence/other/s377-defect-readback-review.md sha256 `6B041BAFE2D1C482502922B43FD596276307177184788CE0597FDCFFCBE0916F`.
- Committed bytes verified by Lead: index.ts `2FD69C22127E61CD8356D68CDA3097CAF0300B19ADF943147ED3887F7411CE18` (1372777 B), s374 test `714B172695725889268E5959057D8025F24F5C8EA33345677C2B853CD852278` (4549 B).
- What landed: an injected defect flows edge → backend-owned telemetry store → diagnosticRecords() → the authorized read path (bearer + operator context), with single-source selection (persisted row canonical when the store is bound; writer fallback only when unbound) so exactly one visible record per defect; 4xx exclusion and default-off preserved; the persist is best-effort. 37/37, tsc 0, lint clean.
- B1 (R20/R21) is now COMPLETE: gap 1 calibrated Cause/error edge (e8cd28ff), gap 2 production query source (6c0d47a0), gap 3 real defect readback (this commit); R21 security clauses were already satisfied per S365.
