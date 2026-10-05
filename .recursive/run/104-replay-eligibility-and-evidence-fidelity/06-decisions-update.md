Run: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/`
Phase: `06 Decisions update`
Status: `LOCKED`
LockedAt: `2026-10-01T17:30:42Z`
LockHash: `1ba1d1a105be676ccb2a8b34f23f01c7593052d6c83bd5688a72c15b5229bb27`
Inputs:
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/05-manual-qa.md` (LOCKED)
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/04-test-summary.md` (LOCKED)
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/03-implementation-summary.md` (LOCKED)
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/addenda/04-test-summary.upstream-gap.02-to-be-plan.addendum-01.md` (LOCKED)
- `/.recursive/DECISIONS.md`
Outputs:
- `/.recursive/DECISIONS.md` (run-104 entry appended)
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/06-decisions-update.md`
Scope note: The durable decisions this run changes, and the two it explicitly declines to close.

## TODO

- [x] Read the locked Phase 5 record and the addendum it rests on
- [x] Append the run-104 decision entry
- [x] Record the declined decisions with their rationale
- [x] Lock this artifact

## Decisions Changes Applied

Appended `### Run 104: replay eligibility, evidence fidelity and the traffic-class typing` to
`/.recursive/DECISIONS.md`. It records six decisions:

1. **Named replay refusals replace the generic deferral.** `candidate_input_unsupported` carries the blocking
   modality or capability and the rejected endpoint ids; it is terminal when the declared pool can never serve
   the capture and deferrable when a capable arm is merely unavailable.
2. **Traffic classes are typed and the operator's aggregates are live-only.** The vocabulary is
   `live | replay | evaluation | benchmark | probe | unknown` (with the legacy `live_request` still read), and the
   aggregates publish the excluded count and its classes.
3. **The live stall's cause is decided.** The packaged launcher never supplied `handoffEvaluation`, and the
   completion contract demanded every trial be covered by a finalized group although train-partition trials are
   structurally ineligible.
4. **The append recovery re-attaches from the boundary's own field, and refuses a saturated excerpt.** A 2 KiB
   projection is not the provider's output.
5. **Arm effort comparability is a first-class dimension**, with the public producer plumbing explicitly left
   unwired and carried as a deferred acceptance.
6. **Effect is used where it fits**: `Match.exhaustive` for the total traffic-class mapper and
   `ManagedRuntime`/`Effect.gen` for the private handoff; no dependency changed.

## Rationale

- Decisions 1-4 and 6 are consequences of verified behaviour: each has a RED/GREEN pair and a Phase 5 or
  Phase 4 execution behind it, so they are statements about what the runtime now does.
- Decision 5 is deliberately **negative**: the run implemented the producer, the dimension and the private
  exclusion, but the link that would let a live comparison carry the dimension is not wired. Recording that as a
  decision (rather than leaving it implicit) is what stops a later reader from assuming the exclusion is live.
- The Phase 5 limitation is recorded in the same entry rather than in the phase artifact alone, because it
  changes what a reader of `DECISIONS.md` should believe about the replay lane's expiry behaviour on a fresh
  state root.

## Resulting Decision Entry

The appended entry quoted in `## Decisions Changes Applied` is the resulting entry verbatim; it is dated
`2026-10-02` and sits after the run-103 delivery entry so the file stays in run order.

## Traceability

- Decision 1 -> `R2` -> `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/04-test-summary.md`
- Decision 2 -> `R14` -> `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/05-manual-qa.md` scenario 6
- Decision 3 -> `R8` -> `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/04-test-summary.md`
- Decision 4 -> `R8` -> `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/03.5-code-review.md` F1
- Decision 5 -> `R9` -> `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/addenda/04-test-summary.upstream-gap.02-to-be-plan.addendum-01.md`
- Decision 6 -> `R15` -> `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/04-test-summary.md`
- `R1` -> decision 1's eligibility half -> `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/04-test-summary.md`
- `R3`/`R4`/`R5` -> the catalog lineage and drift guard are unchanged decisions; their evidence is Phase 4 and Phase 5 scenario 2/3
- `R6`/`R7` -> the taxonomy and promotion-floor changes are implementation details of decision 2's reporting surface; no new durable decision
- `R10` -> the contribution retry and the listing reuse are recorded in the Phase 3 summary, not as standalone decisions
- `R11` -> the private conformance wiring is a repair, not a decision
- `R12` -> strict TDD is the run's standing rule; no new decision
- `R13` -> the Phase 5 execution is recorded as evidence, not as a decision

