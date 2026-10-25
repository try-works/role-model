Run: `/.recursive/run/115-effect-foldkit-runtime-migration/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-10-24T08:45:09Z`
LockHash: `eaf8d6fadcc1c1ad46f2e16c5593afcf6e153e38f3071821f6be398346d191b1`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `owner-scope-decision.md` (owner "defer both",2026-10-24)
- `source-proposal.md` (SHA-256: 870fa27fbc2ebe277c633ba539073037a2b330ac411c61b661804e7779be534c)
- Owner update2026-10-24: implement existing500-round goal with GPT controller and deepseek-official/deepseek-flash workers; normal/out-of-process DSH delegation supersedes mandatory Agent Teams transport.
Outputs:
- `00-requirements.md`
Scope note: Full public/private backend Effect migration and Foldkit UI; draft inventory, not implementation approval.

## TODO

- [x] Preserve source and define stable requirement IDs/acceptance.
- [x] Independently review source acceptance normalization and repair findings; detailed lossless source inventory remains a Phase1 deliverable, not a precondition requiring Phase1 before Requirements.
- [x] Verify exact authorized DeepSeek worker route and normal-process transport.
- [x] Record owner-approved E1/E2 named-follow-on disposition.
- [x] Complete final independent scope/lock-readiness review and controller approval.
- [x] Complete Coverage/Approval; supported lock invoked after gate metadata finalized.

## Source Authority

Full source-proposal.md is normative; this normalized inventory does not replace unquoted clauses.
Phase1 must map every source obligation to these IDs, split via addenda if necessary, and record actual owner/caller/tests.
Public commit f0d50fab083e3fe8daf2474cd9fb08b51066c8e1 / tree b3d5cf91435faad39d11a0dc1d65f54d8668cc2e.
Private commit 16021cc5f87f60f2d01338a29adf0002da5e8327 / tree18a0e994ed3330293c8bb61931dbf44834172f41.
Controller recomputed identity/source hashes in evidence/other/current-paired-identities.json; independent reviewers must verify, not infer from these statements.

## Requirements

### `R1` Paired baseline and isolation

Source: §0-§2,§14.
Acceptance criteria:
- Record fresh origin/dev/public-private SHA/tree/diff bases, preserve original dirty work and protected branches; source snapshot hash verified; no operator state touched.
- Cited source/build/files/test evidence proves the stage-specific result; planned/implemented is not verified.
- Re-pin all inventories/census at execution SHA; record BOTH commit/tree identities and computed proposal hash receipt. Untracked files are inventoried separately. Recorded baseline facts are distinct from implemented/verified product acceptance.

### `R2` Exact worker model

Source: §14; direct owner instruction.
Acceptance criteria:
- All delegated workers use LLM provider deepseek-official/model deepseek-flash, per latest owner authorization; verify effective route before substantive dispatch. GPT remains controller; ordinary/in-process explicit-model or owned per-launch headless/SDK DSH workers are acceptable with actual route proof. No other-model fallback.
- Cited source/build/files/test evidence proves the stage-specific result; planned/implemented is not verified.
- Apply exact explicit route for ordinary/in-process or owned per-launch DSH workers; record each actual request-header provider/model, configuration hash, session/job ID, output/exit and controller verification under evidence/router. Child self-report is insufficient. Route unavailable means NOT RUN/stop, never silent model substitution.

### `R3` Strict TDD and workflow

Source: §5.8,§14.4.
Acceptance criteria:
- Assertion-level RED before production GREEN/refactor; maintained tests/CI selectors, concrete logs/revisions/exits; setup failures not RED. Complete sequential audited recursive locks.
- Cited source/build/files/test evidence proves the stage-specific result; planned/implemented is not verified.
- Untouched upstream acquisition/pure mechanical moves may use a reviewed scoped characterisation exception: baseline GREEN, byte/export/provenance comparison, GREEN after. No behaviour rewrite concealed; genuine infeasibility requires explicit exception/compensating tests, never global tests-after/pragmatic fallback.

### `R4` Paired stable Effect upgrade

Source: §3,M1.
Acceptance criteria:
- Implement proposal effect@4.0.6 with paired vendor defaults/provenance/digests/locks, export/declaration diff and real consumer typecheck/CI/live baseline. Owner requested latest stable; verify current stable and obtain explicit reviewed pin disposition for any change rather than silently adopting a floating target.
- Cited source/build/files/test evidence proves the stage-specific result; planned/implemented is not verified.
- Exact proposal target effect@4.0.6 commit3b28bf686bf26e9700edd39c025aff2744dc5303 and wrapper4.0.6; latest-stable owner instruction is verified at execution. A different target requires explicit reviewed pin disposition and refreshed API/compatibility proof, not accidental dependency resolution.

