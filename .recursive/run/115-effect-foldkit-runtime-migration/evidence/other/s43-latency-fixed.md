# S43 latency fix verified in the browser

Rebuilt client served through the packaged executable with `--static-root`, fresh temp state root, one real request recorded (400 -> failure 1), summary `averageLatencyMs = 36`, `p95LatencyMs = 36`.

## What the browser now shows

```
Latency (ms)   Average 36   p95 36
Success vs failure   Success 0   Failure 1
```

- SVG axis labels: `0 ms / 18 ms / 36 ms`, point labels `Average` and `p95`.
- **Zero em-dash placeholders** anywhere on the page (the defect was two dashes before).
- The split fixture (`averageLatencyMs=10`, `p95LatencyMs=90`) pins distinctness; swapping the two values fails `s40b-red-latency-swap.log`.
- Root causes were named, not papered over: a doubled backslash in the p95 regex made it `NaN`, and two separate one-point series forced alternating value/dash cells in the table. Both series are now one `Latency` series with two labelled points.

## Reference gaps that remain

1. **Per-bucket series**: the reference plots latency and volume across `00:00-24:00`; ours is a single-window aggregate. This needs a bucketed telemetry read, not a chart change.
2. **Per-model rail counts**: the reference lists model rows with request counts (320/33/31); our rail shows a single model count.
3. **Studio**: blocked on four `/v1` host endpoints that do not exist.
