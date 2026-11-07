# S671 - runtime host state-machine audit

Audit-only; no source modified. Scope: role-model-router/apps/runtime-host-bridge/src. Lines cite the audited tree at 3f7779fb. "Reachable" means no guard was found in the cited path; "latent" means current composition does not select that mode.

No explicit goal state machine exists in this directory (no GoalState/goal_status/active_goal symbol). Lease-shaped machines audited: queue attempt fence, replay intent claim, development-verification authorization.

## Machine index

| # | Machine | Source | Worst |
|---|---|---|---|
| M1 | Benchmark run progress/status | benchmark-progress.ts, benchmark-runner.ts | P2 |
| M2 | BenchmarkGate admission/cancel | benchmark-gate.ts, benchmark-runner.ts | P1 |
| M3 | Benchmark case timeout (implicit) | benchmark-runner.ts | P1 |
| M4 | Endpoint lifecycle/admission | index.ts | P2 |
| M5 | Endpoint activation batch | index.ts | P1 |
| M6 | Provider device-auth session | index.ts | P1 |
| M7 | Queue attempt lease fence | queue-runtime/fence.ts | P2 |
| M8 | Replay intent claim/retry | track-b-runtime.ts | P1 |
| M9 | Development-verification lease | development-verification.ts | P2 |

## M1 - Benchmark run progress/status

Source: benchmark-progress.ts:7-8 status union, :12-40 snapshot, :48-96 create, :99-169 update/plan, :171-218 complete/fail; benchmark-runner.ts:1751-1769 create, :1891-1913 position, :2453-2461 terminal.

States. Explicit status = running | completed | failed. Explicit runPhase = execution | grading | compare | complete. Explicit currentPhase = execute | judge | compare | null. Implicit "no active work" = currentEndpointId/currentCaseId/currentPhase null. Implicit terminal = status plus result/outcome presence.

Invariants.
1. status is monotonic: running -> completed or failed, never back.
2. completedSteps <= totalSteps; completed sets completedSteps = totalSteps (:183).
3. At case start completedSteps = endpointIndex * caseCount + caseIndex (0-based) (runner :1893-1894); snapshot indices are 1-based (:1900-1906).
4. status != running implies currentPhase null.
5. status running should have a live executor or pending step, not only a retained row.

Transitions.

| Event | From | To | Code |
|---|---|---|---|
| create | absent | running/execution, zeros | progress :48-96 |
| plan resolved | running | running; counts/total replaced | :141-169; runner :1810-1814, :1862-1873 |
| case begins | running | running, execute, indices | runner :1896-1913 |
| case completes, incl timeout | running | running, +1 step | :1971-1973 |
| grading case completes | running | running, +1 step | :2118-2120, :2310-2312 |
| result assembled | running | completed, phase complete | progress :171-192; runner :2453 |
| throw | running | failed, phase null | progress :194-218; runner :2457-2461 |

Invalid but reachable.
- P2 terminal overwrite without a guard. completeBenchmarkRunProgress and failBenchmarkRunProgress do not check current.status; both overwrite any retained snapshot (:171-192, :194-218). updateBenchmarkRunProgress does guard (:129-131), so the guard is inconsistent. Any late or duplicate terminal callback can turn failed into completed or completed into failed.
- P2 retained running row with no executor. The map is process memory (:42); nothing expires a run; listRunningBenchmarkRuns trusts status (:224-226). An abandoned executor that never reaches the catch leaves a visible running run with no work. No heartbeat/lease field exists.
- P2 result can disagree with status. complete copies any result counts/outcome (:179-189) without checking against totalSteps or current indices.

Fix candidates: make status a discriminated union; add finishOnce/CAS in the Map; derive completedSteps from (endpointIndex-1)*caseCount+caseIndex; add updatedAtMs staleness or heartbeat to readActiveBenchmarkRun.

## M2 - BenchmarkGate admission/cancel lifetime

Source: benchmark-gate.ts:31-46 contract, :48-82 owner, :102-146 Effect gate; benchmark-runner.ts:1737-1745 begin + first cancellation check, :1776 try start, :2453-2461 finish; composition-dag.ts:1058-1059 production mode reject-overlap.

