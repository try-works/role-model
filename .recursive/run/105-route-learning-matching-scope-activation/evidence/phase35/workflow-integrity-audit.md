# Workflow integrity audit — run 105

Audit: FAIL
Coverage: FAIL
Approval: FAIL

## Scope and actual checks

Timeboxed read-only delegated audit; this new report is the only write. No product, locked document, receipt, configuration changes or commits. This is evidence, not a phase receipt. In-session agent identity is not independently verified; no Luna/flash identity is asserted. External CLI unavailability was supplied by controller, not independently reprobed.

Read canonical RECURSIVE.md phase/audit/addenda contract; all five locked base artifacts; active 03.5 review; existing diff-basis, implementation-withdrawal, and R15 root-cause addenda; actual Phase2/AS-IS receipts; installed recursive-lock.py and verify-locks.py, lint effective-input/inventory logic and receipt writer. Installed scripts are under .agents/skills/recursive-mode/scripts; .recursive/scripts equivalents are absent in this worktree.

Ran canonical verify-locks and lint read-only with python -B / PYTHONDONTWRITEBYTECODE=1. Combined command exit 1, with concrete lint failures. Five historical artifact hashes and requirements addendum hash are valid. Coverage/Approval results absent in all five originals, Audit results absent in audited historical originals; Phase2 prerequisite receipt stale. **Hash integrity does not establish workflow validity.** No product completion or historical approval certified.

## Numbered defects and fix paths

1. **Invalid historical gates and premature acceptance.** Requirements/worktree/AS-IS/plan/implementation lack explicit Coverage: PASS|FAIL and Approval: PASS|FAIL; AS-IS/plan/implementation lack Audit result. Worktree lacks gate sections entirely. Checked prose is not gate evidence. Canonical lines265–289 require draft/audit/repair/re-audit/pass/lock. Preserve all locked bytes. New current03.5 upstream-gap addenda should be created at run-relative paths:
   - addenda/03.5-code-review.upstream-gap.00-requirements.addendum-05.md
   - addenda/03.5-code-review.upstream-gap.00-worktree.addendum-06.md
   - addenda/03.5-code-review.upstream-gap.01-as-is.addendum-07.md
   - addenda/03.5-code-review.upstream-gap.02-to-be-plan.addendum-08.md
   Continue existing addenda/03.5-code-review.upstream-gap.03-implementation-summary.addendum-03.md. Record missing historical gates, implications and current compensation; never assert originals passed. Missing operator approval evidence remains missing, not retroactively invented.

2. **Required phase bodies missing, not just gate spelling.** Lint finds historical audited sections absent and worktree missing Project Setup, Test Baseline Verification, Worktree Context, Diff Basis For Later Audits, Traceability and gates. Requirements lacks Outputs/Scope note; implementation lacks Scope note. Current compensation must preserve Audit Context, Effective Inputs Re-read, Earlier Phase Reconciliation, Subagent Contribution Verification, Worktree Diff Audit, Gaps Found, Repair Work Performed, Requirement Completion Status, Audit Verdict, TODO, final Coverage/Approval sections. Phase1/2 Prior Recursive Evidence Reviewed obligations need actual evidence rereads; no fabricated historical compliance.

3. **AS-IS inventory is narrative, not machine-checkable v2 proof.** 01-as-is.md:261–281 is a verdict/evidence table for R1–R14, not Source Quote/Summary/Disposition entries. Canonical lint parser expects per-ID recognized dispositions and exact source quotations. New AS-IS upstream-gap supplement must supply lossless entries for every R1–R14 acceptance obligation and C1–C14; do not compress away subclauses. R15 is absent from locked requirements. Add it from its actual authorized late source, explicitly identifying approval/evidence gaps rather than claiming it was historically present.

