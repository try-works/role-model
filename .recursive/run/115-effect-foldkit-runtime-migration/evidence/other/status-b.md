# Run115 status audit — Area B: Foldkit UI port and Workspace architecture

Read-only audit. Snapshot taken 2026-10-30. Public worktree `D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration`; private worktree `D:/DEV/role-model-internal/.worktrees/115-effect-foldkit-runtime-migration`.

## Snapshot and dirty-tree distinction

- Public HEAD: `c6e7d0c0` (`feat(ui): deepen system and local pages to reference density`). Private HEAD: `a6510c63`.
- Committed at public HEAD: Model grouping, named `RouteViewContext`/49-key registry, control route modules, update partition, decomposition cleanup, root overview, observe/router/control families, learning/models/providers/studio/system/local parity port, S540 density module/test/logs, and the S542 review file.
- **Uncommitted working-tree changes (not at HEAD):** `src/view.ts` (71B8A04A, S540+S541 wiring), `src/families-view.ts` (EBBB8C06, studio labels), `src/features/learning/routes.ts` (283FB972), `src/features/models/routes.ts` (5BFC7F1F), and untracked `test/s541-density.test.ts` (016F10DE). S541 logs/task are untracked. `scripts/runtime/audit-rendered-ui.mjs` is modified and `scripts/runtime/studio-audit-evidence.mjs` untracked (S286 audit tooling, outside the frozen S540/S541 list).
- **Important:** the committed `s540` test/module and committed `s542` review are not self-contained at HEAD. HEAD `view.ts` (`9F205A3D`) has **zero** density imports/supplement calls; the S540/S541 view wiring exists only in the dirty tree. A clean HEAD checkout would fail the committed S540 test. The dirty tree passes `s540` 11/11.

## Per-requirement status