States. Owner: activeRunId undefined|string, controller null|AbortController. Inner: active string|undefined, cancelled Set. Implicit: idle, admitted, cancelled, busy.

Invariants.
1. At most one active run in reject-overlap.
2. running() == (activeRunId !== undefined).
3. Every begin success is paired with finish on every exit path, including pre-work throws.
4. A cancelled run's signal is aborted and observed.

Transitions.

| Event | From | To | Code |
|---|---|---|---|
| begin idle | idle | admitted, new controller | :62-68 |
| begin while active, reject | admitted(r1) | busy(r1), unchanged | :63-64, :117-119 |
| begin while active, cancel-previous | admitted(r1) | admitted(r2), r1 cancelled in inner | :120-122 |
| cancel | admitted | idle + abort | :71-78 |
| finish current | admitted(r) | idle | :54-60 |
| finish stale | admitted(newer) | unchanged | :55-59 |

Invalid but reachable.
- P1 admission leaks on a pre-aborted caller signal. Runner calls begin at :1737, then checks throwIfCancelled at :1745; the try starts at :1776. If deps.signal is already aborted (:1741), the function throws before the catch, so admission.finish is never called. Gate stays active; in production reject-overlap every later benchmark gets BENCHMARK_BUSY forever. Concrete: runRoutingCapabilityBenchmark({signal: alreadyAborted}) -> :1738 no throw -> :1745 throw -> no finish.
- P2 cancel-previous does not abort the previous owner controller. Owner begin calls inner.begin (:63) but never aborts the old controller; old run's admission.signal stays live. Runner checks only deps.signal and its own admission.signal (:1740-1744), never gate.isCancelled(runId). In cancel-previous the old run keeps executing while the gate says cancelled. Latent because production hardcodes reject-overlap (composition-dag.ts:1059); P0/P1 if selected.
- P2 cancel/finish duplication. cancel clears active and ends inner (:71-78); later finish sees activeRunId != runId and returns (:55-59). No double-end, but no record that cancel already terminalized.

Fix candidates: wrap everything after begin in try/finally with admission.finish, including the first cancellation check; expose isCancelled on admission and check beside signal; abort previous controller in cancel-previous; single terminalize(runId).

## M3 - Benchmark case timeout (implicit)

Source: benchmark-runner.ts:463-505 runCaseWithTimeout, :1915 call, :287 caseTimeoutMs.

States. Implicit unbounded-running, bounded-running, timeout-returned, underlying-late-success/failure. Timeout is a synthetic failed execution: extractionMethod timeout, failure true, latencyMs timeoutMs.

Invariants.
1. After timeout, underlying work is cancelled or cannot affect run state.
2. A timeout counts one case and persists failure evidence.
3. Timers clear on every path.

Transitions.

| Event | From | To | Code |
|---|---|---|---|
| timeout absent/<=0 | ready | unbounded execution | :479-481 |
| case starts | ready | bounded-running | :482-490 |
| case settles first | bounded-running | completed execution | :490 |
| timer first | bounded-running | timeout-returned synthetic failure | :483-501 |
| underlying late settle | timeout-returned | ignored by race | :490, no abort |

Invalid but reachable.
- P1 timeout does not cancel the provider request. Promise.race (:490) rejects on the timer but neither runCaseOnEndpoint nor its fetch receives an AbortSignal; catch returns synthetic result (:491-501) while the original promise continues. No signal plumbing in :507+. A timed-out case can keep provider work and billing alive; late success is discarded. Run status is coherent, resource evidence is not.
- P2 timeout is a normal execution failure, not a distinct reason. Only failure:true and extractionMethod:"timeout" record it; status sees an ordinary case failure.

Fix candidates: pass AbortController into runCaseOnEndpoint and abort on timeout and in finally; or typed case-timed-out result with explicit timeout flag.

## M4 - Endpoint lifecycle/admission

Source: index.ts:23609-23787 activateRuntimeEndpoint, :24070-24140 admitRuntimeEndpoint, :24017-24032 OAuth recovery, :22341-22343 blocking derivation.

