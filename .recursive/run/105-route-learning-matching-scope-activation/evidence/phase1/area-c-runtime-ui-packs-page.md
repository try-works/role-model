# Run 105 Phase 1 (AS-IS) - AREA C: runtime-ui Packs page

Source: analyst subagent 264c1577-38ce-46cf-942b-d4b8e1315a1a (run-105 Phase 1, controller re-verified).
Baseline: public worktree 701b8b8f / private c993b2f2. READ-ONLY; nothing edited.
Paths: PUBLIC = role-model-router/apps/runtime-ui, PRIV = scripts/track-b (private).

## 1. Verified claims

### 1.1 LearningPacksPage - what a pack row renders today
Row component PUBLIC/app/routes/learning.tsx LearningPackRow (L737).
- Pack id abbreviated + scope line: L797-803 (shortLearningRef L282-287; "scope <scopeId>" L801-803)
- Scope resolution L760-772: roleId = declaredScope.roleId ?? recordScope.roleId (L760); taskTypeId L761;
  taxonomyVersion L762-763; scopeWide = declared.scopeWide === true || recordScope.scopeWide === true (L764);
  scopeLine = "scope-wide" | "role . task . taxonomy N" | NOT_REPORTED (L768-772)
- Replay models + score L805-811: <CandidateScoreLanes markWinner members={evidence.members} /> + "N decisive . holdout N";
  lanes L565-605 (per-member score or "excluded" L591, won mark L597)
- Pack model = record.scope.endpointId ?? declared.scope.endpointId (L780-788) + "routing target for ..." note;
  readback-winner disagreement L822-829
- Claim . evidence L840-877: claim prose, "delta N over baseline" L852-855, judge L862-871, receipt ref L872-877
- State L879-881: <Badge tone={active ? "success" : "neutral"}>{active ? "active" : show(row.state)}</Badge>;
  active = Boolean(activePackageId) && activePackageId === row.recordId (L759)
- Per-row action L882-891: Activate button disabled={busy || active || row.state !== "validated"}
- Headers L1496-1504 ["Pack . scope","Replay models . score","Pack model","Claim . evidence","State","Action"]; min-w 1060px L1487

### 1.2 Activate / rollback confirm flow (exact window.confirm texts)
- Activate L1382-1387: window.confirm("Activate <packId>? Cohort rollout starts at the first ladder step.")
  -> activateLearningPack({ scopeId, packId, policyGateId: "operator:ui", validationReceiptId }) L1389-1401;
  notice "Activation receipt written for <packId>." L1402
- Rollback (PAGE-LEVEL, not per row) L1408-1428: window.confirm("Roll the active pack back to the prior package?")
  L1411 -> rollbackLearningPack({ scopeId, reason: "operator_ui_rollback" }) L1415-1422 (NO packId).
  Button L1519-1527 disabled={rolloutValue.state !== "active"} - ENABLED exactly when a package is active; correct.
- Kill switch L1429-1468: "Engage the kill switch? ..." L1432; "Release the kill switch? ..." L1452-1453.
- Analyst self-correction (received after the first report): the earlier claim that the rollback button's disabled
  check was inverted is RETRACTED - it is correct behavior.

### 1.3 R22-B3 scope-wide note
learningPackScopeNote L542-552 counts scopeWide rows (L544-549) and returns L551:
  "<wide> of <rows.length> shown packs are scope-wide: they name only a routing target, so no role or task could be
   resolved for them from the pack, its validation receipt or its comparison. A pack promoted before the capture's
   declared role reached the learner is scope-wide this way."
Rendered above the table L1481; called L1380. Producer: PRIV/runtime-operations-server.mjs resolvePackScope L2213-2232
(record.scope -> validation-receipt familyEvidence -> comparison comparability; scopeWide L2230), applied to kind==="pack"
rows L2373-2385.

### 1.4 API surface the page reads
- fetchLearningRecords(fetch, token, { kind: "pack" }) L1366-1369 -> GET /api/role-model/operator/learning/records?kind=pack
  (learning-api.ts L172-184)
- fetchLearningRollout(fetch, token) L1370-1373 -> GET .../learning/rollout (learning-api.ts L156-170)
- Host-bridge wiring: index.ts L17405-17417 (records), L17391-17403 (rollout), L17582-17592 / L17593-17603 / L17644-17657
  (activate/rollback/kill-switch). Sidecar PRIV L3567-3569, HTTP L8229.
