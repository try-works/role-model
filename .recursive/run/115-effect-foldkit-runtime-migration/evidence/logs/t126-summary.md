# Task-126 - host benchmark outcome fields in the UI

## Host contract (task-125, 2545401c)
- Progress snapshots, run records, the runs list and summary now carry caseCounts {total,passed,failed} and
  outcome "passed" | "partial" | "failed". The UI reads them when present and keeps the local score>0
  derivation as fallback for older runs.

## UI
- Run history: OUTCOME badge column (passed/partial/failed tone) and PASSED "8/12" column from the runs-list
  meta; rows expose data-benchmark-run-outcome / data-benchmark-run-passed.
- Progress panel: "Outcome: partial" plus passed/total/failed from the live snapshot caseCounts/outcome when
  present (polled snapshots and the active readback both carry them).
- Run detail headline: "outcome partial · 8/12 cases passed — 4 failed" using host fields, falling back to the
  local per-case derivation when fields are absent.
- update.ts already retains caseCounts/outcome from polled and active snapshots (landed with the host-field
  commit); model schema accepts them.

## Tests
- s640 (6): history passed/partial/failed rows with counts; detail passed and failed headlines with rows;
  progress panel host outcome without result payload; polled snapshot retains fields; legacy fallback.
- RED t126-outcome-red.log (polled fields missing) -> GREEN t126-outcome-green.log. t126-targeted.log includes
  s622/s563; full suite 118 files / 1011 tests PASS; S247 4/4; tsc 0.

## Dedupe (task-123, 63da0f7e)
- s639 reproduces "A stack requires at most one value for each position and series; duplicate Gpt 5.4 /
  requestCount" with two endpoints sharing displayName, then passes after dedupe-by-key + label suffix. GREEN
  t123-duplicate-series-green.log.
