# Run115 Phase1 AS-IS — private current-source analysis (worker output)

Read-only. No files edited, no child delegation, no DB opened, no tests or builds run. All findings below are **source observations** from the private worktree at `D:/DEV/role-model-internal/.worktrees/115-effect-foldkit-runtime-migration`; nothing here is a reproduced bug or a product PASS.

## 0. Baseline actually used

- Private `@role-model/internal` v1.1.0, `type: module`, Node `>=24 <25`, pnpm 10.6.5 (`package.json:2-9`).
- Identities in the bundle/locked `00-worktree.md`: public `f0d50fab…` / tree `b3d5cf91…`; private `16021cc5…` / tree `18a0e994…`. I confirmed the worktree path and files, but **did not independently re-run git** to recompute those SHAs (call budget). Treat identity re-verification as controller work.
- Anchors checked against normalized R19–R32 (`Source: §15.1–§15.6`) and the actual tree. I did not re-read the full `source-proposal.md`; no clause beyond R19–R32 is claimed.

## 1. Production topology (the real caller chain)

The private production entry is **not** `shared/capture/index.mjs`. It is the operations sidecar:

- `scripts/track-b/runtime-operations-server.mjs` — 9,357 lines, bundled by `scripts/track-b/build-runtime-distribution.mjs:246-256` to `dist/run00-dev/runtime-operations-server.mjs`.
- It is a hand-rolled Node service: imports `node:http createServer` (l.3), `node:sqlite DatabaseSync` (l.8), `node:child_process spawn` (l.2), plus `effect` `Effect, ManagedRuntime` (l.14) with the explicit comment “one ManagedRuntime per plane, not one store layer per offer” (l.11-13).
- Its imports are the private consumer wiring (l.16-113): `ArtifactStore` + legacy migration (16-17), `CaptureQueue` **from `shared/capture/durable-queue.mjs`** (18), replay disposition/provenance/classification (19-28), route policy store (29), full queue plane — policy, evaluation queue, queue-store, readback, admin/cancel/drain (30-62), learning readbacks (63, 94), dwell gate (65), reconciliation (66), extension journal/tuning (70-73), `ContributionClient`/destination authority (95), `EventLog` (96), `ReplayCore`/`createReplaySchedulerComposition` (97), retention/storage registry (98-104), capacity (105), key lifecycle (106-109).

`build-runtime-distribution.mjs` enforces exactly **13 canonical extensions** (l.196-197), bundles each `extensions/<id>/index.mjs` as `extensions/<id>.mjs` with esbuild (214-244), then bundles the sidecar (246) and the public `extension-host`/`worker-runtime` (273-296). Graph registry is staged and compiled at build (158-176); storage registry must be `shared/retention/index.mjs` (192).

**Observation:** the sidecar is a monolith with direct sync SQLite, direct HTTP, and direct `spawn`; there is no visible closed Layer DAG owning it. That is the central B9/B10 gap.

## 2. Service-by-service current state

### Graph — pure, already separated, no persistence
`shared/graph/index.mjs`:
- `compileGraphRegistry` (l.103), `compileArtifactStoreGraphVocabulary` (l.257), `ARTIFACT_STORE_GRAPH_VOCABULARY_SCHEMA` (l.198).
- Explicit authority statement: registry has “no persistence authority; Artifact Store owns the bytes” (l.1-2, 58-62).
- Legacy aliases `message→message_occurrence`, `next→ordered_successor`, etc. (63-80); fail-closed unknown kinds (144-170, 219-233); N/N-1 compatibility (133-142).
- Zero imports, zero Effect, zero clock/random. **Disposition: retained-pure** (do not Effect-ify; R5 requires scoring/graph/schema kernels stay pure). It needs characterization tests, not conversion.

### Artifact store — canonical persistence owner
- `extensions/artifact-store/index.mjs:297 export class ArtifactStore`; `probeExtension` 2655; `run(envelope)` 2671. I did not read the 2,655-line class body, so **method-level API inventory is still missing**.
- `bundle.mjs`: privacy profiles `local_full | local_redacted | aggregates_only | shareable_bucketed` (l.17); upload invariant — uploadEligible ⇒ `aggregates_only` **and** no `rawContentIncluded` (81-84); bundle cannot mix profiles (133-134); redaction report with forbidden fields `rawPrompt, rawResponse, rawToolArguments, rawToolResult, providerBody, token, secret` (165-166); `importArtifactBundle` (208); `ArtifactBundleWriter` (99).
- Graph vocabulary registration is the compatibility boundary (`index.mjs:167-174` stages `shared/graph/registry.json` next to the extension).

