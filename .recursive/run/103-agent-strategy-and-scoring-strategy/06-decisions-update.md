Run: `/.recursive/run/103-agent-strategy-and-scoring-strategy/`
Phase: `06 Decisions Update`
Status: `LOCKED`
LockedAt: `2026-09-30T20:35:36Z`
LockHash: `cf947a3fb520686a566145e4910d02adca7052dc0eb66170baed7a2196ff607f`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/00-requirements.md` (LOCKED)
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/03-implementation-summary.md` (LOCKED)
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/03.5-code-review.md` (LOCKED)
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/04-test-summary.md` (LOCKED)
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/05-manual-qa.md` (LOCKED)
Outputs:
- `/.recursive/run/103-agent-strategy-and-scoring-strategy/06-decisions-update.md`
- `/.recursive/DECISIONS.md`
Scope note: Records the durable decision this run adds, the two carried commitments and the coverage follow-ups.

## TODO

- [x] Record the run-103 decision in `.recursive/DECISIONS.md` and the run index
- [x] Record the R7 paired-registry release dependency and the R9 decoder deviation
- [x] Record the coverage follow-ups for a later run
- [x] Complete the audited-phase sections and gates

## Decisions Changes Applied

- `/.recursive/DECISIONS.md`: the run index gains a `103-agent-strategy-and-scoring-strategy` entry, and a
  `## Run: 103-agent-strategy-and-scoring-strategy` decision records the two-axis posture, the precedence
  ladder, the pin semantics, the agent-strategy/workload alias rules, the decision receipts, the latency
  override, the operator surfaces, the carried commitments and the promotion boundary.

## Rationale

- The decision is the contract the runtime, the UI and downstream clients now share: without it the next run
  would have to re-derive the precedence order, the pin semantics and the alias naming rules from the code.
- The two carried commitments are recorded here rather than in the phase artifacts alone because a release
  operation reads `DECISIONS.md`, and the R7 private-registry update must land before a stage promotion that
  ships this run.

## Resulting Decision Entry

- `/.recursive/DECISIONS.md` -> `## Run: 103-agent-strategy-and-scoring-strategy` (decision, why, evidence,
  carried commitments, promotion boundary).

## Audit Context

- Audit Execution Mode: self-audit
- Subagent Availability: available
- Subagent Capability Probe: the phase's work is a durable-memory edit verified against the locked artifacts; the delegated memory-auditor for Phase 8 (`sp8_memory_audit`) reviews the memory impact of the same diff and its findings are referenced here.
- Delegation Decision Basis: the decision entry restates contracts the two reviews and the phase artifacts already verified; delegating it would duplicate work the controller must do anyway to keep the wording consistent with the locked artifacts.
- Delegation Override Reason: the decision text is a restatement of the locked artifacts, so the controller wrote it and verified it against `00-requirements.md` and the locked phase artifacts; the independent check is Phase 8's memory audit, whose findings file is `/.recursive/run/103-agent-strategy-and-scoring-strategy/evidence/other/sp8-memory-audit-findings.md`.
- Audit Inputs Provided: `00-requirements.md`, the four locked phase artifacts, the two review findings files and `/.recursive/DECISIONS.md` before and after the edit.

## Effective Inputs Re-read

- `00-requirements.md`: R1-R12 were re-read to make sure the decision states each contract the run locks.
- `03.5-code-review.md`: the F3 and F8 dispositions are the source of the carried commitments.
- `04-test-summary.md`: the tester's coverage gaps are the source of the follow-up list.
- `05-manual-qa.md`: the live evidence names the executable digest the decision cites.

## Earlier Phase Reconciliation

- Phase 6 restates, it does not extend: every clause traces to a locked artifact, and the two commitments keep
  the wording the review rounds used so the durable record and the run evidence cannot drift apart.

## Subagent Contribution Verification

