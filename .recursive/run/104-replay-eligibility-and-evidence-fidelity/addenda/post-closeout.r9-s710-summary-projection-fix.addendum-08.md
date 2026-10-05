# Post-closeout addendum 08 — S7/S10 handoff recovery page overruns the 16 KiB inline frame

## Root cause
The stage runtime's queue plane is `queue` (run 101 R4). The replay/evaluation queue worker's dispatches were
failing with `extension replay-core failed: frame exceeds inline limit; use a channel-local transfer artifact`,
which blocked new comparisons from finalizing (the 50 existing `finalized` groups predate the R9 threading).

Traced to `cli.ts` `runTrackBSupervisedReplay`'s handoff recovery sweep (S7/S10): the first recovery page
called `replay:list-jobs` with `limit: MAX_HANDOFF_RECOVERY_LIST_PAGE` (24) and **no** `summary`, so
`replay-core` returned 24 whole durable jobs (~7.3 KB each, well over the extension protocol's 16 KiB inline
frame) and the boundary refused the frame. The S14 terminal pass already used `terminalRecoveryListingValue`
(`summary: true`); the S7/S10 pass had the same read pattern (only identity/state/evaluation id/branch count)
but omitted the projection.

## Fix
Add `summary: true` to the S7/S10 recovery page value so it pages the summary projection (like S14), then
fetches full records only for the jobs it actually recovers.

## Verification
- `tsc --noEmit` exit 0.
- Recovery tests green: run100l-handoff-recovery-sweep (2), run100l-handoff-recovery (7), run101-recovery-cursor (9).