## Worktree Diff Audit

- Baseline type: `remote ref`
- Baseline reference: `84d5996cb156217d37801943831762bc734ae21f`
- Comparison reference: `working-tree`
- Normalized baseline: `84d5996cb156217d37801943831762bc734ae21f`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 84d5996cb156217d37801943831762bc734ae21f`
- Private baseline: `5df90b6d12772f70bbdaff543b183fc5d312537b`
- Actual changed files reviewed: this phase's own durable change is `.recursive/DECISIONS.md`; the product diff it reasons about is enumerated below
- Product changed files (public, the run's full diff):
- `role-model-router/apps/runtime-host-bridge/src/cli.ts`
- `role-model-router/apps/runtime-host-bridge/src/finalized-group-listing-cache.ts`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/src/supervised-replay-evaluation-resume.ts`
- `role-model-router/apps/runtime-host-bridge/src/track-b-auto-replay.ts`
- `role-model-router/apps/runtime-host-bridge/src/track-b-operations.ts`
- `role-model-router/apps/runtime-host-bridge/src/track-b-replay-policy.ts`
- `role-model-router/apps/runtime-host-bridge/src/track-b-runtime.ts`
- `role-model-router/apps/runtime-host-bridge/src/traffic-class.ts`
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/run104-advisory-classification-variant.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/run104-branch-append-recovery.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/run104-sp1-dispatch-subset.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/run104-sp1-replay-eligibility.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/run104-sp2-refusal-semantics.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/run104-sp4-taxonomy-fallback.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/run104-sp6-arm-comparability.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/run104-sp7-contribution-budget.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/run104-sp7-finalized-listing-cache.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/run104-traffic-class-filter.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/run104-traffic-class.test.ts`
- `role-model-router/apps/runtime-ui/app/components/app-shell.test.ts`
- `role-model-router/apps/runtime-ui/app/components/app-shell.tsx`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
- `role-model-router/apps/runtime-ui/app/lib/sidebar-footer.test.ts`
- `role-model-router/apps/runtime-ui/app/lib/sidebar-footer.ts`
- `role-model-router/apps/runtime-ui/app/lib/view-models.test.ts`
- `role-model-router/apps/runtime-ui/app/lib/view-models.ts`
- `role-model-router/apps/runtime-ui/app/routes/learning-floor-progress.test.tsx`
- `role-model-router/apps/runtime-ui/app/routes/learning-task-family.test.tsx`
- `role-model-router/apps/runtime-ui/app/routes/learning.tsx`
- `role-model-router/packages/catalog/data/normalized-catalog.json`
- `role-model-router/packages/catalog/src/index.ts`
- `role-model-router/packages/catalog/src/refresh.ts`
- `role-model-router/packages/catalog/test/run104-alias-lineage.test.ts`
- `role-model-router/packages/profile-aggregator/src/index.ts`
- `role-model-router/packages/profile-aggregator/test/run104-traffic-class-source.test.ts`
- `role-model-router/packages/runtime-observability/src/index.ts`
- `role-model-router/packages/runtime-observability/test/index.test.ts`
- `role-model-router/packages/runtime-observability/test/run104-traffic-class.test.ts`
- `role-model-router/packages/sqlite-memory/src/index.ts`
- `role-model-router/packages/sqlite-memory/test/index.test.ts`
- `role-model-router/packages/sqlite-memory/test/run104-live-only-summary.test.ts`
- `role-model-router/packages/sqlite-memory/test/run104-traffic-class-aggregate.test.ts`
- `role-model-router/packages/ui/src/sidebar.test.ts`
- `role-model-router/packages/ui/src/sidebar.tsx`
- `testdata/catalog/models-dev-local-overrides.json`
- `testdata/catalog/models-dev-local-supplement.json`
- `testdata/catalog/models-dev-snapshot.json`
- This phase's durable file changes:
- .recursive/DECISIONS.md
- Run-folder additions for this phase: this artifact
  file changes in this phase; the product diff it reasons about is the one recorded in
  `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/03-implementation-summary.md`

## Coverage Gate

- [x] Every in-scope requirement's outcome is reflected in the entry
- [x] The two non-closed criteria are recorded as deferred, not as decisions that passed
- [x] No decision contradicts a locked artifact

Coverage: PASS

## Effective Inputs Re-read

- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/00-requirements.md`
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/02-to-be-plan.md`
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/03-implementation-summary.md`
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/04-test-summary.md`
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/05-manual-qa.md`
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/addenda/04-test-summary.upstream-gap.02-to-be-plan.addendum-01.md`

## Earlier Phase Reconciliation

- `05-manual-qa.md`: every decision above is either a Phase 5 outcome (1-4, 6) or the Phase 5 limitation the
  addendum carries (5). Nothing in this entry claims more than Phase 5 observed.
- `04-test-summary.md`: the deferred requirements it recorded are the ones decision 5 and the entry's final
  paragraph describe as still open; no status changed here.
- `03-implementation-summary.md` / `03.5-code-review.md`: the repairs those phases locked are stated as decisions
  only where they change durable behaviour (the recovery refusal, the refusal vocabulary).
- `02-to-be-plan.md`: the plan's `T6.1` asked for a decisions update; this artifact is that update and adds no
  step to the plan.

## Subagent Contribution Verification

Reviewed Action Records: none for this phase - it was executed by the controller and rests on the already-accepted records for Phase 3.5 (`/.recursive/run/104-replay-eligibility-and-evidence-fidelity/03.5-code-review.md`) and Phase 4 (`/.recursive/run/104-replay-eligibility-and-evidence-fidelity/04-test-summary.md`), which name their own action records

Main-Agent Verification Performed: this phase was executed by the controller and rests on the two delegated records above; the controller re-read `/.recursive/DECISIONS.md` before appending, confirmed the append did not alter any earlier entry, and cross-checked each decision against the locked phase artifacts `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/04-test-summary.md` and `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/05-manual-qa.md` rather than against its own recollection.

Acceptance Decision: accepted

Refresh Handling: no refresh was required; the run folder's earlier artifacts were already locked when this phase ran, and the append is the only change to a durable file.

Repair Performed After Verification: no defect was found while producing this update, so no repair followed it. The only durable change is the appended entry in `/.recursive/DECISIONS.md`.

## Audit Context

Subagent Capability Probe: this phase needed no delegation; the controller executed it directly
Subagent Availability: available
Delegation Override Reason: the plan's `T6.1` is a controller write to `/.recursive/DECISIONS.md`; delegation would have added no independent verification
Audit Execution Mode: self-audit
Delegation Decision Basis: the entry is a restatement of locked artifacts, so the controller's verification is a cross-check against those artifacts rather than against a delegate's claims
Audit Inputs Provided:
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/05-manual-qa.md` (LOCKED)
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/04-test-summary.md` (LOCKED)
- `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/03-implementation-summary.md` (LOCKED)
- `/.recursive/DECISIONS.md`

## Audit Verdict

Audit: PASS

The appended entry states only what the locked artifacts prove, the two open requirements are recorded as
deferred rather than as decisions that passed, and no earlier decision was altered.

## Requirement Completion Status

- R1 | Status: verified | Changed Files: `role-model-router/apps/runtime-host-bridge/src/track-b-replay-policy.ts` | Implementation Evidence: `role-model-router/apps/runtime-host-bridge/src/track-b-replay-policy.ts` | Verification Evidence: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/logs/green/sp1fix-dispatch-subset-green.txt` | Audit Note: unchanged from Phase 4
- R2 | Status: verified | Changed Files: `role-model-router/apps/runtime-host-bridge/src/track-b-replay-policy.ts` | Implementation Evidence: `role-model-router/apps/runtime-host-bridge/src/track-b-replay-policy.ts` | Verification Evidence: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/logs/green/repair-green.txt` | Audit Note: decision 1
- R3 | Status: verified | Changed Files: `role-model-router/packages/catalog/src/index.ts` | Implementation Evidence: `role-model-router/packages/catalog/src/index.ts` | Verification Evidence: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/logs/phase5/t5-matrix-image-difficulty-remote-only.txt` | Audit Note: unchanged from Phase 5
- R4 | Status: verified | Changed Files: `role-model-router/packages/catalog/src/index.ts` | Implementation Evidence: `role-model-router/packages/catalog/src/index.ts` | Verification Evidence: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/logs/green/p4-catalog.txt` | Audit Note: unchanged
- R5 | Status: verified | Changed Files: `role-model-router/packages/catalog/src/index.ts` | Implementation Evidence: `role-model-router/packages/catalog/src/index.ts` | Verification Evidence: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/logs/phase5/t5-matrix-pdf-baseline-remote-only.txt` | Audit Note: unchanged
- R6 | Status: verified | Changed Files: `role-model-router/apps/runtime-host-bridge/src/index.ts` | Implementation Evidence: `role-model-router/apps/runtime-host-bridge/src/index.ts` | Verification Evidence: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/logs/green/sp4-green.txt` | Audit Note: unchanged
- R7 | Status: verified | Changed Files: `role-model-router/apps/runtime-ui/app/routes/learning.tsx` | Implementation Evidence: `role-model-router/apps/runtime-ui/app/routes/learning.tsx` | Verification Evidence: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/logs/green/sp5-ui-green.txt` | Audit Note: unchanged
- R8 | Status: deferred | Rationale: the live drain needs a route package on the channel; the in-suite half is verified | Deferred By: the operator's stage channel | Addendum: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/addenda/04-test-summary.upstream-gap.02-to-be-plan.addendum-01.md` | Audit Note: decision 3 records the cause
- R9 | Status: deferred | Rationale: the producer plumbing is unwired so the exclusion cannot fire live | Deferred By: a follow-up run | Addendum: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/addenda/04-test-summary.upstream-gap.02-to-be-plan.addendum-01.md` | Audit Note: decision 5 records it
- R10 | Status: verified | Changed Files: `role-model-router/apps/runtime-host-bridge/src/track-b-operations.ts` | Implementation Evidence: `role-model-router/apps/runtime-host-bridge/src/track-b-operations.ts` | Verification Evidence: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/logs/phase5/t5-monitor-window.log` | Audit Note: unchanged
- R11 | Status: verified | Changed Files: `role-model-router/apps/runtime-host-bridge/src/track-b-runtime.ts` | Implementation Evidence: `role-model-router/apps/runtime-host-bridge/src/track-b-runtime.ts` | Verification Evidence: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/logs/green/sp8-focused-and-r33-green.txt` | Audit Note: unchanged
- R12 | Status: verified | Changed Files: `role-model-router/apps/runtime-host-bridge/src/traffic-class.ts` | Implementation Evidence: `role-model-router/apps/runtime-host-bridge/src/traffic-class.ts` | Verification Evidence: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/logs/green/repair-suite.txt` | Audit Note: unchanged
- R13 | Status: verified | Changed Files: `role-model-router/apps/runtime-host-bridge/src/cli.ts` | Implementation Evidence: `role-model-router/apps/runtime-host-bridge/src/cli.ts` | Verification Evidence: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/logs/phase5/t5-monitor-window.log` | Audit Note: unchanged from Phase 5
- R14 | Status: verified | Changed Files: `role-model-router/packages/sqlite-memory/src/index.ts` | Implementation Evidence: `role-model-router/packages/sqlite-memory/src/index.ts` | Verification Evidence: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/logs/phase5/t5-per-request.txt` | Audit Note: decision 2
- R15 | Status: verified | Changed Files: `role-model-router/apps/runtime-host-bridge/src/traffic-class.ts` | Implementation Evidence: `role-model-router/apps/runtime-host-bridge/src/traffic-class.ts` | Verification Evidence: `/.recursive/run/104-replay-eligibility-and-evidence-fidelity/evidence/other/sp4-tester-audit-findings.md` | Audit Note: decision 6

## Gaps Found

None unresolved **for this phase**: every requirement's outcome is stated in the appended entry, and the two open
ones are carried by the locked addendum
`/.recursive/run/104-replay-eligibility-and-evidence-fidelity/addenda/04-test-summary.upstream-gap.02-to-be-plan.addendum-01.md`
rather than left implicit in `DECISIONS.md`.

## Repair Work Performed

None in this phase. The only durable change is the appended entry; no earlier decision was edited.

## Approval Gate

- [x] The entry is appended, not rewriting history
- [x] The declined decisions carry their rationale

Approval: PASS