States. Explicit lifecycleState = pending-admission | active | degraded (:23614). healthStatus string: healthy, unknown, not-yet-executed, provider-unavailable, credentials-invalid, credentials-missing, degraded. Implicit admitted / not admitted / recovered.

Invariants.
1. pending-admission is never execution-eligible or role-bound.
2. active implies admission probe or OAuth account proof succeeded.
3. degraded carries non-healthy evidence.
4. Failed activation leaves no model-only side effect.

Transitions.

| Event | From | To | Code |
|---|---|---|---|
| activation requested | absent | pending-admission + unknown | :24089-24098 |
| OAuth account authenticated | pending | active + healthy | :24107-24128 |
| probe healthy | pending | active + healthy | :24118-24128 |
| probe unhealthy | pending | degraded + probe health | :24119-24127 |
| OAuth recovery | degraded/active | active + healthy | :24017-24032 |
| failed validation | pending | throw | :23625-23737 |

Invalid but reachable.
- P2 catalog mutation before later validation throw. activateRuntimeEndpoint adds a fallback model to currentNormalizedCatalog/currentModelsById at :23684-23690, then can throw at :23700-23703 (endpoint id mismatch) or :23731-23737 (untested reasoning effort). The model remains in memory with no endpoint. Next activation sees a phantom model. Reachable with unknown model id plus invalid reasoningEffort or mismatched endpointId.
- P2 degraded becomes active+healthy on account recovery without re-probing the endpoint. reconcileOAuthAuthenticatedRuntimeEndpoints promotes degraded endpoints from account/session evidence (:24017-24032), repeated at startup (:24043-24068). Intentional OAuth recovery, but the endpoint is not proved executable.
- P1 admission batch partial pending is M5.

Fix candidates: build fallback model locally and commit only after validation; make admission pending -> active|degraded|failed with persisted admissionError; separate account-authenticated from endpoint-executable evidence.

## M5 - Endpoint activation batch

Source: index.ts:24142-24423. Receipt pending|committed (:24179-24185); rows pending-admission -> active|degraded (:24320-24333, :24382-24405).

Invariants.
1. No committed receipt unless every member reached a final lifecycle.
2. Pending receipt retry only with identical payload (:24194-24198).
3. Rows durable before remote probe (:24318-24333); crash leaves pending, never healthy.
4. Every pending row eventually becomes active/degraded/failed.

Transitions.

| Event | From | To | Code |
|---|---|---|---|
| first request | absent | pending receipt + rows pending | :24274-24333 |
| same payload, pending | pending | reprobe | :24235, :24350 |
| all probes settle | pending | committed receipt + rows active/degraded | :24350-24423 |
| duplicate committed | committed | return receipt | :24199-24205 |
| admission probe throws (uncaught) | pending | no transition; throw | :24350-24381 |

Invalid but reachable.
- P1 permanent pending batch on one bad member. Promise.all at :24350 rejects on the first account/probe error; no catch, compensation, or committed receipt. Pending receipt (:24274-24282) and all pending rows (:24320-24333) remain. Retry re-enters :24235 and throws again if the probe failure is persistent: stuck pending forever, rows ineligible. (A missing account is rejected earlier at :23625-23632, before any pending receipt, so that case is clean.) Batch-scope version of admission leaking on throw.
- P2 pending receipt is written before operator intent/SQLite. A crash between :24274 and :24320 leaves a pending receipt whose rows do not exist; retry allowExisting true (:24235) can recover, but the receipt alone is not self-contained.
- P2 final receipt write is best-effort after rows commit. If writeReceipt at :24416 throws, rows are active/degraded but no committed receipt; retry reprobes and can change health states.

Fix candidates: prevalidate all accounts before writing pending receipt; Promise.allSettled and write terminal failed receipt/per-member failure instead of throw; make row commit + receipt transactional or an idempotent two-phase with recovery sweep.

## M6 - Provider device-auth session

Source: index.ts:7621-7650 result unions, :22038-22061 list/readback, :22091-22113 cleanup/supersede, :33320-33589 poll, :33328-33349 expiry.

