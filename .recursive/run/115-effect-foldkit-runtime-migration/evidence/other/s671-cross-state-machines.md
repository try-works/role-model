# S671 cross-repo state-machine audit (track-b / capture / projection)

Audit only. No source was modified. One findings file written.

- Public worktree: `D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration`, HEAD `23fbfdf2`.
- Private worktree: `D:/DEV/role-model-internal/.worktrees/115-effect-foldkit-runtime-migration`, HEAD `a42bf551`.
- Method: read every listed path, followed each state variable through its writers/readers, and checked whether each invalid state has a concrete reachable interleaving or crash point. Line numbers are current at the above heads.
- Public `role-model-router/scripts/track-b/**` does not exist in this worktree (the Track-B scripts are private); the public audit covers the host-bridge `track-b-*.ts` surfaces and `packages/sqlite-memory/src`.

## Machine count and priority summary

Nine explicit or implicit state machines were found.

| # | Machine | Owner | Priority findings |
|---|---|---|---|
| M1 | Durable capture WAL (pending/inflight/maintenance/closed/degraded) | private `shared/capture/durable-queue.mjs` | P0 data loss in `drain`; P1 close/flush duplicate |
| M2 | Capture maintenance/drain epoch | private `shared/capture/durable-queue.mjs` | P1 two-phase gap; P2 stale-owner takeover |
| M3 | Projection generation/persistence | private `shared/projections/index.mjs` | P1 alias generation regression; P1 persist/memory divergence; P2 join collapse |
| M4 | Deferred route-capture queue | public `track-b-capture-queue.ts` | P1 no claim/lease; P1 crash-after-handler duplicate |
| M5 | EventLog append/archive/rollback | private `extensions/event-log/index.mjs` | P0 archive trim vs rollback receipt; P2 post-commit error ambiguity |
| M6 | Performance history policy/prune | public `sqlite-memory/src/history-policy.ts` | P1 non-transactional prune; P2 unarchived policy |
| M7 | Replay budget reservation ledger | public `track-b-replay-ledger.ts` | P1 corrupt-load budget reset; P1 cross-process lost update |
| M8 | Auto-replay tick/disposition/cursor | public `track-b-auto-replay.ts` + private `shared/capture/replay-disposition.mjs` | P1 terminal disposition overwrite; P1 cursor skips deferred; P1 dispatch/cursor crash gap |
| M9 | Replay job lease/fence | private `extensions/replay-core/index.mjs` | P2 lapsed-owner duplicate dispatch; P2 exact-expiry boundary |

Counts: **2 unique P0 (3 occurrences: M1 drain, M2 drain duplicate, M5 archive trim), 14 P1, 15 P2**.

---

## M1 - Durable capture WAL

Files: private `shared/capture/durable-queue.mjs`; lifecycle `capture-layer.mjs:1-40`.

### States
- `ready/pending`: row is enqueued and claimable (`state='pending'`, `durable-queue.mjs:172-175`).
- `inflight`: claimed with `lease_id`, `lease_owner`, `lease_expires_at_ms`, `fence` (`:236-244`).
- `maintenance`: `capture_maintenance.active=1`; claims blocked by `NOT EXISTS (... active=1)` (`:240`).
- `closed`: handle marked closed and DB nulled (`:465-470`).
- `degraded/pressure`: storage failure or capacity refusal (`:166-170`, `:210-215`).

### Invariants
1. A row is completed only by the holder's `(lease_id,lease_owner,fence)` identity; wall-clock expiry does not deny completion (`:284-300`).
2. A sink result is acknowledged only after the sink returns `committed===true` (`:346-347`).
3. `close` rejects new entry points and a flush already awaiting its sink rejects with a distinct error (`:143-145`, `:342-355`).
4. An in-flight row is reclaimed only after its lease expires or its process is gone (`:85-94`, `:239`).

### Transitions
| From | Event | To | Guard / side effect |
|---|---|---|---|
| absent | `enqueue` | pending | insert `:172-184` |
| pending/expired inflight | `#claimRow` | inflight | fence+1, attempts+1, no active maintenance `:236-251` |
| inflight | sink `committed` | deleted | `#completeClaim` identity delete `:284-300` |
| inflight | sink throws | pending | `#requeueClaim` only if lease still live `:307-314`, `:355` |
| pending | `beginMaintenance` | maintenance active | no inflight + stale check `:362-383` |
| maintenance active | `endMaintenance` | inactive | token+fence `:386-393` |
| any | `close` | closed | DB closed `:465-483` |

