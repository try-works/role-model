# S373 — B1 production query source Lead acceptance

- Reviewer: s9 (deepseek-flash) FINAL PASS after two lint HOLD rounds — evidence/other/s372-diagnostics-query-source-review.md sha256 `E08BD3DD656B0F8D21CDAB38B5F22694965A786F142C3E1FF101AF19647BDF8A`.
- Committed bytes verified by Lead: composition-dag.ts `839ACB95D04318F2BCB8ECAEABA510B5BB0FA7E5F9F4C32B6741B930C30DBEB6` (76138 B), index.ts `8A26D4CAA204B5193934A7E8D422D5F6541FF68518EF3870DB12CD95A9DA300C` (1371393 B), s369 test `66717F6B636133B082E9E035838EEFA66383D1C88D6051FB5E5770F7E6E9B209` (4114 B).
- What landed: BackendStorageContract.diagnosticRecords() over the backend-owned telemetry store (failure→error / unknown→warn mapping, hard cap 50, [] on query error); the composition root lazily resolves the SAME backend storage via the ref under the enabled+calibration gate (identity test: spy once, no second construction); the read contract stays the caps/staleness authority; route unchanged. 34/34, tsc 0, lint clean.
- This closes S365 gap 2. Gap 3 (real defect readback) remains the named follow-on (S365c).
