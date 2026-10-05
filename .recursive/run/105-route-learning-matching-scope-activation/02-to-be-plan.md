Run: `/.recursive/run/105-route-learning-matching-scope-activation/`
Phase: `02 TO-BE Plan`
Status: `LOCKED`
LockedAt: `2026-10-03T03:14:20.367Z`
LockHash: `52d2457cc56f7001d7b5e6a4a5d515530dc427cb5e73c5881b3255a08f2c5423`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/105-route-learning-matching-scope-activation/00-requirements.md` (LOCKED `f3b5c3fc`)
- `/.recursive/run/105-route-learning-matching-scope-activation/00-requirements.addendum-01.md` (LOCKED `bea50dd7`)
- `/.recursive/run/105-route-learning-matching-scope-activation/01-as-is.md` (LOCKED `9f16eb01`, constraints C1-C14)
- Five Phase-2 planner reports (packages A-E), verified by the controller against the baseline.
Outputs:
- `/.recursive/run/105-route-learning-matching-scope-activation/02-to-be-plan.md`

## TODO

- [x] Map every in-scope R# (R1-R14) to a planned change
- [x] Map every Phase-1 source-inventory item (the R# verdicts) and every constraint C1-C14 to a package
- [x] Resolve the two requirement contradictions via a locked addendum before planning around them
- [x] Name the targeted files/modules concretely (exact paths)
- [x] Name the tests and QA coverage concretely (per-package RED sets + Phase 5 scenarios)
- [x] State the expected change surface concretely enough for Phase-3 diff reconciliation
- [x] Complete the Coverage Gate
- [x] Complete the Approval Gate

## Operating decisions (controller-arbitrated)

These decisions bind the packages; each is grounded in a first-hand code check.

| # | Decision | Grounds |
| --- | --- | --- |
| D1 | The endpoint ladder lives in a NEW mutable table `knowledge_route_ladders` (keyed by a composite `(role_id, task_type_id)`), NOT inside the pack record. | `recordLearning` is INSERT-only (`knowledge-store:300/:307-309`) and the pack body is a closed contract (`route-learning-contracts.schema.json:471-473`). |
| D2 | `SCHEMA_VERSION` is NOT bumped; every store change is additive (`CREATE TABLE IF NOT EXISTS` in the existing DDL block + `PRAGMA`-guarded `ALTER TABLE`). | The guard throws for any existing store on a version mismatch (`knowledge-store:14/:140-142`); the additive precedent is `:143-153`. |
| D3 | `candidateRef` IS the raw endpoint id, so no mapping layer is needed between the comparison group and the pack's `scope.endpointId`. | `track-b-runtime.ts:8805/:8881/:8908/:9317` (`candidateRef: rollout.endpointId`). |
| D4 | The comparison-to-scope join uses the group's OWN `comparability.(roleId, taskTypeId)`; a group without it is excluded as `unscoped_comparison`, never guessed. | `evaluation-core:3857-3863` (`comparability.taskRef` is an artifact ref); `#v3Comparability` whitelists+validates the three ids (`:1743-1755`, `:1806-1810`). |
| D5 | `created_at_ms` is added as a COLUMN and never enters `group_json`/`result_json`. | `knowledge-worker` verifies receipts by comparing `comparisonDigest` against `digest(group)` (`:877/:1509/:1516/:2094/:2104`) - a body field would invalidate every stored receipt. |
| D6 | R9's admission floor (K comparisons + mean confidence) is a NEW quantity; `learning-integrity.mjs` is not touched. | Its `0.7` gates the caller-supplied signed-recommendation confidence (`:643/:676`), a different input. |
| D7 | Derived activation is the only routing authority: the learner sweep stops calling `knowledge:activate-pack` and the advisory source stops reading `rollout.activePackageId`. `activatePack`/`rollbackPack`/kill switch stay byte-identical. | R9 removes a precondition, not a code path; those functions are asserted by run-98/run-107 suites. |
| D8 | The per-task rollback toggle never calls `rollbackPack` and never writes `rolledBackWithValidationReceiptId`; guardrail auto-rollback and the kill switch do not set per-task flags. | `knowledge-store:509` (requires active), `:519`, `:468-470` (the re-activation guard); the kill switch already suppresses through the router's `kill_switch_engaged` gate (`router.ts:109`) that R5 freezes. |
| D9 | The endpoint ladder is named `rungs` / `routeLadder` / `RouteLadderPackV1` everywhere new; the word `ladder` stays reserved for the COHORT exposure ladder. | `knowledge-store:351/:440/:463`, `rollout.mjs:9 [10,25,50,100]`. |
| D10 | The cohort seed gets a versioned mode: legacy/scope-mode keeps the byte-identical seed (frozen buckets); only writer-created rows use the composite seed. | `rollout.mjs:42` composes `scopeId\0channel\0decisionSeed`. |
| D11 | Effect dependency: new Effect code in `packages/core` requires ADDING the `effect` workspace dependency there (only `apps/runtime-host-bridge` depends on it today). The alternative - placing the Effect program in the host bridge - is rejected to keep the pure program unit-testable next to the router. | `packages/core/package.json` has no `effect` dep; the host bridge imports `from "effect"` (`scoring-strategy.ts:13`). |
| D12 | Role/task display names are out of scope; the Packs page renders raw ids. | No name resolution exists anywhere (`runtime-operations-server.mjs:2213-2232` is ids-only). |
## Work packages (parallelizable; disjoint files)

