Run: `/.recursive/run/105-route-learning-matching-scope-activation/`
Phase: `01 AS-IS`
Status: `LOCKED`
LockedAt: `2026-10-03T02:59:15.477Z`
LockHash: `cab1ee486d997b0d0a8ea06956a162e40a63724ad1f3d8bf6b2ccb17c5376147`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/105-route-learning-matching-scope-activation/00-requirements.md` (LOCKED, `378225fe`, R1-R14 + code sites + risks)
- `/.recursive/run/105-route-learning-matching-scope-activation/00-worktree.md` (LOCKED, `7aea8cf5`)
- The baseline worktrees: public `701b8b8f` (content-identical to the analyzed `5796edb4` for `role-model-router/`;
  `git diff 701b8b8f..HEAD -- role-model-router` is empty) and private `c993b2f2`.
- Design doc `docs/route-learning-stage-3-matching-scope-activation.md` (by reference; the requirements carry it inline).
Outputs:
- `/.recursive/run/105-route-learning-matching-scope-activation/01-as-is.md`
- `/.recursive/run/105-route-learning-matching-scope-activation/evidence/phase1/` (three analyst reports, preserved)
Scope note: this AS-IS records what the baseline actually does at the nine code sites the run will change, and the
constraints the change must respect. It is evidence, not a plan (Phase 2 owns the plan).

## TODO

- [x] Reread `00-requirements.md` and identify the claims to verify
- [x] Reread the prior recursive evidence that covers the same subsystem (run-104 addenda 19/22/23/24, run-98 R5/R7, run-99 R24/R33, run-101 queue planes)
- [x] Record which upstream artifacts and prior recursive evidence were reread
- [x] Delegate the three analyst areas (router+advisory source; knowledge-store/worker/evaluation-core; runtime-ui Packs page)
- [x] Re-verify every analyst claim against the code first-hand (12 controller checks)
- [x] Complete `## Source Requirement Inventory` for every R#
- [x] Complete the Coverage Gate checklist
- [x] Complete the Approval Gate checklist

## Upstream artifacts and prior evidence reread

- `00-requirements.md` (this run, LOCKED `378225fe`) - R1-R14, the code-site list and the risks.
- `00-worktree.md` (this run, LOCKED `7aea8cf5`) - baseline identity and the executable diff basis.
- `/.recursive/RECURSIVE.md` - the phase contract, the `recursive-mode-audit-v2` requirements for this phase
  (`## Source Requirement Inventory`), the Effect-first rule, and the gate definitions.
- `/.recursive/config/recursive-router.json` - the delegation policy read immediately before choosing how to run
  the analyst roles (see `## Delegation record`).
- Prior recursive evidence covering the same subsystem: run-104 `addenda/post-closeout.r22-learning-readback-scope-and-join.addendum-22.md`
  (the candidate scope lost role/task on the replay path), `...r23-route-advisory-inert.addendum-23.md` (the advisory
  was inert: applied 0 / 6842), `...r24-inline-frame-ceiling.addendum-24.md` (the 16 KiB frame cap that forced the
  `limit: 1` bounded read at `route-advisory-source.ts:145`), and `...r9-replay-job-projection.addendum-10.md` /
  `...r9-finalized-effort-comparability.addendum-20.md` (the comparison and effortComparability plumbing).
- Prior run artifacts by reference: run-98 (the S0-S4 ladder, the advisory consideration R5, the activation state
  machine R7), run-99 (the durable advisory source R24 and the family-scoped advisory R33), run-101 (the queue planes).

## Delegation record

- Router policy read immediately before dispatch: `/.recursive/config/recursive-router.json` (worktree copy). The
  `analyst` role is `enabled: true`, `mode: external-cli`, `cli: null`, `model: null`, `fallback: self-audit`.
- Effective route: no CLI/model is bound for `analyst`, so no external CLI was available to resolve; the run used
  in-session analyst subagents (the `recursive-subagent` analyst role) and the controller re-verified every claim
  against the code. Recorded per RECURSIVE.md's requirement to record the route outcome.