States. Explicit pending | connected | expired | failed (:7635, :7645). Implicit superseded, transient-pending, awaiting-local-cache.

Invariants.
1. expiresAtMs <= now implies not pending when read.
2. connected implies token file and active/healthy account.
3. failed is terminal; a new attempt supersedes, never resurrects.
4. One poll transitions one session; no stale write after newer session.

Transitions.

| Event | From | To | Code |
|---|---|---|---|
| start | absent | pending | :7624, start handler |
| poll before expiry, provider pending | pending | pending(+retryAfter) | :33434-33440, :33565-33589 |
| transient transport error | pending | pending(+lastError) | :33396-33411 |
| token acquired | pending | connected | :33470-33477, :33528-33535 |
| poll after expiry | pending | expired | :33328-33349 |
| non-transient/malformed | pending | failed | :33354-33369, :33413-33428 |
| superseded by newer sign-in | pending | failed | :22062-22089 |

Invalid but reachable.
- P1 readback returns pending forever after expiry. Expiry is enforced only in pollProviderDeviceAuthorization (:33328-33349). listCurrentProviderDeviceAuthorizations (:22038-22061) maps session.status verbatim and never compares expiresAtMs with Date.now(). A never-polled session stays pending in GET responses indefinitely; UI shows an active code that cannot succeed. Concrete: start at T, no poll, GET at T+expiry -> pending.
- P2 pending has two meanings with no discriminator. Network-transient pending (:33396-33411) and provider-pending (:33434-33440) both return pending; only optional lastError distinguishes them (:22060).
- P2 auth cache not ready returns pending without persisting explanation. :33443-33453 returns pending with lastError but does not update the session; next readback loses it.

Fix candidates: derive status in readback (pending + expiresAtMs <= now -> expired); persist auth-cache-not-ready error; explicit pendingReason provider|transport|local-cache instead of overloading lastError.

## M7 - Queue attempt lease fence

Source: queue-runtime/fence.ts:71-80 states, :200-264 DDL/statements, :272-331 begin, :338-369 complete, :372-378 kill, :380-432 read/evidence.

States. Explicit active | completed | expired (:71). Implicit killed (separate table), lease_held.

Invariants.
1. One row per (job_id, attempt); one active lease id.
2. completed implies durable evidence with same lease (:282-303, :359-369).
3. complete succeeds only for current active unexpired lease (:352-358).
4. Lease past expires_at is not accepted; marked expired (:355-357, :415-421).
5. Killed job cannot begin/record/complete (:274-276, :339, :402-404).

Transitions.

| Event | From | To | Code |
|---|---|---|---|
| begin no row | absent | active | :315-330 |
| begin active unexpired | active | lease_held throw | :305-310 |
| begin active expired | active | expired then new active | :311-330 |
| begin completed with evidence | completed | completed idempotent | :282-299 |
| begin completed no evidence | completed | already_completed throw | :300-303 |
| record evidence | active | active + evidence | :401-433 |
| complete with evidence | active | completed | :338-369 |
| complete expired/other lease | active/expired | expired / reject | :352-358 |
| kill | any | killed marker; fence unchanged | :376-378 |

Invalid but reachable.
- P2 kill leaves attempt row active forever. kill only inserts queue_attempt_kill (:376-378); it never expires/completes the fence. beginAttempt then throws killed (:274-276), so the row is unreachable but readAttempt still reports active (:380-392). Operator sees an active lease for a killed job.
- P2 unknown/corrupt state is coerced to active. readAttempt maps anything other than completed/expired to active (:391), while complete requires row.state === active (:352). A non-canonical state reads active but never completes; read/write models disagree.
- No P0/P1 in normal fencing. Conditional SQL updates (:256-261, :366-369) are race-safe; evidence+lease check is right.

Fix candidates: add killed to AttemptState or expire row on kill; reject unknown DB states; kill writes a terminal state.

## M8 - Replay intent claim/retry