4. **Plan mapping insufficient for canonical parser.** 02-to-be-plan.md has useful concrete R1–R14 packages/files/tests and C1–C14 constraints, but lacks canonical per-ID Source Quote/Planned Location/Coverage Disposition records and plan-stage Requirement Completion Status. Phase2 upstream-gap supplement must preserve A–E ownership and every requirement subclause; provide implementation/verification/QA surfaces, lossless merge rationale if any, and late R15 compensation. Keep all phase obligations: strict TDD and RED/GREEN, complete code review, Phase4 unit/E2E/regressions, Phase5 live requests plus browser/toggle, Phase6 decisions, Phase7 state, Phase8 memory. Do not replace required end-to-end evidence with green component counts.

5. **Diff basis cannot be silently substituted.** Locked 00-worktree.md:58–65 records mixed public/private prose/tree expressions and placeholder diff command; canonical lint says Baseline type missing. Existing addenda/00-worktree.normalized-diff-basis.addendum-02.md supplies concrete working-tree comparisons, but its extra infix is not discovered by canonical base.addendum-*.md pattern and it incorrectly labels itself Phase00. Preserve it. New current03.5 upstream-gap.00-worktree supplement should reference it and explicitly supersede only defective basis fields, pin public701b8b8fc0b0eeebdfe818b757f5702f50021488 and privatec993b2f2ebe8e1daa8ee506a50af0ea09f61b5f9, enumerate tracked AND untracked changes. A wrapper must disclose canonical generator basis versus explicit effective override and include all addenda; no original rewrite or native-tool PASS claim.

6. **Receipt prerequisite path wrong.** locks/02-to-be-plan.receipt.json:8 uses 00-requirements.addendum-01.md, which resolves at run root; actual file is addenda/00-requirements.addendum-01.md. Exact normalized relative prerequisite key must be addenda/00-requirements.addendum-01.md (forward slashes, not absolute host or duplicate run prefix), same verified digestbea50dd7e421fdc1cd0f6be1a1d00881eee78e29582aba9b5961b57a5446148a. This audit does not change receipt. Separately authorized metadata reconciliation should preserve original receipt as new diagnostic evidence and record old/new key, unchanged artifact/prerequisite hashes, actual resolution, reason, timestamp and canonical sorted-JSON self-hash. Inspect downstream semantics before regeneration: writer previous_receipt_hash is previous version of SAME artifact receipt, not previous phase. Do not arbitrarily edit chain hashes. recursive-lock has no receipt-only reconcile flag; --reopen modifies locked history (forbidden), re-lock of invalid originals refuses. Direct write_receipt API uses inferred prerequisites and does not validate historical gates; do not use it to manufacture PASS or drop addendum dependency. Until an auditable metadata-only route is authorized and checked, report stale receipt FAIL as a concrete repair item, not an environmental blocker.

7. **Preserve Phase1.5 R15 compensation.** Keep addenda/03.5-code-review.upstream-gap.01.5-root-cause.addendum-04.md and addenda/03.5-code-review.telemetry-size-limit.addendum-02.md. Root-cause supplement records real 16KiB/preview UTF8/secondary-error mechanisms and initial RED, remaining rebuilt/live verification. Maintain FAIL until actual checks. Supply exact path headers, outputs, Scope note and evidence/reconciliation; carry R15 through source inventory/plan/TDD/current implementation/review/tests/QA/closeout. Do not retroactively insert locked01.5 base or claim it predates repair without temporal evidence. Telemetry-size infix is likewise not canonical auto-discovery: list explicitly and reconcile through recognized current upstream-gap supplement.

8. **Active03.5 receipt incomplete despite honest FAIL.** 03.5-code-review.md lacks Inputs/Outputs/Scope note and most required audit headings. It groups incomplete IDs rather than canonical individual entries. Controller may repair this active DRAFT with all exact base/addendum paths, lexical read inventory, earlier reconciliation, bundle/fresh snapshot hashes, disclosed effective basis, Changed Files Reviewed/Targeted Code References, individual R1–R15 dispositions and evidence, TODO/verdict/final gates. Claims of repaired product findings require controller checking actual current source/tests. Existing implementation-withdrawal supplement is useful but lacks canonical path headers and evidence-linked full disposition proof.