- Three analysts ran in parallel, one per area; their reports are preserved verbatim under `evidence/phase1/`.
## AS-IS: what the baseline does today (verified)

Every claim below was verified first-hand by the controller (12 checks) and independently by an area analyst; the
analyst reports are in `evidence/phase1/`.

### 1. The rollout is keyed by the runtime scope only (R1, R7)

- `knowledge_route_rollouts (scope_id TEXT PRIMARY KEY, state_json, updated_at_ms)` -
  `extensions/knowledge-store/index.mjs:136`; `#rollout(scopeId)` reads by `scope_id` (`:338-341`).
- `activatePack(input)` keys ONLY by `boundedString(input.scopeId)` (`:422-440`); it takes no roleId/taskTypeId.
- The rollout's `state_json` carries `activePackageId`, `priorPackageId`, `cohortStep`, `cohortPercent`, `ladder`,
  `validationReceiptId`, `rolledBackWithValidationReceiptId`, `killSwitchAtMs` (`:344-356`).
  **The field named `ladder` is the COHORT exposure ladder** (`shared/route-learning/rollout.mjs:9`
  `ROLLOUT_LADDER_DEFAULT = [10, 25, 50, 100]`), NOT a ranked endpoint list.
- The activation receipt stores the bare scopeId in `scope.taskTypeId` (`:370`) - already a misuse of the field.

### 2. A pack carries one endpoint, not a ladder (R1, R2, R7)

- `promoteCandidate` builds `scope: { endpointId: candidate.scope?.routePackage, taskTypeId?, taxonomyVersion?, roleId? }`
  (`extensions/knowledge-worker/index.mjs:2540-2563`) - ONE endpointId - and stamps `priority: "advisory_only"`
  (`:2567`), `status: "validated"`.
- `candidate_json.packCandidates` is an append-only per-candidate promotion HISTORY (`version = packs.length + 1`,
  capped 32 at `:120`), not a ranking.
- The pack body is the CLOSED canonical contract `ExperiencePackCandidateV1`
  (`fixtures/.../guidance/route-learning-contracts.schema.json:471-473` `"additionalProperties": false`, `:523-525`
  `"priority": { "const": "advisory_only" }`). It has no ladder/completeness/nextEligibleAtMs/rolledBack fields.
- **The candidate scope already carries `roleId`/`taskTypeId`/`taxonomyVersion`** (`knowledge-worker:1741-1757`) -
  the plumbing exists; the KEYING and the ranked body are what is missing.

### 3. The advisory source resolves ONE pack to ONE endpoint (R5)