### Event log — bounded metadata store
- `extensions/event-log/index.mjs:114 export class EventLog`, `probeExtension` 299, `run` 313. Existing test: `extensions/event-log/test/package.test.mjs`. Internals unread: unknown whether it is one SQLite connection, its retention cap, or its write path. R28 explicitly warns EventLog is bounded metadata, not a raw inference journal — that must be asserted, not assumed.

### Capture — two very different implementations
- `shared/capture/index.mjs` is an **11-line in-memory shim**: `CaptureQueue` (l.1) with `maxRecords=100000`, `maxBytes=256MB`, `storageMode="graph_references_only"` (l.2), array-backed `enqueue/drain/flush/receipts/disable/recordCompact/health` (4-8), `captureRecord` (>16 KB ⇒ `putArtifact`) (10), `captureWithoutBlockingRouting` returns `{routingContinues:true,capture:"degraded"}` (11). `flush` awaits a per-row sink sequentially and requeues failures (l.6) — no single-flight, caller priority, lease, fence, or closed-store guard.
- Production uses `shared/capture/durable-queue.mjs` (sidecar l.18). I did not read it. Its test is `shared/capture/test/durable-queue.test.mjs`; l.372-380 assert “persistent queues checkpoint WAL sidecars and close idempotently” and that `-wal`/`-shm` do not survive a clean close.
- Replay-adjacent capture: `replay-disposition.mjs` (sidecar-constructed ledger `<state root>/replay-disposition.sqlite`, l.103), `replay-provenance.mjs`, `classification.mjs`, `MAX_REPLAY_DEFERRALS`/`applyReplayDeferralBudget`.

**Risk:** the shim’s `storageMode` label must not be read as proof of reference-only payloads (R28 warns exactly this), and converting the shim instead of `durable-queue.mjs` would be wasted work.

### Queues / leases — already Effect at the store, hand-rolled above
- `shared/queues/queue-store.mjs`: `DEFAULT_QUEUE_STORE_RELATIVE_PATH = "track-b/queues/queues.sqlite"` (33), table `effect_queue` (36), params poll 1 s / refresh 30 s / expire 15 min / busy 5 s (46-52), `makeQueueStoreLayer` (74-100) composes `SqliteClient.layer` + `PersistedQueue.layerStoreSql`, `readQueueStorePragmas` (107). Library owns schema/locks/retries (l.7-9, 96-99).
- Two hosts deliberately share one file: packaged host and sidecar (l.30-31; `queue-root.mjs:6-16`). This is the R30 “two-host distinct job” topology and must not be collapsed into per-process queues.
- Readback/admin/cancel/drain entry points: `readQueueJobs/readQueueJob/readQueueSummaries`; `cancelQueueJob`, `retryQueueJob`, `setQueueDrain`, `readQueueAdminReceipts` (sidecar imports 50-62).
- `evaluation-worker.mjs:3-4` records sidecar placement as deviation D4 because capability calls live on the operator surface and a sidecar placement would add cross-process RPC; l.67 documents a busy event loop from a per-loop drain query. Treat as a known performance/placement fact, not a bug.
- Extension-owned leases/fences (all hand-written SQL, no Effect):
  - `background-evidence-scheduler/index.mjs:76 EvidenceScheduler`; schema `lease_id/lease_owner/lease_expires_at_ms/lease_renewed_at_ms/fence` (109-111); owner-change fencing (119-134); claim CAS (359-420); renew (432-460); fenced complete/fail (530-540); lease-renew timer (465+); retention `acquire/release` around the handler (766-777); replay-intent completion requires `(jobId, leaseId, fence)` (702-713).
  - `crowdsourced-learning/index.mjs:225 ContributionClient`; outbox lease/fence columns (252-253); `fencing_generation` (261-263); fenced claim/delete/dead-letter (418-467); `leaseMs=30_000`, `maxAttempts=3`, `maxDeadLetters=100` (235).
  - `evaluation-runner-local/index.mjs:169 EvaluationRunner`, `287 DurableTrialRunner`; `workOnce` claim → renewal → `renew-trial-lease` → `release-trial-lease`, aborts with `AbortController` on lease failure, leaves stale leases for reclaim (345-545); `retryScoreOnce` (550).
  - `knowledge-store/index.mjs:134 KnowledgeStore` fence generation (211-225), `releaseKillSwitch` (1224-1251); `memory-store` (36-86); `profile-learner` (268, 341).

**Observation:** the same lease/fence concept is re-implemented in at least five places. That is the highest-value consolidation seam, but also the highest regression risk; R30 requires preserving the current terminal/refusal/recovery policies.

