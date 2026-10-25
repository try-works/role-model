# Executable slices for Phase2 review

DRAFT plan input only; no Phase3 implementation until02-to-be-plan locked. Paths P under role-model-router; I private repo. Controller owns shared root/lockfile/CI and monolith integration; workers get one named bounded operation at a time.

## S0 Controller/source safety

Requirements: R1,R2,R3,R18,R34,R35,R36,R38.
Owned surface: Run docs, package.json and CI by controller only.
Test-first behavior: Locked source pair/owner deferral/exact-model route; current stage gates and E:storage; no product scope waiver.

## S1 Parity and actual-client evidence foundation

Requirements: R14,R39.
Owned surface: packages/ui-parity, scripts/runtime-parity.mjs, scripts/verify-client-journeys.mjs, scripts/compare-release.mjs; root scripts single writer.
Test-first behavior: RED request method/query/body/multiplicity/causal write and image/state comparator; GREEN exact selfcheck and mutation negatives. React baseline and isolated R/D real-client preflight before M1 acceptance; fail-closed target/NOT RUN commands.

## S2 Paired4.0.6 acquisition

Requirements: R4.
Owned surface: scripts/vendor-upstream.mjs, vendor/effect, paired effect/SQL wrapper manifests and approved lock diff.
Test-first behavior: RED exact paired tag/commit/version guard; untouched upstream sync under reviewed characterisation exception; verify both digests/default pins, direct build/type/import and current consumer suites; no code rewrites hidden.

## S3 Browser/Node/Foldkit closed graphs

Requirements: R5,R6.
Owned surface: packages/effect/entries.mjs/build.mjs plus new platform-browser/platform-node/node-shared/foldkit/foldkit-ui; vendor/foldkit.
Test-first behavior: RED required export/subpath, case identity, no duplicate Effect/browser Node builtin graph; declarations and actual tsc. Own exact Foldkit source payload; parse5 approved locked dependency closure. Node supervisor and browser graphs independent; exclude Vite plugin.

## S4 Minimal bounded diagnostics

Requirements: R19,R20,R21.
Owned surface: host src/diagnostics contracts/service/reporter/query; private named operation reporting edge.
Test-first behavior: RED Cause original/nested/mixed/interrupt/finalizer and serializer/overflow/outage; same-device peer/trust/credential/Host/Origin negatives. Effect service small sink and typed DTO; no business telemetry contamination; private instrumentation disjoint.

## S5 Process/owned sidecar leaf

Requirements: R22.
Owned surface: packages/process-supervisor/src/index.ts/new service module; named track-b-runtime child adapter.
Test-first behavior: RED hung-health signal deadline, stop-during-start/restart, partial acquire/invalid endpoint, child/grandchild cleanup and bounded Windows/SEA process exit. Keep class facade/env/cwd/log/taskkill semantics.

## S6 Async SQL owner with sync facade

Requirements: R23,R24.
Owned surface: packages/sqlite-memory/src/async-service.ts/index.ts and named host callers.
Test-first behavior: RED open/PRAGMA handle cleanup,3attempt100/200ms wait, permanent fail no retry, same-connection SQL rollback/commit/close, graph hydration and maintenance drain. Effect sleeps do not make DatabaseSync nonblocking; preserve per-store PRAGMA.

## S7 Deterministic Effect route producer

Requirements: R25.
Owned surface: core router/reason-codes/new routing-effect.ts, protocol-routing and registry explicit callers.
Test-first behavior: RED decision equality/empty pool/tie/arm effort/code-detail golden; add named Effect producer with tested sync boundary then actual consumers; no new strict input rejection or policy change.

## S8 Cancellable provider/private HTTP+SSE

Requirements: R26. Client R12/SRC-014 exclusively S14a.
Owned surface: host extracted execution/provider-attempt.ts/provider-stream.ts/private-client.ts, shared index single writer.
Test-first behavior: RED physical signal->fetch/reader/private work and late finalization fence; fragmentation/drain/close/first-substantive/finish/error. Preserve250/1000/2500/5000ms connection versus aggregate timeout policy, no paid retry after commit; token buffer lossless.

## S9 Private storage/capture lifetime

Requirements: R28,R29.
Owned surface: private shared/runtime/storage-layers.mjs/capture-drain.mjs, sidecar named delegate and EventLog postcommit guard.
Test-first behavior: RED close during5item/5sec singleflight/caller-priority drain/no closed store access, partial acquire and postcommit failure not masked. Retain raw local capture privacy/leases/artifact graph authority, no schema/consolidation or fictional multi-DB atomicity.

## S10 Background and learning attempt owners

Requirements: R30,R31.
Owned surface: public queue-runtime handlers; private active replay/trial/learner/contribution callers, one owner each.
Test-first behavior: RED real timed-out Promise interruption and lease fence/evidence-before-ack; actual two-host distinct-job topology. Preserve PersistedQueue SQLite deviation/public consumer, receipt no-redispatch/score output reuse/sandbox/holdout/floor/profile fsync and aggregate consent/revocation.

## S11 Closed public/private composition

Requirements: R27,R32,R33.
Owned surface: public CLI/index/track-b-runtime/benchmark owner modules; private operations application/live-layer delegate.
Test-first behavior: RED partial startup/repeated shutdown/no late timer/provider/DB, early readiness and isolated judge progress/throttle. Shared leaf Layer identity/closed DAG, bounded permits/waiters/cache config, no stochastic dedup; per-operation disposition not monolith exemption.

## S12 RM3 Foldkit primitive facade

