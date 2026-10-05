# Post-closeout addendum 11 — contribution aggregate timeout starved the auto-replay

## Root cause
Fresh captures were delivered (receipts grew) and the auto-replay loop planned them (counterfactuals 280), but no
new replay disposition or evaluation job was produced. The stage log showed
`contribution aggregate timed out after 5000ms` and `contribution upload degraded` for the fresh requests. The
`DEFAULT_CONTRIBUTION_AGGREGATE_TIMEOUT_MS` was 5 s (a hard cap on one caller-side aggregate commit), and the
mature stage root's aggregate commit exceeds 5 s under cross-process write load — the same class the run-99 R33
comment names ("starved the auto-replay producer, so freshly captured requests were never replayed").

## Fix
Raise `DEFAULT_CONTRIBUTION_AGGREGATE_TIMEOUT_MS` from 5_000 to 30_000 (still bounded well below the 600 s
operations bound), so the aggregate commit completes on a mature stage root while the retry/ceiling still
protects the background drain from a wedged boundary. Updated the run104-sp7 contract test.

## Verification
- `tsc --noEmit` exit 0.
- run104-sp7-contribution-budget (3), run96-f160-contribution-outcome, track-b-operations-api green.
