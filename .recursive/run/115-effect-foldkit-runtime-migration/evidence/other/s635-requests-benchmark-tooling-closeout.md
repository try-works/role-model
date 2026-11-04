# S635 - Requests chart parity, routing-posture fix, benchmark gating, tooling merge (goal-8bb139ac)

## Final artifact
0.0.20-636-gc8fdb768 (HEAD c8fdb768), sha256 60d0c999cc4c3e9a3ba0ffd49499664c5094ead60f9deb4e9627c54eee214fb1 - CHANGED vs the previous build. verify-packaged-candidate PASS. Health 200, healthy. UI suite 111 files / 982 tests PASS. Live on 127.0.0.1:3480.

## 1. Requests analytics charts (owner: requests page had 1 chart, reference has 9)
- 252c851d: features/observe/requests-charts.ts ports all nine :3456 buildObserveRequestsChartDefinitions charts (Request volume over time, Taxonomy demand by group, Task success vs failure, Token usage over time, Cache efficiency trend, Effective cost over time, Latency trend, Capability leaders, Ranked comparison) with reference metrics/breakdowns/ranking/empties; shared telemetry-chart-suite.ts backs both suites; batch LoadRequestsCharts POSTs /api/role-model/telemetry/query on entry/navigation/range/filter/ranking changes with last-write tokens; old single volume card removed.
- 2b97493a + e24858c3: the review HOLD on the TDD receipt was repaired with a GENUINE behavioral RED (pre-wiring tree, requests-charts module present, 2 failed / 2 passed with real assertions) and a clean-worktree full suite (108 files / 976 tests, s48a excluded for the detached-worktree dist artifact and verified standalone).
- Live: /requests 9 chart cards, 9 sr-only tables, 0 visible chart tables.

## 2. Routing strategy null-on-save (owner-reported)
- bac87257 + 68a15a78: ReadbackLoaded(routerConfig) hydrates routerPosture (mode/scoringStrategy/executionMode/pinWeights/weights) with baseline/balanced/decision_only fallbacks; save keeps a defensive fallback.
- Captured live untouched save body: {"execution_mode":"decision_only","routing":{"mode":"baseline","pin_weights":false,"scoring_strategy":"balanced"}} - accepted by the host, page reports saved. No null.
- s635 tests: untouched POST for baseline and non-default hybrid/cost/decision_only.

## 3. Benchmark page non-functional (owner-reported: Run not clickable)
- c5abd426: removed the wrong !selected.has(judge) gate (reference control-benchmark.tsx:527-532 requires gradedEndpointCount>=2, judge non-empty and runnable, !running); added the reference judge-overlap warning wording. s622 12/12 with exact bodies.
- c8fdb768 + 9eda077f: benchmark route now loads modelEndpoints (init scheduling + readPlanForRoute invalidation), so the page has rows.
- Live: 6 endpoint rows, "6 of 6 selected", Run ENABLED, judge review.judge...; expected POST body captured for the 2-subject + external-judge case; overlap warning verified when judge is a subject.

## 4. Workloads / Agent strategy duplicate placeholder sections (owner: unclear, looked identical)
- c42f90c7: removed the static density supplements (workloadsSupplement/agentSupplement) that appended duplicated Posture diagnostics/Entries with hardcoded placeholder copy; both pages now render only their real readback-driven editors; audited SystemPeers/LocalLlamaSwapModels/SessionReadiness (no-op/real). s636 3/3, full suite 980.
- Live: exactly one Posture diagnostics + one Entries per page, no placeholder markers.

## 5. Agent quality gates / Effect-Foldkit tooling merge (owner: merge it when done)
- integration/aqg-tooling @89e40b6b: all 8 tooling commits (vendor pin proofs, workspace build policy, typecheck gate + coverage ratchet, exact-pinned oxlint + @effect/tsgo semantic gate, Foldkit skill + provenance + devtools MCP) cherry-picked onto our line with reconciliations; merged as ba253943 (0 conflicts).
- Verified on the merged tree here: app tsc 0; full UI 110 files / 980 tests; workspace typecheck 82/82 tasks; node gates vendor-upstream 6/6, vendor-verify 1/1, crease 6/6, foldkit 6/6, agent-tooling 13/13, oxlint-policy 4/4; lint:oxlint 0 warnings/0 errors; test:release-workflows 112/112.
- b6048bee: reconciled scripts/quality/oxlint-baseline.json reportOnly counts with this tree (111 pre-existing out-of-scope findings recorded append-only; enforced scope stays 0) - the designed ratchet, not a bypass.
- 18948f6c: fixed a stale browser-parity assertion in scripts/runtime-parity.test.mjs to accept both honest NOT_RUN reasons (react-capture-runner-unavailable / no-browser-available).
- NOT VERIFIED (honest): Linux oxlint native wrapper, network install oracle, live browser parity captures.

## 6. Reproducible review seeding
- Telemetry: scripts/runtime/seed-review-telemetry.mjs (320 records, 48 observations).
- Benchmark registry: scripts/runtime/seed-review-benchmark-endpoints.mjs creates 3 provider accounts + 3 endpoints through the host API and FAILS unless GET /api/role-model/endpoints returns >=3 healthy benchmarkEligible review endpoints (judge distinct). Root cause found: endpoints are host-registry state, not SQLite telemetry, and a runtime-config save can reconcile fixture endpoints away - so seeding must run after launch and be verified against the live GET.
- Live after seeding: 6 endpoints (3 review), benchmark Run enabled.

## Evidence
- evidence/review-0.0.20-636-gc8fdb768/ (healthz identity, endpoints/suite JSON, per-route DOM JSON, version-named PNGs, verification summary) at tip 1dbba6c5.
- s633/s634/s635/s636 logs, clean-worktree suite logs, and the tooling integration report.

## Remaining honest gaps
- Reference taxonomy/strategy routing filters have no UI state in this port (left absent, recorded).
- SystemOperator/SystemExtensions remain structural-only visual parity (enumerated caveat from the prior goal).
- The tooling gates' Linux/network/browser-dependent checks above are unverified locally.