### `R5` Node/browser API closure

Source: §3.3-§3.5,B2a.
Acceptance criteria:
- Required subpath/type/import tests, platform-node/node-shared and platform-browser/browser-safe graph; preserve Schema/schema and chunk side-effects; one Effect identity per realm, no Node/polyfill/optional-peer leakage.
- Cited source/build/files/test evidence proves the stage-specific result; planned/implemented is not verified.
- Enumerate required exports for source/tests, per-entry type/import smoke and esbuild metafile guard; extend the existing Run101 single-runtime guard rather than replacing it. Reuse actual leaf Layer objects/MemoMap; sibling merge does not satisfy requirements, graph is closed once per owner not recreated per request.
- Keep pure scoring/folds/schema/protocol kernels free of fetch/SQL/clock/random; public host/private sidecar/workers/browser have separate runtime identities and exchange validated DTOs, never raw Causes/Layers/Fibers. No nested runPromise inside domain services and no per-request Layer graph recreation.

### `R6` Vendored Foldkit

Source: §4.1-§4.4.
Acceptance criteria:
- Pin framework/UI/lint source, notices and wrapper exports/declarations. Verify untouched upstream and exact target compatibility, no duplicate registry Effect or unreviewed peer bypass; Vite plugin excluded.
- Cited source/build/files/test evidence proves the stage-specific result; planned/implemented is not verified.
- Pin foldkit/UI0.169.0 and oxlint-plugin0.15.3 at7ee214268c602967937b80f6f20d1e831f2e8ab6. One entry per actual upstream export with Node/browser-like parity tests, Effect/platform-browser externalized and parse5 bundled; complete declaration/license/provenance closure and untouched vendor verification.
- Vendor payload paths are explicitly enumerated: excludes are recorded metadata, not tool filters. If target incompatible, review newer pinned upstream or first-party adapter and upstream repair; no hand-edited vendor tree, silent peer override or assumed wildcard entries.

### `R7` Component source provenance

Source: §4.5.
Acceptance criteria:
- Crease Tailwind first, justified Foldcn gaps; untouched pinned snapshot separate from adapted source, file/hash/dependency/license/owner ledger; no blind hosted registry theme/dependency mutation.
- Cited source/build/files/test evidence proves the stage-specific result; planned/implemented is not verified.
- Reviewed Crease source bb447e363e9c717bf11ebb10b2259f053bff6f71; Foldcn source1fe1acc6a98dee9b8a040023ee88988098b42cab. Preserve notices, ECharts/transitive license obligations; Tailwind selected only, no StyleX/Pleat/showcase/maps/CLI presets. Adapted-source state/scene/browser/anti-slop checks and target-version closure before uptake.

### `R8` RM3 component behavior

Source: §5.5.
Acceptance criteria:
- Single role-model facade/owner, tokens/Geist/geometry retained and donor mapping reviewed. Light/dark/mobile, keyboard/focus/RTL/disabled/reduced-motion, named donor gap tests.
- Cited source/build/files/test evidence proves the stage-specific result; planned/implemented is not verified.
- Preserve cn merge semantics and parent async-state/submodel wiring; test overlay escape/dismissal and screen-reader names/semantics. Permanent specimen Story/Scene and browser fixtures replace temporary-only galleries.

### `R9` React-free chart pilot

Source: §5.6,M5.
Acceptance criteria:
- Real time-series/ranking pilot before broad waves; exact values/units/series/axes/buckets/formats/statuses/HTML alternatives plus live updates/range/theme/resize and no React/duplicate Effect.
- Cited source/build/files/test evidence proves the stage-specific result; planned/implemented is not verified.
- Tooltip/legend interaction, rapid filter/range switches with obsolete work suppressed, stable variant on theme updates and multi-instance collision-free host IDs required. Loading/empty/error/stale/partial/truncated/unsupported states remain distinct; meaningful numeric HTML alternative with actual accessible names.

### `R10` Chart lifecycle/render policy

Source: §5.6,§6.2-§6.6.
Acceptance criteria:
- Mount/unmount/partial acquire/observer/frame/font/registry and multi-instance tests; bounded captures; chart-only approved-render-change separately counted, no semantic relaxation or whole-page masks.
- Cited source/build/files/test evidence proves the stage-specific result; planned/implemented is not verified.
- Test hidden/zero-size container resize, repeated mount/unmount heap, font readiness and canvas animation completion at fixed DPR/timezone; bounded diagnostic timeout for changing charts. No claim SVG helper module dependency closure costs zero.

### `R11` Root routes and submodels