9. **No public action records at audit time.** Glob of run/subagents failed because directory does not exist. Review names in-session reviewers but no Reviewed Action Records; Acceptance Decision pending is not accepted|partially accepted|rejected. Generate new records using canonical recursive-subagent-action after its --help/schema inspection. Record actual session IDs and unknown model identity, exact bundle/upstream/addenda/diff/code reads, findings and file/artifact impact, stable reviewed snapshot, then controller verification against actual files/diff/evidence with explicit acceptance and refresh handling. This report is unaccepted delegated evidence until parent verification. Routing unavailable is not permission to invent Luna/flash. Record real local/fallback decision and controller self-audit override if applicable; never claim successful external invocation without success:true/exit0 evidence.

10. **Raw canonical tools do not compose historical addenda into PASS.** Lint inventories requirements from base files; effective-input validator skips addenda and discovers only canonical naming. verify-locks checks original base gates and demands later closeout artifacts. Therefore new current supplements can restore lawful effective requirements without making raw historical lint pass. Preserve/disclose that distinction. Missing06/07/08 during current03.5 is unfinished later work, not a reason to author early fake closeout. Full workflow remains FAIL until real repair, verification, lawful current locking and later phases. No supported command presently converts invalid locked-history gates to valid ones without rewriting originals; do not conceal this tooling limitation with a wrapper PASS.

## Actionable canonical commands (run from public worktree)

Read-only commands, valid installed paths; capture exact stdout/exit as new evidence in separately authorized controller work:

~~~powershell
$env:PYTHONDONTWRITEBYTECODE='1'
python -B .agents/skills/recursive-mode/scripts/verify-locks.py --repo-root . --run-id 105-route-learning-matching-scope-activation --show-hashes
python -B .agents/skills/recursive-mode/scripts/lint-recursive-run.py --repo-root . --run-id 105-route-learning-matching-scope-activation --strict
python -B .agents/skills/recursive-mode/scripts/recursive-review-bundle.py --help
python -B .agents/skills/recursive-mode/scripts/recursive-subagent-action.py --help
git diff --name-only 701b8b8fc0b0eeebdfe818b757f5702f50021488
git ls-files --others --exclude-standard
~~~

For paired private review run analogous diff againstc993b2f2ebe8e1daa8ee506a50af0ea09f61b5f9 from private worktree; keep inventories separate. Resolve bundle/action-record options from actual --help; do not fabricate generator flags. Explicit effective-basis wrapper must preserve generated original and document any material supplement.

Only after actual fixes, verified controller action records, re-audit and legitimate PASS: canonical locking commands for CURRENT drafts, never originals (NOT executed here):

~~~powershell
python -B .agents/skills/recursive-mode/scripts/recursive-lock.py --repo-root . --run-id 105-route-learning-matching-scope-activation --artifact addenda/03.5-code-review.upstream-gap.01.5-root-cause.addendum-04.md
python -B .agents/skills/recursive-mode/scripts/recursive-lock.py --repo-root . --run-id 105-route-learning-matching-scope-activation --artifact 03.5-code-review.md
~~~

All current-phase addenda must be locked with the phase, subject to canonical validation; do not execute known-FAIL locks or bypass checks. Never run verify-locks --fix or recursive-lock --reopen on historical artifacts under this mandate.

## Verdict

Concrete repair plan delivered, not blocker status. Audit/coverage/approval remain FAIL. Original hashes are intact but gates, inventory/mapping, normalized basis, receipt prerequisite and delegated acceptance are not canonically valid. Historical approved source/approval evidence and current integration evidence must be real, not inferred. This report does not relax any phase requirement or R15 root-cause duty.
