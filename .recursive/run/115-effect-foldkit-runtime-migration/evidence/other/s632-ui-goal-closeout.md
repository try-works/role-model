# S632 - Foldkit UI functionality closeout (goal-fa3cfb36)

## Outcome
The owner-reported static UI is fixed and the whole route surface is verified: **936/936 UI tests green**, UI tsc 0, handler-presence mapping clean (matched_walker 0, wired_after_inventory 45, walkerOnly 0, unmatched 0).

## Route verification (all 50 routes)
- test/s623-route-verification-matrix.test.ts: real render per AppRoute tag, interactive/wiring scan via test/support/handler-presence.ts, createInit readback keys, behavioural family test per route, and a guard that fails if any route has controls but zero wired.
- evidence/logs/route-verification-matrix.md: full table (route | rendered | interactive | wired | dead | behavioural test | readback queries).

## /models family (owner report 1)
- Model selection drives the detail pane (no hardcoded cards[0]); role rows are aria-pressed toggles using the real rolePolicy readback; create-role form with host-valid enums (assistant|capability, allowed|limited|disabled) and exact body; benchmark page parity (suite-derived mode counts, judge from endpoint ids, Run gating requires judge + >=2 runnable subjects, Clear-all with confirmation state, scores/taxonomy/run-history/runnable tables).
- Remove flow replicates :3456 control-models.tsx: llama-swap / local-peer / endpoint / account-managed branches on the SELECTED endpoint, two-click Confirm, last-model account deletion, Make primary only for endpoints. Eject controller is DISABLED with a host reason (no eject contract exists) rather than sending a 400.
- Known gap (named + tested): role toggles for remote/account-managed models still use the local model-role route; account upsert path not built.

## Roles page (owner report 2)
Full port of :3456 control-roles.tsx: create form with advanced policy fields, role catalog with per-role Task detail expansion, per-task role toggles + Save task allowlists, seeded edit panel with Save/Reset; rolePolicy readback; exact POST /roles, PUT /roles/:id, PUT /tasks bodies.

## Benchmark page (owner report 3)
Benchmark parity slice: mode/judge/Run/Clear plus scores, taxonomy dimensions, run history and runnable-endpoint tables; raw full-suite evidence committed with an explicit provenance footer (SUITE_EXIT=0).
Honest gaps recorded: subject checkboxes + exact selection gating, per-model clear, judge preference persistence, active-run polling, taxonomy filter selects, p50/p95 dashes (summary carries no latencies), non-runnable endpoints not yet filtered.

## Learning + requests/observe families
- Learning: operator-token field on every route (feeds readbacks and commands with Bearer), Packs rollback/kill-switch/release with exact host bodies + refresh, all five Decisions filter selects wired.
- Requests/observe: time-range/breakdown/source/difficulty/Expand and Refresh buttons wired with explicit readback query params.

## Local/system dead-control batch (task-102)
All 15 controls on 7 routes wired and extracted into feature modules with a one-line families-view call site: ObserveLogs filter (activeSource threaded), LocalLogs (extracted, Checked + real 3s refresh subscription), LocalPeers (PUT typed array, GET health?url=, per-row actions), LocalPeerModels / LocalLlamaSwapModels (load endpoints incl. All roles body), SystemOperator (operator status Bearer + replay jobs), SystemExtensions (per-row Pause with extensionId; mutate + download).
- familyState plumbing added end-to-end (lead view.ts pass) and covered by integration tests (s631) that render the REAL familyPage/view path.
- CAVEAT: SystemOperator/SystemExtensions preserve readbacks, data sources and behaviour but compress the :3456 reference cards; a fuller visual-parity pass is a separate follow-up (recorded in task102-visual-parity-caveat.log and matrix rows 45-46).

## Verification + hygiene
- Full suite 936/936 (raw log s617-task102-final-full.log); s617 9/9; S247 click budget unchanged and green; S48a load-only timeout disposition recorded (budget unchanged).
- Stale structural tests updated to the new real pages without loosening intent (s389/s534/s540/s563/s565/s595/s623); s623 now asserts zero unwired controls.
- Packaging traceability fix (651ec210): SEA stamped with build id, manifest package_build_id, packaging fails if the exe predates the client bundle - proven by a changed exe sha on rebuild.
- Shared-task board reconciled (31 stale pending -> 28 completed, 2 superseded, 1 genuinely open task-53).

## Known follow-ups (not claimed)
Visual parity pass for the compressed local/system pages; the benchmark gaps listed above; remote/account model role binding; Requests listbox scanner gap (runtime-frame dependency).
