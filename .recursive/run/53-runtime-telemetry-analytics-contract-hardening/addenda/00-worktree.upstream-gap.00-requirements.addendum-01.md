Run: `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/`
Phase: `00 Worktree`
Addendum: `upstream-gap.00-requirements.01`
Status: `LOCKED`
LockedAt: `2026-06-21T17:48:55Z`
LockHash: `9beb2ed244dc5cd2ff3aa2e9999791f0de53e023bd2e598591c6a1a3c3c6dce5`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/00-requirements.md` (LOCKED)
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/00-worktree.md` (DRAFT)
- User guidance in chat on 2026-06-21:
  - Phase 5 must include rebuilding the runtime and verifying the changes in the browser
  - after agent verification, the runtime must remain running and the browser must remain open so the user can immediately perform follow-up verification
Outputs:
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/addenda/00-worktree.upstream-gap.00-requirements.addendum-01.md`
Scope note: The locked Phase 0 requirements artifact for run 53 did not state the exact Phase 5 runtime/browser handoff contract strongly enough. This addendum preserves that requirement without mutating locked history and makes it part of the effective Phase 0 input set.

## TODO

- [x] Record the post-lock Phase 5 verification requirement discovered in chat
- [x] Preserve the runtime rebuild, browser verification, and runtime/browser handoff obligations explicitly
- [x] Bind the requirement to Phase 5 QA execution mode and evidence expectations
- [x] Update the active Phase 0 worktree artifact so this addendum is part of the effective inputs

## Effective Inputs Re-read

- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/00-requirements.md`
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/00-worktree.md`
- user guidance in chat on 2026-06-21

## Earlier Phase Reconciliation

- `00-requirements.md` is `LOCKED`, so it cannot be edited directly.
- The additional Phase 5 requirement arrived after the lock and is therefore preserved here as a current-phase upstream-gap addendum.
- This addendum supplements the effective Phase 0 requirement set for run 53 and must be treated as authoritative by later phases.

## Gap Summary

The locked requirements artifact already required rebuilt-runtime browser verification, but it did not explicitly bind Phase 5 to the full handoff behavior the user asked for:

- rebuild the runtime before browser QA
- verify the implemented telemetry changes in the browser against the rebuilt runtime
- keep the runtime running after agent verification
- keep the verified browser session open for immediate user follow-up QA

That explicit handoff expectation must be durable in the run artifacts rather than remaining only in chat.

## Discovery Evidence

- user chat on 2026-06-21: `phase 5 must include rebuilding the runtime and verifying the changes in the browser`
- user chat on 2026-06-21: `after you have done the verification, i will do it as well so keep the browser open and the runtime running`

## Requirement Amendment

### `R11` Phase 5 rebuilt-runtime browser handoff is mandatory

Description:
Phase 5 for run 53 must end with a live rebuilt runtime and an already-verified browser session left available for immediate user follow-up QA.

Acceptance criteria:
- `05-manual-qa.md` declares `QA Execution Mode: hybrid`
- before Phase 5 verification begins, the runtime is rebuilt from the current implementation state rather than reusing a stale prior binary or stale dev server
- Phase 5 verifies the changed telemetry behavior in the browser against the rebuilt runtime using the actual served URL captured from the runtime or preview log
- `05-manual-qa.md` records the actual rebuilt-runtime URL and the exact browser-verified scenarios that were executed by the agent
- after agent verification completes, the runtime remains running and reachable on the verified URL until the user has had an opportunity to perform follow-up QA or explicitly asks for cleanup
- after agent verification completes, the verified browser session or page remains open on the relevant telemetry surface for the user’s follow-up QA unless an external failure makes that impossible, in which case the failure and fallback steps are recorded explicitly in `05-manual-qa.md`
- Phase 5 may not lock if the runtime was rebuilt but then shut down before the required user follow-up window, unless the user explicitly approved that deviation

## Implications For Current And Later Phases

- Phase 2 planning must include a concrete Phase 5 rebuilt-runtime/browser handoff step rather than treating browser QA as a terminal cleanup point.
- Phase 4 test planning must identify which scenarios must be re-checked in the browser on the rebuilt runtime.
- Phase 5 must preserve the verified runtime/browser state long enough for user follow-up QA instead of tearing it down automatically at the end of agent checks.

## Compensation In Current Phase

- Preserve this requirement in a repo-owned recursive addendum instead of chat-only context.
- Treat this addendum as part of the effective Phase 0 input set for run 53.
- Update `00-worktree.md` so the current active Phase 0 artifact lists this addendum in its `Inputs`.

## Traceability

- Phase 5 rebuilt runtime requirement -> preserved from user chat on 2026-06-21
- Phase 5 browser verification requirement -> preserved from user chat on 2026-06-21
- live runtime/browser handoff requirement -> preserved from user chat on 2026-06-21

## Coverage Gate

- [x] The post-lock Phase 5 handoff requirement is preserved in a repo document
- [x] The requirement explicitly covers runtime rebuild, browser verification, and keeping the runtime/browser available afterward
- [x] The addendum binds the behavior to an observable Phase 5 artifact expectation
- [x] The addendum avoids mutating the locked requirements artifact directly

Coverage: PASS

## Approval Gate

- [x] The addendum records the missing requirement in a workflow-compliant way
- [x] The Phase 5 handoff expectations are specific enough for Phase 2, Phase 4, and Phase 5 to enforce
- [x] The locked requirements artifact remains intact while the effective Phase 0 inputs are corrected

Approval: PASS
