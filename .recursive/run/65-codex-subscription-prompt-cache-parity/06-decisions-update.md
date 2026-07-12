Run: `/.recursive/run/65-codex-subscription-prompt-cache-parity/`
Phase: `06 Decisions Update`
Status: `LOCKED`
LockedAt: `2026-07-12T03:01:34Z`
LockHash: `b56f37b43e5b2c85d70583df886eee85204146c6afeffd9e79260ad121851076`
Inputs:
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/00-requirements.md`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/00-worktree.md`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/01-as-is.md`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/01.5-root-cause.md`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/02-to-be-plan.md`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/03-implementation-summary.md`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/04-test-summary.md`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/05-manual-qa.md`
- `/.recursive/DECISIONS.md`
Outputs:
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/06-decisions-update.md`
- `/.recursive/DECISIONS.md`
Scope note: Records the durable decision-ledger delta for prompt-cache truth, per-domain continuity, Pi verification expectations, and the Kimi blocker boundary.

## TODO

- [x] Record the exact decisions delta applied during closeout
- [x] Reference the updated decision ledger entry
- [x] Complete the audited decision-update gates before locking

## Decisions Changes Applied

- Added a new run-65 entry under `## Recursive Run Index` in `/.recursive/DECISIONS.md`.
- Recorded the durable decisions that:
  - OpenAI-family prompt caching is truthful implicit support, not hardcoded unsupported
  - continuity is per upstream cache domain and endpoint-local, not router-global
  - live Pi verification must cover both exact-model and alias-backed proof when cache continuity is in scope
  - Kimi live proof may be blocked by routing eligibility or missing benchmark data and must be recorded explicitly rather than implied

## Rationale

- The repaired behavior changes runtime truth that future runs must not silently undo.
- The alias-backed continuity proof and the Pi session-history caveat are durable boundaries for later routing or Pi work.
- The Kimi blocker needs a durable ledger entry so future runs know that the missing live proof was an eligibility constraint, not a forgotten verification step.

## Resulting Decision Entry

- `Run 65-codex-subscription-prompt-cache-parity`

## Traceability

- `R1` -> durable record that native Codex and OpenAI-family cache facts now survive normalization
- `R2` -> durable record that downstream OpenAI-compatible totals plus cache-detail fields are preserved
- `R3` -> durable record that prompt caching is treated as implicit OpenAI-family support and Kimi top-level cache fields are normalized
- `R4` -> durable record that continuity is per upstream cache domain and provider-local
- `R5` -> durable record that request-detail and Observe/telemetry parity are part of the shipped truth
- `R6` -> durable record that LiteLLM ownership stayed shared and DeepSeek remained the parity control
- `R7` -> durable record that strict TDD backed the repair
- `R8` -> durable record that live Pi proof, doc crosswalk, Kimi blocker capture, and alias session caveat are required

## Coverage Gate

- [x] The exact `DECISIONS.md` delta is recorded
- [x] The resulting entry heading is named explicitly
- [x] The delta matches the completed run scope

Coverage: PASS

## Approval Gate

- [x] Durable runtime-routing and Pi-verification decisions are now ledgered
- [x] No unrelated decision-plane edits were introduced

Approval: PASS

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `available`
Subagent Capability Probe: `tool_search` exposed subagent tooling in this repository session.
Delegation Decision Basis: developer policy forbids unsolicited delegation and the user did not authorize subagents in this thread.
Delegation Override Reason: local direct audit only.
Audit Inputs Provided:
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/00-requirements.md`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/00-worktree.md`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/01-as-is.md`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/01.5-root-cause.md`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/02-to-be-plan.md`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/03-implementation-summary.md`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/04-test-summary.md`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/05-manual-qa.md`
- `/.recursive/DECISIONS.md`

## Effective Inputs Re-read

- all inputs listed above

## Earlier Phase Reconciliation

- `03-implementation-summary.md` and its addenda established the repaired product truth.
- `04-test-summary.md` locked the deterministic verification floor.
- `05-manual-qa.md` locked the rebuilt-runtime Pi, Observe, doc-crosswalk, and Kimi-blocker proof that this decision update now memorializes.

## Subagent Contribution Verification

- Reviewed Action Records: none
- Main-Agent Verification Performed: direct reread of all prior phase receipts plus direct review of the `DECISIONS.md` delta
- Acceptance Decision: `accepted`
- Refresh Handling: not applicable
- Repair Performed After Verification: added the run-65 entry only

## Worktree Diff Audit

Baseline type: `local commit`
Baseline reference: `6b3850470de5c37a7d005838aa2fb91afadd214e`
Comparison reference: `working-tree`
Normalized baseline: `6b3850470de5c37a7d005838aa2fb91afadd214e`
Normalized comparison: `working-tree`
Normalized diff command: `git diff --name-only 6b3850470de5c37a7d005838aa2fb91afadd214e`

Planned or claimed changed files:
- `/.recursive/DECISIONS.md`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/06-decisions-update.md`

Actual changed files reviewed:
- those two files plus the upstream run artifacts they summarize

Unexplained drift: `none`

## Gaps Found

None.

## Repair Work Performed

- added the durable run-65 decision entry to `/.recursive/DECISIONS.md`

## Requirement Completion Status

- `R1` | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/65-codex-subscription-prompt-cache-parity/03-implementation-summary.md`, `/.recursive/run/65-codex-subscription-prompt-cache-parity/05-manual-qa.md`
- `R2` | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/65-codex-subscription-prompt-cache-parity/03-implementation-summary.md`, `/.recursive/run/65-codex-subscription-prompt-cache-parity/05-manual-qa.md`
- `R3` | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/65-codex-subscription-prompt-cache-parity/03-implementation-summary.md`, `/.recursive/run/65-codex-subscription-prompt-cache-parity/evidence/runtime/phase5-rebuilt/provider-doc-crosswalk.md`
- `R4` | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/65-codex-subscription-prompt-cache-parity/05-manual-qa.md`
- `R5` | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/65-codex-subscription-prompt-cache-parity/04-test-summary.md`, `/.recursive/run/65-codex-subscription-prompt-cache-parity/05-manual-qa.md`
- `R6` | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/65-codex-subscription-prompt-cache-parity/04-test-summary.md`, `/.recursive/run/65-codex-subscription-prompt-cache-parity/05-manual-qa.md`
- `R7` | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/65-codex-subscription-prompt-cache-parity/03-implementation-summary.md`, `/.recursive/run/65-codex-subscription-prompt-cache-parity/04-test-summary.md`
- `R8` | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/65-codex-subscription-prompt-cache-parity/05-manual-qa.md`

## Audit Verdict

- Summary: the decision ledger now captures the durable runtime and Pi prompt-cache boundaries established by run 65.
Audit: PASS

## Prior Recursive Evidence Reviewed

- `/.recursive/run/65-codex-subscription-prompt-cache-parity/03-implementation-summary.md`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/04-test-summary.md`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/05-manual-qa.md`