Source: §5.1-§5.3,M6.
Acceptance criteria:
- Inventory all actual routes and redirects, typed parse/build/deep links/history/not-found, shell/theme/submodels/commands/subscriptions; stale response/route-instance/focus behavior verified.
- Cited source/build/files/test evidence proves the stage-specific result; planned/implemented is not verified.
- Record sibling runtime-ui-next versus in-place decision before edits; preserve title/theme/bootstrap/scroll/focus and root parent cross-route facts; portable APIs not pseudo-JSX shortcuts.

### `R12` API and refresh compatibility

Source: §5.4.
Acceptance criteria:
- Preserve fallback/error/request semantics. Compare method/path/query/body/relevant redacted headers/multiplicity/status/stream and causal write/tool order; no duplicate fetch/listener; gap/snapshot resync.
- Cited source/build/files/test evidence proves the stage-specific result; planned/implemented is not verified.
- Retain injectable RuntimeEventSourceFactory/test services and one owned Refresh Subscription, stale diagnostics fields and gap/snapshot resync. Lossy coalesced/sliding refresh buffers cannot carry ordered lossless token streams.

### `R13` Complete route waves

Source: §7,§9.
Acceptance criteria:
- Every inventoried read/control/write/heavy/learning/studio route/component, modals/palette/media/device auth: maintained success/empty/loading/error/denied/degraded/stale/mobile/theme journeys, not pilot-only.
- Cited source/build/files/test evidence proves the stage-specific result; planned/implemented is not verified.

### `R14` Self-validating parity harness

Source: §6.1-§6.6,M4.
Acceptance criteria:
- Separate client mocks/source-QA/identified packaged lanes; React selfcheck0diff, mutation sensitivity and deterministic double run; no unhandled console/unmocked endpoint; bounded font/canvas readiness.
- Cited source/build/files/test evidence proves the stage-specific result; planned/implemented is not verified.
- Deliver packages/ui-parity and runtime:parity. M4 pre-change React baseline/selfcheck precedes M1 acceptance. Freeze clock/RNG, finish animation, fonts/images then400ms quiet/two stable frames/repeated image; bounded canvas-ready path. Compare text/control positions/styles, exact request semantics and applicable accessibility. Chart-only approvals separately counted.
- Run packaged comparison twice (React/Foldkit) against same controlled fixture backend/scenarios; retain runtime:validate-ui fixtures and separate source-QA/package/client lanes. Hide carets/scrollbars and avoid networkidle for persistent SSE; non-chart layout/text zero perceptual pixels, bounded approved chart deltas only.

### `R15` Actual client inference

Source: §6.7,G-LIVE.
Acceptance criteria:
- Supported ordinary DSH or pi CLI via exact packaged router to approved real provider. Verify active model/profile/target/alias and plugin version; both clients when shared contract changes; curl/fixture/script-only not substitute.
- Cited source/build/files/test evidence proves the stage-specific result; planned/implemented is not verified.
- Isolate client profile/session and NEVER repoint controller session or user active model. Record executable/plugin/version, URL/discovery/alias/active model/effective config/capabilities; bound requests/tokens/time/cost and auxiliary calls. Unauthorized/unavailable provider yields NOT RUN, no fixture substitution.

### `R16` Release/dev/candidate comparison

Source: §6.8,G-RELEASE.
Acceptance criteria:
- Preserve v0.0.20 R, clean dev D, candidate C identities separately; artifact/process/served closure, independent state/config, classified pre-existing/intentional/inconclusive deltas; no exact stochastic prose/latency promise.
- Cited source/build/files/test evidence proves the stage-specific result; planned/implemented is not verified.
- Classify pre-existing R-to-D, migration regression, approved intentional change, known baseline defect and absent/inconclusive/environmental capability explicitly. No blanket dev-changed waiver; intentional delta requires requirement/rationale/approval/expected-value assertions/maintained regression. Unexplained R/C blocks parity even if D/C passes; absent capability is not exercised coverage.
- Preserve R by isolated copy/staging with unchanged artifact bytes; supported launch overrides validated before use, unused loopback ports, independent config/state/log/lock roots and owned process. Stop if isolation unproved; no release manifest edits, operator3456/3457/3458 occupation, shared writable SQLite, old binary on candidate schema, operator-secret replay or naive live DB copy omitting WAL. Independently seed equivalent authorized config or verified consistent backups.

### `R17` Cross-surface persistence journeys