| Pkg | Requirements | Owner files (primary) | Effect |
| --- | --- | --- | --- |
| A | R3, R6, R9-floor | NEW private `extensions/knowledge-worker/ladder-aggregation.mjs`; private `extensions/evaluation-core/index.mjs` (+`created_at_ms`) | Schema, Data.TaggedEnum, Data.TaggedError, Chunk/HashMap, Option |
| B | R2, R7, R14, R1-storage | NEW private `extensions/knowledge-store/route-ladder.mjs`; private `extensions/knowledge-store/index.mjs`; private `shared/route-learning/rollout.mjs`; public+private `route-learning-contracts.schema.json`; public `packages/protocol-types/src/v1.1-contracts.ts` (+ regen) | contract Schema only (plain `.mjs` runtime) |
| C | R1-read, R4, R5 | public `route-advisory-source.ts`; NEW public `packages/core/src/route-advisory-ladder.ts`; public `packages/core/src/router.ts` + `types.ts`; public `track-b-runtime.ts`; public `index.ts`; public `cli.ts` | Schema, Data.TaggedEnum, Data.TaggedError, Option |
| D | R8, R9-activation, R10, R11 | NEW public `packages/core/src/route-ladder-dispatch.ts`; NEW public `product-defaults-file.ts`; public `track-b-auto-replay-runtime.ts`, `track-b-auto-replay.ts`, `cli.ts`, `track-b-learning-pass.ts`; private `knowledge-store/index.mjs` (flag columns + handlers); private `runtime-operations-server.mjs`; private `product-defaults.json` + schema; NEW private `shared/route-learning/challenge-batch.mjs` | Schema, Data.TaggedEnum, Data.TaggedError, Effect+Schedule+Duration+Clock, Ref, Option |
| E | R12, R14-UI, R10-UI | NEW public `apps/runtime-ui/app/lib/learning-ladder.ts`; public `learning.tsx`, `learning-api.ts`; private `runtime-operations-server.mjs` (ladder index projection) | none (recorded reason: runtime-ui has zero Effect imports/deps) |

**Cross-package interfaces (must match exactly):**
- A -> B/D: `admissionFloor(records, {minComparisons, minConfidence})` and the ranked rung list.
- B -> C/E/D: the ladder row shape (`rungs{endpointId,rank,status}`, `completeness{admitted,configured}`, `nextEligibleAtMs`, `version`, `rolledBack{on,reason,atMs}`) and the composite key `roleId\u0000taskTypeId`.
- C -> E: `advisoryLadder` + `roleId` on the advisory result; rung fields on the decision/observation.
- D -> E: the rollback toggle rides the EXISTING `POST /operator/learning/rollback-pack` route with body `{scopeId, roleId, taskTypeId, rolledBack, reason}` (zero new route work).
- D -> C: the toggle writes `rolledBack.on`; C refuses serving when it is true.
- E -> B: the sidecar reads the ladder index through one store read (capability frozen with B); absent -> `laddersState:"unavailable"`.

## Requirement Mapping (recursive-mode-audit-v2)

