# S629 / task-109 - Requests + Routing volume charts bound to metrics (observe slice)

## Problem
The Requests and Observe-routing volume cards rendered an honest empty state but never fetched the metrics page,
so the owner-visible cards stayed empty even when request data existed. Only the overview charts read metrics.

## Change
- New shared module src/features/overview/chart-data.ts: overview Bucket/OverviewItem types, percentile, bucketRule,
  bucketsFor, windowForRange ("Day" 86_400_000 / "Week" 604_800_000 / "Month" 2_592_000_000 / "90 days"
  7_776_000_000) and volumeSeriesFor. view.ts now imports it and re-exports percentile for the s40b tests.
- observe/views.ts: telemetryRequestsRoute and observeRoutingRoute take the metrics ReadbackState + windowMs and
  render real bucket series (Requests + Failures on the requests card; Requests on the routing card, whose routing
  analytics readback has no timestamps - documented in the card description). observeChart now accepts
  hasData/state so the card shows series or the in-plot empty state.
- Read plans: init.ts route init and update.ts ChangedUrl extras schedule overviewMetrics for Requests/
  ObserveRouting; readPlanForRoute includes it for telemetry invalidation; RequestsRangeChanged and
  ObserveRangeChanged re-read metrics with the matching windowMs query. Entry query is exactly
  /api/metrics/page?windowMs=86400000 (Day default), asserted by s628 via a mounted route.
- view.ts passes readbacks.overviewMetrics + windowForRange(filters.range) to both routes.

## Verification
- s628 (7 tests): token/cache/latency/volume real series, in-plot cost empty states, empty-window in-plot states,
  real Requests/Routing volume series, and the exact entry query on both routes: 7/7.
- Affected suites: s628 + s619 + s26e + s278 + s269 + s623 = 154 tests, 154 passed; tsc 0
  (evidence/logs/s629-observe-charts-affected.log).
- Full UI suite: see evidence/logs/s629-observe-charts-full-ui.log (the pnpm test chain runs tsc first).
- Post-fix packaged host (isolated 3484 with a copy of the review state, pid stopped after capture):
  * /requests Day: 2 chart paths, series requests+failures, metrics request windowMs=86400000.
  * /requests Week: 2 chart paths, metrics request windowMs=604800000 (range switch refetches the right window).
  * /observe/routing Day and Week: 1 chart path, series requests, correct metrics window per range.
  * screenshots: s629-observe-requests-3484.png, s629-observe-requests-week-3484.png,
    s629-observe-routing-3484.png, s629-observe-routing-week-3484.png.
- :3456 /app same-window comparison: with Day the production host has no request rows, so every :3456 chart shows
  its empty copy (no series); with Week :3456 draws Request volume (4 recharts paths) and Routing decision volume
  (6 paths). Our page draws a series when the copied local state has a row and the in-plot empty state when it does
  not - the intended behaviour. Reference screenshots: s629-reference-3456-requests.png,
  s629-reference-3456-routing.png; machine-readable comparison: s629-observe-charts-evidence.json.

## TDD evidence (also addresses the charts-review evidence HOLD)
- RED: evidence/logs/s628-charts-red.log. The s628 test file was authored in the fix commit bff0cb9a, so it does not
  exist at bff0cb9a^; the RED run used a clean detached worktree at bff0cb9a^ = f7939095, copied the committed test
  from bff0cb9a into it, and left the product sources pre-fix. Result: 5/5 failed (data-binding paths, in-plot cost
  empty state, empty-window in-plot state, observe volume in-plot state, and the empty-windowMs URL contract). The
  "4/5" wording in the earlier commit message was the interim local harness state, not the committed evidence; the
  canonical RED is this 5/5 transcript. s628-charts-summary.md was updated to cite it.
- GREEN: evidence/logs/s629-observe-charts-red-green.log (7/7 after the observe binding).