### Replay
`extensions/replay-core/index.mjs:473 ReplayCore`, `createReplaySchedulerComposition` 2666, `run` 2756; probe exercises `plan` + `execute` and requires a digest/checkpoint (2755). Consumed by the sidecar (97). No test directory was listed for replay-core.

### Evaluation
`extensions/evaluation-core/index.mjs:1159 EvaluationCore` (4,000+ lines; `run` 4176), plus pure learning-integrity kernels: dataset/manifest/recommendation schemas (10-12), `createLearningDataset` 304, `freezeLearningManifest` 527, `verifyFrozenLearningManifest` 554, `evaluateLearningGates` 657, `decideLearningRoute` 730; composition `composeFinalizedLearningIntegrity` (`learning-integrity-composition.mjs:147`). Execution/leasing is `evaluation-runner-local`, with no-egress sandbox (`no-egress-sandbox.mjs:271 DockerNoEgressSandboxBackend`).

### Learning / contribution
`extensions/profile-learner/index.mjs:260 ProfileLearner`, `254 LearningEvidenceAuthority`, `profileStorePath` 963. `crowdsourced-learning`: `DestinationAuthorizationAuthority` 177, `createDestinationAuthorizationVerifier` 157 (probe passes `verify:()=>false`, l.513), `enforceFamilyPublicationFloors` 44, `materializeAggregate` 86, `OCCURRENCE_IDENTITY_CONTRACT` 23. Readbacks: `shared/learning/activity.mjs`, `summary.mjs`. `trajectory-signals/index.mjs:339 TrajectorySignalStore`, redaction-safe input enforcement 431, `R16_TRAJECTORY_EVIDENCE_UNAVAILABLE` 91.

### Privacy
Three independent layers observed:
1. Sidecar capture walker: forbidden key normalization and 8,192-node/acyclic bound (runtime-operations-server.mjs:150-200), token-count allowlist (157-166).
2. Artifact bundle privacy profiles + upload eligibility + redaction report (bundle.mjs:17, 81-84, 165-166).
3. `repository-context` privacy `fingerprint_only`/`disabled` (index.mjs:39-44), plus trajectory measurement input prohibition (431).

No confidential payloads were read or dumped. I did not inspect ArtifactStore’s DELETE/FULL/FK, retention holds, or encryption; those are open for R28.

### Cancel / shutdown
- **Cancel is wired**: sidecar imports `cancelQueueJob`, `retryQueueJob`, `setQueueDrain` (57-62); scheduler persists a `cancelled` column (109, 293); evaluation aborts in-flight work on lease failure/cancel and releases the lease (369, 519-542).
- **Shutdown/drain/join was not found in the inspected slice.** The sidecar is 9,357 lines and I read 200; `queue-continuity.mjs` is the likely owner but I did not verify it. EvidenceScheduler exposes `#state`/`#pauseReason` but I did not see a stop path. **Do not claim R27/R32 readiness until the sidecar’s stop/join/drain order and closed-store timer access are located and tested.** This is the largest single unknown.

## 3. Existing tests (observed, not run)

- `shared/capture/test/durable-queue.test.mjs` — persistence/WAL/SHM/close idempotency (372-380).
- `extensions/artifact-store/test/{bundle,legacy-sqlite-migration,occurrence-graph,package}.test.mjs`.
- `extensions/event-log/test/package.test.mjs`.
- `extensions/trajectory-signals/test/concurrent-writer.test.mjs`.
- `tests/track-b/*.test.mjs` plus TB00–TB11 command suites in `package.json:14-53` (ownership, graph contracts/recovery, linear growth, projection contracts, retention/archive, admission, cloud contracts, verifiers, route learning, system proof, capacity, live roundtrip).
- No test directory appeared in the recursive extension listing for `background-evidence-scheduler`, `crowdsourced-learning`, `evaluation-core`, `evaluation-runner-local`, `knowledge-store`, `profile-learner`, or `replay-core`.
- Locked baseline (`00-worktree.md:63-69`): private source-seal 1, queue-store/identity 8, capture/eval 24 passed; **full private suite not run**. That is the carried limitation.

## 4. First bounded, no-schema-change conversion seams (in order)

Design constraint from the source: queue schema/store is library-owned and correct; do not replace it with a new effect-mq driver (R30 requires separate approval). Do not convert pure kernels (R5). Keep sync facades (`run(envelope)`, `probeExtension`) intact.

**S0 — Characterize, no code change.** Record exact contracts for `EventLog`, `ArtifactStore` public methods, `queue-readback/admin`, `durable-queue.mjs`, `ReplayDispositionStore`. Re-run the existing captured 24 + 8 suites and the artifact-store/event-log package tests. This closes the missing inventory that R19/R33 demand.

