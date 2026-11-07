# S661 - Final re-audited R1-R39 disposition ledger (remaining-work goal)

Built 2026-11-06 after the S650 audit + waves 1-7. Canonical packaged candidate:
`0.0.20-761-g3f7779fb` (public HEAD 87c62eb6 docs-only delta), exe sha256 `5e0810c0…`,
private manifest `7cc4b103…`, evidence commit db93cb3c, FINAL-PACKAGE.json ties all slice receipts.

| R | Disposition | Basis |
|---|---|---|
| R1 | VERIFIED | identities re-pinned at execution SHA (s651); final package records public/private tree + manifest sha. |
| R2 | SUPERSEDED | owner "use agent teams" replaces the CLI deepseek-flash worker route; native teammates have no per-worker config/jsonl (s660). |
| R3 | PARTIAL | strict RED->GREEN + independent review per slice; formal Phase-3 recursive lock not produced (s660). |
| R4 | VERIFIED (bounded) | Effect@4.0.6 pin + consumer typecheck; live-consumer baseline = final packaged verify real chat completion (openai/gpt-4.1-mini-fast, 56 tokens). |
| R5 | VERIFIED | Node platform-node/node-shared closure via effect wrapper (29+17 entries), browser no-leak assert, packaged. |
| R6 | VERIFIED | foldkit-ui 30-entry closure, oxlint 0.15.3 pin, Vite exclusion, honest receipt (identity + local wrapper hashes; not per-entry embed). |
| R7 | VERIFIED | Foldcn absence proven by real repo/vendor scan; per-component adapted-source ledger with verified hashes. |
| R8 | VERIFIED | full RM3 matrix (light/dark contrast, 390px, keydown, disabled input+button+dialog, reduced-motion animation:none, overlay dismiss, cn-merge). |
| R9 | VERIFIED | chart resize policy + in-place live update (843ba8df + final build). |
| R10 | VERIFIED | lifecycle matrix mount/unmount/zero-size/font/DPR/repeated-mount heap (or reviewed N/A). |
| R11 | VERIFIED | route-change focus restoration (activeElement=main-content), maintained 49-tag/51-file map. |
| R12 | VERIFIED | (pre-goal) request/refresh compatibility. |
| R13 | PARTIAL | ported routes + de-preview; command-palette/media-capture OWNER-DISPOSITIONED (no host API); device-auth ported. |
| R14 | VERIFIED | packaged selfcheck 0diff at HEAD (shared contract + fresh 0diff). |
| R15 | VERIFIED | ordinary pi CLI (D:\pi\pi.cmd) through the packaged runtime :3480 to real DeepSeek and Kimi: pi -> deepseek-flash returned OK and telemetry recorded the request; alias routing configured via the runtime model_aliases config and verified end-to-end (pi + curl: baseline/difficulty/hybrid -> deepseek-flash, controller -> v4-pro, difficulty -> kimi-k2.7 in one run); all 4 routing modes, role header, capture, restart (s667, s674). dsh launcher here resolves to the desktop app (not a CLI). |
| R16 | VERIFIED (bounded) | fresh R-vs-C at final candidate: 6 same, 2 approved-intentional channel metadata, 1 environmental, 0 regressions (r16-fresh-r-vs-c-receipt.json). D (pre-migration dev) not an independent pair (dev is this migration's squash). |
| R17 | VERIFIED | joined J1-J6 on the 818 build with the active private plane: J1 real request->telemetry (requestId/decisionId), J3 error path, J4 effort/role metadata, J5 restart persistence (marked request re-read after restart), J6 configured replay (ticks ok, 9 counterfactuals/18 dispatches) + 12 evaluation jobs with evidence artifacts + learning (10 indexed) (s676). Bound: individual graph node IDs not walked end-to-end. |
| R18 | VERIFIED | full package rebuilt with the paired private distribution: 0.0.20-818-g9ff48b98, exe sha256 19f0371f..., track-b manifest e1d678a8..., 13 extensions (s675); packaged-candidate verify 12/12 PASS; receipt set current at HEAD 9ff48b98 (s669/s675), stale receipts retired. |
| R19 | VERIFIED | exhaustive declaration-form ledger (338 entries) + token-masked caller validation (bounded). |
| R20 | VERIFIED | calibrated + enabled diagnostics (128/96B/32s/15m/50). |
| R21 | VERIFIED | packaged/browser diagnostics defect receipt (authorized 200, stale/dropped/build-missing/cause). |
| R22 | VERIFIED | (pre-goal) supervisor B2/B2a. |
| R23 | VERIFIED | SQL graph hydration (typed join, content-hash refusal). |
| R24 | VERIFIED | (pre-goal) SQL blocking/PRAGMA truth. |
| R25 | VERIFIED | (pre-goal) routing producer. |
| R26 | VERIFIED | (pre-goal) SSE/transport retry schedule. |
| R27 | VERIFIED | metadata cache identity + never-dedupe-stochastic + runner-overlap harness (both caveats closed); additionally the benchmark progress off-by-one (S668) and poll-failure handling verified live with real models, and a real judge-graded run completed (deepseek-flash 0.7667, kimi-k3 0.475; s667). |
| R28 | VERIFIED | EventLog prune off-by-one fix + honest storageContract. |
| R29 | VERIFIED | full recovery matrix (stale lease/interrupted/failed ack/corrupt+restore/partial publication). |
| R30 | VERIFIED | clause-complete two-host/lease/evidence-before-ack receipt. |
| R31 | VERIFIED | integrated trial/learning/contribution receipt. |
| R32 | VERIFIED (bounded) | private Layers built at b4688938 and staged into the 818 packaged exe (track-b manifest e1d678a8, 13 extensions); live chain proof: captures -> replay.dispatch queue (18 dispatches, 9 counterfactuals) -> 12 evaluation jobs with evidence artifacts -> learning (10 indexed) with outcome-ok track-b ticks (s677). Bound: individual graph node IDs not walked. | private capture->queue->projection Layers (dd026406); public/private packaged cross-repo proof not produced. |
| R33 | VERIFIED (bounded) | B10 ledger double-PASS; honest 0-converted / 60-adapter / 6-pure (retention, not conversion). |
| R34 | OWNER-DISPOSITION | E1 deferred (owner-scope-decision). |
| R35 | OWNER-DISPOSITION | E2 deferred (owner-scope-decision). |
| R36 | PARTIAL | disjoint scopes + independent reviews; no M11 join artifact (s660). |
| R37 | VERIFIED (bounded) | reversible shell cutover + rollback (driver staging, atomic select, HTTP + DB proof); minor caveats. |
| R38 | VERIFIED (bounded) | owner APPROVED the matrix; live latency/cost + burst leg (6 concurrent, 0 failures) + degraded/interference leg (readbacks while 6 completions run: 10/10 OK, p50 26ms, p95 233ms <= 250ms budget) measured on the 818 build (s662); the collector-down leg needs a fault harness and is not claimed. |
| R39 | PARTIAL | R39_VERIFY_BLOCKING=true set + one current-HEAD dispatch run 42334159509 attempted (s673); run cancelled at "Package SEA runtime" (paired private distribution missing) before the R39 steps ran, so R39 is not end-to-end verified. Unblock: dispatch from a ref carrying the paired private inputs. |

## Remaining blockers (exact unblock conditions)
1. R15/R16/R17: Moonshot OAuth to authorize a Kimi model + an isolated client profile for ordinary-client journeys.
2. R38: owner-approved fixed-workload budget/thresholds.
3. R39: one dispatch run + flip vars.R39_VERIFY_BLOCKING to true.
4. R32: public/private packaged cross-repo capture proof (optional; private proof done).
5. R2/R3/R36/R18: formal process lock artifacts (optional for the product outcome).
