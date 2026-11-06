Run: `/.recursive/run/115-effect-foldkit-runtime-migration/`
Phase: `01 AS-IS`
Status: `LOCKED`
LockedAt: `2026-10-24T09:28:24Z`
LockHash: `1d7a97bc9d5a690e8d0430873d2dc4afeb9b37893ae7eb826e74ab955a8f52ef`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `00-requirements.md` (LOCKED)
- `00-worktree.md` (LOCKED)
- `owner-scope-decision.md`
- `source-proposal.md`
- `evidence/other/as-is-public-analysis.md`
- `evidence/other/as-is-private-analysis.md`
- `evidence/other/as-is-client-analysis.md`
Outputs:
- `01-as-is.md`
Scope note: Current paired source ownership, complete acceptance inventory and bounded migration seams; source observations are not reproduced defects or target runtime verification.

## TODO

- [x] Read locked inputs and independently gathered current-source reports.
- [x] Normalize every R and subordinate acceptance clause into stable inventory IDs.
- [x] Verify representative public/private lifecycle/SQL/queue/scorer paths and route census.
- [x] Independent AS-IS audit/repair/re-audit accepted; supported lock invoked after gate metadata.

## Current Source and Ownership

Publicf0d50fab/treeb3d5cf91 and private16021cc5/tree18a0e994 match paired worktree inputs. Tracked product diff empty; only run artifacts created. Public/private wrapper version4.0.1, source digests unchanged. Target effect4.0.6 commit3b28bf686bf26e9700edd39c025aff2744dc5303 and Foldkit0.169.0 commit7ee214268c602967937b80f6f20d1e831f2e8ab6 verified by remote tag; latest stable registry claim rechecked before planned adoption. No target dependency acquired yet.

### Public backend actual call chain

Public entry host cli -> node:http server/backend factory -> protocol projection/core deterministic route -> real provider/private-operation transports -> observation/capture publication -> public SQLite/telemetry and private graph, then readback. Relevant owners:
- `role-model-router/packages/process-supervisor/src/index.ts:106-145`: mutable process records plus bare health fetch126; outer deadline cannot interrupt pending fetch. Controller read source. Existing6tests pass; hanging network/stop-during-start still needs RED reproduction. Keep Windows taskkill tree semantics/env/log/exit.
- `role-model-router/packages/sqlite-memory/src/index.ts:167-212`: DatabaseSync,5s busy timeout,3attempts and100/200ms blocking outer waits; close/error boundaries. Controller read; full140baseline passes. Effect shape can make waits/lifetimes explicit, not turn SQL nonblocking. Observation transactions/readRuntimeObservationBundle graph hydration must remain.
- `role-model-router/apps/runtime-host-bridge/src/queue-runtime/workers.ts:244-304`: existing PersistedQueue/Scoped fibers/race/watchdog; handler receives no AbortSignal; Effect timeout/interruption does not cancel underlying Promise I/O. Controller read; worker stop does not prove external I/O cancellation. Existing producer/store/claim/codec authority retained.
- `role-model-router/packages/core/src/router.ts:1976-2011,2141`: synchronous pure policy/eligibility/sort with empty chosen endpoint success, not exception; preserve as kernel with explicit Effect producer/type compatibility. Full core194/protocol18/registry16baseline passes.
- `role-model-router/apps/runtime-host-bridge/src/index.ts` and cli/track-b-runtime/track-b-operations/benchmark modules remain imperative composition; run108 scoped metrics and queue Effect islands already landed. Analyst reports distinguish read source from proposal-only anchors, not full-method proof.
- Actual provider I/O resides largely host, not pure provider-* translators. Retain protocol/headers/auth/SSE commitment/drain/tool/reasoning/timeouts; require actual Promise signal/fence tests. Current private transport delays250/1000/2500/5000ms and separate idempotent aggregate timeout policy retained.

### Private persistence and workflow actual call chain

Private operations sidecar is production composition, importing durable capture WAL (not11-line in-memory shim), ArtifactStore/EventLog/replay/evaluation/learning/retention and queue producer. Public host is packaged evaluation consumer; private helper alone is not production wiring.
- Private `scripts/track-b/runtime-operations-server.mjs:7318-7328,8601-8615` creates periodic capture drain, close closes stores without clearing/joining it. Controller source-read verifies lifecycle gap; RED reproduction belongs implementation, not claimed observed corruption.
- Private `extensions/event-log/index.mjs:150-192`: BEGIN/COMMIT metadata append with sequence/hash; prune after commit inside try whose catch unconditionally ROLLBACK. Controller read; postcommit masking candidate needs targeted fault test. Not universal full evidence log.
- Private `extensions/artifact-store/index.mjs:297-365`: source authority uses node:sqlite/FK/DELETE/FULL. Graph registry is schema/compatibility not persistence; immutable graph request/root/generation, shared blobs and holds remain sole authority. Controller read representative store init and full earlier source investigation; worker report honestly did not inventory whole class.
- Private `shared/capture/durable-queue.mjs` holds bounded raw-capture ingress in actual caller; label graph_references_only does not prove reference-only bytes. Preserve privacy/capacity/degraded admission/claim fencing; do not move raw rows into generic queue/deadletters.
- Retain current queue layers, lease/fence identity, trial/sandbox/scorer receipts, learner folds/fsync publication and aggregate-only authorization/revocation. Domain-specific leases cannot be globally consolidated by name; shared-file topology and two-host distinct-job cap need characterization.
- Read-only analyst limitations are explicit in as-is-private-analysis.md: methods not read are unknown, not absent/unimplemented. Phase2 names one actual method/caller at a time with pre-edit characterization; no invented method signatures or blanket monolith retention.

### Frontend actual route/API/data owners

Controller AST census of `role-model-router/apps/runtime-ui/app/routes.ts`:75call entries =73route+2index,20legacy redirect entries, one layout and wildcard,53canonical leaf URL patterns. There are ONLY2parameterized detail patterns and6learning routes backed by learning.tsx. Client analyst's "3detail patterns/8learning" is corrected here against AST; report kept raw, not silently edited.
Current React Router SPA/root/app-shell, design-system navigation and route resolver are separate sources that must agree. Pure lib DTO/format/analytics/domain functions and RM3 tokens/Geist largely reusable; React state/hooks/providers and Recharts4importer modules require real port. Multiple exported API helpers are not the same as distinct routes/endpoints; inventory actual fetch/mutation/SSE consumers before Commands, no assumed143network calls.
Current UI752tests and existing24Playwright specs provide baseline but not actual packaged/full provider proof. Preserve typeahead/focus/modal/write states/refresh timing/history/legacy URLs, partial/stale/unsupported chart semantics and graph links. Foldkit/browser wrappers must be proven browser-safe independently of current Node-target Effect build.

## Source Requirement Inventory

Inventory quotes the39R first specific acceptance clauses plus45additional specific clauses. The38repeated shared evidence bullets are deliberately carried ONCE as a universal gate: every R/SRC requires cited source/build/files/test proof, planned or implemented is not verified. No generic evidence obligation is dropped. R rows are not full R reproduction; all original locked acceptance remains normative. Full normative source-proposal remains input, owner scope decision excludes E1/E2 product implementation but keeps disposition/invariants. A future discovered material unrepresented source clause requires current-phase addendum, not silent deletion.