- `route-advisory-source.ts:145` `knowledge:rollout-state { scopeId, limit: 1 }` (bounded to one receipt because the
  store's default 100-receipt read tripped the 16 KiB inline frame cap - run-104 addendum 24); `:161-162` one
  `activePackageId`; `:186-196` one pack -> one `routePackage`; `:237-252` returns a single `preferredRoutePackage`.
- It carries `taskTypeId`/`taxonomyVersion` but **no `roleId`**.
- The durable cache is keyed `channel\0scope` only (`track-b-runtime.ts:7568`), one entry per scope.
- `cli.ts:3721-3801 startDurableRouteAdvisoryRefresh` republishes every 15s; S0/S1 skip. Started at `cli.ts:10606`.

### 4. The router consumes one preferred endpoint through a gated re-rank (R5)

- `packages/core/src/router.ts:54 evaluateRouteAdvisoryConsideration`; single call site `routeRequest` at `:1771`,
  outcome embedded at `:1843`.
- Gate order and typed fallbacks: `no_advisory` (106) -> `advisory_<state>` (107) -> `stage_below_s2` (108) ->
  `kill_switch_engaged` (109) -> `advisory_candidate_not_eligible` (114) -> `advisory_task_avoided` (124) /
  `advisory_task_unscoped` (126) / `advisory_task_mismatch` (127) / `advisory_taxonomy_mismatch` (130) ->
  `below_confidence_floor` (133) -> `cohort_excluded` (138/139) -> `outside_score_band` (146-147) ->
  `advisory_matches_baseline` (168).
- The swap is single-shot: `:1788` `scored[advisoryPreferredIndex]`, `:153` `applied = preferred !== leader`.
  There is NO score weight anywhere - the advisory re-ranks, it never re-scores.
- Live wiring `index.ts:26423-26502`: `preferredEndpointId: cached.preferredRoutePackage` (`:26475`), defaults
  `scoreBand 0.05` (`:26487`), `minAdvisoryConfidence 0.7` (`:26491`), `explorationPercent 0` (`:26494`).
- **Field-name asymmetry**: the host result uses `preferredRoutePackage`; the core input uses `preferredEndpointId`
  (renamed at `index.ts:26475`). `preferredRoutePackage` does not exist in the core package (0 matches).

### 5. Comparison groups have no time column and no (role, task) key (R3, R6)

- `evaluation_comparison_groups (group_id PRIMARY KEY, status, group_json, result_json)` - `evaluation-core/index.mjs:1190`.
  **No `created_at`.** Writes at `:3889` / `:4003` are 4-placeholder INSERTs.
- The only listing (`:4309-4317`) orders/cursors by `group_id` - so adding a column alone does not give a
  date-ordered history.
- `group_json` (`:3857-3863`) = `{ groupId, trialIds[], comparability { taskRef, inputRef, forkRef, policyId,
  scorerSetVersion, toolPolicyDigest, environmentDigest }, referenceProofs?, holdout }`. **`comparability.taskRef` is
  an ARTIFACT ref - there is no roleId/taskTypeId key on the group.**
- `result_json` (`:3864-3879`) carries `outcome` (`insufficient|source|candidate|disagreement|tie`), `winnerTrialId`,
  `winnerRole`, `scorerDisagreement`, `scorerOutcomes`, `members` (per-member averaged `confidence` at `:3799`),
  `validityIssues` (incl. `arm_effort_mismatch` from `effortComparability`, `:3770-3781`).
- **There is no group-level confidence field**, and no K-comparison floor anywhere (grep
  `minComparisons|comparisonCount|minComparisonGroups`: 0 hits).
- The candidate -> group join is done OUTSIDE evaluation-core (`knowledge-worker:1344-1359`;
  `runtime-operations-server.mjs:1968`).

### 6. The one 0.7 in the learner is a different quantity (R9, R11)

- `evaluation-core/learning-integrity.mjs:641-654 DEFAULT_GATE_THRESHOLDS { minSupport: 3, minConfidence: 0.7, ... }`,
  gated at `:689`/`:690`, consumed by `evaluateLearningGates` -> `decideLearningRoute`.
- It gates the **caller-supplied `metrics.confidence` of a signed recommendation** (`:676`), NOT the mean judge
  confidence over an endpoint's own comparisons. R9's floor is therefore a NEW quantity, not a re-read of this one.
- The only count floors today are lineage counts: `assessLearningEvidence({ minSupport = 3 })` (`:465`/`:500`).

### 7. Packs persist immutably (R2, R7)

- `knowledge_learning_records (record_id PK, kind, state, scope_id, record_json, at_ms)` (`knowledge-store:135`);
  `recordLearning` (`:259-312`) canonicalises the payload, bounds it to 16384 B (`:27`) and 10000 rows/scope (`:26`).
- **Immutability**: identical content is idempotent (`:295-298`); different content under the same `record_id` throws
  `immutable learning record conflict` (`:300`); the write is INSERT-only (`:307-309`). There is no update path.
- The stored pack body is exactly the `packCandidate` object (`tests/track-b/run98-r03-validation-receipts.test.mjs:415`).
- The store does not validate `record_json` against the contract schema (allowlist + bounds only).

### 8. The Packs page is a pack table, not a ladder index (R12, R14)

- `LearningPacksPage` (`runtime-ui/app/routes/learning.tsx:1364`) reads `kind=pack` records + the rollout, and renders
  columns `Pack · scope / Replay models · score / Pack model / Claim · evidence / State / Action` (`:1496-1504`).
- Per-row action is **Activate only** (`:882-891`, disabled when `busy || active || row.state !== "validated"`);
  rollback is ONE page-level button (`:1519-1527`) whose body carries no packId (`:1415-1422`).
- The state badge renders `active` vs the raw `row.state` (`:879-881`); there is no `rolled_back` tone.
- Nothing is ranked or sorted: models are comparison-group members in readback order (`:407-418`), rows render in
  readback order (`:1507-1514`). No top-3, no completeness, no complete-first ordering.
- There are no role/task NAMES anywhere (raw ids only, `:760-772`).
- The Activate confirm hardcodes the current semantics: `"Activate X? Cohort rollout starts at the first ladder step."`
  (`:1385`).

### 9. Dispatch is live-request-driven and already carries role/task (R8)

- `track-b-runtime.ts:11144 runTrackBReplayIntentPipeline`, called at `:11734`; enqueues replay intents for incoming
  requests with a distinct counterfactual, refusing with `R14_NO_DISTINCT_COUNTERFACTUAL` (`:8611`, `:11083`) otherwise.
- R22-B already threads `taskTypeId`/`taxonomyVersion`/`roleId` into the intent (`:11754-11761`) - the mechanism R8's
  ladder-gap targeting reuses.
## Constraints discovered (design-level contradictions Phase 2 must resolve)

These are findings that the requirements do not yet account for. They are recorded here as AS-IS constraints;
resolving them is Phase 2's job (and may need a requirements addendum).

### C1. The pack body is inside a CLOSED contract
`ExperiencePackCandidateV1` is `additionalProperties: false` (`route-learning-contracts.schema.json:471-473`) with
`priority` pinned to the const `advisory_only` (`:523-525`). R2/R7's ladder body (`rungs`, `completeness`,
`nextEligibleAtMs`, `monotonic version`, `rolledBack`) cannot be added without either extending the canonical
schema/contract or storing the ladder outside the current pack record shape.

