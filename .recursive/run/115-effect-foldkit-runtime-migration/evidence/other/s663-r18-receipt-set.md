# S663 - R18 current-SHA receipt set consolidation

R18 requires receipts to be re-hashed after changes and stale/misnumbered receipts reconciled.

## Canonical identity (final)
- Candidate: 0.0.20-761-g3f7779fb, exe sha256 5e0810c0..., public tree 172fab4c, private manifest 7cc4b103...
- Public HEAD: 70f13e2a (docs-only after build: s661/s662 ledger updates).
- FINAL-PACKAGE.json is the single authoritative receipt tying every slice to this candidate.

## Receipt set (all regenerated against the FINAL candidate, or superseded)
- R6  packaged-closure receipt (30 entries, exe 5e0810c0) — r6-receipt-final
- R21 packaged diagnostics receipt (cause.fail/42 records/stale+dropped) — r21-diagnostics-final
- R37 HTTP + DB-preservation + shell-registry (releaseId 0.0.20-761) — r37-*
- R16 fresh R-vs-C receipt (R 718d71f5 vs C 5e0810c0) — r16-fresh-r-vs-c-receipt.json
- FINAL-PACKAGE.json (version/exe/public+private tree/private manifest)

## Stale receipts — explicitly retired (superseded, not evidence for the final candidate)
- r14-packaged-parity-b3d5bcf4.log / r14-selfcheck-surface-packaged.log (c0021a3f/0a0aebcf) — superseded by r14-selfcheck-surface-e07b60c3 + final build.
- r14-packaged-parity-40439dbb.log — superseded.
- r28-r29-lockstep (0.0.20-711) — superseded by the 761 consolidated package.
- r5/r6 receipts at 544a2c9f/807900de — superseded; the 761 receipt regenerated all entry hashes.

DISPOSITION: PARTIAL — a canonical receipt set exists at the final candidate; a full machine-enforced
receipt re-hash of EVERY historical slice (with a failing test on any stale reference) was not
produced. The canonical FINAL-PACKAGE.json + the per-slice receipts above are the current-SHA set.