Source: §6.9,G-TRACE-STORAGE.
Acceptance criteria:
- J1 stream,J2 tool turns,J3 cancel/error,J4 metadata/effort,J5 restart,J6 configured replay/eval/learning: same request/decision/provider/capture IDs through telemetry/API/rendered numeric UI/graph/payload/projections and durable reread.
- Cited source/build/files/test evidence proves the stage-specific result; planned/implemented is not verified.
- Unique synthetic markers and supported request/turn/trace/job/graph ID mapping, before/after counters and bounded watermarks required. Classify auxiliary client calls/traffic; use actual served assets and API/network readback, no Vite-to-production confusion or page.route stubs. Storage inspection is read-only with no inserts/repairs/deletes; private projection failure must remain visible.
- Incorporate every assertion in source §6.9 J1-J6 matrix verbatim by reference as acceptance: ordered tool_call_id/result and graph relationships, no cancel/error false success/hung spinner/double accounting, eligible model/reason/effort and live-only support metadata, persisted history after restart (not sockets), configured arms/jobs/evidence and honest disabled/unavailable, never seeded success rows. Sample complete actual source->projection/edge/payload chain and classify auxiliary calls/live/probe/evaluation/headline inclusion without relabeling.

### `R18` Evidence/privacy honesty

Source: §6.10.
Acceptance criteria:
- Private content/schema/secrets remain private evidence; safe public refs. PASS/FAIL/NOT RUN/INCONCLUSIVE/reviewed N/A distinct; missing provider/graph/build not PASS; refresh hashes/receipts after changes.
- Cited source/build/files/test evidence proves the stage-specific result; planned/implemented is not verified.
- Receipts include scenario/R/task IDs, source/build/exe/UI/private closure, client/plugin/commands/redacted config, alias/provider/classification, owned PID/URL/root, sanitized outputs/exits, ID joins/API window/storage/DOM/numerics/screenshots/restart/cleanup and approvals. Capture at M0a, Effect-only M1, M5, affected wave, integrated pair and finalM12; repair invalidates affected receipts. Controller closes live/release gates only after independent code/test/verifier evidence.

### `R19` Current contracts/extraction B0

Source: §15.1-§15.3.
Acceptance criteria:
- Enumerate actual operations/resources/callers; characterized move+shim separate from behavior; sync/Promise/auth/route/closure/default compatibility; explicit pure/existing-Effect/adapter/convert dispositions, no monolith exemption.
- Cited source/build/files/test evidence proves the stage-specific result; planned/implemented is not verified.
- Bounded leaf conversion can precede unrelated extraction; no giant all-monolith split prerequisite or arbitrary shell-line threshold. Move/shim contracts remain separately characterized from semantic conversion.

### `R20` Diagnostics B1

Source: §15.3.
Acceptance criteria:
- Separate bounded module health/Cause attribution from business telemetry. Preserve original Fail/Die/Interrupt/errors/origin/propagation; reporter/serializer/overflow/finalizer/outage cannot change business result or recurse.
- Cited source/build/files/test evidence proves the stage-specific result; planned/implemented is not verified.
- Calibrate and approve concrete record/byte/ingress/formatting/TTL/query limits before enablement. One report owner at request/job/lifecycle edge after finalizers/before wire translation; compile exact target ErrorReporter/Cause APIs and test hostile/cyclic/nested/reused errors, acquire/finalizer/mixed reasons, overflow/outage/redaction/no-recursion.
- Existing run108 scoped metrics/spans stay authoritative; GenAI projection is not an exporter. OTLP tracer/logger/metrics are separate optional sinks with explicit dependencies, bounded buffer/flush, no-collector admission isolation and low-cardinality labels; existing GenAI attributes/wire contracts retained.

### `R21` Diagnostics API/UI

Source: §15.3,DG.
Acceptance criteria:
- Authorized bounded local query + Foldkit page: peer/trust/read-credential/Host/Origin/redaction tests, instance/build/loss/cursor, denied/stale/drop/empty/disabled/mobile/focus; no global fiber dump.
- Cited source/build/files/test evidence proves the stage-specific result; planned/implemented is not verified.
- Reject spoofed forwarded owner headers and wildcard/reflected CORS; diagnostics cannot contaminate business/live aggregates. Test injected defect through actual authorized read path, keep current observability-snapshot/store-degradation pages intact, and show missing/stale/loss/build identity honestly.

### `R22` Supervisor B2/B2a

Source: §15.3.
Acceptance criteria:
- Scope process/stdio/readiness/health/restart/exit preserving env/cwd/logs/SEA/token/loopback; hung health/partial startup/repeated stop/Windows grandchild/force escalation and SEA tests.
- Cited source/build/files/test evidence proves the stage-specific result; planned/implemented is not verified.

### `R23` SQL service B3