Every in-scope R# maps to a package, concrete files, and the tests that prove it. No umbrella restatements.

| R# | Planned in | Concrete change | Proof (tests) |
| --- | --- | --- | --- |
| R1 (pack = per-(role,task) ladder; no scope-wide packs) | B (storage/keying), C (read/match), E (index) | New `knowledge_route_ladders` keyed `(role_id,task_type_id)`; migration clears the scope-wide `activePackageId`; advisory returns the ladder + `roleId`; router matches exact role+task (addendum A1) | B: `run105-r01-activation-key`, `run105-r07-rollout-key-migration`; C: `run105-c-router-ladder-walk` role-mismatch case |
| R2 (materialized derived snapshot, monotonic version) | A (derive), B (persist) | `foldLadder` produces the ranked rungs; `applyRungRewrite` discards a stale (lower-version) write | A: `run105-a1/a2`; B: `run105-r07-route-ladder-store` (stale rewrite) |
| R3 (pairwise -> total order; weights; tie-break) | A | `weightedVerdict` (w = confidence*agreement, tie=0), `rankScore`, lexicographic key tuple `[-rankScore,-h2hNet,+losses,-wins,-weightedCount,endpointId]` | A: `run105-a1-weighted-verdict`, `run105-a2-total-order` (50 shuffles -> identical ladder; comparator totality) |
| R4 (rung status vs router eligibility are separate filters) | B (status), C (both at walk time) | `status: available|unavailable` stored on the rung; the walk skips unavailable (stored) and not-in-`eligibleEndpointIds` (per request) | C: `run105-c-router-ladder-walk` (removed-rung case + available-but-ineligible case) |
| R5 (advisory_only ladder walk; gates unchanged) | C | Walk rank-ascending to the first ROUTABLE rung; single-shot swap kept; every gate/fallback string unchanged; band decides application (addendum A2) | C: the whole `run105-c-router-ladder-walk` file, incl. the no-ladder deep-equal back-compat case |
| R6 (immutable replay record + net-new created_at) | A | Additive `created_at_ms` column; both INSERT sites updated; kept OUT of the digest-checked bodies | A: `run105-a3-created-at` (legacy store gains the column; bodies byte-identical; rejected path stamps too) |
| R7 (SQLite WAL, keyed (role_id,task_type_id), one indexed read) | B | New table + unique index; `journal_mode=WAL` + `busy_timeout`; one indexed read returns rungs/completeness/nextEligibleAtMs/rolledBack | B: `run105-r07-route-ladder-store` (round trip, isolation) |
| R8 (depth-first dispatch; classification gate; 30d idle; challenge) | D | Classification gate in `pendingCaptures`; focus-task selection; `nextEligibleAtMs` idle + refresh; top-down challenge one comparison per rung, bounded by `challengeBatchSize` | D: `run105-r08-focus-task-selection`, `run105-r08-idle-refresh-and-challenge`, private `run105-r08-challenge-batch-policy` |
| R9 (derived floor-based activation, no promote-then-activate) | A (floor), D (activation) | `admissionFloor` K+mean; the sweep stops calling `activate-pack`; the advisory no longer needs an active rollout | A: `run105-a5-admission-floor`; D: `run105-r09-derived-activation` (incl. an invoke spy) |
| R10 (per-task rollback flag) | D (flag), B (column), E (toggle UI) | `rolledBack{on,reason,atMs}` default OFF; ON -> no advisory + replay paused; reversible; isolation | D: `run105-r10-per-task-rollback`, private `run105-r10-route-ladder-rollback-store`; E: `learning-ladder-index.test.tsx` |
| R11 (constants in product-defaults.json; net-new read path) | D | `routeLearning` block + `readRouteLearningDefaults` (two-tier resolution, degradation not throw); the block's schema is additive | D: `run105-r11-product-defaults-loader` (incl. the C4 separation check) |
| R12 (Packs page ladder index) | E | New `ladders[]` sibling on the existing records readback; `LearningLadderIndex` with top-3, badge, completeness, two-way toggle, complete-first ordering | E: `learning-ladder.test.ts`, `learning-ladder-index.test.tsx`, extended `learning.test.tsx`/`learning-api.test.ts` |
| R13 (Effect-first with the pinned primitive map) | A, C, D (+ B/E recorded exceptions) | A/C/D declare and use Schema, Data.TaggedEnum, Data.TaggedError, Effect+Schedule+Duration+Clock, Ref, Option; B and E record why plain `.mjs`/TS is used | reviewed in Phase 3.5; each package's Effect section |
| R14 (observable lifecycle states; active derived) | B (derive), E (render) | `deriveLifecycleState` -> `no_ladder|partial|complete|rolled_back`, active derived never stored; the UI renders badge + completeness | B: `run105-r14-pack-lifecycle`; E: `learning-ladder.test.ts` |

