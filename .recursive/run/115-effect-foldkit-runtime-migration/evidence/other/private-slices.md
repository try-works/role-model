# Private lifecycle slices — controller-verified summary (R29, R30, R29-drain)

Private worktree: D:/DEV/role-model-internal/.worktrees/115-effect-foldkit-runtime-migration (baseline 16021cc5). The raw logs live in that worktree's run directory; this file records what the public controller re-ran and observed, so the public artifact cites a path that exists here.

## S9b — EventLog append must not mask a post-COMMIT failure (R29)
File: extensions/event-log/index.mjs. New test: tests/track-b/run115-event-log-postcommit-rollback.test.mjs.
- Defect: the append catch ran ROLLBACK unconditionally after COMMIT, so any post-commit failure surfaced "cannot rollback - no transaction is active" instead of its cause.
- Repairs across three rounds, each with a failing test first: guarded rollback; a single recovery helper used by append, retain and rollbackRetention; a guard so an unreadable handle still rethrows the real cause; a recoveryFailed flag surfaced by health() and by later mutations instead of a raw SQLite error.
- Controller re-runs: new suite 9/9; run96 event-log idempotency 1/1; run96 authoritative event stream 1/1; extension-contract-depth SP47 7/7; all exit 0.
- Verified runtime fact: database.isTransaction exists on node:sqlite DatabaseSync (own instance getter, true after BEGIN, false after COMMIT).
- anti_slop_lint: new test clean; index.mjs retains 6 pre-existing no-runtime-typeof findings on untouched lines.

## S10 — CaptureQueue close must fail closed (R30)
File: shared/capture/durable-queue.mjs. New test: tests/track-b/run115-capture-queue-close.test.mjs.
- Defect: a flush in flight at close resolved {committed:0,requeued:0} (a silent no-op), and post-close entry points hit a null handle.
- Repair: one documented closed-error pair, guards on enqueue/flush/peek/receipts/health, renewal stopped before every new throw, claim and requeue semantics untouched.
- Controller re-runs: new + durable-queue suites 21/21 exit 0.
- Reviewer PASS with four disclosures (recordDegradation, remaining unguarded maintenance/drain entry points, a shutdown-race call site, a dropped concurrent sink cause); follow-ups are in flight.
- Known semantic consequence, recorded rather than hidden: the interrupted row keeps its lease, so a later owner re-delivers it after lease expiry. The real sink dedupes on the durable pointer; the queue itself is at-least-once.

## S9a — Capture backlog drain must join before stores close (R29)
File: scripts/track-b/runtime-operations-server.mjs. New test: tests/track-b/run115-capture-drain-close.test.mjs.
- Defect: close() neither cleared nor joined the 5 s drain interval, so a pass could run against stores close() had already closed; a second close re-ran persist() against released handles.
- Repair: the timer callback returns early when closed and its pass promise is retained; a new joinCaptureBacklogDrain() races that promise against a deliberately referenced 5000 ms bound and records a stderr line if the bound expires; close() is idempotent, clears the interval, and awaits the join before persist() and every store close.
- Controller re-runs: drain tests 4/4; queue-close 7/7; event-log 9/9; all exit 0. Reviewer confirmed the sibling R30 edits survived a temporary HEAD swap by hash and by marker inspection.
- Residual, recorded not hidden: an in-flight request-path flush is still not joined, and createRuntimeOperationsServer.close() closes the service before the HTTP listener, so a request flush can outlive the stores and its post-flush metrics update is skipped. R30 turns that request into a graceful shutting_down result instead of a failure. This belongs to the composition slice, not to S9a.
- Over-claim fixed after review: the close comment now states the 5000 ms bound and the recorded fallback instead of claiming stores are never closed underneath a pass.
File: scripts/track-b/runtime-operations-server.mjs. New test: tests/track-b/run115-capture-drain-close.test.mjs.
- Defect: close() never clears or joins the 5 s drain interval, so a pass can continue against stores that close() has already closed.


## S24c evaluation domain boundary (private, R32)