### C2. `recordLearning` is immutable - a rewritten ladder has no legal write path
R2/R7 require the ladder to be REWRITTEN when new evidence arrives. The store refuses a changed record under the
same `record_id` (`knowledge-store:300`) and only ever INSERTs (`:307-309`). A materialized ladder therefore needs
either versioned `record_id`s (plus a max-version lookup) or a new mutable table - neither is in the storage plan.

### C3. The comparison group has no (role, task) key
R3 aggregates "the finalized pairwise comparison groups for a (role, task)", but `group_json` carries only
`comparability.taskRef` (an artifact ref) and the group has no roleId/taskTypeId (`evaluation-core:3857-3863`). The
candidate -> group join lives outside evaluation-core (`knowledge-worker:1344-1359`). The ladder's per-scope
grouping therefore needs a declared join, not an assumption about the group's own fields.

### C4. The 0.7 in `learning-integrity` is a different quantity from R9's floor
`learning-integrity.mjs:643` gates a caller-supplied signed-recommendation confidence (`:676`). R9's floor is the
mean of per-score confidence values over an endpoint's own finalized comparisons (`evaluation-core:2886`, averaged
`:3799`). R11's "the existing 0.7 becomes a product-defaults value" must NOT silently repurpose the integrity gate.

### C5. Re-keying the rollout changes the cohort seed - and therefore every existing bucket
The cohort bucket is `FNV-1a(scopeId \0 channel \0 decisionSeed) % 100` (`shared/route-learning/rollout.mjs:42`).
Replacing the bare `scopeId` with a composite `(roleId, taskTypeId)` key changes the seed for every decision, so
existing cohort assignments (and any in-flight exposure accounting) are recomputed. This is a migration decision,
not a rename.