- R1 | Source Quote: Record fresh origin/dev/public-private SHA/tree/diff bases, preserve original dirty work and protected branches; source snapshot hash verified; no operator state touched. | Summary: Paired baseline and isolation; complete subordinate acceptance preserved below | Disposition: in-scope
- SRC-001 | Source Quote: Re-pin all inventories/census at execution SHA; record BOTH commit/tree identities and computed proposal hash receipt. Untracked files are inventoried separately. Recorded baseline facts are distinct from implemented/verified product acceptance. | Summary: R1 subordinate contract; implement/test together without weakening parent scope | Disposition: quality-gate
- R2 | Source Quote: All delegated workers use LLM provider deepseek-official/model deepseek-flash, per latest owner authorization; verify effective route before substantive dispatch. GPT remains controller; ordinary/in-process explicit-model or owned per-launch headless/SDK DSH workers are acceptable with actual route proof. No other-model fallback. | Summary: Exact worker model; complete subordinate acceptance preserved below | Disposition: in-scope
- SRC-002 | Source Quote: Apply exact explicit route for ordinary/in-process or owned per-launch DSH workers; record each actual request-header provider/model, configuration hash, session/job ID, output/exit and controller verification under evidence/router. Child self-report is insufficient. Route unavailable means NOT RUN/stop, never silent model substitution. | Summary: R2 subordinate contract; implement/test together without weakening parent scope | Disposition: quality-gate
- R3 | Source Quote: Assertion-level RED before production GREEN/refactor; maintained tests/CI selectors, concrete logs/revisions/exits; setup failures not RED. Complete sequential audited recursive locks. | Summary: Strict TDD and workflow; complete subordinate acceptance preserved below | Disposition: in-scope
- SRC-003 | Source Quote: Untouched upstream acquisition/pure mechanical moves may use a reviewed scoped characterisation exception: baseline GREEN, byte/export/provenance comparison, GREEN after. No behaviour rewrite concealed; genuine infeasibility requires explicit exception/compensating tests, never global tests-after/pragmatic fallback. | Summary: R3 subordinate contract; implement/test together without weakening parent scope | Disposition: quality-gate
- R4 | Source Quote: Implement proposal effect@4.0.6 with paired vendor defaults/provenance/digests/locks, export/declaration diff and real consumer typecheck/CI/live baseline. Owner requested latest stable; verify current stable and obtain explicit reviewed pin disposition for any change rather than silently adopting a floating target. | Summary: Paired stable Effect upgrade; complete subordinate acceptance preserved below | Disposition: in-scope
- SRC-004 | Source Quote: Exact proposal target effect@4.0.6 commit3b28bf686bf26e9700edd39c025aff2744dc5303 and wrapper4.0.6; latest-stable owner instruction is verified at execution. A different target requires explicit reviewed pin disposition and refreshed API/compatibility proof, not accidental dependency resolution. | Summary: R4 subordinate contract; implement/test together without weakening parent scope | Disposition: quality-gate
- R5 | Source Quote: Required subpath/type/import tests, platform-node/node-shared and platform-browser/browser-safe graph; preserve Schema/schema and chunk side-effects; one Effect identity per realm, no Node/polyfill/optional-peer leakage. | Summary: Node/browser API closure; complete subordinate acceptance preserved below | Disposition: in-scope
- SRC-005 | Source Quote: Enumerate required exports for source/tests, per-entry type/import smoke and esbuild metafile guard; extend the existing Run101 single-runtime guard rather than replacing it. Reuse actual leaf Layer objects/MemoMap; sibling merge does not satisfy requirements, graph is closed once per owner not recreated per request. | Summary: R5 subordinate contract; implement/test together without weakening parent scope | Disposition: quality-gate
- SRC-006 | Source Quote: Keep pure scoring/folds/schema/protocol kernels free of fetch/SQL/clock/random; public host/private sidecar/workers/browser have separate runtime identities and exchange validated DTOs, never raw Causes/Layers/Fibers. No nested runPromise inside domain services and no per-request Layer graph recreation. | Summary: R5 subordinate contract; implement/test together without weakening parent scope | Disposition: quality-gate
- R6 | Source Quote: Pin framework/UI/lint source, notices and wrapper exports/declarations. Verify untouched upstream and exact target compatibility, no duplicate registry Effect or unreviewed peer bypass; Vite plugin excluded. | Summary: Vendored Foldkit; complete subordinate acceptance preserved below | Disposition: in-scope
- SRC-007 | Source Quote: Pin foldkit/UI0.169.0 and oxlint-plugin0.15.3 at7ee214268c602967937b80f6f20d1e831f2e8ab6. One entry per actual upstream export with Node/browser-like parity tests, Effect/platform-browser externalized and parse5 bundled; complete declaration/license/provenance closure and untouched vendor verification. | Summary: R6 subordinate contract; implement/test together without weakening parent scope | Disposition: quality-gate
- SRC-008 | Source Quote: Vendor payload paths are explicitly enumerated: excludes are recorded metadata, not tool filters. If target incompatible, review newer pinned upstream or first-party adapter and upstream repair; no hand-edited vendor tree, silent peer override or assumed wildcard entries. | Summary: R6 subordinate contract; implement/test together without weakening parent scope | Disposition: quality-gate
- R7 | Source Quote: Crease Tailwind first, justified Foldcn gaps; untouched pinned snapshot separate from adapted source, file/hash/dependency/license/owner ledger; no blind hosted registry theme/dependency mutation. | Summary: Component source provenance; complete subordinate acceptance preserved below | Disposition: in-scope
- SRC-009 | Source Quote: Reviewed Crease source bb447e363e9c717bf11ebb10b2259f053bff6f71; Foldcn source1fe1acc6a98dee9b8a040023ee88988098b42cab. Preserve notices, ECharts/transitive license obligations; Tailwind selected only, no StyleX/Pleat/showcase/maps/CLI presets. Adapted-source state/scene/browser/anti-slop checks and target-version closure before uptake. | Summary: R7 subordinate contract; implement/test together without weakening parent scope | Disposition: quality-gate
- R8 | Source Quote: Single role-model facade/owner, tokens/Geist/geometry retained and donor mapping reviewed. Light/dark/mobile, keyboard/focus/RTL/disabled/reduced-motion, named donor gap tests. | Summary: RM3 component behavior; complete subordinate acceptance preserved below | Disposition: in-scope
- SRC-010 | Source Quote: Preserve cn merge semantics and parent async-state/submodel wiring; test overlay escape/dismissal and screen-reader names/semantics. Permanent specimen Story/Scene and browser fixtures replace temporary-only galleries. | Summary: R8 subordinate contract; implement/test together without weakening parent scope | Disposition: quality-gate
- R9 | Source Quote: Real time-series/ranking pilot before broad waves; exact values/units/series/axes/buckets/formats/statuses/HTML alternatives plus live updates/range/theme/resize and no React/duplicate Effect. | Summary: React-free chart pilot; complete subordinate acceptance preserved below | Disposition: in-scope
- SRC-011 | Source Quote: Tooltip/legend interaction, rapid filter/range switches with obsolete work suppressed, stable variant on theme updates and multi-instance collision-free host IDs required. Loading/empty/error/stale/partial/truncated/unsupported states remain distinct; meaningful numeric HTML alternative with actual accessible names. | Summary: R9 subordinate contract; implement/test together without weakening parent scope | Disposition: quality-gate
- R10 | Source Quote: Mount/unmount/partial acquire/observer/frame/font/registry and multi-instance tests; bounded captures; chart-only approved-render-change separately counted, no semantic relaxation or whole-page masks. | Summary: Chart lifecycle/render policy; complete subordinate acceptance preserved below | Disposition: in-scope
- SRC-012 | Source Quote: Test hidden/zero-size container resize, repeated mount/unmount heap, font readiness and canvas animation completion at fixed DPR/timezone; bounded diagnostic timeout for changing charts. No claim SVG helper module dependency closure costs zero. | Summary: R10 subordinate contract; implement/test together without weakening parent scope | Disposition: quality-gate
- R11 | Source Quote: Inventory all actual routes and redirects, typed parse/build/deep links/history/not-found, shell/theme/submodels/commands/subscriptions; stale response/route-instance/focus behavior verified. | Summary: Root routes and submodels; complete subordinate acceptance preserved below | Disposition: in-scope
- SRC-013 | Source Quote: Record sibling runtime-ui-next versus in-place decision before edits; preserve title/theme/bootstrap/scroll/focus and root parent cross-route facts; portable APIs not pseudo-JSX shortcuts. | Summary: R11 subordinate contract; implement/test together without weakening parent scope | Disposition: quality-gate
- R12 | Source Quote: Preserve fallback/error/request semantics. Compare method/path/query/body/relevant redacted headers/multiplicity/status/stream and causal write/tool order; no duplicate fetch/listener; gap/snapshot resync. | Summary: API and refresh compatibility; complete subordinate acceptance preserved below | Disposition: in-scope
- SRC-014 | Source Quote: Retain injectable RuntimeEventSourceFactory/test services and one owned Refresh Subscription, stale diagnostics fields and gap/snapshot resync. Lossy coalesced/sliding refresh buffers cannot carry ordered lossless token streams. | Summary: R12 subordinate contract; implement/test together without weakening parent scope | Disposition: quality-gate
- R13 | Source Quote: Every inventoried read/control/write/heavy/learning/studio route/component, modals/palette/media/device auth: maintained success/empty/loading/error/denied/degraded/stale/mobile/theme journeys, not pilot-only. | Summary: Complete route waves; complete subordinate acceptance preserved below | Disposition: in-scope
- R14 | Source Quote: Separate client mocks/source-QA/identified packaged lanes; React selfcheck0diff, mutation sensitivity and deterministic double run; no unhandled console/unmocked endpoint; bounded font/canvas readiness. | Summary: Self-validating parity harness; complete subordinate acceptance preserved below | Disposition: in-scope
- SRC-015 | Source Quote: Deliver packages/ui-parity and runtime:parity. M4 pre-change React baseline/selfcheck precedes M1 acceptance. Freeze clock/RNG, finish animation, fonts/images then400ms quiet/two stable frames/repeated image; bounded canvas-ready path. Compare text/control positions/styles, exact request semantics and applicable accessibility. Chart-only approvals separately counted. | Summary: R14 subordinate contract; implement/test together without weakening parent scope | Disposition: quality-gate
- SRC-016 | Source Quote: Run packaged comparison twice (React/Foldkit) against same controlled fixture backend/scenarios; retain runtime:validate-ui fixtures and separate source-QA/package/client lanes. Hide carets/scrollbars and avoid networkidle for persistent SSE; non-chart layout/text zero perceptual pixels, bounded approved chart deltas only. | Summary: R14 subordinate contract; implement/test together without weakening parent scope | Disposition: quality-gate
- R15 | Source Quote: Supported ordinary DSH or pi CLI via exact packaged router to approved real provider. Verify active model/profile/target/alias and plugin version; both clients when shared contract changes; curl/fixture/script-only not substitute. | Summary: Actual client inference; complete subordinate acceptance preserved below | Disposition: in-scope
- SRC-017 | Source Quote: Isolate client profile/session and NEVER repoint controller session or user active model. Record executable/plugin/version, URL/discovery/alias/active model/effective config/capabilities; bound requests/tokens/time/cost and auxiliary calls. Unauthorized/unavailable provider yields NOT RUN, no fixture substitution. | Summary: R15 subordinate contract; implement/test together without weakening parent scope | Disposition: quality-gate
- R16 | Source Quote: Preserve v0.0.20 R, clean dev D, candidate C identities separately; artifact/process/served closure, independent state/config, classified pre-existing/intentional/inconclusive deltas; no exact stochastic prose/latency promise. | Summary: Release/dev/candidate comparison; complete subordinate acceptance preserved below | Disposition: in-scope
- SRC-018 | Source Quote: Classify pre-existing R-to-D, migration regression, approved intentional change, known baseline defect and absent/inconclusive/environmental capability explicitly. No blanket dev-changed waiver; intentional delta requires requirement/rationale/approval/expected-value assertions/maintained regression. Unexplained R/C blocks parity even if D/C passes; absent capability is not exercised coverage. | Summary: R16 subordinate contract; implement/test together without weakening parent scope | Disposition: quality-gate
- SRC-019 | Source Quote: Preserve R by isolated copy/staging with unchanged artifact bytes; supported launch overrides validated before use, unused loopback ports, independent config/state/log/lock roots and owned process. Stop if isolation unproved; no release manifest edits, operator3456/3457/3458 occupation, shared writable SQLite, old binary on candidate schema, operator-secret replay or naive live DB copy omitting WAL. Independently seed equivalent authorized config or verified consistent backups. | Summary: R16 subordinate contract; implement/test together without weakening parent scope | Disposition: quality-gate
- R17 | Source Quote: J1 stream,J2 tool turns,J3 cancel/error,J4 metadata/effort,J5 restart,J6 configured replay/eval/learning: same request/decision/provider/capture IDs through telemetry/API/rendered numeric UI/graph/payload/projections and durable reread. | Summary: Cross-surface persistence journeys; complete subordinate acceptance preserved below | Disposition: in-scope
- SRC-020 | Source Quote: Unique synthetic markers and supported request/turn/trace/job/graph ID mapping, before/after counters and bounded watermarks required. Classify auxiliary client calls/traffic; use actual served assets and API/network readback, no Vite-to-production confusion or page.route stubs. Storage inspection is read-only with no inserts/repairs/deletes; private projection failure must remain visible. | Summary: R17 subordinate contract; implement/test together without weakening parent scope | Disposition: quality-gate
- SRC-021 | Source Quote: Incorporate every assertion in source §6.9 J1-J6 matrix verbatim by reference as acceptance: ordered tool_call_id/result and graph relationships, no cancel/error false success/hung spinner/double accounting, eligible model/reason/effort and live-only support metadata, persisted history after restart (not sockets), configured arms/jobs/evidence and honest disabled/unavailable, never seeded success rows. Sample complete actual source->projection/edge/payload chain and classify auxiliary calls/live/probe/evaluation/headline inclusion without relabeling. | Summary: R17 subordinate contract; implement/test together without weakening parent scope | Disposition: quality-gate
- R18 | Source Quote: Private content/schema/secrets remain private evidence; safe public refs. PASS/FAIL/NOT RUN/INCONCLUSIVE/reviewed N/A distinct; missing provider/graph/build not PASS; refresh hashes/receipts after changes. | Summary: Evidence/privacy honesty; complete subordinate acceptance preserved below | Disposition: in-scope
- SRC-022 | Source Quote: Receipts include scenario/R/task IDs, source/build/exe/UI/private closure, client/plugin/commands/redacted config, alias/provider/classification, owned PID/URL/root, sanitized outputs/exits, ID joins/API window/storage/DOM/numerics/screenshots/restart/cleanup and approvals. Capture at M0a, Effect-only M1, M5, affected wave, integrated pair and finalM12; repair invalidates affected receipts. Controller closes live/release gates only after independent code/test/verifier evidence. | Summary: R18 subordinate contract; implement/test together without weakening parent scope | Disposition: quality-gate
- R19 | Source Quote: Enumerate actual operations/resources/callers; characterized move+shim separate from behavior; sync/Promise/auth/route/closure/default compatibility; explicit pure/existing-Effect/adapter/convert dispositions, no monolith exemption. | Summary: Current contracts/extraction B0; complete subordinate acceptance preserved below | Disposition: in-scope
- SRC-023 | Source Quote: Bounded leaf conversion can precede unrelated extraction; no giant all-monolith split prerequisite or arbitrary shell-line threshold. Move/shim contracts remain separately characterized from semantic conversion. | Summary: R19 subordinate contract; implement/test together without weakening parent scope | Disposition: quality-gate
- R20 | Source Quote: Separate bounded module health/Cause attribution from business telemetry. Preserve original Fail/Die/Interrupt/errors/origin/propagation; reporter/serializer/overflow/finalizer/outage cannot change business result or recurse. | Summary: Diagnostics B1; complete subordinate acceptance preserved below | Disposition: in-scope
- SRC-024 | Source Quote: Calibrate and approve concrete record/byte/ingress/formatting/TTL/query limits before enablement. One report owner at request/job/lifecycle edge after finalizers/before wire translation; compile exact target ErrorReporter/Cause APIs and test hostile/cyclic/nested/reused errors, acquire/finalizer/mixed reasons, overflow/outage/redaction/no-recursion. | Summary: R20 subordinate contract; implement/test together without weakening parent scope | Disposition: quality-gate
- SRC-025 | Source Quote: Existing run108 scoped metrics/spans stay authoritative; GenAI projection is not an exporter. OTLP tracer/logger/metrics are separate optional sinks with explicit dependencies, bounded buffer/flush, no-collector admission isolation and low-cardinality labels; existing GenAI attributes/wire contracts retained. | Summary: R20 subordinate contract; implement/test together without weakening parent scope | Disposition: quality-gate
- R21 | Source Quote: Authorized bounded local query + Foldkit page: peer/trust/read-credential/Host/Origin/redaction tests, instance/build/loss/cursor, denied/stale/drop/empty/disabled/mobile/focus; no global fiber dump. | Summary: Diagnostics API/UI; complete subordinate acceptance preserved below | Disposition: in-scope
- SRC-026 | Source Quote: Reject spoofed forwarded owner headers and wildcard/reflected CORS; diagnostics cannot contaminate business/live aggregates. Test injected defect through actual authorized read path, keep current observability-snapshot/store-degradation pages intact, and show missing/stale/loss/build identity honestly. | Summary: R21 subordinate contract; implement/test together without weakening parent scope | Disposition: quality-gate
- R22 | Source Quote: Scope process/stdio/readiness/health/restart/exit preserving env/cwd/logs/SEA/token/loopback; hung health/partial startup/repeated stop/Windows grandchild/force escalation and SEA tests. | Summary: Supervisor B2/B2a; complete subordinate acceptance preserved below | Disposition: in-scope
- R23 | Source Quote: Explicit async Effect callers and compatible sync facade; fallible partial open/PRAGMA cleanup, initial+2busy retries100/200ms plus5s timeout, same-connection SQL transactions, primary error preserved, rich graph hydration. | Summary: SQL service B3; complete subordinate acceptance preserved below | Disposition: in-scope
- SRC-027 | Source Quote: Never retry provider/network side effects inside SQL transaction. Serialize connection/fiber ownership rather than mutable depth shared across yielding fibers; Effect Ref/Tx memory is not SQL. Drain/fence all owners for backup/reset/restore and preserve actual per-store PRAGMAs, primary SQL failure across rollback/close errors. | Summary: R23 subordinate contract; implement/test together without weakening parent scope | Disposition: quality-gate
- R24 | Source Quote: DatabaseSync remains blocking; no scheduled runSync/Tx-memory substitute. Preserve per-store PRAGMA, measure lock/event loop, drain/fence reset/restore; schema changes need reader/migration/backup/rollback proof. | Summary: SQL blocking/maintenance truth; complete subordinate acceptance preserved below | Disposition: in-scope
- SRC-028 | Source Quote: Any off-thread/native-driver change needs measured event-loop/lock evidence, serialization/caller/version/SEA packaging proof and explicit review, not a nonblocking claim from async return type. Schema changes require versioned idempotent migration, copied-fixture preflight, N/N-1 reader/build matrix, source/channel/key backup manifest and rollback retirement window; compatible reader or approved forward repair/export, no global WAL switch/shared R/D/C state/old binary against new bytes. | Summary: R24 subordinate contract; implement/test together without weakening parent scope | Disposition: quality-gate
- R25 | Source Quote: Effect producer wraps pure scorer via explicit type/caller migration; empty-pool/tie/role-task-effort-arm/golden parity. Code/detail wire projection; legacy strictness changes separately approved. | Summary: Routing/schema B4; complete subordinate acceptance preserved below | Disposition: in-scope
- SRC-029 | Source Quote: Either explicitly migrate Effect-returning producer and every type/caller edge or add a separately named producer with tested sync compatibility adapter; returning Effect changes a synchronous signature. protocol-routing runSync allowed only while no async service needed; preserve reason-code values/order and serialize original code/detail records. | Summary: R25 subordinate contract; implement/test together without weakening parent scope | Disposition: quality-gate
- R26 | Source Quote: Actual AbortSignal to I/O, scoped reader/listener cleanup, typed failures and exact per-operation retry. Preserve tool/reasoning/fragmentation/drain/first-substantive commit/finish/DONE/error; no unsafe paid redispatch or second response. | Summary: Transport/SSE B5; complete subordinate acceptance preserved below | Disposition: in-scope
- SRC-030 | Source Quote: Preserve private operation connection retry delays250/1000/2500/5000ms and distinct typed idempotent aggregate timeout behavior; status/protocol/caller abort not generic retry. Span full async I/O, not Promise creation. Downstream tokens remain lossless/drain-bound and never share lossy refresh buffers. | Summary: R26 subordinate contract; implement/test together without weakening parent scope | Disposition: quality-gate
- R27 | Source Quote: Closed shared-leaf Layer DAG owns CLI/backend/server/bootstrap/refresh/drains/benchmarks, early readiness and partial shutdown. Bounded permits/waiters/cache identity; per-run sequential judge/throttle isolation, no late task writes. | Summary: Public composition B6; complete subordinate acceptance preserved below | Disposition: in-scope
- SRC-031 | Source Quote: Provider permits process-owned with separate bounded waiters; preserve concurrency defaults unless reviewed. Metadata cache keys include authority/config/model, TTL/cap/invalidation; NEVER deduplicate distinct stochastic inference. Shutdown stops admission then joins/drains/interrupts tasks before dependencies; finalizer failure cannot skip later releases/force early exit. Benchmark cancellation and overlap isolation tested before concurrency increases. | Summary: R27 subordinate contract; implement/test together without weakening parent scope | Disposition: quality-gate
- R28 | Source Quote: Existing ArtifactStore/EventLog/capture WAL/retention authority, immutable hash/generation/blob/key/scope/channel/privacy/hold/recovery retained. No raw capture duplication to jobs or async yield inside sync SQL; no fictional cross-store atomicity. | Summary: Private storage B7; complete subordinate acceptance preserved below | Disposition: in-scope
- SRC-032 | Source Quote: EventLog is bounded metadata, not complete raw inference journal; capture storageMode label does not prove reference-only payloads. Pointer/encryption/admission/degraded-routing changes require separate privacy/contract decision; preserve ArtifactStore DELETE/FULL/FK versus actual WAL owners. | Summary: R28 subordinate contract; implement/test together without weakening parent scope | Disposition: quality-gate
- R29 | Source Quote: Bounded single-flight/caller-priority drain owned through stop/join, no closed-store timer access; test partial acquire, committed-versus-postcommit error and restart/recovery. | Summary: Capture drain/postcommit; complete subordinate acceptance preserved below | Disposition: in-scope
- SRC-033 | Source Quote: Real-store fault matrix: stale leases, interrupted maintenance, failed ack/late completion, corrupt/decryption failure, restore and partial publication with existing recovery receipts. Separate transactional/post-COMMIT lookup/prune failures so unconditional rollback cannot mask primary outcome. New cross-store guarantee requires explicit durable outbox/idempotent protocol, not Scope magic. | Summary: R29 subordinate contract; implement/test together without weakening parent scope | Disposition: quality-gate
- R30 | Source Quote: Retain PersistedQueue SQLite deviation/jobs/IDs/actual public consumer. Abort-aware handlers, lease/late-completion fence, evidence-before-ack, kill/drain/root/effort/refusal; characterize two-host distinct-job global concurrency. | Summary: Background workflows B8; complete subordinate acceptance preserved below | Disposition: in-scope
- SRC-034 | Source Quote: New effect-mq SQLite driver is a separately approved conformance slice. Preserve terminal/deferrable refusal/tool/recovery policies and do not resurrect superseded recovery passes. Local semaphores/same-row claims do not prove multi-host distinct-job cap; enforce actual topology contract. Public host stays packaged evaluation consumer until reviewed topology change; root/kill/drain/retry/cleanup readback agrees across processes. | Summary: R30 subordinate contract; implement/test together without weakening parent scope | Disposition: quality-gate
- R31 | Source Quote: Retain submitted-output reuse after score failure, provider receipts/no redispatch, sandbox/lease/holdout/provenance/floor/tie/rollback and existing Effect folds; independent aggregate consent/destination/revocation, no raw export. | Summary: Trial/learning/contribution; complete subordinate acceptance preserved below | Disposition: in-scope
- SRC-035 | Source Quote: Retain no-egress sandbox process-tree/time/output/workspace limits, versioned profile fsync/rename publication and late-ack/revocation fences; reuse current learner/folds instead of second learner or hidden production autoactivation. | Summary: R31 subordinate contract; implement/test together without weakening parent scope | Disposition: quality-gate
- R32 | Source Quote: Closed private domain Layers, authenticated compatible DTO/version/capability/readiness and bounded joins; scoped processes/stores; real cross-repo capture/queue/projection evidence, not health200-only. | Summary: Private composition B9; complete subordinate acceptance preserved below | Disposition: in-scope
- SRC-036 | Source Quote: Scope child processes/readline ready protocol/ephemeral auth/timeouts; post-acquire endpoint rejection and partial startup release child. Preserve bounded pagination, missing-versus-unavailable joins, live/probe/evaluation class, codec/externalization limits and compatible incremental public/private deployment; answering200 is not closure proof. | Summary: R32 subordinate contract; implement/test together without weakening parent scope | Disposition: quality-gate
- R33 | Source Quote: Every actual operation owner converted or explicit reviewed retention with tests/TDD/caller refs. Existing regression anchors extended; real DB/OS/process-kill/package/live proofs, not constructor/import-only. | Summary: Backend completion B10; complete subordinate acceptance preserved below | Disposition: in-scope
- SRC-037 | Source Quote: Reject wrapped-but-unused leaves or token Effect over unowned Promise/timer. Per-operation disposition is converted/retained-pure/retained-compatible-adapter/retained-existing-Effect/approved-N-A; no blanket monolith retention. Ledger records repo/path/export/owner/caller, service/Layer/scope/error-wire/cancel/transaction/lease/fence, B/M/task/R IDs, RED/GREEN/refactor/CI coverage, source/build/reviewer/rollback. Remove legacy orchestration only after actual callers migrate. | Summary: R33 subordinate contract; implement/test together without weakening parent scope | Disposition: quality-gate
- SRC-038 | Source Quote: Run anti_slop_lint on every changed first-party backend/client slice with Effect rules where applicable; fix or explicitly review against contract tests, not blanket legacy rewrite. Lint findings are pattern debt, not bug counts; retain security guards and untouched vendor source. | Summary: R33 subordinate contract; implement/test together without weakening parent scope | Disposition: quality-gate
- R34 | Source Quote: Before scope lock explicit owner-approved include or named follow-on for universal journal/coherent checkpoint/cold graph/pins/erase authority. No implicit cancellation/implementation; inclusion adds current schema/fence/rebuild/reader/rollback tasks. | Summary: E1 owner disposition; complete subordinate acceptance preserved below | Disposition: constraint
- SRC-039 | Source Quote: Deferral must name follow-on/rationale/revised completion scope and owner approval. Inclusion defines complete envelope/order/projection membership, common watermark/CAS/rebuild, graph archive reader/checksum/publication, durable pin/outbox/delete fence, erase/backup authority and all prune/restore/race/reader/crash laws. Until approved, no destructive tiering/admission changes or historical fulfillment claim. | Summary: R34 subordinate contract; implement/test together without weakening parent scope | Disposition: constraint
- R35 | Source Quote: Before scope lock explicit include or named follow-on for ALL accepted live durable jobs/result/reconnect/uncertain semantics. Current capture queue not equivalent; inclusion defines auth/versions/cancel-detach/offset/ack/crash and paid-action uncertainty. | Summary: E2 owner disposition; complete subordinate acceptance preserved below | Disposition: constraint
- SRC-040 | Source Quote: Deferral must name follow-on/rationale/revised scope and owner approval. Inclusion defines submission conflict/state/version/pins/result/offset/auth/reconnect/cancel-vs-detach/provider ownership and paid-action uncertainty; ack after durable receipt and real kill/reconnect/history-floor tests. No socket survival or external exactly-once claim; unresolved prohibits live-admission change. | Summary: R35 subordinate contract; implement/test together without weakening parent scope | Disposition: constraint
- R36 | Source Quote: Disjoint named scopes, single writer shared files, dependency/task IDs, verified team model, independent current code/test/live review, evidence action records. Backend/client stable DTO parallel then join M11 including diagnostics and E dispositions. | Summary: Controller teams and joint closure; complete subordinate acceptance preserved below | Disposition: in-scope
- SRC-041 | Source Quote: GPT controls integration/final review, one active phase and only independent within-phase parallel scopes. Source task catalogue and B/M dependencies govern named files/acceptance; single shared-file writer, current task revision claims and FS_STALE_VERSION rebase, no broad formatter/codegen races or worker expected-baseline/tolerance edits. | Summary: R36 subordinate contract; implement/test together without weakening parent scope | Disposition: quality-gate
- SRC-042 | Source Quote: Every handoff includes current paired SHAs/artifact hashes/upstream/addenda/diff basis/files/questions/budget/output gates. Return actual diff/files/test exits/RED-GREEN/live refs/limitations/R status; store durable action record, controller verify real evidence, preserve failed attempts, refresh bundles/review after repairs. No self-approval; unavailable delegation explicitly self-audit without fabricated external independence. Track/wait/collect or cancel every owned worker job; normal-process worker ledger replaces Team wake/status mechanics under latest owner authority. | Summary: R36 subordinate contract; implement/test together without weakening parent scope | Disposition: quality-gate
- R37 | Source Quote: Exact SEA/private/UI source closure and final real-client journeys; one-release matched rollback with reader/state proof; retire React only after consumers migrate; retain maintained candidate/live CI harness; no automatic main promotion. | Summary: Packaged cutover/rollback; complete subordinate acceptance preserved below | Disposition: in-scope
- SRC-043 | Source Quote: Retire runtime-ui React only; docs-site remains Fumadocs/React. Keep matched old React artifact one release and reversible serving selection, wrappers/private source closure and compatible schema/pending work. Component adapters remain same facade; any temporary bridge removal deadline enforced. Stage/runtime:validate-packaging proof precedes approved promotion; do not archive maintained candidate/live harness. | Summary: R37 subordinate contract; implement/test together without weakening parent scope | Disposition: quality-gate
- SRC-044 | Source Quote: Effect rollback restores reviewed prior pin/tooling and matching wrapper graph, rebuilds matched public/private/UI closure and verifies readers plus pending/persisted work; never downgrade npm alone or launch rebuilt old binary against incompatible new state. | Summary: R37 subordinate contract; implement/test together without weakening parent scope | Disposition: quality-gate
- R38 | Source Quote: Pre-agreed bytes/parse/first-render/update/heap plus backend latency/event-loop/cancel/open-handles/store contention under degraded loads; bounded budgets/owned ports/roots/jobs; no production3456/3457/3458 reset, unauthorized spend or secrets. | Summary: Resource/safety/performance; complete subordinate acceptance preserved below | Disposition: in-scope
- SRC-045 | Source Quote: Fix measured workload/hardware/fixture identity and approved thresholds BEFORE pilot: raw/gzip startup/lazy chunks, parse/first chart/update/repeated-mount heap plus quiet/burst/degraded/collector-down backend latency/blocking/cancel/handles/lock load and rollback. Missing provider/prerequisite remains NOT RUN/INCONCLUSIVE. | Summary: R38 subordinate contract; implement/test together without weakening parent scope | Disposition: quality-gate
- R39 | Source Quote: Implement runtime:verify-client-journeys and runtime:compare-release as maintained scripts with controller-owned root/CI wiring; actual target/config/port/root validation fails closed, no silent mocks, NOT RUN distinct from successful test exit. Discovery/adapter scripts supplement but never replace ordinary client evidence. | Summary: Maintained real-client verification commands; complete subordinate acceptance preserved below | Disposition: in-scope

