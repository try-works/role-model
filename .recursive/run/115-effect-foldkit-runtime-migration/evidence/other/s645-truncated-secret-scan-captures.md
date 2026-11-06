# S645 - Truncated secret-scan captures preserved

Four `secret-scan.json` captures under `evidence/review-0.0.20-*` were written by the scanner as
partial JSON (the scanner process ended mid-object; each file is 333-470 bytes and stops inside
`patterns`). They were never valid JSON, so their bytes are preserved unchanged under
`secret-scan.truncated-capture.txt` in the same directories instead of being edited or deleted.

- evidence/review-0.0.20-670-g26f21e01/secret-scan.truncated-capture.txt (470 bytes)
- evidence/review-0.0.20-676-g29dfe8ea/secret-scan.truncated-capture.txt (398 bytes)
- evidence/review-0.0.20-680-g82c13ca9/secret-scan.truncated-capture.txt (348 bytes)
- evidence/review-0.0.20-684-g41d60424/secret-scan.truncated-capture.txt (333 bytes)

The completed scan results for those artifacts are recorded in the corresponding closeouts and
workflow reports (for example s633/s634/s638/s640/s641/s642 in `evidence/other/`). Renaming keeps the
capture bytes immutable while restoring the trackable-JSON invariant checked by
`packages/schema-tools/test/recursive-evidence-json.test.ts`.
