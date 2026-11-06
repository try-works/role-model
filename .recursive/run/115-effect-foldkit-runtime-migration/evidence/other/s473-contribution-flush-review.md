# S473 — independent review: S472 contribution flush timeout

Reviewer: `s9-private-readonly`, actual model **deepseek-flash** (verified via list_agents). Read-only private source/test; no edits, no commit, no provider/operator port use.

## Frozen bytes

- private `scripts/track-b/runtime-operations-server.mjs` `EECD5D3CAE04FB04AF989ACB010309E0525B9A057F7CBE579C147B2350DF76D0` (528496 B)
- private `tests/track-b/run115-b9-contribution-flush-timeout.test.mjs` `82AC0A14883E2C0BFACB3A6200D7DBB7A7E25B26D6FB61634615B4DEB318507F` (2445 B)

Diff from private basis 0670a14a is limited to the import and the flush controller/timer/finally; no route/HTTP contract, retry schedule, or outbox hunk.

## PASS

- The deadline uses the existing `HOST_CONTRIBUTION_AGGREGATE_CAP_MS` (5,000 ms; `shared/runtime/extension-host-tuning.mjs:29`), not a new timeout/policy knob.
- The timer aborts the same `AbortController` that owns the upload fetch; revocation (`cancelActiveContributionDeliveries`) still aborts the controller independently, and the existing revocation checks remain in both success and catch paths.
- `clearTimeout(flushDeadline)` and `activeContributionDeliveries.delete(controller)` are in the fetch path's `finally`; the timer is `unref`'d so it does not hold the sidecar process.
- A timeout/fetch failure remains a queued outbox outcome for `retryOnly`; delivery-attempt state and the existing retry schedule are unchanged. No HTTP route/response change.
- RED is genuine: `s472-red.log` fails the 9s race because the flush does not settle until revocation; no missing-module/setup failure.
- Green: `s472-green.log` 49/49; my new-test run 1/1 (settles ~5.2s, aborted=true, status queued), node --check exit 0; contribution tests I executed 8/8.
- Lint absolute effect:true: server 371 = frozen baseline; new test 0. Test hash matches.

Residual limits: the test covers an unreachable/hanging endpoint but not an explicit revocation-during-flush or timer-clear after a pre-fetch correlation-factory throw; existing revocation/outbox tests remain green. The run96-operator-cluster-red failure is pre-existing and was not re-run in this pass.

## Bounded verdict: PASS

The sidecar aggregate attempt is now bounded by the existing host cap while durability (outbox/retry) and revocation remain authoritative. This is a bounded contribution-flush repair, not whole R24/R33 or packaged-candidate completion.

No source/test/config file was modified; no commit.