Source: §15.3.
Acceptance criteria:
- Explicit async Effect callers and compatible sync facade; fallible partial open/PRAGMA cleanup, initial+2busy retries100/200ms plus5s timeout, same-connection SQL transactions, primary error preserved, rich graph hydration.
- Cited source/build/files/test evidence proves the stage-specific result; planned/implemented is not verified.
- Never retry provider/network side effects inside SQL transaction. Serialize connection/fiber ownership rather than mutable depth shared across yielding fibers; Effect Ref/Tx memory is not SQL. Drain/fence all owners for backup/reset/restore and preserve actual per-store PRAGMAs, primary SQL failure across rollback/close errors.

### `R24` SQL blocking/maintenance truth

Source: §15.3,§16.
Acceptance criteria:
- DatabaseSync remains blocking; no scheduled runSync/Tx-memory substitute. Preserve per-store PRAGMA, measure lock/event loop, drain/fence reset/restore; schema changes need reader/migration/backup/rollback proof.
- Cited source/build/files/test evidence proves the stage-specific result; planned/implemented is not verified.
- Any off-thread/native-driver change needs measured event-loop/lock evidence, serialization/caller/version/SEA packaging proof and explicit review, not a nonblocking claim from async return type. Schema changes require versioned idempotent migration, copied-fixture preflight, N/N-1 reader/build matrix, source/channel/key backup manifest and rollback retirement window; compatible reader or approved forward repair/export, no global WAL switch/shared R/D/C state/old binary against new bytes.

### `R25` Routing/schema B4

Source: §15.4.
Acceptance criteria:
- Effect producer wraps pure scorer via explicit type/caller migration; empty-pool/tie/role-task-effort-arm/golden parity. Code/detail wire projection; legacy strictness changes separately approved.
- Cited source/build/files/test evidence proves the stage-specific result; planned/implemented is not verified.
- Either explicitly migrate Effect-returning producer and every type/caller edge or add a separately named producer with tested sync compatibility adapter; returning Effect changes a synchronous signature. protocol-routing runSync allowed only while no async service needed; preserve reason-code values/order and serialize original code/detail records.

### `R26` Transport/SSE B5

Source: §15.4.
Acceptance criteria:
- Actual AbortSignal to I/O, scoped reader/listener cleanup, typed failures and exact per-operation retry. Preserve tool/reasoning/fragmentation/drain/first-substantive commit/finish/DONE/error; no unsafe paid redispatch or second response.
- Cited source/build/files/test evidence proves the stage-specific result; planned/implemented is not verified.
- Preserve private operation connection retry delays250/1000/2500/5000ms and distinct typed idempotent aggregate timeout behavior; status/protocol/caller abort not generic retry. Span full async I/O, not Promise creation. Downstream tokens remain lossless/drain-bound and never share lossy refresh buffers.

### `R27` Public composition B6

Source: §15.4.
Acceptance criteria:
- Closed shared-leaf Layer DAG owns CLI/backend/server/bootstrap/refresh/drains/benchmarks, early readiness and partial shutdown. Bounded permits/waiters/cache identity; per-run sequential judge/throttle isolation, no late task writes.
- Cited source/build/files/test evidence proves the stage-specific result; planned/implemented is not verified.
- Provider permits process-owned with separate bounded waiters; preserve concurrency defaults unless reviewed. Metadata cache keys include authority/config/model, TTL/cap/invalidation; NEVER deduplicate distinct stochastic inference. Shutdown stops admission then joins/drains/interrupts tasks before dependencies; finalizer failure cannot skip later releases/force early exit. Benchmark cancellation and overlap isolation tested before concurrency increases.

### `R28` Private storage B7

Source: §15.5.
Acceptance criteria:
- Existing ArtifactStore/EventLog/capture WAL/retention authority, immutable hash/generation/blob/key/scope/channel/privacy/hold/recovery retained. No raw capture duplication to jobs or async yield inside sync SQL; no fictional cross-store atomicity.
- Cited source/build/files/test evidence proves the stage-specific result; planned/implemented is not verified.
- EventLog is bounded metadata, not complete raw inference journal; capture storageMode label does not prove reference-only payloads. Pointer/encryption/admission/degraded-routing changes require separate privacy/contract decision; preserve ArtifactStore DELETE/FULL/FK versus actual WAL owners.

### `R29` Capture drain/postcommit

Source: §15.1,§15.5.
Acceptance criteria:
- Bounded single-flight/caller-priority drain owned through stop/join, no closed-store timer access; test partial acquire, committed-versus-postcommit error and restart/recovery.
- Cited source/build/files/test evidence proves the stage-specific result; planned/implemented is not verified.
- Real-store fault matrix: stale leases, interrupted maintenance, failed ack/late completion, corrupt/decryption failure, restore and partial publication with existing recovery receipts. Separate transactional/post-COMMIT lookup/prune failures so unconditional rollback cannot mask primary outcome. New cross-store guarantee requires explicit durable outbox/idempotent protocol, not Scope magic.

