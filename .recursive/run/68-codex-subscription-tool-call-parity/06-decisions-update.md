Run: `/.recursive/run/68-codex-subscription-tool-call-parity/`
Phase: `06 Decisions Update`
Status: `LOCKED`
LockedAt: `2026-07-12T17:10:13Z`
LockHash: `8cac2e8487dd353c870d1b7ce08a63d0ebf2ebd3e554f2b0c6a565644bacef1c`
Inputs:
- `/.recursive/run/68-codex-subscription-tool-call-parity/00-requirements.md`
- `/.recursive/run/68-codex-subscription-tool-call-parity/00-worktree.md`
- `/.recursive/run/68-codex-subscription-tool-call-parity/01-as-is.md`
- `/.recursive/run/68-codex-subscription-tool-call-parity/01.5-root-cause.md`
- `/.recursive/run/68-codex-subscription-tool-call-parity/02-to-be-plan.md`
- `/.recursive/run/68-codex-subscription-tool-call-parity/03-implementation-summary.md`
- `/.recursive/run/68-codex-subscription-tool-call-parity/04-test-summary.md`
- `/.recursive/run/68-codex-subscription-tool-call-parity/05-manual-qa.md`
- `/.recursive/DECISIONS.md`
Outputs:
- `/.recursive/run/68-codex-subscription-tool-call-parity/06-decisions-update.md`
- `/.recursive/DECISIONS.md`
Scope note: Records the durable decision-ledger delta for cross-provider tool-call parity, Codex Responses request-shape truth, exact-versus-alias Pi verification, and the Windows packaged-runtime relaunch caveat.

## TODO

- [x] Record the exact decisions delta applied during closeout
- [x] Reference the updated decision ledger entry
- [x] Complete the audited decision-update gates before locking

## Decisions Changes Applied

- Added a new run-68 entry under `## Recursive Run Index` in `/.recursive/DECISIONS.md`.
- Recorded the durable decisions that:
  - role-model keeps one portable continuation history internally, but upstream tool-call serialization remains surface-specific
  - Codex Subscription Responses requires official typed replay items and named-tool forced `tool_choice`
  - caller-owned `parallel_tool_calls` stays tri-state and must not be silently forced on the Codex path
  - live tool-call parity verification requires both an exact-model Codex proof and a routing-alias Pi proof, and the alias proof may legitimately land on DeepSeek or another non-Codex provider depending on live routing
  - Windows packaged-runtime relaunch with spaced paths should use tokenized `ProcessStartInfo.ArgumentList`

## Rationale

- The repaired behavior changes runtime truth that future runs must not silently undo.
- The exact-model versus alias proof distinction is a durable QA boundary for future routed tool-call work.
- The Windows relaunch caveat is durable because it affects how rebuilt-runtime proof is obtained on the user's machine.

## Resulting Decision Entry

- `Run 68-codex-subscription-tool-call-parity`

## Traceability

- `R1` -> durable record that native Codex Responses and Chat Completions tool-call parity now survive rebuilt-runtime execution
- `R2` -> durable record that downstream tool-call output truth is surface-specific, not one-size-fits-all
- `R3` -> durable record that cross-provider continuation rendering stays portable internally but provider-surface specific at the final hop
- `R4` -> durable record that `parallel_tool_calls` remains caller-owned tri-state
- `R5` -> durable record that forced-tool and typed replay regressions are part of the owned regression floor
- `R6` -> durable record that exact-model and alias Pi proof are both required and that alias proof may route to non-Codex
- `R7` -> durable record that Codex tool-bearing benchmark subject turns belong on Responses
- `R8` -> durable record that rebuilt-runtime proof must include a direct Responses continuation probe
- `R9` -> durable record that generic LiteLLM-backed chat targets still use chat-style tool replay
- `R10` -> durable record that generic LiteLLM route-shape behavior remains distinct from Codex Responses behavior

## Coverage Gate

- [x] The exact `DECISIONS.md` delta is recorded
- [x] The resulting entry heading is named explicitly
- [x] The delta matches the completed run scope

Coverage: PASS

## Approval Gate

- [x] Durable runtime-routing and rebuilt-runtime QA decisions are now ledgered
- [x] No unrelated decision-plane edits were introduced

Approval: PASS

## Audit Context

Audit Execution Mode: `self-audit`
Subagent Availability: `available`
Subagent Capability Probe: `tool_search` exposed subagent tooling in this repository session.
Delegation Decision Basis: developer policy forbids unsolicited delegation and the user did not authorize subagents in this thread.
Delegation Override Reason: local direct audit only.
Audit Inputs Provided:
- all inputs listed above