- Row payload = knowledge-store row (recordId, kind, state, scopeId, record) plus additive joins: evidence
  (comparison group + receipt join: verdict, validationRef, qualityDelta, claim, counts, effectiveCounts, floor,
  countsState, floorState) PRIV L2275-2312; resolved scope L2213-2232; top-level evidenceJoin L2360-2364.
  Join keys: recordJoinCandidateIds L2073-2081, recordJoinGroupIds L2093-2106; claim text L2180-2203.
- NO role/task names anywhere (grep roleName|taskName|resolveRole in learning.tsx = 0 hits); raw ids only
  (L760-772; decision rows learningTaskCell L464-488).
- NO ladder, rank, or per-pack endpoint ordering in the readback. The only ladder in the runtime is the policy percent
  ladder (PRIV shared/route-learning/rollout.mjs:9 [10,25,50,100]; nextRolloutStep L50-59) + the cohort-step dwell gate
  (PRIV L2617-2730). The advisory consumes exactly ONE endpoint: route-advisory-source.ts:161-201.

## 2. Discrepancies (doc claim vs code)

1. "Per-row two-way toggle" - no per-row rollback exists. Row action is Activate only (L882-891); rollback is one
   page-level button (L1519-1527) whose body carries no packId (L1415-1422).
2. "Active / Rolled back badge" - only active vs raw show(row.state) is rendered (L879-881); there is no rolled_back
   tone (verdictTone L554-559 has promoted/rejected/insufficient/neutral only). The rolled-back transition is surfaced
   only on the Overview from rollout receipts (L977), not on the Packs rows.
3. "Top-3 ranked endpoints / complete-first ordering" - nothing is ranked or sorted. Models column shows
   comparison-group members in readback order (L407-418) with at most one winner mark (L406); rows render in readback
   order (L1507-1514). No top-N trim, no completeness field.
4. "Ladder-index readback endpoint" - does not exist. No per-(roleId,taskTypeId) ladder is published to the UI.
5. Activate confirm copy hardcodes current semantics - "Cohort rollout starts at the first ladder step." (L1385).

## 3. What a ladder-index UI must ADD (closest current code)

1. Ranked (roleId,taskTypeId)-keyed rows in the readback - missing. Closest: resolvePackScope yields
   roleId/taskTypeId/taxonomyVersion (PRIV L2213-2232); attachRecordEvidence holds the per-member score index
   (evidenceIndex L2340-2372) - where top3Endpoints would be emitted. Route plumbing exists end-to-end
   (PRIV L8229, PUBLIC index.ts L17405).
2. "Rolled back" badge + tone - closest: the active/neutral Badge L879-881 and verdictTone L554-559.
3. Completeness / top-3 progress - closest pattern: formatLearningFloorProgress ("2 / 3 decisive . 1.8 effective")
   learning-visuals.ts:358, rendered in the counts cell L806-811.
4. Per-row two-way toggle - closest: per-row Activate L882-891 (activate body L1389-1398 is the template); the
   page-level rollback body L1415-1422 is the existing rollback call (needs packId/cohort semantics - a stage-3 decision).
5. Complete-first ordering - insert a sort in LearningPacksPage before rows.map (L1507); no comparator exists.
6. Role / task names - new plumbing; only raw ids exist (L760-772, learningTaskCell L464-488).
7. Row model - a ladder-index row (endpoints, not packs) is a NEW table/panel: LearningPackRow is pack-gated
   (row.state !== "validated" disables Activate, L885) and cannot express ranked endpoints.
8. Tests to touch - learning.test.tsx LearningPackRow fixtures (L399+, L826+ scope-wide), learning-api.test.ts rollout
   fixture {state:"active", activePackageId:"pack-retry"} (L169), host-bridge run99-r28-externalized-readback.test.ts (L47).

## 4. Unverified (time-boxed)
- The pack durable record's internal candidate shape (knowledge:promote-candidate producer) - only the invocation side
  is visible: track-b-learning-pass.ts:1810-1849.
- Whether a rolled-back pack's durable state string is literally "rolled_back" (drives show(row.state) L880).
- The doc's own wording of the confirm texts and ladder fields (compare against the excerpts above).
