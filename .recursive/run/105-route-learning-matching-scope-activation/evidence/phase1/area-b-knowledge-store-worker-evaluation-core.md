# Run 105 Phase 1 (AS-IS) - AREA B: knowledge-store + knowledge-worker + evaluation-core

Source: analyst subagent 93a70ac1-706e-4753-bfb9-3c94b4dcdc8f (run-105 Phase 1, controller re-verified).
Baseline: private worktree c993b2f2 / public 701b8b8f. READ-ONLY.

## 1. Verified claims

### 1.1 knowledge_route_rollouts - scope_id PRIMARY KEY, no role/task
extensions/knowledge-store/index.mjs:136
    CREATE TABLE IF NOT EXISTS knowledge_route_rollouts (scope_id TEXT PRIMARY KEY,state_json TEXT NOT NULL,updated_at_ms INTEGER NOT NULL);
- :338-341 #rollout(scopeId) SELECT state_json FROM knowledge_route_rollouts WHERE scope_id=?
- :359-363 #persistRollout INSERT OR REPLACE INTO knowledge_route_rollouts VALUES (?,?,?)
CONFIRMED: one activePackageId per runtime scopeId; no roleId/taskTypeId column, join, index or filter.

### 1.2 state_json body
knowledge-store/index.mjs:344-356 (absent-row default = exact shape): scopeId, state "disabled",
activePackageId null, priorPackageId null, cohortStep 0, cohortPercent 0, ladder [...ROLLOUT_LADDER_DEFAULT],
validationReceiptId null, rolledBackWithValidationReceiptId null, killSwitchAtMs null, updatedAtMs 0.
NOTE: the field named "ladder" is the COHORT exposure ladder:
shared/route-learning/rollout.mjs:9 ROLLOUT_LADDER_DEFAULT = Object.freeze([10, 25, 50, 100]);
Controller re-verified: rollout.mjs:42 seeds the bucket with scopeId NUL channel NUL decisionSeed.

### 1.3 activatePack(input) keys by scopeId; cohort ladder, not endpoint ladder
knowledge-store/index.mjs:422-440 activatePack: scopeId = boundedString(input.scopeId); rollout = #rollout(scopeId);
ladder = normalizeRolloutLadder(input.ladder ?? rollout.ladder); :463-467 nextRolloutStep; :476-487 writes
state active + activePackageId + cohortStep/cohortPercent/ladder/validationReceiptId; :500 returns
route-package-activation.v1 receipt + rollout.

### 1.4 The activation receipt maps scopeId into scope.taskTypeId
knowledge-store/index.mjs:370 scope: { taskTypeId: input.scopeId } - the receipt's scope.taskTypeId carries the
bare scopeId. Also :373 validationReceiptId, :376 rolledBackAt.

### 1.5 rollback / rollbackTargetPackId path
- rollbackPack :504-542; requires active :509-511; :513-521 state "rolled_back", activePackageId null,
  cohortStep 0, rolledBackWithValidationReceiptId; :538 restoredPackageId priorPackageId ?? "baseline:route-package".
- rollbackTargetPackId is read in ONE place (:471-474) as the fallback prior-package STRING. No rollback-target
  table, no per-rung fallback - one string.
- Re-activation guard :468-470 (same validation receipt refused). Auto-rollback on guardrail breach :602-612.
  Kill switch :704-737 resets cohortStep/cohortPercent to 0.

### 1.6 promoteCandidate stamps ONE scope.endpointId and priority "advisory_only"
knowledge-worker/index.mjs:2540-2575: packCandidate { contract PACK_CANDIDATE_CONTRACT (ExperiencePackCandidateV1,
:106), packId, version, scope { endpointId: candidate.scope?.routePackage (:2545), ...taskTypeId (:2548-2550),
...taxonomyVersion (:2551-2553), ...roleId (:2560-2562) }, experienceIds [candidate.id], maxTokens, placement,
priority "advisory_only" (:2567), status "validated", validationReceiptId, rollbackTargetPackId, createdAt,
runtimeChannel, scopeId, boundaryProtocolVersion }.
Version/append: :2538 version = packs.length + 1; :2583 slice(-MAX_PACK_CANDIDATES) (cap 32 at :120).
Return shape is singular :2589.

