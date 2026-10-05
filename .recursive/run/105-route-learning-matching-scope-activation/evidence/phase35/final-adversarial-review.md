# Phase 3.5 Final Adversarial Review — Run 105

## Review identity and boundary

- Verdict: **PASS — no blocking defect**.
- Final public checkpoint: `7162930d76dc1c317c8d192a2e3fbbdcde6f878c`.
- Public delta after reviewed `83308e29`: responsive UI-only follow-up; it does not alter the
  materializer, publisher, queue, dispatch, source-metadata, telemetry, or rollback backend paths
  assessed below.
- Final private checkpoint: `da40a115237432b248f6b5282a4ac42f8fb90179`.
- Private `da40a115` supersedes `4d78ce60` only with the mixed-policy admission regression
  freeze and its test; no other private product path changed.
- Review was read-only except for this new evidence file. No source file was changed. No server,
  listener, or port was touched. In particular, ports 3457 and 3458 were not used by this review.
- Review basis: requirements, design, addenda, implementation source, and test assertions. Claims
  and comments were not treated as proof.
- Stable verification supplied by the controller: full host 2245, private run-105 159/159, UI 684.

## Executive result

No CRITICAL or HIGH finding remains. The final pair passes the requested concurrency,
atomicity, security, privacy, backward-compatibility, and performance review.

Two bounded MEDIUM residuals remain:

1. A losing materializer CAS writer can leave an unreferenced evidence-metadata document.
2. A process restart during an unfinished endpoint challenge can mint a new dispatch-round
   identity and repeat bounded provider work.

Both residuals fail safe: neither can authorize a wrong route, bypass rollback/safety policy,
corrupt the authoritative ladder row, expose raw prompts/responses, or lose authoritative state.
They are forward-run hardening items, not release blockers.

---

## Finding M1 — CAS loser can leave an evidence-document orphan

**Severity:** MEDIUM  
**Disposition:** accepted residual; not a blocker.

### Evidence

- `shared/route-learning/route-ladder-materialization.mjs`, adapter `writeLadder`, writes the
  content-addressed `route_ladder_evidence` document through `knowledge:write` before it calls
  `knowledge:write-route-ladder` with `expectedVersion`.
- `extensions/knowledge-store/index.mjs`, `writeRouteLadder`, correctly performs the ladder-row
  compare-and-set under `BEGIN IMMEDIATE` and refuses an expected-version mismatch.
- The preliminary adapter re-read narrows the race but cannot close the interval between the
  document write and the transactional ladder-row CAS.

### Reproduced failure sequence

A bounded in-memory adapter counterexample was executed without creating a repository file:

1. Writers A and B both read ladder version N.
2. Both pass the adapter's preliminary expected-version check.
3. A writes evidence document A and wins the ladder-row CAS.
4. B writes evidence document B and loses the ladder-row CAS.
5. The ladder points only to document A; document B remains unreferenced.

Observed result: `docsWritten=2`, one applied write, one stale write with
`expected_version_mismatch`.

### Impact

- The orphan contains bounded route-ladder evidence metadata, not raw prompt, response, tool,
  secret, or repository content. This is not a privacy disclosure.
- The authoritative ladder remains the single atomic CAS winner; the stale writer is not reported
  as written and cannot influence routing.
- Orphans count against `MAX_DOCUMENTS_PER_SCOPE = 10000`. Repeated adversarial contention could
  eventually exhaust that bounded document budget and make later materialization fail closed.
- No route-ladder-evidence-specific orphan reaper was found.

### Test assessment

- `run105-production-materialization.test.mjs` proves expectedVersion/preserveRollback are sent,
  refused writes are not reported written, and oversized metadata is refused before either store
  write.
- It does not test or clean up a document written immediately before a losing CAS.

### Recommended later hardening

Commit the evidence document and ladder pointer in one KnowledgeStore transaction, or delete the
new document when the ladder CAS loses. This is not required to accept the current final pair.

---

## Finding M2 — Restart during challenge can repeat one bounded comparison

**Severity:** MEDIUM  
**Disposition:** accepted residual; not a blocker.

### Evidence

- `track-b-auto-replay-runtime.ts` stores challenge cursor, challenged rungs,
  `startedAtMs`, pending capture, and completed-group ids in the in-memory `challenges` Ref.
- A newly reconstructed challenge uses a fresh `startedAtMs`.
- `dispatchRoundFor` hashes the scope key, endpoint, `startedAtMs`, and completed group ids.
- Queue identity and replay-core idempotency both include that dispatch-round identity.
- Finalized challenge evidence is filtered to evidence created at or after the reconstructed
  cutoff.

### Failure sequence

1. A challenge round dispatches and pays for a provider comparison.
2. Its comparison finalizes immediately before, or concurrently with, process loss.
3. The host restarts; the in-memory challenge Ref is empty.
4. The challenge is reconstructed with a new `startedAtMs`.
5. The pre-restart finalized group can fall before the new cutoff and is not recognized.
6. The new cutoff produces a different dispatchRoundId and therefore a distinct queue/replay
   idempotency identity.
7. The comparison may run again.

### Impact

