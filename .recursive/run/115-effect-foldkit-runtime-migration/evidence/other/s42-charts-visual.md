# S42 charts: landed, verified in the browser, with a p95 defect found

Served through the packaged executable with `--static-root`, fresh temp state root, ephemeral port. To get real data I sent one request that the runtime rejected (400), which recorded a genuine failure.

## What the browser shows

- `/` renders **Runtime overview** with two SVGs, state `success`: latency axis `0 / 17 / 34 ms` with `Avg` and `p95` series, and success-vs-failure axis `0 / 0.5 / 1 requests` with `Success 0` and `Failure 1`.
- Accessible tables accompany both charts.
- Window filter: clicking **Week** sets `aria-pressed=true` on Day:false/Week:true, and the descriptive text changes to "for the last week" with the data retained.
- Empty state before any traffic: explicit "No telemetry requests in the last day." - no flat-line fake.

## Defect found by looking

The host reports `averageLatencyMs = 34` AND `p95LatencyMs = 34`, but the table renders `Avg 34 | -` and `p95 - | 34`: the p95 series is empty in the chart and the columns are misaligned. The host also exposes `averageRequestLatencyMs`/`p95RequestLatencyMs` (96/96), which the mapping ignores.

## Reference gap that remains

The reference renders **per-bucket time series** (00:00 to 24:00) for latency and volume; our charts are a **single-window aggregate**. That difference needs a bucketed telemetry read, not a chart tweak.