## Reproduction Steps (Novice-Runnable)

1. From exact public worktree run node --version and git rev-parse HEAD; compare locked00-worktree. Never start operator runtime.
2. Baseline wrapper builds: node role-model-router/packages/effect/build.mjs, private node shared/effect/build.mjs then SQL/effect-mq builds; explicit package cwd needed for tests and no Node-target browser proof inferred.
3. Public tests: from each role-model-router/packages/<name> use node ../../../node_modules/vitest/vitest.mjs run (process-supervisor/core/protocol-routing/endpoint-registry/sqlite-memory). From runtime-ui run same path to Vitest; recorded752baseline tests.
4. Private test roots: node --test --test-concurrency=1 shared/capture/test/durable-queue.test.mjs tests/track-b/run101-r5-evaluation-queue.test.mjs with TMP/TEMP/RUN00_TEMP_ROOT on E:. Recorded baseline, not instructed to rerun blindly.
5. Actual gaps are source hypotheses requiring RED tests in Phase3 after concrete plan; no infinite wait/fault reproduction against live operator state. Provider/real CLI R/D/C tests require separate isolated authorized preflight.

## Current Behavior by Requirement

Provenance: O=controller/analyst actual source read, B=recorded baseline/test evidence, U=unknown/not executed. Report-specific O/P markers retained in raw domain reports; no unknown is treated as absence. Paths below P under role-model-router, I under private repository.