### Invalid-but-reachable states
**P0-1: `drain` commits the delete before the caller has persisted the drained rows.**
- Reachability: caller opens maintenance, calls `drain` (`:396-408`); `DELETE FROM capture_wal WHERE state='pending'` and `COMMIT` at `:406-407` run before the returned rows are written anywhere else. A process death or a caller exception after the return leaves the rows permanently gone: no receipt is inserted, and the caller has no durable copy. This is reachable on every normal shutdown/migration path, not only a crash.
- Evidence: `:396-408` (return only in memory), no receipt/outbox table in the schema (`:55-95`).
- Rank: **P0**.
- Fix: make drain two-phase (mark `draining` in the transaction, return rows plus a durable drain receipt id, delete only after the consumer acknowledges), or write an outbox row in the same transaction.

**P1-1: `close` after the sink commits strands the row until lease expiry and replays it.**
- Reachability: sink returns `{committed:true}` at `:341`; before `:344` another task calls `close` (sets `closed`, nulls DB, `:466-470`); `:344` sees `closed` and throws; the catch at `:349-355` deliberately does not requeue after close, so the row remains `inflight`. A later owner reclaims it after expiry (`:85-94`, `:239`) and calls the sink again, re-persisting an already-committed capture.
- Evidence: `:341-355`, `:465-470`.
- Rank: **P1** (at-least-once duplicate after committed side effect).
- Fix: persist a `completed_unacked` state before the close check, or have `close` await the in-flight sink and complete/fence it; never leave an unacknowledged committed row as plain inflight.

**P1-2: lease lost after sink commit requeues a committed sink when the lease is still live.**
- Reachability: sink returns committed; renewal sets `lost=true` (`:268-281`); `:345` throws before `:347`; catch `:355` calls `#requeueClaim`, which succeeds if `lease_expires_at_ms>now` (`:307-314`), so the row is reset to pending despite the sink having committed. Next flush re-runs the sink.
- Evidence: `:341-347`, `:258-281`, `:307-314`.
- Rank: **P1**.
- Fix: treat renewal loss as an ambiguous commit: persist a durable `sink_committed` marker before renewal check, or require sink idempotency keys; do not blind-requeue after a successful sink.

**P2-1: `close` closes the DB while the renewal timer can still fire.**
- Reachability: `#startRenewal` interval (`:268-276`) runs while sink awaits; `close` closes DB (`:479`); timer catches and sets `lost=true` (`:272-275`); flush then reports a spurious lease-loss/closed error. The row is still fenced, so no corruption, but the error class misdiagnoses the shutdown.
- Rank: **P2**.

**P2-2: capacity pressure is not a row state.**
`enqueue` returns false with a volatile receipt at `:166-170`, but the row is not recorded; `receipts()` after close returns only volatile receipts (`:414-423`). This is an intentional bounded degradation, not a lost state; rank P2 for observability.

## M2 - Capture maintenance/drain epoch

Files: private `shared/capture/durable-queue.mjs` (`:362-413`).

### States
inactive; active (`owner_id, token, fence`); stale-reclaimable (>5 min); fenced-out; closed.

### Invariants
- Only one maintenance owner per channel; a live owner's token is required to drain/end.
- Drain requires zero inflight and an active token (`:398-404`).

### Transition table
| From | Event | To | Guard |
|---|---|---|---|
| inactive | begin | active | no active <5m, zero inflight `:368-377` |
| active | begin by another owner | active (new token/fence) | age >=5m `:369-377` |
| active | end | inactive | owner+token+fence `:388-392` |
| active | drain | deleted pending set | token+fence+zero inflight `:398-407` |

### Invalid-but-reachable states
**P1-3: stale takeover has no liveness check.**
- Reachability: owner A begins maintenance at t0 (`:362-379`) and stalls but stays alive; at t0+5m owner B begins. `beginMaintenance` only checks age (`:369`) and zero inflight (`:372-373`), not `lease_process_id`/owner liveness (contrast row reclaim at `:92`). B replaces A's token/fence; A's later `endMaintenance`/drain is fenced, so no concurrent deletion, but A's maintenance work is silently discarded.
- Rank: **P1** (lost maintenance work / operator false success), no row data loss.
- Fix: store and check maintenance owner process id (or a heartbeat) before takeover; expose a `fenced` result to A instead of a generic token error.