**S1 — Graph/vocabulary: disposition retained-pure, no Effect.** Add characterization tests only: unknown kind fails closed; legacy alias resolves canonical id/role; `unsupported_future` fails closed; optional degradation. This removes graph from the “unconverted” ledger without a behavior rewrite.

**S2 — Queue readback/admin as Effect programs behind the existing HTTP routes.** Smallest real conversion: `readQueueJobs/Summaries` and `cancel/retry/setDrain` become Effect values using the existing `SqliteClient` connection; the sidecar route stays a thin sync/`runPromise` adapter at the edge (no nested `runPromise` inside the service). RED seams: cancel of a terminal job returns a receipt without resurrecting it; drain flag prevents new claims but lets in-flight completion commit; readback observes the worker’s committed row; two hosts still see one row.

**S3 — EventLog as Service + Layer.** RED seams: append→reopen→readback; retention/cap bounded; malformed record rejected; reporter/redaction failure cannot change business result. Only after S0 reveals its actual signature.

**S4 — Durable capture drain (`durable-queue.mjs`, not the shim).** Scope-owned single-flight drain; caller-priority; failure requeues without losing rows. RED seams mirror the existing test: partial sink commit requeues; one drain at a time; close removes WAL/SHM; no timer touches a closed store.

**S5 — ArtifactStore read/registration path.** Wrap graph registration + query readback first; leave writes on the sync facade until a dedicated slice. RED seams: privacy-profile mismatch rejected; uploadEligible cannot carry raw content; alias→canonical mapping; DELETE/FULL/FK unchanged.

**S6 — Lease unification pilot on `ContributionClient`** (smallest self-contained fenced outbox). RED: ack with stale fence/lease rejected; expired lease reclaims; duplicate ack idempotent; dead-letter cap honored; process death mid-ack loses no row.

**S7 — `DurableTrialRunner`** with Effect `Clock`/`Scope`: renewal failure aborts and releases; cancel does not ack; stale lease is not completed.

**S8 — `EvidenceScheduler` last of the background planes**: owner-change fencing, renewal under transient `SQLITE_BUSY`, retention hold release on handler failure, replay-intent fence.

**S9 — Replay/evaluation-core/learning composition**: only after the storage and queue seams are stable; keep `learning-integrity.mjs` as retained-pure.

## 5. Gaps, risks, unknowns

1. **No verified shutdown/join/drain order** for the sidecar (largest B9 risk).
2. **Two capture implementations**; the shim is a trap. Production is `durable-queue.mjs` (unread).
3. **No Effect Layer DAG** in the sidecar; `ManagedRuntime` appears only for the evaluation handoff. R27’s “closed shared-leaf Layer DAG” is not met.
4. **Lease/fence duplication** across ≥5 extensions, each with its own schema assumptions and recovery policy.
5. **`ArtifactStore`, `EventLog`, `ReplayCore`, `EvaluationCore`, `RetentionManager` method surfaces are not yet inventoried**; any conversion slice must not invent signatures.
6. **Privacy/retention authority is split** across sidecar walker, bundle profiles, repository-context, and retention holds. R28’s DELETE/FULL/FK, encryption, and degraded routing were not verified.
7. **Two-host queue concurrency** is documented and partially tested (8 queue-store/identity tests) but the private full suite was not run; no multi-process kill/reclaim evidence was observed.
8. **EventLog bounded-metadata claim** is unverified; must not be described as an inference journal.
9. **No source execution performed**; all RED/GREEN proposals are seams, not evidence.

## 6. Requirement mapping for this report

- **R19/B0**: caller/owner inventory started; dispositions: graph/learning-integrity retained-pure, queue-store retained-existing-Effect, sidecar/extension stores conversion candidates.
- **R27/B6**: sidecar composition located and build-enforced (13 canonical extensions), but no closed Layer DAG or shutdown order — open.
- **R28/B7**: ArtifactStore/EventLog/retention owners identified; privacy labels and WAL facts observed; storage-mode label explicitly flagged as non-proof.
- **R29**: capture drain seams identified in both implementations; no single-flight/caller-priority found in the shim.
- **R30/B8**: PersistedQueue deviation, two-host topology, lease/fence behavior observed; no effect-mq driver change proposed.
- **R31**: trial/learning/contribution owners located; submission-reuse and revocation fences not yet verified.
- **R32/B9**: private composition is the sidecar; authenticated DTO/readiness and partial-startup release remain unverified.
- **R33/B10**: this list is the seed ledger; every entry still needs repo/path/export/owner/caller and RED/GREEN evidence.