### C6. The rollout table's PK change is non-additive against a schema guard
`knowledge-store` enforces `SCHEMA_VERSION = "role-model.knowledge-store.v1"` and throws on mismatch (`:14`,
`:140-142`). Changing `knowledge_route_rollouts`' primary key breaks that guard for existing stores; the additive
pattern (`:143-153`, `ALTER TABLE ... ADD COLUMN`) is the precedent to follow.

### C7. `taxonomyVersion` is written but is not in the canonical scope
The worker writes `scope.taxonomyVersion` (`knowledge-worker:2551-2553`) and the advisory carries it, but `$defs.scope`
is `additionalProperties: false` WITHOUT `taxonomyVersion` (0 occurrences in the schema file). R1's "the advisory
carries taxonomyVersion" therefore rests on an uncontracted field.

### C8. R9's "no promote-then-activate" meets a live two-step gate
`activatePack` today requires a validated pack (`knowledge-store:431`) AND a `validate` receipt (`:433-438`), and
refuses re-activating a rolled-back pack with the same receipt (`:468-470`). Removing the step makes that machinery
dead code to delete or repurpose; it also interacts with the two automatic paths already present: guardrail-breach
auto-rollback (`:602-612`) and the scope-wide kill switch (`:704-737`).

### C9. R10's toggle interacts with three existing rollback paths
The per-(role, task) `rolledBack { on, reason, atMs }` toggle does not exist. Today `rollbackPack` (`:504-542`) is
receipt-bound and requires `state === "active"` (`:509`). A toggle flipped ON then OFF again would hit the
`rolledBackWithValidationReceiptId` guard (`:468-470`) unless that guard is redefined. The toggle's interaction with
the guardrail auto-rollback and the kill switch must be specified.

### C10. "Ladder" is an overloaded word in this codebase
The COHORT exposure ladder (`knowledge-store:351/:440/:463`, `rollout.mjs:9 [10,25,50,100]`) already owns the name;
`activatePack` even accepts `input.ladder` as cohort percentages (`:440`). The endpoint ladder needs a distinct name
in code and contracts.

### C11. The advisory layer has no roleId anywhere
`route-advisory-source.ts` and the router's `RouteAdvisoryConsiderationInput`/`Outcome` carry `taskTypeId` and
`taxonomyVersion` but no `roleId`; the durable advisory cache is keyed `channel\0scope` only
(`track-b-runtime.ts:7568`). R1's `(roleId, taskTypeId)` key requires new plumbing through the source, the cache key
and eviction (`:7568`, `:7590-7595`), the recall signature (`:7599-7614`), the `index.ts` recall block (`:26429-26444`)
and the observation pair (`:26694-26708`).

### C12. The router's swap is single-shot, so "fall through the ladder" changes its shape
The gate function ends in one `scored.find(preferred)` + band check + index swap (`router.ts:143-147`, `:1784-1788`),
and the exploration/propensity math (`:148-158`) assumes ONE advised endpoint. R5's ordered fall-through therefore
changes the consideration function's shape (try rung 1, then rung 2, each against eligibility + band), not just its
input.

### C13. The observation ledger records one package per decision
`buildLiveRouteAdvisoryObservation` (`track-b-runtime.ts:7955`, appended `:8043`) records ONE
`preferredRoutePackage` per decision. R5's ladder must additionally record which rung was walked/applied, or the
measurement cannot distinguish "rung 2 applied" from "baseline retained".

### C14. Field-name and vocabulary mismatches to converge
- The host result field is `preferredRoutePackage` (`route-advisory-source.ts:21/238`); the core input field is
  `preferredEndpointId` (`types.ts:235`, `router.ts:111`).
- The real code strings are `advisory_task_avoided` (`router.ts:124`) and `stage_below_s2` (`:108`).
- `advisoryPackageEligible`/`eligibleEndpointCount` are produced (`router.ts:93-97`) and consumed
  (`index.ts:26682-26683`) but NOT declared on `RouteAdvisoryConsiderationOutcome` (`types.ts:268-285`).
