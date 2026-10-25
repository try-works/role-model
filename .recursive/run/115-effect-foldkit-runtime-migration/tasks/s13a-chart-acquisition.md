# S13a chart acquisition and a React-free chart primitive (public, R16)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
R16 is the chart surface. The research pin is Crease UI commit bb447e363e9c717bf11ebb10b2259f053bff6f71 (MIT), whose src/ui/chart.ts and src/lib/echarts.ts are React-free pure SVG helpers plus a lazily imported ECharts 6 renderer with Mount/acquireRelease, resize/theme observers and cleanup.

## Read first
1. 00-requirements.md R16 and any surrounding chart/design clauses.
2. The Foldkit digest evidence/other/foldkit-0.169-api-notes.md sections 2 and 3.
3. The existing primitives role-model-router/packages/ui/src/foldkit-*.ts for shape.

## Required work
1. Acquire the Crease source at that exact commit into vendor/crease/ using the existing vendoring tool scripts/vendor-upstream.mjs (add an UPSTREAMS entry; do not hand-copy). If the tool cannot express this repository, say so precisely and stop rather than inventing a second vendoring path. Verify the commit resolves to the pinned SHA before trusting a tag, and record the payload digest.
2. A maintained pin test beside the existing ones, in the style of scripts/foldkit-vendored.test.mjs (manifest fields, commit, digest recomputation, no node_modules or .git).
3. A first chart primitive in role-model-router/packages/ui/src/ that is React-free and renderer-agnostic: pure SVG markup derived from a data series and RM3 tokens, with a Scene test asserting the rendered structure and an accessible text alternative.
4. Do NOT add ECharts as a dependency in this slice and do not bundle a canvas renderer. The mount-based lazy renderer is a later slice; say so.

## Files you may write
- scripts/vendor-upstream.mjs (UPSTREAMS entry only), vendor/crease/** produced by the tool, scripts/crease-vendored.test.mjs
- one new chart module under role-model-router/packages/ui/src/ plus its Scene test
- evidence/logs/s13a-* and evidence/other/s13a-tdd.json

Do not touch root, lockfile, other packages, the private repo, or any existing test.

## Strict TDD
Pin test first (it should fail before the vendor exists), then the chart test. Report: resolved commit proof, digest, licence, what you vendored, RED/GREEN, and what the chart primitive deliberately does not do.