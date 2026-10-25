# S59 gap rendering, a11y and packaging: verified state

## Verified by the lead

- `git diff --stat` shows the claimed files: `build.mjs`, `message.ts`, `update.ts`, `view.ts`, `style-build.mjs`, the three test files, and `packages/ui/src/foldkit-chart.ts`.
- **Client suite serial: 199 / 199 tests, 20 files.** (Earlier the same suite was 194/197 under full parallelism with 5 s timeouts - so the serial number is the one to trust, and it is now the reported number.)
- **a11y in the browser**: `role=tablist` = 1, `role=tab` = 5, `aria-selected` true on the first tab only, `aria-controls` on all five, `role=tabpanel` present.
- **Rail dash reason is real text**, not only a title: `.sr-only` contains "Cache percentage unavailable: no requests in the window or telemetry is loading".
- Focusable chart points exist (`tabindex=0`).

## Gap rendering (fixed this slice)

`ChartPoint.value` is `number | null`; a null point breaks the path segment and draws no circle; `bucketsFor` emits all 24 hourly buckets; the accessible table shows `-` for an empty bucket. The test asserts the 02:00 dash row, the absence of a 02:00 circle and at least two `M` segments in the path - and the RED (replace null with 0) fails, so the test is not vacuous (`s56a-red-gap-bridge.log`).

## Packaging: partial, stated as partial

- Fonts now copy from repo-owned `runtime-ui/public/assets/fonts` instead of the legacy build output, and the build test asserts that path and the absence of the legacy path.
- `style-build.mjs` fails loudly with an actionable message when the Vite/Tailwind deps are missing.
- **Not self-contained yet**: CSS generation resolves Vite/Tailwind from `runtime-ui/node_modules`, and no clean-build-without-those-deps proof exists.

## Studio: unchanged limitation

A successful chat/image/audio generation still needs a configured upstream or real weights. The packaged host answers the honest 400; Advanced now posts to the host-served `/v1/responses`.