**P0-2 (same code as M1 P0-1): drain's delete-before-consumer.**
The maintenance epoch does not add a durable handoff, so `drain` has the same P0 loss window (`:405-408`).

## M3 - Projection generation/persistence

Files: private `shared/projections/index.mjs`; `projection-layer.mjs`.

### States
absent; built/ready; degraded; stale (`source_invalidated`); persisted; persist-failed (in-memory only); rolled-back.

### Invariants
1. A projection alias resolves the highest source generation (`#refreshAlias`, `:206-217`).
2. A row is durable before a caller observes success (`#persist` after map set, `:291-298`).
3. A stale row keeps its identity but reports `generationReadiness='stale'` (`:326-339`).

### Transition table
| From | Event | To | Guard |
|---|---|---|---|
| absent | `build/buildFromEvidence` | ready/degraded | refs/evidence `:291-309` |
| ready | `verifyEvidence` | rebuilt | evidence ref exists `:311-323` |
| any | `invalidateByArtifact` | stale/degraded | source ref matches `:326-339` |
| any | `evict` | absent | alias refresh `:341-347` |
| any | `rollback` | empty | none `:381-385` |

### Invalid-but-reachable states
**P1-4: building a lower generation regresses the alias.**
- Reachability: `build("cap", gen2)` sets alias to p2 (`:295-296`); `build("cap", gen1)` sets alias to p1 unconditionally (`:296`) while p2 remains in `#v`; `get("cap")` follows the alias at `:349-352` and returns gen1. `#refreshAlias` would have chosen gen2, but it is only called on evict/invalidate paths.
- Evidence: `:206-217`, `:291-298`, `:349-352`.
- Rank: **P1** (serves stale projection generation; list still contains both).
- Fix: route every build through `#refreshAlias` or compare generations before replacing the alias; evict/retire the older projectionId.

**P1-5: persist failure leaves memory ahead of durable state.**
- Reachability: `build` sets `#v` and alias (`:295-296`) then `#persist` writes temp and renames (`:241-248`). Disk-full/permission/rename failure throws; the caller sees failure but `get/list` return the new row for the process lifetime. A retry builds another row; `list` contains both, and a restart loses the first.
- Evidence: `:241-248`, `:291-298`, `:301-309`.
- Rank: **P1**.
- Fix: clone/rollback the map+alias on persist failure, or build into a staged row and swap only after rename succeeds; fsync temp before rename.

**P2-3: page join collapses missing vs unavailable for non-evidence rows.**
- Reachability: `build` uses `includeEvidence=false` (`:291-298`); `degradationReasons` maps both `item.missing` and `item.available===false` to the single reason `"missing"` (`:100-101`); `page` falls back to that reason (`:372-377`), so an unavailable source is counted as missing and `unavailable` is 0. Only `buildFromEvidence` rows keep the distinction.
- Evidence: `:100-101`, `:291-298`, `:361-379`.
- Rank: **P2** (operator census under-reports unavailability).
- Fix: carry separate `missingSources`/`unavailableSources` fields on every row, not only evidence rows, or derive from normalized source entries.

**P2-4: concurrent persists use the same temp name.**
`#persist` names temp `${filePath}.tmp-${process.pid}` (`:244`); two engine instances in the same process write/rename the same temp path, so one can rename the other's bytes and the last rename wins. Cross-process uses different pids but still last-writer-wins with no lock.
- Rank: **P2**.
- Fix: unique random temp + atomic rename; cross-process lock or single-writer service.

**P2-5: `rollback` is destructive and not a durable rollback.**
`rollback` clears all rows and persists empty (`:381-385`); there is no previous-version snapshot. A caller treating it as "roll back the last generation" loses every projection.
- Rank: **P2**.
- Fix: rename to `clear` or implement versioned snapshots.

**P2-6: constructor does not recover a crash-left temp file.**
It reads only `filePath` (`:219-239`); a temp from a crash is ignored, and the prior committed file is used. This is safe for consistency but leaves garbage and gives no recovery receipt.
- Rank: **P2**.

## M4 - Deferred route-capture queue (public host bridge)

File: public `role-model-router/apps/runtime-host-bridge/src/track-b-capture-queue.ts`.

### States
pending waiting (`next_attempt_at_ms`); pending due; retry/backoff; delivered (receipt); expired; failed (attempts exhausted); deferred.