### 1.7 candidate_json.packCandidates = append-only history of SINGLE-endpoint packs
:1219 field list; one promoteCandidate call appends one element (:2583).
=> "packCandidates" (plural) is per-candidate promotion history, NOT a ranked endpoint list.

### 1.8 Candidate scope already carries roleId / taskTypeId / taxonomyVersion
knowledge-worker/index.mjs:1741-1757 (LearnedExperienceCandidateV1 scope): endpointId := routePackage (:1745),
taskTypeId (:1746), taxonomyVersion (:1753), roleId (:1756). derivedRoleId :1735-1740.
=> role/task plumbing EXISTS; the KEYING and the ranked body are what is missing.

### 1.9 Pack persistence: learning_records kind='pack'
- Allowlist :28 LEARNING_RECORD_KINDS = candidate | pack | validation_receipt
- Table :135 knowledge_learning_records (record_id PK, kind, state, scope_id, record_json, at_ms) + identity_json :150-153
- Writer recordLearning :259-312; record_json canonical (:266-268); 16384 B bound (:27,:268); 10000 rows/scope (:26,:304-306)
- IMMUTABILITY: :295-300 identical content is idempotent, else throw "immutable learning record conflict";
  :307-309 is INSERT-only. There is NO update path.
- Stored shape = exactly the packCandidate object (test proof: tests/track-b/run98-r03-validation-receipts.test.mjs:415)
- The store does NOT validate record_json against route-learning-contracts.schema.json (allowlist + bounds only).

### 1.10 evaluation_comparison_groups has NO created_at / time column
extensions/evaluation-core/index.mjs:1190
    CREATE TABLE IF NOT EXISTS evaluation_comparison_groups (group_id TEXT PRIMARY KEY, status TEXT NOT NULL, group_json TEXT NOT NULL, result_json TEXT NOT NULL);
Writes :3889 (finalized) and :4003 (rejected) INSERT ... VALUES (?,?,?,?). Read :4016. Listing :4309-4317 pages by
group_id keyset cursor - no time ordering available. Adjacent tables DO carry time (:1192 evaluation_holdouts.created_at,
:1194 evaluation_degradation_receipts.recorded_at). Additive-migration precedent :1198-1211.

### 1.11 group_json / result_json contents
group_json (:3857-3863): { groupId, trialIds[], comparability { taskRef, inputRef, forkRef, policyId,
scorerSetVersion, toolPolicyDigest, environmentDigest }, referenceProofs?, holdout { holdoutId, membershipDigest, partition } }
result_json (:3864-3879): { ...group, status finalized, outcome, outcomeReason?, winnerTrialId?, winnerRole?,
scorerDisagreement, primaryMetric?, judgeProvenance?, developmentPartition?, validityIssues?, scorerOutcomes, members }
- winner :3820-3832; outcome enum :3833-3840 insufficient|source|candidate|disagreement|tie
- per-scorer outcomes :3801-3809; disagreement :3811
- NO group-level confidence field; per-score confidence persisted :2925/:2943, averaged per member :3799
- effortComparability lives INSIDE comparability, read only for exclusion :3770-3774 -> validityIssues arm_effort_mismatch