- Reviewed Action Records: none (this phase is a self-audit of a durable-memory edit)
- Main-Agent Verification Performed: the controller reconciled every claimed path against the actual diff scope: `.recursive/DECISIONS.md`, `.recursive/STATE.md`, `docs/operations/05-agent-strategy-and-workload-postures.md`, `role-model-router/apps/runtime-host-bridge/src/agent-strategy.ts`, `role-model-router/apps/runtime-host-bridge/src/controller-routing-contract.ts`, `role-model-router/apps/runtime-host-bridge/src/index.ts`, `role-model-router/apps/runtime-host-bridge/src/routing-latency-policy.ts`, `role-model-router/apps/runtime-host-bridge/src/routing-latency-selection.ts`, `role-model-router/apps/runtime-host-bridge/src/scoring-strategy.ts`, `role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`, `role-model-router/apps/runtime-host-bridge/test/agent-strategy-config-path.test.ts`, `role-model-router/apps/runtime-host-bridge/test/agent-strategy-entries.test.ts`, `role-model-router/apps/runtime-host-bridge/test/agent-strategy-inventory.test.ts`, `role-model-router/apps/runtime-host-bridge/test/agent-strategy-live-aliases.test.ts`, `role-model-router/apps/runtime-host-bridge/test/agent-strategy-materialize.test.ts`, `role-model-router/apps/runtime-host-bridge/test/agent-strategy-request-binding.test.ts`, `role-model-router/apps/runtime-host-bridge/test/agent-strategy-section.test.ts`, `role-model-router/apps/runtime-host-bridge/test/agent-strategy-workload-examples.test.ts`, `role-model-router/apps/runtime-host-bridge/test/backend-unified-runtime-config.test.ts`, `role-model-router/apps/runtime-host-bridge/test/controller-latency-strategy.test.ts`, `role-model-router/apps/runtime-host-bridge/test/index.test.ts`, `role-model-router/apps/runtime-host-bridge/test/routing-latency-effective-metric.test.ts`, `role-model-router/apps/runtime-host-bridge/test/run98-a40-latency-policy.test.ts`, `role-model-router/apps/runtime-host-bridge/test/runtime-config-named-block-merge.test.ts`, `role-model-router/apps/runtime-host-bridge/test/scoring-strategy-config.test.ts`, `role-model-router/apps/runtime-host-bridge/test/scoring-strategy-diagnostics.test.ts`, `role-model-router/apps/runtime-host-bridge/test/scoring-strategy-legacy.test.ts`, `role-model-router/apps/runtime-host-bridge/test/scoring-strategy-pin-rule.test.ts`, `role-model-router/apps/runtime-host-bridge/test/scoring-strategy-provenance.test.ts`, `role-model-router/apps/runtime-host-bridge/test/scoring-strategy-resolution.test.ts`, `role-model-router/apps/runtime-host-bridge/test/scoring-strategy.test.ts`, `role-model-router/apps/runtime-host-bridge/test/unified-runtime-config.test.ts`, `role-model-router/apps/runtime-ui/.react-router/types/+routes.ts`, `role-model-router/apps/runtime-ui/.react-router/types/app/routes/+types/agent-strategy.ts`, `role-model-router/apps/runtime-ui/.react-router/types/app/routes/+types/workloads.ts`, `role-model-router/apps/runtime-ui/app/components/posture-entries-page.tsx`, `role-model-router/apps/runtime-ui/app/lib/agent-strategy.test.ts`, `role-model-router/apps/runtime-ui/app/lib/agent-strategy.ts`, `role-model-router/apps/runtime-ui/app/lib/decision-receipt.test.ts`, `role-model-router/apps/runtime-ui/app/lib/decision-receipt.ts`, `role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`, `role-model-router/apps/runtime-ui/app/lib/design-system.ts`, `role-model-router/apps/runtime-ui/app/lib/latency-override.test.ts`, `role-model-router/apps/runtime-ui/app/lib/latency-override.ts`, `role-model-router/apps/runtime-ui/app/lib/routing-mode.test.ts`, `role-model-router/apps/runtime-ui/app/lib/routing-mode.ts`, `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`, `role-model-router/apps/runtime-ui/app/routes.ts`, `role-model-router/apps/runtime-ui/app/routes/agent-strategy.test.tsx`, `role-model-router/apps/runtime-ui/app/routes/agent-strategy.tsx`, `role-model-router/apps/runtime-ui/app/routes/control-routing-strategy.test.tsx`, `role-model-router/apps/runtime-ui/app/routes/control-routing-strategy.tsx`, `role-model-router/apps/runtime-ui/app/routes/control-runtime-config.tsx`, `role-model-router/apps/runtime-ui/app/routes/router-decision-detail.test.tsx`, `role-model-router/apps/runtime-ui/app/routes/router-decision-detail.tsx`, `role-model-router/apps/runtime-ui/app/routes/router-decisions.tsx`, `role-model-router/apps/runtime-ui/app/routes/router.tsx`, `role-model-router/apps/runtime-ui/app/routes/workloads.tsx`, `role-model-router/packages/core/src/router.ts`, `role-model-router/packages/runtime-observability/src/index.ts`, `role-model-router/packages/sqlite-memory/src/legacy-migration.ts`, `role-model-router/packages/sqlite-memory/test/run98-a40-stub-fidelity.test.ts`. It wrote the entry from `/.recursive/run/103-agent-strategy-and-scoring-strategy/00-requirements.md`, `/.recursive/run/103-agent-strategy-and-scoring-strategy/03.5-code-review.md` and `/.recursive/run/103-agent-strategy-and-scoring-strategy/05-manual-qa.md`, and read the diff of `/.recursive/DECISIONS.md` and `/.recursive/STATE.md` after the edit to confirm the index entry, the decision body, the commitments and the promotion boundary are present and consistent with the locked artifacts.
- Acceptance Decision: accepted
- Acceptance Notes: the delegated review's F3 and F8 findings are restated verbatim in spirit as the carried commitments.
- Refresh Handling: the decision was written after all five earlier phases were locked, so no refresh was needed.
- Repair Performed After Verification: none required; the verification evidence is `/.recursive/run/103-agent-strategy-and-scoring-strategy/06-decisions-update.md` and `/.recursive/DECISIONS.md`.