### `R30` Background workflows B8

Source: §15.5.
Acceptance criteria:
- Retain PersistedQueue SQLite deviation/jobs/IDs/actual public consumer. Abort-aware handlers, lease/late-completion fence, evidence-before-ack, kill/drain/root/effort/refusal; characterize two-host distinct-job global concurrency.
- Cited source/build/files/test evidence proves the stage-specific result; planned/implemented is not verified.
- New effect-mq SQLite driver is a separately approved conformance slice. Preserve terminal/deferrable refusal/tool/recovery policies and do not resurrect superseded recovery passes. Local semaphores/same-row claims do not prove multi-host distinct-job cap; enforce actual topology contract. Public host stays packaged evaluation consumer until reviewed topology change; root/kill/drain/retry/cleanup readback agrees across processes.

### `R31` Trial/learning/contribution

Source: §15.5.
Acceptance criteria:
- Retain submitted-output reuse after score failure, provider receipts/no redispatch, sandbox/lease/holdout/provenance/floor/tie/rollback and existing Effect folds; independent aggregate consent/destination/revocation, no raw export.
- Cited source/build/files/test evidence proves the stage-specific result; planned/implemented is not verified.
- Retain no-egress sandbox process-tree/time/output/workspace limits, versioned profile fsync/rename publication and late-ack/revocation fences; reuse current learner/folds instead of second learner or hidden production autoactivation.

### `R32` Private composition B9

Source: §15.5.
Acceptance criteria:
- Closed private domain Layers, authenticated compatible DTO/version/capability/readiness and bounded joins; scoped processes/stores; real cross-repo capture/queue/projection evidence, not health200-only.
- Cited source/build/files/test evidence proves the stage-specific result; planned/implemented is not verified.
- Scope child processes/readline ready protocol/ephemeral auth/timeouts; post-acquire endpoint rejection and partial startup release child. Preserve bounded pagination, missing-versus-unavailable joins, live/probe/evaluation class, codec/externalization limits and compatible incremental public/private deployment; answering200 is not closure proof.

### `R33` Backend completion B10

Source: §15.6,§17.1.
Acceptance criteria:
- Every actual operation owner converted or explicit reviewed retention with tests/TDD/caller refs. Existing regression anchors extended; real DB/OS/process-kill/package/live proofs, not constructor/import-only.
- Cited source/build/files/test evidence proves the stage-specific result; planned/implemented is not verified.
- Reject wrapped-but-unused leaves or token Effect over unowned Promise/timer. Per-operation disposition is converted/retained-pure/retained-compatible-adapter/retained-existing-Effect/approved-N-A; no blanket monolith retention. Ledger records repo/path/export/owner/caller, service/Layer/scope/error-wire/cancel/transaction/lease/fence, B/M/task/R IDs, RED/GREEN/refactor/CI coverage, source/build/reviewer/rollback. Remove legacy orchestration only after actual callers migrate.
- Run anti_slop_lint on every changed first-party backend/client slice with Effect rules where applicable; fix or explicitly review against contract tests, not blanket legacy rewrite. Lint findings are pattern debt, not bug counts; retain security guards and untouched vendor source.

### `R34` E1 owner disposition

Source: §16.
Acceptance criteria:
- Before scope lock explicit owner-approved include or named follow-on for universal journal/coherent checkpoint/cold graph/pins/erase authority. No implicit cancellation/implementation; inclusion adds current schema/fence/rebuild/reader/rollback tasks.
- Cited source/build/files/test evidence proves the stage-specific result; planned/implemented is not verified.
- Deferral must name follow-on/rationale/revised completion scope and owner approval. Inclusion defines complete envelope/order/projection membership, common watermark/CAS/rebuild, graph archive reader/checksum/publication, durable pin/outbox/delete fence, erase/backup authority and all prune/restore/race/reader/crash laws. Until approved, no destructive tiering/admission changes or historical fulfillment claim.

### `R35` E2 owner disposition

Source: §16.
Acceptance criteria:
- Before scope lock explicit include or named follow-on for ALL accepted live durable jobs/result/reconnect/uncertain semantics. Current capture queue not equivalent; inclusion defines auth/versions/cancel-detach/offset/ack/crash and paid-action uncertainty.
- Cited source/build/files/test evidence proves the stage-specific result; planned/implemented is not verified.
- Deferral must name follow-on/rationale/revised scope and owner approval. Inclusion defines submission conflict/state/version/pins/result/offset/auth/reconnect/cancel-vs-detach/provider ownership and paid-action uncertainty; ack after durable receipt and real kill/reconnect/history-floor tests. No socket survival or external exactly-once claim; unresolved prohibits live-admission change.