### Invariants
1. A handler runs at most once per item at a time (intended; not enforced).
2. A successful handler deletes the pending row and inserts exactly one receipt in one transaction (`:357-379`).
3. A terminal failure deletes pending and records `expired`/`failed` (`:389-417`).

### Transition table
| From | Event | To | Guard |
|---|---|---|---|
| absent | enqueue | pending due | no existing pending/receipt, capacity `:192-228` |
| pending due | drain select | handler | none `:301-337` |
| handler ok | receipt transaction | delivered | delete+insert commit `:357-379` |
| handler throws | retry update | pending backoff | attempts<max, not expired `:418-430` |
| handler throws | terminal transaction | expired/failed | deadline or max attempts `:387-417` |
| handler returns deferral | update | pending future | `deferredUntilMs` `:338-355` |

### Invalid-but-reachable states
**P1-6: no claim/lease between select and handler; two drains deliver the same item.**
- Reachability: drain A selects row R at `:301-334` and awaits `handler` at `:337`; the row is still `pending` with the same `next_attempt_at_ms`. Drain B (periodic + shutdown, or two processes) selects the same R and runs the handler. Both then delete/receipt; the second delete affects 0 rows and `INSERT OR REPLACE` rewrites the receipt. The handler side effect ran twice.
- Evidence: `:301-334` (select only), `:337` (outside lane), `:357-379` (delete/receipt, no compare-and-set on attempts).
- Rank: **P1** (at-least-once duplicate route capture).
- Fix: add a claim column/state with token+lease and `UPDATE ... WHERE state='pending' AND next_attempt...` in the selecting transaction; handler result commit uses the token as CAS.

**P1-7: handler success then process death before the receipt transaction replays the item.**
- Reachability: handler returns at `:337`; process dies before `:357-379`; the pending row remains. Restart sees `next_attempt_at_ms <= now` and re-delivers. There is no `delivering` tombstone.
- Rank: **P1**.
- Fix: write an `in_flight` claim/tombstone before the handler, and make the receipt transaction require that token; recovery can decide whether to retry or mark unknown.

**P2-7: retry update has no attempt/fence compare.**
Two drains that both saw `attempts=n` each write `attempts=n+1` at `:420-429`; one increment is lost, extending retries; `next_attempt_at_ms` last-writer-wins.
- Rank: **P2**.

**P2-8: capacity only counts pending rows.**
`maxItems` checks `COUNT(*) FROM track_b_route_capture_pending` (`:205-209`); delivered/expired receipts in `track_b_route_capture_receipts` are unbounded (schema `:115-119`). A long-lived runtime can grow receipts without bound.
- Rank: **P2**.

## M5 - EventLog append/archive/rollback

File: private `extensions/event-log/index.mjs`.

### States
append transaction open; committed; recovered/clean; recovery-failed; retained (archived); rolled-back.

### Invariants
1. Hash chain extends the maximum sequence across facts+archive (`:177-188`).
2. Exact idempotency replay returns the existing row (`:171-173`, `:191-198`).
3. A retention receipt can restore exactly the rows archived under it (`:321-335`).

### Transition table
| From | Event | To | Guard |
|---|---|---|---|
| absent | append | committed fact | insert+commit `:189-190` |
| committed | retain | archived | transaction `:303-317` |
| archived | rollbackRetention | fact restored | receipt not rolled back `:323-335` |
| append error pre-commit | recovery | clean or recovery-failed | rollback still open `:223-240` |
| append error post-commit | recovery | committed fact + error | no open transaction `:203-207` |

### Invalid-but-reachable states
**P0-3: archive trimming deletes rows that a live rollback receipt still needs.**
- Reachability: `retain` archives rows under receipt R and inserts R (`:309-313`); the same transaction then trims `event_fact_archive` to `maxArchiveRowsPerChannel` **without regard to receipts** (`:314`), and can trim receipt rows independently (`:315`). Later `rollbackRetention(R)` selects only surviving archive rows (`:327`), restores them, deletes that subset, and marks R rolled back (`:334-335`) even when 0 or partial rows remain. The rollback reports success with `restored` less than the receipt's `removed` count; the missing events are unrecoverable.
- Evidence: `:303-318` (trim), `:321-338` (rollback).
- Rank: **P0** (silent audit/event loss; rollback reports a clean terminal state).
- Fix: never trim archive rows referenced by a non-rolled-back receipt; enforce with FK/trigger or compute the trim against receipts as a unit; return `partial`/`unavailable` instead of marking rolled back when rows are missing.