## Worktree Diff Audit

- Baseline type: `remote ref`
- Baseline reference: `ca5c2126ca566086cfbe8f83cfdf339aba0879ff`
- Comparison reference: `working-tree`
- Normalized baseline: `ca5c2126ca566086cfbe8f83cfdf339aba0879ff`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only ca5c2126ca566086cfbe8f83cfdf339aba0879ff`
- Reviewed paths (the durable-memory files this phase owns, plus the complete product diff it restates):
  - `/.recursive/DECISIONS.md`
  - `/.recursive/STATE.md`
  - `.recursive/run/103-agent-strategy-and-scoring-strategy/06-decisions-update.md`
  - `.recursive/DECISIONS.md`
  - `.recursive/STATE.md`
  - `docs/operations/05-agent-strategy-and-workload-postures.md`
  - `role-model-router/apps/runtime-host-bridge/src/agent-strategy.ts`
  - `role-model-router/apps/runtime-host-bridge/src/controller-routing-contract.ts`
  - `role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `role-model-router/apps/runtime-host-bridge/src/routing-latency-policy.ts`
  - `role-model-router/apps/runtime-host-bridge/src/routing-latency-selection.ts`
  - `role-model-router/apps/runtime-host-bridge/src/scoring-strategy.ts`
  - `role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts`
  - `role-model-router/apps/runtime-host-bridge/test/agent-strategy-config-path.test.ts`
  - `role-model-router/apps/runtime-host-bridge/test/agent-strategy-entries.test.ts`
  - `role-model-router/apps/runtime-host-bridge/test/agent-strategy-inventory.test.ts`
  - `role-model-router/apps/runtime-host-bridge/test/agent-strategy-live-aliases.test.ts`
  - `role-model-router/apps/runtime-host-bridge/test/agent-strategy-materialize.test.ts`
  - `role-model-router/apps/runtime-host-bridge/test/agent-strategy-request-binding.test.ts`
  - `role-model-router/apps/runtime-host-bridge/test/agent-strategy-section.test.ts`
  - `role-model-router/apps/runtime-host-bridge/test/agent-strategy-workload-examples.test.ts`
  - `role-model-router/apps/runtime-host-bridge/test/backend-unified-runtime-config.test.ts`
  - `role-model-router/apps/runtime-host-bridge/test/controller-latency-strategy.test.ts`
  - `role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - `role-model-router/apps/runtime-host-bridge/test/routing-latency-effective-metric.test.ts`
  - `role-model-router/apps/runtime-host-bridge/test/run98-a40-latency-policy.test.ts`
  - `role-model-router/apps/runtime-host-bridge/test/runtime-config-named-block-merge.test.ts`
  - `role-model-router/apps/runtime-host-bridge/test/scoring-strategy-config.test.ts`
  - `role-model-router/apps/runtime-host-bridge/test/scoring-strategy-diagnostics.test.ts`
  - `role-model-router/apps/runtime-host-bridge/test/scoring-strategy-legacy.test.ts`
  - `role-model-router/apps/runtime-host-bridge/test/scoring-strategy-pin-rule.test.ts`
  - `role-model-router/apps/runtime-host-bridge/test/scoring-strategy-provenance.test.ts`
  - `role-model-router/apps/runtime-host-bridge/test/scoring-strategy-resolution.test.ts`
  - `role-model-router/apps/runtime-host-bridge/test/scoring-strategy.test.ts`
  - `role-model-router/apps/runtime-host-bridge/test/unified-runtime-config.test.ts`
  - `role-model-router/apps/runtime-ui/.react-router/types/+routes.ts`
  - `role-model-router/apps/runtime-ui/.react-router/types/app/routes/+types/agent-strategy.ts`
  - `role-model-router/apps/runtime-ui/.react-router/types/app/routes/+types/workloads.ts`
  - `role-model-router/apps/runtime-ui/app/components/posture-entries-page.tsx`
  - `role-model-router/apps/runtime-ui/app/lib/agent-strategy.test.ts`
  - `role-model-router/apps/runtime-ui/app/lib/agent-strategy.ts`
  - `role-model-router/apps/runtime-ui/app/lib/decision-receipt.test.ts`
  - `role-model-router/apps/runtime-ui/app/lib/decision-receipt.ts`
  - `role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
  - `role-model-router/apps/runtime-ui/app/lib/design-system.ts`
  - `role-model-router/apps/runtime-ui/app/lib/latency-override.test.ts`
  - `role-model-router/apps/runtime-ui/app/lib/latency-override.ts`
  - `role-model-router/apps/runtime-ui/app/lib/routing-mode.test.ts`
  - `role-model-router/apps/runtime-ui/app/lib/routing-mode.ts`
  - `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`
  - `role-model-router/apps/runtime-ui/app/routes.ts`
  - `role-model-router/apps/runtime-ui/app/routes/agent-strategy.test.tsx`
  - `role-model-router/apps/runtime-ui/app/routes/agent-strategy.tsx`
  - `role-model-router/apps/runtime-ui/app/routes/control-routing-strategy.test.tsx`
  - `role-model-router/apps/runtime-ui/app/routes/control-routing-strategy.tsx`
  - `role-model-router/apps/runtime-ui/app/routes/control-runtime-config.tsx`
  - `role-model-router/apps/runtime-ui/app/routes/router-decision-detail.test.tsx`
  - `role-model-router/apps/runtime-ui/app/routes/router-decision-detail.tsx`
  - `role-model-router/apps/runtime-ui/app/routes/router-decisions.tsx`
  - `role-model-router/apps/runtime-ui/app/routes/router.tsx`
  - `role-model-router/apps/runtime-ui/app/routes/workloads.tsx`
  - `role-model-router/packages/core/src/router.ts`
  - `role-model-router/packages/runtime-observability/src/index.ts`
  - `role-model-router/packages/sqlite-memory/src/legacy-migration.ts`
  - `role-model-router/packages/sqlite-memory/test/run98-a40-stub-fidelity.test.ts`