## Constraint Mapping (C1-C14 from 01-as-is.md)

| C# | Resolved by |
| --- | --- |
| C1 closed pack contract | D1: new contract `RouteLadderPackV1` + new table; the pack body is untouched (B) |
| C2 `recordLearning` immutability | D1: rewrites go to the new mutable table; `recordLearning` stays INSERT-only (B/D) |
| C3 group has no (role,task) key | D4: the group's own `comparability.(roleId,taskTypeId)`; absent -> `unscoped_comparison` (A) |
| C4 the 0.7 is a different quantity | D6: R9's floor is new; `learning-integrity.mjs` untouched (A/D) |
| C5 cohort seed re-key | D10: versioned seed mode; legacy buckets frozen (B) |
| C6 schema guard | D2: additive DDL + marker; no version bump (B/D) |
| C7 `taxonomyVersion` not in `$defs.scope` | B adds it as an optional property; C keeps the existing gate (addendum A1) |
| C8 promote-then-activate machinery | D7: derived activation is authoritative; the legacy path is retained, not deleted (D) |
| C9 toggle vs three rollback paths | D8: the toggle writes only the ladder flag; guardrails and the kill switch do not (D) |
| C10 `ladder` overloaded | D9: `rungs`/`routeLadder` naming; the cohort ladder keeps its name (all) |
| C11 no `roleId` in the advisory layer | C plumb: cache key `channel\0scope\0roleId`, recall signature, index.ts call, observation pair |
| C12 single-shot swap | Addendum A2 + C: walk skips only non-routable rungs; band still gates application |
| C13 one package per observation | C: additive `advisoryRungRank`/`advisoryRungWalked`/`advisoryLadderLength` + two ledger totals |
| C14 naming/vocabulary mismatches | C: declare the produced-but-undeclared outcome fields; keep the host/core rename at the one boundary; keep the real code strings |
## Plan Drift Check

Comparing this plan against the locked inputs, and recording every drift explicitly.