**P2-9: post-commit append failure is returned as an append failure.**
`COMMIT` at `:190` can be followed by a failed readback (`:200`) or prune (`:201`); the catch at `:203-207` surfaces the error although the event is committed. A caller that does not retry with the same idempotency key records a false failure. The idempotent retry path at `:171-173` makes recovery possible, but only if the caller retries.
- Rank: **P2** (ambiguous outcome, no data loss).
- Fix: separate commit from post-commit pruning; return the committed row and a non-fatal prune warning.

## M6 - Performance history policy/prune

File: public `role-model-router/packages/sqlite-memory/src/history-policy.ts`.

### States
policy current; sample retained; sample pruned; rollup updated; policy archived (intended, not implemented).

### Invariants
1. Prune keeps rows within age/count/bytes (`:150-162`).
2. Rollup matches the retained set (`:165-179`).
3. A policy change is versioned/archived (`:80-85` table, `:101-112` write).

### Transition table
| From | Event | To | Guard |
|---|---|---|---|
| sample | enforce | retained/pruned | age/count/bytes `:150-162` |
| retained/pruned set | rollup upsert | rollup | after delete loop `:165-179` |
| policy | write | new policy | validate only `:101-112` |

### Invalid-but-reachable states
**P1-8: prune deletes rows outside a transaction, then writes the rollup.**
- Reachability: `for (const sampleId of pruned) remove.run(sampleId)` at `:163-164` is not wrapped in a transaction; the process can die after some deletes and before the rollup at `:165-179`. The table is partially pruned while the rollup still names the old counts/bytes (or a previous run's). A later enforce repairs it, but until then readers see inconsistent history.
- Evidence: `:163-179`.
- Rank: **P1**.
- Fix: one `BEGIN IMMEDIATE` around delete+rollup; or delete via a single bounded statement and update rollup in the same transaction.

**P2-10: policy updates are not archived.**
`performance_history_policy_archives` and `MAX_ARCHIVES/MAX_ARCHIVE_*` are declared (`:6-8`, `:80-85`), but `writePerformanceHistoryPolicy` only updates the singleton and returns a receipt (`:101-112`). The previous policy cannot be restored; the receipt is not durable.
- Rank: **P2**.

**P2-11: concurrent insert between select and delete makes the rollup stale.**
Rows are selected at `:135-146`; a concurrent insert after that is neither in `retained` nor deleted, but the rollup is written as if it were absent (`:165-179`). Rank P2.

## M7 - Replay budget reservation ledger

File: public `role-model-router/apps/runtime-host-bridge/src/track-b-replay-ledger.ts`.

### States
none; reserved; dispatch recorded; terminal counterfactual; released; pruned-stale.

### Invariants
1. Reserve before dispatch, accounting reservations in the daily ceiling (`:297-351`).
2. A terminal capture cannot be reserved again in the same window (`:303-309`).
3. A reservation is released or consumed exactly once (`:353-368`, `:410-425`).

### Transition table
| From | Event | To | Guard |
|---|---|---|---|
| none | reserve | reserved | limits `:297-351` |
| reserved | record | reservation decremented/removed | dispatch accepted `:390-427` |
| reserved | release | none | reservation id `:353-368` |
| reserved | pruneStale | none | age > TTL `:370-388` |
| reserved | completeCounterfactual | terminal | capture+policy `:429-440` |

### Invalid-but-reachable states
**P1-9: a corrupt ledger silently becomes an empty ledger and is overwritten.**
- Reachability: `load` catches any parse/read error and returns `{ schemaVersion, windows:{} }` (`:248-256`); the next `reserve` pushes a reservation and `persist` renames over the corrupt file (`:259-264`, `:343-350`). All prior terminal counterfactuals/reservations disappear, resetting the daily ceiling and allowing re-dispatch/overspend.
- Evidence: `:248-256`, `:259-264`, `:297-351`.
- Rank: **P1** (cost/abuse ceiling reset; audit loss).
- Fix: fail closed on parse error, quarantine the file, and require an explicit recovery path; never treat corruption as empty for a budget authority.

**P1-10: reserve is a cross-process read-modify-write with no lock.**
- Reachability: two processes call `reserve` concurrently; both `load` the same file (`:300`), both append a reservation to their own copy (`:343-349`), and both `persist` with last-rename-wins (`:259-264`). One reservation is lost, so the daily dispatch ceiling is under-counted; both dispatches proceed.
- Evidence: `:297-351`, `:259-264`.
- Rank: **P1**.
- Fix: SQLite/append-only WAL or a cross-process lock; make reserve an atomic compare-and-append with a monotonic reservation sequence.

**P2-12: terminal dedupe is window-local.**
`hasTerminalCounterfactual` and `reserve` inspect only `windowOf(file, now())` (`:303`, `:442-445`); a capture that completed yesterday can be reserved again today after midnight. This may be intended daily accounting, but it is a repeat-dispatch path. Rank P2.

**P2-13: reservation id uses a mutable length and millisecond time.**
`reservationId = hash(key\0atMs\0reservations.length)` (`:339-342`); two processes/writers can mint the same id at the same ms and length, making release/prune target the wrong row when files merge. Rank P2.

## M8 - Auto-replay tick/disposition/cursor

Files: public `track-b-auto-replay.ts`; private `shared/capture/replay-disposition.mjs`.

### States
capture pending/unsettled; deferred; replayed; refused; cursor at last processed; disposition row terminal/deferred.

### Invariants
1. A terminal disposition (`replayed`/`refused`) is final; only unsettled captures are pending (`replay-disposition.mjs:6`, `:283-296`).
2. The cursor resumes after the last capture the tick actually started (`track-b-auto-replay.ts:1029-1038`).
3. Ledger terminal + release + disposition are written in a terminal order with no lost work (`:1528-1537`).

### Transition table
| From | Event | To | Guard |
|---|---|---|---|
| pending | tick | replayed/refused/deferred | gates `:1027-1537` |
| cursor n | tick starts capture n | cursor n | set before work `:1037-1038` |
| deferred | next tick after cursor | never revisited | cursor slice `:1009-1016` |
| any | disposition `record` | overwritten row | unconditional upsert `replay-disposition.mjs:242-267` |
| terminal | later deferred write | deferred | no terminal guard `:242-254` |

### Invalid-but-reachable states
**P1-11: a deferred capture at the end of the cursor range is permanently skipped.**
- Reachability: captures `[A,B]`, no start cursor; A deferred, B deferred; loop sets `cursor=B` before each (`:1037-1038`) and returns B (`:1540`). Caller passes `startCursor=B`; `pending.findIndex(B)` is length-1, slice after it is empty (`:1009-1012`), so both deferred captures are never retried with the same corpus. `skipped` is only set when the cursor is absent (`:1013-1015`); it does not reset to the beginning.
- Evidence: `:1009-1016`, `:1033-1038`.
- Rank: **P1** for any caller that persists the returned cursor (the API advertises a resumable cursor at `:30`); no production caller was found in the public host-bridge at this HEAD, so reachability is via the documented contract.
- Fix: advance the cursor only after a terminal outcome; deferred captures must stay before the cursor, or wrap the cursor when the tail is exhausted.

**P1-12: terminal disposition can be overwritten by a later deferred write.**
- Reachability: capture C gets `replayed` via `record` (`replay-disposition.mjs:242-267`); a later resume/tick writes `deferred` for the same `(capture,policy)`; the unconditional `ON CONFLICT DO UPDATE` changes the row to `deferred` (`:247-254`). `pending()` then no longer filters it as terminal (`:293`) and the capture is replayed.
- Evidence: `:242-267`, `:283-296`.
- Rank: **P1** (terminal-state regression, duplicate work).
- Fix: `ON CONFLICT DO UPDATE ... WHERE outcome NOT IN ('replayed','refused')`, or apply the deferral/terminal decision in one transaction that reads the current row.

**P1-13: crash between ledger terminal and disposition leaves a terminal capture without its receipt.**
- Reachability: `completeCounterfactual` at `:1528-1531` persists the terminal ledger row; the process dies before `emitCapture` at `:1534-1537`. On restart `reserve` returns `duplicate_already_processed` (`track-b-replay-ledger.ts:303-309`) and the capture is emitted as `refused`/`duplicate` rather than `replayed`; the operator disposition is wrong even though the work was paid for.
- Rank: **P1** (status/accounting inconsistency), no additional dispatch.
- Fix: write the disposition before or atomically with the terminal ledger marker, or make `reserve` surface the prior terminal row so the tick can emit `replayed`.

**P1-14: crash after dispatch records but before terminal re-dispatches paid work.**
- Reachability: dispatches recorded at `:1447-1459`; process dies before `completeCounterfactual` (`:1528`); reservations remain; `pruneStaleReservations` releases them after TTL (`:997-1000`), and the next tick reserves again and re-dispatches. There is no branch-level terminal tombstone in the capture path.
- Rank: **P1** (duplicate provider spend).
- Fix: persist a per-capture dispatch receipt/terminal marker before or with each dispatch, and have the next tick reconcile whether the branch already exists.

## M9 - Replay job lease/fence

File: private `extensions/replay-core/index.mjs`.

### States
unleased; leased; expired; reclaimed; awaiting_evaluation; terminal.

### Invariants
1. A live lease cannot be stolen; exact expiry is claimable (`:1006`).
2. Reclaim bumps `fenceToken` and abandons old `dispatching` markers (`:1037-1057`).
3. Only the current `(leaseOwner,fenceToken)` may dispatch (`:1081-1083`).

### Transition table
| From | Event | To | Guard |
|---|---|---|---|
| unleased/expired | claim | leased | no live lease, owner cap `:1006-1018` |
| leased | expiry/claim | reclaimed | fence+1, abandon dispatches `:1037-1057` |
| leased | release | unleased | owner+fence `:1068-1077` |
| any | release by old owner | rejected | fence mismatch `:1071` |

### Invalid-but-reachable states
**P2-14: a lapsed owner's provider call can still be running when a new owner reclaims and re-dispatches.**
- Reachability: owner A's lease expires during a long provider call; owner B claims, marks A's `dispatching` markers `abandoned`, releases their reservations and dispatches again (`:1037-1057`). A's call then completes; its receipt is fenced, but the provider was paid twice. This is the documented recovery tradeoff, not a correctness bug, but it is a real duplicate-cost state.
- Rank: **P2**.
- Fix: make dispatch cancellation cooperative (abort token per lease) and/or reconcile A's late receipt against the abandoned marker before B dispatches.

**P2-15: exact-expiry boundary is claimable.**
`if (job.leaseExpiresAtMs > now) throw` (`:1006`) lets a claim at `now === leaseExpiresAtMs` through, while `#assertCurrentJobLease` rejects `<= now` (`:1081-1082`). At the exact millisecond, the old holder cannot dispatch but the new holder can claim; this is intentional boundary semantics but can produce a transient double-attempt.
- Rank: **P2**.

---

## Cross-machine repair candidates (ordered)

1. **Make every destructive handoff two-phase/durable.** CaptureQueue.drain, host route-capture drain, and history prune currently delete before a durable consumer ack. Add `draining`/`in_flight` states with token+lease and only delete after the consumer receipt commits.
2. **Put a fence/epoch on all queue work.** The private WAL has a fence; the public host queue does not. Add `claim_token`/`claimed_at_ms` to `track_b_route_capture_pending`, claim in the selecting transaction, and CAS every handler result.
3. **Never trim evidence needed by a rollback receipt.** EventLog archive trim must be receipt-aware, and `rollbackRetention` must return a partial/unavailable result instead of marking a receipt rolled back when archived rows are missing.
4. **Protect terminal states.** ReplayDispositionStore upsert must be conditional on non-terminal; projection aliases must compare generations; auto-replay cursor must advance only after a terminal disposition.
5. **Fail closed on accounting corruption.** ReplayLedger.load must not turn a corrupt budget file into an empty one; quarantine and require explicit recovery.
6. **Atomic durability.** Projection persist should stage and swap (with fsync); history prune should be one transaction; ledger reserve should use a lock/WAL.
7. **Separate commit from post-commit maintenance.** EventLog append should not report failure after COMMIT because a prune/readback failed.

## Reachability caveats

- M1 P0 drain loss and M5 P0 archive trim loss are direct code paths with no external precondition beyond a caller using the documented API and a process death/exception.
- M4 duplicate delivery is reachable with two concurrent `drain` calls in one process; the host-bridge timer plus shutdown path is sufficient, and two processes on the same SQLite file are also possible.
- M8 cursor skip requires a caller that persists the returned cursor; the API documents it as resumable (`track-b-auto-replay.ts:30`), but no public caller was found at this HEAD, so it is ranked P1 contract-level rather than P0.
- M3 alias regression is directly reachable through the public `build` API; no clock or crash is needed.
- P0/P1 rankings reflect data loss/duplicate paid work/security of accounting, not test coverage.