| ID | Current owner/caller and observed behavior | Existing test/evidence and unresolved limit |
| --- | --- | --- |
| R1 | Controller Git/worktree identities; original checkouts remain dirty but isolated sources match pinned dev | 00-worktree.md; current-paired-identities.json and baseline-review-attempt02.md |
| SRC-001 | Same actual owner R1; Controller Git/worktree identities; original checkouts remain dirty but isolated sources match pinned dev | 00-worktree.md; current-paired-identities.json and baseline-review-attempt02.md |
| R2 | Controller launches DSH headless overlay -> exact provider request headers; native model selection disabled, supported CLI route works | evidence/router/deepseek-flash-worker.patch.yml; evidence/other/team-model-routing/as-is-analyst-routes.json |
| SRC-002 | Same actual owner R2; Controller launches DSH headless overlay -> exact provider request headers; native model selection disabled, supported CLI route works | evidence/router/deepseek-flash-worker.patch.yml; evidence/other/team-model-routing/as-is-analyst-routes.json |
| R3 | Controller canonical recursive workflow/CI test selectors; no product edits or RED cycle yet | 00-requirements.md; baseline receipts; future per-slice RED files not created |
| SRC-003 | Same actual owner R3; Controller canonical recursive workflow/CI test selectors; no product edits or RED cycle yet | 00-requirements.md; baseline receipts; future per-slice RED files not created |
| R4 | scripts/vendor-upstream.mjs UPSTREAMS.effect -> vendor/effect -> paired effect package wrappers4.0.1 | packages/effect/build.mjs and private shared/effect/build.mjs; existing run108-effect-entry-case-resolution.test.ts |
| SRC-004 | Same actual owner R4; scripts/vendor-upstream.mjs UPSTREAMS.effect -> vendor/effect -> paired effect package wrappers4.0.1 | packages/effect/build.mjs and private shared/effect/build.mjs; existing run108-effect-entry-case-resolution.test.ts |
| R5 | packages/effect/entries.mjs discovery and Node24 build -> all Node consumers; browser/platform-node wrappers absent | run108-effect-entry-case-resolution.test.ts and source entries.mjs; browser target tests absent |
| SRC-005 | Same actual owner R5; packages/effect/entries.mjs discovery and Node24 build -> all Node consumers; browser/platform-node wrappers absent | run108-effect-entry-case-resolution.test.ts and source entries.mjs; browser target tests absent |
| SRC-006 | Same actual owner R5; packages/effect/entries.mjs discovery and Node24 build -> all Node consumers; browser/platform-node wrappers absent | run108-effect-entry-case-resolution.test.ts and source entries.mjs; browser target tests absent |
| R6 | No vendor/foldkit or workspace Foldkit exists; scripts/vendor-upstream currently effect/effect-mq only | Remote exact tag7ee21426 verified by controller; new wrapper/subpath tests absent |
| SRC-007 | Same actual owner R6; No vendor/foldkit or workspace Foldkit exists; scripts/vendor-upstream currently effect/effect-mq only | Remote exact tag7ee21426 verified by controller; new wrapper/subpath tests absent |
| SRC-008 | Same actual owner R6; No vendor/foldkit or workspace Foldkit exists; scripts/vendor-upstream currently effect/effect-mq only | Remote exact tag7ee21426 verified by controller; new wrapper/subpath tests absent |
| R7 | No selected donor source installed; existing component owner packages/ui and runtime-ui components | Source proposal4.5 pinned research; target donor closure/build not verified |
| SRC-009 | Same actual owner R7; No selected donor source installed; existing component owner packages/ui and runtime-ui components | Source proposal4.5 pinned research; target donor closure/build not verified |
| R8 | packages/ui React facade -> app-shell/page-primitives/themed-select/device-auth; tokens in rm3-tokens.css/theme.ts | UI theme.test.ts,page-primitives.test.tsx,design-system.test.ts; donor a11y integration absent |
| SRC-010 | Same actual owner R8; packages/ui React facade -> app-shell/page-primitives/themed-select/device-auth; tokens in rm3-tokens.css/theme.ts | UI theme.test.ts,page-primitives.test.tsx,design-system.test.ts; donor a11y integration absent |
| R9 | UI observe/overview chart adapters and telemetry-charts -> Recharts ui chart/time-series/ranking | observe-chart-adapter.test.ts,telemetry-charts.test.tsx; new renderer pilot absent |
| SRC-011 | Same actual owner R9; UI observe/overview chart adapters and telemetry-charts -> Recharts ui chart/time-series/ranking | observe-chart-adapter.test.ts,telemetry-charts.test.tsx; new renderer pilot absent |
| R10 | React chart component lifetimes current, no ECharts resource adapter in repo | telemetry-charts.test.tsx/current UI752 baseline; browser ECharts mount/heap unknown |
| SRC-012 | Same actual owner R10; React chart component lifetimes current, no ECharts resource adapter in repo | telemetry-charts.test.tsx/current UI752 baseline; browser ECharts mount/heap unknown |
| R11 | app/routes.ts -> app-layout/root/app-shell -> design-system navigation and route resolver | routes.ts controller AST75calls53canonical20redirect2details6learning; app-shell/root/design-system tests |
| SRC-013 | Same actual owner R11; app/routes.ts -> app-layout/root/app-shell -> design-system navigation and route resolver | routes.ts controller AST75calls53canonical20redirect2details6learning; app-shell/root/design-system tests |
| R12 | app/lib/runtime-api.ts subscribeTelemetry/Revision/RuntimeRefreshStream2983-3020 -> refresh bus and route effects | runtime-api.test.ts and live-refresh/runtime-refresh-bus tests; no Effect Subscription yet |
| SRC-014 | Same actual owner R12; app/lib/runtime-api.ts subscribeTelemetry/Revision/RuntimeRefreshStream2983-3020 -> refresh bus and route effects | runtime-api.test.ts and live-refresh/runtime-refresh-bus tests; no Effect Subscription yet |
| R13 | routes modules map all canonical families incl six learning paths to learning.tsx; overlapping shared primitives | UI full79files752tests; Playwright e2e24spec files not executed as packaged lane |
| R14 | playwright.config.ts source QA bridge builds UI, runtime:validate-ui controls fixtures; no ui-parity package yet | Existing runtime-shell/shared-surface specs; no React-vs-React mutation/image harness proof |
| SRC-015 | Same actual owner R14; playwright.config.ts source QA bridge builds UI, runtime:validate-ui controls fixtures; no ui-parity package yet | Existing runtime-shell/shared-surface specs; no React-vs-React mutation/image harness proof |
| SRC-016 | Same actual owner R14; playwright.config.ts source QA bridge builds UI, runtime:validate-ui controls fixtures; no ui-parity package yet | Existing runtime-shell/shared-surface specs; no React-vs-React mutation/image harness proof |
| R15 | packages/pi-role-model and dsh-role-model actual provider adapters -> downstream discovery and /v1/chat/completions | README confirmed ordinary pi command and interactive diagnostics; own worker inference is NOT router acceptance |
| SRC-017 | Same actual owner R15; packages/pi-role-model and dsh-role-model actual provider adapters -> downstream discovery and /v1/chat/completions | README confirmed ordinary pi command and interactive diagnostics; own worker inference is NOT router acceptance |
| R16 | Root release manifest945a8906/public tree d29e plus nested c002edfd/private16021cc5 differs from dev public source | D:/role-model-router/0.0.20/manifest.json and TrackB manifest inspected;3hashes checked, no launched comparison |
| SRC-018 | Same actual owner R16; Root release manifest945a8906/public tree d29e plus nested c002edfd/private16021cc5 differs from dev public source | D:/role-model-router/0.0.20/manifest.json and TrackB manifest inspected;3hashes checked, no launched comparison |
| SRC-019 | Same actual owner R16; Root release manifest945a8906/public tree d29e plus nested c002edfd/private16021cc5 differs from dev public source | D:/role-model-router/0.0.20/manifest.json and TrackB manifest inspected;3hashes checked, no launched comparison |
| R17 | Public provider attempts/observations -> SQLite projections + private capture/graph -> telemetry/runtime-api/UI | Baseline atomic-observation/capture/observability tests; J1-J6 actual client R/D/C and persisted joins NOT RUN |
| SRC-020 | Same actual owner R17; Public provider attempts/observations -> SQLite projections + private capture/graph -> telemetry/runtime-api/UI | Baseline atomic-observation/capture/observability tests; J1-J6 actual client R/D/C and persisted joins NOT RUN |
| SRC-021 | Same actual owner R17; Public provider attempts/observations -> SQLite projections + private capture/graph -> telemetry/runtime-api/UI | Baseline atomic-observation/capture/observability tests; J1-J6 actual client R/D/C and persisted joins NOT RUN |
| R18 | Controller owned evidence/router records, action records and per-repo baseline receipts; private evidence kept private | Recorded route/header hashes and test logs; final product receipts absent |
| SRC-022 | Same actual owner R18; Controller owned evidence/router records, action records and per-repo baseline receipts; private evidence kept private | Recorded route/header hashes and test logs; final product receipts absent |
| R19 | Public cli/index/track-b-runtime monolith and private operations sidecar own actual API/closures | Source reports [O] versus [P]; per-method not-read entries unknown, must inspect before bounded slice |
| SRC-023 | Same actual owner R19; Public cli/index/track-b-runtime monolith and private operations sidecar own actual API/closures | Source reports [O] versus [P]; per-method not-read entries unknown, must inspect before bounded slice |
| R20 | run108-observability.ts MetricRegistry per runtime and stage span helpers; runtime-observability bundle/GenAI mapper | run108-observability.test.ts31baseline; new bounded health/Cause store+export closure absent |
| SRC-024 | Same actual owner R20; run108-observability.ts MetricRegistry per runtime and stage span helpers; runtime-observability bundle/GenAI mapper | run108-observability.test.ts31baseline; new bounded health/Cause store+export closure absent |
| SRC-025 | Same actual owner R20; run108-observability.ts MetricRegistry per runtime and stage span helpers; runtime-observability bundle/GenAI mapper | run108-observability.test.ts31baseline; new bounded health/Cause store+export closure absent |
| R21 | Existing observability-snapshot and store-degradation routes, no observe/diagnostics API/page found | run108-ui-registration/readback tests; new auth/Host/Origin/injected-defect suite absent |
| SRC-026 | Same actual owner R21; Existing observability-snapshot and store-degradation routes, no observe/diagnostics API/page found | run108-ui-registration/readback tests; new auth/Host/Origin/injected-defect suite absent |
| R22 | ProcessSupervisor.startVendor/waitForHealth/beginChildLifecycle/restart/stop called by backend vendor/sidecar owners | process-supervisor/test/index.test.ts6baseline; hung fetch source106-145 requires fault RED |
| R23 | sqlite-memory exported synchronous functions -> openSqliteDatabase/withSqliteBusyRetry -> DatabaseSync and graph hydration | sqlite-memory25files140tests incl atomic-observation and migration; async service/caller tests absent |
| SRC-027 | Same actual owner R23; sqlite-memory exported synchronous functions -> openSqliteDatabase/withSqliteBusyRetry -> DatabaseSync and graph hydration | sqlite-memory25files140tests incl atomic-observation and migration; async service/caller tests absent |
| R24 | SQLite busy5s plus blocking Atomics.wait100/200 per retry; backup/reset/restore current sync-handle assumptions | maintenance/migration tests source; off-thread design not selected, no nonblocking proof |
| SRC-028 | Same actual owner R24; SQLite busy5s plus blocking Atomics.wait100/200 per retry; backup/reset/restore current sync-handle assumptions | maintenance/migration tests source; off-thread design not selected, no nonblocking proof |
| R25 | protocol-routing routeRuntimeRequest -> core routeRequest1976 deterministic policy/eligibility/sort -> reason wire records | core194/protocol18/registry16baseline and empty endpoint2141; explicit Effect producer absent |
| SRC-029 | Same actual owner R25; protocol-routing routeRuntimeRequest -> core routeRequest1976 deterministic policy/eligibility/sort -> reason wire records | core194/protocol18/registry16baseline and empty endpoint2141; explicit Effect producer absent |
| R26 | Host index actual networkFetcher/provider readers/SSE drain + operations privateRetentionRequest1051; pure provider adapters retained | stream-commit/timeout/cancel tests selected46baseline; physical abort/fragmentation new tests needed |
| SRC-030 | Same actual owner R26; Host index actual networkFetcher/provider readers/SSE drain + operations privateRetentionRequest1051; pure provider adapters retained | stream-commit/timeout/cancel tests selected46baseline; physical abort/fragmentation new tests needed |
| R27 | CLI lifecycle -> startBridgeServer/createRuntimeBridgeBackend; detached bootstrap/reprobe/outbox and benchmark judge state | cli startup and supervisor tests source; closed scoped graph/inflight joins not established |
| SRC-031 | Same actual owner R27; CLI lifecycle -> startBridgeServer/createRuntimeBridgeBackend; detached bootstrap/reprobe/outbox and benchmark judge state | cli startup and supervisor tests source; closed scoped graph/inflight joins not established |
| R28 | Private sidecar -> ArtifactStore/EventLog/CaptureQueue durable-queue/retention; shared graph pure registry | artifact/event/capture tests current; source/controller checked ArtifactStore DELETE/FULL/FK and immutable authority |
| SRC-032 | Same actual owner R28; Private sidecar -> ArtifactStore/EventLog/CaptureQueue durable-queue/retention; shared graph pure registry | artifact/event/capture tests current; source/controller checked ArtifactStore DELETE/FULL/FK and immutable authority |
| R29 | Sidecar CaptureDrain interval7319 and close8601; EventLog append COMMIT179 -> prune190 -> rollback catch192 | capture24baseline; close-inflight and postcommit masking hypotheses source-only, tests not written |
| SRC-033 | Same actual owner R29; Sidecar CaptureDrain interval7319 and close8601; EventLog append COMMIT179 -> prune190 -> rollback catch192 | capture24baseline; close-inflight and postcommit masking hypotheses source-only, tests not written |
| R30 | Public queue-runtime worker claims persisted SQLite; private createQueuedEvaluationHandoff producer shares root; helper not production consumer | queue-store identity8/capture-eval24/cancel-drain baseline; two-host distinct-job cap unknown |
| SRC-034 | Same actual owner R30; Public queue-runtime worker claims persisted SQLite; private createQueuedEvaluationHandoff producer shares root; helper not production consumer | queue-store identity8/capture-eval24/cancel-drain baseline; two-host distinct-job cap unknown |
| R31 | Private DurableTrialRunner/replay provider receipt -> branch -> eval -> learner/profile; contribution independent aggregate consent | Private analyst identifies owners, detailed submission/revocation methods not fully read; inspect before slice; sandbox/score tests source anchors |
| SRC-035 | Same actual owner R31; Private DurableTrialRunner/replay provider receipt -> branch -> eval -> learner/profile; contribution independent aggregate consent | Private analyst identifies owners, detailed submission/revocation methods not fully read; inspect before slice; sandbox/score tests source anchors |
| R32 | Private operations node:http+store/extension process composition -> public private-operations authenticated adapter | Private analysis and paired source/build seals; closed private Layer graph absent, lifetime join hypotheses verified representative source |
| SRC-036 | Same actual owner R32; Private operations node:http+store/extension process composition -> public private-operations authenticated adapter | Private analysis and paired source/build seals; closed private Layer graph absent, lifetime join hypotheses verified representative source |
| R33 | Controller operation disposition ledger not yet product implementation; existing pure graph/scorer and current queues retained candidates | B0-B10 source owners identified; exact per-export coverage expands before each Phase2 slice, never constructor-only acceptance |
| SRC-037 | Same actual owner R33; Controller operation disposition ledger not yet product implementation; existing pure graph/scorer and current queues retained candidates | B0-B10 source owners identified; exact per-export coverage expands before each Phase2 slice, never constructor-only acceptance |
| SRC-038 | Same actual owner R33; Controller operation disposition ledger not yet product implementation; existing pure graph/scorer and current queues retained candidates | B0-B10 source owners identified; exact per-export coverage expands before each Phase2 slice, never constructor-only acceptance |
| R34 | Owner2026-10-24 approved E1-storage-authority-protocol named follow-on, no universal store rewrite current scope | owner-scope-decision.md rationale/revised run scope; current source graph/retention preserved |
| SRC-039 | Same actual owner R34; Owner2026-10-24 approved E1-storage-authority-protocol named follow-on, no universal store rewrite current scope | owner-scope-decision.md rationale/revised run scope; current source graph/retention preserved |
| R35 | Owner2026-10-24 approved E2-durable-live-inference-protocol named follow-on, no all-live admission/reconnect current scope | owner-scope-decision.md; current HTTP/SSE/capture/background semantics preserved |
| SRC-040 | Same actual owner R35; Owner2026-10-24 approved E2-durable-live-inference-protocol named follow-on, no all-live admission/reconnect current scope | owner-scope-decision.md; current HTTP/SSE/capture/background semantics preserved |
| R36 | GPT controller bounded read-only exact-model process workers; canonical shared-file ownership and review gates | Current run action/router records; future code/test independent reviews and integrated reruns mandatory |
| SRC-041 | Same actual owner R36; GPT controller bounded read-only exact-model process workers; canonical shared-file ownership and review gates | Current run action/router records; future code/test independent reviews and integrated reruns mandatory |
| SRC-042 | Same actual owner R36; GPT controller bounded read-only exact-model process workers; canonical shared-file ownership and review gates | Current run action/router records; future code/test independent reviews and integrated reruns mandatory |
| R37 | Public package-sea copies build/client, private build-runtime-distribution seals wrappers/13extensions/sidecar/adapter | release workflow57/source-seal1baseline; final candidate closure/rollback not built or tested |
| SRC-043 | Same actual owner R37; Public package-sea copies build/client, private build-runtime-distribution seals wrappers/13extensions/sidecar/adapter | release workflow57/source-seal1baseline; final candidate closure/rollback not built or tested |
| SRC-044 | Same actual owner R37; Public package-sea copies build/client, private build-runtime-distribution seals wrappers/13extensions/sidecar/adapter | release workflow57/source-seal1baseline; final candidate closure/rollback not built or tested |
| R38 | Controller E: package/session/temp roots under low C/D disk; no system cleanup, measured target budgets pending | 00-worktree acknowledged resource limits, baseline logs and free-disk observations; no pilot perf PASS |
| SRC-045 | Same actual owner R38; Controller E: package/session/temp roots under low C/D disk; no system cleanup, measured target budgets pending | 00-worktree acknowledged resource limits, baseline logs and free-disk observations; no pilot perf PASS |
| R39 | runtime:validate-ui/browser scripts exist, runtime:verify-client-journeys and runtime:compare-release absent | package.json source/README adapter checks; maintained candidate journey commands to implement |