Source: track-b-runtime.ts:1866-1893 claim/expired unions, :1901-1961 claimReplayIntentWithRecovery, :1964-1981 scheduler contract.

States. Explicit claimed | empty | expired(scheduler_intent_expired) (:1885-1893). Implicit retry-fresh-intent, malformed-receipt.

Invariants.
1. Claim receipt names same replayJobId/scope enqueued (:1933-1937).
2. leaseId/fence/attempt safe (:1927-1932).
3. Expired intent gets exactly one fresh intent referencing same durable job (:1896-1900, :1914-1924).
4. Failed enqueue is not silently treated as no work.

Transitions.

| Event | From | To | Code |
|---|---|---|---|
| enqueue accepted, claim returns | absent | claimed | :1917-1954 |
| claim null | absent | empty | :1922-1923 |
| claim expired | expired | retry retry-N | :1924, :1915 |
| retries exhausted | expired | expired(maxAttempts) | :1955-1961 |
| malformed claim | claimed? | throw | :1944-1953 |

Invalid but reachable.
- P1 enqueue rejection is ignored and becomes empty. await scheduler.enqueue at :1917 discards {accepted:boolean}. If enqueue returns accepted:false and claim returns null, function returns {state:"empty"} (:1923) as if no work existed. Replay job never dispatched; no error. Silent lost work.
- P2 malformed claim throws after enqueue, leaving intent durable. :1944-1953 throws after enqueue at :1917; caller sees error but scheduler intent remains. Retry uses a new intent id (:1915), stranding the old one unless scheduler dead-letters.
- P2 empty is not distinguished from scheduler unavailable. Null claim from a broken scheduler equals legitimately empty queue; no health signal.

Fix candidates: check enqueue.accepted and return typed enqueue-rejected; compensate/release/dead-letter on malformed receipt; distinguish scheduler health from empty.

## M9 - Development-verification lease

Source: development-verification.ts:18-35 fields, :135-190 negotiation, :181 expiry.

States. Capability enabled:false reason authorization_absent, or enabled:true fields (:36-45). Implicit expired, revoked-epoch, wrong-scope/deployment, wrong-key, not-yet-active.

Invariants.
1. Channel development and destination development_verification.
2. Scope, deployment set, signer key, data class match host policy.
3. issuedAt <= now <= expiresAt.
4. revocationEpoch equals current operator epoch.
5. Lease signed by trusted key, not a key named inside itself.

Transitions.

| Event | From | To | Code |
|---|---|---|---|
| absent | disabled | disabled authorization_absent | :136-139 |
| valid | disabled | enabled | :181-190 |
| expired/not-yet-active | enabled? | throw | :181-184 |
| epoch mismatch | enabled? | throw | :168-180 |
| scope/deployment/key mismatch | enabled? | throw | :150-167 |

Invalid but reachable.
- P2 no state contradiction found. Checks are ordered fail-closed; malformed lease throws rather than enabling. Only weakness: now sampled once (:178), no skew allowance; boundary can flip if a caller samples again.
- P2 non-single-use lease. Capability is a lease, not a nonce; replay within TTL is allowed by design; no consumption record in this module.

Fix candidates: record consumed authorization id/digest if replay protection required; keep single now snapshot.

## Cross-machine observations

1. Recurring shape: durable pending with no terminalizer. M5 pending batch, M6 pending after expiry, M7 active after kill, M8 enqueued after malformed claim. Read path reports live-looking state and no sweep/finally moves it. Prefer persisted terminal reasons plus startup reconciliation.
2. try/finally missing at admission boundaries. M2 begin outside runner try; M5 pending write before throwing Promise.all. Highest-impact leaks because transient error becomes permanent busy/pending.
3. No P0 proven. Worst are P1 liveness/leak: benchmark admission leak on pre-aborted signal, batch pending forever on one bad member, device-auth stale pending after expiry, replay enqueue rejection lost as empty, uncancelled timeout work. None corrupts completed evidence; all can block or misreport work.
4. Positive controls. Queue fence conditional SQL and evidence/lease check (M7), device poll expiry-first branch (M6), development lease fail-closed ordering (M9) are the strongest; use as template.
