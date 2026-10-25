# S45 bucketed charts and per-model rail, verified in the browser

Served through the packaged executable with `--static-root`, fresh temp state root, three real requests seeded (two successes on one model, one failure on another).

## What the browser shows

```
Latency (ms)         08:00  65 (average)  140 (p95)
Success vs failure   08:00  1 success     2 failures
Rail: Models 3 | Requests 3 | Cache 33% | http://127.0.0.1:5790/v1 | decision_only
      moonshot/kimi-k2.5  2
      claude-3.7-sonnet  1
```

- Axis labels are **bucket labels** (`08:00`), matching the reference style, with only non-empty buckets drawn - an empty bucket is omitted, never a fabricated zero point.
- Per-model rail rows carry real counts, matching the reference pattern of `model N`.
- Cache is 33% (1 cached of 3) rather than a dash, so the rail now exercises the computed path too.

## Bucketing rule under test

| Window | Bucket | Label |
|---|---|---|
| Day | 24 x hourly | `HH:00` |
| Week | 7 x daily | `MM-DD` |
| Month | 30 x daily | `MM-DD` |
| 90 days | weekly (ceil) | `MM-DD` |

Per-bucket average from `duration_ms`, p95 by nearest rank; success = 2xx/3xx. Items exactly on a boundary clamp to the correct bucket. Three mutation REDs prove the math: off-by-one bucket, empty-as-zero, and merged model key.

## Remaining reference gaps

1. **Studio** (Chat / Images / Audio / Rerank / Advanced APIs): blocked on four `/v1` host endpoints that do not exist. The scoped fallback now reports them 404 JSON.
2. Client aggregates ONE page of items, so larger windows can be truncated by the host page size - recorded as a limitation, not hidden.