Requirements: R7,R8.
Owned surface: selected vendor/creaseui source, optional justified foldcn; packages/ui Foldkit modules beside old React.
Test-first behavior: RED typed variants/typeahead/keyboard/focus/RTL/escape/mobile semantic invariants; target source/dependency/license/a11y proof. One owner primitive, preserve tokens/Geist/cn and separate adaptation source, no full donor theme.

## S13 Time-series/ranking chart pilot

Requirements: R9,R10.
Owned surface: new Foldkit chart adapter/lifecycle, existing domain adapters retained.
Test-first behavior: RED real series/axes/buckets/units/format/state/legend/tooltip/HTML alternatives; actual font/canvas resize/theme/range/unmount/multiple IDs and heap budget. Crease SVG/ECharts React-free, bounded approved pixel regions separate exact semantics.

## S14 Shell and route-family vertical slices

Requirements: R11,R13.
Owned surface: runtime-ui-next sibling bootstrap/root/routing/commands/submodels; selected ui facade; route index serialized.
Test-first behavior: RED shell/nav/title/theme/history/53canonical20redirects2details6learning instance-cancel; pilot observe/routing then independent read/control write/heavy learning/studio slices. All states/themes/mobile/a11y/request contracts per family, not pilot-only.

## S14a Client API and refresh

Requirements: R12/SRC-014.
Owned surface: existing runtime-ui/app/lib/runtime-api.ts and new runtime-ui-next/src/api/client.ts,refresh.ts; src/api/client.test.ts and refresh.scene.test.ts.
Test-first behavior: injectable EventSource/Command/Subscription preserves exact request/fallback, close once, one callback, no stale-route update or duplicate listener, explicit gap/snapshot resync; owner separate from backend S8, common API single-writer.

## S15 Diagnostics frontend

Requirements: R21.
Owned surface: Foldkit Observe diagnostics route/model/sidebar/query adapter.
Test-first behavior: RED authorized real injected defect readback, denied/stale/drop/no-data/build metadata and accessible responsive view; existing observability/degradation routes retained.

## S16 Paired package/real-client/final rollback

Requirements: R15,R16,R17,R18,R37,R38,R39.
Owned surface: host package-sea/scripts verifier and private build-distribution/stamp/reader closure.
Test-first behavior: Exact artifact first, independent review then real J1/J2/J5+affected J3/J4/J6 DSH/pi across R/D/C -> provider/decision/telemetry/API/DOM/graph/persisted restart. No mocks; source/volatile deltas classified. Full planned CI/OS/private/package/browser. Reversible matched-state rollback one release; retain live harness, no auto-main promotion.

## Dependency edges

S0->S1Reactbaseline->S2->(S3wrapper,S4diagnostics); S3Node+S4->S5; S4->S6/S7/S9; S7+S4->S8; S8+S9->S10; S5/S6/S7/S8/S9/S10 interfaces->S11. Client S3browser+S1->S12->S13pilot->S14shell/routes; S4API+S14shell->S15. Both tracks join S16. Physical build precedes its final verifier/review; intermediate source/test slices may develop while M0a/M1 acceptance gate waits. Each vertical slice promotes tests and independent review before acceptance, not a waterfall deferral.

## Commands

Public Node test tools use actual package cwd: node ../../../node_modules/vitest/vitest.mjs run <named test>. Private node --test --test-concurrency=1 <named tests>. Pin tests use current builder APIs and fixture manifests, no missing-module setup as behavioral RED. Node build.mjs wrappers directly. Vendor sync --tag/--commit exact checked pin, followed verify; TMP/TEMP E:/role-model-run115/test-temp. Controller approved lock changes via pinned corepack pnpm10.6.5 lockfile-only/ignore-scripts (no auto peer install), inspect diff then frozen setup explicit external stores. Full root scripts need PATH pin verified against ambient pnpm11.

## Real verification

J1stream/J2tools/J3cancel/error/J4effort/J5restart/J6configuredlearning as full source§6.9. Stage R unchanged v0.0.20 bytes, DcleanReact, Cpairedcandidate on distinct unused loopback ports/roots; supported launch overrides required. Separate authorized client profile, active alias/provider proof, real approved provider cost/time cap. No credentials extraction/controller repointing/operator3456/3457/3458. Missing prerequisite NOT RUN gate open. Compare exact schemas/IDs/graph/values, not stochastic text/timing. Actual network/DOM/numeric and consistent read-only persistence after restart.

## Budget proposal (review before pilot)

Matched workload/node/browser/hardware baseline, report raw/gzip/chunks/first-paint/firstchart/update/heap and backend latency/eventloop/close tail under quiet/burst/failure. Proposed relative acceptance: no unapproved>20percent p95 latency regression or>20percent retained heap after20mount cycles; hard resource leaks/late writes fail irrespective percent. Absolute thresholds calibrated and reviewer-approved from actual prechange measurements before enablement, not asserted observed. Chart screenshot approvals scoped by region/data with reviewer; non-chart zero perceptual difference per source.

## Finite audit corrections (effective)

02-to-be-plan.md Finite Plan Audit Repairs names exact new maintained tests and supersedes broad directory-only tests above. S14a owns client runtime-api/refresh/injectable EventSource; S8 only backend transport. S0 wires explicit runtime verification scripts/CI by tests. S2 includes scripts/vendor-upstream.test.mjs. S6 retains5,000ms DB busy_timeout (not new5s outer request timeout) and tests error/cancel cleanup. S11 operation ledgers and anti_slop_lint exact-file evidence required, S16 perf/journey target guards. Sibling runtime-ui-next rationale in02plan. Existing React/domain tests regression only, not new renderer or actual client acceptance.
