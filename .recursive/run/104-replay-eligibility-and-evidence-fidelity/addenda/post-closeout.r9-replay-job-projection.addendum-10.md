# Post-closeout addendum 10 — replay:job single-read projection (16 KiB inline frame)

## Root cause
After fixing the page-size and busy-timeout issues, the finalization still refused comparisons with
`extension replay-core failed: frame exceeds inline limit`. The `replay:job` capability returned the whole
durable job (`core.job(jobId)`), including the `branches` records and the `dispatches` map (provider results
and per-endpoint metric maps), which for a busy job exceeds `MAX_INLINE_BYTES` (16 KiB, `extension-sdk`). The
`encodeFrame` layer refuses anything larger; the "channel-local transfer artifact" is input-side only.

The caller (handoff recovery + finalization) needs the identity, candidate packages and a branch *count* — not
the branch records or the dispatch map (outcomes travel separately via `replay:results`).

## Fix
Add `core.jobProjection(jobId)`: clone the job, replace `branches` with a `branchCount`, and drop the
`dispatches` map, so the single-job read stays well under the inline frame. `replay:job` now returns
`jobProjection` instead of `job`.

## Verification
- run100l-replay-list-filter + run104-sp10-replay-evaluation-handoff green (4/4).
