# S669 - R18 current receipt set (post real-model verification)

## Identities
- Public HEAD (this worktree): 7956435a (after S664-S668 UI fixes and the real-model evidence).
- Packaged candidate (exe): 0.0.20-761-g3f7779fb, exe sha256 5e0810c0..., public tree 172fab4c.
  NOTE: the exe predates the S664-S668 UI fixes; they are served from the worktree client build
  (dist/client main.js 3,739,830 bytes, built at 6d492b56). A full runtime:package-sea rebuild is
  required to bake them into a new exe.

## Slice receipts (evidence for the rows they cover)
- R6 packaged-closure receipt: 30 entries, exe 5e0810c0 (r6-receipt-final).
- R21 packaged/browser diagnostics: stale/dropped/build-missing/cause.fail (r21-diagnostics-final).
- R37 HTTP + DB preservation + shell registry: releaseId 0.0.20-761 (r37-*).
- R16 fresh R-vs-C: R 0.0.20 (exe 718d71f5) vs C 761 (exe 5e0810c0), 0 regressions
  (r16-fresh-r-vs-c-receipt.json).
- Real-model verification on :3480: s667 (5 real models, streaming, 4 routing modes, role header,
  restart durability, capture/observe, benchmark run starting at model 1/2).
- S664/S665/S666/S668 UI fixes: commits d2bc3081 (S664), 17b6b5fe/6e4fa7ae (S665), e4b576eb/93c515e7
  (S666), 161b340b (S668 off-by-one), 6d492b56 (S668 poll failure); tests s664 5/5, s638 8/8,
  s642 4/4, s397/s401/s425/s459/s26k all pass.
- FINAL-PACKAGE.json remains the authoritative packaged-candidate receipt.

## Retired / superseded
- r14-packaged-parity-b3d5bcf4/c0021a3f/0a0aebcf/40439dbb — superseded by the 761 build + e07b60c3
  shell registry.
- r28-r29-lockstep (0.0.20-711) — superseded by the 761 package.
- r5/r6 receipts at 544a2c9f/807900de — superseded by the 761 receipt.

DISPOSITION: PARTIAL — a canonical receipt set exists at the current HEAD and the packaged candidate
is pinned; the only open item is a full package-sea rebuild so the S664-S668 UI fixes live inside a
single exe rather than being served from the worktree client. No stale receipt is claimed as current.