## Gaps Found

None. The two carried commitments and the coverage follow-ups are recorded with owners; nothing in this phase
is unresolved.

## Repair Work Performed

- None. The phase adds durable memory only.

## Requirement Completion Status

- `R1` | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/run/103-agent-strategy-and-scoring-strategy/06-decisions-update.md` | Verification Evidence: `/.recursive/run/103-agent-strategy-and-scoring-strategy/03.5-code-review.md`
- `R2` | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/run/103-agent-strategy-and-scoring-strategy/06-decisions-update.md` | Verification Evidence: `/.recursive/run/103-agent-strategy-and-scoring-strategy/04-test-summary.md`
- `R3` | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/run/103-agent-strategy-and-scoring-strategy/06-decisions-update.md` | Verification Evidence: `/.recursive/run/103-agent-strategy-and-scoring-strategy/05-manual-qa.md`
- `R4` | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/run/103-agent-strategy-and-scoring-strategy/06-decisions-update.md` | Verification Evidence: `/.recursive/run/103-agent-strategy-and-scoring-strategy/03.5-code-review.md`
- `R5` | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/run/103-agent-strategy-and-scoring-strategy/06-decisions-update.md` | Verification Evidence: `/.recursive/run/103-agent-strategy-and-scoring-strategy/03-implementation-summary.md`
- `R6` | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/run/103-agent-strategy-and-scoring-strategy/06-decisions-update.md` | Verification Evidence: `/.recursive/run/103-agent-strategy-and-scoring-strategy/03-implementation-summary.md`
- `R7` | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/run/103-agent-strategy-and-scoring-strategy/06-decisions-update.md` | Verification Evidence: `/.recursive/run/103-agent-strategy-and-scoring-strategy/03.5-code-review.md` | Audit Note: the paired private registry is the recorded release dependency
- `R8` | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/run/103-agent-strategy-and-scoring-strategy/06-decisions-update.md` | Verification Evidence: `/.recursive/run/103-agent-strategy-and-scoring-strategy/04-test-summary.md`
- `R9` | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/run/103-agent-strategy-and-scoring-strategy/06-decisions-update.md` | Verification Evidence: `/.recursive/run/103-agent-strategy-and-scoring-strategy/03.5-code-review.md` | Audit Note: the decoder deviation is recorded in the decision entry
- `R10` | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/run/103-agent-strategy-and-scoring-strategy/06-decisions-update.md` | Verification Evidence: `/.recursive/run/103-agent-strategy-and-scoring-strategy/04-test-summary.md`
- `R11` | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/run/103-agent-strategy-and-scoring-strategy/06-decisions-update.md` | Verification Evidence: `/.recursive/run/103-agent-strategy-and-scoring-strategy/03-implementation-summary.md`
- `R12` | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/run/103-agent-strategy-and-scoring-strategy/06-decisions-update.md` | Verification Evidence: `/.recursive/run/103-agent-strategy-and-scoring-strategy/05-manual-qa.md`