## Effective Inputs Re-read

- all inputs listed above

## Earlier Phase Reconciliation

- `03-implementation-summary.md`, `04-test-summary.md`, and `05-manual-qa.md` establish the repaired product truth, the automated floor, and the rebuilt-runtime proof that this decision update now memorializes.

## Subagent Contribution Verification

- Reviewed Action Records: none
- Main-Agent Verification Performed: direct reread of all prior phase receipts plus direct review of the `DECISIONS.md` delta
- Acceptance Decision: `accepted`
- Refresh Handling: `not applicable`
- Repair Performed After Verification: added the run-68 entry only

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `c2402a1b97ff2d4de900b012a50ac8c1b69f3512`
- Comparison reference: `working-tree`
- Normalized baseline: `c2402a1b97ff2d4de900b012a50ac8c1b69f3512`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only c2402a1b97ff2d4de900b012a50ac8c1b69f3512`
- Planned or claimed changed files:
  - `/.recursive/DECISIONS.md`
  - `/.recursive/STATE.md`
  - `/.recursive/memory/domains/pi-role-model-package.md`
  - `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
  - `/role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/benchmark-runner-judge.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/openai-codex-subscription-matrix.test.ts`
  - `/role-model-router/packages/adapter-execution/src/index.ts`
  - `/role-model-router/packages/provider-openai/src/index.ts`
  - `/role-model-router/packages/provider-openai/test/index.test.ts`
  - `/.recursive/run/68-codex-subscription-tool-call-parity/06-decisions-update.md`
- Actual changed files reviewed:
  - `/.recursive/DECISIONS.md`
  - `/.recursive/STATE.md`
  - `/.recursive/memory/domains/pi-role-model-package.md`
  - `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
  - `/role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts`
  - `/role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/benchmark-runner-judge.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/index.test.ts`
  - `/role-model-router/apps/runtime-host-bridge/test/openai-codex-subscription-matrix.test.ts`
  - `/role-model-router/packages/adapter-execution/src/index.ts`
  - `/role-model-router/packages/provider-openai/src/index.ts`
  - `/role-model-router/packages/provider-openai/test/index.test.ts`
  - `/.recursive/run/68-codex-subscription-tool-call-parity/06-decisions-update.md`
  - the upstream run artifacts they summarize
- Unexplained drift: `none`

## Gaps Found

None.

## Repair Work Performed

- added the durable run-68 decision entry to `/.recursive/DECISIONS.md`

## Requirement Completion Status

- `R1` | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/68-codex-subscription-tool-call-parity/03-implementation-summary.md`, `/.recursive/run/68-codex-subscription-tool-call-parity/05-manual-qa.md`
- `R2` | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/68-codex-subscription-tool-call-parity/03-implementation-summary.md`, `/.recursive/run/68-codex-subscription-tool-call-parity/05-manual-qa.md`
- `R3` | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/68-codex-subscription-tool-call-parity/03-implementation-summary.md`, `/.recursive/run/68-codex-subscription-tool-call-parity/05-manual-qa.md`
- `R4` | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/68-codex-subscription-tool-call-parity/03-implementation-summary.md`, `/.recursive/run/68-codex-subscription-tool-call-parity/04-test-summary.md`
- `R5` | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/68-codex-subscription-tool-call-parity/04-test-summary.md`
- `R6` | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/68-codex-subscription-tool-call-parity/05-manual-qa.md`
- `R7` | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/68-codex-subscription-tool-call-parity/03-implementation-summary.md`, `/.recursive/run/68-codex-subscription-tool-call-parity/04-test-summary.md`
- `R8` | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/68-codex-subscription-tool-call-parity/05-manual-qa.md`
- `R9` | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/68-codex-subscription-tool-call-parity/03-implementation-summary.md`, `/.recursive/run/68-codex-subscription-tool-call-parity/05-manual-qa.md`
- `R10` | Status: verified | Changed Files: `/.recursive/DECISIONS.md` | Implementation Evidence: `/.recursive/DECISIONS.md` | Verification Evidence: `/.recursive/run/68-codex-subscription-tool-call-parity/03-implementation-summary.md`, `/.recursive/run/68-codex-subscription-tool-call-parity/05-manual-qa.md`

## Audit Verdict

- Summary: the decision ledger now captures the durable cross-provider tool-call, Codex Responses, exact-versus-alias proof, and Windows relaunch boundaries established by run 68.
Audit: PASS
