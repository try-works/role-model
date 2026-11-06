# S44a bucketed chart series and per-model rail counts from existing data (public, R13)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
The two remaining reference gaps can be closed WITHOUT host changes: `/api/metrics/page?windowMs=` returns individual items, so buckets and model groups can be computed client-side.

## 1. Bucketed series (reference: 00:00 -> 24:00)

- Read `/api/metrics/page?windowMs=<window>` items, bucket by timestamp: 24 hourly buckets for Day, and an appropriate count for Week/Month/90 days (state the rule, keep labels readable and match the reference's `HH:MM` style).
- Latency chart: average and p95 PER BUCKET (compute from each bucket's items; a bucket with no samples must be a gap, not a zero point).
- Volume chart: success and failure counts per bucket.
- Empty buckets must not be drawn as fabricated zeros; the accessible table must show the bucket labels and values that exist.
- Axis labels must reflect the buckets (reference shows 00:00 ... 24:00).

## 2. Per-model rail counts

- Rail MODELS section lists model rows with their request counts for the current window (reference: `chatgpt/gpt-6.1-sol 320`, etc.), grouped from the same items; keep the total count too.
- When items are unavailable, the rail degrades to the total only with an aria reason - never fabricated per-model numbers.

## 3. Discipline

- Capture a REAL `/api/metrics/page` body with several items as a fixture; add a synthetic fixture that exercises bucket boundaries (item exactly on a boundary, two items in one bucket, an empty bucket) and assert the computed series exactly.
- Tests must fail if the bucketing is off-by-one, if an empty bucket becomes zero, or if the model grouping merges two models.
- Keep the stale-window suppression: switching windows must not let an old response win.

## Files
`apps/runtime-ui-next/src/**`, tests, fixtures; evidence `s44a-*` with RED logs.

NO host changes, no recharts/ECharts, no new dependency, no packaging, no installs, no commits, no subagents; ephemeral ports and temp state only.

## Report
The bucketing rule and its boundary tests, the per-bucket latency math, the model grouping, the fixtures, the REDs, counts and typecheck.