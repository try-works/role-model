# Post-closeout addendum 09 — deferred-route-captures "database is locked"

## Root cause
The stage runtime's deferred-route-captures drain was failing with `Track B deferred route capture drain failed
Error: database is locked`, which left 52 live captures pending (never delivered to replay). The
`createTrackBRouteCaptureQueue` SQLite handles opened `new DatabaseSync(filePath)` with the default **0 ms**
busy timeout. Two hosts overlap over the same state root (role-model-stage.exe and the Track B sidecar), so a
writer in one process holds the lock while the drain reads/writes, and a 0 ms timeout reports the ordinary
overlap as a failure. The evaluation-core already fixed the same contention with `PRAGMA busy_timeout=5000`
(run 100 contention probe), but the capture queue never received it.

## Fix
Add `PRAGMA busy_timeout=5000` to the capture-queue schema so the drain waits (up to 5 s) for the concurrent
writer instead of failing immediately.

## Verification
- `tsc --noEmit` exit 0.
- run98-a40-route-capture-queue.test.ts green (7 tests).