- `recallTrackBDurableRouteAdvisory`'s doc comment claims family filtering its body does not perform
  (`track-b-runtime.ts:7602-7605` vs `:7615-7616`) - harmless (fails closed; the router gate enforces the family).

## Verification method

- Three analyst subagents ran read-only against the baseline worktrees, one per area; their reports are preserved
  verbatim in `evidence/phase1/` (area-a, area-b, area-c).
- The controller independently re-verified every load-bearing claim against the code before this artifact was written:
  the rollouts PK and `#rollout`/`#persistRollout`; `activatePack` keying and the cohort ladder; `promoteCandidate`'s
  single endpointId and `priority`; `recordLearning`'s immutability; the comparison-group columns, `group_json` keying
  and the absent group-level confidence; the closed pack contract and the `advisory_only` const; the absent
  `taxonomyVersion` in the schema; the cohort seed composition; the router's gate order and fallbacks; the advisory
  source's `limit: 1` single-endpoint read; the live wiring defaults; and the Packs page's row model and actions.
- One analyst self-corrected a false finding (an "inverted" rollback-button disabled check that is in fact correct);
  the retraction is recorded in the area-c report and the claim is NOT carried into this artifact.

## Source Requirement Inventory

Each source obligation from `00-requirements.md` (R1-R14) indexed against what the AS-IS found. `verdict` is what
the baseline actually satisfies today.

| R# | Obligation (short) | AS-IS verdict | Evidence |
| --- | --- | --- | --- |
| R1 | One pack per (roleId, taskTypeId), exact match, scope-wide packs do not exist | NOT SATISFIED - the rollout is keyed by the bare scopeId; the advisory layer carries no roleId; packs are scope-wide when the candidate lost role/task | `knowledge-store:136/:422`; `route-advisory-source.ts:145/:161`; `track-b-runtime.ts:7568`; area-c 1.3 |
| R2 | Ladder is a materialized derived snapshot rewritten on new evidence | NOT SATISFIED - packs carry one endpointId; `recordLearning` is immutable (no legal rewrite path) | `knowledge-worker:2545`; `knowledge-store:300/:307-309`; C1, C2 |
| R3 | Pairwise-to-total-order aggregation (weights, tie-break) | NOT PRESENT - no aggregation exists; comparison groups have no (role,task) key and no group-level confidence | `evaluation-core:3857-3879`; C3 |
| R4 | Rung status (user removal) separate from router eligibility | NOT PRESENT - no rung/status concept; eligibility is the router's `eligibleEndpointIds` gate | `router.ts:113-114`; C1 |
| R5 | advisory_only ladder walk producing the PREFERRED endpoint through the existing gates | PARTIAL - the gated re-rank exists and is unchanged by this run, but its input is ONE endpoint (no walk, no fall-through) | `router.ts:54/:1771/:1788`; `route-advisory-source.ts:237-252`; C12 |
| R6 | Immutable append-only pairwise record + net-new created_at | PARTIAL - the group is finalized once and conflicts are refused (`:3881-3884`), but there is NO time column and the listing keysets by group_id | `evaluation-core:1190/:3889/:4003/:4309-4317` |
| R7 | SQLite WAL storage keyed by (role_id, task_type_id) + completeness/nextEligibleAtMs/version/rolledBack | NOT SATISFIED - the rollout table PK is `scope_id` and the pack record is the closed contract body | `knowledge-store:136`; schema:471-473; C1, C6 |
| R8 | Depth-first dispatch filling one task's ladder; classification gate; 30d idle + challenge | PARTIAL - dispatch is live-request-driven and carries role/task (R22-B), but there is no ladder to fill, no per-task focus, no 30d idle, no challenge | `track-b-runtime.ts:11144/:11734/:11754-11761` |
| R9 | Derived floor-based activation (K + 0.7), no promote-then-activate | NOT SATISFIED - no K floor exists; the live path is an explicit promote-then-activate two-step gate | `learning-integrity.mjs:641-654`; `knowledge-store:431/:433-438`; C4, C8 |
| R10 | Per-task rollback flag (default OFF, ON pauses replay, reversible, reason kept) | NOT SATISFIED - rollback is scope-wide, receipt-bound, requires active state, and auto-fires from guardrails/kill switch | `knowledge-store:504-542/:602-612/:704-737`; C9 |
| R11 | Constants in product-defaults.json (minComparisons/minConfidence/stalenessWindowDays/challengeBatchSize) | NOT SATISFIED - `product-defaults.json` has no `routeLearning` key; the only 0.7 is a hardcoded, different-quantity gate | `learning-integrity.mjs:641-654`; area-b 1.13; C4 |
| R12 | Packs page ladder index (top-3, badge, completeness, per-row toggle, complete-first) | NOT SATISFIED - the page is a pack table with a single page-level rollback; nothing ranked or sorted | `learning.tsx:1364/:882-891/:1519-1527/:1507-1514`; area-c |
| R13 | Effect-first implementation with the pinned primitive map | NOT APPLICABLE (a constraint on the change, not a baseline property); the baseline ladder-adjacent code is plain `.mjs` extension code | requirements R13; RECURSIVE.md rule 6 |
| R14 | Pack lifecycle states observable (no ladder/partial/complete/rolled back; active derived) | NOT SATISFIED - the only observable state is the rollout's `disabled|active|rolled_back` plus the pack's own durable `state`, and the badge renders `active` vs raw state | `learning.tsx:879-881`; `knowledge-store:344-356` |
## Impact on the in-scope requirements