### 1.12 minConfidence 0.7 - exact line, what it gates, count floors
extensions/evaluation-core/learning-integrity.mjs:641-654 DEFAULT_GATE_THRESHOLDS { minSupport: 3, minConfidence: 0.7, ... }
Gate :690 if (confidence < limit.minConfidence) failures.push("low_confidence"); sibling :689 insufficient_support.
Gates evaluateLearningGates (:657) -> decideLearningRoute (:730) for advisory-considered/applied (:760-761);
failure => fallback:true (:721) and baseline retained (:763,:776-786). Capability evaluation:decide-learning-route.
The compared "confidence" is the CALLER-SUPPLIED metrics.confidence of a signed recommendation (:676) - NOT the
comparison group's judge confidence.
Count floor today: only lineages - :465 assessLearningEvidence({rows, minSupport=3}) and :500 families.size < minSupport.
CONFIRMED: NO K-comparison floor and NO mean-confidence-over-group floor
(grep minComparisons|comparisonCount|minComparisonGroups across the worktree: 0 hits).

### 1.13 Doc claims that check out
- design doc :35 (one activePackageId per scope_id, not per (role,task)); :38-39 (single endpointId, no fallback)
- :216-219 hardcoded minConfidence 0.7 in learning-integrity.mjs - CONFIRMED :643
- product-defaults.json exists (fixtures/.../guidance/product-defaults.json, 17919 bytes) with NO routeLearning key
  (0 matches) - CONFIRMED net-new.

## 2. Discrepancies (doc vs code)

D1. "The pack IS the ladder" vs the closed single-endpoint contract. Today's pack is the canonical
ExperiencePackCandidateV1: route-learning-contracts.schema.json:471-473 "additionalProperties": false, required
:474-488, and :523-525 "priority": { "const": "advisory_only" }. No ladder/completeness/nextEligibleAtMs/rolledBack
fields. Extending the body means extending the canonical schema OR storing the ladder outside the contract.
Controller re-verified: :473 additionalProperties false, :524 const advisory_only.

D2. "Rewrite the ladder whenever new evidence arrives" vs record immutability. knowledge-store:300 refuses a changed
record under the same record_id and :307-309 is INSERT-only. A rewrite needs versioned record_ids (+ max-version
lookup) or a new mutable table - neither is in the storage plan.

D3. "The existing 0.7 becomes a product-defaults value" is a REPURPOSING. learning-integrity.mjs:643/:690 gates the
caller-supplied confidence of a signed recommendation. The doc's admission floor is "at least K finalized
effort-comparable comparisons and mean confidence >= 0.7 over its OWN finalized comparisons" - the mean of per-score
confidence values (index.mjs:2886, averaged :3799). Different quantity, different source.

D4. No K-comparison floor exists. The only count gates are minSupport=3 (:642/:689) and families.size (:465/:500).

D5. "activatePack: key the rollout by (roleId, taskTypeId)" understates the work. The store takes ONE opaque string
(:423) and the receipt already misuses scope.taskTypeId for it (:370). A composite key changes the table PK, the
receipt contract, AND the cohort seed: rollout.mjs:42 seeds the bucket with scopeId + NUL + channel + NUL +
decisionSeed, so changing the key string recomputes every existing decision's bucket.
Controller re-verified: rollout.mjs:42.

D6. Name collision: doc "ladder" (endpoint ranking) vs the existing COHORT ladder (index.mjs:351/:440/:463;
rollout.mjs:9 [10,25,50,100]). activatePack even accepts input.ladder meaning cohort percentages (:440).

D7. taxonomyVersion is not in the canonical scope. The worker writes scope.taxonomyVersion (knowledge-worker:2551-2553;
candidate :1753) and the doc wants it carried, but $defs.scope at route-learning-contracts.schema.json:42-75 is
"additionalProperties": false without taxonomyVersion.
Controller re-verified: taxonomyVersion has 0 occurrences in that schema file.

D8. "There is no separate promote-then-activate step" vs the live two-step gate: promoteCandidate -> status
"validated" -> activatePack requires pack.state "validated" (:431) AND a validation_receipt with state "validate"
(:433-438). Removing the step makes :427-438 and :468-470 dead code to delete or repurpose.

D9. Adding created_at is not sufficient for a date-ordered history: the only listing (:4309-4317) orders and cursors
by group_id, so the sweep ORDER BY + cursor must change too.