## Relevant Code Pointers

Public: /role-model-router/packages/process-supervisor/src/index.ts, /role-model-router/packages/sqlite-memory/src/index.ts, /role-model-router/packages/core/src/router.ts, /role-model-router/apps/runtime-host-bridge/src/queue-runtime/workers.ts, /role-model-router/apps/runtime-ui/app/routes.ts. Private paths/limitations are in /.recursive/run/115-effect-foldkit-runtime-migration/evidence/other/as-is-private-analysis.md; no private raw schema copied here.

## Known Unknowns

Target4.0.6 API/browser/transitive proof unexecuted, complete per-method private service migration not yet catalogued beyond owned mechanisms; real provider auth/isolation/benchmark/hardware budgets require planned preflight. Source candidates not reproduced yet. Full integration/private/cloud/SEA/browser/live suites later; not gap-erasing N/A.

## Evidence

/.recursive/run/115-effect-foldkit-runtime-migration/evidence/other/as-is-public-analysis.md, /.recursive/run/115-effect-foldkit-runtime-migration/evidence/other/as-is-private-analysis.md, /.recursive/run/115-effect-foldkit-runtime-migration/evidence/other/as-is-client-analysis.md, paired baseline receipts/logs and current-paired-identities.json. Analyst route proof as-is-analyst-routes.json. Source anchors checked by controller above.

