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
| R15 | NOT-RUN | needs isolated ordinary DSH/pi client + real provider (DeepSeek + Kimi via Moonshot OAuth). |
| R16 | VERIFIED (bounded) | fresh R-vs-C at final candidate: 6 same, 2 approved-intentional channel metadata, 1 environmental, 0 regressions (r16-fresh-r-vs-c-receipt.json). D (pre-migration dev) not an independent pair (dev is this migration's squash). |
| R17 | PARTIAL | J3/J4/J6 mock; joined J1-J6 real journeys need the isolated client + real provider. |
| R18 | PARTIAL | per-slice receipts exist; final current-SHA receipt set partially consolidated in FINAL-PACKAGE.json. |
| R19 | VERIFIED | exhaustive declaration-form ledger (338 entries) + token-masked caller validation (bounded). |
| R20 | VERIFIED | calibrated + enabled diagnostics (128/96B/32s/15m/50). |
| R21 | VERIFIED | packaged/browser diagnostics defect receipt (authorized 200, stale/dropped/build-missing/cause). |
| R22 | VERIFIED | (pre-goal) supervisor B2/B2a. |
| R23 | VERIFIED | SQL graph hydration (typed join, content-hash refusal). |
| R24 | VERIFIED | (pre-goal) SQL blocking/PRAGMA truth. |
| R25 | VERIFIED | (pre-goal) routing producer. |
| R26 | VERIFIED | (pre-goal) SSE/transport retry schedule. |
| R27 | VERIFIED | metadata cache identity + never-dedupe-stochastic + runner-overlap harness (both caveats closed). |
| R28 | VERIFIED | EventLog prune off-by-one fix + honest storageContract. |
| R29 | VERIFIED | full recovery matrix (stale lease/interrupted/failed ack/corrupt+restore/partial publication). |
| R30 | VERIFIED | clause-complete two-host/lease/evidence-before-ack receipt. |
| R31 | VERIFIED | integrated trial/learning/contribution receipt. |
| R32 | PARTIAL | private capture->queue->projection Layers (dd026406); public/private packaged cross-repo proof not produced. |
| R33 | VERIFIED (bounded) | B10 ledger double-PASS; honest 0-converted / 60-adapter / 6-pure (retention, not conversion). |
| R34 | OWNER-DISPOSITION | E1 deferred (owner-scope-decision). |
| R35 | OWNER-DISPOSITION | E2 deferred (owner-scope-decision). |
| R36 | PARTIAL | disjoint scopes + independent reviews; no M11 join artifact (s660). |
| R37 | VERIFIED (bounded) | reversible shell cutover + rollback (driver staging, atomic select, HTTP + DB proof); minor caveats. |
| R38 | PARTIAL | identity fixed + thresholds drafted (s662); full measurement + approval pending owner. |
| R39 | PARTIAL | maintained scripts + CI advisory; blocking toggle not flipped (needs a dispatch run). |

## Remaining blockers (exact unblock conditions)
1. R15/R16/R17: Moonshot OAuth to authorize a Kimi model + an isolated client profile for ordinary-client journeys.
2. R38: owner-approved fixed-workload budget/thresholds.
3. R39: one dispatch run + flip vars.R39_VERIFY_BLOCKING to true.
4. R32: public/private packaged cross-repo capture proof (optional; private proof done).
5. R2/R3/R36/R18: formal process lock artifacts (optional for the product outcome).