| Requirement | State | Evidence | Gap |
|---|---|---|---|
| W1a: shared `RuntimeHttpClient` (base URL/token/signal/JSON decode/typed error) | Committed at `04fd6824`; bounded W1a only | `src/http/runtime-client.ts`; `commands.ts` localPolicy uses it; S488/S490 review PASS | Only localPolicy migrated; other clients remain independent; no single application-lifetime client-service owner; baseUrl remains application-configured per call site |
| W1b: real Foldkit Listbox | Committed (`705bb44f` metric, `28f4eaae` target) | `src/ui/listbox.ts`; real `@role-model-router/foldkit-ui/listbox`; S491 2/2, S495/S498 PASS; typeahead/arrow/Escape/focus selection tests | Only two ranking selects migrated; provider/device-auth native selects remain; no general RM3 facade |
| W1b: real Foldkit Dialog/device-auth modal | Committed (`36d19496`, a11y audit `9e12d584`) | `src/ui/dialog.ts`; real `@role-model-router/foldkit-ui/dialog`; S499 scene; S502 Chrome/CDP audit final5 PASS (aria-modal, initial focus, Tab trap, Escape, focus return) | Device-auth only; one dialog; no general Dialog/Listbox component facade or native text-editing/RTL/reduced-motion proof |
| W1c: co-locate feature families | Four original families committed (`1d08347f`, `8f0498bb`, `4537248b`, `ff1735fe`); additional `features/*` directories present | `features/requests-ranking`, `learning-ranking`, `device-auth`, `endpoint-activation`; S505/S507/S509/S511 reviews PASS | Not all features are owned; no Definition/Composition/Block/Program hierarchy; flat Model + one dispatcher remain |
| Decomposition 1: Model grouping | Committed `6241792d` | `model.ts` composes 23 fields from feature objects preserving key order; S515 PASS | Runtime Model still one flat struct; no feature-owned lifecycle/keyed instances |
| Decomposition 2: named RouteViewContext + 49-key registry | Committed `ba21550b` | `view.ts` one named context; `satisfies` 49-key registry; S517 PASS | One dispatch cast remains; registry body still central; route bodies are moved but not all family-owned |
| Decomposition 3: control/feature route modules | Committed `9dc4b6fc`, `845b85c0`, `259c7d4b`, `43a42020` | features/control, overview, runtime, studio, observe route modules; S519 PASS | Several families still flat (`families-view.ts`, view helpers); `control/routes.ts` still imports shell `control-view` re-exports |
| Decomposition 4: update dispatch partition | Committed `7bacb981` | 88 handlers in six groups; S521 PASS with correction (grouped order, unique tags) | `remainingHandlers` is still 47-wide and lives in one 1.5k-line file; not one handler module per family |
| Decomposition 5: cleanup | Committed `50d251ab` | S523 PASS; payload casts removed, per-route contexts, no positional args | Final sealed rebuild/gate matrix not done; no whole Workspace claim |
| 50-page parity audit | Audits committed through S539 (`b3deb530`/`3b41b1e1`/`ae9f2d9c`/`036eb064`) | S526 initial; S537 17/50 >=0.9; S538 data-bearing ratios; S539 corrected 5s settle 18/50 >=0.9 | 32/50 remain below 0.9 at S539; several are data-empty, several are true depth gaps |
| S540 system/local density | Module/test/logs/review committed at HEAD, but **view wiring uncommitted** | `supplements.ts` 3D6294 (11 pages); `s540` test 026F95; `s540-audit.log` 11/11; S542 final PASS (local peers fixed, controls asserted) | Wiring absent from HEAD; committed test fails on clean HEAD; density audit was against dirty view |
| S541 learning/models/studio density | **Uncommitted/unreviewed**; hashes 283FB972, 5BFC7F1F, EBBB8C06, 71B8A04A, 016F10DE | `s541-red.log` (11 fail summary), `s541-green.log` 78/78, `s541-audit.log` | Audit is only 7/11 URL-dumped; `/models` 74.3% below 0.9; 4 studio tabs structural only; no fixture traffic; RED provenance test hash `d9e40…` does not match frozen test `016f10de` |
| S485 addendum 02: feature ownership/keyed state/shared HTTP | Partial | 12 feature dirs + routes; S485 old trace shows flat ownership | No Composition/Block/Program, no per-feature lifecycle, no keyed detail/editor instances; one global Model/message/update |
| R11 root routes/submodels | Implemented broad shell | typed 49-route union, registry, scene/audit gates | Full journey-level route acceptance not established; parity remains partial |
| R13 complete route waves | Partial | 20-route packaged audit/20, 50-page parity audit | 32/50 below 0.9 at S539; many readback-only pages still replace original forms/actions |

## Per-page ratios where evidence exists

Methodology caveat: S526 used a 1.5s settle and under-measured; S537/S539 correct this. Ratios are port textLen / reference textLen; reference holds live telemetry, so an honest empty state can be structurally complete while below 0.9 text.

### S539 corrected full audit (5s settle, 60 fixture requests): 18/50 >= 0.9, 32 below

Named below-0.9 depth gaps: `/system/session-readiness` 0.27, `/control/endpoints` 0.40, `/system/runtime` 0.45, `/router/agent-strategy` 0.46, `/observe/queues` 0.64, `/learning/packs` 0.63, `/learning/evidence` 0.44, `/models` 0.76, `/system/peers` 0.81, `/router/workloads` 0.82, `/learning` 0.83, `/router/decisions` 0.85, `/local/llama-swap/models|policy|swap|matrix|logs` 0.54–0.63/0.01, studio tabs 0.48–0.72.

Named data-empty below-0.9: `/observe/logs` 0.09, `/observe/store-degradation-receipts` 0.12, `/models/roles` 0.16, `/observe/observability-snapshot` 0.24, `/observe/activity` 0.51. These are honest empty states structurally, not renderer stubs.

### S538 data-bearing ratios

`/requests` 15.79x, `/observe/routing` 3.45x, `/system/operator` 2.43x, `/router` 1.07x, `/control/providers` 0.92x; below: `/router/decisions` 0.84, `/learning` 0.83, `/` 0.81, `/models` 0.76, `/observe/activity` 0.51, `/observe/observability-snapshot` 0.24, `/observe/store-degradation-receipts` 0.12, `/observe/logs` 0.08, `/local/logs` 0.01. S539 later corrected the root to 1.95x with 5s settle.