## Existing Verification and Limits

Setup locked with truthful partial baseline: workflows57, supervisor6, SQL140, UI752, core194, protocol18, registry16, host46; private source-seal1/queue8/capture-eval24. Prior captured logs/identities and independent baseline re-audit substantiate these counts. No baseline repeated by analysts. Full workspace/private/cloud/packaged/browser/actual DSH/pi provider release comparison not run. Source-only vendor tsconfig warnings and ambient pnpm11cached script issue recorded; direct unchanged wrapper builds separately passed. C low, E: dependency/session/temp storage verified.

## Gaps Found

None remaining in current AS-IS analysis acceptance after independent audit repair/recheck. Product implementation remains entirely unstarted; the following are observed current-system gaps to plan/test, not unresolved analysis omissions.

Actual cancellation must reach Promise I/O; scoped tasks/process startup/health/close need fault tests; SQL transaction/PRAGMA/current sync API isolation must survive. No existing global module diagnostics/reporter query/page closure proof, no browser Foldkit runtime graph, no parity harness, no real R/D/C proof. Private methods not fully read remain method-specific Phase2 inventory tasks, not an AS-IS invented absence.

## Risks

Paid retry/after-commit duplicate, changed scoring/input strictness, stale graph/private package mismatch, hidden UI command/query differences, lost data/state/privacy under lifecycle conversion, infinite observer/drain cleanup, opaque skip/pass in current tests. Exact-mode workers are source auditors, not a substitute for real client/package assertions. Effect/queue framework adoption does not itself guarantee durable-all-live or distributed admission.

