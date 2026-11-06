# R9/R10 chart resize, live update and lifecycle

Status: GREEN for the pure Foldkit SVG chart. Policy is CSS-only; no observer, canvas, mount,
font measurement, DPR or timezone read exists in the renderer.

## Resize policy
- `CHART_RESIZE_POLICY = "css"` and `data-chart-resize-policy="css"` on the served SVG.
- The SVG keeps its intrinsic `0 0 640 <height>` viewBox and scales through `w-full max-w-[640px] h-auto`
  plus `preserveAspectRatio="xMidYMid meet"`. A zero-width host therefore collapses visually without
  producing NaN coordinates or a host measurement; there is no observer to mount or unmount.
- Test: `packages/foldkit/test/s651-chart-resize-live-lifecycle.test.ts` asserts the policy attribute,
  stable zero-size viewBox, and the absence of ResizeObserver/requestAnimationFrame/geometry/font/DPR/
  Date/Intl reads in executable chart source.

## Live update
- The same chart instance is re-rendered from a changed model; obsolete series disappear from the SVG
  and accessible table, the new labels/values appear, and the resize policy stays. Covered by the
  same-instance Scene test; the existing S13e stale-token test remains the obsolete-async fence.

## Lifecycle matrix
- `CHART_LIFECYCLE_DISPOSITIONS` declares every required item:
  mount/unmount (pure view, no mount/effect/listener), hidden/zero-size (CSS-scaled finite viewBox),
  font readiness (no measurement/fonts read), fixed DPR/timezone (no ambient read),
  repeated-mount heap (no module state; 50 repeated renders byte-identical, heap not instrumented),
  raster animation (N/A: no raster surface).
- Deterministic render test changes DPR to 3 and TZ to Pacific/Kiritimati and asserts 50 mounts remain
  byte-identical.
- Owner approval for the pure-SVG N/A dispositions (notably heap instrumentation and raster animation)
  is recorded as the remaining sign-off item, not as a fabricated pass.

## Parity harness
- `packages/ui-parity/src/chart-render-change.ts` captures only `svg[data-chart-part="chart"]` and
  classifies `same` / `approved-chart-change` / `unapproved-chart-change` / `invalid-capture`, with
  separate `chartChanges` / `approvedChartChanges` counts. It is exported from the harness package
  and unit-pinned in `test/chart-render-change.test.ts`.

## Verification
- RED: `evidence/logs/r9-chart-lifecycle-red.log` (3/4 new checks failed before implementation).
- GREEN: `evidence/logs/r9-chart-lifecycle-green.log` (21 chart tests + 3 chart-policy tests).
- Full runtime-ui-next suite: 122 files / 1027 tests passed with `vitest run --pool=forks
  --poolOptions.forks.singleFork=true`; node invariants 21/21; tsc 0 for ui-parity, runtime-ui-next,
  runtime-ui.
- Commits: RED `e5005fcc`; GREEN `843ba8df`.
