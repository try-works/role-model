# S26m review verdicts not yet repaired (open gaps)

Recorded from the two independent reviews so they are not lost while repairs are queued.

## Wave-2 refusals (review HOLD, repair queued as S26l)

- **/dashboard parses the wrong shape**: `parseDashboard` reads `record.requests` while the endpoint returns `RuntimeTelemetrySummary`; the page would render empty against the real host and the test passes only on a fabricated body. This is a real defect in a row marked verified.
- **Two dynamic detail routes were refused on a false premise**: `Route.string("id")` parameters already exist in `app.ts`, and the host readbacks exist. The static-surface argument does not survive; a parameterised spec is a small shared-surface extension.
- **The chart refusal reason is factually wrong**: those five components use recharts and the UI kit, not ECharts. The defensible statement is that they are presentational and that a route being verified does not mean its chart journey is ported.
- **`component:telemetry-controls` is absent with no reason** and was silently dropped from the read denominator; the honest denominators are 16/18 read routes and 16/23 read items.
- **No test protects the claims**: nothing fails if a route is refused without proof, if an absent row lacks a reason, or if the wave totals stop matching the rows.

## Journey harness (review HOLD, repaired as S29b)

The first journey script drove the packaged runtime but asserted nothing; the rewrite adds 47 throwing assertions, exe identity verification, SQLite joins, a real kill-wait-restart and four mutation REDs. Closed in the artifact.

## What this means for the run status

R13 stays blocked until the dashboard parser is fixed and the two detail routes are ported; a "verified" row that would render empty against the real host is exactly the kind of claim this run must not ship.