| # | Drift | Disposition |
| --- | --- | --- |
| 1 | R1's "taxonomyVersion difference does not block the advisory" contradicted the live `advisory_taxonomy_mismatch` gate. | RESOLVED by addendum A1 (taxonomy is provenance; the gate stays). |
| 2 | R5's "falls through the next rung" was ambiguous about the score band. | RESOLVED by addendum A2 (fall-through is preference-level; the band remains the application gate). |
| 3 | The design doc's Packs-page wording says "(role, task) name"; no name plumbing exists. | RESOLVED by addendum A3 (raw ids; header `Role . task (id)`). |
| 4 | `01-as-is.md` predicted "six additional sites" beyond the code-site list; the plans found more: the protocol contract + generated TS (B), the package registry/permissions (B), the operator routes (D/E), the ledger totals (C), the product-defaults SCHEMA (D). | RECORDED: the plan's file list is authoritative and larger than the requirements' change list; each addition is named in its package. |
| 5 | R13 requires vendored Effect, but `packages/core` has no `effect` dependency today. | RESOLVED by D11 (add the workspace dependency; keep the pure program in core). |
| 6 | The code-site list names `core/src/router.ts` but not `packages/protocol-types` (the decision projection needed for C13's evidence to reach the ledger). | RECORDED as Package C scope; flagged as its OPEN-2 and accepted here. |
| 7 | R8's "30 days" appears as both the request-count window and the idle. | RESOLVED by D: one constant (`stalenessWindowDays`), one meaning. |
| 8 | The requirements say the Packs page toggle is "wired to the backend flag"; the backend route choice was open. | RESOLVED: reuse the existing `POST /operator/learning/rollback-pack` with an extended body (no new route). |

## Expected change surface (Phase-3 diff reconciliation basis)

| Area | Files | Rough size |
| --- | --- | --- |
| A | NEW private `extensions/knowledge-worker/ladder-aggregation.mjs`; private `extensions/evaluation-core/index.mjs` | ~300 new; +26/-5 |
| B | NEW private `extensions/knowledge-store/route-ladder.mjs`; private `knowledge-store/index.mjs`; private `shared/route-learning/rollout.mjs`; public+private contract schemas; public `v1.1-contracts.ts` + regen; private store `package.json` + `shared/package-registry.json` | ~120 new; +180/-15; +25/-8; +95 x2; +90 regen; +25; +6 |
| C | public `route-advisory-source.ts`; NEW `packages/core/src/route-advisory-ladder.ts`; `core/src/router.ts` + `types.ts`; `track-b-runtime.ts`; `index.ts`; `cli.ts`; protocol decision schema + regen | +60; ~90 new; +60; +30; +90; +45; +12; +25 + regen |
| D | NEW public `packages/core/src/route-ladder-dispatch.ts`; NEW public `product-defaults-file.ts`; `track-b-auto-replay-runtime.ts`; `track-b-auto-replay.ts`; `cli.ts`; `track-b-learning-pass.ts`; private `knowledge-store/index.mjs`; private `runtime-operations-server.mjs`; private `product-defaults.json` + schema; NEW private `shared/route-learning/challenge-batch.mjs` | ~260+110 new; +140; +25; +40; +25; +120; +60; +20; ~90 new |
| E | NEW public `apps/runtime-ui/app/lib/learning-ladder.ts`; `learning.tsx`; `learning-api.ts`; private `runtime-operations-server.mjs` (projection) | ~120 new; +180; +20; +70 |
| Tests | A: 5 files; B: 7; C: 4; D: 8; E: 6 (+3 extended) | ~2,700 lines total |
| **Production total** | | **~2,000 lines** across ~24 files (5 new modules) |

## Testing and verification plan

- **Phase 3 (TDD, strict):** each package writes its RED set FIRST, then implementation; the controller re-runs every package suite and verifies the diff. RED/GREEN evidence logs land under `evidence/`.
- **Phase 3.5:** one review bundle per package (recursive-review-bundle), controller-verified.
- **Phase 4:** unit (the per-R# suites above), E2E (dispatch -> comparison -> aggregation -> activation -> rollback -> UI toggle), regression (the run-98/99/101/104/107 suites stay green UNMODIFIED - that is the back-compat proof).
- **Phase 5 (deepseek-flash probes, vision):** rebuild the runtime (paired build) and verify the DEV build on **:3458**; drive **live pi requests** to prove: a task-scoped request is served by its matching ladder's preferred endpoint; a non-matching pack is refused with `advisory_task_mismatch`; an unclassified request gets no advisory; an unavailable/ineligible top rung falls through; a rolled-back task routes by baseline; `advisory_only` is preserved (no direct routing). Inspect the **Packs page in a browser** (screenshots read by deepseek-flash): rows ordered complete-first, top-3 + Active/Rolled-back badge + completeness, and the two-way toggle flipping the backend flag.

## Coverage Gate

- [x] Every in-scope R# (R1-R14) is planned with concrete files and named tests (`## Requirement Mapping`).
- [x] Every Phase-1 source-inventory verdict and every constraint C1-C14 is mapped to a resolution (`## Constraint Mapping`).
- [x] Targeted files/modules are concrete (exact paths in the packages and the change surface).
- [x] Tests and QA coverage are concrete (per-package RED sets + the Phase-5 scenarios).
- [x] The expected change surface is concrete enough for later diff reconciliation.
- [x] Drift between the locked inputs and this plan is recorded (`## Plan Drift Check`), including the two addendum resolutions.
- [x] Vague umbrella restatements are avoided: every R# row names files and tests.

## Approval Gate

- The plan is traceable to every R# and every constraint; the two contradictions are resolved by a locked addendum
  rather than silently reinterpreted.
- No production code has been written; Phase 2 is planning only.
- Phase 3 can proceed package-by-package under strict TDD, with the file ownership above keeping the packages
  disjoint (the shared `knowledge-store/index.mjs` and `runtime-operations-server.mjs` are the only overlaps; B and D
  coordinate the table columns, D and E the readback/route).