## Prior Recursive Evidence Reviewed

- `/.recursive/run/103-agent-strategy-and-scoring-strategy/03-implementation-summary.md`, `/.recursive/run/103-agent-strategy-and-scoring-strategy/03.5-code-review.md`, `/.recursive/run/103-agent-strategy-and-scoring-strategy/04-test-summary.md`, `/.recursive/run/103-agent-strategy-and-scoring-strategy/05-manual-qa.md` - the locked artifacts the decision restates.
- `.recursive/memory/skills/SKILLS.md` - the durable skill index the Phase 8 audit reviews.

## Traceability

| Requirement | Decision clause | Evidence |
| --- | --- | --- |
| R1 | two-axis posture, legacy read/reject/migrate | `/.recursive/run/103-agent-strategy-and-scoring-strategy/03-implementation-summary.md` |
| R2 | precedence ladder and pin semantics | `/.recursive/run/103-agent-strategy-and-scoring-strategy/03.5-code-review.md` |
| R3 | decision receipts incl. the stub | `/.recursive/run/103-agent-strategy-and-scoring-strategy/05-manual-qa.md` |
| R4 | controller `latency`, pin, no-op discard | `/.recursive/run/103-agent-strategy-and-scoring-strategy/03.5-code-review.md` |
| R5-R6 | posture entries, alias rules, write errors | `/.recursive/run/103-agent-strategy-and-scoring-strategy/03-implementation-summary.md` |
| R7 | effective-latency metric and the paired-registry commitment | `/.recursive/run/103-agent-strategy-and-scoring-strategy/03.5-code-review.md` |
| R8 | the three operator surfaces | `/.recursive/run/103-agent-strategy-and-scoring-strategy/04-test-summary.md` |
| R9 | the recorded decoder deviation | this entry |
| R10 | single-sourced vocabularies and migration | `/.recursive/run/103-agent-strategy-and-scoring-strategy/04-test-summary.md` |
| R11 | TDD evidence including the post-TDD repairs | `/.recursive/run/103-agent-strategy-and-scoring-strategy/04-test-summary.md` |
| R12 | live pi-CLI matrix | `/.recursive/run/103-agent-strategy-and-scoring-strategy/05-manual-qa.md` |

## Audit Verdict

Audit: PASS

The durable decision entry states every contract the run locks, names the evidence, and carries the two
commitments and the coverage follow-ups with owners; it was written from and re-read against the locked
artifacts.

## Coverage Gate

- [x] The decision entry exists with decision, why, evidence, commitments and the promotion boundary
- [x] The run index carries the new entry
- [x] Both carried commitments name their owner and their landing point
- [x] The coverage follow-ups are recorded

Coverage: PASS

## Approval Gate

- [x] Only durable memory changed in this phase
- [x] The entry restates locked artifacts rather than extending them
- [x] Promotion remains a separate release operation
- [x] Remaining work: Phases 7 and 8

Approval: PASS