- R1, R2, R7, R9, R10, R11, R12, R14 are **not satisfied at all** by the baseline; each needs net-new code, not an
  adjustment. R5 and R8 are **partially** satisfied (the gate machinery and the live-request dispatch exist and are
  reused); R6 is partially satisfied (finalize-once semantics exist; the timestamp does not).
- The change surface the requirements name is correct but INCOMPLETE: the AS-IS found six additional sites that the
  code-site list does not mention - `knowledge-store`'s schema guard and PK (`:136`/`:140-142`), the immutable
  `recordLearning` write path (`:295-309`), the receipt's `scope.taskTypeId` misuse (`:370`), the durable advisory
  cache key (`track-b-runtime.ts:7568`), the comparison-group listing cursor (`evaluation-core:4309-4317`), and the
  canonical `route-learning-contracts.schema.json` (the pack body and `$defs.scope`).
- Four requirements need a DECISION the requirements doc does not yet make (C1/C2 storage shape, C3 the group->scope
  join, C5 the cohort-seed migration, C8/C9 the activate/rollback machinery disposition). Phase 2 must plan them;
  if the decision changes a requirement's meaning, a `00-requirements` addendum is required before Phase 2 locks.

## Coverage Gate

- [x] Every in-scope `R#` (R1-R14) is indexed in `## Source Requirement Inventory` with a verdict and evidence.
- [x] Every code site named in `00-requirements.md` (the change list) was inspected and its current behavior recorded.
- [x] Every load-bearing claim is re-verified first-hand by the controller (method recorded in `## Verification method`).
- [x] The prior recursive evidence covering the same subsystem was reread and recorded (`## Upstream artifacts and prior evidence reread`).
- [x] The delegation route was resolved against the router policy and its outcome recorded (`## Delegation record`).
- [x] The analyst reports are preserved verbatim under `evidence/phase1/`.
- [x] Findings that the requirements do not yet account for are recorded as explicit constraints (C1-C14) rather than silently planned.
- [x] One analyst's false finding was retracted and excluded (area-c correction).

## Approval Gate

- The AS-IS matches the baseline commits (public `701b8b8f`, private `c993b2f2`); all citations are file:line against
  those trees.
- It is evidence, not a plan: it states what IS, and hands C1-C14 to Phase 2 as decisions to make.
- Phase 2 can proceed: every R# has a verdict, every code site has recorded behavior, and the decisions that block
  planning are named explicitly.
- No production code was written and no test was run in this phase (read-only).
