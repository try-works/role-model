# S472 — bounded contribution aggregate flush timeout

Status: pending
TDD Mode: strict
Private basis 0670a14a; public b9841f94; paired00-worktree authority unchanged.

Root cause (S471 trace): packaged host readiness blocks on cli.ts:12157 retryContributionAggregates -> sidecar POST /contribution/retry -> recordContributionAggregate({retryOnly:true}) -> contributionClient.flushAsync(sendEnvelope) -> fetch(contribution.endpoint) whose AbortController is only aborted by revocation, never by time (runtime-operations-server.mjs:7840-7845). An unreachable cloud endpoint keeps the sidecar request open; the host requestPrivate operations bound defaults to 600000ms, so the packaged bootstrap stalls ~10min then fails instead of becoming ready. Matches the observed runtime_initializing pending forever (probes <2.5min).

Repair (PRIVATE runtime-operations-server.mjs ONLY, contribution flush path, plus a dedicated test): bound the flush fetch with a finite deadline (existing retry schedule/backoff must remain authoritative for durability; the deadline only settles an unreachable-endpoint attempt so readiness is not hostage to a hung network call). Prefer an existing timeout knob/contract if the flushAsync callers already carry one - do not invent a parallel retry policy. Bounded diagnostic logging allowed per S471 proposal; no HTTP contract/route change, no public edits, no provider calls, no operator ports.

Strict RED first: a node --test with an unreachable/fake-hanging contribution endpoint asserts the flush settles within the bounded deadline (or rejects with a typed timeout) instead of pending; today it hangs until revocation. Then minimal wiring; existing contribution/outbox/durability tests must stay green; rerun affected private suites + node --check + anti_slop_lint abs effect:true nonempty. No commit; freeze hashes; independent review by s9-private-readonly; no whole R24/R33 claim.
