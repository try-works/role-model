# S612 - goal-7fbb43f6 closeout: remaining run-115 work + routing proofs at final HEAD (2026-11-01)

## Artifact under test
0.0.20-478-g2d4fa10b (sha bfa365e188ba01fa9d8962e13fd7692a1ef9b0148d5e816104c154fdefe4d1a3, commit 2d4fa10b), rebuilt at final HEAD after all slices.

## (1) Routing verified end-to-end in the packaged build - ALL PASS, raw logs committed
- routing-e2e-2d4fa10b.log: PASS 10/10 (mock upstream; version pin refused mismatches; decision 0->1, telemetry 0->1, ledger + decisions populated).
- routing-live-deepseek-2d4fa10b.log: PASS 4/4 - REAL DeepSeek completion through the production credentials copied to an isolated state (200, usage 51, finish stop); credential bytes never read/echoed; log scanned clean.
- routing-alias-replay-learning-2d4fa10b.log: PASS 4/4 - real alias baseline.remote-only (declared in applied config + served); taxonomy-scoped task (role_model.intent, researcher / researcher.web_research) -> real completion (usage 230, digital-strategy.ec.europa.eu content); decision row deepseek remote effort=max; HONEST findings: replay NOT auto-queued (explicit operator action; capture-evidence status=ok + trace complete/ready), learning ladder state=no_ladder admitted 0/4 (no pack yet - readback names the state).
- Product finding recorded: effort=max reasoning arm can consume the whole token budget on long research prompts (truncation retry in harness).

## (2) R27 follow-up - DAG nodes own resources
Server acquired INSIDE the DAG server node (CLI factory), closed via the DAG scope (single shutdown initiator, no re-entry), memoized closeR27Dag on SIGINT/SIGTERM, wrapped acquisition with cleanup-on-failure; host leaf is the sole readiness marker. s598 6/6, s593 4/4, s324 7/7; re-review PASS. Remaining: backend/bootstrap/refresh/drains/benchmarks keep default record releases (generic factory API in place).

## (3) Backend slices - all reviewed PASS
- R20: recordEscape edge classification + Fail/Die/Interrupt preservation + client-caused 4xx separation; limits gate OFF pending approval (s610, 18/18+).
- R23: transaction-owned cleanup handles closed idempotently after hydration drain (s610-r23 + s341, 9/9).
- R30: durable evidence-before-ack fence with leases/kill/idempotent completed-replay + Schema-decoded evidence (s594 8/8; queue suites 39/1 skipped; re-review PASS).
- R32: eight per-build private-domain Layers (no shared map), release-all close with AggregateError (s602 6/6; re-review PASS).
- Regression cascade closed: vendor-corpus observed-data determinism fix (890a3321, review PASS); ownership-guard/readiness contract retargets (ff1b89f5, 2e4aca6b, 43e1e57a); admission spill reassembly in the public reader (7856dc1e, re-review PASS).
- FINAL full host suite at 890a3321: 2828 passed / 5 skipped / 0 failed. UI suite 833/833 (plus s611 R13: 63/63 targeted).

## (4) UI rows
- R13: Model pool card now states honestly when no benchmark profile is reported (s611 RED-GREEN).
- R14: packaged-parity-lane.mjs committed (6688b709): deterministic double-run PARITY 10/10 both runs; both-artifact compare-release 6 same/2 additive/1 env/0 different; React selfcheck route proven ABSENT (460 files scanned) - recorded, not invented. REMAINING (recorded follow-up, not part of the lane slice): mutation sensitivity across every wave + rendered React-vs-Foldkit pixel/ARIA comparison via the browser-capture lane.

## (5) Evidence hygiene
s589/s584 green logs committed; raw gate records gates-471.md + gates-478 capture; s593-green.log test-count note annotated.

## Gates at final HEAD (478)
validate-packaging PASS (chain exit 0), verify PASS (healthy 0.0.20-478-g2d4fa10b), audit-rendered-ui 20/20, dialog a11y PASS, compare-release vs preserved 0.0.20 = 6 same / 2 additive-shape / 1 environment-state / 0 different.

## Excluded (recorded, unchanged)
Owner-gated: R15 live provider (now owner-directed and proven for DeepSeek), R16 seeding approval, R39-live CI dispatch/toggle, stage/prod Run88 identity, visual-delta sign-off. E1/E2 deferred. R28 prune semantics + R20 limit enablement need approval. R9/R10 ECharts decision open. R14 rendered-wave comparison recorded as follow-up.
