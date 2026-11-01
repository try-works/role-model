# R14 rendered wave — React capture-load fix + React-vs-Foldkit pixel evidence

Date: 2026-11-02. Artifact: role-model-dev.exe 0.0.20-505-ge0b1800a (manifest sha 6d90b28aa2092e7af074324e7f1f0cc5c30d3d9d039c1a0ee25524aa52eea3ed). Worktree head at run: 57f62d2e.

## Defect and fix
- Defect (measured earlier): React capture run0 was a blank/loading PNG (5,852 bytes) while run1 was the loaded page (84,738 bytes), so the lane honestly failed with `nondeterministic: react`. The old readiness probe only checked readyState/fonts/images/DOM quiet, which a loading shell satisfies.
- Fix: a loaded gate in `scripts/runtime/parity-capture.mjs` — the page must contain a `<main>` and at least 200 visible characters (`minLoadedTextChars`) before the quiet-window and stability capture may run. The gate is bounded by the existing capture deadline. A page that never reaches it raises `capture_not_loaded`; `scripts/runtime/parity-selfcheck.mjs` maps that to **NOT_RUN (exit 2)** with reason `capture-not-loaded: ...`, never a FAILED pseudo-capture or a fake pass. Any other capture error stays FAILED.
- TDD: RED in `evidence/logs/r14-capture-load-red.log` ("does not provide an export named 'isLoadedPayload'"), GREEN in `evidence/logs/r14-capture-load-green.log` after the gate and the NOT_RUN mapping were implemented.

## Lane verdict (full run, CHROME_PATH set)
`r14-rendered-wave-fix-57f62d2e.log` — status PASSED, exitCode 0.
- react determinism: PASSED — both runs sha256 `0e1cf45f6765100e92e3ee791bbd8acd3a837893e6f6e865e274122b4f604c6f` (84,805 bytes each). The loading capture is gone.
- foldkit determinism: PASSED — both runs sha256 `66e2d614cf9eddc4914f785d86058517363e7a3e2d42d530cb18067f33c07a0a` (64,907 bytes each).
- reactVsFoldkit: `{"classification":"different","equal":false}` — the two builds are **not pixel-identical**. This is recorded honestly, not forced: the lane's acceptance gate is determinism; the dual-build equality is reported as data.
- What the delta means: the React reference shell and the Foldkit port render different pixels even with the same frozen clock/RNG, viewport and static-root serving. The lane compares exact PNG bytes (no perceptual threshold and no image decoder in the lane), so this file makes NO pixel-count or perceptual claim; the vision sign-off (evidence/logs/visual-signoff-afda292e.log) separately records the React-vs-Foldkit visual delta and rates it data-state-dominated, not a design-match acceptance.

## Captures (committed, byte-identical across two runs each)
- evidence/other/s294-captures/react-run0.png, react-run1.png — 84,805 bytes, sha 0e1cf45f...
- evidence/other/s294-captures/foldkit-run0.png, foldkit-run1.png — 64,907 bytes, sha 66e2d614...

## What remains
R14 still does not have a *perceptual* pixel-diff number or a chart-only delta classification; that needs an image decoder/perceptual comparison layer and owner-approved thresholds. This wave fixes the load-timing defect, proves per-build capture determinism and records the honest React-vs-Foldkit "different" verdict.