- The duplicate is bounded to unfinished challenge work; the queue cannot create unbounded
  same-round duplicates.
- R6 explicitly makes re-runs append-only comparison records, so this cannot overwrite or corrupt
  prior evidence.
- The strict materializer and advisory reader still enforce admission, scope, confidence,
  freshness, rollback, cohort, kill-switch, and guardrail policy.
- The consequence is duplicate spend/work, not wrong routing or evidence loss.

### Test assessment

- Queue-round tests prove the same explicit round reuses its deterministic job identity.
- Dispatch tests prove queue mode stops local execution, one queued arm stops the batch, and a
  claimed round must match the active task/capture/pair.
- No test reconstructs an unfinished challenge across a fresh process with a comparison finalized
  just before restart.

### Recommended later hardening

Persist the challenge round/cutoff, or derive it from a durable queue/evaluation identity so a
restart reconstructs exactly the same round.

---

## Materializer atomicity, provenance, and mixed-policy safety — PASS

- KnowledgeStore serializes the ladder-row write with `BEGIN IMMEDIATE` and checks
  `expectedVersion` against the version read inside that transaction.
- Equal-version conflicting content is refused; idempotent identical content is not rewritten.
- Existing operator rollback state is preserved from the transaction's current row rather than
  trusted from a materializer snapshot.
- The final private `da40a115` fix freezes the complete prior ranking and its admission-policy
  provenance whenever an append causes any previously admitted endpoint to regress. A newly
  admitted endpoint under looser defaults is deferred rather than mixed into metadata governed by
  the earlier policy.
- The dedicated mixed-policy test verifies that the old rungs and admission policy remain intact
  and the new endpoint is not added to endpoint evidence.
- Removed endpoint evidence remains retained; only availability changes. This is the bounded
  historical behavior required by policy and does not demand unbounded raw graph retention.

## Source metadata hash, exact scope, and safety suppressors — PASS

- The advisory source reads the ladder's packId as a real KnowledgeStore document id and recomputes
  the canonical SHA-256 of the returned document; it refuses any digest mismatch.
- Runtime scope, roleId, taskTypeId, document scope, evidence scope, and taxonomy provenance are
  checked before any advisory is returned.
- The reader independently validates the accepted endpoint set, per-endpoint comparison count,
  group ids, confidence floor, evidence time, and taxonomy values.
- Published confidence is recomputed as the conservative minimum over available admitted rungs;
  evidence time is likewise recomputed conservatively. Neither is accepted as an unaudited
  materializer claim.
- Kill switch, scope rollback, sustained guardrail breach, stale evidence, revalidation due,
  invalid stage, and invalid cohort policy all suppress influence without writing a per-task
  rollback flag.
- The classified path never falls back to a scope-only advisory. Legacy scope-only lookup is
  reachable only for callers that omit both role and task fields.

## Publisher pages, timers, and cache eviction — PASS

- `startDurableRouteAdvisoryRefresh` serializes passes with a `refreshing` flag; interval ticks
  cannot overlap one another.
- The interval is unref'd and the returned stop function clears it and marks the publisher stopped.
- Ladder-index pagination is keyset based, checks continuation cursor shape, detects repeated
  cursors, and has an explicit ten-page/two-thousand-row budget.
- A missing cursor on an apparently full/truncated page is refused as an incomplete index rather
  than treated as complete.
- Every published pair is read from the live KnowledgeStore path. A rollback produces a negative
  advisory retaining the exact pair key, replacing the previously fresh cache entry.
- Cache key includes channel, runtime scope, role, and task. Partial classifications cannot borrow
  another entry.
- Cache size is hard-capped at 512 entries and delete-before-set refreshes recency. Recall applies
  max-age staleness.
- A deleted pair is not synchronously removed merely because it disappears from the latest index;
  it ages stale and is eventually size-evicted. The publisher does not manufacture a fresh value
  for absent rows. This is bounded and fail closed, so it is informational rather than a finding.
- A scope above the explicit 2,000-row refresh budget degrades the refresh instead of publishing a
  silently incomplete set; this is the intended performance bound.

## Queue rounds, idempotency, and concurrent workers — PASS subject to M2

- With an explicit round, queue job identity hashes captureRef, sorted endpoint ids, policy digest,
  and dispatchRoundId. Retrying the same round therefore offers the same persisted job id.
- Replay-core idempotency separately includes dispatchRoundId in its contract digest.
- Queue offer occurs after replay admission and budget reservation.
- In authoritative queue mode, a successful offer increments queued and skips local execution.
- A refused stage queue offer releases the reservation and defers; it never silently executes the
  refused queue work on the legacy path.
- The challenge batch stops after an arm is queued, so the scheduler does not offer the next rung
  concurrently.
- The queue worker's restricted dispatch verifies that its claimed round matches the actual pending
  task, capture, and pair; a mismatch throws instead of executing arbitrary work.
- The ordinary interval tick cannot execute while stage execution is busy. In queue mode it offers
  only; the worker is the execution authority.

## Dispatch task skipping — PASS

- The final public starvation repair removes a focus task that throws the typed
  `NoReplayableRequest`, clears held focus, and continues selection among remaining eligible tasks.