- Factory `createEvaluationCore({ filePath, inMemory })` fails loudly when neither a non-empty path nor an explicit in-memory choice is given; all other options forward unchanged.
- The bare `new EvaluationCore()` construction is removed from the extension and root construction sites and from `EvaluationRunner`; `new EvaluationRunner({ inMemory: false })` now fails, while `new EvaluationRunner()` keeps its previous behaviour.
- Four mutations fail their rows: defaulting to in-memory, restoring the bare runner default, sharing one in-memory core, and dropping the injected file path.
- Accepted evaluation suites re-run unchanged: 189/189.
- Still open: an Effect Layer per domain with bounded joins and a readiness handshake, versioned DTO/capability negotiation, the remaining ambient domains, and a mandatory end-to-end in-memory choice.


## S24d artifacts domain boundary (private, R32)

- Factory `createArtifactStore({ rootPath, digestKey, encryptionKey })` fails loudly on a missing or blank root or key material; no silent development-key fallback.
- The managed-key construction site now crosses the factory; the key-less development branch is reported as follow-up rather than half-fixed.
- Four mutations fail their rows: dropped root requirement, dropped key requirements, a shared store across roots, and a dropped injected root.
- Accepted artifact-store suites re-run unchanged: 44/44, with the cross-repo legacy-sqlite suite excluded because it requires ROLE_MODEL_PUBLIC_WORKTREE.


## S24e events domain boundary (private, R32)

- The worker event-log singleton read `ROLE_MODEL_EXTENSION_STATE_ROOT` and `ROLE_MODEL_EXTENSION_CHANNEL` at its first call and cached one process-wide instance; a caller could not inject an environment.
- Now `createWorkerEventLog({ stateRoot, channel })` never reads `process.env`, returns an independent log per call and rejects a blank state root or channel; the worker adapter reads the environment at call time and caches per explicit pair.
- Four mutations fail their rows: process wins over argument, one shared module-level log, import-time capture, and a blank state root accepted.
- Accepted event-log suites re-run: 132 of 133, the single non-pass asserting ROLE_MODEL_PUBLIC_WORKTREE (cross-repo prerequisite, pre-existing).


## S23c ack pruning made replay-safe (private, R31)

- Reproduced the hole: with a small ack budget, pruning deleted a committed ack and replaying the same envelope returned queued instead of duplicate.
- Fixed with a bounded tombstone table written before the ack rows are deleted; the duplicate check spans acks and tombstones, capped at the same ack budget.
- Two-direction proof: the replayed pruned envelope is refused, a genuinely new envelope after the watermark is accepted and delivered.
- Three mutations fail their assertions (tombstones ignored, prune without tombstones, cap removed); accepted contribution and outbox suites pass unchanged (112/112).
- Residual stated: a replay older than the tombstone window is accepted again.


## S24f capture domain boundary (private, R32)

- Factory `createCaptureQueue({ stateRoot, channel })` fails loudly on a missing or blank root or channel and forwards the queue options unchanged.
- Five mutations fail their rows: missing root, missing channel, a shared queue across roots, a dropped root, and a lost drain closed-guard.
- The close/drain contract is pinned at the boundary (maintenance token, single active maintenance, drain deletes pending rows, idempotent close, documented CAPTURE_QUEUE_CLOSED error).
- Accepted capture and queue suites re-run unchanged: 63/63.


## S24g learning domain boundary (private, R32)

- Removed the default profile path; `createProfileLearner({ filePath, inMemory })` requires one explicitly, and `profileStorePathFor({ stateRoot })` never reads `process.env`.
- Four mutations fail their rows, including an environment fallback; two learners with different paths are isolated and the same path reopens its own profile.
- The S23b versioned publication still bumps versions with an atomic rename and no temp residue.
- Accepted learning suites: 113/115, the two non-passes being the documented pre-existing run-101 evaluation regression, cited rather than hidden.


## S24h knowledge worker environment (private, R32)

- Three call-time `process.env` reads (encryption key file, state root, artifact database) replaced by a frozen explicit environment factory and a pure candidate-path resolver.
- One named adapter remains the only environment reader for legacy callers; `defaultStateFile()` still reads the state root and is reported as the next item.
- Four mutations fail their rows, including a process-wins fallback and an import-time capture.
- Accepted knowledge suites: 106/106.