D10. The group has no (role, task) key, yet the doc says the ladder aggregates "the finalized pairwise comparison
groups for a (role, task)". group_json's comparability (:3860) has taskRef (an artifact ref) and no roleId; endpoint
identities live on the job (sourceCandidateRef/counterfactualCandidateRef, read :3951-3952). The candidate->group
join is done OUTSIDE evaluation-core (knowledge-worker:1344-1359; runtime-operations-server.mjs:1968).
Controller re-verified: group_json :3857-3863 carries comparability with taskRef, no roleId/taskTypeId key.

## 3. What the stage-3 run must change (each site cited)

S1. knowledge-store/index.mjs:136 - PK scope_id -> composite (role_id, task_type_id), or a new ladder table. Touches
:338-363 (#rollout/#persistRollout) and every scopeId accessor (:407, :422, :504, :545, :642, :704/:745, :391).
CAUTION: the schema guard (:14/:140-142, SCHEMA_VERSION role-model.knowledge-store.v1, throws on mismatch) means a
non-additive change bricks existing stores - use the additive pattern at :143-153.
S2. knowledge-store/index.mjs:370 - receipt scope must become the real (roleId, taskTypeId); decide whether
RoutePackageActivationReceiptV1 gains a roleId (contract const :30).
S3. knowledge-store/index.mjs:427-438 + :468-470 - the promote-then-activate machinery the doc removes; the cohort
ladder :440/:463-467 becomes orthogonal to a materialized endpoint ladder.
S4. knowledge-store/index.mjs:259-312 - immutability guard :295-300 + INSERT-only :307-309 must be reconciled with a
rewritten ladder (versioned record ids + max-version lookup, or a new mutable table). Bounds 16384 B :27, 10000/scope :26.
S5. knowledge-worker/index.mjs:2540-2575 - replace single scope.endpointId (:2545) with the ranked rung body; KEEP
priority "advisory_only" (:2567). Aggregation source: evaluation-core:3801-3840 + the candidate->group join
knowledge-worker:1344-1359.
S6. knowledge-worker/index.mjs:2538/:2583 - the append-packCandidates model must become one rewritten pack per (role, task).
S7. evaluation-core/index.mjs:1190 - ADD created_at (additive pattern :1198-1211); update BOTH INSERT sites :3889/:4003
(4 placeholders) and the listing ORDER BY/keyset cursor :4309-4317.
S8. Admission floor (K comparisons + mean confidence >= 0.7) has NO home today: add it where the ladder is built
(knowledge-worker) and read thresholds from a new product-defaults routeLearning block. Do NOT conflate it with
DEFAULT_GATE_THRESHOLDS (learning-integrity.mjs:641-654).
S9. Rollback: the per-(role,task) boolean rolledBack { on, reason, atMs } does not exist. Today rollbackPack (:504-542)
is receipt-bound, requires state "active" (:509), and auto-fires from guardrail breaches (:602-612) and the scope-wide
kill switch (:704-737). The toggle's interaction with all three must be defined; :468-470 as-is would refuse a toggle
flipped ON then OFF without a new receipt.
S10. Namespace the endpoint ladder apart from the cohort ladder (knowledge-store:351/:440; rollout.mjs:9) and decide
whether activatePack's input.ladder is still meaningful.
S11. Resolve the taxonomyVersion contract gap (D7): add it to $defs.scope or drop it from the pack scope.
S12. PUBLIC core/src/router.ts:54 + call site :1771 - the single-preferred-endpoint entry point the ladder walk
replaces (Area A detail; boundary only here).

## 4. Unverified / not checked (time-box)
- The host-side pack->store write path and the sweep that supplies scopeId to activatePack
  (PUBLIC: track-b-learning-pass.ts:844, cli.ts:6213-6242, track-b-operations.ts:2042).
- Whether evaluation-core enforces a schema-version guard comparable to knowledge-store's :140-142.
- The runtime-ui Packs page changes - out of Area B.
- Whether any runtime path validates pack records against route-learning-contracts.schema.json.
