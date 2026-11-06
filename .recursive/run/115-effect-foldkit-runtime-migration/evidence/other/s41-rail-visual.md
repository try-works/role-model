# S41 shell rail landed and verified in the browser

Built from the current client and served through the packaged executable with `--static-root`, fresh temp state root, ephemeral port.

## Rail as rendered (real values, not placeholders)

```
MODELS 3   REQUESTS 0   CACHE -   ROUTER http://127.0.0.1:5787/v1   MODE decision_only
```

| Field | Source | Behaviour when unavailable |
|---|---|---|
| Models | `GET /api/role-model/models` row count | dash with aria reason |
| Requests | telemetry summary `requestCount` | `0` only for a genuinely empty summary |
| Cache | `cachedRequestCount / requestCount` | dash at zero requests (no divide-by-zero fiction) |
| Router | runtime summary `runtime.endpoint` origin + `/v1` | dash unless the endpoint is an http origin |
| Mode | runtime summary `executionMode` (router summary fallback) | dash when absent |

Loaded once in init for every section, reusing an active route read. Fabricated bodies (`{}`, `[{}]`) and a 500 render dashes, not values - tested.

## Reference comparison

| | Reference 0.0.20 | Port now |
|---|---|---|
| Models | per-model rows with request counts (320 / 33 / 31) | a single count (`3`) |
| Requests | per-model counts | total `0` |
| Cache | `0%` | `-` at zero requests (honest dash) |
| Router | `127.0.0.1:3456/v1` | `http://127.0.0.1:5787/v1` (the actual serving origin) |
| Mode | `baseline.decision-only` | `decision_only` |

So the rail is structurally at parity; the remaining difference is per-model request counts, which needs the telemetry rows grouped by model rather than a single summary.

## Open

- Slice 2 (Overview latency and success/failure charts with Day/Week/Month/90-day filters and stale suppression) is not started.
- No captured RED log for the fabricated-body guard; the test is green and fails if the guard is removed, but the RED was not recorded - a reviewer will call that out and it should be added.