### S540 system/local density after S542 repair (11/11 >=0.9; dirty view)

session 226.1%, endpoints 222.0%, runtime 226.3%, agent 149.8%, queues 501.1%, system peers 382.5%, workloads 241.5%, llama models 250.1%, policy 306.5%, swap 277.3%, local peers 188.0%. The audit table now records refLen/portLen/ratio/headings/controls; local peers uses the implied `_app_local_endpoints` reference (no dedicated captured file).

### S541 learning/models/studio (unreviewed; 7 URL-dumped, 4 structural only)

learning 148.2%, packs 117.8%, evidence 105.4%, decisions 131.5%, history 144.9%, studio chat 165.4%; **models 74.3%** (role/task data empty). Studio images/audio/rerank/advanced have structural tests only; no URL text ratio. S541 disclosure says fixture seeding returned 503 (no upstream aliases) and it measured existing dev telemetry, not the required 60-request fixture.

## Ranked open items

1. **Commit/reconcile S540 wiring and S541 cleanly.** S540 module/test are committed without HEAD view wiring; committed `s542` PASS depends on a dirty view. A clean HEAD cannot pass the committed S540 test. Commit the density supplements wiring, or revert the committed test/review until wiring lands, then rebuild.
2. **Treat S541 as unreviewed/frozen, not accepted.** It is entirely uncommitted, `/models` is 74.3% below the 0.9 gate, only 7/11 pages are URL-dumped, studio tabs have no text ratio, and no fixture traffic was captured. Resolve the RED provenance hash mismatch (`d9e40…` in log vs `016f10de` current test) before review.
3. **Close the remaining depth gaps.** `/models` 0.743 and `/models/roles` 0.156 need role/task data or an honest structural acceptance; studio images/audio/rerank/advanced still 0.48–0.72 and only structural. `/router/decisions` 0.85 and `/learning` 0.83 are close but below 0.9. These are the highest-value visible gaps after S540.
4. **Correct the parity matrix, not just the pages.** S539 18/50 >=0.9 leaves 32 pages; S540 fixed 11 named system/local pages, S541 claims 5 learning pages + studio chat but not all are re-captured in one matrix. Re-run the full 50-pair matrix after commit with 5s settle and data, and publish one authoritative table.
5. **Charts are structural-only in the new density pages.** Observe/learning/models charts use `hasData:false` empty series. That satisfies structure, but populated APIs still show empty charts; wire real series before claiming chart parity.
6. **W1a is not a single-owner HTTP client.** Only localPolicy moved; app.ts still builds multiple independent clients and base URL/token ownership is fragmented. Complete the shared owner or record the bounded W1a deferral.
7. **W1b is two migrated controls, not an RM3 facade.** Listbox is limited to ranking metric/target; dialog is device-auth only. Provider/device-auth native selects, native text editing, RTL/mobile/reduced-motion, and general Dialog/Listbox coverage remain.
8. **W1c/decomposition is architectural partial.** 12 feature dirs exist, but Model is flat, `createUpdate` still holds a 47-handler remaining group, and keyed detail/editor state/lifecycle from S485 are absent. Do not cite the five slices as S485 completion.
9. **Packaged/release gates remain owner-gated.** Visual-delta route `/` needs vision quota/owner approval; compare-release needs preserved v0.0.20 React artifact; real-client R15/R16/R39 and stage/prod Run88 identity are not approved. Do not mark the overall goal complete.
10. **Dirty-tree hygiene.** Uncommitted audit tooling (`audit-rendered-ui.mjs` + untracked `studio-audit-evidence.mjs`) and S541 logs/task should be committed with their slice or clearly quarantined; otherwise the next clean-checkout verification is unreliable.

## Bottom line

The UI port is substantially beyond the S485 flat-readback baseline: four families are co-located, the five decomposition slices and W1a/W1b bounded changes are committed, and 18/50 pages hit 0.9x under the corrected audit. It is **not complete**: S540 wiring is not at HEAD, S541 is unreviewed and /models is below gate, 32 pages were below 0.9 at S539, charts are empty-state structural, and the S485 keyed-feature/lifecycle and single HTTP-owner requirements remain unmet.
