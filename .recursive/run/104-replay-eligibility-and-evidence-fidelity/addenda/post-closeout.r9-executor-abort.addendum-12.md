# Post-closeout addendum 12 — a timed-out dispatch can never hold the queue claim

## Problem
The bounded executor (`runBoundedExecutor`) raced the executor against a timer with `Promise.race` and
only `clearTimeout`'d the timer — it never cancelled the in-flight provider `fetch` / branch append. A
replay that outlived the per-capture budget therefore kept its provider connection and SQLite writes alive in
the background while the queue's single claim had already moved on, which is exactly the shape that lets a
timed-out dispatch wedge the next one.

## Fix
- `runBoundedExecutor` now owns an `AbortController`, aborts it when the budget timer fires, and aborts it
  again in `finally` (so an executor that returns normally also clears the signal).
- The `AutoReplayExecutorRequest` and the runtime `executor` input carry an optional `signal: AbortSignal`.
- The auto-replay executor in `cli.ts` destructures `signal` and merges it with its own per-request timeout
  via `AbortSignal.any([...signal, AbortSignal.timeout(...)])`, so the provider `fetch` is aborted on the
  earlier of the per-capture budget or the replay deadline.

## Verification
- `tsc --noEmit` exit 0.