### `R36` Controller teams and joint closure

Source: §7,§14,§17.
Acceptance criteria:
- Disjoint named scopes, single writer shared files, dependency/task IDs, verified team model, independent current code/test/live review, evidence action records. Backend/client stable DTO parallel then join M11 including diagnostics and E dispositions.
- Cited source/build/files/test evidence proves the stage-specific result; planned/implemented is not verified.
- GPT controls integration/final review, one active phase and only independent within-phase parallel scopes. Source task catalogue and B/M dependencies govern named files/acceptance; single shared-file writer, current task revision claims and FS_STALE_VERSION rebase, no broad formatter/codegen races or worker expected-baseline/tolerance edits.
- Every handoff includes current paired SHAs/artifact hashes/upstream/addenda/diff basis/files/questions/budget/output gates. Return actual diff/files/test exits/RED-GREEN/live refs/limitations/R status; store durable action record, controller verify real evidence, preserve failed attempts, refresh bundles/review after repairs. No self-approval; unavailable delegation explicitly self-audit without fabricated external independence. Track/wait/collect or cancel every owned worker job; normal-process worker ledger replaces Team wake/status mechanics under latest owner authority.

### `R37` Packaged cutover/rollback

Source: §8,§12,M12-M13.
Acceptance criteria:
- Exact SEA/private/UI source closure and final real-client journeys; one-release matched rollback with reader/state proof; retire React only after consumers migrate; retain maintained candidate/live CI harness; no automatic main promotion.
- Cited source/build/files/test evidence proves the stage-specific result; planned/implemented is not verified.
- Retire runtime-ui React only; docs-site remains Fumadocs/React. Keep matched old React artifact one release and reversible serving selection, wrappers/private source closure and compatible schema/pending work. Component adapters remain same facade; any temporary bridge removal deadline enforced. Stage/runtime:validate-packaging proof precedes approved promotion; do not archive maintained candidate/live harness.
- Effect rollback restores reviewed prior pin/tooling and matching wrapper graph, rebuilds matched public/private/UI closure and verifies readers plus pending/persisted work; never downgrade npm alone or launch rebuilt old binary against incompatible new state.

### `R38` Resource/safety/performance

Source: §5.6,§6.7-§6.10,§17.
Acceptance criteria:
- Pre-agreed bytes/parse/first-render/update/heap plus backend latency/event-loop/cancel/open-handles/store contention under degraded loads; bounded budgets/owned ports/roots/jobs; no production3456/3457/3458 reset, unauthorized spend or secrets.
- Cited source/build/files/test evidence proves the stage-specific result; planned/implemented is not verified.
- Fix measured workload/hardware/fixture identity and approved thresholds BEFORE pilot: raw/gzip startup/lazy chunks, parse/first chart/update/repeated-mount heap plus quiet/burst/degraded/collector-down backend latency/blocking/cancel/handles/lock load and rollback. Missing provider/prerequisite remains NOT RUN/INCONCLUSIVE.


### `R39` Maintained real-client verification commands

Source: §10.1.
Acceptance criteria:
- Implement runtime:verify-client-journeys and runtime:compare-release as maintained scripts with controller-owned root/CI wiring; actual target/config/port/root validation fails closed, no silent mocks, NOT RUN distinct from successful test exit. Discovery/adapter scripts supplement but never replace ordinary client evidence.

## Approved Scope Disposition

Owner-scope-decision.md is effective current input: E1/E2 implementation deferred to named follow-ons; R34/R35 disposition is delivered by this decision, not historical protocol implementation. Required B0-B10 and Foldkit migration remain in scope.

## Out of Scope

- `OOS1`: Docs-site/Fumadocs redesign and removal of React across the entire workspace.
- `OOS2`: Protected-branch direct/force pushes, automatic production promotion or operator-state reset.
- `OOS3`: Unreviewed scoring/provider protocol/cloud redesign or new broker/native driver.
- `OOS4`: Silent E1/E2 deferral or execution of stale archived stages. These require explicit scope disposition.
- `OOS5`: DSH application source/global-profile changes to bypass model selection limitations.

## Constraints