## Audit Context

Audit Execution Mode: subagent
Subagent Availability: available
Subagent Capability Probe: three owned exact-model DSH workers for public/private/frontend, output captured; actual request model header proof is in `/.recursive/run/115-effect-foldkit-runtime-migration/evidence/other/team-model-routing/as-is-analyst-routes.json`.
Delegation Decision Basis: current-source analysis parallel by read-only domains, controller checks representative source; independent full audit and finite repair recheck02 completed; readiness PASS at reviewed35bb4c4a... input.
Audit Inputs Provided: locked paired requirements/worktree/owner decision, source proposal and explicit current-source bundles; exact diff baseline and no product changes.

## Effective Inputs Re-read

Locked00-requirements.md/00-worktree.md, owner-scope-decision.md, source-proposal.md, current analyst reports and baseline receipts.

## Earlier Phase Reconciliation

Requirements/worktree locks valid; no edit. E1/E2 named follow-ons approved; B0-B10+full frontend/current-data/live release parity remain. Preserved prior invalid prework is historical evidence only.

## Subagent Contribution Verification

Reviewed Action Records: `/.recursive/run/115-effect-foldkit-runtime-migration/subagents/as-is-independent-audit.md`, `/.recursive/run/115-effect-foldkit-runtime-migration/subagents/as-is-repair-recheck02.md`, `/.recursive/run/115-effect-foldkit-runtime-migration/subagents/as-is-public-analysis.md`, `/.recursive/run/115-effect-foldkit-runtime-migration/subagents/as-is-private-analysis.md`, `/.recursive/run/115-effect-foldkit-runtime-migration/subagents/as-is-client-analysis.md`.
Main-Agent Verification Performed: `/.recursive/run/115-effect-foldkit-runtime-migration/evidence/other/as-is-public-analysis.md`, `/.recursive/run/115-effect-foldkit-runtime-migration/evidence/other/as-is-private-analysis.md`, `/.recursive/run/115-effect-foldkit-runtime-migration/00-requirements.md` and `/role-model-router/packages/process-supervisor/src/index.ts`, `/role-model-router/packages/sqlite-memory/src/index.ts`, `/role-model-router/apps/runtime-host-bridge/src/queue-runtime/workers.ts`, `/.recursive/run/115-effect-foldkit-runtime-migration/evidence/other/as-is-client-analysis.md`; actual AST route census corrected report arithmetic.
Acceptance Decision: accepted
Refresh Handling: raw reports preserved; controller corrections documented above, final audit sees this stable artifact and source.
Repair Performed After Verification: controller actually read private runtime-operations-server.mjs7318/8601, extensions/event-log/index.mjs150-192 and extensions/artifact-store/index.mjs297-365 in named private worktree; these source hypotheses still need targeted fault tests, not reproduced failures. Corrected two parameterized routes and six learning paths plus actual private capture authority in `/.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md`; no source code modified.