- Unknown or unavailable task context is not mislabeled as a known empty corpus; it degrades the
  tick instead of skipping work silently.
- When every candidate is known unreplayable, the tick records a named degraded outcome. The host
  remains alive; this is observable starvation, not a crash.
- The challenges Ref entry for a skipped task is not immediately deleted. On re-entry it can only
  retry unfinished challenge work; completed-group exclusions prevent a completed arm from being
  treated as new within the same process. This bounded low-risk behavior is not a blocker.
- Availability and completeness are kept separate. Configured/current available rungs determine
  the dispatch gap, while unavailable historical rungs do not masquerade as newly configured
  endpoints.

## Telemetry 16 KiB projection and strict-summary/no-artifact equivalent — PASS

- The literal symbols `strictsummary` and `noartifact` do not exist. The equivalent strict path
  is `projectRuntimeTelemetryFailureDimensions` plus
  `boundRuntimeTelemetryFailureStub`, followed by the writer-side JSON-column cap.
- JavaScript measures serialized UTF-8 bytes with `Buffer.byteLength`; SQLite's compact-stub
  trigger measures `length(CAST(observation_json AS BLOB))`, also bytes.
- Boundary tests exercise 16,383/16,384/16,385 bytes with multibyte CJK input, so the byte boundary
  is tested rather than inferred from JavaScript code-unit length.
- Diagnostic projection retains correlation and classification facts, bounds arrays/depth/string
  previews, records truncation metadata, and strips prompt, messages, response body, provider
  response, request/response captures, inspection, and diagnostics from inline metadata.
- A message preview is bounded in serialized JSON bytes, not source string length; truncation records
  both a flag and original UTF-8 byte count.
- Final telemetry JSON columns fail closed at 16 KiB. No global inline cap was raised.
- Failure telemetry persistence is secondary. If graph or SQLite persistence fails, the bridge logs
  only a fixed sanitized diagnostic and preserves the original provider failure/status/class.
- The caller marks telemetry persisted only after the safe persistence wrapper returns true.
- Tests assert the original routed 422 remains the thrown primary error under injected secondary
  persistence failure and that diagnostic logs do not contain the injected secret payload.
- Real temporary SQLite tests cover the byte projection and persisted dimensions. The bridge
  primary-failure test intentionally uses injected persistence faults rather than claiming a full
  physical graph-I/O fault test.
- New columns and projection members are additive; legacy readers continue to parse the existing
  telemetry and observation row shapes.

## UI rollback actual route — PASS

- Button path: `learning.tsx` per-row toggle → `rollbackLearningLadder` → authenticated POST
  to `/operator/learning/rollback-pack`.
- Operations-server path: the rollback-pack adapter detects the complete roleId/taskTypeId pair,
  requires scopeId and a real boolean `rolledBack`, then calls the supervised owner's
  `landRouteLadderRollback` (or the narrower setRouteLadderRollback fallback).
- Legacy request bodies without the exact composite key continue to the original receipt-bound
  scope-wide rollback method unchanged.
- Store path: `knowledge:land-route-ladder-rollback` writes
  `knowledge_route_ladders.rolled_back_on/reason/at_ms` under `BEGIN IMMEDIATE`.
- Advisory path reads the same row and refuses when `rolledBack.on` is true. Dispatch also re-reads
  rollback immediately before each sequential arm and stops if the operator toggled it.
- Two rapid writes for the same row serialize at SQLite. The UI has a per-role/task pending set and
  will not start a second toggle while the first is pending; after success it reloads authoritative
  records rather than applying an optimistic local state.
- Roll-forward preserves the prior reason and timestamp for audit history while making the ladder
  consultable again.
- Low documentation inconsistency only: public UI comments say the toggle rides the existing
  rollback-pack route, while one private route-dispatch comment describes a separate dedicated
  endpoint. The executable path is unambiguous and uses the overloaded rollback-pack route.

## Privacy, retention, and backward compatibility — PASS

- The new route-ladder evidence document is bounded metadata; raw prompt/response/tool bytes are
  not admitted to it.
- Telemetry projection explicitly removes rich provider/request capture fields from SQLite inline
  metadata and leaves rich inspection content in graph/artifact storage when configured.
- This review does not require unbounded raw graph retention. The pre-existing bounded retention
  policy remains authoritative and is within scope.
- Legacy scope-wide rollouts are cleared from routing authority by the one-time additive migration;
  historical records remain for audit.
- Legacy queue payloads omit dispatchRoundId and retain the historical captureRef job identity.
- Legacy rollback-pack callers keep their prior semantics; only complete composite role/task bodies
  select the reversible per-task path.

## Final disposition

**PASS — no blocker.**

The final pair, public `7162930d76dc1c317c8d192a2e3fbbdcde6f878c` and private
`da40a115237432b248f6b5282a4ac42f8fb90179`, is acceptable against the effective Run 105
requirements. The public successor is a responsive UI-only delta relative to the fully reviewed
`83308e29` checkpoint; the private successor closes the mixed-policy materialization issue.
The two MEDIUM residuals above are bounded, fail safe, and suitable for forward-run hardening.