Strict TDD, isolated paired branches, private/public evidence separation and exact worker model are mandatory.
No unauthorized model fallback. Normal subagent instance still rejects explicit model selection; supported DSH headless per-launch overlay verified actual request-header config deepseek-official/deepseek-flash in preflight session-ad16cb3f-6664-4aaa-90f8-357b829a5f43. No shared-profile edits or inline credentials.
Owner explicitly approved "defer both" on2026-10-24: owner-scope-decision.md defers E1-storage-authority-protocol and E2-durable-live-inference-protocol while required framework/backend/client gates remain unchanged.
At Phase0 preflight D: had about2.1GB free, C:1.7GB, E:481GB; do not fill system/workspace disks
with unbounded installs/builds. Frozen ignore-scripts setup using external E: stores succeeded (baseline-round01 receipt);
full UI/core/protocol/registry and selected host/private persistence baseline passed round02. Full workspace/host/
private/package/browser/live test baseline not certified. Source and baseline claims are not new target build/provider proof.

## Audit Context

Audit Execution Mode: subagent
Subagent Availability: available
Subagent Capability Probe: exact request/header deepseek-official/deepseek-flash independently verified for completed DSH headless workers; E: session/temp storage path verified.
Delegation Decision Basis: full source review attempt01/02 and finite repair recheck03; latest owner deferral changes scope, final scoped readiness reviewer must check before lock.
Audit Inputs Provided: source-proposal.md, owner-scope-decision.md, repaired requirements and prior findings/dispositions; paired identities, baseline evidence and current git diff/status.

## Effective Inputs Re-read

source-proposal.md (unchanged), owner-scope-decision.md, current repaired R1-R39, prior audit reports and evidence/other/current-paired-identities.json.

## Earlier Phase Reconciliation

No earlier locked phases exist. Canonical00-worktree intentionally not created before Requirements lock; preserved prework is factual setup evidence. Detailed Source Requirement Inventory belongs to Phase1; requirements approval does not certify product implementation.

## Subagent Contribution Verification

Reviewed Action Records: subagents/phase00-requirements-attempt01.md, phase00-baseline-attempt01.md, phase00-requirements-attempt02.md, phase00-baseline-attempt02.md.
Main-Agent Verification Performed: actual request-route metadata, captured outputs, paired source hashes/trees/status, test counts/logs and concrete source clauses cross-checked; finite repairs independently rechecked03 at f6538506... before latest owner scope update.
Acceptance Decision: content findings repaired; baseline facts accepted, stale reviews not reused as final scope approval.
Refresh Handling: final bounded readiness review04 verified requirements5a655349... and explicit owner deferral; gate-only metadata update follows that PASS.
Repair Performed After Verification: named follow-on deferral, explicit source acceptance and retained future-stage evidence limits.

## Worktree Diff Audit

Baseline type: local commit
Baseline reference: public f0d50fab083e3fe8daf2474cd9fb08b51066c8e1; private16021cc5f87f60f2d01338a29adf0002da5e8327
Comparison reference: working-tree
Normalized baseline: same exact per-repo commits
Normalized comparison: working-tree
Normalized diff command: git diff --name-only <respective baseline>; additionally git status --porcelain=v1 --untracked-files=all
Planned or claimed changed files: run115 documents/evidence only
Actual changed files reviewed: only untracked run directory in both trees, tracked product diff empty
Unexplained drift: none observed; this is requirements-stage source control, not later implementation acceptance.

## Gaps Found

Prior source omissions and worker ACL setup gaps repaired. E1/E2 owner disposition now explicitly approved. Remaining final-review/scaffolding gate is not product failure.

## Repair Work Performed

Expanded concrete acceptance, source pins, real-client/SQL/queue/privacy/controller invariants, maintained commands, owner disposition and paired evidence; no production code modified.

## Requirement Completion Status

All R1-R39 are defined acceptance contracts; future product implementation remains unimplemented/unverified. R34/R35 owner disposition recorded in owner-scope-decision.md; deferred product protocols are not claimed delivered. Phase1/2 must carry every R ID and all normative source clauses with concrete source/test mapping.

## Audit Verdict

Requirements readiness PASS accepted from evidence/review-bundles/requirements-scope-ready04-result.md at5a655349...; controller checked source scope/IDs/actual worker route and metadata. Reviewer mistakenly called later00-worktree Phase2; canonical workflow instead requires Phase0 Worktree next then Phase1 AS-IS. This correction changes no acceptance criteria. No product result or E1/E2 delivery implied.

## Coverage Gate

- [x] Source snapshot and stable R1-R39 acceptance inventory recorded.
- [x] Independent acceptance coverage/finite repairs checked and owner scope reconciled; detailed lossless source inventory explicitly belongs to Phase1.

Coverage: PASS

## Approval Gate

- [x] Exact child model and independent review verified.
- [x] E1/E2 owner dispositions explicitly recorded; setup evidence retained.

Approval: PASS

Audit: PASS