## Worktree Diff Audit

Baseline type: local commit
Baseline reference: publicf0d50fab083e3fe8daf2474cd9fb08b51066c8e1/private16021cc5f87f60f2d01338a29adf0002da5e8327
Comparison reference: working-tree
Normalized baseline: exact respective commits from paired00-worktree.md
Normalized comparison: working-tree
Normalized diff command: git diff --name-only <respective commit>; git status --porcelain=v1 --untracked-files=all
Planned or claimed changed files: run115analysis/evidence docs only
Actual changed files reviewed: no tracked product diff; current run artifacts
Unexplained drift: none observed

## Traceability

- R1: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- SRC-001: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- R2: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- SRC-002: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- R3: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- SRC-003: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- R4: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- SRC-004: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- R5: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- SRC-005: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- SRC-006: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- R6: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- SRC-007: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- SRC-008: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- R7: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- SRC-009: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- R8: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- SRC-010: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- R9: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- SRC-011: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- R10: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- SRC-012: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- R11: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- SRC-013: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- R12: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- SRC-014: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- R13: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- R14: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- SRC-015: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- SRC-016: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- R15: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- SRC-017: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- R16: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- SRC-018: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- SRC-019: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- R17: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- SRC-020: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- SRC-021: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- R18: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- SRC-022: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- R19: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- SRC-023: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- R20: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- SRC-024: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- SRC-025: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- R21: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- SRC-026: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- R22: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- R23: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- SRC-027: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- R24: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- SRC-028: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- R25: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- SRC-029: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- R26: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- SRC-030: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- R27: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- SRC-031: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- R28: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- SRC-032: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- R29: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- SRC-033: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- R30: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- SRC-034: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- R31: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- SRC-035: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- R32: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- SRC-036: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- R33: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- SRC-037: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- SRC-038: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- R34: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- SRC-039: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- R35: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- SRC-040: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- R36: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- SRC-041: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- SRC-042: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- R37: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- SRC-043: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- SRC-044: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- R38: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- SRC-045: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.
- R39: source clause -> current owner evidence -> concrete Phase2 mapping; not product completion.

## Requirement Completion Status

Blocked below means product work unstarted at this analysis stage, not an external stop to Phase2.
- R1 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- SRC-001 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- R2 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- SRC-002 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- R3 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- SRC-003 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- R4 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- SRC-004 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- R5 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- SRC-005 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- SRC-006 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- R6 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- SRC-007 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- SRC-008 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- R7 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- SRC-009 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- R8 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- SRC-010 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- R9 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- SRC-011 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- R10 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- SRC-012 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- R11 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- SRC-013 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- R12 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- SRC-014 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- R13 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- R14 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- SRC-015 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- SRC-016 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- R15 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- SRC-017 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- R16 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- SRC-018 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- SRC-019 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- R17 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- SRC-020 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- SRC-021 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- R18 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- SRC-022 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- R19 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- SRC-023 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- R20 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- SRC-024 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- SRC-025 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- R21 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- SRC-026 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- R22 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- R23 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- SRC-027 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- R24 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- SRC-028 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- R25 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- SRC-029 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- R26 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- SRC-030 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- R27 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- SRC-031 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- R28 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- SRC-032 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- R29 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- SRC-033 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- R30 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- SRC-034 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- R31 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- SRC-035 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- R32 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- SRC-036 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- R33 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- SRC-037 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- SRC-038 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- R34 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- SRC-039 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- R35 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- SRC-040 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- R36 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- SRC-041 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- SRC-042 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- R37 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- SRC-043 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- SRC-044 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- R38 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- SRC-045 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md
- R39 | Status: blocked | Rationale: product implementation unstarted; source analysis only | Blocking Evidence: /.recursive/run/115-effect-foldkit-runtime-migration/01-as-is.md

## Prior Recursive Evidence Reviewed

`/.recursive/memory/skills/patterns/delegated-verification-and-refresh.md` reviewed for source/caller/evidence and stale-review limits.

/.recursive/run/115-effect-foldkit-runtime-migration/00-requirements.md and /.recursive/run/115-effect-foldkit-runtime-migration/00-worktree.md lock-valid. Existing Run101/108 code/tests and baseline receipts are historical/source evidence, not target runtime verification.

## Repair Work Performed

Controller corrected AST counts to2details/6learning and verified production private capture authority versus shim. No source changes. Bounded file reads preserve all clauses.

## Audit Verdict

Independent source audit initially FAIL, concrete owner/caller/test and universal evidence corrections independently rechecked PASS in `/.recursive/run/115-effect-foldkit-runtime-migration/evidence/review-bundles/as-is-repair-recheck02-result.md` at35bb4c4a...; controller verified exact route and source quotes. Only audit/gate metadata changed after review. Product unimplemented.

## Coverage Gate

- [x]39R and45subordinate clauses retained.
- [x]Current source and baseline limits recorded.
- [x]Independent ASIS audit/recheck complete.

Coverage: PASS

## Approval Gate

- [x]Controller checked source/reviewer evidence and invokes supported lock.

Approval: PASS

Audit: PASS
