# S13b Crease pin test and the first chart primitive (public, R9/R10)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The controller added a commit-only acquisition mode to `scripts/vendor-upstream.mjs` and vendored Crease at the reviewed SHA. It is now in `vendor/crease` (1512 files, 13.3 MB, digest e37e001fd8ba4a9f2f4e530ea391ca288472251d3a0b6b4450e55e6b666c6bed).

## Read first
1. `vendor/crease/VENDORED.json`, `vendor/crease/src/ui/chart.ts`, `vendor/crease/src/lib/echarts.ts`, and `compatibility.json`.
2. `scripts/foldkit-vendored.test.mjs` for the pin-test style, and `scripts/vendor-upstream.mjs` for the new `refMode: "commit"` entry.
3. `00-requirements.md` R9 and R10 (the chart surface and its lifecycle/render policy).

## Required work
1. `scripts/crease-vendored.test.mjs` in the same style as the Foldkit pin test: manifest commit/date/licence, payload root and includes, digest recomputed with the tool's own algorithm and stable across two runs, no node_modules or .git, and an assertion that the entry declares the commit-only mode (so a future tag pin without one is visible).
2. A chart primitive in `role-model-router/packages/ui/src/` that is React-free and renderer-agnostic: pure SVG markup for a line or bar series derived from the vendored helpers' approach, with RM3 token colours and an accessible text alternative describing the series (the vendored docs require a meaningful HTML alternative for a canvas renderer).
3. A Scene test asserting the rendered structure (axes/series elements, token classes) and the text alternative; a second test that an empty series renders an explicit empty state rather than an empty chart.
4. Do NOT add ECharts or any canvas dependency, and do not import the vendored `echarts.ts` runtime path in this slice. State that the mount-based lazy renderer is the next slice (R10).

## Files you may write
- `scripts/crease-vendored.test.mjs`
- one new chart module under `role-model-router/packages/ui/src/` plus its Scene test
- `evidence/logs/s13b-*` and `evidence/other/s13b-tdd.json`

Do not touch `vendor/**`, the vendoring tool, root, lockfile, other packages, the existing tests, or the private repo.

## Strict TDD
Placeholder: write the pin test first (it passes now that the vendor exists) and the chart tests before the module. Capture a behavioural RED for at least one chart assertion - for example a wrong token class or a missing text alternative - not only a missing-module RED.
Report: pin assertions, chart API and the vendored approach it follows, RED/GREEN, counts, typecheck exit, and what R10 still needs.