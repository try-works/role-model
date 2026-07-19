Run: `/.recursive/run/52-codex-subscription-benchmark-tool-path/`
Phase: `06 Decisions Update`
Status: `LOCKED`
LockedAt: `2026-06-20T14:56:11Z`
LockHash: `bc8207a7303e0b73aa5b7e08b970aa10b88475e43805497f21f4593b93e4d68f`
Inputs:
- `/.recursive/run/52-codex-subscription-benchmark-tool-path/05-manual-qa.md`
- `/.recursive/run/52-codex-subscription-benchmark-tool-path/00-requirements.md`
- `/.recursive/DECISIONS.md`
Outputs:
- `/.recursive/run/52-codex-subscription-benchmark-tool-path/06-decisions-update.md`
- `/.recursive/DECISIONS.md` (updated)
Scope note: This document records the DECISIONS.md update for run 52.

## TODO

- [x] Read current DECISIONS.md
- [x] Draft new entry for run 52
- [x] Apply entry to DECISIONS.md
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Decisions Changes Applied

Added new entry to `/.recursive/DECISIONS.md` for run `52-codex-subscription-benchmark-tool-path`.

## Rationale

Run 52 fixed the Codex Subscription benchmark tool path crash on packaged runtime. The fix replaces `createRuntimeToolRegistry` (which reads `testdata/router-runtime/mcp-connectors.json`) with `createRequestScopedToolRegistry` (in-memory, no file reads) at the Codex call site. This is a minimal, well-tested fix verified by TDD, full test suite, code review, and live benchmark on the packaged runtime.

## Resulting Decision Entry

```markdown
### Run `52-codex-subscription-benchmark-tool-path`

- Run folder: `/.recursive/run/52-codex-subscription-benchmark-tool-path/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `01.5-root-cause.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `03.5-code-review.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
  - addenda `addenda/00-requirements.root-cause-handoff.md`
- What changed:
  - fixed Codex Subscription benchmark tool path crash on packaged runtime by replacing `createRuntimeToolRegistry` with `createRequestScopedToolRegistry` at the Codex call site (index.ts:12916)
  - exported `createRequestScopedToolRegistry` for direct unit testing
  - added 6 new tests: registry unit test, executeToolCalls integration, buildCodexDynamicTools compatibility, no-FS-access invariant, non-tool regression guard, packaging regression guard
- Why:
  - the Codex Subscription branch called `createRuntimeToolRegistry` which reads `testdata/router-runtime/mcp-connectors.json`, a file excluded from production packaging by `package-sea.ts`, causing ENOENT crashes on packaged runtime when benchmark cases included function tools
- How:
  - strict TDD (RED: 4 tests fail because `createRequestScopedToolRegistry` not exported; GREEN: export + call site replacement, all 5 pass); full suite green (lint 0 errors, build pass, test pass, test:critical 80 tests); delegated code review APPROVE; live benchmark on packaged runtime completed 12/12 cases without ENOENT
- What was not done:
  - no changes to non-Codex paths, packaging rules, or benchmark scoring
  - Codex app-server WebSocket "did not return a thread id" failures are a separate issue unrelated to this fix
- Known issues / follow-ups:
  - some benchmark cases scored 0 due to model not producing expected tool calls (model quality issue, not a crash)
  - Codex app-server WebSocket thread id issue remains as a separate follow-up
```

## Audit Context

Audit Execution Mode: self-audit
Subagent Availability: available
Subagent Capability Probe: Worker droids available.
Delegation Decision Basis: Closeout receipt recording is a documentation task. Self-audit is appropriate.
Delegation Override Reason: N/A

## Worktree Diff Audit

Baseline type: `local commit`
Baseline reference: `16fc64ee`
Comparison reference: `working-tree`
Normalized baseline: `16fc64ee`
Normalized diff command: `git diff --name-only 16fc64ee`
Changed paths review:
- `role-model-router/apps/runtime-host-bridge/src/index.ts` (R1, R5)
- `role-model-router/apps/runtime-host-bridge/test/index.test.ts` (R5, R2)
- `role-model-router/apps/runtime-host-bridge/test/executable.test.ts` (R4)
Affected memory docs: none (no memory docs own these paths)
Router and parent refresh: DECISIONS.md updated with run 52 entry

## Router and Parent Refresh

DECISIONS.md updated with run 52 entry at the end of the Recursive Run Index.

## Traceability

- R1 -> Decision entry "What changed" item 1 (call site replacement)
- R2 -> Decision entry "What was not done" (non-Codex paths unchanged)
- R3 -> Decision entry "What was not done" (non-Codex paths unchanged)
- R4 -> Decision entry "What was not done" (packaging rules unchanged)
- R5 -> Decision entry "What changed" item 3 (6 new tests)
- R6 -> Decision entry "How" (full suite green)
- R7 -> Decision entry "How" (live benchmark on packaged runtime)

## Coverage Gate

- [x] New DECISIONS.md entry drafted and applied
- [x] Entry includes run folder, artifacts, what changed, why, how, what was not done, known issues
- [x] R1-R7 all addressed in entry

Coverage: PASS

## Approval Gate

- [x] DECISIONS.md entry is complete and accurate
- [x] Ready for Phase 7

Approval: PASS
